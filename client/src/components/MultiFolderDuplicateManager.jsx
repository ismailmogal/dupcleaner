import React, { useState, useEffect, useCallback, useMemo, useImperativeHandle, forwardRef, useRef } from 'react';
import { DuplicateDetector } from '../utils/duplicateDetector';
import FileBrowser from './FileBrowser';
import { analytics } from './Analytics';
import './MultiFolderDuplicateManager.css';
import { mfSet, mfGet, mfRemove } from '../utils/idbMultiFolder';
import { debugLog, debugWarn, debugError, idbGet, idbRemove } from '../utils/idbState';

// Helper: Run async tasks in parallel with a concurrency limit
async function runWithConcurrencyLimit(tasks, limit = 5) {
  const results = [];
  let i = 0;
  const executing = [];

  const enqueue = async () => {
    if (i === tasks.length) return;
    const task = tasks[i++]();
    results.push(task);
    const p = task.then(() => executing.splice(executing.indexOf(p), 1));
    executing.push(p);
    let r = Promise.resolve();
    if (executing.length >= limit) {
      r = Promise.race(executing);
    }
    await r;
    return enqueue();
  };
  await enqueue();
  return Promise.allSettled(results);
}

// Helper to map file extension/type to logical type
function getLogicalFileType(item) {
  if (item.folder) return 'folder';
  const ext = item.name.split('.').pop()?.toLowerCase();
  if (["jpg","jpeg","png","gif","bmp","webp","tiff"].includes(ext)) return 'image';
  if (["mp4","avi","mov","wmv","mkv","webm"].includes(ext)) return 'video';
  if (["mp3","wav","flac","aac","ogg"].includes(ext)) return 'audio';
  if (["pdf"].includes(ext)) return 'pdf';
  if (["doc","docx"].includes(ext)) return 'word';
  if (["xls","xlsx"].includes(ext)) return 'excel';
  if (["ppt","pptx"].includes(ext)) return 'powerpoint';
  if (["zip","rar","7z","tar","gz"].includes(ext)) return 'compressed';
  return 'other';
}

const MultiFolderDuplicateManager = forwardRef(({ onFetchFolderFiles, onDeleteFiles, selectedFolders: selectedFoldersProp }, ref) => {
  const [selectedFolders, setSelectedFolders] = useState(selectedFoldersProp || []);
  const addingFolderRef = useRef(new Set());
  const [folderFiles, setFolderFiles] = useState({}); // { folderId: { folder, files } }
  const [duplicateGroups, setDuplicateGroups] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState(new Set());
  const [detectionMethods, setDetectionMethods] = useState({
    exact: true,
    similar: true,
    size: true,
    hash: false
  });
  const [isScanning, setIsScanning] = useState(false);
  const [isLoadingFolders, setIsLoadingFolders] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState({ current: 0, total: 0, fileName: '' });
  const [scanProgress, setScanProgress] = useState({ current: 0, total: 0, folderName: '' });
  const [currentKeepStrategy, setCurrentKeepStrategy] = useState('newest');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [filterFolder, setFilterFolder] = useState('');
  const [filterSize, setFilterSize] = useState('');
  const [filterDate, setFilterDate] = useState('');
  
  // FileBrowser state for embedded folder selection
  const [currentFolder, setCurrentFolder] = useState(null);
  const [currentFolderPath, setCurrentFolderPath] = useState([]);
  const [browserFiles, setBrowserFiles] = useState([]);
  const [isLoadingBrowser, setIsLoadingBrowser] = useState(false);

  const detector = useMemo(() => new DuplicateDetector(), []);

  // Load saved settings from localStorage
  useEffect(() => {
    try {
      const savedDetectionMethods = localStorage.getItem('multiFolderDuplicateManager_detectionMethods');
      if (savedDetectionMethods) {
        const parsed = JSON.parse(savedDetectionMethods);
        setDetectionMethods(parsed);
      }
      
      const savedKeepStrategy = localStorage.getItem('multiFolderDuplicateManager_keepStrategy');
      if (savedKeepStrategy) {
        setCurrentKeepStrategy(savedKeepStrategy);
      }
    } catch (error) {
      console.error('Error loading saved settings:', error);
    }
  }, []);

  // Save detection methods to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('multiFolderDuplicateManager_detectionMethods', JSON.stringify(detectionMethods));
  }, [detectionMethods]);

  // Save keep strategy to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('multiFolderDuplicateManager_keepStrategy', currentKeepStrategy);
  }, [currentKeepStrategy]);

  // Load saved sorting and filtering preferences
  useEffect(() => {
    try {
      const savedSortBy = localStorage.getItem('multiFolderDuplicateManager_sortBy');
      if (savedSortBy) {
        setSortBy(savedSortBy);
      }
      
      const savedSortOrder = localStorage.getItem('multiFolderDuplicateManager_sortOrder');
      if (savedSortOrder) {
        setSortOrder(savedSortOrder);
      }
    } catch (error) {
      console.error('Error loading saved sorting preferences:', error);
    }
  }, []);

  // Save sorting preferences to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('multiFolderDuplicateManager_sortBy', sortBy);
  }, [sortBy]);

  useEffect(() => {
    localStorage.setItem('multiFolderDuplicateManager_sortOrder', sortOrder);
  }, [sortOrder]);

  // Sync internal selectedFolders state with prop
  useEffect(() => {
    if (Array.isArray(selectedFoldersProp)) {
      setSelectedFolders(selectedFoldersProp);
    }
  }, [selectedFoldersProp]);

  // Load initial files when FileBrowser is opened
  useEffect(() => {
    if (currentFolder && currentFolder.id === 'root') {
      setIsLoadingBrowser(true);
      onFetchFolderFiles(null) // null for root folder
        .then(files => {
          setBrowserFiles(files);
        })
        .catch(error => {
          console.error('Error loading root folder:', error);
        })
        .finally(() => {
          setIsLoadingBrowser(false);
        });
    }
  }, [currentFolder, onFetchFolderFiles]);

  // Recursive function to get all files from a folder and its subfolders (parallelized)
  const loadFolderFilesRecursively = useCallback(async (folder, parentPath = '', depth = 0, maxDepth = 10) => {
    try {
      if (depth > maxDepth) {
        console.warn(`Max depth reached for folder: ${folder.name}`);
        return [];
      }

      const files = await onFetchFolderFiles(folder.id);
      const allFiles = [];
      const currentPath = parentPath ? `${parentPath}/${folder.name}` : folder.name;

      // Separate subfolders and files
      const subfolders = files.filter(item => item.folder);
      const fileItems = files.filter(item => !item.folder).map(item => ({
        ...item,
        folderPath: currentPath,
        parentFolderId: folder.id,
        depth: depth,
        fullPath: `${currentPath}/${item.name}`
      }));
      allFiles.push(...fileItems);

      // Prepare subfolder tasks
      const subfolderTasks = subfolders.map(subfolder => async () => {
        return await loadFolderFilesRecursively(subfolder, currentPath, depth + 1, maxDepth);
      });

      // Fetch subfolders in parallel with concurrency limit
      if (subfolderTasks.length > 0) {
        const subfolderResults = await runWithConcurrencyLimit(subfolderTasks, 5); // limit = 5
        for (const result of subfolderResults) {
          if (result.status === 'fulfilled' && Array.isArray(result.value)) {
            allFiles.push(...result.value);
          }
        }
      }

      // Yield control to UI
      await new Promise(resolve => setTimeout(resolve, 0));
      return allFiles;
    } catch (error) {
      console.error(`Error loading files from folder ${folder.name}:`, error);
      return [];
    }
  }, [onFetchFolderFiles]);

  // Check for pending folders from IndexedDB
  useEffect(() => {
    (async () => {
      const pendingFolders = await idbGet('pendingComparisonFolders');
      if (pendingFolders && Array.isArray(pendingFolders) && pendingFolders.length > 0) {
        // Deduplicate: only add folders not already selected
        const toAdd = pendingFolders.filter(folder => !selectedFolders.find(f => f.id === folder.id));
        for (const folder of toAdd) {
          await addFolder(folder);
        }
        await idbRemove('pendingComparisonFolders');
      }
    })();
  }, [selectedFolders]);

  const addFolder = async (folder, fileTypeFilters = []) => {
    if (selectedFolders.find(f => f.id === folder.id)) {
      return; // Already selected
    }
    if (addingFolderRef.current.has(folder.id)) {
      return; // Addition already in progress
    }

    try {
      addingFolderRef.current.add(folder.id);
      setIsLoadingFolders(true);
      setScanProgress({ current: 0, total: 1, folderName: folder.name });

      let allFiles = await loadFolderFilesRecursively(folder);
      if (fileTypeFilters && fileTypeFilters.length > 0) {
        allFiles = allFiles.filter(f => fileTypeFilters.includes(getLogicalFileType(f)));
      }

      setSelectedFolders(prev => {
        if (prev.some(f => f.id === folder.id)) {
            return prev;
        }
        return [...prev, folder];
      });
      
      setFolderFiles(prev => ({
        ...prev,
        [folder.id]: { 
          folder, 
          files: allFiles,
          totalFiles: allFiles.length,
          fileTypeFilters
        }
      }));
    } catch (error) {
      console.error('Error loading folder:', error);
      alert(`Failed to load folder: ${error.message}`);
    } finally {
      setIsLoadingFolders(false);
      setScanProgress({ current: 0, total: 0, folderName: '' });
      addingFolderRef.current.delete(folder.id);
    }
  };

  // Expose addFolder and checkPendingFolders to parent
  useImperativeHandle(ref, () => ({
    addFolder,
    checkPendingFolders: async () => {
      const pendingFolders = await idbGet('pendingComparisonFolders');
      if (pendingFolders && Array.isArray(pendingFolders) && pendingFolders.length > 0) {
        const toAdd = pendingFolders.filter(folder => !selectedFolders.find(f => f.id === folder.id));
        for (const folder of toAdd) {
          await addFolder(folder);
        }
        await idbRemove('pendingComparisonFolders');
      }
    }
  }));

  const handleFolderSelect = (folder, fileTypeFilters) => {
    addFolder(folder, fileTypeFilters);
  };

  // FileBrowser event handlers
  const handleFolderClick = async (folder) => {
    setCurrentFolder(folder);
    setCurrentFolderPath(prev => [...prev, folder]);
    setIsLoadingBrowser(true);
    
    try {
      const files = await onFetchFolderFiles(folder.id);
      setBrowserFiles(files);
    } catch (error) {
      console.error('Error loading folder contents:', error);
    } finally {
      setIsLoadingBrowser(false);
    }
  };

  const handleBreadcrumbClick = (index) => {
    if (index === -1) {
      // Root folder
      setCurrentFolder(null);
      setCurrentFolderPath([]);
      setBrowserFiles([]);
    } else {
      // Navigate to specific folder in path
      const newPath = currentFolderPath.slice(0, index + 1);
      const targetFolder = newPath[newPath.length - 1];
      setCurrentFolder(targetFolder);
      setCurrentFolderPath(newPath);
      
      // Load files for this folder
      onFetchFolderFiles(targetFolder.id).then(files => {
        setBrowserFiles(files);
      }).catch(error => {
        console.error('Error loading folder contents:', error);
      });
    }
  };

  const handleAddToComparison = (folder) => {
    addFolder(folder);
  };

  const handleFileSelect = (file) => {
    // Files are not selectable in this context, only folders
  };

  const removeFolder = (folderId) => {
    setSelectedFolders(prev => prev.filter(f => f.id !== folderId));
    setFolderFiles(prev => {
      const newState = { ...prev };
      delete newState[folderId];
      return newState;
    });
  };

  const getAllFiles = useCallback(() => {
    const allFiles = [];
    Object.values(folderFiles).forEach(({ folder, files }) => {
      files.forEach(file => {
        allFiles.push({
          ...file,
          sourceFolder: folder.name,
          sourceFolderId: folder.id,
          fullPath: file.folderPath ? `${folder.name}/${file.folderPath}/${file.name}` : `${folder.name}/${file.name}`
        });
      });
    });
    return allFiles;
  }, [folderFiles]);

  const scanForDuplicates = async () => {
    if (selectedFolders.length === 0) {
      alert('Please select at least one folder to scan.');
      return;
    }

    setIsScanning(true);
    setScanProgress({ current: 0, total: 1, folderName: 'Initializing...' });
    
    // Track scan initiation
    analytics.trackEvent('duplicate_scan_started', {
      folderCount: selectedFolders.length,
      detectionMethods: Object.keys(detectionMethods).filter(method => detectionMethods[method])
    });

    try {
      const allFiles = [];
      let totalFilesLoaded = 0;
      
      console.log('Starting scan with folders:', selectedFolders.map(f => f.name));
      
      // Load files from all selected folders with progress tracking
      for (let i = 0; i < selectedFolders.length; i++) {
        const folder = selectedFolders[i];
        
        setScanProgress({ 
          current: i, 
          total: selectedFolders.length, 
          folderName: `Loading ${folder.name}...` 
        });
        
        try {
          console.log(`Loading files from folder: ${folder.name}`);
          const files = await loadFolderFilesRecursively(folder);
          console.log(`Loaded ${files.length} files from ${folder.name}`);
          
          allFiles.push(...files);
          totalFilesLoaded += files.length;
          
          setFolderFiles(prev => ({
            ...prev,
            [folder.id]: { 
              folder, 
              files,
              totalFiles: files.length
            }
          }));
          
          // Update progress
          setScanProgress({ 
            current: i + 1, 
            total: selectedFolders.length, 
            folderName: `Loaded ${folder.name} (${files.length} files)` 
          });
          
          // Yield control to prevent UI blocking
          await new Promise(resolve => setTimeout(resolve, 0));
          
        } catch (error) {
          console.error(`Error loading files from folder ${folder.name}:`, error);
          analytics.trackError(error, { 
            action: 'load_folder_files',
            folderName: folder.name 
          });
          // Continue with other folders instead of failing completely
        }
      }

      console.log(`Total files loaded: ${allFiles.length}`);
      
      if (allFiles.length === 0) {
        console.log('No files found in selected folders');
        setDuplicateGroups([]);
        setSelectedFiles(new Set());
        return;
      }

      // Detect duplicates with progress tracking
      setScanProgress({ 
        current: 0, 
        total: allFiles.length, 
        folderName: 'Analyzing files for duplicates...' 
      });
      
      // Get enabled detection methods
      const enabledMethods = Object.keys(detectionMethods)
        .filter(method => detectionMethods[method])
        .map(method => {
          switch (method) {
            case 'exact': return 'exact';
            case 'similar': return 'similar';
            case 'size': return 'size';
            case 'hash': return 'hash';
            default: return null;
          }
        })
        .filter(Boolean);
      
      console.log('Using detection methods:', enabledMethods);
      
      let duplicates;
      
      // Use Web Worker for large file sets (> 10,000 files) to prevent UI blocking
      if (allFiles.length > 10000 && typeof Worker !== 'undefined') {
        try {
          console.log('Using Web Worker for duplicate detection');
          setScanProgress({ 
            current: 0, 
            total: allFiles.length, 
            folderName: 'Starting Web Worker for duplicate detection...' 
          });
          duplicates = await detectDuplicatesWithWorker(allFiles, enabledMethods);
        } catch (workerError) {
          console.warn('Web Worker failed, falling back to main thread:', workerError);
          setScanProgress({ 
            current: 0, 
            total: allFiles.length, 
            folderName: 'Web Worker failed, using main thread...' 
          });
          duplicates = await detectDuplicatesInMainThread(allFiles, enabledMethods);
        }
      } else {
        console.log('Using main thread for duplicate detection');
        setScanProgress({ 
          current: 0, 
          total: allFiles.length, 
          folderName: 'Processing duplicates in main thread...' 
        });
        duplicates = await detectDuplicatesInMainThread(allFiles, enabledMethods);
      }
      
      console.log(`Found ${duplicates.length} duplicate groups`);
      setDuplicateGroups(duplicates);
      setSelectedFiles(new Set());
      
      // Track scan completion
      analytics.trackEvent('duplicate_scan_completed', {
        totalFiles: allFiles.length,
        duplicateGroups: duplicates.length,
        totalDuplicates: duplicates.reduce((sum, group) => sum + group.files.length, 0),
        detectionMethods: enabledMethods,
        usedWorker: allFiles.length > 10000
      });
      
      setScanProgress({ 
        current: allFiles.length, 
        total: allFiles.length, 
        folderName: `Found ${duplicates.length} duplicate groups` 
      });
      
    } catch (error) {
      console.error('Error scanning for duplicates:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      analytics.trackError(error, { action: 'scan_duplicates' });
      alert(`Error scanning for duplicates: ${error.message}. Please try again.`);
    } finally {
      setIsScanning(false);
      setScanProgress({ current: 0, total: 0, folderName: '' });
    }
  };

  // Detect duplicates using Web Worker
  const detectDuplicatesWithWorker = (files, methods) => {
    return new Promise((resolve, reject) => {
      try {
        // Use dynamic import for the worker to reduce initial bundle size
        const workerUrl = new URL('/src/utils/duplicateDetectorWorker.js', import.meta.url);
        const worker = new Worker(workerUrl, { type: 'module' });
        
        worker.onmessage = (e) => {
          const { type, data } = e.data;
          
          switch (type) {
            case 'progress':
              setScanProgress({ 
                current: data.current, 
                total: data.total, 
                folderName: data.message || 'Processing duplicates...' 
              });
              break;
              
            case 'complete':
              worker.terminate();
              resolve(data);
              break;
              
            case 'error':
              worker.terminate();
              reject(new Error(data));
              break;
          }
        };
        
        worker.onerror = (error) => {
          worker.terminate();
          reject(error);
        };
        
        worker.postMessage({
          type: 'detect_duplicates',
          data: { files, methods }
        });
        
      } catch (error) {
        reject(error);
      }
    });
  };

  // Detect duplicates in main thread
  const detectDuplicatesInMainThread = async (files, methods) => {
    const detector = new DuplicateDetector();
    
    // Set up progress callback with more frequent updates
    detector.setProgressCallback((current, total, message) => {
      setScanProgress({ 
        current, 
        total, 
        folderName: message || 'Processing duplicates...' 
      });
      
      // Yield control to prevent UI blocking
      if (current % 1000 === 0) {
        setTimeout(() => {}, 0);
      }
    });
    
    try {
      console.log('Starting main thread duplicate detection with', files.length, 'files');
      const result = await detector.findAllDuplicates(files, methods);
      console.log('Main thread detection completed, found', result.length, 'groups');
      return result;
    } catch (error) {
      console.error('Error in main thread detection:', error);
      throw error;
    }
  };

  const handleFileSelection = (fileId, isSelected) => {
    const newSelected = new Set(selectedFiles);
    if (isSelected) {
      newSelected.add(fileId);
    } else {
      newSelected.delete(fileId);
    }
    setSelectedFiles(newSelected);
  };

  const handleGroupSelection = (groupIndex, isSelected) => {
    const newSelected = new Set(selectedFiles);
    const group = duplicateGroups[groupIndex];
    
    group.files.forEach(file => {
      if (isSelected) {
        newSelected.add(file.id);
      } else {
        newSelected.delete(file.id);
      }
    });
    
    setSelectedFiles(newSelected);
  };

  // Smart selection functions
  const smartSelectKeepNewest = () => {
    setCurrentKeepStrategy('newest');
    const newSelected = new Set(selectedFiles);
    
    duplicateGroups.forEach(group => {
      // Sort files by date (newest first) and keep only the newest one
      const sortedFiles = [...group.files].sort((a, b) => 
        new Date(b.lastModifiedDateTime) - new Date(a.lastModifiedDateTime)
      );
      
      // Select all files except the newest one
      sortedFiles.slice(1).forEach(file => {
        newSelected.add(file.id);
      });
    });
    
    setSelectedFiles(newSelected);
  };

  const smartSelectKeepOldest = () => {
    setCurrentKeepStrategy('oldest');
    const newSelected = new Set(selectedFiles);
    
    duplicateGroups.forEach(group => {
      // Sort files by date (oldest first) and keep only the oldest one
      const sortedFiles = [...group.files].sort((a, b) => 
        new Date(a.lastModifiedDateTime) - new Date(b.lastModifiedDateTime)
      );
      
      // Select all files except the oldest one
      sortedFiles.slice(1).forEach(file => {
        newSelected.add(file.id);
      });
    });
    
    setSelectedFiles(newSelected);
  };

  const smartSelectKeepLargest = () => {
    setCurrentKeepStrategy('largest');
    const newSelected = new Set(selectedFiles);
    
    duplicateGroups.forEach(group => {
      // Sort files by size (largest first) and keep only the largest one
      const sortedFiles = [...group.files].sort((a, b) => b.size - a.size);
      
      // Select all files except the largest one
      sortedFiles.slice(1).forEach(file => {
        newSelected.add(file.id);
      });
    });
    
    setSelectedFiles(newSelected);
  };

  const smartSelectKeepSmallest = () => {
    setCurrentKeepStrategy('smallest');
    const newSelected = new Set(selectedFiles);
    
    duplicateGroups.forEach(group => {
      // Sort files by size (smallest first) and keep only the smallest one
      const sortedFiles = [...group.files].sort((a, b) => a.size - b.size);
      
      // Select all files except the smallest one
      sortedFiles.slice(1).forEach(file => {
        newSelected.add(file.id);
      });
    });
    
    setSelectedFiles(newSelected);
  };

  const selectAllDuplicates = () => {
    const newSelected = new Set();
    duplicateGroups.forEach(group => {
      group.files.forEach(file => {
        newSelected.add(file.id);
      });
    });
    setSelectedFiles(newSelected);
  };

  const deselectAll = () => {
    setSelectedFiles(new Set());
  };

  const invertSelection = () => {
    const allFileIds = new Set();
    duplicateGroups.forEach(group => {
      group.files.forEach(file => {
        allFileIds.add(file.id);
      });
    });
    
    const newSelected = new Set();
    allFileIds.forEach(id => {
      if (!selectedFiles.has(id)) {
        newSelected.add(id);
      }
    });
    
    setSelectedFiles(newSelected);
  };

  // Calculate summary statistics
  const getSelectionSummary = () => {
    const selectedFilesArray = Array.from(selectedFiles).map(id => {
      for (const group of duplicateGroups) {
        const file = group.files.find(f => f.id === id);
        if (file) return file;
      }
      return null;
    }).filter(Boolean);

    const totalSelectedSize = selectedFilesArray.reduce((sum, file) => sum + file.size, 0);
    const selectedGroups = new Set();
    
    duplicateGroups.forEach((group, groupIndex) => {
      if (group.files.some(file => selectedFiles.has(file.id))) {
        selectedGroups.add(groupIndex);
      }
    });

    return {
      selectedFiles: selectedFilesArray.length,
      selectedSize: totalSelectedSize,
      selectedGroups: selectedGroups.size,
      totalGroups: duplicateGroups.length,
      totalDuplicateFiles: duplicateGroups.reduce((sum, group) => sum + group.files.length, 0)
    };
  };

  // Get the "keeper" file for a group (the one that won't be deleted)
  const getKeeperFile = (group, keepStrategy = 'newest') => {
    if (group.files.length <= 1) return null;
    
    const sortedFiles = [...group.files].sort((a, b) => {
      switch (keepStrategy) {
        case 'newest':
          return new Date(b.lastModifiedDateTime) - new Date(a.lastModifiedDateTime);
        case 'oldest':
          return new Date(a.lastModifiedDateTime) - new Date(b.lastModifiedDateTime);
        case 'largest':
          return b.size - a.size;
        case 'smallest':
          return a.size - b.size;
        default:
          return new Date(b.lastModifiedDateTime) - new Date(a.lastModifiedDateTime);
      }
    });
    
    return sortedFiles[0]; // First file after sorting is the keeper
  };

  // Sorting and filtering functions
  const handleSort = (newSortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
  };

  const sortFiles = (files) => {
    return [...files].sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'size':
          aValue = a.size;
          bValue = b.size;
          break;
        case 'date':
          aValue = new Date(a.lastModifiedDateTime);
          bValue = new Date(b.lastModifiedDateTime);
          break;
        case 'folder':
          aValue = a.fullPath.toLowerCase();
          bValue = b.fullPath.toLowerCase();
          break;
        case 'depth':
          aValue = a.depth || 0;
          bValue = b.depth || 0;
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  };

  const filterFiles = (files) => {
    return files.filter(file => {
      // Filter by folder path
      if (filterFolder && !file.fullPath.toLowerCase().includes(filterFolder.toLowerCase())) {
        return false;
      }
      
      // Filter by size
      if (filterSize) {
        const sizeMatch = filterSize.match(/^([<>]?)(\d+(?:\.\d+)?)([KMGT]?B?)$/i);
        if (sizeMatch) {
          const [, operator, value, unit] = sizeMatch;
          const fileSize = file.size;
          let filterSizeBytes = parseFloat(value);
          
          // Convert to bytes
          switch (unit.toUpperCase()) {
            case 'KB':
              filterSizeBytes *= 1024;
              break;
            case 'MB':
              filterSizeBytes *= 1024 * 1024;
              break;
            case 'GB':
              filterSizeBytes *= 1024 * 1024 * 1024;
              break;
            case 'TB':
              filterSizeBytes *= 1024 * 1024 * 1024 * 1024;
              break;
            default:
              // No conversion needed for bytes
              break;
          }
          
          switch (operator) {
            case '>':
              if (fileSize <= filterSizeBytes) return false;
              break;
            case '<':
              if (fileSize >= filterSizeBytes) return false;
              break;
            default:
              if (fileSize !== filterSizeBytes) return false;
              break;
          }
        }
      }
      
      // Filter by date
      if (filterDate) {
        const fileDate = new Date(file.lastModifiedDateTime);
        const filterDateObj = new Date(filterDate);
        
        // Compare dates (ignore time)
        const fileDateOnly = new Date(fileDate.getFullYear(), fileDate.getMonth(), fileDate.getDate());
        const filterDateOnly = new Date(filterDateObj.getFullYear(), filterDateObj.getMonth(), filterDateObj.getDate());
        
        if (fileDateOnly.getTime() !== filterDateOnly.getTime()) {
          return false;
        }
      }
      
      return true;
    });
  };

  const clearFilters = () => {
    setFilterFolder('');
    setFilterSize('');
    setFilterDate('');
  };

  const getFilterSummary = () => {
    const allFiles = duplicateGroups.reduce((acc, group) => [...acc, ...group.files], []);
    const filteredFiles = filterFiles(allFiles);
    return {
      total: allFiles.length,
      filtered: filteredFiles.length,
      hidden: allFiles.length - filteredFiles.length
    };
  };

  const handleDeleteSelected = async () => {
    if (selectedFiles.size === 0) return;

    const allFiles = getAllFiles();
    const filesToDelete = Array.from(selectedFiles).map(id => 
      allFiles.find(file => file.id === id)
    ).filter(Boolean);

    const totalSize = filesToDelete.reduce((sum, file) => sum + file.size, 0);
    
    if (window.confirm(`Are you sure you want to delete ${filesToDelete.length} files? This will free up ${detector.formatFileSize(totalSize)} of space.`)) {
      setIsDeleting(true);
      setDeleteProgress({ current: 0, total: filesToDelete.length, fileName: '' });
      
      try {
        // Delete all files at once (the function handles parallel processing internally)
        const deletedFiles = await onDeleteFiles(filesToDelete, (current, total, message) => {
          setDeleteProgress({ 
            current, 
            total, 
            fileName: message 
          });
        });
        
        setSelectedFiles(new Set());
        
        // Show success message
        alert(`Successfully deleted ${deletedFiles.length} files and freed ${detector.formatFileSize(totalSize)} of space!`);
        
        // Refresh all folders
        setDeleteProgress({ 
          current: filesToDelete.length, 
          total: filesToDelete.length, 
          fileName: 'Refreshing folders...' 
        });
        
        const refreshPromises = selectedFolders.map(folder => {
          return loadFolderFilesRecursively(folder).then(allFiles => {
            setFolderFiles(prev => ({
              ...prev,
              [folder.id]: { 
                ...prev[folder.id],
                files: allFiles,
                totalFiles: allFiles.length
              }
            }));
          }).catch(error => {
            console.error('Error refreshing folder:', error);
        });
        });
        
        await Promise.all(refreshPromises);
        
        // NOW it's safe to reload
        window.location.reload();
        
      } catch (error) {
        console.error('Error deleting files:', error);
        alert(`Error deleting files: ${error.message}`);
      } finally {
        setIsDeleting(false);
        setDeleteProgress({ current: 0, total: 0, fileName: '' });
      }
    }
  };

  const clearSavedFolders = () => {
    if (window.confirm('Are you sure you want to clear all saved folder selections and preferences?')) {
      setSelectedFolders([]);
      setFolderFiles({});
      setSelectedFiles(new Set());
      setDuplicateGroups([]);
      
      // Clear all saved data
      localStorage.removeItem('multiFolderDuplicateManager_selectedFolders');
      localStorage.removeItem('multiFolderDuplicateManager_detectionMethods');
      localStorage.removeItem('multiFolderDuplicateManager_keepStrategy');
      localStorage.removeItem('multiFolderDuplicateManager_sortBy');
      localStorage.removeItem('multiFolderDuplicateManager_sortOrder');
      localStorage.removeItem('folderSelector_state');
      
      // Reset to default values
      setDetectionMethods({
        exact: true,
        similar: true,
        size: true,
        hash: false
      });
      setCurrentKeepStrategy('newest');
      setSortBy('name');
      setSortOrder('asc');
      setFilterFolder('');
      setFilterSize('');
      setFilterDate('');
    }
  };

  const getMethodDisplayName = (method) => {
    switch (method) {
      case 'exact': return 'Exact Match';
      case 'similar': return 'Similar Names';
      case 'size': return 'Same Size';
      case 'hash': return 'Hash Match';
      default: return method;
    }
  };

  const getMethodDescription = (method) => {
    switch (method) {
      case 'exact': return 'Files with identical names and sizes';
      case 'similar': return 'Files with similar names (80% similarity)';
      case 'size': return 'Files with identical sizes';
      case 'hash': return 'Files with identical content hashes';
      default: return '';
    }
  };

  const getFolderSummary = () => {
    const allFiles = getAllFiles();
    const totalSize = allFiles.reduce((sum, file) => sum + file.size, 0);
    
    // Calculate folder statistics
    const folderStats = selectedFolders.map(folder => {
      const folderData = folderFiles[folder.id];
      const files = folderData?.files || [];
      const size = files.reduce((sum, file) => sum + file.size, 0);
      const maxDepth = files.length > 0 ? Math.max(...files.map(f => f.depth || 0)) : 0;
      
      return {
        name: folder.name,
        fileCount: files.length,
        size: size,
        maxDepth: maxDepth
      };
    });

    return {
      totalFiles: allFiles.length,
      totalSize: totalSize,
      folderCount: selectedFolders.length,
      folderStats: folderStats
    };
  };

  if (isScanning) {
    const progressPercent = scanProgress.total > 0 
      ? Math.round((scanProgress.current / scanProgress.total) * 100) 
      : 0;
    
    return (
      <div className="multi-folder-duplicate-manager">
        <div className="scanning-indicator">
          <div className="scanning-header">
          <div className="spinner"></div>
            <h3>Scanning for Duplicates</h3>
          </div>
          
          <div className="scanning-progress">
            <p className="scanning-status">{scanProgress.folderName}</p>
            <div className="progress-container">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
              <span className="progress-text">
                {scanProgress.current} / {scanProgress.total} ({progressPercent}%)
              </span>
            </div>
          </div>
          
          <div className="scanning-stats">
            <p>📁 Scanning {selectedFolders.length} folders</p>
            <p>📄 Analyzing files recursively</p>
            <p>🔍 Using detection methods: {Object.keys(detectionMethods).filter(m => detectionMethods[m]).join(', ')}</p>
          </div>
          
          <button 
            className="cancel-scan-btn"
            onClick={() => {
              if (window.confirm('Are you sure you want to cancel the scan?')) {
                setIsScanning(false);
                setScanProgress({ current: 0, total: 0, folderName: '' });
              }
            }}
          >
            Cancel Scan
          </button>
        </div>
      </div>
    );
  }

  if (isDeleting) {
    const progressPercent = deleteProgress.total > 0 
      ? Math.round((deleteProgress.current / deleteProgress.total) * 100) 
      : 0;
    
    return (
      <div className="multi-folder-duplicate-manager">
        <div className="scanning-indicator">
          <div className="scanning-header">
            <div className="spinner"></div>
            <h3>Deleting Files</h3>
          </div>
          
          <div className="scanning-progress">
            <p className="scanning-status">{deleteProgress.fileName}</p>
            <div className="progress-container">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
              <span className="progress-text">
                {deleteProgress.current} / {deleteProgress.total} ({progressPercent}%)
              </span>
            </div>
          </div>
          
          <div className="scanning-stats">
            <p>🗑️ Deleting duplicate files</p>
            <p>📄 Processing files one by one</p>
            <p>🔄 Will refresh page after completion</p>
          </div>
          
          <div className="deletion-warning">
            <p>⚠️ Please do not close this page during deletion</p>
          </div>
        </div>
      </div>
    );
  }

  const summary = getFolderSummary();

  return (
    <div className="multi-folder-duplicate-manager">
      <div className="manager-header">
        <h2>Multi-Folder Duplicate Finder</h2>
        <p>Select multiple folders to find duplicates across them (including subfolders)</p>
      </div>

      <div className="folder-selection">
        <div className="folder-selection-header">
          <h3>Selected Folders ({selectedFolders.length})</h3>
          <div className="folder-actions">
            <button 
              className="add-folder-btn"
              onClick={() => setCurrentFolder({ id: 'root', name: 'Root' })}
              disabled={isLoadingFolders}
            >
              {isLoadingFolders ? 'Loading...' : '📁 Browse Folders'}
            </button>
            {selectedFolders.length > 0 && (
              <button 
                className="clear-folders-btn"
                onClick={clearSavedFolders}
                title="Clear all saved folder selections"
              >
                Clear All
              </button>
            )}
          </div>
        </div>
        
        {isLoadingFolders && scanProgress.total > 0 && (
          <div className="scan-progress">
            <p>Scanning: {scanProgress.folderName}</p>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${(scanProgress.current / scanProgress.total) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        <div className="selected-folders">
          {selectedFolders.map((folder) => (
            <div key={folder.id} className="selected-folder">
              <span className="folder-name">📁 {folder.name}</span>
              <span className="folder-file-count">
                {folderFiles[folder.id]?.totalFiles || 0} files (recursive)
              </span>
              <button 
                className="remove-folder-btn"
                onClick={() => removeFolder(folder.id)}
                title="Remove folder"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        {selectedFolders.length < 2 && (
          <p className="folder-hint">
            Select at least 2 folders to start comparing for duplicates
          </p>
        )}
      </div>

      {/* Embedded FileBrowser for folder selection */}
      {currentFolder && (
        <div className="embedded-file-browser">
          <div className="browser-header">
            <h3>Browse and Select Folders</h3>
            <button 
              className="close-browser-btn"
              onClick={() => setCurrentFolder(null)}
              title="Close folder browser"
            >
              ×
            </button>
          </div>
          <FileBrowser
            files={browserFiles}
            currentFolder={currentFolder}
            folderPath={currentFolderPath}
            onFolderClick={handleFolderClick}
            onBreadcrumbClick={handleBreadcrumbClick}
            onFileSelect={handleFileSelect}
            onAddToComparison={handleAddToComparison}
            defaultViewMode="grid"
            showFileSizes={true}
            showFileDates={true}
            compactMode={true}
          />
        </div>
      )}

      {selectedFolders.length >= 2 && (
        <>
          <div className="folder-summary">
            <div className="summary-item">
              <span className="summary-label">Total Folders:</span>
              <span className="summary-value">{summary.folderCount}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Total Files (Recursive):</span>
              <span className="summary-value">{summary.totalFiles}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Total Size:</span>
              <span className="summary-value">{detector.formatFileSize(summary.totalSize)}</span>
            </div>
          </div>

          <div className="folder-details">
            <h3>Folder Details:</h3>
            <div className="folder-stats-grid">
              {summary.folderStats.map((stat, index) => (
                <div key={index} className="folder-stat-item">
                  <div className="folder-stat-header">
                    <span className="folder-stat-name">📁 {stat.name}</span>
                  </div>
                  <div className="folder-stat-details">
                    <span className="folder-stat-count">{stat.fileCount} files</span>
                    <span className="folder-stat-size">{detector.formatFileSize(stat.size)}</span>
                    {stat.maxDepth > 0 && (
                      <span className="folder-stat-depth">Max depth: {stat.maxDepth}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="detection-methods">
            <h3>Detection Methods:</h3>
            {Object.entries(detectionMethods).map(([method, enabled]) => (
              <label key={method} className="method-checkbox">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setDetectionMethods(prev => ({
                    ...prev,
                    [method]: e.target.checked
                  }))}
                />
                {getMethodDisplayName(method)}
              </label>
            ))}
          </div>

          {/* Scan Button */}
          <div className="scan-controls">
            <button 
              className="scan-button primary"
              onClick={scanForDuplicates}
              disabled={isScanning || Object.keys(detectionMethods).filter(m => detectionMethods[m]).length === 0}
              title={Object.keys(detectionMethods).filter(m => detectionMethods[m]).length === 0 
                ? 'Please select at least one detection method' 
                : 'Start scanning for duplicates across all selected folders'}
            >
              {isScanning ? '🔄 Scanning...' : '🔍 Scan for Duplicates'}
            </button>
            {Object.keys(detectionMethods).filter(m => detectionMethods[m]).length === 0 && (
              <p className="scan-hint">Please select at least one detection method to start scanning</p>
            )}
          </div>

          {/* Filtering Controls */}
          <div className="filtering-controls">
            <div className="filter-header">
              <h3>Filter & Sort Options</h3>
              <button 
                className="clear-filters-btn"
                onClick={clearFilters}
                disabled={!filterFolder && !filterSize && !filterDate}
              >
                🗑️ Clear Filters
              </button>
            </div>
            
            <div className="filter-inputs">
              <div className="filter-group">
                <label className="filter-label">📁 Folder Path:</label>
                <input
                  type="text"
                  value={filterFolder}
                  onChange={(e) => setFilterFolder(e.target.value)}
                  placeholder="Enter folder path to filter..."
                  className="filter-input"
                />
              </div>
              
              <div className="filter-group">
                <label className="filter-label">📏 File Size:</label>
                <input
                  type="text"
                  value={filterSize}
                  onChange={(e) => setFilterSize(e.target.value)}
                  placeholder="e.g., >10MB, <1GB, 5MB"
                  className="filter-input"
                />
              </div>
              
              <div className="filter-group">
                <label className="filter-label">📅 Date Modified:</label>
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="filter-input"
                />
              </div>
            </div>
            
            <div className="filter-summary">
              <span className="filter-info">
                Showing {getFilterSummary().filtered} of {getFilterSummary().total} files
                {getFilterSummary().hidden > 0 && (
                  <span className="filter-hidden"> ({getFilterSummary().hidden} hidden)</span>
                )}
              </span>
            </div>
          </div>

          {/* Enhanced Summary Bar */}
          <div className="enhanced-summary-bar">
            <div className="summary-stats">
              <div className="summary-stat-item">
                <span className="stat-label">Duplicate Groups:</span>
                <span className="stat-value">{duplicateGroups.length}</span>
              </div>
              <div className="summary-stat-item">
                <span className="stat-label">Total Duplicate Files:</span>
                <span className="stat-value">{getSelectionSummary().totalDuplicateFiles}</span>
              </div>
              <div className="summary-stat-item">
                <span className="stat-label">Selected Files:</span>
                <span className="stat-value">{getSelectionSummary().selectedFiles}</span>
              </div>
              <div className="summary-stat-item">
                <span className="stat-label">Space to Free:</span>
                <span className="stat-value highlight">{detector.formatFileSize(getSelectionSummary().selectedSize)}</span>
              </div>
              {duplicateGroups.length > 0 && (
                <div className="summary-stat-item strategy-indicator">
                  <span className="stat-label">Current Strategy:</span>
                  <span className="stat-value strategy-value">
                    {currentKeepStrategy === 'newest' && '🆕 Keep Newest'}
                    {currentKeepStrategy === 'oldest' && '📅 Keep Oldest'}
                    {currentKeepStrategy === 'largest' && '📏 Keep Largest'}
                    {currentKeepStrategy === 'smallest' && '📐 Keep Smallest'}
                  </span>
                </div>
              )}
            </div>
            
            <div className="selection-controls">
              <div className="smart-selection-buttons">
                <button 
                  className="smart-select-btn"
                  onClick={smartSelectKeepNewest}
                  title="Keep newest file in each group, select others for deletion"
                >
                  🆕 Keep Newest
                </button>
                <button 
                  className="smart-select-btn"
                  onClick={smartSelectKeepOldest}
                  title="Keep oldest file in each group, select others for deletion"
                >
                  📅 Keep Oldest
                </button>
                <button 
                  className="smart-select-btn"
                  onClick={smartSelectKeepLargest}
                  title="Keep largest file in each group, select others for deletion"
                >
                  📏 Keep Largest
                </button>
                <button 
                  className="smart-select-btn"
                  onClick={smartSelectKeepSmallest}
                  title="Keep smallest file in each group, select others for deletion"
                >
                  📐 Keep Smallest
                </button>
              </div>
              
              <div className="bulk-selection-buttons">
                <button 
                  className="bulk-select-btn"
                  onClick={selectAllDuplicates}
                  title="Select all duplicate files for deletion"
                >
                  ☑️ Select All
                </button>
                <button 
                  className="bulk-select-btn"
                  onClick={deselectAll}
                  title="Deselect all files"
                >
                  ☐ Deselect All
                </button>
                <button 
                  className="bulk-select-btn"
                  onClick={invertSelection}
                  title="Invert current selection"
                >
                  ↕️ Invert Selection
                </button>
              </div>
            </div>
            
            {getSelectionSummary().selectedFiles > 0 && (
              <div className="delete-section">
                <button 
                  className="delete-button primary"
                  onClick={handleDeleteSelected}
                  title={`Delete ${getSelectionSummary().selectedFiles} files and free ${detector.formatFileSize(getSelectionSummary().selectedSize)} of space`}
                >
                  🗑️ Delete Selected Files ({getSelectionSummary().selectedFiles})
                </button>
              </div>
            )}
          </div>

          <div className="duplicate-groups">
            {duplicateGroups.map((group, groupIndex) => {
              // Apply filtering and sorting to group files
              const filteredFiles = filterFiles(group.files);
              const sortedFiles = sortFiles(filteredFiles);
              
              // Skip rendering the entire group if no files match filters
              if (sortedFiles.length === 0) {
                return null;
              }
              
              return (
                <div key={groupIndex} className="duplicate-group">
                  <div className="group-header">
                    <div className="group-info">
                      <h3>{getMethodDisplayName(group.method)}</h3>
                      <p>{getMethodDescription(group.method)}</p>
                      <p>{group.files.length} files • {detector.formatFileSize(group.totalSize)}</p>
                      {group.files.length > 1 && (
                        <div className="keeper-info">
                          <span className="keeper-label">💾 Keeper ({currentKeepStrategy}):</span>
                          <span className="keeper-file">{getKeeperFile(group, currentKeepStrategy)?.name}</span>
                        </div>
                      )}
                    </div>
                    <label className="group-select">
              <input
                        type="checkbox"
                        checked={group.files.every(file => selectedFiles.has(file.id))}
                        onChange={(e) => handleGroupSelection(groupIndex, e.target.checked)}
                      />
                      Select All
                    </label>
            </div>
                  
                  {/* Sortable Column Headers */}
                  <div className="file-list-header sticky-col">
                    <div className="header-cell sortable" onClick={() => handleSort('name')}>
                      <span>File Name</span>
                      {sortBy === 'name' && <span className="sort-indicator">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                    </div>
                    <div className="header-cell sortable" onClick={() => handleSort('folder')}>
                      <span>Folder Path</span>
                      {sortBy === 'folder' && <span className="sort-indicator">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                    </div>
                    <div className="header-cell sortable" onClick={() => handleSort('size')}>
                      <span>Size</span>
                      {sortBy === 'size' && <span className="sort-indicator">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                    </div>
                    <div className="header-cell sortable" onClick={() => handleSort('date')}>
                      <span>Date Modified</span>
                      {sortBy === 'date' && <span className="sort-indicator">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                    </div>
                    <div className="header-cell sortable" onClick={() => handleSort('depth')}>
                      <span>Depth</span>
                      {sortBy === 'depth' && <span className="sort-indicator">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                    </div>
                    <div className="header-cell">
                      <span>Select</span>
                    </div>
                  </div>
                  
                  <div className="file-list">
                    {sortedFiles.map((file) => (
                      <div 
                        key={file.id} 
                        className={`file-item ${selectedFiles.has(file.id) ? 'selected' : ''}`}
                        title={`File: ${file.name}
Path: ${file.fullPath}
Size: ${detector.formatFileSize(file.size)}
Modified: ${new Date(file.lastModifiedDateTime).toLocaleString()}
Depth: ${file.depth} levels deep`}
                      >
                        <div className="file-cell file-name sticky-col">{file.name}</div>
                        <div className="file-cell file-folder" style={{ paddingLeft: `${file.depth * 20 + 8}px` }}>
                          📁 {file.fullPath}
                        </div>
                        <div className="file-cell file-size">{detector.formatFileSize(file.size)}</div>
                        <div className="file-cell file-date">
                          {new Date(file.lastModifiedDateTime).toLocaleDateString()}
                        </div>
                        <div className="file-cell file-depth">{file.depth}</div>
                        <div className="file-cell file-select">
                          <label className="file-select-label">
                    <input
                              type="checkbox"
                              checked={selectedFiles.has(file.id)}
                              onChange={(e) => handleFileSelection(file.id, e.target.checked)}
                            />
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            
            {/* Show message when all groups are filtered out */}
            {duplicateGroups.length > 0 && duplicateGroups.every(group => {
              const filteredFiles = filterFiles(group.files);
              return filteredFiles.length === 0;
            }) && (
              <div className="no-files-message">
                <p>No files match the current filters.</p>
                <button 
                  className="clear-filters-btn small"
                  onClick={clearFilters}
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>

          {duplicateGroups.length === 0 && (
            <div className="no-duplicates">
              <p>No duplicate files found across the selected folders.</p>
              <p>Try selecting different folders or adjusting the detection methods.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
});

export default MultiFolderDuplicateManager; 
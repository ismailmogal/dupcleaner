import React, { useState, useEffect, useCallback, useMemo, useImperativeHandle, forwardRef, useRef } from 'react';
import { DuplicateDetector } from '../utils/duplicateDetector';
import FileBrowser from './FileBrowser';
import { analytics } from './Analytics';
import './MultiFolderDuplicateManager.css';
import { mfSet, mfGet, mfRemove } from '../utils/idbMultiFolder';
import { debugLog, debugWarn, debugError, idbGet, idbRemove } from '../utils/idbState';
import DuplicateManager from './DuplicateManager';
import LoadingSpinner from './LoadingSpinner';
import { useAuth } from '../hooks/useAuth';
import { useFileManagement } from '../hooks/useFileManagement';
import useFeatureFlags from '../hooks/useFeatureFlags';
import FolderSelector from './FolderSelector';

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
  const { user, isAuthenticated } = useAuth();
  const { 
    selectedFolders, 
    setSelectedFolders, 
    duplicates, 
    setDuplicates, 
    loading, 
    setLoading,
    error,
    setError,
    scanForDuplicates,
    deleteFiles,
    clearResults
  } = useFileManagement();
  
  const { isFeatureEnabled, getFeatureInfo, userTier } = useFeatureFlags();

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
  const [userProfile, setUserProfile] = useState(null);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

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

  const scanForDuplicatesLocal = async () => {
    if (selectedFolders.length === 0) {
      alert('Please select at least one folder to scan.');
      return;
    }

    // Check usage limits for multi-folder scan
    if (!checkUsageLimits('multi_folder_scan')) {
      setShowUpgradePrompt(true);
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

  const checkUsageLimits = (operation) => {
    if (!userProfile) return true;
    
    const { usage, limits } = userProfile;
    
    switch (operation) {
      case 'multi_folder_scan':
        if (limits.multiFolderScans === -1) return true; // Unlimited
        return (usage.multi_folder_scan || 0) < limits.multiFolderScans;
      case 'enhanced_ai_scan':
        if (limits.aiScans === -1) return true; // Unlimited
        return (usage.enhanced_ai_scan || 0) < limits.aiScans;
      default:
        return true;
    }
  };

  const handleUpgrade = async (newTier) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BFF_URL}/api/v2/user/upgrade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || 'test-token-12345'}`
        },
        body: JSON.stringify({ newTier })
      });
      
      if (response.ok) {
        await fetchUserProfile();
        setShowUpgradePrompt(false);
        alert(`Successfully upgraded to ${newTier} tier!`);
      }
    } catch (error) {
      console.error('Error upgrading subscription:', error);
      alert('Failed to upgrade subscription');
    }
  };

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BFF_URL}/api/v2/user/profile`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || 'test-token-12345'}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUserProfile(data);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  // Feature flag checks
  const hasMultiFolder = isFeatureEnabled('MULTI_FOLDER');
  const hasBulkActions = isFeatureEnabled('BULK_ACTIONS');
  const hasAIDetection = isFeatureEnabled('AI_DETECTION');
  const hasSmartOrganizer = isFeatureEnabled('SMART_ORGANIZER');

  const performScanForDuplicates = async () => {
    if (!selectedFolders.length) {
      setError('Please select at least one folder to scan');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const results = await scanForDuplicates(selectedFolders, {
        useAI: hasAIDetection,
        useSmartOrganizer: hasSmartOrganizer
      });
      
      if (results.length > 0) {
        setDuplicates(results);
        setShowResults(true);
      } else {
        setError('No duplicates found in the selected folders');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async (selectedDuplicates) => {
    if (!hasBulkActions) {
      setError('Bulk actions are not available in your current plan');
      return;
    }

    if (!selectedDuplicates.length) {
      setError('Please select files to delete');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedDuplicates.length} files? This action cannot be undone.`
    );

    if (!confirmed) return;

    setLoading(true);
    setError(null);

    try {
      const fileIds = selectedDuplicates.map(d => d.id);
      await deleteFiles(fileIds);
      
      // Remove deleted files from duplicates list
      setDuplicates(prev => prev.filter(d => !fileIds.includes(d.id)));
      
      setSelectedFiles(new Set());
      setShowResults(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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
        <h2>Multi-Folder Duplicate Manager</h2>
        {!hasMultiFolder && (
          <div className="feature-upgrade-prompt">
            <p>Multi-folder comparison requires a Premium subscription</p>
            <button 
              className="upgrade-button"
              onClick={() => handleUpgrade('premium')}
            >
              Upgrade to Premium
            </button>
          </div>
        )}
      </div>

      {hasMultiFolder ? (
        <>
          <div className="folder-selection-section">
            <FolderSelector
              selectedFolders={selectedFolders}
              onFoldersChange={setSelectedFolders}
              maxFolders={userTier === 'enterprise' ? 10 : 5}
            />
          </div>

          <div className="scan-controls">
            <button 
              className="scan-button"
              onClick={performScanForDuplicates}
              disabled={loading || selectedFolders.length === 0}
            >
              {loading ? <LoadingSpinner size="small" /> : 'Scan for Duplicates'}
            </button>
            
            {duplicates.length > 0 && (
              <button 
                className="clear-button"
                onClick={clearResults}
              >
                Clear Results
              </button>
            )}
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {showResults && duplicates.length > 0 && (
            <div className="results-section">
              <div className="results-header">
                <h3>Duplicate Files Found: {duplicates.length}</h3>
                {hasBulkActions && (
                  <div className="bulk-actions">
                    <button
                      className="bulk-delete-button"
                      onClick={() => handleBulkDelete(selectedFiles)}
                      disabled={selectedFiles.size === 0}
                    >
                      Delete Selected ({selectedFiles.size})
                    </button>
                  </div>
                )}
              </div>

              <div className="duplicates-list">
                {duplicates.map((duplicate, index) => (
                  <div key={index} className="duplicate-group">
                    <div className="group-header">
                      <h4>Duplicate Group {index + 1}</h4>
                      {hasBulkActions && (
                        <label className="select-all-checkbox">
                          <input
                            type="checkbox"
                            checked={duplicate.files.every(f => selectedFiles.has(f.id))}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedFiles(prev => new Set([...prev, ...duplicate.files.map(f => f.id)]));
                              } else {
                                setSelectedFiles(prev => new Set(prev.filter(id => !duplicate.files.map(f => f.id).includes(id))));
                              }
                            }}
                          />
                          Select All
                        </label>
                      )}
                    </div>
                    
                    <div className="files-grid">
                      {duplicate.files.map((file) => (
                        <div key={file.id} className="file-card">
                          {hasBulkActions && (
                            <input
                              type="checkbox"
                              checked={selectedFiles.has(file.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedFiles(prev => new Set([...prev, file.id]));
                                } else {
                                  setSelectedFiles(prev => new Set(prev.filter(id => id !== file.id)));
                                }
                              }}
                            />
                          )}
                          
                          <div className="file-info">
                            <h5>{file.name}</h5>
                            <p>Size: {detector.formatFileSize(file.size)}</p>
                            <p>Path: {file.fullPath}</p>
                            {file.similarity && (
                              <p>Similarity: {Math.round(file.similarity * 100)}%</p>
                            )}
                          </div>
                          
                          <div className="file-actions">
                            <button
                              className="delete-button"
                              onClick={() => handleDeleteSelected(file.id)}
                              title="Delete file"
                            >
                              Delete
                            </button>
                            <button
                              className="view-button"
                              onClick={() => window.open(file.webUrl, '_blank')}
                              title="View in OneDrive"
                            >
                              View
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="feature-disabled">
          <p>Multi-folder duplicate detection is not available in your current plan.</p>
          <button 
            className="upgrade-button"
            onClick={() => handleUpgrade('premium')}
          >
            Upgrade to Premium
          </button>
        </div>
      )}
    </div>
  );
});

export default MultiFolderDuplicateManager; 
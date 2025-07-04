import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import FileBrowser from './FileBrowser';
import './FolderSelector.css';
import { idbSet, idbGet } from '../utils/idbState';
import FileExplorerGrid from './FileExplorerGrid';
import { formatFileSize, getFileIcon, getFileType } from '../utils/fileUtils';

// File type options for filtering
const FILE_TYPE_OPTIONS = [
  { value: 'image', label: 'Image' },
  { value: 'video', label: 'Video' },
  { value: 'audio', label: 'Audio' },
  { value: 'pdf', label: 'PDF Document' },
  { value: 'word', label: 'Word Document' },
  { value: 'excel', label: 'Excel Spreadsheet' },
  { value: 'powerpoint', label: 'PowerPoint Presentation' },
  { value: 'compressed', label: 'Compressed Folder' },
  { value: 'other', label: 'Other' },
];

function FolderSelector({ onFetchFolderFiles, onFolderSelect, onClose }) {
  const { userPreferences } = useTheme();
  const [currentFolder, setCurrentFolder] = useState(null);
  const [folderPath, setFolderPath] = useState([]);
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [folderFilter, setFolderFilter] = useState('');
  const [isResizing, setIsResizing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [modalSize, setModalSize] = useState({ width: 1000, height: 700 });
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
  const [selectedFileTypes, setSelectedFileTypes] = useState([]);
  const modalRef = useRef(null);
  const resizeRef = useRef(null);

  const gridData = useMemo(() => {
    const folderItems = files
      .filter(item => item.folder)
      .filter(item => item.name.toLowerCase().includes(folderFilter.toLowerCase()));

    return folderItems.map(item => ({
      ...item,
      icon: getFileIcon(item),
      type: getFileType(item),
      size: `${item.folder.childCount || 0} items`,
      date: new Date(item.lastModifiedDateTime).toLocaleDateString(),
    }));
  }, [files, folderFilter]);

  // Load saved modal size from IDB
  const loadSavedSize = useCallback(async () => {
    try {
      const savedSize = await idbGet('folderSelector_size');
      if (savedSize) return savedSize;
    } catch (error) {
      console.error('Error loading saved modal size:', error);
    }
    return { width: 1000, height: 700 };
  }, []);

  // Save modal size to IDB
  const saveSize = useCallback(async (size) => {
    try {
      await idbSet('folderSelector_size', size);
    } catch (error) {
      console.error('Error saving modal size:', error);
    }
  }, []);

  // Load saved modal position from IDB
  const loadSavedPosition = useCallback(async () => {
    try {
      const savedPos = await idbGet('folderSelector_position');
      if (savedPos) return savedPos;
    } catch (error) {
      console.error('Error loading saved modal position:', error);
    }
    return { x: 0, y: 0 };
  }, []);

  // Save modal position to IDB
  const savePosition = useCallback(async (pos) => {
    try {
      await idbSet('folderSelector_position', pos);
    } catch (error) {
      console.error('Error saving modal position:', error);
    }
  }, []);

  // Load saved folder navigation state from IDB
  const loadSavedState = useCallback(async () => {
    try {
      const savedState = await idbGet('folderSelector_state');
      if (savedState) return savedState;
    } catch (error) {
      console.error('Error loading saved folder selector state:', error);
    }
    return null;
  }, []);

  // Save folder navigation state to IDB
  const saveState = useCallback(async (folder, path) => {
    try {
      const state = {
        currentFolder: folder,
        folderPath: path,
        timestamp: Date.now()
      };
      await idbSet('folderSelector_state', state);
    } catch (error) {
      console.error('Error saving folder selector state:', error);
    }
  }, []);

  // Initialize modal size and position
  useEffect(() => {
    (async () => {
      const savedSize = await loadSavedSize();
    setModalSize(savedSize);
      const savedPos = await loadSavedPosition();
      setModalPosition(savedPos);
    })();
  }, [loadSavedSize, loadSavedPosition]);

  // Drag functionality
  const handleHeaderMouseDown = useCallback((e) => {
    if (e.target.closest('.header-controls')) return; // Don't drag when clicking controls
    
    e.preventDefault();
    setIsDragging(true);
    
    const startX = e.clientX - modalPosition.x;
    const startY = e.clientY - modalPosition.y;
    
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      
      const newX = e.clientX - startX;
      const newY = e.clientY - startY;
      
      // Constrain to viewport
      const maxX = window.innerWidth - modalSize.width;
      const maxY = window.innerHeight - modalSize.height;
      
      setModalPosition({
        x: Math.max(0, Math.min(maxX, newX)),
        y: Math.max(0, Math.min(maxY, newY))
      });
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [isDragging, modalPosition, modalSize]);

  // Resize functionality
  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = modalSize.width;
    const startHeight = modalSize.height;
    
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      const newWidth = Math.max(600, Math.min(1200, startWidth + deltaX));
      const newHeight = Math.max(400, Math.min(800, startHeight + deltaY));
      
      setModalSize({ width: newWidth, height: newHeight });
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      saveSize(modalSize);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [isResizing, modalSize, saveSize]);

  const loadRootFolder = useCallback(async () => {
    try {
      setIsLoading(true);
      const rootFiles = await onFetchFolderFiles('root');
      setFiles(rootFiles);
      setCurrentFolder({ id: 'root', name: 'OneDrive' });
      setFolderPath([{ id: 'root', name: 'OneDrive' }]);
    } catch (error) {
      console.error('Error loading root folder:', error);
    } finally {
      setIsLoading(false);
    }
  }, [onFetchFolderFiles]);

  const loadSavedFolder = useCallback(async (savedState) => {
    try {
      setIsLoading(true);
      const folderFiles = await onFetchFolderFiles(savedState.currentFolder.id);
      setFiles(folderFiles);
      setCurrentFolder(savedState.currentFolder);
      setFolderPath(savedState.folderPath);
    } catch (error) {
      console.error('Error loading saved folder:', error);
      // Fallback to root if saved folder fails to load
      await loadRootFolder();
    } finally {
      setIsLoading(false);
    }
  }, [onFetchFolderFiles, loadRootFolder]);

  useEffect(() => {
    const savedState = loadSavedState();
    
    // Check if saved state is recent (within last 24 hours)
    const isRecent = savedState && (Date.now() - savedState.timestamp) < 24 * 60 * 60 * 1000;
    
    if (savedState && isRecent) {
      loadSavedFolder(savedState);
    } else {
      loadRootFolder();
    }
  }, [loadSavedState, loadSavedFolder, loadRootFolder]);

  const handleFolderClick = async (folder) => {
    try {
      setIsLoading(true);
      const folderFiles = await onFetchFolderFiles(folder.id);
      setFiles(folderFiles);
      setCurrentFolder(folder);
      const newPath = [...folderPath, folder];
      setFolderPath(newPath);
      saveState(folder, newPath);
    } catch (error) {
      console.error('Error loading folder:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBreadcrumbClick = async (index) => {
    try {
      setIsLoading(true);
      let targetFolder;
      let newPath;
      
      if (index === -1) {
        // Navigate to root
        const rootFiles = await onFetchFolderFiles('root');
        setFiles(rootFiles);
        setCurrentFolder({ id: 'root', name: 'OneDrive' });
        setFolderPath([{ id: 'root', name: 'OneDrive' }]);
        saveState({ id: 'root', name: 'OneDrive' }, [{ id: 'root', name: 'OneDrive' }]);
        return;
      } else {
        // Navigate to specific folder in path
        targetFolder = folderPath[index];
        newPath = folderPath.slice(0, index + 1);
      }
      
      const folderFiles = await onFetchFolderFiles(targetFolder.id);
      setFiles(folderFiles);
      setCurrentFolder(targetFolder);
      setFolderPath(newPath);
      saveState(targetFolder, newPath);
    } catch (error) {
      console.error('Error loading folder:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileTypeChange = (e) => {
    const { options } = e.target;
    const values = [];
    for (let i = 0; i < options.length; i++) {
      if (options[i].selected) values.push(options[i].value);
    }
    setSelectedFileTypes(values);
  };

  const handleFolderSelect = (folder) => {
    onFolderSelect(folder, selectedFileTypes);
    onClose();
  };

  const handleClose = () => {
    // Clear saved state when closing
    localStorage.removeItem('folderSelector_state');
    onClose();
  };

  const handleResetSize = () => {
    const defaultSize = { width: 1000, height: 700 };
    setModalSize(defaultSize);
    saveSize(defaultSize);
  };

  const handleResetPosition = () => {
    setModalPosition({ x: 0, y: 0 });
  };

  const handleResetAll = () => {
    handleResetSize();
    handleResetPosition();
  };

  if (isLoading) {
    return (
      <div className="folder-selector-overlay">
        <div className="folder-selector" style={{ width: modalSize.width, height: modalSize.height }}>
          <div className="loading-indicator">
            <div className="spinner"></div>
            <p>Loading folders...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="folder-selector-overlay">
      <div 
        ref={modalRef}
        className={`folder-selector ${isResizing ? 'resizing' : ''} ${isDragging ? 'dragging' : ''}`}
        style={{ 
          width: modalSize.width, 
          height: modalSize.height,
          minWidth: 600,
          minHeight: 400,
          maxWidth: '90vw',
          maxHeight: '90vh',
          transform: `translate(${modalPosition.x}px, ${modalPosition.y}px)`
        }}
      >
        <div 
          className="selector-header"
          onMouseDown={handleHeaderMouseDown}
        >
          <h3>Select Folder for Comparison</h3>
          <div className="header-controls">
            <button 
              className="reset-size-btn"
              onClick={handleResetAll}
              title="Reset to default size and position"
            >
              ↺
            </button>
          <button className="close-button" onClick={handleClose}>×</button>
          </div>
        </div>
        <div className="selector-breadcrumbs" style={{margin:'1rem 0',fontSize:'1.1rem'}}>
          {folderPath.map((folder, idx) => (
            <span key={folder.id} style={{cursor: idx < folderPath.length-1 ? 'pointer' : 'default',color: idx < folderPath.length-1 ? '#2563eb' : '#222'}} onClick={() => idx < folderPath.length-1 && handleBreadcrumbClick(idx)}>
              {folder.name}
              {idx < folderPath.length-1 && <span style={{margin:'0 0.5rem'}}>/</span>}
            </span>
          ))}
        </div>

        <div className="selector-controls">
          <div className="filter-group">
            <label htmlFor="file-type-select">File Types to Scan:</label>
            <select id="file-type-select" multiple value={selectedFileTypes} onChange={handleFileTypeChange}>
              {FILE_TYPE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <span className="filter-hint">Hold Ctrl/Cmd to select multiple</span>
          </div>
          <div className="filter-group">
            <label htmlFor="folder-search-input">Search Folders:</label>
            <input
              id="folder-search-input"
              type="text"
              placeholder="Filter displayed folders..."
              value={folderFilter}
              onChange={(e) => setFolderFilter(e.target.value)}
              className="folder-filter-input"
            />
          </div>
        </div>

        <div className="selector-content">
          <FileExplorerGrid
            data={gridData}
            onAddToComparison={handleFolderSelect}
            onRowClick={(row) => handleFolderClick(row.original)}
          />
        </div>
        <div 
          ref={resizeRef}
          className="resize-handle"
          onMouseDown={handleMouseDown}
          title="Drag to resize"
        >
          <div className="resize-indicator">⋮⋮</div>
        </div>
      </div>
    </div>
  );
}

export default FolderSelector; 
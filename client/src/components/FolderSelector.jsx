import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import FileBrowser from './FileBrowser';
import './FolderSelector.css';

function FolderSelector({ onFetchFolderFiles, onFolderSelect, onClose }) {
  const { userPreferences } = useTheme();
  const [currentFolder, setCurrentFolder] = useState(null);
  const [folderPath, setFolderPath] = useState([]);
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isResizing, setIsResizing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [modalSize, setModalSize] = useState({ width: 1000, height: 700 });
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
  const modalRef = useRef(null);
  const resizeRef = useRef(null);

  // Load saved modal size from localStorage
  const loadSavedSize = useCallback(() => {
    try {
      const savedSize = localStorage.getItem('folderSelector_size');
      if (savedSize) {
        const parsed = JSON.parse(savedSize);
        return parsed;
      }
    } catch (error) {
      console.error('Error loading saved modal size:', error);
    }
    return { width: 1000, height: 700 };
  }, []);

  // Save modal size to localStorage
  const saveSize = useCallback((size) => {
    try {
      localStorage.setItem('folderSelector_size', JSON.stringify(size));
    } catch (error) {
      console.error('Error saving modal size:', error);
    }
  }, []);

  // Load saved folder navigation state from localStorage
  const loadSavedState = useCallback(() => {
    try {
      const savedState = localStorage.getItem('folderSelector_state');
      if (savedState) {
        const parsed = JSON.parse(savedState);
        return parsed;
      }
    } catch (error) {
      console.error('Error loading saved folder selector state:', error);
    }
    return null;
  }, []);

  // Save folder navigation state to localStorage
  const saveState = useCallback((folder, path) => {
    try {
      const state = {
        currentFolder: folder,
        folderPath: path,
        timestamp: Date.now()
      };
      localStorage.setItem('folderSelector_state', JSON.stringify(state));
    } catch (error) {
      console.error('Error saving folder selector state:', error);
    }
  }, []);

  // Initialize modal size
  useEffect(() => {
    const savedSize = loadSavedSize();
    setModalSize(savedSize);
  }, [loadSavedSize]);

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

  const handleFolderSelect = (folder) => {
    onFolderSelect(folder);
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
        <div className="selector-content">
          <FileBrowser 
            files={files}
            currentFolder={currentFolder}
            folderPath={folderPath}
            onFolderClick={handleFolderClick}
            onBreadcrumbClick={handleBreadcrumbClick}
            onFileSelect={() => {}}
            selectedFiles={new Set()}
            onAddToComparison={handleFolderSelect}
            defaultViewMode={userPreferences.fileBrowserViewMode}
            showFileSizes={userPreferences.showFileSizes}
            showFileDates={userPreferences.showFileDates}
            compactMode={userPreferences.compactMode}
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
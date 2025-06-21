import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DuplicateDetector } from '../utils/duplicateDetector';
import { debugLog, debugWarn, debugError } from '../utils/idbState';
import './DuplicateManager.css';

function DuplicateManager({ files, onDeleteFiles, currentFolder, onFolderClick }) {
  const [duplicateGroups, setDuplicateGroups] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState(new Set());
  const [detectionMethods, setDetectionMethods] = useState({
    exact: true,
    similar: true,
    size: true,
    hash: false
  });
  const [isScanning, setIsScanning] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState({ current: 0, total: 0, fileName: '' });

  const detector = useMemo(() => new DuplicateDetector(), []);

  const scanForDuplicates = useCallback(async () => {
    setIsScanning(true);
    
    try {
      debugLog('Starting duplicate scan with', files.length, 'files');
      const methods = Object.keys(detectionMethods).filter(key => detectionMethods[key]);
      debugLog('Using detection methods:', methods);
      
      if (files.length === 0) {
        debugLog('No files to scan');
        setDuplicateGroups([]);
        return;
      }
      
      // Log first few files to check structure
      debugLog('Sample files:', files.slice(0, 3));
      
      const groups = await detector.findAllDuplicates(files, methods);
      debugLog('Found duplicate groups:', groups.length);
      debugLog('Groups:', groups);
      setDuplicateGroups(groups);
    } catch (error) {
      debugError('Error scanning for duplicates:', error);
      setDuplicateGroups([]);
    } finally {
      setIsScanning(false);
    }
  }, [files, detectionMethods, detector]);

  useEffect(() => {
    debugLog('DuplicateManager useEffect triggered');
    debugLog('Files length:', files.length);
    debugLog('Files:', files);
    
    if (files.length > 0) {
      scanForDuplicates();
    } else {
      debugLog('No files available, setting empty groups');
      setDuplicateGroups([]);
    }
  }, [scanForDuplicates, files.length]);

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

  const handleDeleteSelected = async () => {
    if (selectedFiles.size === 0) return;

    const filesToDelete = Array.from(selectedFiles).map(id => 
      files.find(file => file.id === id)
    ).filter(Boolean);

    const totalSize = filesToDelete.reduce((sum, file) => sum + file.size, 0);
    
    if (window.confirm(`Are you sure you want to delete ${filesToDelete.length} files? This will free up ${detector.formatFileSize(totalSize)} of space.`)) {
      setIsDeleting(true);
      setDeleteProgress({ current: 0, total: filesToDelete.length, fileName: 'Starting deletion...' });
      
      try {
        // Delete all files in parallel with progress tracking
        setDeleteProgress({ 
          current: 0, 
          total: filesToDelete.length, 
          fileName: 'Starting deletion...' 
        });
        
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
        
        // Refresh the page to show updated data
        window.location.reload();
        
      } catch (error) {
        debugError('Error deleting files:', error);
        alert(`Error deleting files: ${error.message}`);
      } finally {
        setIsDeleting(false);
        setDeleteProgress({ current: 0, total: 0, fileName: '' });
      }
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

  const getCurrentLocation = () => {
    if (!currentFolder) {
      return 'Root Folder';
    }
    return currentFolder.name;
  };

  if (isScanning) {
    return (
      <div className="duplicate-manager">
        <div className="scanning-indicator">
          <div className="spinner"></div>
          <p>Scanning for duplicates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="duplicate-manager">
      <div className="duplicate-header">
        <h2>Duplicate File Manager</h2>
        <div className="current-location">
          <p>Current Location: <strong>{getCurrentLocation()}</strong></p>
          {currentFolder && (
            <button 
              className="nav-button"
              onClick={() => onFolderClick(null)}
            >
              ← Back to Root
            </button>
          )}
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
      </div>

      <div className="duplicate-stats">
        <p>Found {duplicateGroups.length} duplicate groups</p>
        <p>Selected {selectedFiles.size} files for deletion</p>
        {selectedFiles.size > 0 && (
          <button 
            className="delete-button"
            onClick={handleDeleteSelected}
            disabled={isDeleting}
          >
            {isDeleting ? `Deleting... (${deleteProgress.current}/${deleteProgress.total})` : 'Delete Selected Files'}
          </button>
        )}
      </div>

      <div className="duplicate-groups">
        {duplicateGroups.map((group, groupIndex) => (
          <div key={groupIndex} className="duplicate-group">
            <div className="group-header">
              <div className="group-info">
                <h3>{getMethodDisplayName(group.method)}</h3>
                <p>{getMethodDescription(group.method)}</p>
                <p>{group.files.length} files • {detector.formatFileSize(group.totalSize)}</p>
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
            
            <div className="file-list">
              {group.files.map((file, fileIndex) => (
                <div key={file.id} className="file-item">
                  <label className="file-select">
                    <input
                      type="checkbox"
                      checked={selectedFiles.has(file.id)}
                      onChange={(e) => handleFileSelection(file.id, e.target.checked)}
                    />
                  </label>
                  <div className="file-info">
                    <span className="file-name">{file.name}</span>
                    <span className="file-size">{detector.formatFileSize(file.size)}</span>
                    <span className="file-date">
                      {new Date(file.lastModifiedDateTime).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {duplicateGroups.length === 0 && (
        <div className="no-duplicates">
          <p>No duplicate files found with the selected detection methods.</p>
          {currentFolder && (
            <p>Try navigating to a different folder or adjusting the detection methods.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default DuplicateManager; 
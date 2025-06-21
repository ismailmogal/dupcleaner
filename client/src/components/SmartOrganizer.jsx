import React, { useMemo, useState } from 'react';
import { formatFileSize } from '../utils/fileUtils';
import './SmartOrganizer.css';

const LARGE_FILE_THRESHOLD = 100 * 1024 * 1024; // 100MB

const SmartOrganizer = ({ files, onDelete }) => {
  const [selectedFiles, setSelectedFiles] = useState(new Set());

  const largeFiles = useMemo(() => {
    if (!files) return [];
    return files.filter(file => !file.folder && file.size > LARGE_FILE_THRESHOLD);
  }, [files]);

  const handleFileSelect = (fileId) => {
    setSelectedFiles(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(fileId)) {
        newSelected.delete(fileId);
      } else {
        newSelected.add(fileId);
      }
      return newSelected;
    });
  };

  const handleDelete = () => {
    if (selectedFiles.size === 0) {
      alert('Please select files to delete.');
      return;
    }

    if (window.confirm(`Are you sure you want to delete ${selectedFiles.size} files? This action cannot be undone.`)) {
      onDelete(Array.from(selectedFiles));
      setSelectedFiles(new Set());
    }
  };

  return (
    <div className="smart-organizer">
      <div className="organizer-header">
        <h2>Large File Management</h2>
        <p>Review and manage files larger than 100MB to free up space.</p>
      </div>

      {selectedFiles.size > 0 && (
        <div className="organizer-actions">
          <button onClick={handleDelete} className="delete-button">
            Delete {selectedFiles.size} Selected Files
          </button>
        </div>
      )}

      {largeFiles.length > 0 ? (
        <div className="large-files-list">
          {largeFiles.map(file => (
            <div key={file.id} className="large-file-item">
              <input
                type="checkbox"
                checked={selectedFiles.has(file.id)}
                onChange={() => handleFileSelect(file.id)}
              />
              <span className="file-name">{file.name}</span>
              <span className="file-size">{formatFileSize(file.size)}</span>
            </div>
          ))}
        </div>
      ) : (
        <p>No large files (over 100MB) found in the current view.</p>
      )}
    </div>
  );
};

export default SmartOrganizer; 
import React, { useState } from 'react';
import { useFileManagement } from '../hooks/useFileManagement';
import FileBrowser from '../components/FileBrowser';
import LoadingSpinner from '../components/LoadingSpinner';
import './SmartOrganizerPage.css';

const SmartOrganizerPage = () => {
  const { 
    files,
    gridData, 
    folderPath, 
    loading, 
    error, 
    navigateToFolder, 
    navigateToPathByIndex 
  } = useFileManagement('root');
  
  const [organizeMode, setOrganizeMode] = useState('auto');
  const [selectedFiles, setSelectedFiles] = useState(new Set());
  const [organizing, setOrganizing] = useState(false);

  const handleFileSelect = (file) => {
    const newSelectedFiles = new Set(selectedFiles);
    if (newSelectedFiles.has(file.id)) {
      newSelectedFiles.delete(file.id);
    } else {
      newSelectedFiles.add(file.id);
    }
    setSelectedFiles(newSelectedFiles);
  };

  const handleAutoOrganize = async () => {
    setOrganizing(true);
    try {
      // TODO: Implement auto-organization logic
      console.log('Auto-organizing files...');
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error('Auto-organization failed:', error);
    } finally {
      setOrganizing(false);
    }
  };

  const handleManualOrganize = async () => {
    setOrganizing(true);
    try {
      // TODO: Implement manual organization logic
      console.log('Manual organization...');
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error('Manual organization failed:', error);
    } finally {
      setOrganizing(false);
    }
  };

  const handleClearSelection = () => {
    setSelectedFiles(new Set());
  };
  
  if (loading) return <LoadingSpinner />;
  if (error) return <p className="error">{error}</p>;

  return (
    <div className="smart-organizer-page">
      <div className="page-header">
        <h1>Smart File Organizer</h1>
        <p>Automatically organize your files into logical folders based on file types, dates, and content.</p>
      </div>
      
      <div className="organizer-panel">
        <div className="organizer-header">
          <h2>Organization Options</h2>
          <div className="organizer-actions">
            <button 
              className="btn btn-primary"
              onClick={organizeMode === 'auto' ? handleAutoOrganize : handleManualOrganize}
              disabled={organizing}
            >
              {organizing ? 'Organizing...' : `Start ${organizeMode === 'auto' ? 'Auto' : 'Manual'}-Organization`}
            </button>
            {selectedFiles.size > 0 && (
              <button 
                className="btn btn-secondary"
                onClick={handleClearSelection}
              >
                Clear Selection
              </button>
            )}
          </div>
        </div>
        
        <div className="mode-selector">
          <div className="mode-option">
            <label className="mode-label">
              <input
                type="radio"
                value="auto"
                checked={organizeMode === 'auto'}
                onChange={(e) => setOrganizeMode(e.target.value)}
              />
              <div className="mode-content">
                <h3>Auto-Organize</h3>
                <p>Automatically organize files based on type, date, and content analysis</p>
              </div>
            </label>
          </div>
          <div className="mode-option">
            <label className="mode-label">
              <input
                type="radio"
                value="manual"
                checked={organizeMode === 'manual'}
                onChange={(e) => setOrganizeMode(e.target.value)}
              />
              <div className="mode-content">
                <h3>Manual Organize</h3>
                <p>Select specific files and organize them manually with custom rules</p>
              </div>
            </label>
          </div>
        </div>

        {selectedFiles.size > 0 && (
          <div className="selection-info">
            <h3>Selected Files ({selectedFiles.size})</h3>
            <p>Files selected for organization will be processed according to your chosen mode.</p>
          </div>
        )}
      </div>

      <div className="browser-section">
        <div className="section-header">
          <h2>Files to Organize</h2>
          <p>Browse through your OneDrive files and select which ones to organize.</p>
        </div>
        
        <FileBrowser
          files={files}
          currentFolder={folderPath[folderPath.length - 1]}
          folderPath={folderPath}
          onFolderClick={navigateToFolder}
          onBreadcrumbClick={navigateToPathByIndex}
          onFileSelect={handleFileSelect}
          selectedFiles={selectedFiles}
          onAddToComparison={null} // No comparison functionality in organizer
          defaultViewMode="details"
          showFileSizes={true}
          showFileDates={true}
          compactMode={false}
        />
      </div>
    </div>
  );
};

export default SmartOrganizerPage;

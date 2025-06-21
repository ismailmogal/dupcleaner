import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import './FileBrowser.css';
import { debugLog, debugWarn, debugError } from '../utils/idbState';
import { formatFileSize, getFileIcon, getFileType } from '../utils/fileUtils';

function FileBrowser({ 
  files, 
  currentFolder, 
  folderPath, 
  onFolderClick, 
  onBreadcrumbClick, 
  onFileSelect, 
  selectedFiles, 
  onAddToComparison,
  defaultViewMode = 'grid',
  showFileSizes = true,
  showFileDates = true,
  compactMode = false
}) {
  const { userPreferences, updatePreferences } = useTheme();
  const [folders, setFolders] = useState([]);
  const [fileItems, setFileItems] = useState([]);
  const [viewMode, setViewMode] = useState(userPreferences.fileBrowserViewMode || defaultViewMode);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  useEffect(() => {
    debugLog('FileBrowser useEffect triggered');
    debugLog('Files received:', files?.length || 0);
    debugLog('Sample files:', files?.slice(0, 3));
    
    if (files && files.length > 0) {
      const folderItems = files.filter(item => item.folder);
      const fileItems = files.filter(item => !item.folder);
      
      debugLog('Folders found:', folderItems.length);
      debugLog('Files found:', fileItems.length);
      
      setFolders(folderItems);
      setFileItems(fileItems);
    } else {
      debugLog('No files available');
      setFolders([]);
      setFileItems([]);
    }
  }, [files]);

  useEffect(() => {
    setViewMode(userPreferences.fileBrowserViewMode || defaultViewMode);
  }, [userPreferences.fileBrowserViewMode, defaultViewMode]);

  const handleFolderClick = (folder) => {
    onFolderClick(folder);
  };

  const handleFileClick = (file) => {
    onFileSelect(file);
  };

  const handleBreadcrumbClick = (index) => {
    onBreadcrumbClick(index);
  };

  const sortItems = (items) => {
    return [...items].sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'size':
          aValue = a.size || 0;
          bValue = b.size || 0;
          break;
        case 'date':
          aValue = new Date(a.lastModifiedDateTime);
          bValue = new Date(b.lastModifiedDateTime);
          break;
        case 'type':
          aValue = getFileType(a);
          bValue = getFileType(b);
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  };

  const handleSort = (newSortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
  };

  const handleViewModeChange = (newViewMode) => {
    setViewMode(newViewMode);
    updatePreferences({ fileBrowserViewMode: newViewMode });
  };

  const renderGridView = (items, itemType) => (
    <div className="items-grid">
      {items.map((item) => (
        <div 
          key={item.id} 
          className={`${itemType}-item`}
          onClick={() => itemType === 'folder' ? handleFolderClick(item) : handleFileClick(item)}
        >
          <div className="item-icon">{getFileIcon(item)}</div>
          <div className="item-name">{item.name}</div>
          {showFileSizes && (
            <div className="item-info">
              {itemType === 'folder' 
                ? `${item.childCount || 0} items`
                : formatFileSize(item.size)
              }
            </div>
          )}
          {itemType === 'folder' && onAddToComparison && (
            <button 
              className="add-to-comparison-btn"
              onClick={(e) => {
                e.stopPropagation();
                onAddToComparison(item);
              }}
              title="Add to comparison"
            >
              +
            </button>
          )}
          {itemType === 'file' && selectedFiles.has(item.id) && (
            <div className="selection-indicator">✓</div>
          )}
        </div>
      ))}
    </div>
  );

  const renderListView = (items, itemType) => (
    <div className="items-list">
      {items.map((item) => (
        <div 
          key={item.id} 
          className={`list-item ${itemType === 'file' && selectedFiles.has(item.id) ? 'selected' : ''}`}
          onClick={() => itemType === 'folder' ? handleFolderClick(item) : handleFileClick(item)}
        >
          <div className="list-item-icon">{getFileIcon(item)}</div>
          <div className="list-item-name">{item.name}</div>
          <div className="list-item-type">{getFileType(item)}</div>
          {showFileSizes && (
            <div className="list-item-size">
              {itemType === 'folder' 
                ? `${item.childCount || 0} items`
                : formatFileSize(item.size)
              }
            </div>
          )}
          {showFileDates && (
            <div className="list-item-date">
              {new Date(item.lastModifiedDateTime).toLocaleDateString()}
            </div>
          )}
          {itemType === 'folder' && onAddToComparison && (
            <button 
              className="add-to-comparison-btn list-btn"
              onClick={(e) => {
                e.stopPropagation();
                onAddToComparison(item);
              }}
              title="Add to comparison"
            >
              +
            </button>
          )}
        </div>
      ))}
    </div>
  );

  const renderDetailsView = (items, itemType) => {
    const showSize = showFileSizes;
    const showDate = showFileDates;
    const showActions = itemType === 'folder' && onAddToComparison;
    
    const headerClass = `details-header${showSize ? ' show-size' : ''}${showDate ? ' show-date' : ''}${showActions ? ' show-actions' : ''}`;
    const itemClass = `details-item${showSize ? ' show-size' : ''}${showDate ? ' show-date' : ''}${showActions ? ' show-actions' : ''}`;
    
    return (
      <div className="items-details">
        <div className={headerClass} style={{borderRadius: '8px 8px 0 0', background: 'var(--bg-secondary, #f8f9fa)', boxShadow: '0 2px 8px rgba(0,0,0,0.03)'}}>
          <div className="details-column sticky-col" onClick={() => handleSort('name')} title="Sort by Name" style={{display:'flex',alignItems:'center',justifyContent:'flex-start'}}>
            Name {sortBy === 'name' && <span className="sort-indicator" style={{color:'#0078d4',marginLeft:4}}>{sortOrder === 'asc' ? '↑' : '↓'}</span>}
          </div>
          <div className="details-column" onClick={() => handleSort('type')} title="Sort by Type">
            <span role="img" aria-label="Type">📄</span> Type {sortBy === 'type' && <span className="sort-indicator" style={{color:'#0078d4',marginLeft:4}}>{sortOrder === 'asc' ? '↑' : '↓'}</span>}
          </div>
          {showFileSizes && (
            <div className="details-column" onClick={() => handleSort('size')} title="Sort by Size">
              <span role="img" aria-label="Size">📦</span> Size {sortBy === 'size' && <span className="sort-indicator" style={{color:'#0078d4',marginLeft:4}}>{sortOrder === 'asc' ? '↑' : '↓'}</span>}
            </div>
          )}
          {showFileDates && (
            <div className="details-column" onClick={() => handleSort('date')} title="Sort by Date Modified">
              <span role="img" aria-label="Date Modified">🕒</span> Date Modified {sortBy === 'date' && <span className="sort-indicator" style={{color:'#0078d4',marginLeft:4}}>{sortOrder === 'asc' ? '↑' : '↓'}</span>}
            </div>
          )}
          {itemType === 'folder' && onAddToComparison && (
            <div className="details-column-actions" title="Actions"><span role="img" aria-label="Actions">⚡</span> Actions</div>
          )}
        </div>
        <div className="details-content">
          {items.map((item) => (
            <div 
              key={item.id} 
              className={`${itemClass} ${itemType === 'file' && selectedFiles.has(item.id) ? 'selected' : ''}`}
              onClick={() => itemType === 'folder' ? handleFolderClick(item) : handleFileClick(item)}
            >
              <div className="details-item-icon">{getFileIcon(item)}</div>
              <div className="details-item-name sticky-col" title={item.name}>{item.name}</div>
              <div className="details-item-type">{getFileType(item)}</div>
              {showFileSizes && (
                <div className="details-item-size">
                  {itemType === 'folder' 
                    ? `${item.childCount || 0} items`
                    : formatFileSize(item.size)
                  }
                </div>
              )}
              {showFileDates && (
                <div className="details-item-date">
                  {new Date(item.lastModifiedDateTime).toLocaleDateString()}
                </div>
              )}
              {itemType === 'folder' && onAddToComparison && (
                <div className="details-item-actions">
                  <button 
                    className="add-to-comparison-btn details-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddToComparison(item);
                    }}
                    title="Add to comparison"
                  >
                    +
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const sortedFolders = sortItems(folders);
  const sortedFiles = sortItems(fileItems);

  debugLog('FileBrowser render - Folders:', sortedFolders.length, 'Files:', sortedFiles.length);
  debugLog('Selected files:', selectedFiles?.size || 0);

  return (
    <div className={`file-browser ${compactMode ? 'compact-mode' : ''}`}>
      <div className="browser-header">
        <h3>File Browser</h3>
        <div className="browser-controls">
          <div className="breadcrumbs">
            <span 
              className="breadcrumb-item clickable"
              onClick={() => handleBreadcrumbClick(-1)}
            >
              🏠 OneDrive
            </span>
            {folderPath.map((folder, index) => (
              <React.Fragment key={index}>
                <span className="breadcrumb-separator">/</span>
                <span 
                  className={`breadcrumb-item ${index === folderPath.length - 1 ? 'current' : 'clickable'}`}
                  onClick={() => handleBreadcrumbClick(index)}
                >
                  {folder.name}
                </span>
              </React.Fragment>
            ))}
          </div>
          <div className="view-controls">
            <button 
              className={`view-button ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => handleViewModeChange('grid')}
              title="Grid View"
            >
              ⊞
            </button>
            <button 
              className={`view-button ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => handleViewModeChange('list')}
              title="List View"
            >
              ☰
            </button>
            <button 
              className={`view-button ${viewMode === 'details' ? 'active' : ''}`}
              onClick={() => handleViewModeChange('details')}
              title="Details View"
            >
              ≡
            </button>
          </div>
        </div>
      </div>

      <div className="browser-content">
        <div className="folders-section">
          <h4>Folders ({folders.length})</h4>
          {folders.length > 0 ? (
            viewMode === 'grid' ? renderGridView(sortedFolders, 'folder') :
            viewMode === 'list' ? renderListView(sortedFolders, 'folder') :
            renderDetailsView(sortedFolders, 'folder')
          ) : (
            <p className="no-items">No folders in this location</p>
          )}
        </div>

        <div className="files-section">
          <h4>Files ({fileItems.length})</h4>
          {fileItems.length > 0 ? (
            viewMode === 'grid' ? renderGridView(sortedFiles, 'file') :
            viewMode === 'list' ? renderListView(sortedFiles, 'file') :
            renderDetailsView(sortedFiles, 'file')
          ) : (
            <p className="no-items">No files in this location</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default FileBrowser; 
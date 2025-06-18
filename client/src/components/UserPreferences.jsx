import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import './UserPreferences.css';

function UserPreferences({ isOpen, onClose }) {
  const { userPreferences, updatePreferences } = useTheme();
  const [localPreferences, setLocalPreferences] = useState(userPreferences);

  const handleSave = () => {
    updatePreferences(localPreferences);
    onClose();
  };

  const handleCancel = () => {
    setLocalPreferences(userPreferences);
    onClose();
  };

  const handleChange = (key, value) => {
    setLocalPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="preferences-overlay">
      <div className="preferences-modal">
        <div className="preferences-header">
          <h3>User Preferences</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="preferences-content">
          <div className="preferences-section">
            <h4>View Settings</h4>
            
            <div className="preference-item">
              <label className="preference-label">
                File Browser View Mode:
              </label>
              <select 
                value={localPreferences.fileBrowserViewMode}
                onChange={(e) => handleChange('fileBrowserViewMode', e.target.value)}
                className="preference-select"
              >
                <option value="grid">Grid View</option>
                <option value="list">List View</option>
                <option value="details">Details View</option>
              </select>
            </div>

            <div className="preference-item">
              <label className="preference-label">
                Duplicate Manager View Mode:
              </label>
              <select 
                value={localPreferences.duplicateManagerViewMode}
                onChange={(e) => handleChange('duplicateManagerViewMode', e.target.value)}
                className="preference-select"
              >
                <option value="grid">Grid View</option>
                <option value="list">List View</option>
                <option value="details">Details View</option>
              </select>
            </div>

            <div className="preference-item">
              <label className="preference-label">
                Multi-Folder View Mode:
              </label>
              <select 
                value={localPreferences.multiFolderViewMode}
                onChange={(e) => handleChange('multiFolderViewMode', e.target.value)}
                className="preference-select"
              >
                <option value="grid">Grid View</option>
                <option value="list">List View</option>
                <option value="details">Details View</option>
              </select>
            </div>
          </div>

          <div className="preferences-section">
            <h4>Display Options</h4>
            
            <div className="preference-item">
              <label className="preference-checkbox">
                <input
                  type="checkbox"
                  checked={localPreferences.showFileSizes}
                  onChange={(e) => handleChange('showFileSizes', e.target.checked)}
                />
                Show File Sizes
              </label>
            </div>

            <div className="preference-item">
              <label className="preference-checkbox">
                <input
                  type="checkbox"
                  checked={localPreferences.showFileDates}
                  onChange={(e) => handleChange('showFileDates', e.target.checked)}
                />
                Show File Dates
              </label>
            </div>

            <div className="preference-item">
              <label className="preference-checkbox">
                <input
                  type="checkbox"
                  checked={localPreferences.compactMode}
                  onChange={(e) => handleChange('compactMode', e.target.checked)}
                />
                Compact Mode
              </label>
            </div>
          </div>

          <div className="preferences-section">
            <h4>Behavior</h4>
            
            <div className="preference-item">
              <label className="preference-checkbox">
                <input
                  type="checkbox"
                  checked={localPreferences.autoScan}
                  onChange={(e) => handleChange('autoScan', e.target.checked)}
                />
                Auto-scan for duplicates
              </label>
            </div>
          </div>
        </div>

        <div className="preferences-footer">
          <button className="cancel-button" onClick={handleCancel}>
            Cancel
          </button>
          <button className="save-button" onClick={handleSave}>
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
}

export default UserPreferences; 
import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import './UserPreferences.css';
import FeatureFlagAdmin from './FeatureFlagAdmin';

const UserPreferences = ({ isOpen, onClose }) => {
  const { userPreferences, updatePreferences } = useTheme();
  const [localPreferences, setLocalPreferences] = useState(userPreferences);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [activeTab, setActiveTab] = useState('subscription'); // 'subscription', 'preferences', or 'admin'
  const [featureFlags, setFeatureFlags] = useState(null);
  const [loadingFlags, setLoadingFlags] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchUserProfile();
      setLocalPreferences(userPreferences);
    }
  }, [isOpen, userPreferences]);

  const fetchUserProfile = async () => {
    setLoading(true);
    try {
      console.log('Fetching user profile from:', `${import.meta.env.VITE_BFF_URL}/api/v2/user/profile`);
      const response = await fetch(`${import.meta.env.VITE_BFF_URL}/api/v2/user/profile`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || 'test-token-12345'}`
        }
      });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      
      if (response.ok) {
        const data = await response.json();
        console.log('User profile data:', data);
        setUserProfile(data);
      } else {
        console.error('Failed to fetch user profile:', response.status, response.statusText);
        const text = await response.text();
        console.error('Response body:', text);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (newTier) => {
    setUpgrading(true);
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
        const data = await response.json();
        setUserProfile(prev => ({
          ...prev,
          user: data.user,
          usage: data.usage,
          limits: data.limits
        }));
        alert(`Successfully upgraded to ${newTier} tier!`);
      }
    } catch (error) {
      console.error('Error upgrading subscription:', error);
      alert('Failed to upgrade subscription');
    } finally {
      setUpgrading(false);
    }
  };

  const handleChange = (key, value) => {
    setLocalPreferences(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    updatePreferences(localPreferences);
    onClose();
  };

  const handleCancel = () => {
    setLocalPreferences(userPreferences);
    onClose();
  };

  const getUsagePercentage = (current, limit) => {
    if (limit === -1) return 0; // Unlimited
    if (limit === 0) return 100;
    return Math.min((current / limit) * 100, 100);
  };

  const getUsageColor = (percentage) => {
    if (percentage >= 90) return 'var(--error-color)';
    if (percentage >= 70) return 'var(--warning-color)';
    return 'var(--success-color)';
  };

  const fetchFeatureFlags = async () => {
    setLoadingFlags(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_BFF_URL}/api/v2/admin/features`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || 'test-token-12345'}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setFeatureFlags(data);
      }
    } catch (error) {
      console.error('Error fetching feature flags:', error);
    } finally {
      setLoadingFlags(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'admin' && !featureFlags) {
      fetchFeatureFlags();
    }
  };

  if (!isOpen) return null;

  console.log('UserPreferences modal rendering, isOpen:', isOpen);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content user-preferences-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>User Preferences & Subscription</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-tabs">
          <button 
            className={`tab-button ${activeTab === 'subscription' ? 'active' : ''}`}
            onClick={() => handleTabChange('subscription')}
          >
            Subscription
          </button>
          <button 
            className={`tab-button ${activeTab === 'preferences' ? 'active' : ''}`}
            onClick={() => handleTabChange('preferences')}
          >
            Preferences
          </button>
          <button 
            className={`tab-button ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => handleTabChange('admin')}
          >
            Admin
          </button>
        </div>
        
        <div className="modal-body">
          {activeTab === 'subscription' ? (
            // Subscription Tab
            loading ? (
              <div className="loading">Loading user profile...</div>
            ) : userProfile ? (
              <div className="user-profile">
                {/* Current Subscription */}
                <div className="subscription-section">
                  <h3>Current Subscription</h3>
                  <div className="subscription-info">
                    <div className={`tier-badge tier-${userProfile.user?.subscriptionTier || 'free'}`}>
                      {(userProfile.user?.subscriptionTier || 'free').toUpperCase()}
                    </div>
                    <p>Features: {userProfile.user?.features?.join(', ') || 'No features'}</p>
                  </div>
                </div>

                {/* Usage Statistics */}
                <div className="usage-section">
                  <h3>Usage This Month</h3>
                  <div className="usage-grid">
                    <div className="usage-item">
                      <div className="usage-label">AI Scans</div>
                      <div className="usage-bar">
                        <div 
                          className="usage-fill"
                          style={{
                            width: `${getUsagePercentage(userProfile.usage?.enhanced_ai_scan || 0, userProfile.limits?.aiScans || 0)}%`,
                            backgroundColor: getUsageColor(getUsagePercentage(userProfile.usage?.enhanced_ai_scan || 0, userProfile.limits?.aiScans || 0))
                          }}
                        />
                      </div>
                      <div className="usage-text">
                        {userProfile.usage?.enhanced_ai_scan || 0} / {userProfile.limits?.aiScans === -1 ? '∞' : userProfile.limits?.aiScans || 0}
                      </div>
                    </div>
                    
                    <div className="usage-item">
                      <div className="usage-label">Multi-Folder Scans</div>
                      <div className="usage-bar">
                        <div 
                          className="usage-fill"
                          style={{
                            width: `${getUsagePercentage(userProfile.usage?.multi_folder_scan || 0, userProfile.limits?.multiFolderScans || 0)}%`,
                            backgroundColor: getUsageColor(getUsagePercentage(userProfile.usage?.multi_folder_scan || 0, userProfile.limits?.multiFolderScans || 0))
                          }}
                        />
                      </div>
                      <div className="usage-text">
                        {userProfile.usage?.multi_folder_scan || 0} / {userProfile.limits?.multiFolderScans === -1 ? '∞' : userProfile.limits?.multiFolderScans || 0}
                      </div>
                    </div>
                    
                    <div className="usage-item">
                      <div className="usage-label">Bulk Actions</div>
                      <div className="usage-bar">
                        <div 
                          className="usage-fill"
                          style={{
                            width: `${getUsagePercentage(userProfile.usage?.bulk_actions || 0, userProfile.limits?.bulkActions || 0)}%`,
                            backgroundColor: getUsageColor(getUsagePercentage(userProfile.usage?.bulk_actions || 0, userProfile.limits?.bulkActions || 0))
                          }}
                        />
                      </div>
                      <div className="usage-text">
                        {userProfile.usage?.bulk_actions || 0} / {userProfile.limits?.bulkActions === -1 ? '∞' : userProfile.limits?.bulkActions || 0}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Upgrade Options */}
                {userProfile.user?.subscriptionTier === 'free' && (
                  <div className="upgrade-section">
                    <h3>Upgrade Options</h3>
                    <div className="upgrade-options">
                      <div className="upgrade-card">
                        <h4>Premium</h4>
                        <ul>
                          <li>Unlimited AI scans</li>
                          <li>Unlimited multi-folder scans</li>
                          <li>Bulk actions</li>
                          <li>Priority support</li>
                        </ul>
                        <button 
                          className="upgrade-button"
                          onClick={() => handleUpgrade('premium')}
                          disabled={upgrading}
                        >
                          {upgrading ? 'Upgrading...' : 'Upgrade to Premium'}
                        </button>
                      </div>
                      
                      <div className="upgrade-card">
                        <h4>Enterprise</h4>
                        <ul>
                          <li>All Premium features</li>
                          <li>Team collaboration</li>
                          <li>Advanced analytics</li>
                          <li>Custom integrations</li>
                        </ul>
                        <button 
                          className="upgrade-button"
                          onClick={() => handleUpgrade('enterprise')}
                          disabled={upgrading}
                        >
                          {upgrading ? 'Upgrading...' : 'Upgrade to Enterprise'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="error">
                <p>Failed to load user profile</p>
                <p>Please check your connection and try again.</p>
                <button onClick={fetchUserProfile} className="retry-button">
                  Retry
                </button>
              </div>
            )
          ) : activeTab === 'admin' ? (
            // Admin Tab
            <div className="admin-tab">
              <h3>Admin Controls</h3>
              {userProfile?.user?.subscriptionTier === 'enterprise' ? (
                <FeatureFlagAdmin />
              ) : (
                <div className="upgrade-prompt">
                  <p>Admin controls are available for Enterprise users only.</p>
                  <button 
                    className="upgrade-button"
                    onClick={() => handleUpgrade('enterprise')}
                  >
                    Upgrade to Enterprise
                  </button>
                </div>
              )}
            </div>
          ) : (
            // Preferences Tab
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
          )}
        </div>

        <div className="modal-footer">
          {activeTab === 'preferences' && (
            <>
              <button className="save-button" onClick={handleSave}>
                Save Preferences
              </button>
              <button className="cancel-button" onClick={handleCancel}>
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserPreferences; 
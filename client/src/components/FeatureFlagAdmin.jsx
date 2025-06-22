import React, { useState, useEffect } from 'react';
import './FeatureFlagAdmin.css';

const FeatureFlagAdmin = () => {
  const [features, setFeatures] = useState({});
  const [analytics, setAnalytics] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [overrideForm, setOverrideForm] = useState({
    userId: '',
    enabled: true,
    reason: ''
  });
  const [activeTab, setActiveTab] = useState('features');

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/features', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch admin data');
      }

      const data = await response.json();
      setFeatures(data.features);
      setAnalytics(data.analytics);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateFeature = async (featureName, updates) => {
    try {
      const response = await fetch(`/api/admin/features/${featureName}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error('Failed to update feature');
      }

      const result = await response.json();
      setFeatures(prev => ({
        ...prev,
        [featureName]: result.feature
      }));

      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const setUserOverride = async (featureName, overrideData) => {
    try {
      const response = await fetch(`/api/admin/features/${featureName}/override`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify(overrideData)
      });

      if (!response.ok) {
        throw new Error('Failed to set user override');
      }

      return await response.json();
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const removeUserOverride = async (featureName, userId) => {
    try {
      const response = await fetch(`/api/admin/features/${featureName}/override/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to remove user override');
      }

      return await response.json();
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const handleFeatureToggle = async (featureName, enabled) => {
    try {
      await updateFeature(featureName, { enabled });
    } catch (err) {
      console.error('Error toggling feature:', err);
    }
  };

  const handleABTestUpdate = async (featureName, abTestData) => {
    try {
      await updateFeature(featureName, { abTest: abTestData });
    } catch (err) {
      console.error('Error updating A/B test:', err);
    }
  };

  const handleOverrideSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFeature || !overrideForm.userId) return;

    try {
      await setUserOverride(selectedFeature, overrideForm);
      setOverrideForm({ userId: '', enabled: true, reason: '' });
      setSelectedFeature(null);
    } catch (err) {
      console.error('Error setting override:', err);
    }
  };

  const getTierColor = (tier) => {
    switch (tier) {
      case 'free': return '#4CAF50';
      case 'premium': return '#2196F3';
      case 'enterprise': return '#9C27B0';
      default: return '#757575';
    }
  };

  const getStatusColor = (enabled) => {
    return enabled ? '#4CAF50' : '#F44336';
  };

  if (loading) {
    return (
      <div className="feature-flag-admin">
        <div className="loading">Loading Feature Flag Admin...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="feature-flag-admin">
        <div className="error">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="feature-flag-admin">
      <div className="admin-header">
        <h2>Feature Flag Administration</h2>
        <div className="tab-navigation">
          <button 
            className={`tab-button ${activeTab === 'features' ? 'active' : ''}`}
            onClick={() => setActiveTab('features')}
          >
            Features
          </button>
          <button 
            className={`tab-button ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            Analytics
          </button>
          <button 
            className={`tab-button ${activeTab === 'overrides' ? 'active' : ''}`}
            onClick={() => setActiveTab('overrides')}
          >
            User Overrides
          </button>
        </div>
      </div>

      {activeTab === 'features' && (
        <div className="features-tab">
          <div className="features-grid">
            {Object.entries(features).map(([featureName, feature]) => (
              <div key={featureName} className="feature-card">
                <div className="feature-header">
                  <h3>{feature.name}</h3>
                  <div className="feature-badges">
                    <span 
                      className="tier-badge"
                      style={{ backgroundColor: getTierColor(feature.tier) }}
                    >
                      {feature.tier}
                    </span>
                    <span 
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(feature.enabled) }}
                    >
                      {feature.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
                
                <p className="feature-description">{feature.description}</p>
                
                <div className="feature-controls">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={feature.enabled}
                      onChange={(e) => handleFeatureToggle(featureName, e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                  
                  {feature.abTest && (
                    <div className="ab-test-section">
                      <h4>A/B Test Configuration</h4>
                      <div className="ab-test-controls">
                        <label>
                          <input
                            type="checkbox"
                            checked={feature.abTest.enabled}
                            onChange={(e) => handleABTestUpdate(featureName, {
                              ...feature.abTest,
                              enabled: e.target.checked
                            })}
                          />
                          Enable A/B Test
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={feature.abTest.percentage || 0}
                          onChange={(e) => handleABTestUpdate(featureName, {
                            ...feature.abTest,
                            percentage: parseInt(e.target.value)
                          })}
                          placeholder="Percentage"
                        />
                        <input
                          type="text"
                          value={feature.abTest.variant || ''}
                          onChange={(e) => handleABTestUpdate(featureName, {
                            ...feature.abTest,
                            variant: e.target.value
                          })}
                          placeholder="Variant name"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="analytics-tab">
          <div className="analytics-grid">
            {Object.entries(analytics).map(([featureName, data]) => (
              <div key={featureName} className="analytics-card">
                <h3>{featureName}</h3>
                <div className="analytics-stats">
                  <div className="stat">
                    <span className="stat-label">Usage Count:</span>
                    <span className="stat-value">{data.usage || 0}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Updates:</span>
                    <span className="stat-value">{data.updates?.length || 0}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Overrides:</span>
                    <span className="stat-value">{data.overrides?.length || 0}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Last Updated:</span>
                    <span className="stat-value">
                      {data.lastUpdated ? new Date(data.lastUpdated).toLocaleString() : 'Never'}
                    </span>
                  </div>
                </div>
                
                {data.updates && data.updates.length > 0 && (
                  <div className="update-history">
                    <h4>Recent Updates</h4>
                    <div className="update-list">
                      {data.updates.slice(-5).map((update, index) => (
                        <div key={index} className="update-item">
                          <span>{new Date(update.timestamp).toLocaleString()}</span>
                          <span>{JSON.stringify(update)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'overrides' && (
        <div className="overrides-tab">
          <div className="override-form">
            <h3>Set User Feature Override</h3>
            <form onSubmit={handleOverrideSubmit}>
              <div className="form-group">
                <label>Feature:</label>
                <select
                  value={selectedFeature || ''}
                  onChange={(e) => setSelectedFeature(e.target.value)}
                  required
                >
                  <option value="">Select a feature</option>
                  {Object.keys(features).map(featureName => (
                    <option key={featureName} value={featureName}>
                      {features[featureName].name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>User ID:</label>
                <input
                  type="text"
                  value={overrideForm.userId}
                  onChange={(e) => setOverrideForm(prev => ({ ...prev, userId: e.target.value }))}
                  placeholder="Enter user ID"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Enabled:</label>
                <input
                  type="checkbox"
                  checked={overrideForm.enabled}
                  onChange={(e) => setOverrideForm(prev => ({ ...prev, enabled: e.target.checked }))}
                />
              </div>
              
              <div className="form-group">
                <label>Reason:</label>
                <input
                  type="text"
                  value={overrideForm.reason}
                  onChange={(e) => setOverrideForm(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="Reason for override"
                />
              </div>
              
              <button type="submit" className="submit-button">
                Set Override
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeatureFlagAdmin; 
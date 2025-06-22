import { useState, useEffect, useCallback } from 'react';

const useFeatureFlags = () => {
  const [features, setFeatures] = useState(null);
  const [enabledFeatures, setEnabledFeatures] = useState([]);
  const [userTier, setUserTier] = useState('free');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchFeatures = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/features', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch features');
      }

      const data = await response.json();
      
      setFeatures(data.allFeatures);
      setEnabledFeatures(data.enabledFeatures);
      setUserTier(data.userTier);
      setLastUpdated(new Date());
      
      // Cache the features in localStorage for offline use
      localStorage.setItem('cachedFeatures', JSON.stringify({
        features: data.allFeatures,
        enabledFeatures: data.enabledFeatures,
        userTier: data.userTier,
        timestamp: new Date().toISOString()
      }));
      
    } catch (err) {
      setError(err.message);
      
      // Try to load cached features if available
      const cached = localStorage.getItem('cachedFeatures');
      if (cached) {
        try {
          const cachedData = JSON.parse(cached);
          const cacheAge = new Date() - new Date(cachedData.timestamp);
          
          // Use cache if it's less than 1 hour old
          if (cacheAge < 60 * 60 * 1000) {
            setFeatures(cachedData.features);
            setEnabledFeatures(cachedData.enabledFeatures);
            setUserTier(cachedData.userTier);
            setLastUpdated(new Date(cachedData.timestamp));
          }
        } catch (cacheErr) {
          console.error('Error loading cached features:', cacheErr);
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const isFeatureEnabled = useCallback((featureName) => {
    if (!features || !enabledFeatures) return false;
    
    // Check if feature exists and is enabled for this user
    return features[featureName]?.enabled && enabledFeatures.includes(featureName);
  }, [features, enabledFeatures]);

  const getFeatureInfo = useCallback((featureName) => {
    if (!features) return null;
    return features[featureName] || null;
  }, [features]);

  const refreshFeatures = useCallback(() => {
    return fetchFeatures();
  }, [fetchFeatures]);

  // Auto-refresh features every 5 minutes
  useEffect(() => {
    fetchFeatures();
    
    const interval = setInterval(() => {
      fetchFeatures();
    }, 5 * 60 * 1000); // 5 minutes
    
    return () => clearInterval(interval);
  }, [fetchFeatures]);

  // Listen for storage events to sync across tabs
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'cachedFeatures') {
        try {
          const cachedData = JSON.parse(e.newValue);
          if (cachedData) {
            setFeatures(cachedData.features);
            setEnabledFeatures(cachedData.enabledFeatures);
            setUserTier(cachedData.userTier);
            setLastUpdated(new Date(cachedData.timestamp));
          }
        } catch (err) {
          console.error('Error parsing cached features:', err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return {
    features,
    enabledFeatures,
    userTier,
    loading,
    error,
    lastUpdated,
    isFeatureEnabled,
    getFeatureInfo,
    refreshFeatures
  };
};

export default useFeatureFlags; 
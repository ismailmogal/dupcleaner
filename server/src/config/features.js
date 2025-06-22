// Enhanced Feature Flags System for Phase 2
// Supports dynamic updates, user-specific flags, and A/B testing

const FEATURES = {
  // Core Features
  BASIC_SCAN: {
    name: 'Basic Duplicate Detection',
    description: 'Standard file duplicate detection using size and name comparison',
    enabled: true,
    tier: 'free',
    abTest: null,
    userSpecific: false
  },
  
  AI_DETECTION: {
    name: 'Enhanced AI Detection',
    description: 'Advanced AI-powered duplicate detection with visual similarity',
    enabled: true,
    tier: 'premium',
    abTest: {
      enabled: true,
      percentage: 50, // 50% of users get this feature
      variant: 'enhanced'
    },
    userSpecific: false
  },
  
  MULTI_FOLDER: {
    name: 'Multi-Folder Comparison',
    description: 'Compare files across multiple folders simultaneously',
    enabled: true,
    tier: 'premium',
    abTest: null,
    userSpecific: false
  },
  
  BULK_ACTIONS: {
    name: 'Bulk File Operations',
    description: 'Perform operations on multiple files at once',
    enabled: true,
    tier: 'premium',
    abTest: null,
    userSpecific: false
  },
  
  ANALYTICS: {
    name: 'Usage Analytics',
    description: 'Detailed usage statistics and insights',
    enabled: false, // Disabled by default
    tier: 'enterprise',
    abTest: {
      enabled: true,
      percentage: 25, // 25% of enterprise users get analytics
      variant: 'basic'
    },
    userSpecific: true
  },
  
  TEAM_COLLABORATION: {
    name: 'Team Collaboration',
    description: 'Share folders and collaborate with team members',
    enabled: false,
    tier: 'enterprise',
    abTest: null,
    userSpecific: true
  },
  
  // Experimental Features
  SMART_ORGANIZER: {
    name: 'Smart File Organizer',
    description: 'AI-powered file organization suggestions',
    enabled: true,
    tier: 'premium',
    abTest: {
      enabled: true,
      percentage: 30,
      variant: 'beta'
    },
    userSpecific: false
  },
  
  ADVANCED_SEARCH: {
    name: 'Advanced Search',
    description: 'Semantic search and filtering capabilities',
    enabled: false,
    tier: 'premium',
    abTest: {
      enabled: true,
      percentage: 10,
      variant: 'alpha'
    },
    userSpecific: false
  }
};

// Feature flag storage (in-memory for now, can be moved to database)
let featureFlags = { ...FEATURES };
let userFeatureOverrides = new Map();
let featureAnalytics = new Map();

// Helper functions
function generateUserId(userId) {
  // Generate consistent hash for A/B testing
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

function isUserInABTest(userId, featureName) {
  const feature = featureFlags[featureName];
  if (!feature || !feature.abTest || !feature.abTest.enabled) {
    return false;
  }
  
  const userHash = generateUserId(userId);
  const percentage = feature.abTest.percentage;
  
  return (userHash % 100) < percentage;
}

function getUserSpecificFeatures(userId, userTier) {
  const userFeatures = [];
  
  for (const [featureName, feature] of Object.entries(featureFlags)) {
    // Check if user has override
    if (userFeatureOverrides.has(`${userId}:${featureName}`)) {
      const override = userFeatureOverrides.get(`${userId}:${featureName}`);
      if (override.enabled) {
        userFeatures.push(featureName);
      }
      continue;
    }
    
    // Check tier access
    if (feature.tier === 'free' || 
        (feature.tier === 'premium' && ['premium', 'enterprise'].includes(userTier)) ||
        (feature.tier === 'enterprise' && userTier === 'enterprise')) {
      
      // Check A/B test
      if (feature.abTest && feature.abTest.enabled) {
        if (isUserInABTest(userId, featureName)) {
          userFeatures.push(featureName);
        }
      } else {
        userFeatures.push(featureName);
      }
    }
  }
  
  return userFeatures;
}

// Main functions
function isFeatureEnabled(featureName, userId = null, userTier = 'free') {
  const feature = featureFlags[featureName];
  if (!feature) return false;
  
  // Check if feature is globally enabled
  if (!feature.enabled) return false;
  
  // Check user-specific override
  if (userId && userFeatureOverrides.has(`${userId}:${featureName}`)) {
    return userFeatureOverrides.get(`${userId}:${featureName}`).enabled;
  }
  
  // Check tier access
  if (feature.tier === 'free') return true;
  if (feature.tier === 'premium' && ['premium', 'enterprise'].includes(userTier)) return true;
  if (feature.tier === 'enterprise' && userTier === 'enterprise') return true;
  
  return false;
}

function getEnabledFeatures(userId = null, userTier = 'free') {
  return getUserSpecificFeatures(userId, userTier);
}

function getAllFeatures() {
  return featureFlags;
}

function updateFeatureFlag(featureName, updates) {
  if (!featureFlags[featureName]) {
    throw new Error(`Feature ${featureName} not found`);
  }
  
  featureFlags[featureName] = { ...featureFlags[featureName], ...updates };
  
  // Track analytics
  trackFeatureUpdate(featureName, updates);
  
  return featureFlags[featureName];
}

function setUserFeatureOverride(userId, featureName, enabled, reason = 'manual') {
  const key = `${userId}:${featureName}`;
  userFeatureOverrides.set(key, {
    enabled,
    reason,
    timestamp: new Date().toISOString()
  });
  
  // Track analytics
  trackUserOverride(userId, featureName, enabled, reason);
}

function removeUserFeatureOverride(userId, featureName) {
  const key = `${userId}:${featureName}`;
  userFeatureOverrides.delete(key);
}

function getUserFeatureOverrides(userId) {
  const overrides = [];
  for (const [key, override] of userFeatureOverrides.entries()) {
    if (key.startsWith(`${userId}:`)) {
      const featureName = key.split(':')[1];
      overrides.push({
        featureName,
        ...override
      });
    }
  }
  return overrides;
}

// Analytics functions
function trackFeatureUpdate(featureName, updates) {
  if (!featureAnalytics.has(featureName)) {
    featureAnalytics.set(featureName, {
      updates: [],
      usage: 0,
      lastUpdated: new Date().toISOString()
    });
  }
  
  const analytics = featureAnalytics.get(featureName);
  analytics.updates.push({
    ...updates,
    timestamp: new Date().toISOString()
  });
  analytics.lastUpdated = new Date().toISOString();
}

function trackUserOverride(userId, featureName, enabled, reason) {
  if (!featureAnalytics.has(featureName)) {
    featureAnalytics.set(featureName, {
      updates: [],
      usage: 0,
      overrides: [],
      lastUpdated: new Date().toISOString()
    });
  }
  
  const analytics = featureAnalytics.get(featureName);
  analytics.overrides.push({
    userId,
    enabled,
    reason,
    timestamp: new Date().toISOString()
  });
}

function trackFeatureUsage(featureName, userId = null) {
  if (!featureAnalytics.has(featureName)) {
    featureAnalytics.set(featureName, {
      updates: [],
      usage: 0,
      overrides: [],
      lastUpdated: new Date().toISOString()
    });
  }
  
  const analytics = featureAnalytics.get(featureName);
  analytics.usage += 1;
  analytics.lastUpdated = new Date().toISOString();
}

function getFeatureAnalytics(featureName = null) {
  if (featureName) {
    return featureAnalytics.get(featureName) || null;
  }
  
  const allAnalytics = {};
  for (const [name, analytics] of featureAnalytics.entries()) {
    allAnalytics[name] = analytics;
  }
  return allAnalytics;
}

// Reset functions (for testing)
function resetFeatureFlags() {
  featureFlags = { ...FEATURES };
  userFeatureOverrides.clear();
  featureAnalytics.clear();
}

module.exports = {
  FEATURES,
  isFeatureEnabled,
  getEnabledFeatures,
  getAllFeatures,
  updateFeatureFlag,
  setUserFeatureOverride,
  removeUserFeatureOverride,
  getUserFeatureOverrides,
  trackFeatureUsage,
  getFeatureAnalytics,
  resetFeatureFlags,
  isUserInABTest
}; 
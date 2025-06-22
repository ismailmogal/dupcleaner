const { isFeatureEnabled, trackFeatureUsage } = require('../config/features');
const User = require('../models/User');

// Middleware to check feature flags
const checkFeatureFlag = (featureName) => {
  return (req, res, next) => {
    const userId = req.user?.id || req.headers['x-user-id'];
    const userTier = req.user?.subscriptionTier || 'free';
    
    if (isFeatureEnabled(featureName, userId, userTier)) {
      // Track feature usage
      trackFeatureUsage(featureName, userId);
      next();
    } else {
      res.status(403).json({
        error: 'Feature not available',
        message: `Feature '${featureName}' is not enabled for your account`,
        feature: featureName,
        requiredTier: getRequiredTier(featureName)
      });
    }
  };
};

// Helper function to get required tier for a feature
const getRequiredTier = (featureName) => {
  const { getAllFeatures } = require('../config/features');
  const features = getAllFeatures();
  return features[featureName]?.tier || 'unknown';
};

// Middleware to inject feature flags into request
const injectFeatureFlags = (req, res, next) => {
  const { getEnabledFeatures } = require('../config/features');
  const userId = req.user?.id || req.headers['x-user-id'];
  const userTier = req.user?.subscriptionTier || 'free';
  
  req.features = getEnabledFeatures(userId, userTier);
  req.userTier = userTier;
  
  next();
};

// Middleware to check subscription tier
const requireTier = (requiredTier) => {
  return (req, res, next) => {
    const userTier = req.user?.subscriptionTier || 'free';
    const tierHierarchy = ['free', 'premium', 'enterprise'];
    
    const userTierIndex = tierHierarchy.indexOf(userTier);
    const requiredTierIndex = tierHierarchy.indexOf(requiredTier);
    
    if (userTierIndex >= requiredTierIndex) {
      next();
    } else {
      res.status(403).json({
        error: 'Insufficient subscription tier',
        message: `This feature requires ${requiredTier} tier or higher`,
        currentTier: userTier,
        requiredTier: requiredTier
      });
    }
  };
};

// Middleware to check user permissions for features
const checkUserPermission = (featureName) => {
  return async (req, res, next) => {
    try {
      const accessToken = req.headers.authorization?.replace('Bearer ', '');
      if (!accessToken) {
        return res.status(401).json({ error: 'Access token required' });
      }

      // Extract user ID from token (you'll need to implement this based on your auth)
      const userId = extractUserIdFromToken(accessToken);
      if (!userId) {
        return res.status(401).json({ error: 'Invalid access token' });
      }

      // Check if user can use this feature
      const canUse = await User.canUseFeature(userId, featureName);
      if (!canUse) {
        return res.status(403).json({
          error: 'Feature not available for your subscription',
          message: `Upgrade your subscription to use ${featureName}`,
          feature: featureName
        });
      }

      // Add user info to request for later use
      req.userId = userId;
      req.user = await User.getUser(userId);
      
      next();
    } catch (error) {
      console.error('Error checking user permission:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};

// Helper function to extract user ID from token
// This is a placeholder - implement based on your authentication system
const extractUserIdFromToken = (token) => {
  try {
    // For now, we'll use a simple approach
    // In production, you should properly decode and validate the token
    if (token && token.length > 10) {
      // Extract user info from Microsoft Graph token
      // This is a simplified version - you'll need to implement proper token validation
      return `user_${token.substring(0, 8)}`;
    }
    return null;
  } catch (error) {
    console.error('Error extracting user ID from token:', error);
    return null;
  }
};

// Combined middleware for feature flag and user permission
const requireFeature = (featureName) => {
  return [checkFeatureFlag(featureName), checkUserPermission(featureName)];
};

module.exports = {
  checkFeatureFlag,
  injectFeatureFlags,
  requireTier,
  checkUserPermission,
  requireFeature
}; 
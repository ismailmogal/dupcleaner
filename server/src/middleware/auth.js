const authService = require('../services/authService');
const User = require('../models/User');

// JWT Authentication Middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        error: 'Access token required',
        code: 'TOKEN_MISSING'
      });
    }

    const decoded = authService.verifyToken(token);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({ 
        error: 'Account is deactivated',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    console.error('Auth middleware error:', error);
    return res.status(500).json({ 
      error: 'Authentication error',
      code: 'AUTH_ERROR'
    });
  }
};

// Optional authentication - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = authService.verifyToken(token);
      const user = await User.findById(decoded.id).select('-password');
      
      if (user && user.isActive) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

// Role-based access control
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const userRole = req.user.subscription.tier;
    const isAdmin = req.user.isAdmin;

    // Admin bypasses all role checks
    if (isAdmin) {
      return next();
    }

    // Check if user has required role
    if (Array.isArray(roles)) {
      if (!roles.includes(userRole)) {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS',
          required: roles,
          current: userRole
        });
      }
    } else {
      if (userRole !== roles) {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS',
          required: roles,
          current: userRole
        });
      }
    }

    next();
  };
};

// Subscription tier checks
const requireSubscription = (minTier = 'free') => {
  const tierOrder = { 'free': 0, 'premium': 1, 'enterprise': 2 };
  
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const userTier = req.user.subscription.tier;
    const userTierLevel = tierOrder[userTier] || 0;
    const requiredTierLevel = tierOrder[minTier] || 0;

    if (userTierLevel < requiredTierLevel) {
      return res.status(403).json({ 
        error: 'Premium subscription required',
        code: 'PREMIUM_REQUIRED',
        required: minTier,
        current: userTier
      });
    }

    next();
  };
};

// Usage limit check
const checkUsageLimit = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const canPerformScan = req.user.canPerformScan();
    if (!canPerformScan) {
      return res.status(429).json({ 
        error: 'Usage limit exceeded',
        code: 'USAGE_LIMIT_EXCEEDED',
        currentUsage: req.user.usage.monthlyScans,
        limit: req.user.usage.monthlyLimit,
        tier: req.user.subscription.tier
      });
    }

    next();
  } catch (error) {
    console.error('Usage limit check error:', error);
    return res.status(500).json({ 
      error: 'Usage check error',
      code: 'USAGE_CHECK_ERROR'
    });
  }
};

// Rate limiting for authentication endpoints
const authRateLimit = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many authentication attempts',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
};

// Rate limiting for API endpoints
const apiRateLimit = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
};

// Log request details for security
const logRequest = (req, res, next) => {
  const logData = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id || 'anonymous'
  };

  // Log authentication attempts
  if (req.url.includes('/auth/') && req.method === 'POST') {
    console.log('Auth attempt:', logData);
  }

  // Log sensitive operations
  if (req.url.includes('/delete') || req.url.includes('/admin')) {
    console.log('Sensitive operation:', logData);
  }

  next();
};

// Validate request body
const validateRequest = (schema) => {
  return (req, res, next) => {
    try {
      const { error } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Validation error',
          code: 'VALIDATION_ERROR',
          details: error.details.map(detail => detail.message)
        });
      }
      next();
    } catch (error) {
      console.error('Validation error:', error);
      return res.status(500).json({
        error: 'Validation error',
        code: 'VALIDATION_ERROR'
      });
    }
  };
};

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.CLIENT_URL,
      'http://localhost:3000',
      'http://localhost:5173',
      'https://your-app.netlify.app'
    ];
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

module.exports = {
  authenticateToken,
  optionalAuth,
  requireRole,
  requireSubscription,
  checkUsageLimit,
  authRateLimit,
  apiRateLimit,
  logRequest,
  validateRequest,
  corsOptions
}; 
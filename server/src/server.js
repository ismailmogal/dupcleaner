const express = require('express');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const passport = require('passport');
const session = require('express-session');
require('dotenv').config();

// Import services
const microsoftGraphService = require('./services/microsoftGraph');
const duplicateDetector = require('./services/duplicateDetector');
const aiDuplicateDetector = require('./services/aiDuplicateDetector');
const enhancedAIDetector = require('./services/enhancedAIDetector');

// Import authentication
const authService = require('./services/authService');
const { 
  authenticateToken, 
  optionalAuth, 
  requireRole, 
  requireSubscription, 
  checkUsageLimit,
  apiRateLimit,
  logRequest,
  corsOptions 
} = require('./middleware/auth');

// Import routes
const authRoutes = require('./routes/auth');

// Import Phase 1 modules
const { isFeatureEnabled, getEnabledFeatures } = require('./config/features');
const { requireFeature } = require('./middleware/featureFlags');
const User = require('./models/User');

const app = express();
const PORT = process.env.PORT || 3001;

// --- DATABASE CONNECTION ---
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/onedrive-duplicate-finder', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.log('⚠️ Running in mock mode - some features may be limited');
    return false;
  }
};

// Initialize database connection
connectDB();

// --- SECURITY MIDDLEWARE ---
// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://login.microsoftonline.com", "https://graph.microsoft.com"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow cross-origin requests for OneDrive integration
}));

// Session configuration for Passport
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-super-secret-session-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Rate limiting
const limiter = rateLimit(apiRateLimit);

// Apply rate limiting to all API routes
app.use('/api/', limiter);

// --- CORS CONFIGURATION ---
app.use((req, res, next) => {
  // Set CORS headers for all responses
  res.setHeader('Access-Control-Allow-Origin', process.env.CLIENT_URL || 'http://localhost:3000');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Handle preflight 'OPTIONS' requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204); // OK, No Content
  }

  next();
});

// Middleware
app.use(express.json({ type: ['application/json', 'text/plain'] }));
app.use(express.urlencoded({ extended: true }));

// Apply logging middleware
app.use(logRequest);

// Input validation middleware
const validateFileIds = (req, res, next) => {
  const { fileIds } = req.body;
  if (fileIds && (!Array.isArray(fileIds) || fileIds.length === 0)) {
    return res.status(400).json({ error: 'Invalid file IDs: must be a non-empty array' });
  }
  next();
};

const validateFiles = (req, res, next) => {
  const { files } = req.body;
  if (files && (!Array.isArray(files) || files.length === 0)) {
    return res.status(400).json({ error: 'Invalid files: must be a non-empty array' });
  }
  next();
};

const validateAuthCode = (req, res, next) => {
  const { code } = req.body;
  if (!code || typeof code !== 'string' || code.trim().length === 0) {
    return res.status(400).json({ error: 'Authorization code is required and must be a non-empty string' });
  }
  next();
};

// DEBUG logging helper
function debugLog(...args) {
  if (process.env.DEBUG) {
    console.log(...args);
  }
}
function debugError(...args) {
  if (process.env.DEBUG) {
    console.error(...args);
  }
}

// Security logging middleware
const securityLog = (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent');
  const timestamp = new Date().toISOString();
  
  // Log suspicious activities
  if (req.path.includes('/api/') && !req.headers.authorization) {
    console.warn(`🚨 SECURITY WARNING: Unauthorized API access attempt from ${clientIP} at ${timestamp}`);
  }
  
  // Log file deletion attempts
  if (req.method === 'DELETE' && req.path === '/api/files') {
    console.log(`🗑️ FILE DELETION: ${clientIP} attempting to delete files at ${timestamp}`);
  }
  
  next();
};

app.use(securityLog);

// --- AUTHENTICATION ROUTES ---
app.use('/api/auth', authRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      microsoftGraph: microsoftGraphService.isConfigured ? 'configured' : 'mock',
      duplicateDetector: 'ready',
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    },
    database: {
      status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      readyState: mongoose.connection.readyState
    }
  });
});

// Test endpoint
app.get('/api/hello', (req, res) => {
  res.json({ 
    message: 'Hello from BFF server!',
    timestamp: new Date().toISOString()
  });
});

// User info endpoint (updated to use new auth system)
app.get('/api/user', authenticateToken, async (req, res) => {
  try {
    // Return user info from our database
    res.json({
      id: req.user.id,
      email: req.user.email,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      displayName: req.user.displayName,
      avatar: req.user.avatar,
      subscription: req.user.subscription,
      preferences: req.user.preferences,
      isAuthenticated: true
    });
  } catch (error) {
    console.error('Error getting user info:', error);
    res.status(500).json({ 
      error: 'Failed to get user information',
      message: error.message 
    });
  }
});

// Feature flags endpoint (admin only)
app.get('/api/features', authenticateToken, requireRole(['enterprise', 'admin']), (req, res) => {
  try {
    const features = getEnabledFeatures();
    res.json({ features });
  } catch (error) {
    console.error('Error getting features:', error);
    res.status(500).json({ error: 'Failed to get features' });
  }
});

// Update feature flags endpoint (admin only)
app.post('/api/features', authenticateToken, requireRole(['enterprise', 'admin']), (req, res) => {
  try {
    const { featureName, enabled } = req.body;
    
    if (typeof featureName !== 'string' || typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'Invalid feature configuration' });
    }

    // Update feature flag (implement feature flag update logic)
    console.log(`Feature flag updated: ${featureName} = ${enabled}`);
    
    res.json({ 
      message: 'Feature flag updated successfully',
      feature: { name: featureName, enabled }
    });
  } catch (error) {
    console.error('Error updating feature:', error);
    res.status(500).json({ error: 'Failed to update feature' });
  }
});

// OneDrive authentication endpoint
app.post('/api/onedrive/auth', validateAuthCode, async (req, res) => {
  try {
    const { code } = req.body;
    debugLog('OneDrive auth request received with code:', code.substring(0, 10) + '...');
    
    const tokenResponse = await microsoftGraphService.getAccessToken(code);
    debugLog('Token response received:', tokenResponse ? 'success' : 'failed');
    
    if (!tokenResponse) {
      return res.status(400).json({ error: 'Failed to get access token' });
    }
    
    res.json(tokenResponse);
  } catch (error) {
    debugError('OneDrive auth error:', error);
    res.status(500).json({ 
      error: 'OneDrive authentication failed',
      message: error.message 
    });
  }
});

// Get OneDrive files endpoint
app.get('/api/onedrive/files', authenticateToken, async (req, res) => {
  try {
    const { folderId = 'root', accessToken } = req.query;
    
    if (!accessToken) {
      return res.status(400).json({ error: 'Access token required' });
    }
    
    debugLog('Getting files for folder:', folderId);
    const files = await microsoftGraphService.getFiles(accessToken, folderId);
    debugLog('Files retrieved:', files.length);
    
    res.json({ files });
  } catch (error) {
    debugError('Error getting OneDrive files:', error);
    res.status(500).json({ 
      error: 'Failed to get OneDrive files',
      message: error.message 
    });
  }
});

// Get OneDrive folders endpoint
app.get('/api/onedrive/folders', authenticateToken, async (req, res) => {
  try {
    const { accessToken } = req.query;
    
    if (!accessToken) {
      return res.status(400).json({ error: 'Access token required' });
    }
    
    debugLog('Getting OneDrive folders');
    const folders = await microsoftGraphService.getFolders(accessToken);
    debugLog('Folders retrieved:', folders.length);
    
    res.json({ folders });
  } catch (error) {
    debugError('Error getting OneDrive folders:', error);
    res.status(500).json({ 
      error: 'Failed to get OneDrive folders',
      message: error.message 
    });
  }
});

// Duplicate detection endpoint
app.post('/api/duplicates/detect', authenticateToken, checkUsageLimit, validateFiles, async (req, res) => {
  try {
    const { files, accessToken } = req.body;
    
    if (!accessToken) {
      return res.status(400).json({ error: 'Access token required' });
    }
    
    debugLog('Duplicate detection request for', files.length, 'files');
    
    // Get file content for comparison
    const getFileContent = async (fileId) => {
      try {
        return await microsoftGraphService.getFileContent(accessToken, fileId);
      } catch (error) {
        debugError('Error getting file content for', fileId, ':', error);
        return null;
      }
    };
    
    // Process files in batches to avoid overwhelming the API
    const batchSize = 10;
    const duplicates = [];
    
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      debugLog(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(files.length / batchSize)}`);
      
      const batchDuplicates = await duplicateDetector.findDuplicates(batch, getFileContent);
      duplicates.push(...batchDuplicates);
      
      // Small delay between batches to be respectful to the API
      if (i + batchSize < files.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    debugLog('Duplicate detection completed. Found', duplicates.length, 'duplicate groups');
    
    // Update user usage
    req.user.incrementUsage(files.length, duplicates.length, 0);
    await req.user.save();
    
    res.json({ 
      duplicates,
      totalFiles: files.length,
      duplicateGroups: duplicates.length
    });
  } catch (error) {
    debugError('Duplicate detection error:', error);
    res.status(500).json({ 
      error: 'Duplicate detection failed',
      message: error.message 
    });
  }
});

// Enhanced AI duplicate detection endpoint
app.post('/api/duplicates/ai-detect', authenticateToken, checkUsageLimit, requireFeature('ai_detection'), validateFiles, async (req, res) => {
  try {
    const { files, accessToken } = req.body;
    
    if (!accessToken) {
      return res.status(400).json({ error: 'Access token required' });
    }
    
    debugLog('AI duplicate detection request for', files.length, 'files');
    
    // Get file content for comparison
    const getFileContent = async (fileId) => {
      try {
        return await microsoftGraphService.getFileContent(accessToken, fileId);
      } catch (error) {
        debugError('Error getting file content for', fileId, ':', error);
        return null;
      }
    };
    
    const duplicates = await enhancedAIDetector.findDuplicates(files, getFileContent);
    debugLog('AI duplicate detection completed. Found', duplicates.length, 'duplicate groups');
    
    // Update user usage
    req.user.incrementUsage(files.length, duplicates.length, 0);
    await req.user.save();
    
    res.json({ 
      duplicates,
      totalFiles: files.length,
      duplicateGroups: duplicates.length,
      method: 'ai-enhanced'
    });
  } catch (error) {
    debugError('AI duplicate detection error:', error);
    res.status(500).json({ 
      error: 'AI duplicate detection failed',
      message: error.message 
    });
  }
});

// Delete files endpoint
app.delete('/api/files', authenticateToken, validateFileIds, async (req, res) => {
  try {
    const { fileIds, accessToken } = req.body;
    
    if (!accessToken) {
      return res.status(400).json({ error: 'Access token required' });
    }
    
    debugLog('File deletion request for', fileIds.length, 'files');
    
    const results = [];
    for (const fileId of fileIds) {
      try {
        await microsoftGraphService.deleteFile(accessToken, fileId);
        results.push({ fileId, success: true });
        debugLog('Successfully deleted file:', fileId);
      } catch (error) {
        debugError('Failed to delete file:', fileId, error);
        results.push({ fileId, success: false, error: error.message });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    debugLog('File deletion completed. Successfully deleted', successCount, 'of', fileIds.length, 'files');
    
    res.json({ 
      results,
      totalRequested: fileIds.length,
      successfullyDeleted: successCount
    });
  } catch (error) {
    debugError('File deletion error:', error);
    res.status(500).json({ 
      error: 'File deletion failed',
      message: error.message 
    });
  }
});

// Smart organizer endpoint
app.post('/api/organize', authenticateToken, checkUsageLimit, requireFeature('smart_organizer'), async (req, res) => {
  try {
    const { files, organizationPlan, accessToken } = req.body;
    
    if (!accessToken) {
      return res.status(400).json({ error: 'Access token required' });
    }
    
    if (!organizationPlan) {
      return res.status(400).json({ error: 'Organization plan required' });
    }
    
    debugLog('Smart organization request for', files.length, 'files');
    
    // Execute organization plan
    const results = [];
    for (const action of organizationPlan) {
      try {
        if (action.type === 'move') {
          await microsoftGraphService.moveFile(accessToken, action.fileId, action.destinationFolderId);
          results.push({ action, success: true });
        } else if (action.type === 'delete') {
          await microsoftGraphService.deleteFile(accessToken, action.fileId);
          results.push({ action, success: true });
        }
      } catch (error) {
        debugError('Failed to execute action:', action, error);
        results.push({ action, success: false, error: error.message });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    debugLog('Smart organization completed. Successfully executed', successCount, 'of', organizationPlan.length, 'actions');
    
    // Update user usage
    req.user.incrementUsage(files.length, 0, 0);
    await req.user.save();
    
    res.json({ 
      results,
      totalActions: organizationPlan.length,
      successfulActions: successCount
    });
  } catch (error) {
    debugError('Smart organization error:', error);
    res.status(500).json({ 
      error: 'Smart organization failed',
      message: error.message 
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔧 Debug mode: ${process.env.DEBUG ? 'enabled' : 'disabled'}`);
});

module.exports = app; 
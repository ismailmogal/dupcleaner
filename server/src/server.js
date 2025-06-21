const express = require('express');
const path = require('path');
require('dotenv').config();

// Import services
const microsoftGraphService = require('./services/microsoftGraph');
const duplicateDetector = require('./services/duplicateDetector');
const aiDuplicateDetector = require('./services/aiDuplicateDetector');

const app = express();
const PORT = process.env.PORT || 3001;

// --- FINAL, CORRECT CORS SOLUTION ---
app.use((req, res, next) => {
  // Set CORS headers for all responses
  res.setHeader('Access-Control-Allow-Origin', process.env.CLIENT_URL || 'http://localhost:3000');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Handle preflight 'OPTIONS' requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204); // OK, No Content
  }

  next();
});

// Middleware
// WORKAROUND: For a stubborn CORS preflight issue, the browser sends 'text/plain'.
// We temporarily accept it here to ensure the body gets parsed correctly.
app.use(express.json({ type: ['application/json', 'text/plain'] }));
app.use(express.urlencoded({ extended: true }));

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

// Basic logging middleware
app.use((req, res, next) => {
  debugLog(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      microsoftGraph: microsoftGraphService.isConfigured ? 'configured' : 'mock',
      duplicateDetector: 'ready'
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

// User info endpoint
app.get('/api/user', async (req, res) => {
  try {
    const accessToken = req.headers.authorization?.replace('Bearer ', '');
    
    if (!accessToken) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const userInfo = await microsoftGraphService.getUserInfo(accessToken);
    res.json({
      ...userInfo,
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

// Files endpoint
app.get('/api/files', async (req, res) => {
  try {
    const accessToken = req.headers.authorization?.replace('Bearer ', '');
    const folderId = req.query.folderId;
    
    if (!accessToken) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const filesResponse = await microsoftGraphService.getFiles(accessToken, folderId);
    
    res.json({
      files: filesResponse.value,
      totalCount: filesResponse.value.length,
      hasMore: !!filesResponse['@odata.nextLink']
    });
  } catch (error) {
    console.error('Error getting files:', error);
    res.status(500).json({ 
      error: 'Failed to get files',
      message: error.message 
    });
  }
});

// Duplicate detection endpoint
app.post('/api/duplicates', async (req, res) => {
  try {
    const { files, method = 'hash' } = req.body;
    const accessToken = req.headers.authorization?.replace('Bearer ', '');
    
    if (!files || !Array.isArray(files)) {
      return res.status(400).json({ error: 'Files array is required' });
    }

    if (!accessToken) {
      return res.status(401).json({ error: 'Access token required' });
    }

    debugLog(`Starting duplicate detection with method: ${method}`);
    
    const results = await duplicateDetector.findDuplicates(
      files, 
      microsoftGraphService, 
      accessToken, 
      method
    );

    res.json(results);
  } catch (error) {
    debugError('Error detecting duplicates:', error);
    res.status(500).json({ 
      error: 'Failed to detect duplicates',
      message: error.message 
    });
  }
});

// Delete files endpoint
app.delete('/api/files', async (req, res) => {
  try {
    const { fileIds } = req.body;
    const accessToken = req.headers.authorization?.replace('Bearer ', '');
    
    if (!fileIds || !Array.isArray(fileIds)) {
      return res.status(400).json({ error: 'File IDs array is required' });
    }

    if (!accessToken) {
      return res.status(401).json({ error: 'Access token required' });
    }

    debugLog(`Deleting ${fileIds.length} files...`);
    
    const results = await microsoftGraphService.deleteFiles(accessToken, fileIds);
    
    res.json(results);
  } catch (error) {
    debugError('Error deleting files:', error);
    res.status(500).json({ 
      error: 'Failed to delete files',
      message: error.message 
    });
  }
});

// Microsoft authentication endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { code, redirectUri } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    const accessToken = await microsoftGraphService.getAccessTokenFromCode(code, redirectUri);
    const userInfo = await microsoftGraphService.getUserInfo(accessToken);
    
    res.json({
      accessToken,
      user: userInfo,
      success: true
    });
  } catch (error) {
    debugError('Error in Microsoft authentication:', error);
    res.status(500).json({ 
      error: 'Authentication failed',
      message: error.message 
    });
  }
});

// AI-powered duplicate detection endpoint
app.post('/api/ai-duplicates', async (req, res) => {
  try {
    const { files } = req.body;
    const accessToken = req.headers.authorization?.replace('Bearer ', '');
    if (!files || !Array.isArray(files)) {
      return res.status(400).json({ error: 'Files array is required' });
    }
    if (!accessToken) {
      return res.status(401).json({ error: 'Access token required' });
    }
    // Helper to get file content from OneDrive
    const getFileContent = async (fileId) => {
      return await microsoftGraphService.getFileContent(accessToken, fileId);
    };
    const results = await aiDuplicateDetector.findAIDuplicates(files, getFileContent);
    res.json(results);
  } catch (error) {
    debugError('Error in AI duplicate detection:', error);
    res.status(500).json({ error: 'Failed to detect AI duplicates', message: error.message });
  }
});

// Drive info endpoint
app.get('/api/drive-info', async (req, res) => {
  try {
    const accessToken = req.headers.authorization?.replace('Bearer ', '');
    
    if (!accessToken) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const driveInfo = await microsoftGraphService.getDriveInfo(accessToken);
    res.json(driveInfo);
  } catch (error) {
    debugError('Error getting drive info:', error);
    res.status(500).json({ 
      error: 'Failed to get drive information',
      message: error.message 
    });
  }
});

// Storage quota endpoint
app.get('/api/storage-quota', async (req, res) => {
  try {
    const accessToken = req.headers.authorization?.replace('Bearer ', '');
    
    if (!accessToken) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const quota = await microsoftGraphService.getStorageQuota(accessToken);
    res.json(quota);
  } catch (error) {
    debugError('Error getting storage quota:', error);
    res.status(500).json({ 
      error: 'Failed to get storage quota',
      message: error.message 
    });
  }
});

// Clear folder cache endpoint
app.delete('/api/cache/folder/:folderId', async (req, res) => {
  try {
    const { folderId } = req.params;
    const accessToken = req.headers.authorization?.replace('Bearer ', '');
    
    if (!accessToken) {
      return res.status(401).json({ error: 'Access token required' });
    }

    // For now, just return success since we don't have caching implemented
    res.json({ success: true, message: 'Folder cache cleared' });
  } catch (error) {
    debugError('Error clearing folder cache:', error);
    res.status(500).json({ 
      error: 'Failed to clear folder cache',
      message: error.message 
    });
  }
});

// Cache stats endpoint
app.get('/api/cache/stats', async (req, res) => {
  try {
    const accessToken = req.headers.authorization?.replace('Bearer ', '');
    
    if (!accessToken) {
      return res.status(401).json({ error: 'Access token required' });
    }

    // For now, return mock stats since we don't have caching implemented
    res.json({
      totalCachedFolders: 0,
      totalCachedFiles: 0,
      cacheSize: 0,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    debugError('Error getting cache stats:', error);
    res.status(500).json({ 
      error: 'Failed to get cache stats',
      message: error.message 
    });
  }
});

// Health check endpoint (alias for /api/health)
app.get('/api/health-check', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      microsoftGraph: microsoftGraphService.isConfigured ? 'configured' : 'mock',
      duplicateDetector: 'ready'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  debugError('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  debugLog(`🚀 BFF Server running on port ${PORT}`);
  debugLog(`📊 Health check: http://localhost:${PORT}/api/health`);
  debugLog(`🔗 Client URL: ${process.env.CLIENT_URL || 'http://localhost:3000'}`);
  debugLog(`🔧 Microsoft Graph: ${microsoftGraphService.isConfigured ? 'Configured' : 'Mock Mode'}`);
});

module.exports = app; 
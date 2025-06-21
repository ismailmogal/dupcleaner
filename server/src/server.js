const express = require('express');
const path = require('path');
require('dotenv').config();

// Import services
const microsoftGraphService = require('./services/microsoftGraph');
const duplicateDetector = require('./services/duplicateDetector');

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

// Basic logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
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

    console.log(`Starting duplicate detection with method: ${method}`);
    
    const results = await duplicateDetector.findDuplicates(
      files, 
      microsoftGraphService, 
      accessToken, 
      method
    );

    res.json(results);
  } catch (error) {
    console.error('Error detecting duplicates:', error);
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

    console.log(`Deleting ${fileIds.length} files...`);
    
    const results = await microsoftGraphService.deleteFiles(accessToken, fileIds);
    
    res.json(results);
  } catch (error) {
    console.error('Error deleting files:', error);
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
    console.error('Error in Microsoft authentication:', error);
    res.status(500).json({ 
      error: 'Authentication failed',
      message: error.message 
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
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
  console.log(`🚀 BFF Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔗 Client URL: ${process.env.CLIENT_URL || 'http://localhost:3000'}`);
  console.log(`🔧 Microsoft Graph: ${microsoftGraphService.isConfigured ? 'Configured' : 'Mock Mode'}`);
});

module.exports = app; 
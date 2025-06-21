import { debugError } from '../utils/idbState';

const BFF_BASE_URL = import.meta.env.VITE_BFF_URL || 'http://localhost:3001';

// Mock data for when backend is not available
const MOCK_DATA = {
  files: [
    {
      id: 'mock-file-1',
      name: 'document.pdf',
      size: 1024000,
      lastModifiedDateTime: '2024-01-15T10:30:00Z',
      folder: null,
      '@microsoft.graph.downloadUrl': null
    },
    {
      id: 'mock-file-2',
      name: 'image.jpg',
      size: 2048000,
      lastModifiedDateTime: '2024-01-14T15:45:00Z',
      folder: null,
      '@microsoft.graph.downloadUrl': null
    },
    {
      id: 'mock-folder-1',
      name: 'Documents',
      size: 0,
      lastModifiedDateTime: '2024-01-10T09:00:00Z',
      folder: { childCount: 5 },
      '@microsoft.graph.downloadUrl': null
    }
  ],
  user: {
    id: 'mock-user-1',
    displayName: 'Demo User',
    mail: 'demo@example.com',
    userPrincipalName: 'demo@example.com'
  }
};

class BffApiService {
  constructor() {
    this.baseUrl = BFF_BASE_URL;
    this.useMockData = false;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        const error = new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        error.debug = errorData.debug;
        throw error;
      }

      return await response.json();
    } catch (error) {
      debugError(`BFF API Error (${endpoint}):`, error);
      
      // If it's a network error and we're in production, use mock data
      if (error.message.includes('Failed to fetch') || error.message.includes('net::ERR_FAILED')) {
        console.warn('Backend not available, using mock data');
        this.useMockData = true;
        return this.getMockResponse(endpoint);
      }
      
      throw error;
    }
  }

  getMockResponse(endpoint) {
    switch (endpoint) {
      case '/api/health':
        return { status: 'mock', timestamp: new Date().toISOString() };
      case '/api/hello':
        return { message: 'Hello from mock server!', timestamp: new Date().toISOString() };
      case '/api/user':
        return MOCK_DATA.user;
      case '/api/files':
        return { files: MOCK_DATA.files, totalCount: MOCK_DATA.files.length, hasMore: false };
      case '/api/duplicates':
        return { duplicates: [], totalFiles: 0, processingTime: 0 };
      case '/api/ai-duplicates':
        return { duplicates: [], totalFiles: 0, processingTime: 0 };
      case '/api/drive-info':
        return {
          id: 'mock-drive-id',
          driveType: 'personal',
          owner: {
            user: {
              displayName: 'Mock User',
              id: 'mock-user-id'
            }
          },
          quota: {
            deleted: 0,
            remaining: 1073741824000,
            state: 'normal',
            total: 1073741824000,
            used: 0
          }
        };
      case '/api/storage-quota':
        return {
          deleted: 0,
          remaining: 1073741824000,
          state: 'normal',
          total: 1073741824000,
          used: 0
        };
      case '/api/cache/stats':
        return {
          totalCachedFolders: 0,
          totalCachedFiles: 0,
          cacheSize: 0,
          lastUpdated: new Date().toISOString()
        };
      case '/api/health-check':
        return { status: 'mock', timestamp: new Date().toISOString() };
      default:
        return { error: 'Mock endpoint not found' };
    }
  }

  // Add authorization header to request
  async authenticatedRequest(endpoint, accessToken, options = {}) {
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      ...options.headers,
    };

    return this.request(endpoint, { ...options, headers });
  }

  // Health check
  async getHealth() {
    return this.request('/api/health');
  }

  // Test endpoint
  async getHello() {
    return this.request('/api/hello');
  }

  // User info
  async getUserInfo(accessToken) {
    return this.authenticatedRequest('/api/user', accessToken);
  }

  // Get files from OneDrive
  async getFiles(accessToken, folderId = null) {
    const params = folderId ? `?folderId=${folderId}` : '';
    return this.authenticatedRequest(`/api/files${params}`, accessToken);
  }

  // Detect duplicates
  async detectDuplicates(accessToken, files, method = 'hash') {
    return this.authenticatedRequest('/api/duplicates', accessToken, {
      method: 'POST',
      body: JSON.stringify({ files, method }),
    });
  }

  // Delete files
  async deleteFiles(accessToken, fileIds) {
    return this.authenticatedRequest('/api/files', accessToken, {
      method: 'DELETE',
      body: JSON.stringify({ fileIds }),
    });
  }

  // Authenticate with Microsoft
  async authenticateWithMicrosoft(authCode, redirectUri) {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ code: authCode, redirectUri }),
    });
  }

  // AI-powered duplicate detection
  async aiDetectDuplicates(accessToken, files) {
    return this.authenticatedRequest('/api/ai-duplicates', accessToken, {
      method: 'POST',
      body: JSON.stringify({ files }),
    });
  }

  // Get drive information
  async getDriveInfo(accessToken) {
    return this.authenticatedRequest('/api/drive-info', accessToken);
  }

  // Get storage quota
  async getStorageQuota(accessToken) {
    return this.authenticatedRequest('/api/storage-quota', accessToken);
  }

  // Clear folder cache
  async clearFolderCache(accessToken, folderId) {
    return this.authenticatedRequest(`/api/cache/folder/${folderId}`, accessToken, {
      method: 'DELETE',
    });
  }

  // Get cache stats
  async getCacheStats(accessToken) {
    return this.authenticatedRequest('/api/cache/stats', accessToken);
  }

  // Health check (alias for getHealth)
  async healthCheck() {
    return this.request('/api/health-check');
  }
}

// Create singleton instance
const bffApi = new BffApiService();

export default bffApi; 
const BFF_BASE_URL = import.meta.env.VITE_BFF_URL || 'http://localhost:3001';

class BffApiService {
  constructor() {
    this.baseUrl = BFF_BASE_URL;
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
      console.error(`BFF API Error (${endpoint}):`, error);
      throw error;
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
}

// Create singleton instance
const bffApi = new BffApiService();

export default bffApi; 
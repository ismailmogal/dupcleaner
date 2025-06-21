const { ConfidentialClientApplication } = require('@azure/msal-node');
const { Client } = require('@microsoft/microsoft-graph-client');
require('isomorphic-fetch');

class MicrosoftGraphService {
  constructor() {
    this.clientId = process.env.MICROSOFT_CLIENT_ID;
    this.clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
    this.tenantId = process.env.MICROSOFT_TENANT_ID || 'consumers';
    
    // Debug logging
    console.log('🔧 Microsoft Graph Configuration:');
    console.log('  - CLIENT_ID:', this.clientId ? 'SET' : 'NOT SET');
    console.log('  - CLIENT_SECRET:', this.clientSecret ? 'SET' : 'NOT SET');
    console.log('  - TENANT_ID:', this.tenantId);
    
    if (!this.clientId || !this.clientSecret) {
      console.warn('Microsoft Graph credentials not configured. Using mock data.');
      this.isConfigured = false;
      return;
    }

    this.isConfigured = true;
    console.log('✅ Microsoft Graph configured successfully');
    
    // Initialize MSAL for server-side authentication
    this.msalConfig = {
      auth: {
        clientId: this.clientId,
        clientSecret: this.clientSecret,
        authority: `https://login.microsoftonline.com/${this.tenantId}`,
      }
    };

    this.msalClient = new ConfidentialClientApplication(this.msalConfig);
  }

  // Get access token using authorization code
  async getAccessTokenFromCode(authCode, redirectUri) {
    try {
      const tokenResponse = await this.msalClient.acquireTokenByCode({
        code: authCode,
        redirectUri: redirectUri,
        scopes: ['Files.Read', 'Files.ReadWrite', 'User.Read', 'offline_access']
      });

      return tokenResponse.accessToken;
    } catch (error) {
      console.error('Error acquiring token from code:', error);
      throw new Error('Failed to acquire access token');
    }
  }

  // Get access token using refresh token
  async getAccessTokenFromRefreshToken(refreshToken) {
    try {
      const tokenResponse = await this.msalClient.acquireTokenByRefreshToken({
        refreshToken: refreshToken,
        scopes: ['Files.Read', 'Files.ReadWrite', 'User.Read', 'offline_access']
      });

      return tokenResponse.accessToken;
    } catch (error) {
      console.error('Error acquiring token from refresh token:', error);
      throw new Error('Failed to refresh access token');
    }
  }

  // Create Graph client with access token
  createGraphClient(accessToken) {
    return Client.init({
      authProvider: (done) => {
        done(null, accessToken);
      }
    });
  }

  // Get user information
  async getUserInfo(accessToken) {
    try {
      if (!this.isConfigured) {
        return {
          id: 'mock-user-id',
          displayName: 'Mock User',
          mail: 'mock@example.com',
          userPrincipalName: 'mock@example.com'
        };
      }

      const graphClient = this.createGraphClient(accessToken);
      const user = await graphClient.api('/me').get();
      
      return {
        id: user.id,
        displayName: user.displayName,
        mail: user.mail,
        userPrincipalName: user.userPrincipalName
      };
    } catch (error) {
      console.error('Error getting user info:', error);
      throw new Error('Failed to get user information');
    }
  }

  // Get files from OneDrive
  async getFiles(accessToken, folderId = null, pageSize = 100) {
    try {
      if (!this.isConfigured) {
        // Return mock data
        return {
          value: [
            {
              id: 'mock-file-1',
              name: 'document1.pdf',
              size: 1024,
              lastModifiedDateTime: new Date().toISOString(),
              file: { mimeType: 'application/pdf' },
              folder: null
            },
            {
              id: 'mock-file-2',
              name: 'image1.jpg',
              size: 2048,
              lastModifiedDateTime: new Date().toISOString(),
              file: { mimeType: 'image/jpeg' },
              folder: null
            },
            {
              id: 'mock-folder-1',
              name: 'Documents',
              size: null,
              lastModifiedDateTime: new Date().toISOString(),
              file: null,
              folder: {}
            }
          ],
          '@odata.nextLink': null
        };
      }

      const graphClient = this.createGraphClient(accessToken);
      
      let endpoint = '/me/drive/root/children';
      if (folderId) {
        endpoint = `/me/drive/items/${folderId}/children`;
      }

      const response = await graphClient.api(endpoint)
        .top(pageSize)
        .select('id,name,size,lastModifiedDateTime,file,folder')
        .get();

      return response;
    } catch (error) {
      console.error('Error getting files:', error);
      throw new Error('Failed to get files from OneDrive');
    }
  }

  // Get file content for hash calculation
  async getFileContent(accessToken, fileId) {
    try {
      if (!this.isConfigured) {
        // Return mock content
        return Buffer.from('mock file content for hash calculation');
      }

      const graphClient = this.createGraphClient(accessToken);
      const content = await graphClient.api(`/me/drive/items/${fileId}/content`).get();
      
      return content;
    } catch (error) {
      console.error('Error getting file content:', error);
      throw new Error('Failed to get file content');
    }
  }

  // Delete files
  async deleteFiles(accessToken, fileIds) {
    try {
      if (!this.isConfigured) {
        console.log('Mock: Deleting files:', fileIds);
        // Return the same structure as real implementation
        const results = fileIds.map(fileId => ({ id: fileId, success: true }));
        return { 
          success: true, 
          deletedCount: fileIds.length,
          results
        };
      }

      const graphClient = this.createGraphClient(accessToken);
      const results = [];

      for (const fileId of fileIds) {
        try {
          await graphClient.api(`/me/drive/items/${fileId}`).delete();
          results.push({ id: fileId, success: true });
        } catch (error) {
          console.error(`Error deleting file ${fileId}:`, error);
          results.push({ id: fileId, success: false, error: error.message });
        }
      }

      return {
        success: results.every(r => r.success),
        deletedCount: results.filter(r => r.success).length,
        results
      };
    } catch (error) {
      console.error('Error deleting files:', error);
      throw new Error('Failed to delete files');
    }
  }

  // Get drive information
  async getDriveInfo(accessToken) {
    try {
      if (!this.isConfigured) {
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
            remaining: 1073741824000, // 1TB
            state: 'normal',
            total: 1073741824000,
            used: 0
          }
        };
      }

      const graphClient = this.createGraphClient(accessToken);
      const drive = await graphClient.api('/me/drive').get();
      
      return drive;
    } catch (error) {
      console.error('Error getting drive info:', error);
      throw new Error('Failed to get drive information');
    }
  }

  // Get storage quota
  async getStorageQuota(accessToken) {
    try {
      if (!this.isConfigured) {
        return {
          deleted: 0,
          remaining: 1073741824000, // 1TB
          state: 'normal',
          total: 1073741824000,
          used: 0
        };
      }

      const graphClient = this.createGraphClient(accessToken);
      const quota = await graphClient.api('/me/drive/quota').get();
      
      return quota;
    } catch (error) {
      console.error('Error getting storage quota:', error);
      throw new Error('Failed to get storage quota');
    }
  }
}

module.exports = new MicrosoftGraphService(); 
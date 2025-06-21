import { useState, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import { analytics } from '../components/Analytics';
import { debugLog, debugWarn, debugError, DEBUG } from '../utils/idbState';
import bffApi from '../services/bffApi';

export const useFileOperations = () => {
  const { instance } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(null);
  const abortControllerRef = useRef(null);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Clear progress
  const clearProgress = useCallback(() => {
    setProgress(null);
  }, []);

  // Cancel ongoing operation
  const cancelOperation = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // Get drive root children
  const getDriveRootChildren = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (DEBUG) debugLog('Fetching drive root children...');
      
      const tokenResponse = await instance.acquireTokenSilent({
        scopes: ['Files.Read', 'Files.ReadWrite', 'User.Read', 'offline_access'],
        account: instance.getActiveAccount(),
      });
      
      const files = await bffApi.getFiles(tokenResponse.accessToken);
      
      analytics.trackEvent('files_fetched', {
        location: 'root',
        count: files.files?.length || 0,
      });
      
      return files.files || [];
    } catch (error) {
      if (DEBUG) debugError('Error fetching drive root children:', error);
      setError('Failed to fetch files: ' + error.message);
      analytics.trackError(error, { action: 'fetch_root_files' });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [instance]);

  // Get folder children
  const getFolderChildren = useCallback(async (folderId) => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (DEBUG) debugLog('Fetching folder children:', folderId);
      
      const tokenResponse = await instance.acquireTokenSilent({
        scopes: ['Files.Read', 'Files.ReadWrite', 'User.Read', 'offline_access'],
        account: instance.getActiveAccount(),
      });
      
      const files = await bffApi.getFiles(tokenResponse.accessToken, folderId);
      
      analytics.trackEvent('files_fetched', {
        location: 'folder',
        folderId,
        count: files.files?.length || 0,
      });
      
      return files.files || [];
    } catch (error) {
      if (DEBUG) debugError('Error fetching folder children:', error);
      setError('Failed to fetch folder files: ' + error.message);
      analytics.trackError(error, { action: 'fetch_folder_files', folderId });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [instance]);

  // Search files
  const searchFiles = useCallback(async (query) => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (DEBUG) debugLog('Searching files:', query);
      
      const tokenResponse = await instance.acquireTokenSilent({
        scopes: ['Files.Read', 'Files.ReadWrite', 'User.Read', 'offline_access'],
        account: instance.getActiveAccount(),
      });
      
      // For now, we'll implement a simple search by fetching all files and filtering
      const files = await bffApi.getFiles(tokenResponse.accessToken);
      const filteredFiles = files.files?.filter(file => 
        file.name.toLowerCase().includes(query.toLowerCase())
      ) || [];
      
      analytics.trackEvent('files_searched', {
        query,
        count: filteredFiles.length,
      });
      
      return filteredFiles;
    } catch (error) {
      if (DEBUG) debugError('Error searching files:', error);
      setError('Failed to search files: ' + error.message);
      analytics.trackError(error, { action: 'search_files', query });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [instance]);

  // Get file metadata
  const getFileMetadata = useCallback(async (fileId) => {
    try {
      setError(null);
      
      if (DEBUG) debugLog('Fetching file metadata:', fileId);
      
      const tokenResponse = await instance.acquireTokenSilent({
        scopes: ['Files.Read', 'Files.ReadWrite', 'User.Read', 'offline_access'],
        account: instance.getActiveAccount(),
      });
      
      // For now, return basic metadata - this would need to be implemented in the BFF
      const metadata = {
        id: fileId,
        name: 'File',
        size: 0,
        lastModifiedDateTime: new Date().toISOString(),
      };
      
      return metadata;
    } catch (error) {
      if (DEBUG) debugError('Error fetching file metadata:', error);
      setError('Failed to fetch file metadata: ' + error.message);
      analytics.trackError(error, { action: 'fetch_file_metadata', fileId });
      throw error;
    }
  }, [instance]);

  // Get file download URL
  const getFileDownloadUrl = useCallback(async (fileId) => {
    try {
      setError(null);
      
      if (DEBUG) debugLog('Getting download URL for file:', fileId);
      
      // This would need to be implemented in the BFF
      const downloadUrl = `https://graph.microsoft.com/v1.0/me/drive/items/${fileId}/content`;
      
      return downloadUrl;
    } catch (error) {
      if (DEBUG) debugError('Error getting download URL:', error);
      setError('Failed to get download URL: ' + error.message);
      analytics.trackError(error, { action: 'get_download_url', fileId });
      throw error;
    }
  }, []);

  // Delete single file
  const deleteFile = useCallback(async (fileId) => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (DEBUG) debugLog('Deleting file:', fileId);
      
      const tokenResponse = await instance.acquireTokenSilent({
        scopes: ['Files.Read', 'Files.ReadWrite', 'User.Read', 'offline_access'],
        account: instance.getActiveAccount(),
      });
      
      const result = await bffApi.deleteFiles(tokenResponse.accessToken, [fileId]);
      
      analytics.trackEvent('file_deleted', {
        fileId,
        success: result.success,
      });
      
      return result;
    } catch (error) {
      if (DEBUG) debugError('Error deleting file:', error);
      setError('Failed to delete file: ' + error.message);
      analytics.trackError(error, { action: 'delete_file', fileId });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [instance]);

  // Delete multiple files (batch operation)
  const deleteFiles = useCallback(async (fileIds, onProgress) => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (DEBUG) debugLog('Deleting files in batch:', fileIds.length);
      
      // Set up abort controller
      abortControllerRef.current = new AbortController();
      
      // Update progress
      if (onProgress) {
        onProgress(0, fileIds.length, 'Starting batch deletion...');
      }
      
      const tokenResponse = await instance.acquireTokenSilent({
        scopes: ['Files.Read', 'Files.ReadWrite', 'User.Read', 'offline_access'],
        account: instance.getActiveAccount(),
      });
      
      const result = await bffApi.deleteFiles(tokenResponse.accessToken, fileIds);
      
      // Update final progress
      if (onProgress) {
        onProgress(fileIds.length, fileIds.length, 'Batch deletion completed');
      }
      
      analytics.trackEvent('files_deleted_batch', {
        total: fileIds.length,
        successful: result.deletedCount || 0,
        failed: fileIds.length - (result.deletedCount || 0),
      });
      
      return result;
    } catch (error) {
      if (DEBUG) debugError('Error deleting files in batch:', error);
      setError('Failed to delete files: ' + error.message);
      analytics.trackError(error, { action: 'delete_files_batch', fileIds });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [instance]);

  // Get drive information
  const getDriveInfo = useCallback(async () => {
    try {
      setError(null);
      
      if (DEBUG) debugLog('Fetching drive information...');
      
      const driveInfo = await bffApi.getDriveInfo();
      
      return driveInfo;
    } catch (error) {
      if (DEBUG) debugError('Error fetching drive info:', error);
      setError('Failed to fetch drive information: ' + error.message);
      analytics.trackError(error, { action: 'fetch_drive_info' });
      throw error;
    }
  }, [bffApi]);

  // Get storage quota
  const getStorageQuota = useCallback(async () => {
    try {
      setError(null);
      
      if (DEBUG) debugLog('Fetching storage quota...');
      
      const quota = await bffApi.getStorageQuota();
      
      return quota;
    } catch (error) {
      if (DEBUG) debugError('Error fetching storage quota:', error);
      setError('Failed to fetch storage quota: ' + error.message);
      analytics.trackError(error, { action: 'fetch_storage_quota' });
      throw error;
    }
  }, [bffApi]);

  // Clear folder cache
  const clearFolderCache = useCallback(async (folderId) => {
    try {
      setError(null);
      
      if (DEBUG) debugLog('Clearing folder cache:', folderId);
      
      const result = await bffApi.clearFolderCache(folderId);
      
      analytics.trackEvent('cache_cleared', {
        type: 'folder',
        folderId,
      });
      
      return result;
    } catch (error) {
      if (DEBUG) debugError('Error clearing folder cache:', error);
      setError('Failed to clear cache: ' + error.message);
      analytics.trackError(error, { action: 'clear_folder_cache', folderId });
      throw error;
    }
  }, [bffApi]);

  // Get cache statistics
  const getCacheStats = useCallback(async () => {
    try {
      setError(null);
      
      if (DEBUG) debugLog('Fetching cache statistics...');
      
      const stats = await bffApi.getCacheStats();
      
      return stats;
    } catch (error) {
      if (DEBUG) debugError('Error fetching cache stats:', error);
      setError('Failed to fetch cache statistics: ' + error.message);
      analytics.trackError(error, { action: 'fetch_cache_stats' });
      throw error;
    }
  }, [bffApi]);

  // Check BFF health
  const checkBFFHealth = useCallback(async () => {
    try {
      const health = await bffApi.healthCheck();
      return health.status === 'healthy';
    } catch (error) {
      if (DEBUG) debugError('BFF health check failed:', error);
      return false;
    }
  }, [bffApi]);

  return {
    // State
    isLoading,
    error,
    progress,
    
    // Actions
    clearError,
    clearProgress,
    cancelOperation,
    
    // File operations
    getDriveRootChildren,
    getFolderChildren,
    searchFiles,
    getFileMetadata,
    getFileDownloadUrl,
    deleteFile,
    deleteFiles,
    getDriveInfo,
    getStorageQuota,
    
    // Cache operations
    clearFolderCache,
    getCacheStats,
    
    // Health check
    checkBFFHealth,
  };
}; 
import { useState, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { analytics } from '../components/Analytics';
import { debugLog, debugWarn, debugError, DEBUG } from '../utils/idbState';

export const useFileOperations = () => {
  const { bffApi } = useAuth();
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
      
      const files = await bffApi.getDriveRootChildren();
      
      analytics.trackEvent('files_fetched', {
        location: 'root',
        count: files.length,
      });
      
      return files;
    } catch (error) {
      if (DEBUG) debugError('Error fetching drive root children:', error);
      setError('Failed to fetch files: ' + error.message);
      analytics.trackError(error, { action: 'fetch_root_files' });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [bffApi]);

  // Get folder children
  const getFolderChildren = useCallback(async (folderId) => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (DEBUG) debugLog('Fetching folder children:', folderId);
      
      const files = await bffApi.getFolderChildren(folderId);
      
      analytics.trackEvent('files_fetched', {
        location: 'folder',
        folderId,
        count: files.length,
      });
      
      return files;
    } catch (error) {
      if (DEBUG) debugError('Error fetching folder children:', error);
      setError('Failed to fetch folder files: ' + error.message);
      analytics.trackError(error, { action: 'fetch_folder_files', folderId });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [bffApi]);

  // Search files
  const searchFiles = useCallback(async (query) => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (DEBUG) debugLog('Searching files:', query);
      
      const files = await bffApi.searchFiles(query);
      
      analytics.trackEvent('files_searched', {
        query,
        count: files.length,
      });
      
      return files;
    } catch (error) {
      if (DEBUG) debugError('Error searching files:', error);
      setError('Failed to search files: ' + error.message);
      analytics.trackError(error, { action: 'search_files', query });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [bffApi]);

  // Get file metadata
  const getFileMetadata = useCallback(async (fileId) => {
    try {
      setError(null);
      
      if (DEBUG) debugLog('Fetching file metadata:', fileId);
      
      const metadata = await bffApi.getFileMetadata(fileId);
      
      return metadata;
    } catch (error) {
      if (DEBUG) debugError('Error fetching file metadata:', error);
      setError('Failed to fetch file metadata: ' + error.message);
      analytics.trackError(error, { action: 'fetch_file_metadata', fileId });
      throw error;
    }
  }, [bffApi]);

  // Get file download URL
  const getFileDownloadUrl = useCallback(async (fileId) => {
    try {
      setError(null);
      
      if (DEBUG) debugLog('Getting download URL for file:', fileId);
      
      const downloadUrl = await bffApi.getFileDownloadUrl(fileId);
      
      return downloadUrl;
    } catch (error) {
      if (DEBUG) debugError('Error getting download URL:', error);
      setError('Failed to get download URL: ' + error.message);
      analytics.trackError(error, { action: 'get_download_url', fileId });
      throw error;
    }
  }, [bffApi]);

  // Delete single file
  const deleteFile = useCallback(async (fileId) => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (DEBUG) debugLog('Deleting file:', fileId);
      
      const result = await bffApi.deleteFile(fileId);
      
      analytics.trackEvent('file_deleted', {
        fileId,
        success: true,
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
  }, [bffApi]);

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
      
      const result = await bffApi.deleteFiles(fileIds);
      
      // Update final progress
      if (onProgress) {
        onProgress(fileIds.length, fileIds.length, 'Batch deletion completed');
      }
      
      analytics.trackEvent('files_deleted_batch', {
        total: fileIds.length,
        successful: result.results?.successful || 0,
        failed: result.results?.failed || 0,
      });
      
      return result;
    } catch (error) {
      if (DEBUG) debugError('Error deleting files in batch:', error);
      setError('Failed to delete files: ' + error.message);
      analytics.trackError(error, { action: 'delete_files_batch', count: fileIds.length });
      throw error;
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [bffApi]);

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
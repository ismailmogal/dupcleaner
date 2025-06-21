import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from './useAuth';
import bffApi from '../services/bffApi';
import { idbGetCache, idbSetCache } from '../utils/idbState';
import { getFileIcon, getFileType, formatFileSize } from '../utils/fileUtils';

const FOLDER_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const useFileManagement = (initialFolderId = 'root') => {
  const { user, instance } = useAuth();
  const [files, setFiles] = useState([]);
  const [currentFolder, setCurrentFolder] = useState({ id: initialFolderId, name: 'OneDrive' });
  const [folderPath, setFolderPath] = useState([{ id: initialFolderId, name: 'OneDrive' }]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const lastFetchRef = useRef({ userId: null, folderId: null });

  // Debug logging
  console.log('useFileManagement - user:', user);
  console.log('useFileManagement - instance:', instance);
  console.log('useFileManagement - loading:', loading);
  console.log('useFileManagement - error:', error);

  const fetchFiles = useCallback(async (folderId) => {
    console.log('fetchFiles called with folderId:', folderId);
    setLoading(true);
    setError(null);
    const cacheKey = `folder_${folderId}`;
    try {
      const cached = await idbGetCache(cacheKey);
      if (cached) {
        console.log('Using cached files:', cached.length);
        setFiles(cached);
        setLoading(false);
        return;
      }

      console.log('No cache found, fetching from API...');
      const tokenResponse = await instance.acquireTokenSilent({
        scopes: ['Files.Read', 'Files.ReadWrite', 'User.Read', 'offline_access'],
        account: user,
      });

      console.log('Token acquired, calling bffApi.getFiles...');
      const data = await bffApi.getFiles(tokenResponse.accessToken, folderId === 'root' ? null : folderId);
      console.log('API response:', data);
      setFiles(data.files);
      await idbSetCache(cacheKey, data.files, FOLDER_CACHE_TTL);
    } catch (err) {
      console.error('Error in fetchFiles:', err);
      setError(`Failed to fetch files: ${err.message}`);
    } finally {
      console.log('fetchFiles completed, setting loading to false');
      setLoading(false);
    }
  }, [instance, user]);

  useEffect(() => {
    console.log('useFileManagement useEffect triggered');
    console.log('user:', user);
    console.log('initialFolderId:', initialFolderId);
    
    const userId = user?.id;
    const folderId = initialFolderId;
    
    // Check if we've already fetched for this user and folder
    if (lastFetchRef.current.userId === userId && lastFetchRef.current.folderId === folderId) {
      console.log('Already fetched for this user and folder, skipping');
      return;
    }
    
    if (user) {
      console.log('User found, calling fetchFiles...');
      lastFetchRef.current = { userId, folderId };
      fetchFiles(initialFolderId);
    } else {
      console.log('No user found, not fetching files');
      // Don't stay in loading state forever if there's no user
      setLoading(false);
      setError('Please log in to access your files');
    }
  }, [user?.id, initialFolderId]); // Remove fetchFiles from dependencies

  const navigateToFolder = useCallback((folder) => {
    const newPath = [...folderPath, folder];
    setFolderPath(newPath);
    setCurrentFolder(folder);
    lastFetchRef.current = { userId: user?.id, folderId: folder.id };
    fetchFiles(folder.id);
  }, [folderPath, user?.id, fetchFiles]);

  const navigateToPathByIndex = useCallback((index) => {
    if (index < 0) { // Root
      setFolderPath([{ id: 'root', name: 'OneDrive' }]);
      setCurrentFolder({ id: 'root', name: 'OneDrive' });
      lastFetchRef.current = { userId: user?.id, folderId: 'root' };
      fetchFiles('root');
    } else {
      const newPath = folderPath.slice(0, index + 1);
      setFolderPath(newPath);
      setCurrentFolder(folderPath[index]);
      lastFetchRef.current = { userId: user?.id, folderId: folderPath[index].id };
      fetchFiles(folderPath[index].id);
    }
  }, [folderPath, user?.id, fetchFiles]);
  
  const gridData = useMemo(() => {
    if (!files) return [];
    return files.map(item => ({
      ...item,
      icon: getFileIcon(item),
      type: getFileType(item),
      size: item.folder ? `${item.folder.childCount || 0} items` : formatFileSize(item.size),
      date: new Date(item.lastModifiedDateTime).toLocaleDateString(),
    }));
  }, [files]);


  return {
    files,
    gridData,
    currentFolder,
    folderPath,
    loading,
    error,
    navigateToFolder,
    navigateToPathByIndex
  };
}; 
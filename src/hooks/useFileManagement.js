import { useState, useEffect, useCallback, useMemo } from 'react';
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

  const fetchFiles = useCallback(async (folderId) => {
    setLoading(true);
    setError(null);
    const cacheKey = `folder_${folderId}`;
    try {
      const cached = await idbGetCache(cacheKey);
      if (cached) {
        setFiles(cached);
        setLoading(false);
        return;
      }

      const tokenResponse = await instance.acquireTokenSilent({
        scopes: ['Files.Read', 'Files.ReadWrite', 'User.Read', 'offline_access'],
        account: user,
      });

      const data = await bffApi.getFiles(tokenResponse.accessToken, folderId === 'root' ? null : folderId);
      setFiles(data.files);
      await idbSetCache(cacheKey, data.files, FOLDER_CACHE_TTL);
    } catch (err) {
      setError(`Failed to fetch files: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [instance, user]);

  useEffect(() => {
    if (user) {
      fetchFiles(initialFolderId);
    }
  }, [user, initialFolderId, fetchFiles]);

  const navigateToFolder = (folder) => {
    const newPath = [...folderPath, folder];
    setFolderPath(newPath);
    setCurrentFolder(folder);
    fetchFiles(folder.id);
  };

  const navigateToPathByIndex = (index) => {
    if (index < 0) { // Root
      setFolderPath([{ id: 'root', name: 'OneDrive' }]);
      setCurrentFolder({ id: 'root', name: 'OneDrive' });
      fetchFiles('root');
    } else {
      const newPath = folderPath.slice(0, index + 1);
      setFolderPath(newPath);
      setCurrentFolder(folderPath[index]);
      fetchFiles(folderPath[index].id);
    }
  };
  
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
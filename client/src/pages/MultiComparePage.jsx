import React, { useState, useRef, useCallback } from 'react';
import MultiFolderDuplicateManager from '../components/MultiFolderDuplicateManager';
import LoadingSpinner from '../components/LoadingSpinner';
import bffApi from '../services/bffApi';
import { useAuth } from '../hooks/useAuth';
import './MultiComparePage.css';

const MultiComparePage = () => {
  const { user, instance } = useAuth();
  const [selectedFolders, setSelectedFolders] = useState([]);
  const duplicateManagerRef = useRef();

  const handleClearSelection = () => {
    setSelectedFolders([]);
  };

  // Function to fetch files from a specific folder
  const fetchFolderFiles = useCallback(async (folderId) => {
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      const tokenResponse = await instance.acquireTokenSilent({
        scopes: ['Files.Read', 'Files.ReadWrite', 'User.Read', 'offline_access'],
        account: user,
      });

      // Call the API to get files from the specific folder
      const data = await bffApi.getFiles(tokenResponse.accessToken, folderId === 'root' ? null : folderId);
      console.log(`Fetched ${data.files.length} files from folder ${folderId}`);
      return data.files;
    } catch (error) {
      console.error('Error fetching folder files:', error);
      throw error;
    }
  }, [user, instance]);

  const handleDeleteFiles = async (filesOrIds, progressCallback) => {
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Handle both file objects and file IDs
      const fileIds = filesOrIds.map(item => {
        if (typeof item === 'string') {
          return item; // Already a file ID
        } else if (item && item.id) {
          return item.id; // Extract ID from file object
        } else {
          console.warn('Invalid file item:', item);
          return null;
        }
      }).filter(Boolean); // Remove null values

      if (fileIds.length === 0) {
        console.warn('No valid file IDs to delete');
        return [];
      }

      const tokenResponse = await instance.acquireTokenSilent({
        scopes: ['Files.Read', 'Files.ReadWrite', 'User.Read', 'offline_access'],
        account: user,
      });

      // Show confirmation dialog
      const confirmed = window.confirm(`Are you sure you want to delete ${fileIds.length} file(s)? This action cannot be undone.`);
      if (!confirmed) {
        return [];
      }

      console.log('Deleting files with IDs:', fileIds);
      
      // Call the API to delete files
      const result = await bffApi.deleteFiles(tokenResponse.accessToken, fileIds);
      
      console.log('Delete API result:', result);
      
      if (result.success) {
        console.log(`Successfully deleted ${result.deletedCount} file(s).`);
        
        // Call progress callback if provided
        if (progressCallback) {
          progressCallback(fileIds.length, fileIds.length, 'Deletion completed');
        }
        
        // Return the successfully deleted file IDs
        const deletedIds = result.results
          .filter(r => r.success)
          .map(r => r.id);
        
        console.log('Successfully deleted file IDs:', deletedIds);
        return deletedIds;
      } else {
        const failedCount = fileIds.length - result.deletedCount;
        console.warn(`Partially successful: ${result.deletedCount} files deleted, ${failedCount} failed.`);
        console.log('Delete results:', result.results);
        
        // Call progress callback if provided
        if (progressCallback) {
          progressCallback(result.deletedCount, fileIds.length, 'Deletion partially completed');
        }
        
        // Return the successfully deleted file IDs
        const deletedIds = result.results
          .filter(r => r.success)
          .map(r => r.id);
        
        console.log('Successfully deleted file IDs:', deletedIds);
        return deletedIds;
      }
    } catch (error) {
      console.error('Error deleting files:', error);
      
      // Call progress callback if provided
      if (progressCallback) {
        progressCallback(0, filesOrIds.length, `Error: ${error.message}`);
      }
      
      throw error;
    }
  };

  return (
    <div className="multi-compare-page">
      {/* Show duplicate manager/results - users can add folders directly here */}
      <MultiFolderDuplicateManager
        ref={duplicateManagerRef}
        onFetchFolderFiles={fetchFolderFiles}
        onDeleteFiles={handleDeleteFiles}
        selectedFolders={selectedFolders}
      />
    </div>
  );
};

export default MultiComparePage;

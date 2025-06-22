import React from 'react';
import { render, screen, waitFor, act, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import DuplicateManager from '../DuplicateManager';
import { ThemeProvider } from '../../contexts/ThemeContext';

// Mock the useAuth hook
vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    isAuthenticated: true,
    user: {
      id: 'mock-user-id',
      name: 'Mock User'
    },
    instance: {
      acquireTokenSilent: vi.fn().mockResolvedValue({
        accessToken: 'mock-access-token'
      }),
      getActiveAccount: vi.fn().mockReturnValue({
        id: 'mock-account-id',
        name: 'Mock User'
      })
    }
  }))
}));

// Mock the DuplicateDetector
const mockFindAllDuplicates = vi.fn().mockResolvedValue([]);
const mockFormatFileSize = vi.fn().mockReturnValue('1 MB');

vi.mock('../../utils/duplicateDetector', () => ({
  DuplicateDetector: vi.fn().mockImplementation(() => ({
    findAllDuplicates: mockFindAllDuplicates,
    formatFileSize: mockFormatFileSize
  }))
}));

// Mock analytics
vi.mock('../Analytics', () => ({
  analytics: {
    trackEvent: vi.fn(),
    trackError: vi.fn()
  }
}));

// Custom wrapper for components that need ThemeProvider
const wrapper = ({ children }) => (
  <ThemeProvider>
    {children}
  </ThemeProvider>
);

describe('DuplicateManager', () => {
  const mockFiles = [
    {
      id: '1',
      name: 'test1.txt',
      size: 1024,
      lastModifiedDateTime: '2023-01-01T00:00:00Z'
    },
    {
      id: '2',
      name: 'test2.txt',
      size: 2048,
      lastModifiedDateTime: '2023-01-01T00:00:00Z'
    }
  ];

  const mockCurrentFolder = {
    id: 'folder-1',
    name: 'Test Folder'
  };

  const mockOnDeleteFiles = vi.fn();
  const mockOnFolderClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockFindAllDuplicates.mockResolvedValue([]);
  });

  afterEach(() => {
    cleanup();
  });

  it('should render without crashing', async () => {
    render(
      <DuplicateManager 
        files={mockFiles}
        onDeleteFiles={mockOnDeleteFiles}
        currentFolder={mockCurrentFolder}
        onFolderClick={mockOnFolderClick}
      />, 
      { wrapper }
    );
    
    await waitFor(() => {
      expect(screen.getByText(/Duplicate File Manager/i)).toBeInTheDocument();
    });
  });

  it('should show current folder location', async () => {
    render(
      <DuplicateManager 
        files={mockFiles}
        onDeleteFiles={mockOnDeleteFiles}
        currentFolder={mockCurrentFolder}
        onFolderClick={mockOnFolderClick}
      />, 
      { wrapper }
    );
    
    await waitFor(() => {
      expect(screen.getByText(/Test Folder/i)).toBeInTheDocument();
    });
  });

  it('should show root folder when no current folder', async () => {
    render(
      <DuplicateManager 
        files={mockFiles}
        onDeleteFiles={mockOnDeleteFiles}
        currentFolder={null}
        onFolderClick={mockOnFolderClick}
      />, 
      { wrapper }
    );
    
    await waitFor(() => {
      expect(screen.getByText(/Root Folder/i)).toBeInTheDocument();
    });
  });

  it('should show detection methods', async () => {
    render(
      <DuplicateManager 
        files={mockFiles}
        onDeleteFiles={mockOnDeleteFiles}
        currentFolder={mockCurrentFolder}
        onFolderClick={mockOnFolderClick}
      />, 
      { wrapper }
    );
    
    await waitFor(() => {
      const detectionMethodsElements = screen.getAllByText(/Detection Methods/i);
      expect(detectionMethodsElements[0]).toBeInTheDocument();
      expect(screen.getByText(/Exact Match/i)).toBeInTheDocument();
      expect(screen.getByText(/Similar Names/i)).toBeInTheDocument();
    });
  });
}); 
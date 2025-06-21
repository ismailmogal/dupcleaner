import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
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
vi.mock('../../utils/duplicateDetector', () => ({
  DuplicateDetector: vi.fn().mockImplementation(() => ({
    findAllDuplicates: vi.fn().mockResolvedValue([]),
    formatFileSize: vi.fn().mockReturnValue('1 MB')
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
  });

  it('should render without crashing', () => {
    render(
      <DuplicateManager 
        files={mockFiles}
        onDeleteFiles={mockOnDeleteFiles}
        currentFolder={mockCurrentFolder}
        onFolderClick={mockOnFolderClick}
      />, 
      { wrapper }
    );
    expect(screen.getByText(/Duplicate File Manager/i)).toBeInTheDocument();
  });

  it('should show current folder location', () => {
    render(
      <DuplicateManager 
        files={mockFiles}
        onDeleteFiles={mockOnDeleteFiles}
        currentFolder={mockCurrentFolder}
        onFolderClick={mockOnFolderClick}
      />, 
      { wrapper }
    );
    expect(screen.getByText(/Test Folder/i)).toBeInTheDocument();
  });

  it('should show root folder when no current folder', () => {
    render(
      <DuplicateManager 
        files={mockFiles}
        onDeleteFiles={mockOnDeleteFiles}
        currentFolder={null}
        onFolderClick={mockOnFolderClick}
      />, 
      { wrapper }
    );
    expect(screen.getByText(/Root Folder/i)).toBeInTheDocument();
  });

  it('should show detection methods', () => {
    render(
      <DuplicateManager 
        files={mockFiles}
        onDeleteFiles={mockOnDeleteFiles}
        currentFolder={mockCurrentFolder}
        onFolderClick={mockOnFolderClick}
      />, 
      { wrapper }
    );
    expect(screen.getByText(/Detection Methods/i)).toBeInTheDocument();
    expect(screen.getByText(/Exact Match/i)).toBeInTheDocument();
    expect(screen.getByText(/Similar Names/i)).toBeInTheDocument();
  });
}); 
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DuplicateManager from '../DuplicateManager';
import { AuthProvider } from '../../contexts/AuthContext';
import { ThemeProvider } from '../../contexts/ThemeContext';

// Mock the cache functions
vi.mock('../../utils/idbCache', () => ({
  getCache: vi.fn(),
  setCache: vi.fn(),
  pruneExpired: vi.fn(),
}));

// Mock the duplicate detector
vi.mock('../../utils/duplicateDetector', () => ({
  default: class MockDuplicateDetector {
    findAllDuplicates() {
      return Promise.resolve([]);
    }
    formatFileSize() {
      return '1 MB';
    }
  },
  DuplicateDetector: class MockDuplicateDetector {
    findAllDuplicates() {
      return Promise.resolve([]);
    }
    formatFileSize() {
      return '1 MB';
    }
  }
}));

// Mock the file operations
vi.mock('../../hooks/useFileOperations', () => ({
  useFileOperations: () => ({
    deleteFiles: vi.fn().mockResolvedValue([]),
    loadFolderChildren: vi.fn(),
    isLoading: false,
    error: null,
  }),
}));

const mockFiles = [
  {
    id: '1',
    name: 'test1.txt',
    size: 1024,
    lastModifiedDateTime: '2023-01-01T00:00:00Z',
    isFolder: false,
  },
  {
    id: '2',
    name: 'test2.txt',
    size: 1024,
    lastModifiedDateTime: '2023-01-01T00:00:00Z',
    isFolder: false,
  },
];

const mockCurrentFolder = {
  id: 'folder-1',
  name: 'Test Folder',
  isFolder: true,
};

const renderWithProviders = (component) => {
  return render(
    <ThemeProvider>
      <AuthProvider>
        {component}
      </AuthProvider>
    </ThemeProvider>
  );
};

describe('DuplicateManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    renderWithProviders(
      <DuplicateManager 
        files={mockFiles}
        currentFolder={mockCurrentFolder}
        onDeleteFiles={vi.fn()}
        onFolderClick={vi.fn()}
      />
    );
    
    expect(screen.getByText(/Duplicate Finder/i)).toBeInTheDocument();
  });

  it('handles empty files array', () => {
    renderWithProviders(
      <DuplicateManager 
        files={[]}
        currentFolder={mockCurrentFolder}
        onDeleteFiles={vi.fn()}
        onFolderClick={vi.fn()}
      />
    );
    
    expect(screen.getByText(/No duplicates found/i)).toBeInTheDocument();
  });

  it('handles undefined files prop', () => {
    renderWithProviders(
      <DuplicateManager 
        files={undefined}
        currentFolder={mockCurrentFolder}
        onDeleteFiles={vi.fn()}
        onFolderClick={vi.fn()}
      />
    );
    
    expect(screen.getByText(/No duplicates found/i)).toBeInTheDocument();
  });

  it('handles null files prop', () => {
    renderWithProviders(
      <DuplicateManager 
        files={null}
        currentFolder={mockCurrentFolder}
        onDeleteFiles={vi.fn()}
        onFolderClick={vi.fn()}
      />
    );
    
    expect(screen.getByText(/No duplicates found/i)).toBeInTheDocument();
  });

  it('handles files with missing properties', () => {
    const incompleteFiles = [
      { id: '1', name: 'test1.txt' }, // missing size and other properties
      { id: '2' }, // missing name and other properties
    ];

    renderWithProviders(
      <DuplicateManager 
        files={incompleteFiles}
        currentFolder={mockCurrentFolder}
        onDeleteFiles={vi.fn()}
        onFolderClick={vi.fn()}
      />
    );
    
    expect(screen.getByText(/Duplicate Finder/i)).toBeInTheDocument();
  });

  it('handles undefined currentFolder', () => {
    renderWithProviders(
      <DuplicateManager 
        files={mockFiles}
        currentFolder={undefined}
        onDeleteFiles={vi.fn()}
        onFolderClick={vi.fn()}
      />
    );
    
    expect(screen.getByText(/Duplicate Finder/i)).toBeInTheDocument();
  });

  it('handles null currentFolder', () => {
    renderWithProviders(
      <DuplicateManager 
        files={mockFiles}
        currentFolder={null}
        onDeleteFiles={vi.fn()}
        onFolderClick={vi.fn()}
      />
    );
    
    expect(screen.getByText(/Duplicate Finder/i)).toBeInTheDocument();
  });

  it('displays current folder name', () => {
    renderWithProviders(
      <DuplicateManager 
        files={mockFiles}
        currentFolder={mockCurrentFolder}
        onDeleteFiles={vi.fn()}
        onFolderClick={vi.fn()}
      />
    );
    
    expect(screen.getByText(/Test Folder/i)).toBeInTheDocument();
  });

  it('displays "Root Folder" when no current folder', () => {
    renderWithProviders(
      <DuplicateManager 
        files={mockFiles}
        currentFolder={null}
        onDeleteFiles={vi.fn()}
        onFolderClick={vi.fn()}
      />
    );
    
    expect(screen.getByText(/Root Folder/i)).toBeInTheDocument();
  });

  it('shows scan button when files are available', () => {
    renderWithProviders(
      <DuplicateManager 
        files={mockFiles}
        currentFolder={mockCurrentFolder}
        onDeleteFiles={vi.fn()}
        onFolderClick={vi.fn()}
      />
    );
    
    expect(screen.getByText(/Scan for Duplicates/i)).toBeInTheDocument();
  });

  it('handles search functionality', async () => {
    renderWithProviders(
      <DuplicateManager 
        files={mockFiles}
        currentFolder={mockCurrentFolder}
        onDeleteFiles={vi.fn()}
        onFolderClick={vi.fn()}
      />
    );
    
    const searchInput = screen.getByPlaceholderText(/Search duplicates/i);
    expect(searchInput).toBeInTheDocument();
    
    await act(async () => {
      searchInput.value = 'test';
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    });
  });

  it('handles file type filtering', () => {
    renderWithProviders(
      <DuplicateManager 
        files={mockFiles}
        currentFolder={mockCurrentFolder}
        onDeleteFiles={vi.fn()}
        onFolderClick={vi.fn()}
      />
    );
    
    const filterSelect = screen.getByDisplayValue(/All Files/i);
    expect(filterSelect).toBeInTheDocument();
  });

  it('handles detection method toggles', () => {
    renderWithProviders(
      <DuplicateManager 
        files={mockFiles}
        currentFolder={mockCurrentFolder}
        onDeleteFiles={vi.fn()}
        onFolderClick={vi.fn()}
      />
    );
    
    expect(screen.getByText(/Exact Match/i)).toBeInTheDocument();
    expect(screen.getByText(/Similar Names/i)).toBeInTheDocument();
    expect(screen.getByText(/Same Size/i)).toBeInTheDocument();
  });

  it('handles error states gracefully', async () => {
    // Mock the duplicate detector to throw an error
    const { default: MockDuplicateDetector } = await import('../../utils/duplicateDetector');
    MockDuplicateDetector.prototype.findAllDuplicates = vi.fn().mockRejectedValue(new Error('Test error'));

    renderWithProviders(
      <DuplicateManager 
        files={mockFiles}
        currentFolder={mockCurrentFolder}
        onDeleteFiles={vi.fn()}
        onFolderClick={vi.fn()}
      />
    );
    
    // The component should still render without crashing
    expect(screen.getByText(/Duplicate Finder/i)).toBeInTheDocument();
  });

  it('handles cache errors gracefully', async () => {
    const { getCache, setCache, pruneExpired } = await import('../../utils/idbCache');
    getCache.mockRejectedValue(new Error('Cache error'));
    setCache.mockRejectedValue(new Error('Cache error'));
    pruneExpired.mockRejectedValue(new Error('Cache error'));

    renderWithProviders(
      <DuplicateManager 
        files={mockFiles}
        currentFolder={mockCurrentFolder}
        onDeleteFiles={vi.fn()}
        onFolderClick={vi.fn()}
      />
    );
    
    // The component should still render without crashing
    expect(screen.getByText(/Duplicate Finder/i)).toBeInTheDocument();
  });

  it('handles invalid cache data', async () => {
    const { getCache } = await import('../../utils/idbCache');
    getCache.mockResolvedValue('invalid-data'); // Not an array

    renderWithProviders(
      <DuplicateManager 
        files={mockFiles}
        currentFolder={mockCurrentFolder}
        onDeleteFiles={vi.fn()}
        onFolderClick={vi.fn()}
      />
    );
    
    // The component should still render without crashing
    expect(screen.getByText(/Duplicate Finder/i)).toBeInTheDocument();
  });
}); 
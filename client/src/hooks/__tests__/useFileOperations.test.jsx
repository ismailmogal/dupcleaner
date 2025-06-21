import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useFileOperations } from '../useFileOperations';
import { AuthProvider } from '../../contexts/AuthContext';

// Mock the BFF API service
vi.mock('../../services/bffApi', () => ({
  default: {
    getFolderChildren: vi.fn(),
    deleteFile: vi.fn(),
  },
}));

// Custom wrapper for hooks that need AuthProvider
const wrapper = ({ children }) => (
  <AuthProvider>
    {children}
  </AuthProvider>
);

describe('useFileOperations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useFileOperations(), { wrapper });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should load folder children successfully', async () => {
    const mockFiles = [
      { id: '1', name: 'file1.txt', size: 1024 },
      { id: '2', name: 'file2.txt', size: 2048 },
    ];
    const { default: bffApi } = await import('../../services/bffApi');
    bffApi.getFolderChildren.mockResolvedValue(mockFiles);
    const { result } = renderHook(() => useFileOperations(), { wrapper });
    let files;
    await act(async () => {
      files = await result.current.getFolderChildren('test-folder-id');
    });
    expect(files).toEqual(mockFiles);
    expect(result.current.error).toBe(null);
    expect(bffApi.getFolderChildren).toHaveBeenCalledWith('test-folder-id');
  });

  it('should handle error when loading folder children', async () => {
    const mockError = new Error('Failed to load files');
    const { default: bffApi } = await import('../../services/bffApi');
    bffApi.getFolderChildren.mockRejectedValue(mockError);
    const { result } = renderHook(() => useFileOperations(), { wrapper });
    await act(async () => {
      await expect(result.current.getFolderChildren('test-folder-id')).rejects.toThrow('Failed to load files');
    });
    expect(result.current.error).toContain('Failed to fetch folder files');
  });

  it('should delete file successfully', async () => {
    const { default: bffApi } = await import('../../services/bffApi');
    bffApi.deleteFile.mockResolvedValue({ success: true });
    const { result } = renderHook(() => useFileOperations(), { wrapper });
    let res;
    await act(async () => {
      res = await result.current.deleteFile('file-id');
    });
    expect(res).toEqual({ success: true });
    expect(bffApi.deleteFile).toHaveBeenCalledWith('file-id');
  });
}); 
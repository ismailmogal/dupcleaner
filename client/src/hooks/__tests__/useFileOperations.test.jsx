import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useFileOperations } from '../useFileOperations';
import { ThemeProvider } from '../../contexts/ThemeContext';

// Mock the useAuth hook
vi.mock('../useAuth', () => ({
  useAuth: vi.fn(() => ({
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

// Mock bffApi
vi.mock('../../services/bffApi', () => ({
  default: {
    getFiles: vi.fn(),
    deleteFiles: vi.fn()
  }
}));

// Mock analytics
vi.mock('../../components/Analytics', () => ({
  analytics: {
    trackEvent: vi.fn(),
    trackError: vi.fn()
  }
}));

describe('useFileOperations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useFileOperations());
    
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.progress).toBe(null);
  });

  it('should clear error when clearError is called', () => {
    const { result } = renderHook(() => useFileOperations());
    
    act(() => {
      result.current.clearError();
    });
    
    expect(result.current.error).toBe(null);
  });

  it('should clear progress when clearProgress is called', () => {
    const { result } = renderHook(() => useFileOperations());
    
    act(() => {
      result.current.clearProgress();
    });
    
    expect(result.current.progress).toBe(null);
  });
}); 
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ThemeProvider } from '../../contexts/ThemeContext';
import UserPreferences from '../UserPreferences';

// Mock fetch
global.fetch = vi.fn();

// Add this before the describe block
vi.mock('../FeatureFlagAdmin', () => ({
  __esModule: true,
  default: () => (
    <div className="feature-flag-admin">
      <h4>Feature Flags</h4>
      <div>Enabled Features: 2</div>
      <div>Total Features: 4</div>
    </div>
  )
}));

const mockUserProfile = {
  user: {
    id: 'test-user',
    subscriptionTier: 'free',
    features: ['basic_scan', 'single_folder'],
    usageCount: 0,
    lastActive: '2025-06-22T05:00:00.000Z'
  },
  usage: {
    enhanced_ai_scan: 2,
    multi_folder_scan: 1,
    bulk_actions: 0
  },
  limits: {
    aiScans: 5,
    multiFolderScans: 3,
    bulkActions: 0,
    maxFiles: 100
  }
};

const mockFeatureFlags = {
  enabledFeatures: ['AI_DETECTION', 'MULTI_FOLDER'],
  allFeatures: ['AI_DETECTION', 'MULTI_FOLDER', 'BULK_ACTIONS', 'ANALYTICS'],
  timestamp: '2025-06-22T05:00:00.000Z'
};

const renderWithTheme = (component) => {
  return render(
    <ThemeProvider>
      {component}
    </ThemeProvider>
  );
};

describe('UserPreferences', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  it('renders subscription tab by default', () => {
    renderWithTheme(<UserPreferences isOpen={true} onClose={vi.fn()} />);
    
    expect(screen.getByText('User Preferences & Subscription')).toBeInTheDocument();
    expect(screen.getByText('Subscription')).toBeInTheDocument();
    expect(screen.getByText('Preferences')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('shows loading state when fetching user profile', () => {
    fetch.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    renderWithTheme(<UserPreferences isOpen={true} onClose={vi.fn()} />);
    
    expect(screen.getByText('Loading user profile...')).toBeInTheDocument();
  });

  it('displays user profile data when loaded', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockUserProfile
    });

    renderWithTheme(<UserPreferences isOpen={true} onClose={vi.fn()} />);
    
    await waitFor(() => {
      expect(screen.getByText('FREE')).toBeInTheDocument();
      expect(screen.getByText('AI Scans')).toBeInTheDocument();
      expect(screen.getByText('Multi-Folder Scans')).toBeInTheDocument();
    });
  });

  it('shows upgrade options for free users', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockUserProfile
    });

    renderWithTheme(<UserPreferences isOpen={true} onClose={vi.fn()} />);
    
    await waitFor(() => {
      expect(screen.getByText('Upgrade Options')).toBeInTheDocument();
      expect(screen.getByText('Upgrade to Premium')).toBeInTheDocument();
      expect(screen.getByText('Upgrade to Enterprise')).toBeInTheDocument();
    });
  });

  it('switches to preferences tab', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockUserProfile
    });

    renderWithTheme(<UserPreferences isOpen={true} onClose={vi.fn()} />);
    
    await waitFor(() => {
      fireEvent.click(screen.getByText('Preferences'));
    });
    
    expect(screen.getByText('View Settings')).toBeInTheDocument();
    expect(screen.getByText('Display Options')).toBeInTheDocument();
    expect(screen.getByText('Behavior')).toBeInTheDocument();
  });

  it('switches to admin tab and loads feature flags', async () => {
    // Create a mock user profile with enterprise tier for admin access
    const enterpriseUserProfile = {
      ...mockUserProfile,
      user: {
        ...mockUserProfile.user,
        subscriptionTier: 'enterprise'
      }
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => enterpriseUserProfile
    }).mockResolvedValueOnce({
      ok: true,
      json: async () => mockFeatureFlags
    });

    renderWithTheme(<UserPreferences isOpen={true} onClose={vi.fn()} />);
    
    await waitFor(() => {
      fireEvent.click(screen.getByText('Admin'));
    });
    
    // Wait for the loading state to disappear and feature flags to load
    await waitFor(() => {
      expect(screen.queryByText('Loading Feature Flag Admin...')).not.toBeInTheDocument();
    }, { timeout: 3000 });
    
    await waitFor(() => {
      expect(screen.getByText('Feature Flags')).toBeInTheDocument();
      expect(screen.getByText('Enabled Features: 2')).toBeInTheDocument();
      expect(screen.getByText('Total Features: 4')).toBeInTheDocument();
    });
  });

  it('handles upgrade request', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockUserProfile
    }).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, message: 'Upgraded successfully' })
    });

    const mockAlert = vi.spyOn(window, 'alert').mockImplementation(() => {});

    renderWithTheme(<UserPreferences isOpen={true} onClose={vi.fn()} />);
    
    await waitFor(() => {
      fireEvent.click(screen.getByText('Upgrade to Premium'));
    });
    
    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Successfully upgraded to premium tier!');
    });

    mockAlert.mockRestore();
  });

  it('handles API errors gracefully', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));

    renderWithTheme(<UserPreferences isOpen={true} onClose={vi.fn()} />);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load user profile')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });

  it('closes modal when close button is clicked', () => {
    const onClose = vi.fn();
    renderWithTheme(<UserPreferences isOpen={true} onClose={onClose} />);
    
    fireEvent.click(screen.getByText('×'));
    expect(onClose).toHaveBeenCalled();
  });

  it('does not render when isOpen is false', () => {
    renderWithTheme(<UserPreferences isOpen={false} onClose={vi.fn()} />);
    
    expect(screen.queryByText('User Preferences & Subscription')).not.toBeInTheDocument();
  });
}); 
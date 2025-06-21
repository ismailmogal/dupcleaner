import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider } from '../contexts/ThemeContext';
import { AuthProvider } from '../contexts/AuthContext';

// Custom render function that includes providers
const AllTheProviders = ({ children }) => {
  return (
    <ThemeProvider>
      <AuthProvider>
        {children}
      </AuthProvider>
    </ThemeProvider>
  );
};

const customRender = (ui, options) =>
  render(ui, { wrapper: AllTheProviders, ...options });

// Mock data for tests
export const mockFiles = [
  {
    id: '1',
    name: 'document1.pdf',
    size: 1024000,
    lastModified: '2024-01-15T10:30:00Z',
    webUrl: 'https://example.com/file1',
    '@microsoft.graph.downloadUrl': 'https://example.com/download1'
  },
  {
    id: '2',
    name: 'document2.pdf',
    size: 1024000,
    lastModified: '2024-01-15T10:30:00Z',
    webUrl: 'https://example.com/file2',
    '@microsoft.graph.downloadUrl': 'https://example.com/download2'
  },
  {
    id: '3',
    name: 'image1.jpg',
    size: 512000,
    lastModified: '2024-01-14T15:45:00Z',
    webUrl: 'https://example.com/file3',
    '@microsoft.graph.downloadUrl': 'https://example.com/download3'
  }
];

export const mockFolders = [
  {
    id: 'folder1',
    name: 'Documents',
    size: 2048000,
    lastModified: '2024-01-15T10:30:00Z',
    webUrl: 'https://example.com/folder1'
  },
  {
    id: 'folder2',
    name: 'Images',
    size: 1024000,
    lastModified: '2024-01-14T15:45:00Z',
    webUrl: 'https://example.com/folder2'
  }
];

export const mockDuplicateGroups = [
  {
    id: 'group1',
    files: [
      { ...mockFiles[0], hash: 'abc123' },
      { ...mockFiles[1], hash: 'abc123' }
    ],
    size: 2048000,
    type: 'exact'
  }
];

// Mock user data
export const mockUser = {
  id: 'user123',
  displayName: 'Test User',
  email: 'test@example.com',
  photo: 'https://example.com/photo.jpg'
};

// Mock authentication state
export const mockAuthState = {
  isAuthenticated: true,
  user: mockUser,
  accessToken: 'mock-access-token',
  loading: false,
  error: null
};

// Mock theme state
export const mockThemeState = {
  theme: 'light',
  toggleTheme: vi.fn()
};

// Helper function to wait for async operations
export const waitFor = (ms = 0) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to mock API responses
export const createMockApiResponse = (data, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => data,
  text: async () => JSON.stringify(data)
});

// Helper function to create mock fetch
export const createMockFetch = (responses = {}) => {
  return vi.fn((url) => {
    const response = responses[url] || responses['*'] || { data: null, status: 404 };
    return Promise.resolve(createMockApiResponse(response.data, response.status));
  });
};

// Helper function to simulate user interactions
export const simulateUserInteraction = async (element, action = 'click') => {
  if (action === 'click') {
    element.click();
  } else if (action === 'change') {
    element.dispatchEvent(new Event('change', { bubbles: true }));
  } else if (action === 'input') {
    element.dispatchEvent(new Event('input', { bubbles: true }));
  }
  await waitFor();
};

// Re-export everything from testing-library
export * from '@testing-library/react';

// Override render method
export { customRender as render }; 
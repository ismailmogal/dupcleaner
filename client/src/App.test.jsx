import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from './App';

// Mock MSAL to avoid crypto dependency issues in test environment
vi.mock('@azure/msal-browser', () => ({
  PublicClientApplication: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue({}),
    getAllAccounts: vi.fn().mockReturnValue([]),
    setActiveAccount: vi.fn(),
    acquireTokenSilent: vi.fn(),
    acquireTokenPopup: vi.fn(),
    loginPopup: vi.fn(),
  })),
  InteractionRequiredAuthError: vi.fn(),
}));

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }) => children,
  Routes: ({ children }) => children,
  Route: ({ element }) => element,
  NavLink: ({ children }) => children,
}));

// Mock the useAuth hook
vi.mock('./hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    isAuthenticated: false,
    login: vi.fn(),
    logout: vi.fn(),
    instance: {
      initialize: vi.fn().mockResolvedValue({}),
      getActiveAccount: vi.fn().mockReturnValue(null),
    }
  }))
}));

describe('App', () => {
  it('renders app without crashing', () => {
    render(<App />);
    // Basic test to ensure app renders without errors
    expect(document.body).toBeInTheDocument();
  });
});

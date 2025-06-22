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
    getLogger: vi.fn().mockReturnValue({
      info: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
      debug: vi.fn(),
      verbose: vi.fn(),
      clone: vi.fn().mockReturnValue({
        info: vi.fn(),
        error: vi.fn(),
        warning: vi.fn(),
        debug: vi.fn(),
        verbose: vi.fn()
      })
    }),
    getConfiguration: vi.fn().mockReturnValue({
      auth: {
        clientId: 'test-client-id',
        authority: 'https://test.authority.com'
      }
    }),
    initializeWrapperLibrary: vi.fn(),
    addEventCallback: vi.fn()
  })),
  InteractionRequiredAuthError: vi.fn(),
  BrowserCacheLocation: 'sessionStorage',
  LogLevel: {
    Info: 3,
    Error: 0,
    Warning: 2,
    Debug: 4
  }
}));

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }) => children,
  Routes: ({ children }) => children,
  Route: ({ element }) => element,
  NavLink: ({ children }) => children,
  useNavigate: () => vi.fn(),
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
      getLogger: vi.fn().mockReturnValue({
        info: vi.fn(),
        error: vi.fn(),
        warning: vi.fn(),
        debug: vi.fn(),
        clone: vi.fn().mockReturnValue({
          info: vi.fn(),
          error: vi.fn(),
          warning: vi.fn(),
          debug: vi.fn()
        })
      })
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

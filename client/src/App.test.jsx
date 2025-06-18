import { render, screen } from '@testing-library/react';
import App from './App';

// Mock MSAL to avoid crypto dependency issues in test environment
jest.mock('@azure/msal-browser', () => ({
  PublicClientApplication: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue({}),
    getAllAccounts: jest.fn().mockReturnValue([]),
    setActiveAccount: jest.fn(),
    acquireTokenSilent: jest.fn(),
    acquireTokenPopup: jest.fn(),
    loginPopup: jest.fn(),
  })),
  InteractionRequiredAuthError: jest.fn(),
}));

test('renders app without crashing', () => {
  render(<App />);
  // Basic test to ensure app renders without errors
  expect(document.body).toBeInTheDocument();
});

import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { analytics } from '../components/Analytics';

export const useAuth = () => {
  const { instance } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  
  // Get user account - try getActiveAccount first, then getAllAccounts
  let user = instance.getActiveAccount();
  if (!user && isAuthenticated) {
    const accounts = instance.getAllAccounts();
    if (accounts.length > 0) {
      user = accounts[0];
      // Set the first account as active
      instance.setActiveAccount(user);
    }
  }

  // Debug logging
  console.log('useAuth - isAuthenticated:', isAuthenticated);
  console.log('useAuth - user:', user);
  console.log('useAuth - instance:', instance);
  console.log('useAuth - all accounts:', instance.getAllAccounts());

  const login = async () => {
    try {
      console.log('Login attempt started...');
      await instance.loginPopup({
        scopes: ['Files.Read', 'Files.ReadWrite', 'User.Read', 'offline_access']
      });
      console.log('Login successful');
      analytics.trackEvent('login_successful');
    } catch (error) {
      console.error('Login error:', error);
      analytics.trackError(error, { action: 'login' });
    }
  };

  const logout = () => {
    console.log('Logout called');
    instance.logoutPopup();
  };

  return {
    isAuthenticated,
    user,
    login,
    logout,
    instance
  };
};
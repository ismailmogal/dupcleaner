import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { analytics } from '../components/Analytics';

export const useAuth = () => {
  const { instance } = useMsal();
  const isAuthenticated = useIsAuthenticated();

  const login = async () => {
    try {
      await instance.loginPopup({
        scopes: ['Files.Read', 'Files.ReadWrite', 'User.Read', 'offline_access']
      });
      analytics.trackEvent('login_successful');
    } catch (error) {
      analytics.trackError(error, { action: 'login' });
    }
  };

  const logout = () => {
    instance.logoutPopup();
  };

  return {
    isAuthenticated,
    user: instance.getActiveAccount(),
    login,
    logout,
    instance
  };
}; 
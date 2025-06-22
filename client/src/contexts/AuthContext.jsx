import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('authToken'));
  const [refreshToken, setRefreshToken] = useState(localStorage.getItem('refreshToken'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Configure axios defaults
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        if (token) {
          // Verify token and get user info
          const response = await axios.get(`${process.env.REACT_APP_BFF_URL || 'http://localhost:3001'}/api/user`);
          setUser(response.data);
        }
      } catch (error) {
        console.error('Token verification failed:', error);
        // Token is invalid, clear auth state
        logout();
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, [token]);

  // Register new user
  const register = async (userData) => {
    try {
      setError(null);
      const response = await axios.post(`${process.env.REACT_APP_BFF_URL || 'http://localhost:3001'}/api/auth/register`, userData);
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Registration failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Login with email/password
  const login = async (email, password) => {
    try {
      setError(null);
      const response = await axios.post(`${process.env.REACT_APP_BFF_URL || 'http://localhost:3001'}/api/auth/login`, {
        email,
        password
      });

      const { user: userData, token: newToken, refreshToken: newRefreshToken } = response.data;

      // Store tokens
      localStorage.setItem('authToken', newToken);
      localStorage.setItem('refreshToken', newRefreshToken);
      
      setToken(newToken);
      setRefreshToken(newRefreshToken);
      setUser(userData);

      return userData;
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Login failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Social login
  const socialLogin = (provider) => {
    const baseUrl = process.env.REACT_APP_BFF_URL || 'http://localhost:3001';
    window.location.href = `${baseUrl}/api/auth/${provider}`;
  };

  // Handle OAuth callback
  const handleOAuthCallback = (token, refreshToken) => {
    localStorage.setItem('authToken', token);
    localStorage.setItem('refreshToken', refreshToken);
    
    setToken(token);
    setRefreshToken(refreshToken);
    
    // Fetch user info
    fetchUserInfo();
  };

  // Fetch user info
  const fetchUserInfo = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_BFF_URL || 'http://localhost:3001'}/api/user`);
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user info:', error);
      logout();
    }
  };

  // Refresh token
  const refreshAuthToken = async () => {
    try {
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await axios.post(`${process.env.REACT_APP_BFF_URL || 'http://localhost:3001'}/api/auth/refresh`, {
        refreshToken
      });

      const { token: newToken, refreshToken: newRefreshToken } = response.data;

      localStorage.setItem('authToken', newToken);
      localStorage.setItem('refreshToken', newRefreshToken);
      
      setToken(newToken);
      setRefreshToken(newRefreshToken);

      return newToken;
    } catch (error) {
      console.error('Token refresh failed:', error);
      logout();
      throw error;
    }
  };

  // Logout
  const logout = async () => {
    try {
      if (token) {
        await axios.post(`${process.env.REACT_APP_BFF_URL || 'http://localhost:3001'}/api/auth/logout`);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear auth state
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      
      setToken(null);
      setRefreshToken(null);
      setUser(null);
      setError(null);
      
      // Clear axios default header
      delete axios.defaults.headers.common['Authorization'];
    }
  };

  // Forgot password
  const forgotPassword = async (email) => {
    try {
      setError(null);
      const response = await axios.post(`${process.env.REACT_APP_BFF_URL || 'http://localhost:3001'}/api/auth/forgot-password`, {
        email
      });
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Password reset request failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Reset password
  const resetPassword = async (token, newPassword) => {
    try {
      setError(null);
      const response = await axios.post(`${process.env.REACT_APP_BFF_URL || 'http://localhost:3001'}/api/auth/reset-password`, {
        token,
        newPassword
      });
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Password reset failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Verify email
  const verifyEmail = async (token) => {
    try {
      setError(null);
      const response = await axios.get(`${process.env.REACT_APP_BFF_URL || 'http://localhost:3001'}/api/auth/verify-email/${token}`);
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Email verification failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Resend verification email
  const resendVerification = async (email) => {
    try {
      setError(null);
      const response = await axios.post(`${process.env.REACT_APP_BFF_URL || 'http://localhost:3001'}/api/auth/resend-verification`, {
        email
      });
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to resend verification email';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Update profile
  const updateProfile = async (profileData) => {
    try {
      setError(null);
      const response = await axios.put(`${process.env.REACT_APP_BFF_URL || 'http://localhost:3001'}/api/auth/profile`, profileData);
      setUser(response.data.user);
      return response.data.user;
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to update profile';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Change password
  const changePassword = async (currentPassword, newPassword) => {
    try {
      setError(null);
      const response = await axios.post(`${process.env.REACT_APP_BFF_URL || 'http://localhost:3001'}/api/auth/change-password`, {
        currentPassword,
        newPassword
      });
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to change password';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Delete account
  const deleteAccount = async (password) => {
    try {
      setError(null);
      const response = await axios.delete(`${process.env.REACT_APP_BFF_URL || 'http://localhost:3001'}/api/auth/account`, {
        data: { password }
      });
      logout();
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to delete account';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Check if user is authenticated
  const isAuthenticated = !!user && !!token;

  // Check if user has premium subscription
  const isPremium = user?.subscription?.tier === 'premium' || user?.subscription?.tier === 'enterprise';

  // Check if user is admin
  const isAdmin = user?.isAdmin === true;

  // Get user's subscription tier
  const getSubscriptionTier = () => user?.subscription?.tier || 'free';

  // Get user's usage stats
  const getUsageStats = () => user?.usage || {};

  // Clear error
  const clearError = () => setError(null);

  const value = {
    user,
    token,
    loading,
    error,
    isAuthenticated,
    isPremium,
    isAdmin,
    register,
    login,
    socialLogin,
    handleOAuthCallback,
    logout,
    forgotPassword,
    resetPassword,
    verifyEmail,
    resendVerification,
    updateProfile,
    changePassword,
    deleteAccount,
    refreshAuthToken,
    getSubscriptionTier,
    getUsageStats,
    clearError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 
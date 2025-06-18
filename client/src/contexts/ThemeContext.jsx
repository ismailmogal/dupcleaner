import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('light');
  const [userPreferences, setUserPreferences] = useState({
    fileBrowserViewMode: 'grid',
    duplicateManagerViewMode: 'list',
    multiFolderViewMode: 'list',
    autoScan: true,
    showFileSizes: true,
    showFileDates: true,
    compactMode: false
  });

  // Load theme and preferences from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('app_theme');
    const savedPreferences = localStorage.getItem('app_preferences');
    
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
    
    if (savedPreferences) {
      try {
        const parsed = JSON.parse(savedPreferences);
        setUserPreferences(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error('Error loading user preferences:', error);
      }
    }
  }, []);

  // Save theme to localStorage and apply to document
  const updateTheme = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('app_theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  // Save preferences to localStorage
  const updatePreferences = (newPreferences) => {
    const updated = { ...userPreferences, ...newPreferences };
    setUserPreferences(updated);
    localStorage.setItem('app_preferences', JSON.stringify(updated));
  };

  // Toggle between light and dark themes
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    updateTheme(newTheme);
  };

  const value = {
    theme,
    userPreferences,
    updateTheme,
    updatePreferences,
    toggleTheme,
    isDark: theme === 'dark'
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}; 
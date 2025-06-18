import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import './ThemeToggle.css';

function ThemeToggle() {
  const { toggleTheme, isDark } = useTheme();

  return (
    <div className="theme-toggle">
      <button 
        className="theme-toggle-btn"
        onClick={toggleTheme}
        title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      >
        <div className="theme-icon">
          {isDark ? (
            <span className="sun-icon">☀️</span>
          ) : (
            <span className="moon-icon">🌙</span>
          )}
        </div>
        <span className="theme-label">
          {isDark ? 'Light' : 'Dark'} Mode
        </span>
      </button>
    </div>
  );
}

export default ThemeToggle; 
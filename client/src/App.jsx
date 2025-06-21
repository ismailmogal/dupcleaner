import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import { PublicClientApplication } from '@azure/msal-browser';
import { MsalProvider, useMsal, useIsAuthenticated } from "@azure/msal-react";
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import TermsOfService from './components/TermsOfService';
import PrivacyPolicy from './components/PrivacyPolicy';
import ThemeToggle from './components/ThemeToggle';
import UserPreferences from './components/UserPreferences';
import AnalyticsConsent from './components/AnalyticsConsent';
import LoadingSpinner from './components/LoadingSpinner';
import Footer from './components/Footer';
import { analytics } from './components/Analytics';
import bffApi from './services/bffApi';
import logo from './logo.svg';
import './App.css';
import './styles/themes.css';
import { idbSet, idbGet, idbSetCache, idbGetCache, idbRemove } from './utils/idbState';
import { msalIdbCachePlugin } from './utils/msalIdbCache';
import FileExplorerGrid from './components/FileExplorerGrid';
import { formatFileSize, getFileIcon, getFileType } from './utils/fileUtils';
import { useAuth } from './hooks/useAuth';

// Pages
import BrowsePage from './pages/BrowsePage';
import HomePage from './pages/HomePage';
const MultiComparePage = lazy(() => import('./pages/MultiComparePage'));
const SmartOrganizerPage = lazy(() => import('./pages/SmartOrganizerPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

// MSAL configuration
const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_CLIENT_ID,
    authority: 'https://login.microsoftonline.com/consumers',
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'custom',
    storeAuthStateInCookie: false,
    cachePlugin: msalIdbCachePlugin,
  },
  system: {
    // ... logger config ...
  }
};

const msalInstance = new PublicClientApplication(msalConfig);

function AppLayout() {
  const { theme } = useTheme();
  const { isAuthenticated, login, logout, instance } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const navigate = useNavigate();
  
  // Initialize MSAL
  useEffect(() => {
    instance.initialize().then(() => setIsInitialized(true));
  }, [instance]);

  if (!isInitialized) {
    return <LoadingSpinner />;
  }

  return (
    <div className={`App ${theme}`}>
      <header className="App-header">
        <div className="header-top">
          <div className="header-title">
            <img src={logo} className="App-logo" alt="logo" />
            <h1>OneDrive Duplicate Finder</h1>
          </div>
          <div className="header-controls">
            <ThemeToggle />
            {isAuthenticated && (
              <button 
                className="preferences-button"
                onClick={() => setShowPreferences(true)}
                title="User Preferences"
              >
                ⚙️
              </button>
            )}
            {isAuthenticated ? (
              <button className="logout-button" onClick={logout}>
                Logout
              </button>
            ) : (
              <button className="login-button" onClick={login}>
                Login
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="container">
        {showPreferences && <UserPreferences onClose={() => setShowPreferences(false)} />}
        <AnalyticsConsent onConsent={analytics.handleConsent} />

        <div className="content-area">
          {isAuthenticated && (
            <nav className="main-nav">
              <NavLink to="/" className={({ isActive }) => isActive ? 'nav-button active' : 'nav-button'}>Home</NavLink>
              <NavLink to="/browse" className={({ isActive }) => isActive ? 'nav-button active' : 'nav-button'}>Browse</NavLink>
              <NavLink to="/multi-compare" className={({ isActive }) => isActive ? 'nav-button active' : 'nav-button'}>Multi-Compare</NavLink>
              <NavLink to="/smart-organizer" className={({ isActive }) => isActive ? 'nav-button active' : 'nav-button'}>Smart Organizer</NavLink>
            </nav>
          )}
          <main className="main-content">
            <Suspense fallback={<LoadingSpinner />}>
              <Routes>
                <Route path="/" element={isAuthenticated ? <HomePage /> : <LoginPrompt onLogin={login} />} />
                <Route path="/browse" element={isAuthenticated ? <BrowsePage /> : <LoginPrompt onLogin={login} />} />
                <Route path="/multi-compare" element={isAuthenticated ? <MultiComparePage /> : <LoginPrompt onLogin={login} />} />
                <Route path="/smart-organizer" element={isAuthenticated ? <SmartOrganizerPage /> : <LoginPrompt onLogin={login} />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </main>
        </div>
      </div>
      
      <Footer onPageChange={(page) => {
        if (page === 'terms') navigate('/terms');
        if (page === 'privacy') navigate('/privacy');
      }} />
    </div>
  );
}

const LoginPrompt = ({ onLogin }) => (
  <div className="login-container">
    <h2>Welcome to the OneDrive Duplicate Finder</h2>
    <p>Please log in with your Microsoft account to continue.</p>
    <button onClick={onLogin}>Login with Microsoft</button>
  </div>
);

function App() {
  return (
    <Router>
      <ThemeProvider>
        <MsalProvider instance={msalInstance}>
          <Routes>
            <Route path="/*" element={<AppLayout />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
          </Routes>
        </MsalProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;

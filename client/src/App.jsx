import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import TermsOfService from './components/TermsOfService';
import PrivacyPolicy from './components/PrivacyPolicy';
import ThemeToggle from './components/ThemeToggle';
import UserPreferences from './components/UserPreferences';
import AnalyticsConsent from './components/AnalyticsConsent';
import LoadingSpinner from './components/LoadingSpinner';
import AuthModal from './components/AuthModal';
import Footer from './components/Footer';
import { analytics } from './components/Analytics';
import logo from './logo.svg';
import './App.css';
import './styles/themes.css';
import debugEnv from './debug-env';

// Debug environment variables
debugEnv();

// Pages
import BrowsePage from './pages/BrowsePage';
import HomePage from './pages/HomePage';
const MultiComparePage = lazy(() => import('./pages/MultiComparePage'));
const SmartOrganizerPage = lazy(() => import('./pages/SmartOrganizerPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

function AppLayout() {
  const { theme } = useTheme();
  const { 
    isAuthenticated, 
    user, 
    logout, 
    loading 
  } = useAuth();
  const [showPreferences, setShowPreferences] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const navigate = useNavigate();
  const location = useLocation();

  // Handle OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const token = urlParams.get('token');
    const refreshToken = urlParams.get('refreshToken');
    const error = urlParams.get('error');

    if (token && refreshToken) {
      // Handle successful OAuth callback
      const { handleOAuthCallback } = useAuth();
      handleOAuthCallback(token, refreshToken);
      
      // Clean up URL
      navigate(location.pathname, { replace: true });
    } else if (error) {
      // Handle OAuth error
      console.error('OAuth error:', error);
      setAuthMode('login');
      setShowAuthModal(true);
      
      // Clean up URL
      navigate(location.pathname, { replace: true });
    }
  }, [location, navigate]);

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Loading OneDrive Duplicate Finder...</h2>
        <LoadingSpinner />
        <p>Initializing application...</p>
      </div>
    );
  }

  const handleLogin = () => {
    setAuthMode('login');
    setShowAuthModal(true);
  };

  const handleSignup = () => {
    setAuthMode('register');
    setShowAuthModal(true);
  };

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
              <div className="user-info">
                <span className="user-name">
                  {user?.displayName || `${user?.firstName} ${user?.lastName}`}
                </span>
                <span className="user-tier">
                  {user?.subscription?.tier || 'Free'}
                </span>
              </div>
            )}
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
              <div className="auth-buttons">
                <button className="login-button" onClick={handleLogin}>
                  Sign In
                </button>
                <button className="signup-button" onClick={handleSignup}>
                  Sign Up
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="container">
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
                <Route path="/" element={<HomePage />} />
                <Route path="/browse" element={isAuthenticated ? <BrowsePage /> : <LoginPrompt onLogin={handleLogin} onSignup={handleSignup} />} />
                <Route path="/multi-compare" element={isAuthenticated ? <MultiComparePage /> : <LoginPrompt onLogin={handleLogin} onSignup={handleSignup} />} />
                <Route path="/smart-organizer" element={isAuthenticated ? <SmartOrganizerPage /> : <LoginPrompt onLogin={handleLogin} onSignup={handleSignup} />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </main>
        </div>
      </div>
      
      {/* Modals outside container to ensure proper overlay rendering */}
      {showPreferences && <UserPreferences isOpen={showPreferences} onClose={() => setShowPreferences(false)} />}
      {showAuthModal && (
        <AuthModal 
          isOpen={showAuthModal} 
          onClose={() => setShowAuthModal(false)}
          initialMode={authMode}
        />
      )}
      
      <Footer onPageChange={(page) => {
        if (page === 'terms') navigate('/terms');
        if (page === 'privacy') navigate('/privacy');
      }} />
    </div>
  );
}

const LoginPrompt = ({ onLogin, onSignup }) => (
  <div className="login-container">
    <h2>Welcome to the OneDrive Duplicate Finder</h2>
    <p>Please sign in or create an account to continue.</p>
    <div className="login-buttons">
      <button onClick={onLogin} className="login-button">Sign In</button>
      <button onClick={onSignup} className="signup-button">Create Account</button>
    </div>
  </div>
);

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            <Route path="/*" element={<AppLayout />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
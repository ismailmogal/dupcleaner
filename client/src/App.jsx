import React, { useState, useEffect, useRef, useCallback, Suspense, lazy } from 'react';
import { PublicClientApplication, EventType } from '@azure/msal-browser';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import TermsOfService from './components/TermsOfService';
import PrivacyPolicy from './components/PrivacyPolicy';
import ThemeToggle from './components/ThemeToggle';
import UserPreferences from './components/UserPreferences';
import AnalyticsConsent from './components/AnalyticsConsent';
import LoadingSpinner from './components/LoadingSpinner';
import Footer from './components/Footer';
import { analytics } from './components/Analytics';
import logo from './logo.svg';
import './App.css';
import './styles/themes.css';

// Lazy load heavy components
const DuplicateManager = lazy(() => import('./components/DuplicateManager'));
const MultiFolderDuplicateManager = lazy(() => import('./components/MultiFolderDuplicateManager'));
const FileBrowser = lazy(() => import('./components/FileBrowser'));
const SmartOrganizer = lazy(() => import('./components/SmartOrganizer'));
const CollaborativeManager = lazy(() => import('./components/CollaborativeManager'));
const AITestRunner = lazy(() => import('./components/AITestRunner'));

// MSAL configuration
const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_CLIENT_ID,
    authority: 'https://login.microsoftonline.com/consumers',
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
  system: {
    allowNativeBroker: false,
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) {
          return;
        }
        switch (level) {
          case 0:
            console.error(message);
            return;
          case 1:
            console.warn(message);
            return;
          case 2:
            console.info(message);
            return;
          case 3:
            console.debug(message);
            return;
          default:
            return;
        }
      },
      piiLoggingEnabled: false,
      logLevel: 3,
    }
  }
};

// Create MSAL instance
const msalInstance = new PublicClientApplication(msalConfig);

function AppContent() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [files, setFiles] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [folderPath, setFolderPath] = useState([]);
  const [error, setError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedFiles, setSelectedFiles] = useState(new Set());
  const multiFolderManagerRef = useRef(null);
  const [notification, setNotification] = useState(null);
  const [showPreferences, setShowPreferences] = useState(false);
  
  const { userPreferences } = useTheme();

  const fetchFiles = useCallback(async (folderId = null) => {
    try {
      const account = msalInstance.getActiveAccount();
      if (!account) {
        throw new Error('No active account');
      }

      console.log('Fetching token for account:', account.username);

      // Get access token with specific scopes for OneDrive
      const tokenResponse = await msalInstance.acquireTokenSilent({
        scopes: ['Files.Read', 'Files.ReadWrite', 'User.Read', 'offline_access'],
        account: account
      });

      // Fetch files from Microsoft Graph
      const endpoint = folderId 
        ? `https://graph.microsoft.com/v1.0/me/drive/items/${folderId}/children`
        : 'https://graph.microsoft.com/v1.0/me/drive/root/children';
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tokenResponse.accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('Error response:', errorData);
        const errorMessage = errorData?.error?.message || response.statusText;
        const errorCode = errorData?.error?.code;
        throw new Error(`Failed to fetch files: ${response.status} - ${errorMessage}${errorCode ? ` (${errorCode})` : ''}`);
      }

      const data = await response.json();
      // console.log('Files fetched successfully:', data.value.length);
      setFiles(data.value);
    } catch (error) {
      console.error('Error fetching files:', error);
      if (error.name === 'InteractionRequiredAuthError') {
        // console.log('Silent token acquisition failed, trying interactive...');
        try {
          const tokenResponse = await msalInstance.acquireTokenPopup({
            scopes: ['Files.Read', 'Files.ReadWrite', 'User.Read', 'offline_access']
          });
          
          // console.log('Interactive token acquisition successful:', tokenResponse);
          
          const endpoint = folderId 
            ? `https://graph.microsoft.com/v1.0/me/drive/items/${folderId}/children`
            : 'https://graph.microsoft.com/v1.0/me/drive/root/children';
          
          const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${tokenResponse.accessToken}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          });

          // console.log('Response status:', response.status);

          if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            console.error('Error response:', errorData);
            const errorMessage = errorData?.error?.message || response.statusText;
            const errorCode = errorData?.error?.code;
            throw new Error(`Failed to fetch files: ${response.status} - ${errorMessage}${errorCode ? ` (${errorCode})` : ''}`);
          }

          const data = await response.json();
          // console.log('Files fetched successfully:', data.value.length);
          setFiles(data.value);
        } catch (interactiveError) {
          console.error('Interactive token acquisition failed:', interactiveError);
          setError('Failed to fetch files: ' + interactiveError.message);
        }
      } else {
        setError('Failed to fetch files: ' + error.message);
      }
    }
  }, []);

  useEffect(() => {
    const initializeMsal = async () => {
      try {
        await msalInstance.initialize();
        setIsInitialized(true);

        // Check if user is already signed in
        const accounts = msalInstance.getAllAccounts();
        if (accounts.length > 0) {
          msalInstance.setActiveAccount(accounts[0]);
          setIsAuthenticated(true);
          fetchFiles();
        }

        // Add event callback for handling redirect
        const callbackId = msalInstance.addEventCallback((event) => {
          if (event.eventType === EventType.LOGIN_SUCCESS) {
            const accounts = msalInstance.getAllAccounts();
            if (accounts.length > 0) {
              msalInstance.setActiveAccount(accounts[0]);
              setIsAuthenticated(true);
              fetchFiles();
            }
          }
        });

        return () => {
          if (callbackId) {
            msalInstance.removeEventCallback(callbackId);
          }
        };
      } catch (error) {
        console.error('MSAL initialization error:', error);
        setError('Failed to initialize authentication: ' + error.message);
      }
    };

    initializeMsal();
  }, [fetchFiles]);

  const handleFolderClick = async (folder) => {
    // Clear selected files when navigating
    setSelectedFiles(new Set());
    
    if (folder === null) {
      // Navigate to root
      setCurrentFolder(null);
      setFolderPath([]);
      await fetchFiles();
    } else {
      // Navigate to specific folder
      setCurrentFolder(folder);
      const newPath = [...folderPath, folder];
      setFolderPath(newPath);
      await fetchFiles(folder.id);
    }
  };

  const handleBreadcrumbClick = async (index) => {
    // Clear selected files when navigating
    setSelectedFiles(new Set());
    
    if (index === -1) {
      // Navigate to root
      setCurrentFolder(null);
      setFolderPath([]);
      await fetchFiles();
    } else if (index < folderPath.length) {
      // Navigate to specific breadcrumb level
      const targetFolder = folderPath[index];
      const newPath = folderPath.slice(0, index + 1);
      setCurrentFolder(targetFolder);
      setFolderPath(newPath);
      await fetchFiles(targetFolder.id);
    }
  };

  const handleFileSelect = (file) => {
    setSelectedFiles(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(file.id)) {
        newSelected.delete(file.id);
      } else {
        newSelected.add(file.id);
      }
      return newSelected;
    });
  };

  const handleLogin = async () => {
    try {
      if (!isInitialized) {
        throw new Error('Authentication is not initialized yet');
      }
      
      // Track login attempt
      analytics.trackEvent('login_attempted');
      
      // console.log('Starting login process...');
      const loginResponse = await msalInstance.loginPopup({
        scopes: ['Files.Read', 'Files.ReadWrite', 'User.Read', 'offline_access']
      });

      // console.log('Login response:', loginResponse);

      if (loginResponse) {
        const accounts = msalInstance.getAllAccounts();
        // console.log('Available accounts:', accounts);
        
        if (accounts.length > 0) {
          msalInstance.setActiveAccount(accounts[0]);
          setIsAuthenticated(true);
          
          // Track successful login
          analytics.trackEvent('login_successful', {
            accountType: 'microsoft'
          });
          
          await fetchFiles();
        } else {
          throw new Error('No accounts found after login');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      
      // Track login error
      analytics.trackError(error, { action: 'login' });
      
      setError('Failed to login: ' + error.message);
    }
  };

  const handleLogout = () => {
    msalInstance.logoutPopup();
    setIsAuthenticated(false);
    setFiles([]);
  };

  const deleteFiles = async (filesToDelete, onProgress) => {
    try {
      const account = msalInstance.getActiveAccount();
      if (!account) {
        throw new Error('No active account');
      }

      const tokenResponse = await msalInstance.acquireTokenSilent({
        scopes: ['Files.Read', 'Files.ReadWrite', 'User.Read', 'offline_access'],
        account: account
      });

      // Delete files in parallel with concurrency limit for better performance
      const concurrencyLimit = 5; // Process 5 files at a time
      const results = [];
      const errors = [];
      let completedCount = 0;

      // Call progress callback if provided
      if (onProgress) {
        onProgress(0, filesToDelete.length, 'Starting deletion...');
      }

      // Process files in batches
      for (let i = 0; i < filesToDelete.length; i += concurrencyLimit) {
        const batch = filesToDelete.slice(i, i + concurrencyLimit);
        
        const batchPromises = batch.map(async (file) => {
          try {
            const response = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${file.id}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${tokenResponse.accessToken}`,
                'Content-Type': 'application/json'
              }
            });

            if (!response.ok) {
              const errorMessage = `Failed to delete ${file.name}: ${response.status} ${response.statusText}`;
              console.error(errorMessage);
              return { success: false, file, error: errorMessage };
            } else {
              console.log(`Successfully deleted: ${file.name}`);
              return { success: true, file };
            }
          } catch (error) {
            const errorMessage = `Error deleting ${file.name}: ${error.message}`;
            console.error(errorMessage);
            return { success: false, file, error: errorMessage };
          }
        });

        // Wait for current batch to complete
        const batchResults = await Promise.allSettled(batchPromises);
        
        // Process batch results
        batchResults.forEach((result) => {
          if (result.status === 'fulfilled') {
            if (result.value.success) {
              results.push(result.value.file);
            } else {
              errors.push({ file: result.value.file, error: result.value.error });
            }
          } else {
            // This shouldn't happen with Promise.allSettled, but handle it anyway
            console.error('Unexpected error in batch:', result.reason);
          }
        });

        completedCount += batch.length;
        
        // Update progress
        if (onProgress) {
          const currentFile = batch[batch.length - 1];
          onProgress(completedCount, filesToDelete.length, `Deleted ${currentFile?.name || 'files'}...`);
        }
        
        console.log(`Completed ${completedCount}/${filesToDelete.length} files`);
      }

      // If there were any errors, throw an error with details
      if (errors.length > 0) {
        const errorMessage = `Failed to delete ${errors.length} out of ${filesToDelete.length} files:\n${errors.map(e => e.error).join('\n')}`;
        throw new Error(errorMessage);
      }

      // Refresh the file list
      await fetchFiles();
      
      return results;
    } catch (error) {
      console.error('Error deleting files:', error);
      throw error;
    }
  };

  const fetchFolderFiles = async (folderId) => {
    try {
      const account = msalInstance.getActiveAccount();
      if (!account) {
        throw new Error('No active account');
      }

      const tokenResponse = await msalInstance.acquireTokenSilent({
        scopes: ['Files.Read', 'Files.ReadWrite', 'User.Read', 'offline_access'],
        account: account
      });

      // Handle root folder case
      const endpoint = folderId === 'root' 
        ? 'https://graph.microsoft.com/v1.0/me/drive/root/children'
        : `https://graph.microsoft.com/v1.0/me/drive/items/${folderId}/children`;
        
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tokenResponse.accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.error?.message || response.statusText;
        throw new Error(`Failed to fetch folder files: ${response.status} - ${errorMessage}`);
      }

      const data = await response.json();
      return data.value;
    } catch (error) {
      console.error('Error fetching folder files:', error);
      throw error;
    }
  };

  const handleAddToComparison = (folder) => {
    console.log('handleAddToComparison called with folder:', folder);
    console.log('multiFolderManagerRef.current:', multiFolderManagerRef.current);
    console.log('currentPage:', currentPage);
    
    // Store the folder in localStorage for cross-page communication
    const pendingFolders = JSON.parse(localStorage.getItem('pendingComparisonFolders') || '[]');
    const folderExists = pendingFolders.find(f => f.id === folder.id);
    
    if (!folderExists) {
      pendingFolders.push(folder);
      localStorage.setItem('pendingComparisonFolders', JSON.stringify(pendingFolders));
      console.log('Added folder to pending list:', pendingFolders.length);
    }
    
    if (multiFolderManagerRef.current && multiFolderManagerRef.current.addFolder) {
      console.log('Calling addFolder directly...');
      multiFolderManagerRef.current.addFolder(folder);
      // Show notification
      setNotification(`Added "${folder.name}" to comparison`);
      setTimeout(() => setNotification(null), 3000);
    } else {
      console.log('MultiFolderManager not available, navigating to multi-folder page...');
      // Navigate to multi-folder page
      setCurrentPage('multi-folder');
      setNotification(`Added "${folder.name}" to comparison. Navigating to Multi-Compare...`);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    
    // If navigating to multi-folder page, check for pending folders
    if (page === 'multi-folder' && multiFolderManagerRef.current && multiFolderManagerRef.current.checkPendingFolders) {
      // Use setTimeout to ensure the component is mounted
      setTimeout(() => {
        multiFolderManagerRef.current.checkPendingFolders();
      }, 200);
    }
    
    // Track page navigation
    analytics.trackPageView(page);
  };

  const renderContent = () => {
    if (!isAuthenticated) {
      return (
        <div className="login-container">
          <div className="login-content">
            <h2>Welcome to OneDrive Duplicate Finder</h2>
            <p>The world's first AI-powered team duplicate manager for OneDrive</p>
            <div className="feature-highlights">
              <div className="feature-item">
                <span className="feature-icon">🤖</span>
                <span>AI-Powered Detection</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">👥</span>
                <span>Team Collaboration</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">🧠</span>
                <span>Smart Organization</span>
              </div>
            </div>
            <button className="login-button" onClick={handleLogin}>
              Sign in with Microsoft
            </button>
          </div>
        </div>
      );
    }

    switch (currentPage) {
      case 'home':
        return (
          <div className="home-container">
            <div className="welcome-section">
              <h2>Welcome to Your OneDrive Manager</h2>
              <p>Choose a tool to get started:</p>
            </div>
            <div className="tools-grid">
              <div className="tool-card" onClick={() => handlePageChange('duplicates')}>
                <div className="tool-icon">🔍</div>
                <h3>Find Duplicates</h3>
                <p>Basic duplicate detection in current folder</p>
              </div>
              <div className="tool-card" onClick={() => handlePageChange('multi-folder')}>
                <div className="tool-icon">📁</div>
                <h3>Multi-Folder Compare</h3>
                <p>Find duplicates across multiple folders</p>
              </div>
              <div className="tool-card" onClick={() => handlePageChange('ai-detection')}>
                <div className="tool-icon">🤖</div>
                <h3>AI Detection</h3>
                <p>Advanced AI-powered duplicate detection</p>
              </div>
              <div className="tool-card" onClick={() => handlePageChange('smart-organizer')}>
                <div className="tool-icon">🧠</div>
                <h3>Smart Organizer</h3>
                <p>AI recommendations for file organization</p>
              </div>
              <div className="tool-card" onClick={() => handlePageChange('team-collaboration')}>
                <div className="tool-icon">👥</div>
                <h3>Team Collaboration</h3>
                <p>Collaborate with your team on duplicates</p>
              </div>
              <div className="tool-card" onClick={() => handlePageChange('browser')}>
                <div className="tool-icon">📂</div>
                <h3>File Browser</h3>
                <p>Browse and navigate your OneDrive files</p>
              </div>
              <div className="tool-card" onClick={() => handlePageChange('ai-test-runner')}>
                <div className="tool-icon">🧪</div>
                <h3>AI Test Runner</h3>
                <p>Validate AI detection accuracy with real files</p>
              </div>
            </div>
          </div>
        );

      case 'duplicates':
        return (
          <Suspense fallback={<LoadingSpinner />}>
          <DuplicateManager 
            files={files} 
            onDeleteFiles={deleteFiles} 
            currentFolder={currentFolder}
            onFolderClick={handleFolderClick}
          />
          </Suspense>
        );

      case 'multi-folder':
        return (
          <Suspense fallback={<LoadingSpinner />}>
          <MultiFolderDuplicateManager 
            ref={multiFolderManagerRef}
            onFetchFolderFiles={fetchFolderFiles}
            onDeleteFiles={deleteFiles}
            />
          </Suspense>
        );

      case 'ai-detection':
        return (
          <div className="ai-detection-container">
            <h2>🤖 AI-Powered Duplicate Detection</h2>
            <p>Advanced detection using machine learning algorithms</p>
            <div className="ai-features">
              <div className="ai-feature">
                <h3>🖼️ Visual Similarity</h3>
                <p>Detect similar images even with different names or sizes</p>
              </div>
              <div className="ai-feature">
                <h3>📄 Content Analysis</h3>
                <p>Find similar documents based on content, not just metadata</p>
              </div>
              <div className="ai-feature">
                <h3>🎥 Video Comparison</h3>
                <p>Identify similar videos using frame analysis</p>
              </div>
            </div>
            <button className="ai-scan-btn" onClick={() => handlePageChange('duplicates')}>
              Start AI Detection
            </button>
          </div>
        );

      case 'smart-organizer':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <SmartOrganizer
              files={files}
              onOrganize={async (plan) => {
                console.log('Executing organization plan:', plan);
                // Implement organization logic here
                analytics.trackEvent('smart_organization_executed', {
                  planType: plan.type,
                  filesProcessed: plan.filesToProcess.length
                });
              }}
            />
          </Suspense>
        );

      case 'team-collaboration':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <CollaborativeManager
              files={files}
              onShare={async (folderId, memberEmails) => {
                console.log('Sharing folder:', folderId, 'with:', memberEmails);
                // Implement sharing logic here
              }}
              onCollaborate={async (request) => {
                console.log('Collaboration request:', request);
                // Implement collaboration logic here
              }}
          />
          </Suspense>
        );

      case 'browser':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <FileBrowser 
              files={files}
              currentFolder={currentFolder}
              folderPath={folderPath}
              onFolderClick={handleFolderClick}
              onBreadcrumbClick={handleBreadcrumbClick}
              onFileSelect={handleFileSelect}
              selectedFiles={selectedFiles}
              onAddToComparison={handleAddToComparison}
              defaultViewMode={userPreferences.fileBrowserViewMode}
              showFileSizes={userPreferences.showFileSizes}
              showFileDates={userPreferences.showFileDates}
              compactMode={userPreferences.compactMode}
            />
          </Suspense>
        );

      case 'terms':
        return <TermsOfService />;

      case 'privacy':
        return <PrivacyPolicy />;

      case 'ai-test-runner':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <AITestRunner />
          </Suspense>
        );

      default:
        return (
          <div className="home-container">
            <h2>Welcome to OneDrive Duplicate Finder</h2>
            <p>Please select a tool from the navigation menu.</p>
              </div>
        );
    }
  };

  if (!isInitialized) {
    return (
      <div className="App">
        <header className="App-header">
          <div className="header-title">
            <img src={logo} className="App-logo" alt="OneDrive Duplicate Finder Logo" />
            <h1>OneDrive Duplicate Finder</h1>
          </div>
          <p>Initializing...</p>
        </header>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-top">
          <div className="header-title">
            <img src={logo} className="App-logo" alt="OneDrive Duplicate Finder Logo" />
            <h1>OneDrive Duplicate Finder</h1>
          </div>
          <div className="header-controls">
            <ThemeToggle />
            {isAuthenticated && (
              <>
                <button 
                  className="preferences-button"
                  onClick={() => setShowPreferences(true)}
                  title="User Preferences"
                >
                  ⚙️
                </button>
                <button
                  className="logout-button"
                  onClick={handleLogout}
                  title="Logout"
                >
                  Logout
                </button>
              </>
            )}
          </div>
        </div>
        <nav className="main-nav">
          <button 
            className={`nav-button ${currentPage === 'home' ? 'active' : ''}`}
            onClick={() => handlePageChange('home')}
          >
            Home
          </button>
          {isAuthenticated && (
            <>
              <button 
                className={`nav-button ${currentPage === 'browser' ? 'active' : ''}`}
                onClick={() => handlePageChange('browser')}
              >
                Browse
              </button>
              <button 
                className={`nav-button ${currentPage === 'duplicates' ? 'active' : ''}`}
                onClick={() => handlePageChange('duplicates')}
              >
                Duplicates
              </button>
              <button 
                className={`nav-button ${currentPage === 'multi-folder' ? 'active' : ''}`}
                onClick={() => handlePageChange('multi-folder')}
              >
                Multi-Compare
              </button>
            </>
          )}
          <button 
            className={`nav-button ${currentPage === 'ai-test-runner' ? 'active' : ''}`}
            onClick={() => handlePageChange('ai-test-runner')}
          >
            AI Test Runner
          </button>
        </nav>
        <main className="main-content">
        {renderContent()}
        {error && <p className="error">{error}</p>}
        {notification && (
          <div className="notification">
            {notification}
          </div>
        )}
        </main>
      </header>
      
      <Footer onPageChange={handlePageChange} />
      
      <UserPreferences 
        isOpen={showPreferences}
        onClose={() => setShowPreferences(false)}
      />

      <AnalyticsConsent />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;

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
import bffApi from './services/bffApi';
import logo from './logo.svg';
import './App.css';
import './styles/themes.css';
import { idbSet, idbGet, idbSetCache, idbGetCache, idbRemove } from './utils/idbState';
import { msalIdbCachePlugin } from './utils/msalIdbCache';

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
    cacheLocation: 'custom',
    storeAuthStateInCookie: false,
    cachePlugin: msalIdbCachePlugin,
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
  const [helloMessage, setHelloMessage] = useState('');
  const [aiDetectionResults, setAiDetectionResults] = useState([]);
  const [aiDetectionLoading, setAiDetectionLoading] = useState(false);
  const [aiDetectionError, setAiDetectionError] = useState(null);
  
  const { userPreferences } = useTheme();

  const FOLDER_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  const fetchFiles = useCallback(async (folderId = null) => {
    setError(null);
    const cacheKey = `folder_${folderId || 'root'}`;
    try {
      // Try cache first
      const cached = await idbGetCache(cacheKey);
      if (cached) {
        setFiles(cached);
        return;
      }
      const account = msalInstance.getActiveAccount();
      if (!account) {
        throw new Error('No active account. Please login to continue.');
      }
      const tokenResponse = await msalInstance.acquireTokenSilent({
        scopes: ['Files.Read', 'Files.ReadWrite', 'User.Read', 'offline_access'],
        account: account,
      });
      const data = await bffApi.getFiles(tokenResponse.accessToken, folderId);
      setFiles(data.files);
      await idbSetCache(cacheKey, data.files, FOLDER_CACHE_TTL);
    } catch (error) {
      console.error('Error fetching files via BFF:', error);
      if (error.name === 'InteractionRequiredAuthError') {
        setError('Your session has expired. Please login again.');
        handleLogout();
      } else {
        setError(`Failed to fetch files: ${error.message}`);
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

  useEffect(() => {
    // Restore session from MSAL IndexedDB cache on refresh
    const accounts = msalInstance.getAllAccounts();
    if (accounts && accounts.length > 0) {
      msalInstance.setActiveAccount(accounts[0]);
      setIsAuthenticated(true);
    }
  }, []);

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
    setError(null);
    try {
      const account = msalInstance.getActiveAccount();
      if (!account) {
        throw new Error('No active account. Please login to continue.');
      }

      const tokenResponse = await msalInstance.acquireTokenSilent({
        scopes: ['Files.Read', 'Files.ReadWrite', 'User.Read', 'offline_access'],
        account: account,
      });

      const fileIdsToDelete = filesToDelete.map(file => file.id);
      
      if (onProgress) {
        onProgress(0, fileIdsToDelete.length, 'Starting deletion...');
      }

      const result = await bffApi.deleteFiles(tokenResponse.accessToken, fileIdsToDelete);

      if (!result.success) {
        throw new Error(`Failed to delete ${result.results.filter(r => !r.success).length} files.`);
      }

      if (onProgress) {
        onProgress(result.deletedCount, fileIdsToDelete.length, 'Deletion complete.');
      }
      
      // Invalidate deleted files from all folder caches
      const allCacheKeys = await idbGetAllFolderCacheKeys();
      for (const cacheKey of allCacheKeys) {
        const cached = await idbGetCache(cacheKey);
        if (cached) {
          const filtered = cached.filter(f => !fileIdsToDelete.includes(f.id));
          await idbSetCache(cacheKey, filtered, FOLDER_CACHE_TTL);
        }
      }
      // Refresh the file list
      await fetchFiles();
      
      return result;
    } catch (error) {
      console.error('Error deleting files via BFF:', error);
      setError(`Failed to delete files: ${error.message}`);
      throw error;
    }
  };

  // Helper to get all folder cache keys
  async function idbGetAllFolderCacheKeys() {
    const db = await (await window.indexedDB.open('ODDupAppState', 1)).result;
    return new Promise((resolve, reject) => {
      const tx = db.transaction('state', 'readonly');
      const store = tx.objectStore('state');
      const keysReq = store.getAllKeys();
      keysReq.onsuccess = () => {
        const folderKeys = keysReq.result.filter(k => typeof k === 'string' && k.startsWith('folder_'));
        resolve(folderKeys);
      };
      keysReq.onerror = () => reject(keysReq.error);
    });
  }

  const fetchFolderFiles = async (folderId) => {
    setError(null);
    const cacheKey = `folder_${folderId || 'root'}`;
    try {
      // Try cache first
      const cached = await idbGetCache(cacheKey);
      if (cached) return cached;
      const account = msalInstance.getActiveAccount();
      if (!account) {
        throw new Error('No active account. Please login to continue.');
      }
      const tokenResponse = await msalInstance.acquireTokenSilent({
        scopes: ['Files.Read', 'Files.ReadWrite', 'User.Read', 'offline_access'],
        account: account,
      });
      const data = await bffApi.getFiles(tokenResponse.accessToken, folderId === 'root' ? null : folderId);
      await idbSetCache(cacheKey, data.files, FOLDER_CACHE_TTL);
      return data.files;
    } catch (error) {
      console.error('Error fetching folder files via BFF:', error);
      setError(`Failed to fetch folder files: ${error.message}`);
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

  const callHelloApi = async () => {
    try {
      setHelloMessage('Loading...');
      const data = await bffApi.getHello();
      setHelloMessage(data.message || 'No message');
    } catch (err) {
      console.error('Error calling BFF API:', err);
      setHelloMessage('Error contacting backend: ' + err.message);
    }
  };

  const checkHealth = async () => {
    try {
      setHelloMessage('Checking health...');
      const data = await bffApi.getHealth();
      setHelloMessage(`Health: ${data.status} (Uptime: ${Math.round(data.uptime)}s) - Services: ${JSON.stringify(data.services)}`);
    } catch (err) {
      console.error('Error checking health:', err);
      setHelloMessage('Health check failed: ' + err.message);
    }
  };

  const testUserInfo = async () => {
    try {
      setHelloMessage('Testing user info...');
      const account = msalInstance.getActiveAccount();
      if (!account) {
        setHelloMessage('No active account. Please login first.');
        return;
      }

      const tokenResponse = await msalInstance.acquireTokenSilent({
        scopes: ['Files.Read', 'Files.ReadWrite', 'User.Read', 'offline_access'],
        account: account
      });

      const userInfo = await bffApi.getUserInfo(tokenResponse.accessToken);
      setHelloMessage(`User: ${userInfo.displayName} (${userInfo.mail})`);
    } catch (err) {
      console.error('Error testing user info:', err);
      setHelloMessage('User info test failed: ' + err.message);
    }
  };

  const testFiles = async () => {
    try {
      setHelloMessage('Testing files endpoint...');
      const account = msalInstance.getActiveAccount();
      if (!account) {
        setHelloMessage('No active account. Please login first.');
        return;
      }

      const tokenResponse = await msalInstance.acquireTokenSilent({
        scopes: ['Files.Read', 'Files.ReadWrite', 'User.Read', 'offline_access'],
        account: account
      });

      const filesData = await bffApi.getFiles(tokenResponse.accessToken);
      setHelloMessage(`Files: ${filesData.totalCount} items found`);
    } catch (err) {
      console.error('Error testing files:', err);
      setHelloMessage('Files test failed: ' + err.message);
    }
  };

  const testDuplicateDetection = async () => {
    try {
      setHelloMessage('Testing duplicate detection...');
      const account = msalInstance.getActiveAccount();
      if (!account) {
        setHelloMessage('No active account. Please login first.');
        return;
      }

      const tokenResponse = await msalInstance.acquireTokenSilent({
        scopes: ['Files.Read', 'Files.ReadWrite', 'User.Read', 'offline_access'],
        account: account
      });

      // Test with mock files
      const mockFiles = [
        { id: '1', name: 'test1.txt', size: 100 },
        { id: '2', name: 'test2.txt', size: 100 },
        { id: '3', name: 'unique.txt', size: 200 }
      ];

      const results = await bffApi.detectDuplicates(tokenResponse.accessToken, mockFiles, 'size');
      setHelloMessage(`Duplicates: ${results.duplicates.length} groups found (${results.processedFiles} files processed)`);
    } catch (err) {
      console.error('Error testing duplicate detection:', err);
      setHelloMessage('Duplicate detection test failed: ' + err.message);
    }
  };

  const testDuplicateDetectionMock = async () => {
    try {
      setHelloMessage('Testing duplicate detection with mock token...');
      
      // Test with mock files and mock token
      const mockFiles = [
        { id: '1', name: 'test1.txt', size: 100 },
        { id: '2', name: 'test2.txt', size: 100 },
        { id: '3', name: 'unique.txt', size: 200 }
      ];

      const results = await bffApi.detectDuplicates('mock-token', mockFiles, 'size');
      setHelloMessage(`Duplicates: ${results.duplicates.length} groups found (${results.processedFiles} files processed)`);
    } catch (err) {
      console.error('Error testing duplicate detection with mock:', err);
      setHelloMessage('Mock duplicate detection test failed: ' + err.message);
    }
  };

  const runAIDetection = async () => {
    setAiDetectionLoading(true);
    setAiDetectionError(null);
    setAiDetectionResults([]);
    try {
      const account = msalInstance.getActiveAccount();
      if (!account) throw new Error('No active account. Please login first.');
      const tokenResponse = await msalInstance.acquireTokenSilent({
        scopes: ['Files.Read', 'Files.ReadWrite', 'User.Read', 'offline_access'],
        account: account
      });
      // Use current files in view (or fetch root if empty)
      let filesToScan = files;
      if (!filesToScan || filesToScan.length === 0) {
        const data = await bffApi.getFiles(tokenResponse.accessToken);
        filesToScan = data.files;
      }
      const { results } = await bffApi.aiDetectDuplicates(tokenResponse.accessToken, filesToScan);
      setAiDetectionResults(results);
    } catch (err) {
      setAiDetectionError(err.message);
    } finally {
      setAiDetectionLoading(false);
    }
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
            <button className="ai-scan-btn" onClick={runAIDetection} disabled={aiDetectionLoading}>
              {aiDetectionLoading ? 'Scanning...' : 'Run AI Detection'}
            </button>
            {aiDetectionError && <div className="error" style={{marginTop:8}}>{aiDetectionError}</div>}
            {aiDetectionResults.length > 0 && (
              <div className="ai-results" style={{marginTop:16}}>
                <h4>AI Detected Duplicate Groups</h4>
                {aiDetectionResults.map((group, idx) => (
                  <div key={idx} style={{border:'1px solid #ccc', borderRadius:6, margin:'8px 0', padding:8}}>
                    <div><b>Type:</b> {group.type} <b>Confidence:</b> {Math.round(group.confidence*100)}% <b>Reason:</b> {group.reason}</div>
                    <ul style={{margin:'4px 0 0 0', paddingLeft:16}}>
                      {group.files.map(f => (
                        <li key={f.id}>{f.name} <span style={{color:'#888'}}>({f.size} bytes)</span></li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
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
        <div style={{ margin: '1rem 0', padding: '1rem', background: '#f8f9fa', borderRadius: 8 }}>
          <h4 style={{ margin: '0 0 1rem 0', color: '#333' }}>BFF Backend Testing</h4>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button onClick={callHelloApi} style={{ padding: '0.5rem 1rem', fontWeight: 600, borderRadius: 4, border: '1px solid #0078d4', background: '#0078d4', color: 'white', cursor: 'pointer' }}>
              Test Hello API
            </button>
            <button onClick={checkHealth} style={{ padding: '0.5rem 1rem', fontWeight: 600, borderRadius: 4, border: '1px solid #28a745', background: '#28a745', color: 'white', cursor: 'pointer' }}>
              Check Health
            </button>
            <button onClick={testUserInfo} style={{ padding: '0.5rem 1rem', fontWeight: 600, borderRadius: 4, border: '1px solid #28a745', background: '#28a745', color: 'white', cursor: 'pointer' }}>
              Test User Info
            </button>
            <button onClick={testFiles} style={{ padding: '0.5rem 1rem', fontWeight: 600, borderRadius: 4, border: '1px solid #28a745', background: '#28a745', color: 'white', cursor: 'pointer' }}>
              Test Files
            </button>
            <button onClick={testDuplicateDetection} style={{ padding: '0.5rem 1rem', fontWeight: 600, borderRadius: 4, border: '1px solid #28a745', background: '#28a745', color: 'white', cursor: 'pointer' }}>
              Test Duplicate Detection
            </button>
            <button onClick={testDuplicateDetectionMock} style={{ padding: '0.5rem 1rem', fontWeight: 600, borderRadius: 4, border: '1px solid #ffc107', background: '#ffc107', color: 'black', cursor: 'pointer' }}>
              Test Duplicates (Mock)
            </button>
          </div>
          {helloMessage && (
            <div style={{ marginTop: 8, color: '#1976d2', fontWeight: 500 }}>{helloMessage}</div>
          )}
        </div>
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

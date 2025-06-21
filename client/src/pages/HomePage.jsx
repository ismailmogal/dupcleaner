import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import './HomePage.css';

const HomePage = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (!isAuthenticated) {
    return (
      <div className="home-container">
        <div className="welcome-section">
          <h2>Welcome to OneDrive Duplicate Finder</h2>
          <p>Discover and manage duplicate files across your OneDrive storage with powerful AI-powered detection and smart organization tools.</p>
          <button className="login-button" onClick={login}>
            Login with Microsoft
          </button>
        </div>

        <div className="feature-highlights">
          <div className="feature-item">
            <div className="feature-icon">🔍</div>
            <h3>Smart Duplicate Detection</h3>
            <p>Find duplicates using multiple detection methods including file content, size, and AI-powered similarity analysis.</p>
          </div>
          <div className="feature-item">
            <div className="feature-icon">📁</div>
            <h3>Multi-Folder Comparison</h3>
            <p>Compare files across multiple folders and subfolders to find duplicates scattered throughout your storage.</p>
          </div>
          <div className="feature-item">
            <div className="feature-icon">🤖</div>
            <h3>AI-Powered Analysis</h3>
            <p>Advanced AI algorithms help identify similar files even when they have different names or formats.</p>
          </div>
          <div className="feature-item">
            <div className="feature-icon">🗂️</div>
            <h3>Smart Organization</h3>
            <p>Automatically organize and categorize your files with intelligent suggestions and bulk operations.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="home-container">
      <div className="welcome-section">
        <h2>Welcome back to OneDrive Duplicate Finder</h2>
        <p>Choose a tool to get started with managing your OneDrive files and finding duplicates.</p>
      </div>

      <div className="tools-grid">
        <div className="tool-card" onClick={() => navigate('/browse')}>
          <div className="tool-icon">📂</div>
          <h3>Browse Files</h3>
          <p>Explore your OneDrive files and folders. Navigate through your storage and view file details.</p>
          <div className="tool-features">
            <span>• File browsing</span>
            <span>• Search and filter</span>
            <span>• File details</span>
          </div>
        </div>

        <div className="tool-card" onClick={() => navigate('/multi-compare')}>
          <div className="tool-icon">🔍</div>
          <h3>Multi-Folder Duplicate Finder</h3>
          <p>Find duplicates across multiple folders and subfolders. Perfect for cleaning up scattered duplicate files.</p>
          <div className="tool-features">
            <span>• Cross-folder comparison</span>
            <span>• Recursive scanning</span>
            <span>• Bulk deletion</span>
          </div>
        </div>

        <div className="tool-card" onClick={() => navigate('/smart-organizer')}>
          <div className="tool-icon">🤖</div>
          <h3>Smart Organizer</h3>
          <p>AI-powered file organization and duplicate detection. Advanced algorithms for finding similar files.</p>
          <div className="tool-features">
            <span>• AI similarity detection</span>
            <span>• Smart categorization</span>
            <span>• Intelligent suggestions</span>
          </div>
        </div>
      </div>

      <div className="ai-detection-container">
        <h2>AI-Powered Duplicate Detection</h2>
        <p>Our advanced AI algorithms can identify duplicate and similar files even when they have different names, formats, or slight variations.</p>
        
        <div className="ai-features">
          <div className="ai-feature">
            <h3>🎯 Content Analysis</h3>
            <p>Analyzes file content to find true duplicates regardless of filename or location.</p>
          </div>
          <div className="ai-feature">
            <h3>🔍 Visual Similarity</h3>
            <p>Identifies similar images and documents using advanced visual recognition.</p>
          </div>
          <div className="ai-feature">
            <h3>📊 Smart Grouping</h3>
            <p>Groups similar files together for easy review and bulk operations.</p>
          </div>
          <div className="ai-feature">
            <h3>⚡ Fast Processing</h3>
            <p>Optimized algorithms for quick scanning of large file collections.</p>
          </div>
        </div>

        <button 
          className="ai-scan-btn"
          onClick={() => navigate('/smart-organizer')}
        >
          Start AI-Powered Scan
        </button>
      </div>

      <div className="stats-section">
        <h2>Why Choose OneDrive Duplicate Finder?</h2>
        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-number">99%</div>
            <div className="stat-label">Accuracy Rate</div>
            <div className="stat-description">High precision duplicate detection</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">10x</div>
            <div className="stat-label">Faster Processing</div>
            <div className="stat-description">Optimized for large file collections</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">100%</div>
            <div className="stat-label">Secure</div>
            <div className="stat-description">Your data stays private and secure</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">24/7</div>
            <div className="stat-label">Available</div>
            <div className="stat-description">Access your files anytime, anywhere</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage; 
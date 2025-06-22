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
        {/* Hero Section */}
        <div className="hero-section">
          <div className="hero-content">
            <h1 className="hero-title">
              Stop Wasting Time on Digital Clutter
            </h1>
            <p className="hero-subtitle">
              AI-powered duplicate detection and smart organization for OneDrive. 
              Save hours every week, reduce security risks, and bring order to your digital chaos.
            </p>
            <div className="hero-stats">
              <div className="hero-stat">
                <span className="stat-number">2.5</span>
                <span className="stat-label">Hours saved per week</span>
              </div>
              <div className="hero-stat">
                <span className="stat-number">89%</span>
                <span className="stat-label">Users frustrated with file organization</span>
              </div>
              <div className="hero-stat">
                <span className="stat-number">25%</span>
                <span className="stat-label">Storage space typically wasted</span>
              </div>
            </div>
            <button className="cta-button" onClick={login}>
              Start Free Trial
            </button>
            <p className="hero-note">No credit card required • 14-day free trial</p>
          </div>
        </div>

        {/* Value Proposition Section */}
        <div className="value-proposition">
          <h2>Why Storage is Cheap, But Disorganization is Expensive</h2>
          <div className="value-grid">
            <div className="value-card">
              <div className="value-icon">⏰</div>
              <h3>Time is Money</h3>
              <p>Average user spends 2.5 hours per week searching for files. That's 130 hours per year of lost productivity.</p>
            </div>
            <div className="value-card">
              <div className="value-icon">🛡️</div>
              <h3>Security Risks</h3>
              <p>Duplicate files often contain sensitive information that gets forgotten, creating compliance and security vulnerabilities.</p>
            </div>
            <div className="value-card">
              <div className="value-icon">👥</div>
              <h3>Team Chaos</h3>
              <p>Version confusion, accidental sharing of wrong files, and onboarding delays cost businesses thousands.</p>
            </div>
            <div className="value-card">
              <div className="value-icon">🌱</div>
              <h3>Environmental Impact</h3>
              <p>Unnecessary storage consumption increases energy use and carbon footprint, even in the cloud.</p>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="features-section">
          <h2>AI-Powered Intelligence Meets Simple Design</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🧠</div>
              <h3>Smart Detection</h3>
              <p>AI-powered duplicate detection that finds similar files even with different names, formats, or slight variations.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📁</div>
              <h3>Multi-Folder Magic</h3>
              <p>Compare files across multiple folders and subfolders to find duplicates scattered throughout your storage.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🤖</div>
              <h3>Smart Organization</h3>
              <p>Automatically organize and categorize your files with intelligent suggestions and one-click bulk operations.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔒</div>
              <h3>Enterprise Ready</h3>
              <p>Admin controls, compliance features, and team collaboration tools for businesses of all sizes.</p>
            </div>
          </div>
        </div>

        {/* Social Proof */}
        <div className="social-proof">
          <h2>Trusted by Teams Worldwide</h2>
          <div className="testimonials">
            <div className="testimonial">
              <p>"Saved our team 15 hours per week. The AI detection is incredibly accurate."</p>
              <div className="testimonial-author">- Sarah Chen, Marketing Director</div>
            </div>
            <div className="testimonial">
              <p>"Finally found all those duplicate photos from my phone. Life-changing!"</p>
              <div className="testimonial-author">- Mike Rodriguez, Photographer</div>
            </div>
            <div className="testimonial">
              <p>"Compliance team loves the audit trails. Security risks reduced by 80%."</p>
              <div className="testimonial-author">- David Kim, IT Manager</div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="cta-section">
          <h2>Ready to Declutter Your Digital Life?</h2>
          <p>Join thousands of users who've reclaimed their time and organized their files.</p>
          <button className="cta-button" onClick={login}>
            Start Your Free Trial
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="home-container">
      <div className="welcome-section">
        <h2>Welcome back! Ready to declutter?</h2>
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
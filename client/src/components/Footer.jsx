import React from 'react';
import './Footer.css';

function Footer({ onPageChange }) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-section">
          <h4>OneDrive Duplicate Finder</h4>
          <p>The world's first AI-powered team duplicate manager for OneDrive</p>
        </div>
        
        <div className="footer-section">
          <h4>Features</h4>
          <ul>
            <li>🤖 AI-Powered Detection</li>
            <li>👥 Team Collaboration</li>
            <li>🧠 Smart Organization</li>
            <li>📁 Multi-Folder Compare</li>
          </ul>
        </div>
        
        <div className="footer-section">
          <h4>Support</h4>
          <ul>
            <li>
              <button 
                className="footer-link"
                onClick={() => onPageChange('terms')}
              >
                Terms of Service
              </button>
            </li>
            <li>
              <button 
                className="footer-link"
                onClick={() => onPageChange('privacy')}
              >
                Privacy Policy
              </button>
            </li>
            <li>
              <a 
                href="mailto:support@onedriveduplicatefinder.com" 
                className="footer-link"
              >
                Contact Support
              </a>
            </li>
          </ul>
        </div>
        
        <div className="footer-section">
          <h4>Connect</h4>
          <div className="social-links">
            <a 
              href="https://github.com/your-repo" 
              target="_blank" 
              rel="noopener noreferrer"
              className="social-link"
              title="GitHub"
            >
              📦
            </a>
            <a 
              href="https://twitter.com/your-handle" 
              target="_blank" 
              rel="noopener noreferrer"
              className="social-link"
              title="Twitter"
            >
              🐦
            </a>
            <a 
              href="https://linkedin.com/company/your-company" 
              target="_blank" 
              rel="noopener noreferrer"
              className="social-link"
              title="LinkedIn"
            >
              💼
            </a>
          </div>
        </div>
      </div>
      
      <div className="footer-bottom">
        <div className="footer-bottom-content">
          <p>&copy; {currentYear} OneDrive Duplicate Finder. All rights reserved.</p>
          <div className="footer-bottom-links">
            <button 
              className="footer-link small"
              onClick={() => onPageChange('terms')}
            >
              Terms
            </button>
            <span className="separator">•</span>
            <button 
              className="footer-link small"
              onClick={() => onPageChange('privacy')}
            >
              Privacy
            </button>
            <span className="separator">•</span>
            <a 
              href="mailto:support@onedriveduplicatefinder.com" 
              className="footer-link small"
            >
              Support
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer; 
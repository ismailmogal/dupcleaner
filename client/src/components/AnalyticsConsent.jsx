import React, { useState, useEffect } from 'react';
import { analytics } from './Analytics';
import './AnalyticsConsent.css';

const AnalyticsConsent = () => {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('analytics_consent');
    if (consent === null) {
      setShowBanner(true);
    } else {
      analytics.setConsent(consent === 'true');
    }
  }, []);

  const handleConsent = (consent) => {
    analytics.setConsent(consent);
    localStorage.setItem('analytics_consent', consent.toString());
    setShowBanner(false);
    
    // Track consent decision
    analytics.trackEvent('analytics_consent', { 
      decision: consent ? 'accepted' : 'declined' 
    });
  };

  if (!showBanner) return null;

  return (
    <div className="analytics-consent-banner">
      <div className="consent-content">
        <div className="consent-text">
          <h4>🍪 We value your privacy</h4>
          <p>
            We use analytics to improve your experience and fix issues. 
            Your data is never shared with third parties and is only used to make the app better.
          </p>
        </div>
        <div className="consent-buttons">
          <button 
            className="consent-btn accept"
            onClick={() => handleConsent(true)}
          >
            Accept
          </button>
          <button 
            className="consent-btn decline"
            onClick={() => handleConsent(false)}
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsConsent; 
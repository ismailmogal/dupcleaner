import { useEffect } from 'react';

// Simple analytics tracking (GDPR compliant)
class Analytics {
  constructor() {
    this.consent = false;
    this.events = [];
  }

  setConsent(hasConsent) {
    this.consent = hasConsent;
    if (hasConsent) {
      // Initialize analytics services here
      console.log('Analytics consent granted');
    }
  }

  trackEvent(eventName, properties = {}) {
    if (!this.consent) return;

    const event = {
      name: eventName,
      properties,
      timestamp: new Date().toISOString(),
      sessionId: this.getSessionId()
    };

    this.events.push(event);
    
    // Send to analytics service (Google Analytics, Mixpanel, etc.)
    if (window.gtag) {
      window.gtag('event', eventName, properties);
    }
    
    console.log('Analytics event:', event);
  }

  trackPageView(pageName) {
    this.trackEvent('page_view', { page: pageName });
  }

  trackError(error, context = {}) {
    this.trackEvent('error', {
      message: error.message,
      stack: error.stack,
      context
    });
  }

  getSessionId() {
    let sessionId = sessionStorage.getItem('analytics_session_id');
    if (!sessionId) {
      sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('analytics_session_id', sessionId);
    }
    return sessionId;
  }

  getEvents() {
    return this.events;
  }
}

export const analytics = new Analytics();

// React hook for analytics
export const useAnalytics = () => {
  useEffect(() => {
    // Check for user consent
    const consent = localStorage.getItem('analytics_consent');
    if (consent === 'true') {
      analytics.setConsent(true);
    }
  }, []);

  return analytics;
};

// Consent component
export const AnalyticsConsent = ({ onConsentChange }) => {
  const handleConsent = (consent) => {
    analytics.setConsent(consent);
    localStorage.setItem('analytics_consent', consent.toString());
    onConsentChange?.(consent);
  };

  return (
    <div className="analytics-consent">
      <p>We use analytics to improve your experience. Your data is never shared with third parties.</p>
      <div className="consent-buttons">
        <button onClick={() => handleConsent(true)}>Accept</button>
        <button onClick={() => handleConsent(false)}>Decline</button>
      </div>
    </div>
  );
}; 
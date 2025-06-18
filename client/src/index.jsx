import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { analytics } from './components/Analytics';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ErrorBoundary>
    <App />
    </ErrorBoundary>
  </React.StrictMode>
);

// Track app initialization
analytics.trackEvent('app_initialized', {
  version: '1.0.0',
  environment: import.meta.env.MODE
});

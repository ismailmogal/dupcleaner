import React, { useState, useEffect } from 'react';
import { aiTestSuite } from '../utils/aiTestSuite';
import './AITestRunner.css';

const AITestRunner = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [currentTest, setCurrentTest] = useState('');
  const [progress, setProgress] = useState(0);

  const testNames = [
    'Visual Similarity Detection',
    'Content Analysis',
    'Video Comparison',
    'Confidence Scoring',
    'Performance Metrics',
    'Edge Cases'
  ];

  const runTests = async () => {
    setIsRunning(true);
    setTestResults(null);
    setProgress(0);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      // Update current test
      testNames.forEach((testName, index) => {
        setTimeout(() => {
          setCurrentTest(testName);
        }, index * 1000);
      });

      const results = await aiTestSuite.runAllTests();
      
      clearInterval(progressInterval);
      setProgress(100);
      setTestResults(results);
      
      // Track analytics
      if (window.analytics) {
        window.analytics.track('ai_tests_completed', {
          successRate: results.summary.successRate,
          averagePrecision: results.summary.averagePrecision,
          averageRecall: results.summary.averageRecall
        });
      }

    } catch (error) {
      console.error('Test execution failed:', error);
      setTestResults({
        error: error.message,
        summary: { successRate: 0 }
      });
    } finally {
      setIsRunning(false);
      setCurrentTest('');
    }
  };

  const getStatusIcon = (status) => {
    return status === 'PASSED' ? '✅' : '❌';
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return 'high';
    if (confidence >= 0.6) return 'medium';
    return 'low';
  };

  const getPerformanceColor = (time) => {
    if (time < 1000) return 'excellent';
    if (time < 3000) return 'good';
    if (time < 5000) return 'acceptable';
    return 'poor';
  };

  return (
    <div className="ai-test-runner">
      <div className="test-header">
        <h2>🤖 AI Feature Validation Tests</h2>
        <p>Comprehensive testing of AI-powered duplicate detection algorithms</p>
      </div>

      {!isRunning && !testResults && (
        <div className="test-setup">
          <div className="test-info">
            <h3>Test Coverage</h3>
            <ul>
              <li>🖼️ Visual Similarity Detection (Images)</li>
              <li>📄 Content Analysis (Documents)</li>
              <li>🎥 Video Comparison (Videos)</li>
              <li>🎯 Confidence Scoring Validation</li>
              <li>⚡ Performance Metrics</li>
              <li>🔍 Edge Cases & Error Handling</li>
            </ul>
          </div>
          
          <button 
            className="run-tests-btn"
            onClick={runTests}
          >
            🚀 Run AI Tests
          </button>
        </div>
      )}

      {isRunning && (
        <div className="test-progress">
          <div className="progress-header">
            <h3>Running AI Tests...</h3>
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="progress-text">{progress}% Complete</p>
          </div>
          
          {currentTest && (
            <div className="current-test">
              <span className="test-icon">🔄</span>
              <span className="test-name">{currentTest}</span>
            </div>
          )}
        </div>
      )}

      {testResults && !isRunning && (
        <div className="test-results">
          {testResults.error ? (
            <div className="error-message">
              <h3>❌ Test Execution Failed</h3>
              <p>{testResults.error}</p>
              <button className="retry-btn" onClick={runTests}>
                🔄 Retry Tests
              </button>
            </div>
          ) : (
            <>
              <div className="results-summary">
                <h3>📊 Test Results Summary</h3>
                <div className="summary-grid">
                  <div className="summary-card">
                    <div className="summary-value">{testResults.summary.successRate.toFixed(1)}%</div>
                    <div className="summary-label">Success Rate</div>
                  </div>
                  <div className="summary-card">
                    <div className="summary-value">{testResults.summary.averagePrecision.toFixed(1)}%</div>
                    <div className="summary-label">Avg Precision</div>
                  </div>
                  <div className="summary-card">
                    <div className="summary-value">{testResults.summary.averageRecall.toFixed(1)}%</div>
                    <div className="summary-label">Avg Recall</div>
                  </div>
                  <div className="summary-card">
                    <div className="summary-value">{testResults.summary.averageF1Score.toFixed(1)}%</div>
                    <div className="summary-label">Avg F1 Score</div>
                  </div>
                </div>
              </div>

              <div className="detailed-results">
                <h3>📋 Detailed Test Results</h3>
                <div className="results-list">
                  {testResults.results.map((result, index) => (
                    <div key={index} className={`result-item ${result.status.toLowerCase()}`}>
                      <div className="result-header">
                        <span className="result-status">{getStatusIcon(result.status)}</span>
                        <span className="result-name">{result.testName}</span>
                        <span className="result-time">{new Date(result.timestamp).toLocaleTimeString()}</span>
                      </div>
                      
                      {result.precision !== undefined && (
                        <div className="result-metrics">
                          <div className="metric">
                            <span className="metric-label">Precision:</span>
                            <span className={`metric-value ${getConfidenceColor(result.precision)}`}>
                              {(result.precision * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="metric">
                            <span className="metric-label">Recall:</span>
                            <span className={`metric-value ${getConfidenceColor(result.recall)}`}>
                              {(result.recall * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="metric">
                            <span className="metric-label">F1 Score:</span>
                            <span className={`metric-value ${getConfidenceColor(result.f1Score)}`}>
                              {(result.f1Score * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {result.processingTimeMs !== undefined && (
                        <div className="result-metrics">
                          <div className="metric">
                            <span className="metric-label">Processing Time:</span>
                            <span className={`metric-value ${getPerformanceColor(result.processingTimeMs)}`}>
                              {result.processingTimeMs.toFixed(0)}ms
                            </span>
                          </div>
                          <div className="metric">
                            <span className="metric-label">Files/Second:</span>
                            <span className="metric-value">
                              {result.filesPerSecond.toFixed(1)}
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {result.passedTests !== undefined && (
                        <div className="result-metrics">
                          <div className="metric">
                            <span className="metric-label">Tests Passed:</span>
                            <span className="metric-value">
                              {result.passedTests}/{result.totalTests}
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {result.error && (
                        <div className="result-error">
                          <span className="error-text">Error: {result.error}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="test-actions">
                <button className="retry-btn" onClick={runTests}>
                  🔄 Run Tests Again
                </button>
                <button 
                  className="export-btn"
                  onClick={() => {
                    const dataStr = JSON.stringify(testResults, null, 2);
                    const dataBlob = new Blob([dataStr], { type: 'application/json' });
                    const url = URL.createObjectURL(dataBlob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `ai-test-results-${new Date().toISOString().split('T')[0]}.json`;
                    link.click();
                  }}
                >
                  📥 Export Results
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AITestRunner; 
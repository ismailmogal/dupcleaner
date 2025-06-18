import React, { useState, useEffect } from 'react';
import './SmartOrganizer.css';

const SmartOrganizer = ({ files, onOrganize }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [fileInsights, setFileInsights] = useState({});
  const [organizationPlan, setOrganizationPlan] = useState(null);

  useEffect(() => {
    if (files.length > 0) {
      analyzeFiles();
    }
  }, [files]);

  const analyzeFiles = () => {
    const insights = {
      totalFiles: files.length,
      totalSize: files.reduce((sum, file) => sum + file.size, 0),
      fileTypes: {},
      oldFiles: [],
      largeFiles: [],
      potentialDuplicates: [],
      unusedFiles: [],
      organizationSuggestions: []
    };

    // Analyze file types and sizes
    files.forEach(file => {
      const ext = getFileExtension(file.name);
      if (!insights.fileTypes[ext]) {
        insights.fileTypes[ext] = { count: 0, totalSize: 0 };
      }
      insights.fileTypes[ext].count++;
      insights.fileTypes[ext].totalSize += file.size;

      // Identify old files (older than 1 year)
      const fileDate = new Date(file.lastModifiedDateTime);
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      
      if (fileDate < oneYearAgo) {
        insights.oldFiles.push(file);
      }

      // Identify large files (>100MB)
      if (file.size > 100 * 1024 * 1024) {
        insights.largeFiles.push(file);
      }
    });

    // Generate organization recommendations
    generateRecommendations(insights);
    
    setFileInsights(insights);
  };

  const generateRecommendations = (insights) => {
    const recs = [];

    // Storage optimization recommendations
    if (insights.oldFiles.length > 10) {
      recs.push({
        type: 'storage_optimization',
        title: 'Archive Old Files',
        description: `${insights.oldFiles.length} files haven't been accessed in over a year`,
        impact: 'High',
        potentialSavings: insights.oldFiles.reduce((sum, file) => sum + file.size, 0),
        action: 'archive_old_files'
      });
    }

    if (insights.largeFiles.length > 0) {
      recs.push({
        type: 'storage_optimization',
        title: 'Large File Management',
        description: `${insights.largeFiles.length} files are larger than 100MB`,
        impact: 'Medium',
        potentialSavings: insights.largeFiles.reduce((sum, file) => sum + file.size, 0),
        action: 'review_large_files'
      });
    }

    // File organization recommendations
    const topFileTypes = Object.entries(insights.fileTypes)
      .sort(([,a], [,b]) => b.count - a.count)
      .slice(0, 5);

    if (topFileTypes.length > 0) {
      recs.push({
        type: 'organization',
        title: 'Create Type-Based Folders',
        description: `Organize ${topFileTypes.length} file types into dedicated folders`,
        impact: 'Medium',
        action: 'create_type_folders',
        fileTypes: topFileTypes
      });
    }

    // Duplicate prevention recommendations
    recs.push({
      type: 'prevention',
      title: 'Set Up Auto-Duplicate Detection',
      description: 'Automatically detect duplicates as you add new files',
      impact: 'High',
      action: 'setup_auto_detection'
    });

    setRecommendations(recs);
  };

  const createOrganizationPlan = (recommendation) => {
    const plan = {
      type: recommendation.type,
      title: recommendation.title,
      steps: [],
      estimatedTime: 0,
      filesToProcess: []
    };

    switch (recommendation.action) {
      case 'archive_old_files':
        plan.steps = [
          'Create "Archive" folder',
          'Move old files to archive',
          'Compress archive folder',
          'Set up auto-archive rules'
        ];
        plan.estimatedTime = Math.ceil(fileInsights.oldFiles.length / 10); // 10 files per minute
        plan.filesToProcess = fileInsights.oldFiles;
        break;

      case 'create_type_folders':
        plan.steps = [
          'Create folder structure',
          'Move files by type',
          'Update file references',
          'Verify organization'
        ];
        plan.estimatedTime = Math.ceil(files.length / 20); // 20 files per minute
        plan.filesToProcess = files;
        break;

      case 'review_large_files':
        plan.steps = [
          'Analyze large files',
          'Identify compression opportunities',
          'Consider cloud storage for large files',
          'Create backup before compression'
        ];
        plan.estimatedTime = fileInsights.largeFiles.length * 2; // 2 minutes per large file
        plan.filesToProcess = fileInsights.largeFiles;
        break;
    }

    setOrganizationPlan(plan);
  };

  const executeOrganizationPlan = async () => {
    if (!organizationPlan) return;

    try {
      // Simulate organization process
      await onOrganize(organizationPlan);
      
      // Track successful organization
      analytics.trackEvent('file_organization_completed', {
        planType: organizationPlan.type,
        filesProcessed: organizationPlan.filesToProcess.length,
        estimatedTime: organizationPlan.estimatedTime
      });

      setOrganizationPlan(null);
    } catch (error) {
      console.error('Error executing organization plan:', error);
    }
  };

  const getFileExtension = (filename) => {
    return filename.split('.').pop().toLowerCase();
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="smart-organizer">
      <div className="organizer-header">
        <h2>🧠 Smart File Organizer</h2>
        <p>AI-powered recommendations to optimize your OneDrive storage</p>
      </div>

      <div className="file-insights">
        <h3>📊 Storage Insights</h3>
        <div className="insights-grid">
          <div className="insight-card">
            <div className="insight-value">{fileInsights.totalFiles || 0}</div>
            <div className="insight-label">Total Files</div>
          </div>
          <div className="insight-card">
            <div className="insight-value">{formatFileSize(fileInsights.totalSize || 0)}</div>
            <div className="insight-label">Total Size</div>
          </div>
          <div className="insight-card">
            <div className="insight-value">{fileInsights.oldFiles?.length || 0}</div>
            <div className="insight-label">Old Files (&gt;1 year)</div>
          </div>
          <div className="insight-card">
            <div className="insight-value">{fileInsights.largeFiles?.length || 0}</div>
            <div className="insight-label">Large Files (&gt;100MB)</div>
          </div>
        </div>
      </div>

      <div className="recommendations">
        <h3>💡 Smart Recommendations</h3>
        <div className="recommendations-list">
          {recommendations.map((rec, index) => (
            <div key={index} className="recommendation-card">
              <div className="recommendation-header">
                <h4>{rec.title}</h4>
                <span className={`impact-badge ${rec.impact}`}>
                  {rec.impact} Impact
                </span>
              </div>
              <p>{rec.description}</p>
              {rec.potentialSavings && (
                <p className="savings">
                  Potential savings: {formatFileSize(rec.potentialSavings)}
                </p>
              )}
              <button 
                className="action-btn"
                onClick={() => createOrganizationPlan(rec)}
              >
                Create Plan
              </button>
            </div>
          ))}
        </div>
      </div>

      {organizationPlan && (
        <div className="organization-plan">
          <h3>📋 Organization Plan</h3>
          <div className="plan-details">
            <h4>{organizationPlan.title}</h4>
            <div className="plan-steps">
              {organizationPlan.steps.map((step, index) => (
                <div key={index} className="plan-step">
                  <span className="step-number">{index + 1}</span>
                  <span className="step-text">{step}</span>
                </div>
              ))}
            </div>
            <div className="plan-metrics">
              <p>Files to process: {organizationPlan.filesToProcess.length}</p>
              <p>Estimated time: {organizationPlan.estimatedTime} minutes</p>
            </div>
            <div className="plan-actions">
              <button 
                className="execute-btn"
                onClick={executeOrganizationPlan}
              >
                Execute Plan
              </button>
              <button 
                className="cancel-btn"
                onClick={() => setOrganizationPlan(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartOrganizer; 
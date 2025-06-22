import React, { useState, useEffect } from 'react';
import { useFileManagement } from '../hooks/useFileManagement';
import { useAuth } from '../hooks/useAuth';
import useFeatureFlags from '../hooks/useFeatureFlags';
import FileBrowser from '../components/FileBrowser';
import LoadingSpinner from '../components/LoadingSpinner';
import './SmartOrganizerPage.css';

const SmartOrganizerPage = () => {
  const { user, isAuthenticated } = useAuth();
  const { isFeatureEnabled } = useFeatureFlags();
  const { 
    files,
    gridData, 
    folderPath, 
    loading, 
    error, 
    navigateToFolder, 
    navigateToPathByIndex 
  } = useFileManagement('root');
  
  const [organizeMode, setOrganizeMode] = useState('auto');
  const [selectedFiles, setSelectedFiles] = useState(new Set());
  const [organizing, setOrganizing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [organizationPlan, setOrganizationPlan] = useState(null);
  const [executionResults, setExecutionResults] = useState(null);
  const [currentStep, setCurrentStep] = useState('browse'); // browse, analyze, plan, execute
  const [organizationOptions, setOrganizationOptions] = useState({
    organizeByType: true,
    organizeByDate: true,
    organizeBySize: false,
    deleteDuplicates: true,
    deleteOldFiles: false,
    oldFileThreshold: 365
  });

  // Check if Smart Organizer feature is enabled
  const hasSmartOrganizer = isFeatureEnabled('SMART_ORGANIZER');

  const handleFileSelect = (file) => {
    const newSelectedFiles = new Set(selectedFiles);
    if (newSelectedFiles.has(file.id)) {
      newSelectedFiles.delete(file.id);
    } else {
      newSelectedFiles.add(file.id);
    }
    setSelectedFiles(newSelectedFiles);
  };

  const handleAnalyzeFiles = async () => {
    if (!isAuthenticated) {
      alert('Please log in to use Smart Organizer');
      return;
    }

    setOrganizing(true);
    setCurrentStep('analyze');
    
    try {
      const filesToAnalyze = selectedFiles.size > 0 
        ? files.filter(f => selectedFiles.has(f.id))
        : files;

      const response = await fetch('/api/smart-organizer/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({ files: filesToAnalyze })
      });

      if (!response.ok) {
        throw new Error('Failed to analyze files');
      }

      const data = await response.json();
      setAnalysis(data.analysis);
      setCurrentStep('plan');
    } catch (error) {
      console.error('Analysis failed:', error);
      alert(`Analysis failed: ${error.message}`);
    } finally {
      setOrganizing(false);
    }
  };

  const handleGeneratePlan = async () => {
    if (!analysis) return;

    setOrganizing(true);
    
    try {
      const filesToOrganize = selectedFiles.size > 0 
        ? files.filter(f => selectedFiles.has(f.id))
        : files;

      const response = await fetch('/api/smart-organizer/plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({ 
          files: filesToOrganize, 
          analysis, 
          options: organizationOptions 
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate organization plan');
      }

      const data = await response.json();
      setOrganizationPlan(data.plan);
      setCurrentStep('execute');
    } catch (error) {
      console.error('Plan generation failed:', error);
      alert(`Plan generation failed: ${error.message}`);
    } finally {
      setOrganizing(false);
    }
  };

  const handleExecutePlan = async () => {
    if (!organizationPlan) return;

    const confirmed = window.confirm(
      `Are you sure you want to execute this organization plan?\n\n` +
      `- ${organizationPlan.folders.length} folders will be created\n` +
      `- ${organizationPlan.moves.length} files will be moved\n` +
      `- ${organizationPlan.deletions.length} files will be deleted\n` +
      `- Estimated time: ${organizationPlan.estimatedTime} minutes\n\n` +
      `This action cannot be undone.`
    );

    if (!confirmed) return;

    setOrganizing(true);
    
    try {
      const response = await fetch('/api/smart-organizer/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({ plan: organizationPlan })
      });

      if (!response.ok) {
        throw new Error('Failed to execute organization plan');
      }

      const data = await response.json();
      setExecutionResults(data.results);
      setCurrentStep('complete');
    } catch (error) {
      console.error('Execution failed:', error);
      alert(`Execution failed: ${error.message}`);
    } finally {
      setOrganizing(false);
    }
  };

  const handleClearSelection = () => {
    setSelectedFiles(new Set());
  };

  const handleReset = () => {
    setAnalysis(null);
    setOrganizationPlan(null);
    setExecutionResults(null);
    setCurrentStep('browse');
    setSelectedFiles(new Set());
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#dc3545';
      case 'medium': return '#ffc107';
      case 'low': return '#28a745';
      default: return '#6c757d';
    }
  };
  
  if (loading) return <LoadingSpinner />;
  if (error) return <p className="error">{error}</p>;

  if (!hasSmartOrganizer) {
    return (
      <div className="smart-organizer-page">
        <div className="feature-disabled">
          <h2>Smart File Organizer</h2>
          <p>Smart File Organizer is not available in your current plan.</p>
          <button className="upgrade-button">
            Upgrade to Premium
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="smart-organizer-page">
      <div className="page-header">
        <h1>Smart File Organizer</h1>
        <p>Automatically organize your files into logical folders based on file types, dates, and content.</p>
      </div>
      
      {/* Progress Indicator */}
      <div className="progress-indicator">
        <div className={`progress-step ${currentStep === 'browse' ? 'active' : ''} ${['analyze', 'plan', 'execute', 'complete'].includes(currentStep) ? 'completed' : ''}`}>
          <span className="step-number">1</span>
          <span className="step-label">Browse Files</span>
        </div>
        <div className={`progress-step ${currentStep === 'analyze' ? 'active' : ''} ${['plan', 'execute', 'complete'].includes(currentStep) ? 'completed' : ''}`}>
          <span className="step-number">2</span>
          <span className="step-label">Analyze</span>
        </div>
        <div className={`progress-step ${currentStep === 'plan' ? 'active' : ''} ${['execute', 'complete'].includes(currentStep) ? 'completed' : ''}`}>
          <span className="step-number">3</span>
          <span className="step-label">Plan</span>
        </div>
        <div className={`progress-step ${currentStep === 'execute' ? 'active' : ''} ${['complete'].includes(currentStep) ? 'completed' : ''}`}>
          <span className="step-number">4</span>
          <span className="step-label">Execute</span>
        </div>
      </div>

      {/* Step 1: Browse and Select Files */}
      {currentStep === 'browse' && (
        <>
          <div className="organizer-panel">
            <div className="organizer-header">
              <h2>Step 1: Select Files to Organize</h2>
              <div className="organizer-actions">
                <button 
                  className="btn btn-primary"
                  onClick={handleAnalyzeFiles}
                  disabled={organizing || files.length === 0}
                >
                  {organizing ? 'Analyzing...' : 'Analyze Files'}
                </button>
                {selectedFiles.size > 0 && (
                  <button 
                    className="btn btn-secondary"
                    onClick={handleClearSelection}
                  >
                    Clear Selection
                  </button>
                )}
              </div>
            </div>
            
            <div className="selection-info">
              <p>
                {selectedFiles.size > 0 
                  ? `Selected ${selectedFiles.size} files for organization.`
                  : `All ${files.length} files in current folder will be analyzed.`
                }
              </p>
            </div>
          </div>

          <div className="browser-section">
            <div className="section-header">
              <h2>Files to Organize</h2>
              <p>Browse through your OneDrive files and select which ones to organize.</p>
            </div>
            
            <FileBrowser
              files={files}
              currentFolder={folderPath[folderPath.length - 1]}
              folderPath={folderPath}
              onFolderClick={navigateToFolder}
              onBreadcrumbClick={navigateToPathByIndex}
              onFileSelect={handleFileSelect}
              selectedFiles={selectedFiles}
              onAddToComparison={null}
              defaultViewMode="details"
              showFileSizes={true}
              showFileDates={true}
              compactMode={false}
            />
          </div>
        </>
      )}

      {/* Step 2: Analysis Results */}
      {currentStep === 'analyze' && analysis && (
        <div className="analysis-results">
          <div className="analysis-header">
            <h2>File Analysis Results</h2>
            <button className="btn btn-primary" onClick={handleGeneratePlan}>
              Generate Organization Plan
            </button>
          </div>

          <div className="analysis-grid">
            <div className="analysis-card">
              <h3>Overview</h3>
              <div className="analysis-stats">
                <div className="stat">
                  <span className="stat-value">{analysis.totalFiles}</span>
                  <span className="stat-label">Total Files</span>
                </div>
                <div className="stat">
                  <span className="stat-value">{formatFileSize(analysis.totalSize)}</span>
                  <span className="stat-label">Total Size</span>
                </div>
              </div>
            </div>

            <div className="analysis-card">
              <h3>File Types</h3>
              <div className="file-types-list">
                {Object.entries(analysis.fileTypes).map(([type, data]) => (
                  <div key={type} className="file-type-item">
                    <span className="type-name">{type}</span>
                    <span className="type-count">{data.count} files</span>
                    <span className="type-size">{formatFileSize(data.size)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="analysis-card">
              <h3>Size Distribution</h3>
              <div className="size-distribution">
                <div className="size-item">
                  <span className="size-label">Small (&lt; 1MB)</span>
                  <span className="size-count">{analysis.sizeDistribution.small}</span>
                </div>
                <div className="size-item">
                  <span className="size-label">Medium (1MB - 100MB)</span>
                  <span className="size-count">{analysis.sizeDistribution.medium}</span>
                </div>
                <div className="size-item">
                  <span className="size-label">Large (100MB - 1GB)</span>
                  <span className="size-count">{analysis.sizeDistribution.large}</span>
                </div>
                <div className="size-item">
                  <span className="size-label">Huge (&gt; 1GB)</span>
                  <span className="size-count">{analysis.sizeDistribution.huge}</span>
                </div>
              </div>
            </div>

            <div className="analysis-card">
              <h3>Recommendations</h3>
              <div className="recommendations-list">
                {analysis.recommendations.map((rec, index) => (
                  <div key={index} className="recommendation-item" style={{ borderLeftColor: getPriorityColor(rec.priority) }}>
                    <h4>{rec.title}</h4>
                    <p>{rec.description}</p>
                    <span className="priority-badge" style={{ backgroundColor: getPriorityColor(rec.priority) }}>
                      {rec.priority}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Organization Plan */}
      {currentStep === 'plan' && organizationPlan && (
        <div className="organization-plan">
          <div className="plan-header">
            <h2>Organization Plan</h2>
            <button className="btn btn-primary" onClick={handleExecutePlan}>
              Execute Plan
            </button>
          </div>

          <div className="plan-summary">
            <div className="plan-metrics">
              <div className="metric">
                <span className="metric-value">{organizationPlan.folders.length}</span>
                <span className="metric-label">Folders to Create</span>
              </div>
              <div className="metric">
                <span className="metric-value">{organizationPlan.moves.length}</span>
                <span className="metric-label">Files to Move</span>
              </div>
              <div className="metric">
                <span className="metric-value">{organizationPlan.deletions.length}</span>
                <span className="metric-label">Files to Delete</span>
              </div>
              <div className="metric">
                <span className="metric-value">{formatFileSize(organizationPlan.totalSpaceSaved)}</span>
                <span className="metric-label">Space to Save</span>
              </div>
            </div>
          </div>

          <div className="plan-details">
            <div className="plan-section">
              <h3>Folders to Create</h3>
              <div className="folders-list">
                {organizationPlan.folders.map((folder, index) => (
                  <div key={index} className="folder-item">
                    <span className="folder-name">{folder.name}</span>
                    <span className="folder-description">{folder.description}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="plan-section">
              <h3>File Moves</h3>
              <div className="moves-list">
                {organizationPlan.moves.slice(0, 10).map((move, index) => (
                  <div key={index} className="move-item">
                    <span className="file-name">{move.fileName}</span>
                    <span className="move-arrow">→</span>
                    <span className="destination">{move.destinationFolderName}</span>
                  </div>
                ))}
                {organizationPlan.moves.length > 10 && (
                  <div className="more-items">
                    ... and {organizationPlan.moves.length - 10} more files
                  </div>
                )}
              </div>
            </div>

            {organizationPlan.deletions.length > 0 && (
              <div className="plan-section">
                <h3>Files to Delete</h3>
                <div className="deletions-list">
                  {organizationPlan.deletions.slice(0, 10).map((deletion, index) => (
                    <div key={index} className="deletion-item">
                      <span className="file-name">{deletion.fileName}</span>
                      <span className="file-size">{formatFileSize(deletion.size)}</span>
                      <span className="deletion-reason">{deletion.reason}</span>
                    </div>
                  ))}
                  {organizationPlan.deletions.length > 10 && (
                    <div className="more-items">
                      ... and {organizationPlan.deletions.length - 10} more files
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 4: Execution Results */}
      {currentStep === 'complete' && executionResults && (
        <div className="execution-results">
          <div className="results-header">
            <h2>Organization Complete!</h2>
            <button className="btn btn-secondary" onClick={handleReset}>
              Start Over
            </button>
          </div>

          <div className="results-summary">
            <div className="results-metrics">
              <div className="metric">
                <span className="metric-value">{executionResults.totalProcessed}</span>
                <span className="metric-label">Files Processed</span>
              </div>
              <div className="metric">
                <span className="metric-value">{executionResults.successful.length}</span>
                <span className="metric-label">Successful Operations</span>
              </div>
              <div className="metric">
                <span className="metric-value">{executionResults.failed.length}</span>
                <span className="metric-label">Failed Operations</span>
              </div>
              <div className="metric">
                <span className="metric-value">{formatFileSize(executionResults.totalSpaceSaved)}</span>
                <span className="metric-label">Space Saved</span>
              </div>
            </div>
          </div>

          {executionResults.failed.length > 0 && (
            <div className="failed-operations">
              <h3>Failed Operations</h3>
              <div className="failed-list">
                {executionResults.failed.map((failure, index) => (
                  <div key={index} className="failed-item">
                    <span className="operation-type">{failure.type}</span>
                    <span className="operation-name">{failure.name}</span>
                    <span className="error-message">{failure.error}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SmartOrganizerPage;

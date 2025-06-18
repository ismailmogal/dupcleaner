import React, { useState, useEffect } from 'react';
import './CollaborativeManager.css';

const CollaborativeManager = ({ files, onShare, onCollaborate }) => {
  const [teamMembers, setTeamMembers] = useState([]);
  const [sharedFolders, setSharedFolders] = useState([]);
  const [collaborationRequests, setCollaborationRequests] = useState([]);
  const [teamInsights, setTeamInsights] = useState({});

  useEffect(() => {
    loadTeamData();
  }, []);

  const loadTeamData = async () => {
    // In a real implementation, this would fetch from Microsoft Graph API
    // For now, we'll simulate team data
    const mockTeamMembers = [
      { id: '1', name: 'John Doe', email: 'john@company.com', role: 'admin', avatar: '👨‍💼' },
      { id: '2', name: 'Jane Smith', email: 'jane@company.com', role: 'member', avatar: '👩‍💼' },
      { id: '3', name: 'Bob Wilson', email: 'bob@company.com', role: 'member', avatar: '👨‍💻' }
    ];

    const mockSharedFolders = [
      { id: '1', name: 'Marketing Assets', owner: 'John Doe', members: 3, files: 150, duplicates: 12 },
      { id: '2', name: 'Project Documents', owner: 'Jane Smith', members: 5, files: 89, duplicates: 8 }
    ];

    setTeamMembers(mockTeamMembers);
    setSharedFolders(mockSharedFolders);
    analyzeTeamInsights(mockTeamMembers, mockSharedFolders);
  };

  const analyzeTeamInsights = (members, folders) => {
    const insights = {
      totalMembers: members.length,
      totalSharedFolders: folders.length,
      totalFiles: folders.reduce((sum, folder) => sum + folder.files, 0),
      totalDuplicates: folders.reduce((sum, folder) => sum + folder.duplicates, 0),
      potentialSavings: folders.reduce((sum, folder) => sum + (folder.duplicates * 1024 * 1024), 0), // Estimate 1MB per duplicate
      collaborationOpportunities: []
    };

    // Identify collaboration opportunities
    if (insights.totalDuplicates > 10) {
      insights.collaborationOpportunities.push({
        type: 'bulk_cleanup',
        title: 'Team Duplicate Cleanup',
        description: `${insights.totalDuplicates} duplicates found across team folders`,
        impact: 'High',
        participants: members.length
      });
    }

    if (folders.length > 1) {
      insights.collaborationOpportunities.push({
        type: 'cross_folder_analysis',
        title: 'Cross-Folder Duplicate Detection',
        description: 'Find duplicates across multiple team folders',
        impact: 'Medium',
        participants: members.length
      });
    }

    setTeamInsights(insights);
  };

  const shareFolder = async (folderId, memberEmails) => {
    try {
      // In a real implementation, this would use Microsoft Graph API
      // to share folders with team members
      
      const newSharedFolder = {
        id: Date.now().toString(),
        name: `Shared Folder ${Date.now()}`,
        owner: 'Current User',
        members: memberEmails.length,
        files: files.length,
        duplicates: Math.floor(Math.random() * 10)
      };

      setSharedFolders(prev => [...prev, newSharedFolder]);
      
      // Track sharing activity
      analytics.trackEvent('folder_shared', {
        folderId,
        memberCount: memberEmails.length
      });

      onShare?.(folderId, memberEmails);
    } catch (error) {
      console.error('Error sharing folder:', error);
    }
  };

  const requestCollaboration = async (opportunity) => {
    try {
      const request = {
        id: Date.now().toString(),
        type: opportunity.type,
        title: opportunity.title,
        status: 'pending',
        participants: teamMembers.map(member => ({
          ...member,
          status: 'invited'
        })),
        createdAt: new Date().toISOString()
      };

      setCollaborationRequests(prev => [...prev, request]);
      
      // Track collaboration request
      analytics.trackEvent('collaboration_requested', {
        type: opportunity.type,
        participantCount: opportunity.participants
      });

      onCollaborate?.(request);
    } catch (error) {
      console.error('Error requesting collaboration:', error);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="collaborative-manager">
      <div className="collaborative-header">
        <h2>👥 Team Duplicate Manager</h2>
        <p>Collaborate with your team to find and manage duplicates across shared folders</p>
      </div>

      <div className="team-overview">
        <h3>📊 Team Overview</h3>
        <div className="team-stats">
          <div className="stat-card">
            <div className="stat-value">{teamInsights.totalMembers || 0}</div>
            <div className="stat-label">Team Members</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{teamInsights.totalSharedFolders || 0}</div>
            <div className="stat-label">Shared Folders</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{teamInsights.totalFiles || 0}</div>
            <div className="stat-label">Total Files</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{teamInsights.totalDuplicates || 0}</div>
            <div className="stat-label">Duplicates Found</div>
          </div>
        </div>
      </div>

      <div className="team-members">
        <h3>👤 Team Members</h3>
        <div className="members-grid">
          {teamMembers.map(member => (
            <div key={member.id} className="member-card">
              <div className="member-avatar">{member.avatar}</div>
              <div className="member-info">
                <h4>{member.name}</h4>
                <p>{member.email}</p>
                <span className={`role-badge ${member.role}`}>
                  {member.role}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="shared-folders">
        <h3>📁 Shared Folders</h3>
        <div className="folders-grid">
          {sharedFolders.map(folder => (
            <div key={folder.id} className="folder-card">
              <div className="folder-header">
                <h4>{folder.name}</h4>
                <span className="owner-badge">Owner: {folder.owner}</span>
              </div>
              <div className="folder-stats">
                <div className="folder-stat">
                  <span className="stat-label">Members:</span>
                  <span className="stat-value">{folder.members}</span>
                </div>
                <div className="folder-stat">
                  <span className="stat-label">Files:</span>
                  <span className="stat-value">{folder.files}</span>
                </div>
                <div className="folder-stat">
                  <span className="stat-label">Duplicates:</span>
                  <span className="stat-value highlight">{folder.duplicates}</span>
                </div>
              </div>
              <button className="analyze-btn">
                Analyze Duplicates
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="collaboration-opportunities">
        <h3>🤝 Collaboration Opportunities</h3>
        <div className="opportunities-list">
          {teamInsights.collaborationOpportunities?.map((opportunity, index) => (
            <div key={index} className="opportunity-card">
              <div className="opportunity-header">
                <h4>{opportunity.title}</h4>
                <span className={`impact-badge ${opportunity.impact}`}>
                  {opportunity.impact} Impact
                </span>
              </div>
              <p>{opportunity.description}</p>
              <div className="opportunity-metrics">
                <span>Participants: {opportunity.participants}</span>
                {opportunity.type === 'bulk_cleanup' && (
                  <span>Potential Savings: {formatFileSize(teamInsights.potentialSavings || 0)}</span>
                )}
              </div>
              <button 
                className="collaborate-btn"
                onClick={() => requestCollaboration(opportunity)}
              >
                Start Collaboration
              </button>
            </div>
          ))}
        </div>
      </div>

      {collaborationRequests.length > 0 && (
        <div className="active-collaborations">
          <h3>🔄 Active Collaborations</h3>
          <div className="collaborations-list">
            {collaborationRequests.map(request => (
              <div key={request.id} className="collaboration-card">
                <div className="collaboration-header">
                  <h4>{request.title}</h4>
                  <span className={`status-badge ${request.status}`}>
                    {request.status}
                  </span>
                </div>
                <div className="participants">
                  <h5>Participants:</h5>
                  <div className="participants-list">
                    {request.participants.map(participant => (
                      <div key={participant.id} className="participant">
                        <span>{participant.avatar}</span>
                        <span>{participant.name}</span>
                        <span className={`status ${participant.status}`}>
                          {participant.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CollaborativeManager; 
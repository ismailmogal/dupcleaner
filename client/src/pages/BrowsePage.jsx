import React, { useState } from 'react';
import { useFileManagement } from '../hooks/useFileManagement.js';
import { useAuth } from '../hooks/useAuth.js';
import FileExplorerGrid from '../components/FileExplorerGrid';
import LoadingSpinner from '../components/LoadingSpinner';

const Breadcrumbs = ({ path, onBreadcrumbClick }) => (
  <nav aria-label="breadcrumb" style={{ marginBottom: '1rem' }}>
    <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
      <li>
        <button onClick={() => onBreadcrumbClick(-1)} style={{ background: 'none', border: 'none', color: '#0078d4', cursor: 'pointer', padding: '0.25rem' }}>
          OneDrive
        </button>
      </li>
      {path.slice(1).map((folder, index) => (
        <li key={folder.id} style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ margin: '0 0.5rem', color: '#666' }}>/</span>
          <button
            onClick={() => onBreadcrumbClick(index + 1)}
            style={{ background: 'none', border: 'none', color: '#0078d4', cursor: 'pointer', padding: '0.25rem' }}
            aria-current={index === path.length - 2 ? "page" : undefined}
          >
            {folder.name}
          </button>
        </li>
      ))}
    </ol>
  </nav>
);

const BrowsePage = () => {
  const { login } = useAuth();
  const { 
    gridData, 
    folderPath, 
    loading, 
    error, 
    navigateToFolder, 
    navigateToPathByIndex 
  } = useFileManagement('root');
  
  const [globalFilter, setGlobalFilter] = useState('');

  // Debug logging
  console.log('BrowsePage - loading:', loading);
  console.log('BrowsePage - error:', error);
  console.log('BrowsePage - gridData length:', gridData?.length);
  console.log('BrowsePage - folderPath:', folderPath);

  // This function will be needed for the multi-compare feature later.
  const handleAddToComparison = async (folder) => {
    // This logic can be moved to a context or hook later
    console.log("Adding to comparison (not implemented yet):", folder);
  };
  
  if (loading) {
    console.log('BrowsePage - showing LoadingSpinner');
    return <LoadingSpinner />;
  }
  
  if (error && error.includes('Please log in')) {
    console.log('BrowsePage - showing login prompt');
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <h2>Welcome to OneDrive Duplicate Finder</h2>
        <p>Please log in with your Microsoft account to access your files.</p>
        <button 
          onClick={login}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#0078d4',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '1rem'
          }}
        >
          Login with Microsoft
        </button>
      </div>
    );
  }
  
  if (error) {
    console.log('BrowsePage - showing error:', error);
    return <p className="error">{error}</p>;
  }

  console.log('BrowsePage - rendering main content');
  return (
    <div>
      <Breadcrumbs path={folderPath} onBreadcrumbClick={navigateToPathByIndex} />
      <div className="browser-controls" style={{ marginBottom: '1rem' }}>
        <input
          type="text"
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder="Search by name..."
          style={{ padding: '0.5rem', minWidth: '300px', borderRadius: '6px', border: '1px solid #ccc' }}
        />
      </div>
      <FileExplorerGrid
        data={gridData}
        onRowClick={(row) => row.original.folder && navigateToFolder(row.original)}
        onAddToComparison={handleAddToComparison}
        globalFilter={globalFilter}
        setGlobalFilter={setGlobalFilter}
      />
    </div>
  );
};

export default BrowsePage;

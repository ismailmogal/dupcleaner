import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage = () => {
  return (
    <div style={{ 
      textAlign: 'center', 
      padding: '2rem',
      minHeight: '50vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <h1>404 - Page Not Found</h1>
      <p>The page you're looking for doesn't exist.</p>
      <Link to="/" style={{ 
        marginTop: '1rem',
        padding: '0.5rem 1rem',
        backgroundColor: '#0078d4',
        color: 'white',
        textDecoration: 'none',
        borderRadius: '4px'
      }}>
        Go to Home
      </Link>
    </div>
  );
};

export default NotFoundPage;

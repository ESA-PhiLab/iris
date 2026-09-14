import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const AdminNavigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string): boolean => {
    if (path === '/users') return location.pathname === '/users';
    if (path === '/images') return location.pathname === '/images';
    if (path === '/actions') return location.pathname.startsWith('/actions');
    if (path === '/password-resets') return location.pathname === '/password-resets';
    return false;
  };

  const buttonStyle = (path: string): React.CSSProperties => ({
    backgroundColor: isActive(path) ? '#ddd' : 'transparent',
    border: '1px solid #ccc',
    padding: '10px 20px',
    cursor: 'pointer',
    fontSize: '14px'
  });

  return (
    <div className="tab" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #ccc' }}>
      <div style={{ display: 'flex' }}>
        <button 
          style={buttonStyle('/users')}
          onClick={() => navigate('/users')}
        >
          Users
        </button>
        <button 
          style={buttonStyle('/images')}
          onClick={() => navigate('/images')}
        >
          Images
        </button>
        <button 
          style={buttonStyle('/actions')}
          onClick={() => navigate('/actions/segmentation')}
        >
          Masks
        </button>
        <button 
          style={buttonStyle('/password-resets')}
          onClick={() => navigate('/password-resets')}
        >
          Password Resets
        </button>
      </div>
      <a
        href="/segmentation?openPreferences=true"
        style={{
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          marginRight: '8px',
          textDecoration: 'none'
        }}
        title="Preferences"
      >
        <img 
          src="/segmentation/static/icons/preferences.png" 
          alt="Preferences"
          style={{ width: '24px', height: '24px' }}
        />
      </a>
    </div>
  );
};

export default AdminNavigation;
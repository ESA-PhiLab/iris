import React from 'react';

const AdminButton: React.FC = () => {
  return (
    <div
      className="statusbutton"
      id="admin-button"
      onClick={() => window.open('/admin/', '_blank')}
    >
      <div style={{ fontSize: '20px' }}>Admin</div>
    </div>
  );
};

export default AdminButton;

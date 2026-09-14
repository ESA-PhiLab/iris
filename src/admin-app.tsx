import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AdminNavigation from './components/AdminNavigation';
import UsersPage from './pages/UsersPage';
import ActionsPage from './pages/ActionsPage';
import ImagesPage from './pages/ImagesPage';
import PasswordResetRequestsPage from './pages/PasswordResetRequestsPage';

const AdminApp: React.FC = () => {
  return (
    <Router basename="/admin">
      <div>
        <AdminNavigation />
        <div style={{ marginTop: '20px' }}>
          <Routes>
            <Route path="/" element={<Navigate to="/users" replace />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/actions/:type" element={<ActionsPage />} />
            <Route path="/images" element={<ImagesPage />} />
            <Route path="/password-resets" element={<PasswordResetRequestsPage />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
};

// Initialize React when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('react-admin-app');
  if (container) {
    const root = createRoot(container);
    root.render(<AdminApp />);
  }
});

export default AdminApp;
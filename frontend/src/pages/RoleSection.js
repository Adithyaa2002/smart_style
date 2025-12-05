// src/pages/RoleSelection.js
import React from 'react';
import { useNavigate } from 'react-router-dom';
import './RoleSelection.css';

const RoleSelection = () => {
  const navigate = useNavigate();

  const handleSelectRole = (role) => {
    if (role === 'user') navigate('/login');
    else if (role === 'admin') navigate('/admin-login');
    else if (role === 'vendor') navigate('/vendor-login');
  };

  return (
    <div className="role-selection-container">
      <div className="role-selection-box">
        <h1>Welcome to SmartStyle</h1>
        <p>Please select your login type:</p>
        <div className="role-buttons">
          <button onClick={() => handleSelectRole('user')}>User Login</button>
          <button onClick={() => handleSelectRole('admin')}>Admin Login</button>
          <button onClick={() => handleSelectRole('vendor')}>Vendor Login</button>
        </div>
      </div>
    </div>
  );
};

export default RoleSelection;

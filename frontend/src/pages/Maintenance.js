import React from 'react';
import { Link } from 'react-router-dom';
import './Maintenance.css';

const Maintenance = () => {
    return (
        <div className="maintenance-container">
            <div className="maintenance-content">
                <div className="maintenance-icon">⚙️</div>
                <h1>System Maintenance in Progress</h1>
                <p>SmartStyle is currently undergoing scheduled upgrades to improve your shopping experience. We'll be back online shortly!</p>
                <div className="maintenance-footer">
                    <span>Estimated downtime: 30 minutes</span>
                    <div className="progress-bar">
                        <div className="progress-fill"></div>
                    </div>
                    <Link to="/" className="admin-login-link">Sign In as Admin</Link>
                </div>
            </div>
        </div>
    );
};

export default Maintenance;

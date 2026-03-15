import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const MaintenanceGuard = ({ children, user }) => {
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [loading, setLoading] = useState(true);
    const location = useLocation();

    useEffect(() => {
        const checkMaintenance = async () => {
            try {
                const response = await fetch(`http://${window.location.hostname}:5000/api/settings`);
                const data = await response.json();
                setMaintenanceMode(data.maintenanceMode || false);
            } catch (error) {
                console.error('Maintenance check failed:', error);
            } finally {
                setLoading(false);
            }
        };
        checkMaintenance();
    }, [location]);

    if (loading) return null;

    // Protect all routes IF maintenance is ON and user is NOT ADMIN
    const isAdmin = user && user.role === 'admin';
    // Block Signup entirely during maintenance
    const isSignupPath = location.pathname === '/signup';
    if (maintenanceMode && isSignupPath) {
        return <Navigate to="/maintenance" replace />;
    }

    // Allow access to Login page so admins can return, but protect others
    const isLoginPath = location.pathname === '/';
    const isMaintenancePath = location.pathname === '/maintenance';

    if (maintenanceMode && !isAdmin && !isMaintenancePath && !isLoginPath) {
        return <Navigate to="/maintenance" replace />;
    }

    // If maintenance is OFF and we are on maintenance page, go home
    if (!maintenanceMode && isMaintenancePath) {
        return <Navigate to="/" replace />;
    }

    return children;
};

export default MaintenanceGuard;

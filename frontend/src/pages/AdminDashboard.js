import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';

const AdminDashboard = ({ user, onLogout }) => { // Accept props from App.js
  const [adminUser, setAdminUser] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const navigate = useNavigate();

  useEffect(() => {
    // Use the user prop passed from App.js, fallback to localStorage
    if (user && user.role === 'admin') {
      setAdminUser(user);
    } else {
      // If no user prop, check localStorage
      const savedUser = JSON.parse(localStorage.getItem('user'));
      if (!savedUser || savedUser.role !== 'admin') {
        navigate('/');
        return;
      }
      setAdminUser(savedUser);
    }
  }, [user, navigate]);

  const handleLogout = () => {
    onLogout(); // Call parent logout function
    navigate('/');
  };

  // Mock data for dashboard
  const dashboardStats = {
    totalUsers: 1247,
    totalProducts: 89,
    totalOrders: 543,
    revenue: '$45,230',
    activeTryOns: 234,
    conversionRate: '12.4%'
  };

  const recentActivities = [
    { id: 1, user: 'John Doe', action: 'Purchased Summer Dress', time: '2 mins ago' },
    { id: 2, user: 'Sarah Smith', action: 'Virtual Try-On Completed', time: '5 mins ago' },
    { id: 3, user: 'Mike Johnson', action: 'Account Created', time: '10 mins ago' },
    { id: 4, user: 'Emma Wilson', action: 'Product Review Added', time: '15 mins ago' }
  ];

  if (!adminUser) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <header className="admin-header">
        <div className="admin-header-left">
          <h1>SmartStyle Admin Dashboard</h1>
          <p>Welcome back, {adminUser.name}</p>
        </div>
        <div className="admin-header-right">
          <span className="admin-role">Administrator</span>
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>
      </header>

      <div className="admin-container">
        {/* Sidebar */}
        <nav className="admin-sidebar">
          <div className="sidebar-menu">
            <button 
              className={`menu-item ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              📊 Overview
            </button>
            <button 
              className={`menu-item ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              👥 User Management
            </button>
            <button 
              className={`menu-item ${activeTab === 'products' ? 'active' : ''}`}
              onClick={() => setActiveTab('products')}
            >
              👕 Product Catalog
            </button>
            <button 
              className={`menu-item ${activeTab === 'orders' ? 'active' : ''}`}
              onClick={() => setActiveTab('orders')}
            >
              📦 Order Management
            </button>
            <button 
              className={`menu-item ${activeTab === 'analytics' ? 'active' : ''}`}
              onClick={() => setActiveTab('analytics')}
            >
              📈 Analytics
            </button>
            <button 
              className={`menu-item ${activeTab === 'tryons' ? 'active' : ''}`}
              onClick={() => setActiveTab('tryons')}
            >
              🎯 Virtual Try-Ons
            </button>
          </div>
        </nav>

        {/* Main Content */}
        <main className="admin-main">
          {activeTab === 'overview' && (
            <div className="overview-tab">
              <h2>Dashboard Overview</h2>
              
              {/* Stats Grid */}
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon">👥</div>
                  <div className="stat-info">
                    <h3>{dashboardStats.totalUsers}</h3>
                    <p>Total Users</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">👕</div>
                  <div className="stat-info">
                    <h3>{dashboardStats.totalProducts}</h3>
                    <p>Products</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">📦</div>
                  <div className="stat-info">
                    <h3>{dashboardStats.totalOrders}</h3>
                    <p>Total Orders</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">💰</div>
                  <div className="stat-info">
                    <h3>{dashboardStats.revenue}</h3>
                    <p>Revenue</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">🎯</div>
                  <div className="stat-info">
                    <h3>{dashboardStats.activeTryOns}</h3>
                    <p>Active Try-Ons</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">📊</div>
                  <div className="stat-info">
                    <h3>{dashboardStats.conversionRate}</h3>
                    <p>Conversion Rate</p>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="recent-activity">
                <h3>Recent Activity</h3>
                <div className="activity-list">
                  {recentActivities.map(activity => (
                    <div key={activity.id} className="activity-item">
                      <div className="activity-content">
                        <strong>{activity.user}</strong> {activity.action}
                      </div>
                      <span className="activity-time">{activity.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="users-tab">
              <h2>User Management</h2>
              <p>User management interface coming soon...</p>
            </div>
          )}

          {activeTab === 'products' && (
            <div className="products-tab">
              <h2>Product Catalog</h2>
              <p>Product management interface coming soon...</p>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="orders-tab">
              <h2>Order Management</h2>
              <p>Order management interface coming soon...</p>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="analytics-tab">
              <h2>Analytics & Reports</h2>
              <p>Analytics dashboard coming soon...</p>
            </div>
          )}

          {activeTab === 'tryons' && (
            <div className="tryons-tab">
              <h2>Virtual Try-On Analytics</h2>
              <p>Try-on analytics coming soon...</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
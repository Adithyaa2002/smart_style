/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';

const AdminDashboard = ({ user, onLogout }) => { // Accept props from App.js
  const [adminUser, setAdminUser] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [allOrders, setAllOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [invSearchTerm, setInvSearchTerm] = useState('');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [banners, setBanners] = useState([]); // NEW
  const [storeSettings, setStoreSettings] = useState({
    maintenanceMode: false
  });
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

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetch(`http://${window.location.hostname}:5000/api/analytics/overview?t=${Date.now()}`);
        const result = await response.json();
        if (result.success) {
          setStats(result.data);
        }
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    if (activeTab === 'overview') {
      fetchAnalytics();
    }
  }, [activeTab]);

  useEffect(() => {
    const fetchAllOrders = async () => {
      setOrdersLoading(true);
      try {
        const response = await fetch(`http://${window.location.hostname}:5000/api/orders`);
        const data = await response.json();
        setAllOrders(Array.isArray(data) ? data : (data.orders || []));
      } catch (error) {
        console.error('Failed to fetch all orders:', error);
      } finally {
        setOrdersLoading(false);
      }
    };

    if (activeTab === 'orders') {
      fetchAllOrders();
    }
  }, [activeTab]);

  useEffect(() => {
    const fetchInventory = async () => {
      setInventoryLoading(true);
      try {
        const response = await fetch(`http://${window.location.hostname}:5000/api/products`);
        const data = await response.json();
        setInventory(data);
      } catch (error) {
        console.error('Failed to fetch inventory:', error);
      } finally {
        setInventoryLoading(false);
      }
    };

    if (activeTab === 'products') {
      fetchInventory();
    }
  }, [activeTab]);

  useEffect(() => {
    const fetchUsers = async () => {
      setUsersLoading(true);
      try {
        const response = await fetch(`http://${window.location.hostname}:5000/api/auth/users`);
        const data = await response.json();
        if (data.success) {
          setUsers(data.users);
        }
      } catch (error) {
        console.error('Failed to fetch users:', error);
      } finally {
        setUsersLoading(false);
      }
    };

    if (activeTab === 'customers') {
      fetchUsers();
    }
  }, [activeTab]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch(`http://${window.location.hostname}:5000/api/settings`);
        const data = await response.json();
        if (data) setStoreSettings(data);
      } catch (error) {
        console.error('Failed to fetch settings:', error);
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    if (activeTab === 'promotions') {
      fetch(`http://${window.location.hostname}:5000/api/banners`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setBanners(data);
          else {
            console.warn("Invalid banners data:", data);
            setBanners([]);
          }
        })
        .catch(err => console.error(err));
    }
  }, [activeTab]);

  // NEW: Fetch Reviews
  const [reviews, setReviews] = useState([]);
  useEffect(() => {
    if (activeTab === 'reviews') {
      fetch(`http://${window.location.hostname}:5000/api/reviews/all`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setReviews(data);
          else setReviews([]);
        })
        .catch(err => console.error(err));
    }
  }, [activeTab]);

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const response = await fetch(`http://${window.location.hostname}:5000/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });
      const result = await response.json();
      if (result.success) {
        setAllOrders(prev => prev.map(order =>
          order._id === orderId ? { ...order, status: newStatus } : order
        ));
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const updateProductInline = async (productId, field, value) => {
    try {
      const response = await fetch(`http://${window.location.hostname}:5000/api/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ [field]: value })
      });
      const updated = await response.json();
      if (updated._id) {
        setInventory(prev => prev.map(p => p._id === productId ? updated : p));
      }
    } catch (error) {
      console.error('Failed to update product:', error);
    }
  };

  const deleteProduct = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      const response = await fetch(`http://${window.location.hostname}:5000/api/products/${productId}`, {
        method: 'DELETE'
      });
      const result = await response.json();
      if (result.message) {
        setInventory(prev => prev.filter(p => p._id !== productId));
        // Update stats count locally for immediate sync
        setStats(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            totalStats: {
              ...prev.totalStats,
              totalProducts: Math.max(0, prev.totalStats.totalProducts - 1)
            }
          };
        });
      }
    } catch (error) {
      console.error('Failed to delete product:', error);
    }
  };

  const handleSettingChange = (e) => {
    const { name, value, type, checked } = e.target;
    setStoreSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const saveSettings = async () => {
    try {
      const response = await fetch(`http://${window.location.hostname}:5000/api/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(storeSettings)
      });
      if (response.ok) {
        alert("✅ Store settings updated successfully!");
      } else {
        alert("❌ Failed to update settings");
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert("❌ Error saving settings");
    }
  };

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
            <button className={`menu-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
              <span>📊</span> Store Overview
            </button>
            <button className={`menu-item ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')}>
              <span>📦</span> Orders
            </button>
            <button className={`menu-item ${activeTab === 'products' ? 'active' : ''}`} onClick={() => setActiveTab('products')}>
              <span>👕</span> Inventory
            </button>
            <button className={`menu-item ${activeTab === 'customers' ? 'active' : ''}`} onClick={() => setActiveTab('customers')}>
              <span>👥</span> Customers
            </button>
            <button className={`menu-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
              <span>⚙️</span> Store Settings
            </button>
            <button className={`menu-item ${activeTab === 'promotions' ? 'active' : ''}`} onClick={() => setActiveTab('promotions')}>
              <span>📢</span> Promotions
            </button>
            <button className={`menu-item ${activeTab === 'reviews' ? 'active' : ''}`} onClick={() => setActiveTab('reviews')}>
              <span>⭐</span> Review Management
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

          {activeTab === 'orders' && (
            <div className="orders-tab">
              <div className="card-header">
                <h2>Manage Orders</h2>
                <div className="orders-header-actions">
                  <input
                    type="text"
                    placeholder="Search by Order ID or Email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="admin-search-input"
                  />
                  <button className="primary-btn" onClick={() => setActiveTab('overview')}>← Overview</button>
                </div>
              </div>

              <div className="content-card">
                {ordersLoading ? (
                  <p>Loading orders...</p>
                ) : (
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>Customer</th>
                        <th>Status</th>
                        <th>Amount</th>
                        <th>Actions</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.isArray(allOrders) && allOrders
                        .filter(order =>
                          order._id.toString().includes(searchTerm) ||
                          order.customerId.toLowerCase().includes(searchTerm.toLowerCase())
                        )
                        .length > 0 ? (
                        allOrders
                          .filter(order =>
                            order._id.toString().includes(searchTerm) ||
                            order.customerId.toLowerCase().includes(searchTerm.toLowerCase())
                          )
                          .map((order) => (
                            <tr key={order._id}>
                              <td><strong>#RD-{order._id.toString().slice(-6).toUpperCase()}</strong></td>
                              <td>{order.customerId}</td>
                              <td>
                                <span className={`status-pill ${order.status?.toLowerCase() || 'pending'}`}>
                                  {order.status || 'Pending'}
                                </span>
                              </td>
                              <td>₹{order.totalAmount?.toLocaleString()}</td>
                              <td>
                                <select
                                  value={order.status || 'Pending'}
                                  onChange={(e) => updateOrderStatus(order._id, e.target.value)}
                                  className="status-select"
                                >
                                  <option value="Pending">Pending</option>
                                  <option value="Processing">Processing</option>
                                  <option value="Shipped">Shipped</option>
                                  <option value="Delivered">Delivered</option>
                                  <option value="Cancelled">Cancelled</option>
                                </select>
                              </td>
                              <td>
                                <button className="modal-trigger-btn" onClick={() => setSelectedOrder(order)}>
                                  View Details
                                </button>
                              </td>
                            </tr>
                          ))
                      ) : (
                        <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>No matching orders found.</td></tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
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

          {activeTab === 'settings' && (
            <div className="settings-tab">
              <div className="card-header">
                <h2>Global Store Settings</h2>
                <button className="primary-btn" onClick={saveSettings}>Save Configurations</button>
              </div>

              <div className="settings-grid">
                {/* System Toggles */}
                <div className="content-card settings-card" style={{ maxWidth: '400px', margin: '0 auto' }}>
                  <h3>Platform Configuration</h3>
                  <div className="settings-form">
                    <div className="toggle-group">
                      <div className="toggle-info">
                        <strong>Maintenance Mode</strong>
                        <span>Temporarily disable the storefront for users</span>
                      </div>
                      <label className="switch">
                        <input
                          type="checkbox"
                          name="maintenanceMode"
                          checked={storeSettings.maintenanceMode}
                          onChange={handleSettingChange}
                        />
                        <span className="slider round"></span>
                      </label>
                    </div>

                    <div className="form-group">
                      <label>Official Helpline Number</label>
                      <input
                        type="text"
                        name="helpline"
                        placeholder="+91 1800-123-4567"
                        value={storeSettings.helpline || ''}
                        onChange={handleSettingChange}
                      />
                    </div>

                    <div className="form-group">
                      <label>Official Support Email</label>
                      <input
                        type="email"
                        name="officialEmail"
                        placeholder="support@smartstyle.com"
                        value={storeSettings.officialEmail || ''}
                        onChange={handleSettingChange}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'promotions' && (
            <div className="promotions-tab">
              <div className="card-header">
                <h2>📢 Banner Management</h2>
              </div>

              <div className="content-card">
                <div className="form-group">
                  <label>Banner Title</label>
                  <input id="bannerTitle" type="text" placeholder="e.g. Summer Sale" className="admin-search-input" style={{ width: '100%', marginBottom: '10px' }} />
                </div>
                <div className="form-group">
                  <label>Target Link (Optional)</label>
                  <input id="bannerLink" type="text" placeholder="e.g. category=Summer" className="admin-search-input" style={{ width: '100%', marginBottom: '10px' }} />
                </div>
                <div className="form-group">
                  <label>Banner Image</label>
                  <input id="bannerImage" type="file" accept="image/*" className="admin-search-input" style={{ width: '100%', marginBottom: '10px' }} />
                </div>
                <button className="primary-btn" onClick={async () => {
                  const title = document.getElementById('bannerTitle').value;
                  const link = document.getElementById('bannerLink').value;
                  const file = document.getElementById('bannerImage').files[0];

                  if (!title || !file) return alert("Title and Image required");

                  const formData = new FormData();
                  formData.append('title', title);
                  formData.append('link', link);
                  formData.append('image', file);

                  try {
                    await fetch(`http://${window.location.hostname}:5000/api/banners`, { method: 'POST', body: formData });
                    alert("✅ Banner Uploaded");
                    // Trigger refresh
                    setActiveTab('overview');
                    setTimeout(() => setActiveTab('promotions'), 100);
                  } catch (e) { console.error(e); alert("Failed"); }
                }}>Upload Banner</button>
              </div>

              <div className="content-card" style={{ marginTop: '20px' }}>
                <h3>Active Banners</h3>
                <div className="banner-list" style={{ display: 'grid', gap: '10px' }}>
                  {banners.map(b => (
                    <div key={b._id} style={{ border: '1px solid #eee', padding: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <img src={`http://${window.location.hostname}:5000${b.image}`} style={{ width: '100px', height: '50px', objectFit: 'cover' }} alt="" />
                      <div style={{ flex: 1 }}>
                        <strong>{b.title}</strong>
                        <p style={{ fontSize: '0.8rem', color: '#666' }}>{b.link}</p>
                      </div>
                      <button className="delete-icon-btn" onClick={async () => {
                        if (!window.confirm("Delete?")) return;
                        await fetch(`http://${window.location.hostname}:5000/api/banners/${b._id}`, { method: 'DELETE' });
                        setBanners(prev => prev.filter(x => x._id !== b._id));
                      }}>🗑️</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="reviews-tab">
              <div className="card-header">
                <h2>⭐ Review Moderation</h2>
                <p>Monitor and delete inappropriate reviews.</p>
              </div>

              <div className="content-card" style={{ marginTop: '20px' }}>
                {reviews.length === 0 ? <p>No reviews found.</p> : (
                  <div className="reviews-list" style={{ display: 'grid', gap: '15px' }}>
                    {reviews.map(r => (
                      <div key={r.reviewId} style={{ border: '1px solid #eee', padding: '15px', borderRadius: '8px', background: 'white' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <img src={`http://${window.location.hostname}:5000${r.productImage}`} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} alt="" />
                            <div>
                              <strong>{r.productName}</strong>
                              <div style={{ fontSize: '0.85rem', color: '#666' }}>By: {r.user} | {new Date(r.date).toLocaleDateString()}</div>
                            </div>
                          </div>
                          <div style={{ fontWeight: 'bold', color: '#e91e63' }}>{r.rating} ★</div>
                        </div>
                        <p style={{ background: '#f9f9f9', padding: '10px', borderRadius: '4px', fontStyle: 'italic' }}>"{r.comment}"</p>
                        <div style={{ textAlign: 'right', marginTop: '10px' }}>
                          <button
                            style={{ background: '#ff4d4d', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}
                            onClick={async () => {
                              if (!window.confirm("Delete this review?")) return;
                              try {
                                await fetch(`http://${window.location.hostname}:5000/api/reviews/${r.productId}/${r.reviewId}`, { method: 'DELETE' });
                                setReviews(prev => prev.filter(x => x.reviewId !== r.reviewId));
                              } catch (e) { alert("Failed to delete"); }
                            }}
                          >
                            Delete Review
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab !== 'overview' && activeTab !== 'orders' && activeTab !== 'products' && activeTab !== 'customers' && activeTab !== 'settings' && activeTab !== 'promotions' && activeTab !== 'reviews' && (
            <div className="placeholder-tab">
              <h2>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Module</h2>
              <p>Advanced e-commerce controls for {activeTab} coming soon.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
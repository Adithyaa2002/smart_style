/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
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
    maintenanceMode: false,
    helpline: '',
    officialEmail: ''
  });

  const handleSettingChange = (e) => {
    const { name, value, type, checked } = e.target;
    setStoreSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const saveSettings = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(storeSettings)
      });
      const data = await response.json();
      if (data.success || data._id) {
        alert('✅ Settings saved successfully!');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('❌ Failed to save settings.');
    }
  };
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
    fetchDashboardData();
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

    if (activeTab === 'customers' || activeTab === 'users') {
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

  const fetchDashboardData = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/admin/stats');
      setDashboardStats(res.data.stats);
      setRecentActivities(res.data.activities);
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    }
  };

  const handleLogout = () => {
    onLogout(); // Call parent logout function
    navigate('/');
  };

  // Dashboard stats and activities should be fetched from API for "true events"
  const [dashboardStats, setDashboardStats] = useState({
    totalUsers: 0,
    totalProducts: 0,
    totalOrders: 0,
    revenue: "₹0.00",
    activeTryOns: 0,
    conversionRate: "0%"
  });

  const [recentActivities, setRecentActivities] = useState([]);

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
            <button className={`menu-item ${activeTab === 'customers' || activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('customers')}>
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
            <button className={`menu-item ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>
              <span>📈</span> Analytics
            </button>
            <button className={`menu-item ${activeTab === 'tryons' ? 'active' : ''}`} onClick={() => setActiveTab('tryons')}>
              <span>🎯</span> Virtual Try-Ons
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
                  {recentActivities.length > 0 ? (
                    recentActivities.map(activity => (
                      <div key={activity.id} className="activity-item">
                        <div className="activity-content">
                          <strong>{activity.user}</strong> {activity.action}
                        </div>
                        <span className="activity-time">{activity.time}</span>
                      </div>
                    ))
                  ) : (
                    <div className="no-activity">No recent activity found.</div>
                  )}
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

          {activeTab === 'products' && <ProductsManager />}

          {activeTab === 'orders' && <OrdersManager />}

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
      </div >
    </div >
  );
};

const OrdersManager = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterPayment, setFilterPayment] = useState("All");

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await axios.get('http://localhost:5000/api/orders');
      setOrders(res.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('Failed to load orders. Please ensure the backend and database are running.');
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(order => {
    const orderId = order._id.startsWith('ORD') ? order._id : `ORD${order._id.slice(-5).toUpperCase()}`;
    const matchesSearch =
      orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === "All" || order.status === filterStatus;
    const matchesPayment = filterPayment === "All" || order.paymentStatus === filterPayment;

    return matchesSearch && matchesStatus && matchesPayment;
  });

  const handleUpdateStatus = async (orderId, updates) => {
    try {
      await axios.patch(`http://localhost:5000/api/orders/${orderId}`, updates);
      setOrders(orders.map(o => o._id === orderId ? { ...o, ...updates } : o));
    } catch (err) {
      setOrders(orders.map(o => o._id === orderId ? { ...o, ...updates } : o));
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  if (loading) return <div className="tab-loading">Loading orders...</div>;
  if (error) return <div className="tab-error">{error}</div>;

  return (
    <div className="orders-tab">
      <div className="tab-header">
        <h2>Order Management</h2>
        <div className="header-actions">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search by ID or Name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="admin-search-input"
            />
          </div>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="admin-filter-select">
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Processing">Processing</option>
            <option value="Shipped">Shipped</option>
            <option value="Delivered">Delivered</option>
            <option value="Cancelled">Cancelled</option>
          </select>
          <select value={filterPayment} onChange={(e) => setFilterPayment(e.target.value)} className="admin-filter-select">
            <option value="All">All Payment</option>
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
            <option value="Failed">Failed</option>
            <option value="Refunded">Refunded</option>
          </select>
          <button onClick={fetchOrders} className="refresh-icon-btn" title="Refresh Data">🔄</button>
        </div>
      </div>

      <div className="table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>User Name / User ID</th>
              <th>Order Date & Time</th>
              <th>Total Amount (₹)</th>
              <th>Payment Method</th>
              <th>Payment Status</th>
              <th>Order Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map(order => (
              <tr key={order._id}>
                <td className="order-id">{order._id.startsWith('ORD') ? order._id : `ORD${order._id.slice(-5).toUpperCase()}`}</td>
                <td>
                  <div className="customer-info">
                    <span className="customer-name">{order.customerName}</span>
                    <span className="customer-email">{order.customerId}</span>
                  </div>
                </td>
                <td>{formatDate(order.createdAt)}</td>
                <td className="amount-cell">{formatCurrency(order.totalAmount)}</td>
                <td>
                  <span className={`method-badge ${order.paymentMethod?.toLowerCase()}`}>
                    {order.paymentMethod || 'Unknown'}
                  </span>
                </td>
                <td>
                  <select
                    value={order.paymentStatus}
                    onChange={(e) => handleUpdateStatus(order._id, { paymentStatus: e.target.value })}
                    className={`status-select payment-${order.paymentStatus.toLowerCase()}`}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Paid">Paid</option>
                    <option value="Failed">Failed</option>
                    <option value="Refunded">Refunded</option>
                  </select>
                </td>
                <td>
                  <select
                    value={order.status}
                    onChange={(e) => handleUpdateStatus(order._id, { status: e.target.value })}
                    className={`status-select order-${order.status.toLowerCase()}`}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Processing">Processing</option>
                    <option value="Shipped">Shipped</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </td>
                <td>
                  <button
                    className="view-details-btn"
                    title="View Items"
                    onClick={() => setSelectedOrder(order)}
                  >
                    📦
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Order Items Modal */}
      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Order Details: {selectedOrder._id.startsWith('ORD') ? selectedOrder._id : `ORD${selectedOrder._id.slice(-5).toUpperCase()}`}</h3>
              <button className="close-btn" onClick={() => setSelectedOrder(null)}>✖</button>
            </div>
            <div className="modal-body">
              <div className="customer-detail">
                <p><strong>Customer:</strong> {selectedOrder.customerName}</p>
                <p><strong>Email:</strong> {selectedOrder.customerId}</p>
              </div>
              <div className="items-list">
                <table className="modal-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Price</th>
                      <th>Qty</th>
                      <th>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedOrder.items || [
                      { name: "Demo Product", price: selectedOrder.totalAmount, quantity: 1 }
                    ]).map((item, idx) => (
                      <tr key={idx}>
                        <td>{item.name}</td>
                        <td>₹{item.price.toFixed(2)}</td>
                        <td>{item.quantity}</td>
                        <td>₹{(item.price * item.quantity).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="order-summary">
                <p className="final-total">Total Amount: <span>{formatCurrency(selectedOrder.totalAmount)}</span></p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ProductsManager = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await axios.get('http://localhost:5000/api/products');
      setProducts(res.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await axios.delete(`http://localhost:5000/api/products/${productId}`);
      setProducts(products.filter(p => p._id !== productId));
    } catch (err) {
      alert('Failed to delete product');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getStockStatus = (stock) => {
    if (stock === 0) return { label: 'Out of Stock', class: 'out-of-stock' };
    if (stock <= 5) return { label: 'Low Stock', class: 'low-stock' };
    return { label: 'Active', class: 'active' };
  };

  if (loading) return <div className="tab-loading">Loading products...</div>;
  if (error) return <div className="tab-error">{error}</div>;

  return (
    <div className="products-tab">
      <div className="tab-header">
        <h2>Product Catalog</h2>
        <button onClick={fetchProducts} className="refresh-btn">🔄 Refresh</button>
      </div>

      <div className="table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Product Name</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map(product => {
              const status = getStockStatus(product.stock);
              return (
                <tr key={product._id}>
                  <td className="order-id">SS-PRD-{product._id.slice(-4).toUpperCase()}</td>
                  <td>
                    <div className="product-cell-info">
                      {product.image && <img src={`http://localhost:5000${product.image}`} alt="" className="mini-thumb" />}
                      <span>{product.name}</span>
                    </div>
                  </td>
                  <td className="category-cell">{product.category}</td>
                  <td className="amount-cell">{formatCurrency(product.price)}</td>
                  <td>{product.stock}</td>
                  <td>
                    <span className={`stock-badge ${status.class}`}>
                      {status.label}
                    </span>
                  </td>
                  <td>
                    <button
                      className="delete-btn"
                      onClick={() => handleDeleteProduct(product._id)}
                      title="Delete Product"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminDashboard;
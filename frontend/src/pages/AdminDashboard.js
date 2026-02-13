import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';

const AdminDashboard = ({ user, onLogout }) => {
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
    if (user && user.role === 'admin') {
      setAdminUser(user);
    } else {
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
        const response = await fetch(`http://localhost:5000/api/analytics/overview?t=${Date.now()}`);
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
        const response = await fetch('http://localhost:5000/api/orders');
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
        const response = await fetch('http://localhost:5000/api/products');
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
        const response = await fetch('http://localhost:5000/api/auth/users');
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
        const response = await fetch('http://localhost:5000/api/settings');
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
      fetch('http://localhost:5000/api/banners')
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
      fetch('http://localhost:5000/api/reviews/all')
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
      const response = await fetch(`http://localhost:5000/api/orders/${orderId}/status`, {
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
      const response = await fetch(`http://localhost:5000/api/products/${productId}`, {
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
      const response = await fetch(`http://localhost:5000/api/products/${productId}`, {
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

  const handleLogout = () => {
    onLogout();
    navigate('/');
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
      const response = await fetch('http://localhost:5000/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(storeSettings)
      });
      const result = await response.json();
      if (result.success) {
        alert('Global store configurations synchronized successfully!');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Sync failed. Please check backend connection.');
    }
  };

  if (!adminUser || loading) {
    return <div className="loading">Synchronizing Real-time Data...</div>;
  }

  // Real Data Mapping
  const totalStats = stats?.totalStats || { totalUsers: 0, totalProducts: 0, totalOrders: 0, totalRevenue: '₹0' };

  const ecomStats = [
    { label: 'Gross Revenue (GMV)', value: totalStats.totalRevenue, trend: '+0%', icon: '💰' },
    { label: 'Total Orders', value: totalStats.totalOrders, trend: '+0%', icon: '📦' },
    { label: 'Active Products', value: totalStats.totalProducts, trend: '+0%', icon: '👕' },
    { label: 'Total User Pool', value: totalStats.totalUsers, trend: '+0%', icon: '👥' },
  ];

  const recentOrders = stats?.recentOrders || [];
  const userAnalytics = stats?.userAnalytics || { new: 0, returning: 0 };

  const inventoryAlerts = [
    { product: 'Silk Summer Dress', stock: 2, status: 'Critical Low', color: 'red' },
    { product: 'Mens Denim Jacket', stock: 8, status: 'Low Stock', color: 'orange' },
  ];

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <div className="admin-header-left">
          <h1>SmartStyle Retail Command</h1>
          <p>Professional Store Management | Admin: {adminUser.name}</p>
        </div>
        <div className="admin-header-right">
          <div className="store-status">
            <span className="pulse"></span> Store Online
          </div>
          <button onClick={handleLogout} className="logout-btn">Log Out</button>
        </div>
      </header>

      <div className="admin-container">
        <aside className="admin-sidebar">
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
        </aside>

        <main className="admin-main">
          {activeTab === 'overview' && (
            <div className="overview-tab">
              <div className="ecom-metric-grid">
                {ecomStats.map((stat, i) => (
                  <div key={i} className="metric-card">
                    <div className="metric-header">
                      <span className="metric-icon">{stat.icon}</span>
                      <span className="metric-trend up">{stat.trend}</span>
                    </div>
                    <div className="metric-body">
                      <h3>{stat.value}</h3>
                      <p>{stat.label}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="dashboard-content-grid">
                {/* Orders Table */}
                <div className="content-card orders-section">
                  <div className="card-header">
                    <h3>Recent Transactions (Live)</h3>
                    <button className="view-all" onClick={() => setActiveTab('orders')}>View All Orders</button>
                  </div>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>Customer</th>
                        <th>Status</th>
                        <th>Total</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentOrders.length > 0 ? (
                        recentOrders.map((order, i) => (
                          <tr key={i}>
                            <td><strong>{order.id}</strong></td>
                            <td>{order.customer}</td>
                            <td>
                              <span className={`status-pill ${order.status.toLowerCase()}`}>
                                {order.status}
                              </span>
                            </td>
                            <td>{order.amount}</td>
                            <td>{order.date}</td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>No recent orders found in database</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="sidebar-panels">
                  {/* User Mix Panel */}
                  <div className="content-card analytics-panel">
                    <h3>Customer Mix</h3>
                    <div className="alert-list">
                      <div className="alert-item">
                        <div className="alert-info">
                          <strong>New Customers (30d)</strong>
                        </div>
                        <span className="alert-status">{userAnalytics.new}</span>
                      </div>
                      <div className="alert-item">
                        <div className="alert-info">
                          <strong>Returning Customers</strong>
                        </div>
                        <span className="alert-status">{userAnalytics.returning}</span>
                      </div>
                    </div>
                  </div>

                  {/* Inventory Alerts */}
                  <div className="content-card inventory-panel">
                    <h3>Stock Intelligence</h3>
                    <div className="alert-list">
                      {inventoryAlerts.map((alert, i) => (
                        <div key={i} className="alert-item">
                          <div className="alert-info">
                            <strong>{alert.product}</strong>
                            <span>In Stock: {alert.stock}</span>
                          </div>
                          <span className="alert-status" style={{ color: alert.color }}>{alert.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
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
            <div className="inventory-tab">
              <div className="card-header">
                <h2>Inventory Management</h2>
                <div className="orders-header-actions">
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={invSearchTerm}
                    onChange={(e) => setInvSearchTerm(e.target.value)}
                    className="admin-search-input"
                  />
                  <button className="primary-btn" onClick={() => setActiveTab('overview')}>← Overview</button>
                </div>
              </div>

              <div className="content-card">
                {inventoryLoading ? (
                  <p>Synchronizing Stock...</p>
                ) : (
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Category</th>
                        <th>Price</th>
                        <th>Stock</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventory
                        .filter(p =>
                          p.name.toLowerCase().includes(invSearchTerm.toLowerCase()) ||
                          p.brand?.toLowerCase().includes(invSearchTerm.toLowerCase()) ||
                          p.category?.toLowerCase().includes(invSearchTerm.toLowerCase())
                        )
                        .length > 0 ? (
                        inventory
                          .filter(p =>
                            p.name.toLowerCase().includes(invSearchTerm.toLowerCase()) ||
                            p.brand?.toLowerCase().includes(invSearchTerm.toLowerCase()) ||
                            p.category?.toLowerCase().includes(invSearchTerm.toLowerCase())
                          )
                          .map((product) => (
                            <tr key={product._id}>
                              <td>
                                <div className="table-product-info">
                                  <img src={product.image} alt="" className="tiny-thumb" />
                                  <div className="name-brand">
                                    <strong>{product.name}</strong>
                                    <span>{product.brand}</span>
                                  </div>
                                </div>
                              </td>
                              <td>{product.category}</td>
                              <td>
                                <div className="inline-edit">
                                  <span>₹</span>
                                  <input
                                    type="number"
                                    defaultValue={product.price}
                                    onBlur={(e) => updateProductInline(product._id, 'price', e.target.value)}
                                    className="inline-input price-input"
                                  />
                                </div>
                              </td>
                              <td>
                                <div className="inline-edit">
                                  <input
                                    type="number"
                                    defaultValue={product.stock}
                                    onBlur={(e) => updateProductInline(product._id, 'stock', e.target.value)}
                                    className={`inline-input stock-input ${product.stock < 5 ? 'critical' : ''}`}
                                  />
                                </div>
                              </td>
                              <td>
                                <button
                                  className="delete-icon-btn"
                                  onClick={() => deleteProduct(product._id)}
                                  title="Delete Product"
                                >
                                  🗑️
                                </button>
                              </td>
                            </tr>
                          ))
                      ) : (
                        <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>No products found matching "{invSearchTerm}"</td></tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {activeTab === 'customers' && (
            <div className="users-tab">
              <div className="card-header">
                <h2>Customer Management</h2>
                <div className="orders-header-actions">
                  <input
                    type="text"
                    placeholder="Search customers..."
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    className="admin-search-input"
                  />
                  <button className="primary-btn" onClick={() => setActiveTab('overview')}>← Overview</button>
                </div>
              </div>

              <div className="content-card">
                {usersLoading ? (
                  <p>Fetching User Intelligence...</p>
                ) : (
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Joined Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users
                        .filter(u =>
                          u.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                          u.email.toLowerCase().includes(userSearchTerm.toLowerCase())
                        )
                        .length > 0 ? (
                        users
                          .filter(u =>
                            u.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                            u.email.toLowerCase().includes(userSearchTerm.toLowerCase())
                          )
                          .map((u) => (
                            <tr key={u._id}>
                              <td><strong>{u.name}</strong></td>
                              <td>{u.email}</td>
                              <td>
                                <span className={`role-pill ${u.role}`}>
                                  {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                                </span>
                              </td>
                              <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                            </tr>
                          ))
                      ) : (
                        <tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>No customers found matching "{userSearchTerm}"</td></tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
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
                    await fetch('http://localhost:5000/api/banners', { method: 'POST', body: formData });
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
                      <img src={`http://localhost:5000${b.image}`} style={{ width: '100px', height: '50px', objectFit: 'cover' }} alt="" />
                      <div style={{ flex: 1 }}>
                        <strong>{b.title}</strong>
                        <p style={{ fontSize: '0.8rem', color: '#666' }}>{b.link}</p>
                      </div>
                      <button className="delete-icon-btn" onClick={async () => {
                        if (!window.confirm("Delete?")) return;
                        await fetch(`http://localhost:5000/api/banners/${b._id}`, { method: 'DELETE' });
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
                            <img src={`http://localhost:5000${r.productImage}`} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} alt="" />
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
                                await fetch(`http://localhost:5000/api/reviews/${r.productId}/${r.reviewId}`, { method: 'DELETE' });
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

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="admin-modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Order Details: #RD-{selectedOrder._id.toString().slice(-6).toUpperCase()}</h3>
              <button className="close-modal" onClick={() => setSelectedOrder(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="detail-row">
                <strong>Customer:</strong> {selectedOrder.customerId}
              </div>
              <div className="detail-row">
                <strong>Total Amount:</strong> ₹{selectedOrder.totalAmount?.toLocaleString()}
              </div>
              <div className="detail-row">
                <strong>Status:</strong> {selectedOrder.status || 'Pending'}
              </div>
              <div className="detail-row">
                <strong>Shipping Address:</strong> {selectedOrder.shippingAddress || 'N/A'}
              </div>

              <h4 style={{ marginTop: '20px', marginBottom: '10px' }}>Items Purchased</h4>
              <div className="items-list">
                {selectedOrder.items.map((item, idx) => (
                  <div key={idx} className="order-item-detail">
                    <img src={item.image} alt="" className="item-thumb" />
                    <div className="item-info">
                      <strong>{item.name}</strong>
                      <span>₹{item.price?.toLocaleString()} x {item.quantity}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
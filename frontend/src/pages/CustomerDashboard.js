// src/pages/CustomerDashboard.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './CustomerDashboard.css';

const CustomerDashboard = ({ user, onLogout }) => {
  const [customer, setCustomer] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [avatarPhoto, setAvatarPhoto] = useState(null);
  const [measurements, setMeasurements] = useState({ height: '', weight: '', chest: '', waist: '', hips: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (user && user.role === 'customer') {
      setCustomer(user);
    } else {
      const savedUser = JSON.parse(localStorage.getItem('user'));
      if (!savedUser || savedUser.role !== 'customer') navigate('/');
      setCustomer(savedUser);
    }
  }, [user, navigate]);

  const handleLogout = () => {
    onLogout();
    navigate('/');
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) setAvatarPhoto(URL.createObjectURL(file));
  };

  const handleMeasurementChange = (e) => {
    setMeasurements({ ...measurements, [e.target.name]: e.target.value });
  };

  const handleProfileUpdate = () => alert('Profile updated successfully!');
  const handlePayment = () => alert('Proceeding to payment...');

  const customerData = {
    recentOrders: [],
    virtualTryOns: [],
    wishlist: [],
    cart: [],
    recommendations: [
      { id: 1, name: 'Summer Dress', price: 49.99 },
      { id: 2, name: 'Leather Bag', price: 89.99 },
      { id: 3, name: 'Sneakers', price: 79.99 },
      { id: 4, name: 'Denim Jacket', price: 99.99 },
    ],
    catalog: [
      { id: 1, name: 'Summer Dress', price: 49.99 },
      { id: 2, name: 'Jeans', price: 59.99 },
      { id: 3, name: 'Sneakers', price: 89.99 },
      { id: 4, name: 'Leather Bag', price: 99.99 },
      { id: 5, name: 'T-Shirt', price: 29.99 },
    ],
  };

  if (!customer) return <div className="loading">Loading...</div>;

  return (
    <div className="customer-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="logo" onClick={() => setActiveTab('home')}>SmartStyle</div>
        <input
          type="text"
          placeholder="Search for products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-bar"
        />
        <div className="header-icons">
          <div className="cart-icon" onClick={() => setActiveTab('cart')}>🛒</div>
          <div className="offers-icon">🎁</div>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </header>

      {/* Category Bar */}
      <div className="category-bar">
        {['Dresses', 'Shoes', 'Accessories', 'Offers', 'New Arrivals'].map(cat => (
          <div key={cat} className="category-item">{cat}</div>
        ))}
      </div>

      {/* Dashboard Body */}
      <div className="dashboard-body">
        {/* Sidebar */}
        <aside className="profile-sidebar">
          <div className="sidebar-nav">
            {['home', 'profile', 'orders', 'wishlist', 'cart', 'avatar'].map(tab => (
              <div
                key={tab}
                className={`sidebar-tab ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </div>
            ))}
          </div>
        </aside>

        {/* Main Content */}
        <main className="dashboard-main">
          {/* Home */}
          {activeTab === 'home' && (
            <>
              <h2>Quick Stats</h2>
              <div className="quick-stats">
                <div className="stat-card">Orders: {customerData.recentOrders.length}</div>
                <div className="stat-card">Try-Ons: {customerData.virtualTryOns.length}</div>
                <div className="stat-card">Wishlist: {customerData.wishlist.length}</div>
              </div>

              <h2>Recommended For You</h2>
              <div className="recommendations-grid">
                {customerData.recommendations.map(item => (
                  <div key={item.id} className="recommendation-card">
                    <h4>{item.name}</h4>
                    <p>${item.price}</p>
                    <button className="buy-btn">Add to Cart</button>
                  </div>
                ))}
              </div>

              <h2>Catalog</h2>
              <div className="catalog-grid">
                {customerData.catalog.map(item => (
                  <div key={item.id} className="catalog-card">
                    <h4>{item.name}</h4>
                    <p>${item.price}</p>
                    <button className="buy-btn">Add to Cart</button>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Profile */}
          {activeTab === 'profile' && (
            <div className="profile-section">
              <h2>My Profile</h2>
              <input type="text" placeholder="Name" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} />
              <input type="email" placeholder="Email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} />
              <input type="text" placeholder="Phone" value={customer.phone || ''} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} />
              <select value={customer.gender || ''} onChange={(e) => setCustomer({ ...customer, gender: e.target.value })}>
                <option value="">Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
              <input type="text" placeholder="Address" value={customer.address || ''} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} />
              <button className="primary-btn" onClick={handleProfileUpdate}>Update Profile</button>
            </div>
          )}

          {/* Orders */}
          {activeTab === 'orders' && (
            <>
              <h2>My Orders</h2>
              {customerData.recentOrders.length === 0 ? <p>No orders yet.</p> : <div>Orders List Here</div>}
            </>
          )}

          {/* Wishlist */}
          {activeTab === 'wishlist' && (
            <>
              <h2>Wishlist</h2>
              {customerData.wishlist.length === 0 ? <p>Wishlist is empty.</p> : <div>Wishlist Items Here</div>}
            </>
          )}

          {/* Cart */}
          {activeTab === 'cart' && (
            <div className="cart-section">
              <h2>Cart</h2>
              {customerData.cart.length === 0 ? (
                <p>Your cart is empty.</p>
              ) : (
                <div>Cart Items Here</div>
              )}
              <div className="cart-summary">
                <p>Total: $0.00</p>
                <button className="primary-btn" onClick={handlePayment}>Proceed to Payment</button>
              </div>
            </div>
          )}

          {/* Avatar */}
          {activeTab === 'avatar' && (
            <div className="avatar-section">
              <h2>Avatar & Measurements</h2>
              <input type="file" accept="image/*" onChange={handlePhotoUpload} />
              {avatarPhoto && <img src={avatarPhoto} alt="Avatar" className="avatar-preview" />}
              <h4>Measurements</h4>
              {['height', 'weight', 'chest', 'waist', 'hips'].map(m => (
                <input key={m} name={m} placeholder={m.charAt(0).toUpperCase() + m.slice(1)} value={measurements[m]} onChange={handleMeasurementChange} />
              ))}
              <button className="primary-btn">Generate Avatar</button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default CustomerDashboard;

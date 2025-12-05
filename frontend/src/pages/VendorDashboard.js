// src/pages/VendorDashboard.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './VendorDashboard.css';

const VendorDashboard = ({ user, onLogout, addProduct }) => {
  const navigate = useNavigate();
  const vendorUser = user || JSON.parse(localStorage.getItem('user')) || { name: 'Vendor', shopName: 'My Shop' };

  const [activeTab, setActiveTab] = useState('home');
  const [products, setProducts] = useState([]);
  const [newProduct, setNewProduct] = useState({
    name: '',
    price: '',
    category: '',
    stock: '',
    image: null,
  });
  const [analytics, setAnalytics] = useState([]);

  // Load products and analytics once on mount
  useEffect(() => {
    const savedProducts = JSON.parse(localStorage.getItem('vendorProducts')) || [];
    setProducts(savedProducts);

    const savedAnalytics = JSON.parse(localStorage.getItem('vendorAnalytics'));
    if (savedAnalytics) {
      setAnalytics(savedAnalytics);
    } else {
      // Initialize analytics for all products
      const analyticsData = savedProducts.map(p => ({
        id: p.id,
        name: p.name,
        stock: p.stock,
        orders: 0, // start with 0 orders
      }));
      setAnalytics(analyticsData);
      localStorage.setItem('vendorAnalytics', JSON.stringify(analyticsData));
    }
  }, []);

  const handleLogout = () => {
    onLogout();
    navigate('/');
  };

  const handleProductChange = (e) => {
    const { name, value, files } = e.target;
    if (files) {
      setNewProduct({ ...newProduct, image: URL.createObjectURL(files[0]) });
    } else {
      setNewProduct({ ...newProduct, [name]: value });
    }
  };

  const handleAddProduct = () => {
    if (!newProduct.name || !newProduct.price || !newProduct.category) {
      alert('Please fill in all required fields.');
      return;
    }
    const newProd = { ...newProduct, id: Date.now() };
    const updatedProducts = [...products, newProd];
    setProducts(updatedProducts);
    localStorage.setItem('vendorProducts', JSON.stringify(updatedProducts));

    // Update analytics
    const newAnalytics = [...analytics, { id: newProd.id, name: newProd.name, stock: newProd.stock, orders: 0 }];
    setAnalytics(newAnalytics);
    localStorage.setItem('vendorAnalytics', JSON.stringify(newAnalytics));

    if (addProduct) addProduct(newProd);

    setNewProduct({ name: '', price: '', category: '', stock: '', image: null });
    alert('Product added successfully!');
  };

  const handleRemoveProduct = (id) => {
    const filteredProducts = products.filter(p => p.id !== id);
    setProducts(filteredProducts);
    localStorage.setItem('vendorProducts', JSON.stringify(filteredProducts));

    const filteredAnalytics = analytics.filter(a => a.id !== id);
    setAnalytics(filteredAnalytics);
    localStorage.setItem('vendorAnalytics', JSON.stringify(filteredAnalytics));

    alert('Product removed!');
  };

  return (
    <div className="vendor-dashboard">
      {/* Sidebar */}
      <aside className="vendor-sidebar">
        <h2>{vendorUser.shopName}</h2>
        {['home', 'profile', 'products', 'analytics'].map(tab => (
          <div
            key={tab}
            className={`sidebar-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </div>
        ))}
        <div className="logout-bottom">
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="vendor-main">
        {/* Home / Catalog */}
        {activeTab === 'home' && (
          <div className="home-section">
            <h2>Catalog</h2>
            <div className="product-grid">
              {products.length === 0 ? (
                <p>No products yet.</p>
              ) : (
                products.map(p => (
                  <div key={p.id} className="product-card">
                    {p.image && <img className="product-image-small" src={p.image} alt={p.name} />}
                    <h4>{p.name}</h4>
                    <p>₹{p.price}</p>
                    <p>Category: {p.category}</p>
                    <p>Stock: {p.stock}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Profile */}
        {activeTab === 'profile' && (
          <div className="profile-section">
            <h2>Profile / Shop Details</h2>
            <input type="text" placeholder="Vendor Name" value={vendorUser.name} onChange={(e) => vendorUser.name = e.target.value} />
            <input type="text" placeholder="Shop Name" value={vendorUser.shopName} onChange={(e) => vendorUser.shopName = e.target.value} />
            <input type="email" placeholder="Email" value={vendorUser.email || ''} />
            <input type="text" placeholder="Phone" value={vendorUser.phone || ''} />
            <textarea placeholder="Address" value={vendorUser.address || ''}></textarea>
            <button className="primary-btn">Update Profile</button>
          </div>
        )}

        {/* Products */}
        {activeTab === 'products' && (
          <div className="products-section">
            <h2>Manage Products</h2>
            <div className="add-product-form">
              <input type="text" name="name" placeholder="Product Name" value={newProduct.name} onChange={handleProductChange} />
              <input type="number" name="price" placeholder="Price" value={newProduct.price} onChange={handleProductChange} />
              <input type="text" name="category" placeholder="Category" value={newProduct.category} onChange={handleProductChange} />
              <input type="number" name="stock" placeholder="Stock Quantity" value={newProduct.stock} onChange={handleProductChange} />
              <input type="file" name="image" onChange={handleProductChange} />
              <button className="primary-btn" onClick={handleAddProduct}>Add Product</button>
            </div>

            <h3>Existing Products</h3>
            <div className="product-grid">
              {products.length === 0 ? <p>No products yet.</p> : products.map(p => (
                <div key={p.id} className="product-card">
                  {p.image && <img className="product-image-small" src={p.image} alt={p.name} />}
                  <h4>{p.name}</h4>
                  <p>₹{p.price}</p>
                  <p>Stock: {p.stock}</p>
                  <p>Category: {p.category}</p>
                  <button className="remove-btn-rect" onClick={() => handleRemoveProduct(p.id)}>Remove</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Analytics */}
        {activeTab === 'analytics' && (
          <div>
            <h2>Analytics</h2>
            {analytics.length === 0 ? <p>No products yet.</p> :
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Stock</th>
                    <th>Orders</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.map((a) => (
                    <tr key={a.id}>
                      <td>{a.name}</td>
                      <td>{a.stock}</td>
                      <td>{a.orders}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            }
          </div>
        )}
      </main>
    </div>
  );
};

export default VendorDashboard;

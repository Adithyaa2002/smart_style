// src/pages/VendorDashboard.js
import axios from "axios";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./VendorDashboard.css";
import { toast } from "react-toastify";


const VendorDashboard = ({ user, onLogout }) => {
  const navigate = useNavigate();

  const [vendorUser, setVendorUser] = useState(
    user ||
    JSON.parse(localStorage.getItem("user")) || {
      name: "",
      shopName: "",
      email: "",
      phone: "",
      address: "",
      businessType: "",
      gstNumber: ""
    }
  );

  const [activeTab, setActiveTab] = useState("home");
  const [products, setProducts] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false); // NEW: Toggle state

  const [newProduct, setNewProduct] = useState({
    name: "",
    price: "",
    category: "", // Default
    gender: "",   // Default
    brand: "",   // Default
    sizes: "",       // Comma separated
    colors: "",      // Comma separated
    description: "",
    stock: "",
    image: null,
    sizeChart: {}, // Stores { "S": { chest: 34, ... }, "M": ... }
  });

  // ---- Fetch products from backend ----
  useEffect(() => {
    axios
      .get("http://localhost:5000/api/products")
      .then((res) => setProducts(res.data))
      .catch((err) => console.log(err));
  }, []);

  useEffect(() => {
    if (!vendorUser?.email) return;

    axios
      .get(`http://localhost:5000/api/vendor/${vendorUser.email}`)
      .then(res => {
        if (res.data) setVendorUser(res.data);
      })
      .catch(err => console.log("Failed to load vendor profile"));
  }, [vendorUser?.email]);

  const [analyticsData, setAnalyticsData] = useState({});

  useEffect(() => {
    if (activeTab === "analytics" && vendorUser?.email) {
      axios.get(`http://localhost:5000/api/vendor/analytics/${vendorUser.email}`)
        .then(res => setAnalyticsData(res.data))
        .catch(err => console.error("Analytics Error:", err));
    }
  }, [activeTab, vendorUser]);

  // ---- Logout ----
  const handleLogout = () => {
    onLogout();
    navigate("/");
  };

  // ---- Detect form updates ----
  const handleProductChange = (e) => {
    const { name, value, files } = e.target;

    if (files) {
      setNewProduct({ ...newProduct, [name]: files[0] });
    } else {
      setNewProduct({ ...newProduct, [name]: value });
    }
  };

  // ---- Add Product ----
  const handleAddProduct = async () => {
    // Validation
    if (!newProduct.name || !newProduct.price || !newProduct.category || !newProduct.gender || !newProduct.brand || !newProduct.stock) {
      alert("❌ Please fill in all required fields (Category, Gender, Brand, etc.)");
      return;
    }

    const formData = new FormData();
    formData.append("name", newProduct.name);
    formData.append("price", newProduct.price);
    formData.append("category", newProduct.category);
    formData.append("gender", newProduct.gender);
    formData.append("brand", newProduct.brand);
    formData.append("sizes", newProduct.sizes);
    formData.append("colors", newProduct.colors);
    formData.append("description", newProduct.description);
    formData.append("stock", newProduct.stock);
    formData.append("vendorId", vendorUser.email || vendorUser.name);

    if (newProduct.image) {
      formData.append("image", newProduct.image);
    }
    if (newProduct.model3D) {
      formData.append("model3D", newProduct.model3D);
    }

    // Add Size Chart
    if (newProduct.sizeChart) {
      formData.append("sizeChart", JSON.stringify(newProduct.sizeChart));
    }

    try {
      const res = await axios.post(
        "http://localhost:5000/api/products",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setProducts([...products, res.data]);
      setNewProduct({ name: "", price: "", category: "", stock: "", image: null, model3D: null });
      alert("🎉 Product uploaded successfully!");
    } catch (err) {
      console.log(err.response?.data || err);
      alert("❌ Upload failed.");
    }
  };

  // ---- Delete Product ----
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this product?")) return;

    try {
      await axios.delete(`http://localhost:5000/api/products/${id}`);
      setProducts(products.filter((p) => p._id !== id));
      alert("🗑️ Product deleted successfully!");
    } catch (err) {
      console.log(err);
      alert("❌ Delete failed");
    }
  };

  // ---- Save Edited Product ----
  const handleSaveEdit = async () => {
    try {
      const res = await axios.put(
        `http://localhost:5000/api/products/${editingProduct._id}`,
        editingProduct
      );

      setProducts(
        products.map((p) => (p._id === editingProduct._id ? res.data : p))
      );

      setEditingProduct(null);
      alert("✏️ Product updated successfully!");
    } catch (err) {
      console.log(err);
      alert("❌ Update failed");
    }
  };

  return (
    <div className="vendor-dashboard">
      {/* Sidebar */}
      <aside className="vendor-sidebar">
        <h2>{vendorUser.shopName}</h2>

        {["home", "profile", "products", "analytics"].map((tab) => (
          <div
            key={tab}
            className={`sidebar-tab ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </div>
        ))}

        <div className="logout-bottom">
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="vendor-main">
        {/* ---- HOME ---- */}
        {activeTab === "home" && (
          <div className="home-section">
            <h2>Catalog</h2>
            <div className="product-grid">
              {products.length === 0 ? (
                <p>No products yet.</p>
              ) : (
                products.map((p) => (
                  <div key={p._id} className="product-card">

                    {p.image && (
                      <img
                        className="product-image-small"
                        src={`http://localhost:5000${p.image}`}
                        alt={p.name}
                      />
                    )}

                    <h4>{p.name}</h4>
                    <p>₹{p.price}</p>
                    <p>Category: {p.category}</p>
                    <p>Stock: {p.stock}</p>

                    <button onClick={() => setEditingProduct(p)} className="edit-btn">
                      Edit
                    </button>
                    <button
                      className="remove-btn-rect"
                      onClick={() => handleDelete(p._id)}
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
        {activeTab === "profile" && (
          <div className="profile-section">
            <h2>🏪 Vendor Profile</h2>

            {!isEditingProfile ? (
              // ---- VIEW MODE ----
              <div className="profile-view-card">
                <div className="profile-row">
                  <strong>Vendor Name:</strong> <span>{vendorUser.name || "N/A"}</span>
                </div>
                <div className="profile-row">
                  <strong>Shop Name:</strong> <span>{vendorUser.shopName || "N/A"}</span>
                </div>
                <div className="profile-row">
                  <strong>Email:</strong> <span>{vendorUser.email}</span>
                </div>
                <div className="profile-row">
                  <strong>Phone:</strong> <span>{vendorUser.phone || "N/A"}</span>
                </div>
                <div className="profile-row">
                  <strong>Business Type:</strong> <span>{vendorUser.businessType || "N/A"}</span>
                </div>
                <div className="profile-row">
                  <strong>GST Number:</strong> <span>{vendorUser.gstNumber || "N/A"}</span>
                </div>
                <div className="profile-row">
                  <strong>Address:</strong> <span>{vendorUser.address || "N/A"}</span>
                </div>

                <button className="primary-btn" onClick={() => setIsEditingProfile(true)} style={{ marginTop: "20px" }}>
                  Edit Profile
                </button>
              </div>
            ) : (
              // ---- EDIT MODE ----
              <div className="profile-edit-form">
                <div className="form-group">
                  <label>Vendor Name</label>
                  <input
                    type="text"
                    placeholder="Vendor Name"
                    value={vendorUser.name || ""}
                    onChange={(e) => setVendorUser({ ...vendorUser, name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Shop Name</label>
                  <input
                    type="text"
                    placeholder="Shop Name"
                    value={vendorUser.shopName || ""}
                    onChange={(e) => setVendorUser({ ...vendorUser, shopName: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Email (Cannot be changed)</label>
                  <input type="email" value={vendorUser.email || ""} disabled className="disabled-input" />
                </div>

                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="text"
                    placeholder="Phone Number"
                    value={vendorUser.phone || ""}
                    onChange={(e) => setVendorUser({ ...vendorUser, phone: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Business Type</label>
                  <input
                    type="text"
                    placeholder="Boutique / Designer / Retailer"
                    value={vendorUser.businessType || ""}
                    onChange={(e) => setVendorUser({ ...vendorUser, businessType: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>GST Number</label>
                  <input
                    type="text"
                    placeholder="GST Number"
                    value={vendorUser.gstNumber || ""}
                    onChange={(e) => setVendorUser({ ...vendorUser, gstNumber: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Shop Address</label>
                  <textarea
                    placeholder="Shop Address"
                    value={vendorUser.address || ""}
                    onChange={(e) => setVendorUser({ ...vendorUser, address: e.target.value })}
                  />
                </div>

                <div className="button-group" style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <button
                    className="save-profile-btn"
                    onClick={async () => {
                      try {
                        const res = await axios.put(
                          `http://localhost:5000/api/vendor/${vendorUser.email}`,
                          vendorUser
                        );
                        toast.success("✅ Profile saved successfully");
                        localStorage.setItem("user", JSON.stringify(res.data));
                        setIsEditingProfile(false); // Switch back to view mode
                      } catch (err) {
                        toast.error("❌ Failed to save profile");
                      }
                    }}
                  >
                    Save Changes
                  </button>

                  <button
                    className="cancel-btn"
                    onClick={() => {
                      setIsEditingProfile(false);
                      // Optional: Reset vendorUser to initial state if needed, but for now just close
                    }}
                    style={{ padding: "10px 20px", background: "#f44336", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ---- PRODUCT ADD PAGE ---- */}
        {/* ---- PRODUCT ADD PAGE ---- */}
        {activeTab === "products" && (
          // ... existing products code ...
          <div className="products-section">
            <h2>Add New Product</h2>
            <div className="add-product-form">
              <input type="text" name="name" placeholder="Product Name" value={newProduct.name} onChange={handleProductChange} />

              <div style={{ display: 'flex', gap: '10px' }}>
                <select name="category" value={newProduct.category} onChange={handleProductChange} style={{ flex: 1, padding: '10px', marginBottom: '10px' }}>
                  <option value="" disabled>Select Category</option>
                  <option value="Topwear">Topwear</option>
                  <option value="Bottomwear">Bottomwear</option>
                  <option value="Footwear">Footwear</option>
                  <option value="Accessories">Accessories</option>
                  <option value="Innerwear">Innerwear</option>
                </select>

                <select name="gender" value={newProduct.gender} onChange={handleProductChange} style={{ flex: 1, padding: '10px', marginBottom: '10px' }}>
                  <option value="" disabled>Select Gender</option>
                  <option value="Men">Men</option>
                  <option value="Women">Women</option>
                  <option value="Kids">Kids</option>
                  <option value="Unisex">Unisex</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <input type="text" name="brand" placeholder="Brand Name" value={newProduct.brand} onChange={handleProductChange} style={{ flex: 1, padding: '10px', marginBottom: '10px' }} />
                <input type="number" name="price" placeholder="Price (₹)" value={newProduct.price} onChange={handleProductChange} style={{ flex: 1 }} />
              </div>

              <textarea name="description" placeholder="Product Description..." value={newProduct.description} onChange={handleProductChange} style={{ width: '100%', height: '80px', padding: '10px', marginBottom: '10px' }} />

              <div style={{ display: 'flex', gap: '10px' }}>
                <input type="text" name="sizes" placeholder="Sizes (S, M, L)" value={newProduct.sizes} onChange={handleProductChange} style={{ flex: 1 }} />
                <input type="text" name="colors" placeholder="Colors (Red, Blue)" value={newProduct.colors} onChange={handleProductChange} style={{ flex: 1 }} />
              </div>

              <input type="number" name="stock" placeholder="Stock Quantity" value={newProduct.stock} onChange={handleProductChange} />

              <label>Product Image</label>
              <input type="file" name="image" accept="image/*" onChange={handleProductChange} />

              <label>3D Model (Optional)</label>
              <input type="file" name="model3D" accept=".glb,.gltf" onChange={handleProductChange} />

              {/* SIZE CHART INPUT */}
              {newProduct.sizes && (
                <div className="size-chart-section" style={{ marginTop: '15px', padding: '10px', background: '#f9f9f9', borderRadius: '8px' }}>
                  <h4>📏 Size Chart Details (Inches)</h4>
                  <p style={{ fontSize: '12px', color: '#666' }}>Enter measurements for each size to help customers fit better.</p>

                  {newProduct.sizes.split(',').map(s => s.trim()).filter(s => s).map(size => (
                    <div key={size} style={{ marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                      <strong style={{ display: 'block', marginBottom: '5px' }}>Size: {size}</strong>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                        {['Chest', 'Waist', 'Hips', 'Length', 'Shoulders', 'Thigh'].map(metric => (
                          <input
                            key={metric}
                            type="text"
                            placeholder={metric}
                            value={newProduct.sizeChart?.[size]?.[metric.toLowerCase()] || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setNewProduct(prev => ({
                                ...prev,
                                sizeChart: {
                                  ...prev.sizeChart,
                                  [size]: {
                                    ...prev.sizeChart?.[size],
                                    [metric.toLowerCase()]: val
                                  }
                                }
                              }));
                            }}
                            style={{ fontSize: '12px', padding: '5px' }}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button className="primary-btn" onClick={handleAddProduct}>Add Product</button>
            </div>
          </div>
        )}

        {/* ---- ANALYTICS ---- */}
        {activeTab === "analytics" && (
          <div className="analytics-section">
            <h2>📊 Shop Analytics</h2>

            {/* Metrics Grid */}
            <div className="analytics-grid">
              <div className="analytics-card">
                <h3>Total Revenue</h3>
                <p className="analytics-value">₹{analyticsData.totalRevenue?.toLocaleString() || 0}</p>
              </div>
              <div className="analytics-card">
                <h3>Orders</h3>
                <p className="analytics-value">{analyticsData.totalOrders || 0}</p>
              </div>
              <div className="analytics-card">
                <h3>Items Sold</h3>
                <p className="analytics-value">{analyticsData.productsSold || 0}</p>
              </div>
            </div>

            {/* Top Products Table */}
            <div className="analytics-table-container">
              <h3>🏆 Top Selling Products</h3>
              {analyticsData.topProducts?.length > 0 ? (
                <table className="analytics-table">
                  <thead>
                    <tr>
                      <th>Product Name</th>
                      <th>Units Sold</th>
                      <th>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyticsData.topProducts.map((p, idx) => (
                      <tr key={idx}>
                        <td>{p.name}</td>
                        <td>{p.quantity}</td>
                        <td>₹{p.revenue.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>No sales data yet.</p>
              )}
            </div>
          </div>
        )}

        {/* ---- EDIT POPUP ---- */}
        {editingProduct && (
          <div className="modal">
            <div className="modal-content">
              <h3>Edit Product</h3>
              <input value={editingProduct.name} onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })} />
              <input type="number" value={editingProduct.price} onChange={(e) => setEditingProduct({ ...editingProduct, price: e.target.value })} />
              <input value={editingProduct.category} onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })} />
              <input type="number" value={editingProduct.stock} onChange={(e) => setEditingProduct({ ...editingProduct, stock: e.target.value })} />
              <button onClick={handleSaveEdit}>Save</button>
              <button onClick={() => setEditingProduct(null)}>Cancel</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default VendorDashboard;

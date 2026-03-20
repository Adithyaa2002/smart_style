// src/pages/VendorDashboard.js
import axios from "axios";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./VendorDashboard.css";
import { toast } from "react-toastify";


const CATEGORY_MEASUREMENTS = {
  "Topwear": ["Chest", "Waist", "Hips", "Length / Height", "Shoulders"],
  "Bottomwear": ["Waist", "Hips", "Thigh", "Inseam", "Outseam"],
  "Dresses": ["Chest", "Waist", "Hips", "Length / Height", "Shoulders"],
  "Footwear": ["US Size", "UK Size", "EU Size", "Foot Length"],
  "Accessories": ["Length", "Width", "Circumference"],
  "Innerwear": ["Waist", "Chest", "Hips"]
};

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
    sizes: [],       // Array
    colors: [],      // Array
    description: "",
    stock: "",
    image: null,
    sizeChart: {}, // Stores { "S": { chest: 34, ... }, "M": ... }
  });

  // ---- Fetch products from backend ----
  useEffect(() => {
    if (vendorUser?.email) {
      axios
        .get(`http://localhost:5000/api/products?vendorId=${vendorUser.email}`)
        .then((res) => setProducts(res.data))
        .catch((err) => console.log(err));
    }
  }, [vendorUser?.email]);

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
    if ((activeTab === "analytics" || activeTab === "payments") && vendorUser?.email) {
      axios.get(`http://localhost:5000/api/vendor/analytics/${vendorUser.email}`)
        .then(res => setAnalyticsData(res.data))
        .catch(err => console.error("Analytics Error:", err));
    }
  }, [activeTab, vendorUser]);

  // ---- Fetch Vendor Orders ----
  const [vendorOrders, setVendorOrders] = useState([]);
  useEffect(() => {
    if (activeTab === "orders" && vendorUser?.email) {
      console.log("Fetching orders for:", vendorUser.email); // DEBUG
      axios.get(`http://localhost:5000/api/vendor/orders/${vendorUser.email}`)
        .then(res => {
          console.log("Orders received:", res.data); // DEBUG
          setVendorOrders(res.data);
        })
        .catch(err => console.error("Orders Fetch Error:", err));
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

    // Handle Sizes Array
    if (Array.isArray(newProduct.sizes)) {
      newProduct.sizes.forEach(s => formData.append("sizes", s));
    } else {
      formData.append("sizes", newProduct.sizes);
    }

    // Handle Colors Array
    if (Array.isArray(newProduct.colors)) {
      newProduct.colors.forEach(c => formData.append("colors", c));
      // Merge custom colors if any (optional feature)
      if (newProduct.customColors && Array.isArray(newProduct.customColors)) {
        newProduct.customColors.forEach(c => formData.append("colors", c));
      }
    } else {
      formData.append("colors", newProduct.colors);
    }

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
      // ✅ Pass vendorId to verify ownership
      await axios.delete(`http://localhost:5000/api/products/${id}?vendorId=${vendorUser.email}`);
      setProducts(products.filter((p) => p._id !== id));
      alert("🗑️ Product deleted successfully!");
    } catch (err) {
      console.log(err);
      alert("❌ Delete failed: Unauthorized");
    }
  };

  // ---- Save Edited Product ----
  // ---- Save Edited Product ----
  const handleSaveEdit = async () => {
    try {
      const formData = new FormData();
      formData.append("vendorId", vendorUser.email || vendorUser.name || "");

      // Fields to sync
      const fields = ["name", "price", "description", "category", "gender", "brand", "stock"];
      fields.forEach(f => {
        if (editingProduct[f] !== undefined && editingProduct[f] !== null) {
          formData.append(f, editingProduct[f]);
        }
      });

      // Handle Arrays (Backend handles strings or can split them)
      if (editingProduct.sizes) {
        const sValue = Array.isArray(editingProduct.sizes) ? editingProduct.sizes.join(",") : editingProduct.sizes;
        formData.append("sizes", sValue);
      }
      if (editingProduct.colors) {
        const cValue = Array.isArray(editingProduct.colors) ? editingProduct.colors.join(",") : editingProduct.colors;
        formData.append("colors", cValue);
      }

      // If a new model3D was picked
      if (editingProduct.newModel3D) {
        formData.append("model3D", editingProduct.newModel3D);
      }

      // If a new image was picked (v2 support)
      if (editingProduct.newImage) {
        formData.append("image", editingProduct.newImage);
      }

      // Sync Size Chart
      if (editingProduct.sizeChart) {
        formData.append("sizeChart", JSON.stringify(editingProduct.sizeChart));
      }

      const res = await axios.put(
        `http://localhost:5000/api/products/${editingProduct._id}`,
        formData
      );

      setProducts(
        products.map((p) => (p._id === editingProduct._id ? res.data : p))
      );

      setEditingProduct(null);
      toast.success("✏️ Product updated successfully!");
    } catch (err) {
      console.error("Update Error:", err.response?.data || err.message);
      const errMsg = err.response?.data?.message || err.response?.data?.error || "Update failed.";
      alert(`❌ ${errMsg}`);
    }
  };

  return (
    <div className="vendor-dashboard">
      {/* Sidebar */}
      <aside className="vendor-sidebar">
        <h2>{vendorUser.shopName} <small style={{ fontSize: '0.6rem' }}>(v2.0)</small></h2>

        {["home", "profile", "products", "orders", "payments", "analytics"].map((tab) => (
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
                    <p style={{ color: p.stock < 5 ? 'red' : 'inherit', fontWeight: p.stock < 5 ? 'bold' : 'normal' }}>
                      Stock: {p.stock} {p.stock < 5 && '⚠️ Low Stock!'}
                    </p>

                    <button onClick={() => {
                      console.log("🛠️ Editing Product:", p);
                      console.log("📏 Size Chart:", p.sizeChart);
                      setEditingProduct(p);
                    }} className="edit-btn">
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
                  <option value="Dresses">Dresses</option>
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
                <div style={{ flex: 1, marginBottom: '10px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Available Sizes</label>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {["XS", "S", "M", "L", "XL", "XXL", "3XL"].map(size => (
                      <label key={size} style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', background: '#eee', padding: '5px 10px', borderRadius: '4px' }}>
                        <input
                          type="checkbox"
                          checked={Array.isArray(newProduct.sizes) ? newProduct.sizes.includes(size) : (newProduct.sizes || '').split(',').map(s => s.trim()).includes(size)}
                          onChange={(e) => {
                            const currentSizes = Array.isArray(newProduct.sizes) ? newProduct.sizes : (newProduct.sizes ? (newProduct.sizes || '').split(',').map(s => s.trim()) : []);
                            let updatedSizes;
                            if (e.target.checked) {
                              updatedSizes = [...currentSizes, size];
                            } else {
                              updatedSizes = currentSizes.filter(s => s !== size);
                            }
                            setNewProduct({ ...newProduct, sizes: updatedSizes });
                          }}
                        />
                        {size}
                      </label>
                    ))}
                  </div>
                </div>
                <div style={{ flex: 1, marginBottom: '10px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Available Colors</label>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {["Red", "Blue", "Green", "Black", "White", "Yellow", "Pink", "Purple", "Grey", "Orange", "Brown"].map(color => (
                      <label key={color} style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', background: '#eee', padding: '5px 10px', borderRadius: '4px', border: (Array.isArray(newProduct.colors) ? newProduct.colors.includes(color) : (newProduct.colors || '').split(',').map(c => c.trim()).includes(color)) ? `2px solid ${color.toLowerCase()}` : '2px solid transparent' }}>
                        <input
                          type="checkbox"
                          checked={Array.isArray(newProduct.colors) ? newProduct.colors.includes(color) : (newProduct.colors || '').split(',').map(c => c.trim()).includes(color)}
                          onChange={(e) => {
                            const currentColors = Array.isArray(newProduct.colors) ? newProduct.colors : (newProduct.colors ? (newProduct.colors || '').split(',').map(c => c.trim()) : []);
                            let updatedColors;
                            if (e.target.checked) {
                              updatedColors = [...currentColors, color];
                            } else {
                              updatedColors = currentColors.filter(c => c !== color);
                            }
                            setNewProduct({ ...newProduct, colors: updatedColors });
                          }}
                        />
                        <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: color.toLowerCase(), border: '1px solid #ccc', display: 'inline-block' }}></span>
                        {color}
                      </label>
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder="Other Colors (comma separated)"
                    style={{ marginTop: '10px', width: '100%', fontSize: '0.8rem' }}
                    onChange={(e) => {
                      // Assuming users might want to add custom ones. 
                      // For simplicity layout, let's keep it simple or append to array? 
                      // Let's just stick to checkboxes as requested for now, or add this as valid functionality
                      const specials = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                      setNewProduct(prev => ({ ...prev, customColors: specials }));
                    }}
                  />
                  <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>Selected: {Array.isArray(newProduct.colors) ? newProduct.colors.join(', ') : newProduct.colors}</p>
                </div>
              </div>
              <p style={{ fontSize: '12px', color: '#666', marginTop: '-5px', marginBottom: '10px' }}>Selected: {Array.isArray(newProduct.sizes) ? newProduct.sizes.join(', ') : newProduct.sizes}</p>

              <input type="number" name="stock" placeholder="Stock Quantity" value={newProduct.stock} onChange={handleProductChange} />

              <label>Product Image</label>
              <input type="file" name="image" accept=".png, .jpg, .jpeg, .webp, .gif, .bmp, .tiff" onChange={handleProductChange} />

              <label>3D Model (Optional)</label>
              <input type="file" name="model3D" accept=".glb, .gltf" onChange={handleProductChange} />

              {/* SIZE CHART INPUT */}
              {(Array.isArray(newProduct.sizes) && newProduct.sizes.length > 0) && (
                <div className="size-chart-section" style={{ marginTop: '15px', padding: '10px', background: '#f9f9f9', borderRadius: '8px' }}>
                  <h4>📏 Size Chart Details (Inches)</h4>
                  <p style={{ fontSize: '12px', color: '#666' }}>Enter measurements for Each Size ( {newProduct.category || "General"} Category ).</p>

                  {newProduct.sizes.map(size => {
                    const metrics = CATEGORY_MEASUREMENTS[newProduct.category] || ['Chest', 'Waist', 'Hips', 'Length / Height', 'Shoulders', 'Thigh'];
                    return (
                      <div key={size} style={{ marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                        <strong style={{ display: 'block', marginBottom: '5px' }}>Size: {size}</strong>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '8px' }}>
                          {metrics.map(metric => (
                            <div key={metric}>
                              <label style={{ fontSize: '10px', color: '#666', display: 'block' }}>{metric}</label>
                              <input
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
                                style={{ fontSize: '12px', padding: '5px', width: '100%' }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <button className="primary-btn" onClick={handleAddProduct}>Add Product</button>
            </div>
          </div>
        )}

        {/* ---- ORDERS TAB ---- */}
        {activeTab === "orders" && (
          <div className="orders-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>📦 Customer Orders</h2>
              {vendorOrders.length > 0 && (
                <button
                  onClick={() => {
                    const headers = ["Order ID,Date,Customer Address,Items,Total,Status"];
                    const rows = vendorOrders.map(o => {
                      const items = o.items.map(i => `${i.name} (x${i.quantity})`).join(' | ');
                      return `${o._id},${new Date(o.createdAt).toLocaleDateString()},"${(o.customerAddress || '').replace(/"/g, '""')}","${items}",${o.totalData},${o.status}`;
                    });
                    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
                    const link = document.createElement("a");
                    link.href = encodeURI(csvContent);
                    link.download = "orders_export.csv";
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                  }}
                  className="secondary-btn"
                  style={{ fontSize: '0.9rem', padding: '8px 15px' }}
                >
                  📥 Export CSV
                </button>
              )}
            </div>
            {vendorOrders.length === 0 ? (
              <p>No orders found.</p>
            ) : (
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th>Order Date</th>
                    <th>Customer Address</th>
                    <th>Items</th>
                    <th>Total (Your Share)</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {vendorOrders.map((order) => (
                    <tr key={order._id}>
                      <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                      <td style={{ maxWidth: '200px' }}>{order.customerAddress || "N/A"}</td>
                      <td>
                        {order.items.map((item, i) => (
                          <div key={i} style={{ display: 'flex', gap: '5px', alignItems: 'center', marginBottom: '5px' }}>
                            <img src={item.image?.startsWith("http") ? item.image : `http://localhost:5000${item.image}`} alt="" style={{ width: '30px', height: '30px', borderRadius: '4px' }} />
                            <span style={{ fontSize: '0.85rem' }}>
                              {item.name} (x{item.quantity})
                            </span>
                          </div>
                        ))}
                      </td>
                      <td>₹{order.totalData.toLocaleString()}</td>
                      <td>
                        <select
                          value={order.status || 'Pending'}
                          onChange={async (e) => {
                            const newStatus = e.target.value;
                            try {
                              await axios.patch(`http://localhost:5000/api/orders/${order._id}/status`, { status: newStatus });
                              // Optimistic update
                              setVendorOrders(prev => prev.map(o => o._id === order._id ? { ...o, status: newStatus } : o));
                              toast.success(`Order marked as ${newStatus}`);
                            } catch (err) { toast.error("Failed to update status"); }
                          }}
                          className={`status-pill ${order.status?.toLowerCase() || 'pending'}`}
                          style={{ border: 'none', outline: 'none', cursor: 'pointer' }}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Shipped">Shipped</option>
                          <option value="Delivered">Delivered</option>
                          <option value="Cancelled">Cancelled</option>
                          <option value="Refunded">Refunded</option>
                        </select>
                      </td>
                      <td>
                        <button
                          className="action-btn"
                          title="Print Tax Invoice"
                          style={{ background: '#607d8b', color: 'white', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', border: 'none' }}
                          onClick={() => {
                            const totalAmount = order.totalData;
                            const taxAmount = (totalAmount * 0.18).toFixed(2); // Assuming 18% GST included
                            const netAmount = (totalAmount - taxAmount).toFixed(2);

                            const invoiceContent = `
                                        <html>
                                            <head>
                                              <title>Invoice #${order._id.slice(-6)}</title>
                                              <style>
                                                body { font-family: 'Helvetica', sans-serif; padding: 40px; color: #333; }
                                                .header { display: flex; justify-content: space-between; border-bottom: 2px solid #eee; padding-bottom: 20px; }
                                                .logo { font-size: 24px; font-weight: bold; color: #e91e63; }
                                                .invoice-title { font-size: 20px; font-weight: bold; text-align: right; }
                                                .meta { margin-top: 20px; display: flex; justify-content: space-between; }
                                                .box { width: 45%; }
                                                table { width: 100%; border-collapse: collapse; margin-top: 30px; }
                                                th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                                                th { background: #f9f9f9; }
                                                .total-section { margin-top: 20px; text-align: right; }
                                                .footer { margin-top: 50px; font-size: 12px; text-align: center; color: #777; border-top: 1px solid #eee; padding-top: 20px; }
                                              </style>
                                            </head>
                                            <body>
                                                <div class="header">
                                                    <div>
                                                        <div class="logo">${vendorUser.shopName || "SmartStyle"}</div>
                                                        <p>${vendorUser.address || "Vendor Address"}</p>
                                                        <p>GSTIN: ${vendorUser.gstNumber || "N/A"}</p>
                                                        <p>Phone: ${vendorUser.phone || "N/A"}</p>
                                                    </div>
                                                    <div>
                                                        <div class="invoice-title">TAX INVOICE</div>
                                                        <p><strong>Order ID:</strong> ${order._id}</p>
                                                        <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
                                                    </div>
                                                </div>

                                                <div class="meta">
                                                    <div class="box">
                                                        <strong>Bill To:</strong>
                                                        <p>${order.customerAddress || 'Customer Address'}</p>
                                                    </div>
                                                    <div class="box">
                                                        <strong>Ship To:</strong>
                                                        <p>${order.customerAddress || 'Customer Address'}</p>
                                                    </div>
                                                </div>

                                                <table>
                                                    <thead>
                                                        <tr>
                                                            <th>Item Description</th>
                                                            <th>Qty</th>
                                                            <th>Unit Price</th>
                                                            <th>Total</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        ${order.items.map(item => `
                                                            <tr>
                                                                <td>${item.name}</td>
                                                                <td>${item.quantity}</td>
                                                                <td>₹${item.price}</td>
                                                                <td>₹${item.quantity * item.price}</td>
                                                            </tr>
                                                        `).join('')}
                                                    </tbody>
                                                </table>

                                                <div class="total-section">
                                                    <p>Subtotal: ₹${netAmount}</p>
                                                    <p>GST (18% Included): ₹${taxAmount}</p>
                                                    <h3>Grand Total: ₹${totalAmount}</h3>
                                                </div>

                                                <div class="footer">
                                                    <p>Thank you for your business!</p>
                                                    <p>This is a computer-generated invoice and does not require a signature.</p>
                                                </div>
                                                <script>window.print();</script>
                                            </body>
                                        </html>
                                    `;
                            const win = window.open('', '', 'width=800,height=900');
                            win.document.write(invoiceContent);
                            win.document.close();
                          }}
                        >
                          📄 Invoice
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ---- PAYMENTS TAB ---- */}
        {activeTab === "payments" && (
          <div className="analytics-section">
            <h2>💰 Payments & Payouts</h2>

            <div className="analytics-grid">
              <div className="analytics-card">
                <h3>Withdrawable Balance</h3>
                <p className="analytics-value" style={{ color: '#4caf50' }}>₹{analyticsData.completedRevenue?.toLocaleString() || 0}</p>
                <small>Revenue from Delivered Orders</small>
              </div>
              <div className="analytics-card">
                <h3>Pending Clearance</h3>
                <p className="analytics-value" style={{ color: '#ff9800' }}>₹{analyticsData.pendingRevenue?.toLocaleString() || 0}</p>
                <small>Orders in Transit / New</small>
              </div>
            </div>

            <div className="content-card" style={{ marginTop: '20px', padding: '20px' }}>
              <h3>🏦 Payout Methods</h3>
              <div className="payment-method-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '24px' }}>🏦</span>
                  <div>
                    <strong>HDFC Bank **** 1234</strong>
                    <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>Primary Account</p>
                  </div>
                </div>
                <button className="secondary-btn">Manage</button>
              </div>
            </div>

            <div className="content-card" style={{ marginTop: '20px', padding: '20px' }}>
              <h3>Request Withdrawal</h3>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '10px' }}>
                <input type="number" placeholder="Enter Amount" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }} />
                <button className="primary-btn" style={{ marginTop: 0 }} onClick={() => toast.success("Withdrawal Request Initiated")}>
                  Withdraw Funds
                </button>
              </div>
              <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '10px' }}>
                ℹ️ Funds are typically credited within 24 hours. Minimum withdrawal: ₹500.
              </p>
            </div>

            <div className="content-card" style={{ marginTop: '20px', padding: '20px' }}>
              <h3>Recent Transactions</h3>
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {analyticsData.transactions?.length > 0 ? (
                    analyticsData.transactions.map((txn, i) => (
                      <tr key={i}>
                        <td>{new Date(txn.date).toLocaleDateString()}</td>
                        <td>{txn.description}</td>
                        <td style={{ color: txn.type === 'credit' ? 'green' : 'red' }}>
                          {txn.type === 'credit' ? '+' : '-'} ₹{txn.amount.toLocaleString()}
                        </td>
                        <td>
                          <span className={`status-pill ${txn.status === 'Completed' ? 'delivered' : 'pending'}`}>
                            {txn.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>No recent transactions.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ---- ANALYTICS ---- */}
        {/* ---- ANALYTICS TAB ---- */}
        {activeTab === "analytics" && (
          <div className="analytics-section">
            <h2>📊 Business Analytics</h2>

            {/* Metric Cards */}
            <div className="analytics-grid">
              <div className="analytics-card">
                <h3>Total Sales (GMV)</h3>
                <p className="analytics-value">₹{analyticsData.totalRevenue?.toLocaleString() || 0}</p>
                <small>Lifetime Revenue</small>
              </div>
              <div className="analytics-card">
                <h3>Orders Processed</h3>
                <p className="analytics-value">{analyticsData.totalOrders || 0}</p>
                <small>Across all products</small>
              </div>
              <div className="analytics-card">
                <h3>Products Sold</h3>
                <p className="analytics-value">{analyticsData.productsSold || 0}</p>
                <small>Units sold</small>
              </div>
            </div>

            {/* Sales Chart */}
            <div className="content-card" style={{ marginTop: '20px', padding: '20px' }}>
              <h3>📈 Sales Trends (Last 6 Months)</h3>
              <div className="chart-container">
                {analyticsData.salesGraph ? (
                  <div className="css-bar-chart">
                    {analyticsData.salesGraph.data.map((val, i) => {
                      const max = Math.max(...analyticsData.salesGraph.data, 1);
                      const height = (val / max) * 100; // Percentage and ensure min height for visibility
                      const barHeight = height > 0 ? `${height}%` : '4px';
                      return (
                        <div key={i} className="chart-bar-group">
                          <div className="chart-bar-wrapper">
                            <div className="chart-bar" style={{ height: barHeight, background: val > 0 ? '#4caf50' : '#ddd' }}>
                              <span className="tooltip">₹{val.toLocaleString()}</span>
                            </div>
                          </div>
                          <span className="chart-label">{analyticsData.salesGraph.labels[i]}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p>Loading chart...</p>
                )}
              </div>
            </div>

            {/* Top Products */}
            <div className="content-card" style={{ marginTop: '20px', padding: '20px' }}>
              <h3>🏆 Top Selling Products</h3>
              {analyticsData.topProducts?.length > 0 ? (
                <table className="analytics-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Units Sold</th>
                      <th>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyticsData.topProducts.map((p, i) => (
                      <tr key={i}>
                        <td style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {p.image && <img src={`http://localhost:5000${p.image}`} alt="" style={{ width: 40, height: 40, borderRadius: 4 }} />}
                          {p.name}
                        </td>
                        <td>{p.quantity}</td>
                        <td>₹{p.revenue.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <p>No sales data yet.</p>}
            </div>
          </div>
        )}

        {/* ---- EDIT POPUP ---- */}
        {editingProduct && (
          <div className="modal">
            <div className="modal-content">
              <h3>Edit Product</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                <label style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
                  Product Name:
                  <input value={editingProduct.name} onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })} style={{ width: '100%', padding: '10px', marginTop: '5px' }} />
                </label>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <label style={{ flex: 1, fontWeight: 'bold', fontSize: '0.9rem' }}>
                    Price (₹):
                    <input type="number" value={editingProduct.price} onChange={(e) => setEditingProduct({ ...editingProduct, price: e.target.value })} style={{ width: '100%', padding: '10px', marginTop: '5px' }} />
                  </label>
                  <label style={{ flex: 1, fontWeight: 'bold', fontSize: '0.9rem' }}>
                    Stock:
                    <input type="number" value={editingProduct.stock} onChange={(e) => setEditingProduct({ ...editingProduct, stock: e.target.value })} style={{ width: '100%', padding: '10px', marginTop: '5px' }} />
                  </label>
                </div>

                <label style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
                  Category:
                  <select value={editingProduct.category} onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })} style={{ width: '100%', padding: '10px', marginTop: '5px' }}>
                    <option value="Topwear">Topwear</option>
                    <option value="Bottomwear">Bottomwear</option>
                    <option value="Dresses">Dresses</option>
                    <option value="Footwear">Footwear</option>
                    <option value="Accessories">Accessories</option>
                    <option value="Innerwear">Innerwear</option>
                  </select>
                </label>

                {/* EDIT SIZES & COLORS */}
                <div style={{ padding: '10px', border: '1px solid #eee', borderRadius: '8px', background: '#fcfcfc' }}>
                  <label style={{ fontWeight: 'bold', fontSize: '0.9rem', display: 'block', marginBottom: '8px' }}>📏 Available Sizes</label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {["XS", "S", "M", "L", "XL", "XXL", "3XL"].map(size => (
                      <label key={size} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', background: '#eee', padding: '3px 8px', borderRadius: '4px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={Array.isArray(editingProduct.sizes) ? editingProduct.sizes.includes(size) : (editingProduct.sizes || "").split(",").map(s => s.trim()).includes(size)}
                          onChange={(e) => {
                            const currentSizes = Array.isArray(editingProduct.sizes) ? editingProduct.sizes : (editingProduct.sizes ? editingProduct.sizes.split(",").map(s => s.trim()).filter(Boolean) : []);
                            let updatedSizes;
                            if (e.target.checked) {
                              updatedSizes = [...currentSizes, size];
                            } else {
                              updatedSizes = currentSizes.filter(s => s !== size);
                            }
                            setEditingProduct({ ...editingProduct, sizes: updatedSizes });
                          }}
                        />
                        {size}
                      </label>
                    ))}
                  </div>
                </div>

                <div style={{ padding: '10px', border: '1px solid #eee', borderRadius: '8px', background: '#fcfcfc' }}>
                  <label style={{ fontWeight: 'bold', fontSize: '0.9rem', display: 'block', marginBottom: '8px' }}>🎨 Available Colors</label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {["Red", "Blue", "Green", "Black", "White", "Yellow", "Pink", "Purple", "Grey", "Orange", "Brown"].map(color => (
                      <label key={color} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', background: '#eee', padding: '3px 8px', borderRadius: '4px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={Array.isArray(editingProduct.colors) ? editingProduct.colors.includes(color) : (editingProduct.colors || "").split(",").map(c => c.trim()).includes(color)}
                          onChange={(e) => {
                            const currentColors = Array.isArray(editingProduct.colors) ? editingProduct.colors : (editingProduct.colors ? editingProduct.colors.split(",").map(c => c.trim()).filter(Boolean) : []);
                            let updatedColors;
                            if (e.target.checked) {
                              updatedColors = [...currentColors, color];
                            } else {
                              updatedColors = currentColors.filter(c => c !== color);
                            }
                            setEditingProduct({ ...editingProduct, colors: updatedColors });
                          }}
                        />
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: color.toLowerCase(), border: '1px solid #ccc' }}></span>
                        {color}
                      </label>
                    ))}
                  </div>
                </div>

                {/* EDIT SIZE CHART */}
                {editingProduct.sizes && (
                  <div className="size-chart-edit" style={{ padding: '10px', border: '1px solid #eee', borderRadius: '8px', background: '#fcfcfc', maxHeight: '200px', overflowY: 'auto' }}>
                    <label style={{ fontWeight: 'bold', fontSize: '0.9rem', display: 'block', marginBottom: '8px' }}>📏 Edit Size Chart ({editingProduct.category})</label>
                    {(Array.isArray(editingProduct.sizes) ? editingProduct.sizes : (editingProduct.sizes || "").split(",")).map(size => {
                      const s = size.trim();
                      if (!s) return null;
                      const metrics = CATEGORY_MEASUREMENTS[editingProduct.category] || ['Chest', 'Waist', 'Hips', 'Length / Height', 'Shoulders', 'Thigh'];
                      return (
                        <div key={s} style={{ marginBottom: '10px', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 'bold' }}>Size: {s}</span>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '5px' }}>
                            {metrics.map(metric => (
                              <input
                                key={metric}
                                type="text"
                                placeholder={metric}
                                value={editingProduct.sizeChart?.[s]?.[metric.toLowerCase()] || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setEditingProduct(prev => ({
                                    ...prev,
                                    sizeChart: {
                                      ...prev.sizeChart,
                                      [s]: {
                                        ...prev.sizeChart?.[s],
                                        [metric.toLowerCase()]: val
                                      }
                                    }
                                  }));
                                }}
                                style={{ fontSize: '11px', padding: '4px' }}
                              />
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                <div style={{ padding: '10px', border: '1px solid #eee', borderRadius: '8px', background: '#fcfcfc' }}>
                  <label style={{ fontWeight: 'bold', fontSize: '0.9rem', display: 'block', marginBottom: '8px' }}>📸 Replace Image</label>
                  {editingProduct.image && !editingProduct.newImage && (
                    <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <img src={`http://localhost:5000${editingProduct.image}`} alt="current" style={{ width: '30px', height: '30px', borderRadius: '4px' }} />
                      Current image linked.
                    </div>
                  )}
                  <input type="file" accept="image/*" onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setEditingProduct({ ...editingProduct, newImage: e.target.files[0] });
                    }
                  }} style={{ width: '100%', fontSize: '0.8rem' }} />
                </div>

                <label style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
                  Update 3D Model (.glb / .gltf):
                  {editingProduct.model3D && !editingProduct.newModel3D && (
                    <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '5px' }}>Current model: {editingProduct.model3D.split('/').pop()}</div>
                  )}
                  <input type="file" accept=".glb, .gltf" onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setEditingProduct({ ...editingProduct, newModel3D: e.target.files[0] });
                    }
                  }} style={{ width: '100%', padding: '10px', marginTop: '5px' }} />
                </label>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={handleSaveEdit} className="primary-btn" style={{ flex: 1 }}>Save Changes</button>
                <button onClick={() => setEditingProduct(null)} className="secondary-btn" style={{ flex: 1 }}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default VendorDashboard;

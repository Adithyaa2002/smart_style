// src/pages/CustomerDashboard.js
import axios from "axios";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./CustomerDashboard.css";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { toast } from "react-toastify";
import AvatarViewer from "../components/AvatarViewer";

const CustomerDashboard = ({ user, onLogout }) => {
  // SAFE default customer object so it's never null
  const [customer, setCustomer] = useState(
    user || {
      name: "",
      email: "",
      phone: "",
      gender: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      pincode: ""
    }
  );
  const [measurements, setMeasurements] = useState({
    height: "",
    weight: "",
    chest: "",
    waist: "",
    hips: "",
    shoulders: "",
  });

  const [generatedMeasurements, setGeneratedMeasurements] = useState({ ...measurements });

  const handleGenerateAvatar = () => {
    setGeneratedMeasurements({ ...measurements });
    toast.info("Updating avatar...");
  };

  const [activeTab, setActiveTab] = useState("home");
  const [avatarPhoto, setAvatarPhoto] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState([]);
  const [orderHistory, setOrderHistory] = useState([]);
  const [selectedClothing, setSelectedClothing] = useState(null);

  // Filter State
  const [filters, setFilters] = useState({
    category: "",
    minPrice: "",
    maxPrice: "",
    gender: "",
    brand: "",
    minRating: ""
  });
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [brands, setBrands] = useState([]); // Dynamic brands

  const navigate = useNavigate();

  // Cart & wishlist contexts
  const { addToCart, cart, updateQuantity, removeFromCart, clearCart, getCartTotal } = useCart();
  const { wishlist, addToWishlist, removeFromWishlist, isWishlisted } = useWishlist();

  // --- Fetch profile (if email exists) safely ---
  useEffect(() => {
    if (!customer?.email) return;

    axios
      .get(`http://localhost:5000/api/customer/${encodeURIComponent(customer.email)}`)
      .then((res) => {
        if (res.data) setCustomer(res.data);
      })
      .catch((err) => console.log("❌ Failed to load profile", err));
  }, [customer.email]);



  // --- Fetch Brands ---
  useEffect(() => {
    axios.get("http://localhost:5000/api/products/brands")
      .then(res => setBrands(res.data))
      .catch(err => console.error("Failed to fetch brands", err));
  }, []);

  // --- Fetch products with filters ---
  const fetchProducts = () => {
    // Construct query params
    const params = new URLSearchParams();
    if (searchTerm) params.append("search", searchTerm);
    if (filters.category) params.append("category", filters.category);
    if (filters.minPrice) params.append("minPrice", filters.minPrice);
    if (filters.maxPrice) params.append("maxPrice", filters.maxPrice);
    if (filters.gender) params.append("gender", filters.gender);
    if (filters.brand) params.append("brand", filters.brand);

    console.log("🔍 Fetching Products with Params:", params.toString()); // DEBUG LOG

    axios
      .get(`http://localhost:5000/api/products?${params.toString()}`)
      .then((res) => {
        console.log("📦 Products Received:", res.data.length); // DEBUG LOG
        if (res.data) setProducts(res.data);
      })
      .catch((err) => console.log("❌ Failed to load products", err));
  };

  // Re-fetch when filters or search change
  useEffect(() => {
    fetchProducts();
  }, [filters, searchTerm]); // Auto-fetch on change

  // --- Fetch Orders ---
  useEffect(() => {
    if (activeTab === "orders" && customer?.email) {
      axios.get(`http://localhost:5000/api/orders/customer/${encodeURIComponent(customer.email)}`)
        .then(res => setOrderHistory(res.data))
        .catch(err => console.error("Failed to load orders", err));
    }
  }, [activeTab, customer]);

  // Optional debug
  useEffect(() => {
    // uncomment while debugging
    // console.log("CUSTOMER STATE =>", customer);
  }, [customer]);

  const handleLogout = () => {
    onLogout();
    navigate("/");
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) setAvatarPhoto(URL.createObjectURL(file));
  };
  const handleMeasurementChange = (e) => {
    setMeasurements({ ...measurements, [e.target.name]: e.target.value });
  };

  // Update profile on backend (PUT). Backend must return updated customer.
  const handleProfileUpdate = async () => {
    try {
      if (!customer?.email) {
        toast.error("No email present for this user.");
        return;
      }

      // Ensure userId is present (from user prop or existing customer state)
      const payload = {
        ...customer,
        userId: customer.userId || user.id || user._id,
      };

      const res = await axios.put(
        `http://localhost:5000/api/customer/${encodeURIComponent(customer.email)}`,
        payload
      );

      if (res.data) {
        setCustomer(res.data);
        localStorage.setItem("user", JSON.stringify(res.data));
        toast.success("✔ Profile updated successfully!");
      } else {
        toast.error("❌ Unexpected response from server.");
      }
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data?.details || err.response?.data?.error || "Failed to save profile";
      toast.error(`❌ ${errorMsg}`);
    }
  };

  // Place order handler (redirects to payment)
  const handlePlaceOrder = () => {
    if (!cart.items.length) {
      toast.error("Cart is empty");
      return;
    }

    // Navigate to payment page with cart details
    navigate("/payment", {
      state: {
        items: cart.items,
        totalAmount: getCartTotal(),
        customer: customer
      }
    });
  };

  return (
    <div className="customer-dashboard">
      {/* HEADER */}
      <header className="dashboard-header">
        <div className="logo" onClick={() => setActiveTab("home")}>SmartStyle</div>

        <input
          type="text"
          placeholder="Search products..."
          value={searchTerm}
          className="search-bar"
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <div className="header-icons">
          <div className={`cart-icon ${cart.items.length ? "bump" : ""}`} onClick={() => setActiveTab("cart")}>
            🛒 <span className="badge">{cart.items.length}</span>
          </div>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <div className="dashboard-body">
        <aside className="profile-sidebar">
          {["home", "wishlist", "cart", "orders", "profile", "avatar"].map((tab) => (
            <div
              key={tab}
              className={`sidebar-tab ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.toUpperCase()}
            </div>
          ))}
        </aside>

        <main className="dashboard-main">
          {/* HOME */}
          {activeTab === "home" && (
            <div className="home-container">

              {/* 1. CATEGORY CIRCLES (Horizontal Scroll) */}
              <div className="category-circles-section">
                {["All", "Men", "Women", "Kids", "Accessories", "Sale"].map((cat) => (
                  <div
                    key={cat}
                    className={`category-circle-item ${filters.gender === cat || filters.category === cat ? "active" : ""}`}
                    onClick={() => {
                      if (cat === "All") {
                        setFilters({ ...filters, category: "", gender: "" });
                      } else if (["Men", "Women", "Kids"].includes(cat)) {
                        setFilters({ ...filters, gender: cat, category: "" });
                      } else {
                        setFilters({ ...filters, category: cat, gender: "" });
                      }
                    }}
                  >
                    <div className="circle-img-placeholder">
                      {cat === "All" ? "🛍️" : cat === "Men" ? "👕" : cat === "Women" ? "👗" : cat === "Kids" ? "🧸" : cat === "Accessories" ? "👜" : "🏷️"}
                    </div>
                    <span>{cat}</span>
                  </div>
                ))}
              </div>

              {/* 2. FILTER & SORT BAR (Sticky) */}
              <div className="filter-sort-bar">
                <button className="filter-chip" onClick={() => {/* Toggle Sort Modal */ }}>
                  ⇅ Sort
                </button>
                <button className="filter-chip active-dropdown">
                  Category ▼
                </button>
                <button className="filter-chip" onClick={() => setShowFilterDrawer(true)}>
                  ⚙ Filters
                </button>

                {/* Quick Price Dropdown */}
                <select
                  className="quick-price-select"
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "low") setFilters({ ...filters, minPrice: "", maxPrice: "500" });
                    else if (val === "mid") setFilters({ ...filters, minPrice: "500", maxPrice: "1000" });
                    else if (val === "high") setFilters({ ...filters, minPrice: "1000", maxPrice: "" });
                    else setFilters({ ...filters, minPrice: "", maxPrice: "" });
                  }}
                >
                  <option value="">Price: Any</option>
                  <option value="low">Under ₹500</option>
                  <option value="mid">₹500 - ₹1000</option>
                  <option value="high">Above ₹1000</option>
                </select>
              </div>

              {/* FILTER DRAWER (Modal) */}
              {showFilterDrawer && (
                <div className="filter-drawer-overlay" onClick={() => setShowFilterDrawer(false)}>
                  <div className="filter-drawer" onClick={(e) => e.stopPropagation()}>
                    <div className="drawer-header">
                      <h3>Filters</h3>
                      <button onClick={() => setShowFilterDrawer(false)}>✖</button>
                    </div>

                    <div className="drawer-section">
                      <h4>Gender</h4>
                      <div className="gender-options" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
                        {["Men", "Women", "Kids", "Unisex"].map(g => (
                          <button
                            key={g}
                            onClick={() => setFilters({ ...filters, gender: filters.gender === g ? "" : g })}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '20px',
                              border: filters.gender === g ? '1px solid #e91e63' : '1px solid #ddd',
                              background: filters.gender === g ? '#fff0f6' : 'white',
                              color: filters.gender === g ? '#e91e63' : '#333',
                              cursor: 'pointer'
                            }}
                          >
                            {g}
                          </button>
                        ))}
                      </div>

                      <h4>Brand</h4>
                      <div className="brand-options" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
                        {brands.length > 0 ? (
                          brands.map(b => (
                            <label key={b} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '14px', cursor: 'pointer' }}>
                              <input
                                type="radio"
                                name="brand"
                                checked={filters.brand === b}
                                onClick={() => setFilters({ ...filters, brand: filters.brand === b ? "" : b })}
                                readOnly
                                style={{ accentColor: '#e91e63' }}
                              />
                              {b}
                            </label>
                          ))
                        ) : (
                          <p style={{ fontSize: '13px', color: '#888' }}>No brands available.</p>
                        )}
                      </div>

                      <h4>Rating</h4>
                      <div className="rating-options" style={{ marginBottom: '20px' }}>
                        {[4, 3, 2].map(r => (
                          <div
                            key={r}
                            onClick={() => setFilters({ ...filters, minRating: filters.minRating === r ? "" : r })}
                            style={{
                              padding: '8px',
                              cursor: 'pointer',
                              background: filters.minRating === r ? '#f0f0f0' : 'transparent',
                              borderRadius: '5px',
                              marginBottom: '5px'
                            }}
                          >
                            {Array(r).fill("⭐").join("")} & up
                          </div>
                        ))}
                      </div>

                      <h4>Price Range</h4>
                      <div className="price-inputs" style={{ display: 'flex', gap: '10px' }}>
                        <input
                          type="number"
                          placeholder="Min ₹"
                          value={filters.minPrice}
                          onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                          style={{ flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                        />
                        <input
                          type="number"
                          placeholder="Max ₹"
                          value={filters.maxPrice}
                          onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                          style={{ flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                        />
                      </div>
                    </div>

                    <div className="drawer-actions">
                      <button className="clear-btn" onClick={() => setFilters({ ...filters, minPrice: "", maxPrice: "" })}>Clear</button>
                      <button className="apply-btn" onClick={() => setShowFilterDrawer(false)}>Apply</button>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. PRODUCT GRID */}
              <div className="catalog-grid-wrapper">
                {products.length === 0 ? (
                  <div className="empty-state" style={{ padding: "20px", textAlign: "center" }}>
                    <p>No products found fitting these criteria.</p>
                    <button
                      onClick={() => setFilters({ category: "", minPrice: "", maxPrice: "" })}
                      style={{ padding: "8px 16px", background: "#e91e63", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
                    >
                      Clear Filters
                    </button>
                  </div>
                ) : (
                  <div className="catalog-grid-smart">
                    {products.map((product) => (
                      <div key={product._id} className="smart-product-card">
                        <div className="card-image-container" onClick={() => navigate(`/product/${product._id}`, { state: product })} style={{ cursor: "pointer" }}>
                          <img
                            src={
                              product.image?.startsWith("http")
                                ? product.image
                                : `http://localhost:5000${product.image}`
                            }
                            alt={product.name}
                          />
                          <button
                            className={`wishlist-icon ${isWishlisted(product._id) ? "active" : ""}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              isWishlisted(product._id) ? removeFromWishlist(product._id) : addToWishlist(product);
                            }}
                          >
                            {isWishlisted(product._id) ? "❤️" : "🤍"}
                          </button>
                        </div>

                        <div className="card-details">
                          <h4 className="product-name">{product.name}</h4>
                          <p style={{ fontSize: "1.1rem", fontWeight: "bold", margin: "5px 0" }}>₹{product.price}</p>
                          <div className="delivery-tag">Free Delivery</div>

                          {/* Rating Badge (Mock) */}
                          <div className="rating-badge">
                            4.2 ★ <span className="rating-count">({Math.floor(Math.random() * 500)})</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PROFILE */}
          {activeTab === "profile" && (
            <div className="profile-section">
              <h2>👤 My Profile</h2>

              <div className="profile-photo-box">
                <img src={avatarPhoto || "https://via.placeholder.com/120"} alt="Profile" className="profile-avatar" />
                <input type="file" accept="image/*" onChange={handlePhotoUpload} />
              </div>

              {/* Notice the safe access 'customer?.field || ""' */}
              <input
                type="text"
                placeholder="Full Name"
                value={customer?.name || ""}
                onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
              />

              <input
                type="email"
                placeholder="Email"
                value={customer?.email || ""}
                disabled // Cannot change email as it identifies the account
                onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
              />

              <input
                type="text"
                placeholder="Phone Number"
                value={customer?.phone || ""}
                onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
              />

              <select
                value={customer?.gender || ""}
                onChange={(e) => setCustomer({ ...customer, gender: e.target.value })}
              >
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>

              <h3>📍 Address</h3>

              <input
                type="text"
                placeholder="Door No / House Name"
                value={customer?.addressLine1 || ""}
                onChange={(e) => setCustomer({ ...customer, addressLine1: e.target.value })}
              />

              <input
                type="text"
                placeholder="Street / Road"
                value={customer?.addressLine2 || ""}
                onChange={(e) => setCustomer({ ...customer, addressLine2: e.target.value })}
              />

              <input
                type="text"
                placeholder="City"
                value={customer?.city || ""}
                onChange={(e) => setCustomer({ ...customer, city: e.target.value })}
              />

              <input
                type="text"
                placeholder="Pincode"
                value={customer?.pincode || ""}
                onChange={(e) => setCustomer({ ...customer, pincode: e.target.value })}
              />

              <button className="save-profile-btn" onClick={handleProfileUpdate}>
                Save Changes
              </button>
            </div>
          )}
          {activeTab === "avatar" && (
            <div className="avatar-section" style={{ display: "flex", gap: "20px", height: "80vh", padding: "10px" }}>

              {/* LEFT: Inputs & Button - Compact Layout */}
              <div style={{ width: "250px", display: "flex", flexDirection: "column", gap: "8px", justifyContent: "center" }}>
                <h2 style={{ fontSize: "1.2rem", margin: "0 0 5px 0" }}>Measurements</h2>

                {["height", "weight", "chest", "waist", "hips", "shoulders"].map((m) => {
                  let options = [];
                  let label = m.toUpperCase();

                  if (m === "height") {
                    label += " (CM)";
                    for (let i = 150; i <= 170; i++) options.push(i);
                  } else if (m === "weight") {
                    label += " (KG)";
                    for (let i = 40; i <= 150; i++) options.push(i);
                  } else if (m === "chest") {
                    label += " (IN)";
                    for (let i = 32; i <= 38; i++) options.push(i);
                  } else if (m === "waist") {
                    label += " (IN)";
                    for (let i = 26; i <= 32; i++) options.push(i);
                  } else if (m === "hips") {
                    label += " (IN)";
                    for (let i = 34; i <= 40; i++) options.push(i);
                  } else if (m === "shoulders") {
                    label += " (IN)";
                    for (let i = 14; i <= 16; i++) options.push(i);
                  }

                  return (
                    <div key={m} style={{ display: 'flex', flexDirection: 'column' }}>
                      <label style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '2px', color: "#555" }}>{label}</label>
                      <select
                        name={m}
                        value={measurements[m]}
                        onChange={handleMeasurementChange}
                        style={{ padding: '6px', fontSize: '13px', borderRadius: "4px", border: "1px solid #ccc" }}
                      >
                        <option value="">Select</option>
                        {options.map(val => (
                          <option key={val} value={val}>{val}</option>
                        ))}
                      </select>
                    </div>
                  );
                })}

                <button
                  onClick={handleGenerateAvatar}
                  style={{
                    marginTop: "10px",
                    padding: "10px",
                    backgroundColor: "#e91e63",
                    color: "white",
                    border: "none",
                    borderRadius: "5px",
                    cursor: "pointer",
                    fontWeight: "bold",
                    fontSize: "14px"
                  }}
                >
                  Generate Avatar
                </button>
              </div>

              {/* RIGHT: Avatar Viewer */}
              <div style={{ flex: 1, backgroundColor: "#fff", borderRadius: "10px", border: "1px solid #eee", overflow: "hidden", position: "relative" }}>
                <div style={{ width: "100%", height: "100%" }}>
                  <AvatarViewer
                    measurements={{
                      height: Number(measurements.height),
                      weight: Number(measurements.weight),
                      chest: Number(measurements.chest),
                      waist: Number(measurements.waist),
                      hips: Number(measurements.hips),
                      shoulders: Number(measurements.shoulders),
                    }}
                    clothingModelUrl={selectedClothing}
                  />
                </div>
              </div>

            </div>
          )}


          {/* ORDERS */}
          {activeTab === "orders" && (
            <div className="orders-section">
              <h2>My Orders</h2>
              {orderHistory.length === 0 ? (
                <p>No orders found.</p>
              ) : (
                <div className="order-list">
                  {orderHistory.map((order) => (
                    <div key={order._id} className="order-card" style={{ border: "1px solid #ddd", padding: "15px", marginBottom: "15px", borderRadius: "8px" }}>
                      <div className="order-header" style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px", borderBottom: "1px solid #eee", paddingBottom: "5px" }}>
                        <span><strong>Date:</strong> {new Date(order.createdAt).toLocaleDateString()}</span>
                        <span><strong>Status:</strong> <span style={{ color: order.status === "Delivered" ? "green" : "orange" }}>{order.status}</span></span>
                        <span><strong>Total:</strong> ₹{order.totalAmount}</span>
                      </div>
                      <div className="order-items">
                        {order.items.map((item, idx) => (
                          <div key={idx} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "5px" }}>
                            <img
                              src={item.image?.startsWith("http") ? item.image : `http://localhost:5000${item.image}`}
                              alt={item.name}
                              style={{ width: "50px", height: "50px", objectFit: "cover", borderRadius: "4px" }}
                            />
                            <div>
                              <p style={{ margin: 0, fontWeight: "bold" }}>{item.name}</p>
                              <p style={{ margin: 0, fontSize: "0.9rem", color: "#666" }}>Qty: {item.quantity} | ₹{item.price}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CART */}
          {activeTab === "cart" && (
            <div className="cart-section">
              <h2>🛒 Your Cart</h2>

              {cart.items.length === 0 ? (
                <p>Your cart is empty.</p>
              ) : (
                cart.items.map((item) => (
                  <div key={item._id || item.id} className="cart-item">
                    <img
                      src={
                        item.image?.startsWith("http")
                          ? item.image
                          : `http://localhost:5000${item.image}`
                      }
                      alt={item.name}
                      className="cart-item-img"
                    />

                    <div>
                      <h4>{item.name}</h4>
                      <p>₹{item.price}</p>

                      <div className="quantity-box">
                        <button onClick={() => updateQuantity(item._id || item.id, item.quantity - 1)}>-</button>
                        <span>{item.quantity}</span>
                        <button onClick={() => updateQuantity(item._id || item.id, item.quantity + 1)}>+</button>
                      </div>
                    </div>

                    <div className="cart-actions">
                      <button
                        className="wishlist-move-btn"
                        onClick={() => {
                          addToWishlist(item);
                          removeFromCart(item._id || item.id);
                          toast.success(`❤️ Moved ${item.name} to wishlist`);
                        }}
                      >
                        ❤️ Move to Wishlist
                      </button>

                      <button
                        className="remove-btn"
                        onClick={() => removeFromCart(item._id || item.id)}
                      >
                        🗑 Remove
                      </button>
                    </div>
                  </div>
                ))
              )}

              <h3>Total: ₹{getCartTotal()}</h3>

              <button className="primary-btn" onClick={handlePlaceOrder}>
                Place Order
              </button>
            </div>
          )}

          {/* WISHLIST */}
          {activeTab === "wishlist" && (
            <div className="wishlist-section">
              <h2>My Wishlist ❤️</h2>

              {wishlist.length === 0 ? (
                <p>Your wishlist is empty.</p>
              ) : (
                wishlist.map((item) => (
                  <div key={item._id || item.id} className="wishlist-item">
                    <img
                      src={item.image?.startsWith("http") ? item.image : `http://localhost:5000${item.image}`}
                      alt={item.name}
                      className="wishlist-img"
                    />

                    <div className="wishlist-info">
                      <h4>{item.name}</h4>
                      <p>₹{item.price}</p>
                    </div>

                    <div className="wishlist-actions">
                      <button
                        className="addcart-btn"
                        onClick={() => {
                          addToCart({ ...item, id: item._id || item.id });
                          removeFromWishlist(item._id || item.id);
                          toast.success(`🛍️ ${item.name} moved to cart!`);
                        }}
                      >
                        🛒 Add to Cart
                      </button>

                      <button
                        className="remove-btn"
                        onClick={() => removeFromWishlist(item._id || item.id)}
                      >
                        🗑 Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default CustomerDashboard;

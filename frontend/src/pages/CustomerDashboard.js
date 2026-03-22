/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
// src/pages/CustomerDashboard.js
import axios from "axios";
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./CustomerDashboard.css";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { toast } from "react-toastify";
import AvatarViewer from "../components/AvatarViewer";

const CustomerDashboard = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();

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
  const [measurements, setMeasurements] = useState(() => {
    const saved = localStorage.getItem("userMeasurements");
    // Ensure all fields exist
    const parsed = saved ? JSON.parse(saved) : {};
    return {
      height: parsed.height || "",
      weight: parsed.weight || "",
      chest: parsed.chest || "",
      waist: parsed.waist || "",
      hips: parsed.hips || "",
      thigh: parsed.thigh || "",
      shoulders: parsed.shoulders || "",
      gender: parsed.gender || "", // Added Gender
    };
  });

  const [generatedMeasurements, setGeneratedMeasurements] = useState({ ...measurements });

  // If we have saved data, start in view-only mode
  const [isMeasurementEditable, setIsMeasurementEditable] = useState(() => {
    return !localStorage.getItem("userMeasurements");
  });

  const handleGenerateAvatar = () => {
    setGeneratedMeasurements({ ...measurements });
    localStorage.setItem("userMeasurements", JSON.stringify(measurements));
    setIsMeasurementEditable(false);
    toast.success("Avatar generated & saved!");
  };

  const [activeTab, setActiveTab] = useState(location.state?.activeTab || "home");
  const [avatarPhoto, setAvatarPhoto] = useState(null);
  const [faceParams, setFaceParams] = useState(() => {
    const saved = localStorage.getItem("faceParams");
    return saved ? JSON.parse(saved) : null;
  });
  const [isFaceLoading, setIsFaceLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState([]);
  const [orderHistory, setOrderHistory] = useState([]);

  const [selectedClothing, setSelectedClothing] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [sortBy, setSortBy] = useState("relevance"); // Default sort

  const dropdownRef = React.useRef(null);
  const sortDropdownRef = React.useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowCategoryDropdown(false);
      }
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target)) {
        setShowSortDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const SORT_OPTIONS = [
    { label: "Relevance", value: "relevance" },
    { label: "Newest First", value: "newest" },
    { label: "Price: Low to High", value: "price_asc" },
    { label: "Price: High to Low", value: "price_desc" },
    { label: "Top Rated", value: "rating" },
  ];

  const CATEGORY_OPTIONS = {
    "Men": { icon: "👨", items: ["Shirts", "T-Shirts", "Jeans", "Trousers", "Jackets", "Suits", "Kurtas"] },
    "Women": { icon: "👩", items: ["Dresses", "Tops", "Jeans", "Skirts", "Sarees", "Lehengas", "Kurtas"] },
    "Kids": { icon: "🧸", items: ["T-Shirts", "Shorts", "Dresses", "Sets", "Bodysuits"] },
    "Accessories": { icon: "👜", items: ["Watches", "Bags", "Shoes", "Jewelry", "Belts", "Sunglasses"] }
  };

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

    // Sort Param
    if (sortBy && sortBy !== "relevance") params.append("sort", sortBy);

    console.log("🔍 Fetching Products with Params:", params.toString()); // DEBUG LOG

    axios
      .get(`http://localhost:5000/api/products?${params.toString()}`)
      .then((res) => {
        console.log("📦 Products Received:", res.data.length); // DEBUG LOG
        if (res.data) setProducts(res.data);
      })
      .catch((err) => console.log("❌ Failed to load products", err));
  };

  // Re-fetch when filters, search, or sort change
  useEffect(() => {
    fetchProducts();
  }, [filters, searchTerm, sortBy]); // Auto-fetch on change

  // --- Fetch Orders ---
  useEffect(() => {
    if (activeTab === "orders" && customer?.email) {
      axios.get(`http://localhost:5000/api/orders/customer/${encodeURIComponent(customer.email)}`)
        .then(res => setOrderHistory(res.data))
        .catch(err => {
          console.error("Failed to load orders", err);
          setOrderHistory([]);
        });
    }
  }, [activeTab, customer]);

  // Optional debug
  const [banners, setBanners] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:5000/api/banners')
      .then(res => {
        if (Array.isArray(res.data)) setBanners(res.data);
        else setBanners([]);
      })
      .catch(err => console.log(err));

  }, []);

  // --- Fetch Recommendations ---
  useEffect(() => {
    const uid = customer?.userId || user?._id || user?.id;
    if (uid && activeTab === "home") {
      axios.get(`http://localhost:5000/api/products/recommendations?userId=${uid}`)
        .then(res => setRecommendations(res.data))
        .catch(err => console.error("Failed to fetch recommendations", err));
    }
  }, [customer, user, activeTab]);

  useEffect(() => {
    // uncomment while debugging
    // console.log("CUSTOMER STATE =>", customer);
  }, [customer]);

  const handleLogout = () => {
    onLogout();
    navigate("/");
  };

  const clearTryOnHistory = async () => {
    if (!window.confirm("Are you sure you want to clear your entire try-on history?")) return;

    if (!customer?.email) return;

    try {
      const response = await axios.delete(`http://localhost:5000/api/customer/${encodeURIComponent(customer.email)}/tryon`);
      if (response.data.success) {
        setCustomer({ ...customer, tryOnHistory: [] });
        toast.success("History cleared successfully! 🗑️");
      }
    } catch (err) {
      console.error("Failed to clear history:", err);
      toast.error("Failed to clear history");
    }
  };

  const handleFaceUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsFaceLoading(true);
    const formData = new FormData();
    formData.append("photo", file);

    try {
      const response = await axios.post("http://localhost:5000/api/avatar/face-from-photo", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      if (response.data.success) {
        setFaceParams(response.data.faceParams);
        localStorage.setItem("faceParams", JSON.stringify(response.data.faceParams));
        toast.success("✅ 3D Face Generated! Your avatar has been updated.");
      } else {
        toast.error("❌ Error: " + (response.data.message || "Face analysis failed"));
      }
    } catch (error) {
      console.error(error);
      toast.error("❌ Upload Failed: " + error.message);
    } finally {
      setIsFaceLoading(false);
    }
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

        <div className="search-container">
          <input
            type="text"
            placeholder="Search for products, brands and more"
            value={searchTerm}
            className="search-bar"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <span className="search-icon-inside">🔍</span>
        </div>

        <div className="header-icons">
          <div className={`cart-icon ${cart.items.length ? "bump" : ""}`} onClick={() => setActiveTab("cart")}>
            🛒 <span className="badge">{cart.items.length}</span>
          </div>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <div className="dashboard-body">
        <aside className="profile-sidebar">
          {["home", "wishlist", "cart", "orders", "profile", "avatar", "history", "combination"].map((tab) => (
            <div
              key={tab}
              className={`sidebar-tab ${activeTab === tab ? "active" : ""} ${tab === 'combination' ? 'combination-active' : ''}`}
              onClick={() => {
                if (tab === "combination") {
                  navigate("/virtual-tryon");
                } else {
                  setActiveTab(tab);
                }
              }}
            >
              {tab === "combination" ? "✨ COMBINATION TRY-ON" : tab.toUpperCase()}
            </div>
          ))}
        </aside>

        <main className="dashboard-main">
          {/* HOME */}
          {activeTab === "home" && (
            <div className="home-container">

              {/* 🆕 PROMOTIONAL BANNERS CAROUSEL */}
              {banners.length > 0 && (
                <div className="banner-carousel-container" style={{
                  width: '100%',
                  overflowX: 'auto',
                  whiteSpace: 'nowrap',
                  marginBottom: '20px',
                  borderRadius: '12px',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
                }}>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {banners.map(b => (
                      <div key={b._id} style={{ position: 'relative', minWidth: '100%', height: '300px', flexShrink: 0 }}>
                        <img
                          src={b.image.startsWith("http") ? b.image : `http://localhost:5000${b.image}`}
                          alt={b.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px', cursor: 'pointer' }}
                          onClick={() => {
                            if (b.link) {
                              if (b.link.includes('category=')) {
                                const cat = b.link.split('=')[1];
                                setFilters({ ...filters, category: cat });
                                toast.info(`Filtering by ${cat}`);
                              }
                            }
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

              )}

              {/* ⭐ RECOMMENDATIONS SECTION ⭐ */}
              {recommendations.length > 0 && (
                <div className="recommendations-section" style={{ marginBottom: "30px", padding: "0 10px" }}>
                  <h3 style={{ color: "#333", fontSize: "1.2rem", marginBottom: "15px" }}>Recommended for You ✨</h3>
                  <div className="catalog-grid-smart">
                    {recommendations.map((product) => (
                      <div key={product._id} className="smart-product-card">
                        <div className="card-image-container" onClick={() => navigate(`/product/${product._id}`, { state: product })} style={{ cursor: "pointer" }}>
                          {/* Label for Recommendation */}
                          <div style={{
                            position: "absolute", top: "10px", left: "10px",
                            background: "rgba(233, 30, 99, 0.9)", color: "white",
                            padding: "4px 8px", borderRadius: "12px", fontSize: "10px", fontWeight: "bold", zIndex: 2
                          }}>
                            FOR YOU
                          </div>
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
                          <div className="rating-badge">
                            {product.rating ? product.rating.toFixed(1) : "0.0"} ★
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
                <div style={{ position: 'relative' }} ref={sortDropdownRef}>
                  <button
                    className={`filter-chip ${showSortDropdown || sortBy !== "relevance" ? 'active' : ''}`}
                    onClick={() => setShowSortDropdown(!showSortDropdown)}
                  >
                    ⇅ {sortBy === "relevance" ? "Sort" : SORT_OPTIONS.find(o => o.value === sortBy)?.label}
                  </button>
                  {showSortDropdown && (
                    <div className="sort-dropdown-menu">
                      {SORT_OPTIONS.map(opt => (
                        <div
                          key={opt.value}
                          className={`sort-option ${sortBy === opt.value ? 'selected' : ''}`}
                          onClick={() => {
                            setSortBy(opt.value);
                            setShowSortDropdown(false);
                          }}
                        >
                          {opt.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ position: 'relative' }} ref={dropdownRef}>
                  <button
                    className={`filter-chip ${showCategoryDropdown || filters.category ? 'active' : ''}`}
                    onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                  >
                    {filters.category ? filters.category : "Category ▼"}
                  </button>
                  {showCategoryDropdown && (
                    <div className="category-dropdown-menu">
                      {Object.keys(CATEGORY_OPTIONS).map(gender => (
                        <div key={gender} className="category-group">
                          <strong>{CATEGORY_OPTIONS[gender].icon} {gender}</strong>
                          <div className="category-list">
                            {/* View All Option */}
                            <span
                              className="cat-item view-all"
                              onClick={() => {
                                setFilters({
                                  ...filters,
                                  gender: gender === "Accessories" ? "" : gender,
                                  category: ""
                                });
                                setShowCategoryDropdown(false);
                              }}
                            >
                              View All {gender}
                            </span>

                            {CATEGORY_OPTIONS[gender].items.map(subCat => (
                              <span
                                key={subCat}
                                className={`cat-item ${filters.category === subCat ? 'selected' : ''}`}
                                onClick={() => {
                                  setFilters({
                                    ...filters,
                                    gender: gender === "Accessories" ? "" : gender,
                                    category: subCat
                                  });
                                  setShowCategoryDropdown(false);
                                }}
                              >
                                {subCat}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                      <div className="category-group">
                        <span
                          className="clear-cat-btn"
                          onClick={() => {
                            setFilters({ ...filters, category: "", gender: "" });
                            setShowCategoryDropdown(false);
                          }}
                        >
                          Clear Selection
                        </span>
                      </div>
                    </div>
                  )}
                </div>
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

                          {/* Rating Badge (Real) */}
                          <div className="rating-badge">
                            {product.rating ? product.rating.toFixed(1) : "0.0"} ★
                            <span className="rating-count">
                              ({product.reviews ? product.reviews.length : 0} reviews)
                            </span>
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
            <div className="avatar-section" style={{ display: "flex", flexDirection: "column", height: "80vh", padding: "10px" }}>

              {/* GENDER SELECTION (If not set or editable) */}
              {(!measurements.gender && isMeasurementEditable) ? (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <h2>Select Your Body Type</h2>
                  <div style={{ display: "flex", gap: "20px", marginTop: "20px" }}>
                    <button
                      onClick={() => setMeasurements({
                        gender: "female",
                        chest: "", waist: "", hips: "", thigh: "", shoulders: ""
                      })}
                      style={{ padding: "20px 40px", fontSize: "1.2rem", borderRadius: "10px", border: "2px solid #e91e63", background: "white", cursor: "pointer" }}
                    >
                      👩 Female
                    </button>
                    <button
                      onClick={() => setMeasurements({
                        gender: "male",
                        chest: "", waist: "", hips: "", thigh: "", shoulders: ""
                      })}
                      style={{ padding: "20px 40px", fontSize: "1.2rem", borderRadius: "10px", border: "2px solid #2196f3", background: "white", cursor: "pointer" }}
                    >
                      👨 Male
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", gap: "20px", height: "100%" }}>
                  {/* LEFT: Inputs & Button - Compact Layout */}
                  <div style={{ width: "250px", display: "flex", flexDirection: "column", gap: "8px", justifyContent: "center" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <h2 style={{ fontSize: "1.2rem", margin: "0" }}>Measurements</h2>
                    </div>

                    <div style={{ background: '#f0f0f0', padding: '10px', borderRadius: '5px', marginBottom: '10px', marginTop: '10px' }}>
                      <p style={{ margin: 0, fontWeight: 'bold', fontSize: '0.9rem' }}>
                        Body Type: {measurements.gender === "male" ? "👨 Male" : "👩 Female"}
                      </p>
                      {isMeasurementEditable && (
                        <button
                          onClick={() => setMeasurements({ ...measurements, gender: "" })}
                          style={{ marginTop: '5px', fontSize: "0.8rem", padding: "5px 10px", cursor: "pointer", background: "#fff", border: "1px solid #ccc", borderRadius: "4px" }}
                        >
                          🔄 Change Gender
                        </button>
                      )}
                    </div>



                    {["chest", "waist", "hips", "thigh", "shoulders"].map((m) => {
                      let options = [];
                      let label = m.toUpperCase();

                      if (m === "chest") {
                        label += " (IN)";
                        for (let i = 28; i <= 48; i++) options.push(i);
                      } else if (m === "waist") {
                        label += " (IN)";
                        for (let i = 28; i <= 48; i++) options.push(i);
                      } else if (m === "hips") {
                        label += " (IN)";
                        const max = measurements.gender === "male" ? 36 : 48;
                        for (let i = 28; i <= max; i++) options.push(i);
                      } else if (m === "thigh") {
                        label += " (IN)";
                        for (let i = 19; i <= 25; i++) options.push(i);
                      } else if (m === "shoulders") {
                        label += " (IN)";
                        for (let i = 13; i <= 15; i++) options.push(i);
                      }

                      return (
                        <div key={m} style={{ display: 'flex', flexDirection: 'column' }}>
                          <label style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '2px', color: "#555" }}>{label}</label>
                          <select
                            name={m}
                            value={measurements[m]}
                            onChange={handleMeasurementChange}
                            disabled={!isMeasurementEditable}
                            style={{
                              padding: '6px',
                              fontSize: '13px',
                              borderRadius: "4px",
                              border: "1px solid #ccc",
                              backgroundColor: !isMeasurementEditable ? "#f0f0f0" : "#fff",
                              cursor: !isMeasurementEditable ? "not-allowed" : "pointer"
                            }}
                          >
                            <option value="">Select</option>
                            {options.map(val => (
                              <option key={val} value={val}>{val}</option>
                            ))}
                          </select>
                        </div>
                      );
                    })}

                    {isMeasurementEditable ? (
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
                        💾 Generate & Save
                      </button>
                    ) : (
                      <button
                        onClick={() => setIsMeasurementEditable(true)}
                        style={{
                          marginTop: "10px",
                          padding: "10px",
                          backgroundColor: "#333",
                          color: "white",
                          border: "none",
                          borderRadius: "5px",
                          cursor: "pointer",
                          fontWeight: "bold",
                          fontSize: "14px"
                        }}
                      >
                        🖊️ Edit Measurements
                      </button>
                    )}
                  </div>

                  {/* RIGHT: Avatar Viewer */}
                  <div style={{ flex: 1, backgroundColor: "#fff", borderRadius: "10px", border: "1px solid #eee", overflow: "hidden", position: "relative" }}>
                    <div style={{ width: "100%", height: "100%" }}>
                      <AvatarViewer
                        measurements={{
                          gender: measurements.gender,
                          chest: Number(measurements.chest),
                          waist: Number(measurements.waist),
                          hips: Number(measurements.hips),
                          thigh: Number(measurements.thigh),
                          shoulders: Number(measurements.shoulders),
                        }}
                        modelUrl={measurements.gender === "male" ? "/models/male_base.glb" : "/models/female_base.glb"}
                        clothingModelUrl={selectedClothing}
                        faceParams={faceParams}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}


          {/* ORDERS */}
          {activeTab === "orders" && (
            <div className="orders-section">
              <div className="section-header">
                <h2>📦 My Orders</h2>
                <p>Track and manage your recent purchases</p>
              </div>

              {orderHistory.length === 0 ? (
                <div className="empty-orders">
                  <p>You haven't placed any orders yet.</p>
                  <button className="primary-btn" onClick={() => setActiveTab("home")}>Start Shopping</button>
                </div>
              ) : (
                <div className="order-list">
                  {orderHistory.map((order) => {
                    const orderId = order._id.startsWith('ORD') ? order._id : `ORD${order._id.slice(-5).toUpperCase()}`;
                    return (
                      <div key={order._id} className="order-card-premium">
                        <div className="order-card-header">
                          <div className="order-main-info">
                            <span className="order-id-label">Order ID: #{orderId}</span>
                            <span className="order-timestamp">{new Date(order.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                          </div>
                          <div className="order-meta-info">
                            <span className={`order-status-badge ${order.status.toLowerCase()}`}>
                              {order.status}
                            </span>
                          </div>
                        </div>

                        <div className="order-card-body">
                          <div className="order-items-grid">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="order-item-mini">
                                <div className="item-thumbnail">
                                  {item.image ? (
                                    <img src={item.image.startsWith("http") ? item.image : `http://localhost:5000${item.image}`} alt={item.name} />
                                  ) : (
                                    <div className="thumb-placeholder">👕</div>
                                  )}
                                </div>
                                <div className="item-details">
                                  <p className="item-name">{item.name}</p>
                                  <p className="item-qty-price">Qty: {item.quantity} × ₹{item.price.toFixed(2)}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="order-card-footer">
                          <div className="payment-summary">
                            <span className="method-label">Payment: {order.paymentMethod}</span>
                            <span className={`payment-status ${order.paymentStatus.toLowerCase()}`}>{order.paymentStatus}</span>
                          </div>
                          <div className="order-total">
                            <span className="total-label">Total Amount</span>
                            <span className="total-value">₹{order.totalAmount.toFixed(2)}</span>
                          </div>
                        </div>

                        <div className="order-card-actions">
                          <button className="track-btn">Track Order</button>
                          <button className="reorder-btn">Reorder</button>
                        </div>
                      </div>
                    );
                  })}
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
          {/* HISTORY */}
          {activeTab === "history" && (
            <div className="history-section" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h2 style={{ margin: 0 }}>🕒 Virtual Try-On History</h2>
                {customer.tryOnHistory && customer.tryOnHistory.length > 0 && (
                  <button
                    onClick={clearTryOnHistory}
                    style={{ background: '#ff4d4f', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    🗑️ Clear History
                  </button>
                )}
              </div>
              {!customer.tryOnHistory || customer.tryOnHistory.length === 0 ? (
                <p>You haven't tried on any clothes yet.</p>
              ) : (
                <div className="catalog-grid-smart">
                  {customer.tryOnHistory.map((item, idx) => (
                    <div key={idx} className="smart-product-card" onClick={() => navigate(`/product/${item.productId}`)} style={{ cursor: 'pointer' }}>
                      <div className="card-image-container">
                        <img
                          src={item.productImage?.startsWith("http") ? item.productImage : `http://localhost:5000${item.productImage}`}
                          alt={item.productName}
                        />
                      </div>
                      <div className="card-details">
                        <h4>{item.productName}</h4>
                        <p style={{ fontSize: '0.8rem', color: '#666' }}>Tried on {new Date(item.triedAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div >
    </div >
  );
};

export default CustomerDashboard;

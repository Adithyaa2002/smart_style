/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AvatarViewer from '../components/AvatarViewer';

const VirtualTryOn = () => {
  const navigate = useNavigate();
  const [selectedProducts, setSelectedProducts] = useState(() => {
    const saved = localStorage.getItem('combinationTryOnProducts');
    return saved ? JSON.parse(saved) : [];
  });

  // Sync selected products to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('combinationTryOnProducts', JSON.stringify(selectedProducts));
  }, [selectedProducts]);

  const [tryOnHistory, setTryOnHistory] = useState([]); // Fetch from backend
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('browse');
  const [products, setProducts] = useState([]); // Real products from DB

  const getUserData = () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      return { email: user?.email, id: user?.id || user?._id };
    } catch {
      return null;
    }
  };

  // CLOTHING SIZE STATE
  const [selectedSize, setSelectedSize] = useState('M');

  // CLOTHING ADJUSTMENT STATE - loads from selected product's DB values
  const [clothingAdj, setClothingAdj] = useState({ scale: 1.0, x: 0, y: 0, z: 0 });

  // Auto-load adjustments when selected product changes
  useEffect(() => {
    if (selectedProducts.length === 0) return;
    const lastProduct = selectedProducts[selectedProducts.length - 1];

    const combinedCat = ((lastProduct.type || "") + " " + (lastProduct.category || "") + " " + (lastProduct.name || "")).toLowerCase();
    const isTopwearOrDress = combinedCat.includes("top") || combinedCat.includes("shirt") || combinedCat.includes("jacket") || combinedCat.includes("tshirt") || combinedCat.includes("upper") || combinedCat.includes("dress") || combinedCat.includes("suit") || combinedCat.includes("outfit") || combinedCat.includes("frock") || combinedCat.includes("gown");
    const isWomen = combinedCat.includes("wom") || combinedCat.includes("female") || !measurements || measurements.gender !== "male";

    let defScale = 1.0;
    let defX = 0;
    let defY = 0;
    let defZ = 0;

    if (isWomen && isTopwearOrDress) {
      defScale = 0.83;
      defX = 0.02;
      defY = 0.03;
      defZ = 0.02;
    }

    const dbScale = lastProduct.adjustmentScale ?? 1.0;
    const dbX = lastProduct.adjustmentX ?? 0;
    const dbY = lastProduct.adjustmentY ?? 0;
    const dbZ = lastProduct.adjustmentZ ?? 0;

    const isNeutralDB = dbScale === 1.0 && dbX === 0 && dbY === 0 && dbZ === 0;

    // Force defaults for BOTH women and men topwear to ensure consistency
    const isMenTopwear = !isWomen && isTopwearOrDress;
    const forceDefaults = (isWomen && isTopwearOrDress) || isMenTopwear;

    setClothingAdj({
      scale: (isNeutralDB || forceDefaults) ? defScale : dbScale,
      x: (isNeutralDB || forceDefaults) ? defX : dbX,
      y: (isNeutralDB || forceDefaults) ? defY : dbY,
      z: (isNeutralDB || forceDefaults) ? defZ : dbZ,
    });
  }, [selectedProducts.length, selectedProducts[selectedProducts.length - 1]?.id]);

  // MEASUREMENTS & FACE PARAMS
  const [measurements, setMeasurements] = useState(() => {
    const saved = localStorage.getItem("userMeasurements");
    return saved ? JSON.parse(saved) : {
      chest: 34, waist: 28, hips: 38, thigh: 20, shoulders: 15, height: 170, weight: 60, gender: "female"
    };
  });


  // FETCH PRODUCTS AND HISTORY
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/products`);
        const data = await response.json();
        setProducts(data);
      } catch (err) {
        console.error("Failed to fetch products:", err);
      }
    };

    const fetchHistory = async () => {
      const userData = getUserData();
      if (!userData || !userData.email) {
        console.log("⚠️ Cannot fetch history: No user data found in localStorage");
        return;
      }
      try {
        console.log(`🔍 Fetching history for ${userData.email}...`);
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/customer/${encodeURIComponent(userData.email)}`);
        const data = await response.json();
        console.log("📥 Received history data:", data);
        if (data && data.tryOnHistory) {
          setTryOnHistory(data.tryOnHistory);
        } else {
          console.log("📭 No tryOnHistory found in response");
        }
      } catch (err) {
        console.error("❌ Failed to fetch history:", err);
      }
    };

    fetchProducts();
    fetchHistory();
  }, [activeTab]); // Re-fetch history when tabs change


  // Filter products for try-on
  const displayProducts = products.length > 0 ? products : [
    {
      id: '1',
      name: 'Classic White T-Shirt',
      type: 'top',
      category: 'clothing',
      price: 25.99,
      image: 'https://via.placeholder.com/200x300/FFFFFF/000000?text=White+T-Shirt',
      tryOnPreview: 'https://via.placeholder.com/400x600/FFFFFF/000000?text=👕+Try-On+View',
      model3D: '/models/white_tshirt.glb'
    },
    {
      id: '2',
      name: 'Designer Jeans',
      type: 'bottom',
      category: 'clothing',
      price: 65.99,
      image: 'https://via.placeholder.com/200x300/000080/FFFFFF?text=Denim+Jeans',
      tryOnPreview: 'https://via.placeholder.com/400x600/000080/FFFFFF?text=👖+Try-On+View',
      model3D: '/models/designer_jeans.glb'
    },
    {
      id: '3',
      name: 'Running Shoes',
      type: 'shoes',
      category: 'shoes',
      price: 120.99,
      image: 'https://via.placeholder.com/200x300/0000FF/FFFFFF?text=Running+Shoes',
      tryOnPreview: 'https://via.placeholder.com/400x600/0000FF/FFFFFF?text=👟+Try-On+View',
      model3D: '/models/shoes.glb'
    },
    {
      id: '4',
      name: 'Designer Sunglasses',
      type: 'accessory',
      category: 'accessories',
      price: 89.99,
      image: 'https://via.placeholder.com/200x300/000000/FFFFFF?text=Sunglasses',
      tryOnPreview: 'https://via.placeholder.com/400x600/000000/FFFFFF?text=🕶️+Try-On+View',
      model3D: '/models/sunglasses.glb'
    },
    {
      id: '5',
      name: 'Leather Jacket',
      type: 'top',
      category: 'clothing',
      price: 150.99,
      image: 'https://via.placeholder.com/200x300/8B4513/FFFFFF?text=Leather+Jacket',
      tryOnPreview: 'https://via.placeholder.com/400x600/8B4513/FFFFFF?text=🧥+Try-On+View'
    },
    {
      id: '6',
      name: 'Silver Necklace',
      type: 'accessory',
      category: 'jewelry',
      price: 45.99,
      image: 'https://via.placeholder.com/200x300/C0C0C0/000000?text=Silver+Necklace',
      tryOnPreview: 'https://via.placeholder.com/400x600/C0C0C0/000000?text=📿+Try-On+View'
    }
  ];

  const addToTryOn = (product) => {
    // Canonical category mapping for replacement logic
    const getCanonicalType = (p) => {
      const cat = (p.type || p.category || "").toLowerCase();
      if (cat.includes("top") || cat.includes("shirt") || cat.includes("jacket") || cat.includes("tshirt") || cat.includes("upper")) return "top";
      if (cat.includes("pant") || cat.includes("trouser") || cat.includes("bottom") || cat.includes("short") || cat.includes("jeans") || cat.includes("lower")) return "bottom";
      if (cat.includes("dress") || cat.includes("suit") || cat.includes("outfit") || cat.includes("frock") || cat.includes("gown")) return "full";
      if (cat.includes("shoe") || cat.includes("foot")) return "shoes";
      return cat; // fallback
    };

    const newType = getCanonicalType(product);

    // Remove existing item of same canonical type
    const filtered = selectedProducts.filter(item => getCanonicalType(item) !== newType);

    // If it's a "full" outfit, it should ideally replace both tops AND bottoms
    let finalFiltered = filtered;
    if (newType === "full") {
      finalFiltered = filtered.filter(item => {
        const t = getCanonicalType(item);
        return t !== "top" && t !== "bottom";
      });
    } else if (newType === "top" || newType === "bottom") {
      // If adding a top or bottom, remove any "full" outfit
      finalFiltered = filtered.filter(item => getCanonicalType(item) !== "full");
    }

    setSelectedProducts([...finalFiltered, {
      ...product,
      id: product._id || product.id,
      selectedSize: product.selectedSize || (product.sizes && product.sizes[0]) || 'M'
    }]);
  };

  const updateItemSize = (productId, newSize) => {
    setSelectedProducts(prev => prev.map(item =>
      item.id === productId ? { ...item, selectedSize: newSize } : item
    ));
  };

  const removeFromTryOn = (productId) => {
    setSelectedProducts(selectedProducts.filter(item => item.id !== productId));
  };

  const clearOutfit = () => {
    setSelectedProducts([]);
  };

  const clearTryOnHistory = async () => {
    if (!window.confirm("Are you sure you want to clear your entire try-on history?")) return;

    const userData = getUserData();
    if (!userData || !userData.email) return;

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/customer/${encodeURIComponent(userData.email)}/tryon`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setTryOnHistory([]);
        alert("History cleared successfully! 🗑️");
      }
    } catch (err) {
      console.error("Failed to clear history:", err);
    }
  };

  const saveAdjustments = async () => {
    if (selectedProducts.length === 0) return;
    const lastProduct = selectedProducts[selectedProducts.length - 1];
    const productId = lastProduct._id || lastProduct.id;
    if (!productId) return alert("Cannot save: no product selected.");
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/products/${productId}/adjustments`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adjustmentScale: clothingAdj.scale,
          adjustmentX: clothingAdj.x,
          adjustmentY: clothingAdj.y,
          adjustmentZ: clothingAdj.z,
        })
      });
      if (response.ok) {
        // Update in local products state so auto-load picks up new values
        setProducts(prev => prev.map(p => (p._id || p.id) === productId
          ? { ...p, adjustmentScale: clothingAdj.scale, adjustmentX: clothingAdj.x, adjustmentY: clothingAdj.y, adjustmentZ: clothingAdj.z }
          : p
        ));
        alert("✅ Adjustments saved! Everyone who tries on this product will see these settings.");
      } else {
        alert("❌ Failed to save adjustments.");
      }
    } catch (err) {
      console.error("Save adjustments error:", err);
      alert("❌ Network error while saving.");
    }
  };

  const simulateTryOn = async () => {
    if (selectedProducts.length === 0) return;

    setIsLoading(true);

    // Auto-save to backend history
    const userData = getUserData();
    if (userData && userData.email) {
      console.log(`📡 Sending try-on history for ${userData.email}...`);
      try {
        for (const item of selectedProducts) {
          const productId = item.id || item._id;
          if (productId) {
            console.log(`📤 Saving product: ${item.name} (${productId})`);
            const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/customer/${encodeURIComponent(userData.email)}/tryon`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: userData.id,
                productId,
                productName: item.name,
                productImage: item.image
              })
            });
            const resData = await response.json();
            console.log(`📥 Backend response for ${item.name}:`, resData);
          }
        }
      } catch (err) {
        console.error("❌ Failed to explicitly log try-on history:", err);
      }
    } else {
      console.log("⚠️ Cannot save history: No user data found");
    }

    // Simulate AI processing
    setTimeout(() => {
      setIsLoading(false);
      setActiveTab('preview');
    }, 2000);
  };

  return (
    <div className="virtual-tryon-container">
      {/* Header */}
      <div className="tryon-header">
        <button className="back-btn" onClick={() => navigate('/customer-dashboard')}>
          ← Back to Dashboard
        </button>
        <h1>🎯 SmartStyle Virtual Try-On</h1>
        <p>See how clothes look on you before buying!</p>
      </div>

      <div className="tryon-layout">
        {/* Left Sidebar - Product Browser */}
        <div className="tryon-sidebar">
          <div className="sidebar-tabs">
            <button
              className={`tab-btn ${activeTab === 'browse' ? 'active' : ''}`}
              onClick={() => setActiveTab('browse')}
            >
              👕 Browse Products
            </button>
            <button
              className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              🕒 Try-On History
            </button>

          </div>




          {activeTab === 'browse' && (
            <div className="products-list">
              <h3>Available Products</h3>
              <div className="product-filters">
                <button className="filter-btn active">All</button>
                <button className="filter-btn">Tops</button>
                <button className="filter-btn">Bottoms</button>
                <button className="filter-btn">Shoes</button>
                <button className="filter-btn">Accessories</button>
              </div>

              <div className="tryon-products-grid">
                {displayProducts.map(product => {
                  const id = product._id || product.id;
                  const price = product.price;
                  const name = product.name;
                  const image = product.image?.startsWith('http') ? product.image : `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${product.image}`;

                  return (
                    <div key={id} className="tryon-product-card">
                      <img src={image} alt={name} />
                      <div className="product-info">
                        <h4>{name}</h4>
                        <p>${price}</p>
                        <button
                          className="add-to-tryon-btn"
                          onClick={() => addToTryOn({ ...product, id, image })}
                        >
                          + Add to Try-On
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="outfit-history">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ margin: 0 }}>Your Try-On History</h3>
                {tryOnHistory.length > 0 && (
                  <button
                    onClick={clearTryOnHistory}
                    style={{ background: '#ff4d4f', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    🗑️ Clear History
                  </button>
                )}
              </div>
              {tryOnHistory.length === 0 ? (
                <p className="no-outfits">You haven't tried on any clothes yet.</p>
              ) : (
                <div className="tryon-products-grid">
                  {tryOnHistory.map((item, idx) => (
                    <div key={idx} className="tryon-product-card" style={{ cursor: 'pointer' }} onClick={() => navigate(`/product/${item.productId}`)}>
                      <img src={item.productImage?.startsWith("http") ? item.productImage : `http://localhost:5000${item.productImage}`} alt={item.productName} />
                      <div className="product-info">
                        <h4>{item.productName}</h4>
                        <p style={{ fontSize: '0.8rem', color: '#666' }}>Tried on {new Date(item.triedAt || Date.now()).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Main Content - Try-On Preview */}
        <div className="tryon-main">
          <div className="preview-container">
            <div className="preview-header">
              <h2>Virtual Fitting Room</h2>
              <div className="preview-actions">
                <button
                  className="action-btn secondary"
                  onClick={clearOutfit}
                  disabled={selectedProducts.length === 0}
                >
                  🗑️ Clear
                </button>
                <button
                  className="action-btn primary"
                  onClick={simulateTryOn}
                  disabled={selectedProducts.length === 0 || isLoading}
                >
                  {isLoading ? '🔄 Processing...' : '🎯 Try On Now!'}
                </button>
              </div>
            </div>

            {/* Selected Products List */}
            <div className="selected-products" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <h3 style={{ margin: 0 }}>Selected Items ({selectedProducts.length})</h3>

              {selectedProducts.length === 0 ? (
                <p className="no-selection">Select products to start virtual try-on</p>
              ) : (
                <div className="selected-items" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {selectedProducts.map(product => {
                    const availableItemSizes = product.sizes || ['XS', 'S', 'M', 'L', 'XL'];
                    const currentItemSize = product.selectedSize || 'M';

                    return (
                      <div key={product.id} className="selected-item" style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        background: '#fff', padding: '10px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <img src={product.image} alt={product.name} style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '6px' }} />
                          <div>
                            <span style={{ fontWeight: 'bold', display: 'block' }}>{product.name}</span>
                            {/* Hide size buttons in combination view */}
                            {selectedProducts.length <= 1 && (
                              <div style={{ display: 'flex', gap: '4px', marginTop: '5px' }}>
                                {availableItemSizes.map(sz => (
                                  <button
                                    key={sz}
                                    onClick={() => updateItemSize(product.id, sz)}
                                    style={{
                                      padding: '2px 8px',
                                      fontSize: '0.7rem',
                                      borderRadius: '4px',
                                      border: '1px solid ' + (currentItemSize === sz ? '#2196F3' : '#ddd'),
                                      background: currentItemSize === sz ? '#2196F3' : '#fff',
                                      color: currentItemSize === sz ? '#fff' : '#666',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    {sz}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <button
                          className="remove-btn"
                          onClick={() => removeFromTryOn(product.id)}
                          style={{ background: '#ffeded', color: '#ff4d4f', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>


            {/* Try-On Preview Area - PERSISTENT */}
            <div className="tryon-preview-container" style={{ position: 'relative', height: '650px', background: '#e9ecef', borderRadius: '12px' }}>

              {/* Floating Clothing Fit Controls - Only for Single Item Browser View */}
              {activeTab === 'browse' && selectedProducts.length === 1 && (
                <div style={{
                  position: 'absolute', bottom: '20px', left: '20px', right: '20px',
                  background: 'rgba(255,255,255,0.95)', padding: '15px', borderRadius: '12px',
                  zIndex: 120, boxShadow: '0 4px 15px rgba(0,0,0,0.2)', border: '1px solid #ddd'
                }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'center' }}>
                    <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Size Scale: {clothingAdj.scale.toFixed(2)}</label>
                      <input type="range" min="0.5" max="2.0" step="0.01" value={clothingAdj.scale}
                        onChange={(e) => setClothingAdj({ ...clothingAdj, scale: parseFloat(e.target.value) })}
                        style={{ width: '100%' }} />
                    </div>
                    <div style={{ flex: '1 1 120px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>X (Side): {clothingAdj.x.toFixed(2)}</label>
                      <input type="range" min="-0.5" max="0.5" step="0.01" value={clothingAdj.x}
                        onChange={(e) => setClothingAdj({ ...clothingAdj, x: parseFloat(e.target.value) })}
                        style={{ width: '100%' }} />
                    </div>
                    <div style={{ flex: '1 1 120px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Y (Height): {clothingAdj.y.toFixed(2)}</label>
                      <input type="range" min="-0.5" max="0.5" step="0.01" value={clothingAdj.y}
                        onChange={(e) => setClothingAdj({ ...clothingAdj, y: parseFloat(e.target.value) })}
                        style={{ width: '100%' }} />
                    </div>
                    <div style={{ flex: '1 1 120px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Z (Depth): {clothingAdj.z.toFixed(2)}</label>
                      <input type="range" min="-0.5" max="0.5" step="0.01" value={clothingAdj.z}
                        onChange={(e) => setClothingAdj({ ...clothingAdj, z: parseFloat(e.target.value) })}
                        style={{ width: '100%' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '10px', marginLeft: 'auto' }}>
                      <button onClick={() => setClothingAdj({ scale: 1.0, x: 0, y: 0, z: 0 })}
                        style={{ padding: '8px 15px', borderRadius: '6px', border: '1px solid #ccc', cursor: 'pointer', background: '#fff' }}>
                        Reset
                      </button>
                      <button onClick={saveAdjustments}
                        style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: '#4CAF50', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>
                        💾 Save For Everyone
                      </button>
                    </div>
                  </div>
                  <p style={{ margin: '8px 0 0 0', fontSize: '0.7rem', color: '#666', fontStyle: 'italic' }}>
                    * Adjusting: <strong>{selectedProducts[selectedProducts.length - 1]?.name}</strong>
                  </p>
                </div>
              )}

              {isLoading ? (
                <div className="loading-preview" style={{ position: 'absolute', inset: 0, zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.8)' }}>
                  <div className="spinner"></div>
                  <h3>AI is creating your virtual try-on...</h3>
                </div>
              ) : (
                <div className="preview-result" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <div className="outfit-preview-large" style={{ flex: 1, position: 'relative' }}>
                    <AvatarViewer
                      measurements={measurements}
                      modelUrl={measurements.gender === "male" ? "/models/male_base.glb" : "/models/female_base.glb"}
                      selectedItems={selectedProducts}
                      adjustmentScale={clothingAdj.scale}
                      adjustmentX={clothingAdj.x}
                      adjustmentY={clothingAdj.y}
                      adjustmentZ={clothingAdj.z}
                      initialSize={selectedSize}
                    />
                  </div>

                  {activeTab === 'preview' && (
                    <div className="preview-info" style={{ padding: '20px', background: '#fff', borderTop: '1px solid #ddd' }}>
                      <h3>Your Virtual Outfit</h3>
                      <div className="outfit-details" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '15px' }}>
                        {selectedProducts.map(product => (
                          <div key={product.id} className="outfit-item" style={{ background: '#f1f3f5', padding: '5px 12px', borderRadius: '15px', fontSize: '0.9rem' }}>
                            {product.name} - ${product.price}
                          </div>
                        ))}
                      </div>
                      <div className="preview-actions">
                        <button className="action-btn primary">🛒 Add All to Cart</button>
                        <button className="action-btn secondary">📷 Screenshot</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VirtualTryOn;
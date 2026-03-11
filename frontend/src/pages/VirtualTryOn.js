import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AvatarViewer from '../components/AvatarViewer';

const VirtualTryOn = () => {
  const navigate = useNavigate();
  const [selectedProducts, setSelectedProducts] = useState([]);
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

  // CLOTHING ADJUSTMENT STATE
  const [clothingAdj, setClothingAdj] = useState({ scale: 1.0, x: 0, y: 0, z: 0 });

  // MEASUREMENTS & FACE PARAMS
  const [measurements, setMeasurements] = useState(() => {
    const saved = localStorage.getItem("userMeasurements");
    return saved ? JSON.parse(saved) : {
      chest: 34, waist: 28, hips: 38, thigh: 20, shoulders: 15, height: 170, weight: 60, gender: "female"
    };
  });
  const [faceParams, setFaceParams] = useState(JSON.parse(localStorage.getItem('faceParams')) || null);
  const [isFaceLoading, setIsFaceLoading] = useState(false);

  const updateGender = (gender) => {
    const updated = { ...measurements, gender };
    setMeasurements(updated);
    localStorage.setItem("userMeasurements", JSON.stringify(updated));
  };

  const handleFaceUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsFaceLoading(true);
    const formData = new FormData();
    formData.append('photo', file);

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/avatar/face-from-photo`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setFaceParams(data.faceParams);
        localStorage.setItem('faceParams', JSON.stringify(data.faceParams));
        alert("✅ Face Generated Successfully! Switch to Preview to see changes.");
      } else {
        alert("❌ Error: " + (data.message || 'Face analysis failed'));
      }
    } catch (error) {
      console.error(error);
      alert("❌ Upload Failed: " + error.message);
    } finally {
      setIsFaceLoading(false);
    }
  };

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
      tryOnPreview: 'https://via.placeholder.com/400x600/FFFFFF/000000?text=👕+Try-On+View'
    },
    {
      id: '2',
      name: 'Designer Jeans',
      type: 'bottom',
      category: 'clothing',
      price: 65.99,
      image: 'https://via.placeholder.com/200x300/000080/FFFFFF?text=Denim+Jeans',
      tryOnPreview: 'https://via.placeholder.com/400x600/000080/FFFFFF?text=👖+Try-On+View'
    },
    {
      id: '3',
      name: 'Running Shoes',
      type: 'shoes',
      category: 'shoes',
      price: 120.99,
      image: 'https://via.placeholder.com/200x300/0000FF/FFFFFF?text=Running+Shoes',
      tryOnPreview: 'https://via.placeholder.com/400x600/0000FF/FFFFFF?text=👟+Try-On+View'
    },
    {
      id: '4',
      name: 'Designer Sunglasses',
      type: 'accessory',
      category: 'accessories',
      price: 89.99,
      image: 'https://via.placeholder.com/200x300/000000/FFFFFF?text=Sunglasses',
      tryOnPreview: 'https://via.placeholder.com/400x600/000000/FFFFFF?text=🕶️+Try-On+View'
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
    // Remove existing item of same type
    const filtered = selectedProducts.filter(item => item.type !== product.type);
    setSelectedProducts([...filtered, product]);
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
        <button className="back-btn" onClick={() => navigate('/dashboard')}>
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
            <button
              className={`tab-btn ${activeTab === 'face' ? 'active' : ''}`}
              onClick={() => setActiveTab('face')}
            >
              👤 Avatar Face
            </button>
            <button
              className={`tab-btn ${activeTab === 'adjust' ? 'active' : ''}`}
              onClick={() => setActiveTab('adjust')}
            >
              🔧 Adjustments
            </button>
          </div>

          {activeTab === 'adjust' && (
            <div className="products-list">
              <h3>Clothing & Body Fixes</h3>

              <div className="gender-selection" style={{ marginBottom: '20px' }}>
                <h4>Body Type Selection</h4>
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button
                    className={`filter-btn ${measurements.gender === 'male' ? 'active' : ''}`}
                    onClick={() => updateGender('male')}
                    style={{ flex: 1 }}
                  >
                    👨 Male
                  </button>
                  <button
                    className={`filter-btn ${measurements.gender === 'female' ? 'active' : ''}`}
                    onClick={() => updateGender('female')}
                    style={{ flex: 1 }}
                  >
                    👩 Female
                  </button>
                </div>
              </div>

              <div className="clothing-adjustment" style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px' }}>
                <h4>👕 Clothing Manual Fixes</h4>
                <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '15px' }}>Use these to fix size and alignment issues.</p>

                <div className="control-group" style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    Scale Multiplier <span>{clothingAdj.scale.toFixed(2)}x</span>
                  </label>
                  <input type="range" min="0.5" max="5.0" step="0.05" value={clothingAdj.scale}
                    onChange={(e) => setClothingAdj({ ...clothingAdj, scale: parseFloat(e.target.value) })}
                    style={{ width: '100%', accentColor: '#007bff' }} />
                </div>

                <div className="control-group" style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    Horizontal (X) <span>{clothingAdj.x.toFixed(2)}</span>
                  </label>
                  <input type="range" min="-2.0" max="2.0" step="0.01" value={clothingAdj.x}
                    onChange={(e) => setClothingAdj({ ...clothingAdj, x: parseFloat(e.target.value) })}
                    style={{ width: '100%', accentColor: '#007bff' }} />
                </div>

                <div className="control-group" style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    Vertical (Y) <span>{clothingAdj.y.toFixed(2)}</span>
                  </label>
                  <input type="range" min="-2.0" max="2.0" step="0.01" value={clothingAdj.y}
                    onChange={(e) => setClothingAdj({ ...clothingAdj, y: parseFloat(e.target.value) })}
                    style={{ width: '100%', accentColor: '#28a745' }} />
                </div>

                <div className="control-group" style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    Depth (Z) <span>{clothingAdj.z.toFixed(2)}</span>
                  </label>
                  <input type="range" min="-1.0" max="1.0" step="0.01" value={clothingAdj.z}
                    onChange={(e) => setClothingAdj({ ...clothingAdj, z: parseFloat(e.target.value) })}
                    style={{ width: '100%', accentColor: '#dc3545' }} />
                </div>

                <button
                  className="action-btn secondary"
                  onClick={() => setClothingAdj({ scale: 1.0, x: 0, y: 0, z: 0 })}
                  style={{ width: '100%', fontSize: '0.8rem' }}
                >
                  Reset Adjustments
                </button>
              </div>
            </div>
          )}

          {activeTab === 'face' && (
            <div className="products-list">
              <h3>Face Customization</h3>

              <div className="face-upload-section" style={{
                background: '#f8f9fa', padding: '15px', borderRadius: '8px', marginBottom: '20px',
                border: '2px dashed #ccc', textAlign: 'center'
              }}>
                <h4>🤖 AI Face Generator</h4>
                <p style={{ fontSize: '0.9rem', color: '#666' }}>Upload a selfie to generate your unique 3D face.</p>

                <input
                  type="file"
                  id="face-upload"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => handleFaceUpload(e)}
                />

                <button
                  className="add-to-tryon-btn"
                  onClick={() => document.getElementById('face-upload').click()}
                  disabled={isFaceLoading}
                  style={{ width: '100%', marginTop: '10px' }}
                >
                  {isFaceLoading ? 'Processing...' : '📸 Upload Photo'}
                </button>
              </div>

              {faceParams && (
                <div className="face-controls" style={{ marginTop: '20px' }}>
                  <h4>Manual Adjustments</h4>

                  {/* Skin Color Picker */}
                  <div className="control-group" style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      Skin Tone
                      <span>{faceParams.skinColor || "#e8beac"}</span>
                    </label>
                    <input
                      type="color"
                      value={faceParams.skinColor || "#e8beac"}
                      onChange={(e) => {
                        const newParams = { ...faceParams, skinColor: e.target.value };
                        setFaceParams(newParams);
                        localStorage.setItem('faceParams', JSON.stringify(newParams));
                      }}
                      style={{ width: '100%', height: '40px', cursor: 'pointer', border: 'none', background: 'none' }}
                    />
                  </div>

                  {Object.entries(faceParams).map(([key, value]) => (
                    // Only show numeric sliders
                    typeof value === 'number' && (
                      <div key={key} className="control-group" style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                          <span>{value.toFixed(2)}</span>
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={value}
                          onChange={(e) => {
                            const newParams = { ...faceParams, [key]: parseFloat(e.target.value) };
                            setFaceParams(newParams);
                            localStorage.setItem('faceParams', JSON.stringify(newParams));
                          }}
                          style={{ width: '100%' }}
                        />
                      </div>
                    )
                  ))}

                  <button
                    className="action-btn secondary"
                    onClick={() => setFaceParams(null)}
                    style={{ width: '100%', marginTop: '10px' }}
                  >
                    Reset Face
                  </button>
                </div>
              )}
            </div>
          )}

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

            {/* Selected Products */}
            <div className="selected-products">
              <h3>Selected Items ({selectedProducts.length})</h3>
              {selectedProducts.length === 0 ? (
                <p className="no-selection">Select products to start virtual try-on</p>
              ) : (
                <div className="selected-items">
                  {selectedProducts.map(product => (
                    <div key={product.id} className="selected-item">
                      <img src={product.image} alt={product.name} />
                      <span>{product.name}</span>
                      <button
                        className="remove-btn"
                        onClick={() => removeFromTryOn(product.id)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Try-On Preview Area - PERSISTENT */}
            <div className="tryon-preview-container" style={{ position: 'relative', height: '650px', background: '#e9ecef', borderRadius: '12px' }}>
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
                      clothingModelUrl={
                        selectedProducts.length > 0
                          ? (selectedProducts[selectedProducts.length - 1].model3D?.startsWith('http')
                            ? selectedProducts[selectedProducts.length - 1].model3D
                            : `http://localhost:5000${selectedProducts[selectedProducts.length - 1].model3D}`)
                          : null
                      }
                      category={selectedProducts.length > 0 ? (selectedProducts[selectedProducts.length - 1].type || selectedProducts[selectedProducts.length - 1].category) : ""}
                      faceParams={faceParams}
                      adjustmentScale={clothingAdj.scale}
                      adjustmentX={clothingAdj.x}
                      adjustmentY={clothingAdj.y}
                      adjustmentZ={clothingAdj.z}
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
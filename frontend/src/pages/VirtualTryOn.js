import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AvatarViewer from '../components/AvatarViewer';

const VirtualTryOn = () => {
  const navigate = useNavigate();
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [outfitHistory, setOutfitHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('browse');

  // Sample products for try-on
  const tryOnProducts = [
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

  const saveOutfit = () => {
    if (selectedProducts.length > 0) {
      const newOutfit = {
        id: Date.now(),
        products: [...selectedProducts],
        timestamp: new Date().toLocaleString()
      };
      setOutfitHistory([newOutfit, ...outfitHistory]);
      alert('Outfit saved successfully! 💾');
    } else {
      alert('Please select some products first!');
    }
  };

  const loadOutfit = (outfit) => {
    setSelectedProducts(outfit.products);
  };

  const clearOutfit = () => {
    setSelectedProducts([]);
  };

  const simulateTryOn = () => {
    setIsLoading(true);
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
              💾 Saved Outfits
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
                {tryOnProducts.map(product => (
                  <div key={product.id} className="tryon-product-card">
                    <img src={product.image} alt={product.name} />
                    <div className="product-info">
                      <h4>{product.name}</h4>
                      <p>${product.price}</p>
                      <button
                        className="add-to-tryon-btn"
                        onClick={() => addToTryOn(product)}
                      >
                        + Add to Try-On
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="outfit-history">
              <h3>Your Saved Outfits</h3>
              {outfitHistory.length === 0 ? (
                <p className="no-outfits">No saved outfits yet</p>
              ) : (
                outfitHistory.map(outfit => (
                  <div key={outfit.id} className="saved-outfit">
                    <div className="outfit-preview">
                      {outfit.products.slice(0, 3).map((product, index) => (
                        <img key={index} src={product.image} alt={product.name} />
                      ))}
                    </div>
                    <div className="outfit-info">
                      <p>{outfit.products.length} items</p>
                      <small>{outfit.timestamp}</small>
                    </div>
                    <button
                      className="load-outfit-btn"
                      onClick={() => loadOutfit(outfit)}
                    >
                      Load
                    </button>
                  </div>
                ))
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
                  className="action-btn secondary"
                  onClick={saveOutfit}
                  disabled={selectedProducts.length === 0}
                >
                  💾 Save Outfit
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

            {/* Try-On Preview Area */}
            <div className="tryon-preview">
              {isLoading ? (
                <div className="loading-preview">
                  <div className="spinner"></div>
                  <h3>AI is creating your virtual try-on...</h3>
                  <p>This may take a few seconds</p>
                </div>
              ) : activeTab === 'preview' ? (
                <div className="preview-result" style={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
                  <div className="outfit-preview-large" style={{ flex: 1, position: 'relative' }}>
                    {/* REAL 3D VIEWER */}
                    <AvatarViewer
                      modelUrl={
                        (JSON.parse(localStorage.getItem("userMeasurements"))?.gender === "male")
                          ? "/models/male_base.glb"
                          : "/models/female_base.glb"
                      }
                      clothingModelUrl="/models/dressM.glb"
                      measurements={JSON.parse(localStorage.getItem("userMeasurements")) || {
                        chest: 34, waist: 28, hips: 38, thigh: 20, shoulders: 15, height: 170, weight: 60, gender: "female"
                      }}
                    />
                  </div>
                  <div className="preview-info">
                    <h3>Your Virtual Outfit</h3>
                    <div className="outfit-details">
                      {selectedProducts.map(product => (
                        <div key={product.id} className="outfit-item">
                          <span>{product.name}</span>
                          <span>${product.price}</span>
                        </div>
                      ))}
                    </div>
                    <div className="preview-actions">
                      <button className="action-btn primary">🛒 Add All to Cart</button>
                      <button className="action-btn secondary">📷 Screenshot</button>
                      <button className="action-btn secondary" onClick={() => setActiveTab('browse')}>
                        ← Back to Products
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="preview-placeholder">
                  <div className="placeholder-content">
                    <div className="placeholder-icon">👗</div>
                    <h3>Ready for Virtual Try-On!</h3>
                    <p>Select products and click "Try On Now" to see how they look on you</p>
                    <div className="feature-list">
                      <div className="feature-item">✅ AI-powered fitting</div>
                      <div className="feature-item">✅ Realistic preview</div>
                      <div className="feature-item">✅ Save your favorite outfits</div>
                    </div>
                  </div>
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
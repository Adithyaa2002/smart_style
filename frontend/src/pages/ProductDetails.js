/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import AvatarViewer from "../components/AvatarViewer";
import ARViewer from "../components/ARViewer";
import { toast } from "react-toastify";
import "./ProductDetails.css"; // We will create this next
import axios from "axios";

const ProductDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { addToCart } = useCart();
    const { addToWishlist, isWishlisted, removeFromWishlist } = useWishlist();

    // use location.state if passed from dashboard to avoid immediate fetch delay
    const [product, setProduct] = useState(location.state || null);
    const [loading, setLoading] = useState(!location.state);
    const [showTryOn, setShowTryOn] = useState(false);
    const [overrideModel, setOverrideModel] = useState(null);
    const [isDemoMode, setIsDemoMode] = useState(false);
    const [relatedProducts, setRelatedProducts] = useState([]); // New State
    const [selectedSize, setSelectedSize] = useState(""); // Track user size choice
    const [showAR, setShowAR] = useState(false); // New AR State

    // CLOTHING ADJUSTMENT STATE
    const [clothingAdj, setClothingAdj] = useState({ scale: 1.0, y: 0, z: 0 });

    // --- Review State & Handler ---
    const [newReview, setNewReview] = useState({ rating: 5, comment: "" });

    const handleSubmitReview = async () => {
        const userUser = localStorage.getItem("user");
        if (!userUser) return toast.error("Please login to review");
        const parsedUser = JSON.parse(userUser);

        if (!newReview.comment.trim()) return toast.warn("Please write a comment");

        try {
            const res = await axios.post(`http://localhost:5000/api/products/reviews/${product._id}`, {
                userId: parsedUser.email,
                userName: parsedUser.name,
                rating: Number(newReview.rating),
                comment: newReview.comment
            });
            setProduct(res.data);
            setNewReview({ rating: 5, comment: "" });
            toast.success("Review Submitted!");
        } catch (err) {
            console.error(err);
            toast.error("Failed to submit review");
        }
    };

    // Load measurements from local storage or fallback to defaults
    const [measurements, setMeasurements] = useState(() => {
        const saved = localStorage.getItem("userMeasurements");
        // Ensure values are numbers for safe arithmetic
        if (saved) {
            return JSON.parse(saved);
        }
        return { chest: 34, waist: 28, hips: 38, thigh: 20, shoulders: 15, height: 170, weight: 60, gender: "female" };
    });

    const [faceParams, setFaceParams] = useState(() => {
        const saved = localStorage.getItem("faceParams");
        return saved ? JSON.parse(saved) : null;
    });

    useEffect(() => {
        if (!product) {
            axios.get(`http://localhost:5000/api/products/${id}`)
                .then(res => {
                    setProduct(res.data);
                    setLoading(false);
                })
                .catch(err => {
                    console.error(err);
                    toast.error("Failed to load product");
                    setLoading(false);
                });
        }
    }, [id, product]);

    // --- Fetch Related Products ---
    useEffect(() => {
        if (product?.category) {
            axios.get(`http://localhost:5000/api/products?category=${product.category}`)
                .then(res => {
                    // Filter out current product and limiting to 4
                    const others = res.data.filter(p => p._id !== product._id).slice(0, 4);
                    setRelatedProducts(others);
                })
                .catch(err => console.error("Failed to load related products", err));
        }
    }, [product]);

    if (loading) return <div className="loading">Loading Product Details...</div>;
    if (!product) return <div className="error">Product not found.</div>;

    return (
        <div className="product-details-container">
            <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>

            <div className="product-layout">
                {/* Left: Image / TryOn */}
                <div className="product-visual">
                    {showTryOn ? (
                        <div className="tryon-container">
                            <AvatarViewer
                                measurements={{
                                    height: Number(measurements.height),
                                    weight: Number(measurements.weight),
                                    chest: Number(measurements.chest),
                                    waist: Number(measurements.waist),
                                    hips: Number(measurements.hips),
                                    thigh: Number(measurements.thigh),
                                    shoulders: Number(measurements.shoulders),
                                    gender: measurements.gender
                                }}
                                clothingModelUrl={product.model3D ? (product.model3D.startsWith('http') ? product.model3D : `http://localhost:5000${product.model3D}`) : null}
                                category={product.category}
                                modelUrl={measurements.gender === 'male' ? "/models/male_base.glb" : "/models/female_base.glb"}
                                adjustmentScale={clothingAdj.scale}
                                adjustmentY={clothingAdj.y}
                                adjustmentZ={clothingAdj.z}
                                faceParams={faceParams}
                                sizeChartData={product.sizeChart}
                                availableSizes={product.sizes}
                                initialSize={selectedSize || (product.sizes && product.sizes[0])}
                                key={showTryOn ? `active-${product._id}` : "inactive"}
                            />

                            {/* ADJUSTMENT SLIDERS */}
                            <div className="clothing-fixes-overlay" style={{
                                position: 'absolute', bottom: '10px', left: '10px', right: '10px',
                                background: 'rgba(255,255,255,0.9)', padding: '10px', borderRadius: '8px',
                                zIndex: 120, fontSize: '0.8rem'
                            }}>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '5px' }}>
                                    <label>Size:</label>
                                    <input type="range" min="0.5" max="5.0" step="0.1" value={clothingAdj.scale}
                                        onChange={(e) => setClothingAdj({ ...clothingAdj, scale: parseFloat(e.target.value) })}
                                        style={{ flex: 1 }} />
                                    <span>{clothingAdj.scale.toFixed(1)}x</span>
                                </div>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <label>Up/Down:</label>
                                    <input type="range" min="-1.0" max="1.0" step="0.01" value={clothingAdj.y}
                                        onChange={(e) => setClothingAdj({ ...clothingAdj, y: parseFloat(e.target.value) })}
                                        style={{ flex: 1 }} />
                                    <span>{clothingAdj.y.toFixed(2)}</span>
                                </div>
                                <button
                                    onClick={() => setClothingAdj({ scale: 1.0, y: 0, z: 0 })}
                                    style={{ width: '100%', marginTop: '5px', fontSize: '10px' }}
                                >
                                    Reset Fixes
                                </button>
                            </div>
                            <button className="close-tryon" onClick={() => setShowTryOn(false)}>Close Try-On</button>
                        </div >
                    ) : (
                        <img
                            src={product.image?.startsWith("http") ? product.image : `http://localhost:5000${product.image}`}
                            alt={product.name}
                            className="main-product-img"
                        />
                    )}
                </div >

                {/* Right: Details */}
                < div className="product-info" >
                    <h1>{product.name}</h1>
                    <p className="price">₹{product.price}</p>

                    <div className="stock-status">
                        {product.stock > 0 ? (
                            <span className="in-stock">✅ In Stock ({product.stock} left)</span>
                        ) : (
                            <span className="out-of-stock">❌ Out of Stock</span>
                        )}
                    </div>

                    <p className="description">
                        {product.description || "No description available for this product. High quality fabric and premium stitch."}
                    </p>

                    <p className="category">Category: <strong>{product.category}</strong></p>

                    {/* VENDOR SIZE CHART DISPLAY */}
                    {product.sizeChart && Object.keys(product.sizeChart).length > 0 && (
                        <div className="size-chart-display" style={{ marginTop: '15px', marginBottom: '15px', background: '#f9f9f9', padding: '15px', borderRadius: '8px', border: '1px solid #eee' }}>
                            <h3 style={{ marginTop: 0, marginBottom: '10px', fontSize: '1.1rem', color: '#333' }}>Product Size Chart</h3>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '0.9rem' }}>
                                    <thead>
                                        <tr style={{ background: '#f0f0f0' }}>
                                            <th style={{ padding: '8px', border: '1px solid #ddd' }}>Size</th>
                                            <th style={{ padding: '8px', border: '1px solid #ddd' }}>Chest</th>
                                            <th style={{ padding: '8px', border: '1px solid #ddd' }}>Waist</th>
                                            <th style={{ padding: '8px', border: '1px solid #ddd' }}>Hips</th>
                                            <th style={{ padding: '8px', border: '1px solid #ddd' }}>Thigh</th>
                                            <th style={{ padding: '8px', border: '1px solid #ddd' }}>Shoulders</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.entries(product.sizeChart).map(([sizeName, measurements]) => (
                                            <tr key={sizeName}>
                                                <td style={{ padding: '8px', border: '1px solid #ddd', fontWeight: 'bold' }}>{sizeName}</td>
                                                <td style={{ padding: '8px', border: '1px solid #ddd' }}>{measurements.chest || '-'}</td>
                                                <td style={{ padding: '8px', border: '1px solid #ddd' }}>{measurements.waist || '-'}</td>
                                                <td style={{ padding: '8px', border: '1px solid #ddd' }}>{measurements.hips || '-'}</td>
                                                <td style={{ padding: '8px', border: '1px solid #ddd' }}>{measurements.thigh || '-'}</td>
                                                <td style={{ padding: '8px', border: '1px solid #ddd' }}>{measurements.shoulders || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <small style={{ display: 'block', marginTop: '8px', color: '#666', fontStyle: 'italic' }}>* Measurements are in inches</small>
                        </div>
                    )}

                    <div className="action-buttons">
                        <button
                            className="buy-now-btn"
                            disabled={product.stock <= 0}
                            onClick={() => {
                                addToCart({ ...product, id: product._id });
                                navigate("/cart");
                            }}
                        >
                            Buy Now
                        </button>

                        <button
                            className="add-cart-btn"
                            disabled={product.stock <= 0}
                            onClick={() => {
                                addToCart({ ...product, id: product._id });
                                toast.success("Added to Cart!");
                            }}
                        >
                            Add to Cart
                        </button>

                        <button
                            className={`wishlist-action-btn ${isWishlisted(product._id) ? "active" : ""}`}
                            onClick={() => isWishlisted(product._id) ? removeFromWishlist(product._id) : addToWishlist(product)}
                        >
                            {isWishlisted(product._id) ? "❤️ Wishlisted" : "🤍 Add to Wishlist"}
                        </button>
                    </div>

                    {/* TRY ON TRIGGER - Only if Model Exists */}
                    {product.model3D && (
                        <div className="tryon-section" style={{ marginTop: '20px', padding: '15px', background: '#f5f5f5', borderRadius: '8px' }}>
                            <h3>Virtual Experience</h3>
                            <p>See how this looks on your 3D avatar!</p>

                            {product.sizes && product.sizes.length > 0 && (
                                <div style={{ marginBottom: "15px" }}>
                                    <strong>Select a Size to Try On:</strong>
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                        {product.sizes.map(sz => (
                                            <button
                                                key={sz}
                                                onClick={() => setSelectedSize(sz)}
                                                style={{
                                                    padding: "8px 12px", border: "1px solid #ccc", borderRadius: "5px", cursor: "pointer",
                                                    background: selectedSize === sz ? "#000" : "#fff",
                                                    color: selectedSize === sz ? "#fff" : "#000",
                                                    fontWeight: "bold"
                                                }}
                                            >
                                                {sz}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <button
                                className="tryon-launch-btn"
                                style={{ width: '100%', padding: '12px', background: '#2196F3', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', transition: '0.3s' }}
                                onClick={() => {
                                    if (product.sizes?.length > 0 && !selectedSize) {
                                        return toast.error("Please select a size first!");
                                    }

                                    setIsDemoMode(false);
                                    setOverrideModel(null);
                                    setShowTryOn(true);

                                    // Save History
                                    const uStr = localStorage.getItem("user");
                                    if (uStr) {
                                        const u = JSON.parse(uStr);
                                        if (u.email) {
                                            axios.post(`http://localhost:5000/api/customer/${u.email}/tryon`, {
                                                productId: product._id,
                                                productName: product.name,
                                                productImage: product.image
                                            }).catch(e => console.log("History log failed", e));
                                        }
                                    }
                                }}>
                                👕 Try This Product
                            </button>

                            {/* COMBINATION TRY ON BUTTON */}
                            <button
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    background: '#4CAF50',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '5px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    transition: '0.3s',
                                    marginTop: '10px'
                                }}
                                onClick={() => {
                                    const getCanonicalType = (p) => {
                                        const cat = (p.type || p.category || "").toLowerCase();
                                        if (cat.includes("top") || cat.includes("shirt") || cat.includes("jacket") || cat.includes("tshirt") || cat.includes("upper")) return "top";
                                        if (cat.includes("pant") || cat.includes("trouser") || cat.includes("bottom") || cat.includes("short") || cat.includes("jeans") || cat.includes("lower")) return "bottom";
                                        if (cat.includes("dress") || cat.includes("suit") || cat.includes("outfit") || cat.includes("frock") || cat.includes("gown")) return "full";
                                        if (cat.includes("shoe") || cat.includes("foot")) return "shoes";
                                        return cat; // fallback
                                    };

                                    const savedProducts = JSON.parse(localStorage.getItem('combinationTryOnProducts') || '[]');
                                    const newType = getCanonicalType(product);

                                    // Filter existing items
                                    let filtered = savedProducts.filter(item => getCanonicalType(item) !== newType);

                                    if (newType === "full") {
                                        filtered = filtered.filter(item => {
                                            const t = getCanonicalType(item);
                                            return t !== "top" && t !== "bottom";
                                        });
                                    } else if (newType === "top" || newType === "bottom") {
                                        filtered = filtered.filter(item => getCanonicalType(item) !== "full");
                                    }

                                    const updatedProducts = [...filtered, {
                                        ...product,
                                        id: product._id,
                                        image: product.image?.startsWith('http') ? product.image : `http://localhost:5000${product.image}`
                                    }];

                                    localStorage.setItem('combinationTryOnProducts', JSON.stringify(updatedProducts));
                                    toast.success("Added to Combination Try-On!");
                                    navigate("/virtual-tryon");
                                }}
                            >
                                👗 Add to Combination Try-On
                            </button>

                            {/* AR BUTTON */}
                            <button
                                style={{ width: '100%', padding: '12px', background: '#9c27b0', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', transition: '0.3s', marginTop: '10px' }}
                                onClick={() => setShowAR(true)}
                            >
                                🔍 View in AR (Mobile)
                            </button>
                        </div>
                    )}
                </div >
            </div >

            {/* RELATED PRODUCTS SECTION */}
            {
                relatedProducts.length > 0 && (
                    <div className="related-products-section">
                        <h2>You May Also Like</h2>
                        <div className="related-grid">
                            {relatedProducts.map((rp) => (
                                <div key={rp._id} className="related-card" onClick={() => {
                                    setProduct(rp); // Update current view immediately
                                    navigate(`/product/${rp._id}`, { state: rp });
                                    window.scrollTo(0, 0); // Scroll top
                                }}>
                                    <img
                                        src={rp.image?.startsWith("http") ? rp.image : `http://localhost:5000${rp.image}`}
                                        alt={rp.name}
                                    />
                                    <h4>{rp.name}</h4>
                                    <p>₹{rp.price}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            }

            {/* REVIEWS SECTION */}
            <div className="reviews-section">
                <h2>Customer Reviews ({product.reviews?.length || 0})</h2>
                <div className="average-rating-display">
                    <span className="stars-large">{"★".repeat(Math.round(product.rating || 0)) + "☆".repeat(5 - Math.round(product.rating || 0))}</span>
                    <span className="rating-text">{product.rating?.toFixed(1) || 0} / 5</span>
                </div>

                <div className="reviews-list">
                    {product.reviews && product.reviews.length > 0 ? (
                        product.reviews.slice().reverse().map((rev, idx) => (
                            <div key={idx} className="review-card">
                                <div className="review-avatar">{rev.userName.charAt(0).toUpperCase()}</div>
                                <div className="review-content">
                                    <div className="review-header">
                                        <strong>{rev.userName}</strong>
                                        <span className="review-date">{new Date(rev.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <div className="review-stars">
                                        {"★".repeat(rev.rating) + "☆".repeat(5 - rev.rating)}
                                    </div>
                                    <p className="review-text">{rev.comment}</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="no-reviews">No reviews yet. Be the first to share your thoughts!</p>
                    )}
                </div>

                <div className="add-review-form">
                    <h3>Write a Review</h3>
                    <div className="review-inputs">
                        <select
                            value={newReview.rating}
                            onChange={(e) => setNewReview({ ...newReview, rating: Number(e.target.value) })}
                        >
                            <option value="5">⭐⭐⭐⭐⭐ (Excellent)</option>
                            <option value="4">⭐⭐⭐⭐ (Good)</option>
                            <option value="3">⭐⭐⭐ (Average)</option>
                            <option value="2">⭐⭐ (Poor)</option>
                            <option value="1">⭐ (Terrible)</option>
                        </select>
                        <textarea
                            placeholder="Share your experience with this product..."
                            value={newReview.comment}
                            onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                        />
                        <button className="submit-review-btn" onClick={handleSubmitReview}>Submit Review</button>
                    </div>
                </div>
            </div>

            {/* AR FULL SCREEN OVERLAY */}
            {showAR && product.model3D && (
                <ARViewer
                    modelUrl={product.model3D.startsWith('http') ? product.model3D : `http://localhost:5000${product.model3D}`}
                    onClose={() => setShowAR(false)}
                />
            )}
        </div >
    );
};

export default ProductDetails;

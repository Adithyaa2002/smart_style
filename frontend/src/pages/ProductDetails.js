import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import AvatarViewer from "../components/AvatarViewer";
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

    // CLOTHING ADJUSTMENT STATE
    const [clothingAdj, setClothingAdj] = useState({ scale: 1.0, x: 0, y: 0, z: 0 });

    // Auto-load adjustments when product is loaded
    useEffect(() => {
        if (product) {
            setClothingAdj({
                scale: product.adjustmentScale ?? 1.0,
                x: product.adjustmentX ?? 0,
                y: product.adjustmentY ?? 0,
                z: product.adjustmentZ ?? 0,
            });
        }
    }, [product?._id]);

    const saveAdjustments = async () => {
        if (!product?._id) return toast.error("No product loaded");
        try {
            const res = await axios.patch(`http://localhost:5000/api/products/${product._id}/adjustments`, {
                adjustmentScale: clothingAdj.scale,
                adjustmentX: clothingAdj.x,
                adjustmentY: clothingAdj.y,
                adjustmentZ: clothingAdj.z,
            });
            if (res.data.success) {
                setProduct({ ...product, ...res.data.product });
                toast.success("✅ Adjustments saved for everyone!");
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to save adjustments");
        }
    };

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
                                adjustmentX={clothingAdj.x}
                                adjustmentY={clothingAdj.y}
                                adjustmentZ={clothingAdj.z}
                                faceParams={faceParams}
                                name={product.name}
                                key={showTryOn ? `active-${product._id}` : "inactive"}
                            />

                            {/* ADJUSTMENT SLIDERS */}
                            <div className="clothing-fixes-overlay" style={{
                                position: 'absolute', bottom: '10px', left: '10px', right: '10px',
                                background: 'rgba(255,255,255,0.9)', padding: '10px', borderRadius: '8px',
                                zIndex: 120, fontSize: '0.8rem'
                            }}>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '5px' }}>
                                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                                        <div style={{ flex: '1 1 45%', display: 'flex', gap: '5px', alignItems: 'center' }}>
                                            <label>Size:</label>
                                            <input type="range" min="0.5" max="5.0" step="0.1" value={clothingAdj.scale}
                                                onChange={(e) => setClothingAdj({ ...clothingAdj, scale: parseFloat(e.target.value) })}
                                                style={{ flex: 1 }} />
                                        </div>
                                        <div style={{ flex: '1 1 45%', display: 'flex', gap: '5px', alignItems: 'center' }}>
                                            <label>X:</label>
                                            <input type="range" min="-1.0" max="1.0" step="0.01" value={clothingAdj.x}
                                                onChange={(e) => setClothingAdj({ ...clothingAdj, x: parseFloat(e.target.value) })}
                                                style={{ flex: 1 }} />
                                        </div>
                                        <div style={{ flex: '1 1 45%', display: 'flex', gap: '5px', alignItems: 'center' }}>
                                            <label>Y:</label>
                                            <input type="range" min="-1.0" max="1.0" step="0.01" value={clothingAdj.y}
                                                onChange={(e) => setClothingAdj({ ...clothingAdj, y: parseFloat(e.target.value) })}
                                                style={{ flex: 1 }} />
                                        </div>
                                        <div style={{ flex: '1 1 45%', display: 'flex', gap: '5px', alignItems: 'center' }}>
                                            <label>Z:</label>
                                            <input type="range" min="-1.0" max="1.0" step="0.01" value={clothingAdj.z}
                                                onChange={(e) => setClothingAdj({ ...clothingAdj, z: parseFloat(e.target.value) })}
                                                style={{ flex: 1 }} />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
                                        <button
                                            onClick={() => setClothingAdj({ scale: 1.0, x: 0, y: 0, z: 0 })}
                                            style={{ flex: 1, fontSize: '10px', padding: '5px' }}
                                        >
                                            Reset
                                        </button>
                                        <button
                                            onClick={saveAdjustments}
                                            style={{ flex: 2, fontSize: '10px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', padding: '5px' }}
                                        >
                                            💾 Save for Everyone
                                        </button>
                                    </div>
                                </div>
                                <button className="close-tryon" onClick={() => setShowTryOn(false)}>Close Try-On</button>
                            </div>
                        </div>
                    ) : (
                        <img
                            src={product.image?.startsWith("http") ? product.image : `http://localhost:5000${product.image}`}
                            alt={product.name}
                            className="main-product-img"
                        />
                    )}
                </div>

                {/* Right: Details */}
                <div className="product-info">
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
                        <div className="tryon-section">
                            <h3>Virtual Experience</h3>
                            <p>See how this looks on your 3D avatar!</p>

                            <button className="tryon-launch-btn" onClick={() => {
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
        </div >
    );
};

export default ProductDetails;

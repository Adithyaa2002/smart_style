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
    const [relatedProducts, setRelatedProducts] = useState([]); // New State

    // Mock measurements for now (In real app, fetch from user profile)
    const measurements = { chest: 90, waist: 70, hips: 95 };

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
                                    chest: Number(measurements.chest),
                                    waist: Number(measurements.waist),
                                    hips: Number(measurements.hips),
                                }}
                                clothingModelUrl={
                                    overrideModel ||
                                    (product.model3D ? `http://localhost:5000${product.model3D}` : null)
                                }
                            />
                            <button className="close-tryon" onClick={() => setShowTryOn(false)}>Close Try-On</button>
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

                    {/* TRY ON TRIGGER */}
                    <div className="tryon-section">
                        <h3>Virtual Experience</h3>
                        <p>See how this looks on your 3D avatar!</p>

                        {/* Demo Button for User's dress1.glb */}
                        <button
                            className="tryon-launch-btn"
                            style={{ backgroundColor: "#ff4081", marginTop: "10px" }}
                            onClick={() => {
                                setOverrideModel("/models/dress1.glb");
                                setShowTryOn(true);
                            }}
                        >
                            👗 Try Demo Dress
                        </button>

                        {product.model3D && (
                            <button className="tryon-launch-btn" onClick={() => {
                                setOverrideModel(null);
                                setShowTryOn(true);
                            }}>
                                👕 Try This Product
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* RELATED PRODUCTS SECTION */}
            {relatedProducts.length > 0 && (
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
            )}
        </div>
    );
};

export default ProductDetails;

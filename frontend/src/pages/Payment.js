import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { useCart } from "../context/CartContext";
import "./Payment.css";

const Payment = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { clearCart } = useCart();

    // Retrieve passed data.
    const { items, totalAmount, customer } = location.state || {};

    const [method, setMethod] = useState("online"); // online or cod

    const [loading, setLoading] = useState(false);

    const loadRazorpayScript = () => {
        return new Promise((resolve) => {
            const script = document.createElement("script");
            script.src = "https://checkout.razorpay.com/v1/checkout.js";
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    const [shippingInfo, setShippingInfo] = useState({
        name: customer?.name || "",
        address: customer?.addressLine1 || "",
        city: customer?.city || "",
        pincode: customer?.pincode || "",
        phone: customer?.phone || ""
    });

    if (!items || !totalAmount) {
        return (
            <div className="payment-error">
                <h2>⚠️ No active order found.</h2>
                <button onClick={() => navigate("/customer-dashboard")}>Return to Dashboard</button>
            </div>
        );
    }

    const handlePayment = async () => {
        // 0. Address Validation
        if (!shippingInfo.name || !shippingInfo.address || !shippingInfo.city || !shippingInfo.pincode || !shippingInfo.phone) {
            toast.error("Please fill in all Delivery Address fields.");
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        if (method === 'cod') {
            setLoading(true);
            try {
                const formattedAddress = `${shippingInfo.name}, ${shippingInfo.address}, ${shippingInfo.city} - ${shippingInfo.pincode}. Phone: ${shippingInfo.phone}`;
                const orderPayload = {
                    customerId: customer?.email || "guest",
                    items: items.map((item) => ({
                        productId: item._id || item.id,
                        name: item.name,
                        price: item.price,
                        quantity: item.quantity,
                        image: item.image,
                    })),
                    totalAmount: totalAmount,
                    paymentStatus: "Pending",
                    paymentMethod: "cod",
                    shippingAddress: formattedAddress
                };
                await axios.post("http://localhost:5000/api/orders", orderPayload);
                toast.success("🎉 Order Placed Successfully!");
                clearCart();
                navigate("/order-success");
            } catch (err) {
                console.error("Order failed:", err);
                toast.error("Order creation failed. Please try again.");
            } finally {
                setLoading(false);
            }
            return;
        }

        // Razorpay Payment
        setLoading(true);
        const res = await loadRazorpayScript();

        if (!res) {
            toast.error("Razorpay SDK failed to load. Check your connection.");
            setLoading(false);
            return;
        }

        try {
            // Create order on backend
            const orderRes = await axios.post("http://localhost:5000/api/payment/create-order", {
                amount: totalAmount,
                currency: "INR",
            });

            if (!orderRes.data.success) {
                throw new Error("Could not create Razorpay order");
            }

            const { order } = orderRes.data;

            const options = {
                key: orderRes.data.key_id, // Dynamically use the key from backend
                amount: order.amount,
                currency: order.currency,
                name: "SmartStyle",
                description: "Purchase Payment",
                order_id: order.id,
                handler: async (response) => {
                    try {
                        // Verify payment
                        const verifyRes = await axios.post("http://localhost:5000/api/payment/verify", response);

                        if (verifyRes.data.success) {
                            // Create actual order
                            const formattedAddress = `${shippingInfo.name}, ${shippingInfo.address}, ${shippingInfo.city} - ${shippingInfo.pincode}. Phone: ${shippingInfo.phone}`;
                            const orderPayload = {
                                customerId: customer?.email || "guest",
                                items: items.map((item) => ({
                                    productId: item._id || item.id,
                                    name: item.name,
                                    price: item.price,
                                    quantity: item.quantity,
                                    image: item.image,
                                })),
                                totalAmount: totalAmount,
                                paymentStatus: "Paid",
                                paymentMethod: method,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_order_id: response.razorpay_order_id,
                                shippingAddress: formattedAddress
                            };

                            await axios.post("http://localhost:5000/api/orders", orderPayload);
                            toast.success("🎉 Payment Successful & Order Placed!");
                            clearCart();
                            navigate("/order-success");
                        } else {
                            toast.error("Payment verification failed.");
                        }
                    } catch (err) {
                        console.error("Verification error:", err);
                        toast.error("Verification failed.");
                    }
                },
                prefill: {
                    name: shippingInfo.name,
                    email: customer?.email || "",
                    contact: shippingInfo.phone,
                    method: '', // Let user choose specific online method in modal
                },
                theme: {
                    color: "#e91e63",
                },
            };

            const rzp = new window.Razorpay(options);
            rzp.open();
        } catch (error) {
            console.error("Payment error:", error);
            toast.error("An error occurred during payment.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="checkout-container">
            <div className="checkout-grid">

                {/* LEFT: ORDER SUMMARY */}
                <div className="order-summary-box">
                    <h3>🛒 Order Summary</h3>
                    <div className="summary-items">
                        {items.map((item, idx) => (
                            <div key={idx} className="summary-row">
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <div className="summary-qty">{item.quantity}x</div>
                                    <div className="summary-name">{item.name}</div>
                                </div>
                                <div className="summary-price">₹{item.price * item.quantity}</div>
                            </div>
                        ))}
                    </div>
                    <div className="summary-divider"></div>
                    <div className="summary-total-row">
                        <span>Total to Pay</span>
                        <span className="total-amount">₹{totalAmount}</span>
                    </div>
                    <div className="security-badge">
                        🔒 256-bit SSL Secured
                    </div>
                </div>

                {/* RIGHT COLUMN WRAPPER */}
                <div className="checkout-main-content">

                    {/* 1. DELIVERY ADDRESS SECTION */}
                    <div className="payment-gateway-box" style={{ marginBottom: '25px' }}>
                        <h2>📍 Delivery Address</h2>
                        <div className="card-form animate-fade-in">
                            <div className="input-group">
                                <label>Full Name</label>
                                <input
                                    type="text"
                                    placeholder="John Doe"
                                    value={shippingInfo.name}
                                    onChange={(e) => setShippingInfo({ ...shippingInfo, name: e.target.value })}
                                />
                            </div>
                            <div className="input-group">
                                <label>Address (House No, Street)</label>
                                <input
                                    type="text"
                                    placeholder="123 Main St"
                                    value={shippingInfo.address}
                                    onChange={(e) => setShippingInfo({ ...shippingInfo, address: e.target.value })}
                                />
                            </div>
                            <div className="input-row">
                                <div className="input-group">
                                    <label>City</label>
                                    <input
                                        type="text"
                                        placeholder="New York"
                                        value={shippingInfo.city}
                                        onChange={(e) => setShippingInfo({ ...shippingInfo, city: e.target.value })}
                                    />
                                </div>
                                <div className="input-group">
                                    <label>Pincode</label>
                                    <input
                                        type="text"
                                        placeholder="10001"
                                        value={shippingInfo.pincode}
                                        onChange={(e) => setShippingInfo({ ...shippingInfo, pincode: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="input-group">
                                <label>Phone Number</label>
                                <input
                                    type="text"
                                    placeholder="+1 234 567 8900"
                                    value={shippingInfo.phone}
                                    onChange={(e) => setShippingInfo({ ...shippingInfo, phone: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* 2. PAYMENT METHOD SECTION */}
                    <div className="payment-gateway-box">
                        <h2>Select Payment Method</h2>

                        <div className="payment-selection-simple">
                            <label className={`selection-card ${method === 'online' ? 'active' : ''}`}>
                                <input
                                    type="radio"
                                    name="paymentMode"
                                    value="online"
                                    checked={method === 'online'}
                                    onChange={() => setMethod('online')}
                                />
                                <div className="selection-info">
                                    <span className="selection-title">💳 Pay Online</span>
                                    <span className="selection-desc">Card, UPI, NetBanking (via Razorpay)</span>
                                </div>
                            </label>

                            <label className={`selection-card ${method === 'cod' ? 'active' : ''}`}>
                                <input
                                    type="radio"
                                    name="paymentMode"
                                    value="cod"
                                    checked={method === 'cod'}
                                    onChange={() => setMethod('cod')}
                                />
                                <div className="selection-info">
                                    <span className="selection-title">📦 Cash on Delivery</span>
                                    <span className="selection-desc">Pay securely with cash at your doorstep</span>
                                </div>
                            </label>
                        </div>

                        <button
                            className={`pay-now-btn ${loading ? 'loading' : ''}`}
                            onClick={handlePayment}
                            disabled={loading}
                        >
                            {loading ? "Processing..." : (method === 'cod' ? "Place Order" : `Pay ₹${totalAmount} Securely`)}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Payment;

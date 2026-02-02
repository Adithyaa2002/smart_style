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

    const [method, setMethod] = useState("card"); // card, upi, cod
    const [loading, setLoading] = useState(false);

    const [cardDetails, setCardDetails] = useState({
        number: "",
        name: "",
        expiry: "",
        cvv: ""
    });
    const [upiId, setUpiId] = useState("");

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

        setLoading(true);

        // 1. Simulate API Handshake
        toast.info(method === 'cod' ? "Confirming Order..." : "Contacting Payment Gateway...");

        await new Promise(r => setTimeout(r, 2000)); // Fake network lag

        // 2. Validation (Mock)
        if (method === 'card' && cardDetails.number.length < 16) {
            toast.error("Invalid Card Number");
            setLoading(false);
            return;
        }
        if (method === 'upi' && !upiId.includes("@")) {
            toast.error("Invalid UPI ID");
            setLoading(false);
            return;
        }

        // 3. Process Order
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
                paymentStatus: method === 'cod' ? "Pending" : "Paid",
                paymentMethod: method,
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

                        <div className="payment-tabs">
                            <button
                                className={`tab-btn ${method === 'card' ? 'active' : ''}`}
                                onClick={() => setMethod('card')}
                            >
                                💳 Card
                            </button>
                            <button
                                className={`tab-btn ${method === 'upi' ? 'active' : ''}`}
                                onClick={() => setMethod('upi')}
                            >
                                📱 UPI
                            </button>
                            <button
                                className={`tab-btn ${method === 'cod' ? 'active' : ''}`}
                                onClick={() => setMethod('cod')}
                            >
                                🚚 COD
                            </button>
                        </div>

                        <div className="payment-content">
                            {method === 'card' && (
                                <div className="card-form animate-fade-in">
                                    <div className="input-group">
                                        <label>Card Number</label>
                                        <input
                                            type="text"
                                            placeholder="0000 0000 0000 0000"
                                            maxLength="19"
                                            value={cardDetails.number}
                                            onChange={e => setCardDetails({ ...cardDetails, number: e.target.value })}
                                        />
                                    </div>
                                    <div className="input-row">
                                        <div className="input-group">
                                            <label>Expiry</label>
                                            <input
                                                type="text"
                                                placeholder="MM/YY"
                                                maxLength="5"
                                                value={cardDetails.expiry}
                                                onChange={e => setCardDetails({ ...cardDetails, expiry: e.target.value })}
                                            />
                                        </div>
                                        <div className="input-group">
                                            <label>CVV</label>
                                            <input
                                                type="password"
                                                placeholder="123"
                                                maxLength="3"
                                                value={cardDetails.cvv}
                                                onChange={e => setCardDetails({ ...cardDetails, cvv: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="input-group">
                                        <label>Cardholder Name</label>
                                        <input
                                            type="text"
                                            placeholder="Name on Card"
                                            value={cardDetails.name}
                                            onChange={e => setCardDetails({ ...cardDetails, name: e.target.value })}
                                        />
                                    </div>
                                </div>
                            )}

                            {method === 'upi' && (
                                <div className="upi-form animate-fade-in">
                                    <div className="input-group">
                                        <label>Enter UPI ID (VPA)</label>
                                        <input
                                            type="text"
                                            placeholder="username@bank"
                                            value={upiId}
                                            onChange={e => setUpiId(e.target.value)}
                                        />
                                    </div>
                                    <div className="upi-suggestions">
                                        <span onClick={() => setUpiId("user@oksbi")}>@oksbi</span>
                                        <span onClick={() => setUpiId("user@okhdfcbank")}>@okhdfcbank</span>
                                        <span onClick={() => setUpiId("user@paytm")}>@paytm</span>
                                    </div>
                                    <div className="qr-placeholder">
                                        <div className="qr-box">
                                            📷 <br /> Scan QR Code
                                        </div>
                                    </div>
                                </div>
                            )}

                            {method === 'cod' && (
                                <div className="cod-info animate-fade-in">
                                    <p>📦 Pay securely with cash upon delivery.</p>
                                    <p>Additional ₹50 handling fee may apply for certain locations.</p>
                                </div>
                            )}

                            <button
                                className={`pay-now-btn ${loading ? 'loading' : ''}`}
                                onClick={handlePayment}
                                disabled={loading}
                            >
                                {loading ? "Processing..." : (method === 'cod' ? "Place Order" : `Pay ₹${totalAmount}`)}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Payment;

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import "./OrderDetails.css";
import { toast } from "react-toastify";

const OrderDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios.get(`http://localhost:5000/api/orders/${id}`)
            .then(res => {
                setOrder(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                toast.error("Failed to load order details");
                setLoading(false);
            });
    }, [id]);

    if (loading) return <div className="loading">Loading Order Details...</div>;
    if (!order) return <div className="error-page">Order not found.</div>;

    // Helper for timeline status
    const getStatusIndex = (status) => {
        const statuses = ["Pending", "Processing", "Shipped", "Delivered"];
        return statuses.indexOf(status) > -1 ? statuses.indexOf(status) : 0;
    };

    const currentStatusIdx = getStatusIndex(order.status || "Pending");
    const statuses = ["Order Placed", "Processing", "Shipped", "Delivered"];

    return (
        <div className="order-details-container">
            <button className="back-btn" onClick={() => navigate("/customer-dashboard", { state: { activeTab: 'orders' } })}>
                ← Back to Orders
            </button>

            <div className="order-header-card">
                <div className="header-left">
                    <h1>Order #{order._id.slice(-6).toUpperCase()}</h1>
                    <p className="order-date">Placed on {new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString()}</p>
                </div>
                <div className="header-right">
                    <span className="total-label">Total Amount</span>
                    <span className="total-value">₹{order.totalAmount}</span>
                </div>
            </div>

            {/* TRACKING TIMELINE */}
            <div className="tracking-card">
                <h3>📦 Order Status</h3>
                <div className="timeline-wrapper">
                    <div className="timeline-line">
                        <div className="timeline-progress" style={{ width: `${(currentStatusIdx / (statuses.length - 1)) * 100}%` }}></div>
                    </div>
                    <div className="timeline-steps">
                        {statuses.map((step, idx) => (
                            <div key={idx} className={`timeline-step ${idx <= currentStatusIdx ? "active" : ""}`}>
                                <div className="step-circle">{idx <= currentStatusIdx ? "✓" : idx + 1}</div>
                                <span className="step-label">{step}</span>
                            </div>
                        ))}
                    </div>
                </div>
                {order.status === "Pending" && (
                    <p className="status-note">Your order is currently pending confirmation.</p>
                )}
            </div>

            <div className="order-content-grid">
                {/* ITEMS LIST */}
                <div className="items-card">
                    <h3>Items in Order ({order.items.length})</h3>
                    <div className="items-list">
                        {order.items.map((item, i) => (
                            <div key={i} className="order-item-row">
                                <img
                                    src={item.image?.startsWith("http") ? item.image : `http://localhost:5000${item.image}`}
                                    alt={item.name}
                                    className="order-item-img"
                                />
                                <div className="order-item-info">
                                    <h4>{item.name}</h4>
                                    <p>Qty: {item.quantity}</p>
                                </div>
                                <div className="order-item-price">
                                    ₹{item.price * item.quantity}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* SHIPPING & PAYMENT INFO */}
                <div className="info-card-wrapper">
                    <div className="info-card">
                        <h3>📍 Shipping Details</h3>
                        <p className="address-text">{order.shippingAddress || "N/A"}</p>
                    </div>

                    <div className="info-card">
                        <h3>💳 Payment Information</h3>
                        <div className="payment-row">
                            <span>Method:</span>
                            <span className="bold">{order.paymentMethod?.toUpperCase() || "N/A"}</span>
                        </div>
                        <div className="payment-row">
                            <span>Status:</span>
                            <span className={`status-badge ${order.paymentStatus === "Paid" ? "green" : "orange"}`}>
                                {order.paymentStatus}
                            </span>
                        </div>
                    </div>

                    <div className="help-box">
                        <p>Need help with this order?</p>
                        <button className="help-btn">Contact Support</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrderDetails;

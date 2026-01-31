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

    // Retrieve passed data. If accessed directly without state, redirect back.
    const { items, totalAmount, customer } = location.state || {};

    const [paymentDetails, setPaymentDetails] = useState({
        cardNumber: "",
        expiry: "",
        cvv: "",
        nameOnCard: ""
    });

    if (!items || !totalAmount) {
        return (
            <div className="payment-container">
                <h2>No order details found.</h2>
                <button className="pay-btn" onClick={() => navigate("/customer-dashboard")}>
                    Go Back to Dashboard
                </button>
            </div>
        );
    }

    const handleInputChange = (e) => {
        setPaymentDetails({ ...paymentDetails, [e.target.name]: e.target.value });
    };

    const handlePaymentSubmit = async (e) => {
        e.preventDefault();

        // Simulate payment processing
        toast.info("Processing Payment...");

        setTimeout(async () => {
            try {
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
                    shippingAddress: customer ? `${customer.addressLine1}, ${customer.city}` : "N/A"
                };

                // Post to backend
                await axios.post("http://localhost:5000/api/orders", orderPayload);

                toast.success("🎉 Payment Successful! Order Placed.");
                clearCart();
                navigate("/customer-dashboard");
            } catch (err) {
                console.error("Order creation failed:", err);
                toast.error("❌ Payment worked, but order creation failed.");
            }
        }, 2000);
    };

    return (
        <div className="payment-container">
            <h2 className="payment-title">Secure Checkout</h2>

            <div className="order-summary">
                <h3>Order Summary</h3>
                {items.map((item, index) => (
                    <div key={index} className="summary-item">
                        <span>{item.name} (x{item.quantity})</span>
                        <span>₹{item.price * item.quantity}</span>
                    </div>
                ))}
                <div className="summary-total">
                    <span>Total Amount</span>
                    <span>₹{totalAmount}</span>
                </div>
            </div>

            <form className="payment-form" onSubmit={handlePaymentSubmit}>
                <h3>Payment Details</h3>

                <div className="form-group">
                    <label>Cardholder Name</label>
                    <input
                        type="text"
                        name="nameOnCard"
                        placeholder="John Doe"
                        value={paymentDetails.nameOnCard}
                        onChange={handleInputChange}
                        required
                    />
                </div>

                <div className="form-group">
                    <label>Card Number</label>
                    <input
                        type="text"
                        name="cardNumber"
                        placeholder="0000 0000 0000 0000"
                        value={paymentDetails.cardNumber}
                        onChange={handleInputChange}
                        required
                        maxLength="19"
                    />
                </div>

                <div className="row">
                    <div className="form-group">
                        <label>Expiry Date</label>
                        <input
                            type="text"
                            name="expiry"
                            placeholder="MM/YY"
                            value={paymentDetails.expiry}
                            onChange={handleInputChange}
                            required
                            maxLength="5"
                        />
                    </div>
                    <div className="form-group">
                        <label>CVV</label>
                        <input
                            type="password"
                            name="cvv"
                            placeholder="123"
                            value={paymentDetails.cvv}
                            onChange={handleInputChange}
                            required
                            maxLength="3"
                        />
                    </div>
                </div>

                <button type="submit" className="pay-btn">Pay ₹{totalAmount}</button>
            </form>
        </div>
    );
};

export default Payment;

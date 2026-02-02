import React from 'react';
import { useNavigate } from 'react-router-dom';
import './OrderSuccess.css';

const OrderSuccess = () => {
    const navigate = useNavigate();

    return (
        <div className="success-page-container">
            <div className="success-card">
                <div className="checkmark-wrapper">
                    <svg className="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                        <circle className="checkmark__circle" cx="26" cy="26" r="25" fill="none" />
                        <path className="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
                    </svg>
                </div>

                <h1>Order Placed Successfully!</h1>
                <p>Thank you for shopping with SmartStyle.</p>
                <p className="order-note">Your order will be delivered soon.</p>

                <div className="success-actions">
                    <button className="dashboard-btn" onClick={() => navigate("/customer-dashboard", { state: { activeTab: 'orders' } })}>
                        View My Orders
                    </button>
                    <button className="continue-btn" onClick={() => navigate("/customer-dashboard")}>
                        Continue Shopping
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OrderSuccess;

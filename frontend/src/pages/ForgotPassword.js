import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import './Login.css'; // Reusing Login styles

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            await axios.post(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/auth/forgot-password`, { email });
            toast.success("Password reset link sent to your email!");
            setTimeout(() => navigate('/'), 3000);
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to send reset link.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-box">
                <h2>Forgot Password?</h2>
                <p style={{ marginBottom: '20px', color: '#666' }}>Enter your email address and we'll send you a link to reset your password.</p>

                <form onSubmit={handleSubmit}>
                    <input
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        style={{ marginBottom: '15px' }}
                    />
                    <button type="submit" disabled={loading}>
                        {loading ? "Sending..." : "Send Reset Link"}
                    </button>
                </form>

                <div className="login-footer">
                    <span onClick={() => navigate('/')} style={{ cursor: 'pointer', color: '#e91e63' }}>
                        Back to Login
                    </span>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;

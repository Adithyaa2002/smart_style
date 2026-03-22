/* eslint-disable jsx-a11y/anchor-is-valid */
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

const Login = ({ setUser }) => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email.trim(),
          password: formData.password.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.isUnverified) {
          setError(data.message);
          setLoading(false);
          // Optionally redirect to signup or a verification page
          // navigate("/signup", { state: { email: formData.email } });
          return;
        }
        throw new Error(data.message || "Login failed");
      }

      loginSuccess(data);
    } catch (err) {
      setLoading(false);
      setError(err.message);
    }
  };

  const loginSuccess = (data) => {
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    setUser(data.user);
    setSuccess("Login successful! Redirecting...");
    setLoading(false);

    if (data.user.role === "customer") {
      navigate("/customer-dashboard");
    } else if (data.user.role === "vendor") {
      navigate("/vendor-dashboard");
    } else if (data.user.role === "admin") {
      navigate("/admin-dashboard");
    }
  };

  return (
    <div className="login-page">
      <div className="login-wrapper">
        <div className="login-left">
          <div className="login-content">
            <h2>Login</h2>
            <p>Get access to your Orders, Wishlist and Recommendations</p>
            <div className="promo-illustration">
              🛍️
            </div>
          </div>
        </div>

        <div className="login-right">
          <form onSubmit={handleLogin} className="login-form-groups">
            <div className="floating-input-group">
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="floating-input"
                placeholder=" "
              />
              <label className="floating-label">Enter Email/Mobile number</label>
            </div>

            <div className="floating-input-group">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="floating-input"
                placeholder=" "
              />
              <label className="floating-label">Enter Password</label>
              <span
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                role="button"
                tabIndex={0}
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#878787" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#878787" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </span>
            </div>

            <div className="form-footer-text">
              By continuing, you agree to SmartStyle's <a href="#">Terms of Use</a> and <a href="#">Privacy Policy</a>.
            </div>

            <button type="submit" className="login-submit-btn" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </button>

            <div className="login-links">
              <Link to="/forgot-password" style={{ textDecoration: 'none', color: '#2874f0' }}>Forgot Password?</Link>
              <br />
              <span style={{ color: "#333", fontSize: "0.9rem", marginTop: "10px", display: "block" }}>
                New to SmartStyle? <Link to="/signup">Create an account</Link>
              </span>
            </div>
          </form>
          {error && <p className="error-text">{error}</p>}
          {success && <p className="success-text">{success}</p>}
        </div>
      </div>
    </div>
  );
};

export default Login;
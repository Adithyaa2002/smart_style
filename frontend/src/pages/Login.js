import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

const Login = ({ setUser }) => {
  const [formData, setFormData] = useState({ email: "", password: "" });
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
      // ✅ Hardcoded Admin Login
      if (formData.email === "admin@smartstyle.com" && formData.password === "admin123") {
        const adminUser = {
          name: "Admin",
          email: formData.email,
          role: "admin",
        };

        localStorage.setItem("user", JSON.stringify(adminUser));
        localStorage.setItem("token", "admin-token");

        setUser(adminUser);
        setSuccess("Admin login successful!");
        setLoading(false);

        navigate("/admin-dashboard");
        return;
      }

      // ✅ Normal user login (Customer or Vendor)
      const response = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email.trim(),
          password: formData.password.trim(),
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || "Login failed");
      }

      const data = await response.json();

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      setUser(data.user);
      setSuccess("Login successful! Redirecting...");
      setLoading(false);

      // ✅ Redirect based on role
      if (data.user.role === "customer") {
        navigate("/customer-dashboard");
      } else if (data.user.role === "vendor") {
        navigate("/vendor-dashboard");
      } else {
        throw new Error("Unknown role");
      }
    } catch (err) {
      setLoading(false);
      setError(err.message);
    }
  };

  return (
    <div className="login-page">
      <div className="login-wrapper">
        {/* LEFT SIDE: Promotional / Branding (Flipkart style) */}
        <div className="login-left">
          <div className="login-content">
            <h2>Login</h2>
            <p>Get access to your Orders, Wishlist and Recommendations</p>
            <div className="promo-illustration">
              🛍️
            </div>
          </div>
        </div>

        {/* RIGHT SIDE: Form */}
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
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="floating-input"
                placeholder=" "
              />
              <label className="floating-label">Enter Password</label>
            </div>

            <div className="form-footer-text">
              By continuing, you agree to SmartStyle's <a href="#">Terms of Use</a> and <a href="#">Privacy Policy</a>.
            </div>

            <button type="submit" className="login-submit-btn" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </button>

            {/* Removed OTP section per request */}

            <div className="login-links">
              <Link to="/forgot-password" style={{ textDecoration: 'none', color: '#2874f0' }}>Forgot Password?</Link>
              <br />
              <span style={{ color: "#333", fontSize: "0.9rem", marginTop: "10px", display: "block" }}>
                New to SmartStyle? <Link to="/signup">Create an account</Link>
              </span>
            </div>

            {error && <p className="error-text">{error}</p>}
            {success && <p className="success-text">{success}</p>}
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
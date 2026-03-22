import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./Signup.css"; // We'll create this CSS file

const Signup = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "customer"
  });
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [otp, setOtp] = useState("");
  const [showOTP, setShowOTP] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    // Email Validation Regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Please enter a valid email address (name@domain.com)");
      setLoading(false);
      return;
    }

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:5000/api/auth/signup`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name.trim(),
            email: formData.email.trim(),
            password: formData.password.trim(),
            role: formData.role,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
          throw new Error(data.errors[0].msg);
        }
        throw new Error(data.message || "Signup failed");
      }

      setSuccess(data.message || "Signup partially successful! Please check your email for the OTP.");
      setShowOTP(true);
      setLoading(false);

    } catch (err) {
      setLoading(false);
      if (err.message === "Failed to fetch") {
        setError("Could not connect to the server. Please ensure the backend is running and try again.");
      } else {
        setError(err.message);
      }
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await fetch(`http://localhost:5000/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email.trim(),
          otp: otp.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "OTP verification failed");
      }

      setSuccess("Account verified successfully! Redirecting...");

      // Save token and user info
      if (data.token) {
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("token", data.token);

        setTimeout(() => {
          if (data.user.role === "admin") navigate("/admin-dashboard");
          else if (data.user.role === "vendor") navigate("/vendor-dashboard");
          else navigate("/customer-dashboard");
          window.location.reload(); // Force full reload to update app state
        }, 1500);
      }
    } catch (err) {
      setLoading(false);
      setError(err.message);
    }
  };

  return (
    <div className="signup-container">
      <div className="signup-card">
        <h2>Create Your Account</h2>
        {!showOTP ? (
          <form onSubmit={handleSignup}>
            <div className="form-group">
              <input
                type="text"
                name="name"
                placeholder="Full Name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <input
                type="email"
                name="email"
                placeholder="Email Address"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group password-group" style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password (min. 6 characters)"
                value={formData.password}
                onChange={handleChange}
                required
                style={{ width: "100%", paddingRight: "40px" }}
              />
              <span
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  cursor: "pointer",
                  fontSize: "1.2rem",
                  userSelect: "none"
                }}
              >
                {showPassword ? "👁️" : "👁️‍🗨️"}
              </span>
            </div>

            <div className="form-group password-group" style={{ position: "relative" }}>
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                style={{ width: "100%", paddingRight: "40px" }}
              />
              <span
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  cursor: "pointer",
                  fontSize: "1.2rem",
                  userSelect: "none"
                }}
              >
                {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
              </span>
            </div>

            {/* Role Selection */}
            <div className="role-selection">
              <label>I want to:</label>
              <div className="role-options">
                <label className={`role-option ${formData.role === 'customer' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="role"
                    value="customer"
                    checked={formData.role === "customer"}
                    onChange={handleChange}
                    hidden
                  />
                  <span>🛍️ Shop as Customer</span>
                </label>
                <label className={`role-option ${formData.role === 'vendor' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="role"
                    value="vendor"
                    checked={formData.role === "vendor"}
                    onChange={handleChange}
                    hidden
                  />
                  <span>🏪 Sell as Vendor</span>
                </label>
              </div>
            </div>

            <button type="submit" disabled={loading} className="signup-btn">
              {loading ? "Creating Account..." : "Sign Up"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP}>
            <p style={{ textAlign: "center", marginBottom: "20px", color: "#666" }}>
              Verify the 6-digit code sent to <strong>{formData.email}</strong>
            </p>
            <div className="form-group">
              <input
                type="text"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                required
                maxLength="6"
                autoFocus
                style={{ textAlign: "center", fontSize: "1.5rem", letterSpacing: "5px" }}
              />
            </div>
            <button type="submit" disabled={loading} className="signup-btn">
              {loading ? "Verifying..." : "Verify OTP"}
            </button>
            <button
              type="button"
              onClick={() => setShowOTP(false)}
              className="back-btn"
              style={{ background: "none", border: "none", color: "#2874f0", cursor: "pointer", width: "100%", marginTop: "10px" }}
            >
              Back to Sign Up
            </button>
          </form>
        )}

        <p className="login-link">
          Already have an account? <Link to="/">Login here</Link>
        </p>

        {error && <div className="alert error">{error}</div>}
        {success && <div className="alert success">{success}</div>}
      </div>
    </div>
  );
};

export default Signup;
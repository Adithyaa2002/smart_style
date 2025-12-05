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
          email: formData.email,
          password: formData.password,
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
    <div className="login-container">
      <h2>Login</h2>
      <form onSubmit={handleLogin}>
        <input
          type="email"
          name="email"
          placeholder="Enter Email"
          value={formData.email}
          onChange={handleChange}
          required
        />
        <input
          type="password"
          name="password"
          placeholder="Enter Password"
          value={formData.password}
          onChange={handleChange}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>

      <p className="signup-link">
        Don't have an account? <Link to="/signup">Sign up here</Link>
      </p>

      {error && <p style={{ color: "red" }}>{error}</p>}
      {success && <p style={{ color: "green" }}>{success}</p>}
    </div>
  );
};

export default Login;
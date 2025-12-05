import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { CartProvider } from "./context/CartContext";

// Pages
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import CustomerDashboard from "./pages/CustomerDashboard";
import Profile from "./pages/Profile";
import Products from "./pages/Products";  // ✅ Only one import
import VirtualTryOn from "./pages/VirtualTryOn";
import Cart from "./pages/Cart";
import AdminDashboard from "./pages/AdminDashboard";
import VendorDashboard from "./pages/VendorDashboard";

import "./App.css";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) setUser(JSON.parse(savedUser));
    setLoading(false);
  }, []);

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
  };

  if (loading) return <div className="loading">Loading...</div>;

  // Redirect based on role after login
  const redirectByRole = (role) => {
    if (role === "admin") return "/admin-dashboard";
    if (role === "vendor") return "/vendor-dashboard";
    return "/customer-dashboard";
  };

  return (
    <CartProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* ✅ Login Page */}
            <Route
              path="/"
              element={
                user ? <Navigate to={redirectByRole(user.role)} /> : <Login setUser={setUser} />
              }
            />

            {/* ✅ Signup Page */}
            <Route
              path="/signup"
              element={
                user ? <Navigate to={redirectByRole(user.role)} /> : <Signup />
              }
            />

            {/* ✅ Customer Routes */}
            <Route
              path="/customer-dashboard"
              element={
                user && user.role === "customer" ? (
                  <CustomerDashboard user={user} onLogout={handleLogout} />
                ) : (
                  <Navigate to="/" />
                )
              }
            />

            <Route
              path="/profile"
              element={user ? <Profile user={user} /> : <Navigate to="/" />}
            />

            <Route
              path="/products"
              element={user ? <Products /> : <Navigate to="/" />}
            />

            <Route
              path="/virtual-tryon"
              element={user ? <VirtualTryOn /> : <Navigate to="/" />}
            />

            <Route
              path="/cart"
              element={user ? <Cart /> : <Navigate to="/" />}
            />

            {/* ✅ Admin Route */}
            <Route
              path="/admin-dashboard"
              element={
                user && user.role === "admin" ? (
                  <AdminDashboard user={user} onLogout={handleLogout} />
                ) : (
                  <Navigate to="/" />
                )
              }
            />

            {/* ✅ Vendor Route */}
            <Route
              path="/vendor-dashboard"
              element={
                user && user.role === "vendor" ? (
                  <VendorDashboard user={user} onLogout={handleLogout} />
                ) : (
                  <Navigate to="/" />
                )
              }
            />

            {/* ✅ Fallback Route */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </Router>
    </CartProvider>
  );
}

export default App;

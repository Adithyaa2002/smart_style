import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { CartProvider } from "./context/CartContext";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { WishlistProvider } from "./context/WishlistContext";
import Footer from "./components/Footer";


// Pages
import Cart from "./pages/Cart";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import CustomerDashboard from "./pages/CustomerDashboard";
import Profile from "./pages/Profile";
import Products from "./pages/Products";  // ✅ Only one import
import VirtualTryOn from "./pages/VirtualTryOn";
import ProductDetails from "./pages/ProductDetails";
import Payment from "./pages/Payment";
import OrderSuccess from "./pages/OrderSuccess";
import OrderDetails from "./pages/OrderDetails";


import AdminDashboard from "./pages/AdminDashboard";
import VendorDashboard from "./pages/VendorDashboard";

import "./App.css";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        // Validate role to prevent infinite redirect loops
        if (!parsedUser.role || !["customer", "admin", "vendor"].includes(parsedUser.role)) {
          throw new Error("Invalid user role");
        }
        setUser(parsedUser);
      } catch (error) {
        console.error("Error parsing/validating user from localStorage:", error);
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        setUser(null);
      }
    }
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
      <WishlistProvider>
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

              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password/:token" element={<ResetPassword />} />


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

              {/* ✅ Product Details Page */}
              <Route
                path="/product/:id"
                element={user ? <ProductDetails /> : <Navigate to="/" />}
              />

              {/* ✅ Payment Page */}
              <Route
                path="/payment"
                element={user ? <Payment /> : <Navigate to="/" />}
              />

              <Route
                path="/cart"
                element={user ? <Cart /> : <Navigate to="/" />}
              />

              <Route
                path="/order-success"
                element={user ? <OrderSuccess /> : <Navigate to="/" />}
              />

              {/* ✅ Order Details Page */}
              <Route
                path="/order/:id"
                element={user ? <OrderDetails /> : <Navigate to="/" />}
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
          <Footer />
          <ToastContainer position="top-right" autoClose={2000} theme="dark" />
        </Router>
      </WishlistProvider>
    </CartProvider>
  );
}

export default App;

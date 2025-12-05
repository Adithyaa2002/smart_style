import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';

const Cart = () => {
  const navigate = useNavigate();
  const { cart, removeFromCart, updateQuantity, clearCart, getCartTotal } = useCart();

  const handleCheckout = () => {
    if (cart.items.length === 0) {
      alert('Your cart is empty!');
      return;
    }
    alert(`Order placed successfully! Total: $${getCartTotal().toFixed(2)}`);
    clearCart();
    navigate('/dashboard');
  };

  if (cart.items.length === 0) {
    return (
      <div className="cart-container">
        <div className="cart-header">
          <button className="back-btn" onClick={() => navigate('/products')}>
            ← Continue Shopping
          </button>
          <h1>🛒 Shopping Cart</h1>
        </div>
        <div className="empty-cart">
          <div className="empty-cart-icon">🛒</div>
          <h2>Your cart is empty</h2>
          <p>Add some stylish items to get started!</p>
          <button 
            className="shop-now-btn"
            onClick={() => navigate('/products')}
          >
            Browse Products
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-container">
      <div className="cart-header">
        <button className="back-btn" onClick={() => navigate('/products')}>
          ← Continue Shopping
        </button>
        <h1>🛒 Shopping Cart ({cart.items.length} items)</h1>
        <button className="clear-cart-btn" onClick={clearCart}>
          🗑️ Clear Cart
        </button>
      </div>

      <div className="cart-content">
        <div className="cart-items">
          {cart.items.map(item => (
            <div key={item.id} className="cart-item">
              <img src={item.images?.[0] || item.image} alt={item.name} />
              <div className="item-details">
                <h3>{item.name}</h3>
                <p className="item-description">{item.description}</p>
                <div className="item-meta">
                  <span className="item-color">Color: {item.color?.[0] || 'Various'}</span>
                  <span className="item-size">Size: {item.size?.[0] || 'One Size'}</span>
                </div>
              </div>
              <div className="item-controls">
                <div className="quantity-controls">
                  <button 
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                  >
                    -
                  </button>
                  <span>{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                    +
                  </button>
                </div>
                <div className="item-price">
                  ${(item.price * item.quantity).toFixed(2)}
                </div>
                <button 
                  className="remove-item-btn"
                  onClick={() => removeFromCart(item.id)}
                >
                  🗑️ Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="cart-summary">
          <div className="summary-card">
            <h3>Order Summary</h3>
            <div className="summary-row">
              <span>Subtotal ({cart.items.reduce((acc, item) => acc + item.quantity, 0)} items):</span>
              <span>${getCartTotal().toFixed(2)}</span>
            </div>
            <div className="summary-row">
              <span>Shipping:</span>
              <span>Free</span>
            </div>
            <div className="summary-row">
              <span>Tax:</span>
              <span>${(getCartTotal() * 0.1).toFixed(2)}</span>
            </div>
            <div className="summary-divider"></div>
            <div className="summary-row total">
              <span>Total:</span>
              <span>${(getCartTotal() * 1.1).toFixed(2)}</span>
            </div>
            <button className="checkout-btn" onClick={handleCheckout}>
              🛍️ Proceed to Checkout
            </button>
            <p className="security-note">🔒 Secure checkout · 256-bit SSL encryption</p>
          </div>

          <div className="cart-features">
            <h4>SmartStyle Benefits</h4>
            <div className="feature-item">
              <span>🎯</span>
              <div>
                <strong>Virtual Try-On Available</strong>
                <small>Try before you buy</small>
              </div>
            </div>
            <div className="feature-item">
              <span>🚚</span>
              <div>
                <strong>Free Shipping</strong>
                <small>On orders over $50</small>
              </div>
            </div>
            <div className="feature-item">
              <span>↩️</span>
              <div>
                <strong>Easy Returns</strong>
                <small>30-day return policy</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
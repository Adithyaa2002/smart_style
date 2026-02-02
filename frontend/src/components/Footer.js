import React from 'react';
import './Footer.css';
import { Link } from 'react-router-dom';

const Footer = () => {
    return (
        <footer className="site-footer">
            <div className="footer-content">
                <div className="footer-section brand-section">
                    <div className="footer-logo">SmartStyle</div>
                    <p className="footer-tagline">
                        Experience the future of fashion with our AI-powered virtual try-on technology.
                    </p>
                    <div className="social-links">
                        <span className="social-icon">📷</span>
                        <span className="social-icon">🐦</span>
                        <span className="social-icon">📘</span>
                    </div>
                </div>

                <div className="footer-section">
                    <h3>Shop</h3>
                    <ul>
                        <li><Link to="/customer-dashboard">New Arrivals</Link></li>
                        <li><Link to="/customer-dashboard">Best Sellers</Link></li>
                        <li><Link to="/customer-dashboard">Men</Link></li>
                        <li><Link to="/customer-dashboard">Women</Link></li>
                    </ul>
                </div>

                <div className="footer-section">
                    <h3>Support</h3>
                    <ul>
                        <li><Link to="#">Help Center</Link></li>
                        <li><Link to="#">Track Order</Link></li>
                        <li><Link to="#">Returns & Refunds</Link></li>
                        <li><Link to="#">Shipping Info</Link></li>
                    </ul>
                </div>

                <div className="footer-section">
                    <h3>Legal</h3>
                    <ul>
                        <li><Link to="#">Privacy Policy</Link></li>
                        <li><Link to="#">Terms of Service</Link></li>
                        <li><Link to="#">Cookie Policy</Link></li>
                    </ul>
                </div>
            </div>

            <div className="footer-bottom">
                <p>&copy; {new Date().getFullYear()} SmartStyle Boutique. All rights reserved.</p>
            </div>
        </footer>
    );
};

export default Footer;

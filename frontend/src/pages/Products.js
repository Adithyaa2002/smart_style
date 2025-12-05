import React, { useEffect, useState } from 'react';
import './Products.css';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch all products from backend
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/products');
        const data = await res.json();
        setProducts(data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching products:', error);
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  if (loading) {
    return <div className="products-loading">Loading products...</div>;
  }

  return (
    <div className="products-page">
      <h1 className="products-title">All Products</h1>

      {products.length === 0 ? (
        <p className="no-products">No products available yet.</p>
      ) : (
        <div className="products-grid">
          {products.map((product) => (
            <div className="product-card" key={product._id}>
              <div className="product-image-container">
                <img
                  src={product.image || 'https://via.placeholder.com/150'}
                  alt={product.name}
                  className="product-image"
                />
              </div>
              <div className="product-info">
                <h3 className="product-name">{product.name}</h3>
                <p className="product-price">₹{product.price}</p>
                <p className="product-description">
                  {product.description?.length > 50
                    ? `${product.description.substring(0, 50)}...`
                    : product.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Products;

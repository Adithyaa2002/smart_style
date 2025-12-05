import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tokenValid, setTokenValid] = useState(false);
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  const token = searchParams.get('token');

  useEffect(() => {
    // Verify token when component loads
    if (token) {
      verifyToken();
    }
  }, [token]);

  const verifyToken = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/auth/verify-reset-token/${token}`);
      if (response.ok) {
        setTokenValid(true);
      } else {
        setError('Invalid or expired reset link');
      }
    } catch (error) {
      setError('Error verifying reset link');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token,
          newPassword: formData.newPassword
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message);
      }

      setSuccess('Password reset successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 3000);

    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="login-container">
        <div className="login-box">
          <h2>Invalid Reset Link</h2>
          <p>No reset token provided.</p>
          <button onClick={() => navigate('/login')} className="submit-btn">
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  if (!tokenValid && !error) {
    return (
      <div className="login-container">
        <div className="login-box">
          <h2>Verifying Link...</h2>
          <p>Please wait while we verify your reset link.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>Reset Your Password</h2>
        
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        {tokenValid && (
          <form onSubmit={handleSubmit} className="login-form">
            <input
              type="password"
              name="newPassword"
              placeholder="New Password"
              className="form-input"
              value={formData.newPassword}
              onChange={(e) => setFormData({...formData, newPassword: e.target.value})}
              required
              minLength={6}
            />
            
            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm New Password"
              className="form-input"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
              required
              minLength={6}
            />

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}

        <button onClick={() => navigate('/login')} className="toggle-btn">
          Back to Login
        </button>
      </div>
    </div>
  );
};

export default ResetPassword;
import React, { useState, useEffect } from 'react';

const Profile = ({ user }) => {
  const [activeTab, setActiveTab] = useState('personal');
  const [profile, setProfile] = useState({
    personalInfo: {},
    bodyMeasurements: {},
    stylePreferences: {},
    shipping: {},
    avatar: {},
    notifications: {},
    privacy: {}
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/profile/${user.id}`);
        const data = await response.json();
        setProfile({
          personalInfo: data.personalInfo || {},
          bodyMeasurements: data.bodyMeasurements || {},
          stylePreferences: data.stylePreferences || {},
          shipping: data.shipping || {},
          avatar: data.avatar || {},
          notifications: data.notifications || {},
          privacy: data.privacy || {}
        });
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [user.id]);

  const updateProfile = async (section, data) => {
    setSaving(true);
    try {
      const response = await fetch(`http://localhost:5000/api/profile/${user.id}/${section}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });
      await response.json();
      setProfile(prev => ({
        ...prev,
        [section]: { ...prev[section], ...data }
      }));
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Error saving changes');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (section, field, value) => {
    setProfile(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleSave = (section) => {
    updateProfile(section, profile[section]);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordMsg({ type: '', text: '' });

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/auth/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update password');
      }

      setPasswordMsg({ type: 'success', text: 'Password updated successfully' });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      setPasswordMsg({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading your profile...</div>;
  }

  if (!profile) {
    return <div className="error">Error loading profile</div>;
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h1>👤 My Profile & Settings</h1>
        <p>Manage your personal information, preferences, and privacy settings</p>
      </div>

      <div className="profile-layout">
        {/* Sidebar Navigation */}
        <div className="profile-sidebar">
          <div className="user-summary">
            <div className="user-avatar">👤</div>
            <div className="user-details">
              <h3>{user.name}</h3>
              <p>{user.email}</p>
              <span className="member-badge">Premium Member</span>
            </div>
          </div>

          <nav className="profile-nav">
            {[
              { key: 'personal', label: '👤 Personal Info' },
              { key: 'bodyMeasurements', label: '📏 Body Measurements' },
              { key: 'stylePreferences', label: '🎨 Style Preferences' },
              { key: 'shipping', label: '🏠 Shipping Address' },
              { key: 'avatar', label: '🤖 Avatar Settings' },
              { key: 'notifications', label: '🔔 Notifications' },
              { key: 'privacy', label: '🔒 Privacy & Security' }
            ].map(tab => (
              <button
                key={tab.key}
                className={`nav-item ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <div className="profile-content">

          {/* PERSONAL INFO */}
          {activeTab === 'personal' && (
            <div className="tab-content">
              <h2>Personal Information</h2>
              <div className="form-grid">
                <div className="form-group">
                  <label>First Name</label>
                  <input
                    type="text"
                    value={profile.personalInfo?.firstName || ''}
                    onChange={(e) =>
                      handleInputChange('personalInfo', 'firstName', e.target.value)
                    }
                    placeholder="Enter your first name"
                  />
                </div>
                <div className="form-group">
                  <label>Last Name</label>
                  <input
                    type="text"
                    value={profile.personalInfo?.lastName || ''}
                    onChange={(e) =>
                      handleInputChange('personalInfo', 'lastName', e.target.value)
                    }
                    placeholder="Enter your last name"
                  />
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    value={profile.personalInfo?.phone || ''}
                    onChange={(e) =>
                      handleInputChange('personalInfo', 'phone', e.target.value)
                    }
                    placeholder="Enter your phone number"
                  />
                </div>
                <div className="form-group">
                  <label>Date of Birth</label>
                  <input
                    type="date"
                    value={profile.personalInfo?.dateOfBirth || ''}
                    onChange={(e) =>
                      handleInputChange('personalInfo', 'dateOfBirth', e.target.value)
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Gender</label>
                  <select
                    value={profile.personalInfo?.gender || 'prefer-not-to-say'}
                    onChange={(e) =>
                      handleInputChange('personalInfo', 'gender', e.target.value)
                    }
                  >
                    <option value="prefer-not-to-say">Prefer not to say</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <button
                className="save-btn"
                onClick={() => handleSave('personalInfo')}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Personal Info'}
              </button>
            </div>
          )}

          {/* BODY MEASUREMENTS */}
          {activeTab === 'bodyMeasurements' && (
            <div className="tab-content">
              <h2>Body Measurements</h2>
              <p className="tab-description">
                Provide your measurements for accurate virtual try-on and perfect fit recommendations.
              </p>
              <div className="form-grid">
                {[
                  { key: 'height', label: 'Height (cm)' },
                  { key: 'weight', label: 'Weight (kg)' },
                  { key: 'bust', label: 'Bust (cm)' },
                  { key: 'waist', label: 'Waist (cm)' },
                  { key: 'hips', label: 'Hips (cm)' },
                  { key: 'shoulderWidth', label: 'Shoulder Width (cm)' },
                  { key: 'armLength', label: 'Arm Length (cm)' },
                  { key: 'legLength', label: 'Leg Length (cm)' }
                ].map(field => (
                  <div key={field.key} className="form-group">
                    <label>{field.label}</label>
                    <input
                      type="number"
                      value={profile.bodyMeasurements?.[field.key] || ''}
                      onChange={(e) =>
                        handleInputChange('bodyMeasurements', field.key, e.target.value)
                      }
                      placeholder={`Enter ${field.label.toLowerCase()}`}
                    />
                  </div>
                ))}
              </div>
              <button
                className="save-btn"
                onClick={() => handleSave('bodyMeasurements')}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Measurements'}
              </button>
            </div>
          )}

          {/* STYLE PREFERENCES */}
          {activeTab === 'stylePreferences' && (
            <div className="tab-content">
              <h2>Style Preferences</h2>
              <p className="tab-description">
                Tell us about your fashion preferences for personalized recommendations.
              </p>
              {/* ... (existing content logic remains implicit, we are just replacing the block structure if needed, but here we append) ... */}
              {/* Actually, the tool replaces the TargetContent. We need to be careful. The user wants to ADD the new tab. */}
              {/* The previous tool call showed lines 243-350 for stylePreferences. I will match the closing of stylePreferences and append the new tab. */}
              <div className="form-section">
                <h3>Preferred Styles</h3>
                <div className="checkbox-grid">
                  {['Casual', 'Formal', 'Sporty', 'Bohemian', 'Vintage', 'Modern', 'Streetwear', 'Business'].map(style => (
                    <label key={style} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={profile.stylePreferences?.preferredStyles?.includes(style) || false}
                        onChange={(e) => {
                          const currentStyles = profile.stylePreferences?.preferredStyles || [];
                          const newStyles = e.target.checked
                            ? [...currentStyles, style]
                            : currentStyles.filter(s => s !== style);
                          handleInputChange('stylePreferences', 'preferredStyles', newStyles);
                        }}
                      />
                      {style}
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-section">
                <h3>Favorite Colors</h3>
                <div className="color-grid">
                  {['Black', 'White', 'Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Pink', 'Orange', 'Brown', 'Gray', 'Navy'].map(color => (
                    <label key={color} className="color-label">
                      <input
                        type="checkbox"
                        checked={profile.stylePreferences?.favoriteColors?.includes(color) || false}
                        onChange={(e) => {
                          const currentColors = profile.stylePreferences?.favoriteColors || [];
                          const newColors = e.target.checked
                            ? [...currentColors, color]
                            : currentColors.filter(c => c !== color);
                          handleInputChange('stylePreferences', 'favoriteColors', newColors);
                        }}
                      />
                      <span className="color-dot" style={{ backgroundColor: color.toLowerCase() }}></span>
                      {color}
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Size Preference</label>
                  <select
                    value={profile.stylePreferences?.sizePreference || 'regular'}
                    onChange={(e) =>
                      handleInputChange('stylePreferences', 'sizePreference', e.target.value)
                    }
                  >
                    <option value="slim">Slim Fit</option>
                    <option value="regular">Regular Fit</option>
                    <option value="loose">Loose Fit</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Budget Range (Min)</label>
                  <input
                    type="number"
                    value={profile.stylePreferences?.budgetRange?.min || 0}
                    onChange={(e) =>
                      handleInputChange('stylePreferences', 'budgetRange', {
                        ...(profile.stylePreferences?.budgetRange || { min: 0, max: 1000 }),
                        min: parseInt(e.target.value) || 0
                      })
                    }
                    placeholder="Minimum budget"
                  />
                </div>

                <div className="form-group">
                  <label>Budget Range (Max)</label>
                  <input
                    type="number"
                    value={profile.stylePreferences?.budgetRange?.max || 1000}
                    onChange={(e) =>
                      handleInputChange('stylePreferences', 'budgetRange', {
                        ...(profile.stylePreferences?.budgetRange || { min: 0, max: 1000 }),
                        max: parseInt(e.target.value) || 1000
                      })
                    }
                    placeholder="Maximum budget"
                  />
                </div>
              </div>

              <button
                className="save-btn"
                onClick={() => handleSave('stylePreferences')}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          )}

          {/* SHIPPING (Placeholder or Implementation - keeping logic simple for now, sticking to request) */}
          {activeTab === 'shipping' && (
            <div className="tab-content">
              <h2>Shipping Address</h2>
              <p>Manage your delivery addresses.</p>
              <div className="form-grid">
                <div className="form-group">
                  <label>Street Address</label>
                  <input type="text" placeholder="123 Fashion St" />
                </div>
                <div className="form-group">
                  <label>City</label>
                  <input type="text" placeholder="New York" />
                </div>
                <div className="form-group">
                  <label>State</label>
                  <input type="text" placeholder="NY" />
                </div>
                <div className="form-group">
                  <label>Zip Code</label>
                  <input type="text" placeholder="10001" />
                </div>
              </div>
              <button className="save-btn">Save Address</button>
            </div>
          )}

          {/* AVATAR (Placeholder) */}
          {activeTab === 'avatar' && (
            <div className="tab-content">
              <h2>Avatar Settings</h2>
              <p>Customize your 3D avatar visualization.</p>
              {/* Add avatar specific settings here */}
            </div>
          )}

          {/* NOTIFICATIONS (Placeholder) */}
          {activeTab === 'notifications' && (
            <div className="tab-content">
              <h2>Notifications</h2>
              <p>Manage your email and push notification preferences.</p>
              {/* Add notification toggles here */}
            </div>
          )}

          {/* PRIVACY & SECURITY */}
          {activeTab === 'privacy' && (
            <div className="tab-content">
              <h2>Privacy & Security</h2>
              <p className="tab-description">
                Manage your account security and privacy settings.
              </p>

              <div className="security-section">
                <h3>Change Password</h3>
                <form onSubmit={handlePasswordChange} className="password-form">
                  <div className="form-group">
                    <label>Current Password</label>
                    <input
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>New Password</label>
                    <input
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      required
                      minLength={6}
                    />
                  </div>
                  <div className="form-group">
                    <label>Confirm New Password</label>
                    <input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      required
                      minLength={6}
                    />
                  </div>

                  {passwordMsg.text && (
                    <div className={`message ${passwordMsg.type === 'error' ? 'error-text' : 'success-text'}`}>
                      {passwordMsg.text}
                    </div>
                  )}

                  <button type="submit" className="save-btn" disabled={saving}>
                    {saving ? 'Updating...' : 'Update Password'}
                  </button>
                </form>
              </div>

              <hr className="divider" />

              <div className="security-section">
                <h3>Two-Factor Authentication</h3>
                <div className="toggle-setting">
                  <div className="setting-info">
                    <h4>Enable 2FA</h4>
                    <p>Add an extra layer of security to your account</p>
                  </div>
                  <label className="switch">
                    <input type="checkbox" />
                    <span className="slider round"></span>
                  </label>
                </div>
              </div>

              <hr className="divider" />

              <div className="security-section danger-zone">
                <h3>Delete Account</h3>
                <p>Permanently delete your account and all of your content.</p>
                <button className="delete-btn">Delete Account</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;

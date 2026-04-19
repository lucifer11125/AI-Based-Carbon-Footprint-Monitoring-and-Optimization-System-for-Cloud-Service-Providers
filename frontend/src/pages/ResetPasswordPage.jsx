import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Shield, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { authAPI } from '../api';

export default function ResetPasswordPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await authAPI.resetPassword({ current_password: currentPassword, new_password: newPassword });
      // Reload page to re-fetch user state or just let the context know
      window.location.href = '/';
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="bg-mesh" />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ width: '100%', maxWidth: 480, padding: '0 16px' }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: 'var(--surface-container-high)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px',
            border: '1px solid rgba(255, 180, 171, 0.2)',
          }}>
            <Shield size={32} color="var(--error)" />
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'white', marginBottom: 8 }}>
            Action Required
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>
            Your account requires a password reset before you can continue.
          </p>
        </div>

        <div className="auth-panel">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {error && (
              <div style={{
                padding: '12px 16px', borderRadius: 8,
                background: 'rgba(255, 180, 171, 0.1)',
                border: '1px solid rgba(255, 180, 171, 0.2)',
                color: 'var(--error)', fontSize: '0.8rem', fontWeight: 600,
              }}>
                {error}
              </div>
            )}
            
            <div>
              <label className="input-label">Current Password / Temporary Password</label>
              <input
                className="input-field"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>

            <div style={{ position: 'relative' }}>
              <label className="input-label">New Password</label>
              <input
                className="input-field"
                type={showPw ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                style={{
                  position: 'absolute', right: 14, top: 40,
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--on-surface-variant)', opacity: 0.5,
                }}
              >
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div>
              <label className="input-label">Confirm New Password</label>
              <input
                className="input-field"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn-primary" disabled={loading} style={{ padding: '16px' }}>
              {loading ? 'Updating...' : 'Update Password'}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>
          
          <button 
            onClick={() => { logout(); navigate('/login'); }} 
            className="nav-item" 
            style={{ width: '100%', marginTop: 16, border: 'none', background: 'none', justifyContent: 'center' }}
          >
            Cancel & Sign Out
          </button>
        </div>
      </motion.div>
    </div>
  );
}

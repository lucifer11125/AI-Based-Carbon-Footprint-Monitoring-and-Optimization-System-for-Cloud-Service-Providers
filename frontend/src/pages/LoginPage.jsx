import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Leaf, ArrowRight, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.detail || 'Invalid credentials');
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
        transition={{ duration: 0.8 }}
        style={{ width: '100%', maxWidth: 480, padding: '0 16px' }}
      >
        {/* Branding */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: 'var(--surface-container-high)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px',
            boxShadow: '0 0 40px rgba(74, 225, 118, 0.15)',
          }}>
            <Leaf size={32} color="var(--tertiary)" style={{ filter: 'drop-shadow(0 0 8px rgba(74, 225, 118, 0.6))' }} />
          </div>
          <h1 style={{
            fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em',
            color: 'var(--primary)', marginBottom: 8,
          }}>
            Sign in to CarbonLens AI
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', opacity: 0.8 }}>
            Enter your credentials to access your dashboard
          </p>
        </div>

        {/* Auth Panel */}
        <div className="auth-panel">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                style={{
                  padding: '12px 16px', borderRadius: 8,
                  background: 'rgba(255, 180, 171, 0.1)',
                  border: '1px solid rgba(255, 180, 171, 0.2)',
                  color: 'var(--error)', fontSize: '0.8rem', fontWeight: 600,
                }}
              >
                {error}
              </motion.div>
            )}

            <div>
              <label className="input-label" htmlFor="login-email">Email Address</label>
              <input
                id="login-email"
                className="input-field"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="input-label" htmlFor="login-password">Password</label>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  id="login-password"
                  className="input-field"
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  style={{
                    position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--on-surface-variant)', opacity: 0.5,
                  }}
                >
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ width: '100%', padding: '16px', fontSize: '0.875rem' }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <p style={{
            marginTop: 32, textAlign: 'center',
            fontSize: '0.875rem', color: 'var(--on-surface-variant)',
          }}>
            Don't have an account?{' '}
            <Link to="/signup" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>
              Sign up
            </Link>
          </p>
        </div>

        {/* Trust indicator */}
        <div style={{ marginTop: 48, textAlign: 'center', opacity: 0.35 }}>
          <span style={{
            fontSize: '0.625rem', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.2em',
            color: 'var(--on-surface-variant)',
          }}>
            Precision ESG Intelligence Platform
          </span>
        </div>
      </motion.div>
    </div>
  );
}

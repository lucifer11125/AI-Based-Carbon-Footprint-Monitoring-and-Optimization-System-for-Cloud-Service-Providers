import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Leaf, ArrowRight, Eye, EyeOff } from 'lucide-react';

const ROLES = [
  { value: 'company_user', label: 'Company User', desc: 'Access own company data' },
];

export default function SignupPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: '', password: '', full_name: '',
    role: 'company_user', company_name: '',
  });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.role === 'company_user' && !form.company_name.trim()) {
      setError('Company name is required for Company Users');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        email: form.email,
        password: form.password,
        full_name: form.full_name,
        role: form.role,
      };
      if (form.role === 'company_user') {
        payload.company_name = form.company_name.trim();
      }
      await register(payload);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const update = (key, val) => setForm({ ...form, [key]: val });

  return (
    <div className="auth-page">
      <div className="bg-mesh" />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        style={{ width: '100%', maxWidth: 480, padding: '0 16px' }}
      >
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
          <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--primary)', marginBottom: 8 }}>
            Create your account
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', opacity: 0.8 }}>
            Join the precision ESG intelligence platform
          </p>
        </div>

        <div className="auth-panel">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
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
              >{error}</motion.div>
            )}

            <div>
              <label className="input-label" htmlFor="signup-name">Full Name</label>
              <input id="signup-name" className="input-field" placeholder="John Doe"
                value={form.full_name} onChange={(e) => update('full_name', e.target.value)} required />
            </div>
            <div>
              <label className="input-label" htmlFor="signup-email">Email Address</label>
              <input id="signup-email" className="input-field" type="email" placeholder="name@company.com"
                value={form.email} onChange={(e) => update('email', e.target.value)} required />
            </div>
            <div>
              <label className="input-label" htmlFor="signup-password">Password</label>
              <div style={{ position: 'relative' }}>
                <input id="signup-password" className="input-field" type={showPw ? 'text' : 'password'} placeholder="••••••••"
                  value={form.password} onChange={(e) => update('password', e.target.value)} required
                  minLength={6} />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  style={{
                    position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--on-surface-variant)', opacity: 0.5,
                  }}>
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Role fixed as company_user */}
            <input type="hidden" value={form.role} name="role" />

            {/* Company Name — only for company_user */}
            {form.role === 'company_user' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <label className="input-label" htmlFor="signup-company">Company Name</label>
                <input id="signup-company" className="input-field"
                  placeholder="Enter your company name"
                  value={form.company_name}
                  onChange={(e) => update('company_name', e.target.value)}
                  required={form.role === 'company_user'}
                />
                <p style={{ fontSize: '0.625rem', color: 'var(--on-surface-variant)', marginTop: 6, opacity: 0.7 }}>
                  If your company doesn't exist yet, it will be created automatically.
                </p>
              </motion.div>
            )}

            <button type="submit" className="btn-primary" disabled={loading}
              style={{ width: '100%', padding: '16px', fontSize: '0.875rem', marginTop: 8 }}>
              {loading ? 'Creating...' : 'Create Account'}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <p style={{ marginTop: 32, textAlign: 'center', fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>Sign in</Link>
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

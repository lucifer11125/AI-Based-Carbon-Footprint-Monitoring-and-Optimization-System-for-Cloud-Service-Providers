import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Building2, CloudUpload, Shield, Sparkles,
  FlaskConical, FileText, LogOut, HelpCircle, Zap, Leaf, Users, BarChart3
} from 'lucide-react';

const getNavItems = (role) => {
  const items = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  ];

  // Admin: Companies + Users management
  if (role === 'csp_admin') {
    items.push(
      { path: '/companies', icon: Building2, label: 'Companies' },
      { path: '/users', icon: Users, label: 'Manage Users' },
      { path: '/reports', icon: FileText, label: 'Reports' },
    );
  }

  // Analyst: Companies + all analysis tools (NO upload)
  if (role === 'csp_analyst') {
    items.push(
      { path: '/companies', icon: Building2, label: 'Companies' },
      { path: '/audit', icon: Shield, label: 'Green Audit' },
      { path: '/optimization', icon: Sparkles, label: 'Optimization' },
      { path: '/simulator', icon: FlaskConical, label: 'Simulator' },
      { path: '/reports', icon: FileText, label: 'Reports' },
    );
  }

  // Company User: Upload + view own data (NO company selection, NO optimization control)
  if (role === 'company_user') {
    items.push(
      { path: '/upload', icon: CloudUpload, label: 'Upload Dataset' },
      { path: '/audit', icon: Shield, label: 'Green Audit' },
      { path: '/reports', icon: FileText, label: 'Reports' },
    );
  }

  return items;
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = getNavItems(user?.role);

  const roleColors = {
    csp_admin: { bg: 'rgba(255, 180, 171, 0.05)', border: 'rgba(255, 180, 171, 0.08)', color: 'var(--error)' },
    csp_analyst: { bg: 'rgba(173, 198, 255, 0.05)', border: 'rgba(173, 198, 255, 0.08)', color: 'var(--primary)' },
    company_user: { bg: 'rgba(74, 225, 118, 0.05)', border: 'rgba(74, 225, 118, 0.08)', color: 'var(--tertiary)' },
  };
  const roleStyle = roleColors[user?.role] || roleColors.company_user;

  const roleLabels = {
    csp_admin: 'CSP Admin',
    csp_analyst: 'CSP Analyst',
    company_user: 'Company User',
  };

  return (
    <aside className="app-sidebar">
      {/* Logo */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        marginBottom: 40, paddingLeft: 4,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'linear-gradient(135deg, var(--primary-container), var(--tertiary-container))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Leaf size={18} color="white" />
        </div>
        <div>
          <div style={{ fontSize: '0.95rem', fontWeight: 900, color: 'white', lineHeight: 1.1 }}>
            CarbonLens
          </div>
          <div style={{
            fontSize: '0.5625rem', fontWeight: 700, color: 'rgba(173,198,255,0.5)',
            textTransform: 'uppercase', letterSpacing: '0.2em',
          }}>
            AI Platform
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1 }}>
        <div style={{
          fontSize: '0.5625rem', fontWeight: 700, color: '#475569',
          textTransform: 'uppercase', letterSpacing: '0.15em',
          padding: '0 16px', marginBottom: 12,
        }}>
          Main Menu
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Bottom */}
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 12, marginTop: 8 }}>
          <button className="nav-item" style={{ width: '100%', border: 'none', background: 'none' }}>
            <HelpCircle size={18} />
            <span>Support</span>
          </button>
          <button onClick={handleLogout} className="nav-item" style={{ width: '100%', border: 'none', background: 'none' }}>
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>

        {/* User Badge */}
        {user && (
          <div style={{
            padding: '12px 16px', borderRadius: 12,
            background: roleStyle.bg,
            border: `1px solid ${roleStyle.border}`,
            marginTop: 8,
          }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'white', marginBottom: 2 }}>
              {user.full_name}
            </div>
            <div style={{
              fontSize: '0.5625rem', fontWeight: 700, color: roleStyle.color,
              textTransform: 'uppercase', letterSpacing: '0.1em',
            }}>
              {roleLabels[user.role] || user.role}
            </div>
            {user.company_name && (
              <div style={{
                fontSize: '0.5rem', fontWeight: 600, color: 'var(--on-surface-variant)',
                marginTop: 4, opacity: 0.7,
              }}>
                {user.company_name}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

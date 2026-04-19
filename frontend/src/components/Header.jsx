import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Bell, User } from 'lucide-react';

export default function Header() {
  const { user } = useAuth();
  const { companies, selectedCompanyId, setSelectedCompanyId, datasets, selectedDatasetId, setSelectedDatasetId } = useApp();

  const roleLabel = {
    csp_admin: 'CSP Admin',
    csp_analyst: 'CSP Analyst',
    company_user: 'Company User',
  };

  const showCompanySelector = user?.role !== 'company_user' && companies.length > 0;
  const showDatasetSelector = user?.role !== 'csp_admin' && datasets.length > 0;

  return (
    <header className="app-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Company Selector — only for admin and analyst */}
        {showCompanySelector && (
          <select
            id="header-company-selector"
            className="select-field"
            value={selectedCompanyId || ''}
            onChange={(e) => setSelectedCompanyId(Number(e.target.value))}
            style={{ width: 220 }}
          >
            <option value="" disabled>Select Company</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}

        {/* Company name display for company users */}
        {user?.role === 'company_user' && user?.company_name && (
          <div style={{
            padding: '8px 16px', borderRadius: 8,
            background: 'rgba(74, 225, 118, 0.06)',
            border: '1px solid rgba(74, 225, 118, 0.1)',
          }}>
            <span style={{
              fontSize: '0.625rem', fontWeight: 700, color: 'var(--on-surface-variant)',
              textTransform: 'uppercase', letterSpacing: '0.1em',
            }}>Company: </span>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--tertiary)' }}>
              {user.company_name}
            </span>
          </div>
        )}

        {/* Dataset Selector — not for admin (they see global view) */}
        {showDatasetSelector && (
          <select
            id="header-dataset-selector"
            className="select-field"
            value={selectedDatasetId || ''}
            onChange={(e) => setSelectedDatasetId(Number(e.target.value))}
            style={{ width: 240 }}
          >
            <option value="" disabled>Select Dataset</option>
            {datasets.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button id="notifications-btn" style={{
          padding: 8, borderRadius: '50%', background: 'none', border: 'none',
          cursor: 'pointer', color: '#64748b', position: 'relative',
          transition: 'color 0.2s',
        }}>
          <Bell size={20} />
        </button>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          paddingLeft: 16, borderLeft: '1px solid rgba(255,255,255,0.08)',
        }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e2e8f0' }}>
              {user?.full_name}
            </div>
            <div style={{
              fontSize: '0.5625rem', fontWeight: 700, color: '#64748b',
              textTransform: 'uppercase', letterSpacing: '0.1em',
            }}>
              {roleLabel[user?.role] || user?.role}
            </div>
          </div>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--primary-container), var(--tertiary-container))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid rgba(173, 198, 255, 0.2)',
          }}>
            <User size={16} color="white" />
          </div>
        </div>
      </div>
    </header>
  );
}

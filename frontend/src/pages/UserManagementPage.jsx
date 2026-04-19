import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { adminAPI, companyAPI } from '../api';
import { Users, Shield, Trash2, Edit3, CheckCircle, XCircle, Building2 } from 'lucide-react';

const ROLE_CONFIG = {
  csp_admin: { label: 'Admin', color: 'var(--error)', bg: 'rgba(255,180,171,0.15)' },
  csp_analyst: { label: 'Analyst', color: 'var(--primary)', bg: 'rgba(173,198,255,0.15)' },
  company_user: { label: 'Company', color: 'var(--tertiary)', bg: 'rgba(74,225,118,0.15)' },
};

export default function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const fetchData = async () => {
    try {
      const [usersRes, companiesRes] = await Promise.all([
        adminAPI.listUsers(),
        companyAPI.list(),
      ]);
      setUsers(usersRes.data);
      setCompanies(companiesRes.data);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleEdit = (user) => {
    setEditingId(user.id);
    setEditForm({ role: user.role, company_id: user.company_id, is_active: user.is_active });
  };

  const handleSave = async (userId) => {
    try {
      await adminAPI.updateUser(userId, editForm);
      setEditingId(null);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Update failed');
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Delete this user permanently?')) return;
    try {
      await adminAPI.deleteUser(userId);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Delete failed');
    }
  };

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ 
    full_name: '', email: '', password: '', role: 'company_user', company_id: '' 
  });
  const [createError, setCreateError] = useState('');

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateError('');
    try {
      const payload = { ...createForm };
      if (!payload.company_id && payload.role === 'company_user') {
        setCreateError('Company is required for Company User');
        return;
      }
      if (payload.role !== 'company_user') {
        payload.company_id = null; // analysts don't need company_id
      }
      await adminAPI.createUser(payload);
      setShowCreate(false);
      setCreateForm({ full_name: '', email: '', password: '', role: 'company_user', company_id: '' });
      fetchData();
    } catch (err) {
      setCreateError(err.response?.data?.detail || 'Failed to create user');
    }
  };

  const handleToggleActive = async (user) => {
    try {
      await adminAPI.updateUser(user.id, { is_active: !user.is_active });
      fetchData();
    } catch {}
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 16 }} />)}
      </div>
    );
  }

  const stats = {
    total: users.length,
    admins: users.filter(u => u.role === 'csp_admin').length,
    analysts: users.filter(u => u.role === 'csp_analyst').length,
    company_users: users.filter(u => u.role === 'company_user').length,
    active: users.filter(u => u.is_active).length,
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <span className="section-label">Platform Administration</span>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white', marginTop: 4 }}>User Management</h1>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(!showCreate)}>
          Add User
        </button>
      </div>

      {showCreate && (
        <motion.div className="glass-card" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
          style={{ padding: 32, borderLeft: '4px solid var(--primary)' }}>
          <h3 className="section-title" style={{ marginBottom: 20 }}>Create New User</h3>
          <form onSubmit={handleCreate} style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label className="input-label">Full Name</label>
              <input className="input-field" value={createForm.full_name} onChange={e => setCreateForm({...createForm, full_name: e.target.value})} required />
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label className="input-label">Email Address</label>
              <input className="input-field" type="email" value={createForm.email} onChange={e => setCreateForm({...createForm, email: e.target.value})} required />
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label className="input-label">Temporary Password</label>
              <input className="input-field" value={createForm.password} onChange={e => setCreateForm({...createForm, password: e.target.value})} required />
            </div>
            <div style={{ minWidth: 160 }}>
              <label className="input-label">Role</label>
              <select className="select-field" value={createForm.role} onChange={e => setCreateForm({...createForm, role: e.target.value})}>
                <option value="company_user">Company User</option>
                <option value="csp_analyst">CSP Analyst</option>
              </select>
            </div>
            {createForm.role === 'company_user' && (
              <div style={{ minWidth: 200 }}>
                <label className="input-label">Company</label>
                <select className="select-field" value={createForm.company_id} onChange={e => setCreateForm({...createForm, company_id: e.target.value})} required>
                  <option value="">Select Company...</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
            <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button type="submit" className="btn-primary" style={{ padding: '12px 24px' }}>Create User</button>
            </div>
          </form>
          {createError && <p style={{ marginTop: 12, color: 'var(--error)', fontSize: '0.8rem', fontWeight: 600 }}>{createError}</p>}
        </motion.div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
        {[
          { label: 'Total Users', value: stats.total, color: '#adc6ff' },
          { label: 'Admins', value: stats.admins, color: '#ffb4ab' },
          { label: 'Analysts', value: stats.analysts, color: '#adc6ff' },
          { label: 'Company Users', value: stats.company_users, color: '#4ae176' },
          { label: 'Active', value: stats.active, color: '#4ae176' },
        ].map((s, i) => (
          <motion.div key={s.label} className="glass-card"
            initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.05 }}
            style={{ padding: 20, textAlign: 'center' }}>
            <div className="kpi-label">{s.label}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: s.color, marginTop: 4 }}>{s.value}</div>
          </motion.div>
        ))}
      </div>

      {/* Users Table */}
      <motion.div className="glass-card" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
        style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="section-title">All Users</h3>
          <span style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {users.length} total
          </span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['User', 'Email', 'Role', 'Company', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{
                    padding: '12px 20px', textAlign: 'left',
                    fontSize: '0.5625rem', fontWeight: 700, color: 'var(--on-surface-variant)',
                    textTransform: 'uppercase', letterSpacing: '0.15em',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const rc = ROLE_CONFIG[u.role] || ROLE_CONFIG.company_user;
                const isEditing = editingId === u.id;
                return (
                  <tr key={u.id} style={{
                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                    transition: 'background 0.2s',
                  }}>
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%',
                          background: rc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: rc.color, fontSize: '0.75rem', fontWeight: 800,
                        }}>
                          {u.full_name.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'white' }}>{u.full_name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 20px', fontSize: '0.8rem', color: 'var(--on-surface-variant)' }}>{u.email}</td>
                    <td style={{ padding: '14px 20px' }}>
                      {isEditing ? (
                        <select className="select-field" value={editForm.role} style={{ width: 140, padding: '6px 10px', fontSize: '0.75rem' }}
                          onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>
                          <option value="csp_admin">Admin</option>
                          <option value="csp_analyst">Analyst</option>
                          <option value="company_user">Company</option>
                        </select>
                      ) : (
                        <span style={{
                          padding: '3px 10px', borderRadius: 999, fontSize: '0.5625rem',
                          fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em',
                          background: rc.bg, color: rc.color,
                        }}>{rc.label}</span>
                      )}
                    </td>
                    <td style={{ padding: '14px 20px', fontSize: '0.8rem', color: 'var(--on-surface-variant)' }}>
                      {u.company_name || '—'}
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <button onClick={() => handleToggleActive(u)} style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}>
                        {u.is_active ? (
                          <><CheckCircle size={14} color="var(--tertiary)" /><span style={{ fontSize: '0.75rem', color: 'var(--tertiary)', fontWeight: 600 }}>Active</span></>
                        ) : (
                          <><XCircle size={14} color="var(--error)" /><span style={{ fontSize: '0.75rem', color: 'var(--error)', fontWeight: 600 }}>Inactive</span></>
                        )}
                      </button>
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {isEditing ? (
                          <>
                            <button onClick={() => handleSave(u.id)} className="btn-primary" style={{ padding: '6px 14px', fontSize: '0.625rem' }}>Save</button>
                            <button onClick={() => setEditingId(null)} className="btn-secondary" style={{ padding: '6px 14px', fontSize: '0.625rem' }}>Cancel</button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => handleEdit(u)} style={{
                              background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', padding: 4,
                            }}><Edit3 size={14} /></button>
                            <button onClick={() => handleDelete(u.id)} style={{
                              background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4,
                            }}><Trash2 size={14} /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
}

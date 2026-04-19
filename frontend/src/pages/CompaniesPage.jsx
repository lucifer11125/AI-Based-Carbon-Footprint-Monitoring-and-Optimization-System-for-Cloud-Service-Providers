import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { companyAPI, datasetAPI } from '../api';
import {
  Building2, Plus, Trash2, TrendingUp, Users, Database,
  Cloud, DollarSign, Shield, ChevronRight, FileSpreadsheet,
  Download
} from 'lucide-react';

export default function CompaniesPage() {
  const { user } = useAuth();
  const { setSelectedCompanyId, refreshCompanies } = useApp();
  const [companies, setCompanies] = useState([]);
  const [details, setDetails] = useState({});
  const [companyDatasets, setCompanyDatasets] = useState({});
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', industry: 'Technology', region: 'us-east-1' });
  const [createError, setCreateError] = useState('');


  const fetchCompanies = async () => {
    try {
      const res = await companyAPI.list();
      setCompanies(res.data);
      // Fetch details and uploaded datasets for each company.
      const detailMap = {};
      const datasetMap = {};
      await Promise.all(res.data.map(async (c) => {
        try {
          const detailRes = await companyAPI.getDetail(c.id);
          detailMap[c.id] = detailRes.data;
        } catch {}
        try {
          const datasetRes = await datasetAPI.list(c.id);
          datasetMap[c.id] = datasetRes.data;
        } catch {
          datasetMap[c.id] = [];
        }
      }));
      setDetails(detailMap);
      setCompanyDatasets(datasetMap);
    } catch (err) {
      console.error('Failed to fetch companies:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCompanies(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateError('');
    try {
      console.log('Creating company:', createForm);
      const res = await companyAPI.create(createForm);
      console.log('Created:', res.data);
      setShowCreate(false);
      setCreateForm({ name: '', industry: 'Technology', region: 'us-east-1' });
      fetchCompanies();
      refreshCompanies();
    } catch (err) {
      console.error('Create error:', err);
      const detail = err.response?.data?.detail;
      console.log('Error detail:', detail);
      setCreateError(detail || 'Failed to create company');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this company and ALL associated data? This cannot be undone.')) return;
    try {
      await companyAPI.delete(id);
      fetchCompanies();
      refreshCompanies();
    } catch (err) {
      alert(err.response?.data?.detail || 'Delete failed');
    }
  };

  const handleSelect = (companyId) => {
    setSelectedCompanyId(companyId);
  };

  const handleDownloadDataset = async (dataset) => {
    try {
      const res = await datasetAPI.download(dataset.id);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', dataset.name || 'dataset.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.response?.data?.detail || 'Dataset download failed');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 140, borderRadius: 16 }} />)}
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <span className="section-label">Organization Management</span>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white', marginTop: 4 }}>Companies</h1>
          <p className="section-subtitle">{companies.length} companies registered</p>
        </div>
        {user?.role === 'csp_admin' && (
          <button className="btn-primary" onClick={() => setShowCreate(!showCreate)}>
            <Plus size={16} />
            New Company
          </button>
        )}
      </div>

      {user?.role === 'csp_admin' && (
        <div style={{ padding: 12, background: 'rgba(255,180,171,0.1)', borderRadius: 8, border: '1px solid var(--error)' }}>
          Logged in as: {user?.email} (Role: {user?.role})
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      </div>

      {/* Create Form */}
      {showCreate && (
        <motion.div className="glass-card" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
          style={{ padding: 32, borderLeft: '4px solid var(--primary)' }}>
          <h3 className="section-title" style={{ marginBottom: 20 }}>Register New Company</h3>
          <form onSubmit={handleCreate} style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label className="input-label">Company Name</label>
              <input className="input-field" placeholder="Acme Corp"
                value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} required />
            </div>
            <div style={{ minWidth: 160 }}>
              <label className="input-label">Industry</label>
              <select className="select-field" value={createForm.industry}
                onChange={(e) => setCreateForm({ ...createForm, industry: e.target.value })}>
                {['Technology', 'Manufacturing', 'Finance', 'Healthcare', 'Retail', 'Energy', 'Logistics', 'Media'].map(i => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
            </div>
            <div style={{ minWidth: 160 }}>
              <label className="input-label">Region</label>
              <select className="select-field" value={createForm.region}
                onChange={(e) => setCreateForm({ ...createForm, region: e.target.value })}>
                {['us-east-1', 'us-west-2', 'eu-west-1', 'eu-central-1', 'ap-south-1', 'ap-southeast-1'].map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn-primary" style={{ height: 48 }}>Create</button>
          </form>
          {createError && (
            <p style={{ marginTop: 12, color: 'var(--error)', fontSize: '0.8rem', fontWeight: 600 }}>{createError}</p>
          )}
        </motion.div>
      )}

      {/* Company Cards */}
      {companies.length === 0 ? (
        <div className="empty-state" style={{ minHeight: '40vh' }}>
          <Building2 size={64} />
          <h3>No Companies Yet</h3>
          <p>Create your first company or wait for users to register.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {companies.map((c, i) => {
            const d = details[c.id] || {};
            return (
              <motion.div key={c.id} className="glass-card"
                initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.05 }}
                style={{ padding: 0, overflow: 'hidden', cursor: 'pointer' }}
                onClick={() => handleSelect(c.id)}
              >
                <div style={{ padding: '24px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{
                      width: 52, height: 52, borderRadius: 14,
                      background: 'linear-gradient(135deg, rgba(173,198,255,0.1), rgba(74,225,118,0.06))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: '1px solid rgba(173,198,255,0.08)',
                    }}>
                      <Building2 size={24} color="var(--primary)" />
                    </div>
                    <div>
                      <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'white' }}>{c.name}</div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                        <span className="badge low">{c.industry}</span>
                        <span style={{ fontSize: '0.625rem', color: 'var(--on-surface-variant)' }}>
                          {c.region} · Joined {new Date(c.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                    {/* Quick metrics */}
                    <div style={{ display: 'flex', gap: 24 }}>
                      <div style={{ textAlign: 'center' }}>
                        <div className="kpi-label">Carbon</div>
                        <div style={{ fontSize: '1rem', fontWeight: 800, color: 'white', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Cloud size={14} color="var(--error)" />
                          {(d.total_carbon || 0).toFixed(1)}
                        </div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div className="kpi-label">Datasets</div>
                        <div style={{ fontSize: '1rem', fontWeight: 800, color: 'white', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Database size={14} color="var(--primary)" />
                          {d.dataset_count || 0}
                        </div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div className="kpi-label">Users</div>
                        <div style={{ fontSize: '1rem', fontWeight: 800, color: 'white', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Users size={14} color="var(--tertiary)" />
                          {d.user_count || 0}
                        </div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div className="kpi-label">Score</div>
                        <div style={{
                          fontSize: '1rem', fontWeight: 800,
                          color: (d.sustainability_score || 0) >= 70 ? 'var(--tertiary)' : (d.sustainability_score || 0) >= 50 ? 'var(--primary)' : 'var(--error)',
                        }}>
                          {(d.sustainability_score || 0).toFixed(0)}
                        </div>
                      </div>
                    </div>

                    {user?.role === 'csp_admin' && (
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 8 }}>
                        <Trash2 size={16} />
                      </button>
                    )}
                    <ChevronRight size={20} color="#64748b" />
                  </div>
                </div>

                {(companyDatasets[c.id] || []).length > 0 && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      borderTop: '1px solid rgba(255,255,255,0.05)',
                      padding: '16px 28px 20px',
                      background: 'rgba(10,14,19,0.18)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <FileSpreadsheet size={16} color="var(--primary)" />
                        <span className="section-label">Uploaded Datasets</span>
                      </div>
                      <span style={{ fontSize: '0.625rem', color: 'var(--on-surface-variant)', fontWeight: 700 }}>
                        {(companyDatasets[c.id] || []).length} file{(companyDatasets[c.id] || []).length === 1 ? '' : 's'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {(companyDatasets[c.id] || []).map((dataset) => (
                        <div
                          key={dataset.id}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'minmax(220px, 1fr) auto',
                            gap: 16,
                            alignItems: 'center',
                            padding: '12px 14px',
                            borderRadius: 8,
                            background: 'rgba(38,42,48,0.55)',
                            border: '1px solid rgba(255,255,255,0.04)',
                          }}
                        >
                          <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                            <FileSpreadsheet size={18} color="var(--tertiary)" style={{ flexShrink: 0 }} />
                            <div style={{ minWidth: 0 }}>
                              <div style={{
                                fontSize: '0.8125rem',
                                fontWeight: 800,
                                color: 'white',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}>
                                {dataset.name}
                              </div>
                              <div style={{ fontSize: '0.625rem', color: 'var(--on-surface-variant)', marginTop: 2 }}>
                                Uploaded {new Date(dataset.created_at).toLocaleString()}
                              </div>
                            </div>
                          </div>

                          {user?.role === 'csp_analyst' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                              <button className="btn-primary" onClick={() => handleDownloadDataset(dataset)} title="Download uploaded dataset CSV">
                                <Download size={14} />
                                Download
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}


    </motion.div>
  );
}

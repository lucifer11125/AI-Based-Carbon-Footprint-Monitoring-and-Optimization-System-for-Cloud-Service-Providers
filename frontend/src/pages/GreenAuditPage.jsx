import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { datasetAPI } from '../api';
import {
  Shield, Leaf, Zap, HardDrive, Wifi, MapPin, AlertTriangle,
  CheckCircle, XCircle, Database
} from 'lucide-react';

const SCORE_CONFIG = {
  High: { color: 'var(--error)', bg: 'rgba(255,180,171,0.1)', icon: XCircle },
  Moderate: { color: 'var(--secondary)', bg: 'rgba(208,188,255,0.1)', icon: AlertTriangle },
  Low: { color: 'var(--tertiary)', bg: 'rgba(74,225,118,0.1)', icon: CheckCircle },
};

export default function GreenAuditPage() {
  const { selectedDatasetId, selectedDataset, selectedCompany, datasets } = useApp();
  const [audit, setAudit] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!selectedDatasetId) { setAudit(null); return; }
    setLoading(true);
    setError('');
    datasetAPI.getAudit(selectedDatasetId)
      .then(res => setAudit(res.data))
      .catch(err => {
        setAudit(null);
        if (err.response?.status !== 404) {
          setError(err.response?.data?.detail || 'Audit failed');
        }
      })
      .finally(() => setLoading(false));
  }, [selectedDatasetId]);

  if (!selectedDatasetId || datasets.length === 0) {
    return (
      <div className="empty-state" style={{ minHeight: '60vh' }}>
        <Shield size={64} />
        <h3>No Dataset Selected</h3>
        <p>Select a dataset to run a green infrastructure audit.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div className="skeleton" style={{ height: 200, borderRadius: 16 }} />
        <div className="grid-3">
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 120, borderRadius: 16 }} />)}
        </div>
      </div>
    );
  }

  if (!audit) {
    return (
      <div className="empty-state" style={{ minHeight: '50vh' }}>
        <Database size={64} />
        <h3>Audit Unavailable</h3>
        <p>{error || 'Not enough data to perform a green audit. Upload more records.'}</p>
      </div>
    );
  }

  const config = SCORE_CONFIG[audit.status] || SCORE_CONFIG.Moderate;
  const StatusIcon = config.icon;

  const categories = [
    { label: 'Compute Efficiency', value: audit.compute_efficiency, icon: Zap, color: '#adc6ff' },
    { label: 'Storage Utilization', value: audit.storage_utilization, icon: HardDrive, color: '#4ae176' },
    { label: 'Network Footprint', value: audit.network_footprint, icon: Wifi, color: '#d0bcff' },
    { label: 'Region Efficiency', value: audit.region_efficiency, icon: MapPin, color: '#4d8eff' },
    { label: 'Idle Waste Score', value: audit.idle_waste_score, icon: Leaf, color: '#f8c557' },
  ];

  const recs = audit.recommendations || (audit.recommendations_json ? JSON.parse(audit.recommendations_json) : []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div>
        <span className="section-label">ESG Compliance</span>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white', marginTop: 4 }}>
          Green Audit {selectedCompany ? `— ${selectedCompany.name}` : ''}
        </h1>
        {selectedDataset && <p className="section-subtitle">Analysis for {selectedDataset.name}</p>}
      </div>

      {/* Overall Score Banner */}
      <motion.div className="glass-card"
        initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        style={{
          padding: 32, display: 'flex', alignItems: 'center', gap: 32,
          borderLeft: `4px solid ${config.color}`,
          background: `linear-gradient(135deg, ${config.bg}, transparent)`,
        }}>
        <div style={{
          width: 100, height: 100, borderRadius: '50%',
          background: config.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: `3px solid ${config.color}`,
          position: 'relative',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: config.color }}>{audit.overall_score}</div>
            <div style={{ fontSize: '0.5rem', fontWeight: 700, color: 'var(--on-surface-variant)', textTransform: 'uppercase' }}>Score</div>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <StatusIcon size={24} color={config.color} />
            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: config.color }}>
              {audit.status} Risk
            </span>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', lineHeight: 1.6 }}>
            {audit.main_issue}
          </p>
        </div>
      </motion.div>

      {/* Category Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
        {categories.map((cat, i) => {
          const Icon = cat.icon;
          const pct = Math.max(0, Math.min(100, cat.value));
          return (
            <motion.div key={cat.label} className="glass-card"
              initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 + i * 0.05 }}
              style={{ padding: 20, textAlign: 'center' }}>
              <Icon size={24} color={cat.color} style={{ marginBottom: 12 }} />
              <div className="kpi-label" style={{ marginBottom: 8 }}>{cat.label}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'white', marginBottom: 12 }}>
                {pct.toFixed(0)}%
              </div>
              <div className="progress-bar" style={{ height: 8 }}>
                <div style={{
                  height: '100%', borderRadius: 4, width: `${pct}%`,
                  background: `linear-gradient(90deg, ${cat.color}80, ${cat.color})`,
                  boxShadow: `0 0 10px ${cat.color}60`,
                  transition: 'width 1s ease',
                }} />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Audit Recommendations */}
      {recs.length > 0 && (
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}>
          <h3 className="section-title" style={{ marginBottom: 16 }}>Audit Recommendations</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {recs.map((r, i) => (
              <div key={i} className="glass-card" style={{
                padding: '20px 24px', display: 'flex', alignItems: 'flex-start', gap: 16,
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                  background: r.priority === 'High' ? 'rgba(255,180,171,0.1)' : r.priority === 'Medium' ? 'rgba(208,188,255,0.1)' : 'rgba(74,225,118,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Shield size={18} color={r.priority === 'High' ? 'var(--error)' : r.priority === 'Medium' ? 'var(--secondary)' : 'var(--tertiary)'} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'white' }}>{r.title}</span>
                    <span className={`badge ${r.priority === 'High' ? 'high' : r.priority === 'Medium' ? 'medium' : 'low'}`}>
                      {r.priority}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)', lineHeight: 1.6 }}>{r.description}</p>
                  {r.impact && (
                    <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--tertiary)', marginTop: 8, display: 'inline-block' }}>
                      {r.impact}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

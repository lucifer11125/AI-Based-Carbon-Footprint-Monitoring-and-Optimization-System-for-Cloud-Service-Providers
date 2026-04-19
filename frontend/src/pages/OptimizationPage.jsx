import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { datasetAPI } from '../api';
import {
  Sparkles, TrendingDown, DollarSign, Leaf, Zap,
  ChevronRight, Database, ArrowRight
} from 'lucide-react';

const PRIORITY_COLORS = {
  High: { color: 'var(--error)', bg: 'rgba(255,180,171,0.1)', border: 'rgba(255,180,171,0.15)' },
  Medium: { color: 'var(--secondary)', bg: 'rgba(208,188,255,0.1)', border: 'rgba(208,188,255,0.15)' },
  Low: { color: 'var(--tertiary)', bg: 'rgba(74,225,118,0.1)', border: 'rgba(74,225,118,0.15)' },
};

export default function OptimizationPage() {
  const { selectedDatasetId, selectedDataset, selectedCompany, datasets } = useApp();
  const [recs, setRecs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedDatasetId) { setRecs([]); return; }
    setLoading(true);
    datasetAPI.getRecommendations(selectedDatasetId)
      .then(res => setRecs(res.data))
      .catch(() => setRecs([]))
      .finally(() => setLoading(false));
  }, [selectedDatasetId]);

  if (!selectedDatasetId || datasets.length === 0) {
    return (
      <div className="empty-state" style={{ minHeight: '60vh' }}>
        <Database size={64} />
        <h3>No Dataset Selected</h3>
        <p>Select a company and dataset to see optimization recommendations.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 120, borderRadius: 16 }} />)}
      </div>
    );
  }

  // Aggregate totals
  const totalCarbonReduction = recs.reduce((sum, r) => sum + (r.expected_carbon_reduction || 0), 0);
  const totalCostSavings = recs.reduce((sum, r) => sum + (r.expected_cost_savings || 0), 0);
  const highPriority = recs.filter(r => r.priority === 'High').length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div>
        <span className="section-label">AI-Powered Insights</span>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white', marginTop: 4 }}>
          Optimization Insights {selectedCompany ? `— ${selectedCompany.name}` : ''}
        </h1>
        {selectedDataset && <p className="section-subtitle">Analysis for {selectedDataset.name}</p>}
      </div>

      {/* Summary Cards */}
      <div className="grid-3">
        <motion.div className="kpi-card" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
          <div className="glow" style={{ background: 'var(--tertiary)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ padding: 10, borderRadius: 10, background: 'rgba(74,225,118,0.1)' }}>
              <TrendingDown size={20} color="var(--tertiary)" />
            </div>
            <span className="kpi-label">Total Carbon Reduction</span>
          </div>
          <div><span className="kpi-value">{totalCarbonReduction.toFixed(1)}</span><span className="kpi-unit">tCO2e</span></div>
        </motion.div>

        <motion.div className="kpi-card" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
          <div className="glow" style={{ background: 'var(--primary)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ padding: 10, borderRadius: 10, background: 'rgba(173,198,255,0.1)' }}>
              <DollarSign size={20} color="var(--primary)" />
            </div>
            <span className="kpi-label">Potential Savings</span>
          </div>
          <div><span className="kpi-value">${totalCostSavings.toLocaleString(undefined,{maximumFractionDigits:0})}</span></div>
        </motion.div>

        <motion.div className="kpi-card" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
          <div className="glow" style={{ background: 'var(--error)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ padding: 10, borderRadius: 10, background: 'rgba(255,180,171,0.1)' }}>
              <Sparkles size={20} color="var(--error)" />
            </div>
            <span className="kpi-label">High Priority Actions</span>
          </div>
          <div><span className="kpi-value">{highPriority}</span><span className="kpi-unit">of {recs.length}</span></div>
        </motion.div>
      </div>

      {/* Recommendations List */}
      {recs.length === 0 ? (
        <div className="empty-state" style={{ minHeight: '30vh' }}>
          <Sparkles size={48} />
          <h3>No Recommendations</h3>
          <p>Upload a dataset with more records to generate optimization insights.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {recs.map((r, i) => {
            const pc = PRIORITY_COLORS[r.priority] || PRIORITY_COLORS.Medium;
            return (
              <motion.div key={r.id || i} className="glass-card"
                initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 + i * 0.04 }}
                style={{ padding: '24px 28px', borderLeft: `4px solid ${pc.color}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'white' }}>{r.title}</h3>
                      <span className={`badge ${r.priority === 'High' ? 'high' : r.priority === 'Medium' ? 'medium' : 'low'}`}>
                        {r.priority}
                      </span>
                      <span style={{
                        padding: '2px 8px', borderRadius: 6, fontSize: '0.5rem',
                        fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em',
                        background: 'var(--surface-container-high)', color: 'var(--on-surface-variant)',
                      }}>
                        {r.implementation_effort} Effort
                      </span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)', lineHeight: 1.6 }}>
                      {r.description}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 20, flexShrink: 0 }}>
                    {r.expected_carbon_reduction > 0 && (
                      <div style={{ textAlign: 'center' }}>
                        <div className="kpi-label">Carbon</div>
                        <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--tertiary)' }}>
                          -{r.expected_carbon_reduction.toFixed(1)}
                        </div>
                        <div style={{ fontSize: '0.5rem', color: 'var(--on-surface-variant)' }}>tCO2e</div>
                      </div>
                    )}
                    {r.expected_cost_savings > 0 && (
                      <div style={{ textAlign: 'center' }}>
                        <div className="kpi-label">Savings</div>
                        <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary)' }}>
                          ${r.expected_cost_savings.toFixed(0)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

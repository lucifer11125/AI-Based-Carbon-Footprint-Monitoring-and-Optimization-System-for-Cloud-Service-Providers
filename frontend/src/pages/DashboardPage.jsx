import React, { useState, useEffect, useRef, Suspense } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { datasetAPI } from '../api';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  Cloud, Zap, Shield, DollarSign, TrendingUp, TrendingDown, Minus,
  Database, ArrowUpRight, Sparkles
} from 'lucide-react';

const COLORS = ['#adc6ff', '#4ae176', '#d0bcff', '#ffb4ab', '#4d8eff'];
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function DashboardPage() {
  const { selectedDatasetId, selectedDataset, selectedCompany, datasets } = useApp();
  const [dashboard, setDashboard] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const cacheRef = useRef({});

  useEffect(() => {
    if (!selectedDatasetId) {
      setDashboard(null);
      setPredictions([]);
      setError('');
      return;
    }

    // Use cached data if we already fetched this dataset
    if (cacheRef.current[selectedDatasetId]) {
      const cached = cacheRef.current[selectedDatasetId];
      setDashboard(cached.dashboard);
      setPredictions(cached.predictions);
      setError('');
      return;
    }

    setLoading(true);
    setError('');
    setDashboard(null);
    datasetAPI.getDashboard(selectedDatasetId).then(res => {
      const data = res.data;
      const preds = data.predictions || [];
      setDashboard(data);
      setPredictions(preds);
      // Cache for instant re-visit
      cacheRef.current[selectedDatasetId] = { dashboard: data, predictions: preds };
    }).catch(err => {
      setDashboard(null);
      setPredictions([]);
      setError(err.response?.data?.detail || 'Dashboard failed to load. Please check that the backend is running and the dataset finished processing.');
      console.error(err);
    })
    .finally(() => setLoading(false));
  }, [selectedDatasetId]);

  if (!selectedDatasetId || datasets.length === 0) {
    return (
      <div className="empty-state" style={{ minHeight: '60vh' }}>
        <Database size={64} />
        <h3>No Data Available</h3>
        <p>Upload a dataset for {selectedCompany?.name || 'your company'} to see analytics and insights.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div className="grid-4">
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 140, borderRadius: 16 }} />)}
        </div>
        <div className="skeleton" style={{ height: 400, borderRadius: 16 }} />
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="empty-state" style={{ minHeight: '60vh' }}>
        <Database size={64} />
        <h3>Dashboard Unavailable</h3>
        <p>{error || 'No processed metrics are available for this dataset yet.'}</p>
      </div>
    );
  }

  const { total_carbon, total_energy, total_cost, sustainability_score, carbon_trend, energy_trend, cost_trend, metrics, region_breakdown, service_breakdown } = dashboard;

  const chartData = metrics.map(m => ({
    name: `${MONTH_SHORT[(m.month - 1) % 12]} ${m.year}`,
    carbon: Number(m.total_carbon?.toFixed(2)),
    energy: Number(m.total_energy?.toFixed(2)),
    score: Number(m.sustainability_score?.toFixed(1)),
  }));

  const predData = predictions.map(p => ({
    name: p.month_name, predicted: Number(p.predicted_carbon?.toFixed(2)),
    trend: p.trend_direction, confidence: p.confidence_score,
  }));

  const TrendIcon = ({ val }) => {
    if (val > 2) return <TrendingUp size={14} />;
    if (val < -2) return <TrendingDown size={14} />;
    return <Minus size={14} />;
  };

  const trendClass = (val, invert = false) => {
    const v = invert ? -val : val;
    if (v > 2) return 'negative';
    if (v < -2) return 'positive';
    return 'neutral';
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {/* KPI Row */}
      <div className="grid-4">
        <motion.div className="kpi-card" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
          <div className="glow" style={{ background: 'var(--error)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ padding: 10, borderRadius: 10, background: 'rgba(255,180,171,0.1)', color: 'var(--error)' }}>
              <Cloud size={20} />
            </div>
            <span className="kpi-label">Total Carbon</span>
          </div>
          <div><span className="kpi-value">{total_carbon.toLocaleString()}</span><span className="kpi-unit">tCO2e</span></div>
          <div className={`kpi-trend ${trendClass(carbon_trend)}`}>
            <TrendIcon val={carbon_trend} />
            {Math.abs(carbon_trend).toFixed(1)}% vs last period
          </div>
        </motion.div>

        <motion.div className="kpi-card" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
          <div className="glow" style={{ background: 'var(--primary)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ padding: 10, borderRadius: 10, background: 'rgba(173,198,255,0.1)', color: 'var(--primary)' }}>
              <Zap size={20} />
            </div>
            <span className="kpi-label">Energy Used</span>
          </div>
          <div><span className="kpi-value">{total_energy.toLocaleString()}</span><span className="kpi-unit">kWh</span></div>
          <div className={`kpi-trend ${trendClass(energy_trend)}`}>
            <TrendIcon val={energy_trend} />
            {Math.abs(energy_trend).toFixed(1)}% vs last period
          </div>
        </motion.div>

        <motion.div className="kpi-card" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
          <div className="glow" style={{ background: 'var(--tertiary)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ padding: 10, borderRadius: 10, background: 'rgba(74,225,118,0.1)', color: 'var(--tertiary)' }}>
              <Shield size={20} />
            </div>
            <span className="kpi-label">Sustainability</span>
          </div>
          <div><span className="kpi-value">{sustainability_score.toFixed(0)}</span><span className="kpi-unit">/ 100</span></div>
          <div className="kpi-trend positive">
            <ArrowUpRight size={14} />
            {sustainability_score >= 75 ? 'Excellent' : sustainability_score >= 50 ? 'Good' : 'Needs work'}
          </div>
        </motion.div>

        <motion.div className="kpi-card" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
          <div className="glow" style={{ background: 'var(--secondary)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ padding: 10, borderRadius: 10, background: 'rgba(208,188,255,0.1)', color: 'var(--secondary)' }}>
              <DollarSign size={20} />
            </div>
            <span className="kpi-label">Total Cost</span>
          </div>
          <div><span className="kpi-value">${total_cost.toLocaleString()}</span></div>
          <div className={`kpi-trend ${trendClass(cost_trend)}`}>
            <TrendIcon val={cost_trend} />
            {Math.abs(cost_trend).toFixed(1)}% vs last period
          </div>
        </motion.div>
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
        {/* Carbon Trend Chart */}
        <motion.div className="glass-card" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}
          style={{ padding: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
            <div>
              <h3 className="section-title">Carbon Emission Trend</h3>
              <p className="section-subtitle">tCO2e across historical data</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="carbonGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#adc6ff" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#adc6ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip
                contentStyle={{
                  background: 'rgba(17,24,39,0.95)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 12, color: '#e0e2ea', fontSize: '0.75rem',
                }}
              />
              <Area type="monotone" dataKey="carbon" stroke="#adc6ff" strokeWidth={3} fill="url(#carbonGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Service Breakdown */}
        <motion.div className="glass-card" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6 }}
          style={{ padding: 32 }}>
          <h3 className="section-title">Service Breakdown</h3>
          <p className="section-subtitle">Carbon by service type</p>
          <div style={{ marginTop: 16 }}>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={service_breakdown} dataKey="carbon" nameKey="service" cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                  paddingAngle={4} strokeWidth={0}>
                  {service_breakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{
                  background: 'rgba(17,24,39,0.95)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 12, color: '#e0e2ea', fontSize: '0.75rem',
                }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
              {service_breakdown.map((s, i) => (
                <div key={s.service} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[i % COLORS.length] }} />
                    <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>{s.service}</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'white' }}>{s.carbon.toFixed(1)} t</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Region Breakdown */}
        <motion.div className="glass-card" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.7 }}
          style={{ padding: 32 }}>
          <h3 className="section-title">Region Efficiency</h3>
          <p className="section-subtitle" style={{ marginBottom: 24 }}>Carbon by deployment region</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {region_breakdown.map((r) => {
              const maxC = Math.max(...region_breakdown.map(x => x.carbon));
              const pct = maxC > 0 ? (r.carbon / maxC * 100) : 0;
              const isHigh = pct > 70;
              return (
                <div key={r.region}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'white' }}>{r.region}</span>
                      <span className={`badge ${isHigh ? 'high' : 'low'}`}>{isHigh ? 'High Carbon' : 'Optimized'}</span>
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--on-surface-variant)' }}>{r.carbon.toFixed(1)} tCO2e</span>
                  </div>
                  <div className="progress-bar">
                    <div className={`fill ${isHigh ? 'red' : 'green'}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* AI Predictions */}
        <motion.div className="glass-card" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.8 }}
          style={{ padding: 32, borderLeft: '4px solid var(--primary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <Sparkles size={20} style={{ color: 'var(--primary)' }} />
            <h3 className="section-title">AI Predictions</h3>
          </div>
          {predictions.length === 0 ? (
            <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.8rem' }}>Not enough data for predictions yet.</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={predData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip contentStyle={{
                    background: 'rgba(17,24,39,0.95)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 12, color: '#e0e2ea', fontSize: '0.75rem',
                  }} />
                  <Bar dataKey="predicted" fill="#4d8eff" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
                {predictions.map((p, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#cbd5e1' }}>{p.month_name}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'white' }}>{p.predicted_carbon.toFixed(2)} tCO2e</span>
                      <span className={`badge ${p.trend_direction === 'Increasing' ? 'high' : p.trend_direction === 'Decreasing' ? 'low' : 'medium'}`}>
                        {p.trend_direction}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}

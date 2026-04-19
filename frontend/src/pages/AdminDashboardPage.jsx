import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { adminAPI } from '../api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import {
  Cloud, Zap, Shield, DollarSign, Building2, Users, Database,
  TrendingUp, ArrowUpRight, Factory, Crown
} from 'lucide-react';

const COLORS = ['#adc6ff', '#4ae176', '#d0bcff', '#ffb4ab', '#4d8eff', '#f8c557'];

export default function AdminDashboardPage() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    adminAPI.getOverview()
      .then(res => setOverview(res.data))
      .catch(err => {
        console.error(err);
        setError(err.response?.data?.detail || 'Admin dashboard failed to load. Please check the backend and try again.');
      })
      .finally(() => setLoading(false));
  }, []);

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

  if (!overview) {
    return (
      <div className="empty-state" style={{ minHeight: '60vh' }}>
        <Database size={64} />
        <h3>Admin Dashboard Unavailable</h3>
        <p>{error || 'No overview data is available yet.'}</p>
      </div>
    );
  }

  const { total_companies, total_users, total_datasets, total_carbon, total_energy,
    total_cost, avg_sustainability, company_rankings } = overview;

  // Prepare chart data
  const companyBarData = company_rankings.slice(0, 8).map(c => ({
    name: c.name.length > 12 ? c.name.slice(0, 12) + '…' : c.name,
    carbon: c.total_carbon,
    cost: c.total_cost,
  }));

  const industryMap = {};
  company_rankings.forEach(c => {
    if (!industryMap[c.industry]) industryMap[c.industry] = 0;
    industryMap[c.industry] += c.total_carbon;
  });
  const industryData = Object.entries(industryMap).map(([name, carbon]) => ({ name, carbon: Math.round(carbon * 100) / 100 }));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 14,
          background: 'linear-gradient(135deg, rgba(255,180,171,0.15), rgba(255,180,171,0.05))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Crown size={24} color="var(--error)" />
        </div>
        <div>
          <span className="section-label">Platform Administration</span>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white', marginTop: 2 }}>Global Overview</h1>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid-4">
        {[
          { label: 'Total Carbon', value: total_carbon.toLocaleString(), unit: 'tCO2e', icon: Cloud, color: 'var(--error)', bg: 'rgba(255,180,171,0.1)' },
          { label: 'Energy Consumed', value: total_energy.toLocaleString(), unit: 'kWh', icon: Zap, color: 'var(--primary)', bg: 'rgba(173,198,255,0.1)' },
          { label: 'Sustainability', value: avg_sustainability.toFixed(0), unit: '/ 100', icon: Shield, color: 'var(--tertiary)', bg: 'rgba(74,225,118,0.1)' },
          { label: 'Platform Cost', value: `$${total_cost.toLocaleString()}`, unit: '', icon: DollarSign, color: 'var(--secondary)', bg: 'rgba(208,188,255,0.1)' },
        ].map((kpi, i) => (
          <motion.div key={kpi.label} className="kpi-card"
            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.1 }}>
            <div className="glow" style={{ background: kpi.color }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ padding: 10, borderRadius: 10, background: kpi.bg, color: kpi.color }}>
                <kpi.icon size={20} />
              </div>
              <span className="kpi-label">{kpi.label}</span>
            </div>
            <div><span className="kpi-value">{kpi.value}</span><span className="kpi-unit">{kpi.unit}</span></div>
          </motion.div>
        ))}
      </div>

      {/* Stats Row */}
      <div className="grid-3">
        {[
          { label: 'Companies', value: total_companies, icon: Building2, color: '#4d8eff' },
          { label: 'Users', value: total_users, icon: Users, color: '#4ae176' },
          { label: 'Datasets', value: total_datasets, icon: Database, color: '#d0bcff' },
        ].map((stat, i) => (
          <motion.div key={stat.label} className="glass-card"
            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 + i * 0.1 }}
            style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: `${stat.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <stat.icon size={24} color={stat.color} />
            </div>
            <div>
              <div className="kpi-label">{stat.label}</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'white' }}>{stat.value}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
        {/* Company Comparison */}
        <motion.div className="glass-card" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.7 }}
          style={{ padding: 32 }}>
          <h3 className="section-title">Company Comparison</h3>
          <p className="section-subtitle" style={{ marginBottom: 24 }}>Carbon emissions by company</p>
          {companyBarData.length === 0 ? (
            <div className="empty-state" style={{ padding: 40 }}>
              <Building2 size={48} />
              <h3>No Company Data</h3>
              <p>Companies will appear here once datasets are uploaded.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={companyBarData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip contentStyle={{
                  background: 'rgba(17,24,39,0.95)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 12, color: '#e0e2ea', fontSize: '0.75rem',
                }} />
                <Bar dataKey="carbon" name="Carbon (tCO2e)" fill="#adc6ff" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* Industry Breakdown */}
        <motion.div className="glass-card" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.8 }}
          style={{ padding: 32 }}>
          <h3 className="section-title">Industry Breakdown</h3>
          <p className="section-subtitle" style={{ marginBottom: 16 }}>Carbon by industry sector</p>
          {industryData.length === 0 ? (
            <div className="empty-state" style={{ padding: 40 }}>
              <Factory size={48} />
              <p>No data yet</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={industryData} dataKey="carbon" nameKey="name" cx="50%" cy="50%"
                    innerRadius={50} outerRadius={80} paddingAngle={4} strokeWidth={0}>
                    {industryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{
                    background: 'rgba(17,24,39,0.95)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 12, color: '#e0e2ea', fontSize: '0.75rem',
                  }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                {industryData.map((s, i) => (
                  <div key={s.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[i % COLORS.length] }} />
                      <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>{s.name}</span>
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'white' }}>{s.carbon.toFixed(1)} t</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </motion.div>
      </div>

      {/* Top Polluters */}
      <motion.div className="glass-card" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.9 }}
        style={{ padding: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h3 className="section-title">Company Rankings</h3>
            <p className="section-subtitle">Ordered by total carbon emissions</p>
          </div>
          <span className="badge high">{company_rankings.length} Companies</span>
        </div>
        {company_rankings.length === 0 ? (
          <div className="empty-state" style={{ padding: 32 }}>
            <Building2 size={48} />
            <p>No companies registered yet</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {company_rankings.map((c, i) => {
              const maxC = Math.max(...company_rankings.map(x => x.total_carbon));
              const pct = maxC > 0 ? (c.total_carbon / maxC * 100) : 0;
              return (
                <div key={c.id} style={{
                  display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px',
                  borderRadius: 12, background: 'var(--surface-container-low)',
                  transition: 'all 0.2s',
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: `${COLORS[i % COLORS.length]}15`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: COLORS[i % COLORS.length], fontSize: '0.875rem', fontWeight: 900,
                  }}>
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'white' }}>{c.name}</span>
                        <span className="badge low">{c.industry}</span>
                      </div>
                      <span style={{ fontSize: '0.875rem', fontWeight: 800, color: COLORS[i % COLORS.length] }}>
                        {c.total_carbon.toFixed(1)} tCO2e
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div className="fill blue" style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 16, marginLeft: 8 }}>
                    <div style={{ textAlign: 'center' }}>
                      <div className="kpi-label">Datasets</div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 800, color: 'white' }}>{c.dataset_count}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div className="kpi-label">Users</div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 800, color: 'white' }}>{c.user_count}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div className="kpi-label">Score</div>
                      <div style={{
                        fontSize: '0.875rem', fontWeight: 800,
                        color: c.sustainability_score >= 70 ? 'var(--tertiary)' : c.sustainability_score >= 50 ? 'var(--primary)' : 'var(--error)',
                      }}>{c.sustainability_score}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { datasetAPI } from '../api';
import {
  FlaskConical, TrendingDown, TrendingUp, Minus, Zap, Cloud,
  DollarSign, Leaf, Database, Play
} from 'lucide-react';

const SLIDERS = [
  { key: 'cpu_reduction_percent', label: 'CPU Reduction', icon: Zap, color: '#adc6ff', unit: '%', max: 80 },
  { key: 'storage_optimization_percent', label: 'Storage Optimization', icon: Cloud, color: '#4ae176', unit: '%', max: 60 },
  { key: 'idle_reduction_percent', label: 'Idle Reduction', icon: Leaf, color: '#d0bcff', unit: '%', max: 90 },
  { key: 'renewable_energy_percent', label: 'Renewable Energy', icon: FlaskConical, color: '#4d8eff', unit: '%', max: 100 },
];

export default function SimulatorPage() {
  const { selectedDatasetId, selectedDataset, selectedCompany, datasets } = useApp();
  const [params, setParams] = useState({
    cpu_reduction_percent: 15,
    storage_optimization_percent: 10,
    region_shift_factor: 0.8,
    idle_reduction_percent: 20,
    renewable_energy_percent: 30,
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRun = async () => {
    if (!selectedDatasetId) return;
    setLoading(true);
    setError('');
    try {
      const res = await datasetAPI.simulate(selectedDatasetId, params);
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Simulation failed');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  if (!selectedDatasetId || datasets.length === 0) {
    return (
      <div className="empty-state" style={{ minHeight: '60vh' }}>
        <Database size={64} />
        <h3>No Dataset Selected</h3>
        <p>Select a company and dataset to run what-if simulations.</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div>
        <span className="section-label">What-If Analysis</span>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white', marginTop: 4 }}>
          Carbon Simulator {selectedCompany ? `— ${selectedCompany.name}` : ''}
        </h1>
        {selectedDataset && <p className="section-subtitle">Simulating for {selectedDataset.name}</p>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Controls */}
        <motion.div className="glass-card" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          style={{ padding: 32 }}>
          <h3 className="section-title" style={{ marginBottom: 24 }}>Simulation Parameters</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {SLIDERS.map(s => {
              const Icon = s.icon;
              return (
                <div key={s.key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Icon size={16} color={s.color} />
                      <span className="kpi-label">{s.label}</span>
                    </div>
                    <span style={{ fontSize: '1rem', fontWeight: 800, color: s.color }}>
                      {params[s.key]}{s.unit}
                    </span>
                  </div>
                  <input
                    type="range" min={0} max={s.max}
                    value={params[s.key]}
                    onChange={(e) => setParams({ ...params, [s.key]: Number(e.target.value) })}
                    style={{
                      accentColor: s.color,
                      background: `linear-gradient(90deg, ${s.color} ${(params[s.key]/s.max)*100}%, var(--surface-container-highest) ${(params[s.key]/s.max)*100}%)`,
                    }}
                  />
                </div>
              );
            })}

            {/* Region factor */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Cloud size={16} color="#f8c557" />
                  <span className="kpi-label">Region Carbon Intensity</span>
                </div>
                <span style={{ fontSize: '1rem', fontWeight: 800, color: '#f8c557' }}>
                  {params.region_shift_factor.toFixed(2)}
                </span>
              </div>
              <input
                type="range" min={0.1} max={1.5} step={0.05}
                value={params.region_shift_factor}
                onChange={(e) => setParams({ ...params, region_shift_factor: Number(e.target.value) })}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ fontSize: '0.5rem', color: 'var(--on-surface-variant)' }}>Low Carbon (Nordic)</span>
                <span style={{ fontSize: '0.5rem', color: 'var(--on-surface-variant)' }}>High Carbon (Coal)</span>
              </div>
            </div>
          </div>

          <button className="btn-primary" onClick={handleRun} disabled={loading}
            style={{ width: '100%', marginTop: 32, padding: '16px' }}>
            <Play size={16} />
            {loading ? 'Simulating...' : 'Run Simulation'}
          </button>

          {error && (
            <p style={{ marginTop: 12, color: 'var(--error)', fontSize: '0.8rem', fontWeight: 600 }}>{error}</p>
          )}
        </motion.div>

        {/* Results */}
        <motion.div className="glass-card" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
          style={{ padding: 32 }}>
          <h3 className="section-title" style={{ marginBottom: 24 }}>Simulation Results</h3>
          {!result ? (
            <div className="empty-state" style={{ minHeight: '40vh' }}>
              <FlaskConical size={48} />
              <h3>Ready to Simulate</h3>
              <p>Adjust the parameters and click "Run Simulation" to see the projected impact.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Carbon Comparison */}
              <div style={{
                padding: 24, borderRadius: 16,
                background: result.carbon_change < 0 ? 'rgba(74,225,118,0.06)' : 'rgba(255,180,171,0.06)',
                border: `1px solid ${result.carbon_change < 0 ? 'rgba(74,225,118,0.15)' : 'rgba(255,180,171,0.15)'}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div className="kpi-label">Carbon Impact</div>
                    <div style={{ fontSize: '2rem', fontWeight: 900, color: result.carbon_change < 0 ? 'var(--tertiary)' : 'var(--error)' }}>
                      {result.carbon_change_percent.toFixed(1)}%
                    </div>
                  </div>
                  {result.carbon_change < 0 ? <TrendingDown size={40} color="var(--tertiary)" /> : <TrendingUp size={40} color="var(--error)" />}
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid-2">
                <div style={{ padding: 20, borderRadius: 12, background: 'var(--surface-container-low)' }}>
                  <div className="kpi-label">Baseline Carbon</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white', marginTop: 4 }}>
                    {result.baseline_carbon.toFixed(2)}
                    <span className="kpi-unit">tCO2e</span>
                  </div>
                </div>
                <div style={{ padding: 20, borderRadius: 12, background: 'var(--surface-container-low)' }}>
                  <div className="kpi-label">Simulated Carbon</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: result.simulated_carbon < result.baseline_carbon ? 'var(--tertiary)' : 'var(--error)', marginTop: 4 }}>
                    {result.simulated_carbon.toFixed(2)}
                    <span className="kpi-unit">tCO2e</span>
                  </div>
                </div>
                <div style={{ padding: 20, borderRadius: 12, background: 'var(--surface-container-low)' }}>
                  <div className="kpi-label">Baseline Cost</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white', marginTop: 4 }}>
                    ${result.baseline_cost.toLocaleString()}
                  </div>
                </div>
                <div style={{ padding: 20, borderRadius: 12, background: 'var(--surface-container-low)' }}>
                  <div className="kpi-label">Simulated Cost</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: result.simulated_cost < result.baseline_cost ? 'var(--tertiary)' : 'var(--error)', marginTop: 4 }}>
                    ${result.simulated_cost.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Efficiency */}
              <div style={{
                padding: 20, borderRadius: 12,
                background: 'linear-gradient(135deg, rgba(173,198,255,0.08), rgba(74,225,118,0.08))',
                border: '1px solid rgba(173,198,255,0.08)',
                textAlign: 'center',
              }}>
                <div className="kpi-label" style={{ marginBottom: 4 }}>Efficiency Improvement</div>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: result.efficiency_change > 0 ? 'var(--tertiary)' : 'var(--error)' }}>
                  {result.efficiency_change > 0 ? '+' : ''}{result.efficiency_change.toFixed(1)}%
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}

import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { datasetAPI } from '../api';
import { CloudUpload, CheckCircle, AlertCircle, FileSpreadsheet, Trash2, X } from 'lucide-react';

export default function UploadPage() {
  const { user } = useAuth();
  const { selectedCompanyId, selectedCompany, datasets, refreshDatasets } = useApp();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();

  const handleUpload = async () => {
    if (!file || !selectedCompanyId) return;
    setUploading(true);
    setError('');
    setResult(null);
    try {
      const res = await datasetAPI.upload(selectedCompanyId, file);
      setResult(res.data);
      setFile(null);
      refreshDatasets();
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string') {
        setError(detail);
      } else if (detail) {
        setError(JSON.stringify(detail));
      } else if (err.request) {
        setError('Upload failed: cannot reach the backend API. Make sure FastAPI is running on http://localhost:8000.');
      } else {
        setError(err.message || 'Upload failed');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this dataset and all its analysis?')) return;
    try {
      await datasetAPI.delete(id);
      refreshDatasets();
    } catch {}
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f?.name.endsWith('.csv')) setFile(f);
    else setError('Only CSV files are supported');
  };

  if (!selectedCompanyId) {
    return (
      <div className="empty-state" style={{ minHeight: '60vh' }}>
        <CloudUpload size={64} />
        <h3>Select a Company First</h3>
        <p>Choose a company from the header to upload data.</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div>
        <span className="section-label">Data Ingestion</span>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white', marginTop: 4 }}>
          Upload Dataset — {selectedCompany?.name}
        </h1>
      </div>

      {/* Upload Zone */}
      <div
        className={`upload-zone ${dragging ? 'dragging' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 'inherit',
          background: 'linear-gradient(135deg, rgba(173,198,255,0.03), transparent)',
          pointerEvents: 'none',
        }} />
        <input ref={inputRef} type="file" accept=".csv" hidden
          onChange={(e) => { setFile(e.target.files[0]); setError(''); setResult(null); }} />
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <div style={{
            position: 'absolute', inset: -16,
            background: 'rgba(173,198,255,0.1)', filter: 'blur(24px)', borderRadius: '50%',
          }} />
          <CloudUpload size={48} color="var(--primary)" style={{ position: 'relative' }} />
        </div>
        <p style={{ fontSize: '1.125rem', fontWeight: 600, color: 'white', marginBottom: 4 }}>
          {file ? file.name : 'Drag and drop resource logs here'}
        </p>
        <p style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)' }}>
          {file ? `${(file.size / 1024).toFixed(1)} KB — Ready to upload` : 'or click to browse. Accepts .csv files'}
        </p>

        {file && (
          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            <button className="btn-primary" onClick={(e) => { e.stopPropagation(); handleUpload(); }} disabled={uploading}>
              {uploading ? 'Processing...' : 'Upload & Analyze'}
            </button>
            <button className="btn-secondary" onClick={(e) => { e.stopPropagation(); setFile(null); }}>
              <X size={14} /> Clear
            </button>
          </div>
        )}
      </div>

      {/* Required Columns Info */}
      <div className="glass-card" style={{ padding: 24 }}>
        <h4 className="section-label" style={{ marginBottom: 12 }}>Required CSV Columns</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {['month', 'year', 'cpu_hours', 'storage_gb', 'network_gb'].map(col => (
            <span key={col} style={{
              padding: '6px 14px', borderRadius: 8,
              background: 'var(--surface-container-high)',
              fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)',
              fontFamily: 'monospace',
            }}>{col}</span>
          ))}
          {['idle_percent', 'monthly_cost', 'region', 'service'].map(col => (
            <span key={col} style={{
              padding: '6px 14px', borderRadius: 8,
              background: 'var(--surface-container)',
              fontSize: '0.75rem', fontWeight: 600, color: 'var(--on-surface-variant)',
              fontFamily: 'monospace',
            }}>{col} (optional)</span>
          ))}
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <motion.div className="glass-card" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ padding: 20, borderLeft: '4px solid var(--error)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <AlertCircle size={20} color="var(--error)" />
          <span style={{ color: 'var(--error)', fontWeight: 600 }}>{error}</span>
        </motion.div>
      )}
      {result && (
        <motion.div className="glass-card" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ padding: 20, borderLeft: '4px solid var(--tertiary)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <CheckCircle size={20} color="var(--tertiary)" />
          <span style={{ color: 'var(--tertiary)', fontWeight: 600 }}>
            Dataset "{result.name}" uploaded and analyzed successfully!
          </span>
        </motion.div>
      )}

      {/* Existing Datasets */}
      {datasets.length > 0 && (
        <div>
          <h3 className="section-title" style={{ marginBottom: 16 }}>Uploaded Datasets</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {datasets.map((d) => (
              <div key={d.id} className="glass-card" style={{
                padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <FileSpreadsheet size={20} color="var(--primary)" />
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'white' }}>{d.name}</div>
                    <div style={{ fontSize: '0.625rem', color: 'var(--on-surface-variant)' }}>
                      Uploaded {new Date(d.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <button onClick={() => handleDelete(d.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4 }}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

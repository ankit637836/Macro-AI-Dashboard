import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { getCurve, getCurveRange } from '../api';

const MATURITIES = [
  { key: 'overnight', label: 'Overnight', color: '#3b82f6' },
  { key: '30d_avg',   label: '30-Day Avg', color: '#f0c040' },
  { key: '90d_avg',   label: '90-Day Avg', color: '#22c55e' },
  { key: '180d_avg',  label: '180-Day Avg', color: '#ef4444' },
];

const RANGES = [
  { label: '3M', days: 90 },
  { label: '6M', days: 180 },
  { label: '1Y', days: 365 },
  { label: 'All', days: 999 },
];

function subtractDays(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#0f1117', border: '1px solid #1e2130',
      borderRadius: 8, padding: '12px 16px', minWidth: 180,
    }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#8892a4', marginBottom: 8 }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 4 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: p.color }}>{p.name}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#fff', fontWeight: 600 }}>
            {p.value?.toFixed(4)}%
          </span>
        </div>
      ))}
    </div>
  );
};

export default function SofrCurve() {
  const [latestCurve, setLatestCurve]   = useState(null);
  const [historicalData, setHistorical] = useState([]);
  const [selectedRange, setRange]       = useState('6M');
  const [selectedMat, setMat]           = useState('90d_avg');
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    getCurve().then(r => setLatestCurve(r.data)).catch(console.error);
  }, []);

  useEffect(() => {
    const range = RANGES.find(r => r.label === selectedRange);
    const start = subtractDays(range.days === 999 ? 1200 : range.days);
    const end   = new Date().toISOString().split('T')[0];
    setLoading(true);
    getCurveRange(start, end, selectedMat)
      .then(r => {
        setHistorical(r.data.data.map(d => ({ date: d.date, rate: d.rate })));
        setLoading(false);
      })
      .catch(console.error);
  }, [selectedRange, selectedMat]);

  const curveSnapshot = latestCurve
    ? MATURITIES.map(m => ({
        name: m.label,
        rate: latestCurve.curve[m.key] ?? null,
        color: m.color,
      })).filter(d => d.rate !== null)
    : [];

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div className="page-label">Live Market Data</div>
        <h1 className="page-title">SOFR Curve</h1>
        <p className="page-subtitle">
          Term SOFR rates across maturities — overnight through 180-day average.
          {latestCurve && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>Latest: {latestCurve.date}</span>}
        </p>
      </div>

      {/* Stat chips — current curve snapshot */}
      <div className="stat-row">
        {MATURITIES.map(m => {
          const val = latestCurve?.curve[m.key];
          return (
            <div className="stat-chip" key={m.key} style={{ borderTop: `3px solid ${m.color}` }}>
              <div className="stat-chip-label">{m.label}</div>
              <div className="stat-chip-value" style={{ color: m.color }}>
                {val ? `${val.toFixed(3)}%` : '—'}
              </div>
              <div className="stat-chip-change" style={{ color: 'var(--text-muted)' }}>SOFR</div>
            </div>
          );
        })}
      </div>

      {/* Curve Snapshot Bar Chart */}
      {curveSnapshot.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-title">Current Curve Shape</div>
          <div className="card-sub">Snapshot as of {latestCurve?.date}</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={curveSnapshot} barSize={48}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="name" tick={{ fontFamily: 'IBM Plex Mono', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis
                domain={['auto', 'auto']}
                tick={{ fontFamily: 'IBM Plex Mono', fontSize: 11 }}
                tickFormatter={v => `${v.toFixed(2)}%`}
                axisLine={false} tickLine={false} width={60}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="rate" name="Rate" radius={[6, 6, 0, 0]}
                fill="#3b82f6"
                label={{ position: 'top', fontFamily: 'IBM Plex Mono', fontSize: 11, formatter: v => `${v.toFixed(3)}%` }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Historical Line Chart */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div className="card-title">Historical Rate Movement</div>
            <div className="card-sub">Select maturity and time range</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {/* Maturity selector */}
            <select
              className="styled-select"
              value={selectedMat}
              onChange={e => setMat(e.target.value)}
            >
              {MATURITIES.map(m => (
                <option key={m.key} value={m.key}>{m.label}</option>
              ))}
            </select>
            {/* Range selector */}
            <div style={{ display: 'flex', gap: 4 }}>
              {RANGES.map(r => (
                <button key={r.label} onClick={() => setRange(r.label)} style={{
                  padding: '7px 14px', borderRadius: 6, border: '1px solid var(--content-border)',
                  background: selectedRange === r.label ? 'var(--sidebar-bg)' : 'white',
                  color: selectedRange === r.label ? 'var(--accent-gold)' : 'var(--text-secondary)',
                  fontFamily: 'var(--font-mono)', fontSize: 12, cursor: 'pointer',
                  fontWeight: selectedRange === r.label ? 600 : 400,
                }}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="loading">Fetching data...</div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={historicalData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontFamily: 'IBM Plex Mono', fontSize: 10 }}
                tickFormatter={d => d.slice(0, 7)}
                interval="preserveStartEnd"
                axisLine={false} tickLine={false}
              />
              <YAxis
                domain={['auto', 'auto']}
                tick={{ fontFamily: 'IBM Plex Mono', fontSize: 11 }}
                tickFormatter={v => `${v.toFixed(2)}%`}
                axisLine={false} tickLine={false} width={60}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone" dataKey="rate"
                name={MATURITIES.find(m => m.key === selectedMat)?.label}
                stroke={MATURITIES.find(m => m.key === selectedMat)?.color}
                dot={false} strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
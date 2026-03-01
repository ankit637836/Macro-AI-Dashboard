import React, { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { getCurveRange } from '../api';

const CONTRACTS = [
  { key: 'outright_overnight', label: 'Outright — Overnight',    type: 'outright', mat: 'overnight' },
  { key: 'outright_3m',        label: 'Outright — 3 Month',      type: 'outright', mat: '30d_avg' },
  { key: 'outright_6m',        label: 'Outright — 6 Month',      type: 'outright', mat: '90d_avg' },
  { key: 'outright_12m',       label: 'Outright — 12 Month',     type: 'outright', mat: '180d_avg' },
  { key: 'spread_3m',          label: 'Calendar Spread — 3M',    type: 'spread',   mat1: '30d_avg',  mat2: 'overnight' },
  { key: 'spread_6m',          label: 'Calendar Spread — 6M',    type: 'spread',   mat1: '90d_avg',  mat2: '30d_avg' },
  { key: 'spread_9m',          label: 'Calendar Spread — 9M',    type: 'spread',   mat1: '180d_avg', mat2: '90d_avg' },
  { key: 'spread_24m',         label: 'Calendar Spread — 24M',   type: 'spread',   mat1: '180d_avg', mat2: 'overnight' },
  { key: 'fly_3m',             label: 'Butterfly — 3M',          type: 'fly',      mat1: 'overnight', mat2: '30d_avg',  mat3: '90d_avg' },
  { key: 'fly_6m',             label: 'Butterfly — 6M',          type: 'fly',      mat1: '30d_avg',   mat2: '90d_avg',  mat3: '180d_avg' },
  { key: 'dfly_3m',            label: 'Double Butterfly — 3M',   type: 'dfly',     mat1: 'overnight', mat2: '30d_avg',  mat3: '90d_avg', mat4: '180d_avg' },
  { key: 'dfly_6m',            label: 'Double Butterfly — 6M',   type: 'dfly',     mat1: '30d_avg',   mat2: '90d_avg',  mat3: '180d_avg', mat4: '180d_avg' },
];

const RANGES = [
  { label: '3M', days: 90 },
  { label: '6M', days: 180 },
  { label: '1Y', days: 365 },
  { label: 'All', days: 999 },
];

const CONTRACT_TYPES = [
  { key: 'outright', label: 'Outrights',   color: '#3b82f6' },
  { key: 'spread',   label: 'Spreads',     color: '#22c55e' },
  { key: 'fly',      label: 'Butterflies', color: '#f0c040' },
  { key: 'dfly',     label: 'Dbl Fly',     color: '#ef4444' },
];

function subtractDays(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

// Compute derived value from raw curve data per date
function computeContractValue(contract, curveByDate) {
  return Object.entries(curveByDate)
    .map(([date, rates]) => {
      let value = null;
      const { type, mat, mat1, mat2, mat3, mat4 } = contract;

      if (type === 'outright') {
        value = rates[mat] ?? null;
      } else if (type === 'spread') {
        const a = rates[mat1], b = rates[mat2];
        value = (a !== undefined && b !== undefined) ? a - b : null;
      } else if (type === 'fly') {
        const a = rates[mat1], b = rates[mat2], c = rates[mat3];
        value = (a !== undefined && b !== undefined && c !== undefined) ? a - 2 * b + c : null;
      } else if (type === 'dfly') {
        const a = rates[mat1], b = rates[mat2], c = rates[mat3], d2 = rates[mat4];
        value = (a !== undefined && b !== undefined && c !== undefined && d2 !== undefined)
          ? a - 3 * b + 3 * c - d2 : null;
      }

      return { date, value };
    })
    .filter(d => d.value !== null)
    .sort((a, b) => a.date.localeCompare(b.date));
}

const CustomTooltip = ({ active, payload, label, contractType }) => {
  if (!active || !payload?.length) return null;
  const isOutright = contractType === 'outright';
  return (
    <div style={{
      background: '#0f1117', border: '1px solid #1e2130',
      borderRadius: 8, padding: '12px 16px',
    }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#8892a4', marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: '#fff', fontWeight: 600 }}>
        {isOutright
          ? `${payload[0].value?.toFixed(4)}%`
          : `${payload[0].value > 0 ? '+' : ''}${(payload[0].value * 100)?.toFixed(2)} bps`}
      </div>
    </div>
  );
};

export default function ContractAnalysis() {
  const [selectedKey, setSelected]   = useState('outright_3m');
  const [selectedRange, setRange]    = useState('1Y');
  const [filterType, setFilterType]  = useState('all');
  const [chartData, setChartData]    = useState([]);
  const [loading, setLoading]        = useState(false);
  const [allRates, setAllRates]      = useState({});   // date -> maturity -> rate

  const contract = CONTRACTS.find(c => c.key === selectedKey);

  // Fetch all 4 maturities for the selected range
  useEffect(() => {
    const range = RANGES.find(r => r.label === selectedRange);
    const start = subtractDays(range.days === 999 ? 1200 : range.days);
    const end   = new Date().toISOString().split('T')[0];
    setLoading(true);

    const maturities = ['overnight', '30d_avg', '90d_avg', '180d_avg'];
    Promise.all(
      maturities.map(mat =>
        getCurveRange(start, end, mat).then(r => ({ mat, data: r.data.data }))
      )
    ).then(results => {
      // Build date -> maturity -> rate map
      const byDate = {};
      results.forEach(({ mat, data }) => {
        data.forEach(({ date, rate }) => {
          if (!byDate[date]) byDate[date] = {};
          byDate[date][mat] = rate;
        });
      });
      setAllRates(byDate);
      setLoading(false);
    }).catch(console.error);
  }, [selectedRange]);

  // Recompute chart when contract or raw data changes
  useEffect(() => {
    if (Object.keys(allRates).length === 0) return;
    const computed = computeContractValue(contract, allRates);
    setChartData(computed);
  }, [contract, allRates]);

  // Stats
  const values   = chartData.map(d => d.value).filter(Boolean);
  const latest   = values[values.length - 1];
  const min      = values.length ? Math.min(...values) : null;
  const max      = values.length ? Math.max(...values) : null;
  const avg      = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  const isOutright = contract?.type === 'outright';

  const fmt = v => (v === null || v === undefined) ? '—' : isOutright
    ? `${v.toFixed(3)}%`
    : `${v > 0 ? '+' : ''}${(v * 100).toFixed(2)} bps`;

  const filteredContracts = filterType === 'all'
    ? CONTRACTS
    : CONTRACTS.filter(c => c.type === filterType);

  const accentColor = CONTRACT_TYPES.find(t => t.key === contract?.type)?.color || '#3b82f6';

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-label">Rate Structures</div>
        <h1 className="page-title">Contract Analysis</h1>
        <p className="page-subtitle">
          Historical movement of outrights, calendar spreads, butterflies and double butterflies
          across the SOFR rate curve.
        </p>
      </div>

      {/* Type filter + contract selector */}
      <div style={{
        background: 'white', border: '1px solid var(--content-border)',
        borderRadius: 12, padding: '20px 24px', marginBottom: 24,
      }}>
        {/* Type pills */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <button onClick={() => setFilterType('all')} style={{
            padding: '5px 14px', borderRadius: 20, border: '1px solid var(--content-border)',
            background: filterType === 'all' ? 'var(--sidebar-bg)' : 'white',
            color: filterType === 'all' ? 'var(--accent-gold)' : 'var(--text-secondary)',
            fontFamily: 'var(--font-mono)', fontSize: 11, cursor: 'pointer',
          }}>All</button>
          {CONTRACT_TYPES.map(t => (
            <button key={t.key} onClick={() => setFilterType(t.key)} style={{
              padding: '5px 14px', borderRadius: 20,
              border: `1px solid ${filterType === t.key ? t.color : 'var(--content-border)'}`,
              background: filterType === t.key ? `${t.color}15` : 'white',
              color: filterType === t.key ? t.color : 'var(--text-secondary)',
              fontFamily: 'var(--font-mono)', fontSize: 11, cursor: 'pointer',
            }}>{t.label}</button>
          ))}
        </div>

        {/* Contract grid */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {filteredContracts.map(c => {
            const tColor = CONTRACT_TYPES.find(t => t.key === c.type)?.color || '#999';
            const active = selectedKey === c.key;
            return (
              <button key={c.key} onClick={() => setSelected(c.key)} style={{
                padding: '8px 14px', borderRadius: 8,
                border: `1px solid ${active ? tColor : 'var(--content-border)'}`,
                background: active ? `${tColor}15` : 'white',
                color: active ? tColor : 'var(--text-secondary)',
                fontFamily: 'var(--font-mono)', fontSize: 12,
                cursor: 'pointer', fontWeight: active ? 600 : 400,
                transition: 'all 0.15s',
              }}>
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Stats row */}
      <div className="stat-row">
        {[
          { label: 'Latest', value: fmt(latest) },
          { label: 'Period High', value: fmt(max) },
          { label: 'Period Low', value: fmt(min) },
          { label: 'Average', value: fmt(avg) },
        ].map(s => (
          <div className="stat-chip" key={s.label} style={{ borderTop: `3px solid ${accentColor}` }}>
            <div className="stat-chip-label">{s.label}</div>
            <div className="stat-chip-value" style={{ fontSize: 18, color: accentColor }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div className="card-title">{contract?.label}</div>
            <div className="card-sub">
              {isOutright ? 'Rate in %' : 'Spread in basis points (bps)'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {RANGES.map(r => (
              <button key={r.label} onClick={() => setRange(r.label)} style={{
                padding: '7px 14px', borderRadius: 6,
                border: '1px solid var(--content-border)',
                background: selectedRange === r.label ? 'var(--sidebar-bg)' : 'white',
                color: selectedRange === r.label ? 'var(--accent-gold)' : 'var(--text-secondary)',
                fontFamily: 'var(--font-mono)', fontSize: 12, cursor: 'pointer',
                fontWeight: selectedRange === r.label ? 600 : 400,
              }}>{r.label}</button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="loading">Computing {contract?.label}...</div>
        ) : (
          <ResponsiveContainer width="100%" height={360}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
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
                tickFormatter={v => isOutright ? `${v.toFixed(2)}%` : `${(v * 100).toFixed(0)}bp`}
                axisLine={false} tickLine={false} width={65}
              />
              <Tooltip content={<CustomTooltip contractType={contract?.type} />} />
              {!isOutright && (
                <ReferenceLine y={0} stroke="#d1d5db" strokeDasharray="3 3" strokeWidth={1} />
              )}
              <Line
                type="monotone" dataKey="value"
                stroke={accentColor}
                dot={false} strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
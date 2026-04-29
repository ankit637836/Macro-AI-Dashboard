import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000/api';

const STRUCTURES = [
  { key: 'outright', label: 'Outright',         legs: 1 },
  { key: 'spread',   label: 'Calendar Spread',  legs: 2 },
  { key: 'fly',      label: 'Butterfly',        legs: 3 },
  { key: 'dfly',     label: 'Double Butterfly', legs: 4 },
];

const INSTRUMENTS = ['SR3', 'ZQ'];

const CustomTooltip = ({ active, payload, label, isOutright }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#0f1117', border: '1px solid #1e2130', borderRadius: 8, padding: '10px 14px' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#8892a4', marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: '#f0c040', fontWeight: 600 }}>
        {isOutright ? `${payload[0].value?.toFixed(4)}` : `${payload[0].value > 0 ? '+' : ''}${payload[0].value?.toFixed(2)} bps`}
      </div>
    </div>
  );
};

export default function ContractBuilder() {
  const [instrument, setInstrument]     = useState('SR3');
  const [structure, setStructure]       = useState('spread');
  const [contracts, setContracts]       = useState([]);
  const [legs, setLegs]                 = useState(['', '', '', '']);
  const [result, setResult]             = useState(null);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState(null);
  const [eventFilter, setEventFilter]   = useState('ALL');

  const structureMeta = STRUCTURES.find(s => s.key === structure);
  const numLegs = structureMeta?.legs || 1;

  // Fetch available contracts when instrument changes
  useEffect(() => {
    axios.get(`${API}/contract-builder`, { params: { instrument } })
      .then(r => {
        setContracts(r.data.available_contracts || []);
        setLegs(['', '', '', '']);
        setResult(null);
      })
      .catch(console.error);
  }, [instrument]);

  const handleBuild = async () => {
    const selectedLegs = legs.slice(0, numLegs).filter(Boolean);
    if (selectedLegs.length < numLegs) {
      setError(`Please select all ${numLegs} leg${numLegs > 1 ? 's' : ''}`);
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const params = { instrument, structure };
      selectedLegs.forEach((leg, i) => { params[`leg${i + 1}`] = leg; });
      const res = await axios.get(`${API}/contract-builder`, { params });
      setResult(res.data);
    } catch (e) {
      setError('Failed to build structure. Try different legs.');
    }
    setLoading(false);
  };

  const updateLeg = (index, value) => {
    const newLegs = [...legs];
    newLegs[index] = value;
    setLegs(newLegs);
  };

  // Filter events on chart
  const INDICATORS = ['ALL', 'CPI', 'NFP', 'GDP', 'PCE', 'FOMC'];
  const filteredEvents = result?.events?.filter(e =>
    eventFilter === 'ALL' ||
    e.indicator === eventFilter ||
    e.indicator.includes(eventFilter)
  ) || [];

  // Stats
  const values = result?.data?.map(d => d.value).filter(v => v !== null) || [];
  const latest = values[values.length - 1];
  const min = values.length ? Math.min(...values) : null;
  const max = values.length ? Math.max(...values) : null;
  const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;

  const fmt = v => {
    if (v === null || v === undefined) return '—';
    return result?.is_outright ? v.toFixed(4) : `${v > 0 ? '+' : ''}${v.toFixed(2)} bps`;
  };

  const accentColor = '#f0c040';

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-label">Rate Structure Builder</div>
        <h1 className="page-title">Contract Builder</h1>
        <p className="page-subtitle">
            Build SR3 or ZQ rate structures using reconstructed contract month prices.
            Best for analyzing outright price history and longer-dated spreads across macro events.
        </p>
      </div>
      <div style={{
        background: 'rgba(240,192,64,0.08)', border: '1px solid rgba(240,192,64,0.2)',
        borderRadius: 8, padding: '12px 16px', marginTop: 16,
        fontFamily: 'var(--font-mono)', fontSize: 12, color: '#92814a', lineHeight: 1.6,
        }}>
        ⚠️ Prices reconstructed from FRED Term SOFR averages using linear interpolation.
        Best suited for <strong>outrights</strong> and <strong>longer-dated spreads (6M+)</strong>.
        Short calendars (3M apart) will show limited spread variation by design.
        For exact bps levels, use CME settlement data.
       </div>
      {/* Builder Panel */}
      <div style={{ background: 'white', border: '1px solid var(--content-border)', borderRadius: 12, padding: '24px', marginBottom: 24 }}>

        {/* Instrument + Structure selector */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Instrument</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {INSTRUMENTS.map(ins => (
                <button key={ins} onClick={() => setInstrument(ins)} style={{
                  padding: '8px 20px', borderRadius: 8,
                  border: `1px solid ${instrument === ins ? accentColor : 'var(--content-border)'}`,
                  background: instrument === ins ? 'rgba(240,192,64,0.1)' : 'white',
                  color: instrument === ins ? accentColor : 'var(--text-secondary)',
                  fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: instrument === ins ? 700 : 400,
                  cursor: 'pointer',
                }}>
                  {ins}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Structure</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {STRUCTURES.map(s => (
                <button key={s.key} onClick={() => { setStructure(s.key); setLegs(['', '', '', '']); setResult(null); }} style={{
                  padding: '8px 16px', borderRadius: 8,
                  border: `1px solid ${structure === s.key ? accentColor : 'var(--content-border)'}`,
                  background: structure === s.key ? 'rgba(240,192,64,0.1)' : 'white',
                  color: structure === s.key ? accentColor : 'var(--text-secondary)',
                  fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: structure === s.key ? 700 : 400,
                  cursor: 'pointer',
                }}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Leg selectors */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
            Select {numLegs} Contract Month{numLegs > 1 ? 's' : ''}
            {numLegs > 1 && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> — in order (front to back)</span>}
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            {Array.from({ length: numLegs }).map((_, i) => (
              <React.Fragment key={i}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>
                    {i === 0 ? 'Front' : i === numLegs - 1 ? 'Back' : `Leg ${i + 1}`}
                  </div>
                  <select
                    className="styled-select"
                    value={legs[i]}
                    onChange={e => updateLeg(i, e.target.value)}
                    style={{ minWidth: 110 }}
                  >
                    <option value="">-- select --</option>
                    {contracts.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                {i < numLegs - 1 && (
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--text-muted)', marginTop: 16 }}>
                    {structure === 'fly' || structure === 'dfly' ? (i === 0 ? '−2×' : '+') : '−'}
                  </div>
                )}
              </React.Fragment>
            ))}

            <button onClick={handleBuild} disabled={loading} style={{
              marginTop: 16,
              display: 'flex', alignItems: 'center', gap: 8,
              background: loading ? '#e5e7eb' : 'var(--sidebar-bg)',
              color: loading ? 'var(--text-muted)' : accentColor,
              border: 'none', borderRadius: 8, padding: '10px 24px',
              fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}>
              {loading ? 'Building...' : 'Build Structure'}
            </button>
          </div>
        </div>

        {/* Structure label */}
        {result && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: 'rgba(240,192,64,0.06)', borderRadius: 8, border: '1px solid rgba(240,192,64,0.2)' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: accentColor, fontWeight: 600 }}>
              {result.instrument} {result.legs.join(result.structure === 'spread' ? ' − ' : result.structure === 'fly' ? ' − 2× ' : ' − 3× ')}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
              {result.is_outright ? 'price' : 'bps'}
            </span>
          </div>
        )}
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '14px 20px', marginBottom: 20, fontFamily: 'var(--font-mono)', fontSize: 13, color: '#ef4444' }}>
          {error}
        </div>
      )}

      {/* Stats */}
      {result && (
        <>
          <div className="stat-row" style={{ marginBottom: 24 }}>
            {[{ label: 'Latest', value: fmt(latest) }, { label: 'High', value: fmt(max) }, { label: 'Low', value: fmt(min) }, { label: 'Average', value: fmt(avg) }].map(s => (
              <div className="stat-chip" key={s.label} style={{ borderTop: `3px solid ${accentColor}` }}>
                <div className="stat-chip-label">{s.label}</div>
                <div className="stat-chip-value" style={{ fontSize: 18, color: accentColor }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Event filter */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {INDICATORS.map(ind => (
              <button key={ind} onClick={() => setEventFilter(ind)} style={{
                padding: '5px 14px', borderRadius: 20,
                border: `1px solid ${eventFilter === ind ? accentColor : 'var(--content-border)'}`,
                background: eventFilter === ind ? 'rgba(240,192,64,0.1)' : 'white',
                color: eventFilter === ind ? accentColor : 'var(--text-secondary)',
                fontFamily: 'var(--font-mono)', fontSize: 11, cursor: 'pointer',
              }}>{ind}</button>
            ))}
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', alignSelf: 'center', marginLeft: 4 }}>
              — filter event markers on chart
            </span>
          </div>

          {/* Chart */}
          <div className="card">
            <div className="card-title">
              {result.instrument} {result.structure} — {result.legs.join(' / ')}
            </div>
            <div className="card-sub">
              {result.is_outright ? 'Price (100 − rate)' : 'Spread in basis points (bps)'} · {result.data.length} data points
            </div>

            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={result.data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
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
                  tickFormatter={v => result.is_outright ? v.toFixed(2) : `${v.toFixed(0)}bp`}
                  axisLine={false} tickLine={false} width={65}
                />
                <Tooltip content={<CustomTooltip isOutright={result.is_outright} />} />
                {!result.is_outright && (
                  <ReferenceLine y={0} stroke="#d1d5db" strokeDasharray="3 3" strokeWidth={1} />
                )}
                {filteredEvents.map((ev, i) => (
                  <ReferenceLine
                    key={i}
                    x={ev.date}
                    stroke={
                      ev.indicator.includes('CPI') ? '#3b82f6' :
                      ev.indicator.includes('NFP') ? '#22c55e' :
                      ev.indicator.includes('GDP') ? '#ef4444' :
                      ev.indicator.includes('FOMC') ? '#f97316' : '#94a3b8'
                    }
                    strokeOpacity={0.5}
                    strokeWidth={1}
                    strokeDasharray="2 4"
                  />
                ))}
                <Line
                  type="monotone" dataKey="value"
                  stroke={accentColor} dot={false} strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>

            {/* Event legend */}
            <div style={{ display: 'flex', gap: 16, marginTop: 16, flexWrap: 'wrap' }}>
              {[
                { label: 'CPI', color: '#3b82f6' },
                { label: 'NFP', color: '#22c55e' },
                { label: 'GDP', color: '#ef4444' },
                { label: 'FOMC', color: '#f97316' },
              ].map(l => (
                <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 16, height: 2, background: l.color, opacity: 0.6 }} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>{l.label}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
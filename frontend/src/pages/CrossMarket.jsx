import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { getEvents } from '../api';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000/api';

const INDICATORS = ['CPI', 'CORE_CPI', 'NFP', 'UNEMPLOYMENT', 'GDP', 'PCE', 'FOMC'];

const INDICATOR_META = {
  CPI:          { label: 'CPI',          color: '#3b82f6' },
  CORE_CPI:     { label: 'Core CPI',     color: '#8b5cf6' },
  NFP:          { label: 'NFP',          color: '#22c55e' },
  UNEMPLOYMENT: { label: 'Unemployment', color: '#f0c040' },
  GDP:          { label: 'GDP',          color: '#ef4444' },
  PCE:          { label: 'PCE',          color: '#06b6d4' },
  FOMC:         { label: 'FOMC',         color: '#f97316' },
};

const MARKET_META = {
  CL:    { label: 'WTI Crude',    color: '#ef4444', unit: '$' },
  BZ:    { label: 'Brent Crude',  color: '#f97316', unit: '$' },
  GC:    { label: 'Gold',         color: '#f0c040', unit: '$' },
  DXY:   { label: 'USD Index',    color: '#3b82f6', unit: '' },
  NG:    { label: 'Nat Gas',      color: '#22c55e', unit: '$' },
  SOFR:  { label: 'SOFR 90D',     color: '#8b5cf6', unit: '%' },
  SONIA: { label: 'SONIA',        color: '#06b6d4', unit: '%' },
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#0f1117', border: '1px solid #1e2130', borderRadius: 8, padding: '10px 14px' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#8892a4', marginBottom: 6 }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: p.color }}>
          {p.value?.toFixed(3)}
        </div>
      ))}
    </div>
  );
};

function MarketMiniChart({ market, data, eventDate, color, label, unit, pctChange }) {
  const isPositive = pctChange > 0;
  const isNegative = pctChange < 0;

  return (
    <div style={{
      background: 'white', border: '1px solid var(--content-border)',
      borderRadius: 12, padding: '16px 20px',
      borderTop: `3px solid ${color}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            {data.length > 0 ? `${data[0]?.price?.toFixed(2)} → ${data[data.length-1]?.price?.toFixed(2)}` : '—'}
          </div>
        </div>
        {pctChange !== null && (
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700,
            color: isPositive ? 'var(--accent-green)' : isNegative ? 'var(--accent-red)' : 'var(--text-muted)',
            background: isPositive ? 'rgba(34,197,94,0.08)' : isNegative ? 'rgba(239,68,68,0.08)' : 'transparent',
            padding: '3px 8px', borderRadius: 6,
          }}>
            {pctChange > 0 ? '+' : ''}{pctChange?.toFixed(3)}%
          </div>
        )}
      </div>

      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height={90}>
          <LineChart data={data} margin={{ top: 2, right: 4, bottom: 2, left: 0 }}>
            <XAxis dataKey="date" hide />
            <YAxis domain={['auto', 'auto']} hide />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine x={eventDate} stroke="#f0c040" strokeDasharray="3 3" strokeWidth={1.5} />
            <Line type="monotone" dataKey="price" stroke={color} dot={false} strokeWidth={1.5} />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div style={{ height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
          No data
        </div>
      )}
    </div>
  );
}

export default function CrossMarket() {
  const [indicator, setIndicator]   = useState('CPI');
  const [eventList, setEventList]   = useState([]);
  const [selectedDate, setDate]     = useState('');
  const [window_, setWindow]        = useState(5);
  const [result, setResult]         = useState(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);

  useEffect(() => {
    if (indicator === 'FOMC') {
      axios.get(`${API}/fomc`).then(r => {
        const evs = r.data.events;
        setEventList(evs.map(e => ({ date: e.date, value: e.change_bps, mom_change: e.change_bps })));
        if (evs.length > 0) setDate(evs[0].date);
        setResult(null);
      }).catch(e => console.error('FOMC fetch error:', e));
    } else {
      getEvents(indicator).then(r => {
        const evs = r.data.events.filter(e => e.value !== null);
        setEventList(evs);
        if (evs.length > 0) setDate(evs[0].date);
        setResult(null);
      }).catch(e => console.error('Events fetch error:', e));
    }
  }, [indicator]);

  const handleAnalyze = async () => {
    if (!selectedDate) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await axios.get(`${API}/cross-market`, {
        params: { indicator, date: selectedDate, window: window_ }
      });
      setResult(res.data);
    } catch (e) {
      setError('Failed to load cross-market data. Try a different event or window.');
    }
    setLoading(false);
  };

  const meta = INDICATOR_META[indicator] || { label: indicator, color: '#999' };

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-label">Multi-Asset Analysis</div>
        <h1 className="page-title">Cross Market Reaction</h1>
        <p className="page-subtitle">
          See how CL, BZ, Gold, DXY, SOFR and SONIA all moved around the same macro event — in one view.
        </p>
      </div>

      {/* Controls */}
      <div style={{
        background: 'white', border: '1px solid var(--content-border)',
        borderRadius: 12, padding: '20px 24px', marginBottom: 24,
        display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Indicator</label>
          <select className="styled-select" value={indicator} onChange={e => setIndicator(e.target.value)}>
            {INDICATORS.map(i => <option key={i} value={i}>{INDICATOR_META[i]?.label || i}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Release Date</label>
          <select className="styled-select" value={selectedDate} onChange={e => setDate(e.target.value)}>
            {eventList.map(ev => <option key={ev.date} value={ev.date}>{ev.date}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Window</label>
          <select className="styled-select" value={window_} onChange={e => setWindow(Number(e.target.value))}>
            {[3, 5, 7, 10].map(w => <option key={w} value={w}>±{w} days</option>)}
          </select>
        </div>

        <button onClick={handleAnalyze} disabled={loading} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: loading ? '#e5e7eb' : 'var(--sidebar-bg)',
          color: loading ? 'var(--text-muted)' : 'var(--accent-gold)',
          border: 'none', borderRadius: 8, padding: '10px 24px',
          fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600,
          cursor: loading ? 'not-allowed' : 'pointer',
        }}>
          {loading ? 'Analyzing...' : 'Analyze'}
        </button>

        {result && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 24, background: 'var(--content-bg)', borderRadius: 8, padding: '12px 20px' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Event</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: meta.color }}>{meta.label}</div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Date</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700 }}>{result.event.date}</div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>MoM Δ</div>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700,
                color: result.event.mom_change > 0 ? 'var(--accent-green)' : 'var(--accent-red)',
              }}>
                {result.event.mom_change > 0 ? '+' : ''}{result.event.mom_change?.toFixed(3)}
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '16px 20px', marginBottom: 24, fontFamily: 'var(--font-mono)', fontSize: 13, color: '#ef4444' }}>
          {error}
        </div>
      )}

      {loading && (
        <div style={{ background: 'white', border: '1px solid var(--content-border)', borderRadius: 12, padding: '48px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid var(--content-border)', borderTopColor: 'var(--accent-gold)', animation: 'spin 0.8s linear infinite' }} />
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-muted)' }}>Fetching all markets...</div>
        </div>
      )}

      {result && !loading && (
        <>
          {/* Summary table */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-title">Market Impact Summary</div>
            <div className="card-sub">% change from {window_} days before to {window_} days after event</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
              {Object.entries(result.summary).map(([market, pct]) => {
                const m = MARKET_META[market] || { label: market, color: '#999' };
                return (
                  <div key={market} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    background: 'var(--content-bg)', borderRadius: 8, padding: '10px 16px',
                    minWidth: 90,
                  }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: m.color, textTransform: 'uppercase', marginBottom: 4 }}>{m.label}</div>
                    <div style={{
                      fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700,
                      color: pct > 0 ? 'var(--accent-green)' : pct < 0 ? 'var(--accent-red)' : 'var(--text-muted)',
                    }}>
                      {pct > 0 ? '+' : ''}{pct?.toFixed(3)}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mini charts grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {Object.entries(result.markets).map(([market, data]) => {
              const m = MARKET_META[market] || { label: market, color: '#999', unit: '' };
              const pct = result.summary[market] ?? null;
              return (
                <MarketMiniChart
                  key={market}
                  market={market}
                  data={data}
                  eventDate={result.event.date}
                  color={m.color}
                  label={m.label}
                  unit={m.unit}
                  pctChange={pct}
                />
              );
            })}
          </div>
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
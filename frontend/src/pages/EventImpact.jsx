import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Legend } from 'recharts';
import { getEvents, getEventImpact } from '../api';
import { Zap } from 'lucide-react';

const INDICATORS = ['CPI', 'CORE_CPI', 'NFP', 'UNEMPLOYMENT', 'GDP', 'PCE'];

const INDICATOR_META = {
  CPI:          { label: 'CPI',          color: '#3b82f6' },
  CORE_CPI:     { label: 'Core CPI',     color: '#8b5cf6' },
  NFP:          { label: 'NFP',          color: '#22c55e' },
  UNEMPLOYMENT: { label: 'Unemployment', color: '#f0c040' },
  GDP:          { label: 'GDP',          color: '#ef4444' },
  PCE:          { label: 'PCE',          color: '#06b6d4' },
};

const MATURITIES = [
  { key: 'overnight', label: 'Overnight', color: '#3b82f6' },
  { key: '30d_avg',   label: '30D Avg',   color: '#f0c040' },
  { key: '90d_avg',   label: '90D Avg',   color: '#22c55e' },
  { key: '180d_avg',  label: '180D Avg',  color: '#ef4444' },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#0f1117', border: '1px solid #1e2130',
      borderRadius: 8, padding: '12px 16px', minWidth: 200,
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

export default function EventImpact() {
  const [indicator, setIndicator] = useState('CPI');
  const [eventList, setEventList] = useState([]);
  const [selectedDate, setDate]   = useState('');
  const [impactData, setImpact]   = useState(null);
  const [loading, setLoading]     = useState(false);
  const [window_, setWindow]      = useState(5);

  // Load event dates when indicator changes
  useEffect(() => {
    getEvents(indicator).then(r => {
      const evs = r.data.events.filter(e => e.value !== null);
      setEventList(evs);
      if (evs.length > 0) setDate(evs[0].date);
    });
  }, [indicator]);

  // Load impact data when date changes
  useEffect(() => {
    if (!selectedDate) return;
    setLoading(true);
    setImpact(null);
    getEventImpact(indicator, selectedDate, window_)
      .then(r => { setImpact(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [indicator, selectedDate, window_]);

  // Build chart data — one row per date in the window
  const chartData = impactData
    ? Object.entries(impactData.curve_window)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, curve]) => ({ date, ...curve }))
    : [];

  const event = impactData?.event;

  // Compute rate change for each maturity around event
  const rateChanges = impactData && chartData.length >= 2
    ? MATURITIES.map(m => {
        const before = chartData[0][m.key];
        const after  = chartData[chartData.length - 1][m.key];
        const diff   = (after && before) ? (after - before).toFixed(4) : null;
        return { ...m, before, after, diff };
      })
    : [];

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-label">Impact Analysis</div>
        <h1 className="page-title">Event Impact Analyzer</h1>
        <p className="page-subtitle">
          Select a macro release and see how the SOFR curve shifted in the days around it.
        </p>
      </div>

      {/* Controls */}
      <div style={{
        display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap',
        background: 'white', border: '1px solid var(--content-border)',
        borderRadius: 12, padding: '20px 24px', alignItems: 'flex-end',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Indicator
          </label>
          <select className="styled-select" value={indicator} onChange={e => setIndicator(e.target.value)}>
            {INDICATORS.map(i => (
              <option key={i} value={i}>{INDICATOR_META[i].label}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Release Date
          </label>
          <select className="styled-select" value={selectedDate} onChange={e => setDate(e.target.value)}>
            {eventList.map(ev => (
              <option key={ev.date} value={ev.date}>{ev.date}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Window (days)
          </label>
          <select className="styled-select" value={window_} onChange={e => setWindow(Number(e.target.value))}>
            {[3, 5, 7, 10].map(w => <option key={w} value={w}>±{w} days</option>)}
          </select>
        </div>

        {event && (
          <div style={{
            marginLeft: 'auto', display: 'flex', gap: 24,
            background: 'var(--content-bg)', borderRadius: 8, padding: '12px 20px',
          }}>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Release</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600, color: INDICATOR_META[indicator].color }}>
                {event.indicator}
              </div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Date</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600 }}>{event.date}</div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>MoM Δ</div>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600,
                color: event.mom_change > 0 ? 'var(--accent-green)' : event.mom_change < 0 ? 'var(--accent-red)' : 'var(--text-primary)',
              }}>
                {event.mom_change > 0 ? '+' : ''}{event.mom_change?.toFixed(3)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Rate change chips */}
      {rateChanges.length > 0 && (
        <div className="stat-row" style={{ marginBottom: 24 }}>
          {rateChanges.map(m => (
            <div className="stat-chip" key={m.key} style={{ borderTop: `3px solid ${m.color}` }}>
              <div className="stat-chip-label">{m.label}</div>
              <div className="stat-chip-value" style={{
                fontSize: 18,
                color: m.diff > 0 ? 'var(--accent-red)' : m.diff < 0 ? 'var(--accent-green)' : 'var(--text-muted)',
              }}>
                {m.diff !== null ? `${m.diff > 0 ? '+' : ''}${m.diff}%` : '—'}
              </div>
              <div className="stat-chip-change" style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                {m.before?.toFixed(3)} → {m.after?.toFixed(3)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div className="card-title">SOFR Curve Movement</div>
            <div className="card-sub">
              {event ? `${window_} days before and after ${event.date}` : 'Select an event above'}
            </div>
          </div>
          {event && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(240,192,64,0.1)', border: '1px solid rgba(240,192,64,0.2)',
              borderRadius: 6, padding: '6px 12px',
            }}>
              <Zap size={12} color="#f0c040" />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#f0c040' }}>
                Event: {event.date}
              </span>
            </div>
          )}
        </div>

        {loading && <div className="loading">Analyzing event impact...</div>}

        {!loading && chartData.length > 0 && (
          <ResponsiveContainer width="100%" height={360}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontFamily: 'IBM Plex Mono', fontSize: 10 }}
                axisLine={false} tickLine={false}
              />
              <YAxis
                domain={['auto', 'auto']}
                tick={{ fontFamily: 'IBM Plex Mono', fontSize: 11 }}
                tickFormatter={v => `${v.toFixed(2)}%`}
                axisLine={false} tickLine={false} width={60}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontFamily: 'IBM Plex Mono', fontSize: 11, paddingTop: 16 }}
              />
              {/* Vertical line marking the event date */}
              <ReferenceLine
                x={event?.date}
                stroke="#f0c040"
                strokeDasharray="4 4"
                strokeWidth={2}
                label={{ value: 'Event', fill: '#f0c040', fontSize: 11, fontFamily: 'IBM Plex Mono' }}
              />
              {MATURITIES.map(m => (
                <Line
                  key={m.key}
                  type="monotone"
                  dataKey={m.key}
                  name={m.label}
                  stroke={m.color}
                  dot={false}
                  strokeWidth={2}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}

        {!loading && chartData.length === 0 && selectedDate && (
          <div className="loading" style={{ flexDirection: 'column', gap: 8 }}>
            <span>No curve data available around this date.</span>
            <span style={{ fontSize: 11 }}>Try a different event or wider window.</span>
          </div>
        )}
      </div>
    </div>
  );
}
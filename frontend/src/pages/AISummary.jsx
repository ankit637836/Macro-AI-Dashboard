import React, { useEffect, useState } from 'react';
import { getEvents } from '../api';
import { Brain, Sparkles, TrendingUp, TrendingDown } from 'lucide-react';
import axios from 'axios';

const INDICATORS = ['CPI', 'CORE_CPI', 'NFP', 'UNEMPLOYMENT', 'GDP', 'PCE'];
const INDICATOR_META = {
  CPI:          { label: 'CPI',          color: '#3b82f6' },
  CORE_CPI:     { label: 'Core CPI',     color: '#8b5cf6' },
  NFP:          { label: 'NFP',          color: '#22c55e' },
  UNEMPLOYMENT: { label: 'Unemployment', color: '#f0c040' },
  GDP:          { label: 'GDP',          color: '#ef4444' },
  PCE:          { label: 'PCE',          color: '#06b6d4' },
};

export default function AISummary() {
  const [indicator, setIndicator] = useState('CPI');
  const [eventList, setEventList] = useState([]);
  const [selectedDate, setDate]   = useState('');
  const [result, setResult]       = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);

  useEffect(() => {
    getEvents(indicator).then(r => {
      const evs = r.data.events.filter(e => e.value !== null);
      setEventList(evs);
      if (evs.length > 0) setDate(evs[0].date);
      setResult(null);
    });
  }, [indicator]);

  const handleGenerate = async () => {
    if (!selectedDate) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await axios.get('http://127.0.0.1:8000/api/ai-summary', {
        params: { indicator, date: selectedDate }
      });
      setResult(res.data);
    } catch (e) {
      setError('Failed to generate summary. Check your OpenAI API key or try a different event.');
    }
    setLoading(false);
  };

  const meta = INDICATOR_META[indicator];

  const curveDiff = result
    ? Object.keys(result.curve_after).map(mat => ({
        mat,
        before: result.curve_before[mat],
        after:  result.curve_after[mat],
        diff:   result.curve_after[mat] && result.curve_before[mat]
                  ? ((result.curve_after[mat] - result.curve_before[mat]) * 100).toFixed(1)
                  : null,
      }))
    : [];

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-label">Powered by Google Gemini</div>
        <h1 className="page-title">AI Insight</h1>
        <p className="page-subtitle">
          Select any macro release and get an AI-generated analyst note explaining
          what happened to SOFR rates and what it means for the Fed rate path.
        </p>
      </div>

      {/* Controls */}
      <div style={{
        background: 'white', border: '1px solid var(--content-border)',
        borderRadius: 12, padding: '24px', marginBottom: 24,
        display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Indicator
          </label>
          <select className="styled-select" value={indicator} onChange={e => setIndicator(e.target.value)}>
            {INDICATORS.map(i => <option key={i} value={i}>{INDICATOR_META[i].label}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Release Date
          </label>
          <select className="styled-select" value={selectedDate} onChange={e => setDate(e.target.value)}>
            {eventList.map(ev => <option key={ev.date} value={ev.date}>{ev.date}</option>)}
          </select>
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: loading ? '#e5e7eb' : 'var(--sidebar-bg)',
            color: loading ? 'var(--text-muted)' : 'var(--accent-gold)',
            border: 'none', borderRadius: 8,
            padding: '10px 24px',
            fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s',
          }}
        >
          <Brain size={16} />
          {loading ? 'Generating...' : 'Generate AI Analysis'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca',
          borderRadius: 10, padding: '16px 20px', marginBottom: 24,
          fontFamily: 'var(--font-mono)', fontSize: 13, color: '#ef4444',
        }}>
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div style={{
          background: 'white', border: '1px solid var(--content-border)',
          borderRadius: 12, padding: '48px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            border: '3px solid var(--content-border)',
            borderTopColor: 'var(--accent-gold)',
            animation: 'spin 0.8s linear infinite',
          }} />
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-muted)' }}>
            Analyzing {indicator} release on {selectedDate}...
          </div>
        </div>
      )}

      {/* Result */}
      {result && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Event header */}
          <div style={{
            background: 'var(--sidebar-bg)',
            borderRadius: 12, padding: '20px 24px',
            display: 'flex', gap: 32, flexWrap: 'wrap',
          }}>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#3d4659', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Indicator</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color: meta.color, marginTop: 4 }}>{meta.label}</div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#3d4659', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Date</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color: '#fff', marginTop: 4 }}>{result.event.date}</div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#3d4659', textTransform: 'uppercase', letterSpacing: '0.08em' }}>MoM Change</div>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, marginTop: 4,
                color: result.event.mom_change > 0 ? 'var(--accent-green)' : 'var(--accent-red)',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                {result.event.mom_change > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                {result.event.mom_change > 0 ? '+' : ''}{result.event.mom_change?.toFixed(3)}
              </div>
            </div>

            {/* Curve diffs */}
            {curveDiff.map(c => (
              <div key={c.mat}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#3d4659', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{c.mat}</div>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 700, marginTop: 4,
                  color: c.diff > 0 ? 'var(--accent-red)' : c.diff < 0 ? 'var(--accent-green)' : '#fff',
                }}>
                  {c.diff !== null ? `${c.diff > 0 ? '+' : ''}${c.diff} bps` : '—'}
                </div>
              </div>
            ))}
          </div>

          {/* AI Summary text */}
          <div style={{
            background: 'white', border: '1px solid var(--content-border)',
            borderRadius: 12, padding: '28px 32px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'rgba(240,192,64,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Sparkles size={16} color="var(--accent-gold)" />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>AI Analyst Note</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>Generated by Gemini</div>
              </div>
            </div>

            <div style={{
              fontFamily: 'var(--font-body)', fontSize: 14.5,
              color: 'var(--text-primary)', lineHeight: 1.8,
              whiteSpace: 'pre-wrap',
            }}>
              {result.summary}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
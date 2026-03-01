import React, { useEffect, useState } from 'react';
import { getEvents } from '../api';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const INDICATORS = ['ALL', 'CPI', 'CORE_CPI', 'NFP', 'UNEMPLOYMENT', 'GDP', 'PCE'];

const INDICATOR_META = {
  CPI:          { label: 'CPI',          color: '#3b82f6', unit: 'index' },
  CORE_CPI:     { label: 'Core CPI',     color: '#8b5cf6', unit: 'index' },
  NFP:          { label: 'NFP',          color: '#22c55e', unit: 'K jobs' },
  UNEMPLOYMENT: { label: 'Unemployment', color: '#f0c040', unit: '%' },
  GDP:          { label: 'GDP',          color: '#ef4444', unit: '$B' },
  PCE:          { label: 'PCE',          color: '#06b6d4', unit: '$B' },
};

function formatValue(indicator, value) {
  if (value === null || value === undefined) return '—';
  if (indicator === 'NFP') return `${(value / 1000).toFixed(0)}K`;
  if (indicator === 'UNEMPLOYMENT') return `${value.toFixed(1)}%`;
  if (indicator === 'GDP') return `$${(value / 1000).toFixed(1)}T`;
  return value.toFixed(2);
}

function formatChange(indicator, change) {
  if (change === null || change === undefined) return null;
  if (indicator === 'NFP') return `${change > 0 ? '+' : ''}${(change / 1).toFixed(0)}K`;
  if (indicator === 'UNEMPLOYMENT') return `${change > 0 ? '+' : ''}${change.toFixed(1)}pp`;
  return `${change > 0 ? '+' : ''}${change.toFixed(3)}`;
}

export default function EventsTimeline() {
  const [events, setEvents]   = useState([]);
  const [filter, setFilter]   = useState('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const ind = filter === 'ALL' ? null : filter;
    getEvents(ind).then(r => {
      setEvents(r.data.events);
      setLoading(false);
    }).catch(console.error);
  }, [filter]);

  // Group events by year-month for the timeline
  const grouped = events.reduce((acc, ev) => {
    const ym = ev.date.slice(0, 7);
    if (!acc[ym]) acc[ym] = [];
    acc[ym].push(ev);
    return acc;
  }, {});

  const sortedMonths = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-label">Economic Calendar</div>
        <h1 className="page-title">Macro Events</h1>
        <p className="page-subtitle">
          All major economic releases since 2022 — CPI, NFP, GDP, PCE and more.
          Click any event to analyze its impact on SOFR.
        </p>
      </div>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 32, flexWrap: 'wrap' }}>
        {INDICATORS.map(ind => {
          const meta = INDICATOR_META[ind];
          const active = filter === ind;
          return (
            <button key={ind} onClick={() => setFilter(ind)} style={{
              padding: '7px 16px',
              borderRadius: 20,
              border: `1px solid ${active ? (meta?.color || 'var(--accent-gold)') : 'var(--content-border)'}`,
              background: active ? (meta ? `${meta.color}15` : 'rgba(240,192,64,0.1)') : 'white',
              color: active ? (meta?.color || 'var(--accent-gold)') : 'var(--text-secondary)',
              fontFamily: 'var(--font-mono)', fontSize: 12,
              cursor: 'pointer', fontWeight: active ? 600 : 400,
              transition: 'all 0.15s',
            }}>
              {meta?.label || 'All'}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="loading">Loading events...</div>
      ) : (
        <div>
          {sortedMonths.map(ym => (
            <div key={ym} style={{ marginBottom: 32 }}>
              {/* Month header */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                marginBottom: 12,
              }}>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 12,
                  color: 'var(--text-muted)', textTransform: 'uppercase',
                  letterSpacing: '0.08em', whiteSpace: 'nowrap',
                }}>
                  {new Date(ym + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </div>
                <div style={{ flex: 1, height: 1, background: 'var(--content-border)' }} />
              </div>

              {/* Events in this month */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {grouped[ym].map((ev, i) => {
                  const meta = INDICATOR_META[ev.indicator] || { color: '#999', label: ev.indicator };
                  const change = ev.mom_change;
                  const isUp   = change > 0;
                  const isNeutral = change === 0 || change === null;

                  return (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center',
                      background: 'white',
                      border: '1px solid var(--content-border)',
                      borderLeft: `4px solid ${meta.color}`,
                      borderRadius: '0 10px 10px 0',
                      padding: '14px 20px',
                      gap: 16,
                    }}>
                      {/* Date */}
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)', minWidth: 90 }}>
                        {ev.date}
                      </div>

                      {/* Indicator badge */}
                      <div style={{
                        fontFamily: 'var(--font-mono)', fontSize: 11,
                        background: `${meta.color}15`, color: meta.color,
                        padding: '3px 10px', borderRadius: 4,
                        textTransform: 'uppercase', letterSpacing: '0.06em',
                        minWidth: 110, textAlign: 'center',
                      }}>
                        {meta.label}
                      </div>

                      {/* Value */}
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', minWidth: 80 }}>
                        {formatValue(ev.indicator, ev.value)}
                      </div>

                      {/* Change */}
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500,
                        color: isNeutral ? 'var(--text-muted)' : isUp ? 'var(--accent-green)' : 'var(--accent-red)',
                        minWidth: 90,
                      }}>
                        {isNeutral ? <Minus size={13} /> : isUp ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                        {formatChange(ev.indicator, change) || '—'}
                      </div>

                      {/* MoM % */}
                      {ev.pct_change !== null && (
                        <div style={{
                          fontFamily: 'var(--font-mono)', fontSize: 12,
                          color: 'var(--text-muted)',
                        }}>
                          {ev.pct_change > 0 ? '+' : ''}{ev.pct_change?.toFixed(3)}%
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
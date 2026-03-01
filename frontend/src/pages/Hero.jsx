import React from 'react';
import { TrendingUp, Calendar, Zap, BarChart2, Brain, ArrowRight } from 'lucide-react';

const FEATURES = [
  {
    id: 'curve',
    icon: TrendingUp,
    title: 'SOFR Curve',
    desc: 'Live Term SOFR rates across maturities. Visualize the forward curve shape and how it shifts over time.',
    tag: 'Live Data',
    color: '#3b82f6',
  },
  {
    id: 'events',
    icon: Calendar,
    title: 'Macro Events',
    desc: 'Complete timeline of CPI, NFP, GDP and PCE releases with month-over-month changes since 2022.',
    tag: '6 Indicators',
    color: '#8b5cf6',
  },
  {
    id: 'impact',
    icon: Zap,
    title: 'Event Impact',
    desc: 'Select any macro release and see exactly how the SOFR curve moved in the days before and after.',
    tag: 'Before / After',
    color: '#f0c040',
  },
  {
    id: 'contracts',
    icon: BarChart2,
    title: 'Contract Analysis',
    desc: 'Track outrights, calendar spreads, butterflies and double butterflies across the rate curve.',
    tag: '10+ Structures',
    color: '#22c55e',
  },
  {
    id: 'ai',
    icon: Brain,
    title: 'AI Insight',
    desc: 'Pick any macro event and get a plain-English AI summary of what happened to rates and why it matters.',
    tag: 'Powered by Gemini',
    color: '#ef4444',
  },
];

const STATS = [
  { label: 'Data From',    value: '2022' },
  { label: 'Indicators',   value: '6' },
  { label: 'Data Source',  value: 'FRED' },
  { label: 'AI Powered',   value: 'Yes' },
];

export default function Hero({ onNavigate }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--content-bg)' }}>

      {/* ── Hero Banner ── */}
      <div style={{
        background: 'var(--sidebar-bg)',
        padding: '64px 48px 56px',
        position: 'relative',
        overflow: 'hidden',
        borderBottom: '1px solid #1e2130',
      }}>
        {/* background grid texture */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(240,192,64,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(240,192,64,0.03) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', maxWidth: 720 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(240,192,64,0.1)',
            border: '1px solid rgba(240,192,64,0.2)',
            borderRadius: 20, padding: '4px 14px',
            marginBottom: 24,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#f0c040', animation: 'pulse 2s infinite' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#f0c040', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Live · FRED Data
            </span>
          </div>

          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 52,
            color: '#ffffff',
            lineHeight: 1.1,
            marginBottom: 20,
          }}>
            Macro Intelligence<br />
            <span style={{ color: 'var(--accent-gold)' }}>for Rate Markets</span>
          </h1>

          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: 16,
            color: '#8892a4',
            lineHeight: 1.7,
            maxWidth: 560,
            marginBottom: 36,
          }}>
            Visualize how CPI, NFP, and GDP releases move the SOFR forward curve.
            Analyze spreads, butterflies, and outrights — with AI-generated commentary
            on every macro event.
          </p>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button
              onClick={() => onNavigate('curve')}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'var(--accent-gold)',
                color: 'var(--sidebar-bg)',
                border: 'none', borderRadius: 8,
                padding: '12px 24px',
                fontFamily: 'var(--font-body)',
                fontSize: 14, fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              View SOFR Curve <ArrowRight size={16} />
            </button>
            <button
              onClick={() => onNavigate('ai')}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'transparent',
                color: '#fff',
                border: '1px solid #2a3040',
                borderRadius: 8,
                padding: '12px 24px',
                fontFamily: 'var(--font-body)',
                fontSize: 14, fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Try AI Insight <Brain size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Stats Bar ── */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--content-border)',
        background: 'white',
      }}>
        {STATS.map((s, i) => (
          <div key={i} style={{
            flex: 1, padding: '20px 32px',
            borderRight: i < STATS.length - 1 ? '1px solid var(--content-border)' : 'none',
          }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {s.label}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 600, color: 'var(--text-primary)', marginTop: 4 }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* ── Feature Cards ── */}
      <div style={{ padding: '48px 48px 64px' }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
            What's inside
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--text-primary)' }}>
            Five powerful modules
          </h2>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 16,
        }}>
          {FEATURES.map(({ id, icon: Icon, title, desc, tag, color }) => (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              style={{
                background: 'white',
                border: '1px solid var(--content-border)',
                borderRadius: 12,
                padding: '24px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'box-shadow 0.2s, transform 0.2s',
                display: 'flex', flexDirection: 'column', gap: 12,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'none';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: `${color}15`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={18} color={color} />
                </div>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 10,
                  background: `${color}12`,
                  color: color,
                  padding: '3px 8px', borderRadius: 4,
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>
                  {tag}
                </span>
              </div>

              <div>
                <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)', marginBottom: 6 }}>
                  {title}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {desc}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: color, fontSize: 12, fontWeight: 500, marginTop: 'auto' }}>
                Open <ArrowRight size={12} />
              </div>
            </button>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
import React, { useState } from 'react';
import { BarChart2, TrendingUp, Calendar, Zap, Brain, Home } from 'lucide-react';
import Hero from './pages/Hero';
import SofrCurve from './pages/SofrCurve';
import EventsTimeline from './pages/EventsTimeline';
import EventImpact from './pages/EventImpact';
import ContractAnalysis from './pages/ContractAnalysis';
import AISummary from './pages/AISummary';
import './App.css';

const NAV = [
  { id: 'hero',      label: 'Overview',         icon: Home },
  { id: 'curve',     label: 'SOFR Curve',        icon: TrendingUp },
  { id: 'events',    label: 'Macro Events',      icon: Calendar },
  { id: 'impact',    label: 'Event Impact',      icon: Zap },
  { id: 'contracts', label: 'Contract Analysis', icon: BarChart2 },
  { id: 'ai',        label: 'AI Insight',        icon: Brain },
];

export default function App() {
  const [page, setPage] = useState('hero');

  const renderPage = () => {
    switch (page) {
      case 'hero':      return <Hero onNavigate={setPage} />;
      case 'curve':     return <SofrCurve />;
      case 'events':    return <EventsTimeline onSelectEvent={(ind, date) => { setPage('impact'); }} />;
      case 'impact':    return <EventImpact />;
      case 'contracts': return <ContractAnalysis />;
      case 'ai':        return <AISummary />;
      default:          return <Hero onNavigate={setPage} />;
    }
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="logo-mark">M</span>
          <div>
            <div className="logo-title">Macro AI</div>
            <div className="logo-sub">SOFR Intelligence</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`nav-item ${page === id ? 'active' : ''}`}
              onClick={() => setPage(id)}
            >
              <Icon size={16} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-footer-label">Data Source</div>
          <div className="sidebar-footer-value">FRED · St. Louis Fed</div>
          <div className="sidebar-footer-label" style={{marginTop: 8}}>Coverage</div>
          <div className="sidebar-footer-value">2022 — Present</div>
        </div>
      </aside>

      <main className="content-area">
        {renderPage()}
      </main>
    </div>
  );
}
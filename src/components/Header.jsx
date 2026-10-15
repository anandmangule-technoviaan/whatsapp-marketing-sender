import React from 'react';
import {
  Send,
  Users,
  FileSpreadsheet,
  BookOpen,
  History,
  ShieldCheck,
  Moon,
  Sun,
  MessageSquare
} from 'lucide-react';

export default function Header({
  activeTab,
  setActiveTab,
  stats,
  darkMode,
  setDarkMode,
  onOpenCompliance
}) {
  const tabs = [
    { id: 'quick', label: 'Quick Send', icon: Send },
    { id: 'campaign', label: 'Campaigns / Bulk', icon: Users, badge: stats.pending > 0 ? stats.pending : null },
    { id: 'contacts', label: 'Contacts & CSV', icon: FileSpreadsheet, badge: stats.totalContacts > 0 ? stats.totalContacts : null },
    { id: 'templates', label: 'Templates', icon: BookOpen },
    { id: 'history', label: 'Activity Logs', icon: History }
  ];

  return (
    <header className="app-header">
      <div className="header-inner">
        {/* Logo and Brand */}
        <div className="brand-group">
          <div className="brand-logo-container">
            <div className="brand-logo-badge">
              <MessageSquare size={22} className="logo-icon" />
            </div>
          </div>
          <div className="brand-text">
            <h1 className="brand-title">
              WhatsApp <span>Marketing Sender</span>
            </h1>
            <p className="brand-tagline">
              Official Click-to-Chat campaign and direct messaging suite
            </p>
          </div>
        </div>

        {/* Global Controls: Compliance guide & Theme switch */}
        <div className="header-meta-actions">
          <button
            type="button"
            className="compliance-trigger-btn"
            onClick={onOpenCompliance}
            title="Privacy and Responsible Marketing Guidelines"
          >
            <ShieldCheck size={16} className="text-emerald-500" />
            <span>Responsible Guidelines</span>
          </button>

          <button
            type="button"
            className="theme-toggle-btn"
            onClick={() => setDarkMode(!darkMode)}
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme"
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <nav className="header-nav-bar" aria-label="Main Navigation">
        <div className="nav-tabs-container">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                className={`nav-tab-button ${isActive ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={17} />
                <span>{tab.label}</span>
                {tab.badge !== null && tab.badge !== undefined && (
                  <span className={`tab-badge ${isActive ? 'tab-badge-active' : ''}`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Real-time stats ticker */}
        <div className="stats-ticker">
          <div className="ticker-item" title="Manually confirmed messages sent">
            <span className="ticker-label">Sent:</span>
            <span className="ticker-val text-emerald-500 font-bold">{stats.completed || 0}</span>
          </div>
          <div className="ticker-divider"></div>
          <div className="ticker-item" title="Contacts ready for campaigns">
            <span className="ticker-label">Contacts:</span>
            <span className="ticker-val text-slate-700">{stats.totalContacts || 0}</span>
          </div>
        </div>
      </nav>
    </header>
  );
}

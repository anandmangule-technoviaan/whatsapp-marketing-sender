import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import QuickSender from './components/QuickSender';
import CampaignManager from './components/CampaignManager';
import ContactImporter from './components/ContactImporter';
import TemplateLibrary from './components/TemplateLibrary';
import CampaignAnalytics from './components/CampaignAnalytics';
import ComplianceModal from './components/ComplianceModal';
import { DEFAULT_TEMPLATES } from './utils/templates';
import './App.css';

// Initial pre-loaded realistic sample contacts for instant out-of-the-box exploration
const INITIAL_SAMPLE_CONTACTS = [
  { id: 'c-1', name: 'Aarav Sharma', phone: '919876543210', rawPhone: '+91 9876543210', company: 'Apex Retail', createdAt: '15/10/2026' },
  { id: 'c-2', name: 'Priya Patel', phone: '919823456789', rawPhone: '+91 9823456789', company: 'Design Studio', createdAt: '15/10/2026' },
  { id: 'c-3', name: 'Rahul Verma', phone: '919712345678', rawPhone: '+91 9712345678', company: 'Verma Logistics', createdAt: '15/10/2026' },
  { id: 'c-4', name: 'Sneha Kulkarni', phone: '919988776655', rawPhone: '+91 9988776655', company: 'Tech Innovators', createdAt: '15/10/2026' },
  { id: 'c-5', name: 'Michael Scott', phone: '15550192834', rawPhone: '+1 555-019-2834', company: 'Dunder Mifflin', createdAt: '15/10/2026' }
];

export default function App() {
  const [activeTab, setActiveTab] = useState('quick');
  const [darkMode, setDarkMode] = useState(() => {
    try {
      return localStorage.getItem('wa_dark_mode') === 'true';
    } catch {
      return false;
    }
  });

  const [contacts, setContacts] = useState(() => {
    try {
      const saved = localStorage.getItem('wa_contacts');
      return saved ? JSON.parse(saved) : INITIAL_SAMPLE_CONTACTS;
    } catch {
      return INITIAL_SAMPLE_CONTACTS;
    }
  });

  const [activityLogs, setActivityLogs] = useState(() => {
    try {
      const saved = localStorage.getItem('wa_activity_logs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [quickSendInitialMsg, setQuickSendInitialMsg] = useState(DEFAULT_TEMPLATES[0].content);
  const [campaignInitialTemplate, setCampaignInitialTemplate] = useState(DEFAULT_TEMPLATES[0].content);
  const [isComplianceOpen, setIsComplianceOpen] = useState(false);

  // Sync contacts to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('wa_contacts', JSON.stringify(contacts));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }, [contacts]);

  // Sync activity logs to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('wa_activity_logs', JSON.stringify(activityLogs));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }, [activityLogs]);

  // Sync dark mode class to document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try {
      localStorage.setItem('wa_dark_mode', String(darkMode));
    } catch {
      // ignore
    }
  }, [darkMode]);

  // Activity logger
  const handleLogActivity = (logItem) => {
    setActivityLogs((prev) => [logItem, ...prev]);
  };

  const handleClearLogs = () => {
    if (window.confirm('Are you sure you want to clear your message activity history?')) {
      setActivityLogs([]);
      try {
        localStorage.removeItem('wa_activity_logs');
      } catch {
        // ignore
      }
    }
  };

  // Navigations from subcomponents
  const handleSelectTemplateForQuickSend = (tmplContent) => {
    setQuickSendInitialMsg(tmplContent);
    setActiveTab('quick');
  };

  const handleSelectTemplateForCampaign = (tmplContent) => {
    setCampaignInitialTemplate(tmplContent);
    setActiveTab('campaign');
  };

  const handleStartCampaignWithContacts = () => {
    setActiveTab('campaign');
  };

  // Stats calculation
  const confirmedCompletedCount = activityLogs.filter(
    (l) => l.status.includes('Completed') || l.status.includes('Sent')
  ).length;

  const stats = {
    totalContacts: contacts.length,
    completed: confirmedCompletedCount,
    pending: 0
  };

  return (
    <div className={`app-shell ${darkMode ? 'dark-theme' : 'light-theme'}`}>
      {/* App Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        stats={stats}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        onOpenCompliance={() => setIsComplianceOpen(true)}
      />

      {/* Main Content Workspace */}
      <main className="main-content-area">
        <div className="content-inner-wrapper">
          {activeTab === 'quick' && (
            <QuickSender
              key={quickSendInitialMsg}
              initialMessage={quickSendInitialMsg}
              onLogActivity={handleLogActivity}
            />
          )}

          {activeTab === 'campaign' && (
            <CampaignManager
              contacts={contacts}
              initialTemplate={campaignInitialTemplate}
              onLogActivity={handleLogActivity}
            />
          )}

          {activeTab === 'contacts' && (
            <ContactImporter
              contacts={contacts}
              setContacts={setContacts}
              onStartCampaignWithContacts={handleStartCampaignWithContacts}
            />
          )}

          {activeTab === 'templates' && (
            <TemplateLibrary
              onSelectTemplate={handleSelectTemplateForQuickSend}
              onSelectForCampaign={handleSelectTemplateForCampaign}
            />
          )}

          {activeTab === 'history' && (
            <CampaignAnalytics
              activityLogs={activityLogs}
              onClearLogs={handleClearLogs}
            />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-content">
          <p className="footer-copyright">
            WhatsApp Marketing Sender • Built with React & Official WhatsApp Click-to-Chat API standard
          </p>
          <div className="footer-links">
            <button
              type="button"
              className="footer-link-btn"
              onClick={() => setIsComplianceOpen(true)}
            >
              Responsible Messaging Guidelines
            </button>
            <span className="footer-dot">•</span>
            <span className="footer-version">v2.0 Production</span>
          </div>
        </div>
      </footer>

      {/* Compliance / Responsible Marketing Modal */}
      <ComplianceModal
        isOpen={isComplianceOpen}
        onClose={() => setIsComplianceOpen(false)}
      />
    </div>
  );
}

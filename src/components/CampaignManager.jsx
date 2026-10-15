import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  CheckCircle2,
  Clock,
  ExternalLink,
  Users,
  AlertCircle,
  RotateCcw,
  SkipForward,
  ChevronRight,
  ChevronLeft,
  CheckCheck,
  ShieldAlert,
  Send,
  Sparkles,
  Download,
  Info,
  ListFilter
} from 'lucide-react';
import confetti from 'canvas-confetti';
import MessagePreview from './MessagePreview';
import { cleanPhoneNumber, validatePhoneNumber, generateWhatsAppUrl, parseMessageWithVariables } from '../utils/whatsapp';
import { DEFAULT_TEMPLATES, OPT_OUT_SNIPPET } from '../utils/templates';
import { COUNTRIES, DEFAULT_COUNTRY } from '../utils/countries';

export default function CampaignManager({
  contacts = [],
  onUpdateStats,
  onLogActivity,
  initialTemplate = null
}) {
  // Campaign Setup State
  const [campaignName, setCampaignName] = useState('Marketing Campaign');
  const [recipientSource, setRecipientSource] = useState(contacts.length > 0 ? 'imported' : 'manual');
  const [rawNumbersText, setRawNumbersText] = useState(
    '+91 9876543210, Rahul Verma\n+91 9823456789, Priya Patel\n+91 9712345678, Sneha Kulkarni'
  );
  const [messageTemplate, setMessageTemplate] = useState(
    initialTemplate || DEFAULT_TEMPLATES[0].content
  );
  const [defaultCountry, setDefaultCountry] = useState(DEFAULT_COUNTRY);
  const [includeOptOut, setIncludeOptOut] = useState(false);

  // Active Campaign State
  const [isCampaignActive, setIsCampaignActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recipients, setRecipients] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [campaignCompleted, setCampaignCompleted] = useState(false);

  // Modals & Confirmation
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [setupError, setSetupError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Update recipient source when contacts change
  useEffect(() => {
    if (contacts.length > 0 && recipientSource === 'manual' && !rawNumbersText) {
      setRecipientSource('imported');
    }
  }, [contacts]);

  // Parse recipients from raw text or imported contacts
  const parseRecipients = () => {
    const list = [];
    const seenPhones = new Set();

    if (recipientSource === 'imported') {
      contacts.forEach((c, idx) => {
        const val = validatePhoneNumber(c.phone || c.mobile, defaultCountry.dialCode);
        if (val.isValid && !seenPhones.has(val.cleaned)) {
          seenPhones.add(val.cleaned);
          list.push({
            id: `rec-${idx}-${Date.now()}`,
            name: c.name || `Contact ${idx + 1}`,
            phone: val.cleaned,
            rawPhone: c.phone || c.mobile,
            company: c.company || '',
            status: 'Pending', // Pending | Opened | Completed | Skipped
            openedAt: null,
            completedAt: null
          });
        }
      });
    } else {
      // Manual input parser (supports: "9876543210", "+919876543210, Name", "Name <+919876543210>")
      const lines = rawNumbersText.split('\n');
      lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return;

        let name = '';
        let phoneCandidate = '';

        if (trimmed.includes(',')) {
          const parts = trimmed.split(',');
          // If first part looks like phone
          if (/\d{7,}/.test(parts[0])) {
            phoneCandidate = parts[0].trim();
            name = parts.slice(1).join(',').trim();
          } else {
            name = parts[0].trim();
            phoneCandidate = parts[1].trim();
          }
        } else {
          phoneCandidate = trimmed;
        }

        const val = validatePhoneNumber(phoneCandidate, defaultCountry.dialCode);
        if (val.isValid && !seenPhones.has(val.cleaned)) {
          seenPhones.add(val.cleaned);
          list.push({
            id: `rec-man-${idx}-${Date.now()}`,
            name: name || `Customer ${list.length + 1}`,
            phone: val.cleaned,
            rawPhone: phoneCandidate,
            company: '',
            status: 'Pending',
            openedAt: null,
            completedAt: null
          });
        }
      });
    }

    return list;
  };

  const handleStartCampaignCheck = (e) => {
    e.preventDefault();
    setSetupError('');

    if (!messageTemplate.trim()) {
      setSetupError('Please enter a marketing message template.');
      return;
    }

    const parsed = parseRecipients();
    if (parsed.length === 0) {
      setSetupError('No valid recipients found. Please add at least one valid mobile number.');
      return;
    }

    // Open confirmation dialog
    setShowConfirmModal(true);
  };

  const handleConfirmStartCampaign = () => {
    const parsed = parseRecipients();
    setRecipients(parsed);
    setCurrentIndex(0);
    setIsCampaignActive(true);
    setIsPaused(false);
    setCampaignCompleted(false);
    setShowConfirmModal(false);

    // Update global stats
    if (onUpdateStats) {
      onUpdateStats({
        totalInCampaign: parsed.length,
        pending: parsed.length,
        completed: 0
      });
    }
  };

  const currentRecipient = recipients[currentIndex] || null;

  // Personalized message for active contact
  const currentPersonalizedMessage = currentRecipient
    ? parseMessageWithVariables(messageTemplate, currentRecipient)
    : messageTemplate;

  // 1. Open WhatsApp Conversation
  const handleOpenWhatsApp = () => {
    if (!currentRecipient) return;

    const url = generateWhatsAppUrl(currentRecipient.phone, currentPersonalizedMessage);
    window.open(url, '_blank', 'noopener,noreferrer');

    // Update recipient status to 'Opened' (WhatsApp opened, waiting for user manual confirmation)
    setRecipients((prev) =>
      prev.map((r, i) =>
        i === currentIndex
          ? { ...r, status: 'Opened', openedAt: new Date().toLocaleTimeString() }
          : r
      )
    );

    if (onLogActivity) {
      onLogActivity({
        type: 'Campaign Message',
        campaign: campaignName,
        recipient: currentRecipient.name,
        phone: `+${currentRecipient.phone}`,
        message: currentPersonalizedMessage,
        status: 'Opened in WhatsApp',
        timestamp: new Date().toISOString()
      });
    }
  };

  // 2. Confirm Sent & Move to Next
  const handleConfirmSentAndNext = () => {
    if (!currentRecipient) return;

    // Mark current as Completed
    const updated = recipients.map((r, i) =>
      i === currentIndex
        ? { ...r, status: 'Completed', completedAt: new Date().toLocaleTimeString() }
        : r
    );

    setRecipients(updated);

    if (onLogActivity) {
      onLogActivity({
        type: 'Campaign Message Confirmed',
        campaign: campaignName,
        recipient: currentRecipient.name,
        phone: `+${currentRecipient.phone}`,
        message: currentPersonalizedMessage,
        status: 'Completed (Manually Confirmed)',
        timestamp: new Date().toISOString()
      });
    }

    // Advance to next recipient if available
    advanceQueue(updated);
  };

  // 3. Skip contact
  const handleSkipAndNext = () => {
    if (!currentRecipient) return;

    const updated = recipients.map((r, i) =>
      i === currentIndex ? { ...r, status: 'Skipped' } : r
    );
    setRecipients(updated);
    advanceQueue(updated);
  };

  const advanceQueue = (latestRecipients) => {
    // Find next pending or opened contact
    const nextIdx = latestRecipients.findIndex((r, idx) => idx > currentIndex && r.status === 'Pending');

    if (nextIdx !== -1) {
      setCurrentIndex(nextIdx);
    } else {
      // Check if any pending remaining from start
      const anyPending = latestRecipients.findIndex((r) => r.status === 'Pending');
      if (anyPending !== -1) {
        setCurrentIndex(anyPending);
      } else {
        // All contacts processed!
        setCampaignCompleted(true);
        try {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
          });
        } catch (e) {
          // ignore
        }
      }
    }
  };

  // Move back/forward manually
  const handleJumpToRecipient = (idx) => {
    if (idx >= 0 && idx < recipients.length) {
      setCurrentIndex(idx);
    }
  };

  // Variable insertion
  const insertVariable = (varName) => {
    setMessageTemplate((prev) => prev + ` {${varName}}`);
  };

  // Opt out toggle
  const handleOptOutToggle = (checked) => {
    setIncludeOptOut(checked);
    if (checked) {
      if (!messageTemplate.includes('Reply STOP to unsubscribe')) {
        setMessageTemplate((prev) => prev + OPT_OUT_SNIPPET);
      }
    } else {
      setMessageTemplate((prev) => prev.replace(OPT_OUT_SNIPPET, '').trim());
    }
  };

  // Statistics calculation
  const totalCount = recipients.length;
  const completedCount = recipients.filter((r) => r.status === 'Completed').length;
  const openedCount = recipients.filter((r) => r.status === 'Opened').length;
  const skippedCount = recipients.filter((r) => r.status === 'Skipped').length;
  const pendingCount = recipients.filter((r) => r.status === 'Pending').length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Export report
  const handleExportReport = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['Name,Phone Number,Status,Opened At,Completed At']
        .concat(
          recipients.map(
            (r) =>
              `"${r.name}","+${r.phone}","${r.status}","${r.openedAt || ''}","${r.completedAt || ''}"`
          )
        )
        .join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${campaignName.replace(/\s+/g, '_')}_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered list for display in table
  const displayedRecipients = recipients.filter((r) => {
    if (statusFilter === 'all') return true;
    return r.status.toLowerCase() === statusFilter.toLowerCase();
  });

  return (
    <div className="campaign-container">
      {/* ===================== CAMPAIGN SETUP SCREEN ===================== */}
      {!isCampaignActive ? (
        <div className="campaign-setup-card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Bulk Marketing Campaigns</h2>
              <p className="card-subtitle">
                Compose a shared marketing message and send to multiple recipients with step-by-step confirmation.
              </p>
            </div>
            <div className="compliance-shield-tag">
              <ShieldAlert size={16} className="text-emerald-600" />
              <span>Safe Step-by-Step WhatsApp Dispatch</span>
            </div>
          </div>

          <form onSubmit={handleStartCampaignCheck} className="space-y-6">
            {/* Campaign Name */}
            <div className="form-grid-2">
              <div className="form-group">
                <label htmlFor="campaign-name-input" className="form-label">
                  Campaign Name
                </label>
                <input
                  id="campaign-name-input"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Festive Flash Sale Announcement"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  required
                />
              </div>

              {/* Default Country for local numbers */}
              <div className="form-group">
                <label className="form-label">Default Country Code</label>
                <select
                  className="form-select"
                  value={defaultCountry.code}
                  onChange={(e) => {
                    const found = COUNTRIES.find((c) => c.code === e.target.value);
                    if (found) setDefaultCountry(found);
                  }}
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.name} ({c.dialCode})
                    </option>
                  ))}
                </select>
                <span className="field-hint">Used if numbers in list lack explicit '+' country prefix</span>
              </div>
            </div>

            {/* Recipient Source Selector */}
            <div className="recipient-source-section">
              <label className="form-label font-semibold">Recipient Source:</label>
              <div className="source-tabs-pills">
                <button
                  type="button"
                  className={`source-pill ${recipientSource === 'imported' ? 'active' : ''}`}
                  onClick={() => setRecipientSource('imported')}
                >
                  <Users size={16} />
                  <span>Use Imported Contacts ({contacts.length})</span>
                </button>
                <button
                  type="button"
                  className={`source-pill ${recipientSource === 'manual' ? 'active' : ''}`}
                  onClick={() => setRecipientSource('manual')}
                >
                  <span>Enter / Paste Numbers</span>
                </button>
              </div>

              {recipientSource === 'imported' ? (
                <div className="imported-contacts-summary">
                  {contacts.length > 0 ? (
                    <div className="alert-box alert-info">
                      <Users size={18} className="text-emerald-600" />
                      <div>
                        <strong>{contacts.length} contacts loaded from Contact Book.</strong>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Personalized tags like <code>{'{name}'}</code> will automatically pull customer names from the imported list.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="alert-box alert-warning">
                      <AlertCircle size={18} className="text-amber-600" />
                      <div>
                        <strong>No imported contacts available.</strong>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Switch to "Enter / Paste Numbers" or visit the "Contacts & CSV" tab to upload your CSV file.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="form-group mt-3">
                  <label htmlFor="raw-numbers-textarea" className="form-label">
                    Enter Mobile Numbers (One per line)
                  </label>
                  <textarea
                    id="raw-numbers-textarea"
                    rows={5}
                    className="form-textarea font-mono text-sm"
                    placeholder={`+91 9876543210, John Doe\n+91 9823456789, Jane Smith\n9712345678`}
                    value={rawNumbersText}
                    onChange={(e) => setRawNumbersText(e.target.value)}
                  />
                  <span className="field-hint">
                    Format: <code>Phone Number</code> or <code>Phone Number, Name</code>. Country code will be auto-formatted.
                  </span>
                </div>
              )}
            </div>

            {/* Shared Marketing Message Composer */}
            <div className="form-group">
              <div className="message-label-row">
                <label htmlFor="campaign-message-textarea" className="form-label">
                  Shared Marketing Message
                </label>
                {/* Personalization Tags */}
                <div className="variable-pills">
                  <span className="text-xs text-slate-500 font-medium mr-1">Insert tag:</span>
                  <button
                    type="button"
                    className="var-pill-btn"
                    onClick={() => insertVariable('name')}
                    title="Insert Customer Name"
                  >
                    + {'{name}'}
                  </button>
                  <button
                    type="button"
                    className="var-pill-btn"
                    onClick={() => insertVariable('company')}
                    title="Insert Company Name"
                  >
                    + {'{company}'}
                  </button>
                  <button
                    type="button"
                    className="var-pill-btn"
                    onClick={() => insertVariable('phone')}
                    title="Insert Phone Number"
                  >
                    + {'{phone}'}
                  </button>
                </div>
              </div>

              <textarea
                id="campaign-message-textarea"
                rows={7}
                className="form-textarea message-composer-box"
                placeholder="Write your campaign broadcast message here..."
                value={messageTemplate}
                onChange={(e) => setMessageTemplate(e.target.value)}
                required
              />

              {/* Opt-out toggle */}
              <div className="composer-options-bar">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={includeOptOut || messageTemplate.includes('Reply STOP to unsubscribe')}
                    onChange={(e) => handleOptOutToggle(e.target.checked)}
                    className="custom-checkbox"
                  />
                  <span className="checkbox-text">
                    Include Opt-Out Prompt (<em>"Reply STOP to unsubscribe"</em>)
                  </span>
                </label>
              </div>
            </div>

            {setupError && (
              <div className="alert-box alert-error">
                <AlertCircle size={18} />
                <span>{setupError}</span>
              </div>
            )}

            {/* Start Campaign Trigger */}
            <div className="pt-2">
              <button type="submit" className="btn-primary btn-large w-full">
                <Play size={18} />
                <span>Review & Start Campaign</span>
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* ===================== ACTIVE CAMPAIGN EXECUTION SCREEN ===================== */
        <div className="active-campaign-layout">
          {/* Top Campaign Bar with Progress & Controls */}
          <div className="campaign-active-header-card">
            <div className="campaign-meta-row">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="campaign-active-title">{campaignName}</h2>
                  <span className={`status-badge-pill ${isPaused ? 'badge-paused' : campaignCompleted ? 'badge-completed' : 'badge-running'}`}>
                    {campaignCompleted ? 'Finished 🎉' : isPaused ? 'Paused ⏸' : 'In Progress ⚡'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Manual guided sender • Contact {currentIndex + 1} of {totalCount}
                </p>
              </div>

              <div className="campaign-control-actions">
                {!campaignCompleted && (
                  <button
                    type="button"
                    className={`btn-control-pause ${isPaused ? 'btn-resume' : ''}`}
                    onClick={() => setIsPaused(!isPaused)}
                  >
                    {isPaused ? <Play size={16} /> : <Pause size={16} />}
                    <span>{isPaused ? 'Resume Campaign' : 'Pause'}</span>
                  </button>
                )}

                <button
                  type="button"
                  className="btn-control-secondary"
                  onClick={handleExportReport}
                  title="Download Campaign CSV Report"
                >
                  <Download size={16} />
                  <span>Export Report</span>
                </button>

                <button
                  type="button"
                  className="btn-control-danger"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to exit and end this campaign?')) {
                      setIsCampaignActive(false);
                    }
                  }}
                  title="End Campaign"
                >
                  <span>End</span>
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="campaign-progress-bar-wrapper">
              <div className="progress-info-row">
                <span className="font-semibold text-slate-700">Campaign Progress</span>
                <span className="font-bold text-emerald-600">{progressPercent}% Completed</span>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
            </div>

            {/* Counters Row */}
            <div className="campaign-stats-grid">
              <div className="camp-stat-box">
                <span className="stat-label">Total Contacts</span>
                <span className="stat-num">{totalCount}</span>
              </div>
              <div className="camp-stat-box">
                <span className="stat-label">Pending</span>
                <span className="stat-num text-slate-600">{pendingCount}</span>
              </div>
              <div className="camp-stat-box">
                <span className="stat-label">WhatsApp Opened</span>
                <span className="stat-num text-amber-500">{openedCount}</span>
              </div>
              <div className="camp-stat-box">
                <span className="stat-label">Confirmed Sent</span>
                <span className="stat-num text-emerald-600">{completedCount}</span>
              </div>
              <div className="camp-stat-box">
                <span className="stat-label">Skipped</span>
                <span className="stat-num text-slate-400">{skippedCount}</span>
              </div>
            </div>
          </div>

          {/* Main Workspace: Active Contact Dispatcher vs Preview */}
          <div className="active-dispatch-grid">
            {/* Left: Active Contact Controller */}
            <div className="active-contact-card">
              {currentRecipient ? (
                <>
                  <div className="active-contact-header">
                    <div className="contact-headline">
                      <span className="recipient-indexer">
                        Recipient #{currentIndex + 1} of {totalCount}
                      </span>
                      <h3 className="recipient-name-large">
                        {currentRecipient.name}
                      </h3>
                      <span className="recipient-phone-pill">
                        +{currentRecipient.phone}
                      </span>
                    </div>

                    <div className="recipient-status-display">
                      <span className="text-xs text-slate-500 uppercase font-semibold">Status:</span>
                      <span className={`status-badge-pill badge-${currentRecipient.status.toLowerCase()}`}>
                        {currentRecipient.status === 'Opened'
                          ? 'WhatsApp Opened (Awaiting Send)'
                          : currentRecipient.status}
                      </span>
                    </div>
                  </div>

                  {/* Instructions Callout */}
                  <div className="dispatch-instructions-box">
                    <div className="step-indicator">
                      <span className="step-badge">Step 1</span>
                      <span>Click <strong>"Open WhatsApp Conversation"</strong> to launch WhatsApp with this message.</span>
                    </div>
                    <div className="step-indicator">
                      <span className="step-badge">Step 2</span>
                      <span>Hit WhatsApp's green Send button in the WhatsApp window.</span>
                    </div>
                    <div className="step-indicator">
                      <span className="step-badge">Step 3</span>
                      <span>Click <strong>"Confirm Sent & Next"</strong> below to record confirmation and advance.</span>
                    </div>
                  </div>

                  {/* Primary Action Buttons */}
                  <div className="dispatch-actions-group">
                    <button
                      type="button"
                      className="btn-send-whatsapp btn-large w-full"
                      onClick={handleOpenWhatsApp}
                      disabled={isPaused}
                    >
                      <Send size={19} />
                      <span>Open WhatsApp Conversation</span>
                    </button>

                    <div className="dispatch-secondary-actions">
                      <button
                        type="button"
                        className="btn-confirm-sent"
                        onClick={handleConfirmSentAndNext}
                        disabled={isPaused}
                        title="Confirm that you clicked send in WhatsApp"
                      >
                        <CheckCheck size={18} />
                        <span>Confirm Sent & Next</span>
                      </button>

                      <button
                        type="button"
                        className="btn-skip-recipient"
                        onClick={handleSkipAndNext}
                        title="Skip this recipient"
                      >
                        <SkipForward size={16} />
                        <span>Skip</span>
                      </button>
                    </div>
                  </div>

                  {/* Navigation pagination buttons */}
                  <div className="queue-nav-buttons">
                    <button
                      type="button"
                      className="btn-queue-nav"
                      onClick={() => handleJumpToRecipient(currentIndex - 1)}
                      disabled={currentIndex === 0}
                    >
                      <ChevronLeft size={16} />
                      <span>Previous</span>
                    </button>
                    <span className="queue-nav-text">
                      {currentIndex + 1} / {totalCount}
                    </span>
                    <button
                      type="button"
                      className="btn-queue-nav"
                      onClick={() => handleJumpToRecipient(currentIndex + 1)}
                      disabled={currentIndex === totalCount - 1}
                    >
                      <span>Next</span>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </>
              ) : (
                <div className="all-completed-banner">
                  <CheckCircle2 size={54} className="text-emerald-500 animate-bounce" />
                  <h3>All Campaign Recipients Processed!</h3>
                  <p className="text-sm text-slate-600 mt-2">
                    You have finished processing all contacts in this campaign.
                  </p>
                  <button
                    type="button"
                    className="btn-primary mt-4"
                    onClick={handleExportReport}
                  >
                    <Download size={16} />
                    <span>Download Final Campaign Report</span>
                  </button>
                </div>
              )}
            </div>

            {/* Right: Realistic WhatsApp Mobile Preview with Dynamic Personalization */}
            <div className="active-preview-column">
              <MessagePreview
                message={currentPersonalizedMessage}
                recipientName={currentRecipient?.name || 'Customer'}
                recipientPhone={currentRecipient ? `+${currentRecipient.phone}` : ''}
              />
            </div>
          </div>

          {/* Bottom Table: Full Recipient Queue */}
          <div className="campaign-queue-card">
            <div className="queue-card-header">
              <div className="flex items-center gap-2">
                <ListFilter size={18} className="text-slate-500" />
                <h3 className="queue-card-title">Campaign Recipient Queue</h3>
              </div>

              {/* Status Filter Chips */}
              <div className="status-filter-pills">
                {['all', 'pending', 'opened', 'completed', 'skipped'].map((filterKey) => (
                  <button
                    key={filterKey}
                    type="button"
                    className={`filter-chip ${statusFilter === filterKey ? 'active' : ''}`}
                    onClick={() => setStatusFilter(filterKey)}
                  >
                    {filterKey.charAt(0).toUpperCase() + filterKey.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="table-responsive">
              <table className="queue-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Phone Number</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedRecipients.map((rec, idx) => {
                    const isCurrent = recipients.indexOf(rec) === currentIndex;
                    return (
                      <tr
                        key={rec.id}
                        className={`queue-row ${isCurrent ? 'row-active' : ''}`}
                        onClick={() => handleJumpToRecipient(recipients.indexOf(rec))}
                      >
                        <td className="font-mono text-xs">{idx + 1}</td>
                        <td className="font-semibold text-slate-800">
                          {rec.name}
                          {isCurrent && <span className="active-row-indicator">Current</span>}
                        </td>
                        <td className="font-mono text-slate-600">+{rec.phone}</td>
                        <td>
                          <span className={`status-badge-pill badge-${rec.status.toLowerCase()}`}>
                            {rec.status}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn-table-action"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleJumpToRecipient(recipients.indexOf(rec));
                            }}
                          >
                            Switch to Contact
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================== CONFIRMATION MODAL BEFORE STARTING CAMPAIGN ===================== */}
      {showConfirmModal && (
        <div className="modal-backdrop">
          <div className="modal-dialog max-w-lg">
            <div className="modal-header">
              <div className="modal-header-icon-group">
                <div className="icon-shield-wrapper">
                  <Play size={22} className="text-emerald-600" />
                </div>
                <div>
                  <h3 className="modal-title">Ready to Start Campaign?</h3>
                  <p className="modal-subtitle">{campaignName}</p>
                </div>
              </div>
            </div>

            <div className="modal-body space-y-3">
              <p className="text-sm text-slate-600">
                You are about to start a campaign for <strong>{parseRecipients().length} recipient(s)</strong>.
              </p>

              <div className="compliance-banner-info text-xs">
                <Info size={16} />
                <span>
                  <strong>Safety Notice:</strong> To adhere to WhatsApp terms, each conversation will be opened with the prefilled message. You will manually confirm each send before moving forward.
                </span>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setShowConfirmModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleConfirmStartCampaign}
              >
                Start Campaign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
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
  ListFilter,
  Zap,
  Globe,
  Smartphone,
  Sliders,
  FastForward,
  HelpCircle,
  X,
  Keyboard,
  Maximize2,
  Image as ImageIcon,
  UploadCloud,
  ClipboardCopy,
  Check
} from 'lucide-react';
import confetti from 'canvas-confetti';
import MessagePreview from './MessagePreview';
import AutoSendGuideModal from './AutoSendGuideModal';
import { cleanPhoneNumber, validatePhoneNumber, generateWhatsAppUrl, parseMessageWithVariables } from '../utils/whatsapp';
import { DEFAULT_TEMPLATES, OPT_OUT_SNIPPET, MARKETING_BANNERS } from '../utils/templates';
import { COUNTRIES, DEFAULT_COUNTRY } from '../utils/countries';

// Gentle web audio chime synthesizer for dispatch notification
function playDispatchChime() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
    gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
  } catch {
    // Audio context unavailable or blocked
  }
}

export default function CampaignManager({
  contacts = [],
  onUpdateStats,
  onLogActivity,
  initialTemplate = null
}) {
  // Campaign Setup State
  const [campaignName, setCampaignName] = useState('Marketing Campaign');
  const [campaignMode, setCampaignMode] = useState('auto'); // 'auto' (Auto-Pilot) | 'manual'
  const [recipientSource, setRecipientSource] = useState(contacts.length > 0 ? 'imported' : 'manual');
  const [rawNumbersText, setRawNumbersText] = useState(
    '+91 9876543210, Rahul Verma\n+91 9823456789, Priya Patel\n+91 9712345678, Sneha Kulkarni'
  );
  const [messageTemplate, setMessageTemplate] = useState(
    initialTemplate || DEFAULT_TEMPLATES[0].content
  );
  const [defaultCountry, setDefaultCountry] = useState(DEFAULT_COUNTRY);
  const [includeOptOut, setIncludeOptOut] = useState(false);

  // Marketing Image / Flyer State
  const [campaignImage, setCampaignImage] = useState(null); // Data URL or Image URL
  const [campaignImageName, setCampaignImageName] = useState('');
  const [imageCopiedNotice, setImageCopiedNotice] = useState(false);

  // Auto-Pilot & Window Configuration
  const [autoDelaySeconds, setAutoDelaySeconds] = useState(30); // 30s message gap per user request
  const [dispatchEngine, setDispatchEngine] = useState('web'); // 'web' (Direct WhatsApp Web) | 'app' | 'universal'
  const [windowMode, setWindowMode] = useState('popup'); // 'popup' (Auto-close popup) | 'tab' (Reused tab)
  const [reuseWindow, setReuseWindow] = useState(true);
  const [autoOpenOnNext, setAutoOpenOnNext] = useState(true); // Automatically open WhatsApp popup when next contact is selected
  const [popupBlocked, setPopupBlocked] = useState(false);

  // Active Campaign State
  const [isCampaignActive, setIsCampaignActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recipients, setRecipients] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [campaignCompleted, setCampaignCompleted] = useState(false);
  const [countdown, setCountdown] = useState(autoDelaySeconds);

  // Modals & UI helpers
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showAutoSendModal, setShowAutoSendModal] = useState(false);
  const [setupError, setSetupError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const timerRef = useRef(null);
  const popupRef = useRef(null);

  // Copy promotional image to clipboard so user can press Ctrl+V in WhatsApp chat
  const copyImageToClipboard = async (imgSrc = campaignImage) => {
    if (!imgSrc) return;
    try {
      const res = await fetch(imgSrc);
      const blob = await res.blob();
      if (navigator.clipboard && navigator.clipboard.write) {
        await navigator.clipboard.write([
          new ClipboardItem({ [blob.type || 'image/png']: blob })
        ]);
        setImageCopiedNotice(true);
        setTimeout(() => setImageCopiedNotice(false), 3500);
      }
    } catch (err) {
      console.warn('Could not copy image to clipboard:', err);
    }
  };

  // Handle image file selection
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, WebP, GIF)');
      return;
    }

    setCampaignImageName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target.result;
      setCampaignImage(result);
      copyImageToClipboard(result);
    };
    reader.readAsDataURL(file);
  };

  // Safely close the current WhatsApp popup window if open
  const closeCurrentPopup = () => {
    if (popupRef.current && !popupRef.current.closed) {
      try {
        popupRef.current.close();
      } catch (err) {
        console.warn('Unable to close popup window:', err);
      }
    }
  };

  // Close popup window when component unmounts
  useEffect(() => {
    return () => {
      closeCurrentPopup();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

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
      const lines = rawNumbersText.split('\n');
      lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return;

        let name = '';
        let phoneCandidate = '';

        if (trimmed.includes(',')) {
          const parts = trimmed.split(',');
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

  const currentRecipient = recipients[currentIndex] || null;
  const currentPersonalizedMessage = currentRecipient
    ? parseMessageWithVariables(messageTemplate, currentRecipient)
    : messageTemplate;

  // Open WhatsApp in a controlled popup window or reused browser tab
  const openWhatsAppWindow = (waUrl) => {
    // Always close previous popup window to prevent clutter and duplicate sessions
    closeCurrentPopup();

    if (windowMode === 'popup') {
      // Calculate centered coordinates for popup window
      const screenWidth = window.screen.availWidth || 1280;
      const screenHeight = window.screen.availHeight || 800;
      const width = Math.min(1040, Math.floor(screenWidth * 0.78));
      const height = Math.min(780, Math.floor(screenHeight * 0.86));
      const left = Math.max(10, Math.floor((screenWidth - width) / 2));
      const top = Math.max(10, Math.floor((screenHeight - height) / 2));

      const windowFeatures = `width=${width},height=${height},left=${left},top=${top},status=no,toolbar=no,menubar=no,location=yes,resizable=yes,scrollbars=yes`;

      let win = null;
      try {
        // Open without 'noopener' so we retain handle to close and navigate it
        win = window.open(waUrl, 'whatsapp_campaign_popup', windowFeatures);
      } catch (err) {
        console.error('Error opening popup:', err);
      }

      if (!win || win.closed || typeof win.closed === 'undefined') {
        setPopupBlocked(true);
      } else {
        setPopupBlocked(false);
        popupRef.current = win;
        try {
          win.focus();
        } catch {}
      }
      return win;
    } else {
      // Reused single browser tab
      const targetName = reuseWindow ? 'whatsapp_campaign_dispatch' : '_blank';
      const win = window.open(waUrl, targetName);
      popupRef.current = win;
      return win;
    }
  };

  // Dispatch message helper
  const dispatchCurrentRecipient = (recIndex, recList) => {
    const targetRec = recList[recIndex];
    if (!targetRec) return;

    const personalized = parseMessageWithVariables(messageTemplate, targetRec);
    const waUrl = generateWhatsAppUrl(targetRec.phone, personalized, dispatchEngine);

    // If a marketing image flyer is attached, automatically copy to clipboard for Ctrl+V in WhatsApp
    if (campaignImage) {
      copyImageToClipboard(campaignImage);
    }

    // Open WhatsApp in popup or tab
    openWhatsAppWindow(waUrl);
    playDispatchChime();

    // Mark as Opened
    setRecipients((prev) =>
      prev.map((r, i) =>
        i === recIndex
          ? {
              ...r,
              status: r.status === 'Completed' ? 'Completed' : 'Opened',
              openedAt: r.openedAt || new Date().toLocaleTimeString()
            }
          : r
      )
    );

    if (onLogActivity) {
      onLogActivity({
        type: `Campaign ${campaignMode === 'auto' ? 'Auto-Dispatch' : 'Message'}`,
        campaign: campaignName,
        recipient: targetRec.name,
        phone: `+${targetRec.phone}`,
        message: personalized,
        status: 'Opened in WhatsApp',
        timestamp: new Date().toISOString()
      });
    }
  };

  // Robust Next Recipient Index Finder
  // Finds the next contact that is neither 'Completed' nor 'Skipped'
  const getNextRecipientIndex = (currentIdx, list) => {
    if (!list || list.length === 0) return -1;

    // 1. Look for subsequent contacts that are unfinished
    const nextIdx = list.findIndex(
      (r, idx) => idx > currentIdx && r.status !== 'Completed' && r.status !== 'Skipped'
    );
    if (nextIdx !== -1) return nextIdx;

    // 2. Wrap-around check from start for any unfinished contacts
    const anyRemainingIdx = list.findIndex(
      (r) => r.status !== 'Completed' && r.status !== 'Skipped'
    );
    if (anyRemainingIdx !== -1) return anyRemainingIdx;

    // 3. Fallback: if user simply wants sequential next row
    if (currentIdx + 1 < list.length) {
      return currentIdx + 1;
    }

    return -1; // All contacts done
  };

  // Start campaign confirmation
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

    setShowConfirmModal(true);
  };

  // Initiate active campaign
  const handleConfirmStartCampaign = () => {
    const parsed = parseRecipients();
    setRecipients(parsed);
    setCurrentIndex(0);
    setIsCampaignActive(true);
    setIsPaused(false);
    setCampaignCompleted(false);
    setShowConfirmModal(false);
    setCountdown(autoDelaySeconds);

    // Immediately dispatch the first contact in popup window!
    setTimeout(() => {
      dispatchCurrentRecipient(0, parsed);
    }, 400);

    if (onUpdateStats) {
      onUpdateStats({
        totalInCampaign: parsed.length,
        pending: parsed.length,
        completed: 0
      });
    }
  };

  // ==================== AUTO-PILOT TIMER ENGINE ====================
  useEffect(() => {
    if (!isCampaignActive || campaignMode !== 'auto' || isPaused || campaignCompleted) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setCountdown((prevCount) => {
        if (prevCount <= 1) {
          // Timer expired -> Advance to next contact!
          handleAutoAdvanceNext();
          return autoDelaySeconds;
        }
        return prevCount - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isCampaignActive, campaignMode, isPaused, campaignCompleted, currentIndex, recipients, autoDelaySeconds, windowMode]);

  // Auto-advance logic: Closes previous popup, marks as sent, and opens next
  const handleAutoAdvanceNext = () => {
    handleConfirmSentAndNext();
  };

  // Manual trigger for opening WhatsApp popup for current recipient
  const handleOpenWhatsAppManual = () => {
    dispatchCurrentRecipient(currentIndex, recipients);
  };

  // Confirm Sent & Close Popup & Auto Open Next
  const handleConfirmSentAndNext = () => {
    if (!currentRecipient) return;

    // 1. Close active popup window immediately
    closeCurrentPopup();

    // 2. Mark current contact as Completed
    const updated = recipients.map((r, i) =>
      i === currentIndex
        ? { ...r, status: 'Completed', completedAt: new Date().toLocaleTimeString() }
        : r
    );
    setRecipients(updated);

    if (onUpdateStats) {
      const compCount = updated.filter((r) => r.status === 'Completed').length;
      onUpdateStats({ completed: compCount, pending: updated.length - compCount });
    }

    // 3. Find next recipient index
    const nextIdx = getNextRecipientIndex(currentIndex, updated);

    if (nextIdx !== -1) {
      setCurrentIndex(nextIdx);
      setCountdown(autoDelaySeconds);
      // Clean 0.30 sec (300ms) transition gap before auto-opening next WhatsApp popup
      setTimeout(() => {
        dispatchCurrentRecipient(nextIdx, updated);
      }, 300);
    } else {
      // Complete campaign!
      setCampaignCompleted(true);
      if (timerRef.current) clearInterval(timerRef.current);
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 }
        });
      } catch {}
    }
  };

  // Skip Current & Close Popup & Open Next
  const handleSkipAndNext = () => {
    if (!currentRecipient) return;

    closeCurrentPopup();

    const updated = recipients.map((r, i) =>
      i === currentIndex ? { ...r, status: 'Skipped' } : r
    );
    setRecipients(updated);

    const nextIdx = getNextRecipientIndex(currentIndex, updated);
    if (nextIdx !== -1) {
      setCurrentIndex(nextIdx);
      setCountdown(autoDelaySeconds);
      setTimeout(() => {
        dispatchCurrentRecipient(nextIdx, updated);
      }, 300);
    } else {
      setCampaignCompleted(true);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  // Pagination Next Button: Advances to next contact and auto-opens WhatsApp popup
  const handleNextInQueue = () => {
    if (currentIndex < recipients.length - 1) {
      const nextIdx = currentIndex + 1;
      closeCurrentPopup();
      setCurrentIndex(nextIdx);
      setCountdown(autoDelaySeconds);
      if (autoOpenOnNext) {
        setTimeout(() => {
          dispatchCurrentRecipient(nextIdx, recipients);
        }, 300);
      }
    }
  };

  // Pagination Previous Button: Closes popup and moves to previous contact
  const handlePreviousInQueue = () => {
    if (currentIndex > 0) {
      const prevIdx = currentIndex - 1;
      closeCurrentPopup();
      setCurrentIndex(prevIdx);
      setCountdown(autoDelaySeconds);
      if (autoOpenOnNext) {
        setTimeout(() => {
          dispatchCurrentRecipient(prevIdx, recipients);
        }, 300);
      }
    }
  };

  // Direct Selection of a recipient from queue table
  const handleJumpToRecipient = (idx) => {
    if (idx >= 0 && idx < recipients.length) {
      closeCurrentPopup();
      setCurrentIndex(idx);
      setCountdown(autoDelaySeconds);
      if (autoOpenOnNext) {
        setTimeout(() => {
          dispatchCurrentRecipient(idx, recipients);
        }, 300);
      }
    }
  };

  // Global Keyboard Shortcut: Space or Alt+N to confirm sent, close popup, and auto-open next!
  useEffect(() => {
    if (!isCampaignActive || campaignCompleted) return;

    const handleKeyDown = (e) => {
      const tag = e.target.tagName ? e.target.tagName.toLowerCase() : '';
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      if (e.code === 'Space' || (e.altKey && e.code === 'KeyN')) {
        e.preventDefault();
        handleConfirmSentAndNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCampaignActive, campaignCompleted, currentIndex, recipients, autoDelaySeconds, windowMode, autoOpenOnNext]);

  // Variable insertion
  const insertVariable = (varName) => {
    setMessageTemplate((prev) => prev + ` {${varName}}`);
  };

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

  // Stats calculation
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
                Automated or manual dispatch of marketing messages directly into WhatsApp.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn-control-secondary text-xs"
                onClick={() => setShowAutoSendModal(true)}
              >
                <Zap size={14} className="text-amber-500" />
                <span>Zero-Click Auto-Send Guide</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleStartCampaignCheck} className="space-y-6">
            {/* Mode Switcher Banner: Auto-Pilot vs Manual */}
            <div className="campaign-mode-selector-banner">
              <div className="mode-option-col">
                <button
                  type="button"
                  className={`mode-card-btn ${campaignMode === 'auto' ? 'active' : ''}`}
                  onClick={() => setCampaignMode('auto')}
                >
                  <div className="flex items-center justify-between">
                    <span className="mode-badge-recommended">Recommended</span>
                    <Zap size={18} className="text-amber-500" />
                  </div>
                  <h3 className="mode-btn-title">⚡ Auto-Pilot Mode (Automatic)</h3>
                  <p className="mode-btn-desc">
                    Hands-free sequential dispatch. Automatically opens WhatsApp Web directly for each recipient with a timed delay.
                  </p>
                </button>
              </div>

              <div className="mode-option-col">
                <button
                  type="button"
                  className={`mode-card-btn ${campaignMode === 'manual' ? 'active' : ''}`}
                  onClick={() => setCampaignMode('manual')}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-semibold uppercase">Step-by-Step</span>
                    <Clock size={18} className="text-slate-400" />
                  </div>
                  <h3 className="mode-btn-title">Manual Guided Mode</h3>
                  <p className="mode-btn-desc">
                    You manually click "Open in WhatsApp" and "Confirm Sent & Next" for every contact.
                  </p>
                </button>
              </div>
            </div>

            {/* Auto-Pilot Speed & Message Gap Settings */}
            {campaignMode === 'auto' && (
              <div className="auto-pilot-settings-panel">
                <div className="panel-headline">
                  <Sliders size={16} className="text-emerald-600" />
                  <span className="font-bold text-sm text-slate-800">
                    Message Gap: {autoDelaySeconds} seconds between messages (Anti-Ban Safety Gap)
                  </span>
                </div>

                <div className="delay-preset-buttons">
                  {[
                    { label: 'Turbo (5s)', sec: 5 },
                    { label: 'Fast (15s)', sec: 15 },
                    { label: 'Recommended Gap (30s)', sec: 30 },
                    { label: 'Safe Anti-Ban (45s)', sec: 45 },
                    { label: 'Ultra-Safe (60s)', sec: 60 }
                  ].map((preset) => (
                    <button
                      key={preset.sec}
                      type="button"
                      className={`preset-btn ${autoDelaySeconds === preset.sec ? 'active' : ''}`}
                      onClick={() => setAutoDelaySeconds(preset.sec)}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-4 mt-2">
                  <input
                    type="range"
                    min="5"
                    max="90"
                    step="1"
                    value={autoDelaySeconds}
                    onChange={(e) => setAutoDelaySeconds(Number(e.target.value))}
                    className="delay-range-slider"
                  />
                  <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                    {autoDelaySeconds}s gap per message
                  </span>
                </div>

                {/* Dispatch Engine & Window Mode Options */}
                <div className="auto-options-row">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-slate-700">Display:</label>
                    <select
                      className="form-select text-xs py-1 px-2"
                      value={windowMode}
                      onChange={(e) => setWindowMode(e.target.value)}
                    >
                      <option value="popup">Popup Window (Auto-close & auto-open next)</option>
                      <option value="tab">Single Browser Tab</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-slate-700">Target:</label>
                    <select
                      className="form-select text-xs py-1 px-2"
                      value={dispatchEngine}
                      onChange={(e) => setDispatchEngine(e.target.value)}
                    >
                      <option value="web">Direct WhatsApp Web (web.whatsapp.com)</option>
                      <option value="app">WhatsApp Desktop App (whatsapp://)</option>
                      <option value="universal">Universal wa.me Router</option>
                    </select>
                  </div>

                  <label className="checkbox-label text-xs">
                    <input
                      type="checkbox"
                      checked={autoOpenOnNext}
                      onChange={(e) => setAutoOpenOnNext(e.target.checked)}
                      className="custom-checkbox"
                    />
                    <span>Auto-open next WhatsApp popup on sent</span>
                  </label>
                </div>
              </div>
            )}

            {/* Campaign Name & Default Country */}
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
                          Personalized tags like <code>{'{name}'}</code> will automatically pull customer names from the list.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="alert-box alert-warning">
                      <AlertCircle size={18} className="text-amber-600" />
                      <div>
                        <strong>No imported contacts available.</strong>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Switch to "Enter / Paste Numbers" or visit "Contacts & CSV" tab to upload your CSV file.
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
                    Format: <code>Phone Number</code> or <code>Phone Number, Name</code>.
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
                rows={6}
                className="form-textarea message-composer-box"
                placeholder="Write your campaign broadcast message here..."
                value={messageTemplate}
                onChange={(e) => setMessageTemplate(e.target.value)}
                required
              />

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

            {/* Campaign Marketing Image / Flyer Attachment Section */}
            <div className="campaign-media-section">
              <div className="media-section-header">
                <div className="flex items-center gap-2">
                  <ImageIcon size={18} className="text-emerald-600" />
                  <span className="font-semibold text-sm text-slate-800">
                    Campaign Marketing Image / Flyer <span className="label-optional">(Optional)</span>
                  </span>
                </div>
                {campaignImage && (
                  <button
                    type="button"
                    className="text-xs text-rose-600 hover:underline flex items-center gap-1 font-medium"
                    onClick={() => {
                      setCampaignImage(null);
                      setCampaignImageName('');
                    }}
                  >
                    <X size={13} />
                    <span>Remove Flyer</span>
                  </button>
                )}
              </div>

              {!campaignImage ? (
                <div className="media-upload-container">
                  <div className="upload-dropzone-box">
                    <UploadCloud size={30} className="text-emerald-600 mb-2" />
                    <label className="btn-primary text-xs py-1.5 px-4 cursor-pointer inline-flex items-center gap-2">
                      <ImageIcon size={14} />
                      <span>Upload Image / Flyer from Computer</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                    </label>
                    <p className="text-xs text-slate-400 mt-2">
                      Supports PNG, JPG, WebP, GIF. Auto-copied to clipboard for instant <strong>Ctrl + V</strong> in WhatsApp!
                    </p>
                  </div>

                  {/* Preset High-Converting Marketing Banners */}
                  <div className="sample-banners-wrapper mt-3">
                    <span className="text-xs font-semibold text-slate-600">
                      Or Choose a Ready-to-Send Marketing Banner:
                    </span>
                    <div className="banners-preset-grid mt-2">
                      {MARKETING_BANNERS.map((banner) => (
                        <button
                          key={banner.id}
                          type="button"
                          className="banner-preset-card"
                          onClick={() => {
                            setCampaignImage(banner.dataUrl);
                            setCampaignImageName(banner.name);
                            copyImageToClipboard(banner.dataUrl);
                          }}
                        >
                          <img src={banner.dataUrl} alt={banner.title} className="banner-thumb-img" />
                          <span className="banner-title-text">{banner.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="media-active-card">
                  <div className="media-active-thumb">
                    <img src={campaignImage} alt="Campaign Flyer" className="active-flyer-img" />
                  </div>
                  <div className="media-active-meta">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-800">{campaignImageName || 'Campaign_Banner.png'}</span>
                      <span className="status-badge-pill badge-completed text-[11px]">
                        <Check size={12} /> Ready on Clipboard
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      This promotional image will be automatically copied to your clipboard when dispatching. When WhatsApp Web opens, simply press <kbd className="px-1 py-0.5 bg-slate-100 border rounded font-mono text-[11px] font-bold">Ctrl + V</kbd> to paste!
                    </p>
                    <div className="flex items-center gap-3 mt-3">
                      <button
                        type="button"
                        className="btn-control-secondary text-xs py-1 px-3"
                        onClick={() => copyImageToClipboard(campaignImage)}
                      >
                        <ClipboardCopy size={13} />
                        <span>{imageCopiedNotice ? 'Copied to Clipboard! ✓' : 'Copy Image (Ctrl+V)'}</span>
                      </button>
                      <label className="text-xs text-emerald-700 hover:underline cursor-pointer font-medium">
                        Change Image
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageUpload}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {setupError && (
              <div className="alert-box alert-error">
                <AlertCircle size={18} />
                <span>{setupError}</span>
              </div>
            )}

            {/* Start Campaign Trigger */}
            <div className="pt-2">
              <button
                type="submit"
                className={`btn-primary btn-large w-full ${campaignMode === 'auto' ? 'btn-auto-pilot' : ''}`}
              >
                {campaignMode === 'auto' ? <Zap size={20} /> : <Play size={20} />}
                <span>
                  {campaignMode === 'auto'
                    ? `Launch Auto-Pilot Campaign (${parseRecipients().length} Contacts)`
                    : 'Review & Start Campaign'}
                </span>
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* ===================== ACTIVE CAMPAIGN EXECUTION SCREEN ===================== */
        <div className="active-campaign-layout">
          {/* Top Campaign Bar with Progress & Auto-Pilot Status */}
          <div className="campaign-active-header-card">
            <div className="campaign-meta-row">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="campaign-active-title">{campaignName}</h2>
                  <span
                    className={`status-badge-pill ${
                      campaignCompleted
                        ? 'badge-completed'
                        : isPaused
                        ? 'badge-paused'
                        : campaignMode === 'auto'
                        ? 'badge-running-auto'
                        : 'badge-running'
                    }`}
                  >
                    {campaignCompleted
                      ? 'Campaign Finished 🎉'
                      : isPaused
                      ? 'Paused ⏸'
                      : campaignMode === 'auto'
                      ? '⚡ Auto-Pilot Active'
                      : 'In Progress'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Contact {currentIndex + 1} of {totalCount} •{' '}
                  {campaignMode === 'auto' ? `Auto-Advancing every ${autoDelaySeconds}s` : 'Manual control'}
                </p>
              </div>

              <div className="campaign-control-actions">
                {!campaignCompleted && (
                  <>
                    <button
                      type="button"
                      className={`btn-control-pause ${isPaused ? 'btn-resume' : ''}`}
                      onClick={() => setIsPaused(!isPaused)}
                    >
                      {isPaused ? <Play size={16} /> : <Pause size={16} />}
                      <span>{isPaused ? 'Resume Auto-Pilot' : 'Pause'}</span>
                    </button>

                    {campaignMode === 'auto' && (
                      <button
                        type="button"
                        className="btn-control-fast"
                        onClick={handleAutoAdvanceNext}
                        title="Skip remaining timer and send next contact right now"
                      >
                        <FastForward size={16} />
                        <span>Send Next Now</span>
                      </button>
                    )}
                  </>
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
                    if (window.confirm('Are you sure you want to stop and exit this campaign?')) {
                      setIsCampaignActive(false);
                      if (timerRef.current) clearInterval(timerRef.current);
                    }
                  }}
                  title="End Campaign"
                >
                  <span>End</span>
                </button>
              </div>
            </div>

            {/* Auto-Pilot Countdown Meter */}
            {campaignMode === 'auto' && !campaignCompleted && (
              <div className="auto-countdown-banner">
                <div className="flex items-center gap-3">
                  <div className={`countdown-circle ${isPaused ? 'paused' : ''}`}>
                    <span>{isPaused ? '⏸' : `${countdown}s`}</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">
                      {isPaused
                        ? 'Auto-Pilot Paused'
                        : `Next message automatically opening in ${countdown} seconds...`}
                    </h4>
                    <p className="text-xs text-slate-500">
                      Target: WhatsApp Web ({currentRecipient?.name || 'Customer'})
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="btn-secondary text-xs py-1 px-3"
                    onClick={() => setShowAutoSendModal(true)}
                  >
                    <Zap size={13} className="text-amber-500" />
                    <span>Zero-Click Guide</span>
                  </button>
                </div>
              </div>
            )}

            {/* Progress Bar */}
            <div className="campaign-progress-bar-wrapper">
              <div className="progress-info-row">
                <span className="font-semibold text-slate-700">Campaign Progress</span>
                <span className="font-bold text-emerald-600">{progressPercent}% Completed</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${progressPercent}%` }}></div>
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
                <span className="stat-label">WhatsApp Dispatched</span>
                <span className="stat-num text-amber-500">{openedCount}</span>
              </div>
              <div className="camp-stat-box">
                <span className="stat-label">Confirmed Completed</span>
                <span className="stat-num text-emerald-600">{completedCount}</span>
              </div>
              <div className="camp-stat-box">
                <span className="stat-label">Skipped</span>
                <span className="stat-num text-slate-400">{skippedCount}</span>
              </div>
            </div>
          </div>

          {/* Main Active Dispatch Grid */}
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
                      <h3 className="recipient-name-large">{currentRecipient.name}</h3>
                      <span className="recipient-phone-pill">+{currentRecipient.phone}</span>
                    </div>

                    <div className="recipient-status-display">
                      <span className="text-xs text-slate-500 uppercase font-semibold">Status:</span>
                      <span className={`status-badge-pill badge-${currentRecipient.status.toLowerCase()}`}>
                        {currentRecipient.status === 'Opened' ? 'Dispatched to WhatsApp' : currentRecipient.status}
                      </span>
                    </div>
                  </div>

                  {/* Auto-Pilot Dispatch Notification Callout */}
                  <div className="dispatch-instructions-box">
                    {campaignMode === 'auto' ? (
                      <div className="flex items-start gap-2.5">
                        <Zap size={18} className="text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <strong>Auto-Pilot Active ({autoDelaySeconds}s Safety Gap):</strong> WhatsApp Web opens automatically in a clean popup for each recipient.
                          <div className="text-xs text-slate-500 mt-1">
                            When sent, click <strong>"Confirm Sent & Next"</strong> (or wait {countdown}s) — the current popup will close, and the next contact will automatically open after a 0.30s transition!
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="step-indicator">
                          <span className="step-badge">Step 1</span>
                          <span>WhatsApp Web opens in a popup window with pre-filled message.</span>
                        </div>
                        <div className="step-indicator">
                          <span className="step-badge">Step 2</span>
                          <span>Click <strong>"Confirm Sent & Next"</strong> (or press <kbd className="px-1 py-0.5 bg-slate-100 border rounded text-[11px] font-mono">Space</kbd>) to close the popup and auto-open the next contact!</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Browser Popup Blocked Warning */}
                  {popupBlocked && (
                    <div className="alert-box alert-warning animate-fade-in my-2">
                      <AlertCircle size={18} className="text-amber-600 shrink-0" />
                      <div>
                        <strong>Browser Popup Blocked:</strong>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Your browser prevented the WhatsApp popup from opening automatically. Click the button below to open, and choose "Always allow popups" in your address bar:
                        </p>
                        <button
                          type="button"
                          className="btn-secondary text-xs mt-2 py-1 px-3"
                          onClick={handleOpenWhatsAppManual}
                        >
                          <ExternalLink size={13} />
                          <span>Open WhatsApp Popup Now</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Attached Marketing Flyer Alert Bar */}
                  {campaignImage && (
                    <div className="alert-box alert-info flex items-center justify-between py-2 px-3 mb-3 text-xs">
                      <div className="flex items-center gap-2">
                        <ImageIcon size={16} className="text-emerald-600 shrink-0" />
                        <span>
                          <strong>Flyer Attached:</strong> Automatically copied to clipboard! In WhatsApp popup, press <kbd className="px-1 py-0.5 bg-white dark:bg-slate-800 border rounded font-mono text-[11px] font-bold">Ctrl + V</kbd> to paste.
                        </span>
                      </div>
                      <button
                        type="button"
                        className="btn-secondary text-[11px] py-0.5 px-2.5 shrink-0"
                        onClick={() => copyImageToClipboard(campaignImage)}
                        title="Re-copy image to clipboard"
                      >
                        <ClipboardCopy size={12} />
                        <span>{imageCopiedNotice ? 'Copied ✓' : 'Copy Flyer'}</span>
                      </button>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="dispatch-actions-group">
                    <button
                      type="button"
                      className="btn-send-whatsapp btn-large w-full"
                      onClick={handleOpenWhatsAppManual}
                      title="Open or Re-open WhatsApp Web popup with this message"
                    >
                      <Send size={19} />
                      <span>Open WhatsApp Web in Popup</span>
                    </button>

                    <div className="dispatch-secondary-actions">
                      <button
                        type="button"
                        className="btn-confirm-sent"
                        onClick={handleConfirmSentAndNext}
                        title="Confirm that message was sent, close current popup, and auto-open next contact (or press Space)"
                      >
                        <CheckCheck size={18} />
                        <span>Confirm Sent & Next →</span>
                      </button>

                      <button
                        type="button"
                        className="btn-skip-recipient"
                        onClick={handleSkipAndNext}
                        title="Skip this recipient and open next"
                      >
                        <SkipForward size={16} />
                        <span>Skip</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                      <div className="flex items-center gap-1.5">
                        <Keyboard size={13} className="text-slate-400" />
                        <span>Tip: Press <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border rounded font-mono text-[11px] font-semibold">Space</kbd> or <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border rounded font-mono text-[11px] font-semibold">Alt+N</kbd> to Send & Next</span>
                      </div>

                      <button
                        type="button"
                        className="text-xs text-rose-600 hover:underline flex items-center gap-1"
                        onClick={closeCurrentPopup}
                        title="Close active WhatsApp popup window"
                      >
                        <X size={12} />
                        <span>Close Popup</span>
                      </button>
                    </div>
                  </div>

                  {/* Navigation pagination buttons */}
                  <div className="queue-nav-buttons">
                    <button
                      type="button"
                      className="btn-queue-nav"
                      onClick={handlePreviousInQueue}
                      disabled={currentIndex === 0}
                      title="Go to previous recipient and open chat"
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
                      onClick={handleNextInQueue}
                      disabled={currentIndex === totalCount - 1}
                      title="Go to next recipient and open chat"
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
                    All contacts in this campaign have been dispatched.
                  </p>
                  <button type="button" className="btn-primary mt-4" onClick={handleExportReport}>
                    <Download size={16} />
                    <span>Download Final Campaign Report</span>
                  </button>
                </div>
              )}
            </div>

            {/* Right: Message Preview */}
            <div className="active-preview-column">
              <MessagePreview
                message={currentPersonalizedMessage}
                recipientName={currentRecipient?.name || 'Customer'}
                recipientPhone={currentRecipient ? `+${currentRecipient.phone}` : ''}
                mediaImage={campaignImage}
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
                          {isCurrent && <span className="active-row-indicator">Active</span>}
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

      {/* Confirmation Modal Before Launching */}
      {showConfirmModal && (
        <div className="modal-backdrop">
          <div className="modal-dialog max-w-lg">
            <div className="modal-header">
              <div className="modal-header-icon-group">
                <div className="icon-shield-wrapper bg-amber-100 text-amber-600">
                  <Zap size={22} />
                </div>
                <div>
                  <h3 className="modal-title">
                    Launch {campaignMode === 'auto' ? 'Auto-Pilot' : 'Manual'} Campaign
                  </h3>
                  <p className="modal-subtitle">{campaignName}</p>
                </div>
              </div>
            </div>

            <div className="modal-body space-y-3">
              <p className="text-sm text-slate-600">
                You are about to launch a campaign for <strong>{parseRecipients().length} recipient(s)</strong>.
              </p>

              {campaignMode === 'auto' ? (
                <div className="alert-box alert-success text-xs">
                  <Zap size={16} className="text-emerald-600 shrink-0" />
                  <span>
                    <strong>Auto-Pilot Enabled:</strong> WhatsApp Web will open directly, and messages will automatically advance every <strong>{autoDelaySeconds} seconds</strong>. You can pause or stop at any time.
                  </span>
                </div>
              ) : (
                <div className="compliance-banner-info text-xs">
                  <Info size={16} />
                  <span>
                    <strong>Manual Mode:</strong> Each recipient conversation will be opened one at a time for your manual review and confirmation.
                  </span>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn-cancel" onClick={() => setShowConfirmModal(false)}>
                Cancel
              </button>
              <button type="button" className="btn-primary" onClick={handleConfirmStartCampaign}>
                Start Dispatching Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Zero-Click Guide Modal */}
      <AutoSendGuideModal
        isOpen={showAutoSendModal}
        onClose={() => setShowAutoSendModal(false)}
      />
    </div>
  );
}

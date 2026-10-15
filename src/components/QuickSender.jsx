import React, { useState, useRef } from 'react';
import {
  Send,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Smile,
  Bold,
  Italic,
  Strikethrough,
  Code,
  Sparkles,
  ExternalLink,
  ChevronDown,
  Info,
  Globe,
  Smartphone,
  Zap,
  X
} from 'lucide-react';
import MessagePreview from './MessagePreview';
import { COUNTRIES, DEFAULT_COUNTRY } from '../utils/countries';
import { validatePhoneNumber, generateWhatsAppUrl } from '../utils/whatsapp';
import { DEFAULT_TEMPLATES, OPT_OUT_SNIPPET } from '../utils/templates';

const QUICK_EMOJIS = ['🔥', '🚀', '🎉', '✨', '👋', '🛍️', '🎁', '🏷️', '📢', '⭐', '💬', '🤝'];

export default function QuickSender({ onLogActivity, initialMessage = '' }) {
  const [selectedCountry, setSelectedCountry] = useState(DEFAULT_COUNTRY);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [message, setMessage] = useState(initialMessage || DEFAULT_TEMPLATES[0].content);
  const [includeOptOut, setIncludeOptOut] = useState(false);
  const [dispatchEngine, setDispatchEngine] = useState('web'); // 'web' (Direct WhatsApp Web) | 'app' | 'universal'
  const [reuseTab, setReuseTab] = useState(true);
  const [validationError, setValidationError] = useState('');
  const [successInfo, setSuccessInfo] = useState(null);
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const popupRef = useRef(null);

  // Format text helper
  const insertFormatting = (tagStart, tagEnd = tagStart) => {
    const textarea = document.getElementById('quick-message-textarea');
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = message.substring(start, end);

    const replacement = `${tagStart}${selectedText || 'text'}${tagEnd}`;
    const newMsg = message.substring(0, start) + replacement + message.substring(end);
    setMessage(newMsg);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + tagStart.length,
        start + tagStart.length + (selectedText ? selectedText.length : 4)
      );
    }, 50);
  };

  const insertEmoji = (emoji) => {
    const textarea = document.getElementById('quick-message-textarea');
    if (!textarea) {
      setMessage((prev) => prev + emoji);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newMsg = message.substring(0, start) + emoji + message.substring(end);
    setMessage(newMsg);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 50);
  };

  const handleOptOutToggle = (checked) => {
    setIncludeOptOut(checked);
    if (checked) {
      if (!message.includes('Reply STOP to unsubscribe')) {
        setMessage((prev) => prev + OPT_OUT_SNIPPET);
      }
    } else {
      setMessage((prev) => prev.replace(OPT_OUT_SNIPPET, '').trim());
    }
  };

  const handleLoadTemplate = (templateId) => {
    const tmpl = DEFAULT_TEMPLATES.find((t) => t.id === templateId);
    if (tmpl) {
      setMessage(tmpl.content);
      setValidationError('');
    }
  };

  const handleClear = () => {
    if (phoneNumber || message) {
      if (window.confirm('Are you sure you want to clear the phone number and message?')) {
        setPhoneNumber('');
        setRecipientName('');
        setMessage('');
        setValidationError('');
        setSuccessInfo(null);
      }
    } else {
      setPhoneNumber('');
      setRecipientName('');
      setMessage('');
      setValidationError('');
      setSuccessInfo(null);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    setValidationError('');
    setSuccessInfo(null);

    // 1. Validate Mobile Number
    const validation = validatePhoneNumber(phoneNumber, selectedCountry.dialCode);
    if (!validation.isValid) {
      setValidationError(validation.error);
      return;
    }

    // 2. Validate Message
    if (!message || !message.trim()) {
      setValidationError('Please enter a marketing message before sending.');
      return;
    }

    const cleanPhone = validation.cleaned;
    const finalMessage = message.trim();

    // 3. Construct WhatsApp URL using direct engine (bypasses intermediate landing page)
    const waUrl = generateWhatsAppUrl(cleanPhone, finalMessage, dispatchEngine);

    // 4. Open in dedicated popup window
    if (popupRef.current && !popupRef.current.closed) {
      try {
        popupRef.current.close();
      } catch {}
    }

    const screenWidth = window.screen.availWidth || 1280;
    const screenHeight = window.screen.availHeight || 800;
    const width = Math.min(1040, Math.floor(screenWidth * 0.78));
    const height = Math.min(780, Math.floor(screenHeight * 0.86));
    const left = Math.max(10, Math.floor((screenWidth - width) / 2));
    const top = Math.max(10, Math.floor((screenHeight - height) / 2));

    let win = null;
    try {
      win = window.open(
        waUrl,
        'whatsapp_quick_popup',
        `width=${width},height=${height},left=${left},top=${top},status=no,toolbar=no,menubar=no,location=yes,resizable=yes,scrollbars=yes`
      );
      if (win) {
        popupRef.current = win;
        try { win.focus(); } catch {}
      }
    } catch {
      win = window.open(waUrl, '_blank');
    }

    // 5. Provide feedback and log activity
    const successDetails = {
      phone: cleanPhone,
      displayPhone: `+${cleanPhone}`,
      name: recipientName || 'Recipient',
      messagePreview: finalMessage.substring(0, 80) + (finalMessage.length > 80 ? '...' : ''),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      url: waUrl,
      engine: 'WhatsApp Web Popup'
    };

    setSuccessInfo(successDetails);

    if (onLogActivity) {
      onLogActivity({
        type: 'Single Send',
        recipient: recipientName || `+${cleanPhone}`,
        phone: `+${cleanPhone}`,
        message: finalMessage,
        status: `Opened in ${successDetails.engine}`,
        timestamp: new Date().toISOString()
      });
    }
  };

  const filteredCountries = COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
      c.dialCode.includes(countrySearch) ||
      c.code.toLowerCase().includes(countrySearch.toLowerCase())
  );

  return (
    <div className="sender-layout">
      {/* Left Column: Input Form & Composer */}
      <div className="composer-card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Send WhatsApp Message</h2>
            <p className="card-subtitle">
              Enter recipient mobile number and compose marketing message.
            </p>
          </div>
          {/* Quick template selector */}
          <div className="template-quick-pick">
            <span className="text-xs text-slate-500 font-medium">Template:</span>
            <select
              className="select-template-dropdown"
              onChange={(e) => handleLoadTemplate(e.target.value)}
              defaultValue="special-discount"
            >
              {DEFAULT_TEMPLATES.map((tmpl) => (
                <option key={tmpl.id} value={tmpl.id}>
                  {tmpl.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <form onSubmit={handleSendMessage} className="composer-form">
          {/* Recipient Details Row */}
          <div className="form-grid-2">
            {/* Recipient Name (Optional) */}
            <div className="form-group">
              <label htmlFor="quick-recipient-name" className="form-label">
                Recipient Name <span className="label-optional">(Optional)</span>
              </label>
              <input
                id="quick-recipient-name"
                type="text"
                className="form-input"
                placeholder="e.g. Aarav Sharma"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
              />
            </div>

            {/* Mobile Number with Country Code */}
            <div className="form-group">
              <label htmlFor="quick-phone-input" className="form-label">
                Mobile Number <span className="label-required">*</span>
              </label>

              <div className="phone-input-combo">
                {/* Country Selector Dropdown */}
                <div className="country-dropdown-wrapper">
                  <button
                    type="button"
                    className="country-select-btn"
                    onClick={() => setCountryDropdownOpen(!countryDropdownOpen)}
                    title="Change Country Code"
                  >
                    <span className="country-flag">{selectedCountry.flag}</span>
                    <span className="country-dial">{selectedCountry.dialCode}</span>
                    <ChevronDown size={14} className="dropdown-caret" />
                  </button>

                  {countryDropdownOpen && (
                    <div className="country-dropdown-menu">
                      <div className="country-search-box">
                        <input
                          type="text"
                          placeholder="Search country or code..."
                          value={countrySearch}
                          onChange={(e) => setCountrySearch(e.target.value)}
                          autoFocus
                          className="country-search-input"
                        />
                      </div>
                      <div className="country-list-scroll">
                        {filteredCountries.map((c) => (
                          <button
                            key={c.code}
                            type="button"
                            className={`country-item ${
                              c.code === selectedCountry.code ? 'selected' : ''
                            }`}
                            onClick={() => {
                              setSelectedCountry(c);
                              setCountryDropdownOpen(false);
                              setCountrySearch('');
                            }}
                          >
                            <span className="item-flag">{c.flag}</span>
                            <span className="item-name">{c.name}</span>
                            <span className="item-dial">{c.dialCode}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actual Phone Input */}
                <input
                  id="quick-phone-input"
                  type="tel"
                  className="form-input phone-number-input"
                  placeholder={selectedCountry.placeholder || 'e.g. 98765 43210 or +91 9876543210'}
                  value={phoneNumber}
                  onChange={(e) => {
                    setPhoneNumber(e.target.value);
                    if (validationError) setValidationError('');
                  }}
                  required
                />
              </div>
              <span className="field-hint">
                Include country code or select from dropdown (e.g. {selectedCountry.dialCode} 9876543210)
              </span>
            </div>
          </div>

          {/* Validation Alert */}
          {validationError && (
            <div className="alert-box alert-error animate-fade-in" role="alert">
              <AlertCircle size={18} className="shrink-0" />
              <div className="alert-content">
                <strong>Validation Error:</strong> {validationError}
              </div>
            </div>
          )}

          {/* Success Banner when Click-to-Chat is Triggered */}
          {successInfo && (
            <div className="alert-box alert-success animate-fade-in" role="status">
              <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
              <div className="alert-content">
                <p>
                  <strong>WhatsApp Conversation Opened Directly!</strong> Message prepared for{' '}
                  <span className="font-semibold">{successInfo.displayPhone}</span> ({successInfo.name}).
                </p>
                <div className="mt-1 flex items-center gap-3">
                  <a
                    href={successInfo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-emerald-700 underline font-medium"
                  >
                    Reopen in WhatsApp <ExternalLink size={12} />
                  </a>
                  <button
                    type="button"
                    className="text-xs text-rose-600 hover:underline flex items-center gap-1 font-medium ml-2"
                    onClick={() => {
                      if (popupRef.current && !popupRef.current.closed) {
                        popupRef.current.close();
                      }
                    }}
                  >
                    <X size={12} /> Close Popup Window
                  </button>
                  <span className="text-xs text-slate-500">
                    Mode: {successInfo.engine}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Message Text Area */}
          <div className="form-group">
            <div className="message-label-row">
              <label htmlFor="quick-message-textarea" className="form-label">
                Message Text <span className="label-required">*</span>
              </label>

              {/* Formatting Toolbar */}
              <div className="formatting-toolbar">
                <button
                  type="button"
                  className="format-btn"
                  onClick={() => insertFormatting('*')}
                  title="Bold (*text*)"
                >
                  <Bold size={14} />
                </button>
                <button
                  type="button"
                  className="format-btn"
                  onClick={() => insertFormatting('_')}
                  title="Italic (_text_)"
                >
                  <Italic size={14} />
                </button>
                <button
                  type="button"
                  className="format-btn"
                  onClick={() => insertFormatting('~')}
                  title="Strikethrough (~text~)"
                >
                  <Strikethrough size={14} />
                </button>
                <button
                  type="button"
                  className="format-btn"
                  onClick={() => insertFormatting('```')}
                  title="Monospace (```code```)"
                >
                  <Code size={14} />
                </button>
              </div>
            </div>

            {/* Quick Emoji Shelf */}
            <div className="emoji-shelf">
              <span className="emoji-shelf-label">
                <Smile size={13} /> Quick Emojis:
              </span>
              <div className="emoji-pills">
                {QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className="emoji-pill-btn"
                    onClick={() => insertEmoji(emoji)}
                    title={`Insert ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Multiline textarea */}
            <textarea
              id="quick-message-textarea"
              rows={7}
              className="form-textarea message-composer-box"
              placeholder="Write your promotional or customer communication message here..."
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                if (validationError) setValidationError('');
              }}
              required
            />

            {/* Extras: Opt-Out Footer Toggle */}
            <div className="composer-options-bar">
              <label className="checkbox-label" title="Appends a standard unsubscribe prompt">
                <input
                  type="checkbox"
                  checked={includeOptOut || message.includes('Reply STOP to unsubscribe')}
                  onChange={(e) => handleOptOutToggle(e.target.checked)}
                  className="custom-checkbox"
                />
                <span className="checkbox-text">
                  Include Opt-out prompt (<em>"Reply STOP to unsubscribe"</em>)
                </span>
              </label>

              <div className="opt-out-info-tooltip" title="Required for WhatsApp commercial policy compliance">
                <Info size={14} className="text-slate-400" />
              </div>
            </div>
          </div>

          {/* Dispatch Target Engine Switcher (Direct WhatsApp Web vs App vs wa.me) */}
          <div className="dispatch-engine-box">
            <span className="dispatch-engine-label">
              <Zap size={14} className="text-amber-500" />
              Launch Target:
            </span>
            <div className="engine-pills">
              <button
                type="button"
                className={`engine-pill-btn ${dispatchEngine === 'web' ? 'active' : ''}`}
                onClick={() => setDispatchEngine('web')}
                title="Bypasses intermediate screen and opens WhatsApp Web chat directly"
              >
                <Globe size={13} />
                <span>Direct WhatsApp Web (Auto-Opens)</span>
              </button>
              <button
                type="button"
                className={`engine-pill-btn ${dispatchEngine === 'app' ? 'active' : ''}`}
                onClick={() => setDispatchEngine('app')}
                title="Opens installed Windows/Mac WhatsApp desktop app directly"
              >
                <Smartphone size={13} />
                <span>WhatsApp Desktop App</span>
              </button>
              <button
                type="button"
                className={`engine-pill-btn ${dispatchEngine === 'universal' ? 'active' : ''}`}
                onClick={() => setDispatchEngine('universal')}
                title="Standard wa.me universal redirect"
              >
                <span>wa.me</span>
              </button>
            </div>
          </div>

          {/* Action Buttons: Send WhatsApp & Clear */}
          <div className="action-buttons-row">
            <button
              id="btn-send-whatsapp"
              type="submit"
              className="btn-send-whatsapp"
              title="Open WhatsApp with prefilled message"
            >
              {/* WhatsApp Official Style SVG Icon */}
              <svg
                viewBox="0 0 24 24"
                width="22"
                height="22"
                fill="currentColor"
                className="whatsapp-btn-icon"
              >
                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.669-.699c.969.54 1.772.82 2.791.82 3.181 0 5.768-2.587 5.768-5.767 0-3.18-2.587-5.765-5.768-5.765zm0 10.373c-.933 0-1.74-.271-2.438-.727l-.175-.114-1.579.414.421-1.54-.12-.191c-.496-.787-.79-1.538-.79-2.449 0-2.54 2.067-4.607 4.682-4.607 2.614 0 4.681 2.067 4.681 4.607 0 2.54-2.067 4.607-4.682 4.607z" />
                <path d="M17.472 14.382c-.301-.15-1.782-.88-2.058-.98-.276-.1-.476-.15-.677.15-.201.3-.777.98-.953 1.18-.176.2-.352.225-.653.075-.301-.15-1.272-.469-2.423-1.496-.895-.798-1.5-1.784-1.676-2.085-.176-.3-.019-.462.132-.612.136-.135.301-.35.452-.525.15-.175.201-.3.301-.5.101-.2.05-.375-.025-.525s-.677-1.633-.928-2.238c-.244-.59-.493-.51-.677-.519l-.578-.01c-.201 0-.527.075-.803.375s-1.054 1.03-1.054 2.513 1.079 2.914 1.23 3.115c.15.2 2.124 3.243 5.145 4.549.718.311 1.279.497 1.716.636.721.23 1.377.197 1.896.12.578-.087 1.782-.728 2.033-1.431.251-.703.251-1.306.176-1.431-.076-.126-.276-.201-.577-.351z" />
              </svg>
              <span>Open Direct in WhatsApp</span>
            </button>

            <button
              id="btn-clear-fields"
              type="button"
              className="btn-clear-fields"
              onClick={handleClear}
              title="Clear phone number and message"
            >
              <RotateCcw size={17} />
              <span>Clear</span>
            </button>
          </div>
        </form>
      </div>

      {/* Right Column: Simulated WhatsApp Message Preview */}
      <div className="preview-column">
        <MessagePreview
          message={message}
          recipientName={recipientName || 'Customer'}
          recipientPhone={
            phoneNumber
              ? `${selectedCountry.dialCode} ${phoneNumber}`
              : `${selectedCountry.dialCode} 9876543210`
          }
        />
      </div>
    </div>
  );
}

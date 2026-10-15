import React from 'react';
import { CheckCheck, Phone, Video, MoreVertical, Smartphone } from 'lucide-react';

/**
 * Parses WhatsApp markdown formatted text:
 * *bold* -> <strong>
 * _italic_ -> <em>
 * ~strike~ -> <del>
 * ```code``` -> <code>
 * URLs -> styled links
 */
export function renderFormattedWhatsAppText(text) {
  if (!text) return null;

  // Split lines
  const lines = text.split('\n');

  return lines.map((line, lineIdx) => {
    // Process markdown inline tokens
    // We can use a regex tokenizer
    const parts = [];
    let remaining = line;
    let keyIdx = 0;

    // Pattern for URLs, bold, italic, strikethrough, monospace
    const tokenRegex = /(https?:\/\/[^\s]+)|(\*([^*]+)\*)|(_([^_]+)_)|(~([^~]+)~)|(```([^`]+)```)/g;
    let match;
    let lastIndex = 0;

    while ((match = tokenRegex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        parts.push(line.substring(lastIndex, match.index));
      }

      if (match[1]) {
        // URL
        parts.push(
          <a
            key={`${lineIdx}-${keyIdx++}`}
            href={match[1]}
            target="_blank"
            rel="noopener noreferrer"
            className="chat-preview-link"
          >
            {match[1]}
          </a>
        );
      } else if (match[2]) {
        // Bold *text*
        parts.push(<strong key={`${lineIdx}-${keyIdx++}`}>{match[3]}</strong>);
      } else if (match[4]) {
        // Italic _text_
        parts.push(<em key={`${lineIdx}-${keyIdx++}`}>{match[5]}</em>);
      } else if (match[6]) {
        // Strikethrough ~text~
        parts.push(<del key={`${lineIdx}-${keyIdx++}`}>{match[7]}</del>);
      } else if (match[8]) {
        // Monospace ```text```
        parts.push(
          <code key={`${lineIdx}-${keyIdx++}`} className="chat-preview-mono">
            {match[9]}
          </code>
        );
      }

      lastIndex = tokenRegex.lastIndex;
    }

    if (lastIndex < line.length) {
      parts.push(line.substring(lastIndex));
    }

    return (
      <span key={lineIdx} className="chat-preview-line">
        {parts.length > 0 ? parts : <br />}
        {lineIdx < lines.length - 1 && <br />}
      </span>
    );
  });
}

export default function MessagePreview({
  message = '',
  recipientName = 'Customer',
  recipientPhone = '',
  currentTime = '11:45 AM',
  mediaImage = null
}) {
  const charCount = message.length;
  const wordCount = message.trim() ? message.trim().split(/\s+/).length : 0;

  return (
    <div className="preview-container">
      <div className="preview-header-bar">
        <div className="preview-title-badge">
          <Smartphone size={16} className="text-emerald-500" />
          <span>Live WhatsApp Preview</span>
        </div>
        <div className="preview-stats">
          {mediaImage && (
            <span className="stat-pill bg-emerald-100 text-emerald-700 font-semibold border-emerald-300">
              🖼️ Image Flyer
            </span>
          )}
          <span className="stat-pill">{charCount} chars</span>
          <span className="stat-pill">{wordCount} words</span>
        </div>
      </div>

      {/* WhatsApp Simulated Device / Screen */}
      <div className="whatsapp-screen">
        {/* WhatsApp Chat Top Header */}
        <div className="whatsapp-chat-header">
          <div className="contact-info-group">
            <div className="avatar-circle">
              {recipientName ? recipientName.charAt(0).toUpperCase() : 'C'}
            </div>
            <div className="contact-details">
              <span className="contact-name">
                {recipientName || 'Customer'}
              </span>
              <span className="contact-subtext">
                {recipientPhone || 'online'}
              </span>
            </div>
          </div>
          <div className="chat-header-actions">
            <span className="header-action-btn" title="Voice Call">
              <Phone size={18} />
            </span>
            <span className="header-action-btn" title="Video Call">
              <Video size={19} />
            </span>
            <span className="header-action-btn" title="Menu">
              <MoreVertical size={18} />
            </span>
          </div>
        </div>

        {/* WhatsApp Chat Canvas with wallpaper */}
        <div className="whatsapp-chat-canvas">
          <div className="chat-date-chip">
            <span>TODAY</span>
          </div>

          <div className="chat-encryption-notice">
            <span>🔒 Messages are end-to-end encrypted. No one outside of this chat can read or listen to them.</span>
          </div>

          {message || mediaImage ? (
            <div className="chat-bubble-row sender-row">
              <div className="chat-bubble sender-bubble">
                {mediaImage && (
                  <div className="whatsapp-media-preview-box">
                    <img src={mediaImage} alt="Marketing Attachment" className="whatsapp-bubble-img" />
                  </div>
                )}
                {message && (
                  <div className="bubble-content">
                    {renderFormattedWhatsAppText(message)}
                  </div>
                )}
                <div className="bubble-meta">
                  <span className="bubble-time">{currentTime}</span>
                  <span className="bubble-ticks" title="Read receipts">
                    <CheckCheck size={15} className="blue-tick" />
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-preview-prompt">
              <p>Type your message on the left or attach an image flyer to see the instant live preview here ✨</p>
              <span className="hint-text">Supports *bold*, _italic_, ~strikethrough~, and links</span>
            </div>
          )}
        </div>

        {/* Mock input bar */}
        <div className="whatsapp-mock-input-bar">
          <div className="mock-input-field">
            <span>Type a message</span>
          </div>
          <div className="mock-send-btn">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M1.101 21.757L23.8 12.028 1.101 2.3 1 9.873l15 2.155-15 2.155z"></path>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

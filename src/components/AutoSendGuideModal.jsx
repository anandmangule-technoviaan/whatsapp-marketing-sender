import React, { useState } from 'react';
import { Zap, Copy, Check, X, ExternalLink, ShieldCheck, HelpCircle } from 'lucide-react';

export default function AutoSendGuideModal({ isOpen, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const scriptCode = `// WhatsApp Web 100% Zero-Click Auto-Send Script
// Paste in Chrome DevTools Console (F12) while on web.whatsapp.com
setInterval(() => {
  const sendButton = document.querySelector('button[aria-label="Send"], span[data-icon="send"]')?.closest('button');
  if (sendButton && !sendButton.disabled) {
    sendButton.click();
    console.log("⚡ Auto-sent message successfully!");
  }
}, 1000);`;

  const handleCopy = () => {
    navigator.clipboard.writeText(scriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-icon-group">
            <div className="icon-shield-wrapper bg-amber-100 text-amber-600">
              <Zap size={22} />
            </div>
            <div>
              <h3 className="modal-title">100% Hands-Free Auto-Send Guide</h3>
              <p className="modal-subtitle">Auto-press the Send button inside WhatsApp Web</p>
            </div>
          </div>
          <button className="btn-close-modal" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body space-y-4">
          <p className="text-sm text-slate-600">
            Our app now <strong>automatically cycles through your contacts</strong>, opens WhatsApp Web directly, and pre-fills each message.
          </p>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-2">
            <div className="font-bold text-slate-800">
              Optional: Make WhatsApp Web auto-click the Send button (Zero-Click):
            </div>
            <ol className="list-decimal pl-4 space-y-1.5 text-slate-600">
              <li>Open <strong>WhatsApp Web</strong> (<a href="https://web.whatsapp.com" target="_blank" rel="noreferrer" className="text-emerald-600 underline">web.whatsapp.com</a>) in your browser.</li>
              <li>Press <kbd className="px-1.5 py-0.5 bg-slate-200 rounded text-xs font-mono">F12</kbd> (or right-click ➔ <em>Inspect</em>) and click the <strong>Console</strong> tab.</li>
              <li>Copy and paste the snippet below, then press <kbd className="px-1.5 py-0.5 bg-slate-200 rounded text-xs font-mono">Enter</kbd>:</li>
            </ol>
          </div>

          <div className="relative">
            <pre className="bg-slate-900 text-emerald-400 p-3 rounded-lg text-xs font-mono overflow-x-auto whitespace-pre-wrap">
              {scriptCode}
            </pre>
            <button
              type="button"
              className="absolute top-2 right-2 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs flex items-center gap-1 border border-slate-700"
              onClick={handleCopy}
            >
              {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              <span>{copied ? 'Copied!' : 'Copy Code'}</span>
            </button>
          </div>

          <p className="text-xs text-slate-500">
            💡 Once pasted, WhatsApp Web will automatically click the green Send arrow as soon as each customer chat loads!
          </p>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-primary" onClick={onClose}>
            Got it, Let's Send!
          </button>
        </div>
      </div>
    </div>
  );
}

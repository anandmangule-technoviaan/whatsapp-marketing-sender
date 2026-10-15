import React from 'react';
import { ShieldCheck, CheckCircle2, AlertTriangle, X, Lock, ExternalLink } from 'lucide-react';

export default function ComplianceModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-icon-group">
            <div className="icon-shield-wrapper">
              <ShieldCheck size={24} className="text-emerald-600" />
            </div>
            <div>
              <h2 className="modal-title">Responsible Marketing & Privacy Guidelines</h2>
              <p className="modal-subtitle">Official WhatsApp Best Practices & Legal Compliance</p>
            </div>
          </div>
          <button className="btn-close-modal" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body space-y-4">
          <div className="compliance-banner-info">
            <Lock size={18} />
            <p>
              This application utilizes the official <strong>WhatsApp Click-to-Chat</strong> standard (<code>wa.me</code>). It does not access private WhatsApp APIs, scrape contacts, or bypass WhatsApp security verification.
            </p>
          </div>

          <div className="compliance-grid">
            <div className="compliance-card allowed">
              <div className="compliance-card-header">
                <CheckCircle2 size={20} className="text-emerald-500" />
                <h3>Mandatory Requirements</h3>
              </div>
              <ul>
                <li>
                  <strong>Prior Explicit Consent:</strong> Only send promotional messages to customers who have willingly opted in to receive communications.
                </li>
                <li>
                  <strong>Clear Opt-Out Method:</strong> Always provide an unsubscribe prompt (e.g., <em>"Reply STOP to unsubscribe"</em>) in marketing messages.
                </li>
                <li>
                  <strong>Accurate Identity:</strong> State your company or personal name clearly so recipients know who contacted them.
                </li>
                <li>
                  <strong>Value-Driven Content:</strong> Send relevant promotions, receipts, order updates, or invitations rather than repetitive generic ads.
                </li>
              </ul>
            </div>

            <div className="compliance-card forbidden">
              <div className="compliance-card-header">
                <AlertTriangle size={20} className="text-amber-500" />
                <h3>Strictly Prohibited</h3>
              </div>
              <ul>
                <li>
                  <strong>Cold Unsolicited Messaging:</strong> Do not buy random phone lists or message numbers without prior business relationship.
                </li>
                <li>
                  <strong>Automated Bot Spam:</strong> Automated bulk bots risk instant permanent WhatsApp account bans.
                </li>
                <li>
                  <strong>Deceptive Offers or Phishing:</strong> Never misrepresent discounts, pricing, or identity.
                </li>
                <li>
                  <strong>Ignoring Opt-Outs:</strong> If a customer replies "STOP" or asks to be removed, immediately remove them from your contact lists.
                </li>
              </ul>
            </div>
          </div>

          <div className="compliance-footer-note">
            <p>
              By proceeding, you agree to comply with WhatsApp's Business Messaging Policy and local privacy laws (e.g. TCPA, GDPR, Indian DPDP Act).
            </p>
            <a
              href="https://www.whatsapp.com/legal/business-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="policy-link"
            >
              Read WhatsApp Business Messaging Policy <ExternalLink size={14} />
            </a>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-primary" onClick={onClose}>
            I Understand & Agree
          </button>
        </div>
      </div>
    </div>
  );
}

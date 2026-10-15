import React, { useState, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  Trash2,
  Plus,
  Download,
  AlertCircle,
  CheckCircle2,
  Search,
  Filter,
  UserPlus,
  Send,
  X
} from 'lucide-react';
import { validatePhoneNumber, getSampleCSV } from '../utils/whatsapp';
import { COUNTRIES, DEFAULT_COUNTRY } from '../utils/countries';

export default function ContactImporter({
  contacts,
  setContacts,
  onStartCampaignWithContacts
}) {
  const [dragActive, setDragActive] = useState(false);
  const [defaultCountry, setDefaultCountry] = useState(DEFAULT_COUNTRY);
  const [searchQuery, setSearchQuery] = useState('');
  const [importStats, setImportStats] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', phone: '', company: '' });

  const fileInputRef = useRef(null);

  // Helper to parse CSV string into objects
  const parseCSVString = (csvText) => {
    const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return [];

    // Header row
    const firstLine = lines[0];
    const headers = firstLine.split(',').map((h) => h.trim().replace(/^["']|["']$/g, '').toLowerCase());

    // Identify phone, name, and company columns
    let phoneColIdx = headers.findIndex((h) =>
      ['phone', 'mobile', 'cell', 'number', 'whatsapp', 'contact', 'telephone', 'mobile number', 'phone number'].some(
        (key) => h.includes(key)
      )
    );
    let nameColIdx = headers.findIndex((h) =>
      ['name', 'full name', 'customer', 'customer name', 'client', 'contact name'].some((key) =>
        h.includes(key)
      )
    );
    let companyColIdx = headers.findIndex((h) =>
      ['company', 'organization', 'business', 'notes'].some((key) => h.includes(key))
    );

    // If headers don't match, or if there's only 1 column, default to col 0 as phone
    if (phoneColIdx === -1) {
      phoneColIdx = 0;
    }

    const parsedRows = [];
    const startIndex = headers.some((h) => /\d{5,}/.test(h)) ? 0 : 1; // if header actually contains data

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      // Basic CSV split respecting quotes
      const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map((v) =>
        v.trim().replace(/^["']|["']$/g, '')
      );

      const phoneVal = values[phoneColIdx] || '';
      const nameVal = nameColIdx !== -1 ? values[nameColIdx] : '';
      const companyVal = companyColIdx !== -1 ? values[companyColIdx] : '';

      if (phoneVal) {
        parsedRows.push({
          rawPhone: phoneVal,
          name: nameVal,
          company: companyVal
        });
      }
    }

    return parsedRows;
  };

  const processAndAddContacts = (rawList) => {
    setErrorMsg('');
    if (!rawList || rawList.length === 0) {
      setErrorMsg('No contact records found in this file.');
      return;
    }

    let addedCount = 0;
    let duplicateCount = 0;
    let invalidCount = 0;

    const existingPhones = new Set(contacts.map((c) => c.phone));
    const newContactsList = [...contacts];

    rawList.forEach((row, idx) => {
      const validation = validatePhoneNumber(row.rawPhone, defaultCountry.dialCode);

      if (!validation.isValid) {
        invalidCount++;
        return;
      }

      const cleanNum = validation.cleaned;

      if (existingPhones.has(cleanNum)) {
        duplicateCount++;
        return;
      }

      existingPhones.add(cleanNum);
      newContactsList.push({
        id: `contact-${Date.now()}-${idx}`,
        name: row.name || `Customer ${newContactsList.length + 1}`,
        phone: cleanNum,
        rawPhone: row.rawPhone,
        company: row.company || '',
        createdAt: new Date().toLocaleDateString()
      });
      addedCount++;
    });

    setContacts(newContactsList);
    setImportStats({
      added: addedCount,
      duplicates: duplicateCount,
      invalid: invalidCount,
      totalNow: newContactsList.length
    });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        const parsed = parseCSVString(content);
        processAndAddContacts(parsed);
      }
    };
    reader.readAsText(file);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result;
        if (typeof content === 'string') {
          const parsed = parseCSVString(content);
          processAndAddContacts(parsed);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleDownloadSampleCSV = () => {
    const sample = getSampleCSV();
    const encoded = encodeURI('data:text/csv;charset=utf-8,' + sample);
    const link = document.createElement('a');
    link.setAttribute('href', encoded);
    link.setAttribute('download', 'sample_contacts.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteContact = (id) => {
    setContacts(contacts.filter((c) => c.id !== id));
  };

  const handleClearAllContacts = () => {
    if (window.confirm('Are you sure you want to delete all contacts?')) {
      setContacts([]);
      setImportStats(null);
    }
  };

  const handleAddSingleContact = (e) => {
    e.preventDefault();
    const val = validatePhoneNumber(newContact.phone, defaultCountry.dialCode);
    if (!val.isValid) {
      alert(`Invalid phone number: ${val.error}`);
      return;
    }

    if (contacts.some((c) => c.phone === val.cleaned)) {
      alert('This phone number already exists in your contacts.');
      return;
    }

    setContacts([
      ...contacts,
      {
        id: `contact-man-${Date.now()}`,
        name: newContact.name || `Customer ${contacts.length + 1}`,
        phone: val.cleaned,
        rawPhone: newContact.phone,
        company: newContact.company || '',
        createdAt: new Date().toLocaleDateString()
      }
    ]);

    setNewContact({ name: '', phone: '', company: '' });
    setShowAddModal(false);
  };

  // Filtered contacts by search
  const filteredContacts = contacts.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.company && c.company.toLowerCase().includes(q))
    );
  });

  return (
    <div className="importer-container space-y-6">
      {/* Top Section: Upload Area & Controls */}
      <div className="importer-card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Import Customer Contacts</h2>
            <p className="card-subtitle">
              Upload your customer list via CSV file. Duplicate numbers are automatically detected and filtered out.
            </p>
          </div>
          <div className="importer-top-actions">
            <button
              type="button"
              className="btn-control-secondary"
              onClick={handleDownloadSampleCSV}
              title="Download formatted sample CSV file"
            >
              <Download size={15} />
              <span>Sample CSV</span>
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => setShowAddModal(true)}
            >
              <Plus size={16} />
              <span>Add Single Contact</span>
            </button>
          </div>
        </div>

        {/* Drag & Drop Zone */}
        <div
          className={`upload-dropzone ${dragActive ? 'dropzone-active' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv, text/csv, .txt"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
          <div className="dropzone-content">
            <div className="upload-icon-circle">
              <Upload size={28} className="text-emerald-600" />
            </div>
            <h4 className="upload-heading">Click or Drag & Drop CSV File Here</h4>
            <p className="upload-desc">
              Supports <code>.csv</code> and <code>.txt</code> with columns for Mobile Number, Name, and Company.
            </p>
            <div className="upload-badge-row">
              <span className="upload-pill">Auto-Duplicate Removal</span>
              <span className="upload-pill">E.164 Clean Format</span>
              <span className="upload-pill">Client-side Only (Private)</span>
            </div>
          </div>
        </div>

        {/* Feedback Alert on Import */}
        {importStats && (
          <div className="alert-box alert-success animate-fade-in mt-4">
            <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
            <div>
              <strong>Import Finished:</strong> Successfully added{' '}
              <span className="font-bold">{importStats.added}</span> contacts!
              {importStats.duplicates > 0 && (
                <span className="ml-1 text-slate-600">
                  ({importStats.duplicates} duplicates removed)
                </span>
              )}
              {importStats.invalid > 0 && (
                <span className="ml-1 text-amber-600">
                  ({importStats.invalid} invalid numbers skipped)
                </span>
              )}
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="alert-box alert-error animate-fade-in mt-4">
            <AlertCircle size={18} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Contacts List Table */}
      <div className="contacts-list-card">
        <div className="contacts-toolbar">
          <div className="contacts-toolbar-left">
            <h3 className="font-bold text-slate-800 text-lg">
              Contact Directory ({contacts.length})
            </h3>
            <span className="text-xs text-slate-500">
              Ready for one-click campaign loading
            </span>
          </div>

          <div className="contacts-toolbar-right">
            {/* Search Box */}
            <div className="search-input-wrapper">
              <Search size={15} className="search-icon" />
              <input
                type="text"
                placeholder="Search name, phone, company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={() => setSearchQuery('')}
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {contacts.length > 0 && (
              <>
                <button
                  type="button"
                  className="btn-send-campaign-direct"
                  onClick={onStartCampaignWithContacts}
                  title="Load these contacts into a new bulk campaign"
                >
                  <Send size={15} />
                  <span>Start Campaign with These ({contacts.length})</span>
                </button>

                <button
                  type="button"
                  className="btn-clear-all"
                  onClick={handleClearAllContacts}
                  title="Remove all imported contacts"
                >
                  <Trash2 size={15} />
                  <span>Clear All</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Contacts Table */}
        {contacts.length > 0 ? (
          <div className="table-responsive">
            <table className="contacts-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Customer Name</th>
                  <th>Mobile Number (Clean E.164)</th>
                  <th>Company / Tag</th>
                  <th>Date Added</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredContacts.map((c, idx) => (
                  <tr key={c.id} className="contacts-table-row">
                    <td className="font-mono text-xs text-slate-400">{idx + 1}</td>
                    <td className="font-semibold text-slate-800">{c.name}</td>
                    <td>
                      <span className="font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-xs">
                        +{c.phone}
                      </span>
                    </td>
                    <td className="text-slate-600 text-sm">{c.company || '—'}</td>
                    <td className="text-slate-400 text-xs">{c.createdAt}</td>
                    <td className="text-right">
                      <button
                        type="button"
                        className="btn-delete-row"
                        onClick={() => handleDeleteContact(c.id)}
                        title="Delete contact"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-contacts-state">
            <FileSpreadsheet size={48} className="text-slate-300 mx-auto" />
            <h4 className="font-semibold text-slate-700 mt-2">No Contacts Imported Yet</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Upload a CSV file above or click "Add Single Contact" to build your customer marketing list.
            </p>
          </div>
        )}
      </div>

      {/* Add Single Contact Modal */}
      {showAddModal && (
        <div className="modal-backdrop">
          <div className="modal-dialog max-w-md">
            <div className="modal-header">
              <h3 className="modal-title">Add Customer Contact</h3>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setShowAddModal(false)}
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddSingleContact}>
              <div className="modal-body space-y-3">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Priya Patel"
                    value={newContact.name}
                    onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Mobile Number <span className="label-required">*</span>
                  </label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="e.g. +91 9876543210 or 9876543210"
                    value={newContact.phone}
                    onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                    required
                  />
                  <span className="field-hint">
                    Default country prefix: {defaultCountry.dialCode}
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label">Company / Note (Optional)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Apex Studio"
                    value={newContact.company}
                    onChange={(e) => setNewContact({ ...newContact, company: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

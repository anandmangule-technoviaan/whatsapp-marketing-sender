import React, { useState } from 'react';
import {
  History,
  Download,
  Trash2,
  CheckCircle2,
  Send,
  Users,
  Search,
  ExternalLink,
  Clock,
  Filter
} from 'lucide-react';

export default function CampaignAnalytics({ activityLogs = [], onClearLogs }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const totalLogs = activityLogs.length;
  const completedLogs = activityLogs.filter((l) => l.status.includes('Completed') || l.status.includes('Sent')).length;
  const uniqueRecipients = new Set(activityLogs.map((l) => l.phone)).size;
  const campaignMessages = activityLogs.filter((l) => l.type.includes('Campaign')).length;

  const handleExportCSV = () => {
    if (activityLogs.length === 0) return;

    const headers = ['Type,Recipient,Phone,Status,Message Preview,Timestamp'];
    const rows = activityLogs.map((log) => {
      const cleanMsg = (log.message || '').replace(/"/g, '""').replace(/\n/g, ' ');
      return `"${log.type}","${log.recipient}","${log.phone}","${log.status}","${cleanMsg}","${log.timestamp}"`;
    });

    const csvData = 'data:text/csv;charset=utf-8,' + headers.concat(rows).join('\n');
    const encoded = encodeURI(csvData);
    const link = document.createElement('a');
    link.setAttribute('href', encoded);
    link.setAttribute('download', `WhatsApp_Activity_Log_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredLogs = activityLogs.filter((log) => {
    const q = searchQuery.toLowerCase();
    const matchQuery =
      log.recipient.toLowerCase().includes(q) ||
      log.phone.toLowerCase().includes(q) ||
      (log.message && log.message.toLowerCase().includes(q));

    const matchType =
      typeFilter === 'all' ||
      (typeFilter === 'single' && log.type.includes('Single')) ||
      (typeFilter === 'campaign' && log.type.includes('Campaign'));

    return matchQuery && matchType;
  });

  return (
    <div className="analytics-container space-y-6">
      {/* Top Stats Overview */}
      <div className="analytics-stats-grid">
        <div className="analytics-stat-card">
          <div className="stat-icon-wrapper bg-emerald-100 text-emerald-600">
            <Send size={20} />
          </div>
          <div>
            <span className="analytics-stat-label">Total Dispatched</span>
            <span className="analytics-stat-val">{totalLogs}</span>
          </div>
        </div>

        <div className="analytics-stat-card">
          <div className="stat-icon-wrapper bg-teal-100 text-teal-600">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <span className="analytics-stat-label">Confirmed Sent</span>
            <span className="analytics-stat-val text-emerald-600">{completedLogs}</span>
          </div>
        </div>

        <div className="analytics-stat-card">
          <div className="stat-icon-wrapper bg-blue-100 text-blue-600">
            <Users size={20} />
          </div>
          <div>
            <span className="analytics-stat-label">Unique Recipients</span>
            <span className="analytics-stat-val">{uniqueRecipients}</span>
          </div>
        </div>

        <div className="analytics-stat-card">
          <div className="stat-icon-wrapper bg-purple-100 text-purple-600">
            <History size={20} />
          </div>
          <div>
            <span className="analytics-stat-label">Campaign Messages</span>
            <span className="analytics-stat-val">{campaignMessages}</span>
          </div>
        </div>
      </div>

      {/* Main Activity Table Card */}
      <div className="importer-card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Activity Logs & Sent History</h2>
            <p className="card-subtitle">
              Audit trail of every message opened or confirmed in WhatsApp. Stored securely on your local device.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn-control-secondary"
              onClick={handleExportCSV}
              disabled={activityLogs.length === 0}
            >
              <Download size={15} />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              className="btn-clear-all"
              onClick={onClearLogs}
              disabled={activityLogs.length === 0}
            >
              <Trash2 size={15} />
              <span>Clear History</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="contacts-toolbar">
          <div className="source-tabs-pills">
            <button
              type="button"
              className={`source-pill ${typeFilter === 'all' ? 'active' : ''}`}
              onClick={() => setTypeFilter('all')}
            >
              All Events ({totalLogs})
            </button>
            <button
              type="button"
              className={`source-pill ${typeFilter === 'single' ? 'active' : ''}`}
              onClick={() => setTypeFilter('single')}
            >
              Single Sends
            </button>
            <button
              type="button"
              className={`source-pill ${typeFilter === 'campaign' ? 'active' : ''}`}
              onClick={() => setTypeFilter('campaign')}
            >
              Campaigns
            </button>
          </div>

          <div className="search-input-wrapper max-w-xs">
            <Search size={15} className="search-icon" />
            <input
              type="text"
              placeholder="Search recipient or message..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        {/* Table */}
        {activityLogs.length > 0 ? (
          <div className="table-responsive">
            <table className="contacts-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Type</th>
                  <th>Recipient</th>
                  <th>Phone Number</th>
                  <th>Status</th>
                  <th>Message Preview</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log, idx) => {
                  const date = new Date(log.timestamp);
                  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const dateStr = date.toLocaleDateString();

                  return (
                    <tr key={idx} className="contacts-table-row">
                      <td className="font-mono text-xs text-slate-500 whitespace-nowrap">
                        {dateStr} {timeStr}
                      </td>
                      <td>
                        <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                          {log.type}
                        </span>
                      </td>
                      <td className="font-semibold text-slate-800">{log.recipient}</td>
                      <td className="font-mono text-emerald-700 text-xs">{log.phone}</td>
                      <td>
                        <span
                          className={`status-badge-pill ${
                            log.status.includes('Completed')
                              ? 'badge-completed'
                              : 'badge-opened'
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="text-xs text-slate-600 max-w-xs truncate" title={log.message}>
                        {log.message}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-contacts-state">
            <Clock size={48} className="text-slate-300 mx-auto" />
            <h4 className="font-semibold text-slate-700 mt-2">No Activity Recorded Yet</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Messages opened via Quick Send or Bulk Campaigns will appear in this audit log.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

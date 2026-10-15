import React, { useState } from 'react';
import {
  BookOpen,
  Copy,
  Check,
  Send,
  Users,
  Plus,
  Trash2,
  Sparkles,
  Search,
  Tag
} from 'lucide-react';
import { DEFAULT_TEMPLATES } from '../utils/templates';

export default function TemplateLibrary({ onSelectTemplate, onSelectForCampaign }) {
  const [customTemplates, setCustomTemplates] = useState(() => {
    try {
      const saved = localStorage.getItem('wa_custom_templates');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [copiedId, setCopiedId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTmpl, setNewTmpl] = useState({ title: '', category: 'Custom', content: '' });

  const allTemplates = [...customTemplates, ...DEFAULT_TEMPLATES];

  const categories = ['All', 'Promotions', 'Welcome', 'Updates', 'Reminders', 'Feedback', 'Events', 'Custom'];

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSaveCustom = (e) => {
    e.preventDefault();
    if (!newTmpl.title.trim() || !newTmpl.content.trim()) return;

    const created = {
      id: `custom-${Date.now()}`,
      title: newTmpl.title.trim(),
      category: newTmpl.category || 'Custom',
      content: newTmpl.content.trim(),
      isCustom: true
    };

    const updated = [created, ...customTemplates];
    setCustomTemplates(updated);
    try {
      localStorage.setItem('wa_custom_templates', JSON.stringify(updated));
    } catch {
      // storage unavailable
    }

    setNewTmpl({ title: '', category: 'Custom', content: '' });
    setShowAddModal(false);
  };

  const handleDeleteCustom = (id) => {
    const updated = customTemplates.filter((t) => t.id !== id);
    setCustomTemplates(updated);
    try {
      localStorage.setItem('wa_custom_templates', JSON.stringify(updated));
    } catch {
      // storage unavailable
    }
  };

  const filteredTemplates = allTemplates.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === 'All' || t.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="template-library-container space-y-6">
      {/* Header card */}
      <div className="importer-card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Marketing Template Library</h2>
            <p className="card-subtitle">
              Pre-approved, high-converting WhatsApp marketing message templates tailored for commercial compliance.
            </p>
          </div>
          <button
            type="button"
            className="btn-primary"
            onClick={() => setShowAddModal(true)}
          >
            <Plus size={16} />
            <span>Create Custom Template</span>
          </button>
        </div>

        {/* Filters and Search Bar */}
        <div className="template-filter-bar">
          <div className="category-pills">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`category-pill ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="search-input-wrapper max-w-xs">
            <Search size={15} className="search-icon" />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
        </div>
      </div>

      {/* Grid of Templates */}
      <div className="templates-grid">
        {filteredTemplates.map((template) => {
          const isCopied = copiedId === template.id;
          return (
            <div key={template.id} className="template-card">
              <div className="template-card-header">
                <span className="template-cat-badge">
                  <Tag size={11} />
                  {template.category}
                </span>
                {template.isCustom && (
                  <button
                    type="button"
                    className="btn-delete-custom-tmpl"
                    onClick={() => handleDeleteCustom(template.id)}
                    title="Delete custom template"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              <h3 className="template-title">{template.title}</h3>

              <div className="template-content-preview">
                <pre>{template.content}</pre>
              </div>

              {/* Action buttons */}
              <div className="template-card-actions">
                <button
                  type="button"
                  className="btn-tmpl-action"
                  onClick={() => handleCopy(template.id, template.content)}
                  title="Copy text to clipboard"
                >
                  {isCopied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  <span>{isCopied ? 'Copied' : 'Copy'}</span>
                </button>

                <button
                  type="button"
                  className="btn-tmpl-action btn-tmpl-quick"
                  onClick={() => onSelectTemplate(template.content)}
                  title="Use in Quick Send tab"
                >
                  <Send size={14} />
                  <span>Use in Quick Send</span>
                </button>

                <button
                  type="button"
                  className="btn-tmpl-action btn-tmpl-campaign"
                  onClick={() => onSelectForCampaign(template.content)}
                  title="Use in Campaign Manager tab"
                >
                  <Users size={14} />
                  <span>Use in Campaign</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Custom Template Modal */}
      {showAddModal && (
        <div className="modal-backdrop">
          <div className="modal-dialog max-w-lg">
            <div className="modal-header">
              <h3 className="modal-title">Create Custom WhatsApp Template</h3>
            </div>
            <form onSubmit={handleSaveCustom}>
              <div className="modal-body space-y-4">
                <div className="form-group">
                  <label className="form-label">Template Title</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Weekend Flash Deal 30% OFF"
                    value={newTmpl.title}
                    onChange={(e) => setNewTmpl({ ...newTmpl, title: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    className="form-select"
                    value={newTmpl.category}
                    onChange={(e) => setNewTmpl({ ...newTmpl, category: e.target.value })}
                  >
                    <option value="Promotions">Promotions</option>
                    <option value="Welcome">Welcome</option>
                    <option value="Updates">Updates</option>
                    <option value="Reminders">Reminders</option>
                    <option value="Feedback">Feedback</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Message Content</label>
                  <textarea
                    rows={6}
                    className="form-textarea"
                    placeholder="Write your template text. You can use {name}, {company}, and *bold* or _italic_."
                    value={newTmpl.content}
                    onChange={(e) => setNewTmpl({ ...newTmpl, content: e.target.value })}
                    required
                  />
                  <span className="field-hint">
                    Tip: Dynamic placeholders like <code>{'{name}'}</code> will be auto-replaced in campaigns.
                  </span>
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
                  Save to Library
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

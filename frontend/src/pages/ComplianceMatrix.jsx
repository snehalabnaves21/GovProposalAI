import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  TableCellsIcon,
  ArrowUpTrayIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  FunnelIcon,
  ArrowPathIcon,
  DocumentArrowDownIcon,
  SparklesIcon,
  MagnifyingGlassIcon,
  BookmarkIcon,
  FolderOpenIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkSolidIcon } from '@heroicons/react/24/solid';
import api from '../services/api';

const STATUS_OPTIONS = [
  { value: 'compliant', label: 'Compliant', color: 'bg-green-100 text-green-700', icon: CheckCircleIcon },
  { value: 'partial', label: 'Partial', color: 'bg-amber-100 text-amber-700', icon: ExclamationTriangleIcon },
  { value: 'non_compliant', label: 'Non-Compliant', color: 'bg-red-100 text-red-700', icon: XCircleIcon },
  { value: 'pending', label: 'Pending Review', color: 'bg-gray-100 text-gray-600', icon: ArrowPathIcon },
];

const PRIORITY_OPTIONS = ['Critical', 'High', 'Medium', 'Low'];
const CATEGORY_OPTIONS = ['Technical', 'Management', 'Staffing', 'Compliance', 'Past Performance', 'Pricing', 'Security', 'Other'];

// Keywords that indicate mandatory requirements
const MANDATORY_KEYWORDS = /\b(shall|must|required|mandatory|will\s+be\s+required|is\s+required|are\s+required)\b/gi;

function extractRequirements(text) {
  if (!text) return [];
  const sentences = text.replace(/\n+/g, '\n').split(/(?<=[.;])\s+|\n/).filter(s => s.trim().length > 15);
  const reqs = [];
  sentences.forEach((sentence, i) => {
    const matches = sentence.match(MANDATORY_KEYWORDS);
    if (matches && matches.length > 0) {
      const clean = sentence.trim().replace(/^[-•*]\s*/, '');
      if (clean.length > 20) {
        reqs.push({
          id: `req-${i}`,
          text: clean,
          keywords: [...new Set(matches.map(m => m.toLowerCase()))],
          status: 'pending',
          section: '',
          assignedTo: '',
          priority: matches.some(m => /shall|must|mandatory/i.test(m)) ? 'Critical' : 'Medium',
          category: 'Other',
          notes: '',
        });
      }
    }
  });
  return reqs;
}

export default function ComplianceMatrix() {
  const location = useLocation();
  const [requirements, setRequirements] = useState([]);
  const [rawText, setRawText] = useState('');
  const [showUpload, setShowUpload] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [savedMatrices, setSavedMatrices] = useState([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadPanel, setShowLoadPanel] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveIndustry, setSaveIndustry] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const INDUSTRY_OPTIONS = ['IT Services', 'Healthcare', 'Defense', 'Construction', 'Engineering', 'Consulting', 'Cybersecurity', 'Logistics', 'Environmental', 'Education', 'Other'];

  // Load saved matrices from localStorage
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('saved_compliance_matrices') || '[]');
      setSavedMatrices(saved);
    } catch {}
  }, []);

  const handleSaveMatrix = () => {
    if (!saveName.trim() || requirements.length === 0) return;
    const matrix = {
      id: `matrix-${Date.now()}`,
      name: saveName.trim(),
      industry: saveIndustry || 'Other',
      requirements: requirements,
      savedAt: new Date().toISOString(),
      stats: { total: stats.total, compliant: stats.compliant },
    };
    const updated = [...savedMatrices, matrix];
    setSavedMatrices(updated);
    localStorage.setItem('saved_compliance_matrices', JSON.stringify(updated));
    setShowSaveModal(false);
    setSaveName('');
    setSaveIndustry('');
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleLoadMatrix = (matrix) => {
    setRequirements(matrix.requirements);
    setShowUpload(false);
    setShowLoadPanel(false);
  };

  const handleDeleteMatrix = (id) => {
    const updated = savedMatrices.filter(m => m.id !== id);
    setSavedMatrices(updated);
    localStorage.setItem('saved_compliance_matrices', JSON.stringify(updated));
  };

  // Check for RFP data from deconstructor
  useEffect(() => {
    try {
      const rfpData = localStorage.getItem('rfp_deconstruct_data');
      if (rfpData) {
        const parsed = JSON.parse(rfpData);
        if (parsed.requirements && parsed.requirements.length > 0) {
          const imported = parsed.requirements.map((r, i) => ({
            id: `rfp-${i}`,
            text: r.description || r.text || r,
            keywords: ['imported'],
            status: 'pending',
            section: r.section || '',
            assignedTo: '',
            priority: r.priority === 'Must Have' ? 'Critical' : r.priority === 'Should Have' ? 'High' : 'Medium',
            category: r.category || 'Other',
            notes: '',
          }));
          setRequirements(imported);
          setShowUpload(false);
        }
      }
    } catch (e) { /* ignore */ }
  }, []);

  // Also check for location state data
  useEffect(() => {
    if (location.state?.rfpText) {
      setRawText(location.state.rfpText);
    }
  }, [location.state]);

  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/api/rfp/deconstruct', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data?.raw_text) {
        setRawText(res.data.raw_text);
      }
      if (res.data?.requirements) {
        const imported = res.data.requirements.map((r, i) => ({
          id: `pdf-${i}`,
          text: r.description || r.text || r,
          keywords: ['extracted'],
          status: 'pending',
          section: r.section || '',
          assignedTo: '',
          priority: r.priority === 'Must Have' ? 'Critical' : 'High',
          category: r.category || 'Other',
          notes: '',
        }));
        setRequirements(prev => [...prev, ...imported]);
        setShowUpload(false);
      }
    } catch (err) {
      alert('Failed to process PDF: ' + (err.response?.data?.detail || err.message));
    } finally {
      setUploading(false);
    }
  };

  const handleAnalyzeText = () => {
    if (!rawText.trim()) return;
    setAnalyzing(true);
    setTimeout(() => {
      const extracted = extractRequirements(rawText);
      setRequirements(prev => [...prev, ...extracted]);
      setShowUpload(false);
      setAnalyzing(false);
    }, 500);
  };

  const handleAiAnalysis = async () => {
    if (!rawText.trim()) return;
    setAnalyzing(true);
    try {
      const res = await api.post('/api/compliance/analyze', { text: rawText });
      if (res.data?.requirements) {
        const imported = res.data.requirements.map((r, i) => ({
          id: `ai-${Date.now()}-${i}`,
          text: r.text || r.description,
          keywords: r.keywords || ['ai-detected'],
          status: 'pending',
          section: r.section || '',
          assignedTo: '',
          priority: r.priority || 'Medium',
          category: r.category || 'Other',
          notes: '',
        }));
        setRequirements(prev => [...prev, ...imported]);
        setShowUpload(false);
      }
    } catch {
      // Fallback to local extraction
      const extracted = extractRequirements(rawText);
      setRequirements(prev => [...prev, ...extracted]);
      setShowUpload(false);
    } finally {
      setAnalyzing(false);
    }
  };

  const updateRequirement = (id, field, value) => {
    setRequirements(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const deleteRequirement = (id) => {
    setRequirements(prev => prev.filter(r => r.id !== id));
  };

  const addManualRequirement = () => {
    const newReq = {
      id: `manual-${Date.now()}`,
      text: '',
      keywords: ['manual'],
      status: 'pending',
      section: '',
      assignedTo: '',
      priority: 'Medium',
      category: 'Other',
      notes: '',
    };
    setRequirements(prev => [...prev, newReq]);
    setEditingRow(newReq.id);
  };

  const filteredRequirements = useMemo(() => {
    let filtered = requirements;
    if (filter !== 'all') {
      filtered = filtered.filter(r => r.status === filter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(r => r.text.toLowerCase().includes(q) || r.category.toLowerCase().includes(q));
    }
    return filtered;
  }, [requirements, filter, searchQuery]);

  // Stats
  const stats = useMemo(() => ({
    total: requirements.length,
    compliant: requirements.filter(r => r.status === 'compliant').length,
    partial: requirements.filter(r => r.status === 'partial').length,
    nonCompliant: requirements.filter(r => r.status === 'non_compliant').length,
    pending: requirements.filter(r => r.status === 'pending').length,
    critical: requirements.filter(r => r.priority === 'Critical').length,
  }), [requirements]);

  const compliancePercent = stats.total > 0 ? Math.round((stats.compliant / stats.total) * 100) : 0;

  const exportCsv = () => {
    const header = 'Requirement,Status,Priority,Category,Section,Assigned To,Notes';
    const rows = requirements.map(r =>
      `"${r.text.replace(/"/g, '""')}","${r.status}","${r.priority}","${r.category}","${r.section}","${r.assignedTo}","${r.notes}"`
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'compliance_matrix.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy">Compliance Framework</h1>
          <p className="text-sm text-gray-500 mt-1">Track FAR/RFP requirements and compliance status</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowLoadPanel(!showLoadPanel)} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer">
            <FolderOpenIcon className="w-4 h-4" />
            Saved ({savedMatrices.length})
          </button>
          {requirements.length > 0 && (
            <>
              <button onClick={() => { setShowSaveModal(true); setSaveName(''); setSaveIndustry(''); }} className="flex items-center gap-1.5 px-3 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-dark transition-colors cursor-pointer">
                {saveSuccess ? <><BookmarkSolidIcon className="w-4 h-4" /> Saved!</> : <><BookmarkIcon className="w-4 h-4" /> Save Matrix</>}
              </button>
              <button onClick={addManualRequirement} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer">
                + Add Row
              </button>
              <button onClick={exportCsv} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer">
                <DocumentArrowDownIcon className="w-4 h-4" />
                Export CSV
              </button>
            </>
          )}
        </div>
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowSaveModal(false)}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-navy mb-4 flex items-center gap-2">
              <BookmarkIcon className="w-5 h-5" /> Save Compliance Matrix
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
                <input type="text" value={saveName} onChange={e => setSaveName(e.target.value)} placeholder="e.g., IT Services - FAR Compliance" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" autoFocus />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Industry / Category</label>
                <select value={saveIndustry} onChange={e => setSaveIndustry(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/30">
                  <option value="">Select industry...</option>
                  {INDUSTRY_OPTIONS.map(ind => <option key={ind} value={ind}>{ind}</option>)}
                </select>
              </div>
              <p className="text-xs text-gray-400">{requirements.length} requirements will be saved</p>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowSaveModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer">Cancel</button>
              <button onClick={handleSaveMatrix} disabled={!saveName.trim()} className="px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-dark transition-colors cursor-pointer disabled:opacity-50">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Saved Matrices Panel */}
      {showLoadPanel && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-navy flex items-center gap-2">
              <FolderOpenIcon className="w-4 h-4" /> Saved Compliance Matrices
            </h3>
            <button onClick={() => setShowLoadPanel(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
              <XCircleIcon className="w-5 h-5" />
            </button>
          </div>
          {savedMatrices.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No saved matrices yet. Create a compliance matrix and save it for reuse.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {savedMatrices.map(matrix => (
                <div key={matrix.id} className="border border-gray-200 rounded-lg p-4 hover:border-accent/50 transition-colors group">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="text-sm font-medium text-navy">{matrix.name}</h4>
                      <span className="inline-block mt-1 px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-medium">{matrix.industry}</span>
                    </div>
                    <button onClick={() => handleDeleteMatrix(matrix.id)} className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all cursor-pointer">
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
                    <span>{matrix.stats.total} requirements</span>
                    <span>{matrix.stats.compliant} compliant</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-400">{new Date(matrix.savedAt).toLocaleDateString()}</span>
                    <button onClick={() => handleLoadMatrix(matrix)} className="px-3 py-1.5 bg-accent/10 text-accent text-xs font-medium rounded-lg hover:bg-accent/20 transition-colors cursor-pointer">
                      Load
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Stats Row */}
      {requirements.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
          <div className="bg-white rounded-lg border border-gray-100 p-4 text-center">
            <p className="text-2xl font-bold text-navy">{stats.total}</p>
            <p className="text-xs text-gray-500">Total</p>
          </div>
          <div className="bg-green-50 rounded-lg border border-green-100 p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.compliant}</p>
            <p className="text-xs text-green-600">Compliant</p>
          </div>
          <div className="bg-amber-50 rounded-lg border border-amber-100 p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{stats.partial}</p>
            <p className="text-xs text-amber-600">Partial</p>
          </div>
          <div className="bg-red-50 rounded-lg border border-red-100 p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{stats.nonCompliant}</p>
            <p className="text-xs text-red-600">Non-Compliant</p>
          </div>
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-gray-600">{stats.pending}</p>
            <p className="text-xs text-gray-500">Pending</p>
          </div>
          <div className="bg-blue-50 rounded-lg border border-blue-100 p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{compliancePercent}%</p>
            <p className="text-xs text-blue-600">Compliance</p>
          </div>
        </div>
      )}

      {/* Upload / Analyze Section */}
      {showUpload && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 mb-6">
          <div className="text-center mb-6">
            <TableCellsIcon className="w-12 h-12 text-accent mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-navy mb-1">Build Your Compliance Matrix</h2>
            <p className="text-sm text-gray-500">Upload an RFP document or paste text to auto-detect requirements</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* PDF Upload */}
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-accent/50 transition-colors">
              <ArrowUpTrayIcon className="w-8 h-8 text-gray-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-700 mb-2">Upload RFP Document</p>
              <p className="text-xs text-gray-400 mb-4">PDF, DOC, or TXT files</p>
              <label className="inline-flex items-center gap-1.5 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium cursor-pointer hover:bg-accent-dark transition-colors">
                <ArrowUpTrayIcon className="w-4 h-4" />
                {uploading ? 'Processing...' : 'Choose File'}
                <input type="file" accept=".pdf,.doc,.docx,.txt" onChange={handlePdfUpload} className="hidden" disabled={uploading} />
              </label>
            </div>

            {/* Text Paste */}
            <div className="space-y-3">
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste RFP text here... The system will auto-detect requirements containing 'shall', 'must', 'required', etc."
                className="w-full h-40 px-4 py-3 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAnalyzeText}
                  disabled={!rawText.trim() || analyzing}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-navy text-white rounded-lg text-sm font-medium hover:bg-navy-light transition-colors cursor-pointer disabled:opacity-50"
                >
                  <MagnifyingGlassIcon className="w-4 h-4" />
                  {analyzing ? 'Analyzing...' : 'Extract Requirements'}
                </button>
                <button
                  onClick={handleAiAnalysis}
                  disabled={!rawText.trim() || analyzing}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <SparklesIcon className="w-4 h-4" />
                  AI Analyze
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      {requirements.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1">
            {[{ value: 'all', label: 'All' }, ...STATUS_OPTIONS].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  filter === opt.value ? 'bg-navy text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="relative flex-1 max-w-xs">
            <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search requirements..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>
          <button onClick={() => setShowUpload(true)} className="text-sm text-accent hover:text-accent-dark font-medium cursor-pointer">
            + Add More
          </button>
        </div>
      )}

      {/* Compliance Table */}
      {filteredRequirements.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-navy text-white">
                  <th className="px-4 py-3 text-left font-medium w-8">#</th>
                  <th className="px-4 py-3 text-left font-medium min-w-[300px]">Requirement</th>
                  <th className="px-4 py-3 text-left font-medium w-36">Status</th>
                  <th className="px-4 py-3 text-left font-medium w-28">Priority</th>
                  <th className="px-4 py-3 text-left font-medium w-32">Category</th>
                  <th className="px-4 py-3 text-left font-medium w-36">Section Ref</th>
                  <th className="px-4 py-3 text-left font-medium w-36">Assigned To</th>
                  <th className="px-4 py-3 text-center font-medium w-16">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequirements.map((req, idx) => (
                  <tr key={req.id} className="border-t border-gray-100 hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs">{idx + 1}</td>
                    <td className="px-4 py-3">
                      {editingRow === req.id ? (
                        <textarea
                          value={req.text}
                          onChange={(e) => updateRequirement(req.id, 'text', e.target.value)}
                          onBlur={() => setEditingRow(null)}
                          autoFocus
                          className="w-full px-2 py-1 border border-gray-200 rounded text-sm resize-none"
                          rows={2}
                        />
                      ) : (
                        <p
                          className="text-gray-700 text-sm leading-relaxed cursor-pointer hover:text-navy"
                          onClick={() => setEditingRow(req.id)}
                          title="Click to edit"
                        >
                          {req.text || <span className="text-gray-400 italic">Click to add requirement text...</span>}
                          {req.keywords.length > 0 && !req.keywords.includes('manual') && (
                            <span className="ml-2 inline-flex gap-1">
                              {req.keywords.slice(0, 2).map(k => (
                                <span key={k} className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-medium uppercase">{k}</span>
                              ))}
                            </span>
                          )}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={req.status}
                        onChange={(e) => updateRequirement(req.id, 'status', e.target.value)}
                        className={`px-2 py-1 rounded-md text-xs font-medium border-0 cursor-pointer ${
                          STATUS_OPTIONS.find(s => s.value === req.status)?.color || 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {STATUS_OPTIONS.map(s => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={req.priority}
                        onChange={(e) => updateRequirement(req.id, 'priority', e.target.value)}
                        className={`px-2 py-1 rounded-md text-xs font-medium border-0 cursor-pointer ${
                          req.priority === 'Critical' ? 'bg-red-100 text-red-700' :
                          req.priority === 'High' ? 'bg-orange-100 text-orange-700' :
                          req.priority === 'Medium' ? 'bg-amber-100 text-amber-700' :
                          'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {PRIORITY_OPTIONS.map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={req.category}
                        onChange={(e) => updateRequirement(req.id, 'category', e.target.value)}
                        className="px-2 py-1 bg-gray-50 rounded-md text-xs border-0 cursor-pointer text-gray-700"
                      >
                        {CATEGORY_OPTIONS.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={req.section}
                        onChange={(e) => updateRequirement(req.id, 'section', e.target.value)}
                        placeholder="e.g. L.4.2"
                        className="w-full px-2 py-1 bg-gray-50 rounded-md text-xs border-0 focus:outline-none focus:ring-1 focus:ring-accent/30"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={req.assignedTo}
                        onChange={(e) => updateRequirement(req.id, 'assignedTo', e.target.value)}
                        placeholder="Team member"
                        className="w-full px-2 py-1 bg-gray-50 rounded-md text-xs border-0 focus:outline-none focus:ring-1 focus:ring-accent/30"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => deleteRequirement(req.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                        title="Delete"
                      >
                        <XCircleIcon className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {requirements.length === 0 && !showUpload && (
        <div className="text-center py-12">
          <TableCellsIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No requirements found. Try uploading an RFP or pasting text.</p>
          <button onClick={() => setShowUpload(true)} className="mt-3 text-sm text-accent font-medium cursor-pointer">
            Upload Document
          </button>
        </div>
      )}

      {/* Disqualification Warning */}
      {stats.nonCompliant > 0 && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-700">Disqualification Risk</p>
            <p className="text-xs text-red-600 mt-1">
              {stats.nonCompliant} requirement{stats.nonCompliant > 1 ? 's are' : ' is'} marked non-compliant.
              Missing mandatory requirements can result in automatic disqualification.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

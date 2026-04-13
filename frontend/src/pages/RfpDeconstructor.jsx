import { useState, useRef } from 'react';
import {
  DocumentArrowUpIcon,
  DocumentMagnifyingGlassIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentListIcon,
  ScaleIcon,
  CalendarDaysIcon,
  TagIcon,
  ArrowPathIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

const priorityColors = {
  'Must Have': 'bg-red-100 text-red-700 border-red-200',
  'Should Have': 'bg-amber-100 text-amber-700 border-amber-200',
  'Nice to Have': 'bg-green-100 text-green-700 border-green-200',
};

const categoryColors = {
  Technical: 'bg-blue-100 text-blue-700',
  Management: 'bg-purple-100 text-purple-700',
  Staffing: 'bg-indigo-100 text-indigo-700',
  Compliance: 'bg-red-100 text-red-700',
  Reporting: 'bg-amber-100 text-amber-700',
  Deliverable: 'bg-green-100 text-green-700',
  Other: 'bg-gray-100 text-gray-700',
};

export default function RfpDeconstructor() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('requirements');
  const [filterCategory, setFilterCategory] = useState('All');

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f && f.type === 'application/pdf') {
      setFile(f);
      setError('');
      setResult(null);
    } else {
      setError('Please select a PDF file.');
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setAnalyzing(true);
    setError('');
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/api/rfp/deconstruct', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      });
      if (res.data.status === 'success') {
        setResult(res.data.data);
      } else if (res.data.status === 'partial') {
        setError('AI returned unstructured analysis. Try a clearer PDF.');
      }
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUseForProposal = () => {
    if (!result) return;
    // Store RFP data in localStorage for proposal generator to pick up
    localStorage.setItem('rfp_deconstruct_data', JSON.stringify(result));
    navigate('/new-proposal');
  };

  const requirements = result?.requirements || [];
  const categories = ['All', ...new Set(requirements.map((r) => r.category))];
  const filteredReqs = filterCategory === 'All'
    ? requirements
    : requirements.filter((r) => r.category === filterCategory);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-navy mb-2 flex items-center gap-3">
          <DocumentMagnifyingGlassIcon className="w-8 h-8 text-accent" />
          RFP Deconstructor
        </h1>
        <p className="text-gray-500 text-sm">
          Upload a solicitation PDF and let AI extract structured requirements, evaluation criteria, compliance items, and key dates.
        </p>
      </div>

      {/* Upload Section */}
      {!result && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <div
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${
              file ? 'border-accent bg-accent/5' : 'border-gray-200 hover:border-accent/50 hover:bg-gray-50'
            }`}
            onClick={() => !analyzing && fileInputRef.current?.click()}
            style={{ cursor: analyzing ? 'default' : 'pointer' }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            {file ? (
              <div>
                <CheckCircleIcon className="w-12 h-12 text-accent mx-auto mb-3" />
                <p className="text-lg font-semibold text-navy mb-1">{file.name}</p>
                <p className="text-sm text-gray-500">
                  {(file.size / 1024 / 1024).toFixed(2)} MB — Ready to analyze
                </p>
              </div>
            ) : (
              <div>
                <DocumentArrowUpIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-lg font-semibold text-navy mb-1">
                  Drop your solicitation PDF here
                </p>
                <p className="text-sm text-gray-500">
                  or click to browse — supports RFPs, RFQs, RFIs, task orders, and SOWs
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={handleAnalyze}
              disabled={!file || analyzing}
              className="flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-semibold bg-accent hover:bg-accent-dark text-white transition-all disabled:opacity-50 cursor-pointer shadow-md"
            >
              {analyzing ? (
                <>
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Analyzing with AI...
                </>
              ) : (
                <>
                  <DocumentMagnifyingGlassIcon className="w-5 h-5" />
                  Deconstruct RFP
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Results Section */}
      {result && (
        <div className="space-y-6">
          {/* Automated Flow Banner */}
          <div className="bg-gradient-to-r from-accent/10 to-blue-50 border border-accent/20 rounded-xl p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-accent rounded-lg p-2">
                <ArrowRightIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-navy">Ready to generate a proposal from this RFP?</p>
                <p className="text-xs text-gray-500">All extracted data will auto-fill the proposal generator — title, agency, requirements, evaluation criteria, and compliance items.</p>
              </div>
            </div>
            <button
              onClick={handleUseForProposal}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold bg-accent hover:bg-accent-dark text-white transition-all cursor-pointer shadow-md flex-shrink-0"
            >
              Generate Proposal
              <ArrowRightIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Summary Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-navy mb-1">{result.title || 'Solicitation Analysis'}</h2>
                {result.agency && (
                  <p className="text-sm text-gray-500">{result.agency}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all cursor-pointer"
                >
                  <ArrowPathIcon className="w-4 h-4" />
                  New Analysis
                </button>
                <button
                  onClick={handleUseForProposal}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-accent hover:bg-accent-dark text-white transition-all cursor-pointer shadow-sm"
                >
                  Use for Proposal
                  <ArrowRightIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: 'Sol. Number', value: result.solicitation_number || 'N/A' },
                { label: 'NAICS', value: result.naics_code || 'N/A' },
                { label: 'Set-Aside', value: result.set_aside || 'Full & Open' },
                { label: 'Contract Type', value: result.contract_type || 'N/A' },
                { label: 'Est. Value', value: result.estimated_value || 'N/A' },
              ].map((stat) => (
                <div key={stat.label} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{stat.label}</p>
                  <p className="text-sm font-semibold text-navy mt-0.5 truncate">{stat.value}</p>
                </div>
              ))}
            </div>

            {result.summary && (
              <div className="mt-4 bg-blue-50 border border-blue-100 rounded-lg p-4">
                <p className="text-sm text-blue-800">{result.summary}</p>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="border-b border-gray-200 flex">
              {[
                { key: 'requirements', label: 'Requirements', icon: ClipboardDocumentListIcon, count: requirements.length },
                { key: 'evaluation', label: 'Evaluation Criteria', icon: ScaleIcon, count: (result.evaluation_criteria || []).length },
                { key: 'compliance', label: 'Compliance', icon: CheckCircleIcon, count: (result.compliance_items || []).length },
                { key: 'dates', label: 'Key Dates', icon: CalendarDaysIcon, count: (result.key_dates || []).length },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-all cursor-pointer ${
                    activeTab === tab.key
                      ? 'border-accent text-accent bg-accent/5'
                      : 'border-transparent text-gray-500 hover:text-navy hover:bg-gray-50'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                  {tab.count > 0 && (
                    <span className={`text-xs rounded-full px-1.5 py-0.5 font-semibold ${
                      activeTab === tab.key ? 'bg-accent text-white' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="p-6">
              {/* Requirements Tab */}
              {activeTab === 'requirements' && (
                <div>
                  {/* Category filter */}
                  <div className="flex items-center gap-2 mb-4 flex-wrap">
                    <TagIcon className="w-4 h-4 text-gray-400" />
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setFilterCategory(cat)}
                        className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                          filterCategory === cat
                            ? 'bg-navy text-white border-navy'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-navy'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-3">
                    {filteredReqs.map((req, idx) => (
                      <div key={idx} className="border border-gray-100 rounded-lg p-4 hover:shadow-sm transition-shadow">
                        <div className="flex items-start gap-3">
                          <span className="text-xs font-mono font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded mt-0.5">
                            {req.id || `REQ-${String(idx + 1).padStart(3, '0')}`}
                          </span>
                          <div className="flex-1">
                            <p className="text-sm text-navy font-medium mb-2">{req.requirement}</p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${categoryColors[req.category] || categoryColors.Other}`}>
                                {req.category}
                              </span>
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${priorityColors[req.priority] || priorityColors['Nice to Have']}`}>
                                {req.priority}
                              </span>
                              {req.far_clauses && req.far_clauses.length > 0 && (
                                <span className="text-xs text-gray-400">
                                  FAR: {req.far_clauses.join(', ')}
                                </span>
                              )}
                              {req.section_reference && (
                                <span className="text-xs text-gray-400">
                                  Ref: {req.section_reference}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {filteredReqs.length === 0 && (
                      <p className="text-center text-gray-400 py-8 text-sm">No requirements found in this category.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Evaluation Criteria Tab */}
              {activeTab === 'evaluation' && (
                <div className="space-y-3">
                  {(result.evaluation_criteria || []).map((ec, idx) => (
                    <div key={idx} className="border border-gray-100 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-navy">{ec.factor}</h3>
                        {ec.weight && (
                          <span className="text-xs font-medium bg-accent/10 text-accent px-2.5 py-1 rounded-full">
                            {ec.weight}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{ec.description}</p>
                    </div>
                  ))}
                  {(!result.evaluation_criteria || result.evaluation_criteria.length === 0) && (
                    <p className="text-center text-gray-400 py-8 text-sm">No evaluation criteria extracted.</p>
                  )}
                </div>
              )}

              {/* Compliance Tab */}
              {activeTab === 'compliance' && (
                <div className="space-y-3">
                  {(result.compliance_items || []).map((ci, idx) => (
                    <div key={idx} className="border border-gray-100 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <span className="text-xs font-mono font-bold text-red-600 bg-red-50 px-2 py-1 rounded flex-shrink-0">
                          {ci.clause}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-navy">{ci.title}</p>
                          <p className="text-sm text-gray-600 mt-1">{ci.action_required}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!result.compliance_items || result.compliance_items.length === 0) && (
                    <p className="text-center text-gray-400 py-8 text-sm">No compliance items extracted.</p>
                  )}
                </div>
              )}

              {/* Key Dates Tab */}
              {activeTab === 'dates' && (
                <div className="space-y-3">
                  {(result.key_dates || []).map((kd, idx) => (
                    <div key={idx} className="border border-gray-100 rounded-lg p-4 flex items-center gap-4">
                      <CalendarDaysIcon className="w-8 h-8 text-accent flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-navy">{kd.event}</p>
                        <p className="text-sm text-gray-500">{kd.date}</p>
                      </div>
                    </div>
                  ))}
                  {(!result.key_dates || result.key_dates.length === 0) && (
                    <p className="text-center text-gray-400 py-8 text-sm">No key dates extracted.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

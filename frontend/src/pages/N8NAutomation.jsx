import { useState, useEffect } from 'react';
import {
  CogIcon,
  PlayIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowDownTrayIcon,
  TrashIcon,
  EyeIcon,
  BoltIcon,
  CommandLineIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import api from '../services/api';

const workflowIcons = {
  proposal_generation: DocumentTextIcon,
  compliance_check: ShieldCheckIcon,
  gap_analysis: ChartBarIcon,
};

const statusStyles = {
  pending: { label: 'Pending', cls: 'bg-gray-100 text-gray-600', icon: ClockIcon },
  running: { label: 'Running', cls: 'bg-blue/10 text-blue', icon: ArrowPathIcon },
  completed: { label: 'Completed', cls: 'bg-emerald-50 text-emerald-700', icon: CheckCircleIcon },
  failed: { label: 'Failed', cls: 'bg-red-50 text-red-700', icon: XCircleIcon },
};

export default function N8NAutomation() {
  const [workflows, setWorkflows] = useState([]);
  const [runs, setRuns] = useState([]);
  const [settings, setSettings] = useState({ webhook_url: '', enabled: true, connected: false });
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(null);
  const [activeRun, setActiveRun] = useState(null);
  const [activeRunData, setActiveRunData] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState({ webhook_url: '', api_key: '' });
  const [showExport, setShowExport] = useState(null);
  const [exportData, setExportData] = useState(null);
  const [triggerForm, setTriggerForm] = useState(null);
  const [formData, setFormData] = useState({ company_name: '', naics_code: '', agency: '', scope: '' });
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  // Opportunity selection state
  const [opportunities, setOpportunities] = useState([]);
  const [oppLoading, setOppLoading] = useState(false);
  const [oppSearch, setOppSearch] = useState('');
  const [selectedOpp, setSelectedOpp] = useState(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [showOppModal, setShowOppModal] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [wfRes, runsRes, settRes] = await Promise.all([
        api.get('/api/n8n/workflows'),
        api.get('/api/n8n/runs'),
        api.get('/api/n8n/settings'),
      ]);
      setWorkflows(wfRes.data);
      setRuns(runsRes.data);
      setSettings(settRes.data);
      setSettingsForm({ webhook_url: settRes.data.webhook_url || '', api_key: '' });
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load N8N data');
    } finally {
      setLoading(false);
    }
  };

  // Load profile data (company name, NAICS) and opportunities when proposal form opens
  const loadProposalFormData = async () => {
    // Load vendor profile for company name & NAICS
    if (!profileLoaded) {
      try {
        const profileRes = await api.get('/api/vendor-profile');
        if (profileRes.data) {
          const profile = profileRes.data;
          setFormData(prev => ({
            ...prev,
            company_name: profile.company_name || prev.company_name,
            naics_code: (profile.naics_codes && profile.naics_codes.length > 0)
              ? profile.naics_codes[0]
              : prev.naics_code,
          }));
          setProfileLoaded(true);
        }
      } catch (err) {
        console.log('Could not load vendor profile:', err);
      }
    }

    // Load opportunities
    if (opportunities.length === 0) {
      setOppLoading(true);
      try {
        const oppRes = await api.get('/api/opportunities', { params: { limit: 50, source: 'all' } });
        setOpportunities(oppRes.data?.opportunities || oppRes.data || []);
      } catch (err) {
        console.log('Could not load opportunities:', err);
      } finally {
        setOppLoading(false);
      }
    }
  };

  const handleSelectOpportunity = (opp) => {
    setSelectedOpp(opp);
    setFormData(prev => ({
      ...prev,
      agency: opp.agency || prev.agency,
      scope: opp.description || opp.requirements || prev.scope,
    }));
  };

  const handleTrigger = async (workflowType) => {
    try {
      setTriggering(workflowType);
      setError(null);
      const res = await api.post('/api/n8n/trigger', {
        workflow_type: workflowType,
        ...formData,
      });
      setTriggerForm(null);
      setFormData({ company_name: '', naics_code: '', agency: '', scope: '' });

      // Refresh runs
      const runsRes = await api.get('/api/n8n/runs');
      setRuns(runsRes.data);

      // If completed immediately (built-in mode), show the result
      if (res.data.status === 'completed' && res.data.run_id) {
        await viewRun(res.data.run_id);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to trigger workflow');
    } finally {
      setTriggering(null);
    }
  };

  const viewRun = async (runId) => {
    try {
      const res = await api.get(`/api/n8n/runs/${runId}`);
      setActiveRun(runId);
      setActiveRunData(res.data);
    } catch (err) {
      setError('Failed to load run details');
    }
  };

  const deleteRun = async (runId) => {
    try {
      await api.delete(`/api/n8n/runs/${runId}`);
      setRuns(runs.filter(r => r.id !== runId));
      if (activeRun === runId) {
        setActiveRun(null);
        setActiveRunData(null);
      }
    } catch (err) {
      setError('Failed to delete run');
    }
  };

  const handleSaveSettings = async () => {
    try {
      const res = await api.put('/api/n8n/settings', settingsForm);
      setSettings({ ...settings, webhook_url: res.data.webhook_url, connected: !!res.data.webhook_url });
      setShowSettings(false);
    } catch (err) {
      setError('Failed to save settings');
    }
  };

  const handleExport = async (workflowType) => {
    try {
      const res = await api.get(`/api/n8n/workflows/${workflowType}/export`);
      setExportData(res.data);
      setShowExport(workflowType);
    } catch (err) {
      setError('Failed to export workflow');
    }
  };

  const copyJson = (data) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto flex items-center justify-center py-20">
        <svg className="animate-spin w-8 h-8 text-navy" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-navy flex items-center gap-3">
            <BoltIcon className="w-8 h-8 text-amber-500" />
            Workflow Automation
          </h1>
          <p className="text-gray-500 mt-1">Trigger AI-powered workflows for proposals, compliance checks, and gap analysis</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${settings.connected ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
            <div className={`w-2 h-2 rounded-full ${settings.connected ? 'bg-emerald-500' : 'bg-gray-400'}`} />
            {settings.connected ? 'N8N Connected' : 'Built-in Mode'}
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <CogIcon className="w-4 h-4" />
            Settings
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">{error}</p>
            <button onClick={() => setError(null)} className="text-xs text-red-600 underline mt-1 cursor-pointer">Dismiss</button>
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="mb-6 bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-navy mb-4 flex items-center gap-2">
            <CogIcon className="w-5 h-5 text-gray-400" />
            N8N Connection Settings
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Connect your N8N instance to run workflows externally. Without N8N, workflows run using the built-in AI engine.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">N8N Webhook URL</label>
              <input
                type="url"
                value={settingsForm.webhook_url}
                onChange={(e) => setSettingsForm({ ...settingsForm, webhook_url: e.target.value })}
                placeholder="https://your-n8n.example.com/webhook/..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">N8N API Key (optional)</label>
              <input
                type="password"
                value={settingsForm.api_key}
                onChange={(e) => setSettingsForm({ ...settingsForm, api_key: e.target.value })}
                placeholder="Enter N8N API key..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveSettings}
              className="px-4 py-2 bg-accent hover:bg-accent-dark text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
            >
              Save Settings
            </button>
            <button
              onClick={() => setShowSettings(false)}
              className="px-4 py-2 text-gray-500 hover:text-gray-700 text-sm cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Available Workflows */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-navy mb-4">Available Workflows</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {workflows.map((wf) => {
            const Icon = workflowIcons[wf.id] || BoltIcon;
            const isTriggering = triggering === wf.id;
            return (
              <div key={wf.id} className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="bg-navy/5 rounded-lg p-3">
                      <Icon className="w-6 h-6 text-navy" />
                    </div>
                    <button
                      onClick={() => handleExport(wf.id)}
                      className="text-gray-400 hover:text-gray-600 cursor-pointer"
                      title="Export N8N Workflow JSON"
                    >
                      <ArrowDownTrayIcon className="w-5 h-5" />
                    </button>
                  </div>
                  <h3 className="font-semibold text-navy text-lg mb-1">{wf.name}</h3>
                  <p className="text-sm text-gray-500 mb-4">{wf.description}</p>

                  {/* Steps */}
                  <div className="mb-4">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Workflow Steps</p>
                    <div className="space-y-1.5">
                      {wf.steps.map((step, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="w-5 h-5 rounded-full bg-navy/10 text-navy text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                            {i + 1}
                          </span>
                          {step}
                        </div>
                      ))}
                    </div>
                  </div>

                  {triggerForm === wf.id ? (
                    <div className="space-y-2 mb-3">
                      {wf.id === 'proposal_generation' && (
                        <>
                          {/* Company Name - synced from Business Profile */}
                          <div>
                            <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Company Name</label>
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                placeholder="Company Name"
                                value={formData.company_name}
                                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                                className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30"
                              />
                              {profileLoaded && <CheckCircleIcon className="w-4 h-4 text-emerald-500 flex-shrink-0" title="Synced from Business Profile" />}
                            </div>
                          </div>

                          {/* NAICS Code - synced from Business Profile */}
                          <div>
                            <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">NAICS Code</label>
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                placeholder="NAICS Code (e.g. 541511)"
                                value={formData.naics_code}
                                onChange={(e) => setFormData({ ...formData, naics_code: e.target.value })}
                                className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30"
                              />
                              {profileLoaded && <CheckCircleIcon className="w-4 h-4 text-emerald-500 flex-shrink-0" title="Synced from Business Profile" />}
                            </div>
                          </div>

                          {/* Opportunity Selector - opens popup */}
                          <div>
                            <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Select Opportunity</label>
                            <button
                              type="button"
                              onClick={() => setShowOppModal(true)}
                              className="w-full flex items-center justify-between px-3 py-1.5 border border-gray-200 rounded-lg text-sm hover:border-blue/50 hover:bg-blue/5 transition-colors cursor-pointer"
                            >
                              {selectedOpp ? (
                                <span className="flex items-center gap-1.5 text-gray-800 truncate">
                                  <CheckCircleIcon className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                  {selectedOpp.title?.substring(0, 35)}{selectedOpp.title?.length > 35 ? '...' : ''}
                                </span>
                              ) : (
                                <span className="text-gray-400">Browse & select opportunity...</span>
                              )}
                              <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            </button>
                          </div>

                          {/* Agency - auto-filled from selected opportunity */}
                          <div>
                            <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Target Agency</label>
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                placeholder="Target Agency"
                                value={formData.agency}
                                onChange={(e) => setFormData({ ...formData, agency: e.target.value })}
                                className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30"
                              />
                              {selectedOpp && <CheckCircleIcon className="w-4 h-4 text-emerald-500 flex-shrink-0" title="From selected opportunity" />}
                            </div>
                          </div>

                          {/* Scope of Work - auto-filled from selected opportunity */}
                          <div>
                            <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Scope of Work</label>
                            <div className="flex items-center gap-1">
                              <textarea
                                placeholder="Scope of Work"
                                value={formData.scope}
                                onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
                                rows={3}
                                className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 resize-none"
                              />
                              {selectedOpp && <CheckCircleIcon className="w-4 h-4 text-emerald-500 flex-shrink-0" title="From selected opportunity" />}
                            </div>
                          </div>
                        </>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleTrigger(wf.id)}
                          disabled={isTriggering}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-accent hover:bg-accent-dark text-white rounded-lg text-sm font-medium transition-colors cursor-pointer disabled:opacity-60"
                        >
                          {isTriggering ? (
                            <><ArrowPathIcon className="w-4 h-4 animate-spin" /> Running...</>
                          ) : (
                            <><PlayIcon className="w-4 h-4" /> Run</>
                          )}
                        </button>
                        <button
                          onClick={() => { setTriggerForm(null); setSelectedOpp(null); }}
                          className="px-3 py-2 text-gray-400 hover:text-gray-600 text-sm cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setTriggerForm(wf.id);
                        if (wf.id === 'proposal_generation') loadProposalFormData();
                      }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-navy hover:bg-navy-light text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
                    >
                      <PlayIcon className="w-4 h-4" />
                      Run Workflow
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Run Results Detail */}
      {activeRunData && (
        <div className="mb-8 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <EyeIcon className="w-4 h-4 text-gray-400" />
              Workflow Results
              <span className="text-xs font-normal text-gray-400">
                {activeRunData.workflow_type.replace(/_/g, ' ')} &middot; {activeRunData.mode} mode
              </span>
            </h2>
            <button onClick={() => { setActiveRun(null); setActiveRunData(null); }} className="text-gray-400 hover:text-gray-600 text-sm cursor-pointer">
              Close
            </button>
          </div>
          <div className="p-6">
            {activeRunData.result_data ? (
              <div className="space-y-6">
                {/* Proposal Generation Results */}
                {activeRunData.result_data.proposal && (
                  <div>
                    <h3 className="text-sm font-semibold text-navy mb-3 flex items-center gap-2">
                      <DocumentTextIcon className="w-4 h-4" /> Generated Proposal
                    </h3>
                    <div className="space-y-3">
                      {Object.entries(activeRunData.result_data.proposal).map(([key, val]) => (
                        <div key={key} className="bg-gray-50 rounded-lg p-4">
                          <p className="text-xs font-semibold text-navy uppercase tracking-wider mb-1">
                            {key.replace(/_/g, ' ')}
                          </p>
                          <p className="text-sm text-gray-700 leading-relaxed">{val}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Gap Analysis */}
                {activeRunData.result_data.gap_analysis && (
                  <div>
                    <h3 className="text-sm font-semibold text-navy mb-3 flex items-center gap-2">
                      <ChartBarIcon className="w-4 h-4" /> Gap Analysis
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                      {activeRunData.result_data.gap_analysis.compliant_count !== undefined && (
                        <div className="bg-emerald-50 rounded-lg p-3 text-center">
                          <p className="text-lg font-bold text-emerald-700">{activeRunData.result_data.gap_analysis.compliant_count}</p>
                          <p className="text-[10px] text-emerald-600 font-medium">Compliant</p>
                        </div>
                      )}
                      {activeRunData.result_data.gap_analysis.in_progress_count !== undefined && (
                        <div className="bg-amber-50 rounded-lg p-3 text-center">
                          <p className="text-lg font-bold text-amber-700">{activeRunData.result_data.gap_analysis.in_progress_count}</p>
                          <p className="text-[10px] text-amber-600 font-medium">In Progress</p>
                        </div>
                      )}
                      {activeRunData.result_data.gap_analysis.missing_count !== undefined && (
                        <div className="bg-red-50 rounded-lg p-3 text-center">
                          <p className="text-lg font-bold text-red-700">{activeRunData.result_data.gap_analysis.missing_count}</p>
                          <p className="text-[10px] text-red-600 font-medium">Missing</p>
                        </div>
                      )}
                      {activeRunData.result_data.gap_analysis.risk_level && (
                        <div className={`rounded-lg p-3 text-center ${activeRunData.result_data.gap_analysis.risk_level === 'Low' ? 'bg-emerald-50' : activeRunData.result_data.gap_analysis.risk_level === 'Medium' ? 'bg-amber-50' : 'bg-red-50'}`}>
                          <p className={`text-lg font-bold ${activeRunData.result_data.gap_analysis.risk_level === 'Low' ? 'text-emerald-700' : activeRunData.result_data.gap_analysis.risk_level === 'Medium' ? 'text-amber-700' : 'text-red-700'}`}>
                            {activeRunData.result_data.gap_analysis.risk_level}
                          </p>
                          <p className="text-[10px] text-gray-600 font-medium">Risk Level</p>
                        </div>
                      )}
                      {activeRunData.result_data.gap_analysis.readiness_score !== undefined && (
                        <div className="bg-blue/5 rounded-lg p-3 text-center">
                          <p className="text-lg font-bold text-blue">{activeRunData.result_data.gap_analysis.readiness_score}%</p>
                          <p className="text-[10px] text-blue font-medium">Readiness</p>
                        </div>
                      )}
                    </div>
                    {activeRunData.result_data.gap_analysis.missing_requirements?.length > 0 && (
                      <div className="bg-red-50 rounded-lg p-3">
                        <p className="text-xs font-semibold text-red-700 mb-1">Missing Requirements</p>
                        <div className="space-y-1">
                          {activeRunData.result_data.gap_analysis.missing_requirements.map((r, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm text-red-600">
                              <XCircleIcon className="w-3.5 h-3.5 flex-shrink-0" /> {r}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Compliance Audit */}
                {activeRunData.result_data.compliance_audit && (
                  <div>
                    <h3 className="text-sm font-semibold text-navy mb-3 flex items-center gap-2">
                      <ShieldCheckIcon className="w-4 h-4" /> Compliance Audit
                    </h3>
                    <div className="flex items-center gap-4 mb-3">
                      <div className={`text-2xl font-bold ${activeRunData.result_data.compliance_audit.score >= 80 ? 'text-emerald-600' : activeRunData.result_data.compliance_audit.score >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                        {activeRunData.result_data.compliance_audit.score}%
                      </div>
                      <div className="flex-1 bg-gray-100 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full transition-all ${activeRunData.result_data.compliance_audit.score >= 80 ? 'bg-emerald-500' : activeRunData.result_data.compliance_audit.score >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${activeRunData.result_data.compliance_audit.score}%` }}
                        />
                      </div>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${activeRunData.result_data.compliance_audit.passed ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                        {activeRunData.result_data.compliance_audit.passed ? 'PASSED' : 'NEEDS ATTENTION'}
                      </span>
                    </div>
                    {activeRunData.result_data.compliance_audit.recommendations?.length > 0 && (
                      <div className="space-y-1">
                        {activeRunData.result_data.compliance_audit.recommendations.map((r, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm text-blue bg-blue/5 rounded-lg p-2">
                            <CheckCircleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" /> {r}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Compliance Check Results */}
                {activeRunData.result_data.compliance_check && (
                  <div>
                    <h3 className="text-sm font-semibold text-navy mb-3 flex items-center gap-2">
                      <ShieldCheckIcon className="w-4 h-4" /> Compliance Check
                    </h3>
                    <div className="grid grid-cols-4 gap-3 mb-3">
                      <div className="bg-gray-50 rounded-lg p-3 text-center">
                        <p className="text-lg font-bold text-navy">{activeRunData.result_data.compliance_check.total_requirements}</p>
                        <p className="text-[10px] text-gray-500 font-medium">Total</p>
                      </div>
                      <div className="bg-emerald-50 rounded-lg p-3 text-center">
                        <p className="text-lg font-bold text-emerald-700">{activeRunData.result_data.compliance_check.compliant}</p>
                        <p className="text-[10px] text-emerald-600 font-medium">Compliant</p>
                      </div>
                      <div className="bg-amber-50 rounded-lg p-3 text-center">
                        <p className="text-lg font-bold text-amber-700">{activeRunData.result_data.compliance_check.in_progress}</p>
                        <p className="text-[10px] text-amber-600 font-medium">In Progress</p>
                      </div>
                      <div className="bg-red-50 rounded-lg p-3 text-center">
                        <p className="text-lg font-bold text-red-700">{activeRunData.result_data.compliance_check.not_started}</p>
                        <p className="text-[10px] text-red-600 font-medium">Not Started</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* AI Analysis */}
                {activeRunData.result_data.ai_analysis && (
                  <div>
                    <h3 className="text-sm font-semibold text-navy mb-3">AI Analysis</h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-700 mb-2">{activeRunData.result_data.ai_analysis.summary}</p>
                      {activeRunData.result_data.ai_analysis.recommendations?.map((r, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-gray-600 mt-1">
                          <CheckCircleIcon className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" /> {r}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Plan */}
                {activeRunData.result_data.action_plan && (
                  <div>
                    <h3 className="text-sm font-semibold text-navy mb-3">90-Day Action Plan</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {['30_day', '60_day', '90_day'].map((period) => (
                        activeRunData.result_data.action_plan[period] && (
                          <div key={period} className="bg-gray-50 rounded-lg p-4">
                            <p className="text-xs font-semibold text-navy uppercase mb-2">{period.replace('_', ' ')}s</p>
                            <div className="space-y-1.5">
                              {activeRunData.result_data.action_plan[period].map((item, i) => (
                                <div key={i} className="flex items-start gap-2 text-sm text-gray-600">
                                  <span className="w-4 h-4 rounded-full bg-navy/10 text-navy text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                                  {item}
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-8">No results available yet.</p>
            )}
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExport && exportData && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => setShowExport(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-navy flex items-center gap-2">
                <CommandLineIcon className="w-5 h-5" />
                Export N8N Workflow
              </h2>
              <button onClick={() => setShowExport(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer text-xl">&times;</button>
            </div>
            <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 130px)' }}>
              {/* Instructions */}
              <div className="mb-4 bg-blue/5 rounded-lg p-4">
                <p className="text-sm font-semibold text-navy mb-2">Import Instructions</p>
                <ol className="space-y-1 text-sm text-gray-600">
                  {Object.values(exportData.instructions).map((step, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue/20 text-blue text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>

              {/* JSON */}
              <div className="relative">
                <button
                  onClick={() => copyJson(exportData.workflow)}
                  className="absolute top-3 right-3 flex items-center gap-1 px-3 py-1 bg-white/90 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-white cursor-pointer z-10"
                >
                  <ClipboardDocumentIcon className="w-3.5 h-3.5" />
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs overflow-x-auto" style={{ maxHeight: '400px' }}>
                  {JSON.stringify(exportData.workflow, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Opportunity Selection Modal */}
      {showOppModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowOppModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-navy/5">
              <h2 className="text-lg font-semibold text-navy flex items-center gap-2">
                <MagnifyingGlassIcon className="w-5 h-5" />
                Select Opportunity
              </h2>
              <button onClick={() => setShowOppModal(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer text-xl">&times;</button>
            </div>

            {/* Search Bar */}
            <div className="px-6 py-3 border-b border-gray-100">
              <div className="relative">
                <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by title, agency, or keyword..."
                  value={oppSearch}
                  onChange={(e) => setOppSearch(e.target.value)}
                  autoFocus
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">{opportunities.length} opportunities available</p>
            </div>

            {/* Opportunity Table */}
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(80vh - 200px)' }}>
              {oppLoading ? (
                <div className="flex items-center justify-center py-12">
                  <ArrowPathIcon className="w-6 h-6 animate-spin text-gray-400" />
                  <span className="text-sm text-gray-400 ml-3">Loading opportunities...</span>
                </div>
              ) : opportunities.length === 0 ? (
                <div className="text-center py-12">
                  <MagnifyingGlassIcon className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-gray-400">No opportunities found</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-600 text-xs uppercase tracking-wider">Title</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600 text-xs uppercase tracking-wider">Agency</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600 text-xs uppercase tracking-wider">Type</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600 text-xs uppercase tracking-wider">Due Date</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600 text-xs uppercase tracking-wider w-20">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {opportunities
                      .filter(o => {
                        if (!oppSearch) return true;
                        const q = oppSearch.toLowerCase();
                        return (o.title || '').toLowerCase().includes(q)
                          || (o.agency || '').toLowerCase().includes(q)
                          || (o.description || '').toLowerCase().includes(q);
                      })
                      .map((opp, idx) => (
                        <tr
                          key={opp.notice_id || idx}
                          className={`hover:bg-blue-50/50 transition-colors ${selectedOpp?.notice_id === opp.notice_id && selectedOpp?.title === opp.title ? 'bg-emerald-50' : ''}`}
                        >
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900 line-clamp-2">{opp.title}</p>
                            {opp.description && (
                              <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{opp.description.substring(0, 100)}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-600 max-w-[180px]">
                            <p className="truncate" title={opp.agency}>{opp.agency || '-'}</p>
                          </td>
                          <td className="px-4 py-3">
                            {opp.type ? (
                              <span className="inline-block px-2 py-0.5 bg-navy/10 text-navy text-xs rounded-full">{opp.type}</span>
                            ) : '-'}
                          </td>
                          <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                            {opp.due_date ? new Date(opp.due_date).toLocaleDateString() : '-'}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => {
                                handleSelectOpportunity(opp);
                                setShowOppModal(false);
                              }}
                              className="px-3 py-1 bg-accent hover:bg-accent-dark text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
                            >
                              Select
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Recent Runs */}
      <div className="bg-white rounded-xl border border-gray-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <ClockIcon className="w-4 h-4 text-gray-400" />
            Recent Workflow Runs
          </h2>
          <button onClick={fetchAll} className="text-xs text-blue hover:text-blue-light font-medium cursor-pointer flex items-center gap-1">
            <ArrowPathIcon className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
        {runs.length === 0 ? (
          <div className="text-center py-12">
            <BoltIcon className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No workflow runs yet. Trigger a workflow above to get started.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {runs.map((run) => {
              const Icon = workflowIcons[run.workflow_type] || BoltIcon;
              const st = statusStyles[run.status] || statusStyles.pending;
              const StIcon = st.icon;
              return (
                <div key={run.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50/50">
                  <div className="bg-navy/5 rounded-lg p-2">
                    <Icon className="w-5 h-5 text-navy" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 capitalize">
                      {run.workflow_type.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-gray-400">
                      {run.mode} &middot; {new Date(run.created_at).toLocaleString()}
                    </p>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${st.cls}`}>
                    <StIcon className={`w-3.5 h-3.5 ${run.status === 'running' ? 'animate-spin' : ''}`} />
                    {st.label}
                  </span>
                  <div className="flex items-center gap-1">
                    {run.has_result && (
                      <button
                        onClick={() => viewRun(run.id)}
                        className="p-1.5 text-gray-400 hover:text-blue rounded-lg hover:bg-blue/5 cursor-pointer"
                        title="View Results"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteRun(run.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 cursor-pointer"
                      title="Delete"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

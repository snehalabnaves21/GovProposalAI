import { useState, useEffect } from 'react';
import {
  BuildingOffice2Icon,
  ShieldCheckIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  ChartBarIcon,
  StarIcon,
} from '@heroicons/react/24/outline';
import api from '../services/api';

const statusOptions = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'compliant', label: 'Compliant' },
];

const statusBadge = {
  compliant: { label: 'Compliant', cls: 'bg-emerald-50 text-emerald-700', icon: CheckCircleIcon },
  in_progress: { label: 'In Progress', cls: 'bg-amber-50 text-amber-700', icon: ClockIcon },
  not_started: { label: 'Not Started', cls: 'bg-red-50 text-red-700', icon: XCircleIcon },
};

const priorityColors = {
  high: 'bg-red-50 text-red-700',
  medium: 'bg-amber-50 text-amber-700',
  low: 'bg-gray-100 text-gray-600',
};

const scoreColor = (score) => {
  if (score >= 80) return 'text-emerald-600';
  if (score >= 50) return 'text-amber-600';
  return 'text-red-600';
};

const scoreBarColor = (score) => {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 50) return 'bg-amber-500';
  return 'bg-red-500';
};

export default function CompanyCompliance() {
  const [companyData, setCompanyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checkResults, setCheckResults] = useState(null);

  // Profile form
  const [profileForm, setProfileForm] = useState({
    company_name: '',
    uei: '',
    sam_registered: false,
    business_type: '',
  });
  const [profileEditing, setProfileEditing] = useState(false);

  // NAICS modal
  const [showNaicsModal, setShowNaicsModal] = useState(false);
  const [naicsSearch, setNaicsSearch] = useState('');
  const [naicsResults, setNaicsResults] = useState([]);
  const [naicsSearching, setNaicsSearching] = useState(false);

  // Compliance edit modal
  // Compliance edit modal
  const [editingCompliance, setEditingCompliance] = useState(null);
  const [complianceForm, setComplianceForm] = useState({
    status: 'not_started',
    certification_date: '',
    expiry_date: '',
    notes: '',
  });
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchCompanyData();
  }, []);

  const fetchCompanyData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/compliance/company');
      setCompanyData(res.data);
      const p = res.data?.profile || {};
      setProfileForm({
        company_name: p.company_name || '',
        uei: p.uei || '',
        sam_registered: p.sam_registered || false,
        business_type: p.business_type || '',
      });
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load company data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      await api.post('/api/compliance/company', profileForm);
      setProfileEditing(false);
      await fetchCompanyData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveNaics = async (naicsId) => {
    if (!confirm('Remove this NAICS code from your company?')) return;
    try {
      await api.delete(`/api/compliance/company/naics/${naicsId}`);
      await fetchCompanyData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to remove NAICS code');
    }
  };

  const handleSetPrimary = async (naicsId) => {
    try {
      await api.post('/api/compliance/company/naics', { naics_id: naicsId, is_primary: true });
      await fetchCompanyData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to set primary NAICS');
    }
  };

  const handleSearchNaics = async () => {
    if (!naicsSearch.trim()) return;
    try {
      setNaicsSearching(true);
      const res = await api.get('/api/compliance/naics', { params: { category: naicsSearch } });
      setNaicsResults(res.data?.naics_codes || res.data || []);
    } catch {
      setNaicsResults([]);
    } finally {
      setNaicsSearching(false);
    }
  };

  const handleAddNaics = async (naicsId) => {
    try {
      await api.post('/api/compliance/company/naics', { naics_id: naicsId, is_primary: false });
      setShowNaicsModal(false);
      setNaicsSearch('');
      setNaicsResults([]);
      await fetchCompanyData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to add NAICS code');
    }
  };

  const handleOpenComplianceEdit = (cs) => {
    setEditingCompliance(cs);
    setComplianceForm({
      status: cs.status || 'not_started',
      certification_date: cs.certification_date || '',
      expiry_date: cs.expiry_date || '',
      notes: cs.notes || '',
    });
  };

  const handleSaveCompliance = async () => {
    if (!editingCompliance) return;
    try {
      setSaving(true);
      await api.put(`/api/compliance/company/compliance/${editingCompliance.id}`, complianceForm);
      setEditingCompliance(null);
      await fetchCompanyData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update compliance status');
    } finally {
      setSaving(false);
    }
  };

  const handleRunCheck = async () => {
    try {
      setChecking(true);
      const res = await api.get('/api/compliance/company/check');
      setCheckResults(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Compliance check failed');
    } finally {
      setChecking(false);
    }
  };

  const handleSyncProfile = async () => {
    try {
      setSyncing(true);
      setError(null);
      await api.post('/api/compliance/company/sync-profile');
      await fetchCompanyData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to sync from Business Profile. Make sure you have a Business Profile set up.');
    } finally {
      setSyncing(false);
    }
  };

  const profile = companyData?.profile || {};
  const naicsCodes = companyData?.naics_codes || [];
  const complianceStatuses = companyData?.compliance_statuses || [];
  const score = companyData?.compliance_score ?? 0;

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-center py-20">
          <svg className="animate-spin w-8 h-8 text-navy" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-navy">Company Compliance</h1>
          <p className="text-gray-500 mt-1">Manage your company profile, NAICS codes, and compliance status</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSyncProfile}
            disabled={syncing}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue hover:bg-blue-light text-white rounded-lg text-sm font-medium transition-colors cursor-pointer disabled:opacity-60"
          >
            <ArrowPathIcon className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync from Business Profile'}
          </button>
          <button
            onClick={handleRunCheck}
            disabled={checking}
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-dark transition-colors cursor-pointer disabled:opacity-60"
          >
            <ArrowPathIcon className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
            {checking ? 'Running...' : 'Run Full Check'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">{error}</p>
            <button onClick={() => setError(null)} className="text-xs text-red-600 underline mt-1 cursor-pointer">Dismiss</button>
          </div>
        </div>
      )}

      {/* Compliance Score */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-navy flex items-center gap-2">
            <ChartBarIcon className="w-5 h-5" />
            Compliance Score
          </h2>
          <span className={`text-3xl font-bold ${scoreColor(score)}`}>{score}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-4">
          <div className={`h-4 rounded-full transition-all ${scoreBarColor(score)}`} style={{ width: `${score}%` }} />
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Based on {complianceStatuses.filter(s => s.status === 'compliant').length} of {complianceStatuses.length} requirements met
        </p>
      </div>

      {/* Company Profile */}
      <div className="bg-white rounded-xl border border-gray-100 mb-6">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <BuildingOffice2Icon className="w-4 h-4 text-gray-400" />
            Company Profile
          </h2>
          {!profileEditing ? (
            <button
              onClick={() => setProfileEditing(true)}
              className="inline-flex items-center gap-1 text-xs font-medium text-blue hover:text-blue-light cursor-pointer"
            >
              <PencilIcon className="w-3 h-3" />
              Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setProfileEditing(false)}
                className="text-xs text-gray-500 hover:text-gray-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="inline-flex items-center gap-1 px-3 py-1 bg-accent text-white rounded-lg text-xs font-medium hover:bg-accent-dark cursor-pointer disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          )}
        </div>
        <div className="p-5">
          {profileEditing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Company Name</label>
                <input
                  type="text"
                  value={profileForm.company_name}
                  onChange={(e) => setProfileForm({ ...profileForm, company_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">UEI Number</label>
                <input
                  type="text"
                  value={profileForm.uei}
                  onChange={(e) => setProfileForm({ ...profileForm, uei: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Business Type</label>
                <input
                  type="text"
                  value={profileForm.business_type}
                  onChange={(e) => setProfileForm({ ...profileForm, business_type: e.target.value })}
                  placeholder="e.g., Small Business, 8(a), SDVOSB"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue"
                />
              </div>
              <div className="flex items-center gap-3 pt-5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profileForm.sam_registered}
                    onChange={(e) => setProfileForm({ ...profileForm, sam_registered: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-navy focus:ring-blue accent-navy cursor-pointer"
                  />
                  <span className="text-sm text-gray-700">SAM.gov Registered</span>
                </label>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-400 mb-0.5">Company Name</p>
                <p className="text-sm text-gray-900 font-medium">{profile.company_name || '--'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400 mb-0.5">UEI Number</p>
                <p className="text-sm text-gray-900 font-mono">{profile.uei || '--'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400 mb-0.5">Business Type</p>
                <p className="text-sm text-gray-900">{profile.business_type || '--'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400 mb-0.5">SAM.gov Registered</p>
                <p className="text-sm">
                  {profile.sam_registered ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700">
                      <CheckCircleIcon className="w-4 h-4" /> Yes
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-gray-400">
                      <XCircleIcon className="w-4 h-4" /> No
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* My NAICS Codes */}
      <div className="bg-white rounded-xl border border-gray-100 mb-6">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <ShieldCheckIcon className="w-4 h-4 text-gray-400" />
            My NAICS Codes
          </h2>
          <button
            onClick={() => setShowNaicsModal(true)}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-navy text-white rounded-lg text-xs font-medium hover:bg-navy-light transition-colors cursor-pointer"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            Add NAICS
          </button>
        </div>
        <div className="p-5">
          {naicsCodes.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-gray-400 mb-2">No NAICS codes selected yet</p>
              <button
                onClick={() => setShowNaicsModal(true)}
                className="text-xs font-medium text-blue hover:text-blue-light cursor-pointer"
              >
                Add your first NAICS code
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {naicsCodes.map((n) => (
                <div key={n.id || n.naics_id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <span className="font-mono font-bold text-navy text-sm">{n.code}</span>
                  <span className="text-sm text-gray-600 flex-1 truncate">{n.title}</span>
                  {n.is_primary && (
                    <span className="text-[10px] font-semibold text-accent bg-accent/10 px-2 py-0.5 rounded-full">Primary</span>
                  )}
                  {!n.is_primary && (
                    <button
                      onClick={() => handleSetPrimary(n.id || n.naics_id)}
                      title="Set as primary"
                      className="p-1 text-gray-400 hover:text-amber-500 cursor-pointer"
                    >
                      <StarIcon className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleRemoveNaics(n.id || n.naics_id)}
                    title="Remove"
                    className="p-1 text-gray-400 hover:text-red-500 cursor-pointer"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Compliance Status Table */}
      <div className="bg-white rounded-xl border border-gray-100 mb-6">
        <div className="px-5 py-4 border-b border-gray-50">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <ShieldCheckIcon className="w-4 h-4 text-gray-400" />
            Compliance Status
          </h2>
        </div>
        {complianceStatuses.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-gray-400">Add NAICS codes to see required compliance items.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">Requirement</th>
                  <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">Category</th>
                  <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">Priority</th>
                  <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">Status</th>
                  <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">Cert. Date</th>
                  <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">Expiry</th>
                  <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">Notes</th>
                  <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {complianceStatuses.map((cs) => {
                  const badge = statusBadge[cs.status] || statusBadge.not_started;
                  const pColor = priorityColors[cs.priority?.toLowerCase()] || priorityColors.low;
                  return (
                    <tr key={cs.id || cs.requirement_id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3">
                        <span className="font-medium text-gray-900 text-sm">{cs.requirement_name || cs.name}</span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-gray-100 text-gray-600">
                          {cs.category}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${pColor}`}>
                          {cs.priority || 'Low'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-500">{cs.certification_date || '--'}</td>
                      <td className="px-5 py-3 text-xs text-gray-500">{cs.expiry_date || '--'}</td>
                      <td className="px-5 py-3 text-xs text-gray-500 max-w-[150px] truncate">{cs.notes || '--'}</td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() => handleOpenComplianceEdit(cs)}
                          className="p-1 text-gray-400 hover:text-blue cursor-pointer"
                          title="Edit status"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Check Results */}
      {checkResults && (
        <div className="bg-white rounded-xl border border-gray-100 mb-6">
          <div className="px-5 py-4 border-b border-gray-50">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <ArrowPathIcon className="w-4 h-4 text-gray-400" />
              Full Check Results
            </h2>
          </div>
          <div className="p-5">
            {checkResults.score !== undefined && (
              <div className="mb-4">
                <p className="text-sm text-gray-500 mb-1">Score</p>
                <span className={`text-2xl font-bold ${scoreColor(checkResults.score)}`}>{checkResults.score}%</span>
              </div>
            )}
            {checkResults.missing_requirements?.length > 0 && (
              <div>
                <p className="text-sm font-medium text-red-700 mb-2">Missing ({checkResults.missing_requirements.length})</p>
                <div className="space-y-1">
                  {checkResults.missing_requirements.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg p-2">
                      <XCircleIcon className="w-4 h-4 flex-shrink-0" />
                      <span>{r.name || r}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* NAICS Add Modal */}
      {showNaicsModal && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" onClick={() => setShowNaicsModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-navy">Add NAICS Code</h3>
                <button onClick={() => setShowNaicsModal(false)} className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer">
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 border-b border-gray-100">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={naicsSearch}
                      onChange={(e) => setNaicsSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearchNaics()}
                      placeholder="Search by code or keyword..."
                      className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue"
                      autoFocus
                    />
                  </div>
                  <button
                    onClick={handleSearchNaics}
                    disabled={naicsSearching}
                    className="px-4 py-2 bg-navy text-white rounded-lg text-sm font-medium hover:bg-navy-light cursor-pointer disabled:opacity-60"
                  >
                    {naicsSearching ? 'Searching...' : 'Search'}
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                {naicsResults.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">Search for NAICS codes to add them to your company.</p>
                ) : (
                  <div className="space-y-2">
                    {naicsResults.map((n) => (
                      <div key={n.id || n.code} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <span className="font-mono font-bold text-navy text-sm">{n.code}</span>
                          <span className="text-sm text-gray-600 ml-2">{n.title}</span>
                        </div>
                        <button
                          onClick={() => handleAddNaics(n.id || n.code)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-accent text-white rounded-lg text-xs font-medium hover:bg-accent-dark cursor-pointer"
                        >
                          <PlusIcon className="w-3.5 h-3.5" />
                          Add
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Compliance Edit Modal */}
      {editingCompliance && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" onClick={() => setEditingCompliance(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-navy">Update Compliance Status</h3>
                <button onClick={() => setEditingCompliance(null)} className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer">
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <p className="text-sm font-medium text-navy mb-1">{editingCompliance.requirement_name || editingCompliance.name}</p>
                  <p className="text-xs text-gray-400">{editingCompliance.category}</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                  <select
                    value={complianceForm.status}
                    onChange={(e) => setComplianceForm({ ...complianceForm, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue"
                  >
                    {statusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Certification Date</label>
                    <input
                      type="date"
                      value={complianceForm.certification_date}
                      onChange={(e) => setComplianceForm({ ...complianceForm, certification_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Expiry Date</label>
                    <input
                      type="date"
                      value={complianceForm.expiry_date}
                      onChange={(e) => setComplianceForm({ ...complianceForm, expiry_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
                  <textarea
                    value={complianceForm.notes}
                    onChange={(e) => setComplianceForm({ ...complianceForm, notes: e.target.value })}
                    rows={3}
                    placeholder="Add notes about this compliance item..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue resize-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100">
                <button
                  onClick={() => setEditingCompliance(null)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCompliance}
                  disabled={saving}
                  className="px-4 py-2 bg-navy text-white rounded-lg text-sm font-medium hover:bg-navy-light cursor-pointer disabled:opacity-60"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

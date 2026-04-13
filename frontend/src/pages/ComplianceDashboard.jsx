import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheckIcon,
  ClipboardDocumentCheckIcon,
  TruckIcon,
  ArrowPathIcon,
  SparklesIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import api from '../services/api';

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

const statusBadge = {
  compliant: { label: 'Compliant', cls: 'bg-emerald-50 text-emerald-700' },
  in_progress: { label: 'In Progress', cls: 'bg-amber-50 text-amber-700' },
  not_started: { label: 'Not Started', cls: 'bg-red-50 text-red-700' },
};

export default function ComplianceDashboard() {
  const [companyData, setCompanyData] = useState(null);
  const [checkResults, setCheckResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/compliance/company');
      setCompanyData(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load compliance data');
    } finally {
      setLoading(false);
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

  const profile = companyData?.profile || {};
  const naicsCodes = companyData?.naics_codes || [];
  const complianceStatuses = companyData?.compliance_statuses || [];
  const score = companyData?.compliance_score ?? 0;

  const totalCompliant = complianceStatuses.filter(s => s.status === 'compliant').length;
  const totalInProgress = complianceStatuses.filter(s => s.status === 'in_progress').length;
  const totalNotStarted = complianceStatuses.filter(s => s.status === 'not_started').length;

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
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-navy">Compliance Dashboard</h1>
        <p className="text-gray-500 mt-1">Monitor your GovCon compliance posture and readiness</p>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">NAICS Codes</p>
              <p className="text-3xl font-bold text-navy mt-2">{naicsCodes.length}</p>
              <p className="text-xs text-gray-400 mt-2">Selected for your company</p>
            </div>
            <div className="bg-blue rounded-lg p-3">
              <ClipboardDocumentCheckIcon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Requirements</p>
              <p className="text-3xl font-bold text-navy mt-2">{complianceStatuses.length}</p>
              <p className="text-xs text-gray-400 mt-2">{totalCompliant} compliant</p>
            </div>
            <div className="bg-amber-500 rounded-lg p-3">
              <ShieldCheckIcon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Contract Vehicles</p>
              <p className="text-3xl font-bold text-navy mt-2">{companyData?.eligible_vehicles?.length ?? 0}</p>
              <p className="text-xs text-gray-400 mt-2">Eligible based on NAICS</p>
            </div>
            <div className="bg-purple-500 rounded-lg p-3">
              <TruckIcon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Compliance Score</p>
              <p className={`text-3xl font-bold mt-2 ${scoreColor(score)}`}>{score}%</p>
              <div className="mt-2 w-full bg-gray-100 rounded-full h-2">
                <div className={`h-2 rounded-full transition-all ${scoreBarColor(score)}`} style={{ width: `${score}%` }} />
              </div>
            </div>
            <div className="bg-accent rounded-lg p-3">
              <ChartBarIcon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-navy mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={handleRunCheck}
            disabled={checking}
            className="bg-accent hover:bg-accent-dark text-white rounded-xl p-5 transition-all shadow-sm hover:shadow-lg hover:-translate-y-0.5 text-left cursor-pointer disabled:opacity-60"
          >
            <ArrowPathIcon className={`w-8 h-8 mb-3 ${checking ? 'animate-spin' : ''}`} />
            <h3 className="font-semibold text-lg">{checking ? 'Running Check...' : 'Run Compliance Check'}</h3>
            <p className="text-white/80 text-sm mt-1">Analyze your compliance status against all requirements</p>
          </button>

          <Link
            to="/compliance/recommendations"
            className="bg-blue hover:bg-blue-light text-white rounded-xl p-5 transition-all no-underline shadow-sm hover:shadow-lg hover:-translate-y-0.5"
          >
            <SparklesIcon className="w-8 h-8 mb-3" />
            <h3 className="font-semibold text-lg">View Recommendations</h3>
            <p className="text-white/80 text-sm mt-1">AI-powered contract vehicle and compliance suggestions</p>
          </Link>
        </div>
      </div>

      {/* Company NAICS Codes & Compliance Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* NAICS Codes */}
        <div className="bg-white rounded-xl border border-gray-100">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <ClipboardDocumentCheckIcon className="w-4 h-4 text-gray-400" />
              Your NAICS Codes
            </h2>
            <Link to="/compliance/company" className="text-xs font-medium text-blue hover:text-blue-light no-underline">
              Manage
            </Link>
          </div>
          <div className="p-5">
            {naicsCodes.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-gray-400 mb-2">No NAICS codes selected</p>
                <Link to="/compliance/naics" className="text-xs font-medium text-blue hover:text-blue-light no-underline">
                  Browse NAICS Codes
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {naicsCodes.map((n) => (
                  <div key={n.id || n.naics_id} className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50">
                    <span className="font-mono font-bold text-navy text-sm">{n.code}</span>
                    <span className="text-sm text-gray-600 flex-1 truncate">{n.title}</span>
                    {n.is_primary && (
                      <span className="text-[10px] font-semibold text-accent bg-accent/10 px-2 py-0.5 rounded-full">Primary</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Compliance Status Summary */}
        <div className="bg-white rounded-xl border border-gray-100">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <ShieldCheckIcon className="w-4 h-4 text-gray-400" />
              Compliance Status
            </h2>
            <Link to="/compliance/company" className="text-xs font-medium text-blue hover:text-blue-light no-underline">
              View All
            </Link>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center p-3 rounded-lg bg-emerald-50">
                <CheckCircleIcon className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-emerald-700">{totalCompliant}</p>
                <p className="text-[10px] text-emerald-600 font-medium">Compliant</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-amber-50">
                <ClockIcon className="w-5 h-5 text-amber-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-amber-700">{totalInProgress}</p>
                <p className="text-[10px] text-amber-600 font-medium">In Progress</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-red-50">
                <XCircleIcon className="w-5 h-5 text-red-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-red-700">{totalNotStarted}</p>
                <p className="text-[10px] text-red-600 font-medium">Not Started</p>
              </div>
            </div>

            {complianceStatuses.length > 0 && (
              <div className="space-y-1.5">
                {complianceStatuses.slice(0, 5).map((cs) => {
                  const badge = statusBadge[cs.status] || statusBadge.not_started;
                  return (
                    <div key={cs.id || cs.requirement_id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                      <span className="text-sm text-gray-700 truncate flex-1 mr-3">{cs.requirement_name || cs.name}</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Check Results */}
      {checkResults && (
        <div className="bg-white rounded-xl border border-gray-100 mb-8">
          <div className="px-5 py-4 border-b border-gray-50">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <ArrowPathIcon className="w-4 h-4 text-gray-400" />
              Latest Compliance Check Results
            </h2>
          </div>
          <div className="p-5">
            {checkResults.score !== undefined && (
              <div className="mb-4">
                <p className="text-sm text-gray-500 mb-1">Overall Score</p>
                <div className="flex items-center gap-3">
                  <span className={`text-2xl font-bold ${scoreColor(checkResults.score)}`}>{checkResults.score}%</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-3">
                    <div className={`h-3 rounded-full transition-all ${scoreBarColor(checkResults.score)}`} style={{ width: `${checkResults.score}%` }} />
                  </div>
                </div>
              </div>
            )}

            {checkResults.missing_requirements?.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-medium text-red-700 mb-2">Missing Requirements ({checkResults.missing_requirements.length})</p>
                <div className="space-y-1">
                  {checkResults.missing_requirements.map((req, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg p-2">
                      <XCircleIcon className="w-4 h-4 flex-shrink-0" />
                      <span>{req.name || req}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {checkResults.recommendations?.length > 0 && (
              <div>
                <p className="text-sm font-medium text-blue mb-2">Recommendations</p>
                <div className="space-y-1">
                  {checkResults.recommendations.map((rec, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-blue bg-blue/5 rounded-lg p-2">
                      <SparklesIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>{rec.text || rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

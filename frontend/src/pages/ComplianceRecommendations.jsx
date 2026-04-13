import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  SparklesIcon,
  TruckIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowTopRightOnSquareIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import api from '../services/api';

const matchScoreColor = (score) => {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 50) return 'bg-amber-500';
  return 'bg-red-500';
};

const matchScoreText = (score) => {
  if (score >= 80) return 'text-emerald-700';
  if (score >= 50) return 'text-amber-700';
  return 'text-red-700';
};

export default function ComplianceRecommendations() {
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/compliance/company/recommendations');
      setRecommendations(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  };

  const vehicleRecs = recommendations?.recommended_vehicles || recommendations?.vehicles || [];
  const missingAlerts = recommendations?.missing_compliance || recommendations?.alerts || [];

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <svg className="animate-spin w-8 h-8 text-navy mx-auto mb-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm text-gray-500">Generating AI recommendations...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-navy flex items-center gap-3">
          <SparklesIcon className="w-8 h-8 text-accent" />
          AI Recommendations
        </h1>
        <p className="text-gray-500 mt-1">Personalized recommendations based on your NAICS codes and compliance status</p>
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

      {/* Missing Compliance Alerts */}
      {missingAlerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 mb-8">
          <h2 className="text-sm font-semibold text-red-800 flex items-center gap-2 mb-3">
            <ExclamationTriangleIcon className="w-4 h-4" />
            Missing Compliance Alerts ({missingAlerts.length})
          </h2>
          <div className="space-y-2">
            {missingAlerts.map((alert, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-red-100">
                <XCircleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800">{alert.name || alert.requirement_name || alert}</p>
                  {alert.description && (
                    <p className="text-xs text-red-600 mt-0.5">{alert.description}</p>
                  )}
                  {alert.impact && (
                    <p className="text-xs text-red-500 mt-1 italic">Impact: {alert.impact}</p>
                  )}
                </div>
                {alert.category && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-red-100 text-red-700 flex-shrink-0">
                    {alert.category}
                  </span>
                )}
              </div>
            ))}
          </div>
          <div className="mt-3">
            <Link
              to="/compliance/company"
              className="inline-flex items-center gap-1 text-xs font-medium text-red-700 hover:text-red-900 no-underline"
            >
              Update compliance status
              <ArrowTopRightOnSquareIcon className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}

      {/* Recommended Contract Vehicles */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-navy mb-4 flex items-center gap-2">
          <TruckIcon className="w-5 h-5" />
          Recommended Contract Vehicles
        </h2>

        {vehicleRecs.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
            <SparklesIcon className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400 mb-2">No recommendations available yet.</p>
            <p className="text-xs text-gray-400">Add NAICS codes and update your compliance status to get personalized recommendations.</p>
            <Link
              to="/compliance/company"
              className="inline-flex items-center gap-1 mt-4 px-4 py-2 bg-navy text-white rounded-lg text-sm font-medium no-underline hover:bg-navy-light transition-colors"
            >
              Set Up Company Profile
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {vehicleRecs.map((rec, i) => {
              const matchScore = rec.match_score || rec.score || 0;
              const matchPct = Math.round(matchScore * (matchScore > 1 ? 1 : 100));

              return (
                <div key={i} className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-sm transition-shadow">
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      {/* Score */}
                      <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-gray-50 flex flex-col items-center justify-center">
                        <span className={`text-xl font-bold ${matchScoreText(matchPct)}`}>{matchPct}%</span>
                        <span className="text-[9px] text-gray-400 uppercase font-semibold">Match</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Vehicle Name & Type */}
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="text-lg font-semibold text-navy">{rec.vehicle_name || rec.name}</h3>
                          {rec.vehicle_type || rec.type ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue/10 text-blue">
                              {rec.vehicle_type || rec.type}
                            </span>
                          ) : null}
                        </div>

                        {/* Match Score Bar */}
                        <div className="flex items-center gap-2 mb-3">
                          <div className="flex-1 max-w-xs bg-gray-100 rounded-full h-2">
                            <div className={`h-2 rounded-full transition-all ${matchScoreColor(matchPct)}`} style={{ width: `${matchPct}%` }} />
                          </div>
                          <span className="text-xs text-gray-400">{matchPct}% match</span>
                        </div>

                        {/* Reason */}
                        {rec.reason && (
                          <p className="text-sm text-gray-600 mb-3">{rec.reason}</p>
                        )}

                        {/* Required Compliance with met/unmet marks */}
                        {rec.required_compliance?.length > 0 && (
                          <div>
                            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Required Compliance</p>
                            <div className="flex flex-wrap gap-1.5">
                              {rec.required_compliance.map((rc, j) => {
                                const isMet = rc.met || rc.status === 'compliant';
                                return (
                                  <span
                                    key={j}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium ${
                                      isMet
                                        ? 'bg-emerald-50 text-emerald-700'
                                        : 'bg-red-50 text-red-700'
                                    }`}
                                  >
                                    {isMet ? (
                                      <CheckCircleIcon className="w-3.5 h-3.5" />
                                    ) : (
                                      <XCircleIcon className="w-3.5 h-3.5" />
                                    )}
                                    {rc.name || rc}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end mt-4 pt-3 border-t border-gray-50">
                      <Link
                        to="/compliance/vehicles"
                        className="inline-flex items-center gap-1 text-xs font-medium text-blue hover:text-blue-light no-underline"
                      >
                        View Details
                        <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                      </Link>
                    </div>
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

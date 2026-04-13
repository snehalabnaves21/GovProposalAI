import { useState, useEffect, useMemo } from 'react';
import {
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PlusIcon,
  ShieldCheckIcon,
  TruckIcon,
  TagIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import api from '../services/api';

const categories = [
  'All',
  'IT & Technology',
  'Consulting',
  'Cybersecurity',
  'Construction',
  'Healthcare',
  'R&D',
];

const categoryColors = {
  'IT & Technology': 'bg-blue/10 text-blue',
  Consulting: 'bg-purple-100 text-purple-700',
  Cybersecurity: 'bg-red-50 text-red-700',
  Construction: 'bg-amber-50 text-amber-700',
  Healthcare: 'bg-emerald-50 text-emerald-700',
  'R&D': 'bg-cyan-50 text-cyan-700',
};

const priorityColors = {
  high: 'bg-red-50 text-red-700',
  medium: 'bg-amber-50 text-amber-700',
  low: 'bg-gray-100 text-gray-600',
};

export default function NaicsExplorer() {
  const [naicsCodes, setNaicsCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [expandedCode, setExpandedCode] = useState(null);
  const [codeDetails, setCodeDetails] = useState({});
  const [detailLoading, setDetailLoading] = useState(null);
  const [addingNaics, setAddingNaics] = useState(null);
  const [addSuccess, setAddSuccess] = useState(null);
  const [complianceSuggestions, setComplianceSuggestions] = useState({});
  const [togglingCompliance, setTogglingCompliance] = useState(null);

  useEffect(() => {
    fetchNaicsCodes();
  }, [activeCategory]);

  const fetchNaicsCodes = async () => {
    try {
      setLoading(true);
      const params = activeCategory !== 'All' ? { category: activeCategory } : {};
      const res = await api.get('/api/compliance/naics', { params });
      setNaicsCodes(res.data?.naics_codes || res.data || []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load NAICS codes');
    } finally {
      setLoading(false);
    }
  };

  const fetchDetails = async (code) => {
    if (codeDetails[code]) return;
    try {
      setDetailLoading(code);
      const [detailRes, suggestRes] = await Promise.all([
        api.get(`/api/compliance/naics/${code}`),
        api.get(`/api/compliance/naics/${code}/suggest-compliance`).catch(() => ({ data: null })),
      ]);
      setCodeDetails((prev) => ({ ...prev, [code]: detailRes.data }));
      if (suggestRes.data) {
        setComplianceSuggestions((prev) => ({ ...prev, [code]: suggestRes.data }));
      }
    } catch {
      // silently fail
    } finally {
      setDetailLoading(null);
    }
  };

  const handleToggleCompliance = async (code, requirementId) => {
    try {
      setTogglingCompliance(requirementId);
      const res = await api.post(`/api/compliance/naics/${code}/confirm-compliance/${requirementId}`);
      // Update local state
      setComplianceSuggestions((prev) => {
        const suggestions = { ...prev };
        if (suggestions[code]?.suggested_compliance) {
          suggestions[code] = {
            ...suggestions[code],
            suggested_compliance: suggestions[code].suggested_compliance.map((s) =>
              s.id === requirementId ? { ...s, confirmed: res.data.confirmed, user_status: res.data.status } : s
            ),
            confirmed_count: suggestions[code].suggested_compliance.filter(
              (s) => (s.id === requirementId ? res.data.confirmed : s.confirmed)
            ).length,
          };
        }
        return suggestions;
      });
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to toggle compliance');
    } finally {
      setTogglingCompliance(null);
    }
  };

  const handleExpand = (code) => {
    if (expandedCode === code) {
      setExpandedCode(null);
    } else {
      setExpandedCode(code);
      fetchDetails(code);
    }
  };

  const handleAddToCompany = async (naicsId) => {
    try {
      setAddingNaics(naicsId);
      await api.post('/api/compliance/company/naics', { naics_id: naicsId, is_primary: false });
      setAddSuccess(naicsId);
      setTimeout(() => setAddSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to add NAICS code');
    } finally {
      setAddingNaics(null);
    }
  };

  const filteredCodes = useMemo(() => {
    if (!search.trim()) return naicsCodes;
    const s = search.toLowerCase();
    return naicsCodes.filter(
      (n) =>
        n.code?.toLowerCase().includes(s) ||
        n.title?.toLowerCase().includes(s) ||
        n.description?.toLowerCase().includes(s)
    );
  }, [naicsCodes, search]);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-navy">NAICS Explorer</h1>
        <p className="text-gray-500 mt-1">Browse and search NAICS codes with compliance requirements</p>
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

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative max-w-xl">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by code number, title, or keyword..."
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue transition-all bg-white"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              activeCategory === cat
                ? 'bg-navy text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Results Count */}
      <p className="text-sm text-gray-400 mb-4">{filteredCodes.length} NAICS codes found</p>

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <svg className="animate-spin w-8 h-8 text-navy" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : filteredCodes.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <p className="text-gray-400 text-sm">No NAICS codes match your search criteria.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCodes.map((naics) => {
            const isExpanded = expandedCode === naics.code;
            const details = codeDetails[naics.code];
            const catColor = categoryColors[naics.category] || 'bg-gray-100 text-gray-600';

            return (
              <div key={naics.code} className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-sm transition-shadow">
                {/* Card Header */}
                <button
                  onClick={() => handleExpand(naics.code)}
                  className="w-full flex items-center gap-4 p-5 text-left cursor-pointer hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-mono font-bold text-navy text-lg">{naics.code}</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${catColor}`}>
                        {naics.category || 'General'}
                      </span>
                      {naics.requirement_count !== undefined && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-navy/5 text-navy">
                          <ShieldCheckIcon className="w-3 h-3" />
                          {naics.requirement_count} requirements
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 font-medium">{naics.title}</p>
                  </div>
                  {isExpanded ? (
                    <ChevronUpIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronDownIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  )}
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-gray-100 p-5 bg-gray-50/30">
                    {detailLoading === naics.code ? (
                      <div className="flex items-center justify-center py-8">
                        <svg className="animate-spin w-6 h-6 text-gray-400" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      </div>
                    ) : details ? (
                      <div className="space-y-6">
                        {/* Description */}
                        {details.description && (
                          <div>
                            <h3 className="text-sm font-semibold text-navy mb-2">Description</h3>
                            <p className="text-sm text-gray-600">{details.description}</p>
                          </div>
                        )}

                        {/* AI Suggested Compliance with Checkmarks */}
                        {(() => {
                          const suggestions = complianceSuggestions[naics.code];
                          const reqList = suggestions?.suggested_compliance || details.requirements || [];
                          if (reqList.length === 0) return null;
                          return (
                            <div>
                              <h3 className="text-sm font-semibold text-navy mb-1 flex items-center gap-2">
                                <ShieldCheckIcon className="w-4 h-4" />
                                AI Suggested Compliance ({reqList.length})
                                {suggestions && (
                                  <span className="text-xs font-normal text-gray-400">
                                    {suggestions.confirmed_count || 0} of {suggestions.total || reqList.length} confirmed
                                  </span>
                                )}
                              </h3>
                              <p className="text-xs text-gray-400 mb-3">Check mark items your company is compliant with</p>
                              <div className="space-y-1.5">
                                {reqList.map((req, i) => {
                                  const isConfirmed = req.confirmed || req.user_status === 'compliant';
                                  const isToggling = togglingCompliance === req.id;
                                  return (
                                    <div
                                      key={req.id || i}
                                      className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${
                                        isConfirmed ? 'bg-emerald-50/50 border-emerald-200' : 'bg-white border-gray-100'
                                      }`}
                                    >
                                      <button
                                        onClick={() => req.id && handleToggleCompliance(naics.code, req.id)}
                                        disabled={isToggling || !req.id}
                                        className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border-2 transition-colors cursor-pointer ${
                                          isConfirmed
                                            ? 'bg-emerald-500 border-emerald-500 text-white'
                                            : 'border-gray-300 hover:border-emerald-400'
                                        } ${isToggling ? 'opacity-50' : ''}`}
                                      >
                                        {isConfirmed && (
                                          <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                                            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                          </svg>
                                        )}
                                      </button>
                                      <div className="flex-1 min-w-0">
                                        <span className={`text-sm ${isConfirmed ? 'text-emerald-700 font-medium' : 'text-gray-700'}`}>{req.name}</span>
                                      </div>
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium ${
                                        req.category === 'Cybersecurity' ? 'bg-red-50 text-red-600' :
                                        req.category === 'Financial' ? 'bg-amber-50 text-amber-600' :
                                        'bg-gray-100 text-gray-500'
                                      }`}>
                                        {req.category}
                                      </span>
                                      {req.mandatory && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-red-50 text-red-700">Required</span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Eligible Contract Vehicles */}
                        {details.contract_vehicles?.length > 0 && (
                          <div>
                            <h3 className="text-sm font-semibold text-navy mb-2 flex items-center gap-2">
                              <TruckIcon className="w-4 h-4" />
                              Eligible Contract Vehicles ({details.contract_vehicles.length})
                            </h3>
                            <div className="overflow-x-auto">
                              <table className="w-full">
                                <thead>
                                  <tr className="border-b border-gray-200">
                                    <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-3 py-2">Name</th>
                                    <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-3 py-2">Type</th>
                                    <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-3 py-2">Relevance</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {details.contract_vehicles.map((v, i) => (
                                    <tr key={i} className="border-b border-gray-100 last:border-0">
                                      <td className="px-3 py-2 text-sm text-gray-700 font-medium">{v.name}</td>
                                      <td className="px-3 py-2">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue/10 text-blue">
                                          {v.type}
                                        </span>
                                      </td>
                                      <td className="px-3 py-2">
                                        <div className="flex items-center gap-2">
                                          <div className="w-16 bg-gray-100 rounded-full h-1.5">
                                            <div className="h-1.5 rounded-full bg-accent" style={{ width: `${(v.relevance_score || 0) * 100}%` }} />
                                          </div>
                                          <span className="text-xs text-gray-500">{Math.round((v.relevance_score || 0) * 100)}%</span>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Add to Company Button */}
                        <div className="flex justify-end pt-2">
                          <button
                            onClick={() => handleAddToCompany(naics.id || naics.code)}
                            disabled={addingNaics === (naics.id || naics.code)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-navy text-white rounded-lg text-sm font-medium hover:bg-navy-light transition-colors cursor-pointer disabled:opacity-60"
                          >
                            {addSuccess === (naics.id || naics.code) ? (
                              <>
                                <CheckCircleIcon className="w-4 h-4" />
                                Added!
                              </>
                            ) : (
                              <>
                                <PlusIcon className="w-4 h-4" />
                                {addingNaics === (naics.id || naics.code) ? 'Adding...' : 'Add to My Company'}
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 text-center py-4">No details available</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  BuildingLibraryIcon,
  CalendarDaysIcon,
  TagIcon,
  ArrowRightIcon,
  FunnelIcon,
  ExclamationTriangleIcon,
  GlobeAltIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
  InformationCircleIcon,
  DocumentMagnifyingGlassIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import api from '../services/api';

export default function OpportunitySearch() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [naicsCode, setNaicsCode] = useState('');
  const [searchSource, setSearchSource] = useState('all');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const [showNaicsWarning, setShowNaicsWarning] = useState(false);

  // NAICS codes from vendor profile
  const [profileNaicsCodes, setProfileNaicsCodes] = useState([]);

  // Search Sources state
  const [sources, setSources] = useState([]);
  const [showAddSource, setShowAddSource] = useState(false);
  const [newSource, setNewSource] = useState({ name: '', url: '', description: '' });
  const [sourceLoading, setSourceLoading] = useState(false);
  const [sourceError, setSourceError] = useState('');

  // Review Opportunity state
  const [reviewingOpp, setReviewingOpp] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewData, setReviewData] = useState(null);

  // Auto-search alert state
  const [alertSettings, setAlertSettings] = useState(null);
  const [showAlertSetup, setShowAlertSetup] = useState(false);
  const [alertForm, setAlertForm] = useState({ naics_codes: '', keywords: '', frequency_hours: 4, is_active: true });
  const [alertSaving, setAlertSaving] = useState(false);

  // Load search sources, NAICS codes, and alert settings on mount
  useEffect(() => {
    loadSources();
    loadProfileNaics();
    loadAlertSettings();
  }, []);

  const loadProfileNaics = () => {
    try {
      const saved = localStorage.getItem('vendorProfile');
      if (saved) {
        const parsed = JSON.parse(saved);
        const codes = parsed.naics_codes || [];
        const codeArray = Array.isArray(codes) ? codes : [];
        setProfileNaicsCodes(codeArray);
        // Pre-fill the NAICS input with codes from vendor profile
        if (codeArray.length > 0) {
          setNaicsCode(codeArray.join(', '));
        }
      }
    } catch {
      // ignore
    }
  };

  const loadSources = async () => {
    try {
      const response = await api.get('/api/search-sources');
      setSources(response.data.sources || []);
    } catch {
      // silently fail on source load
    }
  };

  const handleAddSource = async (e) => {
    e.preventDefault();
    if (!newSource.name.trim() || !newSource.url.trim()) return;

    setSourceLoading(true);
    setSourceError('');

    try {
      await api.post('/api/search-sources', newSource);
      setNewSource({ name: '', url: '', description: '' });
      setShowAddSource(false);
      await loadSources();
    } catch (err) {
      setSourceError(err.response?.data?.detail || 'Failed to add source.');
    } finally {
      setSourceLoading(false);
    }
  };

  const handleRemoveSource = async (sourceId, sourceName) => {
    if (!confirm(`Remove "${sourceName}" from the search list?`)) return;
    try {
      await api.delete(`/api/search-sources/${sourceId}`);
      await loadSources();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to remove source.');
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!keyword.trim() && !naicsCode.trim()) return;

    // Show warning if no NAICS codes in vendor profile
    if (profileNaicsCodes.length === 0 && !naicsCode.trim()) {
      setShowNaicsWarning(true);
    }

    setLoading(true);
    setError('');
    setSearched(true);

    try {
      const params = { source: searchSource };
      if (keyword.trim()) params.keyword = keyword.trim();
      if (naicsCode.trim()) params.naics = naicsCode.trim().split(',')[0].trim();

      const response = await api.get('/api/opportunities', { params });
      setResults(response.data.opportunities || response.data || []);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.message ||
          'Failed to search opportunities. Please try again.'
      );
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUseForProposal = (opportunity) => {
    navigate('/new-proposal', {
      state: {
        opportunity: {
          title: opportunity.title,
          agency: opportunity.agency,
          description: opportunity.description,
          requirements: opportunity.requirements || '',
          due_date: opportunity.due_date,
          type: opportunity.type,
          naics_code: opportunity.naics_code || '',
          notice_id: opportunity.notice_id || '',
          posted_date: opportunity.posted_date || '',
          source: opportunity.source || '',
        },
      },
    });
  };

  const loadAlertSettings = async () => {
    try {
      const response = await api.get('/api/opportunity-alerts');
      if (response.data.alert) {
        setAlertSettings(response.data.alert);
        setAlertForm({
          naics_codes: response.data.alert.naics_codes || '',
          keywords: response.data.alert.keywords || '',
          frequency_hours: response.data.alert.frequency_hours || 4,
          is_active: response.data.alert.is_active ?? true,
        });
      }
    } catch {
      // silently fail
    }
  };

  const saveAlertSettings = async () => {
    setAlertSaving(true);
    try {
      const response = await api.post('/api/opportunity-alerts', alertForm);
      setAlertSettings(response.data.alert);
      setShowAlertSetup(false);
    } catch {
      alert('Failed to save alert settings.');
    } finally {
      setAlertSaving(false);
    }
  };

  const handleReviewOpportunity = async (opportunity) => {
    setReviewingOpp(opportunity);
    setReviewLoading(true);
    setReviewData(null);
    try {
      const response = await api.post('/api/opportunities/review', {
        opportunity: {
          title: opportunity.title,
          agency: opportunity.agency,
          description: opportunity.description,
          notice_id: opportunity.notice_id,
          due_date: opportunity.due_date,
          type: opportunity.type,
          naics_code: opportunity.naics_code || '',
        },
      });
      setReviewData(response.data);
    } catch (err) {
      setReviewData({
        error: err.response?.data?.detail || 'Failed to review opportunity. Please try again.',
      });
    } finally {
      setReviewLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-navy">Opportunity Search</h1>
        <p className="text-gray-500 mt-1">
          Search for government contract opportunities to generate proposals
        </p>
      </div>

      {/* Search Sources */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <GlobeAltIcon className="w-5 h-5 text-navy" />
            <h2 className="text-base font-semibold text-navy">Search Sources</h2>
            <span className="text-xs text-gray-400 ml-1">({sources.length} active)</span>
          </div>
          <button
            onClick={() => setShowAddSource(!showAddSource)}
            className="flex items-center gap-1.5 text-sm font-medium text-accent hover:text-accent-dark transition-all cursor-pointer"
          >
            {showAddSource ? (
              <>
                <XMarkIcon className="w-4 h-4" />
                Cancel
              </>
            ) : (
              <>
                <PlusIcon className="w-4 h-4" />
                Add Source
              </>
            )}
          </button>
        </div>

        {/* Source Tags */}
        <div className="flex flex-wrap gap-2 mb-3">
          {sources.map((source) => (
            <div
              key={source.id}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border transition-all ${
                source.is_default
                  ? 'bg-navy/5 border-navy/20 text-navy font-medium'
                  : 'bg-gray-50 border-gray-200 text-gray-700'
              }`}
            >
              <GlobeAltIcon className="w-3.5 h-3.5" />
              <span>{source.name}</span>
              {source.is_default && (
                <span className="text-[10px] bg-navy/10 text-navy px-1.5 py-0.5 rounded-full font-semibold">
                  DEFAULT
                </span>
              )}
              {!source.is_default && (
                <button
                  onClick={() => handleRemoveSource(source.id, source.name)}
                  className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer ml-0.5"
                  title="Remove source"
                >
                  <XMarkIcon className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
          {sources.length === 0 && (
            <p className="text-sm text-gray-400">No search sources configured.</p>
          )}
        </div>

        {/* Add Source Form */}
        {showAddSource && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <form onSubmit={handleAddSource} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Website Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={newSource.name}
                    onChange={(e) => setNewSource((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Grants.gov, FPDS, GovWin"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Website URL <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="url"
                    value={newSource.url}
                    onChange={(e) => setNewSource((prev) => ({ ...prev, url: e.target.value }))}
                    placeholder="e.g., https://www.grants.gov"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue transition-all"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={newSource.description}
                  onChange={(e) => setNewSource((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of what this website offers..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue transition-all"
                />
              </div>
              {sourceError && (
                <p className="text-xs text-red-600">{sourceError}</p>
              )}
              <button
                type="submit"
                disabled={sourceLoading || !newSource.name.trim() || !newSource.url.trim()}
                className="bg-accent hover:bg-accent-dark text-white px-6 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
              >
                <PlusIcon className="w-4 h-4" />
                {sourceLoading ? 'Adding...' : 'Add to Master List'}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Auto-Search Alert Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center">
              <SparklesIcon className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-navy">Auto-Search Alerts</h2>
              <p className="text-xs text-gray-400">
                {alertSettings?.is_active
                  ? `Active — searching every ${alertSettings.frequency_hours} hours`
                  : 'Set up automatic opportunity search with email notifications'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowAlertSetup(!showAlertSetup)}
            className="text-sm font-medium text-accent hover:text-accent-dark transition-all cursor-pointer"
          >
            {showAlertSetup ? 'Cancel' : alertSettings ? 'Edit Settings' : 'Set Up Alerts'}
          </button>
        </div>

        {showAlertSetup && (
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  NAICS Codes (comma-separated)
                </label>
                <input
                  type="text"
                  value={alertForm.naics_codes}
                  onChange={(e) => setAlertForm((prev) => ({ ...prev, naics_codes: e.target.value }))}
                  placeholder="e.g., 541512, 541519, 541110"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Keywords (comma-separated)
                </label>
                <input
                  type="text"
                  value={alertForm.keywords}
                  onChange={(e) => setAlertForm((prev) => ({ ...prev, keywords: e.target.value }))}
                  placeholder="e.g., cybersecurity, cloud, IT modernization"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue transition-all"
                />
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Search Frequency</label>
                <select
                  value={alertForm.frequency_hours}
                  onChange={(e) => setAlertForm((prev) => ({ ...prev, frequency_hours: parseInt(e.target.value) }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue"
                >
                  <option value={1}>Every 1 hour</option>
                  <option value={2}>Every 2 hours</option>
                  <option value={4}>Every 4 hours</option>
                  <option value={8}>Every 8 hours</option>
                  <option value={12}>Every 12 hours</option>
                  <option value={24}>Every 24 hours</option>
                </select>
              </div>
              <label className="flex items-center gap-2 cursor-pointer mt-4">
                <input
                  type="checkbox"
                  checked={alertForm.is_active}
                  onChange={(e) => setAlertForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300 text-accent focus:ring-accent"
                />
                <span className="text-sm text-gray-700">Enable email notifications</span>
              </label>
            </div>
            <button
              onClick={saveAlertSettings}
              disabled={alertSaving}
              className="bg-accent hover:bg-accent-dark text-white px-6 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 cursor-pointer"
            >
              {alertSaving ? 'Saving...' : 'Save Alert Settings'}
            </button>
          </div>
        )}
      </div>

      {/* NAICS Warning Popup */}
      {showNaicsWarning && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <InformationCircleIcon className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-amber-800 font-medium">
              Make sure you have updated all required NAICS / SIC Codes under your Vendor Profile to search for relevant open opportunities.
            </p>
            <div className="mt-2 flex items-center gap-3">
              <Link
                to="/vendor-profile"
                className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:text-accent-dark no-underline transition-colors"
              >
                Update NAICS Codes in Vendor Profile
                <ArrowRightIcon className="w-3.5 h-3.5" />
              </Link>
              <button
                onClick={() => setShowNaicsWarning(false)}
                className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NAICS Codes from Vendor Profile */}
      {profileNaicsCodes.length > 0 && (
        <div className="bg-blue/5 border border-blue/20 rounded-xl p-4 mb-6 flex items-start gap-3">
          <InformationCircleIcon className="w-5 h-5 text-blue flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-gray-700">
              <span className="font-medium">NAICS codes from your Vendor Profile:</span>{' '}
              {profileNaicsCodes.join(', ')}
            </p>
            <Link
              to="/vendor-profile"
              className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:text-accent-dark no-underline transition-colors mt-1"
            >
              Edit in Vendor Profile
              <ArrowRightIcon className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}

      {/* Search Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <form onSubmit={handleSearch}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Keyword Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Keyword Search
              </label>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="e.g., cybersecurity, IT modernization, cloud services"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue transition-all"
                />
              </div>
            </div>

            {/* NAICS Code Input - pre-filled from Vendor Profile */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                NAICS Code
                {profileNaicsCodes.length > 0 && (
                  <span className="text-xs text-accent font-normal ml-2">(from Vendor Profile)</span>
                )}
              </label>
              <div className="relative">
                <FunnelIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={naicsCode}
                  onChange={(e) => setNaicsCode(e.target.value)}
                  placeholder="e.g., 541512, 541519"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue transition-all"
                />
              </div>
            </div>
          </div>

          {/* Source Filter Tabs */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Search In</label>
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'all', label: 'All Sources' },
                { key: 'sam', label: 'SAM.gov' },
                { key: 'usaspending', label: 'USASpending.gov' },
                { key: 'sba', label: 'SBA.gov' },
                { key: 'gsa', label: 'GSA.gov' },
              ].map((src) => (
                <button
                  key={src.key}
                  type="button"
                  onClick={() => setSearchSource(src.key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all cursor-pointer ${
                    searchSource === src.key
                      ? 'border-navy bg-navy text-white'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'
                  }`}
                >
                  {src.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || (!keyword.trim() && !naicsCode.trim())}
            className="bg-accent hover:bg-accent-dark text-white px-8 py-3 rounded-lg font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm hover:shadow-md"
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Searching...
              </>
            ) : (
              <>
                <MagnifyingGlassIcon className="w-5 h-5" />
                Search Opportunities
              </>
            )}
          </button>
        </form>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Results */}
      {searched && !loading && !error && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-navy">
              {results.length > 0
                ? `${results.length} Opportunities Found`
                : 'No Opportunities Found'}
            </h2>
          </div>

          {results.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <MagnifyingGlassIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-sm">
                No opportunities matched your search criteria. Try broadening your search
                terms.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {results.map((opp, index) => (
                <div
                  key={opp.id || index}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all hover:border-blue/20"
                >
                  <div className="mb-4">
                    <h3 className="font-semibold text-navy text-base leading-snug">
                      {opp.title}
                    </h3>
                    {opp.description && (
                      <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                        {opp.description}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 mb-5">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <BuildingLibraryIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span>{opp.agency || 'Unknown Agency'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <CalendarDaysIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span>Due: {formatDate(opp.due_date)}</span>
                    </div>
                    {opp.type && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <TagIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="bg-blue/10 text-blue px-2 py-0.5 rounded-full text-xs font-medium">
                          {opp.type}
                        </span>
                      </div>
                    )}
                    {opp.naics_code && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <TagIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full text-xs font-medium">
                          NAICS: {opp.naics_code}
                        </span>
                      </div>
                    )}
                    {opp.source && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <TagIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="bg-accent/10 text-accent px-2 py-0.5 rounded-full text-xs font-medium">
                          {opp.source}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleReviewOpportunity(opp)}
                      className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md cursor-pointer"
                    >
                      <DocumentMagnifyingGlassIcon className="w-4 h-4" />
                      Review Opportunity
                    </button>
                    <button
                      onClick={() => handleUseForProposal(opp)}
                      className="flex-1 bg-navy hover:bg-navy-light text-white py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md cursor-pointer"
                    >
                      Use for Proposal
                      <ArrowRightIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Initial state */}
      {!searched && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <MagnifyingGlassIcon className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            Search for Opportunities
          </h3>
          <p className="text-gray-400 text-sm max-w-md mx-auto">
            Enter keywords or a NAICS code above to find government contract
            opportunities. Select an opportunity to auto-fill your proposal details.
          </p>
        </div>
      )}

      {/* Review Opportunity Modal */}
      {reviewingOpp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                  <SparklesIcon className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-navy">AI Opportunity Review</h2>
                  <p className="text-xs text-gray-500 mt-0.5">{reviewingOpp.title}</p>
                </div>
              </div>
              <button
                onClick={() => { setReviewingOpp(null); setReviewData(null); }}
                className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {reviewLoading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <svg className="animate-spin w-10 h-10 text-amber-500 mb-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <p className="text-gray-500 font-medium">Analyzing opportunity...</p>
                  <p className="text-gray-400 text-sm mt-1">AI is reviewing the scope of work and requirements</p>
                </div>
              ) : reviewData?.error ? (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-sm text-red-700">{reviewData.error}</p>
                </div>
              ) : reviewData ? (
                <div className="prose prose-sm max-w-none">
                  <div className="bg-gray-50 rounded-xl p-4 mb-4">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><span className="font-medium text-gray-600">Agency:</span> <span className="text-gray-800">{reviewData.agency}</span></div>
                      <div><span className="font-medium text-gray-600">Notice ID:</span> <span className="text-gray-800">{reviewData.notice_id || 'N/A'}</span></div>
                    </div>
                  </div>
                  <div className="whitespace-pre-wrap text-gray-700 leading-relaxed text-sm">
                    {reviewData.review}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => { setReviewingOpp(null); setReviewData(null); }}
                className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => { handleUseForProposal(reviewingOpp); setReviewingOpp(null); setReviewData(null); }}
                className="bg-navy hover:bg-navy-light text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 shadow-sm hover:shadow-md cursor-pointer"
              >
                Proceed to Proposal
                <ArrowRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

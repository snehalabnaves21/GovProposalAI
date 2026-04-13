import { useState } from 'react';
import {
  MagnifyingGlassIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  BuildingLibraryIcon,
  CalendarDaysIcon,
  TagIcon,
  PlusIcon,
  TrashIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CheckCircleIcon,
  LightBulbIcon,
  UserGroupIcon,
  MapPinIcon,
  BoltIcon,
  ScaleIcon,
  StarIcon,
  DocumentTextIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';
import api from '../services/api';

const TABS = [
  { key: 'labor-rates', label: 'Labor Rate Intelligence', icon: CurrencyDollarIcon },
  { key: 'pricing', label: 'Pricing Strategy', icon: ScaleIcon },
];

const LABOR_CATEGORIES = [
  'Software Engineer',
  'Accountant',
  'Project Manager',
  'Systems Administrator',
  'Data Analyst',
  'Cybersecurity Analyst',
  'Program Manager',
  'Financial Analyst',
  'Administrative Assistant',
  'Help Desk Technician',
];

const LoadingSpinner = ({ size = 'w-5 h-5' }) => (
  <svg className={`animate-spin ${size}`} viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

const formatCurrency = (value) => {
  if (value == null) return 'N/A';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
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

// ─── TAB 1: Labor Rate Intelligence ────────────────────────────────────────────

function LaborRateTab() {
  const [laborCategory, setLaborCategory] = useState('');
  const [naicsCode, setNaicsCode] = useState('');
  const [location, setLocation] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  const [inserted, setInserted] = useState(false);

  const handleInsertToPricing = () => {
    if (!results || !laborCategory.trim()) return;
    const rate = results.suggested_rate || results.average_rate || 0;
    const existing = JSON.parse(localStorage.getItem('pricing_labor_imports') || '[]');
    existing.push({
      category: laborCategory.trim(),
      rate: rate,
      source: 'Market Research',
      min_rate: results.min_rate,
      max_rate: results.max_rate,
      avg_rate: results.average_rate,
      timestamp: new Date().toISOString(),
    });
    localStorage.setItem('pricing_labor_imports', JSON.stringify(existing));
    setInserted(true);
    setTimeout(() => setInserted(false), 3000);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!laborCategory.trim()) return;

    setLoading(true);
    setError('');
    setSearched(true);

    try {
      const params = { labor_category: laborCategory.trim() };
      if (naicsCode.trim()) params.naics_code = naicsCode.trim();
      if (location.trim()) params.location = location.trim();

      const response = await api.get('/api/market-research/labor-rates', { params });
      const data = response.data;
      const rs = data.rate_summary || {};
      const bm = data.benchmark || {};
      setResults({
        ...data,
        average_rate: rs.average_hourly_rate || bm.median || 0,
        min_rate: rs.min_hourly_rate || bm.min || 0,
        max_rate: rs.max_hourly_rate || bm.max || 0,
        median_rate: rs.median_hourly_rate || bm.median || 0,
        suggested_rate: bm.median || rs.median_hourly_rate || rs.average_hourly_rate || 0,
        suggested_range_low: bm.min || rs.min_hourly_rate || 0,
        suggested_range_high: bm.max || rs.max_hourly_rate || 0,
        data_points: rs.data_points || 0,
      });
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        err.message ||
        'Failed to fetch labor rate data. Please try again.'
      );
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Search Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <CurrencyDollarIcon className="w-5 h-5 text-accent" />
          <h2 className="text-base font-semibold text-navy">Search Labor Rates</h2>
        </div>
        <form onSubmit={handleSearch}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Labor Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Labor Category <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <UserGroupIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  list="labor-categories-list"
                  type="text"
                  value={laborCategory}
                  onChange={(e) => setLaborCategory(e.target.value)}
                  placeholder="e.g., Software Engineer"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue transition-all"
                  required
                />
                <datalist id="labor-categories-list">
                  {LABOR_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* NAICS Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                NAICS Code <span className="text-gray-400 text-xs font-normal">(optional)</span>
              </label>
              <div className="relative">
                <TagIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={naicsCode}
                  onChange={(e) => setNaicsCode(e.target.value)}
                  placeholder="e.g., 541512"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue transition-all"
                />
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location / State <span className="text-gray-400 text-xs font-normal">(optional)</span>
              </label>
              <div className="relative">
                <MapPinIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., Virginia, Washington DC"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue transition-all"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !laborCategory.trim()}
            className="bg-accent hover:bg-accent-dark text-white px-8 py-3 rounded-lg font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm hover:shadow-md cursor-pointer"
          >
            {loading ? (
              <>
                <LoadingSpinner />
                Analyzing Rates...
              </>
            ) : (
              <>
                <MagnifyingGlassIcon className="w-5 h-5" />
                Search Labor Rates
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
      {searched && !loading && !error && results && (
        <div className="space-y-6">
          {/* Rate Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Average Rate */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Average Rate</p>
              <p className="text-3xl font-bold text-navy">{formatCurrency(results.average_rate)}</p>
              <p className="text-xs text-gray-400 mt-1">per hour</p>
            </div>

            {/* Min Rate */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Min Rate</p>
              <p className="text-3xl font-bold text-blue">{formatCurrency(results.min_rate)}</p>
              <p className="text-xs text-gray-400 mt-1">per hour</p>
            </div>

            {/* Max Rate */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Max Rate</p>
              <p className="text-3xl font-bold text-blue">{formatCurrency(results.max_rate)}</p>
              <p className="text-xs text-gray-400 mt-1">per hour</p>
            </div>

            {/* Suggested Bid Rate */}
            <div className="bg-gradient-to-br from-accent/5 to-accent/10 rounded-xl shadow-sm border-2 border-accent/30 p-6 text-center relative overflow-hidden">
              <div className="absolute top-2 right-2">
                <SparklesIcon className="w-5 h-5 text-accent/40" />
              </div>
              <p className="text-xs font-medium text-accent uppercase tracking-wider mb-2">Suggested Bid Rate</p>
              <p className="text-3xl font-bold text-accent">{formatCurrency(results.suggested_rate)}</p>
              <p className="text-xs text-accent/70 mt-1 font-medium">
                {results.suggested_range_low && results.suggested_range_high
                  ? `Range: ${formatCurrency(results.suggested_range_low)} - ${formatCurrency(results.suggested_range_high)}`
                  : 'Competitive range'}
              </p>
            </div>
          </div>

          {/* Insert to Proposal Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleInsertToPricing}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-accent hover:bg-accent-dark text-white transition-all shadow-sm hover:shadow-md cursor-pointer"
            >
              <PlusIcon className="w-4 h-4" />
              Insert to Proposal Pricing
            </button>
            {inserted && (
              <span className="flex items-center gap-1.5 text-sm text-accent font-medium animate-pulse">
                <CheckCircleIcon className="w-4 h-4" />
                Added! Open Pricing Table in your proposal to see it.
              </span>
            )}
          </div>

          {/* Rate Visualization Bar */}
          {results.min_rate && results.max_rate && results.suggested_rate && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-sm font-semibold text-navy mb-4">Rate Range Visualization</h3>
              <div className="relative h-8 bg-gray-100 rounded-full overflow-hidden">
                {/* Full range bar */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue/20 via-blue/40 to-blue/20 rounded-full" />
                {/* Suggested range highlight */}
                {results.suggested_range_low && results.suggested_range_high && (
                  <div
                    className="absolute top-0 bottom-0 bg-accent/25 border-l-2 border-r-2 border-accent/50"
                    style={{
                      left: `${((results.suggested_range_low - results.min_rate) / (results.max_rate - results.min_rate)) * 100}%`,
                      width: `${((results.suggested_range_high - results.suggested_range_low) / (results.max_rate - results.min_rate)) * 100}%`,
                    }}
                  />
                )}
                {/* Suggested rate marker */}
                <div
                  className="absolute top-0 bottom-0 w-1 bg-accent shadow-md"
                  style={{
                    left: `${((results.suggested_rate - results.min_rate) / (results.max_rate - results.min_rate)) * 100}%`,
                  }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span>{formatCurrency(results.min_rate)}</span>
                <span className="text-accent font-semibold">Suggested: {formatCurrency(results.suggested_rate)}</span>
                <span>{formatCurrency(results.max_rate)}</span>
              </div>
            </div>
          )}

          {/* Source Data Table */}
          {results.source_awards && results.source_awards.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-navy">
                  Source Contract Awards ({results.source_awards.length})
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">Individual contract data from USASpending.gov that informed these rates</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Vendor</th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Agency</th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Award Amount</th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Award ID</th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Period</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {results.source_awards.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-3 font-medium text-navy">{item.recipient || 'N/A'}</td>
                        <td className="px-6 py-3 text-gray-600">{item.agency || 'N/A'}</td>
                        <td className="px-6 py-3 font-semibold text-navy">{item.amount_formatted || formatCurrency(item.amount)}</td>
                        <td className="px-6 py-3 text-gray-500 font-mono text-xs">{item.award_id || 'N/A'}</td>
                        <td className="px-6 py-3 text-gray-500">{formatDate(item.start_date)}{item.end_date ? ` — ${formatDate(item.end_date)}` : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-6 py-3 bg-blue-50/50 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  Data sourced from <a href="https://www.usaspending.gov" target="_blank" rel="noopener noreferrer" className="text-blue hover:underline font-medium">USASpending.gov</a> (last 3 years of contract awards) and GSA Schedule benchmarks.
                </p>
              </div>
            </div>
          )}

          {/* Data Source Info */}
          {results && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mt-4">
              <h3 className="text-sm font-semibold text-navy mb-2">About This Data</h3>
              <div className="space-y-2 text-xs text-gray-500">
                <p><span className="font-medium text-gray-700">Market Rates:</span> Estimated from contract award amounts on USASpending.gov, back-calculated to hourly rates based on award duration and scope.</p>
                <p><span className="font-medium text-gray-700">GSA Benchmarks:</span> Based on GSA Schedule labor rate data for comparable categories.</p>
                <p><span className="font-medium text-gray-700">Sources:</span> <a href="https://www.usaspending.gov" target="_blank" rel="noopener noreferrer" className="text-blue hover:underline">USASpending.gov</a> | <a href="https://www.gsa.gov/buy-through-us/purchasing-programs/gsa-multiple-award-schedule" target="_blank" rel="noopener noreferrer" className="text-blue hover:underline">GSA Schedules</a></p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Initial State */}
      {!searched && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <CurrencyDollarIcon className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Search Labor Rates</h3>
          <p className="text-gray-400 text-sm max-w-md mx-auto">
            Enter a labor category to see market rates, suggested bid prices, and source contract data from government awards.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── TAB 2: Competitor Analysis ────────────────────────────────────────────────

function CompetitorTab() {
  const [keyword, setKeyword] = useState('');
  const [agency, setAgency] = useState('');
  const [naicsCode, setNaicsCode] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!keyword.trim()) return;

    setLoading(true);
    setError('');
    setSearched(true);

    try {
      const params = { keyword: keyword.trim() };
      if (agency.trim()) params.agency = agency.trim();
      if (naicsCode.trim()) params.naics_code = naicsCode.trim();

      const response = await api.get('/api/market-research/competitor-awards', { params });
      const awards = (response.data.awards || []).map((a) => ({
        ...a,
        vendor_name: a.recipient || a.vendor_name || 'Unknown Vendor',
        award_value: a.amount || a.award_value || 0,
        naics_code: a.naics || a.naics_code || '',
        award_date: a.start_date || a.award_date || '',
        end_date: a.end_date || '',
        id: a.award_id || a.id || '',
        contract_type: a.contract_type || '',
        sub_agency: a.sub_agency || '',
        detail_url: a.detail_url || null,
      }));
      setResults(awards);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        err.message ||
        'Failed to fetch competitor data. Please try again.'
      );
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Search Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <UserGroupIcon className="w-5 h-5 text-navy" />
          <h2 className="text-base font-semibold text-navy">Search Competitor Awards</h2>
        </div>
        <form onSubmit={handleSearch}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Keyword */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Keyword <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="e.g., cybersecurity, cloud migration"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue transition-all"
                  required
                />
              </div>
            </div>

            {/* Agency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Agency <span className="text-gray-400 text-xs font-normal">(optional)</span>
              </label>
              <div className="relative">
                <BuildingLibraryIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={agency}
                  onChange={(e) => setAgency(e.target.value)}
                  placeholder="e.g., Department of Defense"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue transition-all"
                />
              </div>
            </div>

            {/* NAICS Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                NAICS Code <span className="text-gray-400 text-xs font-normal">(optional)</span>
              </label>
              <div className="relative">
                <TagIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={naicsCode}
                  onChange={(e) => setNaicsCode(e.target.value)}
                  placeholder="e.g., 541512"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue transition-all"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !keyword.trim()}
            className="bg-accent hover:bg-accent-dark text-white px-8 py-3 rounded-lg font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm hover:shadow-md cursor-pointer"
          >
            {loading ? (
              <>
                <LoadingSpinner />
                Searching Awards...
              </>
            ) : (
              <>
                <MagnifyingGlassIcon className="w-5 h-5" />
                Search Competitor Awards
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
                ? `${results.length} Contract Awards Found`
                : 'No Awards Found'}
            </h2>
          </div>

          {results.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <UserGroupIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-sm">
                No competitor awards matched your search criteria. Try different keywords.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {results.map((award, index) => (
                <div
                  key={award.id || index}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all hover:border-blue/20"
                >
                  {/* Vendor Name & NAICS */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-navy text-base truncate">
                        {award.vendor_name || 'Unknown Vendor'}
                      </h3>
                      {award.contract_type && (
                        <p className="text-xs text-gray-400 mt-0.5">{award.contract_type}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                      {award.naics_code && (
                        <span className="bg-blue/10 text-blue px-2.5 py-0.5 rounded-full text-xs font-medium">
                          {award.naics_code}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  {award.description && (
                    <p className="text-sm text-gray-500 mb-3 line-clamp-2">{award.description}</p>
                  )}

                  {/* Award Value & Period */}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="bg-navy/5 rounded-lg px-3 py-2.5">
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">Award Value</p>
                      <p className="text-lg font-bold text-navy">{formatCurrency(award.award_value)}</p>
                    </div>
                    <div className="bg-navy/5 rounded-lg px-3 py-2.5">
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">Contract Period</p>
                      <p className="text-sm font-semibold text-navy">
                        {formatDate(award.award_date)}
                        {award.end_date ? ` — ${formatDate(award.end_date)}` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Meta Info */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <BuildingLibraryIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="truncate">{award.agency || 'Unknown Agency'}</span>
                    </div>
                    {award.sub_agency && (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate text-xs">{award.sub_agency}</span>
                      </div>
                    )}
                    {award.id && (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <TagIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="text-xs">Award ID: {award.id}</span>
                      </div>
                    )}
                  </div>

                  {/* View Details Link */}
                  {award.detail_url && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <a
                        href={award.detail_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-blue hover:text-blue-dark transition-colors"
                      >
                        <DocumentTextIcon className="w-4 h-4" />
                        View Full Contract Details on USASpending.gov
                        <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Initial State */}
      {!searched && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <UserGroupIcon className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Analyze Competitor Awards</h3>
          <p className="text-gray-400 text-sm max-w-md mx-auto">
            Search past government contract awards to understand who is winning, at what price, and in which agencies.
          </p>
        </div>
      )}

      {/* Competitor Names Directory (Disabled - Pending Legal Review) */}
      <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-100 p-6 opacity-60 pointer-events-none select-none">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <UserGroupIcon className="w-5 h-5 text-navy" />
            <h2 className="text-base font-semibold text-navy">Competitor Directory</h2>
          </div>
          <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
            Coming Soon
          </span>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Track and manage known competitors by name, NAICS specialization, past wins, and estimated pricing. This feature is currently under legal review and will be activated soon.
        </p>

        {/* Sample table structure */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-navy/5 border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-navy text-xs uppercase tracking-wider">Competitor Name</th>
                <th className="text-left py-3 px-4 font-semibold text-navy text-xs uppercase tracking-wider">NAICS Codes</th>
                <th className="text-left py-3 px-4 font-semibold text-navy text-xs uppercase tracking-wider">Known Contracts</th>
                <th className="text-left py-3 px-4 font-semibold text-navy text-xs uppercase tracking-wider">Avg Award Value</th>
                <th className="text-left py-3 px-4 font-semibold text-navy text-xs uppercase tracking-wider">Win Rate</th>
                <th className="text-left py-3 px-4 font-semibold text-navy text-xs uppercase tracking-wider">Last Seen</th>
                <th className="text-left py-3 px-4 font-semibold text-navy text-xs uppercase tracking-wider">Notes</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'ABC Consulting LLC', naics: '541512, 541519', contracts: 12, avg: '$1.8M', win: '68%', last: '2025-11', notes: 'Strong in DoD' },
                { name: 'Federal Tech Solutions', naics: '541511, 541513', contracts: 8, avg: '$3.2M', win: '54%', last: '2025-10', notes: 'GSA Schedule holder' },
                { name: 'DataBridge Inc.', naics: '541512', contracts: 5, avg: '$950K', win: '45%', last: '2025-09', notes: 'Small business set-aside' },
                { name: 'CyberShield Partners', naics: '541519, 541690', contracts: 15, avg: '$2.1M', win: '72%', last: '2025-12', notes: 'Cybersecurity focus' },
                { name: 'GovCloud Services', naics: '541511, 518210', contracts: 7, avg: '$4.5M', win: '61%', last: '2025-08', notes: 'Cloud migrations' },
              ].map((row) => (
                <tr key={row.name} className="border-b border-gray-100">
                  <td className="py-3 px-4 font-medium text-navy">{row.name}</td>
                  <td className="py-3 px-4 text-gray-600">{row.naics}</td>
                  <td className="py-3 px-4 text-gray-600">{row.contracts}</td>
                  <td className="py-3 px-4 font-semibold text-gray-700">{row.avg}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      parseInt(row.win) >= 60 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                    }`}>{row.win}</span>
                  </td>
                  <td className="py-3 px-4 text-gray-500">{row.last}</td>
                  <td className="py-3 px-4 text-gray-500 text-xs">{row.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button disabled className="bg-accent text-white px-4 py-2 rounded-lg text-sm font-medium opacity-50 cursor-not-allowed flex items-center gap-2">
            <PlusIcon className="w-4 h-4" />
            Add Competitor
          </button>
          <button disabled className="bg-navy/10 text-navy px-4 py-2 rounded-lg text-sm font-medium opacity-50 cursor-not-allowed">
            Import from Awards
          </button>
        </div>

        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-xs text-amber-700">
            <span className="font-semibold">Legal Notice:</span> This feature is currently disabled pending legal review of competitor data collection and display policies. It will be activated once compliance requirements are confirmed.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── TAB 3: Pricing Strategy ───────────────────────────────────────────────────

function PricingStrategyTab() {
  const [rows, setRows] = useState([{ category: '', costRate: '', wrapRate: 35, profitMargin: 10, selected: false }]);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedStrategy, setSelectedStrategy] = useState(null);
  const [inserted, setInserted] = useState(false);
  const [insertedSelected, setInsertedSelected] = useState(false);
  const csvInputRef = { current: null };

  // Calculate bill rate: costRate * (1 + wrapRate/100) * (1 + profitMargin/100)
  const calcWrappedRate = (cost, wrap) => cost * (1 + (wrap || 0) / 100);
  const calcBillRate = (cost, wrap, profit) => calcWrappedRate(cost, wrap) * (1 + (profit || 0) / 100);

  const handleInsertToPricing = (stratKey) => {
    const strategy = results?.strategies?.[stratKey];
    if (!strategy?.rates?.length) return;
    const existing = JSON.parse(localStorage.getItem('pricing_labor_imports') || '[]');
    strategy.rates.forEach((r) => {
      existing.push({
        category: r.category,
        rate: r.recommended_rate || r.rate || 0,
        source: `Market Research (${stratKey})`,
        timestamp: new Date().toISOString(),
      });
    });
    localStorage.setItem('pricing_labor_imports', JSON.stringify(existing));
    setInserted(true);
    setSelectedStrategy(stratKey);
    setTimeout(() => { setInserted(false); setSelectedStrategy(null); }, 3000);
  };

  // Insert selected rows to proposal pricing
  const handleInsertSelected = () => {
    const selected = rows.filter((r) => r.selected && r.category.trim() && r.costRate);
    if (selected.length === 0) return;
    const existing = JSON.parse(localStorage.getItem('pricing_labor_imports') || '[]');
    selected.forEach((r) => {
      const billRate = calcBillRate(parseFloat(r.costRate) || 0, r.wrapRate, r.profitMargin);
      existing.push({
        category: r.category,
        rate: Math.round(billRate * 100) / 100,
        source: 'Pricing Strategy (Custom)',
        timestamp: new Date().toISOString(),
      });
    });
    localStorage.setItem('pricing_labor_imports', JSON.stringify(existing));
    setInsertedSelected(true);
    setTimeout(() => setInsertedSelected(false), 3000);
  };

  // CSV Import
  const handleCsvImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
      const newRows = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Skip header row
        if (i === 0 && (line.toLowerCase().includes('category') || line.toLowerCase().includes('labor'))) continue;
        const parts = line.split(/[,\t]+/);
        if (parts.length >= 2) {
          newRows.push({
            category: parts[0].trim().replace(/^["']|["']$/g, ''),
            costRate: parseFloat(parts[1].replace(/[^0-9.]/g, '')) || '',
            wrapRate: parts[2] ? parseFloat(parts[2]) || 35 : 35,
            profitMargin: parts[3] ? parseFloat(parts[3]) || 10 : 10,
            selected: false,
          });
        }
      }
      if (newRows.length > 0) {
        setRows((prev) => {
          const empty = prev.length === 1 && !prev[0].category && !prev[0].costRate;
          return empty ? newRows : [...prev, ...newRows];
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const addRow = () => {
    setRows((prev) => [...prev, { category: '', costRate: '', wrapRate: 35, profitMargin: 10, selected: false }]);
  };

  const removeRow = (index) => {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const updateRow = (index, field, value) => {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  };

  const toggleSelect = (index) => {
    setRows((prev) => prev.map((r, i) => i === index ? { ...r, selected: !r.selected } : r));
  };

  const toggleSelectAll = () => {
    const allSelected = rows.every((r) => r.selected);
    setRows((prev) => prev.map((r) => ({ ...r, selected: !allSelected })));
  };

  const selectedCount = rows.filter((r) => r.selected).length;
  const hasValidRows = rows.some((r) => r.category.trim() && r.costRate);

  const handleGetRecommendation = async () => {
    if (!hasValidRows) return;
    setLoading(true);
    setError('');
    try {
      const labor_categories = rows
        .filter((r) => r.category.trim() && r.costRate)
        .map((r) => ({ category: r.category.trim(), rate: calcBillRate(parseFloat(r.costRate) || 0, r.wrapRate, r.profitMargin) }));
      const response = await api.post('/api/market-research/pricing-recommendation', { labor_categories });
      const data = response.data;
      if (data.strategies) {
        for (const key of Object.keys(data.strategies)) {
          const s = data.strategies[key];
          if (s.estimated_win_probability && s.win_probability == null) {
            const match = String(s.estimated_win_probability).match(/(\d+)/);
            s.win_probability = match ? parseInt(match[1]) : null;
          }
          if (s.rates) {
            s.rates = s.rates.map((r) => ({
              ...r,
              recommended_rate: r.recommended_rate || r.suggested_rate || r.rate || 0,
            }));
          }
        }
      }
      setResults(data);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to get pricing recommendation.');
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  const strategyConfig = {
    competitive: { label: 'Competitive', subtitle: 'Low Margin', icon: BoltIcon, bgGradient: 'from-blue/5 to-blue/10', border: 'border-blue/30', textColor: 'text-blue' },
    balanced: { label: 'Balanced', subtitle: 'Market Rate', icon: ScaleIcon, bgGradient: 'from-navy/5 to-navy/10', border: 'border-navy/30', textColor: 'text-navy' },
    premium: { label: 'Premium', subtitle: 'Best Value', icon: StarIcon, bgGradient: 'from-accent/5 to-accent/10', border: 'border-accent/30', textColor: 'text-accent' },
  };

  const fmtUsd = (n) => '$' + Math.round(n || 0).toLocaleString('en-US');

  return (
    <div>
      {/* Input Form with Import */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ScaleIcon className="w-5 h-5 text-navy" />
            <h2 className="text-base font-semibold text-navy">Labor Categories for Bid</h2>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer">
              <DocumentTextIcon className="w-4 h-4" />
              Import CSV
              <input
                ref={(el) => { csvInputRef.current = el; }}
                type="file"
                accept=".csv,.tsv,.txt"
                onChange={handleCsvImport}
                className="hidden"
              />
            </label>
            <button
              onClick={addRow}
              className="flex items-center gap-1.5 text-sm font-medium text-accent hover:text-accent-dark transition-all cursor-pointer"
            >
              <PlusIcon className="w-4 h-4" />
              Add Row
            </button>
          </div>
        </div>

        {/* CSV format hint */}
        <p className="text-xs text-gray-400 mb-4">
          CSV format: Category, Cost Rate, Wrap Rate %, Profit Margin % (one per line). Wrap and Margin are optional (defaults: 35%, 10%).
        </p>

        {/* 3-Table Pricing Layout */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse table-fixed">
            <colgroup>
              <col className="w-10" />
              <col style={{ width: '25%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '14%' }} />
              <col className="w-10" />
            </colgroup>
            <thead>
              <tr className="bg-navy text-white">
                <th className="px-2 py-2.5 rounded-tl-lg text-center">
                  <input type="checkbox" checked={rows.length > 0 && rows.every((r) => r.selected)} onChange={toggleSelectAll} className="w-3.5 h-3.5 rounded cursor-pointer accent-white" />
                </th>
                <th className="px-3 py-2.5 text-left font-medium text-xs">Labor Category</th>
                <th className="px-3 py-2.5 text-center font-medium text-xs bg-blue-900/30">Cost Rate ($/hr)</th>
                <th className="px-3 py-2.5 text-center font-medium text-xs bg-amber-900/20">Wrap Rate %</th>
                <th className="px-3 py-2.5 text-center font-medium text-xs bg-amber-900/20">Wrapped Cost</th>
                <th className="px-3 py-2.5 text-center font-medium text-xs bg-green-900/20">Profit Margin %</th>
                <th className="px-3 py-2.5 text-center font-medium text-xs bg-green-900/20">Proposed Bill Rate</th>
                <th className="px-3 py-2.5 rounded-tr-lg"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const cost = parseFloat(row.costRate) || 0;
                const wrapped = calcWrappedRate(cost, row.wrapRate);
                const billRate = calcBillRate(cost, row.wrapRate, row.profitMargin);
                return (
                  <tr key={idx} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${row.selected ? 'bg-blue-50/60' : ''}`}>
                    <td className="px-2 py-1.5 border-b border-gray-100 text-center">
                      <input type="checkbox" checked={row.selected} onChange={() => toggleSelect(idx)} className="w-3.5 h-3.5 rounded cursor-pointer accent-navy" />
                    </td>
                    <td className="px-2 py-1.5 border-b border-gray-100">
                      <input
                        list="pricing-labor-categories"
                        type="text"
                        value={row.category}
                        onChange={(e) => updateRow(idx, 'category', e.target.value)}
                        placeholder="e.g., Software Engineer"
                        className="w-full min-w-[160px] px-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue/30"
                      />
                    </td>
                    <td className="px-2 py-1.5 border-b border-gray-100 bg-blue-50/30 text-center">
                      <input
                        type="number"
                        value={row.costRate}
                        onChange={(e) => updateRow(idx, 'costRate', e.target.value)}
                        placeholder="0"
                        min="0"
                        step="1"
                        className="w-full max-w-[100px] mx-auto px-2 py-1.5 border border-gray-200 rounded text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue/30"
                      />
                    </td>
                    <td className="px-2 py-1.5 border-b border-gray-100 bg-amber-50/30 text-center">
                      <input
                        type="number"
                        value={row.wrapRate}
                        onChange={(e) => updateRow(idx, 'wrapRate', parseFloat(e.target.value) || 0)}
                        min="0"
                        max="200"
                        step="0.5"
                        className="w-full max-w-[80px] mx-auto px-2 py-1.5 border border-gray-200 rounded text-xs text-center focus:outline-none focus:ring-1 focus:ring-amber-500/30"
                      />
                    </td>
                    <td className="px-2 py-1.5 border-b border-gray-100 bg-amber-50/30 text-center">
                      <span className="text-xs font-semibold text-amber-700">{cost > 0 ? fmtUsd(wrapped) : '—'}</span>
                    </td>
                    <td className="px-2 py-1.5 border-b border-gray-100 bg-green-50/30 text-center">
                      <input
                        type="number"
                        value={row.profitMargin}
                        onChange={(e) => updateRow(idx, 'profitMargin', parseFloat(e.target.value) || 0)}
                        min="0"
                        max="100"
                        step="0.5"
                        className="w-full max-w-[80px] mx-auto px-2 py-1.5 border border-gray-200 rounded text-xs text-center focus:outline-none focus:ring-1 focus:ring-green-500/30"
                      />
                    </td>
                    <td className="px-2 py-1.5 border-b border-gray-100 bg-green-50/30 text-center">
                      <span className="text-xs font-bold text-green-700">{cost > 0 ? fmtUsd(billRate) : '—'}</span>
                    </td>
                    <td className="px-2 py-1.5 border-b border-gray-100 text-center">
                      <button onClick={() => removeRow(idx)} disabled={rows.length <= 1} className="p-1 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-30 cursor-pointer" title="Remove">
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {/* Totals row */}
              {rows.some((r) => parseFloat(r.costRate) > 0) && (
                <tr className="bg-gray-100 font-semibold">
                  <td className="px-2 py-2.5" />
                  <td className="px-2 py-2.5 text-xs text-navy">Totals / Averages</td>
                  <td className="px-2 py-2.5 text-center text-xs text-navy">
                    {fmtUsd(rows.reduce((s, r) => s + (parseFloat(r.costRate) || 0), 0) / Math.max(rows.filter((r) => parseFloat(r.costRate) > 0).length, 1))}
                    <span className="text-gray-400 font-normal"> avg</span>
                  </td>
                  <td className="px-2 py-2.5" />
                  <td className="px-2 py-2.5" />
                  <td className="px-2 py-2.5" />
                  <td className="px-2 py-2.5 text-center text-xs text-green-700">
                    {fmtUsd(rows.reduce((s, r) => s + calcBillRate(parseFloat(r.costRate) || 0, r.wrapRate, r.profitMargin), 0) / Math.max(rows.filter((r) => parseFloat(r.costRate) > 0).length, 1))}
                    <span className="text-gray-400 font-normal"> avg</span>
                  </td>
                  <td className="px-2 py-2.5" />
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <datalist id="pricing-labor-categories">
          {LABOR_CATEGORIES.map((cat) => (
            <option key={cat} value={cat} />
          ))}
        </datalist>

        {/* Action Buttons */}
        <div className="mt-6 pt-4 border-t border-gray-100 flex items-center gap-3 flex-wrap">
          <button
            onClick={handleGetRecommendation}
            disabled={loading || !hasValidRows}
            className="bg-gradient-to-r from-navy to-navy-light hover:from-navy-light hover:to-navy text-white px-8 py-3 rounded-lg font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm hover:shadow-md cursor-pointer"
          >
            {loading ? (
              <><LoadingSpinner /> Analyzing Pricing...</>
            ) : (
              <><SparklesIcon className="w-5 h-5" /> Get AI Recommendation</>
            )}
          </button>
          {selectedCount > 0 && (
            <button
              onClick={handleInsertSelected}
              disabled={insertedSelected}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                insertedSelected
                  ? 'bg-green-100 text-green-700 border border-green-300'
                  : 'bg-accent hover:bg-accent-dark text-white shadow-sm'
              }`}
            >
              {insertedSelected ? (
                <><CheckCircleIcon className="w-5 h-5" /> Inserted {selectedCount} to Pricing!</>
              ) : (
                <><PlusIcon className="w-5 h-5" /> Insert {selectedCount} Selected to Proposal Pricing</>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* AI Strategy Results */}
      {results && !loading && !error && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {['competitive', 'balanced', 'premium'].map((stratKey) => {
              const config = strategyConfig[stratKey];
              const strategy = results.strategies?.[stratKey];
              if (!strategy) return null;
              const Icon = config.icon;
              return (
                <div key={stratKey} className={`bg-gradient-to-br ${config.bgGradient} rounded-xl shadow-sm border-2 ${config.border} p-6`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`w-5 h-5 ${config.textColor}`} />
                    <h3 className={`font-bold text-lg ${config.textColor}`}>{config.label}</h3>
                  </div>
                  <p className={`text-xs ${config.textColor} opacity-70 font-medium mb-4`}>{config.subtitle}</p>
                  <div className="space-y-2 mb-5">
                    {strategy.rates?.map((r, i) => (
                      <div key={i} className="flex items-center justify-between bg-white/60 rounded-lg px-3 py-2">
                        <span className="text-xs text-gray-700 truncate mr-2">{r.category}</span>
                        <span className={`text-sm font-bold ${config.textColor}`}>{formatCurrency(r.recommended_rate)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-3 pt-4 border-t border-gray-200/50">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Est. Margin</span>
                      <span className={`text-sm font-bold ${config.textColor}`}>{strategy.estimated_margin != null ? `${strategy.estimated_margin}%` : 'N/A'}</span>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-500">Win Probability</span>
                        <span className={`text-xs font-bold ${config.textColor}`}>{strategy.win_probability != null ? `${strategy.win_probability}%` : 'N/A'}</span>
                      </div>
                      {strategy.win_probability != null && (
                        <div className="h-2 bg-white/60 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${stratKey === 'competitive' ? 'bg-blue' : stratKey === 'balanced' ? 'bg-navy' : 'bg-accent'}`} style={{ width: `${Math.min(strategy.win_probability, 100)}%` }} />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-200/50">
                    <button
                      onClick={() => handleInsertToPricing(stratKey)}
                      disabled={inserted && selectedStrategy === stratKey}
                      className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        inserted && selectedStrategy === stratKey ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-white/80 hover:bg-white text-navy border border-gray-200 hover:border-navy/30 hover:shadow-sm'
                      }`}
                    >
                      {inserted && selectedStrategy === stratKey ? (<><CheckCircleIcon className="w-4 h-4" /> Inserted!</>) : (<><PlusIcon className="w-4 h-4" /> Insert to Proposal Pricing</>)}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {results.insights?.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-4">
                <LightBulbIcon className="w-5 h-5 text-accent" />
                <h3 className="text-base font-semibold text-navy">AI Pricing Insights</h3>
              </div>
              <div className="space-y-3">
                {results.insights.map((insight, idx) => (
                  <div key={idx} className="flex items-start gap-3 bg-gray-50 rounded-lg px-4 py-3">
                    {insight.type === 'above' ? <ArrowTrendingUpIcon className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" /> : insight.type === 'below' ? <ArrowTrendingDownIcon className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" /> : <CheckCircleIcon className="w-5 h-5 text-blue flex-shrink-0 mt-0.5" />}
                    <p className="text-sm text-gray-700">{insight.message || insight}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.market_comparison && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-4">
                <ChartBarIcon className="w-5 h-5 text-navy" />
                <h3 className="text-base font-semibold text-navy">Market Comparison</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Category</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Your Rate</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Market Avg</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Difference</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Position</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {results.market_comparison.map((comp, idx) => {
                      const diff = comp.difference_percent;
                      return (
                        <tr key={idx} className="hover:bg-gray-50/50">
                          <td className="px-4 py-3 font-medium text-navy">{comp.category}</td>
                          <td className="px-4 py-3 font-semibold text-navy">{formatCurrency(comp.your_rate)}</td>
                          <td className="px-4 py-3 text-gray-600">{formatCurrency(comp.market_average)}</td>
                          <td className={`px-4 py-3 font-semibold ${diff > 0 ? 'text-red-500' : diff < 0 ? 'text-accent' : 'text-gray-600'}`}>
                            {diff != null ? `${diff > 0 ? '+' : ''}${diff.toFixed(1)}%` : 'N/A'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${diff > 0 ? 'bg-red-50 text-red-600' : diff < 0 ? 'bg-green-50 text-accent' : 'bg-gray-100 text-gray-600'}`}>
                              {diff > 0 ? 'Above' : diff < 0 ? 'Below' : 'At'} Market
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {!results && !loading && !error && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <ScaleIcon className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Build Your Pricing Strategy</h3>
          <p className="text-gray-400 text-sm max-w-md mx-auto">
            Add labor categories with cost rates, adjust wrap rates and profit margins, then get AI-powered recommendations.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Main Page Component ───────────────────────────────────────────────────────

export default function MarketResearch() {
  const [activeTab, setActiveTab] = useState('labor-rates');

  return (
    <div className="max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="bg-accent/10 rounded-lg p-2">
            <ChartBarIcon className="w-6 h-6 text-accent" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-navy">Market Intelligence</h1>
            <p className="text-gray-500 mt-0.5">
              Intelligence-driven labor rates, competitor analysis, and AI-powered pricing strategies
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-1.5 mb-6">
        <div className="flex gap-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-navy text-white shadow-md'
                    : 'text-gray-500 hover:text-navy hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4.5 h-4.5" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'labor-rates' && <LaborRateTab />}
      {activeTab === 'pricing' && <PricingStrategyTab />}
    </div>
  );
}

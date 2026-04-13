import { useState } from 'react';
import {
  MagnifyingGlassIcon,
  BuildingLibraryIcon,
  TagIcon,
  PlusIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  DocumentTextIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';
import api from '../services/api';

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
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return dateStr; }
};

export default function Knowledgebase() {
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
      setError(err.response?.data?.detail || err.message || 'Failed to fetch competitor data.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy">Knowledge Hub</h1>
        <p className="text-gray-500 text-sm mt-1">
          Search competitor awards and analyze last 1 year of government contract data
        </p>
      </div>

      {/* Search Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <UserGroupIcon className="w-5 h-5 text-navy" />
          <h2 className="text-base font-semibold text-navy">Search Competitor Awards</h2>
        </div>
        <form onSubmit={handleSearch}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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
            {loading ? (<><LoadingSpinner /> Searching Awards...</>) : (<><MagnifyingGlassIcon className="w-5 h-5" /> Search Competitor Awards</>)}
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
              {results.length > 0 ? `${results.length} Contract Awards Found` : 'No Awards Found'}
            </h2>
          </div>
          {results.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <UserGroupIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-sm">No competitor awards matched your search criteria. Try different keywords.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {results.map((award, index) => (
                <div key={award.id || index} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all hover:border-blue/20">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-navy text-base truncate">{award.vendor_name}</h3>
                      {award.contract_type && <p className="text-xs text-gray-400 mt-0.5">{award.contract_type}</p>}
                    </div>
                    {award.naics_code && (
                      <span className="bg-blue/10 text-blue px-2.5 py-0.5 rounded-full text-xs font-medium ml-3 flex-shrink-0">{award.naics_code}</span>
                    )}
                  </div>
                  {award.description && <p className="text-sm text-gray-500 mb-3 line-clamp-2">{award.description}</p>}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="bg-navy/5 rounded-lg px-3 py-2.5">
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">Award Value</p>
                      <p className="text-lg font-bold text-navy">{formatCurrency(award.award_value)}</p>
                    </div>
                    <div className="bg-navy/5 rounded-lg px-3 py-2.5">
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">Contract Period</p>
                      <p className="text-sm font-semibold text-navy">
                        {formatDate(award.award_date)}{award.end_date ? ` — ${formatDate(award.end_date)}` : ''}
                      </p>
                    </div>
                  </div>
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
                  {award.detail_url && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <a href={award.detail_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-blue hover:text-blue-dark transition-colors">
                        <DocumentTextIcon className="w-4 h-4" /> View Full Contract Details <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
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

      {/* Data Source Info */}
      {searched && results.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mt-4 mb-6">
          <h3 className="text-sm font-semibold text-navy mb-2">About This Data</h3>
          <div className="space-y-2 text-xs text-gray-500">
            <p><span className="font-medium text-gray-700">Contract Awards:</span> Real government contract data from the last 2 years, sourced from USASpending.gov federal spending database.</p>
            <p><span className="font-medium text-gray-700">Vendor Analysis:</span> Aggregated by recipient to show competitive landscape and market positioning.</p>
            <p><span className="font-medium text-gray-700">Sources:</span> <a href="https://www.usaspending.gov" target="_blank" rel="noopener noreferrer" className="text-blue hover:underline">USASpending.gov</a> | <a href="https://sam.gov" target="_blank" rel="noopener noreferrer" className="text-blue hover:underline">SAM.gov</a></p>
          </div>
        </div>
      )}

      {/* Competitor Directory (Coming Soon) */}
      <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-100 p-6 opacity-60 pointer-events-none select-none">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <UserGroupIcon className="w-5 h-5 text-navy" />
            <h2 className="text-base font-semibold text-navy">Competitor Directory</h2>
          </div>
          <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider">Coming Soon</span>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Track and manage known competitors by name, NAICS specialization, past wins, and estimated pricing.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-navy/5 border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-navy text-xs uppercase tracking-wider">Competitor Name</th>
                <th className="text-left py-3 px-4 font-semibold text-navy text-xs uppercase tracking-wider">NAICS Codes</th>
                <th className="text-left py-3 px-4 font-semibold text-navy text-xs uppercase tracking-wider">Known Contracts</th>
                <th className="text-left py-3 px-4 font-semibold text-navy text-xs uppercase tracking-wider">Avg Award</th>
                <th className="text-left py-3 px-4 font-semibold text-navy text-xs uppercase tracking-wider">Win Rate</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'ABC Consulting LLC', naics: '541512', contracts: 12, avg: '$1.8M', win: '68%' },
                { name: 'Federal Tech Solutions', naics: '541511', contracts: 8, avg: '$3.2M', win: '54%' },
                { name: 'CyberShield Partners', naics: '541519', contracts: 15, avg: '$2.1M', win: '72%' },
              ].map((row) => (
                <tr key={row.name} className="border-b border-gray-100">
                  <td className="py-3 px-4 font-medium text-navy">{row.name}</td>
                  <td className="py-3 px-4 text-gray-600">{row.naics}</td>
                  <td className="py-3 px-4 text-gray-600">{row.contracts}</td>
                  <td className="py-3 px-4 font-semibold text-gray-700">{row.avg}</td>
                  <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${parseInt(row.win) >= 60 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>{row.win}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-xs text-amber-700"><span className="font-semibold">Legal Notice:</span> This feature is currently disabled pending legal review.</p>
        </div>
      </div>
    </div>
  );
}

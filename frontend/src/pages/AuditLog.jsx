import { useState, useEffect } from 'react';
import {
  ClockIcon,
  DocumentPlusIcon,
  PencilSquareIcon,
  DocumentArrowDownIcon,
  ShareIcon,
  ArrowRightStartOnRectangleIcon,
} from '@heroicons/react/24/outline';
import api from '../services/api';

const actionConfig = {
  created_proposal: {
    label: 'Created Proposal',
    color: 'bg-green-100 text-green-700',
    icon: DocumentPlusIcon,
  },
  edited_section: {
    label: 'Edited Section',
    color: 'bg-blue-100 text-blue-700',
    icon: PencilSquareIcon,
  },
  exported_pdf: {
    label: 'Exported PDF',
    color: 'bg-purple-100 text-purple-700',
    icon: DocumentArrowDownIcon,
  },
  exported_docx: {
    label: 'Exported DOCX',
    color: 'bg-purple-100 text-purple-700',
    icon: DocumentArrowDownIcon,
  },
  shared_proposal: {
    label: 'Shared Proposal',
    color: 'bg-orange-100 text-orange-700',
    icon: ShareIcon,
  },
  login: {
    label: 'Login',
    color: 'bg-gray-100 text-gray-700',
    icon: ArrowRightStartOnRectangleIcon,
  },
};

const defaultActionConfig = {
  label: 'Action',
  color: 'bg-gray-100 text-gray-600',
  icon: ClockIcon,
};

export default function AuditLog() {
  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const limit = 20;

  const fetchEntries = async (currentOffset = 0, append = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    try {
      const res = await api.get(`/api/audit-log?limit=${limit}&offset=${currentOffset}`);
      if (append) {
        setEntries((prev) => [...prev, ...(res.data.entries || [])]);
      } else {
        setEntries(res.data.entries || []);
      }
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error('Failed to fetch audit log:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchEntries(0);
  }, []);

  const handleLoadMore = () => {
    const newOffset = offset + limit;
    setOffset(newOffset);
    fetchEntries(newOffset, true);
  };

  const hasMore = entries.length < total;

  const parseDetails = (details) => {
    if (!details) return null;
    try {
      return JSON.parse(details);
    } catch {
      return details;
    }
  };

  const formatDetails = (details) => {
    const parsed = parseDetails(details);
    if (!parsed) return '';
    if (typeof parsed === 'string') return parsed;
    if (parsed.title) return parsed.title;
    if (parsed.share_token) return `Token: ${parsed.share_token.slice(0, 8)}...`;
    if (parsed.sections) return `${parsed.sections} sections`;
    return JSON.stringify(parsed);
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <svg
            className="animate-spin w-10 h-10 text-[#1e3a5f] mx-auto mb-4"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-gray-500 text-sm">Loading audit log...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy flex items-center gap-3">
          <div className="bg-navy/10 rounded-xl p-2.5">
            <ClockIcon className="w-6 h-6 text-navy" />
          </div>
          Audit Log
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Track all actions and activity on your account.
        </p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {entries.length === 0 ? (
          <div className="p-12 text-center">
            <ClockIcon className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-600 mb-1">No Activity Yet</h2>
            <p className="text-gray-400 text-sm">
              Your actions will be logged here as you use the platform.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-navy text-white text-sm">
                    <th className="px-5 py-3.5 text-left font-medium rounded-tl-xl">Date / Time</th>
                    <th className="px-5 py-3.5 text-left font-medium">Action</th>
                    <th className="px-5 py-3.5 text-left font-medium">Details</th>
                    <th className="px-5 py-3.5 text-left font-medium rounded-tr-xl">IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, idx) => {
                    const config = actionConfig[entry.action] || defaultActionConfig;
                    const Icon = config.icon;
                    return (
                      <tr
                        key={entry.id}
                        className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${
                          idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                        }`}
                      >
                        <td className="px-5 py-3.5 text-sm text-gray-600 whitespace-nowrap">
                          {new Date(entry.created_at).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.color}`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                            {config.label}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-gray-600 max-w-xs truncate">
                          {formatDetails(entry.details)}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-gray-400 font-mono">
                          {entry.ip_address || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="p-4 text-center border-t border-gray-100">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {loadingMore ? (
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : null}
                  Load More ({total - entries.length} remaining)
                </button>
              </div>
            )}

            {/* Summary */}
            <div className="px-5 py-3 bg-gray-50 text-xs text-gray-400 border-t border-gray-100">
              Showing {entries.length} of {total} entries
            </div>
          </>
        )}
      </div>
    </div>
  );
}

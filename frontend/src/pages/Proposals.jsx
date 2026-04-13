import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DocumentTextIcon,
  TrashIcon,
  CalendarDaysIcon,
  FolderOpenIcon,
  PlusIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import api from '../services/api';

const statusColors = {
  draft: 'text-amber-600 bg-amber-100',
  completed: 'text-accent bg-accent/10',
  in_progress: 'text-blue bg-blue/10',
};

export default function Proposals() {
  const navigate = useNavigate();
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    fetchProposals();
  }, []);

  const fetchProposals = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/api/proposals');
      setProposals(response.data?.proposals || response.data || []);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.message ||
          'Failed to load proposals.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this proposal?')) return;

    setDeleting(id);
    try {
      await api.delete(`/api/proposals/${id}`);
      setProposals((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      alert(
        err.response?.data?.detail || err.message || 'Failed to delete proposal.'
      );
    } finally {
      setDeleting(null);
    }
  };

  const handleOpen = (proposal) => {
    navigate('/proposal-editor', {
      state: {
        proposal: proposal.sections || proposal,
        opportunity: {
          title: proposal.title,
          agency: proposal.agency,
        },
      },
    });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '--';
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

  const formatStatus = (status) => {
    if (!status) return 'Draft';
    return status
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-navy">My Proposals</h1>
          <p className="text-gray-500 mt-1">
            View and manage your saved proposals
          </p>
        </div>
        <button
          onClick={() => navigate('/new-proposal')}
          className="flex items-center gap-2 bg-accent hover:bg-accent-dark text-white px-5 py-2.5 rounded-lg font-medium text-sm transition-all shadow-sm hover:shadow-md cursor-pointer"
        >
          <PlusIcon className="w-4.5 h-4.5" />
          New Proposal
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <svg
            className="animate-spin w-8 h-8 text-navy mx-auto mb-3"
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
          <p className="text-gray-500 text-sm">Loading proposals...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && proposals.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <FolderOpenIcon className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-navy mb-2">No Proposals Yet</h2>
          <p className="text-gray-500 text-sm mb-6">
            Generate your first AI-powered government proposal to get started.
          </p>
          <button
            onClick={() => navigate('/new-proposal')}
            className="bg-accent hover:bg-accent-dark text-white px-6 py-3 rounded-lg font-medium text-sm transition-all cursor-pointer"
          >
            Generate New Proposal
          </button>
        </div>
      )}

      {/* Proposals Table */}
      {!loading && proposals.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-3">
                    Title
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-3">
                    Agency
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-3">
                    Status
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-3">
                    Date
                  </th>
                  <th className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {proposals.map((proposal) => (
                  <tr
                    key={proposal.id}
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleOpen(proposal)}
                        className="flex items-center gap-3 text-left cursor-pointer bg-transparent border-0 p-0"
                      >
                        <DocumentTextIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        <span className="font-medium text-gray-900 text-sm hover:text-blue transition-colors">
                          {proposal.title || 'Untitled Proposal'}
                        </span>
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {proposal.agency || '--'}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          statusColors[proposal.status?.toLowerCase()] ||
                          statusColors.draft
                        }`}
                      >
                        {formatStatus(proposal.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      <span className="flex items-center gap-1.5">
                        <CalendarDaysIcon className="w-4 h-4" />
                        {formatDate(proposal.created_at || proposal.date)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(proposal.id)}
                        disabled={deleting === proposal.id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition-all disabled:opacity-50 cursor-pointer"
                        title="Delete proposal"
                      >
                        <TrashIcon className="w-4 h-4" />
                        {deleting === proposal.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

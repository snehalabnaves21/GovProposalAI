import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';

import {
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  UserCircleIcon,
  ArrowTrendingUpIcon,
  DocumentDuplicateIcon,
  CalendarDaysIcon,
  ArrowRightIcon,
  RocketLaunchIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const statusColors = {
  draft: 'text-amber-600 bg-amber-50',
  completed: 'text-emerald-600 bg-emerald-50',
  in_progress: 'text-blue bg-blue/5',
};

export default function Dashboard() {
  const { user } = useAuth();
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProposals();
  }, []);

  const fetchProposals = async () => {
    try {
      const response = await api.get('/api/proposals');
      const data = response.data?.proposals || response.data || [];
      setProposals(data);
    } catch {
      // Silently fail — dashboard will show zeroes
    } finally {
      setLoading(false);
    }
  };

  const totalProposals = proposals.length;
  const completedProposals = proposals.filter(
    (p) => p.status?.toLowerCase() === 'completed'
  ).length;
  const pendingProposals = proposals.filter(
    (p) =>
      p.status?.toLowerCase() === 'draft' ||
      p.status?.toLowerCase() === 'in_progress'
  ).length;

  const recentProposals = proposals.slice(0, 5);

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
    return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const userName = user?.first_name || (user?.full_name ? user.full_name.split(' ')[0] : '');
  const navigate = useNavigate();
  return (
    <div className="max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-navy">
          Welcome Back{userName ? `, ${userName}` : ''}
        </h1>
        <p className="text-gray-500 mt-1">
          Manage your government proposals and track opportunities
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div onClick={() => navigate('/proposals')}
    className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow cursor-pointer">
              <p className="text-sm font-medium text-gray-500">Total Proposals</p>
              <p className="text-3xl font-bold text-navy mt-2">
                {loading ? <span className="inline-block w-8 h-8 bg-gray-100 rounded animate-pulse" /> : totalProposals}
              </p>
              <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                <ArrowTrendingUpIcon className="w-3.5 h-3.5" />
                {completedProposals} completed
              </p>
            </div>
            <div className="bg-blue rounded-lg p-3">
              <DocumentTextIcon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div onClick={() => navigate('/proposals?status=in_progress')}
    className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow cursor-pointer">
              <p className="text-sm font-medium text-gray-500">In Progress</p>
              <p className="text-3xl font-bold text-navy mt-2">
                {loading ? <span className="inline-block w-8 h-8 bg-gray-100 rounded animate-pulse" /> : pendingProposals}
              </p>
              <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                <ArrowTrendingUpIcon className="w-3.5 h-3.5" />
                {pendingProposals > 0 ? 'Needs attention' : 'All clear'}
              </p>
            </div>
            <div className="bg-amber-500 rounded-lg p-3">
              <ClockIcon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div onClick={() => navigate('/proposals?status=completed')}
    className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow cursor-pointer">
              <p className="text-sm font-medium text-gray-500">Completed</p>
              <p className="text-3xl font-bold text-navy mt-2">
                {loading ? <span className="inline-block w-8 h-8 bg-gray-100 rounded animate-pulse" /> : completedProposals}
              </p>
              <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                <ArrowTrendingUpIcon className="w-3.5 h-3.5" />
                {totalProposals > 0
                  ? `${Math.round((completedProposals / totalProposals) * 100)}% completion rate`
                  : 'Get started!'}
              </p>
            </div>
            <div className="bg-accent rounded-lg p-3">
              <CheckCircleIcon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions — colorful cards */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-navy mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/new-proposal"
            className="bg-accent hover:bg-accent-dark text-white rounded-xl p-5 transition-all no-underline shadow-sm hover:shadow-lg hover:-translate-y-0.5"
          >
            <PlusIcon className="w-8 h-8 mb-3" />
            <h3 className="font-semibold text-lg">New Proposal</h3>
            <p className="text-white/80 text-sm mt-1">Generate an AI-powered proposal</p>
          </Link>

          <Link
            to="/opportunities"
            className="bg-blue hover:bg-blue-light text-white rounded-xl p-5 transition-all no-underline shadow-sm hover:shadow-lg hover:-translate-y-0.5"
          >
            <MagnifyingGlassIcon className="w-8 h-8 mb-3" />
            <h3 className="font-semibold text-lg">Search Opportunities</h3>
            <p className="text-white/80 text-sm mt-1">Find government contract opportunities</p>
          </Link>

          <Link
            to="/vendor-profile"
            className="bg-navy hover:bg-navy-light text-white rounded-xl p-5 transition-all no-underline shadow-sm hover:shadow-lg hover:-translate-y-0.5"
          >
            <UserCircleIcon className="w-8 h-8 mb-3" />
            <h3 className="font-semibold text-lg">Manage Profile</h3>
            <p className="text-white/80 text-sm mt-1">Update your vendor information</p>
          </Link>
        </div>
      </div>

      {/* Recent Proposals */}
      <div className="bg-white rounded-xl border border-gray-100">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <DocumentDuplicateIcon className="w-4 h-4 text-gray-400" />
            Recent Proposals
          </h2>
          <Link
            to="/proposals"
            className="text-xs font-medium text-blue hover:text-blue-light no-underline flex items-center gap-1"
          >
            View all
            <ArrowRightIcon className="w-3 h-3" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center">
              <svg className="animate-spin w-5 h-5 text-gray-300 mx-auto mb-2" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-xs text-gray-400">Loading...</p>
            </div>
          ) : recentProposals.length === 0 ? (
            <div className="p-10 text-center">
              <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3">
                <RocketLaunchIcon className="w-6 h-6 text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-500 mb-1">No proposals yet</p>
              <p className="text-xs text-gray-400 mb-3">Create your first AI-powered government proposal</p>
              <Link
                to="/new-proposal"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white rounded-lg text-xs font-medium no-underline hover:bg-accent-dark transition-colors"
              >
                <PlusIcon className="w-3.5 h-3.5" />
                New Proposal
              </Link>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-5 py-2.5">
                    Proposal
                  </th>
                  <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-5 py-2.5">
                    Agency
                  </th>
                  <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-5 py-2.5">
                    Status
                  </th>
                  <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-5 py-2.5">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentProposals.map((proposal) => (
                  <tr
                    key={proposal.id}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-5 py-3">
                      <span className="font-medium text-gray-900 text-sm">
                        {proposal.title || 'Untitled Proposal'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500">
                      {proposal.agency || '--'}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${
                          statusColors[proposal.status?.toLowerCase()] || statusColors.draft
                        }`}
                      >
                        {formatStatus(proposal.status)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-400">
                      {formatDate(proposal.created_at || proposal.date)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UsersIcon,
  DocumentTextIcon,
  CreditCardIcon,
  ShieldCheckIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const tierOptions = ['free', 'paid'];

export default function Admin() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [stats, setStats] = useState({
    total_users: 0,
    total_proposals: 0,
    active_subscriptions: 0,
  });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(null);

  // Redirect non-admin users
  useEffect(() => {
    if (currentUser && !currentUser.is_admin) {
      navigate('/dashboard', { replace: true });
    }
  }, [currentUser, navigate]);

  useEffect(() => {
    if (currentUser?.is_admin) {
      fetchAdminData();
    }
  }, [currentUser]);

  const fetchAdminData = async () => {
    setLoading(true);
    setError('');
    try {
      const [statsRes, usersRes] = await Promise.all([
        api.get('/api/admin/stats'),
        api.get('/api/admin/users'),
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data?.users || usersRes.data || []);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.message ||
          'Failed to load admin data.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAdmin = async (userId, currentIsAdmin) => {
    setUpdating(userId);
    try {
      await api.put(`/api/admin/users/${userId}`, {
        is_admin: !currentIsAdmin,
      });
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, is_admin: !currentIsAdmin } : u
        )
      );
    } catch (err) {
      alert(
        err.response?.data?.detail || err.message || 'Failed to update user.'
      );
    } finally {
      setUpdating(null);
    }
  };

  const handleChangeTier = async (userId, newTier) => {
    setUpdating(userId);
    try {
      await api.put(`/api/admin/users/${userId}`, {
        subscription_tier: newTier,
      });
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, subscription_tier: newTier } : u))
      );
    } catch (err) {
      alert(
        err.response?.data?.detail || err.message || 'Failed to update tier.'
      );
    } finally {
      setUpdating(null);
    }
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

  if (!currentUser?.is_admin) {
    return null;
  }

  const statCards = [
    {
      label: 'Total Users',
      value: stats.total_users,
      icon: UsersIcon,
      color: 'bg-blue',
    },
    {
      label: 'Total Proposals',
      value: stats.total_proposals,
      icon: DocumentTextIcon,
      color: 'bg-navy',
    },
    {
      label: 'Active Subscriptions',
      value: stats.active_subscriptions,
      icon: CreditCardIcon,
      color: 'bg-accent',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <ShieldCheckIcon className="w-8 h-8 text-navy" />
          <h1 className="text-3xl font-bold text-navy">Admin Panel</h1>
        </div>
        <p className="text-gray-500 mt-1">
          Manage users, view statistics, and control subscriptions
        </p>
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
          <p className="text-gray-500 text-sm">Loading admin data...</p>
        </div>
      )}

      {!loading && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {statCards.map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        {stat.label}
                      </p>
                      <p className="text-3xl font-bold text-navy mt-2">
                        {stat.value}
                      </p>
                    </div>
                    <div className={`${stat.color} rounded-lg p-3`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-navy flex items-center gap-2">
                <UsersIcon className="w-5 h-5" />
                All Users
              </h2>
              <span className="text-sm text-gray-400">
                {users.length} user{users.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-3">
                      Name
                    </th>
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-3">
                      Email
                    </th>
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-3">
                      Tier
                    </th>
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-3">
                      Proposals
                    </th>
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-3">
                      Joined
                    </th>
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-3">
                      Admin
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <span className="font-medium text-gray-900 text-sm">
                          {u.full_name || '--'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {u.email}
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={u.subscription_tier || 'free'}
                          onChange={(e) =>
                            handleChangeTier(u.id, e.target.value)
                          }
                          disabled={updating === u.id}
                          className="text-xs font-medium px-2 py-1 rounded-lg border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue/30 cursor-pointer disabled:opacity-50"
                        >
                          {tierOptions.map((t) => (
                            <option key={t} value={t}>
                              {t.charAt(0).toUpperCase() + t.slice(1)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {u.proposals_count ?? u.proposal_count ?? '--'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        <span className="flex items-center gap-1.5">
                          <CalendarDaysIcon className="w-4 h-4" />
                          {formatDate(u.created_at || u.joined)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() =>
                            handleToggleAdmin(u.id, u.is_admin)
                          }
                          disabled={
                            updating === u.id || u.id === currentUser?.id
                          }
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                            u.is_admin
                              ? 'bg-navy text-white hover:bg-navy-light'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                          title={
                            u.id === currentUser?.id
                              ? 'Cannot change your own admin status'
                              : u.is_admin
                              ? 'Remove admin'
                              : 'Make admin'
                          }
                        >
                          {u.is_admin ? 'Admin' : 'User'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

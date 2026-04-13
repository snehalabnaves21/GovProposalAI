import { useState, useEffect } from 'react';
import {
  BriefcaseIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
  CheckCircleIcon,
  ClockIcon,
  PauseCircleIcon,
  XCircleIcon,
  CurrencyDollarIcon,
  CalendarDaysIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import api from '../services/api';

const STATUS_CONFIG = {
  active: { label: 'Active', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircleIcon, dotColor: 'bg-green-500' },
  completed: { label: 'Completed', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: CheckCircleIcon, dotColor: 'bg-blue-500' },
  on_hold: { label: 'On Hold', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: PauseCircleIcon, dotColor: 'bg-amber-500' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircleIcon, dotColor: 'bg-red-500' },
};

const emptyContract = {
  title: '',
  contract_number: '',
  agency: '',
  status: 'active',
  value: '',
  start_date: '',
  end_date: '',
  deliverables: [],
  notes: '',
};

export default function ContractManager() {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...emptyContract });
  const [newDeliverable, setNewDeliverable] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState('cards'); // cards | kanban

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    try {
      const res = await api.get('/api/contracts');
      setContracts(res.data.contracts || []);
    } catch (err) {
      console.error('Failed to fetch contracts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        value: parseFloat(form.value) || 0,
      };
      if (editingId) {
        await api.put(`/api/contracts/${editingId}`, payload);
      } else {
        await api.post('/api/contracts', payload);
      }
      setShowForm(false);
      setEditingId(null);
      setForm({ ...emptyContract });
      fetchContracts();
    } catch (err) {
      alert('Failed to save: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (contract) => {
    setForm({
      title: contract.title,
      contract_number: contract.contract_number || '',
      agency: contract.agency || '',
      status: contract.status,
      value: contract.value || '',
      start_date: contract.start_date || '',
      end_date: contract.end_date || '',
      deliverables: contract.deliverables || [],
      notes: contract.notes || '',
    });
    setEditingId(contract.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this contract?')) return;
    try {
      await api.delete(`/api/contracts/${id}`);
      fetchContracts();
    } catch (err) {
      alert('Failed to delete: ' + (err.response?.data?.detail || err.message));
    }
  };

  const addDeliverable = () => {
    if (!newDeliverable.trim()) return;
    setForm((prev) => ({
      ...prev,
      deliverables: [...prev.deliverables, { text: newDeliverable, done: false }],
    }));
    setNewDeliverable('');
  };

  const toggleDeliverable = (idx) => {
    setForm((prev) => ({
      ...prev,
      deliverables: prev.deliverables.map((d, i) =>
        i === idx ? { ...d, done: !d.done } : d
      ),
    }));
  };

  const removeDeliverable = (idx) => {
    setForm((prev) => ({
      ...prev,
      deliverables: prev.deliverables.filter((_, i) => i !== idx),
    }));
  };

  const filtered = filterStatus === 'all'
    ? contracts
    : contracts.filter((c) => c.status === filterStatus);

  const statusCounts = {
    all: contracts.length,
    active: contracts.filter((c) => c.status === 'active').length,
    completed: contracts.filter((c) => c.status === 'completed').length,
    on_hold: contracts.filter((c) => c.status === 'on_hold').length,
    cancelled: contracts.filter((c) => c.status === 'cancelled').length,
  };

  const totalValue = contracts
    .filter((c) => c.status === 'active')
    .reduce((sum, c) => sum + (parseFloat(c.value) || 0), 0);

  const fmt = (n) =>
    '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-navy flex items-center gap-3">
            <BriefcaseIcon className="w-8 h-8 text-accent" />
            Contract Manager
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Track deliverables, deadlines, and status of your awarded contracts.
          </p>
        </div>
        <button
          onClick={() => { setForm({ ...emptyContract }); setEditingId(null); setShowForm(true); }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-accent hover:bg-accent-dark text-white transition-all cursor-pointer shadow-md"
        >
          <PlusIcon className="w-5 h-5" />
          New Contract
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase">Active Contracts</p>
          <p className="text-2xl font-bold text-navy mt-1">{statusCounts.active}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase">Total Active Value</p>
          <p className="text-2xl font-bold text-accent mt-1">{fmt(totalValue)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase">Completed</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{statusCounts.completed}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase">On Hold</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{statusCounts.on_hold}</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {Object.entries({ all: 'All', ...Object.fromEntries(Object.entries(STATUS_CONFIG).map(([k, v]) => [k, v.label])) }).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilterStatus(key)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
              filterStatus === key
                ? 'bg-navy text-white border-navy'
                : 'bg-white text-gray-600 border-gray-200 hover:border-navy'
            }`}
          >
            {label} ({statusCounts[key] || 0})
          </button>
        ))}
      </div>

      {/* Contract Cards */}
      {loading ? (
        <div className="text-center py-12">
          <svg className="animate-spin w-8 h-8 text-navy mx-auto mb-3" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-gray-400 text-sm">Loading contracts...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <BriefcaseIcon className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-navy mb-2">No Contracts Yet</h2>
          <p className="text-gray-500 text-sm mb-6">
            Add your first contract to start tracking deliverables and deadlines.
          </p>
          <button
            onClick={() => { setForm({ ...emptyContract }); setEditingId(null); setShowForm(true); }}
            className="bg-accent hover:bg-accent-dark text-white px-6 py-3 rounded-lg font-medium text-sm transition-all cursor-pointer"
          >
            Add First Contract
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((contract) => {
            const sc = STATUS_CONFIG[contract.status] || STATUS_CONFIG.active;
            const deliverables = contract.deliverables || [];
            const doneCount = deliverables.filter((d) => d.done).length;
            return (
              <div key={contract.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-2 h-2 rounded-full ${sc.dotColor}`} />
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${sc.color}`}>
                        {sc.label}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-navy truncate">{contract.title}</h3>
                    {contract.agency && (
                      <p className="text-xs text-gray-500 mt-0.5">{contract.agency}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                    <button
                      onClick={() => handleEdit(contract)}
                      className="p-1.5 rounded hover:bg-gray-100 transition-colors cursor-pointer"
                      title="Edit"
                    >
                      <PencilSquareIcon className="w-4 h-4 text-gray-400" />
                    </button>
                    <button
                      onClick={() => handleDelete(contract.id)}
                      className="p-1.5 rounded hover:bg-red-50 transition-colors cursor-pointer"
                      title="Delete"
                    >
                      <TrashIcon className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-3">
                  {contract.contract_number && (
                    <div className="bg-gray-50 rounded-lg px-2 py-1.5">
                      <p className="text-[9px] text-gray-400 font-medium uppercase">Contract #</p>
                      <p className="text-xs font-semibold text-navy truncate">{contract.contract_number}</p>
                    </div>
                  )}
                  {contract.value > 0 && (
                    <div className="bg-gray-50 rounded-lg px-2 py-1.5">
                      <p className="text-[9px] text-gray-400 font-medium uppercase">Value</p>
                      <p className="text-xs font-semibold text-accent">{fmt(contract.value)}</p>
                    </div>
                  )}
                  {(contract.start_date || contract.end_date) && (
                    <div className="bg-gray-50 rounded-lg px-2 py-1.5">
                      <p className="text-[9px] text-gray-400 font-medium uppercase">Period</p>
                      <p className="text-xs font-semibold text-navy truncate">
                        {contract.start_date || '?'} — {contract.end_date || '?'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Deliverables progress */}
                {deliverables.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs font-medium text-gray-500">
                        Deliverables: {doneCount}/{deliverables.length}
                      </p>
                      <p className="text-xs text-gray-400">
                        {deliverables.length > 0 ? Math.round((doneCount / deliverables.length) * 100) : 0}%
                      </p>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-accent rounded-full h-1.5 transition-all"
                        style={{ width: `${deliverables.length > 0 ? (doneCount / deliverables.length) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Contract Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-lg font-bold text-navy">
                {editingId ? 'Edit Contract' : 'New Contract'}
              </h2>
              <button
                onClick={() => { setShowForm(false); setEditingId(null); }}
                className="p-1 hover:bg-gray-100 rounded cursor-pointer"
              >
                <XMarkIcon className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Contract Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="e.g., IT Support Services — VA Medical Center"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Contract Number</label>
                  <input
                    type="text"
                    value={form.contract_number}
                    onChange={(e) => setForm((p) => ({ ...p, contract_number: e.target.value }))}
                    placeholder="e.g., GS-35F-0001"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Agency</label>
                  <input
                    type="text"
                    value={form.agency}
                    onChange={(e) => setForm((p) => ({ ...p, agency: e.target.value }))}
                    placeholder="e.g., Department of VA"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue/30"
                  >
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="on_hold">On Hold</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Contract Value ($)</label>
                  <input
                    type="number"
                    value={form.value}
                    onChange={(e) => setForm((p) => ({ ...p, value: e.target.value }))}
                    placeholder="e.g., 500000"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
                  <input
                    type="date"
                    value={form.end_date}
                    onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue/30"
                  />
                </div>
              </div>

              {/* Deliverables */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Deliverables</label>
                <div className="space-y-1.5 mb-2">
                  {form.deliverables.map((d, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                      <input
                        type="checkbox"
                        checked={d.done}
                        onChange={() => toggleDeliverable(idx)}
                        className="w-4 h-4 rounded accent-accent cursor-pointer"
                      />
                      <span className={`text-sm flex-1 ${d.done ? 'line-through text-gray-400' : 'text-navy'}`}>
                        {d.text}
                      </span>
                      <button
                        onClick={() => removeDeliverable(idx)}
                        className="p-0.5 hover:bg-white rounded cursor-pointer"
                      >
                        <XMarkIcon className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newDeliverable}
                    onChange={(e) => setNewDeliverable(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addDeliverable()}
                    placeholder="Add a deliverable..."
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue/30"
                  />
                  <button
                    onClick={addDeliverable}
                    className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
                  >
                    <PlusIcon className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Additional notes about this contract..."
                  rows={3}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 resize-y"
                />
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3 rounded-b-2xl">
              <button
                onClick={() => { setShowForm(false); setEditingId(null); }}
                className="px-4 py-2.5 rounded-lg text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!form.title.trim() || saving}
                className="px-6 py-2.5 rounded-lg text-sm font-semibold bg-accent hover:bg-accent-dark text-white transition-all disabled:opacity-50 cursor-pointer"
              >
                {saving ? 'Saving...' : editingId ? 'Update Contract' : 'Create Contract'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

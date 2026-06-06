'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import useAuthStore from '@/store/auth';
import toast from 'react-hot-toast';
import { Plus, CheckCircle, Circle, ArrowRight, X, ChevronRight } from 'lucide-react';

const STATUS_CONFIG = {
  PENDING:     { label: 'Pending',     color: 'text-gray-400',    bg: 'bg-gray-500/10',    border: 'border-gray-500/20' },
  IN_PROGRESS: { label: 'In Progress', color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20' },
  SUBMITTED:   { label: 'Submitted',   color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20' },
  APPROVED:    { label: 'Approved',    color: 'text-brand-400',   bg: 'bg-brand-500/10',   border: 'border-brand-500/20' },
  RELEASED:    { label: 'Paid ✓',      color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
};

// What action button to show based on role + current status
const getNextAction = (status, isPoster) => {
  if (isPoster) {
    if (status === 'SUBMITTED') return { label: 'Approve', next: 'APPROVED' };
    if (status === 'APPROVED')  return { label: 'Release Payment 💸', next: 'RELEASED' };
  } else {
    if (status === 'PENDING')     return { label: 'Start', next: 'IN_PROGRESS' };
    if (status === 'IN_PROGRESS') return { label: 'Submit for Review', next: 'SUBMITTED' };
  }
  return null;
};

export default function MilestonesPanel({ projectId, isPoster, currency }) {
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', amount: '', dueDate: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get(`/milestones/project/${projectId}`)
      .then(({ data }) => { setMilestones(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [projectId]);

  const handleAdd = async () => {
    if (!form.title || !form.amount) return toast.error('Title and amount required');
    setSaving(true);
    try {
      const { data } = await api.post(`/milestones/project/${projectId}`, {
        ...form,
        amount: parseFloat(form.amount),
        order: milestones.length,
      });
      setMilestones(p => [...p, data]);
      setForm({ title: '', description: '', amount: '', dueDate: '' });
      setShowAdd(false);
      toast.success('Milestone added!');
    } catch { toast.error('Failed to add milestone'); }
    finally { setSaving(false); }
  };

  const handleAction = async (milestone, next) => {
    try {
      const { data } = await api.put(`/milestones/${milestone.id}/status`, { status: next });
      setMilestones(p => p.map(m => m.id === milestone.id ? data : m));
      if (next === 'RELEASED') toast.success('Payment released! 💸');
      else if (next === 'SUBMITTED') toast.success('Submitted for review!');
      else if (next === 'APPROVED') toast.success('Milestone approved!');
      else toast.success('Status updated!');
    } catch { toast.error('Failed to update'); }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/milestones/${id}`);
      setMilestones(p => p.filter(m => m.id !== id));
    } catch { toast.error('Failed to delete'); }
  };

  const total = milestones.reduce((sum, m) => sum + m.amount, 0);
  const released = milestones.filter(m => m.status === 'RELEASED').reduce((sum, m) => sum + m.amount, 0);

  if (loading) return <div className="py-4 text-center"><div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-white">Milestones</h3>
          {milestones.length > 0 && (
            <p className="text-xs text-gray-500 mt-0.5">
              {released.toLocaleString()} / {total.toLocaleString()} {currency} released
            </p>
          )}
        </div>
        {isPoster && (
          <button onClick={() => setShowAdd(p => !p)} className="btn-outline text-xs flex items-center gap-1.5">
            <Plus size={12} /> Add milestone
          </button>
        )}
      </div>

      {/* Progress bar */}
      {milestones.length > 0 && total > 0 && (
        <div className="mb-4">
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-500 to-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${(released / total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Add form */}
      {showAdd && (
        <div className="bg-white/5 border border-border rounded-xl p-4 mb-4 animate-fade-in">
          <div className="space-y-2 mb-3">
            <input className="input py-2 text-sm" placeholder="Milestone title *" value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
            <input className="input py-2 text-sm" placeholder="Description (optional)" value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            <div className="grid grid-cols-2 gap-2">
              <input type="number" className="input py-2 text-sm" placeholder={`Amount (${currency}) *`} value={form.amount}
                onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} />
              <input type="date" className="input py-2 text-sm" value={form.dueDate}
                onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAdd(false)} className="btn-ghost text-xs">Cancel</button>
            <button onClick={handleAdd} disabled={saving} className="btn-primary text-xs">
              {saving ? 'Adding...' : 'Add'}
            </button>
          </div>
        </div>
      )}

      {/* Milestone list */}
      {milestones.length === 0 ? (
        <p className="text-gray-600 text-sm py-2">
          {isPoster ? 'No milestones yet. Add one to break the project into steps.' : 'No milestones defined yet.'}
        </p>
      ) : (
        <div className="space-y-2">
          {milestones.map((m, i) => {
            const config = STATUS_CONFIG[m.status] || STATUS_CONFIG.PENDING;
            const action = getNextAction(m.status, isPoster);
            return (
              <div key={m.id} className="bg-white/4 border border-border rounded-xl p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    <span className="text-gray-600 text-xs font-medium mt-0.5 flex-shrink-0">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{m.title}</p>
                      {m.description && <p className="text-xs text-gray-500 mt-0.5">{m.description}</p>}
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`text-xs px-2 py-0.5 rounded-md border ${config.bg} ${config.color} ${config.border}`}>
                          {config.label}
                        </span>
                        <span className="text-xs text-white font-medium">{m.amount.toLocaleString()} {currency}</span>
                        {m.dueDate && (
                          <span className="text-xs text-gray-600">
                            Due {new Date(m.dueDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {action && (
                      <button
                        onClick={() => handleAction(m, action.next)}
                        className="text-xs px-2.5 py-1 bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 border border-brand-500/20 rounded-lg transition-all whitespace-nowrap"
                      >
                        {action.label}
                      </button>
                    )}
                    {isPoster && m.status === 'PENDING' && (
                      <button onClick={() => handleDelete(m.id)} className="text-gray-600 hover:text-red-400 transition-colors p-1">
                        <X size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import useAuthStore from '@/store/auth';
import toast from 'react-hot-toast';
import { Plus, Briefcase, MapPin, Clock, Users, X, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

const STATUS_COLORS = {
  OPEN:        'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  IN_PROGRESS: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  COMPLETED:   'text-gray-400 bg-white/5 border-border',
  CANCELLED:   'text-red-400 bg-red-500/10 border-red-500/20',
};

function ProjectCard({ project, onApply, currentUserId }) {
  const isOwn = project.poster?.id === currentUserId;

  return (
    <Link href={`/projects/${project.id}`}>
      <div className="card p-4 active:scale-[0.98] transition-all hover:border-brand-500/30">
        {/* Title row */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white text-sm leading-snug line-clamp-2 mb-1">{project.title}</h3>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 flex-wrap">
              <div className="flex items-center gap-1">
                <div className="w-3.5 h-3.5 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 text-[9px] font-bold flex-shrink-0">
                  {project.poster?.name?.[0]}
                </div>
                <span className="truncate max-w-[80px]">{project.poster?.name}</span>
                {project.poster?.isVerified && <span className="text-brand-400">✓</span>}
              </div>
              <span>·</span>
              <div className="flex items-center gap-0.5">
                <MapPin size={9} />
                <span>{project.poster?.city || 'Karachi'}</span>
              </div>
            </div>
          </div>
          {/* Budget badge */}
          <div className="flex-shrink-0 text-right">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-2.5 py-1.5">
              <p className="font-bold text-emerald-400 text-sm leading-none">{project.budget.toLocaleString()}</p>
              <p className="text-emerald-600 text-[10px] mt-0.5">{project.currency}</p>
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-gray-400 text-xs leading-relaxed mb-3 line-clamp-2">
          {project.description}
        </p>

        {/* Skills */}
        {project.skills?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {project.skills.slice(0, 3).map(s => (
              <span key={s.skillName} className="text-[11px] px-2 py-0.5 rounded-md bg-white/5 text-gray-400 border border-white/10">
                {s.skillName}
              </span>
            ))}
            {project.skills.length > 3 && (
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-white/5 text-gray-500 border border-white/10">
                +{project.skills.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className={`text-[11px] px-2 py-0.5 rounded-md border font-medium ${STATUS_COLORS[project.status]}`}>
              {project.status.replace('_', ' ')}
            </span>
            <div className="flex items-center gap-1">
              <Users size={10} />
              <span>{project._count?.applications || 0}</span>
            </div>
            {project.deadline && (
              <div className="flex items-center gap-1">
                <Clock size={10} />
                <span>{formatDistanceToNow(new Date(project.deadline), { addSuffix: true })}</span>
              </div>
            )}
          </div>
          {!isOwn && project.status === 'OPEN' ? (
            <button
              onClick={e => { e.preventDefault(); onApply(project); }}
              className="text-xs px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl transition-all active:scale-95 font-medium flex-shrink-0"
            >
              Apply
            </button>
          ) : isOwn ? (
            <span className="text-xs text-gray-600 flex-shrink-0">Your project</span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

function ApplyModal({ project, onClose, onSubmit }) {
  const [pitch, setPitch] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!pitch.trim()) return toast.error('Write a pitch!');
    setLoading(true);
    await onSubmit(project.id, pitch);
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end justify-center p-0">
      <div className="card w-full rounded-b-none rounded-t-3xl p-5 animate-slide-up">
        <div className="w-10 h-1 bg-border rounded-full mx-auto mb-4" />
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-white">Apply to project</h3>
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{project.title}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white p-2"><X size={18} /></button>
        </div>
        <textarea
          className="input resize-none min-h-[110px] text-sm mb-3"
          placeholder="Tell them why you're perfect. Short and punchy!"
          value={pitch}
          onChange={e => setPitch(e.target.value)}
          maxLength={500}
          autoFocus
        />
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-600">{pitch.length}/500</span>
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-ghost flex-1 text-sm">Cancel</button>
          <button onClick={handleSubmit} className="btn-primary flex-1 text-sm" disabled={loading}>
            {loading ? 'Sending...' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}

function NewProjectModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ title: '', description: '', budget: '', currency: 'PKR', deadline: '', skills: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!form.title || !form.description || !form.budget)
      return toast.error('Fill required fields');
    setLoading(true);
    try {
      const skills = form.skills.split(',').map(s => s.trim()).filter(Boolean);
      const { data } = await api.post('/projects', { ...form, budget: parseFloat(form.budget), skills });
      onCreated(data);
      onClose();
      toast.success('Project posted! 🚀');
    } catch {
      toast.error('Failed to post project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end justify-center p-0">
      <div className="card w-full rounded-b-none rounded-t-3xl p-5 animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="w-10 h-1 bg-border rounded-full mx-auto mb-4" />
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-white">Post a project</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white p-1"><X size={18} /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Title *</label>
            <input className="input text-sm" placeholder="Need a logo designer" value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Description *</label>
            <textarea className="input resize-none min-h-[80px] text-sm" placeholder="Describe what you need..."
              value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Budget *</label>
              <input type="number" className="input text-sm" placeholder="5000" value={form.budget}
                onChange={e => setForm(p => ({ ...p, budget: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Currency</label>
              <select className="input text-sm" value={form.currency} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}>
                <option value="PKR">PKR</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Skills needed</label>
            <input className="input text-sm" placeholder="React, Figma, Video Editing..." value={form.skills}
              onChange={e => setForm(p => ({ ...p, skills: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Deadline (optional)</label>
            <input type="date" className="input text-sm" value={form.deadline}
              onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))} />
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="btn-ghost flex-1 text-sm">Cancel</button>
          <button onClick={handleSubmit} className="btn-primary flex-1 text-sm" disabled={loading}>
            {loading ? 'Posting...' : 'Post project'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applyTarget, setApplyTarget] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [tab, setTab] = useState('browse');
  const { user } = useAuthStore();

  useEffect(() => { fetchProjects(); }, [tab]);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      if (tab === 'browse') {
        const { data } = await api.get('/projects');
        setProjects(data.projects);
      } else if (tab === 'posted') {
        const { data } = await api.get('/projects/my/posted');
        setProjects(data);
      } else {
        const { data } = await api.get('/projects/my/applied');
        setProjects(data.map(a => ({ ...a.project, myStatus: a.status })));
      }
    } catch {
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (projectId, pitch) => {
    try {
      await api.post(`/projects/${projectId}/apply`, { pitch });
      toast.success('Application sent! ✅');
      fetchProjects();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to apply');
    }
  };

  return (
    <div className="p-4 pb-24 md:pb-8 md:p-8 max-w-3xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-display text-xl md:text-2xl font-bold text-white">Projects</h1>
          <p className="text-gray-500 text-xs mt-0.5">Find gigs or post your own</p>
        </div>
        <button onClick={() => setShowNew(true)} className="flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-3 py-2.5 rounded-xl transition-all active:scale-95">
          <Plus size={15} />
          Post
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-card border border-border rounded-xl p-1 mb-4">
        {[
          { key: 'browse', label: 'Browse' },
          { key: 'posted', label: 'My Posts' },
          { key: 'applied', label: 'Applied' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 text-xs md:text-sm rounded-lg font-medium transition-all ${
              tab === t.key ? 'bg-brand-500/20 text-brand-400' : 'text-gray-500 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <Briefcase size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">
            {tab === 'browse' ? 'No open projects yet.'
              : tab === 'posted' ? "You haven't posted any projects."
              : "You haven't applied to any projects."}
          </p>
          {tab === 'browse' && (
            <button onClick={() => setShowNew(true)} className="btn-primary mt-4 text-sm">
              Post the first one
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              currentUserId={user?.id}
              onApply={setApplyTarget}
            />
          ))}
        </div>
      )}

      {applyTarget && (
        <ApplyModal
          project={applyTarget}
          onClose={() => setApplyTarget(null)}
          onSubmit={handleApply}
        />
      )}

      {showNew && (
        <NewProjectModal
          onClose={() => setShowNew(false)}
          onCreated={p => { setProjects(prev => [p, ...prev]); setTab('browse'); }}
        />
      )}
    </div>
  );
}

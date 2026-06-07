'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import useAuthStore from '@/store/auth';
import toast from 'react-hot-toast';
import { Plus, Briefcase, MapPin, Clock, DollarSign, Users, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

function ProjectCard({ project, onApply, currentUserId }) {
  const isOwn = project.poster?.id === currentUserId;

  return (
    <div className="card p-5 hover:border-brand-500/30 transition-all animate-fade-in">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white mb-0.5 truncate">{project.title}</h3>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 text-[9px] font-bold">
                {project.poster?.name?.[0]}
              </div>
              {project.poster?.name}
              {project.poster?.isVerified && <span className="text-brand-400 text-[10px]">✓</span>}
            </div>
            <span>·</span>
            <MapPin size={10} />
            {project.poster?.city || 'Karachi'}
          </div>
        </div>
        <div className="text-right flex-shrink-0 ml-3">
          <p className="font-display font-bold text-white text-lg">
            {project.budget.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500">{project.currency}</p>
        </div>
      </div>

      <p className="text-gray-400 text-sm line-clamp-2 mb-3 leading-relaxed">
        {project.description}
      </p>

      {project.skills?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {project.skills.map(s => (
            <span key={s.skillName} className="tag tag-gray text-xs">{s.skillName}</span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Users size={11} />
            {project._count?.applications || 0} applied
          </div>
          {project.deadline && (
            <div className="flex items-center gap-1">
              <Clock size={11} />
              {formatDistanceToNow(new Date(project.deadline), { addSuffix: true })}
            </div>
          )}
        </div>

        {!isOwn && (
          <button
            onClick={() => onApply(project)}
            className="text-xs px-3 py-1.5 bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 border border-brand-500/20 rounded-lg transition-all"
          >
            Apply →
          </button>
        )}
        {isOwn && (
          <span className="text-xs text-gray-500 bg-white/5 px-2 py-1 rounded-lg">Your project</span>
        )}
      </div>
    </div>
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4">
      <div className="card w-full max-w-lg p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-white">Apply to project</h3>
            <p className="text-sm text-gray-500">{project.title}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white p-1"><X size={18} /></button>
        </div>
        <textarea
          className="input min-h-[120px] resize-none mb-4"
          placeholder="Tell them why you're perfect for this. Keep it short and punchy!"
          value={pitch}
          onChange={e => setPitch(e.target.value)}
          maxLength={500}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">{pitch.length}/500</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-ghost text-sm">Cancel</button>
            <button onClick={handleSubmit} className="btn-primary text-sm" disabled={loading}>
              {loading ? 'Sending...' : 'Submit application'}
            </button>
          </div>
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4">
      <div className="card w-full max-w-lg p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-white">Post a project</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white p-1"><X size={18} /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Title *</label>
            <input className="input" placeholder="Need a logo designer" value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Description *</label>
            <textarea className="input resize-none min-h-[80px]" placeholder="Describe what you need..."
              value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Budget *</label>
              <input type="number" className="input" placeholder="5000" value={form.budget}
                onChange={e => setForm(p => ({ ...p, budget: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Currency</label>
              <select className="input" value={form.currency} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}>
                <option value="PKR">PKR</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Skills needed</label>
            <input className="input" placeholder="React, Figma, Video Editing (comma separated)" value={form.skills}
              onChange={e => setForm(p => ({ ...p, skills: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Deadline (optional)</label>
            <input type="date" className="input" value={form.deadline}
              onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))} />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="btn-ghost text-sm">Cancel</button>
          <button onClick={handleSubmit} className="btn-primary text-sm" disabled={loading}>
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
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-white mb-1">Project Board</h1>
          <p className="text-gray-500 text-sm">Find gigs or post your own</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={16} />
          Post project
        </button>
      </div>

      <div className="flex gap-1 bg-card border border-border rounded-xl p-1 mb-6">
        {[
          { key: 'browse', label: 'Browse' },
          { key: 'posted', label: 'My Projects' },
          { key: 'applied', label: 'Applied' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 text-sm rounded-lg font-medium transition-all ${
              tab === t.key ? 'bg-brand-500/20 text-brand-400' : 'text-gray-500 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <Briefcase size={32} className="mx-auto mb-3 opacity-30" />
          <p>{tab === 'browse' ? 'No open projects yet.' : tab === 'posted' ? "You haven't posted any projects." : "You haven't applied to any projects."}</p>
        </div>
      ) : (
        <div className="space-y-4">
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
          onCreated={p => setProjects(prev => [p, ...prev])}
        />
      )}
    </div>
  );
}

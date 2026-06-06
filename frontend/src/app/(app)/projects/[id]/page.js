'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import useAuthStore from '@/store/auth';
import MilestonesPanel from '@/components/MilestonesPanel';
import toast from 'react-hot-toast';
import { ArrowLeft, MapPin, Clock, Users, DollarSign, CheckCircle, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function ProjectDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pitch, setPitch] = useState('');
  const [applying, setApplying] = useState(false);
  const [showApply, setShowApply] = useState(false);

  useEffect(() => {
    api.get(`/projects/${id}`).then(({ data }) => {
      setProject(data);
      setLoading(false);
    }).catch(() => {
      toast.error('Project not found');
      router.push('/projects');
    });
  }, [id]);

  const isPoster = project?.posterId === user?.id;
  const myApplication = project?.applications?.find(a => a.applicantId === user?.id);
  const hasApplied = !!myApplication;

  const handleApply = async () => {
    if (!pitch.trim()) return toast.error('Write a pitch!');
    setApplying(true);
    try {
      await api.post(`/projects/${id}/apply`, { pitch });
      toast.success('Application sent! ✅');
      const { data } = await api.get(`/projects/${id}`);
      setProject(data);
      setShowApply(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to apply');
    } finally {
      setApplying(false);
    }
  };

  const handleApplicationAction = async (appId, status) => {
    try {
      await api.put(`/projects/${id}/applications/${appId}`, { status });
      const { data } = await api.get(`/projects/${id}`);
      setProject(data);
      toast.success(status === 'ACCEPTED' ? 'Applicant accepted! 🎉' : 'Application rejected');
    } catch { toast.error('Failed to update application'); }
  };

  const handleComplete = async () => {
    try {
      await api.put(`/projects/${id}/complete`);
      setProject(p => ({ ...p, status: 'COMPLETED' }));
      toast.success('Project marked as completed! 🎉');
    } catch { toast.error('Failed to update project'); }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const STATUS_COLORS = {
    OPEN: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    IN_PROGRESS: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    COMPLETED: 'text-gray-400 bg-white/5 border-border',
    CANCELLED: 'text-red-400 bg-red-500/10 border-red-500/20',
  };

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 hover:text-white text-sm mb-6 transition-colors">
        <ArrowLeft size={16} /> Back to projects
      </button>

      {/* Header */}
      <div className="card p-6 mb-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs px-2.5 py-1 rounded-lg border font-medium ${STATUS_COLORS[project.status]}`}>
                {project.status.replace('_', ' ')}
              </span>
              {project.deadline && (
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock size={11} />
                  {formatDistanceToNow(new Date(project.deadline), { addSuffix: true })}
                </span>
              )}
            </div>
            <h1 className="font-display font-bold text-2xl text-white mb-2">{project.title}</h1>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 text-xs font-bold">
                {project.poster?.name?.[0]}
              </div>
              <span className="text-sm text-gray-400">{project.poster?.name}</span>
              {project.poster?.isVerified && <span className="text-brand-400 text-xs">✓</span>}
              <span className="text-gray-600 text-xs flex items-center gap-1"><MapPin size={10} /> {project.poster?.city || 'Karachi'}</span>
            </div>
          </div>
          <div className="text-right flex-shrink-0 ml-4">
            <p className="font-display font-bold text-2xl text-white">{project.budget.toLocaleString()}</p>
            <p className="text-gray-500 text-sm">{project.currency}</p>
          </div>
        </div>

        <p className="text-gray-300 leading-relaxed mb-4">{project.description}</p>

        {project.skills?.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {project.skills.map(s => <span key={s.skillName} className="tag tag-gray">{s.skillName}</span>)}
          </div>
        )}

        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1"><Users size={11} /> {project._count?.applications || 0} applicants</span>
          <span>Posted {formatDistanceToNow(new Date(project.createdAt), { addSuffix: true })}</span>
        </div>
      </div>

      {/* Apply / Status */}
      {!isPoster && project.status === 'OPEN' && (
        <div className="card p-5 mb-4">
          {hasApplied ? (
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle size={16} />
              <span className="text-sm font-medium">You applied — status: <span className="capitalize">{myApplication.status.toLowerCase()}</span></span>
            </div>
          ) : showApply ? (
            <div className="animate-fade-in">
              <p className="text-sm font-medium text-white mb-2">Your pitch</p>
              <textarea
                className="input resize-none min-h-[100px] mb-3 text-sm"
                placeholder="Tell them why you're perfect. Keep it short and punchy!"
                value={pitch}
                onChange={e => setPitch(e.target.value)}
                maxLength={500}
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowApply(false)} className="btn-ghost text-sm">Cancel</button>
                <button onClick={handleApply} disabled={applying} className="btn-primary text-sm">
                  {applying ? 'Sending...' : 'Submit application'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-400">Interested? Send a quick pitch.</p>
              <button onClick={() => setShowApply(true)} className="btn-primary text-sm">Apply now →</button>
            </div>
          )}
        </div>
      )}

      {/* Milestones */}
      <div className="card p-5 mb-4">
        <MilestonesPanel
          projectId={id}
          isPoster={isPoster}
          currency={project.currency}
        />
      </div>

      {/* Applications (poster only) */}
      {isPoster && project.applications?.length > 0 && (
        <div className="card p-5 mb-4">
          <h3 className="font-semibold text-white mb-4">Applications ({project.applications.length})</h3>
          <div className="space-y-3">
            {project.applications.map(app => (
              <div key={app.id} className="bg-white/4 border border-border rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 text-sm font-bold flex-shrink-0">
                      {app.applicant?.name?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <p className="text-sm font-medium text-white">{app.applicant?.name}</p>
                        {app.applicant?.isVerified && <span className="text-brand-400 text-xs">✓</span>}
                        <span className={`text-xs px-1.5 py-0.5 rounded-md ${
                          app.status === 'ACCEPTED' ? 'text-emerald-400 bg-emerald-500/10' :
                          app.status === 'REJECTED' ? 'text-red-400 bg-red-500/10' :
                          'text-gray-400 bg-white/5'
                        }`}>{app.status}</span>
                      </div>
                      <p className="text-gray-400 text-xs leading-relaxed">{app.pitch}</p>
                    </div>
                  </div>
                  {app.status === 'PENDING' && (
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button onClick={() => handleApplicationAction(app.id, 'ACCEPTED')} className="p-1.5 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors" title="Accept">
                        <CheckCircle size={16} />
                      </button>
                      <button onClick={() => handleApplicationAction(app.id, 'REJECTED')} className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Reject">
                        <XCircle size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Complete button */}
      {isPoster && project.status === 'IN_PROGRESS' && (
        <button onClick={handleComplete} className="btn-primary w-full py-3">
          Mark project as completed ✓
        </button>
      )}
    </div>
  );
}

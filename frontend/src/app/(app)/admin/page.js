'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Users, Briefcase, MessageCircle, Star, Trash2, CheckCircle, XCircle, Shield, CreditCard, Clock, Phone } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function AdminPage() {
  const [secret, setSecret] = useState('');
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState('payments');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [payments, setPayments] = useState([]);
  const [paymentFilter, setPaymentFilter] = useState('PENDING');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const [rejectingId, setRejectingId] = useState(null);

  const headers = { 'x-admin-secret': secret };

  const login = async () => {
    try {
      const { data } = await api.get('/admin/stats', { headers: { 'x-admin-secret': secret } });
      setStats(data);
      setAuthed(true);
      toast.success('Admin access granted ✅');
    } catch {
      toast.error('Wrong secret key');
    }
  };

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/admin/payments?status=${paymentFilter}`, { headers });
      setPayments(data.payments);
    } catch { toast.error('Failed to load payments'); }
    finally { setLoading(false); }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/admin/users?search=${search}`, { headers });
      setUsers(data.users);
    } catch { toast.error('Failed'); }
    finally { setLoading(false); }
  };

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/projects', { headers });
      setProjects(data.projects);
    } catch { toast.error('Failed'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (!authed) return;
    if (tab === 'payments') fetchPayments();
    if (tab === 'users') fetchUsers();
    if (tab === 'projects') fetchProjects();
  }, [tab, authed, paymentFilter]);

  const approvePayment = async (id) => {
    try {
      await api.put(`/admin/payments/${id}/approve`, { adminNote: 'Approved by admin' }, { headers });
      toast.success('Payment approved! Service activated ✅');
      fetchPayments();
      // Refresh stats
      const { data } = await api.get('/admin/stats', { headers });
      setStats(data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve');
    }
  };

  const rejectPayment = async (id) => {
    try {
      await api.put(`/admin/payments/${id}/reject`, { adminNote: rejectNote || 'Rejected by admin' }, { headers });
      toast.success('Payment rejected');
      setRejectingId(null);
      setRejectNote('');
      fetchPayments();
    } catch {
      toast.error('Failed to reject');
    }
  };

  const deleteUser = async (id) => {
    if (!confirm('Delete this user? This cannot be undone.')) return;
    try {
      await api.delete(`/admin/users/${id}`, { headers });
      setUsers(p => p.filter(u => u.id !== id));
      toast.success('User deleted');
    } catch { toast.error('Failed'); }
  };

  const toggleVerify = async (id, current) => {
    try {
      await api.put(`/admin/users/${id}/verify`, { isVerified: !current }, { headers });
      setUsers(p => p.map(u => u.id === id ? { ...u, isVerified: !current } : u));
      toast.success(current ? 'Badge removed' : 'User verified ✓');
    } catch { toast.error('Failed'); }
  };

  const deleteProject = async (id) => {
    if (!confirm('Delete this project?')) return;
    try {
      await api.delete(`/admin/projects/${id}`, { headers });
      setProjects(p => p.filter(pr => pr.id !== id));
      toast.success('Project deleted');
    } catch { toast.error('Failed'); }
  };

  if (!authed) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-4">
        <div className="card p-6 w-full max-w-sm">
          <div className="flex items-center gap-2 mb-5">
            <Shield size={20} className="text-brand-400" />
            <h1 className="font-display font-bold text-white text-lg">Admin Access</h1>
          </div>
          <p className="text-gray-500 text-sm mb-4">Enter your admin secret key to continue.</p>
          <input
            type="password"
            className="input mb-3"
            placeholder="Admin secret key..."
            value={secret}
            onChange={e => setSecret(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && login()}
          />
          <button onClick={login} className="btn-primary w-full">Access Dashboard</button>
        </div>
      </div>
    );
  }

  const TABS = [
    { key: 'payments', label: 'Payments', icon: CreditCard },
    { key: 'users',    label: 'Users',    icon: Users },
    { key: 'projects', label: 'Projects', icon: Briefcase },
  ];

  return (
    <div className="p-4 pb-24 md:pb-8 md:p-8 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-display text-xl md:text-2xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-gray-500 text-xs mt-0.5">CollabCity v3</p>
        </div>
        <span className="text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          Authenticated
        </span>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-5">
          {[
            { label: 'Users',      value: stats.totalUsers,        color: 'text-brand-400' },
            { label: 'Projects',   value: stats.totalProjects,     color: 'text-emerald-400' },
            { label: 'Messages',   value: stats.totalMessages,     color: 'text-purple-400' },
            { label: 'Online now', value: stats.activeToday,       color: 'text-emerald-400' },
            { label: 'New today',  value: stats.newUsersToday,     color: 'text-brand-400' },
            { label: 'Open jobs',  value: stats.openProjects,      color: 'text-amber-400' },
            { label: 'Completed',  value: stats.completedProjects, color: 'text-emerald-400' },
            { label: 'Ratings',    value: stats.totalRatings,      color: 'text-amber-400' },
          ].map(s => (
            <div key={s.label} className="card p-3 text-center">
              <p className={`font-display font-bold text-xl ${s.color}`}>{s.value}</p>
              <p className="text-gray-600 text-xs mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-card border border-border rounded-xl p-1 mb-4">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs md:text-sm rounded-lg font-medium transition-all ${
              tab === t.key ? 'bg-brand-500/20 text-brand-400' : 'text-gray-500 hover:text-white'
            }`}
          >
            <t.icon size={13} /> {t.label}
          </button>
        ))}
      </div>

      {/* ===== PAYMENTS TAB ===== */}
      {tab === 'payments' && (
        <div>
          {/* Filter */}
          <div className="flex gap-2 mb-4">
            {['PENDING', 'COMPLETED', 'FAILED'].map(s => (
              <button key={s} onClick={() => setPaymentFilter(s)}
                className={`text-xs px-3 py-2 rounded-xl border font-medium transition-all ${
                  paymentFilter === s
                    ? 'bg-brand-500/20 border-brand-500/50 text-brand-400'
                    : 'bg-white/5 border-border text-gray-400'
                }`}
              >
                {s === 'PENDING' ? '⏳ Pending' : s === 'COMPLETED' ? '✅ Approved' : '❌ Rejected'}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <CreditCard size={32} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">No {paymentFilter.toLowerCase()} payments</p>
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map(p => (
                <div key={p.id} className={`card p-4 ${p.status === 'PENDING' ? 'border-amber-500/20' : ''}`}>
                  {/* User info */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-brand-500/20 flex items-center justify-center text-brand-400 font-bold text-sm flex-shrink-0">
                        {p.user?.name?.[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-white text-sm truncate">{p.user?.name}</p>
                          {p.user?.isVerified && <span className="text-brand-400 text-xs">✓</span>}
                        </div>
                        <p className="text-gray-500 text-xs truncate">{p.user?.email}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-white text-sm">{p.amount} {p.currency}</p>
                      <span className={`text-[11px] px-2 py-0.5 rounded-md ${
                        p.status === 'PENDING' ? 'text-amber-400 bg-amber-500/10' :
                        p.status === 'COMPLETED' ? 'text-emerald-400 bg-emerald-500/10' :
                        'text-red-400 bg-red-500/10'
                      }`}>
                        {p.status}
                      </span>
                    </div>
                  </div>

                  {/* Payment details */}
                  <div className="bg-white/3 rounded-xl p-3 mb-3 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Service</span>
                      <span className="text-white font-medium">
                        {p.type === 'VERIFICATION' ? '✓ Verified Badge' : '🚀 Profile Boost'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Method</span>
                      <span className="text-white font-medium">{p.paymentMethod}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Phone</span>
                      <span className="text-white font-medium flex items-center gap-1">
                        <Phone size={10} /> {p.phoneNumber}
                      </span>
                    </div>
                    {p.metadata?.transactionId && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Transaction ID</span>
                        <span className="text-emerald-400 font-mono font-medium">{p.metadata.transactionId}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Requested</span>
                      <span className="text-gray-400">
                        {formatDistanceToNow(new Date(p.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    {p.adminNote && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Note</span>
                        <span className="text-gray-400">{p.adminNote}</span>
                      </div>
                    )}
                  </div>

                  {/* Action buttons — only for pending */}
                  {p.status === 'PENDING' && (
                    <>
                      {rejectingId === p.id ? (
                        <div className="space-y-2">
                          <input
                            className="input text-sm py-2"
                            placeholder="Reason for rejection (optional)"
                            value={rejectNote}
                            onChange={e => setRejectNote(e.target.value)}
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button onClick={() => setRejectingId(null)} className="btn-ghost flex-1 text-xs">
                              Cancel
                            </button>
                            <button onClick={() => rejectPayment(p.id)} className="flex-1 text-xs py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl font-medium hover:bg-red-500/20 transition-all">
                              Confirm Reject
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => setRejectingId(p.id)}
                            className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl font-medium hover:bg-red-500/20 transition-all"
                          >
                            <XCircle size={13} /> Reject
                          </button>
                          <button
                            onClick={() => approvePayment(p.id)}
                            className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl font-medium hover:bg-emerald-500/20 transition-all"
                          >
                            <CheckCircle size={13} /> Approve & Activate
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== USERS TAB ===== */}
      {tab === 'users' && (
        <div>
          <div className="flex gap-2 mb-4">
            <input className="input flex-1 text-sm" placeholder="Search by name, email or username..."
              value={search} onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchUsers()} />
            <button onClick={fetchUsers} className="btn-primary text-sm px-4">Search</button>
          </div>
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-2">
              {users.map(u => (
                <div key={u.id} className="card p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-500/20 flex items-center justify-center text-brand-400 font-bold text-sm flex-shrink-0">
                    {u.name?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-medium text-white text-sm truncate">{u.name}</p>
                      {u.isVerified && <span className="text-brand-400 text-xs">✓</span>}
                      {u.isOnline && <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />}
                    </div>
                    <p className="text-gray-500 text-xs truncate">{u.email}</p>
                    <p className="text-gray-600 text-xs">{u.city} · {u._count?.postedProjects || 0} projects · {u._count?.ratingsReceived || 0} ratings</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => toggleVerify(u.id, u.isVerified)}
                      className={`text-xs px-2 py-1 rounded-lg border transition-all ${
                        u.isVerified
                          ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                          : 'text-gray-500 bg-white/5 border-border'
                      }`}>
                      {u.isVerified ? 'Unverify' : 'Verify'}
                    </button>
                    <button onClick={() => deleteUser(u.id)} className="text-red-400 hover:bg-red-500/10 p-2 rounded-lg transition-all">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== PROJECTS TAB ===== */}
      {tab === 'projects' && (
        <div>
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-2">
              {projects.map(p => (
                <div key={p.id} className="card p-4 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <p className="font-medium text-white text-sm truncate">{p.title}</p>
                      <span className={`text-[11px] px-2 py-0.5 rounded-md border flex-shrink-0 ${
                        p.status === 'OPEN' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
                        p.status === 'IN_PROGRESS' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' :
                        p.status === 'COMPLETED' ? 'text-gray-400 bg-white/5 border-border' :
                        'text-red-400 bg-red-500/10 border-red-500/20'
                      }`}>{p.status}</span>
                    </div>
                    <p className="text-gray-500 text-xs">
                      By {p.poster?.name} · {p.budget?.toLocaleString()} {p.currency} · {p._count?.applications || 0} applicants
                    </p>
                  </div>
                  <button onClick={() => deleteProject(p.id)} className="text-red-400 hover:bg-red-500/10 p-2 rounded-lg transition-all flex-shrink-0">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

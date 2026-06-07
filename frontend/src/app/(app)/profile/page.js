'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import useAuthStore from '@/store/auth';
import toast from 'react-hot-toast';
import { MapPin, Star, Edit2, Check, X, Award, Briefcase, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

const VIBE_TAGS = ['Developer','Designer','Video Editor','Content Creator','Musician','Photographer','Marketer','Entrepreneur','Gamer','Writer'];
const SKILL_SUGGESTIONS = ['React','Next.js','Node.js','Python','Figma','Photoshop','Premiere Pro','After Effects','Flutter','TypeScript','Tailwind','Video Editing','Copywriting'];

export default function ProfilePage() {
  const { user, updateUser, logout } = useAuthStore();
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', bio: '', city: '', area: '' });
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [customSkill, setCustomSkill] = useState('');

  useEffect(() => {
    api.get('/auth/me').then(({ data }) => {
      setProfile(data);
      setForm({ name: data.name, bio: data.bio || '', city: data.city || '', area: data.area || '' });
      setSelectedTags(data.vibeTags?.map(vt => vt.vibeTag.name) || []);
      setSelectedSkills(data.skills?.map(s => s.skill.name) || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const toggleTag = (tag) => setSelectedTags(p => p.includes(tag) ? p.filter(t => t !== tag) : [...p, tag]);
  const toggleSkill = (s) => setSelectedSkills(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);

  const addCustomSkill = () => {
    const s = customSkill.trim();
    if (!s) return;
    if (!selectedSkills.includes(s)) setSelectedSkills(p => [...p, s]);
    setCustomSkill('');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/users/profile', { ...form, vibeTags: selectedTags, skills: selectedSkills });
      const { data } = await api.get('/auth/me');
      setProfile(data);
      updateUser({ name: data.name, bio: data.bio, city: data.city, area: data.area });
      setEditing(false);
      toast.success('Profile updated ✅');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const avgRating = profile?.ratingsReceived?.length
    ? (profile.ratingsReceived.reduce((a, b) => a + b.score, 0) / profile.ratingsReceived.length).toFixed(1)
    : null;

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-4 pb-24 md:pb-8 md:p-8 max-w-2xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-xl md:text-2xl font-bold text-white">My Profile</h1>
        {!editing ? (
          <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 btn-outline text-sm py-2">
            <Edit2 size={13} /> Edit
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)} className="btn-ghost text-sm py-2 px-3">
              <X size={14} />
            </button>
            <button onClick={handleSave} disabled={saving} className="btn-primary text-sm py-2 px-4 flex items-center gap-1.5">
              <Check size={13} /> {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>

      {/* Avatar + basic */}
      <div className="card p-4 mb-3">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500/30 to-purple-500/30 flex items-center justify-center text-white text-2xl font-bold border border-white/10 flex-shrink-0 overflow-hidden">
            {profile?.avatar
              ? <img src={profile.avatar} alt="" className="w-full h-full object-cover" />
              : profile?.name?.[0]?.toUpperCase()
            }
          </div>
          <div className="flex-1 min-w-0">
            {editing ? (
              <input className="input text-sm mb-2 py-2" value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Your name" />
            ) : (
              <>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h2 className="font-display font-bold text-lg text-white">{profile?.name}</h2>
                  {profile?.isVerified && <span className="text-brand-400 text-xs bg-brand-500/10 px-1.5 py-0.5 rounded-md border border-brand-500/20">✓ Verified</span>}
                </div>
                <p className="text-gray-500 text-sm">@{profile?.username}</p>
              </>
            )}
            {avgRating && !editing && (
              <div className="flex items-center gap-1 mt-1 text-amber-400 text-sm">
                <Star size={12} fill="currentColor" />
                <span className="font-semibold">{avgRating}</span>
                <span className="text-gray-600 text-xs">({profile.ratingsReceived.length})</span>
              </div>
            )}
          </div>
        </div>

        {editing ? (
          <textarea className="input resize-none min-h-[70px] text-sm mb-3" placeholder="Write a short bio..."
            value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} maxLength={200} />
        ) : (
          profile?.bio && <p className="text-gray-400 text-sm leading-relaxed mb-3">{profile.bio}</p>
        )}

        <div className="flex items-center gap-1.5 text-gray-500 text-sm">
          <MapPin size={13} />
          {editing ? (
            <div className="flex gap-2 flex-1">
              <input className="input py-1.5 text-sm flex-1" placeholder="City" value={form.city}
                onChange={e => setForm(p => ({ ...p, city: e.target.value }))} />
              <input className="input py-1.5 text-sm flex-1" placeholder="Area" value={form.area}
                onChange={e => setForm(p => ({ ...p, area: e.target.value }))} />
            </div>
          ) : (
            <span className="text-sm">{[profile?.area, profile?.city].filter(Boolean).join(', ') || 'Location not set'}</span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {[
          { label: 'Ratings', value: profile?.ratingsReceived?.length || 0 },
          { label: 'Avg Score', value: avgRating ? `${avgRating}/5` : '—' },
          { label: 'Joined', value: profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }) : '—' },
        ].map(stat => (
          <div key={stat.label} className="card p-3 text-center">
            <p className="font-display font-bold text-white text-lg">{stat.value}</p>
            <p className="text-gray-500 text-xs mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Vibe tags */}
      <div className="card p-4 mb-3">
        <div className="flex items-center gap-2 mb-3">
          <Award size={14} className="text-brand-400" />
          <h3 className="font-semibold text-white text-sm">Vibe Tags</h3>
        </div>
        {editing ? (
          <div className="flex flex-wrap gap-2">
            {VIBE_TAGS.map(tag => (
              <button key={tag} onClick={() => toggleTag(tag)}
                className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                  selectedTags.includes(tag)
                    ? 'bg-brand-500/20 border-brand-500/50 text-brand-400'
                    : 'bg-white/5 border-border text-gray-400'
                }`}>{tag}</button>
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {profile?.vibeTags?.length
              ? profile.vibeTags.map(vt => <span key={vt.vibeTag.id} className="tag tag-brand">{vt.vibeTag.name}</span>)
              : <p className="text-gray-600 text-xs">No vibe tags yet</p>
            }
          </div>
        )}
      </div>

      {/* Skills */}
      <div className="card p-4 mb-3">
        <div className="flex items-center gap-2 mb-3">
          <Briefcase size={14} className="text-brand-400" />
          <h3 className="font-semibold text-white text-sm">Skills</h3>
        </div>
        {editing ? (
          <>
            <div className="flex flex-wrap gap-2 mb-3">
              {SKILL_SUGGESTIONS.map(skill => (
                <button key={skill} onClick={() => toggleSkill(skill)}
                  className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                    selectedSkills.includes(skill)
                      ? 'bg-brand-500/20 border-brand-500/50 text-brand-400'
                      : 'bg-white/5 border-border text-gray-400'
                  }`}>{skill}</button>
              ))}
            </div>
            <div className="flex gap-2 mb-3">
              <input className="input flex-1 py-2 text-sm" placeholder="Add custom skill..."
                value={customSkill} onChange={e => setCustomSkill(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCustomSkill()} />
              <button onClick={addCustomSkill} className="btn-outline text-sm px-3">Add</button>
            </div>
            {selectedSkills.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedSkills.map(s => (
                  <span key={s} className="tag tag-brand flex items-center gap-1">
                    {s}
                    <button onClick={() => toggleSkill(s)} className="hover:text-red-400 transition-colors"><X size={10} /></button>
                  </span>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-wrap gap-2">
            {profile?.skills?.length
              ? profile.skills.map(s => <span key={s.skill.id} className="tag tag-gray">{s.skill.name}</span>)
              : <p className="text-gray-600 text-xs">No skills added yet</p>
            }
          </div>
        )}
      </div>

      {/* Sign out button — mobile only */}
      <button
        onClick={() => { logout(); router.push('/'); }}
        className="md:hidden w-full mt-3 flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-red-500/20 bg-red-500/5 text-red-400 font-medium text-sm active:scale-95 transition-all"
      >
        <LogOut size={16} />
        Sign out
      </button>

    </div>
  );
}
'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import useAuthStore from '@/store/auth';
import toast from 'react-hot-toast';
import { MapPin, Star, MessageCircle, ArrowLeft, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function PublicProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const { user: me } = useAuthStore();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [showRatingForm, setShowRatingForm] = useState(false);

  useEffect(() => {
    api.get(`/users/${id}`).then(({ data }) => {
      setProfile(data);
      setLoading(false);
    }).catch(() => {
      toast.error('User not found');
      router.push('/discover');
    });
  }, [id]);

  const handleMessage = async () => {
    try {
      const { data } = await api.post('/rooms/direct', { userId: id });
      router.push(`/chat/${data.id}`);
    } catch {
      toast.error('Could not start chat');
    }
  };

  const handleRate = async () => {
    if (!rating) return toast.error('Select a star rating');
    setSubmittingRating(true);
    try {
      await api.post(`/users/${id}/rate`, { score: rating, comment: ratingComment });
      toast.success('Rating submitted!');
      const { data } = await api.get(`/users/${id}`);
      setProfile(data);
      setShowRatingForm(false);
      setRating(0);
      setRatingComment('');
    } catch {
      toast.error('Failed to submit rating');
    } finally {
      setSubmittingRating(false);
    }
  };

  const avgRating = profile?.ratingsReceived?.length
    ? (profile.ratingsReceived.reduce((a, b) => a + b.score, 0) / profile.ratingsReceived.length).toFixed(1)
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isOwnProfile = me?.id === id;

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 hover:text-white text-sm mb-6 transition-colors">
        <ArrowLeft size={16} /> Back
      </button>

      {/* Header card */}
      <div className="card p-6 mb-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500/30 to-purple-500/30 flex items-center justify-center text-white text-2xl font-bold border border-white/10">
                {profile?.avatar ? (
                  <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover rounded-2xl" />
                ) : profile?.name?.[0]?.toUpperCase()}
              </div>
              <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full ring-2 ring-surface ${profile?.isOnline ? 'bg-emerald-400' : 'bg-gray-600'}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display font-bold text-xl text-white">{profile?.name}</h1>
                {profile?.isVerified && <span className="text-brand-400 text-sm">✓</span>}
              </div>
              <p className="text-gray-500 text-sm">@{profile?.username}</p>
              {avgRating && (
                <div className="flex items-center gap-1 mt-1 text-amber-400 text-sm">
                  <Star size={12} fill="currentColor" />
                  <span className="font-medium">{avgRating}</span>
                  <span className="text-gray-600 text-xs">({profile.ratingsReceived.length})</span>
                </div>
              )}
            </div>
          </div>

          {!isOwnProfile && (
            <button onClick={handleMessage} className="btn-primary flex items-center gap-2 text-sm">
              <MessageCircle size={14} />
              Message
            </button>
          )}
        </div>

        {profile?.bio && (
          <p className="text-gray-400 text-sm leading-relaxed mb-3">{profile.bio}</p>
        )}

        <div className="flex items-center gap-4 text-sm text-gray-500">
          {(profile?.city || profile?.area) && (
            <div className="flex items-center gap-1">
              <MapPin size={12} />
              {[profile.area, profile.city].filter(Boolean).join(', ')}
            </div>
          )}
          <div className="flex items-center gap-1">
            <Clock size={12} />
            {profile?.isOnline
              ? <span className="text-emerald-400">Online now</span>
              : `Active ${formatDistanceToNow(new Date(profile?.lastSeen || Date.now()), { addSuffix: true })}`
            }
          </div>
        </div>
      </div>

      {/* Vibe Tags */}
      {profile?.vibeTags?.length > 0 && (
        <div className="card p-5 mb-4">
          <h3 className="text-sm font-semibold text-white mb-3">Vibe</h3>
          <div className="flex flex-wrap gap-2">
            {profile.vibeTags.map(vt => (
              <span key={vt.vibeTag.id} className="tag tag-brand">{vt.vibeTag.name}</span>
            ))}
          </div>
        </div>
      )}

      {/* Skills */}
      {profile?.skills?.length > 0 && (
        <div className="card p-5 mb-4">
          <h3 className="text-sm font-semibold text-white mb-3">Skills</h3>
          <div className="flex flex-wrap gap-2">
            {profile.skills.map(s => (
              <span key={s.skill.id} className="tag tag-gray">{s.skill.name}</span>
            ))}
          </div>
        </div>
      )}

      {/* Ratings */}
      <div className="card p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Ratings</h3>
          {!isOwnProfile && (
            <button onClick={() => setShowRatingForm(p => !p)} className="text-xs text-brand-400 hover:text-brand-300">
              {showRatingForm ? 'Cancel' : '+ Rate this person'}
            </button>
          )}
        </div>

        {showRatingForm && (
          <div className="bg-white/5 rounded-xl p-4 mb-4 animate-fade-in">
            <div className="flex gap-2 mb-3">
              {[1, 2, 3, 4, 5].map(s => (
                <button key={s} onClick={() => setRating(s)} className={`text-2xl transition-transform hover:scale-110 ${s <= rating ? 'text-amber-400' : 'text-gray-600'}`}>
                  ★
                </button>
              ))}
            </div>
            <textarea
              className="input resize-none min-h-[60px] text-sm mb-3"
              placeholder="Optional: say something about working with them..."
              value={ratingComment}
              onChange={e => setRatingComment(e.target.value)}
            />
            <button onClick={handleRate} disabled={submittingRating} className="btn-primary text-sm">
              {submittingRating ? 'Submitting...' : 'Submit rating'}
            </button>
          </div>
        )}

        {profile?.ratingsReceived?.length === 0 ? (
          <p className="text-gray-600 text-sm">No ratings yet.</p>
        ) : (
          <div className="space-y-3">
            {profile.ratingsReceived.slice(0, 5).map((r, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 text-xs font-bold flex-shrink-0">
                  {r.giver?.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{r.giver?.name}</span>
                    <span className="text-amber-400 text-xs">{'★'.repeat(r.score)}</span>
                  </div>
                  {r.comment && <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{r.comment}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

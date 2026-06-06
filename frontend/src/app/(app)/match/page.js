'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Zap, MessageCircle, Star, MapPin, Sparkles, Send } from 'lucide-react';

function MatchCard({ match, onMessage, index }) {
  const { user, score, reason } = match;
  const scoreColor =
    score >= 80 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
    score >= 60 ? 'text-brand-400 bg-brand-500/10 border-brand-500/20' :
                  'text-amber-400 bg-amber-500/10 border-amber-500/20';

  return (
    <div
      className="card p-5 hover:border-brand-500/30 transition-all animate-slide-up"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500/30 to-purple-500/30 flex items-center justify-center text-white font-bold text-lg border border-white/10 overflow-hidden">
              {user.avatar
                ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                : user.name?.[0]?.toUpperCase()
              }
            </div>
            {user.isOnline && <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full ring-2 ring-surface" />}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="font-semibold text-white">{user.name}</p>
              {user.isVerified && <span className="text-brand-400 text-xs">✓</span>}
            </div>
            <p className="text-gray-500 text-xs">@{user.username}</p>
          </div>
        </div>
        <span className={`text-sm font-bold px-2.5 py-1 rounded-lg border ${scoreColor}`}>
          {score}%
        </span>
      </div>

      {/* AI reason */}
      <div className="bg-brand-500/5 border border-brand-500/15 rounded-xl px-3 py-2 mb-3">
        <div className="flex items-start gap-1.5">
          <Sparkles size={12} className="text-brand-400 mt-0.5 flex-shrink-0" />
          <p className="text-brand-300 text-xs leading-relaxed">{reason}</p>
        </div>
      </div>

      {user.bio && (
        <p className="text-gray-500 text-sm line-clamp-1 mb-3">{user.bio}</p>
      )}

      <div className="flex flex-wrap gap-1.5 mb-3">
        {user.vibeTags?.slice(0, 3).map(vt => (
          <span key={vt.vibeTag?.id || vt.id} className="tag tag-brand text-xs">{vt.vibeTag?.name || vt.name}</span>
        ))}
        {user.skills?.slice(0, 2).map(s => (
          <span key={s.skill?.id || s.id} className="tag tag-gray text-xs">{s.skill?.name || s.name}</span>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-gray-600 text-xs">
          <MapPin size={10} />
          {[user.area, user.city].filter(Boolean).join(', ') || 'Karachi'}
          {user.avgRating && (
            <span className="ml-2 flex items-center gap-0.5 text-amber-400">
              <Star size={10} fill="currentColor" /> {user.avgRating}
            </span>
          )}
        </div>
        <button
          onClick={() => onMessage(user)}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 border border-brand-500/20 rounded-lg transition-all"
        >
          <MessageCircle size={11} /> Message
        </button>
      </div>
    </div>
  );
}

export default function SmartMatchPage() {
  const [goal, setGoal] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const router = useRouter();

  const SUGGESTIONS = [
    'Build a mobile app together',
    'Create YouTube content',
    'Start a clothing brand',
    'Make music and beats',
    'Design a brand identity',
    'Launch a startup',
  ];

  const handleMatch = async () => {
    if (!goal.trim()) return toast.error('Tell us what you want to do!');
    setLoading(true);
    setResult(null);
    try {
      const { data } = await api.post('/match', { goal });
      setResult(data);
      if (data.matches.length === 0) toast('No strong matches found yet — invite more friends!', { icon: '🔍' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Smart match failed');
    } finally {
      setLoading(false);
    }
  };

  const handleMessage = async (user) => {
    try {
      const { data } = await api.post('/rooms/direct', { userId: user.id });
      router.push(`/chat/${data.id}`);
    } catch {
      toast.error('Could not start chat');
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Zap size={20} className="text-brand-400" />
          <h1 className="font-display text-2xl font-bold text-white">Smart Match</h1>
        </div>
        <p className="text-gray-500 text-sm">AI finds the best people to collab with based on your goal</p>
      </div>

      {/* Goal input */}
      <div className="card p-5 mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">What do you want to do?</label>
        <div className="flex gap-2 mb-3">
          <input
            className="input flex-1"
            placeholder="e.g. Build a food delivery app, start a YouTube channel..."
            value={goal}
            onChange={e => setGoal(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleMatch()}
          />
          <button
            onClick={handleMatch}
            disabled={loading}
            className="btn-primary flex items-center gap-2 px-5 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send size={15} />
            )}
            {loading ? 'Matching...' : 'Match'}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map(s => (
            <button
              key={s}
              onClick={() => setGoal(s)}
              className="text-xs px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-border text-gray-400 hover:text-white rounded-lg transition-all"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="card p-8 text-center animate-fade-in">
          <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">AI is analyzing profiles and finding your best matches...</p>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="animate-fade-in">
          {result.reasoning && (
            <div className="bg-brand-500/5 border border-brand-500/15 rounded-xl p-4 mb-4">
              <div className="flex items-start gap-2">
                <Sparkles size={14} className="text-brand-400 mt-0.5 flex-shrink-0" />
                <p className="text-gray-300 text-sm leading-relaxed">{result.reasoning}</p>
              </div>
            </div>
          )}

          {result.matches.length > 0 && (
            <>
              <p className="text-xs text-gray-600 mb-3 font-medium uppercase tracking-wider">
                {result.matches.length} best matches for you
              </p>
              <div className="space-y-3">
                {result.matches.map((match, i) => (
                  <MatchCard key={match.id || i} match={match} onMessage={handleMessage} index={i} />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

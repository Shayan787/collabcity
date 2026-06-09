'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Trophy, Star, MapPin, Zap } from 'lucide-react';

const RANK_STYLES = {
  1: { bg: 'bg-amber-500/20',  border: 'border-amber-500/40',  text: 'text-amber-400',  emoji: '🥇' },
  2: { bg: 'bg-gray-400/10',   border: 'border-gray-400/30',   text: 'text-gray-300',   emoji: '🥈' },
  3: { bg: 'bg-amber-700/20',  border: 'border-amber-700/40',  text: 'text-amber-600',  emoji: '🥉' },
};

function LeaderboardCard({ user }) {
  const rankStyle = RANK_STYLES[user.rank] || { bg: 'bg-white/3', border: 'border-border', text: 'text-gray-500', emoji: null };

  return (
    <Link href={`/profile/${user.id}`}>
      <div className={`flex items-center gap-3 p-4 rounded-2xl border ${rankStyle.bg} ${rankStyle.border} active:scale-[0.98] transition-all mb-2`}>

        {/* Rank */}
        <div className={`w-8 flex-shrink-0 text-center font-bold text-sm ${rankStyle.text}`}>
          {rankStyle.emoji || `#${user.rank}`}
        </div>

        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-500/30 to-purple-500/30 flex items-center justify-center text-white font-bold text-base border border-white/10 overflow-hidden">
            {user.avatar
              ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
              : user.name?.[0]?.toUpperCase()
            }
          </div>
          {user.isOnline && (
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-card" />
          )}
          {user.isBoosted && (
            <span className="absolute -top-1 -right-1 text-[10px]">🚀</span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <p className="font-semibold text-white text-sm truncate">{user.name}</p>
            {user.isVerified && <span className="text-brand-400 text-xs">✓</span>}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>@{user.username}</span>
            {user.city && (
              <span className="flex items-center gap-0.5">
                <MapPin size={9} /> {user.city}
              </span>
            )}
          </div>
          {user.vibeTags?.length > 0 && (
            <div className="flex gap-1 mt-1">
              {user.vibeTags.slice(0, 2).map(vt => (
                <span key={vt.vibeTag.id} className="text-[10px] px-1.5 py-0.5 rounded-md bg-brand-500/10 text-brand-400 border border-brand-500/15">
                  {vt.vibeTag.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Score */}
        <div className="flex-shrink-0 text-right">
          <div className="flex items-center gap-1 text-amber-400 justify-end mb-0.5">
            <Star size={11} fill="currentColor" />
            <span className="font-bold text-sm">{user.avgRating}</span>
          </div>
          <p className="text-xs text-gray-600">{user.ratingCount} ratings</p>
          <p className={`text-xs font-bold mt-0.5 ${rankStyle.text}`}>{user.score} pts</p>
        </div>
      </div>
    </Link>
  );
}

export default function LeaderboardPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState('Karachi');

  const CITIES = ['Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Peshawar'];

  useEffect(() => {
    setLoading(true);
    api.get(`/leaderboard?city=${city}`).then(({ data }) => {
      setUsers(data);
      setLoading(false);
    }).catch(() => {
      toast.error('Failed to load leaderboard');
      setLoading(false);
    });
  }, [city]);

  return (
    <div style={{ paddingBottom: '90px' }}>

      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(15,15,19,0.97)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(42,42,53,0.5)',
        padding: '16px 16px 12px 16px',
      }}>
        <div className="flex items-center gap-2 mb-3">
          <Trophy size={20} className="text-amber-400" />
          <h1 className="font-display text-xl font-bold text-white">Leaderboard</h1>
        </div>

        {/* City filter */}
        <div style={{
          display: 'flex', gap: '8px', overflowX: 'scroll',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none', paddingBottom: '2px',
        }}>
          {CITIES.map(c => (
            <button
              key={c}
              onClick={() => setCity(c)}
              style={{
                flexShrink: 0, whiteSpace: 'nowrap',
                padding: '7px 14px', borderRadius: '12px', fontSize: '12px',
                fontWeight: '500', cursor: 'pointer',
                border: city === c ? '1px solid #6366f1' : '1px solid #2a2a35',
                background: city === c ? '#6366f1' : 'rgba(255,255,255,0.05)',
                color: city === c ? 'white' : '#9ca3af',
              }}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-20">
            <Trophy size={36} className="mx-auto mb-3 text-gray-700" />
            <p className="text-gray-400 text-sm font-medium">No rankings yet</p>
            <p className="text-gray-600 text-xs mt-1">Be the first to get rated in {city}!</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-600 mb-3">Top collaborators in {city}</p>
            {users.map(user => (
              <LeaderboardCard key={user.id} user={user} />
            ))}
            <p className="text-center text-xs text-gray-700 mt-4 pb-4">
              Score = avg rating × 20 + rating count × 5 + projects × 3
            </p>
          </>
        )}
      </div>
    </div>
  );
}

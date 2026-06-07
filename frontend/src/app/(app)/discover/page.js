'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Search, MapPin, MessageCircle, Star, Zap, X } from 'lucide-react';

const FILTERS = [
  { key: 'all',             label: 'All',            emoji: '✨' },
  { key: 'Developer',       label: 'Developer',      emoji: '💻' },
  { key: 'Designer',        label: 'Designer',       emoji: '🎨' },
  { key: 'Video Editor',    label: 'Video Editor',   emoji: '🎬' },
  { key: 'Content Creator', label: 'Creator',        emoji: '📱' },
  { key: 'Musician',        label: 'Musician',       emoji: '🎵' },
  { key: 'Photographer',    label: 'Photographer',   emoji: '📸' },
  { key: 'Marketer',        label: 'Marketer',       emoji: '📣' },
  { key: 'Entrepreneur',    label: 'Entrepreneur',   emoji: '🚀' },
];

function UserCard({ user, onMessage }) {
  const avgRating = user.ratingsReceived?.length
    ? (user.ratingsReceived.reduce((a, b) => a + b.score, 0) / user.ratingsReceived.length).toFixed(1)
    : null;

  return (
    <div className="bg-card border border-border rounded-2xl p-4 active:scale-[0.98] transition-all">
      {/* Top row: avatar + info + message btn */}
      <div className="flex items-center gap-3 mb-3">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500/40 to-purple-500/40 flex items-center justify-center text-white font-bold text-lg border border-white/10 overflow-hidden">
            {user.avatar
              ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
              : user.name?.[0]?.toUpperCase()
            }
          </div>
          <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-card ${user.isOnline ? 'bg-emerald-400' : 'bg-gray-700'}`} />
        </div>

        {/* Name + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Link href={`/profile/${user.id}`}
              className="font-semibold text-white text-sm truncate hover:text-brand-400 transition-colors">
              {user.name}
            </Link>
            {user.isVerified && <span className="text-brand-400 text-[11px] flex-shrink-0">✓</span>}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-xs">@{user.username}</span>
            {avgRating && (
              <div className="flex items-center gap-0.5 text-amber-400">
                <Star size={10} fill="currentColor" />
                <span className="text-[11px] font-semibold">{avgRating}</span>
              </div>
            )}
          </div>
        </div>

        {/* Message button — always visible */}
        <button
          onClick={() => onMessage(user)}
          className="flex-shrink-0 flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 active:scale-95 text-white text-xs font-medium px-3 py-2 rounded-xl transition-all"
        >
          <MessageCircle size={13} />
          <span>Chat</span>
        </button>
      </div>

      {/* Bio */}
      {user.bio && (
        <p className="text-gray-400 text-xs leading-relaxed mb-3 line-clamp-2">
          {user.bio}
        </p>
      )}

      {/* Bottom: tags + location */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1.5 flex-wrap flex-1 min-w-0">
          {user.vibeTags?.slice(0, 2).map(vt => (
            <span key={vt.vibeTag.id}
              className="text-[11px] font-medium px-2 py-0.5 rounded-lg bg-brand-500/10 text-brand-400 border border-brand-500/20 whitespace-nowrap">
              {vt.vibeTag.name}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1 text-gray-600 text-[11px] flex-shrink-0">
          <MapPin size={10} />
          <span>{user.area || user.city || 'Karachi'}</span>
        </div>
      </div>
    </div>
  );
}

export default function DiscoverPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const router = useRouter();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter !== 'all') params.vibeTag = filter;
      const { data } = await api.get('/users', { params });
      setUsers(data.users);
    } catch {
      toast.error('Failed to load people');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleMessage = async (user) => {
    try {
      const { data } = await api.post('/rooms/direct', { userId: user.id });
      router.push(`/chat/${data.id}`);
    } catch {
      toast.error('Could not start chat');
    }
  };

  const filtered = users.filter(u =>
    search === '' ||
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.bio?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full pb-20 md:pb-0">

      {/* Sticky top section */}
      <div className="sticky top-0 z-10 bg-surface/95 backdrop-blur-md border-b border-border/50 px-4 pt-4 pb-3 md:px-8 md:pt-6">

        {/* Title */}
        <h1 className="font-display text-xl font-bold text-white mb-3">Discover</h1>

        {/* Search bar */}
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <input
            className="w-full bg-white/5 border border-border rounded-2xl pl-10 pr-10 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-500/50 transition-all"
            placeholder="Search people..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ backgroundColor: 'rgba(255,255,255,0.05)', colorScheme: 'dark' }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Filter chips — horizontally scrollable */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            overflowY: 'hidden',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            paddingBottom: '2px',
          }}
        >
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{ flexShrink: 0 }}
              className={`flex items-center gap-1.5 whitespace-nowrap text-xs font-medium px-3 py-2 rounded-xl border transition-all ${
                filter === f.key
                  ? 'bg-brand-500 border-brand-500 text-white'
                  : 'bg-white/5 border-border text-gray-400'
              }`}
            >
              <span>{f.emoji}</span>
              <span>{f.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* People list */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 md:px-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Zap size={32} className="mx-auto mb-3 text-gray-700" />
            <p className="text-gray-400 text-sm font-medium">No people found</p>
            <p className="text-gray-600 text-xs mt-1">Try a different filter</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-600 mb-3 font-medium">
              {filtered.length} {filter === 'all' ? 'people' : filter + 's'} in your city
            </p>
            {/* Single column on mobile, 2 col on tablet, 3 on desktop */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pb-6">
              {filtered.map(user => (
                <UserCard key={user.id} user={user} onMessage={handleMessage} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Search, MapPin, MessageCircle, Star, Zap } from 'lucide-react';

function Avatar({ user }) {
  return (
    <div className="relative flex-shrink-0">
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500/30 to-purple-500/30 flex items-center justify-center text-white font-bold text-lg border border-white/10 overflow-hidden">
        {user.avatar
          ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
          : user.name?.[0]?.toUpperCase()
        }
      </div>
      <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-card ${user.isOnline ? 'bg-emerald-400' : 'bg-gray-600'}`} />
    </div>
  );
}

function UserCard({ user, onMessage }) {
  const avgRating = user.ratingsReceived?.length
    ? (user.ratingsReceived.reduce((a, b) => a + b.score, 0) / user.ratingsReceived.length).toFixed(1)
    : null;

  return (
    <div className="card p-4 active:scale-[0.98] transition-all">
      {/* Top row: avatar + name + rating */}
      <div className="flex items-start gap-3 mb-3">
        <Avatar user={user} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1 flex-wrap">
                <Link href={`/profile/${user.id}`} className="font-semibold text-white text-sm leading-tight hover:text-brand-400 transition-colors">
                  {user.name}
                </Link>
                {user.isVerified && <span className="text-brand-400 text-xs">✓</span>}
              </div>
              <p className="text-gray-500 text-xs mt-0.5">@{user.username}</p>
            </div>
            {avgRating && (
              <div className="flex items-center gap-1 text-amber-400 text-xs flex-shrink-0">
                <Star size={11} fill="currentColor" />
                <span className="font-semibold">{avgRating}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bio */}
      {user.bio && (
        <p className="text-gray-400 text-xs leading-relaxed mb-3 line-clamp-2">{user.bio}</p>
      )}

      {/* Vibe tags */}
      {user.vibeTags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {user.vibeTags.slice(0, 3).map(vt => (
            <span key={vt.vibeTag.id} className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-brand-500/10 text-brand-400 border border-brand-500/20">
              {vt.vibeTag.name}
            </span>
          ))}
        </div>
      )}

      {/* Bottom: location + message button */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 text-gray-500 text-xs min-w-0">
          <MapPin size={11} className="flex-shrink-0" />
          <span className="truncate">{[user.area, user.city].filter(Boolean).join(', ') || 'Karachi'}</span>
        </div>
        <button
          onClick={() => onMessage(user)}
          className="flex items-center gap-1.5 text-xs px-3 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl transition-all active:scale-95 flex-shrink-0 font-medium"
        >
          <MessageCircle size={12} />
          Message
        </button>
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

  const FILTERS = [
    { key: 'all', label: '✨ All' },
    { key: 'Developer', label: '💻 Dev' },
    { key: 'Designer', label: '🎨 Design' },
    { key: 'Video Editor', label: '🎬 Video' },
    { key: 'Content Creator', label: '📱 Content' },
    { key: 'Musician', label: '🎵 Music' },
    { key: 'Marketer', label: '📣 Marketing' },
  ];

  return (
    <div className="p-4 pb-24 md:pb-8 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-4">
        <h1 className="font-display text-xl md:text-2xl font-bold text-white">Discover People</h1>
        <p className="text-gray-500 text-xs md:text-sm mt-0.5">Find cool people in your city to collab with</p>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        <input
          className="input pl-10 py-3 text-sm"
          placeholder="Search people..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-hide -mx-4 px-4">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`whitespace-nowrap text-xs px-3 py-2 rounded-xl border transition-all flex-shrink-0 font-medium ${
              filter === f.key
                ? 'bg-brand-500/20 border-brand-500/50 text-brand-400'
                : 'bg-white/5 border-border text-gray-400'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <Zap size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No people found. Try a different filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(user => (
            <UserCard key={user.id} user={user} onMessage={handleMessage} />
          ))}
        </div>
      )}
    </div>
  );
}

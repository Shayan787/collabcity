'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import useAuthStore from '@/store/auth';
import { Search, MapPin, Zap, MessageCircle, Star } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

function Avatar({ user, size = 'md' }) {
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-12 h-12 text-sm', lg: 'w-16 h-16 text-lg' };
  return (
    <div className="relative inline-block">
      <div className={`${sizes[size]} rounded-full bg-gradient-to-br from-brand-500/30 to-purple-500/30 flex items-center justify-center text-white font-semibold border border-white/10`}>
        {user.avatar ? (
          <img src={user.avatar} alt={user.name} className="w-full h-full object-cover rounded-full" />
        ) : (
          user.name?.[0]?.toUpperCase()
        )}
      </div>
      <span className={`absolute bottom-0 right-0 ${user.isOnline ? 'online-dot' : 'offline-dot'}`} />
    </div>
  );
}

function UserCard({ user, onMessage }) {
  const avgRating = user.ratingsReceived?.length
    ? (user.ratingsReceived.reduce((a, b) => a + b.score, 0) / user.ratingsReceived.length).toFixed(1)
    : null;

  return (
    <div className="card p-5 hover:border-brand-500/30 transition-all group animate-fade-in">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <Avatar user={user} />
          <div>
            <div className="flex items-center gap-1.5">
              <Link href={`/profile/${user.id}`} className="font-semibold text-white hover:text-brand-400 transition-colors">
                {user.name}
              </Link>
              {user.isVerified && <span className="text-brand-400 text-xs">✓</span>}
            </div>
            <p className="text-gray-500 text-sm">@{user.username}</p>
          </div>
        </div>
        {avgRating && (
          <div className="flex items-center gap-1 text-amber-400 text-sm">
            <Star size={13} fill="currentColor" />
            <span className="font-medium">{avgRating}</span>
          </div>
        )}
      </div>

      {user.bio && (
        <p className="text-gray-400 text-sm mb-3 line-clamp-2 leading-relaxed">{user.bio}</p>
      )}

      {user.vibeTags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {user.vibeTags.slice(0, 4).map(vt => (
            <span key={vt.vibeTag.id} className="tag tag-brand text-xs">
              {vt.vibeTag.name}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-gray-500 text-xs">
          <MapPin size={12} />
          <span>{[user.area, user.city].filter(Boolean).join(', ') || 'Karachi'}</span>
        </div>
        <button
          onClick={() => onMessage(user)}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 border border-brand-500/20 rounded-lg transition-all"
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

  const FILTERS = ['all', 'Developer', 'Designer', 'Video Editor', 'Content Creator', 'Musician'];

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-white mb-1">Discover People</h1>
        <p className="text-gray-500 text-sm">Find cool people in your city to collab with</p>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          className="input pl-10"
          placeholder="Search by name, username, or bio..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`whitespace-nowrap text-sm px-3 py-1.5 rounded-lg border transition-all ${
              filter === f
                ? 'bg-brand-500/20 border-brand-500/50 text-brand-400'
                : 'bg-white/5 border-border text-gray-400 hover:border-white/20'
            }`}
          >
            {f === 'all' ? '✨ All' : f}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <Zap size={32} className="mx-auto mb-3 opacity-30" />
          <p>No people found. Try a different filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(user => (
            <UserCard key={user.id} user={user} onMessage={handleMessage} />
          ))}
        </div>
      )}
    </div>
  );
}

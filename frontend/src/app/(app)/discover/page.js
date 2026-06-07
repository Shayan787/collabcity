// v5
'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Search, MapPin, MessageCircle, Star, Zap, X } from 'lucide-react';

const FILTERS = [
  { key: 'all',             label: 'All',          emoji: '✨' },
  { key: 'Developer',       label: 'Developer',    emoji: '💻' },
  { key: 'Designer',        label: 'Designer',     emoji: '🎨' },
  { key: 'Video Editor',    label: 'Video Editor', emoji: '🎬' },
  { key: 'Content Creator', label: 'Creator',      emoji: '📱' },
  { key: 'Musician',        label: 'Musician',     emoji: '🎵' },
  { key: 'Photographer',    label: 'Photographer', emoji: '📸' },
  { key: 'Marketer',        label: 'Marketer',     emoji: '📣' },
  { key: 'Entrepreneur',    label: 'Entrepreneur', emoji: '🚀' },
];

function UserCard({ user, onMessage }) {
  const avgRating = user.ratingsReceived?.length
    ? (user.ratingsReceived.reduce((a, b) => a + b.score, 0) / user.ratingsReceived.length).toFixed(1)
    : null;

  return (
    <div style={{
      background: '#18181f',
      border: '1px solid #2a2a35',
      borderRadius: '16px',
      padding: '16px',
      marginBottom: '12px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '14px',
            background: 'linear-gradient(135deg, rgba(99,102,241,0.4), rgba(168,85,247,0.4))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 'bold', fontSize: '18px',
            border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden',
          }}>
            {user.avatar
              ? <img src={user.avatar} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : user.name?.[0]?.toUpperCase()
            }
          </div>
          <span style={{
            position: 'absolute', bottom: '-1px', right: '-1px',
            width: '12px', height: '12px', borderRadius: '50%',
            background: user.isOnline ? '#34d399' : '#4b5563',
            border: '2px solid #18181f',
          }} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
            <Link href={`/profile/${user.id}`} style={{
              color: 'white', fontWeight: '600', fontSize: '14px',
              textDecoration: 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {user.name}
            </Link>
            {user.isVerified && <span style={{ color: '#818cf8', fontSize: '11px' }}>✓</span>}
            {avgRating && (
              <span style={{ color: '#fbbf24', fontSize: '11px' }}>★ {avgRating}</span>
            )}
          </div>
          <span style={{ color: '#6b7280', fontSize: '12px' }}>@{user.username}</span>
        </div>

        <button
          onClick={() => onMessage(user)}
          style={{
            flexShrink: 0, display: 'flex', alignItems: 'center', gap: '6px',
            background: '#6366f1', color: 'white', border: 'none',
            borderRadius: '12px', padding: '8px 14px', fontSize: '12px',
            fontWeight: '600', cursor: 'pointer',
          }}
        >
          <MessageCircle size={13} />
          Chat
        </button>
      </div>

      {user.bio && (
        <p style={{
          color: '#9ca3af', fontSize: '12px', lineHeight: '1.5',
          marginBottom: '10px', overflow: 'hidden',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>
          {user.bio}
        </p>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', flex: 1 }}>
          {user.vibeTags?.slice(0, 2).map(vt => (
            <span key={vt.vibeTag.id} style={{
              fontSize: '11px', fontWeight: '500', padding: '3px 8px',
              borderRadius: '8px', background: 'rgba(99,102,241,0.1)',
              color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)',
              whiteSpace: 'nowrap',
            }}>
              {vt.vibeTag.name}
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#6b7280', fontSize: '11px', flexShrink: 0 }}>
          <MapPin size={10} />
          {user.area || user.city || 'Karachi'}
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
    <div style={{ paddingBottom: '90px' }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(15,15,19,0.97)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(42,42,53,0.5)',
        padding: '16px 16px 12px 16px',
      }}>
        <h1 style={{ color: 'white', fontWeight: '700', fontSize: '22px', margin: '0 0 12px 0' }}>
          Discover
        </h1>

        <div style={{ position: 'relative', marginBottom: '12px' }}>
          <Search size={16} style={{
            position: 'absolute', left: '14px', top: '50%',
            transform: 'translateY(-50%)', color: '#6b7280', pointerEvents: 'none',
          }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search people..."
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid #2a2a35',
              borderRadius: '14px',
              padding: '12px 40px 12px 42px',
              color: 'white', fontSize: '14px',
              outline: 'none', colorScheme: 'dark',
            }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{
              position: 'absolute', right: '12px', top: '50%',
              transform: 'translateY(-50%)', color: '#6b7280',
              background: 'none', border: 'none', cursor: 'pointer',
            }}>
              <X size={15} />
            </button>
          )}
        </div>

        <div style={{
          display: 'flex', gap: '8px',
          overflowX: 'scroll',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: '4px',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}>
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                flexShrink: 0, whiteSpace: 'nowrap',
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 14px', borderRadius: '12px',
                border: filter === f.key ? '1px solid #6366f1' : '1px solid #2a2a35',
                background: filter === f.key ? '#6366f1' : 'rgba(255,255,255,0.05)',
                color: filter === f.key ? 'white' : '#9ca3af',
                fontSize: '12px', fontWeight: '500', cursor: 'pointer',
              }}
            >
              {f.emoji} {f.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <p style={{ fontSize: '14px', color: '#9ca3af' }}>No people found</p>
          </div>
        ) : (
          <>
            <p style={{ color: '#4b5563', fontSize: '12px', marginBottom: '12px' }}>
              {filtered.length} people in your city
            </p>
            {filtered.map(user => (
              <UserCard key={user.id} user={user} onMessage={handleMessage} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import useAuthStore from '@/store/auth';
import { MessageCircle, Plus, Hash, Users, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

export default function ChatPage() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewRoom, setShowNewRoom] = useState(false);
  const [roomName, setRoomName] = useState('');
  const { user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    api.get('/rooms').then(({ data }) => {
      setRooms(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const createCollabRoom = async () => {
    if (!roomName.trim()) return;
    try {
      const { data } = await api.post('/rooms/collab', { name: roomName });
      setRooms(p => [data, ...p]);
      setRoomName('');
      setShowNewRoom(false);
      router.push(`/chat/${data.id}`);
    } catch {
      toast.error('Failed to create room');
    }
  };

  const getRoomName = (room) => {
    if (room.type === 'COLLAB') return room.name;
    const other = room.members?.find(m => m.user.id !== user?.id);
    return other?.user?.name || 'Unknown';
  };

  const getRoomInitial = (room) => {
    if (room.type === 'COLLAB') return null;
    const other = room.members?.find(m => m.user.id !== user?.id);
    return other?.user;
  };

  const getLastMessage = (room) => {
    const msg = room.messages?.[0];
    if (!msg) return 'No messages yet';
    const isMe = msg.sender?.name === user?.name;
    return `${isMe ? 'You' : msg.sender?.name}: ${msg.content}`;
  };

  const getOtherUserOnline = (room) => {
    if (room.type === 'COLLAB') return false;
    const other = room.members?.find(m => m.user.id !== user?.id);
    return other?.user?.isOnline;
  };

  return (
    <div className="pb-24 md:pb-8">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 md:px-8 md:pt-8 mb-4">
        <div>
          <h1 className="font-display text-xl md:text-2xl font-bold text-white">Messages</h1>
          <p className="text-gray-500 text-xs mt-0.5">{rooms.length} conversations</p>
        </div>
        <button
          onClick={() => setShowNewRoom(true)}
          className="flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-3 py-2.5 rounded-xl transition-all active:scale-95"
        >
          <Plus size={15} />
          Room
        </button>
      </div>

      {/* New room modal */}
      {showNewRoom && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end justify-center">
          <div className="card w-full rounded-b-none rounded-t-3xl p-5 animate-slide-up">
            <div className="w-10 h-1 bg-border rounded-full mx-auto mb-4" />
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">Create collab room</h3>
              <button onClick={() => setShowNewRoom(false)} className="text-gray-500 p-1"><X size={18} /></button>
            </div>
            <input
              className="input mb-3"
              placeholder="Room name..."
              value={roomName}
              onChange={e => setRoomName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createCollabRoom()}
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={() => setShowNewRoom(false)} className="btn-ghost flex-1">Cancel</button>
              <button onClick={createCollabRoom} className="btn-primary flex-1">Create</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : rooms.length === 0 ? (
        <div className="text-center py-20 text-gray-500 px-8">
          <MessageCircle size={36} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm font-medium text-gray-400 mb-1">No chats yet</p>
          <p className="text-xs text-gray-600 mb-4">Go to Discover and message someone!</p>
          <Link href="/discover" className="btn-primary text-sm inline-flex">Discover people</Link>
        </div>
      ) : (
        <div className="px-4 md:px-8 space-y-1">
          {rooms.map(room => {
            const otherUser = getRoomInitial(room);
            const isOnline = getOtherUserOnline(room);
            return (
              <Link key={room.id} href={`/chat/${room.id}`}>
                <div className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white/5 active:bg-white/8 transition-all">
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    {room.type === 'COLLAB' ? (
                      <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center text-purple-400">
                        <Hash size={18} />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500/30 to-purple-500/30 flex items-center justify-center text-white font-bold text-lg border border-white/10 overflow-hidden">
                        {otherUser?.avatar
                          ? <img src={otherUser.avatar} alt="" className="w-full h-full object-cover" />
                          : getRoomName(room)[0]?.toUpperCase()
                        }
                      </div>
                    )}
                    {room.type === 'DIRECT' && (
                      <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-surface ${isOnline ? 'bg-emerald-400' : 'bg-gray-600'}`} />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-white text-sm truncate">{getRoomName(room)}</p>
                      {room.type === 'COLLAB' && (
                        <span className="text-[10px] text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0">
                          <Users size={9} /> {room.members?.length}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-500 text-xs truncate mt-0.5">{getLastMessage(room)}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

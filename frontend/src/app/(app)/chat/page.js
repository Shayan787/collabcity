'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import useAuthStore from '@/store/auth';
import { MessageCircle, Plus, Hash, Users } from 'lucide-react';
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

  const getRoomAvatar = (room) => {
    if (room.type === 'COLLAB') return null;
    const other = room.members?.find(m => m.user.id !== user?.id);
    return other?.user;
  };

  const getLastMessage = (room) => {
    const msg = room.messages?.[0];
    if (!msg) return 'No messages yet';
    const prefix = msg.sender?.name === user?.name ? 'You' : msg.sender?.name;
    return `${prefix}: ${msg.content}`;
  };

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-white mb-1">Messages</h1>
          <p className="text-gray-500 text-sm">Your chats and collab rooms</p>
        </div>
        <button onClick={() => setShowNewRoom(true)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={16} />
          New room
        </button>
      </div>

      {showNewRoom && (
        <div className="card p-4 mb-4 animate-fade-in">
          <p className="text-sm text-gray-400 mb-2">Create a collab room</p>
          <div className="flex gap-2">
            <input
              className="input flex-1"
              placeholder="Room name..."
              value={roomName}
              onChange={e => setRoomName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createCollabRoom()}
              autoFocus
            />
            <button onClick={createCollabRoom} className="btn-primary text-sm">Create</button>
            <button onClick={() => setShowNewRoom(false)} className="btn-ghost text-sm">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : rooms.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <MessageCircle size={32} className="mx-auto mb-3 opacity-30" />
          <p>No chats yet. Discover people to start messaging!</p>
          <Link href="/discover" className="btn-primary mt-4 inline-flex text-sm">Discover people</Link>
        </div>
      ) : (
        <div className="space-y-2">
          {rooms.map(room => {
            const otherUser = getRoomAvatar(room);
            return (
              <Link key={room.id} href={`/chat/${room.id}`}>
                <div className="card p-4 hover:border-brand-500/30 transition-all flex items-center gap-3">
                  {room.type === 'COLLAB' ? (
                    <div className="w-11 h-11 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400">
                      <Hash size={18} />
                    </div>
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-brand-500/30 to-purple-500/30 flex items-center justify-center text-white font-semibold border border-white/10">
                      {otherUser?.name?.[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-white">{getRoomName(room)}</p>
                      {room.type === 'COLLAB' && (
                        <span className="text-xs text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Users size={10} />
                          {room.members?.length}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-500 text-sm truncate">{getLastMessage(room)}</p>
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

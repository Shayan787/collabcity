'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import useAuthStore from '@/store/auth';
import { useSocket } from '@/hooks/useSocket';
import { Send, ArrowLeft, Hash, Circle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

export default function ChatRoomPage() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const socket = useSocket();
  const router = useRouter();

  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState([]);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const typingTimeout = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    Promise.all([
      api.get('/rooms'),
      api.get(`/rooms/${id}/messages`),
    ]).then(([roomsRes, msgsRes]) => {
      const r = roomsRes.data.find(r => r.id === id);
      setRoom(r);
      setMessages(msgsRes.data);
      setLoading(false);
    }).catch(() => {
      toast.error('Failed to load chat');
      setLoading(false);
    });
  }, [id]);

  useEffect(() => { scrollToBottom(); }, [messages]);

  useEffect(() => {
    if (!socket || !id) return;
    socket.emit('room:join', id);

    const handleNewMessage = (msg) => {
      if (msg.roomId === id) setMessages(p => [...p, msg]);
    };
    const handleTypingStart = ({ userId: uid }) => {
      if (uid !== user?.id) setTyping(p => [...new Set([...p, uid])]);
    };
    const handleTypingStop = ({ userId: uid }) => {
      setTyping(p => p.filter(u => u !== uid));
    };

    socket.on('message:new', handleNewMessage);
    socket.on('typing:start', handleTypingStart);
    socket.on('typing:stop', handleTypingStop);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('typing:start', handleTypingStart);
      socket.off('typing:stop', handleTypingStop);
    };
  }, [socket, id, user]);

  const sendMessage = () => {
    if (!input.trim() || !socket) return;
    socket.emit('message:send', { roomId: id, content: input.trim() });
    setInput('');
    socket.emit('typing:stop', { roomId: id });
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (!socket) return;
    socket.emit('typing:start', { roomId: id });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit('typing:stop', { roomId: id });
    }, 1500);
  };

  const getRoomTitle = () => {
    if (!room) return '...';
    if (room.type === 'COLLAB') return room.name;
    const other = room.members?.find(m => m.user.id !== user?.id);
    return other?.user?.name || 'Chat';
  };

  const getOtherUser = () => {
    if (!room || room.type === 'COLLAB') return null;
    return room.members?.find(m => m.user.id !== user?.id)?.user;
  };

  const otherUser = getOtherUser();

  return (
    <div className="flex flex-col h-screen md:h-[100dvh]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/50 backdrop-blur">
        <button onClick={() => router.back()} className="text-gray-500 hover:text-white p-1">
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-2">
          {room?.type === 'COLLAB' ? (
            <div className="w-9 h-9 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400">
              <Hash size={16} />
            </div>
          ) : (
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500/30 to-purple-500/30 flex items-center justify-center text-white font-semibold text-sm border border-white/10">
                {getRoomTitle()[0]?.toUpperCase()}
              </div>
              {otherUser?.isOnline && <span className="absolute bottom-0 right-0 online-dot w-2 h-2" />}
            </div>
          )}
          <div>
            <p className="font-semibold text-white text-sm">{getRoomTitle()}</p>
            <p className="text-xs text-gray-500">
              {room?.type === 'COLLAB'
                ? `${room.members?.length || 0} members`
                : otherUser?.isOnline ? 'Online' : 'Offline'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            Say hi! 👋
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMe = msg.sender?.id === user?.id;
            const showAvatar = !isMe && (i === 0 || messages[i - 1]?.sender?.id !== msg.sender?.id);
            return (
              <div key={msg.id} className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                {!isMe && (
                  <div className={`w-7 h-7 rounded-full bg-gradient-to-br from-brand-500/30 to-purple-500/30 flex items-center justify-center text-white text-xs font-semibold border border-white/10 flex-shrink-0 ${showAvatar ? 'opacity-100' : 'opacity-0'}`}>
                    {msg.sender?.name?.[0]?.toUpperCase()}
                  </div>
                )}
                <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                  {showAvatar && !isMe && (
                    <span className="text-xs text-gray-500 ml-1">{msg.sender?.name}</span>
                  )}
                  <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    isMe
                      ? 'bg-brand-500 text-white rounded-br-sm'
                      : 'bg-card border border-border text-gray-200 rounded-bl-sm'
                  }`}>
                    {msg.content}
                  </div>
                  <span className="text-[10px] text-gray-600 px-1">
                    {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </div>
            );
          })
        )}

        {typing.length > 0 && (
          <div className="flex items-center gap-2 text-gray-500 text-xs">
            <div className="flex gap-0.5">
              <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            typing...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border bg-card/50">
        <div className="flex items-center gap-2">
          <input
            className="input flex-1 py-2.5"
            placeholder="Type a message..."
            value={input}
            onChange={handleInputChange}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim()}
            className="w-10 h-10 flex items-center justify-center bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white rounded-xl transition-all active:scale-95"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

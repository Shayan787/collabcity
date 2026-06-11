'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import useAuthStore from '@/store/auth';
import { useSocket } from '@/hooks/useSocket';
import { Send, ArrowLeft, Hash, Paperclip, X, FileText, Download, Clock, ZoomIn } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

// Full screen image viewer
function ImageViewer({ url, fileName, onClose }) {
  const handleDownload = async () => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = fileName || 'image.jpg';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    } catch {
      toast.error('Download failed');
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.95)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      {/* Top bar */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px', background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <p style={{ color: 'white', fontSize: '14px', fontWeight: '500', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: '16px' }}>
          {fileName || 'Image'}
        </p>
        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
          <button
            onClick={handleDownload}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: '#6366f1', color: 'white', border: 'none',
              borderRadius: '10px', padding: '8px 14px', fontSize: '13px',
              fontWeight: '600', cursor: 'pointer',
            }}
          >
            <Download size={14} /> Download
          </button>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.1)', color: 'white',
              border: 'none', borderRadius: '10px', padding: '8px 12px',
              cursor: 'pointer', display: 'flex', alignItems: 'center',
            }}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Image */}
      <img
        src={url}
        alt={fileName || 'image'}
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '95vw', maxHeight: '85vh',
          objectFit: 'contain', borderRadius: '8px',
        }}
      />

      {/* Tap outside hint */}
      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', marginTop: '16px' }}>
        Tap outside to close
      </p>
    </div>
  );
}

function FileMessage({ msg }) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const isExpired = !msg.fileUrl && msg.fileType;

  if (isExpired) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '8px 12px', borderRadius: '10px',
        background: 'rgba(239,68,68,0.08)',
        border: '1px solid rgba(239,68,68,0.2)',
      }}>
        <Clock size={14} style={{ color: '#f87171', flexShrink: 0 }} />
        <div>
          <p style={{ color: '#f87171', fontSize: '12px', fontWeight: '500', margin: 0 }}>
            File expired
          </p>
          <p style={{ color: '#9ca3af', fontSize: '11px', margin: 0 }}>
            {msg.fileName || 'This file'} · Ask sender to resend
          </p>
        </div>
      </div>
    );
  }

  const isImage = msg.fileType === 'image';
  const expiresAt = msg.fileExpiresAt ? new Date(msg.fileExpiresAt) : null;
  const hoursLeft = expiresAt ? (expiresAt - new Date()) / (1000 * 60 * 60) : null;
  const expiringSoon = hoursLeft !== null && hoursLeft < 24 && hoursLeft > 0;

  const handleFileDownload = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(msg.fileUrl);
      const blob = await response.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      // Use original filename to preserve extension
      a.download = msg.fileName || 'download';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    } catch {
      toast.error('Download failed');
    }
  };

  return (
    <div>
      {isImage ? (
        <div style={{ marginBottom: msg.content ? '6px' : '0', position: 'relative' }}>
          <div style={{ position: 'relative', display: 'inline-block', cursor: 'pointer' }}
            onClick={() => setViewerOpen(true)}
          >
            <img
              src={msg.fileUrl}
              alt={msg.fileName || 'image'}
              style={{
                maxWidth: '220px', maxHeight: '200px',
                borderRadius: '12px', objectFit: 'cover',
                display: 'block',
              }}
            />
            {/* Zoom hint overlay */}
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '12px',
              background: 'rgba(0,0,0,0)', transition: 'background 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.3)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0)'}
            >
              <ZoomIn size={24} style={{ color: 'white', opacity: 0, transition: 'opacity 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.opacity = '1'}
              />
            </div>
          </div>
          {/* Full screen viewer */}
          {viewerOpen && (
            <ImageViewer
              url={msg.fileUrl}
              fileName={msg.fileName}
              onClose={() => setViewerOpen(false)}
            />
          )}
        </div>
      ) : (
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            background: 'rgba(255,255,255,0.08)', borderRadius: '10px',
            padding: '10px 12px', marginBottom: msg.content ? '6px' : '0',
          }}
        >
          <div style={{
            width: '36px', height: '36px', borderRadius: '8px', flexShrink: 0,
            background: 'rgba(99,102,241,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <FileText size={16} style={{ color: '#818cf8' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              color: 'white', fontSize: '13px', fontWeight: '500', margin: 0,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {msg.fileName || 'File'}
            </p>
            <p style={{ color: '#6b7280', fontSize: '11px', margin: 0 }}>
              {msg.fileName?.split('.').pop()?.toUpperCase() || 'FILE'}
            </p>
          </div>
          <button
            onClick={handleFileDownload}
            style={{
              background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.3)',
              borderRadius: '8px', padding: '6px 10px', color: '#818cf8',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
              fontSize: '12px', fontWeight: '500', flexShrink: 0,
            }}
          >
            <Download size={13} /> Save
          </button>
        </div>
      )}

      {expiringSoon && (
        <p style={{ fontSize: '10px', color: '#fbbf24', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '3px' }}>
          <Clock size={9} /> Expires in {Math.ceil(hoursLeft)}h
        </p>
      )}

      {expiresAt && !expiringSoon && (
        <p style={{ fontSize: '10px', color: '#4b5563', marginTop: '3px' }}>
          Expires {formatDistanceToNow(expiresAt, { addSuffix: true })}
        </p>
      )}

      {msg.content && (
        <p style={{ fontSize: '14px', lineHeight: '1.5', margin: 0 }}>{msg.content}</p>
      )}
    </div>
  );
}

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
  const [uploading, setUploading] = useState(false);
  const [filePreview, setFilePreview] = useState(null);
  const messagesEndRef = useRef(null);
  const typingTimeout = useRef(null);
  const fileInputRef = useRef(null);

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

  const sendMessage = async () => {
    if (!input.trim() && !filePreview) return;
    if (!socket) return;

    let fileUrl = null, fileType = null, fileName = null;
    let cloudinaryId = null, fileExpiresAt = null;

    if (filePreview) {
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', filePreview.file);
        const { data } = await api.post('/upload/chat-file', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        fileUrl = data.url;
        fileType = data.type;
        fileName = data.name;
        cloudinaryId = data.cloudinaryId;
        fileExpiresAt = data.expiresAt;
      } catch {
        toast.error('File upload failed');
        setUploading(false);
        return;
      }
      setUploading(false);
      setFilePreview(null);
    }

    socket.emit('message:send', {
      roomId: id, content: input.trim(),
      fileUrl, fileType, fileName,
      cloudinaryId, fileExpiresAt,
    });
    setInput('');
    socket.emit('typing:stop', { roomId: id });
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File must be under 10MB');
      return;
    }
    const isImage = file.type.startsWith('image/');
    const previewUrl = isImage ? URL.createObjectURL(file) : null;
    setFilePreview({ url: previewUrl, type: isImage ? 'image' : 'file', name: file.name, file });
    e.target.value = '';
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

  const otherUser = room?.type !== 'COLLAB'
    ? room?.members?.find(m => m.user.id !== user?.id)?.user
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '12px 16px', borderBottom: '1px solid #2a2a35',
        background: 'rgba(24,24,31,0.97)', backdropFilter: 'blur(12px)',
        flexShrink: 0,
      }}>
        <button onClick={() => router.back()} style={{
          background: 'none', border: 'none', color: '#6b7280',
          cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center',
        }}>
          <ArrowLeft size={20} />
        </button>

        <div style={{ position: 'relative', flexShrink: 0 }}>
          {room?.type === 'COLLAB' ? (
            <div style={{
              width: '38px', height: '38px', borderRadius: '50%',
              background: 'rgba(168,85,247,0.2)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', color: '#a855f7',
            }}>
              <Hash size={16} />
            </div>
          ) : (
            <div style={{
              width: '38px', height: '38px', borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(99,102,241,0.4), rgba(168,85,247,0.4))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 'bold', fontSize: '15px',
              border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden',
            }}>
              {otherUser?.avatar
                ? <img src={otherUser.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : getRoomTitle()[0]?.toUpperCase()
              }
            </div>
          )}
          {otherUser?.isOnline && (
            <span style={{
              position: 'absolute', bottom: 0, right: 0,
              width: '10px', height: '10px', borderRadius: '50%',
              background: '#34d399', border: '2px solid #18181f',
            }} />
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: 'white', fontWeight: '600', fontSize: '15px', margin: 0 }}>
            {getRoomTitle()}
          </p>
          <p style={{ color: '#6b7280', fontSize: '12px', margin: 0 }}>
            {room?.type === 'COLLAB'
              ? `${room.members?.length || 0} members`
              : otherUser?.isOnline ? '🟢 Online' : 'Offline'
            }
          </p>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
            <div style={{
              width: '24px', height: '24px', border: '2px solid #6366f1',
              borderTopColor: 'transparent', borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }} />
          </div>
        ) : messages.length === 0 ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, color: '#6b7280', fontSize: '14px' }}>
            Say hi! 👋
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMe = msg.sender?.id === user?.id;
            const prevMsg = messages[i - 1];
            const showName = i === 0 || prevMsg?.sender?.id !== msg.sender?.id;

            return (
              <div key={msg.id} style={{
                display: 'flex', flexDirection: 'column',
                alignItems: isMe ? 'flex-end' : 'flex-start',
                marginTop: showName ? '12px' : '2px',
              }}>
                {showName && (
                  <p style={{
                    fontSize: '11px', fontWeight: '500', marginBottom: '4px',
                    color: isMe ? '#818cf8' : '#9ca3af',
                    paddingLeft: isMe ? 0 : '4px',
                    paddingRight: isMe ? '4px' : 0,
                  }}>
                    {isMe ? 'You' : msg.sender?.name}
                  </p>
                )}

                <div style={{
                  maxWidth: '75%',
                  padding: msg.fileType ? '8px 10px' : '10px 14px',
                  borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  background: isMe ? '#6366f1' : '#1e1e2a',
                  border: isMe ? 'none' : '1px solid #2a2a35',
                  color: 'white', fontSize: '14px', lineHeight: '1.5',
                  wordBreak: 'break-word',
                }}>
                  {msg.fileType ? <FileMessage msg={msg} /> : msg.content}
                </div>

                <p style={{
                  fontSize: '10px', color: '#4b5563', marginTop: '3px',
                  paddingLeft: isMe ? 0 : '4px', paddingRight: isMe ? '4px' : 0,
                }}>
                  {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                </p>
              </div>
            );
          })
        )}

        {typing.length > 0 && (
          <div style={{ display: 'flex', marginTop: '8px' }}>
            <div style={{
              padding: '10px 14px', borderRadius: '18px 18px 18px 4px',
              background: '#1e1e2a', border: '1px solid #2a2a35',
              display: 'flex', gap: '4px', alignItems: 'center',
            }}>
              {[0, 1, 2].map(i => (
                <span key={i} style={{
                  width: '6px', height: '6px', borderRadius: '50%',
                  background: '#6b7280', display: 'inline-block',
                  animation: `bounce 1s infinite ${i * 150}ms`,
                }} />
              ))}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* File preview bar */}
      {filePreview && (
        <div style={{
          padding: '8px 16px', borderTop: '1px solid #2a2a35',
          background: 'rgba(24,24,31,0.97)', display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          {filePreview.type === 'image' ? (
            <img src={filePreview.url} alt="" style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover' }} />
          ) : (
            <div style={{
              width: '48px', height: '48px', borderRadius: '8px',
              background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <FileText size={20} style={{ color: '#818cf8' }} />
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: 'white', fontSize: '13px', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
              {filePreview.name}
            </p>
            <p style={{ color: '#6b7280', fontSize: '11px', margin: 0 }}>Will expire in 7 days</p>
          </div>
          <button onClick={() => setFilePreview(null)} style={{
            background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', padding: '4px', display: 'flex',
          }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Input bar */}
      <div style={{
        padding: '12px 16px', borderTop: '1px solid #2a2a35',
        background: 'rgba(24,24,31,0.97)', flexShrink: 0,
        display: 'flex', gap: '8px', alignItems: 'center',
      }}>
        <button onClick={() => fileInputRef.current?.click()} disabled={uploading} style={{
          width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
          background: 'rgba(255,255,255,0.05)', border: '1px solid #2a2a35',
          color: '#6b7280', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Paperclip size={16} />
        </button>
        <input
          ref={fileInputRef} type="file"
          accept="image/*,.pdf,.doc,.docx,.txt,.zip,.xls,.xlsx,.ppt,.pptx"
          style={{ display: 'none' }} onChange={handleFileChange}
        />

        <input
          value={input} onChange={handleInputChange}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder={filePreview ? 'Add a caption...' : 'Type a message...'}
          style={{
            flex: 1, background: 'rgba(255,255,255,0.05)',
            border: '1px solid #2a2a35', borderRadius: '24px',
            padding: '11px 18px', color: 'white', fontSize: '14px',
            outline: 'none', colorScheme: 'dark',
          }}
        />

        <button
          onClick={sendMessage}
          disabled={(!input.trim() && !filePreview) || uploading}
          style={{
            width: '42px', height: '42px', borderRadius: '50%', flexShrink: 0,
            background: (input.trim() || filePreview) && !uploading ? '#6366f1' : '#2a2a35',
            border: 'none', color: 'white',
            cursor: (input.trim() || filePreview) && !uploading ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.2s',
          }}
        >
          {uploading
            ? <div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            : <Send size={16} />
          }
        </button>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}

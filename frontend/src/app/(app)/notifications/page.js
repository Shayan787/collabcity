'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Bell, CheckCheck, Briefcase, MessageCircle, Star } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

const NOTIF_ICONS = {
  NEW_MESSAGE: { icon: MessageCircle, color: 'text-brand-400', bg: 'bg-brand-500/10' },
  NEW_APPLICATION: { icon: Briefcase, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  APPLICATION_ACCEPTED: { icon: CheckCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  APPLICATION_REJECTED: { icon: Briefcase, color: 'text-red-400', bg: 'bg-red-500/10' },
  DEFAULT: { icon: Bell, color: 'text-gray-400', bg: 'bg-white/5' },
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/notifications').then(({ data }) => {
      setNotifications(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(p => p.map(n => ({ ...n, read: true })));
      toast.success('All marked as read');
    } catch {
      toast.error('Failed to mark as read');
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-white mb-1">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-gray-500 text-sm">{unreadCount} unread</p>
          )}
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="btn-ghost flex items-center gap-2 text-sm">
            <CheckCheck size={14} />
            Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <Bell size={32} className="mx-auto mb-3 opacity-30" />
          <p>No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(notif => {
            const config = NOTIF_ICONS[notif.type] || NOTIF_ICONS.DEFAULT;
            const Icon = config.icon;
            const href = notif.data?.roomId
              ? `/chat/${notif.data.roomId}`
              : notif.data?.projectId
              ? `/projects`
              : '#';

            return (
              <Link key={notif.id} href={href}>
                <div className={`card p-4 flex items-start gap-3 hover:border-brand-500/30 transition-all ${!notif.read ? 'border-brand-500/20 bg-brand-500/5' : ''}`}>
                  <div className={`w-9 h-9 rounded-xl ${config.bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon size={16} className={config.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-relaxed ${notif.read ? 'text-gray-400' : 'text-white'}`}>
                      {notif.message}
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  {!notif.read && (
                    <div className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0 mt-1.5" />
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

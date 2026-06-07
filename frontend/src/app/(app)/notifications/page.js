'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Bell, CheckCheck, Briefcase, MessageCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

const NOTIF_ICONS = {
  NEW_MESSAGE:          { icon: MessageCircle, color: 'text-brand-400',   bg: 'bg-brand-500/10' },
  NEW_APPLICATION:      { icon: Briefcase,     color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  APPLICATION_ACCEPTED: { icon: CheckCheck,    color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  APPLICATION_REJECTED: { icon: Briefcase,     color: 'text-red-400',     bg: 'bg-red-500/10' },
  MILESTONE_RELEASED:   { icon: CheckCheck,    color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  MILESTONE_SUBMITTED:  { icon: Briefcase,     color: 'text-amber-400',   bg: 'bg-amber-500/10' },
  DEFAULT:              { icon: Bell,          color: 'text-gray-400',    bg: 'bg-white/5' },
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
    } catch { toast.error('Failed'); }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="p-4 pb-24 md:pb-8 md:p-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-display text-xl md:text-2xl font-bold text-white">Notifications</h1>
          {unreadCount > 0 && <p className="text-gray-500 text-xs mt-0.5">{unreadCount} unread</p>}
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white bg-white/5 px-3 py-2 rounded-xl border border-border transition-all">
            <CheckCheck size={13} /> Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <Bell size={36} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm font-medium text-gray-400">All caught up!</p>
          <p className="text-xs text-gray-600 mt-1">No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(notif => {
            const config = NOTIF_ICONS[notif.type] || NOTIF_ICONS.DEFAULT;
            const Icon = config.icon;
            const href = notif.data?.roomId
              ? `/chat/${notif.data.roomId}`
              : notif.data?.projectId ? `/projects/${notif.data.projectId}` : '#';

            return (
              <Link key={notif.id} href={href}>
                <div className={`flex items-start gap-3 p-3.5 rounded-2xl transition-all active:scale-[0.98] ${
                  !notif.read ? 'bg-brand-500/5 border border-brand-500/15' : 'hover:bg-white/5'
                }`}>
                  <div className={`w-9 h-9 rounded-xl ${config.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                    <Icon size={15} className={config.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug ${notif.read ? 'text-gray-400' : 'text-white'}`}>
                      {notif.message}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  {!notif.read && (
                    <div className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0 mt-2" />
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

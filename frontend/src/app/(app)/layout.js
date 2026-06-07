'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import useAuthStore from '@/store/auth';
import { useSocket } from '@/hooks/useSocket';
import api from '@/lib/api';
import {
  Compass, MessageCircle, Briefcase, User,
  Bell, LogOut, Zap, Settings, SlidersHorizontal
} from 'lucide-react';

const navItems = [
  { href: '/discover',  icon: Compass,          label: 'Discover' },
  { href: '/match',     icon: Zap,              label: 'Smart Match' },
  { href: '/chat',      icon: MessageCircle,    label: 'Chat' },
  { href: '/projects',  icon: Briefcase,        label: 'Projects' },
  { href: '/profile',   icon: User,             label: 'Profile' },
  { href: '/settings',  icon: Settings,         label: 'Settings' },
];

export default function AppLayout({ children }) {
  const { user, isLoading, init, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const socket = useSocket();
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  useEffect(() => { init(); }, []);
  useEffect(() => { if (!isLoading && !user) router.push('/login'); }, [user, isLoading]);

  useEffect(() => {
    if (!user) return;
    api.get('/notifications').then(({ data }) => {
      setUnreadNotifs(data.filter(n => !n.read).length);
    }).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!socket) return;
    const handleNotif = () => setUnreadNotifs(p => p + 1);
    socket.on('notification', handleNotif);
    return () => socket.off('notification', handleNotif);
  }, [socket]);

  const handleLogout = () => { logout(); router.push('/'); };

  if (isLoading || !user) return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const mobileNav = [
    { href: '/discover', icon: Compass, label: 'Discover' },
    { href: '/match',    icon: Zap,     label: 'Match' },
    { href: '/chat',     icon: MessageCircle, label: 'Chat' },
    { href: '/projects', icon: Briefcase, label: 'Projects' },
    { href: '/notifications', icon: Bell, label: 'Alerts', badge: unreadNotifs },
  ];

  return (
    <div className="min-h-screen bg-surface flex">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-60 border-r border-border flex flex-col bg-card z-40 hidden md:flex">
        <div className="p-5 border-b border-border">
          <Link href="/discover" className="font-display text-xl font-bold text-white tracking-tight">
            <img src="/logo.png" alt="CollabCity" style={{ height: '60px', objectFit: 'contain' }} />
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map(({ href, icon: Icon, label }) => (
            <Link key={href} href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                pathname.startsWith(href)
                  ? 'bg-brand-500/15 text-brand-400'
                  : 'text-gray-500 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon size={17} />
              {label}
              {label === 'Smart Match' && (
                <span className="ml-auto text-[9px] bg-brand-500/20 text-brand-400 px-1.5 py-0.5 rounded-full border border-brand-500/20">AI</span>
              )}
            </Link>
          ))}

          <Link href="/notifications"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              pathname === '/notifications' ? 'bg-brand-500/15 text-brand-400' : 'text-gray-500 hover:text-white hover:bg-white/5'
            }`}
          >
            <div className="relative">
              <Bell size={17} />
              {unreadNotifs > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-brand-500 text-white text-[10px] flex items-center justify-center rounded-full">
                  {unreadNotifs > 9 ? '9+' : unreadNotifs}
                </span>
              )}
            </div>
            Notifications
          </Link>
        </nav>

        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 font-semibold text-sm overflow-hidden">
                {user.avatar
                  ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                  : user.name?.[0]?.toUpperCase()
                }
              </div>
              <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-400 rounded-full ring-2 ring-card" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <p className="text-sm font-medium text-white truncate">{user.name}</p>
                {user.isVerified && <span className="text-brand-400 text-xs">✓</span>}
              </div>
              <p className="text-xs text-gray-500 truncate">@{user.username}</p>
            </div>
          </div>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-gray-500 hover:text-red-400 hover:bg-red-500/5 transition-all"
          >
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 px-1 py-1.5 flex justify-around">
        {mobileNav.map(({ href, icon: Icon, label, badge }) => (
          <Link key={href} href={href}
            className={`flex flex-col items-center gap-0.5 p-2 rounded-xl transition-colors relative ${
              pathname.startsWith(href) ? 'text-brand-400' : 'text-gray-600'
            }`}
          >
            <Icon size={19} />
            {badge > 0 && (
              <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-brand-500 text-white text-[9px] flex items-center justify-center rounded-full">{badge}</span>
            )}
            <span className="text-[9px]">{label}</span>
          </Link>
        ))}
      </nav>

      <main className="flex-1 md:ml-60 pb-20 md:pb-0 page-enter w-full overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}

'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useAuthStore from '@/store/auth';
import Link from 'next/link';

export default function HomePage() {
  const { user, isLoading, init } = useAuthStore();
  const router = useRouter();

  useEffect(() => { init(); }, []);
  useEffect(() => {
    if (!isLoading && user) router.push('/discover');
  }, [user, isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-surface overflow-hidden">

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-4 md:px-6 py-4 flex items-center justify-between border-b border-border/50 backdrop-blur-xl bg-surface/80">
        <span className="font-display text-xl font-bold text-white tracking-tight">
          <img src="/logo.png" alt="CollabCity" style={{ height: '32px', objectFit: 'contain' }} />
        </span>
        <div className="flex items-center gap-2">
          <Link href="/login" className="btn-ghost text-sm px-3 py-2">Sign in</Link>
          <Link href="/register" className="btn-primary text-sm px-3 py-2">Get started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 md:pt-40 pb-16 md:pb-24 px-4 md:px-6 text-center relative">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-500/5 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[300px] md:w-[600px] h-[300px] md:h-[600px] bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/20 rounded-full px-4 py-1.5 text-brand-400 text-xs md:text-sm font-medium mb-6 md:mb-8">
            <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
            Now live in Karachi 🇵🇰
          </div>

          <h1 className="font-display text-4xl md:text-7xl font-bold text-white leading-tight mb-4 md:mb-6">
            Find your people.<br />
            <span className="text-brand-400">Get paid together.</span>
          </h1>

          <p className="text-gray-400 text-base md:text-xl max-w-xl mx-auto mb-8 md:mb-10 leading-relaxed px-2">
            CollabCity connects GenZ creators, developers, designers, and hustlers in your city to collaborate on real paid projects.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center px-4">
            <Link href="/register" className="btn-primary px-6 md:px-8 py-3.5 text-base text-center">
              Join CollabCity →
            </Link>
            <Link href="/login" className="btn-outline px-6 md:px-8 py-3.5 text-base text-center">
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 md:px-6 pb-16 md:pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: '📍', title: 'Local first', desc: 'Discover people in your city and neighbourhood.' },
            { icon: '💬', title: 'Real-time collab', desc: 'Chat, create rooms, work together live.' },
            { icon: '💸', title: 'Get paid', desc: 'Post and work on real projects with milestone payments.' },
          ].map(f => (
            <div key={f.title} className="card p-5 md:p-6 hover:border-brand-500/30 transition-colors">
              <div className="text-3xl mb-3 md:mb-4">{f.icon}</div>
              <h3 className="font-display font-semibold text-white text-base md:text-lg mb-2">{f.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

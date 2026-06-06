'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useAuthStore from '@/store/auth';
import Link from 'next/link';

export default function HomePage() {
  const { user, isLoading, init } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    if (!isLoading && user) {
      router.push('/discover');
    }
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
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between border-b border-border/50 backdrop-blur-xl bg-surface/80">
        <span className="font-display text-xl font-bold text-white tracking-tight">
          collab<span className="text-brand-400">city</span>
        </span>
        <div className="flex items-center gap-3">
          <Link href="/login" className="btn-ghost text-sm">Sign in</Link>
          <Link href="/register" className="btn-primary text-sm">Get started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-40 pb-24 px-6 text-center relative">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-500/5 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/20 rounded-full px-4 py-1.5 text-brand-400 text-sm font-medium mb-8">
            <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
            Now live in Karachi 🇵🇰
          </div>

          <h1 className="font-display text-5xl md:text-7xl font-bold text-white leading-tight mb-6">
            Find your people.<br />
            <span className="text-brand-400">Get paid together.</span>
          </h1>

          <p className="text-gray-400 text-lg md:text-xl max-w-xl mx-auto mb-10 leading-relaxed">
            CollabCity connects GenZ creators, developers, designers, and hustlers in your city to collaborate on real paid projects.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/register" className="btn-primary px-8 py-3.5 text-base">
              Join CollabCity →
            </Link>
            <Link href="/login" className="btn-outline px-8 py-3.5 text-base">
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: '📍', title: 'Local first', desc: 'Discover people in your city and neighbourhood.' },
            { icon: '💬', title: 'Real-time collab', desc: 'Chat, create rooms, work together live.' },
            { icon: '💸', title: 'Get paid', desc: 'Post and work on real projects with escrow payments.' },
          ].map(f => (
            <div key={f.title} className="card p-6 hover:border-brand-500/30 transition-colors">
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="font-display font-semibold text-white text-lg mb-2">{f.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

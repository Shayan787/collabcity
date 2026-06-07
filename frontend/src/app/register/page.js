'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import useAuthStore from '@/store/auth';
import { Eye, EyeOff } from 'lucide-react';

const VIBE_TAGS = [
  { name: 'Developer', emoji: '💻' },
  { name: 'Designer', emoji: '🎨' },
  { name: 'Video Editor', emoji: '🎬' },
  { name: 'Content Creator', emoji: '📱' },
  { name: 'Musician', emoji: '🎵' },
  { name: 'Photographer', emoji: '📸' },
  { name: 'Marketer', emoji: '📣' },
  { name: 'Entrepreneur', emoji: '🚀' },
  { name: 'Gamer', emoji: '🎮' },
  { name: 'Writer', emoji: '✍️' },
];

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: '', username: '', email: '', password: '', city: 'Karachi', area: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const router = useRouter();

  const toggleTag = (tag) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleStep1 = (e) => {
    e.preventDefault();
    if (!form.name || !form.username || !form.email || !form.password)
      return toast.error('Please fill all fields');
    setStep(2);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', form);
      login(data.user, data.token);
      if (selectedTags.length > 0) {
        await api.put('/users/profile', { vibeTags: selectedTags }).catch(() => {});
      }
      toast.success('Welcome to CollabCity! 🎉');
      router.push('/discover');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-surface flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="font-display text-2xl font-bold text-white tracking-tight">
            <img src="/logo.png" alt="CollabCity" style={{ height: '36px', objectFit: 'contain' }} />
          </Link>
          <p className="text-gray-500 mt-2 text-sm">
            {step === 1 ? 'Create your account' : "What's your vibe?"}
          </p>
          <div className="flex gap-2 justify-center mt-3">
            {[1, 2].map(s => (
              <div key={s} className={`h-1 w-10 rounded-full transition-colors ${s <= step ? 'bg-brand-500' : 'bg-border'}`} />
            ))}
          </div>
        </div>

        {step === 1 && (
          <form onSubmit={handleStep1} className="card p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Name</label>
                <input className="input" placeholder="Ali Khan" value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Username</label>
                <input className="input" placeholder="alikhan" value={form.username}
                  onChange={e => setForm(p => ({ ...p, username: e.target.value.toLowerCase() }))} required />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Email</label>
              <input type="email" className="input" placeholder="you@example.com" value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input pr-12"
                  placeholder="min 8 characters"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">City</label>
                <input className="input" placeholder="Karachi" value={form.city}
                  onChange={e => setForm(p => ({ ...p, city: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Area</label>
                <input className="input" placeholder="DHA, Gulshan..." value={form.area}
                  onChange={e => setForm(p => ({ ...p, area: e.target.value }))} />
              </div>
            </div>
            <button type="submit" className="btn-primary w-full py-3">Next →</button>
          </form>
        )}

        {step === 2 && (
          <div className="card p-6">
            <p className="text-gray-400 text-sm mb-4">Pick tags that describe you (optional)</p>
            <div className="flex flex-wrap gap-2 mb-6">
              {VIBE_TAGS.map(t => (
                <button
                  key={t.name}
                  type="button"
                  onClick={() => toggleTag(t.name)}
                  className={`text-sm px-3 py-1.5 rounded-lg border transition-all ${
                    selectedTags.includes(t.name)
                      ? 'bg-brand-500/20 border-brand-500/50 text-brand-400'
                      : 'bg-white/5 border-border text-gray-400 hover:border-white/20'
                  }`}
                >
                  {t.emoji} {t.name}
                </button>
              ))}
            </div>
            <button onClick={handleSubmit} className="btn-primary w-full py-3" disabled={loading}>
              {loading ? 'Creating account...' : 'Join CollabCity 🚀'}
            </button>
            <button onClick={() => setStep(1)} className="btn-ghost w-full mt-2 text-sm">← Back</button>
          </div>
        )}

        <p className="text-center text-gray-500 text-sm mt-4">
          Already have an account?{' '}
          <Link href="/login" className="text-brand-400 hover:text-brand-300">Sign in</Link>
        </p>
      </div>
    </main>
  );
}

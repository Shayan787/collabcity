'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import useAuthStore from '@/store/auth';
import { Eye, EyeOff, Mail, RefreshCw } from 'lucide-react';

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
  const [step, setStep] = useState(1); // 1=form, 2=otp, 3=vibe tags
  const [form, setForm] = useState({
    name: '', username: '', email: '', password: '', city: 'Karachi', area: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [emailVerified, setEmailVerified] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const { login } = useAuthStore();
  const router = useRouter();

  const toggleTag = (tag) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  // Step 1 — validate form and send OTP
  const handleStep1 = async (e) => {
    e.preventDefault();
    if (!form.name || !form.username || !form.email || !form.password)
      return toast.error('Please fill all fields');
    if (form.password.length < 8)
      return toast.error('Password must be at least 8 characters');

    setOtpLoading(true);
    try {
      await api.post('/auth/send-otp', { email: form.email, name: form.name });
      toast.success('Verification code sent to your email!');
      setStep(2);
      startResendCooldown();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setOtpLoading(false);
    }
  };

  const startResendCooldown = () => {
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown(p => {
        if (p <= 1) { clearInterval(interval); return 0; }
        return p - 1;
      });
    }, 1000);
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;
    setOtpLoading(true);
    try {
      await api.post('/auth/send-otp', { email: form.email, name: form.name });
      toast.success('New code sent!');
      startResendCooldown();
      setOtp(['', '', '', '', '', '']);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resend');
    } finally {
      setOtpLoading(false);
    }
  };

  // Handle OTP input — auto advance to next box
  const handleOtpChange = (index, value) => {
    if (value.length > 1) value = value.slice(-1);
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto focus next input
    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  };

  // Step 2 — verify OTP
  const handleVerifyOTP = async () => {
    const code = otp.join('');
    if (code.length < 6) return toast.error('Enter the full 6-digit code');

    setLoading(true);
    try {
      await api.post('/auth/verify-otp', { email: form.email, code });
      setEmailVerified(true);
      toast.success('Email verified! ✅');
      setStep(3);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid or expired code');
    } finally {
      setLoading(false);
    }
  };

  // Step 3 — complete registration
  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', { ...form, emailVerified: true });
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

  const STEPS = [
    { n: 1, label: 'Details' },
    { n: 2, label: 'Verify' },
    { n: 3, label: 'Vibe' },
  ];

  return (
    <main className="min-h-screen bg-surface flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-6">
          <Link href="/" className="font-display text-2xl font-bold text-white tracking-tight">
 <img src="/logo.png" alt="CollabCity" style={{ height: '80px', borderRadius: '20px', marginLeft: '140px', objectFit: 'contain' }} />
          </Link>
          <p className="text-gray-500 mt-1.5 text-sm">
            {step === 1 ? 'Create your account' : step === 2 ? 'Verify your email' : "What's your vibe?"}
          </p>

          {/* Step indicators */}
          <div className="flex items-center justify-center gap-2 mt-4">
            {STEPS.map((s, i) => (
              <div key={s.n} className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 ${step >= s.n ? 'text-brand-400' : 'text-gray-600'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border transition-all ${
                    step > s.n ? 'bg-brand-500 border-brand-500 text-white' :
                    step === s.n ? 'border-brand-500 text-brand-400' :
                    'border-gray-700 text-gray-600'
                  }`}>
                    {step > s.n ? '✓' : s.n}
                  </div>
                  <span className="text-xs font-medium">{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`w-6 h-px transition-all ${step > s.n ? 'bg-brand-500' : 'bg-gray-700'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1 — Registration form */}
        {step === 1 && (
          <form onSubmit={handleStep1} className="card p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Full Name</label>
                <input className="input text-sm" placeholder="Ali Khan" value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Username</label>
                <input className="input text-sm" placeholder="alikhan" value={form.username}
                  onChange={e => setForm(p => ({ ...p, username: e.target.value.toLowerCase().replace(/\s/g, '') }))} required />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Email</label>
              <input type="email" className="input text-sm" placeholder="you@example.com" value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input pr-12 text-sm"
                  placeholder="min 8 characters"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  required minLength={8}
                />
                <button type="button" onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">City</label>
                <input className="input text-sm" placeholder="Karachi" value={form.city}
                  onChange={e => setForm(p => ({ ...p, city: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Area</label>
                <input className="input text-sm" placeholder="DHA, Gulshan..." value={form.area}
                  onChange={e => setForm(p => ({ ...p, area: e.target.value }))} />
              </div>
            </div>
            <button type="submit" className="btn-primary w-full py-3" disabled={otpLoading}>
              {otpLoading ? 'Sending code...' : 'Send Verification Code →'}
            </button>
          </form>
        )}

        {/* Step 2 — OTP verification */}
        {step === 2 && (
          <div className="card p-6">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-500/15 mx-auto mb-4">
              <Mail size={22} className="text-brand-400" />
            </div>
            <p className="text-center text-sm text-gray-400 mb-1">
              We sent a 6-digit code to
            </p>
            <p className="text-center text-sm font-semibold text-white mb-6">
              {form.email}
            </p>

            {/* OTP boxes */}
            <div className="flex gap-2 justify-center mb-6">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  id={`otp-${i}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleOtpChange(i, e.target.value)}
                  onKeyDown={e => handleOtpKeyDown(i, e)}
                  className="w-11 h-12 text-center text-xl font-bold rounded-xl border border-border bg-white/5 text-white focus:outline-none focus:border-brand-500 transition-all"
                  style={{ caretColor: '#6366f1' }}
                />
              ))}
            </div>

            <button onClick={handleVerifyOTP} disabled={loading} className="btn-primary w-full py-3 mb-3">
              {loading ? 'Verifying...' : 'Verify Email'}
            </button>

            {/* Resend */}
            <div className="flex items-center justify-center gap-2">
              <p className="text-xs text-gray-500">Didn't get the code?</p>
              <button
                onClick={handleResendOTP}
                disabled={resendCooldown > 0 || otpLoading}
                className="text-xs text-brand-400 hover:text-brand-300 disabled:text-gray-600 flex items-center gap-1 transition-colors"
              >
                {otpLoading ? (
                  <RefreshCw size={11} className="animate-spin" />
                ) : resendCooldown > 0 ? (
                  `Resend in ${resendCooldown}s`
                ) : (
                  'Resend code'
                )}
              </button>
            </div>

            <button onClick={() => setStep(1)} className="btn-ghost w-full mt-3 text-sm">
              ← Change email
            </button>
          </div>
        )}

        {/* Step 3 — Vibe tags */}
        {step === 3 && (
          <div className="card p-6">
            <p className="text-gray-400 text-sm mb-4">Pick tags that describe you (optional)</p>
            <div className="flex flex-wrap gap-2 mb-6">
              {VIBE_TAGS.map(t => (
                <button
                  key={t.name}
                  type="button"
                  onClick={() => toggleTag(t.name)}
                  className={`text-sm px-3 py-1.5 rounded-xl border transition-all ${
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

'use client';
import { useRef, useState, useEffect } from 'react';
import api from '@/lib/api';
import useAuthStore from '@/store/auth';
import toast from 'react-hot-toast';
import { Camera, CheckCircle, Zap, CreditCard, Clock, Upload } from 'lucide-react';

function PaymentCard({ icon: Icon, iconColor, title, price, description, badge, ctaLabel, onBuy, loading, active, activeLabel }) {
  return (
    <div className={`card p-5 transition-all ${active ? 'border-brand-500/40 bg-brand-500/5' : 'hover:border-white/20'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconColor}`}>
          <Icon size={18} />
        </div>
        {badge && (
          <span className="text-xs font-medium px-2 py-0.5 bg-brand-500/20 text-brand-400 border border-brand-500/30 rounded-full">
            {badge}
          </span>
        )}
      </div>
      <h3 className="font-semibold text-white mb-1">{title}</h3>
      <p className="text-gray-500 text-sm mb-4 leading-relaxed">{description}</p>
      <div className="flex items-center justify-between">
        <div>
          <span className="font-display font-bold text-white text-xl">{price}</span>
          <span className="text-gray-500 text-xs ml-1">PKR</span>
        </div>
        {active ? (
          <span className="text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
            {activeLabel}
          </span>
        ) : (
          <button onClick={onBuy} disabled={loading} className="btn-primary text-sm disabled:opacity-50">
            {loading ? 'Processing...' : ctaLabel}
          </button>
        )}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { user, updateUser } = useAuthStore();
  const [profile, setProfile] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [boostLoading, setBoostLoading] = useState(false);
  const [payments, setPayments] = useState([]);
  const fileRef = useRef();

  useEffect(() => {
    api.get('/auth/me').then(({ data }) => setProfile(data));
    api.get('/payments/my').then(({ data }) => setPayments(data)).catch(() => {});
  }, []);

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error('Image must be under 5MB');

    setUploadLoading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const { data } = await api.post('/upload/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateUser({ avatar: data.url });
      setProfile(p => ({ ...p, avatar: data.url }));
      toast.success('Profile photo updated! 📸');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleVerify = async () => {
    setVerifyLoading(true);
    try {
      const { data } = await api.post('/payments/verify-badge');
      toast.success(data.message);
      updateUser({ isVerified: true });
      setProfile(p => ({ ...p, isVerified: true }));
      const { data: p } = await api.get('/payments/my');
      setPayments(p);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment failed');
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleBoost = async () => {
    setBoostLoading(true);
    try {
      const { data } = await api.post('/payments/boost');
      toast.success(data.message);
      const now = new Date(data.boostExpiresAt);
      updateUser({ boostExpiresAt: data.boostExpiresAt });
      setProfile(p => ({ ...p, boostExpiresAt: data.boostExpiresAt }));
      const { data: p } = await api.get('/payments/my');
      setPayments(p);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment failed');
    } finally {
      setBoostLoading(false);
    }
  };

  const isBoosted = profile?.boostExpiresAt && new Date(profile.boostExpiresAt) > new Date();
  const boostDaysLeft = isBoosted
    ? Math.ceil((new Date(profile.boostExpiresAt) - new Date()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-white mb-1">Settings</h1>
        <p className="text-gray-500 text-sm">Manage your profile photo, badge, and visibility</p>
      </div>

      {/* Avatar upload */}
      <div className="card p-5 mb-4">
        <h3 className="font-semibold text-white mb-4">Profile Photo</h3>
        <div className="flex items-center gap-4">
          <div className="relative group cursor-pointer" onClick={() => fileRef.current?.click()}>
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500/30 to-purple-500/30 flex items-center justify-center text-white text-2xl font-bold border border-white/10 overflow-hidden">
              {profile?.avatar ? (
                <img src={profile.avatar} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                user?.name?.[0]?.toUpperCase()
              )}
            </div>
            <div className="absolute inset-0 bg-black/60 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera size={20} className="text-white" />
            </div>
            {uploadLoading && (
              <div className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            )}
          </div>
          <div>
            <p className="text-sm text-white font-medium mb-1">Upload a photo</p>
            <p className="text-xs text-gray-500 mb-3">JPG, PNG or WebP. Max 5MB. Auto-cropped to square.</p>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploadLoading}
              className="btn-outline text-sm flex items-center gap-2"
            >
              <Upload size={13} />
              {uploadLoading ? 'Uploading...' : 'Choose photo'}
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </div>
      </div>

      {/* Verified badge + Boost */}
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Perks</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <PaymentCard
          icon={CheckCircle}
          iconColor="bg-brand-500/15 text-brand-400"
          title="Verified Badge"
          price="499"
          badge="/ month"
          description="Get a ✓ badge on your profile. Appear more trustworthy to collaborators and stand out in the feed."
          ctaLabel="Get verified"
          onBuy={handleVerify}
          loading={verifyLoading}
          active={profile?.isVerified}
          activeLabel="✓ Active"
        />
        <PaymentCard
          icon={Zap}
          iconColor="bg-amber-500/15 text-amber-400"
          title="Boost Profile"
          price="500"
          badge="/ week"
          description="Appear at the top of the discovery feed for 7 days. Get more profile views and collab requests."
          ctaLabel="Boost now 🚀"
          onBuy={handleBoost}
          loading={boostLoading}
          active={isBoosted}
          activeLabel={`🚀 ${boostDaysLeft}d left`}
        />
      </div>

      {/* Payment history */}
      {payments.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <CreditCard size={15} className="text-gray-400" />
            Payment History
          </h3>
          <div className="space-y-2">
            {payments.map(p => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm text-white">
                    {p.type === 'VERIFICATION' && 'Verified Badge'}
                    {p.type === 'BOOST' && 'Profile Boost'}
                    {p.type === 'MILESTONE_RELEASE' && `Milestone: ${p.milestone?.title || '—'}`}
                    {p.type === 'MILESTONE_ESCROW' && 'Escrow Payment'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(p.createdAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-white">{p.amount.toLocaleString()} {p.currency}</p>
                  <span className={`text-xs ${p.status === 'COMPLETED' ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {p.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

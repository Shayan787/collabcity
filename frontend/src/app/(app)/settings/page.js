'use client';
import { useRef, useState, useEffect } from 'react';
import api from '@/lib/api';
import useAuthStore from '@/store/auth';
import toast from 'react-hot-toast';
import { Camera, CheckCircle, Zap, CreditCard, Upload, X, Phone, Clock } from 'lucide-react';

export default function SettingsPage() {
  const { user, updateUser } = useAuthStore();
  const [status, setStatus] = useState(null);
  const [payments, setPayments] = useState([]);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(null); // 'VERIFICATION' or 'BOOST'
  const [phoneNumber, setPhoneNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('NayaPay');
  const [transactionId, setTransactionId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    api.get('/payments/status').then(({ data }) => setStatus(data)).catch(() => {});
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
      toast.success('Profile photo updated! 📸');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploadLoading(false);
    }
  };

  const handlePaymentRequest = async () => {
    if (!phoneNumber.trim()) return toast.error('Enter your phone number');
    if (phoneNumber.length < 10) return toast.error('Enter a valid phone number');
    setSubmitting(true);
    try {
      const { data } = await api.post('/payments/request', {
        type: showPaymentModal,
        phoneNumber,
        paymentMethod,
        transactionId,
      });
      toast.success(data.message);
      setShowPaymentModal(null);
      setPhoneNumber('');
      setTransactionId('');
      // Refresh status
      const s = await api.get('/payments/status');
      setStatus(s.data);
      const p = await api.get('/payments/my');
      setPayments(p.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Request failed');
    } finally {
      setSubmitting(false);
    }
  };

  const PAYMENT_INFO = {
    VERIFICATION: {
      title: 'Verified Badge',
      price: '499 PKR/month',
      description: 'Get a ✓ badge on your profile and appear more trustworthy.',
      icon: CheckCircle,
      iconColor: 'text-brand-400',
      iconBg: 'bg-brand-500/15',
      activeLabel: '✓ Active',
      pendingLabel: '⏳ Pending approval',
      isActive: status?.isVerified,
      isPending: status?.pendingVerify,
    },
    BOOST: {
      title: 'Profile Boost',
      price: '500 PKR/week',
      description: 'Appear at the top of the discovery feed for 7 days.',
      icon: Zap,
      iconColor: 'text-amber-400',
      iconBg: 'bg-amber-500/15',
      activeLabel: `🚀 ${status?.boostDaysLeft}d left`,
      pendingLabel: '⏳ Pending approval',
      isActive: status?.isBoosted,
      isPending: status?.pendingBoost,
    },
  };

  return (
    <div className="p-4 pb-24 md:pb-8 md:p-8 max-w-2xl mx-auto">
      <div className="mb-5">
        <h1 className="font-display text-xl md:text-2xl font-bold text-white mb-0.5">Settings</h1>
        <p className="text-gray-500 text-xs">Manage your profile and perks</p>
      </div>

      {/* Avatar upload */}
      <div className="card p-5 mb-4">
        <h3 className="font-semibold text-white text-sm mb-4">Profile Photo</h3>
        <div className="flex items-center gap-4">
          <div className="relative group cursor-pointer" onClick={() => fileRef.current?.click()}>
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500/30 to-purple-500/30 flex items-center justify-center text-white text-2xl font-bold border border-white/10 overflow-hidden">
              {user?.avatar
                ? <img src={user.avatar} alt="avatar" className="w-full h-full object-cover" />
                : user?.name?.[0]?.toUpperCase()
              }
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
            <p className="text-xs text-gray-500 mb-3">JPG, PNG or WebP · Max 5MB</p>
            <button onClick={() => fileRef.current?.click()} disabled={uploadLoading}
              className="btn-outline text-sm flex items-center gap-2">
              <Upload size={13} />
              {uploadLoading ? 'Uploading...' : 'Choose photo'}
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </div>
      </div>

      {/* Perks */}
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Perks</h3>
      <div className="space-y-3 mb-5">
        {Object.entries(PAYMENT_INFO).map(([type, info]) => {
          const Icon = info.icon;
          return (
            <div key={type} className={`card p-5 transition-all ${info.isActive ? 'border-brand-500/30 bg-brand-500/3' : ''}`}>
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${info.iconBg}`}>
                  <Icon size={18} className={info.iconColor} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3 className="font-semibold text-white text-sm">{info.title}</h3>
                    <span className="font-bold text-white text-sm flex-shrink-0">{info.price}</span>
                  </div>
                  <p className="text-gray-500 text-xs leading-relaxed mb-3">{info.description}</p>

                  {info.isActive ? (
                    <span className="text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 inline-block">
                      {info.activeLabel}
                    </span>
                  ) : info.isPending ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20 inline-flex items-center gap-1.5">
                        <Clock size={11} /> Pending admin approval
                      </span>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowPaymentModal(type)}
                      className="btn-primary text-xs py-2 px-4"
                    >
                      Request →
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* How it works */}
      <div className="card p-4 mb-4 border-dashed">
        <p className="text-xs font-semibold text-white mb-2">💡 How payments work</p>
        <ol className="space-y-1.5">
          {[
            'Click "Request" and enter your Account Number',
            'Send the payment manually to our number',
            'Admin verifies and activates your service within 24 hours',
            'You get a notification when it\'s active',
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-gray-500">
              <span className="w-4 h-4 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </div>

      {/* Payment history */}
      {payments.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-white text-sm mb-4 flex items-center gap-2">
            <CreditCard size={14} className="text-gray-400" />
            Payment History
          </h3>
          <div className="space-y-2">
            {payments.map(p => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white">
                    {p.type === 'VERIFICATION' ? '✓ Verified Badge' : '🚀 Profile Boost'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {p.paymentMethod} · {new Date(p.createdAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                  {p.adminNote && <p className="text-xs text-gray-600 mt-0.5">{p.adminNote}</p>}
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  <p className="text-sm font-medium text-white">{p.amount} {p.currency}</p>
                  <span className={`text-xs ${
                    p.status === 'COMPLETED' ? 'text-emerald-400' :
                    p.status === 'PENDING' ? 'text-amber-400' :
                    'text-red-400'
                  }`}>
                    {p.status === 'COMPLETED' ? 'Approved' : p.status === 'PENDING' ? 'Pending' : 'Rejected'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment request modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end justify-center">
          <div className="card w-full rounded-b-none rounded-t-3xl p-5 animate-slide-up">
            <div className="w-10 h-1 bg-border rounded-full mx-auto mb-4" />
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-semibold text-white">
                  {showPaymentModal === 'VERIFICATION' ? 'Get Verified Badge' : 'Boost Profile'}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {showPaymentModal === 'VERIFICATION' ? '499 PKR / month' : '500 PKR / week'}
                </p>
              </div>
              <button onClick={() => setShowPaymentModal(null)} className="text-gray-500 p-1">
                <X size={18} />
              </button>
            </div>

            {/* Payment instructions */}
            <div className="bg-brand-500/5 border border-brand-500/15 rounded-xl p-4 mb-4">
              <p className="text-xs font-semibold text-brand-400 mb-2">Send payment first:</p>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">NayaPay / SadaPay</span>
                  <span className="text-xs font-bold text-white">03108574686</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Amount</span>
                  <span className="text-xs font-bold text-white">
                    {showPaymentModal === 'VERIFICATION' ? '499 PKR' : '500 PKR'}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-gray-600 mt-2">
                After sending, fill in your number below and submit. Admin will verify and activate within 24 hours.
              </p>
            </div>

            {/* Payment method */}
            <div className="flex gap-2 mb-3">
              {['NayaPay', 'SadaPay'].map(m => (
                <button
                  key={m}
                  onClick={() => setPaymentMethod(m)}
                  className={`flex-1 py-2.5 text-sm rounded-xl border font-medium transition-all ${
                    paymentMethod === m
                      ? 'bg-brand-500/20 border-brand-500/50 text-brand-400'
                      : 'bg-white/5 border-border text-gray-400'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            {/* Phone number */}
            <div className="relative mb-3">
              <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
              <input
                className="input pl-10 text-sm"
                placeholder="03XX-XXXXXXX (your number)"
                value={phoneNumber}
                onChange={e => setPhoneNumber(e.target.value)}
                type="tel"
              />
            </div>

            {/* Transaction ID */}
            <div className="relative mb-4">
              <CreditCard size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
              <input
                className="input pl-10 text-sm"
                placeholder="Transaction ID of the Trasation You made"
                value={transactionId}
                onChange={e => setTransactionId(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <button onClick={() => setShowPaymentModal(null)} className="btn-ghost flex-1 text-sm">
                Cancel
              </button>
              <button onClick={handlePaymentRequest} disabled={submitting} className="btn-primary flex-1 text-sm">
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

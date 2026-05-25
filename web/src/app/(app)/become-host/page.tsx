'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ArrowLeft, Calendar, Users, QrCode, CreditCard, CheckCircle2, Clock, XCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import api from '@/lib/api';

const FEATURES = [
  { icon: Calendar, title: 'Create Events', desc: 'Publish house parties, club nights, and exclusive events.' },
  { icon: Users, title: 'Manage Guests', desc: 'View bookings, approve private requests, build guest lists.' },
  { icon: QrCode, title: 'Scan QR Passes', desc: 'Control entry with the built-in QR scanner.' },
  { icon: CreditCard, title: 'Accept Payments', desc: 'Get paid directly via Razorpay — instantly.' },
];

export default function BecomeHostPage() {
  const { user, updateUser } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successOpen, setSuccessOpen] = useState(false);

  if (user?.isVerifiedHost) {
    return (
      <div className="max-w-xl mx-auto text-center py-16 animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 size={40} className="text-green-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">You&apos;re a verified host!</h1>
        <p className="text-muted text-sm mb-8">You can create and manage events on Clique.</p>
        <Button onClick={() => router.push('/host/dashboard')}>Go to Host Dashboard</Button>
      </div>
    );
  }

  if (user?.hostVerificationStatus === 'pending') {
    return (
      <div className="max-w-xl mx-auto text-center py-16 animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-5">
          <Clock size={40} className="text-yellow-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Application Under Review</h1>
        <p className="text-muted text-sm mb-2">We&apos;ll review your request within 24-48 hours.</p>
        <p className="text-xs text-muted">You&apos;ll receive a notification once reviewed.</p>
        <Button variant="secondary" className="mt-8" onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  if (user?.hostVerificationStatus === 'rejected') {
    return (
      <div className="max-w-xl mx-auto text-center py-16 animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-5">
          <XCircle size={40} className="text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Application Rejected</h1>
        <p className="text-muted text-sm mb-8">Your previous application was not approved. You can re-apply below.</p>
        <ApplySection loading={loading} setLoading={setLoading} error={error} setError={setError} onSuccess={() => setSuccessOpen(true)} updateUser={updateUser} />
      </div>
    );
  }

  const handleApply = async () => {
    setLoading(true);
    setError('');
    try {
      await api.post('/hosts/apply', { documentType: 'id', address: 'Pending upload' });
      setSuccessOpen(true);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? 'Application failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto animate-fade-in">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-muted hover:text-white text-sm mb-8 transition-colors">
        <ArrowLeft size={16} />
        Back
      </button>

      <div className="flex items-center gap-4 mb-6">
        <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center">
          <span className="text-3xl">⭐</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Become a Host</h1>
          <p className="text-muted text-sm mt-0.5">Unlock the full Clique creator experience</p>
        </div>
      </div>

      <div className="space-y-3 mb-8">
        {FEATURES.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="flex items-start gap-4 bg-dark-card border border-dark-border rounded-xl p-4">
            <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
              <Icon size={18} className="text-primary-light" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">{title}</p>
              <p className="text-xs text-muted mt-0.5 leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

      <Button className="w-full" size="lg" loading={loading} onClick={handleApply}>
        Apply to Become a Host
      </Button>
      <p className="text-xs text-muted text-center mt-3">Applications are reviewed within 24-48 hours.</p>

      <Modal open={successOpen} onClose={() => { setSuccessOpen(false); router.push('/profile'); }} title="Application Submitted!">
        <div className="text-center py-4 space-y-4">
          <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto">
            <Clock size={32} className="text-yellow-400" />
          </div>
          <div>
            <p className="text-white font-semibold">You&apos;re on the waitlist!</p>
            <p className="text-sm text-muted mt-1">We&apos;ll review your application within 24-48 hours and notify you.</p>
          </div>
          <Button className="w-full" onClick={() => { setSuccessOpen(false); router.push('/profile'); }}>
            Got it
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function ApplySection({ loading, setLoading, error, setError, onSuccess, updateUser }: {
  loading: boolean; setLoading: (v: boolean) => void;
  error: string; setError: (v: string) => void;
  onSuccess: () => void; updateUser: (u: any) => void;
}) {
  const handleApply = async () => {
    setLoading(true);
    setError('');
    try {
      await api.post('/hosts/apply', { documentType: 'id', address: 'Pending upload' });
      onSuccess();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? 'Application failed');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-red-400">{error}</p>}
      <Button className="w-full" loading={loading} onClick={handleApply}>Re-apply</Button>
    </div>
  );
}

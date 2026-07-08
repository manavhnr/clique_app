'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Input';
import api from '@/lib/api';

const PERKS = [
  { title: 'Create events', desc: 'House parties, warehouse nights, supper clubs — draft, publish, sell out.' },
  { title: 'Run the list', desc: 'Approve requests, see squads, export your guest list.' },
  { title: 'Scan at the door', desc: 'Built-in QR scanner. Hand your phone to the bouncer.' },
  { title: 'Get paid', desc: 'Payouts settle to your bank after each paid event.' },
];

function StatusCard({ kicker, title, body, children }: { kicker: string; title: string; body: string; children?: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-xl py-16 text-center animate-rise">
      <div className="clique-label mb-3">{kicker}</div>
      <h1 className="m-0 font-display text-[clamp(32px,7vw,48px)] font-bold leading-[0.95] tracking-[-0.03em]">{title}</h1>
      <p className="mx-auto mt-4 max-w-md font-display text-[15px] leading-relaxed text-cream">{body}</p>
      {children && <div className="mt-8 flex justify-center gap-3">{children}</div>}
    </div>
  );
}

export default function BecomeHostPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [address, setAddress] = useState('');
  const [about, setAbout] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successOpen, setSuccessOpen] = useState(false);

  const isRejected = user?.hostVerificationStatus === 'rejected';

  if (user?.isVerifiedHost) {
    return (
      <StatusCard
        kicker="HOST STATUS"
        title="You're verified."
        body="You can create events, manage guest lists, and scan at the door."
      >
        <Button onClick={() => router.push('/host/dashboard')}>Host dashboard →</Button>
      </StatusCard>
    );
  }

  if (user?.hostVerificationStatus === 'pending') {
    return (
      <StatusCard
        kicker="HOST STATUS"
        title="Under review."
        body="We review every application within 24–48 hours. You'll get a notification either way."
      >
        <Button variant="secondary" onClick={() => router.back()}>← Go back</Button>
      </StatusCard>
    );
  }

  const canSubmit = address.trim().length > 0 && !loading;

  const handleApply = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError('');
    try {
      await api.post('/hosts/apply', {
        documentType: 'id',
        address: about.trim() ? `${address.trim()} — ${about.trim()}` : address.trim(),
      });
      setSuccessOpen(true);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? 'Application failed. Try again in a minute.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl animate-rise">
      <Link
        href="/profile"
        className="clique-label mb-6 inline-block transition-colors hover:text-paper"
      >
        ← Profile
      </Link>

      <div className="mb-8 border-b border-line pb-6">
        <div className="clique-label mb-2">BECOME A HOST</div>
        <h1 className="m-0 font-display text-[clamp(36px,8vw,56px)] font-bold leading-[0.95] tracking-[-0.03em]">
          Your name<br />
          <span className="font-serif italic font-normal text-lime">on the flyer.</span>
        </h1>
        {isRejected && (
          <p className="mt-4 rounded-xl border border-hot/25 bg-hot/[.08] px-4 py-3 font-display text-sm leading-relaxed text-cream">
            Your last application wasn&apos;t approved. You can re-apply below — tell us a bit more this time.
          </p>
        )}
      </div>

      {/* What hosting unlocks */}
      <ol className="m-0 mb-10 list-none p-0">
        {PERKS.map(({ title, desc }, i) => (
          <li key={title} className="flex items-baseline gap-5 border-b border-dashed border-line py-4">
            <span className="clique-label w-7 shrink-0">{String(i + 1).padStart(2, '0')}</span>
            <div>
              <div className="font-display text-lg font-bold tracking-[-0.01em] text-paper">{title}</div>
              <div className="mt-1 font-display text-sm leading-relaxed text-cream">{desc}</div>
            </div>
          </li>
        ))}
      </ol>

      {/* Application */}
      <div className="rounded-card border border-line-2 bg-card p-6">
        <div className="clique-label mb-5">YOUR APPLICATION</div>
        <div className="flex flex-col gap-5">
          <Textarea
            label="Where do you host?"
            rows={2}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Neighbourhood, venue, or address — this stays private"
            required
          />
          <Textarea
            label="What do you throw? (optional)"
            rows={3}
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            placeholder="Rooftop sundowners, techno basements, supper clubs…"
          />

          {error && <p className="m-0 font-mono text-xs text-hot">{error}</p>}

          <Button size="lg" className="w-full" loading={loading} disabled={!canSubmit} onClick={handleApply}>
            {isRejected ? 'Re-apply →' : 'Apply to host →'}
          </Button>
          <p className="m-0 text-center font-mono text-[10px] uppercase tracking-[.1em] text-dim">
            Reviewed within 24–48 hours
          </p>
        </div>
      </div>

      <Modal open={successOpen} onClose={() => { setSuccessOpen(false); router.push('/profile'); }} title="Application in.">
        <div className="flex flex-col gap-5 py-2 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-lime font-display text-3xl text-ink">✓</div>
          <div>
            <p className="m-0 font-display text-lg font-bold text-paper">You&apos;re in the queue.</p>
            <p className="m-0 mt-2 font-display text-sm leading-relaxed text-cream">
              We review every application within 24–48 hours and you&apos;ll get a notification with the result.
            </p>
          </div>
          <Button className="w-full" onClick={() => { setSuccessOpen(false); router.push('/profile'); }}>
            Got it
          </Button>
        </div>
      </Modal>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import Button from '@/components/ui/Button';

interface Config {
  about?: string;
  flow_of_funds?: string;
}

const TEST_ACCOUNTS = [
  { role: 'Attendee', phone: '+91 90000 00001', note: 'Can browse events, book, and view passes' },
  { role: 'Host',     phone: '+91 90000 00002', note: 'Can create events, scan QR passes, manage payouts' },
  { role: 'Admin',    phone: '+91 90000 00003', note: 'Full admin console access' },
];

const FLOW_PLACEHOLDER = `1. User selects a paid event and taps "Book"
2. Booking created in payment_pending state
3. User pays via UPI to Clique's merchant VPA and uploads screenshot
4. Admin reviews screenshot and UTR in this console
5. Admin clicks "Verify payment" → booking confirmed → QR pass generated instantly
6. User opens Passes tab and sees active QR pass
7. Host scans QR at the door → pass marked used → booking status → checked_in
8. Revenue is paid out to host via UPI (T+2 days, 80/20 split)`;

const ABOUT_PLACEHOLDER = `Clique is a social-first nightlife application for discovering and attending house parties, club nights, and exclusive events.

Users can follow hosts, book event passes, and share content from nights they attend. Hosts can create events, manage their guest list, and process entries via QR scan.

The platform operates as an aggregator / marketplace for event access.`;

function ConfigEditor({
  label, configKey, initial, placeholder,
}: {
  label: string;
  configKey: string;
  initial: string;
  placeholder: string;
}) {
  const [value, setValue]     = useState(initial);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => { setValue(initial); }, [initial]);

  async function save() {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await api.put('/admin/config', { key: configKey, value });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError('Save failed. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ marginBottom: 36 }}>
      <div className="clique-label" style={{ marginBottom: 10 }}>{label}</div>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        rows={8}
        style={{
          width: '100%', maxWidth: 640,
          background: 'var(--card)', border: '1px solid var(--line-2)',
          borderRadius: 8, padding: '12px 14px',
          fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--paper)',
          lineHeight: 1.7, resize: 'vertical', outline: 'none',
          display: 'block',
        }}
        onFocus={(e) => (e.target.style.borderColor = 'var(--lime)')}
        onBlur={(e)  => (e.target.style.borderColor = 'var(--line-2)')}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
        <Button size="sm" onClick={save} loading={saving} disabled={saving}>
          Save →
        </Button>
        {saved && (
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--lime)', letterSpacing: '.06em' }}>
            Saved ✓
          </span>
        )}
        {error && (
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--hot)', letterSpacing: '.06em' }}>
            {error}
          </span>
        )}
      </div>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }
  return (
    <button
      onClick={copy}
      style={{
        fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase',
        background: 'transparent', border: '1px solid var(--line-2)',
        borderRadius: 4, padding: '3px 8px',
        color: copied ? 'var(--lime)' : 'var(--dim)',
        cursor: 'pointer', transition: 'color .15s, border-color .15s',
        flexShrink: 0,
      }}
    >
      {copied ? 'Copied ✓' : 'Copy'}
    </button>
  );
}

function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 120 }}>
      <div style={{ width: 24, height: 24, border: '2px solid var(--line-2)', borderTopColor: 'var(--lime)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    </div>
  );
}

export default function AdminCompliancePage() {
  const [config, setConfig]   = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/config')
      .then(({ data }) => setConfig(data.data as Config))
      .catch(() => setConfig({}))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      {/* Head */}
      <div style={{ marginBottom: 36 }}>
        <div className="clique-label" style={{ marginBottom: 8 }}>ADMIN / COMPLIANCE</div>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(28px, 4.5vw, 44px)', fontWeight: 800, lineHeight: 0.94, letterSpacing: '-0.03em', margin: 0 }}>
          Compliance.
        </h1>
        <p style={{ fontFamily: 'var(--display)', fontSize: 15, color: 'var(--cream)', margin: '8px 0 0' }}>
          Public documentation, fund flow, and reviewer access.
        </p>
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <>
          {/* About section */}
          <ConfigEditor
            label="ABOUT CLIQUE"
            configKey="about"
            initial={config?.about ?? ''}
            placeholder={ABOUT_PLACEHOLDER}
          />

          {/* Flow of funds */}
          <ConfigEditor
            label="FLOW OF FUNDS"
            configKey="flow_of_funds"
            initial={config?.flow_of_funds ?? ''}
            placeholder={FLOW_PLACEHOLDER}
          />

          {/* Test credentials */}
          <div>
            <div className="clique-label" style={{ marginBottom: 4 }}>TEST CREDENTIALS</div>
            <p style={{ fontFamily: 'var(--display)', fontSize: 14, color: 'var(--cream)', margin: '0 0 16px' }}>
              Use these phone numbers to sign in as different roles in the staging environment. OTP will be <strong style={{ color: 'var(--lime)' }}>123456</strong> in sandbox mode.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {TEST_ACCOUNTS.map((a) => (
                <div
                  key={a.role}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '72px 1fr auto',
                    gap: '8px 16px',
                    alignItems: 'center',
                    padding: '14px 6px',
                    borderBottom: '1px solid var(--line)',
                  }}
                >
                  <span style={{
                    fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.1em', textTransform: 'uppercase',
                    color: a.role === 'Admin' ? 'var(--gold)' : a.role === 'Host' ? 'var(--lime)' : 'var(--dim)',
                    border: `1px solid ${a.role === 'Admin' ? 'var(--gold)' : a.role === 'Host' ? 'var(--lime)' : 'var(--line-2)'}`,
                    borderRadius: 3, padding: '2px 6px', justifySelf: 'start',
                  }}>
                    {a.role}
                  </span>
                  <div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--paper)', letterSpacing: '.04em' }}>{a.phone}</div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--dim)', marginTop: 2 }}>{a.note}</div>
                  </div>
                  <CopyButton text={a.phone.replace(/\s/g, '')} />
                </div>
              ))}
            </div>

            {/* Payment test info */}
            <div style={{
              marginTop: 24,
              background: 'var(--card)', border: '1px solid var(--line-2)',
              borderRadius: 8, padding: '20px 20px',
            }}>
              <div className="clique-label" style={{ marginBottom: 12 }}>PAYMENT GATEWAY TESTING</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'PAYMENT METHOD', value: 'UPI (manual verification flow)' },
                  { label: 'TEST UPI VPA',   value: 'success@razorpay' },
                  { label: 'SANDBOX MODE',   value: 'All UPI payments go to pending_verification state' },
                  { label: 'ADMIN REVIEW',   value: 'Admin verifies screenshot → booking confirmed → QR pass generated' },
                  { label: 'PAYOUT',         value: '80% to host UPI ID · 20% platform fee · T+2 settlement' },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 24px', alignItems: 'baseline' }}>
                    <span className="clique-label" style={{ minWidth: 160 }}>{label}</span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--paper)', letterSpacing: '.04em' }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

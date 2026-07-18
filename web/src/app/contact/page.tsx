'use client';

import { useState } from 'react';
import Link from 'next/link';

const mono:    React.CSSProperties = { fontFamily: 'var(--mono)' };
const display: React.CSSProperties = { fontFamily: 'var(--display)' };
const serif:   React.CSSProperties = { fontFamily: 'var(--serif)' };

const inputBase: React.CSSProperties = {
  width: '100%',
  background: '#0F0C09',
  border: '1px solid #2A2520',
  color: '#F2EDE2',
  padding: '14px 16px',
  borderRadius: 6,
  fontFamily: 'var(--display)',
  fontSize: 15,
  outline: 'none',
  transition: 'border-color .15s ease',
  boxSizing: 'border-box',
  WebkitAppearance: 'none',
  appearance: 'none',
};

const labelStyle: React.CSSProperties = {
  ...mono,
  fontSize: 10,
  letterSpacing: '.14em',
  textTransform: 'uppercase',
  color: '#5B544A',
  display: 'block',
  marginBottom: 8,
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

function ContactRow({ icon, label, value, href }: { icon: string; label: string; value: string; href?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ ...mono, fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: '#5B544A' }}>
        {icon} {label}
      </div>
      {href ? (
        <a href={href} style={{ ...display, fontSize: 15, color: '#C9F36E', textDecoration: 'none', lineHeight: 1.45 }}>
          {value}
        </a>
      ) : (
        <div style={{ ...display, fontSize: 15, color: '#E8E1D2', lineHeight: 1.45 }}>
          {value}
        </div>
      )}
    </div>
  );
}

type FormState = 'idle' | 'loading' | 'success' | 'error';

const SUBJECTS = [
  'General enquiry',
  'Refund or cancellation request',
  'Booking issue',
  'Payment problem',
  'Host account & verification',
  'Technical / app issue',
  'Report abusive content',
  'Other',
];

export default function ContactPage() {
  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus]   = useState<FormState>('idle');
  const [focused, setFocused] = useState<string | null>(null);

  const borderFor = (field: string) =>
    focused === field ? '#C9F36E' : '#2A2520';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !subject || !message.trim()) return;
    setStatus('loading');
    // Wire to backend or third-party email service (Resend, SendGrid) here.
    await new Promise((r) => setTimeout(r, 1200));
    setStatus('success');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0B0907', color: '#F2EDE2' }}>

      {/* Nav */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 40px', height: 60,
        background: 'rgba(11,9,7,0.96)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #1C1814',
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'baseline', gap: 10, ...display, fontWeight: 800, letterSpacing: '-0.04em', fontSize: 20, color: '#F2EDE2' }}>
          <span style={{ width: 8, height: 8, background: '#C9F36E', borderRadius: '50%', alignSelf: 'center', boxShadow: '0 0 12px #C9F36E', display: 'inline-block' }} />
          CLIQUE
        </Link>
        <div style={{ ...mono, fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: '#5B544A' }}>
          Contact Us
        </div>
        <Link href="/signup" style={{ ...mono, fontSize: 12, fontWeight: 500, letterSpacing: '.08em', textTransform: 'uppercase', background: '#C9F36E', color: '#0B0907', padding: '9px 16px', borderRadius: 999 }}>
          Get on the list →
        </Link>
      </nav>

      {/* Header */}
      <header style={{ padding: '80px 40px 60px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ ...mono, fontSize: 11, letterSpacing: '.18em', textTransform: 'uppercase', color: '#5B544A', marginBottom: 18 }}>
          Support · We respond within 48 hours
        </div>
        <h1 style={{ ...display, fontSize: 'clamp(42px, 6vw, 80px)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1, color: '#F2EDE2', margin: 0 }}>
          Get in<br />
          <span style={{ ...serif, fontStyle: 'italic', color: '#C9F36E' }}>touch.</span>
        </h1>
        <p style={{ ...display, fontSize: 18, lineHeight: 1.5, color: '#C8C2B6', maxWidth: 560, marginTop: 28 }}>
          Booking issues, refund requests, host enquiries, or anything else — drop us a message and we&apos;ll get back to you.
        </p>
      </header>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 40px 120px', display: 'grid', gridTemplateColumns: '220px 1fr', gap: 72, alignItems: 'start' }}>

        {/* Contact details sidebar — all three fields mandatory for Razorpay */}
        <aside style={{ position: 'sticky', top: 80, display: 'flex', flexDirection: 'column', gap: 0 }}>
          <div style={{ ...mono, fontSize: 10, letterSpacing: '.16em', textTransform: 'uppercase', color: '#5B544A', marginBottom: 20 }}>
            Contact Details
          </div>

          <div style={{ background: '#0F0C09', border: '1px solid #2A2520', borderRadius: 12, padding: '20px 20px', display: 'flex', flexDirection: 'column', gap: 24 }}>

            <ContactRow
              icon="✉"
              label="Support Email"
              value="manavhwork@gmail.com"
              href="mailto:manavhwork@gmail.com"
            />

            <div style={{ height: 1, background: '#1C1814' }} />

            <ContactRow
              icon="☎"
              label="Support Phone"
              value="+91 9841417406"
              href="tel:+919841417406"
            />

            <div style={{ height: 1, background: '#1C1814' }} />

            <ContactRow
              icon="⌖"
              label="Registered Address"
              value={`Clique\nChennai, Tamil Nadu\nIndia`}
            />

          </div>

          <div style={{ marginTop: 24, ...mono, fontSize: 10, letterSpacing: '.1em', color: '#5B544A', lineHeight: 1.7 }}>
            Mon – Fri · 10 AM – 6 PM IST<br />
            Response within 48 hours.
          </div>

          <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid #1C1814' }}>
            <div style={{ ...mono, fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: '#5B544A', marginBottom: 10 }}>
              Refund questions?
            </div>
            <Link href="/refund" style={{ ...display, fontSize: 13, color: '#C9F36E' }}>
              Read refund policy →
            </Link>
          </div>
        </aside>

        {/* Contact form */}
        <main>
          {status === 'success' ? (
            <div style={{ paddingTop: 40, display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ ...mono, fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: '#C9F36E' }}>
                ✓ Message sent
              </div>
              <div style={{ ...display, fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.1, color: '#F2EDE2' }}>
                We&apos;ve got it.<br />
                <span style={{ ...serif, fontStyle: 'italic', color: '#C9F36E' }}>Stand by.</span>
              </div>
              <p style={{ ...display, fontSize: 16, color: '#C8C2B6', lineHeight: 1.7, maxWidth: '52ch' }}>
                Your message has been received. Our support team will respond to <strong style={{ color: '#E8E1D2' }}>{email}</strong> within 48 hours.
              </p>
              <button
                onClick={() => { setName(''); setEmail(''); setSubject(''); setMessage(''); setStatus('idle'); }}
                style={{
                  alignSelf: 'flex-start', marginTop: 8,
                  background: 'transparent', border: '1px solid #2A2520',
                  color: '#C8C2B6', padding: '12px 20px', borderRadius: 6,
                  ...mono, fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
              >
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <Field label="Your Name">
                  <input
                    type="text" value={name} onChange={(e) => setName(e.target.value)}
                    placeholder="First Last" required
                    style={{ ...inputBase, borderColor: borderFor('name') }}
                    onFocus={() => setFocused('name')}
                    onBlur={() => setFocused(null)}
                  />
                </Field>
                <Field label="Email Address">
                  <input
                    type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com" required
                    style={{ ...inputBase, borderColor: borderFor('email') }}
                    onFocus={() => setFocused('email')}
                    onBlur={() => setFocused(null)}
                  />
                </Field>
              </div>

              <Field label="Subject">
                <select
                  value={subject} onChange={(e) => setSubject(e.target.value)}
                  required
                  style={{
                    ...inputBase,
                    borderColor: borderFor('subject'),
                    color: subject ? '#F2EDE2' : '#5B544A',
                    cursor: 'pointer',
                  }}
                  onFocus={() => setFocused('subject')}
                  onBlur={() => setFocused(null)}
                >
                  <option value="" disabled>Select a topic…</option>
                  {SUBJECTS.map((s) => (
                    <option key={s} value={s} style={{ background: '#0F0C09', color: '#F2EDE2' }}>{s}</option>
                  ))}
                </select>
              </Field>

              <Field label="Message">
                <textarea
                  value={message} onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your issue or question in as much detail as possible. Include your booking ID or event name if relevant."
                  required rows={7}
                  style={{
                    ...inputBase,
                    borderColor: borderFor('message'),
                    resize: 'vertical',
                    minHeight: 160,
                    lineHeight: 1.6,
                  }}
                  onFocus={() => setFocused('message')}
                  onBlur={() => setFocused(null)}
                />
                <div style={{ ...mono, fontSize: 10, color: '#5B544A', letterSpacing: '.06em', marginTop: 6 }}>
                  {message.length}/1000 characters
                </div>
              </Field>

              {status === 'error' && (
                <div style={{ background: '#1C0A0A', border: '1px solid #3D1414', borderRadius: 6, padding: '12px 16px', ...display, fontSize: 14, color: '#FF8FA8' }}>
                  Something went wrong. Please try again or email us directly at{' '}
                  <a href="mailto:support@clique.app" style={{ color: '#FF3D6E' }}>support@clique.app</a>.
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, paddingTop: 4 }}>
                <div style={{ ...mono, fontSize: 10, color: '#5B544A', letterSpacing: '.06em', maxWidth: '36ch', lineHeight: 1.6 }}>
                  By submitting you agree to our{' '}
                  <Link href="/privacy" style={{ color: '#5B544A', textDecoration: 'underline' }}>Privacy Policy</Link>.
                  We never share your details.
                </div>
                <button
                  type="submit"
                  disabled={status === 'loading' || !name || !email || !subject || !message}
                  style={{
                    background: '#C9F36E', color: '#0B0907',
                    border: '1px solid #C9F36E',
                    padding: '14px 28px', borderRadius: 6,
                    ...mono, fontSize: 12, letterSpacing: '.1em', textTransform: 'uppercase',
                    cursor: (status === 'loading' || !name || !email || !subject || !message) ? 'not-allowed' : 'pointer',
                    opacity: (status === 'loading' || !name || !email || !subject || !message) ? 0.5 : 1,
                    display: 'inline-flex', alignItems: 'center', gap: 10,
                    flexShrink: 0,
                    transition: 'opacity .15s ease',
                  }}
                >
                  {status === 'loading' ? (
                    <>
                      <span style={{ width: 12, height: 12, border: '2px solid #0B0907', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                      Sending…
                    </>
                  ) : (
                    'Send message →'
                  )}
                </button>
              </div>

            </form>
          )}

          {/* Footer row */}
          <div style={{ marginTop: 80, paddingTop: 48, borderTop: '1px solid #1C1814', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ ...mono, fontSize: 11, letterSpacing: '.1em', color: '#5B544A' }}>
              © {new Date().getFullYear()} CLIQUE CO. · All rights reserved.
            </div>
            <div style={{ display: 'flex', gap: 20 }}>
              <a href="/terms"   style={{ ...mono, fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#5B544A' }}>Terms</a>
              <a href="/privacy" style={{ ...mono, fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#5B544A' }}>Privacy</a>
              <a href="/refund"  style={{ ...mono, fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#5B544A' }}>Refunds</a>
              <a href="/"        style={{ ...mono, fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#5B544A' }}>Home</a>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

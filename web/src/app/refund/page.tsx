import Link from 'next/link';

export const metadata = {
  title: 'Refund & Cancellation Policy — Clique',
  description: 'Clique\'s policy on ticket refunds, event cancellations, and rescheduling.',
};

const mono:    React.CSSProperties = { fontFamily: 'var(--mono)' };
const display: React.CSSProperties = { fontFamily: 'var(--display)' };
const serif:   React.CSSProperties = { fontFamily: 'var(--serif)' };

function Section({ id, label, title, children }: {
  id: string; label: string; title: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <section id={id} style={{ paddingTop: 64, borderTop: '1px solid #1C1814' }}>
      <div style={{ ...mono, fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', color: '#5B544A', marginBottom: 10 }}>
        {label}
      </div>
      <h2 style={{ ...display, fontSize: 'clamp(26px, 3.5vw, 40px)', fontWeight: 700, letterSpacing: '-0.025em', color: '#F2EDE2', marginBottom: 28, lineHeight: 1.1 }}>
        {title}
      </h2>
      <div style={{ ...display, fontSize: 16, lineHeight: 1.75, color: '#C8C2B6', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {children}
      </div>
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p style={{ margin: 0 }}>{children}</p>;
}

function UL({ items }: { items: React.ReactNode[] }) {
  return (
    <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.map((item, i) => (
        <li key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <span style={{ ...mono, fontSize: 11, color: '#C9F36E', marginTop: 3, flexShrink: 0 }}>—</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function XList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.map((item, i) => (
        <li key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <span style={{ ...mono, fontSize: 11, color: '#FF3D6E', marginTop: 3, flexShrink: 0 }}>✕</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function Highlight({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#0F0C09', border: '1px solid #2A2520', borderRadius: 12, padding: '20px 24px', ...display, fontSize: 15, color: '#E8E1D2', lineHeight: 1.7 }}>
      {children}
    </div>
  );
}

function Strong({ children }: { children: React.ReactNode }) {
  return <strong style={{ color: '#F2EDE2', fontWeight: 600 }}>{children}</strong>;
}

function StatusBadge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      ...mono, fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase',
      background: color + '18', color, border: `1px solid ${color}40`,
      borderRadius: 999, padding: '3px 10px', display: 'inline-block',
    }}>
      {label}
    </span>
  );
}

const TOC = [
  { id: 'overview',      label: '01', title: 'Overview' },
  { id: 'general',       label: '02', title: 'General Rule' },
  { id: 'cancellation',  label: '03', title: 'Event Cancellation' },
  { id: 'rescheduling',  label: '04', title: 'Event Rescheduling' },
  { id: 'process',       label: '05', title: 'Refund Process' },
  { id: 'exceptions',    label: '06', title: 'Exceptions' },
  { id: 'fees',          label: '07', title: 'Platform Fees' },
  { id: 'disputes',      label: '08', title: 'Disputes' },
];

export default function RefundPage() {
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
          Refund &amp; Cancellation Policy
        </div>
        <Link href="/signup" style={{ ...mono, fontSize: 12, fontWeight: 500, letterSpacing: '.08em', textTransform: 'uppercase', background: '#C9F36E', color: '#0B0907', padding: '9px 16px', borderRadius: 999 }}>
          Get on the list →
        </Link>
      </nav>

      {/* Header */}
      <header style={{ padding: '80px 40px 60px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ ...mono, fontSize: 11, letterSpacing: '.18em', textTransform: 'uppercase', color: '#5B544A', marginBottom: 18 }}>
          Legal · Effective Date: 2026
        </div>
        <h1 style={{ ...display, fontSize: 'clamp(42px, 6vw, 80px)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1, color: '#F2EDE2', margin: 0 }}>
          Refund &amp;<br />
          <span style={{ ...serif, fontStyle: 'italic', color: '#C9F36E' }}>Cancellation</span>
        </h1>
        <p style={{ ...display, fontSize: 18, lineHeight: 1.5, color: '#C8C2B6', maxWidth: 640, marginTop: 28 }}>
          A straightforward guide to how tickets, cancellations, and refunds work on Clique — for attendees and hosts alike.
        </p>
      </header>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 40px 120px', display: 'grid', gridTemplateColumns: '220px 1fr', gap: 72, alignItems: 'start' }}>

        {/* TOC sidebar */}
        <aside style={{ position: 'sticky', top: 80 }}>
          <div style={{ ...mono, fontSize: 10, letterSpacing: '.16em', textTransform: 'uppercase', color: '#5B544A', marginBottom: 14 }}>
            Contents
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {TOC.map((item) => (
              <a key={item.id} href={`#${item.id}`} style={{
                display: 'flex', gap: 10, alignItems: 'baseline',
                padding: '5px 0',
                ...mono, fontSize: 11, color: '#5B544A', letterSpacing: '.04em',
              }}>
                <span style={{ fontSize: 9, color: '#2A2520', flexShrink: 0 }}>{item.label}</span>
                {item.title}
              </a>
            ))}
          </nav>

          <div style={{ marginTop: 32, paddingTop: 20, borderTop: '1px solid #1C1814' }}>
            <div style={{ ...mono, fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: '#5B544A', marginBottom: 10 }}>
              Need a refund?
            </div>
            <a href="/contact" style={{ ...display, fontSize: 13, color: '#C9F36E' }}>
              Contact support →
            </a>
          </div>
        </aside>

        {/* Main content */}
        <main style={{ display: 'flex', flexDirection: 'column', gap: 56 }}>

          {/* 01 Overview */}
          <Section id="overview" label="01 — Overview" title="Overview">
            <P>Clique is a social platform that connects event hosts with attendees. Hosts independently list, manage, and may cancel or reschedule their events. This policy governs how ticket purchases, cancellations, and refunds are handled across the platform.</P>
            <Highlight>
              Tickets booked on Clique are <Strong>generally non-refundable</Strong> unless an event is explicitly cancelled or rescheduled by the host. When a host cancels, refunds are processed automatically.
            </Highlight>
            <P>This policy applies to all bookings made through Clique, regardless of whether tickets were free or paid.</P>
          </Section>

          {/* 02 General Rule */}
          <Section id="general" label="02 — General Rule" title={<>Tickets Are <span style={{ ...serif, fontStyle: 'italic', color: '#C9F36E' }}>Non-Refundable</span></>}>
            <P>Once a ticket is booked and confirmed, it is non-refundable under ordinary circumstances. This applies to:</P>
            <XList items={[
              'Change of personal plans or travel conflicts.',
              'Forgetting about the event or being unable to attend.',
              'Dissatisfaction with the event after attendance.',
              'Requests made after the event date has passed.',
              'Tickets transferred or sold to another person outside the platform.',
            ]} />
            <P>Hosts set their own refund policies for individual events. Where a host offers a specific refund window (e.g. "full refund if cancelled 48 hours before"), that policy is displayed on the event page and takes precedence over this general rule.</P>
            <Highlight>
              <Strong>Always read the event-level refund policy</Strong> before booking. It is shown on the event detail page under &quot;Refund Policy.&quot;
            </Highlight>
          </Section>

          {/* 03 Event Cancellation */}
          <Section id="cancellation" label="03 — Cancellation" title={<>Event <span style={{ ...serif, fontStyle: 'italic', color: '#C9F36E' }}>Cancellation</span> by Host</>}>
            <P>If a host cancels their event, all confirmed ticket holders are entitled to a <Strong>full refund</Strong> of the ticket price paid.</P>

            <div style={{ background: '#0C160A', border: '1px solid #1F2E12', borderRadius: 12, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ ...mono, fontSize: 10, letterSpacing: '.14em', color: '#6A9B40', marginBottom: 4 }}>WHAT HAPPENS WHEN AN EVENT IS CANCELLED</div>
              <UL items={[
                <><Strong>Automatic notification:</Strong> All ticket holders receive an in-app notification and push alert immediately when the host cancels.</>,
                <><Strong>Automatic refund:</Strong> Refunds are initiated automatically — you do not need to request one.</>,
                <><Strong>Timeline:</Strong> Refunds are processed to your original payment method within <Strong>5–7 business days</Strong> from the date of cancellation.</>,
                <><Strong>Confirmation:</Strong> You will receive a refund confirmation notification once the amount has been credited.</>,
              ]} />
            </div>

            <P>Refunds are credited to the same payment method used at the time of booking (UPI, card, net banking, or wallet). If the original payment method is no longer active, please contact our support team.</P>
          </Section>

          {/* 04 Rescheduling */}
          <Section id="rescheduling" label="04 — Rescheduling" title="Event Rescheduling by Host">
            <P>If a host reschedules an event to a new date or time, ticket holders will be notified of the change. In this case:</P>
            <UL items={[
              'Your existing ticket remains valid for the new date by default.',
              'If you cannot attend the rescheduled date, you may request a full refund within the window communicated in the rescheduling notice (typically 48–72 hours).',
              'Refund requests outside this window are subject to host approval.',
            ]} />
            <Highlight>
              Rescheduling notices are sent via push notification and in-app message. Check your Passes tab for the updated event details.
            </Highlight>
          </Section>

          {/* 05 Refund Process */}
          <Section id="process" label="05 — Process" title="How Refunds Are Processed">
            <P>All refunds on Clique are processed through our payment partner. Here is what to expect:</P>

            <div style={{ border: '1px solid #2A2520', borderRadius: 12, overflow: 'hidden' }}>
              {[
                ['Day 0',    'Event cancelled / rescheduling window closes',   <StatusBadge key="a" label="Trigger" color="#7DB4FF" />],
                ['Day 0–1',  'Refund initiated to payment gateway',            <StatusBadge key="b" label="Processing" color="#E8C46E" />],
                ['Day 1–3',  'Payment gateway processes the reversal',         <StatusBadge key="c" label="In Transit" color="#E8C46E" />],
                ['Day 5–7',  'Amount credited to your original payment method',<StatusBadge key="d" label="Credited" color="#C9F36E" />],
              ].map(([day, desc, badge], i, arr) => (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '80px 1fr auto',
                  alignItems: 'center', gap: 16, padding: '14px 20px',
                  borderBottom: i < arr.length - 1 ? '1px solid #1C1814' : 'none',
                  background: i % 2 === 0 ? 'transparent' : '#0F0C09',
                }}>
                  <div style={{ ...mono, fontSize: 11, color: '#5B544A', letterSpacing: '.06em' }}>{day}</div>
                  <div style={{ ...display, fontSize: 14, color: '#C8C2B6' }}>{desc}</div>
                  <div>{badge}</div>
                </div>
              ))}
            </div>

            <P>Bank processing times may vary. If you have not received your refund after 7 business days, please contact your bank before reaching out to Clique support.</P>
          </Section>

          {/* 06 Exceptions */}
          <Section id="exceptions" label="06 — Exceptions" title="Exceptions &amp; Special Cases">
            <P>Refunds outside the standard cancellation/rescheduling scenarios may be considered in exceptional cases, at Clique&apos;s sole discretion:</P>
            <UL items={[
              <><Strong>Technical failure:</Strong> If a payment was charged but a booking confirmation was not issued due to a platform error, a refund will be processed in full.</>,
              <><Strong>Duplicate charges:</Strong> If you were charged more than once for the same booking, the duplicate charge will be refunded within 3 business days.</>,
              <><Strong>Fraudulent booking:</Strong> If your account was compromised and a booking was made without your knowledge, contact support immediately. Refunds are subject to investigation.</>,
            ]} />
            <P>To raise an exceptional refund request, contact our support team with your booking reference number and a description of the issue.</P>
          </Section>

          {/* 07 Platform Fees */}
          <Section id="fees" label="07 — Fees" title="Platform Fees">
            <P>Clique charges a small platform fee on paid bookings. This fee covers payment processing, infrastructure, and platform operations.</P>
            <XList items={[
              'Platform fees are non-refundable even when a full refund is issued for a cancelled event.',
              'The platform fee is shown separately at checkout before you confirm a booking.',
            ]} />
            <P>In practice, for host-cancelled events, Clique absorbs the platform fee and refunds the full ticket face value to the attendee.</P>
          </Section>

          {/* 08 Disputes */}
          <Section id="disputes" label="08 — Disputes" title="Booking Disputes">
            <P>If you believe a refund was incorrectly denied or not received:</P>
            <UL items={[
              'First confirm the refund timeline above has fully elapsed (up to 7 business days).',
              'Check your bank statement for a pending credit under the original transaction.',
              <>Contact Clique support at <a href="mailto:support@clique.app" style={{ color: '#C9F36E' }}>support@clique.app</a> with your booking ID and payment reference.</>,
              'If the dispute remains unresolved, you may file a chargeback with your card issuer or bank.',
            ]} />
            <Highlight>
              Clique will never ask you to share your full card number, CVV, OTP, or password to process a refund. If you receive such a request, it is fraudulent — report it immediately.
            </Highlight>
          </Section>

          {/* Footer row */}
          <div style={{ paddingTop: 48, borderTop: '1px solid #1C1814', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ ...mono, fontSize: 11, letterSpacing: '.1em', color: '#5B544A' }}>
              © {new Date().getFullYear()} CLIQUE CO. · All rights reserved.
            </div>
            <div style={{ display: 'flex', gap: 20 }}>
              <a href="/terms"    style={{ ...mono, fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#5B544A' }}>Terms</a>
              <a href="/privacy"  style={{ ...mono, fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#5B544A' }}>Privacy</a>
              <a href="/contact"  style={{ ...mono, fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#5B544A' }}>Contact</a>
              <a href="/"         style={{ ...mono, fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#5B544A' }}>Home</a>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}

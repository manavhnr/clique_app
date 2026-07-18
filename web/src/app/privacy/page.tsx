import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy — Clique',
  description: 'How Clique collects, uses, and protects your personal data.',
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

function DataTable({ rows }: { rows: [string, string, string][] }) {
  return (
    <div style={{ border: '1px solid #2A2520', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', background: '#0F0C09', borderBottom: '1px solid #2A2520' }}>
        {['Data Type', 'Purpose', 'Retention'].map((h) => (
          <div key={h} style={{ ...mono, fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: '#5B544A', padding: '12px 16px' }}>{h}</div>
        ))}
      </div>
      {rows.map(([type, purpose, retention], i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: i < rows.length - 1 ? '1px solid #1C1814' : 'none' }}>
          <div style={{ ...display, fontSize: 14, color: '#E8E1D2', padding: '14px 16px', fontWeight: 500 }}>{type}</div>
          <div style={{ ...display, fontSize: 14, color: '#C8C2B6', padding: '14px 16px' }}>{purpose}</div>
          <div style={{ ...mono, fontSize: 12, color: '#5B544A', padding: '14px 16px' }}>{retention}</div>
        </div>
      ))}
    </div>
  );
}

const TOC = [
  { id: 'overview',    label: '01', title: 'Overview' },
  { id: 'collect',     label: '02', title: 'Data We Collect' },
  { id: 'use',         label: '03', title: 'How We Use Your Data' },
  { id: 'sharing',     label: '04', title: 'Sharing & Disclosure' },
  { id: 'retention',   label: '05', title: 'Data Retention' },
  { id: 'security',    label: '06', title: 'Security' },
  { id: 'rights',      label: '07', title: 'Your Rights' },
  { id: 'cookies',     label: '08', title: 'Cookies & Tracking' },
  { id: 'children',    label: '09', title: 'Children\'s Privacy' },
  { id: 'transfers',   label: '10', title: 'International Transfers' },
  { id: 'dpdpa',       label: '11', title: 'DPDPA 2023 Compliance' },
  { id: 'changes',     label: '12', title: 'Policy Changes' },
  { id: 'contact',     label: '13', title: 'Contact Us' },
];

export default function PrivacyPage() {
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
          Privacy Policy
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
          Privacy<br />
          <span style={{ ...serif, fontStyle: 'italic', color: '#C9F36E' }}>Policy</span>
        </h1>
        <p style={{ ...display, fontSize: 18, lineHeight: 1.5, color: '#C8C2B6', maxWidth: 640, marginTop: 28 }}>
          Clique is built on trust. This policy explains exactly what personal data we collect, why we collect it, how we protect it, and the rights you have over it — in plain language, no filler.
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
        </aside>

        {/* Main content */}
        <main style={{ display: 'flex', flexDirection: 'column', gap: 56 }}>

          {/* 01 Overview */}
          <Section id="overview" label="01 — Overview" title="Overview">
            <P>Clique (&quot;we,&quot; &quot;our,&quot; &quot;us&quot;) operates the Clique application and website (the &quot;Platform&quot;). We are committed to protecting your personal data and respecting your privacy.</P>
            <Highlight>
              We collect only what we need. We never sell your data. We store it securely. You can delete it at any time.
            </Highlight>
            <P>This Privacy Policy applies to all users of the Clique Platform — Guests, Hosts, and visitors. By using the Platform, you consent to the practices described in this Policy.</P>
            <P>This Policy is subject to, and must be read alongside, our <a href="/terms" style={{ color: '#C9F36E', textDecoration: 'underline' }}>Terms of Service</a>.</P>
          </Section>

          {/* 02 Data We Collect */}
          <Section id="collect" label="02 — Data Collected" title={<>Data We <span style={{ ...serif, fontStyle: 'italic', color: '#C9F36E' }}>Collect</span></>}>
            <P>We collect the following categories of personal data:</P>

            <div style={{ ...mono, fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: '#5B544A', paddingTop: 8 }}>
              Identity & Contact Data
            </div>
            <UL items={[
              'Mobile phone number (required for OTP-based login)',
              'Full name and username',
              'Date of birth and gender',
              'Profile photo (optional)',
              'Email address (optional)',
              'City of residence',
            ]} />

            <div style={{ ...mono, fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: '#5B544A', paddingTop: 8 }}>
              Activity & Usage Data
            </div>
            <UL items={[
              'Posts, comments, and likes you create on the Platform',
              'Events you view, save, book, or attend',
              'Search queries you make',
              'Follows, blocks, and social connections',
              'Your Cliquescore and engagement history',
              'Device type, OS version, and app version',
              'IP address and approximate location derived from it',
            ]} />

            <div style={{ ...mono, fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: '#5B544A', paddingTop: 8 }}>
              Location Data
            </div>
            <UL items={[
              'Precise GPS location — only when you actively use "Events Near Me" and only with your explicit in-app permission',
              'City-level location from your profile (set by you)',
              'We do not track your location in the background',
            ]} />

            <div style={{ ...mono, fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: '#5B544A', paddingTop: 8 }}>
              Payment & Booking Data
            </div>
            <UL items={[
              'Booking records (event, date, amount, status)',
              'QR pass details (token hash — never the raw token)',
              'Payment status and transaction reference IDs from Razorpay',
              'We never store your full card number, CVV, or bank credentials — all payment processing is handled by Razorpay',
            ]} />

            <div style={{ ...mono, fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: '#5B544A', paddingTop: 8 }}>
              Host Verification Data (Hosts only)
            </div>
            <UL items={[
              'Government-issued identity document',
              'Event venue address and images',
              'Selfie for identity verification (optional)',
              'Bank account details for payment settlement',
            ]} />
          </Section>

          {/* 03 How We Use */}
          <Section id="use" label="03 — Usage" title={<>How We Use <span style={{ ...serif, fontStyle: 'italic', color: '#C9F36E' }}>Your Data</span></>}>
            <DataTable rows={[
              ['Phone number',          'OTP authentication & account recovery',        '3 years after last login'],
              ['Name & username',       'Profile, social identity, discovery',           'Until account deletion'],
              ['Location (GPS)',        'Events Near Me — only when you use it',        'Not stored — session only'],
              ['Booking & payments',   'Ticket fulfilment, refunds, disputes',          '7 years (legal obligation)'],
              ['Posts & activity',     'Social feed, recommendations, moderation',      'Until deleted by you'],
              ['Device & IP',          'Security, fraud prevention, abuse detection',   '90 days rolling'],
              ['Host documents',       'Verification review by Clique admin',           '3 years post-verification'],
            ]} />
            <P>We use your personal data for the following purposes, relying on the legal bases indicated:</P>
            <UL items={[
              <><Strong>Contract performance:</Strong> Processing bookings, issuing QR passes, settling host payments, handling refunds.</>,
              <><Strong>Legitimate interests:</Strong> Operating the social feed, detecting fraud, preventing abuse, improving the Platform, sending transactional notifications.</>,
              <><Strong>Consent:</Strong> Sending promotional push notifications (you can opt out at any time in Settings), accessing your GPS location for Near Me features.</>,
              <><Strong>Legal obligation:</Strong> Retaining payment records and responding to lawful government or court requests.</>,
            ]} />
          </Section>

          {/* 04 Sharing */}
          <Section id="sharing" label="04 — Sharing" title="Sharing & Disclosure">
            <Highlight>
              We do not sell, rent, or trade your personal data to any third party, ever.
            </Highlight>
            <P>We share data only in the following limited circumstances:</P>
            <UL items={[
              <><Strong>Payment processor (Razorpay):</Strong> To process payments. Razorpay has its own privacy policy and is PCI-DSS compliant.</>,
              <><Strong>Cloud infrastructure:</Strong> We use cloud hosting services (e.g., AWS, Render) to store data. These providers are under contractual obligations to protect your data.</>,
              <><Strong>Push notification services:</Strong> FCM (Firebase Cloud Messaging) or APNs to deliver notifications. Only your device token is shared — no personal data.</>,
              <><Strong>Hosts (limited):</Strong> When you book an event, the Host can see your name and that you hold a valid pass. They do not receive your phone number, payment details, or any other data.</>,
              <><Strong>Law enforcement:</Strong> We disclose data to government authorities or courts only where required by applicable Indian law, and we will notify you where legally permitted to do so.</>,
              <><Strong>Business transfer:</Strong> If Clique is acquired or merges with another entity, your data may be transferred as part of that transaction, with prior notice to you.</>,
            ]} />
          </Section>

          {/* 05 Retention */}
          <Section id="retention" label="05 — Retention" title="Data Retention">
            <P>We retain your personal data only for as long as necessary for the purposes set out in this Policy or as required by law.</P>
            <UL items={[
              'Account data: retained while your account is active. Deleted within 30 days of account deletion request, subject to legal holds.',
              'Payment and booking records: retained for 7 years to comply with Indian financial and tax regulations.',
              'Host verification documents: retained for 3 years after the verification decision.',
              'Posts and social content: deleted when you delete them, or within 30 days of account deletion.',
              'Device and IP logs: retained for 90 days on a rolling basis for security and fraud purposes.',
              'Anonymised, aggregated analytics data: retained indefinitely (not linked to you).',
            ]} />
          </Section>

          {/* 06 Security */}
          <Section id="security" label="06 — Security" title="Security">
            <P>We implement appropriate technical and organisational measures to protect your personal data against unauthorised access, loss, destruction, or alteration.</P>
            <UL items={[
              'All data in transit is encrypted using TLS 1.2 or higher.',
              'Passwords and OTP tokens are never stored in plain text.',
              'QR pass tokens are hashed — raw tokens are never stored.',
              'Payment data is handled exclusively by Razorpay (PCI-DSS Level 1). We never receive or store card details.',
              'Access to production databases is restricted to authorised personnel only, with audit logging.',
              'We conduct periodic security reviews and penetration tests.',
            ]} />
            <Highlight>
              No system is 100% secure. If you suspect your account has been compromised, contact us immediately at privacy@clique.app.
            </Highlight>
          </Section>

          {/* 07 Your Rights */}
          <Section id="rights" label="07 — Your Rights" title={<>Your <span style={{ ...serif, fontStyle: 'italic', color: '#C9F36E' }}>Rights</span></>}>
            <P>Under the Digital Personal Data Protection Act 2023 (India) and applicable law, you have the following rights:</P>
            <UL items={[
              <><Strong>Right to access:</Strong> You can request a copy of the personal data we hold about you.</>,
              <><Strong>Right to correction:</Strong> You can update or correct inaccurate data directly in the app (Profile → Edit Profile) or by contacting us.</>,
              <><Strong>Right to erasure:</Strong> You can delete your account at any time. We will erase your personal data within 30 days, except where retention is required by law.</>,
              <><Strong>Right to withdraw consent:</Strong> Where processing is based on consent (e.g., push notifications, GPS), you can withdraw consent at any time in Settings without affecting prior processing.</>,
              <><Strong>Right to nominate:</Strong> Under DPDPA 2023, you may nominate another individual to exercise your rights in the event of your death or incapacity.</>,
              <><Strong>Right to grievance redressal:</Strong> You may raise a grievance with our Data Protection Officer (DPO) and, if unresolved, with the Data Protection Board of India.</>,
            ]} />
            <P>To exercise any of these rights, email us at <a href="mailto:privacy@clique.app" style={{ color: '#C9F36E' }}>privacy@clique.app</a> or use the in-app support feature. We will respond within 30 days.</P>
          </Section>

          {/* 08 Cookies */}
          <Section id="cookies" label="08 — Cookies" title="Cookies & Tracking">
            <P>The Clique mobile app does not use browser cookies. The Clique web platform uses the following minimal set of technologies:</P>
            <UL items={[
              <><Strong>Session storage:</Strong> A short-lived token stored in memory to maintain your login session. Cleared when you close the browser.</>,
              <><Strong>Local storage:</Strong> Your JWT authentication token, stored securely to keep you logged in across sessions. You can clear this by logging out.</>,
              <><Strong>Analytics (self-hosted):</Strong> We may collect anonymised usage metrics (page views, feature usage) to improve the Platform. This data is not linked to your identity.</>,
              'We do not use third-party advertising cookies or tracking pixels.',
              'We do not use Google Analytics or Meta Pixel on the Platform.',
            ]} />
          </Section>

          {/* 09 Children */}
          <Section id="children" label="09 — Children" title="Children's Privacy">
            <Highlight>
              Clique is strictly for users aged 18 and above. We do not knowingly collect personal data from anyone under 18.
            </Highlight>
            <P>If you believe a minor has registered on the Platform, please contact us immediately at <a href="mailto:privacy@clique.app" style={{ color: '#C9F36E' }}>privacy@clique.app</a> and we will delete the account and all associated data promptly.</P>
          </Section>

          {/* 10 International */}
          <Section id="transfers" label="10 — Transfers" title="International Transfers">
            <P>Clique is operated from India. If you access the Platform from outside India, your data may be processed in India or in other countries where our cloud providers operate.</P>
            <P>We ensure that any transfer of personal data outside India is made only to countries or recipients that provide adequate levels of data protection, or is subject to appropriate safeguards such as contractual clauses.</P>
          </Section>

          {/* 11 DPDPA */}
          <Section id="dpdpa" label="11 — DPDPA 2023" title={<>DPDPA 2023 <span style={{ ...serif, fontStyle: 'italic', color: '#C9F36E' }}>Compliance</span></>}>
            <P>Clique is committed to compliance with the <Strong>Digital Personal Data Protection Act, 2023</Strong> (India). The following measures are in place:</P>
            <UL items={[
              <><Strong>Consent:</Strong> We obtain explicit, informed consent before collecting personal data, presented in clear language at the point of collection.</>,
              <><Strong>Purpose limitation:</Strong> We collect data only for the purposes stated in this Policy and do not process it for incompatible purposes.</>,
              <><Strong>Data minimisation:</Strong> We collect only the data necessary for each purpose.</>,
              <><Strong>Data Principal Rights:</Strong> We honour all rights of Data Principals (users) under the DPDPA 2023, including access, correction, erasure, grievance redressal, and nomination.</>,
              <><Strong>Data Fiduciary obligations:</Strong> As a Data Fiduciary, Clique maintains a record of processing activities and has appointed a Data Protection Officer.</>,
              <><Strong>Breach notification:</Strong> In the event of a personal data breach, we will notify the Data Protection Board of India and affected users within the timeframes required by law.</>,
            ]} />
            <P>Our Data Protection Officer can be reached at <a href="mailto:dpo@clique.app" style={{ color: '#C9F36E' }}>dpo@clique.app</a>.</P>
          </Section>

          {/* 12 Changes */}
          <Section id="changes" label="12 — Changes" title="Policy Changes">
            <P>We may update this Privacy Policy from time to time. When we make material changes, we will:</P>
            <UL items={[
              'Update the effective date at the top of this Policy.',
              'Send a push notification and/or in-app message to all active users.',
              'Where required by law, obtain fresh consent.',
            ]} />
            <P>Continued use of the Platform after the effective date of a revised Policy constitutes your acceptance of the changes.</P>
          </Section>

          {/* 13 Contact */}
          <Section id="contact" label="13 — Contact" title="Contact Us">
            <P>If you have questions, concerns, or requests relating to this Privacy Policy or your personal data, please reach out:</P>
            <Highlight>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div><span style={{ ...mono, fontSize: 11, color: '#5B544A', letterSpacing: '.1em', textTransform: 'uppercase' }}>Privacy enquiries</span><br /><a href="mailto:privacy@clique.app" style={{ color: '#C9F36E' }}>privacy@clique.app</a></div>
                <div><span style={{ ...mono, fontSize: 11, color: '#5B544A', letterSpacing: '.1em', textTransform: 'uppercase' }}>Data Protection Officer</span><br /><a href="mailto:dpo@clique.app" style={{ color: '#C9F36E' }}>dpo@clique.app</a></div>
                <div><span style={{ ...mono, fontSize: 11, color: '#5B544A', letterSpacing: '.1em', textTransform: 'uppercase' }}>Response time</span><br /><span style={{ ...display, fontSize: 15, color: '#E8E1D2' }}>Within 30 days</span></div>
              </div>
            </Highlight>
          </Section>

          {/* Footer row */}
          <div style={{ paddingTop: 48, borderTop: '1px solid #1C1814', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ ...mono, fontSize: 11, letterSpacing: '.1em', color: '#5B544A' }}>
              © {new Date().getFullYear()} CLIQUE CO. · All rights reserved.
            </div>
            <div style={{ display: 'flex', gap: 20 }}>
              <a href="/terms"   style={{ ...mono, fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#5B544A' }}>Terms</a>
              <a href="/conduct" style={{ ...mono, fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#5B544A' }}>Conduct</a>
              <a href="/refund"  style={{ ...mono, fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#5B544A' }}>Refunds</a>
              <a href="/contact" style={{ ...mono, fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#5B544A' }}>Contact</a>
              <a href="/"        style={{ ...mono, fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#5B544A' }}>Home</a>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}

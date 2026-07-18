import Link from 'next/link';

export const metadata = {
  title: 'Code of Conduct — Clique',
  description: 'The community standards that make Clique a space worth showing up to.',
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

function DontList({ items }: { items: React.ReactNode[] }) {
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

function TwoCol({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      <div style={{ background: '#0C160A', border: '1px solid #1F2E12', borderRadius: 12, padding: '20px 20px' }}>
        <div style={{ ...mono, fontSize: 10, letterSpacing: '.14em', color: '#6A9B40', marginBottom: 12 }}>DO</div>
        {left}
      </div>
      <div style={{ background: '#160A0A', border: '1px solid #2E1212', borderRadius: 12, padding: '20px 20px' }}>
        <div style={{ ...mono, fontSize: 10, letterSpacing: '.14em', color: '#9B4040', marginBottom: 12 }}>DON&apos;T</div>
        {right}
      </div>
    </div>
  );
}

const TOC = [
  { id: 'spirit',      label: '01', title: 'The Spirit of Clique' },
  { id: 'everyone',   label: '02', title: 'For Everyone' },
  { id: 'guests',     label: '03', title: 'For Guests' },
  { id: 'hosts',      label: '04', title: 'For Hosts' },
  { id: 'content',    label: '05', title: 'Content Standards' },
  { id: 'safety',     label: '06', title: 'Safety & Zero Tolerance' },
  { id: 'reporting',  label: '07', title: 'Reporting Violations' },
  { id: 'enforcement',label: '08', title: 'Enforcement' },
  { id: 'appeal',     label: '09', title: 'Appeals' },
];

export default function ConductPage() {
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
          Code of Conduct
        </div>
        <Link href="/signup" style={{ ...mono, fontSize: 12, fontWeight: 500, letterSpacing: '.08em', textTransform: 'uppercase', background: '#C9F36E', color: '#0B0907', padding: '9px 16px', borderRadius: 999 }}>
          Get on the list →
        </Link>
      </nav>

      {/* Header */}
      <header style={{ padding: '80px 40px 60px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ ...mono, fontSize: 11, letterSpacing: '.18em', textTransform: 'uppercase', color: '#5B544A', marginBottom: 18 }}>
          Community · Effective Date: 2026
        </div>
        <h1 style={{ ...display, fontSize: 'clamp(42px, 6vw, 80px)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1, color: '#F2EDE2', margin: 0 }}>
          Code of<br />
          <span style={{ ...serif, fontStyle: 'italic', color: '#C9F36E' }}>Conduct</span>
        </h1>
        <p style={{ ...display, fontSize: 18, lineHeight: 1.5, color: '#C8C2B6', maxWidth: 640, marginTop: 28 }}>
          Clique is a space for real connection — not performative nightlife. These are the standards that keep it that way. Everyone on the Platform, from first-time guests to seasoned hosts, is held to them equally.
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

          {/* 01 Spirit */}
          <Section id="spirit" label="01 — The Spirit" title={<>The Spirit of <span style={{ ...serif, fontStyle: 'italic', color: '#C9F36E' }}>Clique</span></>}>
            <P>Clique exists because real social experiences — house parties, listening rooms, underground nights — deserve a platform that matches their energy. We built this for people who show up, contribute to the room, and leave it better than they found it.</P>
            <Highlight>
              The golden rule: treat every event, host, and guest as you would if you were standing in front of them. Because you probably will be.
            </Highlight>
            <P>This Code of Conduct is not an exhaustive rulebook. It is a set of principles. If something feels wrong even though it is not explicitly listed here, it probably is wrong, and we will treat it accordingly.</P>
          </Section>

          {/* 02 Everyone */}
          <Section id="everyone" label="02 — Everyone" title="For Everyone">
            <P>These standards apply to all users of the Platform at all times — both online (on the app) and in person (at events).</P>
            <TwoCol
              left={
                <UL items={[
                  'Be honest in your profile, posts, and interactions',
                  'Respect other people\'s boundaries, space, and consent',
                  'Take responsibility for your own behaviour',
                  'Report things that feel wrong — even if you\'re unsure',
                  'Engage with good faith, even in disagreement',
                  'Leave every space you enter better than you found it',
                ]} />
              }
              right={
                <DontList items={[
                  'Impersonate another person or create fake accounts',
                  'Harass, intimidate, or threaten anyone online or offline',
                  'Share private information about others without consent',
                  'Use the Platform to coordinate illegal activities',
                  'Manipulate reviews, ratings, or Cliquescores',
                  'Evade bans by creating new accounts',
                ]} />
              }
            />
          </Section>

          {/* 03 Guests */}
          <Section id="guests" label="03 — Guests" title="For Guests">
            <P>When you book an event through Clique, you are entering a private space that someone has opened to you. That is a privilege, not a right.</P>
            <UL items={[
              <><Strong>Arrive with your QR pass.</Strong> Your pass is non-transferable. Do not share, sell, or copy it.</>,
              <><Strong>Follow the host&apos;s rules.</Strong> Dress codes, capacity limits, age restrictions — these are not suggestions.</>,
              <><Strong>Respect the space.</Strong> Whether it&apos;s someone&apos;s home or a rented venue, treat it as you would a guest in your own home.</>,
              <><Strong>No uninvited guests.</Strong> Bringing additional people not on the list puts hosts in a difficult position and may result in removal.</>,
              <><Strong>Be present.</Strong> Do not spend the event organising competing gatherings or recruiting people away from the host&apos;s event.</>,
              <><Strong>Check in promptly.</Strong> No-shows affect the host&apos;s revenue and capacity planning. If you can&apos;t make it, cancel in advance.</>,
            ]} />
            <Highlight>
              Repeated no-shows without cancellation will affect your Cliquescore and may restrict your ability to book future events.
            </Highlight>
          </Section>

          {/* 04 Hosts */}
          <Section id="hosts" label="04 — Hosts" title="For Hosts">
            <P>Hosts are the backbone of Clique. You are not just event organisers — you are community builders. With that comes responsibility.</P>
            <UL items={[
              <><Strong>List accurately.</Strong> Your event description, images, capacity, location, and start time must be truthful and up to date. Misleading listings will be removed.</>,
              <><Strong>Ticket exclusivity.</Strong> All entry must be through Clique-issued QR passes. Walk-ins, side-door lists, and third-party pass holders are not permitted.</>,
              <><Strong>Communicate changes promptly.</Strong> If anything about your event changes — time, location, cancellation — inform Clique and your guests immediately.</>,
              <><Strong>Create a safe environment.</Strong> You are responsible for the physical safety of your guests. This includes fire exits, capacity compliance, and appropriate lighting.</>,
              <><Strong>Respect your guests&apos; data.</Strong> You receive only name and pass status. Do not request, record, or retain additional personal information from guests.</>,
              <><Strong>No discrimination.</Strong> You may not refuse entry or treat guests differently based on caste, religion, gender, sexual orientation, disability, or any other protected characteristic.</>,
              <><Strong>Alcohol and substance rules.</Strong> If alcohol is available, you must comply with all licensing requirements. You are responsible for age verification. No illegal substances, ever.</>,
            ]} />
          </Section>

          {/* 05 Content */}
          <Section id="content" label="05 — Content" title="Content Standards">
            <P>Everything posted on Clique — photos, videos, event listings, captions, comments — must meet these standards.</P>

            <div style={{ ...mono, fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: '#5B544A', paddingTop: 8 }}>
              Allowed
            </div>
            <UL items={[
              'Genuine photos and videos from events you attended or hosted',
              'Honest event listings with accurate information',
              'Creative expression — art, music, style, culture',
              'Discussion and commentary, including criticism, expressed respectfully',
              'Promotional content for events listed on the Platform',
            ]} />

            <div style={{ ...mono, fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: '#5B544A', paddingTop: 8 }}>
              Not Allowed
            </div>
            <DontList items={[
              'Content that promotes, glorifies, or depicts illegal substances or activities',
              'Alcohol or tobacco brand promotion of any kind',
              'Nudity or sexually explicit content',
              'Hate speech, slurs, or content targeting people by protected characteristics',
              'Graphic violence or content designed to shock or disturb',
              'Content that reveals private information about others without consent (doxxing)',
              'Spam, scams, phishing, or coordinated inauthentic behaviour',
              'AI-generated content misrepresented as real event footage',
              'Content that infringes third-party copyright or trademarks',
            ]} />
          </Section>

          {/* 06 Safety */}
          <Section id="safety" label="06 — Safety" title={<>Safety &amp; <span style={{ ...serif, fontStyle: 'italic', color: '#FF3D6E' }}>Zero Tolerance</span></>}>
            <Highlight>
              There are some behaviours for which there is no warning, no second chance, and no appeal. We remove accounts immediately and permanently for these.
            </Highlight>
            <DontList items={[
              'Sexual harassment or assault of any guest, host, or staff member — online or in person',
              'Threatening, stalking, or intimidating another user',
              'Physical violence or incitement to violence',
              'Posting or distributing non-consensual intimate imagery (NCII)',
              'Child sexual abuse material (CSAM) — reported to law enforcement immediately',
              'Operating a fraudulent event to collect payment with no intention of running it',
              'Systematic manipulation of the QR entry system to allow unpaid guests',
            ]} />
            <P>If you witness any of the above at an event or on the Platform, leave the situation if you are in immediate danger and report it to us and, where appropriate, to law enforcement.</P>
          </Section>

          {/* 07 Reporting */}
          <Section id="reporting" label="07 — Reporting" title="Reporting Violations">
            <P>Every piece of content and every user profile on Clique has a report button. Use it. Reporting is anonymous — the person you report will not know you reported them.</P>
            <UL items={[
              <><Strong>Posts & comments:</Strong> Tap the three-dot menu → Report.</>,
              <><Strong>User profiles:</Strong> Visit their profile → Report.</>,
              <><Strong>Event listings:</Strong> Open the event → Report Event.</>,
              <><Strong>In-person incidents at events:</Strong> Email <a href="mailto:safety@clique.app" style={{ color: '#C9F36E' }}>safety@clique.app</a> or use the in-app support feature.</>,
              <><Strong>Urgent safety situations:</Strong> Call emergency services (100/112) first. Then report to us.</>,
            ]} />
            <P>We review all reports. We will not always be able to share the outcome with you, but every report is read by a human and every credible concern is acted on.</P>
          </Section>

          {/* 08 Enforcement */}
          <Section id="enforcement" label="08 — Enforcement" title="Enforcement">
            <P>When a violation is reported or detected, Clique may take any of the following actions, depending on the severity and context:</P>
            <UL items={[
              <><Strong>Warning:</Strong> A formal notice sent to the account. Minor or first-time violations.</>,
              <><Strong>Content removal:</Strong> The offending post, comment, or listing is taken down.</>,
              <><Strong>Temporary suspension:</Strong> Account access restricted for a defined period (1–30 days).</>,
              <><Strong>Permanent ban:</Strong> Account permanently disabled. No refunds on any bookings or event revenue held at time of ban for zero-tolerance violations.</>,
              <><Strong>Legal referral:</Strong> For serious offences (CSAM, fraud, physical violence), we will report to law enforcement and cooperate fully with any investigation.</>,
            ]} />
            <P>We may take action without prior notice where the situation demands it. We may also take into account a user&apos;s history on the Platform when deciding on consequences.</P>
          </Section>

          {/* 09 Appeals */}
          <Section id="appeal" label="09 — Appeals" title="Appeals">
            <P>If you believe an enforcement action was taken in error, you can appeal within <Strong>14 days</Strong> of the action.</P>
            <UL items={[
              <>Email <a href="mailto:appeals@clique.app" style={{ color: '#C9F36E' }}>appeals@clique.app</a> with the subject line &quot;Appeal — [your username]&quot;.</>,
              'Explain why you believe the action was incorrect and provide any supporting context.',
              'We will review your appeal and respond within 7 business days.',
              'Appeals are reviewed by a team member who was not involved in the original decision.',
              'Zero-tolerance violations (see §06) are not eligible for appeal.',
            ]} />
            <Highlight>
              We will not reverse a decision simply because you disagree with it. New information or clear procedural error are the grounds for a successful appeal.
            </Highlight>
          </Section>

          {/* Footer row */}
          <div style={{ paddingTop: 48, borderTop: '1px solid #1C1814', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ ...mono, fontSize: 11, letterSpacing: '.1em', color: '#5B544A' }}>
              © {new Date().getFullYear()} CLIQUE CO. · All rights reserved.
            </div>
            <div style={{ display: 'flex', gap: 20 }}>
              <a href="/terms"   style={{ ...mono, fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#5B544A' }}>Terms</a>
              <a href="/privacy" style={{ ...mono, fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#5B544A' }}>Privacy</a>
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

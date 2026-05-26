import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service — Clique',
  description: 'Terms of Service and Conditions governing the use of the Clique platform.',
};

// ─── shared token styles ───────────────────────────────────────────────────
const mono: React.CSSProperties = {
  fontFamily: 'var(--mono)',
};
const display: React.CSSProperties = {
  fontFamily: 'var(--display)',
};
const serif: React.CSSProperties = {
  fontFamily: 'var(--serif)',
};

// ─── section wrapper ───────────────────────────────────────────────────────
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

// ─── Table of contents ────────────────────────────────────────────────────
const TOC = [
  { id: 'definitions',     label: '01', title: 'Definitions' },
  { id: 'acceptance',      label: '02', title: 'Acceptance of Terms' },
  { id: 'platform',        label: '03', title: 'Platform & Services' },
  { id: 'accounts',        label: '04', title: 'User Accounts' },
  { id: 'host-terms',      label: '05', title: 'Host Terms' },
  { id: 'guest-terms',     label: '06', title: 'Guest / Attendee Terms' },
  { id: 'payment',         label: '07', title: 'Payment & Commission' },
  { id: 'refunds',         label: '08', title: 'Refunds & Cancellations' },
  { id: 'safety',          label: '09', title: 'Safety Policy' },
  { id: 'no-promotion',    label: '10', title: 'Platform Values & Prohibited Promotions' },
  { id: 'liability',       label: '11', title: 'Limitation of Liability' },
  { id: 'indemnity',       label: '12', title: 'Indemnification' },
  { id: 'warranties',      label: '13', title: 'Representations & Warranties' },
  { id: 'ip',              label: '14', title: 'Intellectual Property' },
  { id: 'privacy',         label: '15', title: 'Privacy & Data Protection' },
  { id: 'prohibited',      label: '16', title: 'Prohibited Conduct' },
  { id: 'termination',     label: '17', title: 'Term & Termination' },
  { id: 'confidentiality', label: '18', title: 'Confidentiality' },
  { id: 'governing-law',   label: '19', title: 'Governing Law & Disputes' },
  { id: 'miscellaneous',   label: '20', title: 'Miscellaneous' },
];

export default function TermsPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0B0907', color: '#F2EDE2' }}>

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
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
          Terms of Service
        </div>
        <Link href="/signup" style={{ ...mono, fontSize: 12, fontWeight: 500, letterSpacing: '.08em', textTransform: 'uppercase', background: '#C9F36E', color: '#0B0907', padding: '9px 16px', borderRadius: 999 }}>
          Get on the list →
        </Link>
      </nav>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header style={{ padding: '80px 40px 60px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ ...mono, fontSize: 11, letterSpacing: '.18em', textTransform: 'uppercase', color: '#5B544A', marginBottom: 18 }}>
          Legal · Effective Date: 2026
        </div>
        <h1 style={{ ...display, fontSize: 'clamp(42px, 6vw, 80px)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1, color: '#F2EDE2', margin: 0 }}>
          Terms of<br />
          <span style={{ ...serif, fontStyle: 'italic', color: '#C9F36E' }}>Service</span>
        </h1>
        <p style={{ ...display, fontSize: 18, lineHeight: 1.5, color: '#C8C2B6', maxWidth: 640, marginTop: 28 }}>
          These Terms govern your use of Clique — the social-first nightlife platform for discovering, hosting, and attending events. By accessing or using Clique, you agree to be bound by these Terms.
        </p>
      </header>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 40px 120px', display: 'grid', gridTemplateColumns: '220px 1fr', gap: 72, alignItems: 'start' }}>

        {/* ── TOC sidebar ───────────────────────────────────────────────── */}
        <aside style={{ position: 'sticky', top: 80 }}>
          <div style={{ ...mono, fontSize: 10, letterSpacing: '.16em', textTransform: 'uppercase', color: '#5B544A', marginBottom: 14 }}>
            Contents
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {TOC.map((item) => (
              <a key={item.id} href={`#${item.id}`} style={{
                display: 'flex', gap: 10, alignItems: 'baseline',
                padding: '5px 0', borderRadius: 4,
                ...mono, fontSize: 11, color: '#5B544A', letterSpacing: '.04em',
                transition: 'color .15s',
              }}>
                <span style={{ fontSize: 9, color: '#2A2520', flexShrink: 0 }}>{item.label}</span>
                {item.title}
              </a>
            ))}
          </nav>
        </aside>

        {/* ── Main content ──────────────────────────────────────────────── */}
        <main style={{ display: 'flex', flexDirection: 'column', gap: 56 }}>

          {/* 01 Definitions */}
          <Section id="definitions" label="01 — Definitions" title="Definitions">
            <P>The following terms, when used in these Terms of Service, carry the meanings set out below:</P>
            <UL items={[
              <><Strong>"Clique" / "Platform" / "Second Party"</Strong> — M/s Clique, the company that owns and operates the Clique application, website, and all associated services.</>,
              <><Strong>"Host" / "First Party"</Strong> — any individual, group, partnership, proprietorship, or legally recognised entity that organises, manages, and conducts an Event listed on the Platform, and includes the owner, tenant, or lawful occupier of the premises where the Event is held.</>,
              <><Strong>"Guest" / "Attendee"</Strong> — an individual who has lawfully purchased a valid Ticket exclusively through the Platform and is permitted entry by the Host. No person shall be considered a Guest unless they hold a valid Ticket issued by Clique.</>,
              <><Strong>"Event"</Strong> — any house party, club night, college event, concert, private gathering, or other social occasion organised by a Host and listed on the Platform.</>,
              <><Strong>"Ticket" / "Pass"</Strong> — a digital ticket or QR-based pass sold through the Platform that grants entry to an Event.</>,
              <><Strong>"Net Revenue"</Strong> — the gross ticket price collected by Clique, less applicable taxes, payment gateway fees, refunds, and any other lawful deductions.</>,
              <><Strong>"Cliquescore"</Strong> — a numeric social trust score assigned to each user reflecting their engagement, event attendance, and platform behaviour.</>,
              <><Strong>"User"</Strong> — any person who creates an account on the Platform, whether as an Attendee or a Host.</>,
            ]} />
          </Section>

          {/* 02 Acceptance */}
          <Section id="acceptance" label="02 — Acceptance" title="Acceptance of Terms">
            <P>By downloading, installing, accessing, or using the Clique application or website, you confirm that you have read, understood, and agree to be bound by these Terms of Service and our Privacy Policy.</P>
            <Highlight>
              If you do not agree to these Terms, you must immediately cease use of the Platform. Continued use constitutes unconditional acceptance of these Terms and any amendments made from time to time.
            </Highlight>
            <P>These Terms constitute the entire and exclusive agreement between you and Clique with respect to your use of the Platform and supersede all prior agreements, representations, or understandings.</P>
            <UL items={[
              'You must be at least 18 years of age to create an account or purchase a Ticket.',
              'If you are registering on behalf of a business or organisation, you represent that you have authority to bind that entity to these Terms.',
              'Clique reserves the right to modify these Terms at any time. Continued use after notice of changes constitutes acceptance of the updated Terms.',
            ]} />
          </Section>

          {/* 03 Platform */}
          <Section id="platform" label="03 — Platform" title={<>Platform <span style={{ ...serif, fontStyle: 'italic', color: '#C9F36E' }}>& Services</span></>}>
            <P>Clique is a social-first nightlife platform that enables Hosts to list and sell tickets to Events and enables Guests to discover, book, and attend those Events. Clique acts solely as an <Strong>intermediate technology platform</Strong> and is not a party to the actual Event organised by the Host.</P>
            <UL items={[
              'Clique provides online listing, discovery, and marketing of Events.',
              'Clique facilitates ticket sales, payment collection, and QR-based entry.',
              'Clique provides a social feed, user profiles, and community features.',
              'Clique does not own, operate, or control any Event venue.',
              'Clique does not guarantee a minimum number of ticket sales for any Event.',
              'Clique is not responsible for the quality, safety, legality, or conduct of any Event.',
            ]} />
            <P>Clique reserves the right to modify, suspend, or discontinue any feature of the Platform at any time without liability.</P>
          </Section>

          {/* 04 Accounts */}
          <Section id="accounts" label="04 — Accounts" title="User Accounts">
            <P>To use most features of the Platform, you must create an account by providing your phone number and verifying it via one-time password (OTP).</P>
            <UL items={[
              'You are responsible for maintaining the confidentiality of your account credentials.',
              'You are solely responsible for all activity that occurs under your account.',
              'You must provide accurate, complete, and current information during registration and profile setup.',
              'You must not create an account on behalf of another person without their consent.',
              'You must not operate more than one account per individual without prior written approval from Clique.',
              'You must promptly notify Clique of any unauthorised use of your account.',
            ]} />
            <P>Clique reserves the right to suspend or permanently ban any account that violates these Terms, without notice and without liability.</P>
          </Section>

          {/* 05 Host Terms */}
          <Section id="host-terms" label="05 — Hosts" title={<>Host <span style={{ ...serif, fontStyle: 'italic', color: '#C9F36E' }}>Terms</span></>}>
            <P>To list an Event on the Platform, you must be a <Strong>Verified Host</Strong>. Host verification requires submission of identity documents and event premises details, which are reviewed and approved by Clique at its sole discretion.</P>

            <div style={{ ...mono, fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: '#5B544A', paddingTop: 8 }}>
              Appointment & Exclusivity
            </div>
            <P>By listing an Event on the Platform, the Host hereby appoints Clique as the <Strong>exclusive online ticketing and marketing platform</Strong> for that Event. The Host agrees that ticket sales for the Event shall be conducted solely through the Platform.</P>

            <div style={{ ...mono, fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: '#5B544A', paddingTop: 8 }}>
              Host Responsibilities
            </div>
            <UL items={[
              'Organise, manage, and conduct the Event at your own cost and risk.',
              'Hold full legal right to use the Event location for the listed purpose.',
              'Provide accurate Event details at the time of listing, including full address, accurate location, required images of the premises, capacity limits, and any other information Clique reasonably requires.',
              'Comply with all applicable Indian laws, rules, and regulations, including safety, fire, noise, and local municipal requirements.',
              'Obtain and submit to Clique all necessary permissions, licences, and clearances before the Event is published, including noise permits, fire safety compliance, entertainment licences, and any alcohol-related permissions.',
              'Permit entry only to Guests who hold a valid Ticket issued through the Platform. No walk-ins, complimentary invitees, or third-party pass holders shall be permitted.',
              'Not invite, permit, or allow entry to any person who has not purchased a valid Ticket through Clique, including friends, family members, or other guests.',
              'Respect neighbours and adhere to local noise curfews.',
              'Provide clear entry and exit instructions to Guests.',
              'Maintain a clean and sanitary environment at the venue.',
              'Declare and pay all applicable income tax and other taxes arising from the Event.',
            ]} />

            <div style={{ ...mono, fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: '#5B544A', paddingTop: 8 }}>
              Ticket Pricing
            </div>
            <P>The Host has the right to determine the ticket price for their Event. However, <Strong>all ticket prices must be approved by Clique</Strong> before publication. Clique reserves the right to reject or request modification of any pricing it deems inappropriate.</P>

            <div style={{ ...mono, fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: '#5B544A', paddingTop: 8 }}>
              Event Listing Approval
            </div>
            <P>Clique reserves the right to review, approve, suspend, or remove any Event listing that appears to violate applicable laws, Platform policies, or public order, without incurring liability to the Host.</P>
          </Section>

          {/* 06 Guest Terms */}
          <Section id="guest-terms" label="06 — Guests" title="Guest / Attendee Terms">
            <P>As an Attendee on the Platform, you agree to the following:</P>
            <UL items={[
              'You may only purchase Tickets for yourself. Purchasing Tickets for resale is strictly prohibited.',
              'You must present your valid QR Pass at the Event entrance. Entry may be refused without a valid Pass.',
              'You must comply with all rules set by the Host for the Event, including any age restrictions, dress codes, or conduct policies.',
              'You must behave respectfully toward other Guests, Hosts, and event staff at all times.',
              'You must not engage in illegal activities, harassment, or conduct that endangers the safety of others at any Event.',
              'You acknowledge that Clique is not responsible for the conduct of the Host, the condition of the venue, or any loss, injury, or damage suffered at any Event.',
              'Your ticket and QR Pass are non-transferable and may not be copied, shared, or resold.',
            ]} />
          </Section>

          {/* 07 Payment & Commission */}
          <Section id="payment" label="07 — Payment" title={<>Payment <span style={{ ...serif, fontStyle: 'italic', color: '#C9F36E' }}>&amp; Commission</span></>}>
            <P>Clique holds the exclusive right to process all ticket sales and payment collection for Events listed on the Platform.</P>

            <Highlight>
              <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ ...mono, fontSize: 10, letterSpacing: '.14em', color: '#5B544A', marginBottom: 6 }}>HOST RECEIVES</div>
                  <div style={{ ...display, fontSize: 40, fontWeight: 800, color: '#C9F36E', letterSpacing: '-0.03em' }}>80%</div>
                  <div style={{ ...mono, fontSize: 11, color: '#5B544A' }}>of Net Revenue per ticket</div>
                </div>
                <div style={{ width: 1, background: '#2A2520', alignSelf: 'stretch' }} />
                <div>
                  <div style={{ ...mono, fontSize: 10, letterSpacing: '.14em', color: '#5B544A', marginBottom: 6 }}>CLIQUE RETAINS</div>
                  <div style={{ ...display, fontSize: 40, fontWeight: 800, color: '#FF3D6E', letterSpacing: '-0.03em' }}>20%</div>
                  <div style={{ ...mono, fontSize: 11, color: '#5B544A' }}>commission & service fee</div>
                </div>
              </div>
            </Highlight>

            <UL items={[
              <><Strong>Net Revenue</Strong> means gross ticket price less applicable taxes, payment gateway fees, and refunds.</>,
              <>Payment to the Host shall be made within <Strong>7 (seven) business days</Strong> after the Event concludes, by electronic transfer to the Host&apos;s designated bank account, unless otherwise mutually agreed in writing.</>,
              'Clique may withhold payment in cases of suspected fraud, dispute, or pending investigation.',
              'The Host is solely responsible for declaring and paying all applicable income tax and other statutory levies on amounts received.',
              'All payments on the Platform are processed via Razorpay or other approved payment gateways. Clique verifies all payments server-side; frontend confirmation alone does not constitute valid payment.',
            ]} />
          </Section>

          {/* 08 Refunds */}
          <Section id="refunds" label="08 — Refunds" title="Refunds & Cancellations">
            <P>Clique&apos;s refund and cancellation policy is as follows:</P>

            <div style={{ ...mono, fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: '#5B544A', paddingTop: 8 }}>
              Host-Initiated Cancellation
            </div>
            <UL items={[
              'If a Host cancels an Event, they must notify Clique immediately and without delay.',
              'Clique shall then notify all affected Guests and process full refunds of the ticket price, after deducting any applicable service charges.',
              'Repeated or last-minute cancellations may result in suspension of Host privileges.',
            ]} />

            <div style={{ ...mono, fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: '#5B544A', paddingTop: 8 }}>
              Guest-Initiated Cancellation
            </div>
            <UL items={[
              'The cancellation policy applicable to each Event is selected by the Host at the time of listing from options provided by Clique.',
              'Clique will process Guest refunds in accordance with the Host&apos;s selected cancellation policy.',
              'Guests must cancel before the applicable deadline to be eligible for a refund.',
            ]} />

            <div style={{ ...mono, fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: '#5B544A', paddingTop: 8 }}>
              Force Majeure
            </div>
            <Highlight>
              In the event of natural disasters, pandemics, government-imposed restrictions, or other force majeure events, Clique reserves the right to issue full refunds to Guests regardless of the cancellation policy adopted by the Host.
            </Highlight>
          </Section>

          {/* 09 Safety */}
          <Section id="safety" label="09 — Safety" title="Safety Policy">
            <P>The safety of all users is of paramount importance to Clique. The following safety obligations apply to all Hosts:</P>
            <UL items={[
              <><Strong>Age Verification:</Strong> If alcohol is served at an Event, the Host is solely responsible for verifying the age of all Guests. Minors are strictly prohibited from attending any Event at which alcohol is served.</>,
              <><Strong>Alcohol Licensing:</Strong> Alcohol may only be served after obtaining all required permissions and licences from competent authorities. The Host shall not sell alcohol at the Event without a valid licence.</>,
              <><Strong>No Illegal Substances:</Strong> The use, sale, or possession of illegal drugs or controlled substances at any Event is strictly prohibited.</>,
              <><Strong>Venue Security:</Strong> The Host is responsible for the safety of all Guests and the security of the venue at all times during the Event.</>,
              <><Strong>Emergency Preparedness:</Strong> Hosts must ensure adequate fire safety compliance and emergency exit infrastructure at the venue.</>,
              <><Strong>Noise & Neighbours:</Strong> Hosts must respect neighbours and adhere to applicable local noise curfews and ordinances.</>,
            ]} />
            <P>Clique reserves the right to remove any Event listing that it reasonably believes poses a safety risk to Guests or the public, without notice and without liability.</P>
          </Section>

          {/* 10 Platform Values */}
          <Section id="no-promotion" label="10 — Platform Values" title={<>Platform Values <span style={{ ...serif, fontStyle: 'italic', color: '#C9F36E' }}>&amp; Prohibited Promotions</span></>}>
            <Highlight>
              Clique is a social platform built for community, connection, and real-world experiences. We do not promote, advertise, endorse, or facilitate the marketing of alcohol, alcoholic beverages, nicotine products, tobacco, or any substance that is illegal under applicable Indian law.
            </Highlight>
            <P>The following promotional and advertising restrictions apply to all users, Hosts, and content posted on the Platform:</P>
            <UL items={[
              <><Strong>No Alcohol Promotion:</Strong> Clique strictly does not promote or advertise alcohol or alcoholic beverages of any kind. No Event listing, post, story, or any other content on the Platform may be used to market, advertise, or promote alcoholic products, alcohol brands, or sponsored alcohol activations.</>,
              <><Strong>No Nicotine or Tobacco Promotion:</Strong> Clique strictly does not promote or advertise nicotine products, tobacco products, e-cigarettes, vapes, hookah, or any related products. Content that markets or endorses such products is prohibited on the Platform.</>,
              <><Strong>No Promotion of Illegal Substances:</Strong> Clique does not promote, facilitate, or normalise the use, sale, or possession of any substance that is illegal under applicable Indian law, including but not limited to controlled drugs and narcotics.</>,
              <><Strong>No Promotion of Illegal Activities:</Strong> Clique does not promote, encourage, or facilitate any activity, product, or service that is unlawful under applicable Indian law or that poses a risk to public health, safety, or morality.</>,
              <><Strong>Content Moderation:</Strong> Any post, event listing, image, video, caption, or communication on the Platform that promotes prohibited substances or illegal activities will be removed immediately. The account responsible may be permanently banned without notice.</>,
              <><Strong>Sponsorship Restrictions:</Strong> Hosts may not enter into or display sponsorship arrangements with alcohol brands, tobacco companies, nicotine brands, or any entity dealing in illegal substances in connection with any Event listed on the Platform.</>,
            ]} />
            <P>These restrictions reflect Clique&apos;s commitment to operating a responsible, safe, and legally compliant platform. Clique reserves the right to remove any content, listing, or account that violates these values, without liability.</P>
          </Section>

          {/* 11 Liability — label already set above, no change needed */}
          <Section id="liability" label="11 — Liability" title="Limitation of Liability">
            <P>To the maximum extent permitted by applicable law:</P>
            <UL items={[
              'Clique shall not be responsible or liable for any injury, loss, damage, theft, or death occurring at any Event.',
              'Clique shall not be responsible or liable for any illegal activities, crimes, breaches of law, or third-party actions arising from any Event.',
              'Clique shall not be responsible or liable for the non-performance, cancellation, or poor quality of any Event by the Host.',
              'Clique shall not be responsible or liable for any criminal, civil, property damage, or personal injury liability arising from a Host&apos;s Event.',
              'Clique does not warrant the accuracy, completeness, or reliability of any Event listing, user-generated content, or information posted on the Platform.',
              'Clique&apos;s total aggregate liability for any claim arising out of or in connection with these Terms shall not exceed the amount paid by you to Clique in the three (3) months preceding the claim.',
            ]} />
            <Highlight>
              Nothing in these Terms limits liability for fraud, wilful misconduct, or gross negligence on the part of Clique.
            </Highlight>
          </Section>

          {/* 12 Indemnity */}
          <Section id="indemnity" label="12 — Indemnity" title="Indemnification">
            <P>You agree to <Strong>indemnify, defend, and hold harmless</Strong> Clique, its officers, directors, employees, agents, and successors from and against all claims, liabilities, fines, demands, actions, losses, and proceedings (including reasonable legal costs) arising out of or related to:</P>
            <UL items={[
              'Your breach of any provision of these Terms.',
              'Your unlawful conduct, negligence, or fraud.',
              'Any Event organised or hosted by you.',
              'Your violation of any third-party rights, including intellectual property rights.',
              'Any content you upload, post, or transmit through the Platform.',
              'Your violation of any applicable law or regulation.',
            ]} />
          </Section>

          {/* 13 Warranties */}
          <Section id="warranties" label="13 — Warranties" title="Representations & Warranties">
            <div style={{ ...mono, fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: '#5B544A', paddingTop: 8 }}>
              Host Representations
            </div>
            <UL items={[
              'You are legally competent and fully authorised to enter into these Terms.',
              'The Event will be organised and conducted in compliance with all applicable Indian laws.',
              'All information provided to Clique in connection with the Event listing is accurate, complete, and not misleading.',
              'You hold all necessary permissions, licences, and clearances required to host the Event at the listed location.',
              'You will respect neighbours and adhere to local noise curfews.',
              'You will provide clear entry and exit instructions to Guests.',
              'You will maintain a clean and sanitary environment at the venue.',
            ]} />
            <div style={{ ...mono, fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: '#5B544A', paddingTop: 8 }}>
              Clique Representations
            </div>
            <UL items={[
              'Clique is duly incorporated and validly existing under applicable Indian law.',
              'Clique has the legal authority to sell tickets and process payments through its platform.',
              'Clique will make commercially reasonable efforts to keep the Platform operational and accessible.',
              'Clique integrates and maintains secure third-party payment gateways in compliance with applicable laws and industry standards.',
              'Clique maintains electronic records of ticket sales, transactions, and settlements, and provides Hosts with reasonable access to sales reports on request.',
            ]} />
          </Section>

          {/* 14 IP */}
          <Section id="ip" label="14 — IP" title="Intellectual Property">
            <P>All intellectual property rights in and to the Clique Platform — including but not limited to software, design, trademarks, logos, content, and technology — are owned by or licensed to Clique.</P>
            <UL items={[
              'You may not reproduce, copy, distribute, or create derivative works from any part of the Platform without express written consent from Clique.',
              'By posting content (photos, videos, text) on the Platform, you grant Clique a non-exclusive, royalty-free, worldwide licence to use, display, and distribute that content in connection with operating and promoting the Platform.',
              'You represent that you own or have the right to post all content you submit, and that it does not infringe the rights of any third party.',
              'Clique respects intellectual property rights and will remove content reported as infringing in accordance with applicable law.',
            ]} />
          </Section>

          {/* 15 Privacy */}
          <Section id="privacy" label="15 — Privacy" title="Privacy & Data Protection">
            <P>Clique is committed to protecting your personal data in accordance with applicable Indian data protection laws, including the Digital Personal Data Protection Act, 2023.</P>
            <UL items={[
              'Clique collects personal data (name, phone number, location, usage data) solely for the purpose of operating and improving the Platform.',
              'Clique will not sell your personal data to third parties.',
              'Clique implements reasonable technical and organisational security measures to protect your personal data.',
              'You have the right to access, correct, and request deletion of your personal data, subject to applicable law.',
              'By using the Platform, you consent to the collection and processing of your personal data as described in the Privacy Policy.',
            ]} />
            <P>For full details, please review our <a href="/privacy" style={{ color: '#C9F36E', textDecoration: 'underline' }}>Privacy Policy</a>.</P>
          </Section>

          {/* 16 Prohibited */}
          <Section id="prohibited" label="16 — Prohibited" title="Prohibited Conduct">
            <P>The following activities are strictly prohibited on the Platform:</P>
            <UL items={[
              'Creating false, misleading, or fraudulent Event listings.',
              'Reselling or transferring Tickets to third parties for profit.',
              'Permitting entry to Guests who do not hold a valid Ticket issued through the Platform.',
              'Using the Platform to facilitate illegal activities of any kind.',
              'Harassing, threatening, or abusing other users.',
              'Uploading content that is defamatory, obscene, or infringes third-party rights.',
              'Attempting to bypass, hack, or interfere with the Platform&apos;s technology or security systems.',
              'Creating multiple accounts to evade a ban or suspension.',
              'Using bots, scrapers, or automated tools to access the Platform.',
              'Impersonating another person or entity.',
            ]} />
            <P>Violation of any of these prohibitions may result in immediate account termination and may expose you to civil and criminal liability.</P>
          </Section>

          {/* 17 Termination */}
          <Section id="termination" label="17 — Termination" title="Term & Termination">
            <P>These Terms commence on the date you first access or use the Platform and continue until terminated.</P>

            <div style={{ ...mono, fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: '#5B544A', paddingTop: 8 }}>
              Termination by Either Party
            </div>
            <UL items={[
              <>Either party may terminate a Host Agreement by providing <Strong>7 (seven) days&apos; prior written notice</Strong> upon material breach, including breach of entry restrictions, violation of applicable laws, misrepresentation of Event details, non-payment, or breach of data protection obligations.</>,
              'Where the breach is curable, the breaching party shall be granted 7 days from receipt of notice to remedy the breach.',
              'Where the breach is incurable — including criminal activity, fraud, or risk to public safety — termination shall be immediate.',
            ]} />

            <div style={{ ...mono, fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: '#5B544A', paddingTop: 8 }}>
              Clique&apos;s Right to Terminate Immediately
            </div>
            <UL items={[
              'The Event is likely to involve or promote illegal activities.',
              'The Host permits unauthorised entry or violates ticket exclusivity obligations.',
              'Law enforcement or regulatory authorities raise objections to the Event.',
              'The Host becomes insolvent, bankrupt, or incapable of performing their obligations.',
              'Continued listing may expose Clique to legal risk or adversely affect its goodwill.',
            ]} />

            <div style={{ ...mono, fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: '#5B544A', paddingTop: 8 }}>
              Force Majeure Termination
            </div>
            <P>If a force majeure event continues for more than <Strong>15 (fifteen) days</Strong>, either party may terminate the relevant agreement without liability, subject to settlement of amounts already collected.</P>

            <div style={{ ...mono, fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: '#5B544A', paddingTop: 8 }}>
              Consequences of Termination
            </div>
            <UL items={[
              'All rights granted to you shall immediately cease.',
              'Clique may disable your access to dashboards, listings, and the Platform.',
              <>Outstanding payments shall be settled within <Strong>7 (seven) business days</Strong>.</>,
              'Provisions relating to indemnity, limitation of liability, confidentiality, privacy, governing law, and dispute resolution shall survive termination.',
            ]} />
          </Section>

          {/* 18 Confidentiality */}
          <Section id="confidentiality" label="18 — Confidentiality" title="Confidentiality">
            <P>Both Hosts and Clique shall maintain the confidentiality of any non-public information obtained in connection with their use of the Platform or any agreement between them.</P>
            <UL items={[
              'Neither party shall disclose confidential information to any third party without prior written consent of the other party.',
              'This obligation does not apply to information that is publicly available, independently developed, or required to be disclosed by law or court order.',
              'Clique may disclose aggregated, anonymised data about platform usage without restriction.',
            ]} />
          </Section>

          {/* 19 Governing Law */}
          <Section id="governing-law" label="19 — Law & Disputes" title={<>Governing Law <span style={{ ...serif, fontStyle: 'italic', color: '#C9F36E' }}>&amp; Disputes</span></>}>
            <P>These Terms shall be governed by and construed in accordance with the <Strong>laws of India</Strong>.</P>
            <UL items={[
              'All disputes arising out of or relating to these Terms or the Platform shall be subject to the exclusive jurisdiction of the courts at the registered office of Clique.',
              'Clique encourages amicable resolution of disputes. Before initiating legal proceedings, parties agree to attempt resolution through good-faith negotiation for a period of 30 days.',
              'Nothing in this clause prevents either party from seeking urgent injunctive relief from a competent court.',
            ]} />
          </Section>

          {/* 20 Miscellaneous */}
          <Section id="miscellaneous" label="20 — Miscellaneous" title="Miscellaneous">
            <UL items={[
              <><Strong>Entire Agreement:</Strong> These Terms, together with any Host Agreement and our Privacy Policy, constitute the entire agreement between you and Clique and supersede all prior agreements and understandings.</>,
              <><Strong>Amendments:</Strong> Clique may update these Terms from time to time. Material changes will be communicated via the Platform or by email. Continued use after notice constitutes acceptance.</>,
              <><Strong>Severability:</Strong> If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions shall continue in full force and effect.</>,
              <><Strong>No Waiver:</Strong> Failure by Clique to enforce any right under these Terms shall not constitute a waiver of that right.</>,
              <><Strong>Assignment:</Strong> You may not assign your rights or obligations under these Terms without prior written consent from Clique. Clique may assign these Terms freely.</>,
              <><Strong>Notices:</Strong> Legal notices to Clique should be sent to the contact address available in the app or on the website.</>,
            ]} />
          </Section>

          {/* Last updated */}
          <div style={{ paddingTop: 48, borderTop: '1px solid #1C1814', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ ...mono, fontSize: 11, letterSpacing: '.1em', color: '#5B544A' }}>
              © {new Date().getFullYear()} CLIQUE CO. · All rights reserved.
            </div>
            <div style={{ display: 'flex', gap: 20 }}>
              <a href="/privacy" style={{ ...mono, fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#5B544A' }}>Privacy</a>
              <a href="/" style={{ ...mono, fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#5B544A' }}>Home</a>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

function useBreakpoint() {
  const [width, setWidth] = useState(1024);
  useEffect(() => {
    const update = () => setWidth(window.innerWidth);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return {
    isMobile:  width < 640,
    isTablet:  width >= 640 && width < 1024,
    isDesktop: width >= 1024,
    width,
  };
}

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const { isMobile } = useBreakpoint();

  useEffect(() => {
    const onScroll = () => { setScrolled(window.scrollY > 24); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav style={{
      position: 'fixed', inset: '0 0 auto 0', zIndex: 50,
      display: 'flex', alignItems: 'center',
      padding: isMobile ? '0 16px' : '0 40px',
      height: isMobile ? 56 : 64,
      backdropFilter: 'blur(12px) saturate(140%)',
      background: scrolled ? 'rgba(11,9,7,0.96)' : 'linear-gradient(180deg, rgba(11,9,7,0.78) 0%, rgba(11,9,7,0.0) 100%)',
      borderBottom: scrolled ? '1px solid var(--line)' : '1px solid transparent',
      transition: 'background .3s, border-color .3s',
    }}>
      <Link href="/" style={{
        display: 'flex', alignItems: 'baseline', gap: 8,
        fontFamily: 'var(--display)', fontWeight: 800,
        letterSpacing: '-0.04em',
        fontSize: isMobile ? 18 : 22,
        color: 'var(--paper)', flexShrink: 0,
      }}>
        <span style={{
          width: 8, height: 8, background: 'var(--lime)', borderRadius: '50%',
          alignSelf: 'center', boxShadow: '0 0 18px var(--lime)', display: 'inline-block',
          animation: 'pulse 2s ease-in-out infinite',
        }} />
        CLIQUE
        {!isMobile && (
          <sup style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 400, color: 'var(--dim)', letterSpacing: 0, alignSelf: 'flex-start', marginTop: 4 }}>est. tonight</sup>
        )}
      </Link>

      <div style={{ flex: 1 }} />

      <div style={{
        display: 'flex', alignItems: 'center',
        gap: isMobile ? 6 : 4,
        fontFamily: 'var(--mono)', fontSize: isMobile ? 11 : 12,
        fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0,
      }}>
        {!isMobile && (
          <Link href="/login" style={{ color: 'var(--cream)', padding: '10px 14px', borderRadius: 999 }}>
            Log in
          </Link>
        )}
        <Link href="/signup" style={{
          background: 'var(--lime)', color: 'var(--ink)',
          padding: isMobile ? '8px 12px' : '10px 14px',
          borderRadius: 999,
          border: '1px solid var(--lime)',
          fontSize: isMobile ? 10 : 12,
          whiteSpace: 'nowrap',
        }}>
          {isMobile ? 'Join →' : 'Get on the list →'}
        </Link>
      </div>
    </nav>
  );
}

function HowItWorks() {
  const { isMobile, isTablet } = useBreakpoint();
  const hPad = isMobile ? '16px' : isTablet ? '28px' : '40px';

  const steps = [
    {
      num: '01',
      title: 'Discover',
      body: 'Browse local events near you — house parties, club nights, college events, private gatherings, and more. Filter by date, distance, or vibe.',
    },
    {
      num: '02',
      title: 'Book',
      body: 'Reserve your spot with a secure one-time payment per event. No subscription required. Receive a digital QR pass to your account instantly.',
    },
    {
      num: '03',
      title: 'Attend',
      body: 'Show your QR pass at the door. The host scans it to confirm your entry. Your pass is unique, non-transferable, and single-use.',
    },
    {
      num: '04',
      title: 'Host',
      body: 'Verified organisers can list events, set capacity and pricing, manage the guest list, and scan passes — all from one dashboard.',
    },
  ];

  return (
    <section style={{
      borderTop: '1px solid var(--line)',
      padding: `${isMobile ? '56px' : '80px'} ${hPad}`,
      maxWidth: 1480, margin: '0 auto',
    }}>
      {/* About block */}
      <div style={{ maxWidth: 720, marginBottom: isMobile ? 48 : 64 }}>
        <div style={{
          fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.16em',
          textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 18,
        }}>
          About Clique
        </div>
        <h2 style={{
          fontFamily: 'var(--display)', fontWeight: 800,
          fontSize: isMobile ? 'clamp(28px, 7vw, 40px)' : 'clamp(32px, 3.5vw, 48px)',
          letterSpacing: '-0.035em', lineHeight: 1.1,
          color: 'var(--paper)', margin: 0,
        }}>
          A social platform for discovering and hosting local events
        </h2>
        <p style={{
          fontFamily: 'var(--display)', fontSize: isMobile ? 15 : 17,
          lineHeight: 1.7, color: 'var(--cream)',
          marginTop: 20, maxWidth: '64ch',
        }}>
          Clique is a social platform that allows users to discover local gatherings, host events,
          and manage RSVPs and check-ins. Attendees pay a one-time ticket price per event — there
          are no subscriptions or hidden fees. Hosts receive 80% of net ticket revenue; Clique
          retains a 20% platform commission.
        </p>
      </div>

      {/* Steps grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : isTablet ? '1fr 1fr' : 'repeat(4, 1fr)',
        gap: isMobile ? 24 : 20,
      }}>
        {steps.map(({ num, title, body }) => (
          <div key={num} style={{
            background: 'var(--card)', border: '1px solid var(--line)',
            borderRadius: 8, padding: isMobile ? '20px 18px' : '24px 20px',
          }}>
            <div style={{
              fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--lime)',
              letterSpacing: '.1em', marginBottom: 10,
            }}>
              {num}
            </div>
            <div style={{
              fontFamily: 'var(--display)', fontSize: isMobile ? 17 : 19,
              fontWeight: 700, color: 'var(--paper)', marginBottom: 10,
              letterSpacing: '-0.02em',
            }}>
              {title}
            </div>
            <p style={{
              fontFamily: 'var(--display)', fontSize: 14, lineHeight: 1.65,
              color: 'var(--cream)', margin: 0,
            }}>
              {body}
            </p>
          </div>
        ))}
      </div>

      {/* Legal / compliance note */}
      <div style={{
        marginTop: isMobile ? 36 : 48,
        display: 'flex', flexWrap: 'wrap', gap: isMobile ? 10 : 16,
        alignItems: 'center',
      }}>
        {[
          { label: 'How it works',  href: '#how-it-works' },
          { label: 'Pricing',       href: '/terms#payment' },
          { label: 'Refund policy', href: '/refund' },
          { label: 'Privacy',       href: '/privacy' },
          { label: 'Terms',         href: '/terms' },
          { label: 'Contact us',    href: '/contact' },
        ].map(({ label, href }) => (
          <Link key={label} href={href} style={{
            fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.08em',
            textTransform: 'uppercase', color: 'var(--dim)',
            border: '1px solid var(--line)', borderRadius: 999,
            padding: '6px 12px',
          }}>
            {label}
          </Link>
        ))}
      </div>
    </section>
  );
}

function SignupBand() {
  const { isMobile, isTablet } = useBreakpoint();
  const hPad = isMobile ? '16px' : isTablet ? '28px' : '40px';

  return (
    <section style={{
      borderTop: '1px solid var(--line)',
      padding: `${isMobile ? '56px' : '90px'} ${hPad}`,
      maxWidth: 1480, margin: '0 auto',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <div className="clique-label">JOIN</div>
        <h2 className="display-xl" style={{
          marginTop: 12,
          textAlign: 'center',
          fontSize: isMobile ? 'clamp(36px, 10vw, 56px)' : undefined,
        }}>
          There&apos;s somewhere<br />
          better<br />
          <span className="text-italic-serif" style={{ color: 'var(--lime)' }}>to be.</span>
        </h2>
        <div style={{
          display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 14,
          marginTop: isMobile ? 28 : 38,
          width: isMobile ? '100%' : 'auto',
        }}>
          <Link href="/signup" style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            padding: '16px 24px', borderRadius: 3,
            fontFamily: 'var(--mono)', fontSize: isMobile ? 12 : 13,
            fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase',
            background: 'var(--lime)', color: 'var(--ink)',
            width: isMobile ? '100%' : 'auto',
          }}>
            Create account →
          </Link>
          <Link href="/login" style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            padding: '16px 24px', borderRadius: 3,
            fontFamily: 'var(--mono)', fontSize: isMobile ? 12 : 13,
            fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase',
            background: 'transparent', color: 'var(--paper)', border: '1px solid var(--line-2)',
            width: isMobile ? '100%' : 'auto',
          }}>
            I already have one
          </Link>
        </div>
        <p style={{
          fontFamily: 'var(--display)',
          fontSize: isMobile ? 15 : 18,
          lineHeight: 1.4, color: 'var(--cream)',
          marginTop: 18,
          textAlign: 'center',
        }}>
          Discover events. Book your pass. Show up.
        </p>
      </div>
    </section>
  );
}

function MiniFooter() {
  const { isMobile } = useBreakpoint();
  return (
    <footer style={{
      borderTop: '1px solid var(--line)',
      padding: isMobile ? '20px 16px' : '24px 40px',
      maxWidth: 1480, margin: '0 auto',
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      justifyContent: 'space-between',
      alignItems: isMobile ? 'flex-start' : 'center',
      gap: isMobile ? 12 : 16,
    }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.1em', color: 'var(--dim)' }}>
        © {new Date().getFullYear()} CLIQUE CO.
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: isMobile ? 14 : 18 }}>
        {[
          { label: 'Code of conduct', href: '/conduct' },
          { label: 'Privacy',         href: '/privacy' },
          { label: 'Terms',           href: '/terms' },
          { label: 'Refund policy',   href: '/refund' },
          { label: 'Contact',         href: '/contact' },
          { label: '@clique',         href: '#' },
        ].map(({ label, href }) => (
          <a key={label} href={href} style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--dim)' }}>{label}</a>
        ))}
      </div>
    </footer>
  );
}

export default function LandingPage() {
  const { user } = useAuth();
  const router = useRouter();


  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)', color: 'var(--paper)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <Nav />
      <HowItWorks />
      <SignupBand />
      <MiniFooter />
    </div>
  );
}

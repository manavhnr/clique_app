'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

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
    width,
  };
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
          { label: '@clique',         href: '#' },
        ].map(({ label, href }) => (
          <a key={label} href={href} style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--dim)' }}>{label}</a>
        ))}
      </div>
    </footer>
  );
}

export default function ConfirmedPage() {
  const { isMobile, isTablet } = useBreakpoint();
  const hPad = isMobile ? '16px' : isTablet ? '28px' : '40px';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)', color: 'var(--paper)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <nav style={{
        position: 'fixed', inset: '0 0 auto 0', zIndex: 50,
        display: 'flex', alignItems: 'center',
        padding: isMobile ? '0 16px' : '0 40px',
        height: isMobile ? 56 : 64,
        backdropFilter: 'blur(12px) saturate(140%)',
        background: 'linear-gradient(180deg, rgba(11,9,7,0.78) 0%, rgba(11,9,7,0.0) 100%)',
        borderBottom: '1px solid transparent',
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
        </Link>
      </nav>

      <section style={{
        borderTop: '1px solid var(--line)',
        padding: `${isMobile ? '56px' : '90px'} ${hPad}`,
        maxWidth: 1480, margin: '0 auto', width: '100%',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div className="clique-label">YOU&apos;RE ON THE LIST</div>
          <h2 className="display-xl" style={{
            marginTop: 12,
            textAlign: 'center',
            fontSize: isMobile ? 'clamp(36px, 10vw, 56px)' : undefined,
          }}>
            08<span className="text-italic-serif" style={{ color: 'var(--lime)' }}>/26</span>
          </h2>
          <p style={{
            fontFamily: 'var(--display)',
            fontSize: isMobile ? 15 : 18,
            lineHeight: 1.4, color: 'var(--cream)',
            marginTop: 18,
            textAlign: 'center',
          }}>
            Something&apos;s happening. You got here first.
          </p>
        </div>
      </section>

      <MiniFooter />
    </div>
  );
}

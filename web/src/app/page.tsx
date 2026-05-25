'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ArrowRight, MapPin, Calendar, QrCode, Users, Star, Zap } from 'lucide-react';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import api from '@/lib/api';

const FEATURES = [
  { icon: Calendar, title: 'Discover Events', desc: 'Find house parties, club nights, and exclusive events near you.' },
  { icon: Users, title: 'Social Network', desc: 'Follow hosts and friends. See what\'s happening in your scene.' },
  { icon: QrCode, title: 'Instant QR Passes', desc: 'Book, pay, and get your QR pass. Entry is seamless.' },
  { icon: Star, title: 'Become a Host', desc: 'Create events, manage guest lists, and grow your following.' },
];

export default function LandingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistName, setWaitlistName] = useState('');
  const [waitlistDone, setWaitlistDone] = useState(false);

  if (user) {
    router.replace('/events');
    return null;
  }

  const handleWaitlist = (e: React.FormEvent) => {
    e.preventDefault();
    setWaitlistDone(true);
  };

  return (
    <div className="min-h-screen bg-dark overflow-x-hidden">
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 border-b border-dark-border/50 backdrop-blur-xl bg-dark/80">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-white font-bold text-sm">C</span>
          </div>
          <span className="text-white font-bold text-xl tracking-tight">CLIQUE</span>
        </Link>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setWaitlistOpen(true)}>
            Join Waitlist
          </Button>
          <Link href="/login">
            <Button variant="secondary" size="sm">Log in</Button>
          </Link>
        </div>
      </nav>

      <section className="relative min-h-screen flex items-center justify-center text-center px-6 pt-20 bg-gradient-hero">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-violet-800/10 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        <div className="relative max-w-3xl mx-auto animate-slide-up">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/15 border border-primary/30 text-primary-light text-sm font-medium mb-6">
            <Zap size={14} />
            Social-first nightlife app
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Your city&apos;s<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-violet-400">
              nightlife
            </span>
            <br />starts here.
          </h1>

          <p className="text-lg text-muted max-w-xl mx-auto mb-10 leading-relaxed">
            Discover house parties, club nights, and exclusive events. Book your pass, scan in, and create memories.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/signup">
              <Button size="lg" className="group w-full sm:w-auto">
                Get Started
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Button
              variant="secondary"
              size="lg"
              className="w-full sm:w-auto"
              onClick={() => setWaitlistOpen(true)}
            >
              Join the Waitlist
            </Button>
          </div>
        </div>
      </section>

      <section className="py-24 px-6 max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-white mb-3">Everything you need for a night out</h2>
          <p className="text-muted">From discovery to door, Clique handles it all.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-dark-card border border-dark-border rounded-2xl p-6 hover:border-primary/30 transition-colors group">
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center mb-4 group-hover:bg-primary/25 transition-colors">
                <Icon size={20} className="text-primary-light" />
              </div>
              <h3 className="text-white font-semibold mb-1.5">{title}</h3>
              <p className="text-sm text-muted leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-24 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to join?</h2>
          <p className="text-muted mb-8">Sign up and start discovering events in your city.</p>
          <div className="flex gap-3 justify-center">
            <Link href="/signup">
              <Button size="lg">Get Started <ArrowRight size={18} /></Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-dark-border px-6 py-8 text-center text-sm text-muted">
        <p>© {new Date().getFullYear()} Clique. All rights reserved.</p>
      </footer>

      <Modal open={waitlistOpen} onClose={() => setWaitlistOpen(false)} title="Join the Waitlist">
        {waitlistDone ? (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🎉</span>
            </div>
            <h3 className="text-white font-semibold text-lg mb-2">You&apos;re on the list!</h3>
            <p className="text-muted text-sm">We&apos;ll notify you when Clique launches in your city.</p>
            <Button className="mt-6 w-full" onClick={() => setWaitlistOpen(false)}>Close</Button>
          </div>
        ) : (
          <form onSubmit={handleWaitlist} className="flex flex-col gap-4">
            <p className="text-sm text-muted">Be the first to know when Clique launches in your city.</p>
            <Input
              label="Your Name"
              placeholder="Enter your name"
              value={waitlistName}
              onChange={(e) => setWaitlistName(e.target.value)}
              required
            />
            <Input
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              value={waitlistEmail}
              onChange={(e) => setWaitlistEmail(e.target.value)}
              required
            />
            <Button type="submit" className="w-full mt-2" size="lg">
              Join Waitlist
            </Button>
          </form>
        )}
      </Modal>
    </div>
  );
}

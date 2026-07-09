import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';

export const metadata: Metadata = {
  title: 'CLIQUE — tonight in your city',
  description: 'Discover house parties, warehouse nights, supper clubs, and listening rooms. One tap to RSVP. A QR pass at the door.',
  keywords: 'nightlife, parties, events, house party, club, booking, qr pass',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icon.svg',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import EventDetailClient from './EventDetailClient';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://clique-backend-udzs.onrender.com/api/v1';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://cliqueapp.in';

function resolveImageUrl(url: string | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${API_BASE.replace('/api/v1', '')}${url}`;
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;

  try {
    const res = await fetch(`${API_BASE}/events/${id}`, { next: { revalidate: 60 } });
    if (!res.ok) throw new Error('not found');
    const json = await res.json();
    const event = json?.data?.event;
    if (!event) throw new Error('empty');

    const host = typeof event.hostId === 'object' ? event.hostId : null;
    const bannerIdx = event.bannerImageIndex ?? 0;
    const rawImage = event.images?.[bannerIdx] ?? event.images?.[0];
    const imageUrl = resolveImageUrl(rawImage);

    const dateStr = event.date
      ? new Date(event.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
      : '';
    const location = event.locationName ?? '';
    const descriptionLines = [
      event.description ? event.description.slice(0, 120) : '',
      [dateStr, location].filter(Boolean).join(' · '),
      host?.name ? `Hosted by ${host.name}` : '',
    ].filter(Boolean);
    const description = descriptionLines.join(' — ');

    const canonicalUrl = `${SITE_URL}/events/${id}`;

    return {
      title: `${event.title} | CLIQUE`,
      description,
      openGraph: {
        title: event.title,
        description,
        url: canonicalUrl,
        siteName: 'CLIQUE',
        type: 'website',
        ...(imageUrl ? { images: [{ url: imageUrl, width: 1200, height: 630, alt: event.title }] } : {}),
      },
      twitter: {
        card: 'summary_large_image',
        title: event.title,
        description,
        ...(imageUrl ? { images: [imageUrl] } : {}),
      },
    };
  } catch {
    return {
      title: 'Event | CLIQUE',
      description: 'Discover parties and events on CLIQUE.',
    };
  }
}

export default function EventDetailPage() {
  return <EventDetailClient />;
}

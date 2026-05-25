import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatTime(timeStr: string | undefined): string {
  if (!timeStr) return '—';
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

export function formatPrice(price: number): string {
  if (price === 0) return 'Free';
  return `₹${price.toLocaleString('en-IN')}`;
}

export function getImageUrl(url: string | undefined): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  const base = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') ?? 'http://localhost:5001';
  return `${base}${url}`;
}

export function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return formatDate(dateStr);
}

export function categoryLabel(cat: string | undefined): string {
  if (!cat) return 'Event';
  const map: Record<string, string> = {
    house_party: 'House Party',
    club: 'Club Night',
    college: 'College Party',
    private: 'Private',
    concert: 'Concert',
    warehouse: 'Warehouse',
    other: 'Other',
  };
  return map[cat] ?? cat;
}

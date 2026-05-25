'use client';

import dynamic from 'next/dynamic';
import { MapPin } from 'lucide-react';
import type { PickedLocation } from './MapPicker';

const MapPicker = dynamic(() => import('./MapPicker'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 rounded-xl bg-dark-card border border-dark-border flex items-center justify-center gap-2 text-muted text-sm">
      <MapPin size={16} className="animate-pulse" />
      Loading map…
    </div>
  ),
});

interface LocationPickerProps {
  lat: number;
  lng: number;
  locationName: string;
  address: string;
  onChange: (loc: PickedLocation) => void;
}

export default function LocationPicker({ lat, lng, locationName, address, onChange }: LocationPickerProps) {
  const hasPin = lat !== 0 || lng !== 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-zinc-300">Pin Location on Map</label>
        {hasPin && (
          <span className="text-xs text-green-400 flex items-center gap-1">
            <MapPin size={11} />
            Location pinned
          </span>
        )}
      </div>

      <p className="text-xs text-muted">Click anywhere on the map to drop a pin. Drag to adjust.</p>

      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      />

      <MapPicker
        value={hasPin ? { lat, lng } : null}
        onChange={onChange}
      />

      {hasPin && (
        <div className="bg-dark border border-dark-border rounded-xl px-3 py-2.5 space-y-1">
          <p className="text-xs font-medium text-white">{locationName}</p>
          <p className="text-xs text-muted line-clamp-2">{address}</p>
          <p className="text-xs text-zinc-600">{lat.toFixed(6)}, {lng.toFixed(6)}</p>
        </div>
      )}
    </div>
  );
}

export type { PickedLocation };

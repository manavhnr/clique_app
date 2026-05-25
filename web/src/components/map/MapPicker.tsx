'use client';

import { useEffect, useRef } from 'react';
import type { Map as LeafletMap, Marker } from 'leaflet';

export interface PickedLocation {
  lat: number;
  lng: number;
  locationName: string;
  address: string;
}

interface MapPickerProps {
  value: { lat: number; lng: number } | null;
  onChange: (loc: PickedLocation) => void;
}

export default function MapPicker({ value, onChange }: MapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!containerRef.current) return;

    // Leaflet stamps _leaflet_id on the element when initialised — bail if already done
    if ((containerRef.current as unknown as Record<string, unknown>)['_leaflet_id']) return;

    let L: typeof import('leaflet');

    import('leaflet').then((mod) => {
      L = mod;

      // Fix broken webpack asset paths
      delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const initialLat = value?.lat ?? 20.5937;
      const initialLng = value?.lng ?? 78.9629;
      const initialZoom = value ? 14 : 5;

      const map = L.map(containerRef.current!, { zoomControl: true }).setView([initialLat, initialLng], initialZoom);
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      if (value) {
        const m = L.marker([value.lat, value.lng], { draggable: true }).addTo(map);
        markerRef.current = m;
        m.on('dragend', () => {
          const { lat, lng } = m.getLatLng();
          reverseGeocode(lat, lng, m);
        });
      }

      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        } else {
          const m = L.marker([lat, lng], { draggable: true }).addTo(map);
          markerRef.current = m;
          m.on('dragend', () => {
            const pos = m.getLatLng();
            reverseGeocode(pos.lat, pos.lng, m);
          });
        }
        reverseGeocode(lat, lng, markerRef.current!);
      });
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function reverseGeocode(lat: number, lng: number, marker: Marker) {
    let locationName = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    let address = locationName;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      if (data.display_name) {
        const parts: string[] = data.display_name.split(',');
        locationName = parts.slice(0, 2).join(',').trim();
        address = data.display_name;
      }
    } catch { /* keep coordinate fallback */ }

    marker.bindPopup(`<b>${locationName}</b><br/><small>${address}</small>`).openPopup();
    onChangeRef.current({ lat, lng, locationName, address });
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-64 rounded-xl overflow-hidden border border-dark-border"
      style={{ zIndex: 0 }}
    />
  );
}

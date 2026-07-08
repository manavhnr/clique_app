'use client';

import { useSyncExternalStore } from 'react';

const subscribers = new Map<number, (onChange: () => void) => () => void>();

function getSubscribe(breakpoint: number) {
  let sub = subscribers.get(breakpoint);
  if (!sub) {
    sub = (onChange: () => void) => {
      const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    };
    subscribers.set(breakpoint, sub);
  }
  return sub;
}

/**
 * Shared viewport hook. Reads matchMedia synchronously on the first client
 * render (no desktop-first flash after hydration) and only re-renders on
 * actual breakpoint crossings, not every resize event.
 */
export function useIsMobile(breakpoint = 768): boolean {
  return useSyncExternalStore(
    getSubscribe(breakpoint),
    () => window.matchMedia(`(max-width: ${breakpoint - 1}px)`).matches,
    () => false
  );
}

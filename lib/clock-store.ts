'use client';
import {useCallback, useSyncExternalStore} from 'react';
import {dateInZone} from '@/lib/calendar';

type Listener = () => void;

/**
 * One timer per tick rate for the whole page, shared by every subscriber.
 * The server snapshot is deliberately empty so no timestamp is ever baked
 * into the HTML: that is what makes the pages cacheable.
 */
function ticker(intervalMs: number) {
  const listeners = new Set<Listener>();
  let timer: ReturnType<typeof setInterval> | null = null;
  let snapshot = 0;

  const tick = () => {
    snapshot = Math.floor(Date.now() / 1000) * 1000;
    for (const listener of listeners) listener();
  };

  return {
    subscribe(listener: Listener) {
      listeners.add(listener);
      if (!timer) {
        tick();
        timer = setInterval(tick, intervalMs);
      }
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && timer) {
          clearInterval(timer);
          timer = null;
        }
      };
    },
    getSnapshot: () => snapshot,
  };
}

const perSecond = ticker(1000);
const perHalfMinute = ticker(30_000);

/** Milliseconds at second resolution, or 0 before the first client tick. */
export function useNow(): number {
  return useSyncExternalStore(perSecond.subscribe, perSecond.getSnapshot, () => 0);
}

export function civilDate(instant: Date, zone: string): string {
  return dateInZone(instant, zone).toISOString().slice(0, 10);
}

/**
 * The calendar day in `zone` as 'YYYY-MM-DD'. Re-renders only when the day
 * actually rolls over, not on every tick, because the snapshot is a string.
 */
export function useCivilDate(zone: string, serverDate: string): string {
  const getSnapshot = useCallback(() => {
    const now = perHalfMinute.getSnapshot();
    return now === 0 ? serverDate : civilDate(new Date(now), zone);
  }, [zone, serverDate]);
  const getServerSnapshot = useCallback(() => serverDate, [serverDate]);
  return useSyncExternalStore(perHalfMinute.subscribe, getSnapshot, getServerSnapshot);
}

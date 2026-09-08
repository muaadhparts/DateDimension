'use client';
import {useCallback, useSyncExternalStore} from 'react';
import {dateInZone} from './calendar.ts';

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

let supportedZones: string[] | undefined;

/**
 * The full IANA list, but only in the browser: rendering 400+ options into the
 * HTML would triple the page for a control most visitors never open.
 */
export function useSupportedZones(fallback: readonly string[]): readonly string[] {
  return useSyncExternalStore(
    subscribeToStoredZone,
    () => (supportedZones ??= readSupportedZones(fallback)),
    () => fallback,
  );
}

function readSupportedZones(fallback: readonly string[]): string[] {
  try {
    return Intl.supportedValuesOf('timeZone') as string[];
  } catch {
    return [...fallback];
  }
}

const ZONE_KEY = 'dd-zone';
const zoneListeners = new Set<Listener>();

function readStoredZone(): string | null {
  try {
    const stored = localStorage.getItem(ZONE_KEY);
    if (!stored) return null;
    new Intl.DateTimeFormat('en', {timeZone: stored}).format();
    return stored;
  } catch {
    return null;
  }
}

let storedZone: string | null | undefined;
let device: string | null | undefined;

/**
 * The zone the visitor's own device is set to. It costs nothing, needs no
 * permission and no network — the browser already knows it.
 */
export function deviceZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

/**
 * Which zone to show: the visitor's own choice when they have made one, then
 * the zone their device is set to. Null only where neither is available.
 */
export function preferredZone(): string | null {
  if (storedZone === undefined) storedZone = readStoredZone();
  if (storedZone) return storedZone;
  if (device === undefined) device = deviceZone();
  return device;
}

function subscribeToStoredZone(listener: Listener) {
  zoneListeners.add(listener);
  if (storedZone === undefined) storedZone = readStoredZone();
  const onStorage = (event: StorageEvent) => {
    if (event.key !== ZONE_KEY) return;
    storedZone = readStoredZone();
    for (const l of zoneListeners) l();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    zoneListeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

/**
 * Which zone the page should be in: the visitor's own choice when they have
 * made one, otherwise the zone their device is set to.
 *
 * Null on the server and through hydration, deliberately. The HTML is one
 * cached copy shared by every visitor, so it cannot carry anyone's zone; the
 * correction happens in the browser, the same way the clock fills itself in.
 */
export function usePreferredZone(): string | null {
  return useSyncExternalStore(subscribeToStoredZone, preferredZone, () => null);
}

export function storeZone(zone: string): void {
  try {
    localStorage.setItem(ZONE_KEY, zone);
    storedZone = zone;
  } catch {
    /* private browsing keeps the choice for this page view only */
  }
}

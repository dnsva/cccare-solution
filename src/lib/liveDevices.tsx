import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { THINGSPEAK_CHANNEL_ID, THINGSPEAK_DEVICE } from '../config';
import type { DeviceReading } from '../types';

/**
 * Live pulse-oximeter readings, pulled from ThingSpeak.
 *
 * The Arduino runs on its own and uploads to a public ThingSpeak channel: field 1 is heart rate (bpm),
 * field 2, if the sketch sends it, is blood oxygen (%). Each page polls the channel directly, so this
 * works without the laptop and from any network.
 */

/** ThingSpeak's free tier takes at most one upload per 15 s, so polling faster finds nothing new. */
const POLL_MS = 15_000;
/** A reading older than this means the sensor stopped sending. The sketch uploads about every 20 s. */
export const LIVE_STALE_MS = 60_000;
/** How many bpm values to keep for the sparkline. */
const HISTORY = 24;

const FEED_URL = `https://api.thingspeak.com/channels/${THINGSPEAK_CHANNEL_ID}/feeds.json?results=${HISTORY}`;

export type LiveStatus = 'connecting' | 'connected' | 'unavailable';

export type LiveDevices = {
  status: LiveStatus;
  devices: Record<string, DeviceReading>;
  /** Device → recent bpm values, oldest first. */
  history: Record<string, number[]>;
  /** The channel's newest entry exactly as uploaded, even if it isn't a valid heart rate. */
  latest: { value: string; at: number } | null;
};

type Entry = { created_at: string; field1?: string | null; field2?: string | null };

export const isFresh = (r: DeviceReading | undefined, now: number): r is DeviceReading =>
  !!r && now - r.at < LIVE_STALE_MS;

/** A number from a ThingSpeak field, or null when it's blank or outside [min, max]. */
function field(v: string | null | undefined, min: number, max: number): number | null {
  const n = v == null || v.trim() === '' ? NaN : Number(v);
  return Number.isFinite(n) && n >= min && n <= max ? Math.round(n) : null;
}

/** Turns the channel's recent entries into the latest reading plus a bpm history. Bad values are skipped. */
function toLive(feeds: Entry[]): Pick<LiveDevices, 'devices' | 'history' | 'latest'> {
  const valid = feeds.flatMap((e) => {
    const bpm = field(e.field1, 30, 230);
    const at = Date.parse(e.created_at);
    return bpm == null || Number.isNaN(at) ? [] : [{ bpm, spo2: field(e.field2, 50, 100), at }];
  });
  const newest = feeds[feeds.length - 1];
  const latest = newest?.field1 != null ? { value: newest.field1, at: Date.parse(newest.created_at) } : null;
  const last = valid[valid.length - 1];
  if (!last) return { devices: {}, history: {}, latest };
  return {
    latest,
    devices: { [THINGSPEAK_DEVICE]: { device: THINGSPEAK_DEVICE, finger: true, ...last } },
    history: { [THINGSPEAK_DEVICE]: valid.map((r) => r.bpm) },
  };
}

const EMPTY: LiveDevices = { status: 'connecting', devices: {}, history: {}, latest: null };
const LiveContext = createContext<LiveDevices>(EMPTY);

/** Polls the ThingSpeak channel and shares the latest reading with every page. */
export function LiveDevicesProvider({ children }: { children: ReactNode }) {
  const [live, setLive] = useState<LiveDevices>(EMPTY);

  useEffect(() => {
    let stopped = false;
    const poll = async () => {
      try {
        const res = await fetch(FEED_URL, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        // A private or missing channel answers with a bare -1 instead of an object.
        const data = (await res.json()) as { feeds?: Entry[] } | -1;
        if (data === -1 || !Array.isArray(data.feeds)) throw new Error('channel not readable (is it public?)');
        if (!stopped) setLive({ status: 'connected', ...toLive(data.feeds) });
      } catch (err) {
        console.warn('ThingSpeak poll failed:', err);
        // Keep the last reading: it goes stale on its own if the problem lasts.
        if (!stopped) setLive((prev) => ({ ...prev, status: 'unavailable' }));
      }
    };
    poll();
    const timer = setInterval(poll, POLL_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, []);

  return <LiveContext.Provider value={live}>{children}</LiveContext.Provider>;
}

export const useLiveDevices = () => useContext(LiveContext);

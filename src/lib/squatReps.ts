import { useEffect, useState } from 'react';
import { SQUAT_CHANNEL_ID } from '../config';

/**
 * Squat reps counted by the pose-estimation camera, pulled from ThingSpeak.
 *
 * Each upload is a running count since the camera program started (pressing r on the camera resets it):
 *   1 total reps · 2 good reps · 3 shallow only · 4 knee valgus (knees caving in) only · 5 shallow and knee valgus
 *   6 good ÷ total · 7 average relative depth · 8 relative depth of the last rep
 * Relative depth is the rep's lowest hip drop divided by torso length, so higher means deeper.
 */
export type SquatReps = {
  total: number;
  good: number;
  shallow: number;
  kneesIn: number;
  both: number;
  /** Relative depth, or null if the camera didn't send it. */
  avgDepth: number | null;
  lastDepth: number | null;
  at: number;
};

/** ThingSpeak's free tier takes at most one upload per 15 s, so polling faster finds nothing new. */
const POLL_MS = 15_000;
/**
 * The camera program uploads every 20 s while it runs, even when nobody is squatting,
 * so no upload for this long means it has stopped.
 */
const CAMERA_STALE_MS = 60_000;

export const cameraSending = (r: SquatReps, now: number) => now - r.at < CAMERA_STALE_MS;

const LAST_URL = `https://api.thingspeak.com/channels/${SQUAT_CHANNEL_ID}/feeds/last.json`;

type Field = string | null | undefined;
type Entry = { created_at: string; field1?: Field; field2?: Field; field3?: Field; field4?: Field; field5?: Field; field7?: Field; field8?: Field };

/** A whole number of reps, or null if the field is blank or not a count. */
function count(v: Field): number | null {
  const n = v == null || v.trim() === '' ? NaN : Number(v);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

/** A relative depth, or null if the field is blank or not a sensible ratio. */
function depth(v: Field): number | null {
  const n = v == null || v.trim() === '' ? NaN : Number(v);
  return Number.isFinite(n) && n >= 0 && n <= 3 ? n : null;
}

/** The camera's latest count, or null before the first good upload. Only polls while `enabled`. */
export function useSquatReps(enabled: boolean): SquatReps | null {
  const [reps, setReps] = useState<SquatReps | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let stopped = false;
    const poll = async () => {
      try {
        const res = await fetch(LAST_URL, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        // A private or empty channel answers with a bare -1 instead of an entry.
        const e = (await res.json()) as Entry | -1;
        if (e === -1) throw new Error('channel not readable (is it public?)');
        const total = count(e.field1);
        const good = count(e.field2);
        const at = Date.parse(e.created_at);
        // Skip a bad upload and keep the last good count.
        if (stopped || total == null || good == null || good > total || Number.isNaN(at)) return;
        setReps({
          total,
          good,
          shallow: count(e.field3) ?? 0,
          kneesIn: count(e.field4) ?? 0,
          both: count(e.field5) ?? 0,
          avgDepth: depth(e.field7),
          lastDepth: depth(e.field8),
          at,
        });
      } catch (err) {
        console.warn('Squat channel poll failed:', err);
      }
    };
    poll();
    const timer = setInterval(poll, POLL_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [enabled]);

  return reps;
}

/** Share of reps with good form, as a whole percent. */
export const successPct = (r: SquatReps) => Math.round((r.good / r.total) * 100);

/** "3 shallow · 1 knees caving in · 2 both", leaving out problems with no reps. Empty if every rep was good. */
export const faultsText = (r: SquatReps) =>
  (
    [
      [r.shallow, 'shallow'],
      [r.kneesIn, 'knees caving in'],
      [r.both, 'both'],
    ] as const
  )
    .filter(([n]) => n > 0)
    .map(([n, label]) => `${n} ${label}`)
    .join(' · ');

/** "Last rep 54% of torso · avg 38%", or empty if the camera sent no depth. */
export function depthText(r: SquatReps): string {
  const pct = (d: number) => `${Math.round(d * 100)}%`;
  const parts = [
    r.lastDepth != null && `Last rep ${pct(r.lastDepth)} of torso`,
    r.avgDepth != null && `avg ${pct(r.avgDepth)}`,
  ].filter(Boolean);
  return parts.join(' · ');
}

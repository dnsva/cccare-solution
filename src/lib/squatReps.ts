import { useEffect, useState } from 'react';
import { SQUAT_CHANNEL_ID, SQUAT_REPLAY } from '../config';

/**
 * Squat reps counted by the pose-estimation camera, pulled from ThingSpeak.
 *
 * Each upload is a running count since the camera program started (pressing r on the camera resets it):
 *   1 total reps · 2 good reps · 3 shallow only · 4 knee valgus (knees caving in) only · 5 shallow and knee valgus
 *   6 good ÷ total · 7 average relative depth · 8 relative depth of the last rep
 * The camera never says how one rep went, so the latest reps come from comparing an upload with the one before.
 * Depth (7 and 8) isn't shown: the shallow counts already come from the camera's own depth check.
 */
export type RepCounts = { total: number; good: number; shallow: number; kneesIn: number; both: number };

export type SquatReps = RepCounts & {
  at: number;
  /** Reps since the camera's previous upload, or null until there are two uploads to compare. */
  recent: RepCounts | null;
};

/** ThingSpeak's free tier takes at most one upload per 15 s, so polling faster finds nothing new. */
const POLL_MS = 15_000;
/**
 * The camera program uploads every 20 s while it runs, even when nobody is squatting,
 * so no upload for this long means it has stopped.
 */
const CAMERA_STALE_MS = 60_000;

export const cameraSending = (r: SquatReps, now: number) => now - r.at < CAMERA_STALE_MS;

/** In replay mode, how long each past upload stays on screen. */
const REPLAY_MS = 4_000;

const LAST_URL = `https://api.thingspeak.com/channels/${SQUAT_CHANNEL_ID}/feeds/last.json`;
const HISTORY_URL = `https://api.thingspeak.com/channels/${SQUAT_CHANNEL_ID}/feeds.json?results=100`;

type Field = string | null | undefined;
type Entry = { created_at: string; field1?: Field; field2?: Field; field3?: Field; field4?: Field; field5?: Field };
type Upload = RepCounts & { at: number };

/** A whole number of reps, or null if the field is blank or not a count. */
function count(v: Field): number | null {
  const n = v == null || v.trim() === '' ? NaN : Number(v);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

/** One upload as reps, or null if it isn't a usable count (early test uploads only sent field 1). */
function toUpload(e: Entry): Upload | null {
  const total = count(e.field1);
  const good = count(e.field2);
  const at = Date.parse(e.created_at);
  if (total == null || good == null || good > total || Number.isNaN(at)) return null;
  return { total, good, shallow: count(e.field3) ?? 0, kneesIn: count(e.field4) ?? 0, both: count(e.field5) ?? 0, at };
}

const KINDS = ['total', 'good', 'shallow', 'kneesIn', 'both'] as const;

/** Reps between two uploads. A lower count means the camera was reset, so everything since then is new. */
function since(prev: RepCounts, cur: RepCounts): RepCounts {
  const diff = Object.fromEntries(KINDS.map((k) => [k, cur[k] - prev[k]])) as RepCounts;
  return KINDS.some((k) => diff[k] < 0) ? cur : diff;
}

/** Adds a new upload, working out the reps since the previous one. The same upload twice changes nothing. */
const withUpload = (prev: SquatReps | null, next: Upload): SquatReps =>
  prev?.at === next.at ? prev : { ...next, recent: prev ? since(prev, next) : null };

/** The camera's latest count, or null before the first good upload. Only polls while `enabled`. */
export function useSquatReps(enabled: boolean): SquatReps | null {
  const [reps, setReps] = useState<SquatReps | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let stopped = false;
    if (SQUAT_REPLAY) {
      // Step through the past uploads in a loop, each stamped as just arrived so it counts as this class.
      let timer: ReturnType<typeof setInterval> | undefined;
      fetch(HISTORY_URL, { cache: 'no-store' })
        .then((res) => res.json() as Promise<{ feeds?: Entry[] } | -1>)
        .then((data) => {
          const past = data === -1 ? [] : (data.feeds ?? []).flatMap((e) => toUpload(e) ?? []);
          if (stopped || !past.length) return;
          let i = 0;
          const step = () => {
            // Pick the upload outside setReps: React may run the update twice, which would skip uploads.
            const next = { ...past[i++ % past.length], at: Date.now() };
            setReps((prev) => withUpload(prev, next));
          };
          step();
          timer = setInterval(step, REPLAY_MS);
        })
        .catch((err) => console.warn('Squat replay failed:', err));
      return () => {
        stopped = true;
        clearInterval(timer);
      };
    }

    const poll = async () => {
      try {
        const res = await fetch(LAST_URL, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        // A private or empty channel answers with a bare -1 instead of an entry.
        const e = (await res.json()) as Entry | -1;
        if (e === -1) throw new Error('channel not readable (is it public?)');
        const next = toUpload(e);
        // Skip a bad upload and keep the last good count.
        if (!stopped && next) setReps((prev) => withUpload(prev, next));
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
export const successPct = (r: RepCounts) => Math.round((r.good / r.total) * 100);

/** The form problem to coach: whichever came up in more reps. Empty if every rep was good. */
export function mainProblem(r: RepCounts): string {
  const shallow = r.shallow + r.both;
  const kneesIn = r.kneesIn + r.both;
  if (!shallow && !kneesIn) return '';
  if (shallow === kneesIn) return 'too shallow and knees caving in';
  return shallow > kneesIn ? 'too shallow' : 'knees caving in';
}

/** "1 good, 2 too shallow", leaving out kinds with no reps. */
export const repsText = (r: RepCounts) =>
  (
    [
      [r.good, 'good'],
      [r.shallow, 'too shallow'],
      [r.kneesIn, 'knees caving in'],
      [r.both, 'too shallow + knees caving in'],
    ] as const
  )
    .filter(([n]) => n > 0)
    .map(([n, label]) => `${n} ${label}`)
    .join(', ');

import type { HrStatus, Participant } from '../types';
import { maxHrOf, targetZone, type PhaseId } from './dosage';
import { firstName } from './format';
import { isFresh, type LiveDevices } from './liveDevices';

export type Reading = {
  id: string;
  name: string;
  first: string;
  age: number;
  status: HrStatus;
  statusText: string;
  bpm: number | null;
  /** Blood oxygen %, only from a real sensor. */
  spo2: number | null;
  /** From a real sensor rather than the simulated bracelet. */
  live: boolean;
  zone: { low: number; high: number };
  /** "98–112". */
  range: string;
  flagged: boolean;
  /** Range bar positions, as % of the 40–180 bpm scale. */
  bar: { zoneFrom: number; zoneTo: number; marker: number };
  spark: { points: string; bandY: number; bandH: number };
};

export const SPARK_W = 180;
export const SPARK_H = 40;
const SPARK_SAMPLES = 24;
const SCALE_MIN = 40;
const SCALE_MAX = 180;

/** Deterministic wobble around a base bpm, so each tick looks like a live reading. */
const simulate = (base: number, seed: number, tick: number) =>
  base + Math.round(Math.sin(tick * 0.9 + seed) * 3 + Math.cos(tick * 0.4 + seed * 2) * 2);

const scalePct = (bpm: number) => Math.max(0, Math.min(100, ((bpm - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100));
const sparkY = (bpm: number) => Math.max(1, Math.min(SPARK_H - 1, SPARK_H - ((bpm - 50) / 110) * SPARK_H));

/** What "ok" means depends on the phase: only cardio aims for the zone. */
const OK_TEXT: Record<PhaseId, string> = {
  warmup: 'Warming up',
  cardio: 'In target zone',
  cooldown: 'Cooling down',
  strength: 'Strength work',
};

/** Stable per-participant seed, so removing someone doesn't change everyone else's readings. */
const seedOf = (id: string) => [...id].reduce((sum, c) => sum + c.charCodeAt(0), 0);

/** Where the bracelet hovers: the participant's cardio pace, or an easy ~30% of reserve outside cardio. */
function baseBpm(p: Participant, phase: PhaseId): number | undefined {
  if (p.braceletBaseBpm == null) return undefined;
  if (phase === 'cardio') return p.braceletBaseBpm;
  return Math.round(p.restingBpm + (phase === 'strength' ? 0.35 : 0.3) * (maxHrOf(p) - p.restingBpm));
}

export type LiveFeed = LiveDevices & { now: number };

type Base = Pick<Reading, 'id' | 'name' | 'first' | 'age' | 'zone' | 'range'>;

const offline = (base: Base, statusText: string, live: boolean): Reading => ({
  ...base, status: 'off', statusText, bpm: null, spo2: null, live, flagged: false,
  bar: { zoneFrom: 0, zoneTo: 0, marker: 0 }, spark: { points: '', bandY: 0, bandH: 0 },
});

/** A reading with a heart rate: the last value of `history` is now. Same zone rules for real and simulated. */
function withBpm(base: Base, history: number[], spo2: number | null, phase: PhaseId, live: boolean): Reading {
  const { zone } = base;
  const bpm = history[history.length - 1];
  // Above the zone is flagged in any phase; below it only matters during cardio.
  const status: HrStatus = bpm > zone.high ? 'high' : phase === 'cardio' && bpm < zone.low ? 'low' : 'ok';
  const statusText = status === 'high' ? 'Above target zone' : status === 'low' ? 'Below target zone' : OK_TEXT[phase];
  // Right-align a short history, so a sensor that just started draws from the right edge.
  const offset = SPARK_SAMPLES - history.length;
  const points = history
    .map((v, i) => `${(((i + offset) / (SPARK_SAMPLES - 1)) * SPARK_W).toFixed(1)},${sparkY(v).toFixed(1)}`)
    .join(' ');
  return {
    ...base, status, statusText, bpm, spo2, live, flagged: status !== 'ok',
    bar: { zoneFrom: scalePct(zone.low), zoneTo: scalePct(zone.high), marker: scalePct(bpm) },
    spark: { points, bandY: sparkY(zone.high), bandH: sparkY(zone.low) - sparkY(zone.high) },
  };
}

/**
 * One reading per participant. Anyone with a real sensor (`deviceId`) reads from `live`;
 * everyone else gets the simulated bracelet.
 */
export function readHeartRates(participants: Participant[], tick: number, phase: PhaseId, live?: LiveFeed): Reading[] {
  return participants.map((p) => {
    const zone = targetZone(p);
    const base: Base = { id: p.id, name: p.name, first: firstName(p.name), age: p.age, zone, range: `${zone.low}–${zone.high}` };

    if (p.deviceId) {
      const r = live?.devices[p.deviceId];
      if (!live || !isFresh(r, live.now)) return offline(base, 'Sensor not sending', true);
      if (!r.finger || r.bpm == null) return offline(base, 'No finger on sensor', true);
      const past = live.history[p.deviceId] ?? [];
      const history = past[past.length - 1] === r.bpm ? past : [...past, r.bpm];
      return withBpm(base, history.slice(-SPARK_SAMPLES), r.spo2, phase, true);
    }

    const center = baseBpm(p, phase);
    if (center == null) return offline(base, 'Bracelet offline', false);
    const seed = seedOf(p.id);
    const history = Array.from({ length: SPARK_SAMPLES }, (_, i) => simulate(center, seed, tick - (SPARK_SAMPLES - 1) + i));
    return withBpm(base, history, null, phase, false);
  });
}

/** Message staff send when checking on a flagged participant. */
export const checkInMessage = (r: Reading) =>
  `@${r.first} ` +
  (r.status === 'high'
    ? `you're above your target zone (${r.range}). Lower the speed, incline or resistance and ease off for a minute.`
    : `how are you feeling? You're below your target zone (${r.range}). If you feel okay, raise the speed, incline or resistance a little.`);

export const alertText = (r: Reading) =>
  `${r.name} is at ${r.bpm} bpm, ${r.status === 'high' ? 'above' : 'below'} their target zone of ${r.range}.`;

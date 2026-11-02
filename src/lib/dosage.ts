/**
 * CCCARE dosing rules, from "Dosages & Exercise Sessions" and "Sample Exercises and Categories".
 * Every number the program and the live class depend on lives here.
 */
import type { Effort, FunctionalCategory, Participant, ProgramItem, Section, SessionLog, ZonePct } from '../types';

// ---------- Cardio intensity ----------

/** Moderate cardio sits at about 40–60% of heart-rate reserve (max HR − resting HR). */
export const HRR_ZONE: ZonePct = { low: 0.4, high: 0.6 };

/** Zone presets staff can prescribe per participant. */
export const ZONE_PRESETS: [string, ZonePct][] = [
  ['Lower · 30–50%', { low: 0.3, high: 0.5 }],
  ['Standard · 40–60%', HRR_ZONE],
  ['Higher · 50–70%', { low: 0.5, high: 0.7 }],
];

/** Age estimate, used only until a graded exercise test gives a measured max. */
export const estimatedMaxHr = (age: number) => 220 - age;

export const maxHrOf = (p: Pick<Participant, 'age' | 'maxBpm'>) => p.maxBpm ?? estimatedMaxHr(p.age);

type ZoneInput = Pick<Participant, 'age' | 'restingBpm' | 'maxBpm' | 'zonePct'>;

/** Target heart-rate zone in bpm (Karvonen): resting + % × reserve. */
export function targetZone(p: ZoneInput): { low: number; high: number } {
  const rest = p.restingBpm;
  const reserve = maxHrOf(p) - rest;
  const pct = p.zonePct ?? HRR_ZONE;
  return { low: Math.round(rest + pct.low * reserve), high: Math.round(rest + pct.high * reserve) };
}

export const zonePctText = (pct: ZonePct = HRR_ZONE) => `${Math.round(pct.low * 100)}–${Math.round(pct.high * 100)}%`;

// ---------- Session phases ----------

export type PhaseId = 'warmup' | 'cardio' | 'cooldown' | 'strength';
export type Phase = { id: PhaseId; label: string; min: number };

export const WARM_UP_CHOICES = [3, 4, 5];
export const CARDIO_CHOICES = [15, 20, 25, 30];
export const COOL_DOWN_CHOICES = [3, 4, 5];

type SessionPlan = Pick<Section, 'lengthMin' | 'warmUpMin' | 'cardioMin' | 'coolDownMin'>;

/** Default phase lengths for a new section: lower-fitness groups get a longer warm-up and shorter cardio. */
export function sessionDefaults(effort: Effort): Pick<Section, 'warmUpMin' | 'cardioMin' | 'coolDownMin'> {
  if (effort === 1) return { warmUpMin: 5, cardioMin: 15, coolDownMin: 5 };
  if (effort === 2) return { warmUpMin: 4, cardioMin: 20, coolDownMin: 4 };
  return { warmUpMin: 3, cardioMin: 30, coolDownMin: 3 };
}

/** Minutes left for the strength program once cardio and its warm-up and cool-down are done. */
export const strengthMin = (s: SessionPlan) => s.lengthMin - s.warmUpMin - s.cardioMin - s.coolDownMin;

export function phasesFor(s: SessionPlan): Phase[] {
  return [
    { id: 'warmup', label: 'Warm-up', min: s.warmUpMin },
    { id: 'cardio', label: 'Cardio', min: s.cardioMin },
    { id: 'cooldown', label: 'Cool-down', min: s.coolDownMin },
    { id: 'strength', label: 'Strength', min: Math.max(0, strengthMin(s)) },
  ];
}

/** When phase `index` starts, in ms from the start of class. */
export const phaseStartMs = (s: SessionPlan, index: number) =>
  phasesFor(s)
    .slice(0, index)
    .reduce((sum, p) => sum + p.min * 60_000, 0);

export type PhaseNow = { phase: Phase; index: number; phases: Phase[]; msLeft: number };

/** The phase a class is in `elapsedMs` after it started. Past the end it stays in the last phase. */
export function phaseAt(s: SessionPlan, elapsedMs: number): PhaseNow {
  const phases = phasesFor(s);
  let end = 0;
  for (let index = 0; index < phases.length; index++) {
    end += phases[index].min * 60_000;
    if (elapsedMs < end || index === phases.length - 1)
      return { phase: phases[index], index, phases, msLeft: Math.max(0, end - elapsedMs) };
  }
  throw new Error('unreachable');
}

// ---------- Strength program ----------

/** Progress to a heavier load after this many reps with good form… */
export const REPS_TO_PROGRESS = 20;
/** …in this many sessions in a row. */
export const SESSIONS_TO_PROGRESS = 2;
/** A new set of exercises comes in after this many sessions. */
export const NEW_EXERCISES_EVERY = 12;

export type ItemKind = 'mobility' | 'strength' | 'stretch';

export const kindOf = (c: FunctionalCategory): ItemKind =>
  c === 'mobility' ? 'mobility' : c === 'stretch' ? 'stretch' : 'strength';

/** Rep ranges staff can prescribe. Stretches are holds, in seconds. */
export const REP_RANGES: Record<ItemKind, [number, number][]> = {
  mobility: [
    [8, 10],
    [10, 12],
  ],
  strength: [
    [10, 12],
    [10, 15],
    [12, 15],
    [15, 20],
    [10, 20],
  ],
  stretch: [
    [20, 30],
    [30, 45],
  ],
};

export function doseText(item: Pick<ProgramItem, 'category' | 'sets' | 'reps'>): string {
  const [a, b] = item.reps;
  if (kindOf(item.category) === 'stretch') return `Hold ${a}–${b} sec`;
  return `${item.sets} set${item.sets > 1 ? 's' : ''} of ${a}–${b} reps`;
}

/** 20 reps with good form at the current load, in each of the last 2 sessions. Only strength items progress. */
export function readyForMoreLoad(item: ProgramItem, logs: SessionLog[]): boolean {
  if (kindOf(item.category) !== 'strength') return false;
  const recent = logs.slice(-SESSIONS_TO_PROGRESS).map((log) => log.entries.find((e) => e.itemId === item.id));
  return (
    recent.length === SESSIONS_TO_PROGRESS &&
    recent.every((e) => !!e && e.reps >= REPS_TO_PROGRESS && e.goodForm && e.load === item.load)
  );
}

/** Sessions done since the current exercise set started. */
export const sessionsInSet = (p: Pick<Participant, 'sessionsDone' | 'setStartedAt'>) => p.sessionsDone - p.setStartedAt;

export const newExercisesDue = (p: Pick<Participant, 'sessionsDone' | 'setStartedAt'>) =>
  sessionsInSet(p) >= NEW_EXERCISES_EVERY;

/** The last `n` logged values for one program item, oldest first. */
export const recentEntries = (itemId: string, logs: SessionLog[], n = 3) =>
  logs
    .slice(-n)
    .map((log) => log.entries.find((e) => e.itemId === itemId))
    .filter((e) => !!e);

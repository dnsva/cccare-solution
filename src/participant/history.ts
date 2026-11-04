import { categoryName, STREAK } from '../data';
import { doseText, kindOf, readyForMoreLoad, type ItemKind } from '../lib/dosage';
import type { Participant, ProgramItem, Section, SessionLog } from '../types';

export const { today } = STREAK;

export const isSameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

/** Section days run Mon → Sun; Date.getDay() runs Sun → Sat. */
export const isClassDay = (section: Pick<Section, 'days'>, date: Date) => section.days[(date.getDay() + 6) % 7];

/** Whether the participant moved on `date`. Today depends on the "I moved today" button. */
export const movedOn = (date: Date, movedToday: boolean) =>
  isSameDay(date, today) ? movedToday : date < today && !!STREAK.moved[date.getMonth()]?.has(date.getDate());

/** The first class day on or after `from`, within a week. */
export function nextClassDay(section: Pick<Section, 'days'>, from: Date): Date | undefined {
  for (let i = 0; i < 7; i++) {
    const date = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i);
    if (isClassDay(section, date)) return date;
  }
}

export type DayRecord =
  | { kind: 'class'; session: number; log?: SessionLog }
  | { kind: 'missed-class' }
  | { kind: 'moved' }
  | { kind: 'rest' };

/**
 * Past class days the participant moved on count as classes attended. Numbered back from their last
 * session, so the most recent attended class is session `sessionsDone`.
 */
function sessionByDay(section: Section, me: Participant): Map<string, number> {
  const first = new Date(today.getFullYear(), Math.min(...Object.keys(STREAK.moved).map(Number)), 1);
  const attended: Date[] = [];
  for (const d = new Date(first); d < today; d.setDate(d.getDate() + 1))
    if (isClassDay(section, d) && movedOn(d, false)) attended.push(new Date(d));
  return new Map(attended.reverse().map((d, i) => [d.toDateString(), me.sessionsDone - i] as const));
}

/** What happened on a past day. */
export function dayRecord(date: Date, section: Section | undefined, me: Participant | undefined): DayRecord {
  if (section && me && isClassDay(section, date)) {
    const session = sessionByDay(section, me).get(date.toDateString());
    if (session == null || session < 1) return { kind: 'missed-class' };
    return { kind: 'class', session, log: me.logs.find((l) => l.session === session) };
  }
  return movedOn(date, false) ? { kind: 'moved' } : { kind: 'rest' };
}

/** One exercise as the participant reads it, planned or done. */
export type ExerciseRow = {
  id: string;
  kind: ItemKind;
  name: string;
  category: string;
  /** "2 sets of 10–20 reps", or what they did: "2 sets · 14 reps". */
  detail: string;
  load?: string;
  /** A short highlight, like a heavier weight coming. */
  flag?: string;
};

export function doneText(kind: ItemKind, sets: number, reps: number): string {
  if (kind === 'stretch') return `Held ${reps} sec`;
  return `${sets} set${sets === 1 ? '' : 's'} · ${reps} reps`;
}

/** The exercises planned for the next class. */
export const plannedRows = (me: Participant): ExerciseRow[] =>
  me.program.map((item) => ({
    id: item.id,
    kind: kindOf(item.category),
    name: item.name,
    category: categoryName(item.category),
    detail: doseText(item),
    load: item.load || undefined,
    flag: readyForMoreLoad(item, me.logs) ? 'Ready for a heavier weight' : undefined,
  }));

/** What a logged session's exercises were, using the program's names. */
export function loggedRows(program: ProgramItem[], log: SessionLog): ExerciseRow[] {
  return log.entries.flatMap((e) => {
    const item = program.find((p) => p.id === e.itemId);
    if (!item) return [];
    const kind = kindOf(item.category);
    return [{ id: e.itemId, kind, name: item.name, category: categoryName(item.category), detail: doneText(kind, e.sets, e.reps), load: e.load || undefined }];
  });
}

/** "2:00 PM" + 4 → "2:04 PM". */
export function addMinutes(time: string, min: number): string {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(time.trim());
  if (!m) return time;
  const start = ((Number(m[1]) % 12) + (m[3].toUpperCase() === 'PM' ? 12 : 0)) * 60 + Number(m[2]);
  const t = (start + min) % (24 * 60);
  const h = Math.floor(t / 60);
  return `${h % 12 || 12}:${String(t % 60).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

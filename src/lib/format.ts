import type { Effort, Section, Weekdays } from '../types';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function daysText(days: Weekdays): string {
  const on = DAY_NAMES.filter((_, i) => days[i]);
  if (!on.length) return 'No days yet';
  if (on.length === 5 && !days[5] && !days[6]) return 'Weekdays';
  if (on.length === 7) return 'Every day';
  return on.length <= 2 ? on.join(' & ') : on.slice(0, -1).join(', ') + ' & ' + on[on.length - 1];
}

export const effortDots = (effort: Effort) => '●'.repeat(effort) + '○'.repeat(3 - effort);

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export const sectionWhen = (s: Pick<Section, 'days' | 'time'>) => `${daysText(s.days)} · ${s.time}`;

/** "Harold B." → "Harold". A name without a last initial, like "Goosette" or "Name 1", stays whole. */
export const firstName = (name: string) => name.replace(/\s+[A-Z]\.$/, '');

/** A section's internal id: "Gentle Strength C" → "GSC-4821". Never shown to anyone. */
export function makeSectionCode(name: string): string {
  const letters = (name.trim().split(/\s+/).map((w) => w[0]).join('').toUpperCase() + 'XXX').slice(0, 3);
  return `${letters}-${1000 + Math.floor(Math.random() * 9000)}`;
}

export function formatClock(ms: number): string {
  const sec = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

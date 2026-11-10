import { THINGSPEAK_DEVICE } from './config';
import { kindOf } from './lib/dosage';
import type { ChatMessage, ClassType, Effort, FunctionalCategory, Participant, ProgramItem, Section, SessionLog } from './types';

/** Pastel swatches a class type can use. */
export const PASTELS = ['#DCE3F5', '#D9F0E1', '#F8E6CC', '#F2DDEB', '#E6E0F5', '#FBE3DC', '#DDEFF0', '#EEF0D5'];

/** The CEP or R.Kin who prescribes programs and runs class. */
export const INSTRUCTOR = { name: 'Instructor Goose', firstName: 'Instructor Goose', initials: 'IG', credential: 'R.Kin' };

export const STAFF_LABEL = `${INSTRUCTOR.firstName} · ${INSTRUCTOR.credential}`;

export const PARTICIPANT = { id: 'p1', name: 'Goosette', firstName: 'Goosette', initials: 'G', sectionCode: 'GSM-3317' };

/** Class types group sections by baseline fitness. */
export const SEED_TYPES: ClassType[] = [
  { id: 'start', name: 'Getting started', desc: 'Lower baseline fitness: gentler cardio, lighter loads', color: '#D9F0E1', effort: 1 },
  { id: 'build', name: 'Building up', desc: 'Moderate cardio and steady strength progress', color: '#DCE3F5', effort: 2 },
  { id: 'strong', name: 'Strong & steady', desc: 'Higher baseline fitness: longer cardio, heavier loads', color: '#F8E6CC', effort: 3 },
  { id: 'seated', name: 'Seated cardio', desc: 'Recumbent bike cardio for limited balance or mobility', color: '#F2DDEB', effort: 1 },
];

/** Functional categories in session order, with CCCARE's sample exercises. */
export const CATEGORIES: { id: FunctionalCategory; name: string; examples: string[] }[] = [
  {
    id: 'mobility',
    name: 'Mobility',
    examples: ['Arm rainbows', 'Standing hip opener/closer', 'Airplane', 'Thoracic spine rotations', 'Wall angels', 'Scapular squeezes'],
  },
  { id: 'squat', name: 'Squat / lunge', examples: ['Ball squats', 'Goblet squats', 'Step-ups', 'Lunges', 'Wall sits', 'Box squats'] },
  {
    id: 'push',
    name: 'Push',
    examples: ['Push-ups', 'Chest press', 'Chest fly', 'Incline press', 'Cable crossovers', 'Wall push-ups', 'Shoulder press', 'Arnold press', 'Front raises', 'Close-grip push-ups'],
  },
  {
    id: 'hinge',
    name: 'Hinge',
    examples: ['Romanian deadlifts', 'Good mornings', 'Kettlebell swings', 'Glute bridges', 'Deadlifts', 'Stability ball leg curls'],
  },
  {
    id: 'pull',
    name: 'Pull',
    examples: ['Bent-over row', 'Seated row', 'Lat pulldown', 'Resistance band rows', 'TRX row', 'Reverse fly', 'Bicep curls', 'Hammer curls', 'Cable curls'],
  },
  { id: 'carry', name: 'Carry', examples: ["Farmer's carry", 'Suitcase carry'] },
  {
    id: 'core',
    name: 'Core',
    examples: ['Plank', 'Side plank', 'Bird dog', 'Dead bug', 'Torso rotations', 'Mountain climbers', 'Leg raises', 'Pallof press'],
  },
  {
    id: 'stretch',
    name: 'Stretches',
    examples: ['Hamstring stretch', 'Calf stretch', 'Chest doorway stretch', 'Upper trap stretch', "Child's pose", 'Hip flexor stretch', 'Cat-cow stretch', 'Neck side stretch'],
  },
];

export const categoryName = (id: FunctionalCategory) => CATEGORIES.find((c) => c.id === id)?.name ?? id;

/** Starting programs: 2 mobility, one exercise per functional category, then 2 stretches. */
const TEMPLATES: Record<Effort, [FunctionalCategory, string, string][]> = {
  1: [
    ['mobility', 'Arm rainbows', ''],
    ['mobility', 'Scapular squeezes', ''],
    ['squat', 'Box squats', 'bodyweight'],
    ['push', 'Wall push-ups', 'bodyweight'],
    ['hinge', 'Glute bridges', 'bodyweight'],
    ['pull', 'Resistance band rows', 'yellow band'],
    ['carry', 'Suitcase carry', '5 lb'],
    ['core', 'Bird dog', 'bodyweight'],
    ['stretch', 'Hamstring stretch', ''],
    ['stretch', 'Chest doorway stretch', ''],
  ],
  2: [
    ['mobility', 'Arm rainbows', ''],
    ['mobility', 'Thoracic spine rotations', ''],
    ['squat', 'Goblet squats', '10 lb'],
    ['push', 'Chest press', '15 lb'],
    ['hinge', 'Romanian deadlifts', '15 lb'],
    ['pull', 'Seated row', '25 lb'],
    ['carry', "Farmer's carry", '10 lb each'],
    ['core', 'Dead bug', 'bodyweight'],
    ['stretch', 'Hip flexor stretch', ''],
    ['stretch', 'Calf stretch', ''],
  ],
  3: [
    ['mobility', 'Wall angels', ''],
    ['mobility', 'Standing hip opener/closer', ''],
    ['squat', 'Step-ups', '10 lb'],
    ['push', 'Shoulder press', '12 lb'],
    ['hinge', 'Kettlebell swings', '15 lb'],
    ['pull', 'Lat pulldown', '40 lb'],
    ['carry', "Farmer's carry", '20 lb each'],
    ['core', 'Pallof press', 'green band'],
    ['stretch', 'Hamstring stretch', ''],
    ['stretch', "Child's pose", ''],
  ],
};

export function defaultProgram(effort: Effort): ProgramItem[] {
  const counts: Partial<Record<FunctionalCategory, number>> = {};
  return TEMPLATES[effort].map(([category, name, load]) => {
    const kind = kindOf(category);
    const n = (counts[category] = (counts[category] ?? 0) + 1);
    return {
      id: kind === 'strength' ? category : `${category}-${n}`,
      category,
      name,
      load,
      sets: kind === 'strength' && effort > 1 ? 2 : 1,
      reps: kind === 'mobility' ? [10, 12] : kind === 'stretch' ? [20, 30] : effort === 1 ? [10, 15] : [10, 20],
    };
  });
}

/** Demo history for sessions after `from` through `to`. `readyId` hits 20 good reps in the last two. */
function seedLogs(program: ProgramItem[], from: number, to: number, readyId?: string): SessionLog[] {
  const logs: SessionLog[] = [];
  for (let session = from + 1; session <= to; session++) {
    const step = session - from - 1;
    logs.push({
      session,
      entries: program.map((item, i) => {
        const strength = kindOf(item.category) === 'strength';
        const cap = Math.min(item.reps[1], 19);
        const reps = !strength
          ? item.reps[1]
          : item.id === readyId && session > to - 2
            ? 20
            : Math.min(cap, item.reps[0] + step + (i % 3));
        return { itemId: item.id, sets: item.sets, reps, load: item.load, goodForm: true };
      }),
    });
  }
  return logs;
}

// id, name, age, resting bpm, graded-test max bpm, effort, sessions done, sessions in current set
type Seed = [string, string, number, number, number | undefined, Effort, number, number];

// Goosette (the participant view) wears the real pulse oximeter; everyone else has no live reading.
// Name 4 and Name 5 haven't done a graded test yet.
const SEEDS: Seed[] = [
  ['p1', 'Goosette', 74, 66, 140, 2, 21, 9],
  ['p2', 'Name 1', 78, 72, 138, 2, 18, 6],
  ['p3', 'Name 2', 71, 70, 145, 2, 12, 12],
  ['p4', 'Name 3', 82, 68, 130, 1, 7, 7],
  ['p5', 'Name 4', 76, 70, undefined, 2, 10, 10],
  ['p6', 'Name 5', 80, 72, undefined, 1, 0, 0],
];

export const SEED_PARTICIPANTS: Record<string, Participant> = Object.fromEntries(
  SEEDS.map(([id, name, age, restingBpm, maxBpm, effort, sessionsDone, inSet]) => {
    const program = defaultProgram(effort);
    const setStartedAt = sessionsDone - inSet;
    const logs = seedLogs(program, setStartedAt, sessionsDone, id === PARTICIPANT.id ? 'squat' : undefined);
    const deviceId = id === PARTICIPANT.id ? THINGSPEAK_DEVICE : undefined;
    return [id, { id, name, age, restingBpm, maxBpm, deviceId, program, sessionsDone, setStartedAt, logs }];
  }),
);

const days = (...on: number[]) => Array.from({ length: 7 }, (_, i) => on.includes(i));

/** Seed roster: a rotation of the shared participant list, so each section has a different mix. */
const rosterSlice = (offset: number, count: number) =>
  SEEDS.map((_, i) => SEEDS[(i + offset) % SEEDS.length][0]).slice(0, count);

export const SEED_SECTIONS: Section[] = [
  { code: 'BUA-4821', name: 'Building Up A', typeId: 'build', days: days(1, 3), time: '2:00 PM', lengthMin: 60, warmUpMin: 4, cardioMin: 20, coolDownMin: 4, participantIds: rosterSlice(1, 5), videoLink: 'https://meet.google.com/fas-jala-fsr' },
  { code: 'BUB-1930', name: 'Building Up B', typeId: 'build', days: days(0, 2), time: '10:00 AM', lengthMin: 60, warmUpMin: 4, cardioMin: 20, coolDownMin: 4, participantIds: rosterSlice(3, 3), videoLink: 'https://meet.google.com/cqs-vjlx-bsi' },
  { code: 'GSM-3317', name: 'Getting Started Mornings', typeId: 'start', days: days(1, 3), time: '11:00 AM', lengthMin: 45, warmUpMin: 5, cardioMin: 15, coolDownMin: 5, participantIds: rosterSlice(0, 4), videoLink: 'https://meet.google.com/ijh-auih-ckn' },
  { code: 'SSC-7720', name: 'Strong & Steady Circuit', typeId: 'strong', days: days(0, 1, 2, 3, 4), time: '9:00 AM', lengthMin: 60, warmUpMin: 3, cardioMin: 30, coolDownMin: 3, participantIds: rosterSlice(1, 5), videoLink: 'https://meet.google.com/qgt-noha-iba' },
  { code: 'SBC-2264', name: 'Seated Bike Club', typeId: 'seated', days: days(2), time: '3:00 PM', lengthMin: 45, warmUpMin: 5, cardioMin: 15, coolDownMin: 5, participantIds: rosterSlice(4, 2), videoLink: 'https://meet.google.com/pln-ugzk-hvs' },
];

/** Sections already live when the app opens, with how long ago they started (12 min in = cardio). */
export const SEED_LIVE_MINUTES_AGO: Record<string, number> = { 'GSM-3317': 12 };

export function seedChat(section: Section | undefined): ChatMessage[] {
  if (section?.code === PARTICIPANT.sectionCode)
    return [
      { who: INSTRUCTOR.name, staff: true, announcement: true, time: 'Mon 9:00 AM', text: "Welcome to week 6! Tap today on your streak calendar to see your exercises. I'll lead them on the call." },
      { who: 'Name 2', time: 'Mon 9:20 AM', text: 'Can I use the recumbent bike instead of the treadmill today?' },
      { who: INSTRUCTOR.name, staff: true, time: 'Mon 9:31 AM', text: 'Yes! The bike is perfect, Name 2. Just keep it in your target zone.' },
      { who: 'Name 1', time: '1:48 PM', text: 'Running a minute late, save me a treadmill' },
      { who: PARTICIPANT.name, time: '1:50 PM', text: 'Water bottle ready. See you all soon!' },
    ];
  return [{ who: INSTRUCTOR.name, staff: true, announcement: true, time: 'Today', text: `Welcome to ${section ? section.name : 'class'}! Say hi below.` }];
}

/** Participant streak fixture. "Today" is pinned so the demo always reads the same. */
export const STREAK = {
  today: new Date(2026, 9, 29),
  baseDays: 12,
  record: 14,
  /** Days of the month (keyed by 0-based month) the participant logged movement, not counting today. */
  moved: {
    8: new Set([1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 21, 22, 23, 25, 28, 29]),
    9: new Set([1, 2, 3, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28]),
  } as Record<number, Set<number>>,
};

export type Role = 'instructor' | 'participant';

export type Effort = 1 | 2 | 3;

/** A grouping of sections by baseline fitness. Every section runs the same session format. */
export type ClassType = {
  id: string;
  name: string;
  /** One short line participants read: who the group is for. */
  desc: string;
  color: string;
  effort: Effort;
};

/** Mon → Sun. */
export type Weekdays = boolean[];

/** Share of heart-rate reserve, e.g. 0.4–0.6. */
export type ZonePct = { low: number; high: number };

/** Strength-program categories, in the order a session runs them. */
export type FunctionalCategory = 'mobility' | 'squat' | 'push' | 'hinge' | 'pull' | 'carry' | 'core' | 'stretch';

export type ProgramItem = {
  /** Unique within a participant's program. A swapped-in exercise gets a new id so old logs don't count toward it. */
  id: string;
  category: FunctionalCategory;
  name: string;
  sets: 1 | 2;
  /** Target rep range. For stretches, seconds held. */
  reps: [number, number];
  /** "10 lb", "green band", "bodyweight". Empty for mobility and stretches. */
  load: string;
};

export type LogEntry = {
  itemId: string;
  sets: number;
  /** Reps in the last set. */
  reps: number;
  load: string;
  goodForm: boolean;
};

export type SessionLog = {
  /** 1-based session number in the participant's whole program. */
  session: number;
  entries: LogEntry[];
};

export type Participant = {
  id: string;
  name: string;
  age: number;
  restingBpm: number;
  /** Measured on the graded exercise test. Missing means the age estimate is used. */
  maxBpm?: number;
  /** Prescribed share of heart-rate reserve. Missing means the standard 40–60%. */
  zonePct?: ZonePct;
  /** Live pulse oximeter assigned by staff. Without one, the participant has no heart-rate reading. */
  deviceId?: string;
  program: ProgramItem[];
  sessionsDone: number;
  /** `sessionsDone` when the current exercise set started. */
  setStartedAt: number;
  logs: SessionLog[];
};

export type Section = {
  /** Invite code, also the section's id. */
  code: string;
  name: string;
  typeId: string;
  days: Weekdays;
  time: string;
  lengthMin: number;
  warmUpMin: number;
  cardioMin: number;
  coolDownMin: number;
  participantIds: string[];
  videoLink?: string;
};

/** The editable parts of a section. */
export type SectionDetails = Pick<
  Section,
  'name' | 'typeId' | 'days' | 'time' | 'lengthMin' | 'warmUpMin' | 'cardioMin' | 'coolDownMin' | 'videoLink'
>;

export type ChatMessage = {
  /** Set on messages sent through the relay. Seed messages have none. */
  id?: string;
  /** Only on this device's own messages the server hasn't confirmed yet. */
  status?: 'sending' | 'failed';
  who: string;
  staff?: boolean;
  announcement?: boolean;
  time: string;
  text: string;
};

export type HrView = 'tiles' | 'list';

export type HrStatus = 'high' | 'low' | 'ok' | 'off';

/** Latest reading from a real pulse oximeter, via ThingSpeak. */
export type DeviceReading = {
  device: string;
  /** Null when there's no finger on the sensor. */
  bpm: number | null;
  spo2: number | null;
  finger: boolean;
  /** When it was taken, on this browser's clock (ms). */
  at: number;
};

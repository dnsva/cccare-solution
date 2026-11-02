import { createContext, useContext, useState, type ReactNode } from 'react';
import { defaultProgram, SEED_LIVE_MINUTES_AGO, SEED_PARTICIPANTS, SEED_SECTIONS, SEED_TYPES, seedChat } from './data';
import { phaseAt, phaseStartMs, targetZone } from './lib/dosage';
import type { ChatMessage, ClassType, LogEntry, Participant, ProgramItem, Section, SectionDetails } from './types';

export type NewParticipant = { name: string; age: number; restingBpm: number; maxBpm?: number };
export type HeartRateDetails = Pick<Participant, 'restingBpm' | 'maxBpm' | 'zonePct'>;

/** Shared demo data both roles read and write. Lives in memory and resets on reload. */
function useCccareState() {
  const [types, setTypes] = useState<ClassType[]>(SEED_TYPES);
  const [sections, setSections] = useState<Section[]>(SEED_SECTIONS);
  /** Participants live in one pool; sections list who's in them, so a program follows the person. */
  const [participants, setParticipants] = useState<Record<string, Participant>>(SEED_PARTICIPANTS);
  /** Section code → when it went live (ms). Absent means not live. */
  const [liveSince, setLiveSince] = useState<Record<string, number>>(() =>
    Object.fromEntries(Object.entries(SEED_LIVE_MINUTES_AGO).map(([code, min]) => [code, Date.now() - min * 60_000])),
  );
  const [chats, setChats] = useState<Record<string, ChatMessage[]>>({});

  const sectionByCode = (code: string) => sections.find((s) => s.code === code);
  const typeById = (id: string) => types.find((t) => t.id === id);
  const updateParticipant = (id: string, fn: (p: Participant) => Participant) =>
    setParticipants((prev) => (prev[id] ? { ...prev, [id]: fn(prev[id]) } : prev));
  const updateIds = (code: string, fn: (ids: string[]) => string[]) =>
    setSections((prev) => prev.map((s) => (s.code === code ? { ...s, participantIds: fn(s.participantIds) } : s)));

  return {
    types,
    sections,
    liveSince,
    sectionByCode,
    typeById,
    participantById: (id: string): Participant | undefined => participants[id],
    rosterFor: (section: Section): Participant[] => section.participantIds.map((id) => participants[id]).filter((p) => !!p),
    isLive: (code: string) => code in liveSince,
    setLive(code: string, live: boolean) {
      setLiveSince((prev) => {
        const next = { ...prev };
        if (live) next[code] = Date.now();
        else delete next[code];
        return next;
      });
    },
    /** Jump to the next phase by moving the class start back, so the live clock stays the one source of truth. */
    nextPhase(code: string) {
      const section = sectionByCode(code);
      const since = liveSince[code];
      if (!section || since == null) return;
      const { index, phases } = phaseAt(section, Date.now() - since);
      if (index >= phases.length - 1) return;
      setLiveSince((prev) => ({ ...prev, [code]: Date.now() - phaseStartMs(section, index + 1) }));
    },
    saveType(type: Omit<ClassType, 'id'> & { id: string | null }) {
      if (type.id) setTypes((prev) => prev.map((t) => (t.id === type.id ? { ...type, id: t.id } : t)));
      else setTypes((prev) => [...prev, { ...type, id: 'ty' + Date.now() }]);
    },
    deleteType(id: string) {
      setTypes((prev) => prev.filter((t) => t.id !== id));
    },
    addSection(section: Section) {
      setSections((prev) => [...prev, section]);
    },
    updateSection(code: string, details: SectionDetails) {
      setSections((prev) => prev.map((s) => (s.code === code ? { ...s, ...details } : s)));
    },
    deleteSection(code: string) {
      setSections((prev) => prev.filter((s) => s.code !== code));
      setLiveSince(({ [code]: _, ...rest }) => rest);
      setChats(({ [code]: _, ...rest }) => rest);
    },
    addParticipant(code: string, details: NewParticipant) {
      const section = sectionByCode(code);
      const effort = (section && typeById(section.typeId)?.effort) || 1;
      const id = 'p' + Date.now();
      const participant: Participant = {
        id,
        ...details,
        program: defaultProgram(effort),
        sessionsDone: 0,
        setStartedAt: 0,
        logs: [],
      };
      setParticipants((prev) => ({ ...prev, [id]: participant }));
      updateIds(code, (ids) => [...ids, id]);
    },
    removeParticipant(code: string, id: string) {
      updateIds(code, (ids) => ids.filter((x) => x !== id));
    },
    /** Demo stand-in for a participant pairing their bracelet in the app: cardio settles mid-zone. */
    pairBracelet(id: string) {
      updateParticipant(id, (p) => {
        const zone = targetZone(p);
        return { ...p, braceletBaseBpm: Math.round((zone.low + zone.high) / 2) + Math.floor(Math.random() * 5) - 2 };
      });
    },
    /** Staff save from the program editor: heart-rate prescription and exercises together. */
    saveProgram(id: string, hr: HeartRateDetails, program: ProgramItem[]) {
      updateParticipant(id, (p) => ({ ...p, ...hr, program }));
    },
    /** Start the next 12-session exercise set with the given exercises. */
    startNewSet(id: string, program: ProgramItem[], hr: HeartRateDetails) {
      updateParticipant(id, (p) => ({ ...p, ...hr, program, setStartedAt: p.sessionsDone }));
    },
    logSession(id: string, entries: LogEntry[]) {
      updateParticipant(id, (p) => ({
        ...p,
        sessionsDone: p.sessionsDone + 1,
        logs: [...p.logs, { session: p.sessionsDone + 1, entries }],
      }));
    },
    chatFor: (code: string) => chats[code] ?? seedChat(sectionByCode(code)),
    postMessage(code: string, message: Omit<ChatMessage, 'time'>) {
      setChats((prev) => ({
        ...prev,
        [code]: [...(prev[code] ?? seedChat(sectionByCode(code))), { ...message, time: 'Just now' }],
      }));
    },
  };
}

export type CccareStore = ReturnType<typeof useCccareState>;

const StoreContext = createContext<CccareStore | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  return <StoreContext.Provider value={useCccareState()}>{children}</StoreContext.Provider>;
}

export function useStore(): CccareStore {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used inside <StoreProvider>');
  return store;
}

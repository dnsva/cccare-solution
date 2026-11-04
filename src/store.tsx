import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { defaultProgram, SEED_LIVE_MINUTES_AGO, SEED_PARTICIPANTS, SEED_SECTIONS, SEED_TYPES, seedChat } from './data';
import { chatTime, fromRelay, newMessageId, sendToRelay, type IncomingChat, type OutgoingChat } from './lib/chatSync';
import { phaseAt, phaseStartMs, targetZone } from './lib/dosage';
import { subscribe } from './lib/relayStream';
import type { ChatMessage, ClassType, Participant, ProgramItem, Section, SectionDetails } from './types';

export type NewParticipant = { name: string; age: number; restingBpm: number; maxBpm?: number };
export type HeartRateDetails = Pick<Participant, 'restingBpm' | 'maxBpm' | 'zonePct'>;

type ChatsBySection = Record<string, ChatMessage[]>;

/** Adds a message to its section unless one with the same id is already there. */
const withMessage = (prev: ChatsBySection, section: string, message: ChatMessage): ChatsBySection =>
  prev[section]?.some((m) => m.id === message.id) ? prev : { ...prev, [section]: [...(prev[section] ?? []), message] };

const withoutMessage = (prev: ChatsBySection, section: string, id: string): ChatsBySection =>
  prev[section]?.some((m) => m.id === id) ? { ...prev, [section]: prev[section].filter((m) => m.id !== id) } : prev;

const updateMessage = (prev: ChatsBySection, section: string, id: string, fn: (m: ChatMessage) => ChatMessage): ChatsBySection =>
  prev[section]?.some((m) => m.id === id) ? { ...prev, [section]: prev[section].map((m) => (m.id === id ? fn(m) : m)) } : prev;

/**
 * Shared demo data both roles read and write. Lives in memory and resets on reload, except chat,
 * which goes through the dev server so every device on the network sees the same messages.
 */
function useCccareState() {
  const [types, setTypes] = useState<ClassType[]>(SEED_TYPES);
  const [sections, setSections] = useState<Section[]>(SEED_SECTIONS);
  /** Participants live in one pool; sections list who's in them, so a program follows the person. */
  const [participants, setParticipants] = useState<Record<string, Participant>>(SEED_PARTICIPANTS);
  /** Section code → when it went live (ms). Absent means not live. */
  const [liveSince, setLiveSince] = useState<Record<string, number>>(() =>
    Object.fromEntries(Object.entries(SEED_LIVE_MINUTES_AGO).map(([code, min]) => [code, Date.now() - min * 60_000])),
  );
  /** Messages the dev server has stored, the same on every device. */
  const [syncedChats, setSyncedChats] = useState<ChatsBySection>({});
  /** This device's messages still being sent, or that failed to send. */
  const [outbox, setOutbox] = useState<ChatsBySection>({});

  useEffect(() => {
    // The server sends every stored message when the page connects (and reconnects), then each new one.
    const stopSnapshot = subscribe('chat-snapshot', (data) => {
      const next: ChatsBySection = {};
      for (const { section, message } of (data as IncomingChat[]).map(fromRelay))
        (next[section] ??= []).push(message);
      setSyncedChats(next);
      const stored = new Set(Object.values(next).flatMap((list) => list.map((m) => m.id)));
      setOutbox((prev) =>
        Object.fromEntries(Object.entries(prev).map(([code, list]) => [code, list.filter((m) => !stored.has(m.id))])),
      );
    });
    const stopChat = subscribe('chat', (data) => {
      const { section, message } = fromRelay(data as IncomingChat);
      setSyncedChats((prev) => withMessage(prev, section, message));
      setOutbox((prev) => withoutMessage(prev, section, message.id!));
    });
    return () => {
      stopSnapshot();
      stopChat();
    };
  }, []);

  /** Sends an outbox message. On success it moves to the synced list, if the stream hasn't put it there already. */
  const deliver = async (code: string, message: ChatMessage & { id: string }) => {
    const { who, staff, announcement, text } = message;
    const ok = await sendToRelay(code, message.id, { who, staff, announcement, text });
    if (ok) {
      setSyncedChats((prev) => withMessage(prev, code, { ...message, status: undefined }));
      setOutbox((prev) => withoutMessage(prev, code, message.id));
    } else {
      setOutbox((prev) => updateMessage(prev, code, message.id, (m) => ({ ...m, status: 'failed' })));
    }
  };

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
      setSyncedChats(({ [code]: _, ...rest }) => rest);
      setOutbox(({ [code]: _, ...rest }) => rest);
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
    /** Give a participant the real pulse oximeter (or take it back). A device belongs to one person at a time. */
    assignDevice(id: string, deviceId: string | undefined) {
      setParticipants((prev) =>
        Object.fromEntries(
          Object.entries(prev).map(([pid, p]) => {
            if (pid === id) return [pid, { ...p, deviceId }];
            if (deviceId && p.deviceId === deviceId) return [pid, { ...p, deviceId: undefined }];
            return [pid, p];
          }),
        ),
      );
    },
    /** Staff save from the program editor: heart-rate prescription and exercises together. */
    saveProgram(id: string, hr: HeartRateDetails, program: ProgramItem[]) {
      updateParticipant(id, (p) => ({ ...p, ...hr, program }));
    },
    /** Start the next 12-session exercise set with the given exercises. */
    startNewSet(id: string, program: ProgramItem[], hr: HeartRateDetails) {
      updateParticipant(id, (p) => ({ ...p, ...hr, program, setStartedAt: p.sessionsDone }));
    },
    /** Seed messages, then what the server has stored, then this device's unsent messages. */
    chatFor: (code: string): ChatMessage[] => [
      ...seedChat(sectionByCode(code)),
      ...(syncedChats[code] ?? []),
      ...(outbox[code] ?? []),
    ],
    postMessage(code: string, message: OutgoingChat) {
      const pending = { ...message, id: newMessageId(), time: chatTime(Date.now()), status: 'sending' as const };
      setOutbox((prev) => withMessage(prev, code, pending));
      void deliver(code, pending);
    },
    /** Tries a failed message again. The same id means the server stores it once even if the first try got through. */
    retryMessage(code: string, id: string) {
      const message = outbox[code]?.find((m) => m.id === id);
      if (!message || message.status !== 'failed') return;
      setOutbox((prev) => updateMessage(prev, code, id, (m) => ({ ...m, status: 'sending' })));
      void deliver(code, { ...message, id });
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

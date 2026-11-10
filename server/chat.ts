/**
 * Class chat kept by the dev server, so staff and participants on different devices see the same messages.
 * Messages live in memory only: restarting `npm run dev` clears every chat.
 *
 * A page POSTs a message to /api/chat:
 *   {"id":"m-k3j9x2","section":"GSM-3317","who":"Goosette","text":"On my way!"}
 *   {"id":"m-p0q8w1","section":"GSM-3317","who":"Instructor Goose","staff":true,"announcement":true,"text":"Bring water"}
 * `id` is made by the sender, so a retried send is stored once.
 */

export type RelayChatMessage = {
  id: string;
  section: string;
  who: string;
  text: string;
  staff: boolean;
  announcement: boolean;
  at: number;
};

const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const SECTION_RE = /^[A-Za-z0-9_-]{1,32}$/;
const MAX_WHO = 60;
export const MAX_TEXT = 500;
/** Oldest messages drop off past this, per section. */
const MAX_PER_SECTION = 200;

/** A valid message, or the reason it was rejected. */
export function validateChat(input: Record<string, unknown>, now: number): RelayChatMessage | string {
  const id = String(input.id ?? '');
  if (!ID_RE.test(id)) return 'id must be 1-64 letters, digits, - or _';
  const section = String(input.section ?? '');
  if (!SECTION_RE.test(section)) return 'section must be 1-32 letters, digits, - or _';
  const who = typeof input.who === 'string' ? input.who.trim() : '';
  if (!who || who.length > MAX_WHO) return `who must be 1-${MAX_WHO} characters`;
  const text = typeof input.text === 'string' ? input.text.trim() : '';
  if (!text || text.length > MAX_TEXT) return `text must be 1-${MAX_TEXT} characters`;
  const staff = input.staff === true;
  // Only staff post announcements.
  const announcement = staff && input.announcement === true;
  return { id, section, who, text, staff, announcement, at: now };
}

export function createChatStore() {
  const bySection = new Map<string, RelayChatMessage[]>();
  const seen = new Set<string>();

  return {
    /** Stores the message. False when a message with this id is already stored. */
    add(message: RelayChatMessage): boolean {
      if (seen.has(message.id)) return false;
      const list = bySection.get(message.section) ?? [];
      list.push(message);
      while (list.length > MAX_PER_SECTION) seen.delete(list.shift()!.id);
      bySection.set(message.section, list);
      seen.add(message.id);
      return true;
    },
    all: (): RelayChatMessage[] => [...bySection.values()].flat(),
  };
}

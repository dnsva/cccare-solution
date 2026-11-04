import type { ChatMessage } from '../types';

/** What the relay sends: the message with its age instead of a timestamp (see server/chat.ts). */
export type IncomingChat = {
  id: string;
  section: string;
  who: string;
  text: string;
  staff: boolean;
  announcement: boolean;
  ageMs: number;
};

export type OutgoingChat = Pick<ChatMessage, 'who' | 'staff' | 'announcement' | 'text'>;

/** Clock time as the chat shows it, like "1:52 PM". */
export const chatTime = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

// Math.random, not crypto.randomUUID: phones reach the dev server over plain http, where randomUUID is missing.
export const newMessageId = () => 'm-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);

export const fromRelay = (m: IncomingChat): { section: string; message: ChatMessage } => ({
  section: m.section,
  message: {
    id: m.id,
    who: m.who,
    text: m.text,
    staff: m.staff || undefined,
    announcement: m.announcement || undefined,
    time: chatTime(Date.now() - m.ageMs),
  },
});

/** Sends one message to the relay. Resolves true once the server has stored it. */
export async function sendToRelay(section: string, id: string, message: OutgoingChat): Promise<boolean> {
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, section, ...message }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

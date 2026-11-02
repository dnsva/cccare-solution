import { ChatLog } from '../components/ChatLog';
import { INSTRUCTOR } from '../data';
import { plural } from '../lib/format';
import { useStore } from '../store';
import type { Section } from '../types';

type Props = {
  section: Section;
  draft: string;
  onDraft: (text: string) => void;
  announcing: boolean;
  onAnnouncing: (on: boolean) => void;
};

export function ClassChat({ section, draft, onDraft, announcing, onAnnouncing }: Props) {
  const store = useStore();

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    store.postMessage(section.code, { who: INSTRUCTOR.name, staff: true, announcement: announcing, text });
    onDraft('');
    onAnnouncing(false);
  };

  return (
    <div className="i-chat">
      <div className="i-chat__head">
        <b>Class chat</b>
        <span className="muted">{plural(section.participantIds.length, 'participant')} + you</span>
      </div>
      <ChatLog messages={store.chatFor(section.code)} viewer="instructor" />
      <div className="i-chat__composer">
        <input
          className="input i-chat__input"
          aria-label="Message the class"
          placeholder="Message the class…"
          value={draft}
          onChange={(e) => onDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
        />
        <button className="i-chat__ann" aria-pressed={announcing} onClick={() => onAnnouncing(!announcing)}>
          <span className="i-chat__check">{announcing ? '✓' : ''}</span>
          Announcement
        </button>
        <button className="btn btn--primary i-chat__send" onClick={send}>
          {announcing ? 'Post announcement' : 'Send'}
        </button>
      </div>
    </div>
  );
}

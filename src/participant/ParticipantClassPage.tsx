import { ChatLog } from '../components/ChatLog';
import { INSTRUCTOR, PARTICIPANT, STAFF_LABEL } from '../data';
import { strengthMin } from '../lib/dosage';
import { daysText, sectionWhen } from '../lib/format';
import { useStore } from '../store';

const QUICK_REPLIES = ['On my way!', 'Feeling good today', 'Tired, taking it easy', 'Thanks!'];

type Props = {
  draft: string;
  onDraft: (text: string) => void;
};

export function ParticipantClassPage({ draft, onDraft }: Props) {
  const store = useStore();
  const section = store.sectionByCode(PARTICIPANT.sectionCode);
  const me = section?.participantIds.includes(PARTICIPANT.id) ? store.participantById(PARTICIPANT.id) : undefined;
  const live = !!section && store.isLive(section.code);

  if (!section || !me)
    return (
      <main className="p-class">
        <section className="p-empty">
          <h1 className="display p-empty__title">You're not in a class yet</h1>
          <p>Ask your {INSTRUCTOR.credential} for an invite code. Once you're added, your class and its chat show up here.</p>
        </section>
      </main>
    );

  const type = store.typeById(section.typeId);

  const send = (text: string) => {
    const v = text.trim();
    if (v) store.postMessage(section.code, { who: PARTICIPANT.name, text: v });
  };

  return (
    <main className="p-class">
      {live ? (
        <section className="p-class__banner">
          <b role="status">● Class is in session</b>
          {section.videoLink && (
            <a className="p-class__meet" href={section.videoLink} target="_blank" rel="noopener noreferrer">
              Join Google Meet
            </a>
          )}
        </section>
      ) : (
        <section className="p-class__hero" style={{ background: type?.color ?? 'var(--sky)' }}>
          <div className="p-class__info">
            <span className="p-class__type">{type?.name}</span>
            <h1 className="display p-class__title">{section.name}</h1>
            <span>
              {sectionWhen(section)} · {STAFF_LABEL}
            </span>
            <span className="p-class__plan">
              {section.warmUpMin} min warm-up · {section.cardioMin} min cardio · {section.coolDownMin} min cool-down ·{' '}
              {Math.max(0, strengthMin(section))} min strength
            </span>
          </div>
          <div className="p-class__join-wrap">
            <button className="p-class__join" disabled>
              Not started yet
            </button>
            <span className="p-class__join-hint">
              {INSTRUCTOR.firstName} starts class {daysText(section.days)} at {section.time}.
            </span>
          </div>
        </section>
      )}

      <section className="p-chat">
        <h2 className="p-chat__head">Class chat</h2>
        <ChatLog
          messages={store.chatFor(section.code)}
          viewer="participant"
          participantName={PARTICIPANT.name}
          onRetry={(id) => store.retryMessage(section.code, id)}
        />
        <div className="p-chat__composer">
          <div className="p-chat__quick">
            {QUICK_REPLIES.map((q) => (
              <button key={q} onClick={() => send(q)}>
                {q}
              </button>
            ))}
          </div>
          <div className="p-chat__row">
            <input
              className="p-chat__input"
              aria-label="Type a message"
              placeholder="Or type a message…"
              value={draft}
              onChange={(e) => onDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  send(draft);
                  onDraft('');
                }
              }}
            />
            <button
              className="p-chat__send"
              onClick={() => {
                send(draft);
                onDraft('');
              }}
            >
              Send
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

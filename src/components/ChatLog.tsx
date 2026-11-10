import { INSTRUCTOR } from '../data';
import type { ChatMessage, Role } from '../types';

type Props = {
  messages: ChatMessage[];
  viewer: Role;
  /** Name the participant viewer posts as. */
  participantName?: string;
  /** Resend a message that failed to send. */
  onRetry?: (id: string) => void;
};

/** Message history, newest at the bottom. Uses column-reverse so it stays scrolled to the latest. */
export function ChatLog({ messages, viewer, participantName, onRetry }: Props) {
  /** Time, or where this device's own message stands. */
  const when = (m: ChatMessage) => {
    if (m.status === 'sending') return <span className="chat-status">Sending…</span>;
    if (m.status === 'failed')
      return (
        <span className="chat-status chat-status--failed">
          Not sent
          {onRetry && m.id && (
            <>
              {' · '}
              <button className="chat-status__retry" onClick={() => onRetry(m.id!)}>
                Try again
              </button>
            </>
          )}
        </span>
      );
    return m.time;
  };

  return (
    <div className={`chat-log chat-log--${viewer}`}>
      {messages
        .map((m, i) => {
          const mine = viewer === 'instructor' ? !!m.staff : m.who === participantName;
          const name = mine ? 'You' : m.who + (m.staff ? ` · ${INSTRUCTOR.credential}` : '');
          if (m.announcement)
            return (
              <div key={m.id ?? i} className="chat-ann">
                {viewer === 'instructor' ? (
                  <div className="chat-ann__meta">
                    <span className="chat-ann__tag">ANNOUNCEMENT</span>
                    <span>
                      {name} · {when(m)}
                    </span>
                  </div>
                ) : (
                  <div className="chat-ann__meta">
                    Announcement · {name} · {when(m)}
                  </div>
                )}
                <div className="chat-ann__text">{m.text}</div>
              </div>
            );
          const tone = mine ? 'mine' : m.staff ? 'staff' : 'other';
          // Same sender, same minute, right after their last message: skip the repeated name line.
          const prev = messages[i - 1];
          const continues =
            !!prev && !prev.announcement && !prev.status && !m.status &&
            prev.who === m.who && !!prev.staff === !!m.staff && prev.time === m.time;
          return (
            <div
              key={m.id ?? i}
              className={`chat-msg chat-msg--${tone}${m.status ? ' chat-msg--' + m.status : ''}${continues ? ' chat-msg--cont' : ''}`}
            >
              {!continues && (
                <span className="chat-msg__name">
                  {name} · {when(m)}
                </span>
              )}
              <div className="chat-msg__bubble">{m.text}</div>
            </div>
          );
        })
        .reverse()}
    </div>
  );
}

import { INSTRUCTOR } from '../data';
import type { ChatMessage, Role } from '../types';

type Props = {
  messages: ChatMessage[];
  viewer: Role;
  /** Name the participant viewer posts as. */
  participantName?: string;
};

/** Message history, newest at the bottom. Uses column-reverse so it stays scrolled to the latest. */
export function ChatLog({ messages, viewer, participantName }: Props) {
  return (
    <div className={`chat-log chat-log--${viewer}`}>
      {messages
        .map((m, i) => {
          const mine = viewer === 'instructor' ? !!m.staff : m.who === participantName;
          const name = mine ? 'You' : m.who + (m.staff ? ` · ${INSTRUCTOR.credential}` : '');
          if (m.announcement)
            return (
              <div key={i} className="chat-ann">
                {viewer === 'instructor' ? (
                  <div className="chat-ann__meta">
                    <span className="chat-ann__tag">ANNOUNCEMENT</span>
                    <span>
                      {name} · {m.time}
                    </span>
                  </div>
                ) : (
                  <div className="chat-ann__meta">
                    Announcement · {name} · {m.time}
                  </div>
                )}
                <div className="chat-ann__text">{m.text}</div>
              </div>
            );
          const tone = mine ? 'mine' : m.staff ? 'staff' : 'other';
          return (
            <div key={i} className={`chat-msg chat-msg--${tone}`}>
              <span className="chat-msg__name">
                {name} · {m.time}
              </span>
              <div className="chat-msg__bubble">{m.text}</div>
            </div>
          );
        })
        .reverse()}
    </div>
  );
}

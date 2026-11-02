import { useState } from 'react';
import { PARTICIPANT_TEXT_SIZE } from '../config';
import { PARTICIPANT, STREAK } from '../data';
import { ParticipantClassPage } from './ParticipantClassPage';
import { ProgramPage } from './ProgramPage';
import { StreakPage } from './StreakPage';
import './participant.css';

type Tab = 'streak' | 'program' | 'class';

const TABS: [Tab, string][] = [
  ['streak', 'My streak'],
  ['program', 'My program'],
  ['class', 'My class'],
];

export function ParticipantApp() {
  const [tab, setTab] = useState<Tab>('streak');
  const [movedToday, setMovedToday] = useState(false);
  const [month, setMonth] = useState(STREAK.today.getMonth());
  const [draft, setDraft] = useState('');
  const [joined, setJoined] = useState(false);
  /** Session number logged today, if any. */
  const [loggedSession, setLoggedSession] = useState<number | null>(null);

  return (
    <div className="participant" style={{ fontSize: PARTICIPANT_TEXT_SIZE }}>
      <header className="p-header">
        <div className="p-header__inner">
          <span className="p-logo">CCCARE</span>
          <nav className="p-nav">
            {TABS.map(([key, label]) => (
              <button key={key} aria-current={tab === key ? 'page' : undefined} onClick={() => setTab(key)}>
                {label}
              </button>
            ))}
          </nav>
          <span className="p-avatar" aria-label={PARTICIPANT.name}>
            {PARTICIPANT.initials}
          </span>
        </div>
      </header>
      {/* All tabs stay mounted so an unsaved log or chat draft survives switching tabs. */}
      <div hidden={tab !== 'streak'}>
        <StreakPage movedToday={movedToday} onToggleToday={() => setMovedToday((v) => !v)} month={month} onMonth={setMonth} />
      </div>
      <div hidden={tab !== 'program'}>
        <ProgramPage
          loggedSession={loggedSession}
          onLogged={(session) => {
            setLoggedSession(session);
            setMovedToday(true);
          }}
          onLogAnother={() => setLoggedSession(null)}
        />
      </div>
      <div hidden={tab !== 'class'}>
        <ParticipantClassPage
          draft={draft}
          onDraft={setDraft}
          joined={joined}
          onJoined={setJoined}
          onOpenProgram={() => setTab('program')}
        />
      </div>
    </div>
  );
}

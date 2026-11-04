import { useState } from 'react';
import { PARTICIPANT_TEXT_SIZE } from '../config';
import { PARTICIPANT, STREAK } from '../data';
import { ParticipantClassPage } from './ParticipantClassPage';
import { StreakPage } from './StreakPage';
import { TodayPage } from './TodayPage';
import './participant.css';

type Tab = 'streak' | 'today' | 'class';

const TABS: [Tab, string][] = [
  ['streak', 'My streak'],
  ['today', "Today's plan"],
  ['class', 'My class'],
];

export function ParticipantApp() {
  const [tab, setTab] = useState<Tab>('streak');
  const [movedToday, setMovedToday] = useState(false);
  const [month, setMonth] = useState(STREAK.today.getMonth());
  const [draft, setDraft] = useState('');
  const [joined, setJoined] = useState(false);

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
      {/* All tabs stay mounted so a chat draft or the picked calendar day survives switching tabs. */}
      <div hidden={tab !== 'streak'}>
        <StreakPage
          movedToday={movedToday}
          onToggleToday={() => setMovedToday((v) => !v)}
          month={month}
          onMonth={setMonth}
          onOpenPlan={() => setTab('today')}
        />
      </div>
      <div hidden={tab !== 'today'}>
        <TodayPage onGoToClass={() => setTab('class')} />
      </div>
      <div hidden={tab !== 'class'}>
        <ParticipantClassPage
          draft={draft}
          onDraft={setDraft}
          joined={joined}
          onJoined={setJoined}
          onOpenPlan={() => setTab('today')}
        />
      </div>
    </div>
  );
}

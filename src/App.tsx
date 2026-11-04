import { useState } from 'react';
import { INSTRUCTOR, PARTICIPANT } from './data';
import { InstructorApp } from './instructor/InstructorApp';
import { ParticipantApp } from './participant/ParticipantApp';
import type { Role } from './types';

export function App() {
  const [role, setRole] = useState<Role>('instructor');

  return (
    <div className="app">
      <div className="proto-bar">
        <b className="proto-bar__tag">PROTOTYPE</b>
        <span className="proto-bar__label">View as</span>
        <div className="proto-bar__roles" role="group" aria-label="View as">
          <button aria-pressed={role === 'instructor'} onClick={() => setRole('instructor')}>
            {INSTRUCTOR.credential} · {INSTRUCTOR.firstName}
          </button>
          <button aria-pressed={role === 'participant'} onClick={() => setRole('participant')}>
            Participant · {PARTICIPANT.firstName}
          </button>
        </div>
      </div>
      {/* Both stay mounted so each side keeps its place when you switch roles. */}
      <div className="app__view" hidden={role !== 'instructor'}>
        <InstructorApp />
      </div>
      <div className="app__view" hidden={role !== 'participant'}>
        <ParticipantApp />
      </div>
    </div>
  );
}

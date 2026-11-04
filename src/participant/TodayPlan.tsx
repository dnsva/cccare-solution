import { INSTRUCTOR } from '../data';
import { NEW_EXERCISES_EVERY, phasesFor, sessionsInSet, targetZone, type PhaseId, type PhaseNow } from '../lib/dosage';
import type { Participant, Section } from '../types';
import { ExerciseList } from './ExerciseList';
import { addMinutes, plannedRows } from './history';

const PHASE_HINT: Record<PhaseId, string> = {
  warmup: 'Start easy',
  cardio: 'Stay in your zone',
  cooldown: 'Slow right down',
  strength: `Follow along with ${INSTRUCTOR.firstName}`,
};

type Props = {
  section: Section;
  me: Participant;
  /** Where a live class is now. Absent when it isn't on. */
  now?: PhaseNow;
};

/** The full class plan, opened from the today panel: when each part starts, the cardio zone, every exercise. */
export function TodayPlan({ section, me, now }: Props) {
  const phases = phasesFor(section).filter((p) => p.min > 0);
  const total = phases.reduce((sum, p) => sum + p.min, 0);
  const zone = targetZone(me);
  const inSet = Math.min(sessionsInSet(me) + 1, NEW_EXERCISES_EVERY);

  let startMin = 0;
  const timeline = phases.map((phase) => {
    const at = addMinutes(section.time, startMin);
    startMin += phase.min;
    return { ...phase, at };
  });

  return (
    <div className="tp">
      <section className="tp-block">
        <h3 className="tp-block__title">How class runs</h3>
        <ol className="tp-timeline" aria-label="Class timeline">
          {timeline.map((p) => {
            const isNow = now?.phase.id === p.id;
            return (
              <li
                key={p.id}
                className={'tp-phase tp-phase--' + p.id + (isNow ? ' is-now' : '')}
                style={{ flexGrow: p.min }}
                aria-current={isNow ? 'step' : undefined}
              >
                <span className="tp-phase__bar" />
                <span className="tp-phase__at">{p.at}</span>
                <b className="tp-phase__label">{p.label}</b>
                <span className="tp-phase__min">
                  {p.min} min{isNow ? ' · now' : ''}
                </span>
                <span className="tp-phase__hint">{PHASE_HINT[p.id]}</span>
              </li>
            );
          })}
        </ol>
        <p className="tp-note">{total} minutes in all.</p>
        <div className="tp-cardio">
          <div>
            <b>Cardio on your machine</b>
            <span>Treadmill, bike or elliptical: your choice.</span>
          </div>
          <div className="tp-cardio__zone">
            <span>Your target zone</span>
            <b>
              {zone.low}–{zone.high} bpm
            </b>
          </div>
        </div>
      </section>

      <section className="tp-block">
        <div className="tp-block__head">
          <h3 className="tp-block__title">Your strength exercises</h3>
          <span className="tp-note">
            Session {me.sessionsDone + 1} · {inSet} of {NEW_EXERCISES_EVERY} with these exercises
          </span>
        </div>
        <p className="tp-follow">
          {INSTRUCTOR.firstName} leads these on the video call. Just follow along. There's nothing to tick off.
        </p>
        <ExerciseList rows={plannedRows(me)} />
        <p className="tp-note">
          Set for you by {INSTRUCTOR.name}, {INSTRUCTOR.credential}. Need a change? Ask a student volunteer or{' '}
          {INSTRUCTOR.firstName}.
        </p>
      </section>
    </div>
  );
}

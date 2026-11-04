import { INSTRUCTOR, PARTICIPANT, STAFF_LABEL } from '../data';
import { NEW_EXERCISES_EVERY, phaseAt, phasesFor, sessionsInSet, targetZone, type PhaseId } from '../lib/dosage';
import { useNow } from '../lib/useNow';
import { useStore } from '../store';
import { ExerciseList } from './ExerciseList';
import { addMinutes, isSameDay, nextClassDay, plannedRows, today } from './history';

const PHASE_HINT: Record<PhaseId, string> = {
  warmup: 'Start easy',
  cardio: 'Stay in your zone',
  cooldown: 'Slow right down',
  strength: `Follow along with ${INSTRUCTOR.firstName}`,
};

type Props = { onGoToClass: () => void };

/** A read-only look at the next class: when each part starts, and the exercises Priya will lead. */
export function TodayPage({ onGoToClass }: Props) {
  const store = useStore();
  useNow(15_000);
  const section = store.sectionByCode(PARTICIPANT.sectionCode);
  const me = section?.participantIds.includes(PARTICIPANT.id) ? store.participantById(PARTICIPANT.id) : undefined;

  if (!section || !me)
    return (
      <main className="tp">
        <section className="p-empty">
          <h1 className="display p-empty__title">No class plan yet</h1>
          <p>
            Once your {INSTRUCTOR.credential} adds you to a class and sets up your program after your first assessment, your
            plan shows up here.
          </p>
        </section>
      </main>
    );

  const type = store.typeById(section.typeId);
  const day = nextClassDay(section, today);
  const isToday = !!day && isSameDay(day, today);
  const live = isToday && store.isLive(section.code);
  const now = live ? phaseAt(section, Date.now() - store.liveSince[section.code]) : undefined;
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
    <main className="tp">
      <section className="tp-hero" style={{ background: type?.color ?? 'var(--sky)' }}>
        <span className="tp-hero__when">
          {isToday ? "Today's class" : 'Your next class'} ·{' '}
          {day?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) ?? 'not scheduled'}
        </span>
        <h1 className="display tp-hero__title">{section.name}</h1>
        <span>
          {section.time} – {addMinutes(section.time, section.lengthMin)} · with {STAFF_LABEL} on the video call
        </span>
        {live && now && (
          <div className="tp-live">
            <b>● Class is on now · {now.phase.label}</b>
            <button className="tp-live__go" onClick={onGoToClass}>
              Go to class
            </button>
          </div>
        )}
      </section>

      <section className="tp-card">
        <h2 className="tp-card__title">How class runs</h2>
        <ol className="tp-timeline" aria-label="Class timeline">
          {timeline.map((p, i) => (
            <li
              key={p.id}
              className={'tp-phase tp-phase--' + p.id + (now?.index === i ? ' is-now' : '')}
              style={{ flexGrow: p.min }}
              aria-current={now?.index === i ? 'step' : undefined}
            >
              <span className="tp-phase__bar" />
              <span className="tp-phase__at">{p.at}</span>
              <b className="tp-phase__label">{p.label}</b>
              <span className="tp-phase__min">
                {p.min} min{now?.index === i ? ' · now' : ''}
              </span>
              <span className="tp-phase__hint">{PHASE_HINT[p.id]}</span>
            </li>
          ))}
        </ol>
        <p className="tp-card__note">{total} minutes in all.</p>
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

      <section className="tp-card">
        <div className="tp-card__head">
          <h2 className="tp-card__title">Your strength exercises</h2>
          <span className="tp-card__note">
            Session {me.sessionsDone + 1} · {inSet} of {NEW_EXERCISES_EVERY} with these exercises
          </span>
        </div>
        <p className="tp-follow">
          {INSTRUCTOR.firstName} leads these on the video call. Just follow along. There's nothing to tick off.
        </p>
        <ExerciseList rows={plannedRows(me)} />
        <p className="tp-card__note">
          Set for you by {INSTRUCTOR.name}, {INSTRUCTOR.credential}. Need a change? Ask a student volunteer or{' '}
          {INSTRUCTOR.firstName}.
        </p>
      </section>
    </main>
  );
}

import { useState } from 'react';
import { categoryName, INSTRUCTOR, PARTICIPANT } from '../data';
import {
  doseText,
  kindOf,
  NEW_EXERCISES_EVERY,
  readyForMoreLoad,
  recentEntries,
  REPS_TO_PROGRESS,
  sessionsInSet,
  type ItemKind,
} from '../lib/dosage';
import { useStore } from '../store';
import type { LogEntry, Participant, ProgramItem } from '../types';

type Draft = { done: boolean; sets: number; reps: number; load: string; goodForm: boolean };

type Props = {
  loggedSession: number | null;
  onLogged: (session: number) => void;
  /** Demo shortcut: clear today's log so another session can be logged. */
  onLogAnother: () => void;
};

const GROUPS: [ItemKind, string, string][] = [
  ['mobility', '1 · Warm up your joints', 'Easy and slow. Just tick them off.'],
  ['strength', '2 · Strength', 'Log what you did so your program keeps up with you.'],
  ['stretch', '3 · Stretch it out', 'Hold each stretch gently. No bouncing.'],
];

/** Start from what they did last time at this load, or the bottom of the range if the load changed. */
function startingDraft(item: ProgramItem, me: Participant): Draft {
  const last = recentEntries(item.id, me.logs, 1)[0];
  const reps = last && last.load === item.load ? last.reps : item.reps[0];
  return { done: false, sets: item.sets, reps, load: item.load, goodForm: true };
}

export function ProgramPage({ loggedSession, onLogged, onLogAnother }: Props) {
  const store = useStore();
  const me = store.participantById(PARTICIPANT.id);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});

  if (!me)
    return (
      <main className="pp">
        <section className="p-empty">
          <h1 className="display p-empty__title">No program yet</h1>
          <p>Your {INSTRUCTOR.credential} sets up your program after your first assessment.</p>
        </section>
      </main>
    );

  const logged = loggedSession != null;
  const draftFor = (item: ProgramItem) => drafts[item.id] ?? startingDraft(item, me);
  const set = (item: ProgramItem, patch: Partial<Draft>) =>
    setDrafts((prev) => ({ ...prev, [item.id]: { ...draftFor(item), ...patch } }));
  const doneCount = me.program.filter((item) => draftFor(item).done).length;
  const inSet = sessionsInSet(me);
  const left = NEW_EXERCISES_EVERY - inSet;

  const save = () => {
    const entries: LogEntry[] = me.program
      .filter((item) => draftFor(item).done)
      .map((item) => {
        const d = draftFor(item);
        const strength = kindOf(item.category) === 'strength';
        return {
          itemId: item.id,
          sets: d.sets,
          reps: strength ? d.reps : item.reps[1],
          load: strength ? d.load.trim() : '',
          goodForm: strength ? d.goodForm : true,
        };
      });
    store.logSession(me.id, entries);
    onLogged(me.sessionsDone + 1);
    setDrafts({});
  };

  return (
    <main className="pp">
      <section className="pp-hero">
        <h1 className="display pp-hero__title">My program</h1>
        <p className="pp-hero__by">
          Set for you by {INSTRUCTOR.name}, {INSTRUCTOR.credential}
        </p>
        <div className="pp-set">
          <div className="pp-set__dots" aria-hidden="true">
            {Array.from({ length: NEW_EXERCISES_EVERY }, (_, i) => (
              <span key={i} className={i < inSet ? 'is-done' : ''} />
            ))}
          </div>
          <span>
            <b>
              {Math.min(inSet, NEW_EXERCISES_EVERY)} of {NEW_EXERCISES_EVERY}
            </b>{' '}
            sessions with these exercises.{' '}
            {left > 0 ? `New exercises in ${left} more session${left === 1 ? '' : 's'}.` : 'New exercises are coming next time!'}
          </span>
        </div>
        <p className="pp-help">
          Need a change or not sure how to progress? Ask a student volunteer or {INSTRUCTOR.firstName}.
        </p>
      </section>

      {logged && (
        <section className="pp-saved" role="status">
          <b>Session {loggedSession} logged. Nice work!</b>
          <span>
            {INSTRUCTOR.firstName} can see your sets, reps and weights. Today is marked on your streak.
          </span>
          <button className="pp-saved__again" onClick={onLogAnother}>
            Demo: log another session
          </button>
        </section>
      )}

      {GROUPS.map(([kind, title, hint]) => {
        const items = me.program.filter((item) => kindOf(item.category) === kind);
        if (!items.length) return null;
        return (
          <section key={kind} className="pp-group">
            <div className="pp-group__head">
              <h2 className="pp-group__title">{title}</h2>
              <span className="pp-group__hint">{hint}</span>
            </div>
            {items.map((item) => {
              const d = draftFor(item);
              const ready = readyForMoreLoad(item, me.logs);
              return (
                <article key={item.id} className={'pp-item' + (d.done ? ' is-done' : '')}>
                  <div className="pp-item__top">
                    <div className="pp-item__info">
                      <span className="pp-item__cat">{categoryName(item.category)}</span>
                      <h3 className="pp-item__name">{item.name}</h3>
                      <span className="pp-item__dose">
                        {doseText(item)}
                        {item.load && ` · ${item.load}`}
                      </span>
                    </div>
                    <button className="pp-done" aria-pressed={d.done} disabled={logged} onClick={() => set(item, { done: !d.done })}>
                      {d.done ? 'Done ✓' : 'Mark done'}
                    </button>
                  </div>
                  {ready && (
                    <p className="pp-item__ready">
                      You did {REPS_TO_PROGRESS} reps with good form two sessions in a row. {INSTRUCTOR.firstName} will
                      raise your weight.
                    </p>
                  )}
                  {kind === 'strength' && (
                    <div className="pp-log">
                      <div className="pp-field">
                        <span className="pp-field__label">Sets</span>
                        <div className="pp-seg">
                          {[1, 2].map((n) => (
                            <button key={n} aria-pressed={d.sets === n} disabled={logged} onClick={() => set(item, { sets: n, done: true })}>
                              {n}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="pp-field">
                        <span className="pp-field__label">Reps (last set)</span>
                        <div className="pp-stepper">
                          <button
                            aria-label="Fewer reps"
                            disabled={logged || d.reps <= 0}
                            onClick={() => set(item, { reps: d.reps - 1, done: true })}
                          >
                            −
                          </button>
                          <b className="pp-stepper__value">{d.reps}</b>
                          <button
                            aria-label="More reps"
                            disabled={logged || d.reps >= 30}
                            onClick={() => set(item, { reps: d.reps + 1, done: true })}
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <label className="pp-field">
                        <span className="pp-field__label">Weight</span>
                        <input
                          className="pp-input"
                          value={d.load}
                          disabled={logged}
                          onChange={(e) => set(item, { load: e.target.value, done: true })}
                        />
                      </label>
                      <button
                        className="pp-form"
                        aria-pressed={d.goodForm}
                        disabled={logged}
                        onClick={() => set(item, { goodForm: !d.goodForm, done: true })}
                      >
                        {d.goodForm ? '✓ Good form' : 'Form felt off'}
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </section>
        );
      })}

      {!logged && (
        <div className="pp-bar">
          <span>
            <b>{doneCount}</b> of {me.program.length} done
          </span>
          <button className="pp-bar__save" disabled={doneCount === 0} onClick={save}>
            Save today's log
          </button>
        </div>
      )}
    </main>
  );
}

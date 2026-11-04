import { useState } from 'react';
import { estimatedMaxHr, newExercisesDue, readyForMoreLoad, targetZone } from '../lib/dosage';
import { plural } from '../lib/format';
import { isFresh, useLiveDevices } from '../lib/liveDevices';
import { useNow } from '../lib/useNow';
import { useStore } from '../store';
import type { Section } from '../types';
import { ProgramModal } from './ProgramModal';

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const digits = (v: string) => v.replace(/\D/g, '');
const isIntIn = (v: number, min: number, max: number) => Number.isInteger(v) && v >= min && v <= max;

/** Section roster: add participants, open their program, pair bracelets, remove from the section. */
export function ParticipantsPanel({ section }: { section: Section }) {
  const store = useStore();
  const roster = store.rosterFor(section);
  const sensors = useLiveDevices();
  // Re-render every couple of seconds so a sensor that stops sending drops off the list.
  const now = useNow(2000);
  const sending = Object.values(sensors.devices).filter((r) => isFresh(r, now));
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [rest, setRest] = useState('');
  const [max, setMax] = useState('');
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [programFor, setProgramFor] = useState<string | null>(null);

  const ageNum = Number(age);
  const restNum = Number(rest);
  const maxNum = max ? Number(max) : undefined;
  const validMax = maxNum == null || (isIntIn(maxNum, 90, 220) && maxNum > restNum + 20);
  const canAdd = !!name.trim() && isIntIn(ageNum, 18, 110) && isIntIn(restNum, 40, 110) && validMax;

  const add = () => {
    if (!canAdd) return;
    store.addParticipant(section.code, { name: name.trim(), age: ageNum, restingBpm: restNum, maxBpm: maxNum });
    setName('');
    setAge('');
    setRest('');
    setMax('');
  };

  const programParticipant = programFor ? store.participantById(programFor) : undefined;

  return (
    <div className="roster">
      <div className="roster__head">
        <h2 className="roster__title">{plural(roster.length, 'participant')}</h2>
        {!adding && (
          <button className="btn btn--primary roster__add" onClick={() => setAdding(true)}>
            + Add participant
          </button>
        )}
      </div>

      {adding && (
        <form
          className="roster__form"
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
        >
          <label className="field roster__name">
            Name
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Dolores F." autoFocus />
          </label>
          <label className="field">
            Age
            <input className="input" inputMode="numeric" value={age} onChange={(e) => setAge(digits(e.target.value))} placeholder="72" />
          </label>
          <label className="field">
            Resting HR
            <input className="input" inputMode="numeric" value={rest} onChange={(e) => setRest(digits(e.target.value))} placeholder="68" />
          </label>
          <label className="field">
            Max HR
            <input
              className="input"
              inputMode="numeric"
              value={max}
              onChange={(e) => setMax(digits(e.target.value))}
              placeholder={age ? `est. ${estimatedMaxHr(ageNum)}` : 'optional'}
            />
          </label>
          <div className="roster__form-actions">
            <button type="button" className="btn btn--outline modal__btn" onClick={() => setAdding(false)}>
              Done
            </button>
            <button type="submit" className="btn btn--primary modal__btn" disabled={!canAdd}>
              Add
            </button>
          </div>
          <span className="field__hint roster__form-hint">
            Max HR comes from the graded exercise test. Leave it blank to estimate from age (220 − age) until they've had
            one. Their target zone is 40–60% of heart-rate reserve, and they start on the {store.typeById(section.typeId)?.name.toLowerCase()}{' '}
            program. They show as offline until their bracelet is paired.
          </span>
        </form>
      )}

      {roster.length === 0 ? (
        <div className="roster__empty">
          No participants yet. Add them here, or share invite code <b className="mono">{section.code}</b> so they can join
          themselves.
        </div>
      ) : (
        <ul className="roster__list">
          {roster.map((p) => {
            const paired = p.braceletBaseBpm != null;
            const zone = targetZone(p);
            const ready = p.program.filter((item) => readyForMoreLoad(item, p.logs)).length;
            return (
              <li key={p.id} className="roster__row">
                <span className="roster__avatar">{initials(p.name)}</span>
                <div className="roster__who">
                  <b className="roster__participant">{p.name}</b>
                  <span className="muted">
                    age {p.age} · zone {zone.low}–{zone.high} bpm{p.maxBpm == null && ' (est. max)'} · session {p.sessionsDone}
                  </span>
                  {(ready > 0 || newExercisesDue(p)) && (
                    <span className="roster__flags">
                      {newExercisesDue(p) && <span className="badge badge--due">New exercises due</span>}
                      {ready > 0 && <span className="badge badge--ready">{ready} ready for more load</span>}
                    </span>
                  )}
                </div>
                {confirmRemove === p.id ? (
                  <div className="roster__confirm">
                    <span>Remove {p.name} from this section?</span>
                    <button className="btn btn--outline roster__btn" onClick={() => setConfirmRemove(null)}>
                      Keep
                    </button>
                    <button
                      className="btn btn--danger roster__btn"
                      onClick={() => {
                        store.removeParticipant(section.code, p.id);
                        setConfirmRemove(null);
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="roster__actions">
                    <button className="btn btn--primary roster__btn" onClick={() => setProgramFor(p.id)}>
                      Program
                    </button>
                    {p.deviceId ? (
                      <>
                        <span className="roster__pill roster__pill--live">● Live sensor {p.deviceId}</span>
                        <button className="btn btn--outline roster__btn" onClick={() => store.assignDevice(p.id, undefined)}>
                          Unassign
                        </button>
                      </>
                    ) : paired ? (
                      <span className="roster__pill roster__pill--ok">● Bracelet paired</span>
                    ) : (
                      <>
                        <span className="roster__pill roster__pill--off">Not paired</span>
                        <button className="btn btn--outline roster__btn" onClick={() => store.pairBracelet(p.id)}>
                          Pair bracelet
                        </button>
                      </>
                    )}
                    {!p.deviceId &&
                      sending.map((r) => (
                        <button
                          key={r.device}
                          className="btn btn--outline roster__btn"
                          onClick={() => store.assignDevice(p.id, r.device)}
                        >
                          Use live sensor {r.device}
                          {r.bpm != null && ` · ${r.bpm} bpm`}
                        </button>
                      ))}
                    <button className="roster__remove" onClick={() => setConfirmRemove(p.id)} aria-label={`Remove ${p.name}`}>
                      Remove
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <div className="i-muted roster__foot">
        Participants can also join on their own with invite code <b className="mono">{section.code}</b>.
        {sensors.status === 'connected' &&
          (sending.length
            ? ` Live sensor ${sending.map((r) => r.device).join(', ')} is sending: use it on a participant to show their real heart rate.`
            : ' Live sensor: turn it on and it appears here once it sends a reading.')}
      </div>

      {programParticipant && <ProgramModal participant={programParticipant} onClose={() => setProgramFor(null)} />}
    </div>
  );
}

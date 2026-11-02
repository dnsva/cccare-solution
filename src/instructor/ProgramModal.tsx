import { useState } from 'react';
import { Modal } from '../components/Modal';
import { CATEGORIES } from '../data';
import {
  estimatedMaxHr,
  HRR_ZONE,
  kindOf,
  NEW_EXERCISES_EVERY,
  newExercisesDue,
  readyForMoreLoad,
  recentEntries,
  REP_RANGES,
  REPS_TO_PROGRESS,
  sessionsInSet,
  targetZone,
  ZONE_PRESETS,
  zonePctText,
} from '../lib/dosage';
import { useStore, type HeartRateDetails } from '../store';
import type { Participant, ProgramItem, ZonePct } from '../types';

const digits = (v: string) => v.replace(/\D/g, '');
const samePct = (a: ZonePct, b: ZonePct) => a.low === b.low && a.high === b.high;
const rangeKey = ([a, b]: [number, number]) => `${a}-${b}`;

/** Staff view of one participant's prescription: heart-rate zone, exercises, and their logs. */
export function ProgramModal({ participant: p, onClose }: { participant: Participant; onClose: () => void }) {
  const store = useStore();
  const [rest, setRest] = useState(String(p.restingBpm));
  const [max, setMax] = useState(p.maxBpm != null ? String(p.maxBpm) : '');
  const [pct, setPct] = useState<ZonePct>(p.zonePct ?? HRR_ZONE);
  const [program, setProgram] = useState<ProgramItem[]>(p.program);

  const restNum = Number(rest);
  const maxNum = max ? Number(max) : undefined;
  const hr: HeartRateDetails = {
    restingBpm: restNum,
    maxBpm: maxNum,
    zonePct: samePct(pct, HRR_ZONE) ? undefined : pct,
  };
  const validRest = Number.isInteger(restNum) && restNum >= 40 && restNum <= 110;
  const validMax = maxNum == null || (maxNum >= 90 && maxNum <= 220 && maxNum > restNum + 20);
  const zone = validRest && validMax ? targetZone({ age: p.age, ...hr }) : null;
  const missingLoad = program.some((item) => kindOf(item.category) === 'strength' && !item.load.trim());
  const canSave = !!zone && !missingLoad;

  const inSet = sessionsInSet(p);
  const due = newExercisesDue(p);

  const updateItem = (id: string, patch: Partial<ProgramItem>) =>
    setProgram((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  // A swapped-in exercise gets a fresh id so the old exercise's logs don't count toward its progression.
  const swap = (item: ProgramItem, name: string) =>
    updateItem(item.id, { name, id: `${item.category}-${Date.now()}`, load: kindOf(item.category) === 'strength' ? '' : item.load });

  return (
    <Modal title={`${p.name}'s program`} onClose={onClose} width={900}>
      <div className="pg-summary">
        <span>
          Age {p.age} · session {p.sessionsDone} ·{' '}
          <b>
            {Math.min(inSet, NEW_EXERCISES_EVERY)} of {NEW_EXERCISES_EVERY}
          </b>{' '}
          sessions on this exercise set
        </span>
        <div className="pg-dots" aria-hidden="true">
          {Array.from({ length: NEW_EXERCISES_EVERY }, (_, i) => (
            <span key={i} className={i < inSet ? 'is-done' : ''} />
          ))}
        </div>
      </div>

      {due && (
        <div className="pg-due">
          <span>
            <b>New exercises due.</b> {p.name.split(' ')[0]} has done {NEW_EXERCISES_EVERY} sessions with these. Swap in
            new ones below, then start the new set.
          </span>
          <button
            className="btn btn--primary modal__btn"
            disabled={!canSave}
            onClick={() => {
              store.startNewSet(p.id, program, hr);
              onClose();
            }}
          >
            Start new set
          </button>
        </div>
      )}

      <section className="pg-hr">
        <h3 className="pg-h">Cardio target zone</h3>
        <div className="pg-hr__grid">
          <label className="field">
            Resting HR
            <input className="input" inputMode="numeric" value={rest} onChange={(e) => setRest(digits(e.target.value))} />
          </label>
          <label className="field">
            Max HR (graded test)
            <input
              className="input"
              inputMode="numeric"
              value={max}
              placeholder={`est. ${estimatedMaxHr(p.age)}`}
              onChange={(e) => setMax(digits(e.target.value))}
            />
          </label>
          <div className="field">
            <span className="field__label">Share of HR reserve</span>
            <div className="choice-row">
              {ZONE_PRESETS.map(([label, preset]) => (
                <button key={label} className="btn btn--choice" aria-pressed={samePct(preset, pct)} onClick={() => setPct(preset)}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="pg-hr__zone">
          {zone ? (
            <>
              Target zone <b>{zone.low}–{zone.high} bpm</b> · {zonePctText(pct)} of reserve ({maxNum ?? `est. ${estimatedMaxHr(p.age)}`} max −{' '}
              {restNum} resting)
            </>
          ) : (
            <span className="pg-warn">Resting HR should be 40–110, and max HR at least 20 above it.</span>
          )}
        </div>
      </section>

      <section className="pg-items">
        <h3 className="pg-h">Strength program</h3>
        <p className="field__hint pg-items__hint">
          1–2 sets of 10–20 reps. Raise the load once they log {REPS_TO_PROGRESS} reps with good form two sessions in a
          row.
        </p>
        {CATEGORIES.map((cat) => {
          const items = program.filter((item) => item.category === cat.id);
          if (!items.length) return null;
          const kind = kindOf(cat.id);
          return (
            <div key={cat.id} className="pg-group">
              <div className="pg-group__name">{cat.name}</div>
              {items.map((item) => {
                const history = recentEntries(item.id, p.logs);
                const ready = readyForMoreLoad(item, p.logs);
                const options = cat.examples.includes(item.name) ? cat.examples : [item.name, ...cat.examples];
                return (
                  <div key={item.id} className="pg-row">
                    <select
                      className="input pg-row__name"
                      aria-label={`${cat.name} exercise`}
                      value={item.name}
                      onChange={(e) => swap(item, e.target.value)}
                    >
                      {options.map((name) => (
                        <option key={name}>{name}</option>
                      ))}
                    </select>
                    {kind !== 'stretch' ? (
                      <div className="pg-row__sets" role="group" aria-label="Sets">
                        {([1, 2] as const).map((n) => (
                          <button key={n} className="btn btn--choice" aria-pressed={item.sets === n} onClick={() => updateItem(item.id, { sets: n })}>
                            {n}×
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span className="pg-row__sets" />
                    )}
                    <select
                      className="input pg-row__reps"
                      aria-label={kind === 'stretch' ? 'Hold' : 'Reps'}
                      value={rangeKey(item.reps)}
                      onChange={(e) => {
                        const range = REP_RANGES[kind].find((r) => rangeKey(r) === e.target.value);
                        if (range) updateItem(item.id, { reps: range });
                      }}
                    >
                      {!REP_RANGES[kind].some((r) => rangeKey(r) === rangeKey(item.reps)) && (
                        <option value={rangeKey(item.reps)}>{item.reps.join('–')}</option>
                      )}
                      {REP_RANGES[kind].map((r) => (
                        <option key={rangeKey(r)} value={rangeKey(r)}>
                          {r.join('–')} {kind === 'stretch' ? 'sec' : 'reps'}
                        </option>
                      ))}
                    </select>
                    {kind === 'strength' ? (
                      <input
                        className={'input pg-row__load' + (item.load.trim() ? '' : ' is-missing')}
                        aria-label="Load"
                        value={item.load}
                        placeholder="Load, e.g. 10 lb"
                        onChange={(e) => updateItem(item.id, { load: e.target.value })}
                      />
                    ) : (
                      <span className="pg-row__load" />
                    )}
                    <div className="pg-row__log">
                      {history.length === 0 ? (
                        <span className="muted">No logs yet</span>
                      ) : kind === 'strength' ? (
                        <span className="muted">
                          Last {history.length}: {history.map((e) => `${e.reps}${e.goodForm ? '' : '*'}`).join(' · ')} reps
                          {history.some((e) => !e.goodForm) && ' (* form needs work)'}
                        </span>
                      ) : (
                        <span className="muted">Done in the last {history.length} sessions</span>
                      )}
                      {ready && <span className="badge badge--ready">Ready for more load</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </section>

      <div className="modal__foot">
        <span className="modal__spacer">
          {missingLoad && <span className="modal__note">Add a load for every strength exercise.</span>}
        </span>
        <button className="btn btn--outline modal__btn" onClick={onClose}>
          Cancel
        </button>
        <button
          className="btn btn--primary modal__btn"
          disabled={!canSave}
          onClick={() => {
            store.saveProgram(p.id, hr, program);
            onClose();
          }}
        >
          Save program
        </button>
      </div>
    </Modal>
  );
}

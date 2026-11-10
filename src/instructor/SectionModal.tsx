import { useState } from 'react';
import { Modal } from '../components/Modal';
import { CARDIO_CHOICES, COOL_DOWN_CHOICES, sessionDefaults, strengthMin, WARM_UP_CHOICES } from '../lib/dosage';
import { daysText, makeInviteCode, plural } from '../lib/format';
import { useStore } from '../store';
import type { Effort, Section, SectionDetails } from '../types';

const DAY_LETTERS = 'MTWTFSS'.split('');
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TIMES = ['9:00 AM', '10:00 AM', '11:00 AM', '1:00 PM', '2:00 PM', '3:00 PM'];
const LENGTHS = [45, 60, 75, 90];

const blankDetails = (typeId: string, effort: Effort): SectionDetails => ({
  name: '',
  typeId,
  days: Array<boolean>(7).fill(false),
  time: '2:00 PM',
  lengthMin: 60,
  ...sessionDefaults(effort),
  videoLink: '',
});

type Props =
  | { mode: 'create'; initialTypeId: string | null; onClose: () => void }
  | { mode: 'edit'; section: Section; onClose: () => void; onDeleted: () => void };

function MinuteChoices({ label, choices, value, onChange }: { label: string; choices: number[]; value: number; onChange: (min: number) => void }) {
  return (
    <div className="field">
      <span className="field__label">{label}</span>
      <div className="choice-row">
        {choices.map((min) => (
          <button key={min} className="btn btn--choice" aria-pressed={min === value} onClick={() => onChange(min)}>
            {min} min
          </button>
        ))}
      </div>
    </div>
  );
}

/** One form for creating and editing a section. Creating ends on the invite-code screen. */
export function SectionModal(props: Props) {
  const store = useStore();
  const editing = props.mode === 'edit' ? props.section : null;
  const effortOf = (typeId: string) => store.typeById(typeId)?.effort ?? 1;
  const [form, setForm] = useState<SectionDetails>(() => {
    if (editing) {
      const { name, typeId, days, time, lengthMin, warmUpMin, cardioMin, coolDownMin, videoLink } = editing;
      return { name, typeId, days, time, lengthMin, warmUpMin, cardioMin, coolDownMin, videoLink: videoLink ?? '' };
    }
    const typeId = (props.mode === 'create' && props.initialTypeId) || store.types[0]?.id || '';
    return blankDetails(typeId, effortOf(typeId));
  });
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [copied, setCopied] = useState(false);
  const update = (patch: Partial<SectionDetails>) => setForm((prev) => ({ ...prev, ...patch }));

  const type = store.typeById(form.typeId) ?? store.types[0];
  const name = form.name.trim();
  const strength = strengthMin(form);
  const missing = [
    !name && 'a name',
    !form.days.some(Boolean) && 'at least one day',
    strength < 10 && 'at least 10 min for strength (make the class longer or the cardio shorter)',
  ].filter(Boolean);
  const details = { ...form, name, videoLink: form.videoLink?.trim() || undefined };

  const save = () => {
    if (missing.length) return;
    if (editing) {
      store.updateSection(editing.code, details);
      return props.onClose();
    }
    const code = makeInviteCode(name);
    store.addSection({ ...details, code, participantIds: [] });
    setCreatedCode(code);
  };

  if (createdCode)
    return (
      <Modal title="Section created" onClose={props.onClose}>
        <div className="sm-done">
          <div className="display sm-done__title">{name} is ready</div>
          <div className="muted sm-done__summary">
            {daysText(form.days)} · {form.time} · {form.lengthMin} min
          </div>
          <div className="sm-done__code" style={{ background: type?.color }}>
            <div className="sm-done__code-label">Invite code</div>
            <div className="sm-done__code-value">{createdCode}</div>
          </div>
          <div className="sm-done__hint">
            Participants type this once when they sign up. It puts them in this section. You can also add participants
            yourself from the section's Participants tab.
          </div>
          <button
            className="sm-done__copy"
            onClick={() => {
              navigator.clipboard?.writeText(createdCode).catch(() => {});
              setCopied(true);
            }}
          >
            {copied ? 'Copied ✓' : 'Copy code'}
          </button>
        </div>
        <div className="modal__foot">
          <button
            className="btn btn--outline modal__btn"
            onClick={() => {
              setForm(blankDetails(form.typeId, effortOf(form.typeId)));
              setCreatedCode(null);
              setCopied(false);
            }}
          >
            Add another
          </button>
          <span className="modal__spacer" />
          <button className="btn btn--primary modal__btn" onClick={props.onClose}>
            Done
          </button>
        </div>
      </Modal>
    );

  return (
    <Modal title={editing ? 'Edit section' : 'New class section'} onClose={props.onClose} width={680}>
      <label className="field">
        Section name
        <input
          className="input input--lg"
          value={form.name}
          onChange={(e) => update({ name: e.target.value })}
          placeholder="e.g. Building Up C"
          autoFocus={!editing}
        />
      </label>
      <div className="field">
        <span className="field__label">Class type</span>
        <div className="type-picker">
          {store.types.map((t) => (
            <button
              key={t.id}
              className="type-picker__btn"
              style={{ background: t.color }}
              aria-pressed={t.id === form.typeId}
              // A new section takes the type's default phase lengths; an existing one keeps its own.
              onClick={() => update(editing ? { typeId: t.id } : { typeId: t.id, ...sessionDefaults(t.effort) })}
            >
              {t.name}
              <span>{t.id === form.typeId ? '✓' : ''}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <span className="field__label">Meets on</span>
        <div className="choice-row">
          {DAY_LETTERS.map((letter, i) => (
            <button
              key={i}
              className="day-btn"
              aria-label={DAY_NAMES[i]}
              aria-pressed={form.days[i]}
              onClick={() => update({ days: form.days.map((on, j) => (j === i ? !on : on)) })}
            >
              {letter}
            </button>
          ))}
        </div>
      </div>
      <div className="sm-row">
        <div className="field">
          <span className="field__label">Start time</span>
          <div className="choice-row">
            {TIMES.map((t) => (
              <button key={t} className="btn btn--choice" aria-pressed={t === form.time} onClick={() => update({ time: t })}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <MinuteChoices label="Class length" choices={LENGTHS} value={form.lengthMin} onChange={(lengthMin) => update({ lengthMin })} />
      </div>

      <div className="sm-session">
        <div className="sm-session__head">
          <span className="field__label">Session format</span>
          <span className="field__hint">Cardio at 40–60% of heart-rate reserve, then each participant's strength program.</span>
        </div>
        <div className="sm-row">
          <MinuteChoices label="Warm-up" choices={WARM_UP_CHOICES} value={form.warmUpMin} onChange={(warmUpMin) => update({ warmUpMin })} />
          <MinuteChoices label="Cardio" choices={CARDIO_CHOICES} value={form.cardioMin} onChange={(cardioMin) => update({ cardioMin })} />
          <MinuteChoices label="Cool-down" choices={COOL_DOWN_CHOICES} value={form.coolDownMin} onChange={(coolDownMin) => update({ coolDownMin })} />
        </div>
        <div className={'sm-session__strength' + (strength < 10 ? ' is-short' : '')}>
          Strength program: <b>{Math.max(0, strength)} min</b>
        </div>
      </div>

      <label className="field">
        Google Meet link (optional)
        <input
          className="input input--md"
          value={form.videoLink}
          onChange={(e) => update({ videoLink: e.target.value })}
          placeholder="https://meet.google.com/abc-defg-hij"
        />
        <span className="field__hint">Participants see a "Join Google Meet" button with this link while class is in session.</span>
      </label>

      {editing && confirmingDelete ? (
        <div className="confirm-bar">
          <span className="confirm-bar__text">
            Delete {editing.name}? Its {plural(editing.participantIds.length, 'participant')} leave the section and the
            class chat goes with it. Their programs and logs are kept.
          </span>
          <button className="btn btn--outline modal__btn" onClick={() => setConfirmingDelete(false)}>
            Keep it
          </button>
          <button
            className="btn btn--danger modal__btn"
            onClick={() => {
              store.deleteSection(editing.code);
              props.mode === 'edit' && props.onDeleted();
            }}
          >
            Yes, delete
          </button>
        </div>
      ) : (
        <div className="modal__foot">
          {editing && (
            <button className="modal__delete" onClick={() => setConfirmingDelete(true)}>
              Delete section
            </button>
          )}
          <span className="modal__spacer">
            {missing.length > 0 && <span className="modal__note">Add {missing.join(' and ')}.</span>}
          </span>
          <button className="btn btn--outline modal__btn" onClick={props.onClose}>
            Cancel
          </button>
          <button className="btn btn--primary modal__btn" disabled={missing.length > 0} onClick={save}>
            {editing ? 'Save changes' : 'Create + get invite code'}
          </button>
        </div>
      )}
    </Modal>
  );
}

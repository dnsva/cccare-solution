import { useState } from 'react';
import { Modal } from '../components/Modal';
import { PASTELS } from '../data';
import { effortDots } from '../lib/format';
import { useStore } from '../store';
import type { ClassType, Effort } from '../types';

const EFFORTS: [Effort, string][] = [
  [1, 'Easy'],
  [2, 'Medium'],
  [3, 'Harder'],
];

/** Create a class type (`type` null) or edit an existing one. */
export function TypeModal({ type, onClose }: { type: ClassType | null; onClose: () => void }) {
  const store = useStore();
  const [form, setForm] = useState(() => {
    if (type) return { ...type };
    const used = store.types.map((t) => t.color);
    return { name: '', desc: '', color: PASTELS.find((c) => !used.includes(c)) ?? PASTELS[0], effort: 1 as Effort };
  });
  const update = (patch: Partial<typeof form>) => setForm((prev) => ({ ...prev, ...patch }));

  const sectionCount = type ? store.sections.filter((s) => s.typeId === type.id).length : 0;
  const canSave = !!form.name.trim();

  const save = () => {
    if (!canSave) return;
    store.saveType({ ...form, id: type?.id ?? null, name: form.name.trim(), desc: form.desc.trim() });
    onClose();
  };

  return (
    <Modal title={type ? 'Edit class type' : 'New class type'} onClose={onClose}>
      <div className="type-card" style={{ background: form.color }}>
        <span className="type-card__name">{form.name || 'Type name'}</span>
        <span className="type-card__desc">{form.desc || 'One line on who it helps'}</span>
        <span className="type-card__effort">Effort {effortDots(form.effort)}</span>
      </div>
      <label className="field">
        Name
        <input
          className="input"
          value={form.name}
          onChange={(e) => update({ name: e.target.value })}
          placeholder="e.g. Post-rehab strength"
        />
      </label>
      <label className="field">
        Who it's for
        <input
          className="input"
          value={form.desc}
          onChange={(e) => update({ desc: e.target.value })}
          placeholder="One short line participants will read"
        />
      </label>
      <div className="field">
        <span className="field__label">Color</span>
        <div className="swatches">
          {PASTELS.map((c) => (
            <button
              key={c}
              className="swatch"
              style={{ background: c }}
              aria-label={`Color ${c}`}
              aria-pressed={c === form.color}
              onClick={() => update({ color: c })}
            />
          ))}
        </div>
      </div>
      <div className="field">
        <span className="field__label">Effort</span>
        <div className="effort-row">
          {EFFORTS.map(([value, label]) => (
            <button
              key={value}
              className="btn btn--choice effort-row__btn"
              aria-pressed={value === form.effort}
              onClick={() => update({ effort: value })}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {sectionCount > 0 && (
        <div className="modal__note">
          Has {sectionCount} section{sectionCount > 1 ? 's' : ''}, so it can't be deleted yet.
        </div>
      )}
      <div className="modal__foot">
        {type && sectionCount === 0 && (
          <button
            className="modal__delete"
            onClick={() => {
              store.deleteType(type.id);
              onClose();
            }}
          >
            Delete type
          </button>
        )}
        <span className="modal__spacer" />
        <button className="btn btn--outline modal__btn" onClick={onClose}>
          Cancel
        </button>
        <button className="btn btn--primary modal__btn" disabled={!canSave} onClick={save}>
          Save type
        </button>
      </div>
    </Modal>
  );
}

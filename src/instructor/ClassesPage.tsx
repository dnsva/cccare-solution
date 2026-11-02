import { effortDots, plural, sectionWhen } from '../lib/format';
import { useStore } from '../store';
import type { ClassType } from '../types';

type Props = {
  onOpenSection: (code: string) => void;
  /** `null` creates a new type. */
  onEditType: (type: ClassType | null) => void;
  /** `null` lets the instructor pick the type. */
  onNewSection: (typeId: string | null) => void;
};

export function ClassesPage({ onOpenSection, onEditType, onNewSection }: Props) {
  const { types, sections, isLive } = useStore();
  const participants = new Set(sections.flatMap((s) => s.participantIds)).size;

  return (
    <div className="i-page">
      <div className="i-page__head">
        <div>
          <h1 className="display i-page__title">My classes</h1>
          <div className="i-page__summary">
            {plural(types.length, 'class type')} · {plural(sections.length, 'section')} · {plural(participants, 'participant')}
          </div>
        </div>
        <div className="i-page__actions">
          <button className="btn btn--outline" onClick={() => onEditType(null)}>
            + New class type
          </button>
          <button className="btn btn--primary" onClick={() => onNewSection(null)}>
            + New class section
          </button>
        </div>
      </div>

      <div className="type-grid">
        {types.map((type) => {
          const typeSections = sections.filter((s) => s.typeId === type.id);
          return (
            <section key={type.id} className="type-col" aria-label={type.name}>
              <header className="type-card" style={{ background: type.color }}>
                <h2 className="type-card__name">{type.name}</h2>
                <span className="type-card__desc">{type.desc}</span>
                <div className="type-card__bottom">
                  <span className="type-card__effort">Effort {effortDots(type.effort)}</span>
                  <button className="edit-btn edit-btn--on-color" onClick={() => onEditType(type)}>
                    ✎ Edit type
                  </button>
                </div>
              </header>
              <div className="type-col__body">
                <div className="type-col__label">Sections · {typeSections.length}</div>
                {typeSections.map((s) => (
                  <button key={s.code} className="sec-card" onClick={() => onOpenSection(s.code)}>
                    <div className="sec-card__top">
                      <h3 className="sec-card__name">{s.name}</h3>
                      {isLive(s.code) && <span className="live-pill">● Live now</span>}
                    </div>
                    <span className="sec-card__when">{sectionWhen(s)}</span>
                    <div className="sec-card__foot">
                      <span>{plural(s.participantIds.length, 'participant')}</span>
                      <span className="sec-card__code">{s.code}</span>
                    </div>
                  </button>
                ))}
                <button className="btn btn--dashed type-col__add" onClick={() => onNewSection(type.id)}>
                  + Add section
                </button>
              </div>
            </section>
          );
        })}
        <button className="new-type-tile" onClick={() => onEditType(null)}>
          + New class type
          <span className="new-type-tile__hint">e.g. Post-rehab strength</span>
        </button>
      </div>
    </div>
  );
}

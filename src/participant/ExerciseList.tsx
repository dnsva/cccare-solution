import type { ItemKind } from '../lib/dosage';
import type { ExerciseRow } from './history';

const GROUPS: [ItemKind, string][] = [
  ['mobility', 'Warm up your joints'],
  ['strength', 'Strength'],
  ['stretch', 'Stretch it out'],
];

type Props = {
  rows: ExerciseRow[];
  /** Smaller cards, for the calendar's day panel. */
  compact?: boolean;
};

/** Exercises in session order, numbered straight through so it's easy to follow along on the call. */
export function ExerciseList({ rows, compact }: Props) {
  let n = 0;
  return (
    <div className={'ex' + (compact ? ' ex--compact' : '')}>
      {GROUPS.map(([kind, title]) => {
        const items = rows.filter((r) => r.kind === kind);
        if (!items.length) return null;
        return (
          <section key={kind} className="ex__group">
            <h3 className="ex__title">{title}</h3>
            <ol className="ex__list">
              {items.map((row) => (
                <li key={row.id} className="ex__item">
                  <span className="ex__num" aria-hidden="true">
                    {++n}
                  </span>
                  <span className="ex__body">
                    <b className="ex__name">{row.name}</b>
                    <span className="ex__detail">
                      {row.detail}
                      {row.load && <span className="ex__load">{row.load}</span>}
                    </span>
                    {row.flag && <span className="ex__flag">↑ {row.flag}</span>}
                  </span>
                  {!compact && <span className="ex__cat">{row.category}</span>}
                </li>
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}

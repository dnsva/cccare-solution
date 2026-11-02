import type { PhaseNow } from '../lib/dosage';
import { formatClock } from '../lib/format';

/** Warm-up → cardio → cool-down → strength, sized by minutes, with the current phase highlighted. */
export function PhaseStrip({ now, onNext }: { now: PhaseNow; onNext?: () => void }) {
  const next = now.phases[now.index + 1];
  return (
    <div className="phases">
      <ol className="phases__bar" aria-label="Session phases">
        {now.phases.map((p, i) => (
          <li
            key={p.id}
            className={'phases__seg' + (i < now.index ? ' is-done' : i === now.index ? ' is-now' : '')}
            style={{ flexGrow: Math.max(p.min, 2) }}
            aria-current={i === now.index ? 'step' : undefined}
          >
            <span className="phases__name">{p.label}</span>
            <span className="phases__min">{p.min} min</span>
          </li>
        ))}
      </ol>
      <div className="phases__status">
        <b>{now.phase.label}</b>
        <span>{now.msLeft > 0 ? `${formatClock(now.msLeft)} left` : 'Running over time'}</span>
        {onNext && next && (
          <button className="phases__next" onClick={onNext}>
            Next: {next.label} →
          </button>
        )}
      </div>
    </div>
  );
}

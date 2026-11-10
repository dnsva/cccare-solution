import { alertText, SPARK_H, SPARK_W, type Reading } from '../lib/heartRate';

type MessageProps = { readings: Reading[]; onMessage: (r: Reading) => void };

const LiveBadge = ({ r }: { r: Reading }) => (r.live ? <span className="live-badge">Live</span> : null);
const spo2Text = (r: Reading) => (r.spo2 != null ? `SpO₂ ${r.spo2}%` : '');
/** No live reading: a grey placeholder rather than a number that could be mistaken for real. */
const bpmText = (r: Reading) => r.bpm ?? '00';

export function HrAlerts({ readings, onMessage, onDismiss }: MessageProps & { onDismiss: (r: Reading) => void }) {
  return readings.map((r) => (
    <div key={r.id} className={`hr-alert hr-alert--${r.status}`} role="alert">
      <b className="hr-alert__text">{alertText(r)}</b>
      <button className="hr-alert__msg" onClick={() => onMessage(r)}>
        Message {r.first}
      </button>
      <button className="hr-alert__dismiss" onClick={() => onDismiss(r)}>
        Got it
      </button>
    </div>
  ));
}

export function HrTiles({ readings }: { readings: Reading[] }) {
  return (
    <div className="hr-tiles">
      {readings.map((r) => (
        <div key={r.id} className={`hr-tile hr-${r.status}`}>
          <div className="hr-tile__head">
            <b>
              {r.name}
              <LiveBadge r={r} />
            </b>
            <span className="i-muted">age {r.age}</span>
          </div>
          <div className="hr-tile__reading">
            <span className="hr-tile__bpm">{bpmText(r)}</span>
            <span className="i-muted">bpm</span>
            {r.spo2 != null && <span className="hr-tile__spo2">{spo2Text(r)}</span>}
          </div>
          <div className="hr-range">
            {r.bpm != null && (
              <>
                <div className="hr-range__zone" style={{ left: `${r.bar.zoneFrom}%`, right: `${100 - r.bar.zoneTo}%` }} />
                <div className="hr-range__marker" style={{ left: `${r.bar.marker}%` }} />
              </>
            )}
          </div>
          <div className="hr-tile__foot">
            <span className="hr-tile__status">{r.statusText}</span>
            <span className="i-muted">zone {r.range}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

const MessageButton = ({ r, onMessage }: { r: Reading; onMessage: (r: Reading) => void }) => (
  <button className="hr-msg-btn" onClick={() => onMessage(r)}>
    Message {r.first}
  </button>
);

export function HrList({ readings, onMessage }: MessageProps) {
  const groups: [string, Reading[]][] = [
    ['Check on now', readings.filter((r) => r.flagged)],
    ['All good', readings.filter((r) => r.status === 'ok')],
    ['Offline', readings.filter((r) => r.status === 'off')],
  ];
  return (
    <div className="hr-list">
      {groups
        .filter(([, rows]) => rows.length)
        .map(([label, rows]) => (
          <div key={label} className="hr-list__group">
            <div className="hr-label">
              {label} · {rows.length}
            </div>
            {rows.map((r) => (
              <div key={r.id} className={`hr-row hr-${r.status}`}>
                <span className="hr-dot" />
                <div>
                  <b className="hr-row__name">
                    {r.name}
                    <LiveBadge r={r} />
                  </b>
                  <div className="i-muted hr-row__sub">
                    age {r.age} · {r.statusText}
                    {r.spo2 != null && ` · ${spo2Text(r)}`}
                  </div>
                </div>
                <svg className="hr-row__spark" width={SPARK_W} height={SPARK_H} aria-hidden="true">
                  <rect x="0" y={r.spark.bandY} width={SPARK_W} height={r.spark.bandH} className="hr-spark-band" />
                  <polyline points={r.spark.points} className="hr-spark-line" />
                </svg>
                <span className="hr-row__bpm">{bpmText(r)}</span>
                <span className="i-muted hr-row__range">zone {r.range}</span>
                {r.flagged ? <MessageButton r={r} onMessage={onMessage} /> : <span />}
              </div>
            ))}
          </div>
        ))}
    </div>
  );
}

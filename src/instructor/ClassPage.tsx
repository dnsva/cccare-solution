import { PhaseStrip } from '../components/PhaseStrip';
import { Segmented } from '../components/Segmented';
import { phaseAt, strengthMin, zonePctText } from '../lib/dosage';
import { daysText, formatClock, plural } from '../lib/format';
import { checkInMessage, readHeartRates, type Reading } from '../lib/heartRate';
import { isFresh, useLiveDevices } from '../lib/liveDevices';
import { useNow } from '../lib/useNow';
import { useStore } from '../store';
import type { HrView, Section } from '../types';
import { ClassChat } from './ClassChat';
import { HrAlerts, HrList, HrTiles } from './HeartRateViews';
import { ParticipantsPanel } from './ParticipantsPanel';

export type ClassTab = 'hr' | 'chat' | 'participants';

/** Per-instructor view state, kept above the page so it survives navigation. */
export type ClassUi = {
  tab: ClassTab;
  view: HrView;
  /** Section code → unsent chat text. */
  drafts: Record<string, string>;
  /** `${sectionCode}:${participantId}:${status}` → alert dismissed. */
  dismissed: Record<string, true>;
  announcing: boolean;
};

/** How often the class page re-renders. */
const READING_MS = 1500;

type Props = {
  section: Section;
  ui: ClassUi;
  updateUi: (patch: Partial<ClassUi>) => void;
  onBack: () => void;
  onEdit: () => void;
};

export function ClassPage({ section, ui, updateUi, onBack, onEdit }: Props) {
  const store = useStore();
  // Re-render regularly so the class clock ticks and a sensor that stops sending shows as stopped.
  useNow(READING_MS);
  const sensors = useLiveDevices();
  const type = store.typeById(section.typeId);
  const isLive = store.isLive(section.code);
  // Read the clock directly (useNow only drives re-renders) so "Next phase" shows the new phase right away.
  const elapsed = isLive ? Date.now() - store.liveSince[section.code] : 0;
  const phaseNow = isLive ? phaseAt(section, elapsed) : null;
  const roster = store.rosterFor(section);
  const readings = readHeartRates(roster, phaseNow?.phase.id ?? 'cardio', {
    ...sensors,
    now: Date.now(),
  });
  const sensorIds = roster.flatMap((p) => (p.deviceId ? [p.deviceId] : []));
  const sensorSending = sensorIds.some((id) => isFresh(sensors.devices[id], Date.now()));
  const hasParticipants = readings.length > 0;
  const showHr = ui.tab === 'hr' && isLive && hasParticipants;

  // Keyed by status too, so a dismissed "above zone" alert comes back if they later drop below zone.
  const dismissKey = (r: Reading) => `${section.code}:${r.id}:${r.status}`;
  const messageParticipant = (r: Reading) =>
    updateUi({ tab: 'chat', drafts: { ...ui.drafts, [section.code]: checkInMessage(r) } });

  return (
    <div className="i-page i-page--class">
      <div className="i-page__head">
        <div className="class-head">
          <nav className="crumbs" aria-label="Breadcrumb">
            <button className="crumbs__link" onClick={onBack}>
              My classes
            </button>
            <span className="crumbs__sep" aria-hidden="true">
              ›
            </span>
            <span className="type-chip" style={{ background: type?.color }}>
              {type?.name}
            </span>
          </nav>
          <div className="class-head__title-row">
            <h1 className="display class-head__title">{section.name}</h1>
            <button className="edit-btn" onClick={onEdit}>
              ✎ Edit section
            </button>
          </div>
          <div className="class-head__meta">
            <span>
              {daysText(section.days)} · {section.time} · {section.lengthMin} min
            </span>
            <span className="class-head__dot" aria-hidden="true">
              ·
            </span>
            <span>{plural(roster.length, 'participant')}</span>
            {isLive && (
              <span className="class-head__live">● Live · {formatClock(elapsed)}</span>
            )}
          </div>
          <div className="class-head__plan">
            Warm-up {section.warmUpMin} · Cardio {section.cardioMin} · Cool-down {section.coolDownMin} · Strength{' '}
            {Math.max(0, strengthMin(section))} min
          </div>
        </div>
        <div className="class-head__actions">
          <button
            className={'live-toggle' + (isLive ? '' : ' live-toggle--start')}
            onClick={() => store.setLive(section.code, !isLive)}
          >
            {isLive ? 'End class' : 'Start class'}
          </button>
        </div>
      </div>

      {phaseNow && <PhaseStrip now={phaseNow} onNext={() => store.nextPhase(section.code)} />}

      <div className="class-tabs">
        <Segmented
          label="Section view"
          options={[
            ['hr', 'Live heart rate'],
            ['chat', 'Messages'],
            ['participants', `Participants · ${roster.length}`],
          ]}
          value={ui.tab}
          onChange={(tab) => updateUi({ tab })}
        />
        {showHr && (
          <div className="class-tabs__views">
            <span className="i-muted">View</span>
            <Segmented
              small
              label="Heart rate layout"
              options={[
                ['tiles', 'Tiles'],
                ['list', 'List'],
              ]}
              value={ui.view}
              onChange={(view) => updateUi({ view })}
            />
          </div>
        )}
      </div>

      {ui.tab === 'hr' && !isLive && (
        <div className="i-empty">
          <div className="display i-empty__title">Class isn't live</div>
          <div className="i-empty__body">
            Start the class to see live heart rate against each participant's target zone. You get an alert if someone
            goes above their zone, or below it during cardio.
          </div>
          <button className="btn btn--primary i-empty__start" onClick={() => store.setLive(section.code, true)}>
            Start class
          </button>
        </div>
      )}

      {ui.tab === 'hr' && isLive && !hasParticipants && (
        <div className="i-empty">
          <div className="display i-empty__title">No participants yet</div>
          <button className="btn btn--primary i-empty__start" onClick={() => updateUi({ tab: 'participants' })}>
            Add participants
          </button>
        </div>
      )}

      {showHr && (
        <div className="hr">
          <HrAlerts
            readings={readings.filter((r) => r.flagged && !ui.dismissed[dismissKey(r)])}
            onMessage={messageParticipant}
            onDismiss={(r) => updateUi({ dismissed: { ...ui.dismissed, [dismissKey(r)]: true } })}
          />
          {ui.view === 'tiles' && <HrTiles readings={readings} />}
          {ui.view === 'list' && <HrList readings={readings} onMessage={messageParticipant} />}
          {sensorIds.length > 0 && (
            <div className={'hr-relay' + (sensorSending ? ' hr-relay--ok' : ' hr-relay--off')} role="status">
              {sensorSending
                ? '● Live sensor connected'
                : 'No sensor reading in the last minute. Check the Arduino is on and connected to Wi-Fi.'}
            </div>
          )}
          <div className="i-muted hr__note">
            Blue band = target zone, {zonePctText()} of heart-rate reserve unless prescribed otherwise. It comes from each
            participant's resting and max heart rate (graded exercise test, or the age estimate until they've had one).
            Below-zone alerts only show during cardio.
          </div>
        </div>
      )}

      {ui.tab === 'chat' && (
        <ClassChat
          section={section}
          draft={ui.drafts[section.code] ?? ''}
          onDraft={(text) => updateUi({ drafts: { ...ui.drafts, [section.code]: text } })}
          announcing={ui.announcing}
          onAnnouncing={(announcing) => updateUi({ announcing })}
        />
      )}

      {ui.tab === 'participants' && <ParticipantsPanel section={section} />}
    </div>
  );
}

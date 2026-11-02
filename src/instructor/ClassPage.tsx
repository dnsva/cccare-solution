import { PhaseStrip } from '../components/PhaseStrip';
import { Segmented } from '../components/Segmented';
import { phaseAt, strengthMin, zonePctText } from '../lib/dosage';
import { daysText, formatClock, plural } from '../lib/format';
import { checkInMessage, readHeartRates, type Reading } from '../lib/heartRate';
import { useNow } from '../lib/useNow';
import { useStore } from '../store';
import type { HrView, Section } from '../types';
import { ClassChat } from './ClassChat';
import { HrAlerts, HrList, HrPanel, HrTiles } from './HeartRateViews';
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

/** Bracelets report a new reading this often. */
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
  const now = useNow(READING_MS);
  const type = store.typeById(section.typeId);
  const live = store.isLive(section.code);
  // Read the clock directly (useNow only drives re-renders) so "Next phase" shows the new phase right away.
  const elapsed = live ? Date.now() - store.liveSince[section.code] : 0;
  const phaseNow = live ? phaseAt(section, elapsed) : null;
  const roster = store.rosterFor(section);
  const readings = readHeartRates(roster, Math.floor(now / READING_MS), phaseNow?.phase.id ?? 'cardio');
  const hasParticipants = readings.length > 0;
  const showHr = ui.tab === 'hr' && live && hasParticipants;

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
            {live && (
              <span className="class-head__live">● Live · {formatClock(elapsed)}</span>
            )}
          </div>
          <div className="class-head__plan">
            Warm-up {section.warmUpMin} · Cardio {section.cardioMin} · Cool-down {section.coolDownMin} · Strength{' '}
            {Math.max(0, strengthMin(section))} min
          </div>
        </div>
        <div className="class-head__actions">
          <span className="class-head__code">
            Invite code <b>{section.code}</b>
          </span>
          <button
            className={'live-toggle' + (live ? '' : ' live-toggle--start')}
            onClick={() => store.setLive(section.code, !live)}
          >
            {live ? 'End class' : 'Start class'}
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
                ['panel', 'Beside video'],
              ]}
              value={ui.view}
              onChange={(view) => updateUi({ view })}
            />
          </div>
        )}
      </div>

      {ui.tab === 'hr' && !live && (
        <div className="i-empty">
          <div className="display i-empty__title">Class isn't live</div>
          <div className="i-empty__body">
            Start the class to see everyone's bracelet heart rate against their target zone. You get an alert if someone
            goes above their zone, or below it during cardio.
          </div>
          <button className="btn btn--primary i-empty__start" onClick={() => store.setLive(section.code, true)}>
            Start class
          </button>
        </div>
      )}

      {ui.tab === 'hr' && live && !hasParticipants && (
        <div className="i-empty">
          <div className="display i-empty__title">No participants yet</div>
          <div className="i-empty__body">
            Share invite code <b className="i-empty__code">{section.code}</b>, or add participants yourself. They show up
            here once they pair a bracelet.
          </div>
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
          {ui.view === 'panel' && <HrPanel readings={readings} onMessage={messageParticipant} />}
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

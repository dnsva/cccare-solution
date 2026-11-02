import { PhaseStrip } from '../components/PhaseStrip';
import { STAFF_LABEL } from '../data';
import { phaseAt, type PhaseId } from '../lib/dosage';
import { formatClock } from '../lib/format';
import { readHeartRates, type Reading } from '../lib/heartRate';
import { useNow } from '../lib/useNow';
import { useStore } from '../store';
import type { Participant, Section } from '../types';

const READING_MS = 1500;

/** What the heart card says, by phase. Above the zone always comes first. */
function heartMessage(r: Reading, phase: PhaseId): string {
  if (r.status === 'off') return "Your bracelet isn't connected. Check that it's on and charged.";
  if (r.status === 'high') return 'Above your zone. Lower the speed, incline or resistance and ease off a little.';
  if (r.status === 'low') return 'Below your zone. If you feel okay, raise the speed, incline or resistance a little.';
  if (phase === 'warmup') return `Warm-up: start easy. Cardio aims for ${r.range} bpm.`;
  if (phase === 'cooldown') return 'Cool-down: slow right down and let your heart rate come back down.';
  if (phase === 'strength') return 'Strength time. Rest between sets and breathe out as you push.';
  return "You're in your target zone. Keep this pace!";
}

const PHASE_VIDEO_TEXT: Record<PhaseId, string> = {
  warmup: 'Warm-up: a few easy minutes to get going.',
  cardio: 'Cardio: a steady pace in your target zone.',
  cooldown: 'Cool-down: slow and easy to finish cardio.',
  strength: '',
};

export const openVideo = (link?: string) => link && window.open(link, '_blank', 'noopener');

type Props = { section: Section; me: Participant; onLeave: () => void; onOpenProgram: () => void };

/** What a participant sees after tapping "Join class now". */
export function InClassCard({ section, me, onLeave, onOpenProgram }: Props) {
  const store = useStore();
  const now = useNow(READING_MS);
  const elapsed = Date.now() - store.liveSince[section.code];
  const phaseNow = phaseAt(section, elapsed);
  const phase = phaseNow.phase.id;
  const reading = readHeartRates([me], Math.floor(now / READING_MS), phase)[0];

  return (
    <section className="p-live">
      <div className="p-live__top">
        <div className="p-live__info">
          <b className="p-live__badge">● You're in class · {formatClock(elapsed)}</b>
          <h1 className="display p-live__title">{section.name}</h1>
          <span>with {STAFF_LABEL}</span>
        </div>
        <button className="p-live__leave" onClick={onLeave}>
          Leave class
        </button>
      </div>
      <PhaseStrip now={phaseNow} />
      <div className="p-live__grid">
        {phase === 'strength' ? (
          <div className="p-live__strength">
            <b className="p-live__strength-title">Time for your strength program</b>
            <span>Do your exercises at your own pace, then log your sets, reps and weights.</span>
            <button className="p-live__reopen" onClick={onOpenProgram}>
              Open My program
            </button>
          </div>
        ) : (
          <div className="p-live__video">
            {section.videoLink ? (
              <>
                <span>Your video call opened in a new tab.</span>
                <button className="p-live__reopen" onClick={() => openVideo(section.videoLink)}>
                  Open video call again
                </button>
              </>
            ) : (
              <span>
                {PHASE_VIDEO_TEXT[phase]}
                <br />
                Treadmill, bike or elliptical: your choice.
              </span>
            )}
          </div>
        )}
        <div className={`p-heart p-heart--${reading.status}`}>
          <span className="p-heart__label">Your heart rate</span>
          <div className="p-heart__reading">
            <span className="p-heart__bpm">{reading.bpm ?? '—'}</span>
            {reading.bpm != null && <span>bpm</span>}
          </div>
          {reading.bpm != null && (
            <div className="p-heart__bar" aria-hidden="true">
              <div className="p-heart__zone" style={{ left: `${reading.bar.zoneFrom}%`, right: `${100 - reading.bar.zoneTo}%` }} />
              <div className="p-heart__marker" style={{ left: `${reading.bar.marker}%` }} />
            </div>
          )}
          <b className="p-heart__message">{heartMessage(reading, phase)}</b>
          <span className="p-heart__range">Your cardio target zone: {reading.range} bpm</span>
          <span className="p-heart__help">Need help with the machine? Ask a student volunteer.</span>
        </div>
      </div>
    </section>
  );
}

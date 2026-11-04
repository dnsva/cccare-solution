import { useRef, useState, type Ref } from 'react';
import { INSTRUCTOR, PARTICIPANT, STREAK } from '../data';
import { phasesFor } from '../lib/dosage';
import { useStore } from '../store';
import { ExerciseList } from './ExerciseList';
import { dayRecord, isClassDay, isSameDay, loggedRows, movedOn, plannedRows, today } from './history';

type Props = {
  movedToday: boolean;
  onToggleToday: () => void;
  /** 0-based month shown in the calendar, in the streak's year. */
  month: number;
  onMonth: (month: number) => void;
  onOpenPlan: () => void;
};

const WEEKDAYS = 'SMTWTFS'.split('');
const year = today.getFullYear();
const firstMonth = Math.min(...Object.keys(STREAK.moved).map(Number));
const lastMonth = today.getMonth();

const longDate = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

export function StreakPage({ movedToday, onToggleToday, month, onMonth, onOpenPlan }: Props) {
  /** The calendar day whose details show below it. Today unless a past day is picked. */
  const [picked, setPicked] = useState<Date>(today);
  const panelRef = useRef<HTMLElement>(null);
  /** On a phone the panel sits below the calendar, so bring it into view. */
  const pick = (date: Date) => {
    setPicked(date);
    requestAnimationFrame(() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
  };
  const moved = (date: Date) => movedOn(date, movedToday);

  const week = WEEKDAYS.map((letter, i) => {
    const date = new Date(year, today.getMonth(), today.getDate() - today.getDay() + i);
    return { letter, date, done: moved(date), isToday: isSameDay(date, today), future: date > today };
  });

  const lead = new Date(year, month, 1).getDay();
  const days = Array.from({ length: new Date(year, month + 1, 0).getDate() }, (_, i) => {
    const date = new Date(year, month, i + 1);
    return { date, done: moved(date), isToday: isSameDay(date, today), future: date > today };
  });
  const movedCount = days.filter((d) => d.done).length;

  const streak = STREAK.baseDays + (movedToday ? 1 : 0);
  const viewingPast = !isSameDay(picked, today);

  return (
    <main className="p-streak">
      <section className="p-hero">
        <div className="p-hero__date">
          Hi {PARTICIPANT.firstName} · {longDate(today)}
        </div>
        <h1 className="display p-hero__title">{streak} days in a row!</h1>
        <div>
          {movedToday
            ? `Nice work! One more day ties your record of ${STREAK.record}.`
            : `Your record is ${STREAK.record} days. Two more days to tie it!`}
        </div>
        <div className="p-week">
          {week.map(({ letter, date, done, isToday, future }) => (
            <div key={letter + date.getDate()} className={'p-week__day' + (future ? ' p-week__day--future' : '')}>
              <span className="p-week__letter">{letter}</span>
              <span className={'p-week__num' + (done ? ' is-done' : '') + (isToday ? ' is-today' : '')}>{date.getDate()}</span>
              <span className="p-week__mark">{isToday ? 'Today' : done ? '✓' : ''}</span>
            </div>
          ))}
        </div>
        <button className="p-moved-btn" aria-pressed={movedToday} onClick={onToggleToday}>
          {movedToday ? 'Done for today ✓' : 'I moved today'}
        </button>
        <div className="p-moved-note">
          {movedToday ? 'Tapped by mistake? Tap again to undo.' : 'Any movement counts: a walk, your exercises or class.'}
        </div>
      </section>

      <section className={'p-cal' + (viewingPast ? ' is-viewing-past' : '')}>
        <div className="p-cal__head">
          <h2 className="display p-cal__title">
            {new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h2>
          <div className="p-cal__nav">
            <button aria-label="Previous month" disabled={month <= firstMonth} onClick={() => onMonth(month - 1)}>
              ‹
            </button>
            <button aria-label="Next month" disabled={month >= lastMonth} onClick={() => onMonth(month + 1)}>
              ›
            </button>
          </div>
        </div>
        <p className="p-cal__hint">Tap a day to see what you did.</p>
        <div className="p-cal__grid p-cal__weekdays" aria-hidden="true">
          {WEEKDAYS.map((l, i) => (
            <span key={i}>{l}</span>
          ))}
        </div>
        <div className="p-cal__grid">
          {Array.from({ length: lead }, (_, i) => (
            <span key={'lead' + i} />
          ))}
          {days.map(({ date, done, isToday, future }) => {
            const cls =
              'p-cal__day' +
              (done ? ' is-done' : future ? ' is-future' : isToday ? '' : ' is-missed') +
              (isToday ? ' is-today' : '') +
              (isSameDay(date, picked) ? ' is-picked' : '');
            if (future)
              return (
                <span key={date.getDate()} className={cls}>
                  {date.getDate()}
                </span>
              );
            return (
              <button
                key={date.getDate()}
                className={cls}
                aria-pressed={isSameDay(date, picked)}
                aria-label={`${isToday ? 'Today, ' : ''}${longDate(date)}${done ? ', moved' : ''}`}
                onClick={() => pick(date)}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>
        <div className="p-cal__legend">
          <span className="p-cal__key">
            <span className="p-cal__swatch is-done" />
            Moved
          </span>
          <span className="p-cal__key">
            <span className="p-cal__swatch is-today" />
            Today
          </span>
          <span className="p-cal__key">
            <span className="p-cal__swatch is-picked" />
            Looking back
          </span>
          <b className="p-cal__count">{movedCount} moving days</b>
        </div>
      </section>

      <DayPanel
        panelRef={panelRef}
        date={picked}
        moved={moved(picked)}
        onBackToToday={() => {
          setPicked(today);
          onMonth(today.getMonth());
        }}
        onOpenPlan={onOpenPlan}
      />
    </main>
  );
}

type PanelProps = {
  panelRef: Ref<HTMLElement>;
  date: Date;
  moved: boolean;
  onBackToToday: () => void;
  onOpenPlan: () => void;
};

/** What a picked day held. Today shows the plan; a past day shows what happened, read-only. */
function DayPanel({ panelRef, date, moved, onBackToToday, onOpenPlan }: PanelProps) {
  const store = useStore();
  const section = store.sectionByCode(PARTICIPANT.sectionCode);
  const me = section?.participantIds.includes(PARTICIPANT.id) ? store.participantById(PARTICIPANT.id) : undefined;
  const isToday = isSameDay(date, today);
  const plan = section ? phasesFor(section).filter((p) => p.min > 0) : [];
  const planText = plan.map((p) => `${p.label} ${p.min} min`).join(' · ');

  if (isToday) {
    const classToday = !!section && isClassDay(section, date);
    return (
      <section ref={panelRef} className="p-day is-today" aria-live="polite">
        <div className="p-day__head">
          <span className="p-day__tag">Today</span>
          <h2 className="display p-day__title">{longDate(date)}</h2>
        </div>
        {classToday && section ? (
          <>
            <p className="p-day__lead">
              <b>{section.name}</b> at {section.time}. {planText}.
            </p>
            {me && <ExerciseList rows={plannedRows(me)} compact />}
            <button className="p-day__action" onClick={onOpenPlan}>
              See today's full plan
            </button>
          </>
        ) : (
          <p className="p-day__lead">
            No class today. {moved ? 'You moved today. Nice work!' : 'A walk or some stretching still counts. Tap "I moved today" when you do.'}
          </p>
        )}
      </section>
    );
  }

  const record = dayRecord(date, section, me);
  return (
    <section ref={panelRef} className="p-day is-past" aria-live="polite">
      <div className="p-day__head">
        <span className="p-day__tag">Looking back</span>
        <h2 className="display p-day__title">{longDate(date)}</h2>
        <button className="p-day__back" onClick={onBackToToday}>
          Back to today
        </button>
      </div>
      {record.kind === 'class' && section && (
        <>
          <p className="p-day__lead">
            ✓ You came to <b>{section.name}</b> · Session {record.session}. {planText}.
          </p>
          {me && record.log ? (
            <ExerciseList rows={loggedRows(me.program, record.log)} compact />
          ) : (
            <p className="p-day__note">
              This was with your earlier set of exercises, before {INSTRUCTOR.firstName} gave you new ones. Those aren't
              shown here.
            </p>
          )}
        </>
      )}
      {record.kind === 'missed-class' && (
        <p className="p-day__lead">
          There was class this day, but you didn't make it. That's okay. Every class is a fresh start.
        </p>
      )}
      {record.kind === 'moved' && <p className="p-day__lead">✓ You moved this day. No class was on.</p>}
      {record.kind === 'rest' && <p className="p-day__lead">A rest day. No class was on.</p>}
      <p className="p-day__note">Past days can't be changed.</p>
    </section>
  );
}

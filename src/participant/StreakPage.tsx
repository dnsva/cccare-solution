import { PARTICIPANT, STREAK } from '../data';

type Props = {
  movedToday: boolean;
  onToggleToday: () => void;
  /** 0-based month shown in the calendar, in the streak's year. */
  month: number;
  onMonth: (month: number) => void;
};

const WEEKDAYS = 'SMTWTFS'.split('');
const { today } = STREAK;
const year = today.getFullYear();
const firstMonth = Math.min(...Object.keys(STREAK.moved).map(Number));
const lastMonth = today.getMonth();

const isSameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

export function StreakPage({ movedToday, onToggleToday, month, onMonth }: Props) {
  const moved = (date: Date) =>
    isSameDay(date, today) ? movedToday : date < today && !!STREAK.moved[date.getMonth()]?.has(date.getDate());

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

  return (
    <main className="p-streak">
      <section className="p-hero">
        <div className="p-hero__date">
          Hi {PARTICIPANT.firstName} · {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
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
              <span className={'p-week__num' + (done ? ' is-done' : isToday ? ' is-today' : '')}>{date.getDate()}</span>
              <span className="p-week__mark">{done ? '✓' : isToday ? 'Today' : ''}</span>
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

      <section className="p-cal">
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
              'p-cal__day' + (done ? ' is-done' : isToday ? ' is-today' : future ? ' is-future' : ' is-missed');
            return isToday ? (
              <button key={date.getDate()} className={cls} aria-pressed={done} aria-label="Today" onClick={onToggleToday}>
                {date.getDate()}
              </button>
            ) : (
              <span key={date.getDate()} className={cls}>
                {date.getDate()}
              </span>
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
          <b className="p-cal__count">{movedCount} moving days</b>
        </div>
      </section>
    </main>
  );
}

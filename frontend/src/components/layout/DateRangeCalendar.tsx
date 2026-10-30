import { useState } from 'react';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import {
  addDays, addMonths, eachDayOfInterval, endOfMonth, format, getDay, isAfter, isBefore, isSameDay,
  startOfDay, startOfMonth,
} from 'date-fns';

const iso = (d: Date) => format(d, 'yyyy-MM-dd');
const parse = (s?: string) => (s ? startOfDay(new Date(`${s}T00:00:00`)) : undefined);

// Month grid with range selection. Dates before tomorrow are struck through and not clickable.
export default function DateRangeCalendar({
  start,
  end,
  onChange,
}: {
  start?: string;
  end?: string;
  onChange: (start: string | undefined, end: string | undefined) => void;
}) {
  const earliest = startOfDay(addDays(new Date(), 1));
  const s = parse(start);
  const e = parse(end);
  const [month, setMonth] = useState(startOfMonth(s ?? earliest));

  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  const lead = getDay(startOfMonth(month)); // empty cells before the 1st (Sunday first)
  const canGoBack = isAfter(startOfMonth(month), startOfMonth(earliest));

  const pick = (d: Date) => {
    if (!s || (s && e)) return onChange(iso(d), undefined); // start a new range
    if (isAfter(d, s)) return onChange(iso(s), iso(d)); // complete it
    return onChange(iso(d), undefined); // clicked before the start: restart there
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => setMonth(addMonths(month, -1))} disabled={!canGoBack} aria-label="Previous month" className="rounded-lg p-2 text-ink-muted hover:bg-surface-2 disabled:opacity-30">
          <CaretLeft size={18} />
        </button>
        <p className="font-display text-xl">{format(month, 'MMMM yyyy')}</p>
        <button type="button" onClick={() => setMonth(addMonths(month, 1))} aria-label="Next month" className="rounded-lg p-2 text-ink-muted hover:bg-surface-2">
          <CaretRight size={18} />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 text-center">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <span key={i} className="py-2 text-xs text-ink-faint">{d}</span>
        ))}
        {Array.from({ length: lead }).map((_, i) => <span key={`b${i}`} />)}
        {days.map((d) => {
          const past = isBefore(d, earliest);
          const isStart = !!s && isSameDay(d, s);
          const isEnd = !!e && isSameDay(d, e);
          const inRange = !!s && !!e && isAfter(d, s) && isBefore(d, e);
          return (
            <button
              key={iso(d)}
              type="button"
              disabled={past}
              onClick={() => pick(d)}
              aria-pressed={isStart || isEnd}
              className={`h-10 text-sm tabular-nums transition-colors ${
                isStart || isEnd ? 'rounded-lg bg-accent text-on-accent'
                : inRange ? 'bg-accent/12 text-ink'
                : past ? 'text-ink-faint/60 line-through'
                : 'rounded-lg text-ink hover:bg-surface-2'
              }`}
            >
              {format(d, 'd')}
            </button>
          );
        })}
      </div>
    </div>
  );
}

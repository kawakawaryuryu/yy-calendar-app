import { memo, useLayoutEffect, useMemo, useRef } from 'react';
import { CALENDARS, DEMO_TODAY, applyChanges, eventsOn, monthDays, monthStart, parseDate, seedMonth, shiftMonth, weatherOn } from '../shared/calendar';
import type { Changes } from '../shared/calendar';
import { WeatherIcon } from './Icons';

type Props = { month: string; selected: string; visible: string[]; region: string; dense: boolean; changes: Changes; onSelect: (date: string) => void; onMonth: (date: string) => void; pagerRef: React.RefObject<HTMLDivElement | null> };
const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

const MonthPage = memo(function MonthPage({ month, selected, visible, region, dense, changes, onSelect, active }: Omit<Props, 'onMonth' | 'pagerRef'> & { active: boolean }) {
  const days = useMemo(() => monthDays(month), [month]);
  const events = useMemo(() => applyChanges([-1, 0, 1].flatMap(offset => seedMonth(shiftMonth(month, offset), dense)), changes), [month, dense, changes]);
  const uniqueEvents = useMemo(() => [...new Map(events.map(event => [event.id, event])).values()], [events]);
  const entries = useMemo(() => days.map(day => ({ day, dayEvents: eventsOn(uniqueEvents, day, visible), weather: weatherOn(day, region) })), [days, uniqueEvents, visible, region]);
  return <div className="month-page" aria-hidden={!active} inert={!active ? true : undefined}>
    <div className="weekday-row" aria-hidden="true">{WEEKDAYS.map((day, index) => <span className={index === 0 ? 'sunday' : index === 6 ? 'saturday' : ''} key={day}>{day}</span>)}</div>
    <div className="month-grid" aria-label={`${parseDate(month).getFullYear()}年${parseDate(month).getMonth() + 1}月`}>
      {entries.map(({ day, dayEvents, weather }, index) => {
        const isOutside = monthStart(day) !== monthStart(month);
        return <button type="button" key={day} className={`day-cell ${isOutside ? 'outside' : ''} ${day === selected ? 'selected' : ''} ${day === DEMO_TODAY ? 'today' : ''} ${index % 7 === 0 ? 'sunday' : index % 7 === 6 ? 'saturday' : ''}`} onClick={() => onSelect(day)} aria-label={`${day.replaceAll('-', '/')} ${dayEvents.length}件の予定${weather ? `、${weather.label}` : ''}`} aria-pressed={day === selected} data-date={day}>
          <span className="day-top"><span className="day-number">{parseDate(day).getDate()}</span>{weather && <WeatherIcon kind={weather.kind} size={22}/>}</span>
          <span className="day-events">{dayEvents.slice(0, 2).map(event => {
            const color = CALENDARS.find(calendar => calendar.id === event.calendarId)!;
            return <span key={event.id} className="event-chip" style={{ '--event-color': color.color, '--event-background': color.background } as React.CSSProperties}><span>{event.title}</span></span>;
          })}{dayEvents.length > 2 && <span className="more-events">ほか{dayEvents.length - 2}件</span>}</span>
        </button>;
      })}
    </div>
  </div>;
});

export function MonthPager(props: Props) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const touching = useRef(false);
  const latest = useRef(props);
  latest.current = props;
  function settle() {
    const element = latest.current.pagerRef.current;
    if (!element || touching.current || !element.clientWidth) return;
    const position = element.scrollLeft / element.clientWidth;
    const page = Math.round(position);
    if (Math.abs(position - page) >= 0.025) return;
    const intent = element.dataset.navigation;
    if (!intent) {
      if (page !== 1) element.scrollTo({ left: element.clientWidth, behavior: 'instant' });
      return;
    }
    if (intent !== 'gesture' && page !== 1 + Number(intent)) return;
    delete element.dataset.navigation;
    if (page !== 1) latest.current.onMonth(shiftMonth(latest.current.month, page - 1));
  }
  function schedule() { clearTimeout(timer.current); timer.current = setTimeout(settle, 130); }
  useLayoutEffect(() => {
    const element = props.pagerRef.current;
    if (!element) return;
    delete element.dataset.navigation;
    element.scrollTo({ left: element.clientWidth, behavior: 'instant' });
    element.addEventListener('scrollend', settle);
    return () => { clearTimeout(timer.current); element.removeEventListener('scrollend', settle); };
  }, [props.month, props.pagerRef]);
  return <div className="month-pager" ref={props.pagerRef} onScroll={schedule} onWheel={event => { if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) event.currentTarget.dataset.navigation = 'gesture'; }} onTouchStart={event => { event.currentTarget.dataset.navigation = 'gesture'; touching.current = true; clearTimeout(timer.current); }} onTouchEnd={() => { touching.current = false; schedule(); }} onTouchCancel={() => { touching.current = false; schedule(); }}>
    {[-1, 0, 1].map(offset => <MonthPage key={offset} {...props} month={shiftMonth(props.month, offset)} active={offset === 0}/>)}
  </div>;
}

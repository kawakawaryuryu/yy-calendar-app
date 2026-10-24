import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { CALENDARS, DEMO_TODAY, EMPTY_CHANGES, REGIONS, SCENARIO_VERSION, addDays, applyChanges, calendarFor, eventsOn, monthStart, parseDate, seedMonth, shiftMonth, weatherOn } from '../shared/calendar';
import type { CalendarEvent, Changes } from '../shared/calendar';
import { Icon, WeatherIcon } from './Icons';
import { MonthPager } from './MonthPager';
import { EventEditor, Modal, Settings } from './Dialogs';

type Saved = { version: string; changes: Changes; visible: string[]; region: string; dense: boolean; showMetrics: boolean };
const STORAGE_KEY = 'hibi-pwa-mock-v1';
const DEFAULTS: Saved = { version: SCENARIO_VERSION, changes: EMPTY_CHANGES, visible: CALENDARS.map(item => item.id), region: 'tokyo', dense: false, showMetrics: false };
function load(): Saved {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (raw?.version !== SCENARIO_VERSION || !Array.isArray(raw?.changes?.created) || !Array.isArray(raw?.changes?.removed) || !raw?.changes?.updated || !Array.isArray(raw?.visible) || !REGIONS.some(region => region.id === raw.region)) return DEFAULTS;
    return { ...DEFAULTS, ...raw };
  } catch { return DEFAULTS; }
}
const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
const englishMonths = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];

export default function App() {
  const [saved, setSaved] = useState<Saved>(load);
  const [month, setMonth] = useState(monthStart(DEMO_TODAY));
  const [selected, setSelected] = useState(DEMO_TODAY);
  const [editor, setEditor] = useState<CalendarEvent | null>(null);
  const [settings, setSettings] = useState(false);
  const [monthPicker, setMonthPicker] = useState(false);
  const [pickedMonth, setPickedMonth] = useState(month.slice(0, 7));
  const [toast, setToast] = useState('');
  const [offline, setOffline] = useState(!navigator.onLine);
  const [storageError, setStorageError] = useState(false);
  const [responseMs, setResponseMs] = useState<number | null>(null);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [installPrompt, setInstallPrompt] = useState<(Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }) | null>(null);
  const pager = useRef<HTMLDivElement>(null);
  const agenda = useRef<HTMLDivElement>(null);
  const tapStart = useRef(0);
  const updateRequested = useRef(false);
  const date = parseDate(month);
  const selectedDate = parseDate(selected);
  const region = REGIONS.find(item => item.id === saved.region)!;
  const weather = weatherOn(selected, saved.region);
  const todayWeather = weatherOn(DEMO_TODAY, saved.region)!;
  const events = useMemo(() => applyChanges([-1, 0, 1].flatMap(offset => seedMonth(shiftMonth(month, offset), saved.dense)), saved.changes), [month, saved.dense, saved.changes]);
  const uniqueEvents = useMemo(() => [...new Map(events.map(event => [event.id, event])).values()], [events]);
  const dayEvents = useMemo(() => eventsOn(uniqueEvents, selected, saved.visible), [uniqueEvents, selected, saved.visible]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(saved)); setStorageError(false); } catch { setStorageError(true); }
  }, [saved]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 3000); return () => clearTimeout(timer); }, [toast]);
  useEffect(() => {
    let disposed = false;
    let connectionCheck: AbortController | null = null;
    const online = async () => {
      connectionCheck?.abort();
      if (!navigator.onLine) { setOffline(true); return; }
      const controller = new AbortController();
      connectionCheck = controller;
      const timeout = setTimeout(() => controller.abort(), 2500);
      try {
        const result = await fetch('/manifest.webmanifest?connectivity=1', { cache: 'no-store', signal: controller.signal });
        if (!disposed && connectionCheck === controller) setOffline(!result.ok);
      } catch { if (!disposed && connectionCheck === controller) setOffline(true); }
      finally { clearTimeout(timeout); }
    };
    window.addEventListener('online', online); window.addEventListener('offline', online);
    void online();
    const install = (event: Event) => { event.preventDefault(); setInstallPrompt(event as NonNullable<typeof installPrompt>); };
    window.addEventListener('beforeinstallprompt', install);
    let registration: ServiceWorkerRegistration | undefined;
    let installing: ServiceWorker | null = null;
    const stateChange = () => { if (!disposed && installing?.state === 'installed' && navigator.serviceWorker.controller) setWaitingWorker(registration?.waiting ?? installing); };
    const updateFound = () => { installing = registration?.installing ?? null; installing?.addEventListener('statechange', stateChange); };
    const controller = () => { if (updateRequested.current) window.location.reload(); };
    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      navigator.serviceWorker.addEventListener('controllerchange', controller);
      navigator.serviceWorker.register('/sw.js').then(result => {
        if (disposed) return;
        registration = result;
        if (result.waiting) setWaitingWorker(result.waiting);
        result.addEventListener('updatefound', updateFound);
      }).catch(() => { if (!disposed) setToast('オフライン起動の準備に失敗しました。再読み込みで再試行できます。'); });
    }
    return () => { disposed = true; connectionCheck?.abort(); window.removeEventListener('online', online); window.removeEventListener('offline', online); window.removeEventListener('beforeinstallprompt', install); navigator.serviceWorker?.removeEventListener('controllerchange', controller); registration?.removeEventListener('updatefound', updateFound); installing?.removeEventListener('statechange', stateChange); };
  }, []);
  useLayoutEffect(() => {
    agenda.current?.scrollTo({ top: 0 });
    if (!tapStart.current) return;
    let frame = 0;
    const first = requestAnimationFrame(() => { frame = requestAnimationFrame(() => { setResponseMs(Math.round(performance.now() - tapStart.current)); tapStart.current = 0; }); });
    return () => { cancelAnimationFrame(first); cancelAnimationFrame(frame); };
  }, [selected]);
  const selectDate = useCallback((value: string) => {
    tapStart.current = performance.now();
    setSelected(value);
    setMonth(monthStart(value));
  }, []);
  const changeMonth = useCallback((value: string) => {
    setMonth(value);
    setSelected(value === monthStart(DEMO_TODAY) ? DEMO_TODAY : value);
  }, []);
  function move(delta: number) {
    if (!pager.current) return;
    pager.current.dataset.navigation = String(delta);
    pager.current.scrollTo({ left: pager.current.clientWidth * (1 + delta), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }
  function createEvent() {
    const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setEditor({ id: `draft-${id}`, calendarId: 'family', title: '', startDate: selected, endDate: selected, startTime: '10:00', endTime: '11:00', allDay: false, location: '', notes: '' });
  }
  function saveEvent(event: CalendarEvent) {
    const isNew = event.id.startsWith('draft-');
    const storedEvent = isNew ? { ...event, id: event.id.replace('draft-', 'local-') } : event;
    setSaved(previous => {
      const isCreated = previous.changes.created.some(item => item.id === storedEvent.id);
      return { ...previous, changes: { ...previous.changes, created: isNew ? [...previous.changes.created, storedEvent] : isCreated ? previous.changes.created.map(item => item.id === storedEvent.id ? storedEvent : item) : previous.changes.created, updated: isNew || isCreated ? previous.changes.updated : { ...previous.changes.updated, [storedEvent.id]: storedEvent } } };
    });
    setEditor(null); selectDate(event.startDate); setToast('予定を端末に保存しました');
  }
  function removeEvent(id: string) {
    setSaved(previous => ({ ...previous, changes: { ...previous.changes, created: previous.changes.created.filter(event => event.id !== id), removed: [...previous.changes.removed, id] } }));
    setEditor(null); setToast('予定を削除しました');
  }
  const toggleCalendar = (id: string) => setSaved(previous => ({ ...previous, visible: previous.visible.includes(id) ? previous.visible.filter(value => value !== id) : [...previous.visible, id] }));

  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#" onClick={event => { event.preventDefault(); selectDate(DEMO_TODAY); }} aria-label="日々・今日に戻る"><span className="brand-icon"><Icon name="calendar" size={26}/></span><span className="brand-name">日々<span>hibi calendar</span></span></a>
      <p className="brand-tagline">予定と、空模様をひとつに。</p>
      <button className="primary-button new-event-button" onClick={createEvent}><Icon name="plus" size={20}/>予定をつくる</button>
      <div className="sidebar-label">MY CALENDARS</div>
      <div className="sidebar-calendars">{CALENDARS.map(calendar => <label key={calendar.id} className="calendar-option"><input type="checkbox" checked={saved.visible.includes(calendar.id)} onChange={() => toggleCalendar(calendar.id)} style={{ accentColor: calendar.color }}/><span>{calendar.name}</span>{calendar.id === 'archive' && <span className="readonly-tag">閲覧</span>}</label>)}</div>
      <div className="sidebar-divider"/>
      <button className="sidebar-settings" onClick={() => setSettings(true)}><Icon name="sliders" size={18}/><span>表示と設定</span><Icon name="chevronRight" size={15}/></button>
      <div className="sidebar-weather"><div className="eyebrow"><span className="status-dot"/>今日の空模様<span className="sample-label">デモ</span></div><div className="sidebar-weather-main"><WeatherIcon kind={todayWeather.kind} size={65}/><div><strong>{todayWeather.high}<span>°</span></strong><span>{todayWeather.label}</span></div></div><button className="weather-location" onClick={() => setSettings(true)}><Icon name="location" size={14}/>{region.name}・{region.city}<Icon name="chevronDown" size={13}/></button><p>秋の空を見上げて、<br/>今日も、心地よい一日を。</p></div>
      <div className="sidebar-footer"><span className="demo-pill">PWA MOCK</span><p>ふたりの毎日に、ちょうどいい。</p><span className="version-label">SCENARIO 01 · OCT 2026</span></div>
    </aside>

    <main className="workspace">
      <header className="app-header"><div className="mobile-brand"><span className="brand-icon"><Icon name="calendar" size={19}/></span><span>日々</span></div><div className="desktop-page-name"><Icon name="calendar" size={17}/>カレンダー</div><div className="header-right">{offline && <span className="offline-badge"><Icon name="wifiOff" size={14}/>オフライン</span>}<span className="demo-label"><span/>デモデータ</span><button className="header-settings icon-button" aria-label="表示と設定" onClick={() => setSettings(true)}><Icon name="sliders"/></button><span className="avatar" aria-label="ふたりのカレンダー">YY</span></div></header>
      <div className="workspace-body">
        <section className="calendar-section" aria-label="月カレンダー">
          <div className="month-toolbar"><div className="month-heading"><button className="month-title" aria-label="年月を選択" onClick={() => { setPickedMonth(month.slice(0, 7)); setMonthPicker(true); }}><span className="month-year">{date.getFullYear()}年</span><strong>{date.getMonth() + 1}<span>月</span></strong><Icon name="chevronDown" size={16}/></button><span className="english-month">{englishMonths[date.getMonth()]}</span></div><div className="month-actions"><button className="today-button" onClick={() => selectDate(DEMO_TODAY)}>今日</button><div className="month-arrows"><button className="icon-button" aria-label="前の月" onClick={() => move(-1)}><Icon name="chevronLeft"/></button><button className="icon-button" aria-label="次の月" onClick={() => move(1)}><Icon name="chevronRight"/></button></div></div></div>
          <div className="calendar-card"><MonthPager month={month} selected={selected} visible={saved.visible} region={saved.region} dense={saved.dense} changes={saved.changes} onSelect={selectDate} onMonth={changeMonth} pagerRef={pager}/></div>
          <div className="calendar-footnote"><span><i/>今日から7日間の天気を表示</span><button onClick={() => setSettings(true)}><Icon name="location" size={13}/>{region.city}<Icon name="chevronDown" size={12}/></button></div>
        </section>

        <section className="agenda-section" aria-label="選択日の予定">
          <div className="agenda-heading"><div className="agenda-date"><h1>{selectedDate.getMonth() + 1}月{selectedDate.getDate()}日<span className={selectedDate.getDay() === 0 ? 'sunday' : selectedDate.getDay() === 6 ? 'saturday' : ''}>（{weekdays[selectedDate.getDay()]}）</span></h1>{selected === DEMO_TODAY && <span className="today-tag">今日</span>}<span className="event-count">{dayEvents.length}件の予定</span></div><button className="agenda-add icon-button" aria-label="選択日に予定を追加" onClick={createEvent}><Icon name="plus" size={19}/></button></div>
          <div className="daily-weather">{weather ? <><WeatherIcon kind={weather.kind} size={29}/><span className="weather-description">{weather.label}</span><div className="temperatures"><strong>{weather.high}°</strong><span>/</span><span>{weather.low}°</span></div><span className="weather-separator"/><span className="rain-probability"><svg width="13" height="16" viewBox="0 0 16 20" fill="none" aria-hidden="true"><path d="M8 1S2 9 2 12a6 6 0 0 0 12 0C14 9 8 1 8 1Z" stroke="currentColor" strokeWidth="1.5"/></svg>{weather.rain}%</span></> : <><Icon name="info" size={17}/><span className="muted">この日の天気予報はありません</span></>}<span className="weather-demo">仮の天気</span></div>
          <div className="agenda-list" ref={agenda}>
            {dayEvents.length === 0 ? <div className="empty-state"><span><Icon name="calendar" size={25}/></span><strong>{saved.visible.length ? '予定のない、ゆったりした一日。' : '表示するカレンダーを選んでください'}</strong><p>{saved.visible.length ? '新しい予定をつくってみませんか。' : '「表示と設定」から切り替えられます。'}</p><button className="text-button" onClick={saved.visible.length ? createEvent : () => setSettings(true)}>{saved.visible.length ? '＋ 予定をつくる' : '表示と設定を開く'}</button></div> : dayEvents.map(event => {
              const calendar = calendarFor(event.calendarId);
              return <button className="agenda-event" key={event.id} onClick={() => setEditor(event)} aria-label={`${event.title}の詳細`}><div className="event-time">{event.allDay ? <span className="all-day-time">終日</span> : <><strong>{event.startDate < selected ? '00:00' : event.startTime}</strong><span>{event.endDate > selected ? '24:00' : event.endTime}</span></>}</div><span className="event-line" style={{ background: calendar.color }}/><div className="event-info"><div className="event-title">{event.title}{event.recurring && <Icon name="repeat" size={13}/>}</div><div className="event-subtitle"><span className="calendar-name" style={{ color: calendar.color }}>{calendar.name}</span>{event.location && <><span className="subtitle-dot">·</span><span className="event-location"><Icon name="location" size={12}/>{event.location}</span></>}{event.allDay && event.endDate > addDays(event.startDate, 1) && <span className="multiday-tag">{parseDate(event.startDate).getDate()}〜{parseDate(addDays(event.endDate, -1)).getDate()}日</span>}</div></div><Icon name="chevronRight" size={16} className="event-chevron"/></button>;
            })}
          </div>
        </section>
        <footer className="workspace-footer"><span>暮らしの予定と、これからの天気。</span><span>すべて端末内の仮データです</span></footer>
      </div>
      <button className="mobile-fab" aria-label="新しい予定を作成" onClick={createEvent}><Icon name="plus" size={27}/></button>
    </main>
    {saved.showMetrics && <output className="metrics">タップ描画応答 <strong>{responseMs === null ? '—' : `${responseMs} ms`}</strong><span>参考値 · INP / FPSではありません</span></output>}
    {(toast || storageError) && <div className={`toast ${storageError ? 'error-toast' : ''}`} role="status"><Icon name={storageError ? 'info' : 'check'} size={18}/>{storageError ? '保存領域を利用できません。変更は一時的です。' : toast}</div>}
    {waitingWorker && !editor && <div className="update-banner" role="status"><span>新しいバージョンがあります</span><button onClick={() => { updateRequested.current = true; waitingWorker.postMessage({ type: 'SKIP_WAITING' }); }}>更新する</button></div>}
    {editor && <EventEditor initial={editor} onClose={() => setEditor(null)} onSave={saveEvent} onDelete={removeEvent}/>}
    {settings && <Settings region={saved.region} visible={saved.visible} dense={saved.dense} showMetrics={saved.showMetrics} storageError={storageError} onRegion={region => setSaved(previous => ({ ...previous, region }))} onVisible={visible => setSaved(previous => ({ ...previous, visible }))} onDense={dense => setSaved(previous => ({ ...previous, dense }))} onMetrics={showMetrics => setSaved(previous => ({ ...previous, showMetrics }))} onClose={() => setSettings(false)} onReset={() => { if (window.confirm('追加・編集した予定と設定をリセットしますか？')) { setSaved(DEFAULTS); selectDate(DEMO_TODAY); setToast('デモを初期状態に戻しました'); } }}/ >}
    {monthPicker && <Modal title="年月を選択" onClose={() => setMonthPicker(false)} className="month-dialog"><form onSubmit={event => { event.preventDefault(); if (/^\d{4}-\d{2}$/.test(pickedMonth)) { changeMonth(`${pickedMonth}-01`); setMonthPicker(false); } }}><div className="dialog-body"><label className="field"><span>表示する年月</span><input autoFocus type="month" min="1900-01" max="2100-12" required value={pickedMonth} onChange={event => setPickedMonth(event.target.value)}/></label><p className="muted small">2025年以前にはYahooの過去予定を想定したデータがあります。</p></div><footer className="dialog-footer"><button className="secondary-button" type="button" onClick={() => { changeMonth('2025-10-01'); setMonthPicker(false); }}>過去の予定を試す</button><button className="primary-button" type="submit">移動する</button></footer></form></Modal>}
    {installPrompt && <button className="install-button" onClick={async () => { await installPrompt.prompt(); await installPrompt.userChoice; setInstallPrompt(null); }}><Icon name="download" size={16}/>ホーム画面に追加</button>}
  </div>;
}

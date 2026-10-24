// Browser-independent scenario and date logic, reusable by the React Native mock.
export const DEMO_TODAY = '2026-10-21';
export const SCENARIO_VERSION = 'hibi-2026-10-v1';

export const CALENDARS = [
  { id: 'family', name: 'ふたり', color: '#368e80', background: '#e6f2ed' },
  { id: 'work', name: '仕事', color: '#557fbd', background: '#eaf0fa' },
  { id: 'personal', name: 'プライベート', color: '#c58043', background: '#faf0e3' },
  { id: 'archive', name: 'Yahoo! 過去の予定', color: '#9484ae', background: '#f0ecf7' },
] as const;
export type CalendarId = typeof CALENDARS[number]['id'];
export type CalendarEvent = {
  id: string;
  calendarId: CalendarId;
  title: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  location: string;
  notes: string;
  readOnly?: boolean;
  recurring?: boolean;
};
export type Changes = { created: CalendarEvent[]; updated: Record<string, CalendarEvent>; removed: string[] };
export const EMPTY_CHANGES: Changes = { created: [], updated: {}, removed: [] };
export const REGIONS = [
  { id: 'tokyo', name: '東京都', city: '東京', offset: 0 },
  { id: 'yokohama', name: '神奈川県', city: '横浜', offset: 1 },
  { id: 'osaka', name: '大阪府', city: '大阪', offset: 3 },
  { id: 'sapporo', name: '北海道', city: '札幌', offset: -7 },
  { id: 'fukuoka', name: '福岡県', city: '福岡', offset: 2 },
] as const;

export function parseDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}
export function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function addDays(value: string, days: number): string {
  const date = parseDate(value);
  date.setDate(date.getDate() + days);
  return dateKey(date);
}
export function monthStart(value: string): string { return `${value.slice(0, 7)}-01`; }
export function shiftMonth(value: string, delta: number): string {
  const date = parseDate(monthStart(value));
  date.setMonth(date.getMonth() + delta);
  return dateKey(date);
}
export function monthDays(value: string): string[] {
  const first = monthStart(value);
  const firstCell = addDays(first, -parseDate(first).getDay());
  return Array.from({ length: 42 }, (_, index) => addDays(firstCell, index));
}
export function calendarFor(id: CalendarId) { return CALENDARS.find(calendar => calendar.id === id)!; }

export function eventOccursOn(event: CalendarEvent, date: string): boolean {
  if (date < event.startDate) return false;
  if (event.allDay || (event.endTime === '00:00' && event.endDate > event.startDate)) return date < event.endDate;
  return date <= event.endDate;
}
export function eventsOn(events: CalendarEvent[], date: string, visible: readonly string[]): CalendarEvent[] {
  return events.filter(event => visible.includes(event.calendarId) && eventOccursOn(event, date))
    .sort((a, b) => Number(b.allDay) - Number(a.allDay) || a.startTime.localeCompare(b.startTime) || a.id.localeCompare(b.id));
}
export function applyChanges(events: CalendarEvent[], changes: Changes): CalendarEvent[] {
  const combined = [...events.map(event => changes.updated[event.id] ?? event), ...changes.created];
  return [...new Map(combined.filter(event => !changes.removed.includes(event.id)).map(event => [event.id, event])).values()];
}
export function validateEvent(event: CalendarEvent): string | null {
  if (!event.title.trim()) return '予定のタイトルを入力してください。';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(event.startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(event.endDate)) return '日付を入力してください。';
  if (event.allDay) return event.endDate > event.startDate ? null : '終了日は開始日以降にしてください。';
  if (!event.startTime || !event.endTime) return '開始・終了時刻を入力してください。';
  return `${event.endDate}T${event.endTime}` > `${event.startDate}T${event.startTime}` ? null : '終了日時を開始日時より後にしてください。';
}

function event(id: string, date: string, title: string, calendarId: CalendarId, startTime = '10:00', endTime = '11:00', extra: Partial<CalendarEvent> = {}): CalendarEvent {
  return { id, title, calendarId, startDate: date, endDate: date, startTime, endTime, allDay: false, location: '', notes: '', ...extra };
}

export function seedMonth(month: string, dense = false): CalendarEvent[] {
  const first = monthStart(month);
  const date = parseDate(first);
  const count = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const result: CalendarEvent[] = [];
  const personal = ['本を読む時間', 'ジム', '歯科検診', '美容院', '散歩とコーヒー'];
  for (let day = 1; day <= count; day++) {
    const key = addDays(first, day - 1);
    const weekday = parseDate(key).getDay();
    if (dense) for (let index = 0; index < 24; index++) {
      const hour = String(7 + Math.floor(index / 2)).padStart(2, '0');
      const minute = index % 2 ? '30' : '00';
      result.push(event(`dense-${key}-${index}`, key, ['打ち合わせ', '資料の確認', '作業の時間', 'ひと休み'][index % 4], CALENDARS[index % 3].id, `${hour}:${minute}`, `${hour}:${index % 2 ? '55' : '25'}`));
    }
    if (key === DEMO_TODAY) continue;
    if (weekday === 3) result.push(event(`weekly-${key}`, key, '週次ミーティング', 'work', '10:00', '11:00', { recurring: true, readOnly: true, location: 'オンライン' }));
    if (day % 3 === 0) result.push(event(`personal-${key}`, key, personal[day % personal.length], 'personal', '17:00', '18:00'));
    if (day % 5 === 0) result.push(event(`dinner-${key}`, key, 'ふたりでごはん', 'family', '19:00', '20:30', { location: 'いつものお店' }));
    if (day % 4 === 0 && weekday > 0 && weekday < 6) result.push(event(`review-${key}`, key, 'デザインレビュー', 'work', '14:00', '15:00', { location: 'ミーティングルーム A' }));
    if (weekday === 6 && day % 2 === 1) result.push(event(`weekend-${key}`, key, '週末のお出かけ', 'family', '11:00', '16:00', { location: '近くの公園' }));
    if (date.getFullYear() < 2026 && day % 7 === 0) result.push(event(`archive-${key}`, key, '思い出のランチ', 'archive', '12:00', '13:30', { readOnly: true, notes: 'Yahoo!カレンダーの過去予定を想定した仮データです。' }));
  }
  if (month.slice(0, 7) === DEMO_TODAY.slice(0, 7)) {
    result.push(
      event('today-anniversary', DEMO_TODAY, '結婚記念日', 'family', '', '', { allDay: true, endDate: addDays(DEMO_TODAY, 1), notes: 'ちょっといいごはんを食べに行こう。' }),
      event('today-weekly', DEMO_TODAY, '週次ミーティング', 'work', '10:00', '11:00', { location: 'オンライン', recurring: true, readOnly: true }),
      event('today-lunch', DEMO_TODAY, 'カフェでランチ', 'personal', '12:00', '13:00', { location: '喫茶 こもれび', notes: '窓際の席を予約。' }),
      event('today-review', DEMO_TODAY, 'プロジェクト打ち合わせ', 'work', '14:30', '15:30', { location: 'ミーティングルーム A', notes: '来月のスケジュールを確認する。' }),
      event('today-shopping', DEMO_TODAY, '帰りに買いもの', 'family', '18:00', '18:30', { location: '駅前のスーパー', notes: '牛乳、パン、きのこ。' }),
      event('today-dinner', DEMO_TODAY, '記念日のディナー', 'family', '19:00', '21:00', { location: 'ビストロ ひより', notes: '19時に現地で待ち合わせ。' }),
      event('autumn-trip', '2026-10-24', '秋の温泉旅行', 'family', '', '', { allDay: true, endDate: '2026-10-27', location: '箱根', notes: '2泊3日の小さな秋休み。' }),
      event('month-boundary', '2026-10-31', '実家に帰省', 'family', '', '', { allDay: true, endDate: '2026-11-03', location: '実家' }),
    );
  }
  // Include the boundary scenario in November without needing October's whole dataset.
  if (month.slice(0, 7) === '2026-11') result.push(event('month-boundary', '2026-10-31', '実家に帰省', 'family', '', '', { allDay: true, endDate: '2026-11-03', location: '実家' }));
  return result;
}

export type WeatherKind = 'sun' | 'partly' | 'cloud' | 'rain';
export function weatherOn(date: string, regionId: string) {
  const index = Array.from({ length: 7 }, (_, i) => addDays(DEMO_TODAY, i)).indexOf(date);
  if (index < 0) return null;
  const region = REGIONS.find(item => item.id === regionId) ?? REGIONS[0];
  const kinds: WeatherKind[] = ['partly', 'sun', 'cloud', 'rain', 'partly', 'sun', 'sun'];
  const kind = kinds[(index + (regionId === 'osaka' ? 1 : 0)) % 7];
  return { kind, label: { sun: '晴れ', partly: '晴れ時々くもり', cloud: 'くもり', rain: '雨' }[kind], high: [23, 24, 22, 20, 22, 23, 24][index] + region.offset, low: [16, 15, 17, 16, 14, 15, 16][index] + region.offset, rain: { sun: 10, partly: 20, cloud: 40, rain: 80 }[kind] };
}

import { CALENDARS, EMPTY_CHANGES, REGIONS, SCENARIO_VERSION, dateKey, parseDate, validateEvent } from '../../shared/calendar.ts';
import type { CalendarEvent, CalendarId, Changes } from '../../shared/calendar.ts';

export type SavedState = {
  version: string;
  changes: Changes;
  visible: string[];
  region: string;
  dense: boolean;
  showMetrics: boolean;
};
export const STORAGE_KEY = 'hibi-native-mock-v1';
export const DEFAULT_STATE: SavedState = {
  version: SCENARIO_VERSION,
  changes: EMPTY_CHANGES,
  visible: CALENDARS.map(calendar => calendar.id),
  region: 'tokyo', dense: false, showMetrics: false,
};

function validEvent(event: unknown): event is CalendarEvent {
  if (!event || typeof event !== 'object') return false;
  const item = event as Record<string, unknown>;
  return ['id', 'title', 'startDate', 'endDate', 'startTime', 'endTime', 'location', 'notes'].every(key => typeof item[key] === 'string') && typeof item.allDay === 'boolean' && CALENDARS.some(calendar => calendar.id === item.calendarId);
}
export function decodeState(value: string | null): SavedState {
  if (!value) return DEFAULT_STATE;
  const raw = JSON.parse(value);
  if (raw?.version !== SCENARIO_VERSION) return DEFAULT_STATE;
  if (!Array.isArray(raw?.changes?.created) || !raw.changes.created.every(validEvent) || !Array.isArray(raw?.changes?.removed) || !raw.changes.removed.every((id: unknown) => typeof id === 'string') || typeof raw?.changes?.updated !== 'object' || !raw.changes.updated || !Object.values(raw.changes.updated).every(validEvent)) throw new Error('保存済みデータの形式を確認できません。');
  return { version: SCENARIO_VERSION, changes: raw.changes, visible: Array.isArray(raw.visible) ? raw.visible.filter((id: unknown) => CALENDARS.some(calendar => calendar.id === id)) : DEFAULT_STATE.visible, region: REGIONS.some(region => region.id === raw.region) ? raw.region : 'tokyo', dense: raw.dense === true, showMetrics: raw.showMetrics === true };
}
export function createDraft(date: string, calendarId: CalendarId = 'family', id = `${Date.now()}-${Math.random().toString(36).slice(2)}`): CalendarEvent {
  return { id: `draft-${id}`, calendarId, title: '', startDate: date, endDate: date, startTime: '10:00', endTime: '11:00', allDay: false, location: '', notes: '' };
}
export function isReadOnly(event: CalendarEvent) { return Boolean(event.readOnly || event.recurring || event.calendarId === 'archive'); }
export function commitEvent(changes: Changes, draft: CalendarEvent): Changes {
  if (isReadOnly(draft)) return changes;
  const event = { ...draft, id: draft.id.startsWith('draft-') ? draft.id.replace('draft-', 'local-') : draft.id, title: draft.title.trim() };
  const isLocal = draft.id.startsWith('draft-') || changes.created.some(item => item.id === event.id);
  return isLocal ? { ...changes, created: [...changes.created.filter(item => item.id !== event.id), event] } : { ...changes, updated: { ...changes.updated, [event.id]: event } };
}
export function deleteEvent(changes: Changes, id: string): Changes {
  const updated = { ...changes.updated };
  delete updated[id];
  return { created: changes.created.filter(event => event.id !== id), updated, removed: [...new Set([...changes.removed, id])] };
}
export function validateDraft(event: CalendarEvent): string | null {
  const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && dateKey(parseDate(value)) === value;
  if (!validDate(event.startDate) || !validDate(event.endDate)) return '有効な日付を入力してください（例：2026-10-21）。';
  if (!event.allDay && (!/^([01]\d|2[0-3]):[0-5]\d$/.test(event.startTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(event.endTime))) return '有効な時刻を入力してください（例：10:00）。';
  return validateEvent(event);
}

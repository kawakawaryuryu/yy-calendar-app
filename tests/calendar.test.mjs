import test from 'node:test';
import assert from 'node:assert/strict';
import { DEMO_TODAY, addDays, applyChanges, eventOccursOn, eventsOn, monthDays, seedMonth, shiftMonth, validateEvent, weatherOn } from '../shared/calendar.ts';

test('month movement handles year boundaries and a 31-day starting date', () => {
  assert.equal(shiftMonth('2026-12-31', 1), '2027-01-01');
  assert.equal(shiftMonth('2026-03-31', -1), '2026-02-01');
  assert.equal(addDays('2028-02-28', 1), '2028-02-29');
});
test('month grid is six weeks and starts on Sunday', () => {
  const days = monthDays('2026-10-01');
  assert.equal(days.length, 42);
  assert.equal(days[0], '2026-09-27');
  assert.equal(days[41], '2026-11-07');
});
test('all-day multiday event has an exclusive end and crosses months', () => {
  const event = seedMonth('2026-10-01').find(event => event.id === 'month-boundary');
  assert.equal(eventOccursOn(event, '2026-10-30'), false);
  assert.equal(eventOccursOn(event, '2026-10-31'), true);
  assert.equal(eventOccursOn(event, '2026-11-02'), true);
  assert.equal(eventOccursOn(event, '2026-11-03'), false);
});
test('a timed event ending at midnight does not appear the following day', () => {
  const event = { ...seedMonth('2026-10-01')[0], allDay: false, startDate: '2026-10-21', endDate: '2026-10-22', startTime: '23:00', endTime: '00:00' };
  assert.equal(eventOccursOn(event, '2026-10-21'), true);
  assert.equal(eventOccursOn(event, '2026-10-22'), false);
});
test('demo weather covers exactly today plus six days; values depend on region', () => {
  assert.equal(weatherOn(addDays(DEMO_TODAY, -1), 'tokyo'), null);
  assert.ok(weatherOn(DEMO_TODAY, 'tokyo'));
  assert.ok(weatherOn(addDays(DEMO_TODAY, 6), 'tokyo'));
  assert.equal(weatherOn(addDays(DEMO_TODAY, 7), 'tokyo'), null);
  assert.notDeepEqual(weatherOn(DEMO_TODAY, 'tokyo'), weatherOn(DEMO_TODAY, 'sapporo'));
});
test('changes replace originals, apply deletions and preserve created events', () => {
  const events = seedMonth('2026-10-01');
  const original = events.find(event => event.id === 'today-lunch');
  const updated = { ...original, title: '変更済み' };
  const created = { ...original, id: 'new-test', title: '新しい予定' };
  const actual = applyChanges(events, { created: [created], updated: { [original.id]: updated }, removed: ['today-dinner'] });
  assert.equal(actual.find(event => event.id === original.id).title, '変更済み');
  assert.equal(actual.filter(event => event.id === original.id).length, 1);
  assert.ok(actual.some(event => event.id === created.id));
  assert.ok(!actual.some(event => event.id === 'today-dinner'));
});
test('calendar filters and event ordering do not mutate source data', () => {
  const events = seedMonth('2026-10-01');
  const all = eventsOn(events, DEMO_TODAY, ['family', 'work', 'personal']);
  assert.equal(all[0].id, 'today-anniversary');
  assert.equal(all.length, 6);
  const family = eventsOn(events, DEMO_TODAY, ['family']);
  assert.equal(family.length, 3);
  assert.ok(family.every(event => event.calendarId === 'family'));
  assert.equal(eventsOn(events, DEMO_TODAY, []).length, 0);
});
test('scenario is deterministic and dense mode adds exactly 24 events per day', () => {
  assert.deepEqual(seedMonth('2026-10-01'), seedMonth('2026-10-01'));
  for (const date of [DEMO_TODAY, '2026-10-24', '2026-10-31']) {
    const count = dense => eventsOn(seedMonth('2026-10-01', dense), date, ['family','work','personal']).length;
    assert.equal(count(true) - count(false), 24);
  }
});
test('validation rejects blank titles, inverted times and invalid all-day ranges', () => {
  const original = seedMonth('2026-10-01').find(event => event.id === 'today-lunch');
  assert.equal(validateEvent(original), null);
  assert.ok(validateEvent({ ...original, title: '  ' }));
  assert.ok(validateEvent({ ...original, endTime: '11:00' }));
  assert.ok(validateEvent({ ...original, allDay: true, endDate: original.startDate }));
  assert.equal(validateEvent({ ...original, allDay: true, endDate: addDays(original.startDate, 1) }), null);
});

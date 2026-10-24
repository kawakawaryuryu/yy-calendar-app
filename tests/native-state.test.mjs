import test from 'node:test';
import assert from 'node:assert/strict';
import { DEMO_TODAY, EMPTY_CHANGES, SCENARIO_VERSION, seedMonth } from '../shared/calendar.ts';
import { DEFAULT_STATE, commitEvent, createDraft, decodeState, deleteEvent, isReadOnly, validateDraft } from '../native/src/state.ts';

test('native edits a new event without creating a duplicate and deletes its saved change', () => {
  const draft = { ...createDraft(DEMO_TODAY, 'family', 'test'), title: '  夕食  ' };
  let changes = commitEvent(EMPTY_CHANGES, draft);
  assert.equal(changes.created[0].id, 'local-test');
  assert.equal(changes.created[0].title, '夕食');
  changes = commitEvent(changes, { ...changes.created[0], title: '夕食の買い物' });
  assert.equal(changes.created.length, 1);
  assert.equal(changes.created[0].title, '夕食の買い物');
  changes = deleteEvent(changes, 'local-test');
  assert.equal(changes.created.length, 0);
  assert.deepEqual(changes.removed, ['local-test']);
});

test('native changes an existing seed event, removes its update on deletion, and keeps read-only events intact', () => {
  const event = seedMonth('2026-10-01').find(item => item.id === 'today-lunch');
  const changes = commitEvent(EMPTY_CHANGES, { ...event, title: '変更済み' });
  assert.equal(changes.created.length, 0);
  assert.equal(changes.updated[event.id].title, '変更済み');
  assert.deepEqual(deleteEvent(changes, event.id).updated, {});
  for (const locked of [{ ...event, readOnly: true }, { ...event, recurring: true }, { ...event, calendarId: 'archive' }]) {
    assert.equal(isReadOnly(locked), true);
    assert.equal(commitEvent(changes, locked), changes);
  }
});

test('native restores valid state, filters obsolete settings and rejects damaged current data', () => {
  const changes = commitEvent(EMPTY_CHANGES, { ...createDraft(DEMO_TODAY, 'family', 'test'), title: '保存した予定' });
  const state = { ...DEFAULT_STATE, changes, visible: ['family', 'unknown'], region: 'unknown', dense: true };
  const restored = decodeState(JSON.stringify(state));
  assert.deepEqual(restored.changes, changes);
  assert.deepEqual(restored.visible, ['family']);
  assert.equal(restored.region, 'tokyo');
  assert.equal(restored.dense, true);
  assert.equal(decodeState(null), DEFAULT_STATE);
  assert.equal(decodeState(JSON.stringify({ version: 'old' })), DEFAULT_STATE);
  assert.throws(() => decodeState('{invalid json'));
  assert.throws(() => decodeState(JSON.stringify({ version: SCENARIO_VERSION, changes: { created: [null], updated: {}, removed: [] } })));
});

test('native form rejects impossible dates and times and preserves valid multi-day ranges', () => {
  const event = { ...createDraft(DEMO_TODAY), title: 'テスト' };
  assert.equal(validateDraft(event), null);
  assert.ok(validateDraft({ ...event, startDate: '2026-02-30' }));
  assert.ok(validateDraft({ ...event, startTime: '25:00' }));
  assert.ok(validateDraft({ ...event, endTime: '09:00' }));
  assert.ok(validateDraft({ ...event, allDay: true }));
  assert.equal(validateDraft({ ...event, allDay: true, endDate: '2026-10-24' }), null);
});

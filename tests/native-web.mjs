// Smoke-checks the React Native Web rendering only. This does not test the
// iOS/Android runtime, native date pickers, keyboard, touch feel or frame rate.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {}) });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
context.setDefaultTimeout(10000);
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
await mkdir('artifacts', { recursive: true });
const button = name => page.getByRole('button', { name, exact: true });
const selectedDate = () => page.getByTestId('selected-date');
try {
  await page.goto(process.env.NATIVE_PREVIEW_URL || 'http://localhost:4174');
  await selectedDate().filter({ hasText: '10月21日' }).waitFor();
  assert.equal(await page.locator('[data-testid^="day-"]').count(), 42);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: 'artifacts/native-web-mobile.png' });
  for (let i = 0; i < 10; i++) {
    await button('次の月').click();
    const month = (10 + i) % 12 + 1;
    await selectedDate().filter({ hasText: `${month}月1日` }).waitFor();
  }
  await button('今日').click();
  await selectedDate().filter({ hasText: '10月21日' }).waitFor();
  await page.getByTestId('day-2026-10-24').click();
  await selectedDate().filter({ hasText: '10月24日' }).waitFor();
  await button('秋の温泉旅行の詳細').click();
  assert.equal(await page.getByLabel('終了日', { exact: true }).inputValue(), '2026-10-26');
  await page.getByTestId('event-sheet').getByRole('button', { name: '閉じる', exact: true }).click();
  await button('今日').click();
  await button('週次ミーティングの詳細').click();
  assert.equal(await page.getByLabel('タイトル', { exact: true }).isEditable(), false);
  assert.equal(await button('保存する').count(), 0);
  await page.getByTestId('event-sheet').getByRole('button', { name: '閉じる', exact: true }).last().click();
  await button('新しい予定を作成').click();
  await button('保存する').click();
  await page.getByRole('alert').waitFor();
  await page.getByLabel('タイトル', { exact: true }).fill('Nativeの比較予定');
  await page.getByLabel('場所', { exact: true }).fill('自宅');
  await page.getByLabel('メモ', { exact: true }).fill('保存の確認');
  await page.waitForTimeout(350); // Wait for the sheet slide animation before capture.
  await page.getByTestId('event-sheet').screenshot({ path: 'artifacts/native-web-editor.png' });
  await button('保存する').click();
  await button('Nativeの比較予定の詳細').waitFor();
  await page.reload();
  await button('Nativeの比較予定の詳細').waitFor();
  await button('Nativeの比較予定の詳細').click();
  await page.getByLabel('タイトル', { exact: true }).fill('Native編集済み');
  await button('保存する').click();
  await button('Native編集済みの詳細').click();
  await button('予定を削除').click();
  await button('削除する').click();
  await button('Native編集済みの詳細').waitFor({ state: 'detached' });
  await button('新しい予定を作成').click();
  await page.getByLabel('タイトル', { exact: true }).fill('破棄テスト');
  await button('キャンセル').click();
  await button('破棄する').click();
  assert.equal(await button('破棄テストの詳細').count(), 0);
  await button('表示と設定').click();
  await page.getByRole('radio', { name: '北海道・札幌', exact: true }).click();
  await page.getByRole('checkbox', { name: 'ふたり', exact: true }).click();
  await button('完了').click();
  assert.equal(await button('結婚記念日の詳細').count(), 0);
  assert.equal(await button('天気の地域を変更').innerText(), '札幌');
  await button('表示と設定').click();
  await page.getByRole('checkbox', { name: 'ふたり', exact: true }).click();
  await page.getByRole('switch', { name: '予定を多くする', exact: true }).click();
  await page.getByRole('switch', { name: 'タップの描画応答を表示', exact: true }).click();
  await button('完了').click();
  await page.getByTestId('day-2026-10-22').click();
  await page.getByText('24件の予定', { exact: true }).waitFor();
  await page.getByText(/\d+ ms/).waitFor();
  await button('年月を選択').click();
  await button('過去の予定を試す').click();
  await selectedDate().filter({ hasText: '10月1日' }).waitFor();
  await button('今日').click();
  // Small portrait and landscape must keep the agenda on-screen; month rows
  // remain reachable by scrolling their own pane on compact screens.
  for (const viewport of [{ width: 320, height: 568 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(350);
    const bounds = await selectedDate().boundingBox();
    assert.ok(bounds.y >= 0 && bounds.y < viewport.height - 20);
    assert.ok(bounds.width >= 90 && bounds.x + bounds.width <= viewport.width, 'selected date must fit in its pane');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: `artifacts/native-web-${viewport.width}.png` });
  }
  assert.deepEqual(errors, []);
  console.log('React Native Web UI smoke check: passed (month × 10, date selection, multi-day/read-only events, validation, create/edit/delete, discard, persistence, settings, dense data, compact/landscape layout). Native runtime testing is separate.');
} catch (error) {
  await page.screenshot({ path: 'artifacts/native-web-failure.png' }).catch(() => {});
  console.error('Browser errors:', errors);
  throw error;
} finally { await browser.close(); }

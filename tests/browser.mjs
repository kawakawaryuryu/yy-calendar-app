// Runs against the production preview, including its real service worker.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium, webkit } from 'playwright';
import { offlineFixture } from './offline-fixture.mjs';

const browserType = process.env.BROWSER === 'webkit' ? webkit : chromium;
const fixture = browserType === webkit ? await offlineFixture() : null;
const baseURL = fixture?.url || process.env.PREVIEW_URL || 'http://localhost:4173';
await mkdir('artifacts', { recursive: true });
const browser = await browserType.launch({ headless: true, ...(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {}) });
const errors = [];
const artifactPrefix = browserType === chromium ? 'pwa' : 'pwa-webkit';
function collectErrors(page) { page.on('pageerror', error => errors.push(error.message)); }
async function waitMonth(page, year, month) {
  await page.waitForFunction(({ year, month }) => {
    const title = document.querySelector('.month-title');
    return title?.querySelector('.month-year')?.textContent === `${year}年` && title?.querySelector('strong')?.textContent === `${month}月`;
  }, { year, month });
}
try {
  const desktopContext = await browser.newContext({ viewport: { width: 1360, height: 1100 } });
  desktopContext.setDefaultTimeout(10000);
  const desktop = await desktopContext.newPage();
  collectErrors(desktop);
  await desktop.goto(baseURL);
  await desktop.getByRole('heading', { name: /10月21日/ }).waitFor();
  await desktop.screenshot({ path: `artifacts/${artifactPrefix}-desktop.png`, fullPage: true });
  assert.equal(await desktop.locator('.month-page:not([inert]) .day-cell').count(), 42);
  await desktop.getByRole('button', { name: '次の月', exact: true }).click();
  await waitMonth(desktop, 2026, 11);
  await desktop.getByRole('button', { name: '前の月', exact: true }).click();
  await waitMonth(desktop, 2026, 10);
  for (let i = 0; i < 10; i++) {
    await desktop.getByRole('button', { name: '次の月', exact: true }).click();
    await waitMonth(desktop, 2026 + Math.floor((10 + i) / 12), ((10 + i) % 12) + 1);
  }
  await desktop.getByRole('button', { name: '今日', exact: true }).click();
  await waitMonth(desktop, 2026, 10);
  await desktop.getByRole('button', { name: '週次ミーティングの詳細' }).click();
  const readDialog = desktop.getByRole('dialog', { name: '予定の詳細' });
  assert.ok(await readDialog.getByLabel('タイトル', { exact: true }).getAttribute('readonly') !== null);
  assert.equal(await readDialog.getByRole('button', { name: '保存する' }).count(), 0);
  await readDialog.getByRole('button', { name: '閉じる', exact: true }).last().click();
  await desktopContext.close();
  console.log('Desktop navigation and read-only events: passed');

  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  context.setDefaultTimeout(10000);
  const page = await context.newPage();
  collectErrors(page);
  await page.goto(baseURL);
  await page.getByRole('heading', { name: /10月21日/ }).waitFor();
  await page.screenshot({ path: `artifacts/${artifactPrefix}-mobile.png`, fullPage: true });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'mobile page must not overflow horizontally');
  await page.locator('.month-page:not([inert]) [data-date="2026-10-24"]').click();
  await page.getByRole('heading', { name: /10月24日/ }).waitFor();
  await page.getByRole('button', { name: '秋の温泉旅行の詳細' }).click();
  const trip = page.getByRole('dialog', { name: '予定を編集' });
  assert.equal(await trip.getByLabel('終了日', { exact: true }).inputValue(), '2026-10-26');
  await trip.getByRole('button', { name: '閉じる', exact: true }).click();
  await page.getByRole('button', { name: '今日', exact: true }).click();
  await page.getByRole('button', { name: '新しい予定を作成', exact: true }).click();
  const editor = page.getByRole('dialog', { name: '新しい予定' });
  await editor.getByLabel('タイトル', { exact: true }).fill('操作比較のテスト予定');
  await editor.getByLabel('場所', { exact: true }).fill('自宅');
  await editor.getByLabel('メモ', { exact: true }).fill('保存・編集・再起動の確認');
  await editor.screenshot({ path: `artifacts/${artifactPrefix}-editor.png` });
  await editor.getByRole('button', { name: '保存する', exact: true }).click();
  await page.getByRole('button', { name: '操作比較のテスト予定の詳細', exact: true }).waitFor();
  await page.reload();
  await page.getByRole('button', { name: '操作比較のテスト予定の詳細', exact: true }).waitFor();
  await page.getByRole('button', { name: '操作比較のテスト予定の詳細', exact: true }).click();
  const edit = page.getByRole('dialog', { name: '予定を編集' });
  await edit.getByLabel('タイトル', { exact: true }).fill('編集後のテスト予定');
  await edit.getByRole('button', { name: '保存する' }).click();
  await page.getByRole('button', { name: '編集後のテスト予定の詳細' }).waitFor();
  await page.getByRole('button', { name: '編集後のテスト予定の詳細' }).click();
  await page.getByRole('button', { name: '予定を削除', exact: true }).click();
  await page.getByRole('button', { name: '削除する', exact: true }).click();
  await page.getByRole('button', { name: '編集後のテスト予定の詳細' }).waitFor({ state: 'detached' });
  console.log('Mobile layout, create/edit/delete, persistence: passed');

  await page.getByRole('button', { name: '表示と設定', exact: true }).click();
  const settings = page.getByRole('dialog', { name: '表示と設定' });
  await settings.getByLabel('天気の地域', { exact: true }).selectOption('sapporo');
  await settings.getByLabel('ふたり', { exact: true }).uncheck();
  await settings.getByRole('button', { name: '完了' }).click();
  assert.equal(await page.locator('.agenda-event').count(), 3);
  assert.ok((await page.locator('.temperatures').textContent()).includes('16°'));
  await page.getByRole('button', { name: '表示と設定', exact: true }).click();
  await settings.getByLabel('ふたり', { exact: true }).check();
  await settings.getByLabel('予定を多くする', { exact: false }).check();
  await settings.getByLabel('タップの描画応答を表示', { exact: true }).check();
  await settings.getByRole('button', { name: '完了' }).click();
  await page.locator('.month-page:not([inert]) [data-date="2026-10-22"]').click();
  assert.ok(await page.locator('.agenda-event').count() >= 24);
  await page.waitForFunction(() => document.querySelector('.metrics strong')?.textContent.includes('ms'));
  const measurements = await page.locator('.metrics').textContent();
  await page.locator('.agenda-list').evaluate(element => { element.scrollTop = 250; });
  assert.ok(await page.locator('.agenda-list').evaluate(element => element.scrollTop > 100));
  console.log('Filters, weather region, dense scenario, tap feedback: passed');

  if (browserType === chromium) {
    const cdp = await context.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 320, y: 260 }] });
    for (let step = 1; step <= 10; step++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 320 - step * 27, y: 260 }] });
      await page.waitForTimeout(18);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await waitMonth(page, 2026, 11);
  }
  await page.getByRole('button', { name: '今日', exact: true }).click();
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  const manifestResponse = await context.request.get(`${baseURL}/manifest.webmanifest`);
  const manifest = await manifestResponse.json();
  assert.equal(manifest.display, 'standalone');
  for (const icon of manifest.icons) assert.equal((await context.request.get(`${baseURL}${icon.src}`)).status(), 200);
  const previousBoot = await page.evaluate(() => performance.timeOrigin);
  if (fixture) await fixture.stop();
  else await context.setOffline(true);
  await page.reload();
  assert.notEqual(await page.evaluate(() => performance.timeOrigin), previousBoot, 'offline check must load a new document');
  await page.getByRole('heading', { name: /10月21日/ }).waitFor();
  await page.getByText('オフライン', { exact: true }).waitFor();
  assert.ok(await page.locator('.agenda-event').count() >= 30);
  await context.setOffline(false);
  // Reset test-owned browser state; leave screenshots of the ordinary default scenario.
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  assert.deepEqual(errors, [], 'no uncaught browser errors');
  console.log(JSON.stringify({ browser: browserType.name(), result: 'passed', checks: ['desktop/month navigation × 10', '42-day grid', 'read-only recurrence', 'mobile layout', 'multiday end boundary', 'create/edit/delete/persistence', 'calendar filters', 'weather region', 'dense agenda/scroll', 'tap measurement', ...(browserType === chromium ? ['native touch swipe'] : []), 'manifest/icons', 'offline reload'], measurement: measurements, screenshots: [`artifacts/${artifactPrefix}-desktop.png`, `artifacts/${artifactPrefix}-mobile.png`, `artifacts/${artifactPrefix}-editor.png`] }, null, 2));
  await context.close();
} catch (error) {
  for (const context of browser.contexts()) for (const page of context.pages()) {
    console.error('Failure state:', (await page.locator('body').innerText()).slice(-3500));
    await page.screenshot({ path: `artifacts/${artifactPrefix}-failure.png`, fullPage: true }).catch(() => {});
  }
  console.error('Browser errors:', errors);
  throw error;
} finally { await browser.close(); await fixture?.stop(); }

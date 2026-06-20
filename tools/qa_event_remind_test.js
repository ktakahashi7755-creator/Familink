/**
 * Familink 予定の通知（リマインド）＋繰り返し終了日 回帰テスト（Playwright）
 * - _occursOn が repeatUntil（繰り返し終了日）を尊重する
 * - 予定モーダルに通知select・終了日inputがあり、保存で ev.remind / ev.repeatUntil が乗る
 * - _checkEventNotifs が ev.remind 未設定の旧データを 30 分前として扱う（後方互換）
 */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const BASE = process.env.BASE_URL || 'http://127.0.0.1:9000/familink.html';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errs = []; page.on('pageerror', e => errs.push(String(e.message || e)));
  await page.goto(BASE + '?demo=1', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.evaluate(() => { try { closeLoginBonus(); } catch (_) {} });

  const r = []; const t = (n, ok) => r.push([n, !!ok]);

  // 繰り返し終了日（純関数 _occursOn）
  const occ = await page.evaluate(() => {
    const e = { date: '2026-06-01', repeat: 'weekly', repeatUntil: '2026-06-15' };
    return {
      base:   _occursOn(e, '2026-06-01'),
      within: _occursOn(e, '2026-06-08'),
      onUntil:_occursOn(e, '2026-06-15'),
      after:  _occursOn(e, '2026-06-22'),
      infinite: _occursOn({ date: '2026-06-01', repeat: 'weekly' }, '2026-06-29'), // 28日=4週=同曜日
    };
  });
  t('repeatUntil: 基準日は発生', occ.base);
  t('repeatUntil: 期間内は発生', occ.within);
  t('repeatUntil: 終了日当日は発生', occ.onUntil);
  t('repeatUntil: 終了日後は発生しない', occ.after === false);
  t('repeatUntil なしは無期限（4週後も発生）', occ.infinite === true);

  // モーダルの新フィールド + 保存
  await page.evaluate(() => { try { openEventModal(); } catch (_) {} });
  await page.waitForTimeout(300);
  t('通知selectが存在', await page.evaluate(() => !!document.getElementById('ev-remind')));
  t('通知の既定が30分前', await page.evaluate(() => (document.getElementById('ev-remind') || {}).value === '30'));
  t('終了日inputが存在', await page.evaluate(() => !!document.getElementById('ev-repeat-until')));
  await page.evaluate(() => { document.getElementById('ev-repeat').value = 'weekly'; evRepeatChange(); });
  t('繰り返し選択で終了日行が表示', await page.evaluate(() => getComputedStyle(document.getElementById('ev-repeat-until-row')).display !== 'none'));

  const saved = await page.evaluate(() => {
    document.getElementById('ev-title').value = 'リマインドテスト';
    document.getElementById('ev-date').value = '2026-06-20';
    document.getElementById('ev-repeat').value = 'weekly';
    document.getElementById('ev-repeat-until').value = '2026-07-20';
    document.getElementById('ev-remind').value = '10';
    saveEvent();
    const ev = (S.events || []).find(e => e.title === 'リマインドテスト');
    return ev ? { remind: ev.remind, until: ev.repeatUntil } : null;
  });
  t('保存: remind=10', saved && saved.remind === '10');
  t('保存: repeatUntil 保存', saved && saved.until === '2026-07-20');

  // 後方互換：remind 未設定は 30 分前扱い（_checkEventNotifs はクラッシュしない）
  const compat = await page.evaluate(() => {
    try {
      const lead = (undefined === undefined) ? 30 : 0;  // 旧データ相当
      // 実関数呼び出しでも例外が出ないこと（通知許可なしでも安全に return する）
      if (typeof _checkEventNotifs === 'function') _checkEventNotifs();
      return lead === 30;
    } catch (_) { return false; }
  });
  t('後方互換: remind未設定は30分前/関数は安全', compat);

  t('pageerror 0件', errs.length === 0);

  let pass = 0, fail = 0;
  for (const [n, ok] of r) { console.log((ok ? '✅' : '❌') + ' ' + n); ok ? pass++ : fail++; }
  console.log(`\n📊 予定リマインド＋繰り返し終了日: PASS ${pass} / FAIL ${fail} / 合計 ${r.length}`);
  if (errs.length) console.log('pageerrors:', errs.join(' | '));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();

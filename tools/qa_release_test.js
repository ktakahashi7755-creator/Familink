const { chromium } = require('/opt/node22/lib/node_modules/playwright');
let pass = 0, fail = 0;
const log = (r) => { const ok = r.startsWith('PASS'); ok ? pass++ : fail++; console.log((ok ? '✅' : '❌') + ' ' + r.slice(5)); };
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message.split('\n')[0]));
  await page.addInitScript(() => { try { window.location.reload = () => { window.__reloaded = true; }; } catch(_){} });
  await page.goto('http://127.0.0.1:9000/familink.html', { waitUntil: 'load' });

  // ── P0-1a: クラウドログイン状態でログアウト → データ消去 ──
  await page.evaluate(() => {
    localStorage.removeItem('fl_lb_shown');
    localStorage.setItem('familink_v3', JSON.stringify({
      loggedIn: true, onboardCompleted: true, guideSeen: true,
      user: { id: 'kenya', name: 'パパ', role: 'parent' }, screen: 's-home',
      supaSession: { id: 'uid-123', email: 'test@example.com' },
      account: { email: 'test@example.com', passHash: 'x' },
      activeTheme: 'sora',
      events: [{ id: 'e1', title: '秘密の予定', date: '2026-06-15' }],
      tasks: [{ id: 't1', title: '秘密のタスク', status: 'todo' }],
      health: [{ id: 'h1', member: 'kenya', temp: 38.0, date: '2026-06-15' }],
      txs: [{ id: 'x1', type: 'expense', amount: 99999, date: '2026-06-15' }],
    }));
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(1500);
  // doLogoutの確認ダイアログ文言（クラウド時はデータ消去を明示）
  const confMsg = await page.evaluate(() => {
    doLogout();
    return document.getElementById('confirm-msg') ? document.getElementById('confirm-msg').textContent : '';
  });
  log((/家族のデータは消去/.test(confMsg) ? 'PASS ' : 'FAIL ') + 'P0-1 クラウド時ログアウト確認文にデータ消去明示');
  // 「ログアウトする」を実行（reloadされる前にlocalStorage確認するためreloadをstub）
  await page.evaluate(() => {
    const ok = [...document.querySelectorAll('#m-confirm button')].find(b => /ログアウトする/.test(b.textContent));
    if (ok) ok.click();
  });
  await page.waitForTimeout(800);
  const afterLogout = await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('familink_v3') || '{}');
    return {
      hasEvents: Array.isArray(raw.events) && raw.events.length > 0,
      hasTasks: Array.isArray(raw.tasks) && raw.tasks.length > 0,
      hasHealth: Array.isArray(raw.health) && raw.health.length > 0,
      hasTxs: Array.isArray(raw.txs) && raw.txs.length > 0,
      keptTheme: raw.activeTheme === 'sora',
      keptAccount: !!(raw.account && raw.account.email),
      keptGuide: raw.guideSeen === true,
    };
  });
  log((!afterLogout.hasEvents && !afterLogout.hasTasks && !afterLogout.hasHealth && !afterLogout.hasTxs ? 'PASS ' : 'FAIL ') + 'P0-1 ログアウト後にevents/tasks/health/txsが消える: ' + JSON.stringify(afterLogout));
  log((afterLogout.keptTheme && afterLogout.keptAccount && afterLogout.keptGuide ? 'PASS ' : 'FAIL ') + 'P0-1 テーマ/アカウント/ガイド設定は保持される');

  // ── P0-1b: ローカル専用（クラウドなし）はデータを消さない ──
  await page.evaluate(() => {
    localStorage.setItem('familink_v3', JSON.stringify({
      loggedIn: true, onboardCompleted: true, guideSeen: true,
      user: { id: 'kenya', name: 'パパ' }, screen: 's-home',
      account: { email: 'local@only', passHash: 'x' },
      events: [{ id: 'e1', title: 'ローカル予定', date: '2026-06-15' }],
    }));
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(1400);
  const localConf = await page.evaluate(() => {
    doLogout();
    return document.getElementById('confirm-msg').textContent;
  });
  log((!/消去されます/.test(localConf) ? 'PASS ' : 'FAIL ') + 'P0-1 ローカル専用は消去文言を出さない');
  await page.evaluate(() => { const ok = [...document.querySelectorAll('#m-confirm button')].find(b => /ログアウトする/.test(b.textContent)); if (ok) ok.click(); });
  await page.waitForTimeout(600);
  const localAfter = await page.evaluate(() => { const raw = JSON.parse(localStorage.getItem('familink_v3') || '{}'); return Array.isArray(raw.events) && raw.events.length > 0; });
  log((localAfter ? 'PASS ' : 'FAIL ') + 'P0-1 ローカル専用はログアウトでデータを保持');

  // ── P1-3: FAMILY_SHARED_KEYS から faceGroups 除去 ──
  const sharedKeys = await page.evaluate(() => (typeof FAMILY_SHARED_KEYS !== 'undefined') ? FAMILY_SHARED_KEYS.slice() : []);
  log((!sharedKeys.includes('faceGroups') && sharedKeys.includes('albumPhotos') ? 'PASS ' : 'FAIL ') + 'P1-3 共有キーからfaceGroups除去・他は維持');

  // ── P1-4: 招待連打防止 ──
  const inviteDebounce = await page.evaluate(() => {
    return typeof _inviteSubmitLock !== 'undefined';
  });
  log((inviteDebounce ? 'PASS ' : 'FAIL ') + 'P1-4 招待送信にクールダウン変数が存在');

  // ── 一般: pageerror なし ──
  log((errs.length === 0 ? 'PASS ' : 'FAIL ') + 'pageerror 0件' + (errs.length ? ': ' + errs.slice(0,2).join(' | ') : ''));

  console.log('────────────────────');
  console.log(`リリース修正テスト: PASS ${pass} / FAIL ${fail}`);
  await browser.close();
  process.exit(fail > 0 ? 1 : 0);
})();

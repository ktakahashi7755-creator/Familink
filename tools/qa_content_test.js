/* Familink 表示値の正当性テスト — 決定的データを投入し、画面の数値・件数・内容が一致するか検証 */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
let pass = 0, fail = 0; const fails = [];
const log = (r) => { const ok = r.startsWith('PASS'); if (ok) pass++; else { fail++; fails.push(r); } console.log((ok ? '✅' : '❌') + ' ' + r.slice(5)); };
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message.split('\n')[0]));
  await page.addInitScript(() => { const o = Date.prototype.getHours; Date.prototype.getHours = function(){ const h = o.call(this); return (h < 7) ? 10 : h; }; });
  await page.goto('http://127.0.0.1:9000/familink.html', { waitUntil: 'load' });
  await page.evaluate(() => {
    localStorage.removeItem('fl_lb_shown');
    const today = new Date(); const p = (n) => String(n).padStart(2, '0');
    const D = (off) => { const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + off); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); };
    const ym = (off) => D(off);
    localStorage.setItem('familink_v3', JSON.stringify({
      loggedIn: true, onboardCompleted: true, guideSeen: true, demoSeeded: true,
      user: { id: 'kenya', name: 'パパ', role: 'parent' }, screen: 's-home',
      members: [{ id: 'kenya', name: 'パパ', role: 'parent' }, { id: 'hanako', name: '花子', role: 'child' }],
      txs: [
        { id: 'tx1', type: 'expense', amount: 1000, category: '食費', desc: '内容確認A', date: D(0), member: 'kenya' },
        { id: 'tx2', type: 'expense', amount: 2000, category: '食費', desc: '内容確認B', date: D(0), member: 'kenya' },
        { id: 'tx3', type: 'expense', amount: 3000, category: '日用品', desc: '内容確認C', date: D(0), member: 'kenya' },
        { id: 'tx4', type: 'income', amount: 10000, category: '給与', desc: '収入A', date: D(0), member: 'kenya' },
        { id: 'tx5', type: 'income', amount: 5000, category: '給与', desc: '収入B', date: D(0), member: 'kenya' },
      ],
      tasks: [
        { id: 'tk-today', title: '今日のタスク確認', status: 'todo', dueDate: D(0), order: 0, createdAt: D(0), updatedAt: D(0) },
        { id: 'tk-week', title: '今週のタスク確認', status: 'todo', dueDate: D(2), order: 1, createdAt: D(0), updatedAt: D(0) },
        { id: 'tk-over', title: '期限切れタスク確認', status: 'todo', dueDate: D(-1), order: 2, createdAt: D(-5), updatedAt: D(-5) },
        { id: 'tk-done', title: '完了済みタスク確認', status: 'done', dueDate: D(0), completedAt: D(0), order: 3, createdAt: D(0), updatedAt: D(0) },
      ],
      events: [
        { id: 'ev1', title: '今日の予定A', date: D(0), startTime: '09:00' },
        { id: 'ev2', title: '今日の予定B', date: D(0), startTime: '23:50' },
        { id: 'ev3', title: '明日の予定C', date: D(1), startTime: '10:00' },
      ],
      notifs: [
        { id: 'n1', title: '未読通知1', desc: '', icon: 'bell', time: D(0), read: false },
        { id: 'n2', title: '未読通知2', desc: '', icon: 'bell', time: D(0), read: false },
        { id: 'n3', title: '既読通知', desc: '', icon: 'bell', time: D(0), read: true },
      ],
      health: [
        { id: 'h1', member: 'hanako', date: D(-1), temp: 37.0, condition: '普通' },
        { id: 'h2', member: 'hanako', date: D(0), temp: 36.5, condition: '普通' },
      ],
      shoppingItems: [
        { id: 's1', name: '買い物項目A', status: 'active', section: '今すぐ', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 's2', name: '買い物項目B', status: 'active', section: '今すぐ', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      ],
      shoppingHistory: [{ id: 'sh1', name: '購入済み品X', purchasedAt: new Date().toISOString() }],
      announces: [], memos: [], docs: [], albumPhotos: [],
    }));
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(1600);
  await page.evaluate(() => { try { closeLoginBonus(); } catch(_){} try { closeModal('m-guide'); } catch(_){} try { closeModal('m-tour-offer'); } catch(_){} });

  const r = await page.evaluate(async () => {
    const out = []; const t = (n, c) => out.push((c ? 'PASS ' : 'FAIL ') + n);
    const wait = (ms) => new Promise(r2 => setTimeout(r2, ms));
    const txt = (id) => document.getElementById(id).textContent.replace(/\s+/g, '');

    /* ── 家計：合計の正確性 ── */
    go('s-budget'); await wait(400);
    const bt = txt('s-budget');
    t('家計: 支出合計 ¥6,000 が表示', bt.includes('6,000'));
    t('家計: 収入合計 ¥15,000 が表示', bt.includes('15,000'));
    t('家計: 収支 +9,000 が表示', bt.includes('9,000'));

    /* ── タスク：フィルタ件数の正確性 ── */
    go('s-task'); await wait(300);
    const visTitles = () => [...document.querySelectorAll('#s-task .tk-card, #s-task [class*="tk-"]')].map(e => e.textContent).join(' ');
    // すべて（未完了のみ表示想定）
    const allT = txt('s-task');
    t('タスク[すべて]: 今日/今週/期限切れの3件が見える', allT.includes('今日のタスク確認') && allT.includes('今週のタスク確認') && allT.includes('期限切れタスク確認'));
    // 今日
    const chips = [...document.querySelectorAll('#s-task .tk-filter-btn')];
    const click = (lbl) => { const c = chips.find(x => x.textContent.includes(lbl)); if (c) c.click(); };
    click('今日'); await wait(250);
    const todayT = txt('s-task');
    t('タスク[今日]: 今日のみ表示', todayT.includes('今日のタスク確認') && !todayT.includes('今週のタスク確認'));
    click('今週'); await wait(250);
    const weekT = txt('s-task');
    t('タスク[今週]: 今週分が表示・期限切れ除外', weekT.includes('今週のタスク確認') && !weekT.includes('期限切れタスク確認'));
    click('期限切れ'); await wait(250);
    const overT = txt('s-task');
    t('タスク[期限切れ]: 期限切れのみ', overT.includes('期限切れタスク確認') && !overT.includes('今週のタスク確認'));
    click('完了済み'); await wait(250);
    const doneT = txt('s-task');
    t('タスク[完了済み]: 完了のみ', doneT.includes('完了済みタスク確認') && !doneT.includes('期限切れタスク確認'));
    click('すべて'); await wait(200);

    /* ── ホーム：ウィジェットの内容 ── */
    go('s-home'); await wait(400);
    const ht = txt('s-home');
    t('ホーム: 今日の予定A/Bが今後の予定に出る', ht.includes('今日の予定A') && ht.includes('今日の予定B'));
    t('ホーム: 明日の予定Cも出る', ht.includes('明日の予定C'));
    t('ホーム: 未完了タスクが出て完了済みは出ない', ht.includes('今日のタスク確認') && !ht.includes('完了済みタスク確認'));
    const badge = document.getElementById('home-bell-badge');
    t('ホーム: ベルバッジ=未読2', badge && badge.style.display !== 'none' && badge.textContent.trim() === '2');
    t('ホーム: 体調カードに花子の最新36.5', ht.includes('36.5'));

    /* ── カレンダー：今日の件数とリスト ── */
    go('s-cal'); await wait(400);
    const ct = txt('s-cal');
    t('カレンダー: 今日の詳細に2件表示', ct.includes('2件') && ct.includes('今日の予定A') && ct.includes('今日の予定B'));
    // リスト表示
    if (typeof setCalView === 'function') { setCalView('list'); await wait(300); }
    const lt = txt('s-cal');
    t('カレンダー[リスト]: 3予定すべて表示', lt.includes('今日の予定A') && lt.includes('今日の予定B') && lt.includes('明日の予定C'));
    if (typeof setCalView === 'function') { setCalView('month'); await wait(200); }

    /* ── 通知：未読と全既読 ── */
    go('s-notif'); await wait(300);
    const nt = txt('s-notif');
    t('通知: 3件表示（未読2既読1）', nt.includes('未読通知1') && nt.includes('未読通知2') && nt.includes('既読通知'));
    const allReadBtn = [...document.querySelectorAll('#s-notif button, #s-notif [onclick]')].find(b => /全既読/.test(b.textContent));
    if (allReadBtn) { allReadBtn.click(); await wait(300); }
    const unreadAfter = (S.notifs || []).filter(n => !n.read).length;
    t('通知: 全既読で未読0', unreadAfter === 0);
    go('s-home'); await wait(300);
    const badge2 = document.getElementById('home-bell-badge');
    t('通知: 全既読後ベルバッジ消灯', !badge2 || badge2.style.display === 'none');

    /* ── 買い物：タブ内容 ── */
    go('s-shopping'); await wait(300);
    const st = txt('s-shopping');
    t('買い物[リスト]: 2件表示', st.includes('買い物項目A') && st.includes('買い物項目B'));
    if (typeof setShopTab === 'function') { setShopTab('history'); await wait(250); }
    const sht = txt('s-shopping');
    t('買い物[履歴]: 購入済み品X表示', sht.includes('購入済み品X'));
    if (typeof setShopTab === 'function') { setShopTab('list'); await wait(150); }

    /* ── 体調：履歴と最新値 ── */
    go('s-health'); await wait(400);
    const hlt = txt('s-health');
    t('体調: 花子の最新が36.5（37.0は履歴）', hlt.includes('36.5'));

    /* ── プレミアム表記 vs 実値の整合 ── */
    const lim = (typeof PREMIUM_LIMITS !== 'undefined') ? PREMIUM_LIMITS : null;
    if (lim) {
      go('s-premium'); await wait(400);
      const pt = document.getElementById('s-premium').textContent;
      // 画面に「○件まで」等の数字があれば PREMIUM_LIMITS と矛盾しないか（出現する数字のみ照合）
      const evFree = lim.events && lim.events.free;
      const claimNums = (pt.match(/(\d+)\s*件まで/g) || []).map(s => parseInt(s, 10));
      const known = Object.values(lim).map(v => v && v.free).filter(n => typeof n === 'number');
      const mismatch = claimNums.filter(n => !known.includes(n));
      t('プレミアム: 「○件まで」表記が実制限値と一致（不一致' + mismatch.length + '件）', mismatch.length === 0);
    }
    return out;
  });
  r.forEach(log);
  console.log('────────────────────');
  console.log(`表示値テスト: PASS ${pass} / FAIL ${fail}` + (errs.length ? ' / PAGEERRORS ' + errs.length : ' / PAGEERRORS 0'));
  if (fails.length) fails.forEach(f => console.log('  FAIL: ' + f.slice(5)));
  await browser.close();
  process.exit(fail > 0 || errs.length > 0 ? 1 : 0);
})();

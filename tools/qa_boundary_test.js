const { chromium } = require('/opt/node22/lib/node_modules/playwright');
let pass = 0, fail = 0;
const log = (r) => { const ok = r.startsWith('PASS'); ok ? pass++ : fail++; console.log((ok ? '✅' : '❌') + ' ' + r.slice(5)); };
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message.split('\n')[0]));
  await page.goto('http://127.0.0.1:9000/familink.html', { waitUntil: 'load' });
  await page.evaluate(() => {
    localStorage.removeItem('fl_lb_shown');
    localStorage.setItem('familink_v3', JSON.stringify({
      loggedIn: true, onboardCompleted: true, guideSeen: true, demoSeeded: true,
      user: { id: 'kenya', name: 'パパ', role: 'parent' }, screen: 's-home',
      // 2026-05-31 / 06-01 / 06-30 / 07-01 / 12-31 / 翌2027-01-01 の境界データ
      txs: [
        { id: 'b1', type: 'expense', amount: 101, category: '食費', desc: '5月末日', date: '2026-05-31', member: 'kenya' },
        { id: 'b2', type: 'expense', amount: 202, category: '食費', desc: '6月初日', date: '2026-06-01', member: 'kenya' },
        { id: 'b3', type: 'expense', amount: 303, category: '食費', desc: '6月末日', date: '2026-06-30', member: 'kenya' },
        { id: 'b4', type: 'expense', amount: 404, category: '食費', desc: '7月初日', date: '2026-07-01', member: 'kenya' },
      ],
      events: [
        { id: 'be1', title: '大晦日の予定', date: '2026-12-31', startTime: '10:00' },
        { id: 'be2', title: '元日の予定', date: '2027-01-01', startTime: '10:00' },
        { id: 'be3', title: '6月末の予定', date: '2026-06-30', startTime: '10:00' },
        { id: 'be4', title: '7月頭の予定', date: '2026-07-01', startTime: '10:00' },
      ],
      tasks: [], notifs: [], health: [], shoppingItems: [], announces: [], memos: [], docs: [], albumPhotos: [],
    }));
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(1500);
  await page.evaluate(() => { try { closeLoginBonus(); } catch(_){} try { closeModal('m-guide'); } catch(_){} try { closeModal('m-tour-offer'); } catch(_){} });
  const r = await page.evaluate(async () => {
    const out = []; const t = (n, c) => out.push((c ? 'PASS ' : 'FAIL ') + n);
    const wait = (ms) => new Promise(r2 => setTimeout(r2, ms));
    const txt = (id) => document.getElementById(id).textContent.replace(/\s+/g, '');
    /* ── 家計の月境界 ── */
    go('s-budget'); await wait(400);
    // 6月へ（現在月=6月想定。budgetY/budgetMで直接設定して確実に）
    S.budgetY = 2026; S.budgetM = 5; renderBudget(); await wait(250);
    let bt = txt('s-budget');
    t('家計6月: 6/1と6/30が含まれ(202+303=505)、5/31と7/1は除外', bt.includes('505') && !bt.includes('¥101') && !bt.includes('¥404'));
    S.budgetM = 4; renderBudget(); await wait(250);
    bt = txt('s-budget');
    t('家計5月: 5/31のみ(101)', bt.includes('¥101') && !bt.includes('¥202'));
    S.budgetM = 6; renderBudget(); await wait(250);
    bt = txt('s-budget');
    t('家計7月: 7/1のみ(404)', bt.includes('¥404') && !bt.includes('¥303'));
    S.budgetY = 2026; S.budgetM = new Date().getMonth(); renderBudget();
    /* ── カレンダーの年跨ぎ ── */
    go('s-cal'); await wait(400);
    S.calY = 2026; S.calM = 11; renderCal(); await wait(300);   // 2026年12月
    let ct = txt('s-cal');
    t('カレンダー2026/12: 大晦日の予定が見える', ct.includes('大晦日'));
    changeCalMonth(1); await wait(300);                          // → 2027年1月
    ct = txt('s-cal');
    t('カレンダー年跨ぎ→2027/1: 表示が2027年1月', ct.includes('2027年1月'));
    t('カレンダー2027/1: 元日の予定が見える', ct.includes('元日'));
    changeCalMonth(-1); await wait(250);
    ct = txt('s-cal');
    t('カレンダー戻り→2026/12', ct.includes('2026年12月'));
    // 月末→翌月
    S.calY = 2026; S.calM = 5; renderCal(); await wait(250);
    ct = txt('s-cal');
    t('カレンダー2026/6: 6月末の予定が見え7月頭は見えない', ct.includes('6月末の予定') && !ct.includes('7月頭の予定'));
    changeCalMonth(1); await wait(250);
    ct = txt('s-cal');
    t('カレンダー2026/7: 7月頭の予定が見える', ct.includes('7月頭の予定'));
    // 今日に戻す
    const nd = new Date(); S.calY = nd.getFullYear(); S.calM = nd.getMonth(); renderCal();
    /* ── うるう年チェック（2028/2/29 の予定を追加して表示） ── */
    S.events.push({ id: 'leap', title: 'うるう日の予定', date: '2028-02-29', startTime: '10:00' });
    S.calY = 2028; S.calM = 1; renderCal(); await wait(250);
    ct = txt('s-cal');
    t('うるう年2028/2: 29日の予定が表示される', ct.includes('うるう日の予定'));
    S.events = S.events.filter(e => e.id !== 'leap');
    S.calY = nd.getFullYear(); S.calM = nd.getMonth(); renderCal(); saveS();
    return out;
  });
  r.forEach(log);
  console.log('────────────────────');
  console.log(`境界テスト: PASS ${pass} / FAIL ${fail} / PAGEERRORS ${errs.length}`);
  await browser.close();
  process.exit(fail > 0 || errs.length > 0 ? 1 : 0);
})();

const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const out = [];
  const t = (n, c) => out.push((c ? 'PASS ' : 'FAIL ') + n);

  // ── 1) 低い画面（アプリ内ブラウザ相当 375x560）で全ステップの吹き出しが視界内か ──
  let page = await browser.newPage({ viewport: { width: 375, height: 560 } });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message.split('\n')[0]));
  await page.goto('http://127.0.0.1:9000/familink.html', { waitUntil: 'load' });
  await page.evaluate(() => localStorage.setItem('familink_v3', JSON.stringify({ loggedIn: true, onboardCompleted: true, user: { id: 'kenya', name: 'パパ', role: 'parent' }, screen: 's-home', guideSeen: true })));
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(1400);
  await page.evaluate(() => { try { closeLoginBonus(); } catch(_){} try { closeModal('m-guide'); } catch(_){} try { closeModal('m-tour-offer'); } catch(_){} });
  await page.evaluate(() => startAppTour());
  await page.waitForTimeout(700);
  const clipped = [];
  for (let step = 0; step < 25; step++) {
    const info = await page.evaluate(() => {
      if (!_tourState.on) return null;
      const tr = document.getElementById('tour-tip').getBoundingClientRect();
      return { i: _tourState.i, title: document.getElementById('tour-title').textContent,
               top: Math.round(tr.top), bottom: Math.round(tr.bottom), vh: window.innerHeight };
    });
    if (!info) break;
    if (info.top < 0 || info.bottom > info.vh) clipped.push((info.i+1) + ':' + info.title + `(top${info.top},btm${info.bottom}/vh${info.vh})`);
    if (info.i === 3) await page.screenshot({ path: '/tmp/tour2-step4.png' });
    await page.evaluate(() => tourNext());
    await page.waitForTimeout(620);
  }
  t('560px高: 全19ステップで吹き出しが画面内' + (clipped.length ? ' NG:' + clipped.join(' ') : ''), clipped.length === 0);
  await page.close();

  // ── 2) 初回起動フロー：ウェルカム提案 → スキップ / ツアー開始 ──
  page = await browser.newPage({ viewport: { width: 375, height: 812 } });
  page.on('pageerror', e => errs.push(e.message.split('\n')[0]));
  await page.goto('http://127.0.0.1:9000/familink.html', { waitUntil: 'load' });
  // guideSeen を未設定にして初回状態を再現
  await page.evaluate(() => localStorage.setItem('familink_v3', JSON.stringify({ loggedIn: true, onboardCompleted: true, user: { id: 'kenya', name: 'パパ', role: 'parent' }, screen: 's-home' })));
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(1700);
  const firstState = await page.evaluate(() => ({
    offer: document.getElementById('m-tour-offer').classList.contains('open'),
    guide: document.getElementById('m-guide').classList.contains('open'),
    bonus: document.getElementById('m-login-bonus').classList.contains('open'),
  }));
  t('初回: ウェルカム提案が表示される', firstState.offer);
  t('初回: 旧ガイド1ページは自動表示されない', !firstState.guide);
  t('初回: ログインボーナスは提案中に重ならない', !firstState.bonus);
  await page.screenshot({ path: '/tmp/tour2-offer.png' });
  // スキップ → ボーナスが後から出る
  await page.evaluate(() => { const b = [...document.querySelectorAll('#m-tour-offer button')].find(x => /スキップ/.test(x.textContent)); b.click(); });
  await page.waitForTimeout(1100);
  const afterSkip = await page.evaluate(() => ({
    offer: document.getElementById('m-tour-offer').classList.contains('open'),
    bonus: document.getElementById('m-login-bonus').classList.contains('open'),
  }));
  t('スキップ: 提案が閉じてホームへ', !afterSkip.offer);
  t('スキップ後: ログインボーナスが表示される', afterSkip.bonus);
  await page.evaluate(() => closeLoginBonus());
  // 再現2回目はもう出ない（guideSeen）
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(1500);
  const second = await page.evaluate(() => document.getElementById('m-tour-offer').classList.contains('open'));
  t('2回目以降: ウェルカム提案は出ない', !second);
  await page.close();

  // ── 3) 初回 → 「ツアーを見る」でツアーが始まり、終了後にボーナス ──
  page = await browser.newPage({ viewport: { width: 375, height: 812 } });
  page.on('pageerror', e => errs.push(e.message.split('\n')[0]));
  await page.goto('http://127.0.0.1:9000/familink.html', { waitUntil: 'load' });
  await page.evaluate(() => localStorage.setItem('familink_v3', JSON.stringify({ loggedIn: true, onboardCompleted: true, user: { id: 'kenya', name: 'パパ', role: 'parent' }, screen: 's-home' })));
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(1700);
  await page.evaluate(() => { const b = [...document.querySelectorAll('#m-tour-offer button')].find(x => /実演ツアーを見る/.test(x.textContent)); b.click(); });
  await page.waitForTimeout(900);
  const touring = await page.evaluate(() => ({ on: _tourState.on, bonus: document.getElementById('m-login-bonus').classList.contains('open') }));
  t('初回→ツアー開始: ツアーが起動', touring.on);
  t('ツアー中: ボーナスは出ない', !touring.bonus);
  await page.evaluate(() => endAppTour());
  await page.waitForTimeout(1100);
  const afterTour = await page.evaluate(() => document.getElementById('m-login-bonus').classList.contains('open'));
  t('ツアー終了後: ログインボーナスが表示される', afterTour);
  out.forEach(x => console.log(x));
  console.log('pageerrors:', errs.length, errs.slice(0, 3));
  await browser.close();
})();

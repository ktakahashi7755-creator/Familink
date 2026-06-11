const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message.split('\n')[0]));
  await page.goto('http://127.0.0.1:9000/familink.html', { waitUntil: 'load' });
  await page.evaluate(() => localStorage.setItem('familink_v3', JSON.stringify({ loggedIn: true, onboardCompleted: true, user: { id: 'kenya', name: 'パパ', role: 'parent' }, screen: 's-home', guideSeen: true })));
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(1400);
  await page.evaluate(() => { try { closeLoginBonus(); } catch(_){} try { closeModal('m-guide'); } catch(_){} });
  const out = [];
  const t = (n, c) => out.push((c ? 'PASS ' : 'FAIL ') + n);

  // 1) 設定 → 使い方ガイド → CTA がある
  await page.evaluate(() => { go('s-settings'); });
  await page.waitForTimeout(300);
  await page.evaluate(() => openGuide());
  await page.waitForTimeout(300);
  const guideInfo = await page.evaluate(() => ({
    open: document.getElementById('m-guide').classList.contains('open'),
    cta: !!document.querySelector('#guide-body .tour-cta'),
    secPlays: document.querySelectorAll('#guide-body .tour-sec-play').length,
  }));
  t('ガイドが開く', guideInfo.open);
  t('実演ツアーCTAがある', guideInfo.cta);
  t('セクション別実演ボタンが8個', guideInfo.secPlays === 8);
  await page.screenshot({ path: '/tmp/tour-guide.png' });

  // 2) フルツアー開始 → 全ステップを実走
  await page.evaluate(() => { closeModal('m-guide'); });
  await page.waitForTimeout(250);
  await page.evaluate(() => startAppTour());
  await page.waitForTimeout(700);
  let visited = [];
  for (let step = 0; step < 25; step++) {
    const info = await page.evaluate(() => {
      if (!_tourState.on) return null;
      const spot = document.getElementById('tour-spot').getBoundingClientRect();
      return { i: _tourState.i, n: _tourState.steps.length, screen: S.screen,
               title: document.getElementById('tour-title').textContent,
               spotW: Math.round(spot.width), spotH: Math.round(spot.height),
               tipVisible: document.getElementById('tour-tip').getBoundingClientRect().height > 50 };
    });
    if (!info) break;
    visited.push(`${info.i + 1}:${info.screen}:${info.title}(${info.spotW}x${info.spotH})${info.tipVisible ? '' : ':NOTIP'}`);
    if (step === 2) await page.screenshot({ path: '/tmp/tour-step3.png' });
    if (info.title.includes('カメラで読み取り')) await page.screenshot({ path: '/tmp/tour-ocr-step.png' });
    if (info.title.includes('Hoku')) await page.screenshot({ path: '/tmp/tour-hoku-step.png' });
    await page.evaluate(() => tourNext());
    await page.waitForTimeout(620);
  }
  const after = await page.evaluate(() => ({ on: _tourState.on, screen: S.screen, toast: [...document.querySelectorAll('.toast')].map(x => x.textContent).join('|') }));
  t('全' + visited.length + 'ステップ実走（19期待）', visited.length === 19);
  t('全ステップでスポットが有効サイズ', visited.every(v => !/\(0x|x0\)/.test(v)));
  t('全ステップで吹き出し表示', visited.every(v => !v.includes('NOTIP')));
  t('完了後にツアー終了＋ホームへ', after.on === false && after.screen === 's-home');
  t('完了トースト表示', /ツアー完了/.test(after.toast));
  console.log(visited.join('\n'));

  // 3) 画面別ツアー（カレンダーのみ）
  await page.evaluate(() => startAppTour('s-cal'));
  await page.waitForTimeout(700);
  const calTour = await page.evaluate(() => ({ n: _tourState.steps.length, screen: S.screen }));
  t('画面別ツアー: カレンダーは4ステップ', calTour.n === 4 && calTour.screen === 's-cal');
  await page.evaluate(() => endAppTour());
  // 4) 途中終了
  await page.evaluate(() => startAppTour());
  await page.waitForTimeout(600);
  await page.evaluate(() => endAppTour());
  const ended = await page.evaluate(() => !_tourState.on && document.getElementById('app-tour').classList.contains('hidden'));
  t('「終了」でいつでも抜けられる', ended);
  // 5) 戻るボタン
  await page.evaluate(() => startAppTour());
  await page.waitForTimeout(600);
  await page.evaluate(() => tourNext()); await page.waitForTimeout(500);
  await page.evaluate(() => tourPrev()); await page.waitForTimeout(500);
  const backOk = await page.evaluate(() => _tourState.i === 0);
  t('「戻る」で前のステップへ', backOk);
  await page.evaluate(() => endAppTour());

  out.forEach(x => console.log(x));
  console.log('pageerrors:', errs.length, errs.slice(0, 3));
  await browser.close();
})();

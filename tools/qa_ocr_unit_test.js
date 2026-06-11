const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 375, height: 667 } });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message.split('\n')[0]));
  await page.goto('http://127.0.0.1:9000/familink.html', { waitUntil: 'load' });
  await page.evaluate(() => localStorage.setItem('familink_v3', JSON.stringify({ loggedIn: true, onboardCompleted: true, user: { id: 'kenya', name: 'パパ', role: 'parent' }, screen: 's-home', guideSeen: true })));
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(1200);
  const r = await page.evaluate(() => {
    const out = []; const t = (n, c) => out.push((c ? 'PASS ' : 'FAIL ') + n);
    const ctx = { existing: [{ date: '2026-06-20', title: 'プール', member: '' }] };
    const N = (e) => normalizeOcrEvents({ events: [e] }, ctx)[0];
    // 時刻の揺れ
    t('時刻「9時30分」→09:30', N({ title: 'x', date: '2026-06-15', startTime: '9時30分' }).startTime === '09:30');
    t('時刻「１４：００」(全角)→14:00', N({ title: 'x', date: '2026-06-15', startTime: '１４：００' }).startTime === '14:00');
    t('時刻「9」→09:00', N({ title: 'x', date: '2026-06-15', startTime: '9' }).startTime === '09:00');
    t('時刻「25:99」→23:59に丸め', N({ title: 'x', date: '2026-06-15', startTime: '25:99' }).startTime === '23:59');
    // 日付の揺れ
    t('日付「2026/6/8」→2026-06-08', N({ title: 'x', date: '2026/6/8' }).date === '2026-06-08');
    t('日付「２０２６年６月８日」→2026-06-08', N({ title: 'x', date: '２０２６年６月８日' }).date === '2026-06-08');
    // 不正日付
    const feb30 = N({ title: 'x', date: '2026-02-30' });
    t('2/30は「日付が読み取れない」警告', feb30.warnings.some(w => w.includes('日付')));
    // 重複検出
    const dup = N({ title: 'プール', date: '2026-06-20' });
    t('既存と同日同名→_dup=true', dup._dup === true);
    const dup2 = N({ title: 'プール指導', date: '2026-06-20' });
    t('部分一致タイトルも重複扱い', dup2._dup === true);
    const nodup = N({ title: '参観日', date: '2026-06-20' });
    t('別タイトルは重複でない', nodup._dup === false);
    // 終日
    const ad = N({ title: 'x', date: '2026-06-15', allDay: true, startTime: '10:00' });
    t('allDay時はstartTime空', ad.startTime === '' && ad.allDay === true);
    // 曜日不一致警告
    const wk = N({ title: 'x', date: '2026-06-15', originalText: '6/15（火）' }); // 6/15 is Monday
    t('曜日不一致を検出', wk.warnings.some(w => w.includes('曜日')));
    // 過去日警告
    const past = N({ title: 'x', date: '2020-01-01' });
    t('過去日付の警告', past.warnings.some(w => w.includes('過去')));
    // needsReview 判定
    const low = N({ title: 'x', date: '2026-06-15', startTime: '10:00', confidence: 0.5 });
    t('低信頼度はneedsReview', low.needsReview === true);
    const hi = N({ title: 'x', date: '2026-06-15', startTime: '10:00', confidence: 0.95 });
    t('高信頼度・警告なしはneedsReview=false', hi.needsReview === false);
    // XSSタイトルが候補カードでエスケープされるか
    _ocr.cands = [N({ title: '<img src=x onerror=alert(1)>', date: '2026-06-15', startTime: '10:00', confidence: 0.9 })];
    _ocr.bulkMember = '';
    ocrRenderReview(); openModal('m-ocr-review');
    const injected = document.querySelector('#ocr-list img[src="x"]');
    t('OCRタイトルのXSSがエスケープされる', !injected);
    closeModal('m-ocr-review');
    return out;
  });
  r.forEach(x => console.log(x));
  console.log('pageerrors:', errs.length, errs.slice(0, 3));
  await browser.close();
})();

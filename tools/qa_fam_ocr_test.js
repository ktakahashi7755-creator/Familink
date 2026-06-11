const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 375, height: 667 } });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message.split('\n')[0]));
  await page.goto('http://127.0.0.1:9000/familink.html', { waitUntil: 'load' });
  await page.evaluate(() => localStorage.setItem('familink_v3', JSON.stringify({ loggedIn: true, onboardCompleted: true, user: { id: 'kenya', name: 'パパ', role: 'parent' }, screen: 's-home', guideSeen: true })));
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(1300);
  await page.evaluate(() => { try { closeLoginBonus(); } catch(_){} try { closeModal('m-guide'); } catch(_){} });
  const r = await page.evaluate(async () => {
    const out = []; const t = (n, c) => out.push((c ? 'PASS ' : 'FAIL ') + n);
    const wait = (ms) => new Promise(r2 => setTimeout(r2, ms));

    /* ── 家族共有 ── */
    // コード生成形式
    const code = _generateFamilyId();
    t('家族コード形式 FAMI-XXXX-XXXX-XXXX', /^FAMI-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(code));
    // 参加: 既存家族なし → 確認なしで即参加
    S.familyId = null; S.familyIdOwner = null; S.familyIdSetByUser = false;
    openSupaInviteModal();
    document.getElementById('supa-invite-code').value = 'FAMI-TEST-AAAA-BBBB';
    doSupaInviteSubmit(); await wait(300);
    t('参加(家族なし): 即時に familyId 設定', S.familyId === 'FAMI-TEST-AAAA-BBBB');
    t('参加(家族なし): 確認ダイアログは出ない', !document.getElementById('m-confirm').classList.contains('open'));
    // 同じコード再入力 → 文言
    openSupaInviteModal();
    document.getElementById('supa-invite-code').value = 'FAMI-TEST-AAAA-BBBB';
    doSupaInviteSubmit(); await wait(150);
    t('同一コード: 「既に参加しています」', document.getElementById('supa-invite-err').textContent.includes('既に参加'));
    closeModal('m-supa-invite');
    // 別の家族コード → 確認ダイアログ
    openSupaInviteModal();
    document.getElementById('supa-invite-code').value = 'FAMI-CCCC-DDDD-EEEE';
    doSupaInviteSubmit(); await wait(350);
    const conf = document.getElementById('m-confirm');
    t('別家族コード: 確認ダイアログが出る', conf.classList.contains('open'));
    t('別家族コード: 確認まで familyId 不変', S.familyId === 'FAMI-TEST-AAAA-BBBB');
    // キャンセル → 不変
    const cancelBtn = [...conf.querySelectorAll('button')].find(b => /キャンセル/.test(b.textContent));
    if (cancelBtn) cancelBtn.click(); await wait(300);
    t('キャンセル: familyId 不変', S.familyId === 'FAMI-TEST-AAAA-BBBB');
    // もう一度 → 切り替える
    openSupaInviteModal();
    document.getElementById('supa-invite-code').value = 'FAMI-CCCC-DDDD-EEEE';
    doSupaInviteSubmit(); await wait(350);
    const okBtn = [...document.querySelectorAll('#m-confirm button')].find(b => /切り替える/.test(b.textContent));
    t('確認ボタン「切り替える」がある', !!okBtn);
    if (okBtn) okBtn.click(); await wait(400);
    t('切り替え実行: familyId が新コードに', S.familyId === 'FAMI-CCCC-DDDD-EEEE');
    // 不正形式
    openSupaInviteModal();
    document.getElementById('supa-invite-code').value = 'HELLO-WORLD';
    doSupaInviteSubmit(); await wait(150);
    t('不正形式は拒否', document.getElementById('supa-invite-err').textContent.includes('FAMI'));
    closeModal('m-supa-invite');
    // 設定の新文言
    S.familyId = null; go('s-settings'); await wait(300);
    const st = document.getElementById('s-settings').textContent;
    t('設定: 招待側の新文言', st.includes('あなたが最初の1人'));
    t('設定: 参加側の新文言', st.includes('家族からもらったコードをここで入力'));
    // 後始末
    S.familyId = null; S.familyIdOwner = null; S.familyIdSetByUser = false; saveS();

    /* ── OCR ── */
    go('s-cal'); await wait(200);
    // 無効日付ガード
    _ocr.cands = [{ id: 'bad1', title: '不正日付', date: '2026-02-30', allDay: true, _sel: true, confidence: 0.9, warnings: [], _prep: [] }];
    _ocr.prepCandidates = [];
    const evBefore = (S.events || []).length;
    ocrAddSelected(); await wait(300);
    t('OCR: 不正日付(2/30)は追加をブロック', (S.events || []).length === evBefore);
    const toasts = [...document.querySelectorAll('.toast')].map(x => x.textContent);
    t('OCR: 「正しい日付が必要」と案内', toasts.some(x => /正しい日付/.test(x)));
    // 日付ソート（順序バラバラ → 見出しが昇順・重複なし）
    _ocr.cands = [
      { id: 'c1', title: 'B', date: '2026-06-23', allDay: true, _sel: true, confidence: 1, warnings: [], _prep: [] },
      { id: 'c2', title: 'A', date: '2026-06-22', allDay: true, _sel: true, confidence: 1, warnings: [], _prep: [] },
      { id: 'c3', title: 'C', date: '2026-06-23', allDay: true, _sel: true, confidence: 1, warnings: [], _prep: [] },
      { id: 'c4', title: 'D', date: '', allDay: true, _sel: true, confidence: 1, warnings: [], _prep: [] },
    ];
    _ocr.bulkMember = '';
    ocrRenderReview(); openModal('m-ocr-review'); await wait(250);
    const hdrs = [...document.querySelectorAll('.ocr-date-hdr')].map(h => h.textContent.trim());
    t('OCR: 見出しが日付昇順＋日付なしは最後 (' + hdrs.join('/') + ')', hdrs.length === 3 && hdrs[0].includes('22') && hdrs[1].includes('23') && hdrs[2] === '日付なし');
    // 編集で日付変更 → 再グループが正しい（22→25 に変更）
    const c2 = _ocr.cands.find(x => x.title === 'A'); c2.date = '2026-06-25';
    ocrRenderReview(); await wait(150);
    const hdrs2 = [...document.querySelectorAll('.ocr-date-hdr')].map(h => h.textContent.trim());
    t('OCR: 日付編集後も見出しが正しく再整列 (' + hdrs2.join('/') + ')', hdrs2.length === 3 && hdrs2[0].includes('23') && hdrs2[1].includes('25') && hdrs2[2] === '日付なし');
    closeModal('m-ocr-review');
    // ローディング文言
    const lm = document.getElementById('m-ocr-loading').textContent;
    t('OCR: 所要時間の案内あり', lm.includes('1分ほど'));
    t('OCR: キャンセル無消費の案内あり', lm.includes('消費されません'));
    return out;
  });
  r.forEach(x => console.log(x));
  console.log('pageerrors:', errs.length, errs.slice(0, 3));
  await browser.close();
})();

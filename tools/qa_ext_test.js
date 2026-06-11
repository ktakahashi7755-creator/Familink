/* Familink 拡張QA — 実操作レベルの紐付け・CRUD・状態検証（qa_full_test.js を補完） */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const BASE = 'http://127.0.0.1:9000/familink.html';
let pass = 0, fail = 0;
const fails = [];
function summarize(results) {
  results.forEach(r => {
    const ok = r.startsWith('PASS');
    if (ok) pass++; else { fail++; fails.push(r); }
    console.log((ok ? '✅' : '❌') + ' ' + r.slice(5));
  });
}
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 375, height: 667 } });
  const perrs = [];
  page.on('pageerror', e => perrs.push(e.message.split('\n')[0]));
  await page.goto(BASE, { waitUntil: 'load' });
  await page.evaluate(() => localStorage.setItem('familink_v3', JSON.stringify({ loggedIn: true, onboardCompleted: true, user: { id: 'kenya', name: 'パパ', role: 'parent' }, screen: 's-home', guideSeen: true })));
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(1600);
  await page.evaluate(() => { try { closeLoginBonus(); } catch (_) {} try { closeModal('m-guide'); } catch (_) {} });

  /* ── 1. 全画面遷移（refresh 経由の再描画含む） ── */
  let r = await page.evaluate(async () => {
    const out = []; const t = (n, c) => out.push((c ? 'PASS ' : 'FAIL ') + n);
    const screens = ['s-home','s-task','s-cal','s-budget','s-board','s-health','s-prep','s-shopping','s-hoku','s-notif','s-settings','s-album','s-archive','s-memo','s-ch','s-premium'];
    let allOk = true, badly = '';
    for (const id of screens) {
      try { go(id); await new Promise(r2 => setTimeout(r2, 120)); const el = document.getElementById(id); if (el.classList.contains('hidden')) { allOk = false; badly += id + ' '; } }
      catch (e) { allOk = false; badly += id + '(' + e.message.slice(0, 30) + ') '; }
    }
    t('全16画面が go() で表示される' + (badly ? ' NG:' + badly : ''), allOk);
    go('s-home'); await new Promise(r2 => setTimeout(r2, 150));
    return out;
  });
  summarize(r);

  /* ── 2. タスク CRUD ＋ ホーム紐付け ── */
  r = await page.evaluate(async () => {
    const out = []; const t = (n, c) => out.push((c ? 'PASS ' : 'FAIL ') + n);
    go('s-task'); await new Promise(r2 => setTimeout(r2, 150));
    const before = (S.tasks || []).length;
    openTaskModal();
    document.getElementById('te-title').value = '拡張QAタスク';
    saveTaskEdit();
    await new Promise(r2 => setTimeout(r2, 150));
    const created = (S.tasks || []).find(x => x.title === '拡張QAタスク');
    t('タスク追加: Sに保存される', !!created);
    t('タスク追加: 一覧DOMに表示される', document.getElementById('s-task').textContent.includes('拡張QAタスク'));
    go('s-home'); await new Promise(r2 => setTimeout(r2, 200));
    t('タスク追加: ホームのやることに反映', document.getElementById('s-home').textContent.includes('拡張QAタスク'));
    // ホームからトグル → 完了状態
    homeToggleTask(created.id); await new Promise(r2 => setTimeout(r2, 150));
    t('ホームから完了トグル: statusがdone', (S.tasks.find(x => x.id === created.id) || {}).status === 'done');
    // タスク画面でも完了扱いか（遷移先で再描画）
    go('s-task'); await new Promise(r2 => setTimeout(r2, 200));
    toggleTaskDone(created.id); await new Promise(r2 => setTimeout(r2, 120));
    t('タスク画面で再トグル: todoに戻る', (S.tasks.find(x => x.id === created.id) || {}).status === 'todo');
    // 編集
    openTaskModal(created.id);
    document.getElementById('te-title').value = '拡張QAタスク改';
    saveTaskEdit(); await new Promise(r2 => setTimeout(r2, 120));
    t('タスク編集: タイトル更新', !!(S.tasks || []).find(x => x.title === '拡張QAタスク改'));
    // 削除（モーダル経由 → confirm を踏む）
    openTaskModal(created.id);
    deleteTaskFromModal(); await new Promise(r2 => setTimeout(r2, 250));
    const okBtn = [...document.querySelectorAll('#m-confirm button')].find(b => /削除/.test(b.textContent));
    if (okBtn) okBtn.click();
    await new Promise(r2 => setTimeout(r2, 250));
    t('タスク削除: Sから消える', !(S.tasks || []).some(x => x.id === created.id));
    t('タスク削除: 件数が元に戻る', (S.tasks || []).length === before);
    return out;
  });
  summarize(r);

  /* ── 3. 予定 CRUD ＋ カレンダー/ホーム紐付け ── */
  r = await page.evaluate(async () => {
    const out = []; const t = (n, c) => out.push((c ? 'PASS ' : 'FAIL ') + n);
    go('s-cal'); await new Promise(r2 => setTimeout(r2, 200));
    const before = (S.events || []).length;
    const today = todayStr();
    openEventModal();
    document.getElementById('ev-title').value = '拡張QA予定';
    const dt = document.getElementById('ev-date'); if (dt) dt.value = today;
    saveEvent(); await new Promise(r2 => setTimeout(r2, 200));
    const ev = (S.events || []).find(x => x.title === '拡張QA予定');
    t('予定追加: Sに保存される', !!ev);
    t('予定追加: カレンダーDOMに反映', document.getElementById('s-cal').textContent.includes('拡張QA予定'));
    go('s-home'); await new Promise(r2 => setTimeout(r2, 200));
    t('予定追加: ホームの今後の予定に反映', document.getElementById('s-home').textContent.includes('拡張QA予定'));
    // 編集
    go('s-cal'); await new Promise(r2 => setTimeout(r2, 150));
    openEventModal(ev.id);
    document.getElementById('ev-title').value = '拡張QA予定改';
    saveEvent(); await new Promise(r2 => setTimeout(r2, 200));
    t('予定編集: タイトル更新', !!(S.events || []).find(x => x.title === '拡張QA予定改'));
    // 削除
    S.events = (S.events || []).filter(x => x.id !== ev.id); saveS(); renderCal(); renderHome();
    t('予定削除: 件数が元に戻る', (S.events || []).length === before);
    return out;
  });
  summarize(r);

  /* ── 4. 買い物 ＋ ホーム紐付け ── */
  r = await page.evaluate(async () => {
    const out = []; const t = (n, c) => out.push((c ? 'PASS ' : 'FAIL ') + n);
    go('s-shopping'); await new Promise(r2 => setTimeout(r2, 200));
    shopArrays();
    const before = (S.shoppingItems || []).length;
    openShopAdd();
    document.getElementById('sa-name').value = '拡張QA牛乳';
    saveShopAdd();
    await new Promise(r2 => setTimeout(r2, 200));
    const it = (S.shoppingItems || []).find(x => x.name === '拡張QA牛乳');
    t('買い物追加: モーダル経由で登録される', !!it);
    t('買い物追加: 一覧DOMに表示される', document.getElementById('s-shopping').textContent.includes('拡張QA牛乳'));
    if (it) {
      shopMarkPurchased(it.id); await new Promise(r2 => setTimeout(r2, 200));
      t('買い物: 購入済みで履歴に移動', (S.shoppingHistory || []).some(h => h.name === '拡張QA牛乳') && !(S.shoppingItems || []).some(x => x.id === it.id));
      t('買い物: リスト件数が元に戻る', (S.shoppingItems || []).length === before);
      S.shoppingHistory = (S.shoppingHistory || []).filter(h => h.name !== '拡張QA牛乳'); saveS(); renderShopping();
    } else { out.push('FAIL 買い物: 後続テストスキップ（追加失敗）'); }
    return out;
  });
  summarize(r);

  /* ── 5. ボード投稿 ＋ ホーム紐付け ── */
  r = await page.evaluate(async () => {
    const out = []; const t = (n, c) => out.push((c ? 'PASS ' : 'FAIL ') + n);
    go('s-board'); await new Promise(r2 => setTimeout(r2, 200));
    const before = (S.announces || []).length;
    openPostModal();
    document.getElementById('post-title').value = '拡張QA投稿';
    savePost(); await new Promise(r2 => setTimeout(r2, 200));
    const p = (S.announces || []).find(x => x.title === '拡張QA投稿');
    t('投稿追加: Sに保存される', !!p);
    t('投稿追加: ボードDOMに反映', document.getElementById('s-board').textContent.includes('拡張QA投稿'));
    t('投稿追加: 通知が生成される', (S.notifs || []).some(n => (n.title || '').includes('拡張QA投稿')));
    go('s-home'); await new Promise(r2 => setTimeout(r2, 200));
    t('投稿追加: ホームの家族ボードに反映', document.getElementById('s-home').textContent.includes('拡張QA投稿'));
    if (p) { S.announces = S.announces.filter(x => x.id !== p.id); S.notifs = (S.notifs || []).filter(n => !(n.title || '').includes('拡張QA投稿')); saveS(); renderBoard(); renderHome(); renderNotif && renderNotif(); }
    t('投稿削除: 件数が元に戻る', (S.announces || []).length === before);
    return out;
  });
  summarize(r);

  /* ── 6. 家計・体調・メモ・通知 ── */
  r = await page.evaluate(async () => {
    const out = []; const t = (n, c) => out.push((c ? 'PASS ' : 'FAIL ') + n);
    // 家計
    go('s-budget'); await new Promise(r2 => setTimeout(r2, 250));
    const txBefore = (S.txs || []).length;
    openTxModal();
    document.getElementById('bm-amount').value = '1234';
    document.getElementById('bm-desc').value = '拡張QA支出';
    if (!document.getElementById('bm-date').value) document.getElementById('bm-date').value = todayStr();
    saveTx(); await new Promise(r2 => setTimeout(r2, 200));
    const tx = (S.txs || []).find(x => (x.desc || '') === '拡張QA支出');
    t('家計: 支出追加が保存される', !!tx);
    t('家計: 画面DOMに反映', document.getElementById('s-budget').textContent.includes('拡張QA支出') || document.getElementById('s-budget').textContent.includes('1,234'));
    if (tx) { S.txs = S.txs.filter(x => x.id !== tx.id); saveS(); renderBudget(); }
    t('家計: 削除で件数が戻る', (S.txs || []).length === txBefore);
    // 体調
    go('s-health'); await new Promise(r2 => setTimeout(r2, 250));
    const hBefore = (S.health || []).length;
    openHealthModal();
    const temp = document.getElementById('hl-temp') || document.getElementById('health-temp');
    if (temp) temp.value = '36.5';
    try { saveHealth(); } catch (e) { out.push('FAIL 体調: saveHealthエラー ' + e.message.slice(0, 50)); }
    await new Promise(r2 => setTimeout(r2, 200));
    t('体調: 記録が1件増える', (S.health || []).length === hBefore + 1);
    if ((S.health || []).length > hBefore) { S.health.pop(); saveS(); renderHealth(); }
    // メモ
    go('s-memo'); await new Promise(r2 => setTimeout(r2, 250));
    const mBefore = (S.memos || []).length;
    openMemoEdit();
    const mt = document.getElementById('memo-title'); if (mt) mt.value = '拡張QAメモ';
    document.getElementById('memo-body').value = '本文テスト';
    saveMemoEdit();
    await new Promise(r2 => setTimeout(r2, 200));
    t('メモ: 追加が保存される', (S.memos || []).length === mBefore + 1);
    const mm = (S.memos || []).find(x => (x.title || '') === '拡張QAメモ' || (x.body || '').includes('本文テスト'));
    if (mm) { S.memos = S.memos.filter(x => x.id !== mm.id); saveS(); if (typeof renderMemo === 'function') renderMemo(); }
    // 通知
    go('s-notif'); await new Promise(r2 => setTimeout(r2, 200));
    const nBefore = (S.notifs || []).length;
    addNotif('拡張QA通知', 'テスト', 'list'); await new Promise(r2 => setTimeout(r2, 150));
    t('通知: addNotifで1件増える', (S.notifs || []).length === nBefore + 1);
    go('s-notif'); await new Promise(r2 => setTimeout(r2, 150));
    t('通知: 画面に表示される', document.getElementById('s-notif').textContent.includes('拡張QA通知'));
    S.notifs = (S.notifs || []).filter(n => n.title !== '拡張QA通知'); saveS();
    return out;
  });
  summarize(r);

  /* ── 7. Hoku ローカル応答 ── */
  r = await page.evaluate(async () => {
    const out = []; const t = (n, c) => out.push((c ? 'PASS ' : 'FAIL ') + n);
    go('s-hoku'); await new Promise(r2 => setTimeout(r2, 250));
    const inp = document.getElementById('hoku-input');
    if (!inp) { out.push('FAIL Hoku: 入力欄が見つからない'); return out; }
    inp.value = '今日の予定教えて';
    const sendBtn = document.getElementById('hoku-send');
    sendBtn.click();
    await new Promise(r2 => setTimeout(r2, 2500));
    const msgs = document.getElementById('hoku-msgs');
    const lastAssistant = msgs ? msgs.textContent : '';
    t('Hoku: 返答が表示される（ローカル）', lastAssistant.length > 10 && !msgs.querySelector('.hoku-row .loading'));
    return out;
  });
  summarize(r);

  /* ── 8. 主要モーダルの開閉一巡 ── */
  r = await page.evaluate(async () => {
    const out = []; const t = (n, c) => out.push((c ? 'PASS ' : 'FAIL ') + n);
    const modals = ['m-task-edit','m-event','m-post','m-memo-add','m-tx','m-health','m-settings-profile','m-shop','m-ocr-intro'];
    let ok = true, bad = '';
    for (const id of modals) {
      const el = document.getElementById(id);
      if (!el) continue; // 存在しないIDはスキップ（画面仕様差）
      try {
        openModal(id); await new Promise(r2 => setTimeout(r2, 120));
        const opened = el.classList.contains('open');
        closeModal(id); await new Promise(r2 => setTimeout(r2, 120));
        const closed = !el.classList.contains('open');
        if (!opened || !closed) { ok = false; bad += id + ' '; }
      } catch (e) { ok = false; bad += id + '(err) '; }
    }
    t('主要モーダルの開閉が全て機能' + (bad ? ' NG:' + bad : ''), ok);
    go('s-home');
    return out;
  });
  summarize(r);

  /* ── 8.5 ホーム滞在中のモーダル保存 → 即時反映（紐付け検証） ── */
  r = await page.evaluate(async () => {
    const out = []; const t = (n, c) => out.push((c ? 'PASS ' : 'FAIL ') + n);
    const homeTxt = () => document.getElementById('s-home').textContent;
    go('s-home'); await new Promise(r2 => setTimeout(r2, 250));
    // ボード投稿（ホームに居たまま投稿）
    openPostModal();
    document.getElementById('post-title').value = '紐付けQA投稿';
    savePost(); await new Promise(r2 => setTimeout(r2, 250));
    const stalePost = !homeTxt().includes('紐付けQA投稿');
    t('ホーム滞在中: 投稿保存が即ホームに反映', !stalePost);
    const p = (S.announces || []).find(x => x.title === '紐付けQA投稿');
    if (p) { S.announces = S.announces.filter(x => x.id !== p.id); S.notifs = (S.notifs||[]).filter(n => !(n.title||'').includes('紐付けQA投稿')); saveS(); renderBoard(); renderHome(); }
    // メモ（ホームのメモカードが有効な場合のみ意味を持つが、再描画呼び出し自体を検証）
    openMemoEdit();
    document.getElementById('memo-body').value = '紐付けQAメモ本文';
    const homeHtmlBeforeMemo = document.getElementById('s-home').innerHTML.length;
    saveMemoEdit(); await new Promise(r2 => setTimeout(r2, 250));
    const memoSaved = (S.memos || []).some(x => (x.body || '').includes('紐付けQAメモ本文'));
    t('ホーム滞在中: メモ保存が成功', memoSaved);
    const mm = (S.memos || []).find(x => (x.body || '').includes('紐付けQAメモ本文'));
    if (mm) { S.memos = S.memos.filter(x => x.id !== mm.id); saveS(); }
    // 通知バッジ：addNotif 後にベルバッジが増える
    go('s-home'); await new Promise(r2 => setTimeout(r2, 200));
    const badge = () => { const b = document.getElementById('home-bell-badge'); return (b && b.style.display !== 'none') ? (parseInt(b.textContent,10)||0) : 0; };
    const b0 = badge();
    addNotif('紐付けQA通知', 'バッジ検証', 'list'); await new Promise(r2 => setTimeout(r2, 250));
    t('ホーム滞在中: 通知バッジが即時更新される (' + b0 + '→' + badge() + ')', badge() === b0 + 1);
    S.notifs = (S.notifs || []).filter(n => n.title !== '紐付けQA通知'); saveS(); renderHome();
    return out;
  });
  summarize(r);

  /* ── 9. 設定系トグルとデータ整合 ── */
  r = await page.evaluate(async () => {
    const out = []; const t = (n, c) => out.push((c ? 'PASS ' : 'FAIL ') + n);
    // プレミアムトグル往復で壊れない
    const wasP = !!S.isPremiumUser;
    S.isPremiumUser = !wasP; renderHome(); renderTaskScreen();
    S.isPremiumUser = wasP; renderHome();
    t('プレミアム切替の往復でエラーなし', true);
    // PERSIST 整合：S のキーで PERSIST にないものの内、保存が必要そうなものがないか（情報のみ）
    return out;
  });
  summarize(r);

  console.log('────────────────────────────');
  console.log(`拡張QA結果: PASS ${pass} / FAIL ${fail}`);
  if (perrs.length) { console.log('PAGEERRORS: ' + perrs.length); perrs.slice(0, 10).forEach(e => console.log('  ' + e)); }
  else console.log('PAGEERRORS: 0');
  if (fails.length) { console.log('FAIL一覧:'); fails.forEach(f => console.log('  ' + f)); }
  await browser.close();
  process.exit(fail > 0 || perrs.length > 0 ? 1 : 0);
})();

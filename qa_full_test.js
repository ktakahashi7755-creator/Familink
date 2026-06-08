/**
 * Familink 全画面 Playwright 総点検テスト
 * iPhone 390x844 @2x viewport（Safari相当）
 */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const BASE = 'http://localhost:9000/familink.html';
const VIEWPORT = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const RESULTS = [];
let PASS = 0, FAIL = 0, WARN = 0;

function log(status, category, desc, detail = '') {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  const line = `${icon} [${category}] ${desc}${detail ? ' — ' + detail : ''}`;
  console.log(line);
  RESULTS.push({ status, category, desc, detail });
  if (status === 'PASS') PASS++;
  else if (status === 'FAIL') FAIL++;
  else WARN++;
}

async function waitFor(page, selector, timeout = 3000) {
  try {
    await page.waitForSelector(selector, { timeout });
    return true;
  } catch { return false; }
}

async function clearStorage(page) {
  await page.evaluate(() => { try { localStorage.clear(); } catch(_) {} });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: VIEWPORT });
  const page = await ctx.newPage();

  // ─── Console error collector ───────────────────────────────────────
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => consoleErrors.push('pageerror: ' + err.message));

  // ══════════════════════════════════════════════════════════════════
  // TEST 1: 初回ロード
  // ══════════════════════════════════════════════════════════════════
  await clearStorage(page);
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // ウェルカム画面が表示されるか
  const obVisible = await page.isVisible('#s-ob');
  log(obVisible ? 'PASS' : 'FAIL', 'ウェルカム', 'ウェルカム画面(s-ob)が表示される');

  // Hoku画像が表示されるか
  const hokuImg = await page.$('#s-ob img');
  log(hokuImg ? 'PASS' : 'FAIL', 'ウェルカム', 'ウェルカム画面にHoku画像がある');

  // 「ログインせずに体験する」ボタン（<a class="ob2-link-guest"> または <button>）
  const guestEl = await page.$('.ob2-link-guest, button[onclick*="supaEntryClickGuest"], a[onclick*="supaEntryClickGuest"]');
  let guestFound = !!guestEl;
  if (!guestFound) {
    const allBtns = await page.$$('button, a');
    for (const el of allBtns) {
      const txt = await el.textContent();
      if (txt && txt.includes('体験')) { guestFound = true; break; }
    }
  }
  log(guestFound ? 'PASS' : 'WARN', 'ウェルカム', 'ゲスト体験ボタンが存在する');

  // ══════════════════════════════════════════════════════════════════
  // TEST 2: ログインフォームの存在確認（新デザイン: s-ob にインライン表示）
  // ══════════════════════════════════════════════════════════════════
  const emailInput = await page.$('#ob2-email');
  const loginBtn = await page.$('#ob2-login-btn');
  log(emailInput && loginBtn ? 'PASS' : 'FAIL', 'ログイン', 'ウェルカム画面にログインフォームがある(#ob2-email, #ob2-login-btn)');

  // ══════════════════════════════════════════════════════════════════
  // TEST 3: ゲストとしてホームに入る
  // ══════════════════════════════════════════════════════════════════
  await clearStorage(page);
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  // supaEntryClickGuest() を直接呼ぶ（ゲスト体験リンクは <a> タグのため button検索では見つからない）
  // guideSeen を事前にセットして初回ガイドモーダル(m-guide)が自動起動しないようにする
  await page.evaluate(() => { try { S.guideSeen = true; } catch(_){} });
  await page.evaluate(() => { try { supaEntryClickGuest(); } catch(_){} });
  await page.waitForTimeout(1500);

  // もしオンボーディングが出たらスキップ
  const onboardVisible = await page.isVisible('#s-onboard');
  if (onboardVisible) {
    const skipBtns = await page.$$('button');
    for (const btn of skipBtns) {
      const txt = await btn.textContent();
      if (txt && txt.includes('スキップ')) {
        await btn.click();
        await page.waitForTimeout(1000);
        break;
      }
    }
  }

  const homeVisible = await page.isVisible('#s-home');
  log(homeVisible ? 'PASS' : 'WARN', 'ホーム', 'ホーム画面(s-home)が表示される');

  if (!homeVisible) {
    // Force navigate to home via JS
    await page.evaluate(() => {
      try {
        localStorage.setItem('familink_v3', JSON.stringify({
          loggedIn: true, onboardCompleted: true,
          user: {id:'kenya',name:'パパ',role:'parent'},
          screen: 's-home'
        }));
      } catch(_) {}
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
  }

  // ══════════════════════════════════════════════════════════════════
  // TEST 4: タブバー表示確認
  // ══════════════════════════════════════════════════════════════════
  const tabbarVisible = await page.isVisible('#tabbar');
  log(tabbarVisible ? 'PASS' : 'FAIL', 'タブバー', 'タブバー(#tabbar)が表示される');

  // タブバーのボタン数を確認
  const tabBtns = await page.$$('#tabbar button, #tabbar [role="button"]');
  log(tabBtns.length >= 3 ? 'PASS' : 'FAIL', 'タブバー', `タブバーにボタンが3つ以上ある (${tabBtns.length}個)`);

  // ══════════════════════════════════════════════════════════════════
  // TEST 5: 各メイン画面への遷移テスト
  // ══════════════════════════════════════════════════════════════════
  const screens = [
    { id: 's-task',     name: 'タスク',       nav: "go('s-task')" },
    { id: 's-cal',      name: 'カレンダー',   nav: "go('s-cal')" },
    { id: 's-budget',   name: '家計',         nav: "go('s-budget')" },
    { id: 's-board',    name: 'ボード',       nav: "go('s-board')" },
    { id: 's-hoku',     name: 'Hoku',         nav: "go('s-hoku')" },
    { id: 's-health',   name: '体調',         nav: "go('s-health')" },
    { id: 's-prep',     name: '準備',         nav: "go('s-prep')" },
    { id: 's-shopping', name: '買い物',       nav: "go('s-shopping')" },
    { id: 's-memo',     name: 'メモ',         nav: "go('s-memo')" },
    { id: 's-archive',  name: '書類',         nav: "go('s-archive')" },
    { id: 's-album',    name: 'アルバム',     nav: "go('s-album')" },
    { id: 's-ch',       name: '家族管理',     nav: "go('s-ch')" },
    { id: 's-notif',    name: '通知',         nav: "go('s-notif')" },
    { id: 's-settings', name: '設定',         nav: "go('s-settings')" },
    { id: 's-premium',  name: 'プレミアム',   nav: "go('s-premium')" },
  ];

  for (const sc of screens) {
    await page.evaluate((nav) => { try { eval(nav); } catch(e) {} }, sc.nav);
    await page.waitForTimeout(400);
    const visible = await page.isVisible(`#${sc.id}`);
    log(visible ? 'PASS' : 'FAIL', '画面遷移', `${sc.name}画面(${sc.id})が表示される`);

    // 戻るボタンが存在するか（非ホーム画面のみ）
    if (!['s-home'].includes(sc.id)) {
      const backBtn = await page.$(`#${sc.id} button[aria-label="戻る"], #${sc.id} button[onclick*="goBack"]`);
      log(backBtn ? 'PASS' : 'FAIL', '導線', `${sc.name}に戻るボタンがある`);
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // TEST 6: ホームへ戻る（goBack）
  // ══════════════════════════════════════════════════════════════════
  // _navStack をリセットしてホームをベースにし、タスク → goBack でホームに戻ることを確認
  await page.evaluate(() => {
    try {
      _navStack = [];
      S.screen = 's-home';
      go('s-task');
    } catch(_){}
  });
  await page.waitForTimeout(300);
  await page.evaluate(() => { try { goBack(); } catch(_){} });
  await page.waitForTimeout(300);
  const backToHome = await page.isVisible('#s-home');
  log(backToHome ? 'PASS' : 'FAIL', '導線', 'goBack()でホームに戻れる');

  // ══════════════════════════════════════════════════════════════════
  // TEST 7: 予定追加（カレンダー）
  // ══════════════════════════════════════════════════════════════════
  await page.evaluate(() => { try { go('s-cal'); } catch(_){} });
  await page.waitForTimeout(500);
  await page.evaluate(() => { try { openEventModal(); } catch(_){} });
  await page.waitForTimeout(500);
  const eventModal = await page.isVisible('#m-event');
  log(eventModal ? 'PASS' : 'FAIL', '予定追加', '予定モーダル(#m-event)が開く');

  if (eventModal) {
    // タイトル入力
    await page.fill('#ev-title', 'テスト予定★特殊文字<>&"');
    // 日付
    const today = new Date().toISOString().slice(0, 10);
    await page.fill('#ev-date', today);
    // 保存
    await page.evaluate(() => { try { saveEvent(); } catch(_){} });
    await page.waitForTimeout(500);
    const modalClosed = await page.evaluate(() => !document.getElementById('m-event').classList.contains('open'));
    log(modalClosed ? 'PASS' : 'FAIL', '予定追加', '予定保存後にモーダルが閉じる');
    // カレンダーに反映されるか
    const calHtml = await page.evaluate(() => {
      const el = document.getElementById('cal-main-area');
      return el ? el.innerHTML : '';
    });
    log(calHtml.includes('テスト予定') ? 'PASS' : 'WARN', '予定追加', '保存した予定がカレンダーに表示される');
  }

  // ══════════════════════════════════════════════════════════════════
  // TEST 8: タスク追加
  // ══════════════════════════════════════════════════════════════════
  await page.evaluate(() => { try { go('s-task'); } catch(_){} });
  await page.waitForTimeout(400);
  await page.evaluate(() => { try { openTaskModal(); } catch(_){} });
  await page.waitForTimeout(400);
  const taskModal = await page.isVisible('#m-task-edit');
  log(taskModal ? 'PASS' : 'FAIL', 'タスク追加', 'タスクモーダル(#m-task-edit)が開く');

  if (taskModal) {
    await page.fill('#te-title', 'テストタスク');
    await page.evaluate(() => { try { saveTaskEdit(); } catch(_){} });
    await page.waitForTimeout(400);
    const taskClosed = await page.evaluate(() => !document.getElementById('m-task-edit').classList.contains('open'));
    log(taskClosed ? 'PASS' : 'FAIL', 'タスク追加', 'タスク保存後にモーダルが閉じる');
    // タスク一覧に反映
    const taskHtml = await page.evaluate(() => {
      const el = document.getElementById('tk-main');
      return el ? el.innerHTML : '';
    });
    log(taskHtml.includes('テストタスク') ? 'PASS' : 'WARN', 'タスク追加', '保存したタスクが一覧に表示される');
  }

  // ══════════════════════════════════════════════════════════════════
  // TEST 9: 家計入力
  // ══════════════════════════════════════════════════════════════════
  await page.evaluate(() => { try { go('s-budget'); } catch(_){} });
  await page.waitForTimeout(400);
  await page.evaluate(() => { try { openTxModal(); } catch(_){} });
  await page.waitForTimeout(400);
  const budgetModal = await page.isVisible('#m-budget');
  log(budgetModal ? 'PASS' : 'FAIL', '家計入力', '家計モーダル(#m-budget)が開く');

  if (budgetModal) {
    await page.fill('#bm-amount', '1500');
    const today2 = new Date().toISOString().slice(0, 10);
    await page.fill('#bm-date', today2);
    await page.evaluate(() => { try { saveTx(); } catch(_){} });
    await page.waitForTimeout(400);
    const budgetClosed = await page.evaluate(() => !document.getElementById('m-budget').classList.contains('open'));
    log(budgetClosed ? 'PASS' : 'FAIL', '家計入力', '家計保存後にモーダルが閉じる');
  }

  // ══════════════════════════════════════════════════════════════════
  // TEST 10: 体調記録
  // ══════════════════════════════════════════════════════════════════
  await page.evaluate(() => { try { go('s-health'); } catch(_){} });
  await page.waitForTimeout(400);
  await page.evaluate(() => { try { openHealthModal(); } catch(_){} });
  await page.waitForTimeout(400);
  const healthModal = await page.isVisible('#m-health');
  log(healthModal ? 'PASS' : 'FAIL', '体調記録', '体調モーダル(#m-health)が開く');

  if (healthModal) {
    const today3 = new Date().toISOString().slice(0, 10);
    const hmDate = await page.$('#hm-date');
    if (hmDate) await page.fill('#hm-date', today3);
    const hmTemp = await page.$('#hm-temp');
    if (hmTemp) await page.fill('#hm-temp', '36.5');
    await page.evaluate(() => { try { saveHealth(); } catch(_){} });
    await page.waitForTimeout(400);
    const healthClosed = await page.evaluate(() => !document.getElementById('m-health').classList.contains('open'));
    log(healthClosed ? 'PASS' : 'FAIL', '体調記録', '体調保存後にモーダルが閉じる');
  }

  // ══════════════════════════════════════════════════════════════════
  // TEST 11: ボード投稿
  // ══════════════════════════════════════════════════════════════════
  await page.evaluate(() => { try { go('s-board'); } catch(_){} });
  await page.waitForTimeout(400);
  await page.evaluate(() => { try { openPostModal(); } catch(_){} });
  await page.waitForTimeout(400);
  const postModal = await page.isVisible('#m-post');
  log(postModal ? 'PASS' : 'FAIL', 'ボード投稿', 'ボード投稿モーダル(#m-post)が開く');

  if (postModal) {
    await page.fill('#post-title', 'テスト投稿');
    await page.evaluate(() => { try { savePost(); } catch(_){} });
    await page.waitForTimeout(400);
    const postClosed = await page.evaluate(() => !document.getElementById('m-post').classList.contains('open'));
    log(postClosed ? 'PASS' : 'FAIL', 'ボード投稿', '投稿保存後にモーダルが閉じる');
  }

  // ══════════════════════════════════════════════════════════════════
  // TEST 12: Hoku チャット
  // ══════════════════════════════════════════════════════════════════
  await page.evaluate(() => { try { go('s-hoku'); } catch(_){} });
  await page.waitForTimeout(400);
  const hokuScreen = await page.isVisible('#s-hoku');
  log(hokuScreen ? 'PASS' : 'FAIL', 'Hoku', 'Hoku画面が開く');
  const hokuInput = await page.$('#hoku-input');
  const hokuSend = await page.$('#hoku-send');
  log(hokuInput && hokuSend ? 'PASS' : 'FAIL', 'Hoku', '入力欄と送信ボタンがある');

  // ══════════════════════════════════════════════════════════════════
  // TEST 13: ショッピングリスト
  // ══════════════════════════════════════════════════════════════════
  await page.evaluate(() => { try { go('s-shopping'); } catch(_){} });
  await page.waitForTimeout(400);
  await page.evaluate(() => { try { openShopAdd(); } catch(_){} });
  await page.waitForTimeout(400);
  const shopModal = await page.isVisible('#m-shop-add');
  log(shopModal ? 'PASS' : 'FAIL', '買い物', '買い物追加モーダル(#m-shop-add)が開く');

  if (shopModal) {
    const shopInput = await page.$('#shop-add-name');
    if (shopInput) {
      await page.fill('#shop-add-name', 'テスト商品');
      await page.evaluate(() => { try { saveShopAdd(); } catch(_){} });
      await page.waitForTimeout(400);
      const shopClosed = !(await page.isVisible('#m-shop-add'));
      log(shopClosed ? 'PASS' : 'FAIL', '買い物', '買い物保存後にモーダルが閉じる');
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // TEST 14: メモ
  // ══════════════════════════════════════════════════════════════════
  await page.evaluate(() => { try { go('s-memo'); } catch(_){} });
  await page.waitForTimeout(400);
  await page.evaluate(() => { try { openMemoAdd(); } catch(_){} });
  await page.waitForTimeout(400);
  const memoModal = await page.isVisible('#m-memo-add');
  log(memoModal ? 'PASS' : 'FAIL', 'メモ', 'メモ追加モーダル(#m-memo-add)が開く');

  // ══════════════════════════════════════════════════════════════════
  // TEST 15: 書類保管庫
  // ══════════════════════════════════════════════════════════════════
  await page.evaluate(() => { try { go('s-archive'); } catch(_){} });
  await page.waitForTimeout(400);
  const archiveScreen = await page.isVisible('#s-archive');
  log(archiveScreen ? 'PASS' : 'FAIL', '書類', '書類保管庫画面が開く');
  const archiveAdd = await page.$('#s-archive button[onclick*="openArchive"], #s-archive button[aria-label*="追加"]');
  log(archiveAdd ? 'PASS' : 'WARN', '書類', '書類追加ボタンが存在する');

  // ══════════════════════════════════════════════════════════════════
  // TEST 16: アルバム
  // ══════════════════════════════════════════════════════════════════
  await page.evaluate(() => { try { go('s-album'); } catch(_){} });
  await page.waitForTimeout(400);
  const albumScreen = await page.isVisible('#s-album');
  log(albumScreen ? 'PASS' : 'FAIL', 'アルバム', 'アルバム画面が開く');

  // ══════════════════════════════════════════════════════════════════
  // TEST 17: 準備リスト
  // ══════════════════════════════════════════════════════════════════
  await page.evaluate(() => { try { go('s-prep'); } catch(_){} });
  await page.waitForTimeout(400);
  await page.evaluate(() => { try { openPrepModal(); } catch(_){} });
  await page.waitForTimeout(400);
  const prepModal = await page.isVisible('#m-prep');
  log(prepModal ? 'PASS' : 'FAIL', '準備リスト', '準備追加モーダル(#m-prep)が開く');

  if (prepModal) {
    const prepInput = await page.$('#prep-title');
    if (prepInput) {
      await page.fill('#prep-title', 'テスト持ち物');
      await page.evaluate(() => { try { savePrep(); } catch(_){} });
      await page.waitForTimeout(400);
      const prepClosed = !(await page.isVisible('#m-prep'));
      log(prepClosed ? 'PASS' : 'FAIL', '準備リスト', '準備保存後にモーダルが閉じる');
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // TEST 18: モーダル連続開閉（多重起動テスト）
  // ══════════════════════════════════════════════════════════════════
  await page.evaluate(() => { try { go('s-cal'); } catch(_){} });
  await page.waitForTimeout(300);
  // 素早く連続クリック（多重クリックテスト）
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => { try { openEventModal(); } catch(_){} });
    await page.waitForTimeout(100);
  }
  await page.waitForTimeout(500);
  const multiModal = await page.isVisible('#m-event');
  log(multiModal ? 'PASS' : 'WARN', '多重クリック', 'モーダル連続起動後も正常表示');

  // モーダルを閉じる
  await page.evaluate(() => { try { closeModal('m-event'); } catch(_){} });
  await page.waitForTimeout(300);
  const modalClosed2 = await page.evaluate(() => !document.getElementById('m-event').classList.contains('open'));
  log(modalClosed2 ? 'PASS' : 'FAIL', '多重クリック', 'モーダルを正常に閉じられる');

  // ══════════════════════════════════════════════════════════════════
  // TEST 19: データ永続性（保存→再読み込み）
  // ══════════════════════════════════════════════════════════════════
  // タスクを追加して保存
  await page.evaluate(() => {
    try {
      if (typeof S !== 'undefined' && typeof saveS === 'function') {
        S.tasks = S.tasks || [];
        S.tasks.push({ id: 'test-persist-001', title: '永続性テストタスク', status: 'todo', createdAt: new Date().toISOString().slice(0,10) });
        saveS();
      }
    } catch(_) {}
  });

  // ページリロード
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  const persistData = await page.evaluate(() => {
    try {
      const raw = localStorage.getItem('familink_v3');
      if (!raw) return null;
      const d = JSON.parse(raw);
      return d.tasks ? d.tasks.find(t => t.id === 'test-persist-001') : null;
    } catch(_) { return null; }
  });
  log(persistData ? 'PASS' : 'FAIL', '永続性', 'LocalStorage にタスクデータが保存・復元される');

  // ══════════════════════════════════════════════════════════════════
  // TEST 20: 設定画面の各セクション
  // ══════════════════════════════════════════════════════════════════
  await page.evaluate(() => { try { go('s-settings'); } catch(_){} });
  await page.waitForTimeout(600);
  const settingsBody = await page.$('#settings-body');
  const settingsHtml = await page.evaluate(() => {
    const el = document.getElementById('settings-body');
    return el ? el.innerHTML.length : 0;
  });
  log(settingsHtml > 100 ? 'PASS' : 'FAIL', '設定', '設定画面がレンダリングされている');

  // プレミアムボタン
  const premBtn = await page.$('#settings-body button[onclick*="premium"], #settings-body button[onclick*="go(\'s-premium\')"]');
  log(premBtn ? 'PASS' : 'WARN', '設定', '設定画面にプレミアムへのボタンがある');

  // ══════════════════════════════════════════════════════════════════
  // TEST 21: プレミアム画面
  // ══════════════════════════════════════════════════════════════════
  await page.evaluate(() => { try { go('s-premium'); } catch(_){} });
  await page.waitForTimeout(500);
  const premiumBody = await page.evaluate(() => {
    const el = document.getElementById('prm-body');
    return el ? el.innerHTML.length : 0;
  });
  log(premiumBody > 100 ? 'PASS' : 'FAIL', 'プレミアム', 'プレミアム画面がレンダリングされている');

  const trialBtn = await page.$('#prm-cta-bar button[onclick*="prmStartTrial"]');
  log(trialBtn ? 'PASS' : 'WARN', 'プレミアム', '無料トライアルボタンが表示されている');

  // ══════════════════════════════════════════════════════════════════
  // TEST 22: 家族メンバー管理
  // ══════════════════════════════════════════════════════════════════
  await page.evaluate(() => { try { go('s-ch'); } catch(_){} });
  await page.waitForTimeout(400);
  const chBody = await page.evaluate(() => {
    const el = document.getElementById('children-list');
    return el ? el.innerHTML.length : 0;
  });
  log(chBody > 50 ? 'PASS' : 'FAIL', '家族管理', '家族メンバー一覧がレンダリングされている');

  // メンバー追加モーダル
  await page.evaluate(() => { try { openMemberEdit(null); } catch(_){} });
  await page.waitForTimeout(400);
  const memberModal = await page.isVisible('#m-member-edit');
  log(memberModal ? 'PASS' : 'FAIL', '家族管理', 'メンバー追加モーダルが開く');
  if (memberModal) {
    await page.evaluate(() => { try { closeModal('m-member-edit'); } catch(_){} });
    await page.waitForTimeout(200);
  }

  // ══════════════════════════════════════════════════════════════════
  // TEST 23: 通知画面
  // ══════════════════════════════════════════════════════════════════
  await page.evaluate(() => { try { go('s-notif'); } catch(_){} });
  await page.waitForTimeout(400);
  const notifEl = await page.evaluate(() => {
    const el = document.getElementById('notif-list');
    return el ? el.innerHTML.length : 0;
  });
  log(notifEl > 10 ? 'PASS' : 'FAIL', '通知', '通知画面がレンダリングされている');

  // ══════════════════════════════════════════════════════════════════
  // TEST 24: Hoku FAB の存在
  // ══════════════════════════════════════════════════════════════════
  await page.evaluate(() => { try { go('s-home'); } catch(_){} });
  await page.waitForTimeout(400);
  const hokuFab = await page.$('#hoku-fab');
  log(hokuFab ? 'PASS' : 'FAIL', 'HokuFAB', 'Hoku FABが存在する');
  const fabVisible = await page.isVisible('#hoku-fab');
  log(fabVisible ? 'PASS' : 'WARN', 'HokuFAB', 'Hoku FABがホームで表示されている');

  // ══════════════════════════════════════════════════════════════════
  // TEST 25: XSS検証（特殊文字のエスケープ）
  // ══════════════════════════════════════════════════════════════════
  const xssResult = await page.evaluate(() => {
    try {
      if (typeof H !== 'function') return 'H not defined';
      const escaped = H('<script>alert("xss")</script>');
      return escaped.includes('<script>') ? 'XSS_VULNERABLE' : 'SAFE';
    } catch(e) { return 'ERROR: ' + e.message; }
  });
  log(xssResult === 'SAFE' ? 'PASS' : 'FAIL', 'セキュリティ', `XSSエスケープ関数H()が正常動作 (${xssResult})`);

  // ══════════════════════════════════════════════════════════════════
  // TEST 26: LocalStorage キー確認
  // ══════════════════════════════════════════════════════════════════
  const storageKeys = await page.evaluate(() => {
    return Object.keys(localStorage);
  });
  const correctKey = storageKeys.includes('familink_v3');
  log(correctKey ? 'PASS' : 'WARN', 'LocalStorage', `正規キー familink_v3 を使用 (keys: ${storageKeys.join(', ')})`);
  // 正規キー: familink_v3 本体 / familink* / fl_*（Wave256のログインボーナス印など familink の小キー）/ sb-*（Supabase公式セッション）
  const noRogueKeys = storageKeys.every(k => k === 'familink_v3' || k.startsWith('familink') || k.startsWith('fl_') || k.startsWith('sb-'));
  log(noRogueKeys ? 'PASS' : 'WARN', 'LocalStorage', '不正なLocalStorageキーがない');

  // ══════════════════════════════════════════════════════════════════
  // TEST 27: Hoku入力バリデーション（空送信）
  // ══════════════════════════════════════════════════════════════════
  await page.evaluate(() => { try { go('s-hoku'); } catch(_){} });
  await page.waitForTimeout(300);
  const msgsBefore = await page.evaluate(() => {
    const el = document.getElementById('hoku-msgs');
    return el ? el.children.length : 0;
  });
  // 空文字で送信
  await page.evaluate(() => {
    try {
      const input = document.getElementById('hoku-input');
      if (input) input.value = '';
      hokuSend && hokuSend();
    } catch(_) {}
  });
  await page.waitForTimeout(400);
  const msgsAfter = await page.evaluate(() => {
    const el = document.getElementById('hoku-msgs');
    return el ? el.children.length : 0;
  });
  log(msgsBefore === msgsAfter ? 'PASS' : 'FAIL', 'Hoku', '空入力では送信されない');

  // ══════════════════════════════════════════════════════════════════
  // TEST 28: 予定のバリデーション（タイトル空）
  // ══════════════════════════════════════════════════════════════════
  await page.evaluate(() => { try { go('s-cal'); openEventModal(); } catch(_){} });
  await page.waitForTimeout(400);
  if (await page.isVisible('#m-event')) {
    await page.fill('#ev-title', '');  // 空タイトル
    const toastBefore = await page.$('.toast-msg, .toast');
    await page.evaluate(() => { try { saveEvent(); } catch(_){} });
    await page.waitForTimeout(400);
    const modalStillOpen = await page.isVisible('#m-event');
    log(modalStillOpen ? 'PASS' : 'FAIL', 'バリデーション', '予定タイトル空でモーダルが閉じない（バリデーションOK）');
    await page.evaluate(() => { try { closeModal('m-event'); } catch(_){} });
    await page.waitForTimeout(200);
  }

  // ══════════════════════════════════════════════════════════════════
  // TEST 29: コンソールエラー集計
  // ══════════════════════════════════════════════════════════════════
  const filteredErrors = consoleErrors.filter(e =>
    !e.includes('favicon') &&
    !e.includes('supabase') &&
    !e.includes('Failed to load') &&
    !e.includes('net::ERR') &&
    !e.includes('sw.js')
  );
  log(filteredErrors.length === 0 ? 'PASS' : 'FAIL', 'コンソール',
    `JSコンソールエラー ${filteredErrors.length}件`,
    filteredErrors.length > 0 ? filteredErrors.slice(0, 3).join(' | ') : '');

  // ══════════════════════════════════════════════════════════════════
  // TEST 30: iPhone viewport 横スクロール確認
  // ══════════════════════════════════════════════════════════════════
  for (const scId of ['s-home', 's-task', 's-cal', 's-budget', 's-settings']) {
    await page.evaluate((id) => { try { go(id); } catch(_){} }, scId);
    await page.waitForTimeout(300);
    const hasHScroll = await page.evaluate((id) => {
      const el = document.getElementById(id);
      if (!el) return false;
      return el.scrollWidth > el.clientWidth + 5;
    }, scId);
    log(!hasHScroll ? 'PASS' : 'FAIL', 'レイアウト', `${scId}で横スクロールが発生しない`);
  }

  // ══════════════════════════════════════════════════════════════════
  // TEST 31: 紐付け確認 - 家計→グラフデータ
  // ══════════════════════════════════════════════════════════════════
  const budgetChartCheck = await page.evaluate(() => {
    try {
      go('s-budget');
      return true;
    } catch(_) { return false; }
  });
  await page.waitForTimeout(500);
  const catChart = await page.$('#budget-cat-chart');
  log(catChart ? 'PASS' : 'FAIL', '紐付け', '家計画面にカテゴリチャート領域がある');

  // ══════════════════════════════════════════════════════════════════
  // TEST 32: 紐付け確認 - カレンダー月移動
  // ══════════════════════════════════════════════════════════════════
  await page.evaluate(() => { try { go('s-cal'); } catch(_){} });
  await page.waitForTimeout(400);
  const monthBefore = await page.evaluate(() => {
    const el = document.getElementById('cal-month-title');
    return el ? el.textContent : '';
  });
  await page.evaluate(() => { try { changeCalMonth(1); } catch(_){} });
  await page.waitForTimeout(400);
  const monthAfter = await page.evaluate(() => {
    const el = document.getElementById('cal-month-title');
    return el ? el.textContent : '';
  });
  log(monthBefore !== monthAfter ? 'PASS' : 'FAIL', '紐付け', 'カレンダー月移動が反映される');

  // ══════════════════════════════════════════════════════════════════
  // TEST 33: 紐付け確認 - タスク完了トグル
  // ══════════════════════════════════════════════════════════════════
  const taskToggleResult = await page.evaluate(() => {
    try {
      if (!S.tasks || !S.tasks.length) return 'no-task';
      const t = S.tasks[0];
      const prevStatus = t.status;
      toggleTaskDone(t.id);
      const newStatus = (S.tasks.find(x => x.id === t.id) || {}).status;
      return prevStatus !== newStatus ? 'CHANGED' : 'UNCHANGED';
    } catch(e) { return 'ERROR:' + e.message; }
  });
  log(taskToggleResult === 'CHANGED' ? 'PASS' : taskToggleResult === 'no-task' ? 'WARN' : 'FAIL',
    '紐付け', `タスク完了トグルが正常動作 (${taskToggleResult})`);

  // ══════════════════════════════════════════════════════════════════
  // FINAL: スクリーンショット
  // ══════════════════════════════════════════════════════════════════
  for (const scId of ['s-home', 's-task', 's-cal', 's-budget', 's-hoku', 's-settings']) {
    await page.evaluate((id) => { try { go(id); } catch(_){} }, scId);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `/tmp/qa_${scId}.png`, fullPage: false });
  }

  // ══════════════════════════════════════════════════════════════════
  // SUMMARY
  // ══════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(60));
  console.log(`📊 QA 総点検 結果サマリー`);
  console.log('═'.repeat(60));
  console.log(`✅ PASS: ${PASS}`);
  console.log(`❌ FAIL: ${FAIL}`);
  console.log(`⚠️  WARN: ${WARN}`);
  console.log(`📝 合計: ${PASS + FAIL + WARN} テスト`);
  console.log('─'.repeat(60));
  if (FAIL > 0) {
    console.log('❌ 失敗項目:');
    RESULTS.filter(r => r.status === 'FAIL').forEach(r =>
      console.log(`  [${r.category}] ${r.desc} ${r.detail ? '— ' + r.detail : ''}`));
  }
  if (WARN > 0) {
    console.log('⚠️  警告項目:');
    RESULTS.filter(r => r.status === 'WARN').forEach(r =>
      console.log(`  [${r.category}] ${r.desc} ${r.detail ? '— ' + r.detail : ''}`));
  }

  await browser.close();
  process.exit(FAIL > 0 ? 1 : 0);
})();

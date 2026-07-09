/* ============================================================
   Familink 同期ロジック検証ハーネス（Node 単体テスト）
   app-source/familink.html から実際のヘルパー関数を抽出して読み込み、
   端末間の「削除伝播 / 削除後編集 / 別家族の完全分離 / 同日編集LWW」を検証する。
   実行: node tools/sync_harness_test.js
   注意: Playwright(84) は Linux 専用で当機実行不可のため、家族同期の
        中核ロジックはこのハーネスで自動検証する。
   ============================================================ */
const fs = require('fs');
const path = require('path');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'app-source', 'familink.html'), 'utf8');

// --- 実コードから対象関数のソースを抽出して評価（S をハーネス側で定義） ---
function extractFn(name) {
  const re = new RegExp('function ' + name + '\\s*\\(', 'g');
  const m = re.exec(HTML);
  if (!m) throw new Error('関数が見つかりません: ' + name);
  // 関数開始位置から波括弧の対応を数えて本体終端を探す
  let i = HTML.indexOf('{', m.index);
  let depth = 0, end = -1;
  for (let j = i; j < HTML.length; j++) {
    const c = HTML[j];
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) { end = j; break; } }
  }
  if (end < 0) throw new Error('関数本体の終端が見つかりません: ' + name);
  return HTML.slice(m.index, end + 1);
}

// グローバル相当のコンテキスト
let S = { _deletions: {} };
const _TOMB_TTL_MS = 30 * 24 * 3600 * 1000;
const HOKU_AI_DAILY_CAP = 40;  // app-source と一致させる（フェアユース上限）
function saveS() { return true; }  // ハーネス用スタブ（_dedupByContent が呼ぶ）
function isSupaLoggedIn() { return S.__loggedIn === true; }  // スタブ（_hokuAiAllowed が参照）
function isPremium() { return !!S.isPremiumUser; }  // スタブ（_hokuAiAllowed が参照。サーバ権利はハーネス対象外）

// 実コードのヘルパーを評価して関数化（S/_TOMB_TTL_MS をクロージャで参照）
const srcs = ['_mergeSyncArray', '_recordDeletion', '_isTombstoned', '_mergeDeletions', '_gcDeletions', '_occursOn', '_dedupByContent', 'detectIntent', '_hokuAiAllowed', '_hokuChatActive', '_hokuLooksLikeView', '_hokuAiUsageToday', '_hokuAiUnderCap', '_hokuBumpAiUsage']
  .map(extractFn).join('\n\n');
eval(srcs);

// app-source と一致させる（変更時はここも更新）
const FAMILY_SHARED_KEYS = [
  'events','tasks','txs','health','posts','announces',
  'prep','prepRoutines','folders','docs','albumPhotos',
  'shoppingItems','shoppingFrequent','members',
  'customBoards','boardItems','boardSections',
  'recurringTxs','memos','memoFolders','workspaces'
];
const SYNC_KEYS = FAMILY_SHARED_KEYS.concat([
  'notifs','tabConfig','widgetItems','homeOrder','userPhotos','userAvatars','userAvatarType',
  'userProfile','isPremiumUser','onboardCompleted','hokuContext','cashflowSettings','demoProfiles','familyId','_deletions',
  'trialStartedAt','premiumPaid'
]);

/* _fetchFromSupabase の中核（マージ＋トゥームストーン＋家族分離）を忠実に再現。
   rowsAll: クラウド全行 [{user_id, family_id, data_key, payload, updated_at}]
   familyId/uid: 取得する端末の状態。戻り値: マージ後の S（テスト用にthis-Sを使う） */
function simulateFetch(rowsAll, familyId, uid) {
  // クエリ相当の家族分離フィルタ（q.eq('family_id', familyId) もしくは eq('user_id', uid)）
  const data = familyId
    ? rowsAll.filter(r => r.family_id === familyId)
    : rowsAll.filter(r => r.user_id === uid);
  const byKey = {};
  data.forEach(row => { if (!SYNC_KEYS.includes(row.data_key)) return; (byKey[row.data_key] = byKey[row.data_key] || []).push(row); });

  if (byKey['_deletions']) {
    if (!S._deletions || typeof S._deletions !== 'object') S._deletions = {};
    byKey['_deletions'].forEach(r => { if (r.payload && typeof r.payload === 'object') _mergeDeletions(S._deletions, r.payload); });
  }
  Object.keys(byKey).forEach(k => {
    if (k === '_deletions') return;
    let rows = byKey[k];
    const shared = FAMILY_SHARED_KEYS.includes(k);
    if (!shared) { rows = rows.filter(r => r.user_id === uid); if (!rows.length) return; }
    rows = rows.slice().sort((a, b) => (a.updated_at || '').localeCompare(b.updated_at || ''));
    const anyArray = Array.isArray(S[k]) || rows.some(r => Array.isArray(r.payload));
    if (anyArray) {
      let merged = Array.isArray(S[k]) ? S[k] : [];
      rows.forEach(r => { if (Array.isArray(r.payload)) merged = _mergeSyncArray(merged, r.payload); });
      if (S._deletions && S._deletions[k]) merged = merged.filter(it => !_isTombstoned(k, it));   // 実装と同じ：個人固有配列にも適用
      S[k] = merged;
    } else {
      const latest = rows[rows.length - 1];
      if (latest && latest.payload != null) S[k] = latest.payload;
    }
  });
  if (byKey['_deletions']) {
    FAMILY_SHARED_KEYS.forEach(k => { if (Array.isArray(S[k]) && S._deletions && S._deletions[k]) S[k] = S[k].filter(it => !_isTombstoned(k, it)); });
  }
  _gcDeletions();
  return S;
}

// --- ミニテストランナー ---
let pass = 0, fail = 0;
function ok(name, cond) { if (cond) { pass++; console.log('  PASS ' + name); } else { fail++; console.log('  FAIL ' + name); } }
function rowsFromState(uid, familyId, state) {
  return Object.keys(state).map(k => ({ user_id: uid, family_id: familyId, data_key: k, payload: state[k], updated_at: new Date().toISOString() }));
}

console.log('Familink sync harness');

// ---- T1: 削除がトゥームストーンで端末間に伝播し、相手の古いコピーが復活しない ----
(function () {
  S = { _deletions: {} };
  const FAM = 'FAMI-TEST';
  // 端末A: events に X,Y。X を削除（トゥームストーン記録 + ローカル除去）
  S.events = [{ id: 'X', title: '保育園', updatedAt: '2026-06-01T09:00:00Z' }, { id: 'Y', title: '習い事', updatedAt: '2026-06-01T09:00:00Z' }];
  _recordDeletion('events', 'X');
  S.events = S.events.filter(e => e.id !== 'X');
  const aRows = rowsFromState('userA', FAM, { events: S.events, _deletions: S._deletions });
  // 端末B: まだ X を保持（古いコピー）。Bがクラウドから取得（A行 + 自分のローカル）
  S = { _deletions: {}, events: [{ id: 'X', title: '保育園', updatedAt: '2026-06-01T09:00:00Z' }, { id: 'Y', title: '習い事', updatedAt: '2026-06-01T09:00:00Z' }] };
  simulateFetch(aRows, FAM, 'userB');
  ok('T1-1 端末Bで削除Xが復活しない', !S.events.some(e => e.id === 'X'));
  ok('T1-2 端末BでYは残る', S.events.some(e => e.id === 'Y'));
})();

// ---- T2: 削除後に他端末が編集した場合は「編集」が勝って項目は残る ----
(function () {
  S = { _deletions: {} };
  const FAM = 'FAMI-TEST';
  // 端末A: 06-01 に X を削除
  S.events = [{ id: 'X', title: '旧', updatedAt: '2026-06-01T09:00:00Z' }];
  _recordDeletion('events', 'X'); // tombstone ~ now (> 06-01)
  // 故意にトゥームストーン時刻を 06-01 に固定（Aが過去に削除）
  S._deletions.events['X'] = '2026-06-01T10:00:00Z';
  const aRows = rowsFromState('userA', FAM, { events: [], _deletions: S._deletions });
  // 端末B: 06-02 に X を編集（削除より後）→ 残るべき
  S = { _deletions: {}, events: [{ id: 'X', title: '新（編集後）', updatedAt: '2026-06-02T09:00:00Z' }] };
  simulateFetch(aRows, FAM, 'userB');
  ok('T2 削除後に編集された項目は残る（edit-after-delete）', S.events.some(e => e.id === 'X' && e.title === '新（編集後）'));
})();

// ---- T3: 別家族の完全分離（高橋家 vs 田中家） ----
(function () {
  const TAKA = 'FAMI-TAKA', TANA = 'FAMI-TANA';
  // クラウドに両家族の行が混在
  const cloud = [
    { user_id: 'taka1', family_id: TAKA, data_key: 'events', payload: [{ id: 't1', title: '高橋家・保育園' }], updated_at: '2026-06-01T00:00:00Z' },
    { user_id: 'taka2', family_id: TAKA, data_key: 'tasks', payload: [{ id: 't2', title: '高橋家・買い物' }], updated_at: '2026-06-01T00:00:00Z' },
    { user_id: 'tana1', family_id: TANA, data_key: 'events', payload: [{ id: 'n1', title: '田中家・歯医者' }], updated_at: '2026-06-01T00:00:00Z' },
    { user_id: 'tana2', family_id: TANA, data_key: 'tasks', payload: [{ id: 'n2', title: '田中家・掃除' }], updated_at: '2026-06-01T00:00:00Z' },
  ];
  // 高橋家メンバーが取得
  S = { _deletions: {} };
  simulateFetch(cloud, TAKA, 'taka1');
  const takaEv = (S.events || []).map(e => e.id), takaTk = (S.tasks || []).map(t => t.id);
  ok('T3-1 高橋家に田中家の予定が混ざらない', !takaEv.includes('n1'));
  ok('T3-2 高橋家に田中家のタスクが混ざらない', !takaTk.includes('n2'));
  ok('T3-3 高橋家は自家族の予定を取得できる', takaEv.includes('t1') && takaTk.includes('t2'));
  // 田中家メンバーが取得
  S = { _deletions: {} };
  simulateFetch(cloud, TANA, 'tana1');
  const tanaEv = (S.events || []).map(e => e.id), tanaTk = (S.tasks || []).map(t => t.id);
  ok('T3-4 田中家に高橋家の予定が混ざらない', !tanaEv.includes('t1'));
  ok('T3-5 田中家に高橋家のタスクが混ざらない', !tanaTk.includes('t2'));
  ok('T3-6 田中家は自家族の予定を取得できる', tanaEv.includes('n1') && tanaTk.includes('n2'));
})();

// ---- T4: 個人固有キー（isPremiumUser）は他メンバーで上書きされない ----
(function () {
  const FAM = 'FAMI-TEST';
  const cloud = [
    { user_id: 'me', family_id: FAM, data_key: 'isPremiumUser', payload: false, updated_at: '2026-06-01T00:00:00Z' },
    { user_id: 'other', family_id: FAM, data_key: 'isPremiumUser', payload: true, updated_at: '2026-06-02T00:00:00Z' },
  ];
  S = { _deletions: {}, isPremiumUser: false };
  simulateFetch(cloud, FAM, 'me');
  ok('T4 他メンバーのプレミアム状態が自分に混入しない', S.isPremiumUser === false);
})();

// ---- T5: 同日編集の LWW（ミリ秒ISOなら新しい編集が勝つ） ----
(function () {
  const a = [{ id: 'k', title: '朝の値', updatedAt: '2026-06-07T08:00:00.000Z' }];
  const b = [{ id: 'k', title: '夜の値', updatedAt: '2026-06-07T20:00:00.000Z' }];
  const merged = _mergeSyncArray(a, b);
  ok('T5 同日でも新しい編集が採用される（ISO精度）', merged.find(x => x.id === 'k').title === '夜の値');
})();

// ---- T6: 繰り返し予定の発生判定 _occursOn ----
(function () {
  // 毎週月曜（2026-06-01 は月曜）
  const wk = { date: '2026-06-01', repeat: 'weekly' };
  ok('T6-1 毎週: 同曜日の翌週は発生', _occursOn(wk, '2026-06-08'));
  ok('T6-2 毎週: 違う曜日は非発生', !_occursOn(wk, '2026-06-09'));
  ok('T6-3 開始日より前は非発生', !_occursOn(wk, '2026-05-25'));
  // 毎日
  ok('T6-4 毎日: 任意の後日は発生', _occursOn({ date: '2026-06-01', repeat: 'daily' }, '2026-06-20'));
  // 平日のみ（2026-06-06 は土曜）
  const wd = { date: '2026-06-01', repeat: 'weekdays' };
  ok('T6-5 平日: 土曜は非発生', !_occursOn(wd, '2026-06-06'));
  ok('T6-6 平日: 金曜は発生', _occursOn(wd, '2026-06-05'));
  // 毎月（同じ日）
  ok('T6-7 毎月: 翌月同日は発生', _occursOn({ date: '2026-06-15', repeat: 'monthly' }, '2026-07-15'));
  ok('T6-8 毎月: 別日は非発生', !_occursOn({ date: '2026-06-15', repeat: 'monthly' }, '2026-07-16'));
  // 毎年
  ok('T6-9 毎年: 翌年同月日は発生', _occursOn({ date: '2026-06-15', repeat: 'yearly' }, '2027-06-15'));
  // カスタム（2日ごと）
  const c = { date: '2026-06-01', repeat: 'custom', repeatInterval: 2, repeatUnit: 'day' };
  ok('T6-10 カスタム2日ごと: 2日後は発生', _occursOn(c, '2026-06-03'));
  ok('T6-11 カスタム2日ごと: 1日後は非発生', !_occursOn(c, '2026-06-02'));
  // 単発
  ok('T6-12 単発: 当日のみ発生', _occursOn({ date: '2026-06-01', repeat: '' }, '2026-06-01') && !_occursOn({ date: '2026-06-01', repeat: '' }, '2026-06-02'));
})();

// ---- T7: 内容ベース重複除去 _dedupByContent（ログイン時の二重表示対策） ----
(function () {
  S = { _deletions: {} };
  S.events = [
    { id:'a', title:'運動会', date:'2026-06-10', time:'09:00', member:'k' },
    { id:'b', title:'運動会', date:'2026-06-10', time:'09:00', member:'k' },   // 別id・同内容＝重複
    { id:'c', title:'遠足',   date:'2026-06-11', time:'08:00', member:'k' }
  ];
  S.tasks = [
    { id:'x', title:'衣装確認', dueDate:'2026-06-09', assignedTo:'m' },
    { id:'y', title:'衣装確認', dueDate:'2026-06-09', assignedTo:'m' }        // 重複
  ];
  S.boardItems = [
    { id:'p', boardId:'b1', text:'運動会の役割分担' },
    { id:'q', boardId:'b1', text:'運動会の役割分担' },
    { id:'r', boardId:'b1', text:'運動会の役割分担' }                          // 3重
  ];
  S.shoppingItems = [ { id:'s1', name:'牛乳' }, { id:'s2', name:'牛乳' } ];    // 対象外＝維持
  const changed = _dedupByContent();
  ok('T7-1 同内容イベントの重複を除去（別idでも）', S.events.length === 2);
  ok('T7-2 別内容イベントは残る', S.events.some(e=>e.title==='遠足') && S.events.some(e=>e.title==='運動会'));
  ok('T7-3 タスクの内容重複を1件に', S.tasks.length === 1);
  ok('T7-4 ボード項目の3重を1件に', S.boardItems.length === 1);
  ok('T7-5 買い物の同内容重複も除去（名前+数量+区分が同一）', S.shoppingItems.length === 1);
  ok('T7-6 変更ありを返す', changed === true);
  // 重複が無いときは何も変えない（冪等）
  const again = _dedupByContent();
  ok('T7-7 冪等：2回目は変更なし', again === false);
})();

// ---- T8: カスタムボード重複の集約＋boardId付け替え＋買い物 ----
(function () {
  S = { _deletions: {} };
  S.customBoards = [
    { id:'b1', intent:'shopping', name:'買い物メモ' },
    { id:'b2', intent:'shopping', name:'買い物メモ' },   // 重複ボード（別id）
    { id:'b3', intent:'shopping', name:'買い物メモ' }    // 3つ目
  ];
  S.boardItems = [
    { id:'i1', boardId:'b1', text:'牛乳', section:'今すぐ' },
    { id:'i2', boardId:'b2', text:'牛乳', section:'今すぐ' },   // 重複ボード配下の同内容
    { id:'i3', boardId:'b3', text:'牛乳', section:'今すぐ' },
    { id:'i4', boardId:'b1', text:'食パン', section:'今すぐ' }
  ];
  S.boardSections = [
    { id:'s1', boardId:'b1', title:'今すぐ' },
    { id:'s2', boardId:'b2', title:'今すぐ' }
  ];
  S.shoppingItems = [
    { id:'sh1', name:'牛乳', qty:'2本', section:'今すぐ' },
    { id:'sh2', name:'牛乳', qty:'2本', section:'今すぐ' }   // 同内容＝重複
  ];
  _dedupByContent();
  ok('T8-1 重複ボードを1つに集約', S.customBoards.length === 1 && S.customBoards[0].id === 'b1');
  ok('T8-2 配下項目が正規boardへ付け替わり重複除去（牛乳1+食パン1）', S.boardItems.length === 2 && S.boardItems.every(i=>i.boardId==='b1'));
  ok('T8-3 セクション重複も集約', S.boardSections.length === 1 && S.boardSections[0].boardId === 'b1');
  ok('T8-4 買い物の同内容重複を除去', S.shoppingItems.length === 1);
})();

// ---- T9: Hoku 意図判定（見る系は登録しない／追加系は登録する） ----
(function () {
  const q = t => detectIntent(t).type;
  // 見る・聞く（query であるべき＝カレンダー/タスクに反映しない）
  ok('T9-1 「今日の予定を教えて」は参照', q('今日の予定を教えて') === 'query');
  ok('T9-2 「タスク見せて」は参照', q('タスク見せて') === 'query');
  ok('T9-3 「今週の予定は？」は参照', q('今週の予定は？') === 'query');
  ok('T9-4 「やること何件ある？」は参照', q('やること何件ある？') === 'query');
  ok('T9-5 「予定ある？」は参照', q('予定ある？') === 'query');
  // 音声で起きていた誤判定の回帰防止：「教えて欲しい」系は参照（追加にしない）
  ok('T9-9 「明日のタスクを教えて欲しい」は参照', q('明日のタスクを教えて欲しい') === 'query');
  ok('T9-10 「今日の予定を教えて欲しい」は参照', q('今日の予定を教えて欲しい') === 'query');
  ok('T9-11 「タスク教えて」は参照', q('タスク教えて') === 'query');
  // 追加・登録（action であるべき）
  ok('T9-6 「明日10時に歯医者の予定追加して」は登録', q('明日10時に歯医者の予定追加して') === 'action');
  ok('T9-7 「牛乳買っておいて」は登録', q('牛乳買っておいて') === 'action');
  ok('T9-8 「食費3000円使った」は登録', q('食費3000円使った') === 'action');
  ok('T9-12 「星愛の誕生日会を予定に入れて」は登録', q('星愛の誕生日会を予定に入れて') === 'action');
})();

// ---- T10: AI版Hoku のプレミアム×ゼロ設定ゲート（無料は既存Hoku） ----
(function () {
  // 無料：ログイン中でもAI不可
  S = { isPremiumUser:false, __loggedIn:true, hokuAiOff:false };
  ok('T10-1 無料はAI不可', _hokuAiAllowed() === false && _hokuChatActive() === false);
  // プレミアム＋ログイン：設定なしで自動有効（ゼロ設定）
  S = { isPremiumUser:true, __loggedIn:true, hokuAiOff:false };
  ok('T10-2 プレミアム＋ログインで設定不要でAI有効', _hokuAiAllowed() === true && _hokuChatActive() === true);
  // プレミアム＋ログイン＋OFFトグル：切替可能
  S.hokuAiOff = true;
  ok('T10-3 OFFトグルで既存Hokuへ（切替可能）', _hokuAiAllowed() === true && _hokuChatActive() === false);
  // プレミアムだが未ログイン＆URLなし：不可（→既存Hokuにフォールバック）
  S = { isPremiumUser:true, __loggedIn:false, hokuAiOff:false };
  ok('T10-4 未ログイン＆URLなしは不可', _hokuAiAllowed() === false);
  // プレミアム＋未ログインでも独自URLがあれば可（上級者）
  S = { isPremiumUser:true, __loggedIn:false, hokuAiOff:false, hokuApiUrl:'https://x/functions/v1/hoku' };
  ok('T10-5 独自URL設定時は未ログインでも可', _hokuAiAllowed() === true && _hokuChatActive() === true);
})();

// ---- T11: 家族共有プライバシー（個人キーは家族でも漏れない／共有キーは家族でマージ） ----
//   DB側は RLS で個人キーの家族横断読み取りを禁止（docs/supabase-setup-sql.sql）。
//   本テストはクライアント側“第2防御”：万一 個人キー行を受信しても他メンバー分は採用しないことを固定。
(function () {
  const FAM = 'FAMI-SECRET';
  // クラウド行：自分(userA)と他メンバー(userB)。userProfile/hokuContext は個人キー、events は共有キー。
  const cloud = [
    { user_id:'userA', family_id:FAM, data_key:'userProfile', payload:{ name:'わたし' }, updated_at:'2026-06-01T00:00:00Z' },
    { user_id:'userB', family_id:FAM, data_key:'userProfile', payload:{ name:'たろう' }, updated_at:'2026-06-09T00:00:00Z' }, // 新しいが他人＝採用しない
    { user_id:'userB', family_id:FAM, data_key:'hokuContext', payload:{ secret:'Bの会話文脈' }, updated_at:'2026-06-09T00:00:00Z' },
    { user_id:'userA', family_id:FAM, data_key:'events', payload:[{ id:'a1', title:'Aの予定', updatedAt:'2026-06-01T00:00:00Z' }], updated_at:'2026-06-01T00:00:00Z' },
    { user_id:'userB', family_id:FAM, data_key:'events', payload:[{ id:'b1', title:'Bの予定', updatedAt:'2026-06-02T00:00:00Z' }], updated_at:'2026-06-02T00:00:00Z' }
  ];
  S = { _deletions:{}, userProfile:{ name:'わたし' } };
  simulateFetch(cloud, FAM, 'userA');
  ok('T11-1 個人キーuserProfileは自分の値のまま（他メンバーで上書きされない）', !!(S.userProfile && S.userProfile.name === 'わたし'));
  ok('T11-2 個人キーhokuContextは他メンバー分を取り込まない', !S.hokuContext);
  ok('T11-3 共有キーeventsは家族全員分マージされる', S.events.some(e=>e.id==='a1') && S.events.some(e=>e.id==='b1'));
})();

// ---- T12: 別家族のデータは混ざらない（family_id 分離） ----
(function () {
  const MY = 'FAMI-MINE', OTHER = 'FAMI-OTHER';
  const cloud = [
    { user_id:'me',    family_id:MY,    data_key:'events', payload:[{ id:'m1', title:'うちの予定', updatedAt:'2026-06-01T00:00:00Z' }], updated_at:'2026-06-01T00:00:00Z' },
    { user_id:'other', family_id:OTHER, data_key:'events', payload:[{ id:'o1', title:'よその予定', updatedAt:'2026-06-02T00:00:00Z' }], updated_at:'2026-06-02T00:00:00Z' }
  ];
  S = { _deletions:{}, events:[] };
  simulateFetch(cloud, MY, 'me');  // 取得は自分の family_id のみ（DBは RLS、クライアントは family_id フィルタ）
  ok('T12-1 自分の家族の予定は入る', S.events.some(e=>e.id==='m1'));
  ok('T12-2 別家族の予定は混ざらない', !S.events.some(e=>e.id==='o1'));
})();

// ---- T13: 参照ガード（教えて/見せて/〜欲しい は登録モーダルを出さない／追加・削除は通す） ----
//   音声/AI/ローカルのどれが誤判定しても、明確な"質問"発話で登録モーダルを開かないための要。
(function () {
  const V = t => _hokuLooksLikeView(t);
  ok('T13-1 「明日の予定を教えて欲しい」は参照ガードON', V('明日の予定を教えて欲しい') === true);
  ok('T13-2 「今日のタスク見せて」は参照ガードON', V('今日のタスク見せて') === true);
  ok('T13-3 「予定教えて」は参照ガードON', V('予定教えて') === true);
  ok('T13-4 「買い物リストある？」は参照ガードON', V('買い物リストある？') === true);
  // 追加・削除はガードOFF（通常どおり登録/削除へ）
  ok('T13-5 「明日10時に会議追加」はガードOFF', V('明日10時に会議追加') === false);
  ok('T13-6 「牛乳買っといて」はガードOFF', V('牛乳買っといて') === false);
  ok('T13-7 「予定教えてから歯医者追加して」は追加優先でガードOFF', V('予定教えてから歯医者追加して') === false);
  ok('T13-8 「明日の予定消して」はガードOFF（削除）', V('明日の予定消して') === false);
})();

// ---- T14: プレミアムAIのフェアユース上限（1日40通・赤字防止）----
(function () {
  S = { hokuAiUsage: null };
  const under = [];
  for (let i = 0; i < 41; i++) {
    const u = _hokuAiUnderCap();
    if (u) _hokuBumpAiUsage();   // AI応答に成功した想定でカウント
    under.push(u);
  }
  ok('T14-1 初回はAI利用可', under[0] === true);
  ok('T14-2 40通目まではAI利用可', under[39] === true);
  ok('T14-3 41通目(上限超)はローカルへ', under[40] === false);
  ok('T14-4 カウントは40で頭打ち', _hokuAiUsageToday().count === 40);
})();

console.log('\n結果: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);

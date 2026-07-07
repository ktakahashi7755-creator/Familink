/**
 * Familink 家族同期・マージ中核ロジック 網羅テスト（Playwright・実コード）
 * 対象の純関数: _mergeSyncArray / _isTombstoned / _mergeDeletions / _gcDeletions /
 *               _dedupByContent / _occursOn
 * 目的: 家族の同時編集・削除伝播・重複・繰り返し予定が、データ欠損なく正しく解決されることを実証。
 * ネットワーク不要（純関数を直接実行）。
 */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const BASE = process.env.BASE_URL || 'http://127.0.0.1:9000/familink.html';

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', e => errs.push(String(e.message || e)));
  await p.goto(BASE, { waitUntil: 'networkidle' });
  await p.waitForTimeout(600);

  const r = await p.evaluate(() => {
    const out = [];
    const t = (n, ok) => out.push([n, !!ok]);
    const ISO = (s) => new Date(s).toISOString();

    // ── _mergeSyncArray（LWW）──
    (function () {
      const local = [{ id: 'a', v: 1 }, { id: 'b', v: 1, updatedAt: ISO('2026-06-10') }];
      const cloud = [{ id: 'b', v: 2, updatedAt: ISO('2026-06-09') }, { id: 'c', v: 9 }];
      const m = _mergeSyncArray(local, cloud);
      const by = Object.fromEntries(m.map(x => [x.id, x]));
      t('merge: ローカルのみ項目を保持(a)', by.a && by.a.v === 1);
      t('merge: クラウドのみ項目を保持(c)', by.c && by.c.v === 9);
      t('merge: 新しいローカルが勝つ(b=1@6/10 > cloud@6/9)', by.b && by.b.v === 1);
      t('merge: 全3件そろう', m.length === 3);
    })();
    (function () {
      const local = [{ id: 'b', v: 1, updatedAt: ISO('2026-06-08') }];
      const cloud = [{ id: 'b', v: 2, updatedAt: ISO('2026-06-12') }];
      const m = _mergeSyncArray(local, cloud);
      t('merge: 新しいクラウドが勝つ(b=2)', m[0] && m[0].v === 2);
    })();

    // ── 削除トゥームストーン ──
    (function () {
      const saved = JSON.stringify(S._deletions || {});
      S._deletions = { events: { e1: ISO('2026-06-10T10:00:00') } };
      // 削除時刻より古い項目 → 削除扱い
      t('tomb: 削除時刻より古い項目は削除される', _isTombstoned('events', { id: 'e1', updatedAt: ISO('2026-06-10T09:00:00') }) === true);
      // updatedAt 無し(=0) → 削除扱い（イベント等の既定挙動）
      t('tomb: updatedAt無しは削除扱い', _isTombstoned('events', { id: 'e1' }) === true);
      // 削除より後に編集された項目 → 残す
      t('tomb: 削除後に編集された項目は残る', _isTombstoned('events', { id: 'e1', updatedAt: ISO('2026-06-10T11:00:00') }) === false);
      // 別idは無関係
      t('tomb: 別idは削除対象外', _isTombstoned('events', { id: 'e2', updatedAt: ISO('2026-06-10T09:00:00') }) === false);
      S._deletions = JSON.parse(saved);
    })();

    // ── _mergeDeletions（union・最新時刻優先）──
    (function () {
      const into = { events: { e1: ISO('2026-06-10') } };
      _mergeDeletions(into, { events: { e1: ISO('2026-06-12'), e2: ISO('2026-06-11') }, tasks: { t1: ISO('2026-06-09') } });
      t('mergeDel: e1は新しい時刻を採用', into.events.e1 === ISO('2026-06-12'));
      t('mergeDel: 新規e2を取り込む', !!into.events.e2);
      t('mergeDel: 別キーtasksも取り込む', into.tasks && !!into.tasks.t1);
    })();
    (function () {
      const into = { events: { e1: ISO('2026-06-15') } };
      _mergeDeletions(into, { events: { e1: ISO('2026-06-10') } });
      t('mergeDel: 古い時刻では上書きしない', into.events.e1 === ISO('2026-06-15'));
    })();

    // ── _gcDeletions（30日より古いトゥームストーンを破棄）──
    (function () {
      const saved = JSON.stringify(S._deletions || {});
      const old = new Date(Date.now() - 40 * 24 * 3600 * 1000).toISOString();
      const recent = new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString();
      S._deletions = { events: { eOld: old, eNew: recent } };
      _gcDeletions();
      t('gc: 40日前は破棄', !(S._deletions.events && S._deletions.events.eOld));
      t('gc: 2日前は保持', !!(S._deletions.events && S._deletions.events.eNew));
      S._deletions = JSON.parse(saved);
    })();

    // ── _dedupByContent（内容重複の畳み込み・誤消し防止）──
    (function () {
      const sv = { events: S.events, tasks: S.tasks, shoppingItems: S.shoppingItems, health: S.health };
      // 同一内容の別id予定 → 1件に畳む
      S.events = [
        { id: 'x1', title: '遠足', date: '2026-06-20', time: '09:00', member: 'seito' },
        { id: 'x2', title: '遠足', date: '2026-06-20', time: '09:00', member: 'seito' },
        { id: 'x3', title: '遠足', date: '2026-06-21', time: '09:00', member: 'seito' }, // 日付違い→残す
      ];
      // 買い物：同名でも数量違いは別物として残す
      S.shoppingItems = [
        { id: 's1', name: '牛乳', qty: '1', section: '', memo: '' },
        { id: 's2', name: '牛乳', qty: '2', section: '', memo: '' },
      ];
      S.tasks = []; S.health = [];
      _dedupByContent();
      t('dedup: 同一内容の重複予定は1件に', S.events.filter(e => e.title === '遠足' && e.date === '2026-06-20').length === 1);
      t('dedup: 日付が違う予定は残す', S.events.some(e => e.date === '2026-06-21'));
      t('dedup: 数量が違う同名買い物は両方残す', S.shoppingItems.length === 2);
      S.events = sv.events; S.tasks = sv.tasks; S.shoppingItems = sv.shoppingItems; S.health = sv.health;
    })();

    // ── 家族2端末マージのシミュレーション（_fetchFromSupabase の内側ロジック相当）──
    (function () {
      // A: 予定Xを編集して push（Aの行が新しい） / B: 旧Xを保持
      // _fetchは行を古→新で merge するので、最後に処理されるAの版が勝つ
      let merged = [{ id: 'X', title: '旧タイトル' }];             // Bのローカル
      const rowB = [{ id: 'X', title: '旧タイトル' }];             // 古い行
      const rowA = [{ id: 'X', title: '新タイトル(Aが編集)' }];    // 新しい行(最後)
      [rowB, rowA].forEach(pl => { merged = _mergeSyncArray(merged, pl); });
      t('2端末: 後から編集した家族の版が反映される', merged.find(e => e.id === 'X').title === '新タイトル(Aが編集)');

      // 削除伝播：Aが削除(tombstone) → Bの行にまだ残っていても、tombで除外される
      const saved = JSON.stringify(S._deletions || {});
      S._deletions = { events: { X: new Date().toISOString() } };
      let merged2 = [{ id: 'X', title: '旧' }];
      [[{ id: 'X', title: '旧' }]].forEach(pl => { merged2 = _mergeSyncArray(merged2, pl); });
      merged2 = merged2.filter(it => !_isTombstoned('events', it));
      t('2端末: 家族が削除した予定は復活しない', merged2.length === 0);
      S._deletions = JSON.parse(saved);
    })();

    // ── _occursOn（繰り返し・終了日）簡易確認 ──
    (function () {
      const e = { date: '2026-06-01', repeat: 'weekly', repeatUntil: '2026-06-15' };
      t('occurs: 期間内の同曜日は発生', _occursOn(e, '2026-06-08') === true);
      t('occurs: 終了日後は発生しない', _occursOn(e, '2026-06-22') === false);
    })();

    return out;
  });

  let pass = 0, fail = 0;
  for (const [n, ok] of r) { console.log((ok ? '✅' : '❌') + ' ' + n); ok ? pass++ : fail++; }
  console.log(`\n📊 家族同期マージ中核ロジック: PASS ${pass} / FAIL ${fail} / 合計 ${r.length}`);
  console.log('pageerrors:', errs.length, errs.slice(0, 4));
  await b.close();
  process.exit(fail || errs.length ? 1 : 0);
})();

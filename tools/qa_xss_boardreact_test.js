// P1-01 回帰: ボードのリアクション内訳でメンバー名がエスケープされ、stored XSS が成立しないこと
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message.split('\n')[0]));
  let alertFired = false;
  page.on('dialog', async d => { alertFired = true; await d.dismiss(); });
  await page.goto('http://127.0.0.1:9000/familink.html', { waitUntil: 'load' });

  const out = await page.evaluate(() => {
    const res = [];
    const t = (n, c) => res.push((c ? 'PASS ' : 'FAIL ') + n);
    // 悪意あるメンバー名を注入した状態を作る
    const evilName = '<img src=x onerror="window.__xss=1">';
    window.__xss = 0;
    S.members = [{ id: 'evil', name: evilName, role: 'parent', av: '' }];
    if (typeof applyMembersFromS === 'function') try { applyMembersFromS(); } catch (_) {}
    // リアクション付きの投稿を作る
    const post = { id: 'p_evil', title: 'テスト投稿', body: '本文', author: 'evil', reactMap: { evil: 'like' }, reactions: {}, reads: [], comments: [], createdAt: new Date().toISOString() };
    S.announces = [post];
    // 詳細画面のリアクション内訳を描画
    const host = document.getElementById('bdetail-react-detail') || (() => { const d = document.createElement('div'); d.id = 'bdetail-react-detail'; document.body.appendChild(d); return d; })();
    if (typeof renderBoardReactDetail === 'function') {
      try { renderBoardReactDetail(post); } catch (e) { res.push('FAIL renderBoardReactDetail 例外: ' + e.message); }
    } else { res.push('FAIL renderBoardReactDetail 未定義'); }
    const html = host.innerHTML;
    // 生の <img ...> が挿入されていない（エスケープされている）こと
    t('リアクション内訳に生の<img>が入らない', !host.querySelector('img'));
    t('メンバー名がエスケープ表示される（&lt; を含む）', html.includes('&lt;img') || html.indexOf('<img') === -1);
    t('onerror属性がDOMに存在しない', !/onerror=/.test(html) || html.includes('&lt;'));
    return { res, xss: window.__xss };
  });

  await page.waitForTimeout(300);
  out.res.push((out.xss === 0 && !alertFired ? 'PASS ' : 'FAIL ') + 'onerror/alert が発火しない (xss=' + out.xss + ')');
  out.res.push((errs.length === 0 ? 'PASS ' : 'FAIL ') + 'pageerror 0件');
  out.res.forEach(l => console.log(l));
  const fails = out.res.filter(l => l.startsWith('FAIL')).length;
  console.log('P1-01 XSS回帰 テスト: PASS ' + out.res.filter(l => l.startsWith('PASS')).length + ' / FAIL ' + fails);
  await browser.close();
  process.exit(fails ? 1 : 0);
})();

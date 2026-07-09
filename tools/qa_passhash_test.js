// P1-05 回帰: ローカルアカウントの塩付きハッシュ・後方互換・自動移行
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message.split('\n')[0]));
  await page.goto('http://127.0.0.1:9000/familink.html', { waitUntil: 'load' });

  const out = await page.evaluate(() => {
    const res = [];
    const t = (n, c) => res.push((c ? 'PASS ' : 'FAIL ') + n);

    // 1) 新形式ハッシュ生成: s2$salt$hash 形式で、ソルトが毎回異なる
    const h1 = _makePassHash('himitsu123');
    const h2 = _makePassHash('himitsu123');
    t('新形式は s2$ プレフィックス', h1.indexOf('s2$') === 0);
    t('同一パスワードでもソルトで異なるハッシュ', h1 !== h2);

    // 2) 照合: 正しいパスワードは通る／誤りは弾く
    t('正しいパスワードで検証成功', _verifyPass('himitsu123', h1) === true);
    t('誤ったパスワードで検証失敗', _verifyPass('wrong', h1) === false);

    // 3) 旧形式(無ソルト16hex)との後方互換
    const legacy = _hashStr('oldpass');
    t('旧形式ハッシュは16桁hex', /^[0-9a-f]{16}$/.test(legacy));
    t('旧形式でも正しいパスワードで検証成功', _verifyPass('oldpass', legacy) === true);
    t('旧形式でも誤りは検証失敗', _verifyPass('nope', legacy) === false);

    // 4) 旧形式アカウントのログイン→自動移行
    S.account = { email: 'u@test.jp', passHash: legacy, recoveryCode: 'AAAA-BBBB-CCCC', createdAt: '2026-01-01' };
    _maybeUpgradePassHash('oldpass');
    t('ログイン照合後に新形式へ自動移行', S.account.passHash.indexOf('s2$') === 0);
    t('移行後も同じパスワードで検証成功', _verifyPass('oldpass', S.account.passHash) === true);

    // 5) パスワードに特殊文字・日本語が含まれても壊れない
    const hx = _makePassHash('p@ss ワード!#$');
    t('特殊文字・日本語パスワードの往復', _verifyPass('p@ss ワード!#$', hx) === true && _verifyPass('p@ss ワード', hx) === false);

    return res;
  });

  out.push((errs.length === 0 ? 'PASS ' : 'FAIL ') + 'pageerror 0件' + (errs.length ? ' :: ' + errs[0] : ''));
  out.forEach(l => console.log(l));
  const fails = out.filter(l => l.startsWith('FAIL')).length;
  console.log('P1-05 passHash回帰 テスト: PASS ' + out.filter(l => l.startsWith('PASS')).length + ' / FAIL ' + fails);
  await browser.close();
  process.exit(fails ? 1 : 0);
})();

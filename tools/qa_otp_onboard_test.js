/**
 * Familink OTP オンボーディング回帰テスト（Playwright）
 * 対象: 起動画面 s-ob の「メールでログイン / 新規登録」(OTP) 主導線。
 *   - クラウド未接続(オフライン)時: モーダルは signup へフォールバックし、入力メールが
 *     可視欄(supa-auth-email)に引き継がれる
 *   - メール形式不正: エラー文が常時表示され、モーダルは開かない
 *   - クラウド接続時(モック): OTP セクションが表示され、入力メールが OTP 欄に入る
 *   - パスワードでログインの折りたたみが開閉する
 * モーダルの開状態は .modal-backdrop.open クラスで判定する（opacity 制御のため）。
 */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:9000/familink.html';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));

  const results = [];
  const check = (name, ok) => results.push([name, !!ok]);
  const reload = async () => { await page.goto(BASE); await page.waitForTimeout(700); };
  const modalOpen = () => page.evaluate(() => {
    const m = document.getElementById('m-supa-auth');
    return !!(m && m.classList.contains('open'));
  });

  // Case 1: オフライン → signup フォールバックでも入力メールが可視欄に残る
  await reload();
  await page.fill('#ob2-email', 'fallback@example.com');
  await page.click('#ob2-otp-btn');
  await page.waitForTimeout(400);
  check('offline: 入力メールが可視 signup 欄に引き継がれる',
    (await page.inputValue('#supa-auth-email').catch(() => '')) === 'fallback@example.com');

  // Case 2: メール形式不正 → エラー常時表示・モーダルは開かない
  await reload();
  await page.fill('#ob2-email', 'not-an-email');
  await page.click('#ob2-otp-btn');
  await page.waitForTimeout(300);
  check('invalid: エラー文が表示される', /形式/.test(await page.textContent('#ob2-err').catch(() => '')));
  check('invalid: エラー要素が可視', await page.isVisible('#ob2-err'));
  check('invalid: モーダルは開かない', (await modalOpen()) === false);

  // Case 3: クラウド接続(モック) → OTP モードで開き、メールが OTP 欄に入る
  await reload();
  await page.evaluate(() => {
    window.SUPA_OK = true;
    window.getSupabase = () => ({ auth: { signInWithOtp: async () => ({ error: null }), verifyOtp: async () => ({ data: { user: { id: 'x', email: 'a@b.co' } }, error: null }) } });
    window.initSupabase = () => true;
  });
  await page.fill('#ob2-email', 'online@example.com');
  await page.click('#ob2-otp-btn');
  await page.waitForTimeout(400);
  check('online: OTP セクションが表示', await page.isVisible('#supa-auth-otp-wrap'));
  check('online: メールが OTP 欄に入る',
    (await page.inputValue('#supa-otp-email').catch(() => '')) === 'online@example.com');
  check('online: モーダルが開いている', await modalOpen());

  // Case 4: パスワードでログインの折りたたみ開閉
  await reload();
  let passShown = await page.evaluate(() => { const s = document.getElementById('ob2-pass-section'); return !!(s && s.style.display !== 'none'); });
  check('password 欄は初期非表示', passShown === false);
  await page.click('#ob2-pass-toggle');
  await page.waitForTimeout(200);
  passShown = await page.evaluate(() => { const s = document.getElementById('ob2-pass-section'); return !!(s && s.style.display !== 'none'); });
  check('password 欄がトグルで開く', passShown === true);

  check('pageerror が無い', pageErrors.length === 0);

  let pass = 0, fail = 0;
  for (const [name, ok] of results) { console.log((ok ? '✅' : '❌') + ' ' + name); ok ? pass++ : fail++; }
  console.log(`\n📊 OTP オンボーディング: PASS ${pass} / FAIL ${fail} / 合計 ${results.length}`);
  if (pageErrors.length) console.log('pageerrors:', pageErrors.join(' | '));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();

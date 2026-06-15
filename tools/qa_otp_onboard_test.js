/**
 * Familink ウェルカム(ログイン)導線 回帰テスト（Playwright）
 * 対象: 起動画面 s-ob を「通常ログイン（メール＋パスワード）」主導線に統一した仕様。
 *   - メール＋パスワード欄と主ボタン「ログイン」が常時表示される
 *   - OTP/マジックリンク導線（旧 #ob2-otp-btn / パスワード不要 文言）は表に出ない
 *   - 未入力/形式不正でエラーが常時表示され、ログインは進まない
 *   - 「新規登録」「パスワード再設定」リンクから認証モーダルが開く（OTPではなくフォーム）
 *   - 認証モーダルの既定は signin（パスワード）モードで開く
 * モーダルの開状態は .modal-backdrop.open クラスで判定する（opacity 制御のため）。
 *
 * 注: ファイル名は履歴互換のため据え置き。内容はパスワードログイン主導線の検証。
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

  // Case 1: ウェルカムはメール＋パスワード＋「ログイン」が常時表示／OTP導線は無い
  await reload();
  check('welcome: メール欄が可視', await page.isVisible('#ob2-email'));
  check('welcome: パスワード欄が常時可視', await page.isVisible('#ob2-pass'));
  check('welcome: 主ボタンが「ログイン」', (await page.textContent('#ob2-login-btn').catch(() => '')).trim() === 'ログイン');
  check('welcome: 旧OTPボタンが存在しない', (await page.locator('#ob2-otp-btn').count()) === 0);
  check('welcome: 旧パスワードトグルが存在しない', (await page.locator('#ob2-pass-toggle').count()) === 0);

  // Case 2: OTP/マジックリンクの文言が画面に出ていない
  const obText = await page.evaluate(() => (document.getElementById('s-ob').innerText || ''));
  check('welcome: 「パスワードは不要」文言が無い', !/パスワードは不要/.test(obText));
  check('welcome: 「メールでログイン」文言が無い', !/メールでログイン/.test(obText));
  check('welcome: 「HOKU」テキストが出ていない', !/HOKU|Hoku/.test(obText));

  // Case 3: 未入力/形式不正でエラー表示・入室しない
  await reload();
  await page.click('#ob2-login-btn');
  await page.waitForTimeout(200);
  check('empty: メール未入力でエラー表示', /入力してください/.test(await page.textContent('#ob2-err').catch(() => '')));
  await page.fill('#ob2-email', 'not-an-email');
  await page.fill('#ob2-pass', 'secret123');
  await page.click('#ob2-login-btn');
  await page.waitForTimeout(200);
  check('invalid: メール形式不正でエラー表示', /形式/.test(await page.textContent('#ob2-err').catch(() => '')));
  check('invalid: ログイン画面のまま', await page.isVisible('#ob2-login-btn'));

  // Case 4: 「新規登録」で認証モーダルが signup フォームで開く
  await reload();
  await page.evaluate(() => openSupaAuthModal('signup'));
  await page.waitForTimeout(300);
  check('signup: モーダルが開く', await modalOpen());
  check('signup: フォーム（メール欄）が表示', await page.isVisible('#supa-auth-email'));

  // Case 5: モーダルの既定（mode 無指定）は signin/ signup フォーム（OTP欄ではない）
  await reload();
  await page.evaluate(() => openSupaAuthModal());
  await page.waitForTimeout(300);
  check('default: 既定モーダルでフォームが表示', await page.isVisible('#supa-auth-form-wrap'));
  check('default: 既定モーダルでOTP欄は非表示', (await page.isVisible('#supa-auth-otp-wrap')) === false);

  check('pageerror が無い', pageErrors.length === 0);

  let pass = 0, fail = 0;
  for (const [name, ok] of results) { console.log((ok ? '✅' : '❌') + ' ' + name); ok ? pass++ : fail++; }
  console.log(`\n📊 ウェルカム(パスワードログイン)導線: PASS ${pass} / FAIL ${fail} / 合計 ${results.length}`);
  if (pageErrors.length) console.log('pageerrors:', pageErrors.join(' | '));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();

const { chromium } = require('/opt/node22/lib/node_modules/playwright');
let pass=0, fail=0; const L=r=>{const ok=r.startsWith('PASS');ok?pass++:fail++;console.log((ok?'✅':'❌')+' '+r.slice(5));};
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport:{width:375,height:812} });
  const errs=[]; page.on('pageerror',e=>errs.push(e.message.split('\n')[0]));
  await page.goto('http://127.0.0.1:9000/familink.html',{waitUntil:'load'});
  await page.evaluate(()=>localStorage.setItem('familink_v3',JSON.stringify({loggedIn:true,onboardCompleted:true,guideSeen:true,user:{id:'kenya',name:'パパ',role:'parent'},screen:'s-home'})));
  await page.reload({waitUntil:'load'}); await page.waitForTimeout(1300);
  const r = await page.evaluate(() => {
    const out=[]; const t=(n,c)=>out.push((c?'PASS ':'FAIL ')+n);
    // _supaErr: 代表的な生英語エラーが日本語化され技術用語を含まない
    const cases = [
      ['Invalid login credentials', /ログイン|メールアドレス/],
      ['Email not confirmed', /メール|確認/],
      ['User already registered', /既に登録/],
      ['Failed to fetch', /ネットワーク|通信/],
      ['rate limit exceeded', /多すぎ|お待ち|1〜2分/],
      ['AuthApiError: weird internal', /./],
    ];
    let allJa=true, anyTech=false;
    cases.forEach(([inp,re])=>{
      const out2=_supaErr(new Error(inp));
      if(!re.test(out2)) allJa=false;
      if(/Error|fetch|null|undefined|credentials|exceeded/i.test(out2)) anyTech=true;
    });
    t('_supaErr: 代表エラーが日本語化される', allJa);
    t('_supaErr: 出力に英語の技術用語が混ざらない', !anyTech);
    // 不明なエラーでも何らかの日本語/汎用文言を返す（空でない）
    t('_supaErr: 不明エラーも空文字を返さない', /うまく処理できません|不明/.test(_supaErr(new Error('xyz'))) && _supaErr(null)!=='');
    return out;
  });
  r.forEach(L);
  L((errs.length===0?'PASS ':'FAIL ')+'pageerror 0件');
  console.log('────────'); console.log(`E3 Supabaseエラー共通化 テスト: PASS ${pass} / FAIL ${fail}`);
  await browser.close(); process.exit(fail>0?1:0);
})();

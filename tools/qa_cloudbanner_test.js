const { chromium } = require('/opt/node22/lib/node_modules/playwright');
let pass=0, fail=0; const L=r=>{const ok=r.startsWith('PASS');ok?pass++:fail++;console.log((ok?'✅':'❌')+' '+r.slice(5));};
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport:{width:375,height:812} });
  const errs=[]; page.on('pageerror',e=>errs.push(e.message.split('\n')[0]));
  await page.goto('http://127.0.0.1:9000/familink.html',{waitUntil:'load'});
  // ログイン中だがクラウド未接続（supaSessionなし）＝ローカルモード
  await page.evaluate(()=>localStorage.setItem('familink_v3',JSON.stringify({loggedIn:true,onboardCompleted:true,guideSeen:true,user:{id:'kenya',name:'パパ',role:'parent'},screen:'s-home'})));
  await page.reload({waitUntil:'load'}); await page.waitForTimeout(1300);
  let r = await page.evaluate(()=>{ try{closeLoginBonus();}catch(_){} renderHome(); 
    const cta=document.getElementById('home-invite-cta').textContent;
    return { hasWarning:/ログインが必要/.test(cta), hasLoginBtn:!!document.querySelector('#home-invite-cta button[onclick="openSupaAuthModal(\'signin\')"]') }; });
  L((r.hasWarning?'PASS ':'FAIL ')+'未接続時: ホームに「ログインが必要」バナー');
  L((r.hasLoginBtn?'PASS ':'FAIL ')+'未接続時: ログインボタンあり');
  // クラウド接続済み・家族未参加 → 招待CTA
  r = await page.evaluate(()=>{ S.supaSession={id:'u1',email:'a@b.c'}; S.familyId=null; renderHome();
    const cta=document.getElementById('home-invite-cta').textContent; return { invite:/家族を招待/.test(cta), noWarn:!/ログインが必要/.test(cta) }; });
  L((r.invite&&r.noWarn?'PASS ':'FAIL ')+'接続済み・家族なし: 招待CTA表示');
  // 接続済み・家族あり → 何も出さない
  r = await page.evaluate(()=>{ S.familyId='FAMI-AAAA-BBBB-CCCC'; renderHome();
    return document.getElementById('home-invite-cta').textContent.trim()===''; });
  L((r?'PASS ':'FAIL ')+'接続済み・家族あり: バナー非表示');
  L((errs.length===0?'PASS ':'FAIL ')+'pageerror 0件');
  console.log('────────'); console.log(`クラウド接続バナー テスト: PASS ${pass} / FAIL ${fail}`);
  await browser.close(); process.exit(fail>0?1:0);
})();

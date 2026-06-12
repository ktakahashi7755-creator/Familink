const { chromium } = require('/opt/node22/lib/node_modules/playwright');
let pass=0, fail=0; const L=r=>{const ok=r.startsWith('PASS');ok?pass++:fail++;console.log((ok?'✅':'❌')+' '+r.slice(5));};
(async () => {
  const browser = await chromium.launch({ headless: true });
  const errs=[];
  // 1) 未ログインで起動 → s-ob固定・タブバー非表示・データ画面非表示
  let page = await browser.newPage({ viewport:{width:375,height:812} });
  page.on('pageerror',e=>errs.push(e.message.split('\n')[0]));
  await page.goto('http://127.0.0.1:9000/familink.html',{waitUntil:'load'});
  await page.evaluate(()=>localStorage.clear());
  await page.reload({waitUntil:'load'}); await page.waitForTimeout(1300);
  let s = await page.evaluate(()=>({
    ob: document.getElementById('s-ob') && !document.getElementById('s-ob').classList.contains('hidden'),
    tabHidden: document.getElementById('tabbar').classList.contains('hidden'),
    budgetHidden: document.getElementById('s-budget').classList.contains('hidden'),
    homeHidden: document.getElementById('s-home').classList.contains('hidden'),
  }));
  L((s.ob?'PASS ':'FAIL ')+'未ログイン: s-ob(保護画面)が表示');
  L((s.tabHidden?'PASS ':'FAIL ')+'未ログイン: タブバー非表示');
  L((s.budgetHidden&&s.homeHidden?'PASS ':'FAIL ')+'未ログイン: 家計/ホーム等データ画面は非表示');
  await page.close();

  // 2) ?screen=s-budget で未ログインバイパスを試みる → データ画面に入れない
  page = await browser.newPage({ viewport:{width:375,height:812} });
  page.on('pageerror',e=>errs.push(e.message.split('\n')[0]));
  await page.goto('http://127.0.0.1:9000/familink.html?screen=s-budget',{waitUntil:'load'});
  await page.evaluate(()=>localStorage.clear());
  await page.goto('http://127.0.0.1:9000/familink.html?screen=s-budget',{waitUntil:'load'});
  await page.waitForTimeout(1300);
  s = await page.evaluate(()=>({
    ob: document.getElementById('s-ob') && !document.getElementById('s-ob').classList.contains('hidden'),
    budgetHidden: document.getElementById('s-budget').classList.contains('hidden'),
  }));
  L((s.ob && s.budgetHidden?'PASS ':'FAIL ')+'?screen=バイパス不可: 未ログインではs-budgetに入れずs-ob');
  await page.close();

  // 3) ログイン状態 → reload後にデータ画面・タブバー表示（正常系）
  page = await browser.newPage({ viewport:{width:375,height:812} });
  page.on('pageerror',e=>errs.push(e.message.split('\n')[0]));
  await page.goto('http://127.0.0.1:9000/familink.html',{waitUntil:'load'});
  await page.evaluate(()=>localStorage.setItem('familink_v3',JSON.stringify({loggedIn:true,onboardCompleted:true,guideSeen:true,user:{id:'kenya',name:'パパ',role:'parent'},screen:'s-home'})));
  await page.reload({waitUntil:'load'}); await page.waitForTimeout(1400);
  s = await page.evaluate(()=>({
    tabShown: !document.getElementById('tabbar').classList.contains('hidden'),
    homeShown: !document.getElementById('s-home').classList.contains('hidden'),
  }));
  L((s.tabShown && s.homeShown?'PASS ':'FAIL ')+'ログイン状態: タブバー＋ホーム表示（正常系）');

  // 4) ログアウト(クラウド)→reload相当でデータが残らない（H4×P0-1連携）— loggedIn falsy化で保護画面へ
  s = await page.evaluate(()=>{
    S.loggedIn=false; S.user=null; saveS();
    // 起動ガードの再評価をシム: 実アプリは reload で評価。ここでは値だけ確認
    const raw=JSON.parse(localStorage.getItem('familink_v3')||'{}');
    return { loggedIn: !!raw.loggedIn };
  });
  L((!s.loggedIn?'PASS ':'FAIL ')+'ログアウト後: loggedIn=falseが永続化（次回起動で保護画面）');

  L((errs.length===0?'PASS ':'FAIL ')+'pageerror 0件'+(errs.length?': '+errs.slice(0,2).join(' | '):''));
  console.log('────────'); console.log(`認証ガードテスト: PASS ${pass} / FAIL ${fail}`);
  await browser.close(); process.exit(fail>0?1:0);
})();

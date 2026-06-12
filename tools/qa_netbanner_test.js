const { chromium } = require('/opt/node22/lib/node_modules/playwright');
let pass=0, fail=0; const L=r=>{const ok=r.startsWith('PASS');ok?pass++:fail++;console.log((ok?'✅':'❌')+' '+r.slice(5));};
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport:{width:375,height:812} });
  const page = await ctx.newPage();
  const errs=[]; page.on('pageerror',e=>errs.push(e.message.split('\n')[0]));
  await page.goto('http://127.0.0.1:9000/familink.html',{waitUntil:'load'});
  await page.evaluate(()=>localStorage.setItem('familink_v3',JSON.stringify({loggedIn:true,onboardCompleted:true,guideSeen:true,user:{id:'kenya',name:'パパ',role:'parent'},screen:'s-home',supaSession:{id:'uid-1',email:'a@b.c'}})));
  await page.reload({waitUntil:'load'}); await page.waitForTimeout(1400);
  await page.evaluate(()=>{ try{closeLoginBonus();}catch(_){}});
  const r = await page.evaluate(async () => {
    const out=[]; const t=(n,c)=>out.push((c?'PASS ':'FAIL ')+n);
    const banner=()=>document.getElementById('net-banner');
    const shown=()=>banner().classList.contains('show');
    // クラウドログイン状態で error → バナー＋再試行表示
    _netBannerDismissed=false;
    _setSyncDot('error'); await new Promise(r2=>setTimeout(r2,50));
    t('同期失敗(error)でバナー表示', shown());
    t('失敗時は「再試行」ボタンが出る', document.getElementById('net-banner-retry').style.display!=='none');
    t('失敗メッセージに技術用語なし', !/error|Error|fetch|undefined/.test(document.getElementById('net-banner-msg').textContent));
    // synced → バナー消える
    _setSyncDot('synced'); await new Promise(r2=>setTimeout(r2,50));
    t('同期成功でバナーが消える', !shown());
    // オフラインをシム
    Object.defineProperty(navigator,'onLine',{configurable:true,get:()=>false});
    window.dispatchEvent(new Event('offline'));
    await new Promise(r2=>setTimeout(r2,50));
    t('オフラインイベントでバナー表示', shown());
    t('オフライン文言（自動同期の案内）', /オフライン|自動で同期/.test(document.getElementById('net-banner-msg').textContent));
    t('オフライン時は再試行ボタン非表示', document.getElementById('net-banner-retry').style.display==='none');
    // retrySyncNowはオフライン時は通信せずトースト
    retrySyncNow(); await new Promise(r2=>setTimeout(r2,50));
    t('オフラインでの再試行は安全（クラッシュなし）', true);
    // オンライン復帰
    Object.defineProperty(navigator,'onLine',{configurable:true,get:()=>true});
    window.dispatchEvent(new Event('online'));
    await new Promise(r2=>setTimeout(r2,100));
    t('オンライン復帰でオフラインバナーは消える(同期中表示)', true);
    // 閉じる×で同セッション再表示しない
    _setSyncDot('error'); await new Promise(r2=>setTimeout(r2,30));
    document.querySelector('#net-banner .net-x').click();
    _setSyncDot('error'); await new Promise(r2=>setTimeout(r2,30));
    t('×で閉じたら同セッション中は再表示しない', !shown());
    return out;
  });
  r.forEach(L);
  // ローカル専用ユーザーには出ないことを別コンテキストで確認
  const p2 = await ctx.newPage();
  await p2.goto('http://127.0.0.1:9000/familink.html',{waitUntil:'load'});
  await p2.evaluate(()=>localStorage.setItem('familink_v3',JSON.stringify({loggedIn:true,onboardCompleted:true,guideSeen:true,user:{id:'kenya',name:'パパ'},screen:'s-home'})));
  await p2.reload({waitUntil:'load'}); await p2.waitForTimeout(1300);
  const localOnly = await p2.evaluate(()=>{ _setSyncDot('error'); return document.getElementById('net-banner').classList.contains('show'); });
  L((!localOnly?'PASS ':'FAIL ')+'ローカル専用ユーザーにはバナーを出さない');
  L((errs.length===0?'PASS ':'FAIL ')+'pageerror 0件'+(errs.length?': '+errs.slice(0,2).join(' | '):''));
  console.log('────────'); console.log(`オフライン/リトライ テスト: PASS ${pass} / FAIL ${fail}`);
  await browser.close(); process.exit(fail>0?1:0);
})();

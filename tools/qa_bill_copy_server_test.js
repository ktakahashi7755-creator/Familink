const { chromium } = require('/opt/node22/lib/node_modules/playwright');
let pass=0, fail=0; const L=r=>{const ok=r.startsWith('PASS');ok?pass++:fail++;console.log((ok?'✅':'❌')+' '+r.slice(5));};
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport:{width:375,height:812} });
  const errs=[]; page.on('pageerror',e=>errs.push(e.message.split('\n')[0]));
  await page.goto('http://127.0.0.1:9000/familink.html',{waitUntil:'load'});
  await page.evaluate(()=>localStorage.setItem('familink_v3',JSON.stringify({loggedIn:true,onboardCompleted:true,guideSeen:true,user:{id:'kenya',name:'パパ',role:'parent'},screen:'s-home'})));
  await page.reload({waitUntil:'load'}); await page.waitForTimeout(1400);
  const r = await page.evaluate(async () => {
    const out=[]; const t=(n,c)=>out.push((c?'PASS ':'FAIL ')+n);
    try{closeLoginBonus();}catch(_){}
    // BILL-2: 訴求文言が押し付けがましくない・価値訴求
    showUpgradeModal('アルバム写真', 20);
    await new Promise(r2=>setTimeout(r2,150));
    const box=document.getElementById('m-upgrade-box').textContent;
    t('訴求: 「上限に達しました」の壁的表現を排除', !/上限に達しました/.test(box));
    t('訴求: 価値訴求型(もっと残す/ずっと)', /もっと残|ずっと残/.test(box));
    t('訴求: 離脱しやすい("今はこのままでいい")', /今はこのまま|あとで/.test(box));
    t('訴求: 安心訴求(料金/いつでもやめられる)', /料金がかからず|いつでもやめ/.test(box));
    t('訴求: 装飾絵文字なし', !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(box));
    closeUpgradeModal();
    // BILL-3: _syncPremiumFromServer関数が存在し、未ログイン/未デプロイで安全
    t('_syncPremiumFromServer 関数が存在', typeof _syncPremiumFromServer==='function');
    let threw=false; try{ await _syncPremiumFromServer(); }catch(e){threw=true;}
    t('未接続でも例外を投げない（ローカルフォールバック）', !threw);
    // サーバ権利が反映されればisPremiumが従う（BILL-1で検証済みの統合確認）
    S._serverEntitlement={premium:true}; S.isPremiumUser=false;
    t('サーバ権利反映でisPremium()=true', isPremium()===true);
    S._serverEntitlement=null; S.isPremiumUser=false;
    return out;
  });
  r.forEach(L);
  L((errs.length===0?'PASS ':'FAIL ')+'pageerror 0件'+(errs.length?': '+errs.slice(0,2).join(' | '):''));
  console.log('────────'); console.log(`BILL-2/3 訴求文言＋サーバ権利 テスト: PASS ${pass} / FAIL ${fail}`);
  await browser.close(); process.exit(fail>0?1:0);
})();

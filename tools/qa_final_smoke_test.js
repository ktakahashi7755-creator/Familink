const { chromium } = require('/opt/node22/lib/node_modules/playwright');
let pass=0, fail=0; const L=r=>{const ok=r.startsWith('PASS');ok?pass++:fail++;console.log((ok?'✅':'❌')+' '+r.slice(5));};
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport:{width:320,height:568} });
  const errs=[]; page.on('pageerror',e=>errs.push(e.message.split('\n')[0]));
  await page.goto('http://127.0.0.1:9000/familink.html',{waitUntil:'load'});
  await page.evaluate(()=>localStorage.setItem('familink_v3',JSON.stringify({loggedIn:true,onboardCompleted:true,guideSeen:true,user:{id:'kenya',name:'パパ',role:'parent'},
    members:[{id:'kenya',name:'パパ',role:'parent'},{id:'hanako',name:'花子',role:'child'}],screen:'s-home'})));
  await page.reload({waitUntil:'load'}); await page.waitForTimeout(1400);
  const r = await page.evaluate(async () => {
    const out=[]; const t=(n,c)=>out.push((c?'PASS ':'FAIL ')+n);
    const wait=ms=>new Promise(r2=>setTimeout(r2,ms));
    try{closeLoginBonus();}catch(_){}
    const td=todayStr();
    // 320pxで新機能を一気通貫: 終日予定→フィルタ→編集→競合→課金境界
    go('s-cal'); await wait(250);
    openEventModal();
    document.getElementById('ev-allday').checked=true; evAllDayToggle();
    document.getElementById('ev-title').value='統合テスト終日'; document.getElementById('ev-date').value=td;
    document.getElementById('ev-member').value='hanako';
    saveEvent(); await wait(200);
    t('320px: 終日予定の作成', (S.events||[]).some(e=>e.title==='統合テスト終日'&&e.allDay));
    toggleCalMemberVisible('hanako'); await wait(200);
    t('320px: フィルタで花子の終日予定が見える', document.getElementById('s-cal').textContent.includes('統合テスト終日'));
    toggleCalMemberVisible('hanako'); await wait(150);   // 解除→全員
    t('320px: フィルタ解除で全員に戻る', S.calVisibleMembers===null);
    t('320px: 横スクロールなし', document.documentElement.scrollWidth-window.innerWidth<=0);
    // 課金境界（サーバ権利優先のまま回帰なし）
    S._serverEntitlement={premium:false}; S.isPremiumUser=true;
    t('320px: サーバ権利優先の改ざん耐性維持', isPremium()===false);
    S._serverEntitlement=null; S.isPremiumUser=false;
    // Error Boundaryが本番経路でも生きている
    const orig=window.renderBudget; window.renderBudget=()=>{throw new Error('smoke');};
    refresh('s-budget'); await wait(150);
    t('320px: Error Boundaryが捕捉', !!document.querySelector('#s-budget .err-overlay'));
    window.renderBudget=orig; _retryScreen('s-budget'); await wait(150);
    t('320px: 修復後に復帰', !document.querySelector('#s-budget .err-overlay'));
    // 後始末
    S.events=(S.events||[]).filter(e=>e.title!=='統合テスト終日'); saveS(); renderCal();
    return out;
  });
  r.forEach(L);
  L((errs.length===0?'PASS ':'FAIL ')+'pageerror 0件'+(errs.length?': '+errs.slice(0,2).join(' | '):''));
  console.log('────────'); console.log(`最終統合スモーク(320px): PASS ${pass} / FAIL ${fail}`);
  await browser.close(); process.exit(fail>0?1:0);
})();

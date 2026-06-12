const { chromium } = require('/opt/node22/lib/node_modules/playwright');
let pass=0, fail=0; const L=r=>{const ok=r.startsWith('PASS');ok?pass++:fail++;console.log((ok?'✅':'❌')+' '+r.slice(5));};
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport:{width:375,height:812} });
  const errs=[]; page.on('pageerror',e=>errs.push(e.message.split('\n')[0]));
  await page.goto('http://127.0.0.1:9000/familink.html',{waitUntil:'load'});
  await page.evaluate(()=>localStorage.setItem('familink_v3',JSON.stringify({loggedIn:true,onboardCompleted:true,guideSeen:true,user:{id:'kenya',name:'パパ',role:'parent'},screen:'s-home'})));
  await page.reload({waitUntil:'load'}); await page.waitForTimeout(1400);
  const r = await page.evaluate(() => {
    const out=[]; const t=(n,c)=>out.push((c?'PASS ':'FAIL ')+n);
    try{closeLoginBonus();}catch(_){}
    // 正本設定が存在
    t('PREMIUM_FEATURES が機能境界の正本として存在', typeof PREMIUM_FEATURES==='object' && PREMIUM_FEATURES.ocr && PREMIUM_FEATURES.hokuDaily);
    t('isPremium() アクセサが存在', typeof isPremium==='function');
    // 無料時の境界
    S.isPremiumUser=false; S._serverEntitlement=null; S.premiumPaid=false; S.trialStartedAt=null;
    t('無料: isPremium()=false', isPremium()===false);
    t('無料: OCR上限=PREMIUM_FEATURES.ocr.free', _ocrMonthlyLimit()===PREMIUM_FEATURES.ocr.free);
    t('無料: Hoku日次=PREMIUM_FEATURES.hokuDaily.free', _hokuDailyLimit()===PREMIUM_FEATURES.hokuDaily.free);
    // プレミアム時
    S.isPremiumUser=true;
    t('プレミアム: isPremium()=true', isPremium()===true);
    t('プレミアム: OCR上限=premium値', _ocrMonthlyLimit()===PREMIUM_FEATURES.ocr.premium);
    // 中央設定を変えると境界が連動（一元管理の証明）
    const origFree=PREMIUM_FEATURES.ocr.free; PREMIUM_FEATURES.ocr.free=3;
    S.isPremiumUser=false;
    t('正本を変更するとOCR境界が連動(3)', _ocrMonthlyLimit()===3);
    PREMIUM_FEATURES.ocr.free=origFree;
    // サーバ権利が最優先（クライアントflagより優先）
    S.isPremiumUser=false; S._serverEntitlement={premium:true};
    t('サーバ権利=trueはローカルfalseより優先', isPremium()===true);
    S._serverEntitlement={premium:false}; S.isPremiumUser=true;
    t('サーバ権利=falseはローカルtrueより優先（改ざん耐性）', isPremium()===false);
    S._serverEntitlement=null; S.isPremiumUser=false;
    // checkPremiumLimitもisPremium経由
    S.isPremiumUser=true;
    t('checkPremiumLimit: プレミアムは常にtrue', checkPremiumLimit('tasks')===true);
    S.isPremiumUser=false;
    return out;
  });
  r.forEach(L);
  L((errs.length===0?'PASS ':'FAIL ')+'pageerror 0件'+(errs.length?': '+errs.slice(0,2).join(' | '):''));
  console.log('────────'); console.log(`BILL-1 機能境界一元管理 テスト: PASS ${pass} / FAIL ${fail}`);
  await browser.close(); process.exit(fail>0?1:0);
})();

const { chromium } = require('/opt/node22/lib/node_modules/playwright');
let pass=0, fail=0; const L=r=>{const ok=r.startsWith('PASS');ok?pass++:fail++;console.log((ok?'✅':'❌')+' '+r.slice(5));};
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport:{width:375,height:812} });
  const errs=[]; page.on('pageerror',e=>errs.push(e.message.split('\n')[0]));
  await page.goto('http://127.0.0.1:9000/familink.html',{waitUntil:'load'});
  await page.evaluate(()=>localStorage.setItem('familink_v3',JSON.stringify({loggedIn:true,onboardCompleted:true,guideSeen:true,user:{id:'kenya',name:'パパ',role:'parent'},screen:'s-home'})));
  await page.reload({waitUntil:'load'}); await page.waitForTimeout(1400);
  await page.evaluate(()=>{ try{closeLoginBonus();}catch(_){}});
  const r = await page.evaluate(async () => {
    const out=[]; const t=(n,c)=>out.push((c?'PASS ':'FAIL ')+n);
    // renderBudgetを一時的に例外化してrefreshを呼ぶ→エラーパネル表示
    const orig = window.renderBudget;
    window.renderBudget = function(){ throw new Error('boom-test'); };
    let threw=false;
    try { refresh('s-budget'); } catch(e){ threw=true; }
    t('refreshは例外を外に投げない（boundaryが捕捉）', threw===false);
    const panel = document.querySelector('#s-budget .err-overlay .err-panel');
    t('エラー画面が表示される', !!panel);
    t('「もう一度試す」ボタンがある', !!(panel && [...panel.querySelectorAll('button')].find(b=>/もう一度試す/.test(b.textContent))));
    t('「ホームに戻る」ボタンがある', !!(panel && [...panel.querySelectorAll('button')].find(b=>/ホームに戻る/.test(b.textContent))));
    t('技術用語(boom-test/Error)が画面に出ない', panel && !/boom-test|Error|undefined/.test(panel.textContent));
    // retryもまだ失敗→crash overlay
    const retryBtn = panel && [...panel.querySelectorAll('button')].find(b=>/もう一度試す/.test(b.textContent));
    if(retryBtn) retryBtn.click();
    await new Promise(r2=>setTimeout(r2,150));
    t('再試行も失敗で全画面復旧オーバーレイが出る', document.getElementById('app-crash').classList.contains('show'));
    t('復旧画面に「再読み込みする」ボタン', !!document.querySelector('#app-crash .crash-btn'));
    t('復旧画面に技術用語が出ない', !/boom-test|TypeError|undefined/.test(document.getElementById('app-crash').textContent));
    // 復旧：renderBudgetを戻してretry成功でパネルが消える
    window.renderBudget = orig;
    document.getElementById('app-crash').classList.remove('show');
    _retryScreen('s-budget');
    await new Promise(r2=>setTimeout(r2,200));
    t('修復後の再試行で通常描画に戻る（エラーパネル消失）', !document.querySelector('#s-budget .err-overlay'));
    return out;
  });
  r.forEach(L);
  L((errs.length===0?'PASS ':'FAIL ')+'pageerror 0件（boundaryで吸収）'+(errs.length?': '+errs.slice(0,2).join(' | '):''));
  console.log('────────'); console.log(`Error Boundary テスト: PASS ${pass} / FAIL ${fail}`);
  await browser.close(); process.exit(fail>0?1:0);
})();

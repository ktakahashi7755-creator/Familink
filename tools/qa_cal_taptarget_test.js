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
    go('s-cal'); await new Promise(r2=>setTimeout(r2,400));
    // 月送りボタンの実効ヒット領域（::before 44px）
    const mn=document.querySelector('.cal-mn-btn');
    const mr=mn.getBoundingClientRect();
    // ::before は計測できないので、ボタン外8pxの点がボタン扱いになるか
    const elAt=document.elementFromPoint(mr.left-6, mr.top+mr.height/2);
    t('月送りボタンの拡張ヒット領域(44px)が効く', elAt===mn||mn.contains(elAt));
    // ビュー切替の高さ44px以上
    const vt=document.querySelector('.cal-vtab'); const vr=vt.getBoundingClientRect();
    t('ビュー切替タブが44px以上 ('+Math.round(vr.height)+'px)', vr.height>=44);
    // 今日ピル44px以上
    const tp=[...document.querySelectorAll('.cal-today-pill')];
    const allOk=tp.every(b=>b.getBoundingClientRect().height>=44);
    t('連携/今日ピルが全て44px以上', allOk);
    // FAB
    const fab=document.querySelector('.cal-fab-btn'); const fr=fab.getBoundingClientRect();
    t('予定追加FABが44px以上 ('+Math.round(fr.height)+'px)', fr.height>=44);
    // 横スクロールなし
    t('横スクロールなし', document.documentElement.scrollWidth-window.innerWidth<=0);
    return out;
  });
  r.forEach(L);
  L((errs.length===0?'PASS ':'FAIL ')+'pageerror 0件');
  console.log('────────'); console.log(`CAL-2 タップ領域44px テスト: PASS ${pass} / FAIL ${fail}`);
  await browser.close(); process.exit(fail>0?1:0);
})();

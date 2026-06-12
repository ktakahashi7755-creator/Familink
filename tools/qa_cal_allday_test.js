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
    go('s-cal'); await new Promise(r2=>setTimeout(r2,300));
    const td=todayStr();
    // 新規モーダルで終日トグル → 時刻欄が隠れる
    openEventModal(); await new Promise(r2=>setTimeout(r2,150));
    t('終日トグルが存在する', !!document.getElementById('ev-allday'));
    document.getElementById('ev-allday').checked=true; evAllDayToggle();
    t('終日ONで時刻欄が隠れる', document.getElementById('ev-time-fields').style.display==='none');
    document.getElementById('ev-title').value='終日テスト予定';
    document.getElementById('ev-date').value=td;
    saveEvent(); await new Promise(r2=>setTimeout(r2,200));
    const ev=(S.events||[]).find(x=>x.title==='終日テスト予定');
    t('終日予定が保存される', !!ev);
    t('終日予定はallDay:true・time空', ev && ev.allDay===true && (ev.time===''||!ev.time));
    // 月表示/日詳細に「終日」表記
    renderCal(); S.calSel=td; renderCal(); await new Promise(r2=>setTimeout(r2,200));
    t('カレンダーに終日予定が表示', document.getElementById('s-cal').textContent.includes('終日テスト予定'));
    // リスト表示で「終日」ラベル
    setCalView('list'); await new Promise(r2=>setTimeout(r2,250));
    t('リスト表示で「終日」と出る', /終日/.test(document.getElementById('s-cal').textContent));
    setCalView('month'); await new Promise(r2=>setTimeout(r2,150));
    // 編集で開き直すと終日チェックが復元
    openEventModal(ev.id); await new Promise(r2=>setTimeout(r2,150));
    t('編集時に終日チェックが復元される', document.getElementById('ev-allday').checked===true);
    t('編集時に時刻欄が隠れている', document.getElementById('ev-time-fields').style.display==='none');
    // 終日OFFに戻して時刻つき保存
    document.getElementById('ev-allday').checked=false; evAllDayToggle();
    document.getElementById('ev-time').value='14:00';
    saveEvent(); await new Promise(r2=>setTimeout(r2,200));
    const ev2=(S.events||[]).find(x=>x.id===ev.id);
    t('終日OFFに戻すと時刻つきに更新', ev2 && ev2.allDay===false && ev2.time==='14:00');
    // 後始末
    S.events=S.events.filter(x=>x.id!==ev.id); saveS(); renderCal();
    return out;
  });
  r.forEach(L);
  L((errs.length===0?'PASS ':'FAIL ')+'pageerror 0件'+(errs.length?': '+errs.slice(0,2).join(' | '):''));
  console.log('────────'); console.log(`CAL-1 終日予定 テスト: PASS ${pass} / FAIL ${fail}`);
  await browser.close(); process.exit(fail>0?1:0);
})();

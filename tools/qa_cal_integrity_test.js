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
    const td=todayStr();
    go('s-cal'); await new Promise(r2=>setTimeout(r2,200));
    // 1) 存在しないIDでopenEventModal → クラッシュせず案内、モーダル開かない
    let threw=false;
    try { openEventModal('nonexistent-id'); } catch(e){ threw=true; }
    await new Promise(r2=>setTimeout(r2,100));
    t('削除済みID参照でクラッシュしない', !threw);
    t('削除済みID参照でモーダルは開かない', !document.getElementById('m-event').classList.contains('open'));
    // 2) 編集中に他端末削除をシム → saveEventで偽更新せず案内
    S.events=[{id:'race1',title:'競合予定',date:td,time:'10:00',member:''}]; saveS(); renderCal();
    openEventModal('race1'); await new Promise(r2=>setTimeout(r2,150));
    t('既存予定はモーダルが開く', document.getElementById('m-event').classList.contains('open'));
    // 他端末が削除した状況をシム
    S.events=S.events.filter(e=>e.id!=='race1');
    document.getElementById('ev-title').value='編集しようとした';
    let threw2=false; try{ saveEvent(); }catch(e){threw2=true;}
    await new Promise(r2=>setTimeout(r2,150));
    t('競合保存でクラッシュしない', !threw2);
    t('競合保存で偽の「更新」予定が作られない', !(S.events||[]).some(e=>e.title==='編集しようとした'));
    const toast=[...document.querySelectorAll('.toast')].map(x=>x.textContent).join('|');
    t('競合保存で「削除されたため更新できません」案内', /削除された/.test(toast));
    t('競合保存後モーダルは閉じる', !document.getElementById('m-event').classList.contains('open'));
    // 3) ID無しでdeleteCurrentEvent → 安全に閉じる
    openEventModal(); document.getElementById('ev-id').value='';
    let threw3=false; try{ deleteCurrentEvent(); }catch(e){threw3=true;}
    await new Promise(r2=>setTimeout(r2,100));
    t('ID無し削除でクラッシュしない・安全に閉じる', !threw3 && !document.getElementById('m-event').classList.contains('open'));
    // 4) 繰り返し予定の削除はシリーズ全体に効く(クローンid維持)
    S.events=[{id:'rep1',title:'毎週会議',date:td,time:'10:00',member:'',repeat:'weekly'}]; saveS(); renderCal();
    const nextWeek=(()=>{const d=new Date(td+'T00:00:00');d.setDate(d.getDate()+7);return d.toISOString().slice(0,10);})();
    const occ=_eventsOnDate(S.events, nextWeek);
    t('繰り返し予定: 翌週にも出現(クローンid維持)', occ.length===1 && occ[0].id==='rep1');
    S.events=[]; saveS(); renderCal();
    return out;
  });
  r.forEach(L);
  L((errs.length===0?'PASS ':'FAIL ')+'pageerror 0件'+(errs.length?': '+errs.slice(0,2).join(' | '):''));
  console.log('────────'); console.log(`CAL-4 データ整合性ガード テスト: PASS ${pass} / FAIL ${fail}`);
  await browser.close(); process.exit(fail>0?1:0);
})();

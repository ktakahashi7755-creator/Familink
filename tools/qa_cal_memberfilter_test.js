const { chromium } = require('/opt/node22/lib/node_modules/playwright');
let pass=0, fail=0; const L=r=>{const ok=r.startsWith('PASS');ok?pass++:fail++;console.log((ok?'✅':'❌')+' '+r.slice(5));};
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport:{width:375,height:812} });
  const errs=[]; page.on('pageerror',e=>errs.push(e.message.split('\n')[0]));
  await page.goto('http://127.0.0.1:9000/familink.html',{waitUntil:'load'});
  await page.evaluate(()=>localStorage.setItem('familink_v3',JSON.stringify({loggedIn:true,onboardCompleted:true,guideSeen:true,user:{id:'kenya',name:'パパ',role:'parent'},
    members:[{id:'kenya',name:'パパ',role:'parent'},{id:'mama',name:'ママ',role:'parent'},{id:'hanako',name:'花子',role:'child'}],screen:'s-home'})));
  await page.reload({waitUntil:'load'}); await page.waitForTimeout(1400);
  const r = await page.evaluate(async () => {
    const out=[]; const t=(n,c)=>out.push((c?'PASS ':'FAIL ')+n);
    try{closeLoginBonus();}catch(_){}
    const td=todayStr();
    S.events=[
      {id:'ek',title:'パパの会議',date:td,time:'10:00',member:'kenya'},
      {id:'em',title:'ママのヨガ',date:td,time:'11:00',member:'mama'},
      {id:'eh',title:'花子の習い事',date:td,time:'15:00',member:'hanako'},
      {id:'en',title:'担当なし予定',date:td,time:'18:00',member:''},
    ];
    S.calVisibleMembers=null; saveS();
    go('s-cal'); S.calSel=td; renderCal(); await new Promise(r2=>setTimeout(r2,300));
    setCalView('list'); await new Promise(r2=>setTimeout(r2,250));
    // フィルタバー存在
    t('メンバーフィルタバーが表示される', !!document.getElementById('cal-member-chips'));
    let txt=()=>document.getElementById('s-cal').textContent;
    t('全員表示: 4予定すべて見える', txt().includes('パパの会議')&&txt().includes('ママのヨガ')&&txt().includes('花子の習い事')&&txt().includes('担当なし予定'));
    // 花子だけ表示
    toggleCalMemberVisible('hanako'); await new Promise(r2=>setTimeout(r2,200));
    setCalView('list'); await new Promise(r2=>setTimeout(r2,250));
    t('花子フィルタ: 花子の予定が見える', txt().includes('花子の習い事'));
    t('花子フィルタ: パパ/ママの予定は隠れる', !txt().includes('パパの会議')&&!txt().includes('ママのヨガ'));
    t('花子フィルタ: 担当なし予定は常に表示', txt().includes('担当なし予定'));
    // パパも追加 → 花子+パパ
    toggleCalMemberVisible('kenya'); await new Promise(r2=>setTimeout(r2,200));
    setCalView('list'); await new Promise(r2=>setTimeout(r2,250));
    t('花子+パパ: 両方見える', txt().includes('花子の習い事')&&txt().includes('パパの会議'));
    t('花子+パパ: ママは隠れる', !txt().includes('ママのヨガ'));
    // 全員ボタンで戻す
    setCalVisibleMembers(null); await new Promise(r2=>setTimeout(r2,200));
    setCalView('list'); await new Promise(r2=>setTimeout(r2,250));
    t('全員に戻すと再び全予定表示', txt().includes('ママのヨガ'));
    // 3人全員を個別ON＝全員と同義(null正規化)
    toggleCalMemberVisible('kenya');toggleCalMemberVisible('mama');toggleCalMemberVisible('hanako');
    await new Promise(r2=>setTimeout(r2,150));
    t('全員個別選択はnullに正規化', S.calVisibleMembers===null);
    // 月表示でもフィルタが効く
    setCalView('month'); S.calVisibleMembers=['hanako']; renderCal(); await new Promise(r2=>setTimeout(r2,250));
    const monthTxt=document.getElementById('s-cal').textContent;
    t('月表示でもフィルタ反映(花子の予定あり/パパ会議なし)', monthTxt.includes('花子')&&!monthTxt.includes('パパの会議'));
    S.events=[]; S.calVisibleMembers=null; saveS(); renderCal();
    return out;
  });
  r.forEach(L);
  L((errs.length===0?'PASS ':'FAIL ')+'pageerror 0件'+(errs.length?': '+errs.slice(0,2).join(' | '):''));
  console.log('────────'); console.log(`CAL-3 メンバーフィルタ テスト: PASS ${pass} / FAIL ${fail}`);
  await browser.close(); process.exit(fail>0?1:0);
})();

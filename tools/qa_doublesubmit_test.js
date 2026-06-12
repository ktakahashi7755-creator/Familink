const { chromium } = require('/opt/node22/lib/node_modules/playwright');
let pass=0, fail=0; const L=r=>{const ok=r.startsWith('PASS');ok?pass++:fail++;console.log((ok?'✅':'❌')+' '+r.slice(5));};
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport:{width:375,height:812} });
  const errs=[]; page.on('pageerror',e=>errs.push(e.message.split('\n')[0]));
  await page.goto('http://127.0.0.1:9000/familink.html',{waitUntil:'load'});
  await page.evaluate(()=>localStorage.setItem('familink_v3',JSON.stringify({loggedIn:true,onboardCompleted:true,guideSeen:true,user:{id:'kenya',name:'パパ',role:'parent'},screen:'s-home'})));
  await page.reload({waitUntil:'load'}); await page.waitForTimeout(1300);
  await page.evaluate(()=>{ try{closeLoginBonus();}catch(_){}});
  const r = await page.evaluate(async () => {
    const out=[]; const t=(n,c)=>out.push((c?'PASS ':'FAIL ')+n);
    // タスク：連打で1件のみ
    go('s-task'); await new Promise(r2=>setTimeout(r2,100));
    let before=(S.tasks||[]).length;
    openTaskModal(); document.getElementById('te-title').value='二重送信テスト';
    saveTaskEdit(); saveTaskEdit(); saveTaskEdit();   // 3連打
    await new Promise(r2=>setTimeout(r2,100));
    let made=(S.tasks||[]).filter(x=>x.title==='二重送信テスト').length;
    t('タスク3連打でも1件のみ作成', made===1);
    (S.tasks||[]).filter(x=>x.title==='二重送信テスト').forEach(x=>{S.tasks=S.tasks.filter(y=>y.id!==x.id);}); saveS();
    // 投稿：連打で1件
    go('s-board'); await new Promise(r2=>setTimeout(r2,100));
    openPostModal(); document.getElementById('post-title').value='二重投稿テスト';
    savePost(); savePost();
    await new Promise(r2=>setTimeout(r2,100));
    t('投稿2連打でも1件のみ', (S.announces||[]).filter(x=>x.title==='二重投稿テスト').length===1);
    (S.announces||[]).filter(x=>x.title==='二重投稿テスト').forEach(x=>{S.announces=S.announces.filter(y=>y.id!==x.id);}); saveS();
    // 予定：連打で1件
    go('s-cal'); await new Promise(r2=>setTimeout(r2,100));
    openEventModal(); document.getElementById('ev-title').value='二重予定テスト'; document.getElementById('ev-date').value=todayStr();
    saveEvent(); saveEvent();
    await new Promise(r2=>setTimeout(r2,100));
    t('予定2連打でも1件のみ', (S.events||[]).filter(x=>x.title==='二重予定テスト').length===1);
    (S.events||[]).filter(x=>x.title==='二重予定テスト').forEach(x=>{S.events=S.events.filter(y=>y.id!==x.id);}); saveS();
    // バリデーション失敗後は即再送信できる（ロックされない）
    Object.keys(_submitLocks).forEach(k=>delete _submitLocks[k]);
    go('s-task'); await new Promise(r2=>setTimeout(r2,100));
    before=(S.tasks||[]).length;
    openTaskModal(); document.getElementById('te-title').value='';  // 空でvalidation失敗
    saveTaskEdit();   // 失敗（ロックしない）
    document.getElementById('te-title').value='修正後タスク';
    saveTaskEdit();   // すぐ成功すべき
    await new Promise(r2=>setTimeout(r2,100));
    t('バリデーション失敗→修正後は即保存できる', (S.tasks||[]).filter(x=>x.title==='修正後タスク').length===1);
    (S.tasks||[]).filter(x=>x.title==='修正後タスク').forEach(x=>{S.tasks=S.tasks.filter(y=>y.id!==x.id);}); saveS();
    // 700ms後は再び保存できる（別物として）
    Object.keys(_submitLocks).forEach(k=>delete _submitLocks[k]);
    openTaskModal(); document.getElementById('te-title').value='連続A'; saveTaskEdit();
    await new Promise(r2=>setTimeout(r2,800));
    openTaskModal(); document.getElementById('te-title').value='連続B'; saveTaskEdit();
    await new Promise(r2=>setTimeout(r2,100));
    t('700ms経過後は別の保存ができる', (S.tasks||[]).filter(x=>x.title==='連続A'||x.title==='連続B').length===2);
    (S.tasks||[]).filter(x=>/連続[AB]/.test(x.title)).forEach(x=>{S.tasks=S.tasks.filter(y=>y.id!==x.id);}); saveS();
    return out;
  });
  r.forEach(L);
  L((errs.length===0?'PASS ':'FAIL ')+'pageerror 0件'+(errs.length?': '+errs.slice(0,2).join(' | '):''));
  console.log('────────'); console.log(`E4 二重送信防止 テスト: PASS ${pass} / FAIL ${fail}`);
  await browser.close(); process.exit(fail>0?1:0);
})();

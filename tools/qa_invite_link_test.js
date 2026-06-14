const { chromium } = require('/opt/node22/lib/node_modules/playwright');
let pass=0, fail=0; const L=r=>{const ok=r.startsWith('PASS');ok?pass++:fail++;console.log((ok?'✅':'❌')+' '+r.slice(5));};
function stub(state){
  return { auth:{ signOut(){return Promise.resolve({});}, getSession(){return Promise.resolve({data:{session:null}});}, onAuthStateChange(){return {data:{subscription:{}}};} },
    from(){ return {
      upsert(rows){ state.pushed=rows; return Promise.resolve({error:null}); },
      insert(){ return Promise.resolve({error:null}); },
      select(){ return { eq(){ state.fetched=true; return Promise.resolve({data:state.cloudRows||[],error:null}); }, maybeSingle(){ return Promise.resolve({data:null,error:{message:'x'}}); } }; },
      delete(){ return { eq(){ return Promise.resolve({error:null}); } }; },
    };},
    rpc(){return Promise.resolve({error:{message:'x'}});}, channel(){return {on(){return this;},subscribe(){return {};}};}, removeChannel(){}, functions:{invoke(){return Promise.resolve({error:{message:'x'}});}} };
}
(async () => {
  const browser = await chromium.launch({ headless: true });
  // ── 1) リンク発行: 招待モーダルがリンクを表示 ──
  let page = await browser.newPage({ viewport:{width:375,height:812} });
  const errs=[]; page.on('pageerror',e=>errs.push(e.message.split('\n')[0]));
  await page.goto('http://127.0.0.1:9000/familink.html',{waitUntil:'load'});
  await page.evaluate(()=>localStorage.setItem('familink_v3',JSON.stringify({loggedIn:true,onboardCompleted:true,guideSeen:true,user:{id:'kenya',name:'パパ',role:'parent'},screen:'s-home',supaSession:{id:'00000000-0000-0000-0000-0000000000aa',email:'a@b.c'}})));
  await page.reload({waitUntil:'load'}); await page.waitForTimeout(1300);
  let r = await page.evaluate(async () => {
    const out=[]; const t=(n,c)=>out.push((c?'PASS ':'FAIL ')+n);
    try{closeLoginBonus();}catch(_){}
    window.getSupabase=()=>({ auth:{signOut(){return Promise.resolve({});}}, from(){return {upsert(){return Promise.resolve({error:null});},insert(){return Promise.resolve({error:null});},select(){return {eq(){return Promise.resolve({data:[],error:null});},maybeSingle(){return Promise.resolve({data:null,error:{message:'x'}});}};}};}, rpc(){return Promise.resolve({error:{message:'x'}});}, channel(){return {on(){return this;},subscribe(){return {};}};}, removeChannel(){}, functions:{invoke(){return Promise.resolve({error:{message:'x'}});}} });
    S.familyId='FAMI-AAAA-BBBB-CCCC'; saveS();
    await openMyInviteModal(); await new Promise(r2=>setTimeout(r2,200));
    const shown=document.getElementById('my-invite-code').textContent;
    t('発行: 使い捨てトークンの招待リンクURLが表示される', /\?join=INV-[A-Z0-9-]+$/.test(shown));
    t('発行: family_id を直接URLに晒さない（漏洩耐性）', !/FAMI-AAAA-BBBB-CCCC/.test(shown));
    t('発行: _buildInviteLink(code) がフルURL', /^https?:\/\/.*\?join=FAMI-AAAA-BBBB-CCCC$/.test(_buildInviteLink('FAMI-AAAA-BBBB-CCCC')));
    t('発行: 「招待リンクを送る」ボタンがある', !!document.querySelector('#m-my-invite button[onclick="shareInviteLink()"]'));
    closeModal('m-my-invite');
    return out;
  });
  r.forEach(L);
  await page.close();

  // ── 2) リンクで開く（ログイン済み）→ 自動参加・push・fetch ──
  page = await browser.newPage({ viewport:{width:375,height:812} });
  page.on('pageerror',e=>errs.push(e.message.split('\n')[0]));
  await page.addInitScript(()=>{ window.__state={cloudRows:[]}; });
  await page.goto('http://127.0.0.1:9000/familink.html?join=FAMI-XXXX-YYYY-ZZZZ',{waitUntil:'load'});
  await page.evaluate(()=>localStorage.setItem('familink_v3',JSON.stringify({loggedIn:true,onboardCompleted:true,guideSeen:true,user:{id:'mama',name:'ママ',role:'parent'},screen:'s-home',supaSession:{id:'00000000-0000-0000-0000-0000000000bb',email:'b@b.c'}})));
  // getSupabaseをスタブ化（reloadより前にinitScriptで）
  await page.addInitScript(()=>{ window.__pushed=null; window.__fetched=false;
    window.__installStub=function(){ window.getSupabase=()=>({ auth:{signOut(){return Promise.resolve({});},getSession(){return Promise.resolve({data:{session:null}});},onAuthStateChange(){return {data:{subscription:{}}};}},
      from(){return {upsert(rows){window.__pushed=rows;return Promise.resolve({error:null});},insert(){return Promise.resolve({error:null});},select(){return {eq(){window.__fetched=true;return Promise.resolve({data:[],error:null});},maybeSingle(){return Promise.resolve({data:null,error:{message:'x'}});}};},delete(){return {eq(){return Promise.resolve({error:null});}};}};},
      rpc(){return Promise.resolve({error:{message:'x'}});}, channel(){return {on(){return this;},subscribe(){return {};}};}, removeChannel(){}, functions:{invoke(){return Promise.resolve({error:{message:'x'}});}} }); }; });
  await page.goto('http://127.0.0.1:9000/familink.html?join=FAMI-XXXX-YYYY-ZZZZ',{waitUntil:'load'});
  await page.evaluate(()=>{ try{ window.__installStub(); }catch(_){} });
  await page.waitForTimeout(2200);  // boot setTimeout(1500) + 処理
  r = await page.evaluate(async () => {
    const out=[]; const t=(n,c)=>out.push((c?'PASS ':'FAIL ')+n);
    t('リンク起動: URLからjoinを捕捉しfamilyId設定', S.familyId==='FAMI-XXXX-YYYY-ZZZZ');
    t('リンク起動: 自動でpushが走った', !!window.__pushed && window.__pushed.some(x=>x.family_id==='FAMI-XXXX-YYYY-ZZZZ'));
    t('リンク起動: 自動でfetchが走った', window.__fetched===true);
    t('リンク起動: URLからjoinパラメータが消える', !location.search.includes('join='));
    t('リンク起動: 保留がクリアされる', !localStorage.getItem('fl_pending_join'));
    return out;
  });
  r.forEach(L);
  await page.close();

  // ── 3) リンクで開く（未ログイン）→ 保留保存・後でログインしたら参加 ──
  page = await browser.newPage({ viewport:{width:375,height:812} });
  page.on('pageerror',e=>errs.push(e.message.split('\n')[0]));
  await page.addInitScript(()=>{ window.__pushed=null; window.__fetched=false;
    window.__installStub=function(){ window.getSupabase=()=>({ auth:{signOut(){return Promise.resolve({});},getSession(){return Promise.resolve({data:{session:null}});},onAuthStateChange(){return {data:{subscription:{}}};}},
      from(){return {upsert(rows){window.__pushed=rows;return Promise.resolve({error:null});},insert(){return Promise.resolve({error:null});},select(){return {eq(){window.__fetched=true;return Promise.resolve({data:[],error:null});},maybeSingle(){return Promise.resolve({data:null,error:{message:'x'}});}};},delete(){return {eq(){return Promise.resolve({error:null});}};}};},
      rpc(){return Promise.resolve({error:{message:'x'}});}, channel(){return {on(){return this;},subscribe(){return {};}};}, removeChannel(){}, functions:{invoke(){return Promise.resolve({error:{message:'x'}});}} }); }; });
  await page.goto('http://127.0.0.1:9000/familink.html?join=FAMI-JOIN-LATR-CODE',{waitUntil:'load'});
  await page.evaluate(()=>localStorage.setItem('familink_v3',JSON.stringify({loggedIn:false,onboardCompleted:true,guideSeen:true})));   // 未ログインだがオンボ済
  await page.goto('http://127.0.0.1:9000/familink.html?join=FAMI-JOIN-LATR-CODE',{waitUntil:'load'});
  await page.evaluate(()=>{ try{ window.__installStub(); }catch(_){} });
  await page.waitForTimeout(1400);
  r = await page.evaluate(async () => {
    const out=[]; const t=(n,c)=>out.push((c?'PASS ':'FAIL ')+n);
    t('未ログイン: 保留コードがlocalStorageに残る', localStorage.getItem('fl_pending_join')==='FAMI-JOIN-LATR-CODE');
    t('未ログイン: familyIdはまだ設定されない', !S.familyId);
    // ログイン完了をシム（_enterApp経由）
    S.supaSession={id:'00000000-0000-0000-0000-0000000000cc',email:'c@b.c'};
    _enterApp(true);
    await new Promise(r2=>setTimeout(r2,2000));  // _enterApp setTimeout(1600)
    t('ログイン後: 保留参加が自動実行されfamilyId設定', S.familyId==='FAMI-JOIN-LATR-CODE');
    t('ログイン後: 保留がクリアされる', !localStorage.getItem('fl_pending_join'));
    return out;
  });
  r.forEach(L);
  await page.close();

  L((errs.length===0?'PASS ':'FAIL ')+'pageerror 0件'+(errs.length?': '+errs.slice(0,3).join(' | '):''));
  console.log('────────'); console.log(`招待リンク自動参加 テスト: PASS ${pass} / FAIL ${fail}`);
  await browser.close(); process.exit(fail>0?1:0);
})();

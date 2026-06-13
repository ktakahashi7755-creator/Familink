const { chromium } = require('/opt/node22/lib/node_modules/playwright');
let pass=0, fail=0; const L=r=>{const ok=r.startsWith('PASS');ok?pass++:fail++;console.log((ok?'✅':'❌')+' '+r.slice(5));};
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport:{width:375,height:812} });
  const errs=[]; page.on('pageerror',e=>errs.push(e.message.split('\n')[0]));
  await page.goto('http://127.0.0.1:9000/familink.html',{waitUntil:'load'});
  // ローカルアカウントあり・未ログイン状態（ログアウト後を再現）
  await page.evaluate(()=>localStorage.setItem('familink_v3',JSON.stringify({
    loggedIn:false, account:{email:'papa@example.com', passHash:null}, guideSeen:true })));
  await page.reload({waitUntil:'load'}); await page.waitForTimeout(1300);
  const r = await page.evaluate(async () => {
    const out=[]; const t=(n,c)=>out.push((c?'PASS ':'FAIL ')+n);
    const wait=ms=>new Promise(r2=>setTimeout(r2,ms));
    // パスハッシュを実関数で揃える（ローカル一致条件を成立させる）
    S.account.passHash=_hashStr('pass123'); saveS();

    /* ── 1) クラウド接続可: ローカル一致でも Supabase を先に試す ── */
    let cloudCalled=0;
    const okStub={ auth:{ async signInWithPassword(){ cloudCalled++; return { data:{session:{user:{id:'u1',email:'papa@example.com'}}}, error:null }; }, signOut(){return Promise.resolve({});} },
      from(){ return { insert(){return Promise.resolve({error:null});}, select(){return {maybeSingle(){return Promise.resolve({data:null,error:{message:'x'}});}, eq(){return Promise.resolve({data:[],error:null});}};} }; },
      rpc(){ return Promise.resolve({error:{message:'x'}}); }, channel(){return {on(){return this;},subscribe(){return {};}};}, removeChannel(){}, functions:{invoke(){return Promise.resolve({error:{message:'x'}});}} };
    window.getSupabase=()=>okStub;
    // ob2画面の入力欄をシム
    if(!document.getElementById('ob2-email')){
      const e=document.createElement('input'); e.id='ob2-email'; document.body.appendChild(e);
      const p=document.createElement('input'); p.id='ob2-pass'; document.body.appendChild(p);
      const er=document.createElement('div'); er.id='ob2-err'; document.body.appendChild(er);
    }
    document.getElementById('ob2-email').value='papa@example.com';
    document.getElementById('ob2-pass').value='pass123';
    await ob2Login(); await wait(200);
    t('クラウド接続可: ローカル一致でもSupabaseを先に呼ぶ', cloudCalled>=1);

    /* ── 2) クラウド認証失敗: ローカルへ黙って落ちずエラー表示 ── */
    S.loggedIn=false; cloudCalled=0;
    const failStub=Object.assign({},okStub,{ auth:{ async signInWithPassword(){ cloudCalled++; return { data:null, error:{message:'Invalid login credentials'} }; }, signOut(){return Promise.resolve({});} }});
    window.getSupabase=()=>failStub;
    await ob2Login(); await wait(200);
    t('クラウド失敗: エラー表示しローカル入室しない', S.loggedIn===false && /ログインできません|メールアドレス/.test(document.getElementById('ob2-err').textContent));

    /* ── 3) クラウド未接続: ローカル一致でフォールバック入室＋案内 ── */
    S.loggedIn=false;
    window.getSupabase=()=>null;
    await ob2Login(); await wait(300);
    const toasts=[...document.querySelectorAll('.toast')].map(x=>x.textContent).join('|');
    t('未接続: ローカルでフォールバック入室', S.loggedIn===true);
    t('未接続: オフライン入室の案内トースト', /オフライン|端末内/.test(toasts));

    /* ── 4) 招待発行: insert前にpushが走る（順序）＋失敗時リトライ ── */
    const calls=[]; let insertFail=1;
    const seqStub={ auth:{ signOut(){return Promise.resolve({});} },
      from(table){ return { insert(){ calls.push('insert:'+table); if(table==='fl_family_invites' && insertFail-->0) return Promise.resolve({error:{message:'rls'}}); return Promise.resolve({error:null}); },
        upsert(){ calls.push('push'); return Promise.resolve({error:null}); },
        select(){ return { maybeSingle(){return Promise.resolve({data:null,error:{message:'x'}});}, eq(){return Promise.resolve({data:[],error:null});} }; } }; },
      rpc(){return Promise.resolve({error:{message:'x'}});}, channel(){return {on(){return this;},subscribe(){return {};}};}, removeChannel(){}, functions:{invoke(){return Promise.resolve({error:{message:'x'}});}} };
    window.getSupabase=()=>seqStub;
    S.supaSession={id:'00000000-0000-0000-0000-0000000000aa',email:'papa@example.com'};
    S.familyId='FAMI-TEST-TEST-TEST'; S.loggedIn=true; saveS();
    const res=await _issueInviteToken();
    t('発行: push→insertの順序', calls.indexOf('push')>=0 && calls.indexOf('push')<calls.indexOf('insert:fl_family_invites'));
    t('発行: 初回RLS失敗でもpush後リトライで成功', res.ok===true && calls.filter(c=>c==='insert:fl_family_invites').length===2);

    /* ── 5) 未クラウドログインの招待モーダル: ログインCTAが出る ── */
    S.supaSession=null; window._supaLoadFailed=false;
    await openMyInviteModal(); await wait(300);
    t('未ログイン招待: ログインCTAボタン表示', document.getElementById('my-invite-login-cta').style.display==='block');
    t('未ログイン招待: 「同期されません」と明示', /同期されません/.test(document.getElementById('my-invite-login-note').textContent));
    closeModal('m-my-invite');
    // 後始末
    S.loggedIn=false; S.familyId=null; S.supaSession=null; saveS();
    return out;
  });
  r.forEach(L);
  L((errs.length===0?'PASS ':'FAIL ')+'pageerror 0件'+(errs.length?': '+errs.slice(0,3).join(' | '):''));
  console.log('────────'); console.log(`クラウド優先ログイン＋招待発行修正 テスト: PASS ${pass} / FAIL ${fail}`);
  await browser.close(); process.exit(fail>0?1:0);
})();

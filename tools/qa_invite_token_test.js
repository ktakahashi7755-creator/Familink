const { chromium } = require('/opt/node22/lib/node_modules/playwright');
let pass=0, fail=0; const L=r=>{const ok=r.startsWith('PASS');ok?pass++:fail++;console.log((ok?'✅':'❌')+' '+r.slice(5));};
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport:{width:375,height:812} });
  const errs=[]; page.on('pageerror',e=>errs.push(e.message.split('\n')[0]));
  await page.goto('http://127.0.0.1:9000/familink.html',{waitUntil:'load'});
  await page.evaluate(()=>localStorage.setItem('familink_v3',JSON.stringify({loggedIn:true,onboardCompleted:true,guideSeen:true,user:{id:'kenya',name:'パパ',role:'parent'},screen:'s-home',
    supaSession:{id:'00000000-0000-0000-0000-0000000000aa',email:'papa@example.com'}})));
  await page.reload({waitUntil:'load'}); await page.waitForTimeout(1400);
  const r = await page.evaluate(async () => {
    const out=[]; const t=(n,c)=>out.push((c?'PASS ':'FAIL ')+n);
    const wait=ms=>new Promise(r2=>setTimeout(r2,ms));
    try{closeLoginBonus();}catch(_){}
    // ── Supabase スタブ ──
    const inserted=[]; let redeemBehavior='ok';
    const stub = {
      from(table){ return {
        insert(row){ inserted.push({table,row}); return Promise.resolve({error:null}); },
        select(){ return { maybeSingle(){ return Promise.resolve({data:null,error:{message:'x'}}); }, eq(){ return Promise.resolve({data:[],error:null}); } }; },
      };},
      rpc(name,args){
        if(name!=='redeem_family_invite') return Promise.resolve({error:{message:'no'}});
        if(redeemBehavior==='ok') return Promise.resolve({data:'FAMI-SRVR-FMLY-0001',error:null});
        return Promise.resolve({data:null,error:{message:'invite_invalid_or_used'}});
      },
      auth:{ signOut(){ return Promise.resolve({}); } },
      functions:{ invoke(){ return Promise.resolve({error:{message:'x'}}); } },
      channel(){ return { on(){return this;}, subscribe(){return {};} }; },
      removeChannel(){},
    };
    window.getSupabase = () => stub;

    /* ── 発行: 招待モーダルはリンク方式（INVトークンはバックエンド機構として温存） ── */
    S.familyId='FAMI-MYFM-MYFM-MYFM'; S.familyIdOwner=S.supaSession.id; saveS();
    await openMyInviteModal(); await wait(250);
    const shown=document.getElementById('my-invite-code').textContent;
    t('発行: 招待モーダルはリンクを表示（?join=）', /\\?join=FAMI-MYFM-MYFM-MYFM$/.test(shown));
    t('発行: _generateInviteToken は INV 形式を生成（機構温存）', /^INV-[A-Z0-9-]+$/.test(_generateInviteToken()));
    closeModal('m-my-invite');

    /* ── 参加側: INVトークン redeem 成功（家族なし状態から） ── */
    S.familyId=null; S.familyIdOwner=null; S.familyIdSetByUser=false; saveS();
    _inviteSubmitLock=0;
    openSupaInviteModal();
    document.getElementById('supa-invite-code').value='INV-GOOD-CODE-0001';
    doSupaInviteSubmit(); await wait(400);
    t('参加(INV): redeem成功でサーバのfamily_idが設定される', S.familyId==='FAMI-SRVR-FMLY-0001');

    /* ── 参加側: 無効/期限切れトークン → 優しい案内・famId不変 ── */
    S.familyId=null; saveS(); redeemBehavior='fail'; _inviteSubmitLock=0;
    openSupaInviteModal();
    document.getElementById('supa-invite-code').value='INV-DEAD-CODE-0001';
    doSupaInviteSubmit(); await wait(400);
    const err=document.getElementById('supa-invite-err').textContent;
    t('参加(INV無効): 優しいエラー文言', /無効|期限切れ|使用済み/.test(err));
    t('参加(INV無効): familyIdは変わらない', S.familyId===null);
    t('参加(INV無効): 技術用語が出ない', !/error|rpc|RPC|P0001/.test(err));
    closeModal('m-supa-invite');

    /* ── 参加側: 別家族に参加中→INVは redeem前に切替確認（消費防止） ── */
    redeemBehavior='ok'; S.familyId='FAMI-OLDF-OLDF-OLDF'; saveS(); _inviteSubmitLock=0;
    openSupaInviteModal();
    document.getElementById('supa-invite-code').value='INV-GOOD-CODE-0002';
    doSupaInviteSubmit(); await wait(300);
    const confOpen=document.getElementById('m-confirm').classList.contains('open');
    t('参加(INV・別家族中): redeem前に切替確認が出る', confOpen && S.familyId==='FAMI-OLDF-OLDF-OLDF');
    // キャンセル → 消費されない（rpcは呼ばれていない… redeemBehavior確認は呼出カウントで）
    const cancel=[...document.querySelectorAll('#m-confirm button')].find(b=>/キャンセル/.test(b.textContent));
    if(cancel) cancel.click(); await wait(250);
    t('参加(INV・キャンセル): familyId不変（トークン未消費）', S.familyId==='FAMI-OLDF-OLDF-OLDF');
    // OKで切替
    _inviteSubmitLock=0; openSupaInviteModal();
    document.getElementById('supa-invite-code').value='INV-GOOD-CODE-0003';
    doSupaInviteSubmit(); await wait(300);
    const ok=[...document.querySelectorAll('#m-confirm button')].find(b=>/切り替える/.test(b.textContent));
    if(ok) ok.click(); await wait(400);
    t('参加(INV・切替OK): redeem後にサーバfamily_idへ切替', S.familyId==='FAMI-SRVR-FMLY-0001');

    /* ── 後方互換: FAMI-直接コードも従来どおり参加できる ── */
    S.familyId=null; saveS(); _inviteSubmitLock=0;
    openSupaInviteModal();
    document.getElementById('supa-invite-code').value='FAMI-LGCY-LGCY-LGCY';
    doSupaInviteSubmit(); await wait(300);
    t('後方互換(FAMI): 従来コードで参加できる', S.familyId==='FAMI-LGCY-LGCY-LGCY');

    /* ── 不正形式 ── */
    _inviteSubmitLock=0; openSupaInviteModal();
    document.getElementById('supa-invite-code').value='HELLO-WORLD';
    doSupaInviteSubmit(); await wait(150);
    t('不正形式はINV/FAMI両対応の案内', /INV-XXXX|FAMI-XXXX/.test(document.getElementById('supa-invite-err').textContent));
    closeModal('m-supa-invite');

    /* ── 未ログインでINV → ログイン案内 ── */
    S.supaSession=null; S.familyId=null; saveS(); _inviteSubmitLock=0;
    openSupaInviteModal();
    document.getElementById('supa-invite-code').value='INV-GOOD-CODE-0009';
    doSupaInviteSubmit(); await wait(200);
    t('未ログインのINV参加はログイン案内', /ログインが必要/.test(document.getElementById('supa-invite-err').textContent));
    closeModal('m-supa-invite');

    // 後始末
    S.familyId=null; S.familyIdOwner=null; saveS();
    return out;
  });
  r.forEach(L);
  L((errs.length===0?'PASS ':'FAIL ')+'pageerror 0件'+(errs.length?': '+errs.slice(0,3).join(' | '):''));
  console.log('────────'); console.log(`T-071 招待トークン配線 テスト: PASS ${pass} / FAIL ${fail}`);
  await browser.close(); process.exit(fail>0?1:0);
})();

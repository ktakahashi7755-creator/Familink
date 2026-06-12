const { chromium } = require('/opt/node22/lib/node_modules/playwright');
let pass=0, fail=0; const L=r=>{const ok=r.startsWith('PASS');ok?pass++:fail++;console.log((ok?'✅':'❌')+' '+r.slice(5));};
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport:{width:375,height:812} });
  const errs=[]; page.on('pageerror',e=>errs.push(e.message.split('\n')[0]));
  await page.goto('http://127.0.0.1:9000/familink.html',{waitUntil:'load'});
  // 空データユーザー
  await page.evaluate(()=>localStorage.setItem('familink_v3',JSON.stringify({loggedIn:true,onboardCompleted:true,guideSeen:true,demoSeeded:true,user:{id:'kenya',name:'パパ',role:'parent'},screen:'s-home',
    tasks:[],events:[],announces:[],txs:[],health:[],memos:[],shoppingItems:[],docs:[],albumPhotos:[],notifs:[],prep:[]})));
  await page.reload({waitUntil:'load'}); await page.waitForTimeout(1400);
  await page.evaluate(()=>{ try{closeLoginBonus();}catch(_){} try{closeModal('m-guide');}catch(_){} try{closeModal('m-tour-offer');}catch(_){}});
  // 各画面の空状態に「次に何をすればいいか」の誘導があるか
  const r = await page.evaluate(async () => {
    const out=[]; const t=(n,c)=>out.push((c?'PASS ':'FAIL ')+n);
    const screens=[
      ['s-task',/まだ|ありません|追加|はじ/],
      ['s-cal',/予定|ありません|追加|＋/],
      ['s-board',/まだ|ありません|投稿|共有|＋/],
      ['s-health',/まだ|ありません|記録|＋/],
      ['s-shopping',/まだ|ありません|追加|買/],
      ['s-memo',/まだ|ありません|メモ|作成|＋/],
      ['s-archive',/まだ|ありません|書類|追加/],
      ['s-prep',/まだ|ありません|準備|追加/],
    ];
    for(const [id,re] of screens){
      go(id); await new Promise(r2=>setTimeout(r2,250));
      // デモ再投入される領域は明示的に空にして空状態を確認
      if(id==='s-board'){ const _sa=window.seedAnnounces; window.seedAnnounces=function(){}; S.announces=[]; if(typeof renderBoard==='function') renderBoard(); window.seedAnnounces=_sa; await new Promise(r2=>setTimeout(r2,120)); }
      if(id==='s-memo'){ S.memos=[]; if(typeof renderMemo==='function') renderMemo(); await new Promise(r2=>setTimeout(r2,120)); }
      const txt=document.getElementById(id).textContent;
      const hasGuide=re.test(txt);
      const actionable=/追加|はじ|作成|記録|＋|投稿|入力|ボタン|新しい/.test(txt);
      t(id+': 空状態に案内文＋次の行動が示される', hasGuide && actionable);
    }
    return out;
  });
  r.forEach(L);
  // Hoku loading状態とOCR loadingモーダルの存在
  const async3 = await page.evaluate(async () => {
    const out=[]; const t=(n,c)=>out.push((c?'PASS ':'FAIL ')+n);
    go('s-hoku'); await new Promise(r2=>setTimeout(r2,200));
    // Hoku送信でloadingバブルが出る（_hokuMsgsにrole:loading）
    const inp=document.getElementById('hoku-input'); inp.value='テスト';
    document.getElementById('hoku-send').click();
    await new Promise(r2=>setTimeout(r2,120));
    const hasLoading = !!document.querySelector('#hoku-msgs .loading, #hoku-msgs [class*="load"]') || (typeof _hokuMsgs!=='undefined' && _hokuMsgs.some(m=>m.role==='loading'));
    t('Hoku: 応答待ちのloading表示がある', hasLoading);
    await new Promise(r2=>setTimeout(r2,2600));
    const settled = (typeof _hokuMsgs!=='undefined') && !_hokuMsgs.some(m=>m.role==='loading');
    t('Hoku: 応答後にloadingが解消される', settled);
    // OCR loadingモーダルが存在
    t('OCR: 読み取り中loadingモーダルが存在', !!document.getElementById('m-ocr-loading'));
    // 同期エラー時のバナー(error状態)はE2で実装済
    t('同期: error/offlineのリトライバナーが存在', !!document.getElementById('net-banner'));
    return out;
  });
  async3.forEach(L);
  L((errs.length===0?'PASS ':'FAIL ')+'pageerror 0件'+(errs.length?': '+errs.slice(0,2).join(' | '):''));
  console.log('────────'); console.log(`E5 3状態(loading/empty/error) テスト: PASS ${pass} / FAIL ${fail}`);
  await browser.close(); process.exit(fail>0?1:0);
})();

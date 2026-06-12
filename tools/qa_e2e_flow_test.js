// 主要ユーザーフロー結合テスト: 家族作成→招待コード→予定→買い物→アルバム→タスク
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
let pass=0, fail=0; const L=r=>{const ok=r.startsWith('PASS');ok?pass++:fail++;console.log((ok?'✅':'❌')+' '+r.slice(5));};
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport:{width:375,height:812} });
  const errs=[]; page.on('pageerror',e=>errs.push(e.message.split('\n')[0]));
  await page.goto('http://127.0.0.1:9000/familink.html',{waitUntil:'load'});
  // 新規ユーザー（オンボーディング後の状態をセット）
  await page.evaluate(()=>localStorage.setItem('familink_v3',JSON.stringify({loggedIn:true,onboardCompleted:true,guideSeen:true,user:{id:'kenya',name:'パパ',role:'parent'},
    members:[{id:'kenya',name:'パパ',role:'parent'},{id:'hanako',name:'花子',role:'child'}],screen:'s-home',
    events:[],tasks:[],shoppingItems:[],albumPhotos:[],announces:[]})));
  await page.reload({waitUntil:'load'}); await page.waitForTimeout(1400);
  const r = await page.evaluate(async () => {
    const out=[]; const t=(n,c)=>out.push((c?'PASS ':'FAIL ')+n);
    const wait=ms=>new Promise(r2=>setTimeout(r2,ms));
    try{closeLoginBonus();}catch(_){} try{closeModal('m-guide');}catch(_){} try{closeModal('m-tour-offer');}catch(_){}
    const td=todayStr();

    // 1) 家族作成（招待コード生成）
    const code=_generateFamilyId();
    _setFamilyId(code); await wait(100);
    t('① 家族コード生成・設定', S.familyId===code && /^FAMI-/.test(code));

    // 2) 招待コードの形式が有効
    t('② 招待コードが有効形式', /^FAMI-[A-Z0-9]{4}(-[A-Z0-9]{4})*$/.test(code));

    // 3) 予定追加（終日＋通常）
    go('s-cal'); await wait(200);
    openEventModal(); document.getElementById('ev-title').value='家族会議';
    document.getElementById('ev-date').value=td; document.getElementById('ev-member').value='kenya';
    saveEvent(); await wait(200);
    t('③ 予定追加→Sに保存', (S.events||[]).some(e=>e.title==='家族会議'));
    t('③ 予定がカレンダーに表示', document.getElementById('s-cal').textContent.includes('家族会議'));
    t('③ 予定がホームの今後の予定に反映', (go('s-home'),document.getElementById('s-home').textContent.includes('家族会議')));

    // 4) タスク追加→ホーム反映→完了
    go('s-task'); await wait(150);
    openTaskModal(); document.getElementById('te-title').value='保育園の準備';
    saveTaskEdit(); await wait(150);
    const tk=(S.tasks||[]).find(x=>x.title==='保育園の準備');
    t('④ タスク追加→保存', !!tk);
    go('s-home'); await wait(150);
    t('④ タスクがホームに反映', document.getElementById('s-home').textContent.includes('保育園の準備'));
    homeToggleTask(tk.id); await wait(120);
    t('④ ホームから完了トグル', (S.tasks.find(x=>x.id===tk.id)||{}).status==='done');

    // 5) 買い物追加→購入済み
    go('s-shopping'); await wait(150); shopArrays();
    openShopAdd(); document.getElementById('sa-name').value='牛乳'; saveShopAdd(); await wait(150);
    const it=(S.shoppingItems||[]).find(x=>x.name==='牛乳');
    t('⑤ 買い物追加→保存', !!it);
    shopMarkPurchased(it.id); await wait(150);
    t('⑤ 購入済みで履歴へ移動', (S.shoppingHistory||[]).some(h=>h.name==='牛乳'));

    // 6) アルバム写真追加（擬似dataURL）
    go('s-album'); await wait(150);
    _ensureAlbum();
    const before=(S.albumPhotos||[]).length;
    S.albumPhotos.push({id:'ph_e2e',dataUrl:'data:image/gif;base64,R0lGODlhAQABAAAAACwAAAAAAQABAAA=',type:'photo',takenAt:new Date().toISOString(),memberIds:[],caption:'',folderId:''});
    saveS(); renderAlbum(); await wait(200);
    t('⑥ アルバムに写真追加', (S.albumPhotos||[]).length===before+1);
    t('⑥ アルバムサムネが遅延読込', document.querySelectorAll('#s-album img[loading="lazy"]').length>=1);

    // 7) 通しでデータ整合（家族コード維持・各データ存在）
    t('⑦ 通し整合: コード/予定/タスク/履歴/写真が揃う',
      S.familyId===code && (S.events||[]).length>=1 && (S.tasks||[]).length>=1 &&
      (S.shoppingHistory||[]).length>=1 && (S.albumPhotos||[]).length>=1);

    // 後始末
    S.events=[];S.tasks=[];S.shoppingItems=[];S.shoppingHistory=[];S.albumPhotos=[];S.familyId=null;saveS();
    return out;
  });
  r.forEach(L);
  L((errs.length===0?'PASS ':'FAIL ')+'pageerror 0件'+(errs.length?': '+errs.slice(0,3).join(' | '):''));
  console.log('────────'); console.log(`主要フロー結合テスト: PASS ${pass} / FAIL ${fail}`);
  await browser.close(); process.exit(fail>0?1:0);
})();

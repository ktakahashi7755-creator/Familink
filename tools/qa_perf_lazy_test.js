const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport:{width:375,height:812} });
  await page.goto('http://127.0.0.1:9000/familink.html',{waitUntil:'load'});
  // 30枚の擬似写真（小さなdataURL）でアルバム描画
  await page.evaluate(()=>{
    const tiny='data:image/gif;base64,R0lGODlhAQABAAAAACwAAAAAAQABAAA=';
    const photos=[]; for(let i=0;i<30;i++) photos.push({id:'p'+i,dataUrl:tiny,type:'photo',takenAt:new Date().toISOString(),memberIds:[],caption:'',folderId:''});
    localStorage.setItem('familink_v3',JSON.stringify({loggedIn:true,onboardCompleted:true,guideSeen:true,demoSeeded:true,user:{id:'kenya',name:'パパ',role:'parent'},screen:'s-home',albumPhotos:photos}));
  });
  await page.reload({waitUntil:'load'}); await page.waitForTimeout(1400);
  const m = await page.evaluate(()=>{ try{closeLoginBonus();}catch(_){} go('s-album'); 
    return new Promise(r=>setTimeout(()=>r({lazyImgs:document.querySelectorAll('#s-album img[loading="lazy"]').length, totalImgs:document.querySelectorAll('#s-album img').length}),400)); });
  console.log('アルバム30枚: '+JSON.stringify(m));
  // 判定: 30枚の写真がすべて描画され、かつ大半が遅延読み込み(loading="lazy")であること
  const ok1 = m.totalImgs >= 30;
  const ok2 = m.lazyImgs >= 28;
  console.log((ok1 ? 'PASS' : 'FAIL') + ' アルバム30枚がすべて描画される (' + m.totalImgs + '枚)');
  console.log((ok2 ? 'PASS' : 'FAIL') + ' 写真がlazy読み込みされる (' + m.lazyImgs + '/' + m.totalImgs + ')');
  console.log('遅延読み込み テスト: PASS ' + [ok1, ok2].filter(Boolean).length + ' / FAIL ' + [ok1, ok2].filter(x => !x).length);
  await browser.close();
})();

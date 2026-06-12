const { chromium } = require('/opt/node22/lib/node_modules/playwright');
let pass=0, fail=0; const L=r=>{const ok=r.startsWith('PASS');ok?pass++:fail++;console.log((ok?'✅':'❌')+' '+r.slice(5));};
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
  const errs=[]; page.on('pageerror',e=>errs.push(e.message.split('\n')[0]));
  await page.goto('http://127.0.0.1:9000/familink.html', { waitUntil: 'load' });
  await page.evaluate(() => localStorage.setItem('familink_v3', JSON.stringify({ loggedIn:true, onboardCompleted:true, guideSeen:true, user:{id:'kenya',name:'パパ',role:'parent'}, screen:'s-home' })));
  await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(1400);
  const r = await page.evaluate(() => {
    const out=[]; const t=(n,c)=>out.push((c?'PASS ':'FAIL ')+n);
    const F=(name,type,size)=>({name,type,size});
    // 画像
    t('画像jpg(type)を許可', _validateUploadFile(F('a.jpg','image/jpeg',1000),'image',20e6).ok===true);
    t('画像png(拡張子のみ)を許可', _validateUploadFile(F('a.PNG','',1000),'image',20e6).ok===true);
    t('exe偽装(.exe)を拒否', _validateUploadFile(F('virus.exe','application/octet-stream',1000),'image',20e6).ok===false);
    t('PDFを画像枠で拒否', _validateUploadFile(F('doc.pdf','application/pdf',1000),'image',20e6).ok===false);
    t('巨大画像(25MB>20MB)を拒否', _validateUploadFile(F('big.jpg','image/jpeg',25*1024*1024),'image',20e6).ok===false);
    // 動画
    t('mp4を動画枠で許可', _validateUploadFile(F('v.mp4','video/mp4',1000),'video',0).ok===true);
    t('画像を動画枠で拒否', _validateUploadFile(F('a.jpg','image/jpeg',1000),'video',0).ok===false);
    // imageOrVideo
    t('mp4をimageOrVideoで許可', _validateUploadFile(F('v.mov','video/quicktime',1000),'imageOrVideo',0).ok===true);
    t('txtをimageOrVideoで拒否', _validateUploadFile(F('a.txt','text/plain',1000),'imageOrVideo',0).ok===false);
    // json
    t('jsonを許可', _validateUploadFile(F('backup.json','application/json',1000),'json',20e6).ok===true);
    t('json拡張子のみ許可', _validateUploadFile(F('b.JSON','',1000),'json',20e6).ok===true);
    t('画像をjson枠で拒否', _validateUploadFile(F('a.jpg','image/jpeg',1000),'json',20e6).ok===false);
    t('巨大json(25MB)を拒否', _validateUploadFile(F('huge.json','application/json',25*1024*1024),'json',20e6).ok===false);
    // null
    t('null安全', _validateUploadFile(null,'image',20e6).ok===false);
    // 実ハンドラ経由: OCRにexeを渡す→取り込まれない（_ocr.imageが変わらない）
    _ocr.image=null;
    const dt=new DataTransfer(); const exe=new File(['x'],'v.exe',{type:'application/octet-stream'}); dt.items.add(exe);
    const fake={ target:{ files:dt.files, value:'x' } };
    try { ocrOnFilePicked(fake); } catch(e){}
    t('OCRハンドラ: exeで_ocr.imageが設定されない', _ocr.image===null);
    return out;
  });
  r.forEach(L);
  L((errs.length===0?'PASS ':'FAIL ')+'pageerror 0件'+(errs.length?': '+errs.slice(0,2).join(' | '):''));
  console.log('────────'); console.log(`ファイル検証テスト: PASS ${pass} / FAIL ${fail}`);
  await browser.close(); process.exit(fail>0?1:0);
})();

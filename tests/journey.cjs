const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({headless:true});
 for(const width of (process.env.AQD_PRETTY_ONLY ? [390] : [390,1280])) for(const file of (process.env.AQD_PRETTY_ONLY ? ['cotizador','landing'] : ['cotizador.html','landing.html'])){
  const p=await browser.newPage({viewport:{width,height:900}});let submissions=0;const errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  await p.route('**/*',async route=>{
   const u=new URL(route.request().url());
   if(u.hostname==='aqd.test'){
    let f=path.join(root,decodeURIComponent(u.pathname));
    if(!path.extname(f)) f += '.html';
    if(!fs.existsSync(f)){await route.fulfill({status:404,body:'not found'});return;}
    const ext=path.extname(f), types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.mp4':'video/mp4','.png':'image/png','.jpg':'image/jpeg'};
    await route.fulfill({path:f,contentType:types[ext]||'application/octet-stream'});return;
   }
   if(u.hostname==='api.hsforms.com'){
    submissions++;const body=route.request().postDataJSON();
    assert.equal(body.fields.find(f=>f.name==='aqd_m2_construidos').value,'450');
    await route.fulfill({status:200,contentType:'application/json',body:'{}'});return;
   }
   await route.abort();
  });
  await p.goto('http://aqd.test/'+file);
  await p.locator('#q-m2').fill('450');await p.locator('#q-pisos').fill('2');await p.locator('#q-comuna').fill('Santiago');
  await p.locator('[data-group=piscina] [data-value=no]').click();await p.locator('#q-nombre').fill('Prueba local');await p.locator('#q-tel').fill('912345678');
  await p.locator('#btnVerEstimacion').click();await p.locator('#priceAuto').waitFor();
  assert.equal(submissions,1);assert.ok((await p.locator('#priceAuto').innerText()).includes('9.100.000'));
  assert.equal(await p.locator('.disclaimer').innerText(),'El valor final puede variar según distancias, desniveles, red hidráulica, fuente de agua y condiciones de instalación.');
  assert.ok((await p.locator('#resultsBody').innerText()).includes('Activación a distancia'));
  assert.ok(!/sensores|detección|venturi/i.test(await p.locator('#resultsBody').innerText()));
  await p.locator('.result-explainer summary').scrollIntoViewIfNeeded();await p.waitForTimeout(250);
  assert.equal(await p.locator('.result-explainer summary').evaluate(e=>getComputedStyle(e).animationName),'aqdCtaGlow');
  await p.locator('.result-explainer summary').click();const frame=p.frameLocator('.result-explainer iframe');await frame.locator('#btn-demo').click();assert.ok(await frame.locator('#spray-techo').evaluate(e=>e.classList.contains('on')));
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await p.locator('.learn-more a').click();await p.waitForURL('**/como-funciona.html?desde=cotizador');
  assert.equal(await p.locator('#return-to-quote').innerText(),'Volver a mi estimación →');
  await p.locator('#btn-demo').click();assert.ok(await p.locator('#spray-techo').evaluate(e=>e.classList.contains('on')));
  for(const c of ['estanque','impulsion','activacion','conduccion','muro','techo']) await p.locator(`[data-component=${c}]`).click();
  await p.locator('.more > summary').click();await p.locator('#tg-muro').click();assert.equal(await p.locator('#tg-muro').getAttribute('aria-selected'),'true');
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await p.screenshot({path:'/tmp/aqd-how-'+width+'-'+file+'.png',fullPage:true});
  await p.locator('#return-to-quote').click();await p.waitForURL('**/'+file.replace(/(?:\.html)?$/,'.html')+'#mi-estimacion');await p.locator('#priceAuto').waitFor();
  assert.equal(submissions,1);assert.ok((await p.locator('#priceAuto').innerText()).includes('9.100.000'));
  assert.equal(await p.evaluate(()=>lead.m2),450);
  assert.ok((await p.locator('.plan-card.featured a').getAttribute('href')).includes(encodeURIComponent('activación a distancia')));
  await p.locator('.learn-more').scrollIntoViewIfNeeded();await p.waitForTimeout(400);
  await p.screenshot({path:'/tmp/aqd-result-'+width+'-'+file+'.png'});
  await p.emulateMedia({reducedMotion:'reduce'});await p.locator('.result-explainer summary').scrollIntoViewIfNeeded();assert.equal(await p.locator('.result-explainer summary').evaluate(e=>getComputedStyle(e).animationName),'none');
  assert.deepEqual(errors,[]);console.log('PASS',file,width,'form, capped price, animation, detailed page, return without duplicate submission');await p.close();
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});

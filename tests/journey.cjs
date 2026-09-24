const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.join(__dirname,'..');

(async()=>{
  const browser=await chromium.launch({headless:true});
  for(const width of [390,1280]){
    const p=await browser.newPage({viewport:{width,height:900}});
    let submissions=0; const errors=[];
    p.on('pageerror',e=>errors.push(e.message));
    await p.route('**/*',async route=>{
      const u=new URL(route.request().url());
      if(u.hostname==='aqd.test'){
        let f=path.join(root,decodeURIComponent(u.pathname));
        if(!path.extname(f)) f+='.html';
        if(!fs.existsSync(f)){await route.fulfill({status:404,body:'not found'});return;}
        const ext=path.extname(f),types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.mp4':'video/mp4','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg'};
        await route.fulfill({path:f,contentType:types[ext]||'application/octet-stream'});return;
      }
      if(u.hostname==='api.hsforms.com'){
        submissions++;
        const body=route.request().postDataJSON();
        assert.equal(body.fields.find(f=>f.name==='aqd_m2_construidos').value,'301');
        assert.ok(!body.context.pageName.includes('Pisos:'));
        await route.fulfill({status:200,contentType:'application/json',body:'{}'});return;
      }
      await route.abort();
    });

    await p.goto('http://aqd.test/cotizador.html');
    await p.locator('#q-m2').fill('301');
    await p.locator('#q-comuna').fill('Santiago');
    await p.locator('[data-group=piscina] [data-value=no]').click();
    await p.locator('#btnContinuar').click();
    await p.locator('#formStep2.active').waitFor();
    assert.ok((await p.locator('#partialResult').innerText()).includes('diseñado a medida'));
    await p.locator('#q-nombre').fill('Prueba local');
    await p.locator('#q-tel').fill('912345678');
    await p.locator('#btnVerEstimacion').click();
    await p.locator('.custom-project').waitFor();
    assert.equal(submissions,1);
    assert.ok((await p.locator('.custom-project').innerText()).includes('requiere un diseño a medida'));
    assert.equal(await p.locator('.plan-grid').count(),0);
    assert.ok((await p.locator('.disclaimer').innerText()).includes('Valores netos, más IVA'));
    assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    assert.deepEqual(errors,[]);
    console.log('PASS cotizador',width,'two-step, >300 custom flow, HubSpot and responsive width');
    await p.close();
  }
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});

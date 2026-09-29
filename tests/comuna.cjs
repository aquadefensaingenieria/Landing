const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const html=fs.readFileSync(require('node:path').join(__dirname,'../cotizador.html'),'utf8');
for(const [,script] of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) new vm.Script(script);
const errors=new Set();
const input={value:'',setAttribute(){},removeAttribute(){}};
const ctx=vm.createContext({inComuna:input,lead:{m2:150,piscina:false},activeComunaIndex:-1,
 comunaOptions:{classList:{remove(){}}},clearError:id=>errors.delete(id),setError:id=>errors.add(id),
 document:{getElementById:()=>({scrollIntoView(){}})}});
const start=html.search(/const REGIONES\s*=/);
// Use the actual catalog, including the region lookup, without form side effects.
const regionEnd=html.indexOf('\n});',html.indexOf('Object.entries(REGIONES)',start))+4;
vm.runInContext(html.slice(start,regionEnd),ctx);
vm.runInContext(html.match(/const COMUNAS=.*;/)[0],ctx);
for(const name of ['normalizeSearch','syncComuna','hideComunas','selectComuna','escapeHtml','validateStep1']){
 const match=html.match(new RegExp('function '+name+'\\([^]*?\\n\\}'));
 assert.ok(match,name);vm.runInContext(match[0],ctx);
}
function run(code){return vm.runInContext(code,ctx);}
for(const [value,expected,region] of [
 ['Comuna no incluida','Comuna no incluida',''],
 ['  Sector rural nuevo  ','Sector rural nuevo',''],
 ['Santiago','Santiago','Metropolitana'],
 ['concon','Concón','Valparaíso'],
 ['Estoy fuera de Chile','Fuera de Chile','Extranjero']
]){
 input.value=value;
 assert.equal(run('validateStep1()'),true,value);
 assert.equal(run('lead.comuna'),expected);
 assert.equal(run('lead.region'),region);
 assert.equal(errors.has('f-comuna'),false);
}
run("selectComuna('Santiago')");input.value='Localidad nueva';
assert.equal(run('validateStep1()'),true);
assert.equal(run('lead.region'),'','No conservar región de una selección anterior');
for(const value of ['', '   ']){input.value=value;assert.equal(run('validateStep1()'),false);assert.ok(errors.has('f-comuna'));}
input.value='Comuna nueva';assert.equal(run('validateStep1()'),true);assert.equal(errors.size,0);
input.value='<img src=x onerror=alert(1)>';
run('syncComuna()');assert.equal(run('escapeHtml(lead.comuna)'), '&lt;img src=x onerror=alert(1)&gt;');
assert.ok(html.includes('${escapeHtml(lead.comuna)} calculamos:'));
assert.ok(html.includes('<span>${escapeHtml(lead.comuna)}</span>'));
console.log('PASS: comuna libre, normalización, extranjero, autocompletado, cambio de selección, vacío y texto seguro.');

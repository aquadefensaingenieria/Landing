const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');

function loadPage(file) {
  const html = fs.readFileSync(path.join(__dirname, file), 'utf8');
  const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  scripts.forEach(s => new vm.Script(s));
  const elements = new Map();
  function element(id) {
    if (!elements.has(id)) {
      const classes = new Set();
      elements.set(id, {value:'', style:{}, dataset:{}, events:{},
        classList: {add:v=>classes.add(v), remove:v=>classes.delete(v), toggle(){}, contains:v=>classes.has(v)},
        addEventListener(event, fn){this.events[event]=fn;},
        appendChild(){}, scrollIntoView(){}, setAttribute(){}, focus(){}});
    }
    return elements.get(id);
  }
  const sent = [];
  const context = vm.createContext({
    document: {title:file, cookie:'', head:{appendChild(){}}, getElementById:element,
      createElement:()=>element(Symbol()), querySelectorAll:()=>[]},
    window: {location:{href:'https://aquadefensa.cl/'+file}, console:{log(){}}, matchMedia:()=>({matches:true})},
    console:{log(){},warn(){},error(){}}, setTimeout(){}, requestAnimationFrame:fn=>fn(),
    fetch:async(url, options)=>{sent.push({url, ...JSON.parse(options.body)});return {ok:true};}
  });
  vm.runInContext(scripts.find(s=>s.includes('const AQD_CONFIG')), context);
  return {context, element, sent, html};
}

// Historical prices (millions CLP), before the fixed $800,000 VAT-inclusive reduction.
const rows = [
 [80,3.8,4.6,4.4,5.3,5.7,6.8,6.3,7.5],
 [100,3.8,4.6,4.4,5.3,5.7,6.8,6.3,7.5],
 [125,4,4.8,4.6,5.5,5.9,7.1,6.5,7.8],
 [150,4.1,4.9,4.9,5.9,6,7.2,6.8,8.1],
 [175,4.2,5,5.1,6.1,6.1,7.3,7,8.4],
 [200,4.3,5.2,5.4,6.5,6.2,7.4,7.3,8.7],
 [210,4.3,5.2,5.5,6.6,6.2,7.4,7.4,8.9],
 [225,4.4,5.3,5.6,6.7,6.3,7.5,7.5,9],
 [250,4.5,5.4,5.9,7.1,6.4,7.7,7.8,9.3],
 [275,4.6,5.5,6.1,7.3,6.5,7.8,8,9.6],
 [300,4.7,5.6,6.4,7.7,6.6,7.9,8.3,9.9],
 [301,4.7,5.6,6.4,7.7,6.6,7.9,8.3,9.9],
 [500,4.7,5.6,6.4,7.7,6.6,7.9,8.3,9.9],
 [1000,4.7,5.6,6.4,7.7,6.6,7.9,8.3,9.9]
];
let combinations = 0;
for(const file of ['landing.html','cotizador.html']) {
 const {context,element,sent} = loadPage(file);
 for(const row of rows) for(const piscina of [true,false]) {
  vm.runInContext(`Object.assign(lead,{m2:${row[0]},pisos:2,piscina:${piscina}})`,context);
  const est = vm.runInContext('calcEstimate()',context);
  const expected = piscina ? [row[1],row[2],row[5],row[6]] : [row[3],row[4],row[7],row[8]];
  assert.deepEqual([est.netoAsistida,est.brutoAsistida,est.netoAutonoma,est.brutoAutonoma],[Math.round((expected[1]*1e6-800000)/1.19), Math.round(expected[1]*1e6-800000), Math.round((expected[3]*1e6-800000)/1.19), Math.round(expected[3]*1e6-800000)],`${file}, ${row[0]}, pool=${piscina}`);
  vm.runInContext('buildResults(calcEstimate())',context);
  const markup = element('resultsBody').innerHTML;
  assert.equal(markup.includes('Precio base del sistema'),row[0]<100);
  assert.ok(markup.includes('class="plan-card featured">\n        <span class="plan-tag">Recomendada'));
  assert.ok(markup.includes(encodeURIComponent('2 pisos')));
  assert.ok(!markup.includes('undefined') && !markup.includes('NaN'));
  combinations+=2;
 }
 for(const value of ['0','-1','NaN','Infinity','100.5','null']) {
  vm.runInContext(`lead.m2=${value}`,context);
  assert.equal(vm.runInContext('calcEstimate().estado',context),'ENTRADA_INVALIDA');
 }
 for(const value of ['12.5','12,5','-100','abc','']) {
  element('q-m2').value=value; element('q-m2').events.input();
  assert.equal(vm.runInContext('calcEstimate().estado',context),'ENTRADA_INVALIDA');
 }
 vm.runInContext("Object.assign(lead,{m2:301,pisos:2,piscina:false,comuna:'Santiago',nombre:'Prueba local'})",context);
 element('q-tel').value='+56912345678';
 element('btnVerEstimacion').events.click();
 assert.equal(sent.length,1);
 assert.equal(sent[0].fields.find(f=>f.name==='aqd_estimacion_manual').value, '5798319');
 assert.equal(sent[0].fields.find(f=>f.name==='aqd_m2_construidos').value, '301');
 assert.ok(sent[0].context.pageName.includes('Superficie de referencia: 300 m²'));
 assert.ok(sent[0].context.pageName.includes('Techo: 301 m² | Pisos: 2'));
 vm.runInContext('buildResults(calcEstimate())',context);
 assert.ok(element('resultsBody').innerHTML.includes('plan-price'));
 assert.ok(element('resultsBody').innerHTML.includes('Precios de referencia para una casa de 300 m²'));
 assert.ok(element('resultsBody').innerHTML.includes('$9.100.000'));
 assert.ok(element('resultsBody').innerHTML.includes(encodeURIComponent('301 m² de techo')));
 for(const pisos of [1,2,3]) {
  vm.runInContext(`Object.assign(lead,{m2:100,pisos:${pisos},piscina:null})`,context);
  assert.equal(vm.runInContext('calcEstimate().brutoAutonoma',context),6700000);
 }
}
console.log(`${combinations} price combinations match the specification; boundaries, rendering, input validation and mocked lead capture passed. No network requests.`);

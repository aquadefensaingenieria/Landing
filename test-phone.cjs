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

const cases = [
  ['1234 5678','+56912345678'], ['9 1234 5678','+56912345678'],
  ['56 9 1234 5678','+56912345678'], ['+56 9 1234 5678','+56912345678'],
  ['0056 9 1234 5678','+56912345678'], ['+56 (9) 1234-5678','+56912345678'],
  ['2 2345 6789','+56223456789'], ['+34 612 345 678','+34612345678'],
  ['+1 (202) 555-0123','+12025550123'],
  ['', ''], ['1234567',''], ['+56 9 1234 567',''],
  ['+56 9 1234 56789',''], ['+1234567890123456',''], ['9123abc45678','']
];
let total = 0;
for(const file of ['landing.html','cotizador.html']) {
  for(const [input, expected] of cases) {
    for(const autofill of [false,true]) {
      const {context,element,sent} = loadPage(file);
      vm.runInContext("Object.assign(lead,{m2:150,comuna:'Santiago',nombre:'Prueba local',piscina:true});",context);
      element('q-tel').value = input;
      if(!autofill) element('q-tel').events.input();
      assert.equal(element('q-tel').value,input,'Never truncate pasted input');
      element('btnVerEstimacion').events.click();
      if(expected) {
        assert.equal(sent.length,1,`${file}: ${input}`);
        assert.equal(sent[0].url,'https://api.hsforms.com/submissions/v3/integration/submit/51195038/60aa1d36-6ccd-4722-a5c2-39f99c790aad');
        assert.equal(sent[0].fields.find(f=>f.name==='phone').value,expected);
        assert.ok(sent[0].fields.every(f=>f.objectTypeId==='0-1' && typeof f.value==='string'));
        assert.ok(!sent[0].fields.some(f=>f.name==='email'||f.name==='aqd_email_contacto'));
      } else {
        assert.equal(sent.length,0,`${file}: invalid ${input}`);
        assert.ok(element('f-tel').classList.contains('has-error'));
      }
      total++;
    }
  }
  const {context,element,sent} = loadPage(file);
  vm.runInContext("Object.assign(lead,{m2:150,comuna:'Santiago',nombre:'Prueba local',piscina:true,email:'test@example.com'});",context);
  element('q-tel').value='+56912345678';
  element('btnVerEstimacion').events.click();
  assert.equal(sent[0].fields.find(f=>f.name==='aqd_email_contacto').value,'test@example.com');
  assert.ok(!sent[0].fields.some(f=>f.name==='email'));
  total++;
}
console.log(`${total} regression scenarios passed; all inline scripts compile. No network requests were made.`);

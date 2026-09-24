const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const path=require('node:path');

const html=fs.readFileSync(path.join(__dirname,'cotizador.html'),'utf8');
const match=html.match(/function normalizePhone\(local,prefix\)\{[\s\S]*?\n\}/);
assert.ok(match,'normalizePhone debe existir');
const ctx=vm.createContext({});
vm.runInContext(match[0],ctx);

const cases=[
  ['9 1234 5678','+56','+56912345678'],
  ['912345678','+56','+56912345678'],
  ['+56 9 1234 5678','+56','+56912345678'],
  ['9123456789','+56',''],
  ['812345678','+56',''],
  ['91234567','+56',''],
  ['612345678','+34','+34612345678']
];
for(const [value,prefix,expected] of cases){
  assert.equal(vm.runInContext(`normalizePhone(${JSON.stringify(value)},${JSON.stringify(prefix)})`,ctx),expected,`${value} / ${prefix}`);
}
console.log(`${cases.length} phone scenarios passed.`);

const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const path=require('node:path');

const html=fs.readFileSync(path.join(__dirname,'cotizador.html'),'utf8');
const start=html.indexOf('const PRICE_RULES =');
const end=html.indexOf('/* Validación informativa de tramos históricos.');
assert.ok(start>=0&&end>start,'bloque de precios debe existir');
const code=html.slice(start,end);
const ctx=vm.createContext({console:{warn(){},log(){}}});
vm.runInContext(code,ctx);

const expected={
  100:{asistida_piscina:3193277,asistida_estanque:3781513,distancia_piscina:5042017,distancia_estanque:5630252},
  150:{asistida_piscina:3445378,asistida_estanque:4285714,distancia_piscina:5378151,distancia_estanque:6134454},
  200:{asistida_piscina:3697479,asistida_estanque:4789916,distancia_piscina:5546218,distancia_estanque:6638655},
  300:{asistida_piscina:4033613,asistida_estanque:5798319,distancia_piscina:5966387,distancia_estanque:7647059}
};
for(const [m,row] of Object.entries(expected)){
  const got=vm.runInContext(`CONFIG.PRECIOS_NETOS[${m}]`,ctx);
  assert.deepEqual({...got},row,`precios netos ${m} m²`);
}
assert.notEqual(expected[200].distancia_piscina,expected[300].distancia_piscina,'distancia piscina 200 y 300 no deben repetir');
assert.notEqual(expected[200].distancia_estanque,expected[300].distancia_estanque,'distancia estanque 200 y 300 no deben repetir');
assert.ok(!html.includes('id="q-pisos"'),'pisos eliminado');
assert.ok(!html.includes('IVA incluido'),'la UI usa neto + IVA');
assert.ok(html.includes('Tu propiedad requiere un diseño a medida.'),'caso >300 presente');
console.log('Pricing/config regression checks passed.');

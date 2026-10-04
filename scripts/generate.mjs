import { mkdir, writeFile } from 'node:fs/promises';
import { contract } from './contract.mjs';
import { cases } from './cases.mjs';

for (const dir of ['openapi', 'postman', 'docs']) await mkdir(dir, { recursive: true });
const writeJson = (path, value) => writeFile(path, JSON.stringify(value, null, 2) + '\n');
await writeJson('openapi/openapi.json', contract);
// Resolve internal schema refs without downgrading or relaxing the original contract.
function inline(value) {
  if (Array.isArray(value)) return value.map(inline);
  if (value && typeof value === 'object') {
    if (value.$ref) return inline(contract.components.schemas[value.$ref.split('/').at(-1)]);
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, inline(v)]));
  }
  return value;
}
const schemas = Object.fromEntries(Object.entries(contract.components.schemas).map(([name, schema]) => [name, inline(schema)]));
const event = code => ({ listen: 'test', script: { type: 'text/javascript', exec: code.trim().split('\n') } });
function item(name, method, path, code, body, auth = '{{tokenA}}') {
  return { name, request: { method, auth: { type: 'noauth' }, header: [ ...(auth ? [{ key: 'Authorization', value: `Bearer ${auth}` }] : []), ...(body !== undefined ? [{ key: 'Content-Type', value: 'application/json' }] : []) ], url: '{{baseUrl}}' + path, ...(body === undefined ? {} : { body: { mode: 'raw', raw: JSON.stringify(body), options: { raw: { language: 'json' } } } }) }, event: [event(code)] };
}
function base(id, status, schema, more = '') {
  return `const id = '${id}';\nconst schemas = JSON.parse(pm.collectionVariables.get('schemas'));\npm.test(id + ' | estado HTTP ${status}', () => pm.response.to.have.status(${status}));\npm.test(id + ' | Content-Type JSON', () => pm.expect(pm.response.headers.get('Content-Type')).to.match(/^application\\/json/));\npm.test(id + ' | esquema ${schema}', () => pm.response.to.have.jsonSchema(schemas.${schema}));\nconst body = pm.response.json();\n${more}`;
}
const helpers = `
function get(path, token, fn) {
  pm.sendRequest({url: pm.environment.get('baseUrl') + path, method:'GET', header:{Authorization:'Bearer '+pm.environment.get(token)}}, (err,res) => {
    pm.test(id+' | lectura posterior disponible '+path, () => {pm.expect(err).to.equal(null); pm.expect(res.code).to.equal(200);});
    if (!err && res) fn(res.json());
  });
}
function checkSchema(value, name, label) {
  pm.test(id+' | esquema '+label, () => pm.expect(value).to.have.jsonSchema(schemas[name]));
}
function checkIds(value) {
  checkSchema(value, 'OrderPage', 'listado posterior');
  pm.test(id+' | sin creaciones adicionales', () => {
    pm.expect(value.total).to.equal(4);
    pm.expect(value.items.map(x=>x.id).sort()).to.eql(JSON.parse(pm.environment.get('expectedIds')).sort());
    value.items.forEach(x=>pm.expect(x.owner).to.equal('usuario_a'));
  });
}`;
const errorTest = (id, status, code, more = '') => base(id, status, 'Error', `pm.test(id+' | código ${code}', () => pm.expect(body.error.code).to.equal('${code}'));\n${status === 401 ? `pm.test(id+' | desafío Bearer', () => pm.expect(pm.response.headers.get('WWW-Authenticate')).to.equal('Bearer'));` : ''}\n${more}`);
const requests = [
  item('SETUP | datos limpios y sesiones efímeras', 'POST', '/__demo/prepare', base('SETUP', 200, 'Fixture', `
pm.environment.set('tokenA', body.tokens.usuario_a);
pm.environment.set('tokenB', body.tokens.usuario_b);
pm.environment.set('ownIds', JSON.stringify(body.ownIds));
pm.environment.set('foreignId', body.foreignId);
['createdId','expectedIds','confirmedAt'].forEach(k=>pm.environment.unset(k));
pm.test('SETUP | 3 propios y 1 ajeno', () => { pm.expect(body.ownIds).to.have.lengthOf(3); pm.expect(body.users).to.eql(['usuario_a','usuario_b']); });`), undefined, null),
  item('TC01 | Paginación válida y aislamiento', 'GET', '/orders?page=1&limit=2', base('TC01', 200, 'OrderPage', `${helpers}
pm.test(id+' | primera página y propietario', () => { pm.expect(body.page).to.equal(1); pm.expect(body.limit).to.equal(2); pm.expect(body.total).to.equal(3); pm.expect(body.totalPages).to.equal(2); pm.expect(body.items).to.have.lengthOf(2); body.items.forEach(x=>pm.expect(x.owner).to.equal('usuario_a')); });
get('/orders?page=2&limit=2','tokenA', page2 => {
 checkSchema(page2,'OrderPage','segunda página');
 pm.test(id+' | segunda página completa sin duplicados', () => {
  pm.expect(page2.page).to.equal(2); pm.expect(page2.limit).to.equal(2); pm.expect(page2.total).to.equal(3); pm.expect(page2.totalPages).to.equal(2); pm.expect(page2.items).to.have.lengthOf(1);
  const ids = body.items.concat(page2.items).map(x=>x.id);
  pm.expect(new Set(ids).size).to.equal(3); pm.expect(ids.sort()).to.eql(JSON.parse(pm.environment.get('ownIds')).sort());
  page2.items.forEach(x=>pm.expect(x.owner).to.equal('usuario_a'));
 });
});`)),
  item('TC02 | Página inválida', 'GET', '/orders?page=0&limit=2', errorTest('TC02', 400, 'VALIDATION_ERROR')),
  item('TC03 | Crear pedido válido', 'POST', '/orders', base('TC03', 201, 'Order', `${helpers}
pm.environment.set('createdId', body.id);
pm.environment.set('expectedIds', JSON.stringify(JSON.parse(pm.environment.get('ownIds')).concat(body.id)));
pm.test(id+' | valores iniciales e importe calculado', () => { pm.expect(body.owner).to.equal('usuario_a'); pm.expect(body.product).to.equal('CUADERNO'); pm.expect(body.quantity).to.equal(2); pm.expect(body.total).to.equal(50); pm.expect(body.status).to.equal('draft'); pm.expect(body.confirmationCount).to.equal(0); pm.expect(body.confirmedAt).to.equal(null); pm.expect(JSON.parse(pm.environment.get('ownIds'))).not.to.include(body.id); });
pm.test(id+' | Location del recurso', () => pm.expect(pm.response.headers.get('Location')).to.equal('/orders/'+body.id));
get('/orders?limit=20','tokenA', checkIds);`), { product: 'CUADERNO', quantity: 2 }),
  item('TC04 | Consultar creación persistida', 'GET', '/orders/{{createdId}}', base('TC04', 200, 'Order', `pm.test(id+' | creación persistida correcta', () => { pm.expect(body.id).to.equal(pm.environment.get('createdId')); pm.expect(body.owner).to.equal('usuario_a'); pm.expect(body.product).to.equal('CUADERNO'); pm.expect(body.quantity).to.equal(2); pm.expect(body.total).to.equal(50); pm.expect(body.status).to.equal('draft'); pm.expect(body.confirmationCount).to.equal(0); pm.expect(body.confirmedAt).to.equal(null); });`)),
  item('TC05 | Cantidad inválida sin efecto', 'POST', '/orders', errorTest('TC05', 400, 'VALIDATION_ERROR', `${helpers}\nget('/orders?limit=20','tokenA', checkIds);`), { product: 'CUADERNO', quantity: 0 }),
  item('TC06 | Campo obligatorio ausente', 'POST', '/orders', errorTest('TC06', 400, 'VALIDATION_ERROR', `${helpers}\nget('/orders?limit=20','tokenA', checkIds);`), { product: 'CUADERNO' }),
  item('TC07 | Sin credenciales', 'GET', '/orders/{{createdId}}', errorTest('TC07', 401, 'UNAUTHORIZED'), undefined, null),
  item('TC08 | Credencial inválida', 'GET', '/orders/{{createdId}}', errorTest('TC08', 401, 'UNAUTHORIZED'), undefined, 'invalid-demo-session'),
  item('TC09 | Acceso y modificación de pedido ajeno', 'GET', '/orders/{{foreignId}}', errorTest('TC09', 403, 'FORBIDDEN', `${helpers}
pm.sendRequest({url:pm.environment.get('baseUrl')+'/orders/'+pm.environment.get('foreignId')+'/confirmation',method:'PUT',header:{Authorization:'Bearer '+pm.environment.get('tokenA')}}, (err,res)=> {
 pm.test(id+' | confirmación ajena prohibida',()=> {pm.expect(err).to.equal(null); pm.expect(res.code).to.equal(403); pm.expect(res.json().error.code).to.equal('FORBIDDEN');});
 if (!err && res) checkSchema(res.json(),'Error','confirmación prohibida');
 get('/orders/'+pm.environment.get('foreignId'),'tokenB', own => {
  checkSchema(own,'Order','lectura autorizada B');
  pm.test(id+' | pedido ajeno sin efecto',()=> {pm.expect(own.id).to.equal(pm.environment.get('foreignId')); pm.expect(own.owner).to.equal('usuario_b'); pm.expect(own.status).to.equal('draft'); pm.expect(own.confirmationCount).to.equal(0); pm.expect(own.confirmedAt).to.equal(null);});
 });
});`)),
  item('TC10 | Recurso inexistente', 'GET', '/orders/00000000-0000-4000-8000-000000000000', errorTest('TC10', 404, 'NOT_FOUND')),
  item('TC11 | Confirmar borrador y verificar cambio', 'PUT', '/orders/{{createdId}}/confirmation', base('TC11', 200, 'Order', `${helpers}
pm.environment.set('confirmedAt', body.confirmedAt);
pm.test(id+' | primera confirmación',()=> {pm.expect(body.id).to.equal(pm.environment.get('createdId')); pm.expect(body.status).to.equal('confirmed'); pm.expect(body.confirmationCount).to.equal(1); pm.expect(body.total).to.equal(50); pm.expect(body.confirmedAt).to.be.a('string'); pm.expect(Number.isNaN(Date.parse(body.confirmedAt))).to.equal(false);});
get('/orders/'+pm.environment.get('createdId'),'tokenA', saved => {checkSchema(saved,'Order','confirmación persistida'); pm.test(id+' | efecto persistido',()=>pm.expect(saved).to.eql(body));});`)),
  item('TC12 | Repetir confirmación: efecto final idempotente', 'PUT', '/orders/{{createdId}}/confirmation', base('TC12', 200, 'Order', `${helpers}
function effect(saved, label) {checkSchema(saved,'Order',label); pm.test(id+' | '+label+' mantiene efecto único',()=> {pm.expect(saved.id).to.equal(pm.environment.get('createdId')); pm.expect(saved.owner).to.equal('usuario_a'); pm.expect(saved.product).to.equal('CUADERNO'); pm.expect(saved.quantity).to.equal(2); pm.expect(saved.status).to.equal('confirmed'); pm.expect(saved.confirmationCount).to.equal(1); pm.expect(saved.confirmedAt).to.equal(pm.environment.get('confirmedAt')); pm.expect(saved.total).to.equal(50);});}
effect(body,'PUT repetido');
get('/orders/'+pm.environment.get('createdId'),'tokenA', saved=> {effect(saved,'lectura final'); get('/orders?limit=20','tokenA',checkIds);});`)),
  item('CLEANUP | eliminar pedido de la corrida y comprobar', 'DELETE', '/orders/{{createdId}}', base('CLEANUP', 200, 'Deleted', `${helpers}
pm.test(id+' | eliminado ID actual',()=>pm.expect(body.id).to.equal(pm.environment.get('createdId')));
pm.sendRequest({url:pm.environment.get('baseUrl')+'/orders/'+pm.environment.get('createdId'),method:'GET',header:{Authorization:'Bearer '+pm.environment.get('tokenA')}},(err,res)=> {
 pm.test(id+' | lectura final 404',()=> {pm.expect(err).to.equal(null);pm.expect(res.code).to.equal(404);pm.expect(res.json().error.code).to.equal('NOT_FOUND');});
 if (!err && res) checkSchema(res.json(),'Error','recurso eliminado');
 get('/orders?limit=20','tokenA', page=> {
  checkSchema(page,'OrderPage','limpieza');
  pm.test(id+' | vuelve al estado inicial',()=> {pm.expect(page.total).to.equal(3);pm.expect(page.items.map(x=>x.id).sort()).to.eql(JSON.parse(pm.environment.get('ownIds')).sort());});
  ['tokenA','tokenB','createdId','foreignId','ownIds','expectedIds','confirmedAt'].forEach(k=>pm.environment.unset(k));
 });
});`))
];
const collection = {
  info: { _postman_id: '3852e08e-d54e-4715-a52b-1b6963559db7', name: 'Pedidos | 12 casos de contrato y reglas', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json', description: 'Ejecutar completa, en orden, con 1 iteración. SETUP reinicia fixtures; CLEANUP comprueba efecto y borra variables. 12 situaciones TC01..TC12; solicitudes auxiliares y lecturas posteriores no son casos extra. Esquemas derivados del contrato OpenAPI 3.1, validación del cuerpo; no validador completo OpenAPI. Usar solo API local de demo. No exportar sesiones ni informes crudos.' },
  variable: [{ key: 'schemas', value: JSON.stringify(schemas), type: 'string' }],
  item: requests
};
await writeJson('postman/pedidos.postman_collection.json', collection);
await writeJson('postman/local.postman_environment.json', { id: '402ff5fb-c5c0-4aa0-aa32-20e1e06335b1', name: 'Pedidos local - sin secretos', values: [{ key: 'baseUrl', value: 'http://127.0.0.1:3000', enabled: true, type: 'default' }, ...['tokenA','tokenB','createdId','foreignId','ownIds','expectedIds','confirmedAt'].map(key => ({ key, value: '', enabled: true, type: key.startsWith('token') ? 'secret' : 'default' }))], _postman_variable_scope: 'environment' });
const columns = ['id','operation','risk','pre','data','expected','assertions','cleanup'];
const labels = ['ID','Operación','Riesgo','Precondiciones','Datos','Resultado esperado','Aserciones','Limpieza'];
const csv = row => row.map(v => '"'+v.replaceAll('"','""')+'"').join(',');
await writeFile('docs/matriz.csv', '\uFEFF'+[csv(labels),...cases.map(c=>csv(columns.map(k=>c[k])))].join('\n')+'\n');
await writeFile('docs/matriz.md', '# Matriz de pruebas: 12 casos distintos\n\nUn caso es una situación funcional, no cada aserción. SETUP y CLEANUP no cuentan. Orden obligatorio TC01..TC12. Los IDs se generan en cada SETUP y se guardan durante esa misma ejecución. Todos los errores se validan como objetos estrictos sin campos del pedido.\n\n| '+labels.join(' | ')+' |\n| '+labels.map(()=> '---').join(' | ')+' |\n'+cases.map(c=>'| '+columns.map(k=>c[k]).join(' | ')+' |').join('\n')+'\n\n## Preparación y limpieza\n\nSETUP (POST /__demo/prepare) reinicia exclusivamente los datos sintéticos y emite sesiones nuevas para ambos usuarios. CLEANUP elimina el pedido creado, verifica GET 404 y listado inicial de 3; elimina variables sensibles. Aunque una aserción falle, el runner continúa hasta CLEANUP. Un fallo de transporte o interrupción puede impedir limpieza: repetir desde SETUP, sin reutilizar IDs.\n');
console.log('Generados: OpenAPI 3.1.0, colección v2.1, ambiente sin secretos, matriz de 12 casos.');

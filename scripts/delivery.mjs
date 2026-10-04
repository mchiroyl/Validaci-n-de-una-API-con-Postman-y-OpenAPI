import { readFile, writeFile, readdir, stat, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { goodLine, badLine } from './defect.mjs';
import { cases } from './cases.mjs';

const sha = text => createHash('sha256').update(text).digest('hex');
const json = async path => JSON.parse(await readFile(path,'utf8'));
const summary = await json('evidence/resumen.json');
const corrected = await json('evidence/03-corregida.json');
const failed = await json('evidence/02-fallo-controlado.json');
const source = await readFile('src/api.mjs','utf8');
const spec = await readFile('openapi/openapi.json','utf8');
if (!source.includes(goodLine) || source.includes(badLine)) throw new Error('API contiene defecto');
if (corrected.casesExecuted !== 12 || corrected.casesPassed !== 12 || !corrected.exactIds || corrected.exitCode !== 0) throw new Error('Evidencia corregida incompleta');
if (failed.exitCode !== 1 || !failed.cases.find(x=>x.id==='TC04')?.assertions.some(x=>x.name.includes('esquema Order')&&!x.passed)) throw new Error('No existe evidencia válida del detector');
if (!summary.contractUnchanged || corrected.contractSha256 !== sha(spec) || corrected.apiSourceSha256 !== sha(source)) throw new Error('Evidencia desactualizada: npm run verify');
const environment = await json('postman/local.postman_environment.json');
if (environment.values.some(x=>x.key !== 'baseUrl' && x.value !== '')) throw new Error('Ambiente exportado contiene valores runtime');
const collection = await json('postman/pedidos.postman_collection.json');
if (JSON.stringify(collection.item.filter(x=>/^TC\d{2} \|/.test(x.name)).map(x=>x.name.slice(0,4)))!==JSON.stringify(cases.map(x=>x.id))) throw new Error('Matriz y colección desalineadas');

const excluded = new Set(['node_modules','.git','.local','tmp','__pycache__']);
const files = [];
async function walk(dir = '') {
  for (const entry of await readdir(dir || '.', { withFileTypes: true })) {
    const path = dir ? `${dir}/${entry.name}` : entry.name;
    if (entry.isDirectory()) { if (!excluded.has(entry.name) && path !== 'entrega/proyecto-pedidos') await walk(path); }
    else if (!(dir === '' && entry.name.endsWith('.docx')) && path !== 'entrega/informe.pdf' && !entry.name.endsWith('.zip') && !/-preview(?:-\d+)?\.png$/.test(entry.name) && !entry.name.endsWith('.log') && entry.name !== '.env' && !entry.name.startsWith('.env.')) files.push(path);
  }
}
await walk();
const tokens = [];
async function collectTokens(dir) {
  try {
    for (const entry of await readdir(dir,{withFileTypes:true})) {
      const path = `${dir}/${entry.name}`;
      if (entry.isDirectory()) await collectTokens(path);
      else if(entry.name==='state.json') tokens.push(...Object.values((await json(path)).tokens));
    }
  } catch(error) { if(error.code !== 'ENOENT') throw error; }
}
await collectTokens('.local');
for(const path of files) {
  const bytes = await readFile(path);
  if(tokens.some(token=>bytes.includes(Buffer.from(token)))) throw new Error(`Sesión filtrada en ${path}`);
}
await stat('entrega/informe.docx');
await mkdir('entrega',{recursive:true});
console.log(`Entrega revisada: ${files.length} archivos; sin sesiones conocidas. No se genera ZIP.`);

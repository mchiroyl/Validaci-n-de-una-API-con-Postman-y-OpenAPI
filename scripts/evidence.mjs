import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { prepareData } from '../src/api.mjs';
import { runCollection } from './run.mjs';
import { setDefect, goodLine, badLine } from './defect.mjs';

const original = await readFile('src/api.mjs','utf8');
if (!original.includes(goodLine) || original.includes(badLine)) throw new Error('Comience con API corregida: node scripts/defect.mjs off');
const contractBefore = await readFile('openapi/openapi.json','utf8');
let server;
async function run(label) {
  const dataDir = resolve('.local', label);
  await prepareData(dataDir);
  // Fresh module reads the actual source file, including the temporary patch.
  const { createApi } = await import(pathToFileURL(resolve('src/api.mjs')).href + '?run=' + label + Date.now());
  server = await createApi({ dataDir });
  await new Promise((resolve, reject) => { server.once('error',reject); server.listen(0,'127.0.0.1',resolve); });
  try { return await runCollection({ baseUrl: `http://127.0.0.1:${server.address().port}`, label }); }
  finally { await new Promise(resolve => server.close(resolve)); }
}
try {
  const baseline = await run('01-base');
  if (baseline.exitCode !== 0) throw new Error('La ejecución base no pasa; revisar evidence/01-base.txt');
  await setDefect(true);
  await writeFile('evidence/defecto-controlado.patch', `--- a/src/api.mjs\n+++ b/src/api.mjs\n@@ GET /orders/{id}: incompatibilidad local @@\n-${goodLine}\n+${badLine}\n`);
  const broken = await run('02-fallo-controlado');
  const tc04 = broken.cases.find(x => x.id === 'TC04');
  if (broken.exitCode !== 1 || broken.casesExecuted !== 12 || !tc04?.assertions.some(x=>x.name.includes('esquema Order') && !x.passed)) throw new Error('El defecto no activó el detector esperado TC04');
  await setDefect(false);
  const corrected = await run('03-corregida');
  if (corrected.exitCode !== 0 || corrected.casesExecuted !== 12) throw new Error('La corrección no pasa todos los casos');
  if (await readFile('openapi/openapi.json','utf8') !== contractBefore) throw new Error('El contrato fue alterado');
  if (baseline.apiSourceSha256 !== corrected.apiSourceSha256 || baseline.contractSha256 !== broken.contractSha256 || baseline.contractSha256 !== corrected.contractSha256) throw new Error('Huellas de corrección/contrato no coinciden');
  const summary = {
    generatedAt: new Date().toISOString(), expectedCases: 12,
    baseline: { passed: baseline.casesPassed, failed: baseline.casesFailed, assertions: baseline.assertions, exitCode: baseline.exitCode },
    broken: { passed: broken.casesPassed, failed: broken.casesFailed, assertions: broken.assertions, assertionFailures: broken.assertionFailures, exitCode: broken.exitCode, detectedBy: 'TC04 | esquema Order' },
    corrected: { passed: corrected.casesPassed, failed: corrected.casesFailed, assertions: corrected.assertions, exitCode: corrected.exitCode },
    contractUnchanged: true, sourceRestored: true, contractSha256: baseline.contractSha256
  };
  await writeFile('evidence/resumen.json', JSON.stringify(summary,null,2)+'\n');
  console.log('Demostración completada: defecto real en src/api.mjs, TC04 falla, fuente restaurada y contrato intacto.');
} finally {
  if (await readFile('src/api.mjs','utf8') !== original) await writeFile('src/api.mjs',original);
}

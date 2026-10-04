import newman from 'newman';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import SwaggerParser from '@apidevtools/swagger-parser';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { summarizeExecutions } from './summarize.mjs';

const readJson = async path => JSON.parse(await readFile(path, 'utf8'));
const hash = text => createHash('sha256').update(text).digest('hex');
function inline(value, spec) {
  if (Array.isArray(value)) return value.map(x => inline(x, spec));
  if (value && typeof value === 'object') {
    if (value.$ref) return inline(spec.components.schemas[value.$ref.split('/').at(-1)], spec);
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, inline(v, spec)]));
  }
  return value;
}
const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const scrub = value => JSON.parse(JSON.stringify(value).replace(/\b[a-f0-9]{64}\b/gi, '[REDACTED-64HEX]'));

export async function runCollection({ baseUrl = 'http://127.0.0.1:3000', label = 'manual', outputDir = 'evidence' } = {}) {
  if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(baseUrl)) throw new Error('El runner solo admite la API loopback de demostración');
  const source = await readFile('openapi/openapi.json', 'utf8');
  const spec = JSON.parse(source);
  // Validate document structure, separately from response payload validation.
  await SwaggerParser.validate(JSON.parse(source));
  const collection = await readJson('postman/pedidos.postman_collection.json');
  const schemas = JSON.parse(collection.variable.find(x => x.key === 'schemas').value);
  if (JSON.stringify(schemas) !== JSON.stringify(inline(spec.components.schemas, spec))) throw new Error('Colección desactualizada respecto a OpenAPI: ejecute npm run generate');
  const environment = await readJson('postman/local.postman_environment.json');
  environment.values.find(x => x.key === 'baseUrl').value = baseUrl;
  const samples = [];
  const primaryStatuses = new Map();
  const itemVisits = [];
  let activeItem;
  const summary = await new Promise((resolve, reject) => {
    const runner = newman.run({ collection, environment, reporters: [], iterationCount: 1, timeoutRequest: 5000, timeoutScript: 15000, insecure: false }, (error, result) => error ? reject(error) : resolve(result));
    runner.on('beforeItem', (error, args) => { activeItem = args.item.name; itemVisits.push(activeItem); });
    runner.on('request', (error, args) => {
      if (error) {
        samples.push({ operation: 'transport', status: 0, error: String(error.message) });
        return;
      }
      const path = new URL(args.request.url.toString()).pathname;
      if (!primaryStatuses.has(activeItem)) primaryStatuses.set(activeItem, args.response.code);
      // Fixture tokens never leave memory. Skip its response body and all request headers.
      if (!path.startsWith('/orders')) return;
      let body;
      try { body = args.response.json(); } catch { body = { unparseable: true }; }
      samples.push({ operation: `${args.request.method} ${path}`, status: args.response.code, contentType: args.response.headers.get('Content-Type'), body });
    });
  });
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  const validations = samples.map(sample => {
    const [method, path] = sample.operation.split(' ');
    const template = path === '/orders' ? '/orders' : path?.endsWith('/confirmation') ? '/orders/{id}/confirmation' : '/orders/{id}';
    const responseSchema = spec.paths[template]?.[method.toLowerCase()]?.responses[sample.status]?.content?.['application/json']?.schema;
    if (!responseSchema) return { operation: sample.operation, status: sample.status, valid: false, errors: [{ message: 'Estado u operación no documentado' }] };
    const validate = ajv.compile(inline(responseSchema, spec));
    const valid = validate(sample.body) && /^application\/json/.test(sample.contentType || '');
    return { operation: sample.operation, status: sample.status, valid, errors: validate.errors || [] };
  });
  const executions = summarizeExecutions(summary.run.executions, primaryStatuses);
  const cases = executions.filter(x => /^TC\d{2} \|/.test(x.name)).map(x => ({ id: x.name.slice(0, 4), name: x.name, status: x.status, passed: x.assertions.length > 0 && x.assertions.every(a => a.passed), assertions: x.assertions }));
  const expectedIds = Array.from({ length: 12 }, (_, i) => `TC${String(i+1).padStart(2,'0')}`);
  const ids = itemVisits.filter(x=>/^TC\d{2} \|/.test(x)).map(x=>x.slice(0,4));
  const complete = JSON.stringify(ids) === JSON.stringify(expectedIds);
  const assertionFailures = executions.flatMap(x => x.assertions.filter(a => !a.passed).map(a => ({ request: x.name, ...a })));
  const failureSummaries = summary.run.failures.map(f => ({ source: f.source?.name, name: f.error?.name, message: f.error?.message }));
  const exitCode = !complete || assertionFailures.length || failureSummaries.length || validations.some(x => !x.valid) ? 1 : 0;
  const pkg = await readJson('package.json');
  const report = {
    label, executedAt: new Date().toISOString(), timezone: 'America/Guatemala', node: process.version,
    dependencies: pkg.devDependencies, collectionFormat: '2.1.0', openapi: spec.openapi,
    contractSha256: hash(source), apiSourceSha256: hash(await readFile('src/api.mjs','utf8')),
    documentValidation: 'SwaggerParser.validate: PASS (estructura del documento)',
    responseValidation: 'Ajv 2020: cuerpo por operación y estado documentados; no validación integral OpenAPI',
    casesExecuted: cases.length, casesPassed: cases.filter(x => x.passed).length, casesFailed: cases.filter(x => !x.passed).length,
    exactIds: complete, primaryRequests: itemVisits.length, responseSamples: samples.length,
    assertions: executions.reduce((sum,x)=>sum+x.assertions.length,0), assertionFailures: assertionFailures.length,
    responseSchemaFailures: validations.filter(x=>!x.valid).length, exitCode, cases, executions,
    failures: failureSummaries, schemaValidation: validations, responseSamplesSanitized: samples
  };
  const safeReport = scrub(report);
  // Restore fingerprints, which are hashes of public artifacts, not authentication tokens.
  safeReport.contractSha256 = report.contractSha256;
  safeReport.apiSourceSha256 = report.apiSourceSha256;
  await mkdir(outputDir, { recursive: true });
  await writeFile(`${outputDir}/${label}.json`, JSON.stringify(safeReport,null,2)+'\n');
  const text = [
    `VALIDACIÓN API PEDIDOS - ${label}`, `Fecha UTC: ${report.executedAt}`,
    `Node ${report.node} | Newman ${pkg.devDependencies.newman} | Colección 2.1.0 | OpenAPI ${spec.openapi}`,
    `Casos ejecutados: ${report.casesExecuted}/12 | aprobados: ${report.casesPassed} | fallidos: ${report.casesFailed}`,
    `Solicitudes principales: ${report.primaryRequests} (12 casos + SETUP + CLEANUP)`,
    `Interacciones de pedidos con validación adicional: ${report.responseSamples}`,
    `Aserciones: ${report.assertions} | fallidas: ${report.assertionFailures} | cuerpos incompatibles Ajv: ${report.responseSchemaFailures}`,
    `Salida equivalente del runner: ${exitCode}`, `SHA256 contrato: ${report.contractSha256}`, `SHA256 API: ${report.apiSourceSha256}`,
    '', ...safeReport.executions.flatMap(x=>[`${x.name} | HTTP ${x.status}`, ...x.assertions.map(a=>`  ${a.passed ? 'PASS' : 'FAIL'} ${a.name}${a.message ? ' -> '+a.message : ''}`)]),
    '', ...safeReport.schemaValidation.filter(x=>!x.valid).map(x=>`AJV FAIL ${x.operation} HTTP ${x.status}: ${JSON.stringify(x.errors)}`),
    '', 'Alcance: aserciones funcionales y validación de cuerpos. No certifica todas las operaciones o reglas de OpenAPI.'
  ].join('\n');
  await writeFile(`${outputDir}/${label}.txt`, text+'\n');
  await writeFile(`${outputDir}/${label}.html`, `<!doctype html><html lang="es"><meta charset="utf-8"><title>Evidencia ${escapeHtml(label)}</title><style>body{font:16px system-ui;margin:32px;background:#f4f6fa;color:#172437}h1{font-size:25px}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:white;padding:24px;border:1px solid #d5dce6;border-radius:12px;line-height:1.5}</style><h1>Ejecución real: ${escapeHtml(label)}</h1><pre>${escapeHtml(text)}</pre></html>`);
  console.log(`[${label}] ${report.casesExecuted}/12 casos; ${report.casesPassed} aprobados, ${report.casesFailed} fallidos; ${report.assertions} aserciones, ${report.assertionFailures} fallidas; salida ${exitCode}`);
  for (const failure of assertionFailures) console.log(`  FAIL ${failure.request}: ${failure.name}`);
  return report;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const report = await runCollection();
  process.exitCode = report.exitCode;
}

import { spawnSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';

const localBinary = '.local/tools/postman-cli/postman-cli.exe';
const executable = process.env.POSTMAN_CLI_PATH || (process.platform === 'win32' && existsSync(localBinary) ? localBinary : 'postman');
const version = spawnSync(executable, ['--version'], { encoding: 'utf8', shell: false });
if (version.error || version.status !== 0) throw new Error('Instale Postman CLI desde su sitio oficial o configure POSTMAN_CLI_PATH.');
const args = ['collection', 'run', 'postman/pedidos.postman_collection.json', '-e', 'postman/local.postman_environment.json', '--no-report-events', '-r', 'cli'];
const started = new Date().toISOString();
const result = spawnSync(executable, args, { encoding: 'utf8', shell: false, timeout: 180000, maxBuffer: 4 * 1024 * 1024 });
if (result.error) throw new Error('No se pudo completar Postman CLI: ' + result.error.code);
const output = (result.stdout + result.stderr).replace(/\u001b\[[0-9;]*m/g, '');
// Never export plausible session values. Raw reports and environments are not requested.
if (/\b[a-f0-9]{64}\b/i.test(output)) throw new Error('Salida pendiente de revisión por posible valor de sesión; no se exportó.');
const ids = [...output.matchAll(/^Root (TC\d{2}) \|/gm)].map(match => match[1]);
const expected = Array.from({length:12},(_,i)=>`TC${String(i+1).padStart(2,'0')}`);
const passed = (output.match(/^\s+Pass\s+/gm) || []).length;
const stats = output.match(/\|\s*assertions\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|/);
const valid = result.status === 0 && JSON.stringify(ids) === JSON.stringify(expected) && stats && Number(stats[1]) === 91 && Number(stats[2]) === 0 && passed === 91;
const report = { executedAt: started, version: version.stdout.trim(), command: 'postman ' + args.join(' '), ids, cases: ids.length, assertions: stats ? Number(stats[1]) : null, failedAssertions: stats ? Number(stats[2]) : null, exitCode: result.status, verified: Boolean(valid), cloudUpload: false };
writeFileSync('evidence/postman-cli.txt', output);
writeFileSync('evidence/postman-cli.json', JSON.stringify(report,null,2)+'\n');
console.log(`Postman CLI ${report.version}: ${report.cases}/12 casos; ${report.assertions} aserciones; ${report.failedAssertions} fallidas; salida ${report.exitCode}.`);
process.exitCode = valid ? 0 : 1;

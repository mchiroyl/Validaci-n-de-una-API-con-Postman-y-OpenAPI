import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
export const goodLine = "          if (!match[2] && req.method === 'GET') return send(200, order);";
export const badLine = "          if (!match[2] && req.method === 'GET') return send(200, { ...order, total: String(order.total) });";
export async function setDefect(enabled) {
  const path = 'src/api.mjs';
  const source = await readFile(path, 'utf8');
  const from = enabled ? goodLine : badLine;
  const to = enabled ? badLine : goodLine;
  if (source.includes(to)) return;
  if (!source.includes(from)) throw new Error('Línea objetivo no coincide; no se modificó el archivo');
  await writeFile(path, source.replace(from, to));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!['on', 'off'].includes(process.argv[2])) throw new Error('Uso: node scripts/defect.mjs on|off');
  await setDefect(process.argv[2] === 'on');
  console.log(`Defecto ${process.argv[2] === 'on' ? 'introducido' : 'corregido'} en src/api.mjs. Reinicie la API para cargar el cambio. OpenAPI intacto.`);
}

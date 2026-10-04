import { createServer } from 'node:http';
import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { resolve, join } from 'node:path';

export const defaultDataDir = resolve('.local');
const timestamp = () => new Date().toISOString();
function draft(owner, quantity = 1) {
  return { id: randomUUID(), owner, product: 'CUADERNO', quantity, total: quantity * 25, status: 'draft', confirmationCount: 0, createdAt: timestamp(), confirmedAt: null };
}
async function save(dir, state) {
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'state.tmp.json'), JSON.stringify(state, null, 2));
  await rename(join(dir, 'state.tmp.json'), join(dir, 'state.json'));
}
export async function prepareData(dir = defaultDataDir) {
  const state = { tokens: { usuario_a: randomBytes(32).toString('hex'), usuario_b: randomBytes(32).toString('hex') }, orders: [draft('usuario_a', 1), draft('usuario_a', 2), draft('usuario_a', 3), draft('usuario_b', 1)] };
  await save(dir, state);
  return state;
}
class ApiError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}
const fail = (status, code, message) => { throw new ApiError(status, code, message); };
async function readBody(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (Buffer.byteLength(raw) > 16384) fail(413, 'PAYLOAD_TOO_LARGE', 'Cuerpo mayor de 16 KiB');
  }
  if (!raw) return undefined;
  if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) fail(415, 'UNSUPPORTED_MEDIA_TYPE', 'Use application/json');
  try { return JSON.parse(raw); } catch { fail(400, 'VALIDATION_ERROR', 'JSON mal formado'); }
}
function authenticate(req, state) {
  const supplied = /^Bearer ([a-f0-9]{64})$/.exec(req.headers.authorization || '')?.[1];
  if (supplied) {
    for (const [user, token] of Object.entries(state.tokens)) {
      if (timingSafeEqual(Buffer.from(supplied), Buffer.from(token))) return user;
    }
  }
  fail(401, 'UNAUTHORIZED', 'Credenciales ausentes o inválidas');
}
function owned(state, id, user) {
  const order = state.orders.find(x => x.id === id);
  if (!order) fail(404, 'NOT_FOUND', 'Pedido inexistente');
  if (order.owner !== user) fail(403, 'FORBIDDEN', 'Pedido de otro usuario');
  return order;
}
function pagination(params) {
  if ([...params.keys()].some(k => !['page', 'limit'].includes(k)) || ['page', 'limit'].some(k => params.getAll(k).length > 1)) fail(400, 'VALIDATION_ERROR', 'Parámetros desconocidos o repetidos');
  const page = params.get('page') ?? '1';
  const limit = params.get('limit') ?? '2';
  if (!/^[1-9]\d*$/.test(page) || !/^[1-9]\d*$/.test(limit) || !Number.isSafeInteger(+page) || +page > 1000000 || +limit > 20) fail(400, 'VALIDATION_ERROR', 'page debe ser 1..1000000; limit 1..20');
  return { page: +page, limit: +limit };
}
export async function createApi({ dataDir = defaultDataDir } = {}) {
  let state = JSON.parse(await readFile(join(dataDir, 'state.json'), 'utf8'));
  let queue = Promise.resolve();
  const server = createServer((req, res) => {
    // Serialize the complete transaction, including body reads and disk writes.
    queue = queue.then(async () => {
      const send = (status, body, extra = {}) => {
        res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra });
        res.end(JSON.stringify(body));
      };
      try {
        const url = new URL(req.url, 'http://127.0.0.1');
        const path = url.pathname;
        if (path === '/health' && req.method === 'GET') return send(200, { status: 'ok' });
        // Demonstration-only fixture mechanism. Never bind this API to a public interface.
        if (path === '/__demo/prepare' && req.method === 'POST') {
          if (req.headers.origin) fail(403, 'FORBIDDEN', 'Preparación solo desde cliente local sin Origin');
          state = await prepareData(dataDir);
          return send(200, { users: ['usuario_a', 'usuario_b'], tokens: state.tokens, ownIds: state.orders.filter(x => x.owner === 'usuario_a').map(x => x.id), foreignId: state.orders.find(x => x.owner === 'usuario_b').id });
        }
        const user = authenticate(req, state);
        if (path === '/orders') {
          if (req.method === 'GET') {
            const { page, limit } = pagination(url.searchParams);
            const mine = state.orders.filter(x => x.owner === user);
            return send(200, { items: mine.slice((page - 1) * limit, page * limit), page, limit, total: mine.length, totalPages: Math.ceil(mine.length / limit) });
          }
          if (req.method === 'POST') {
            const body = await readBody(req);
            if (!body || Array.isArray(body) || typeof body !== 'object' || Object.keys(body).some(k => !['product', 'quantity'].includes(k)) || body.product !== 'CUADERNO' || !Number.isInteger(body.quantity) || body.quantity < 1 || body.quantity > 10) fail(400, 'VALIDATION_ERROR', 'product=CUADERNO y quantity entera de 1 a 10 son obligatorios; no se admiten campos adicionales');
            const order = draft(user, body.quantity);
            state.orders.push(order);
            await save(dataDir, state);
            return send(201, order, { Location: `/orders/${order.id}` });
          }
          fail(405, 'METHOD_NOT_ALLOWED', 'Método no permitido');
        }
        const match = /^\/orders\/([^/]+)(\/confirmation)?$/.exec(path);
        if (match) {
          if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(match[1])) fail(400, 'VALIDATION_ERROR', 'id debe ser UUID v4');
          if (url.search) fail(400, 'VALIDATION_ERROR', 'Esta operación no acepta parámetros de consulta');
          const order = owned(state, match[1], user);
          if (match[2] && req.method === 'PUT') {
            if ((await readBody(req)) !== undefined) fail(400, 'VALIDATION_ERROR', 'Confirmación no acepta cuerpo');
            if (order.status === 'draft') {
              order.status = 'confirmed'; order.confirmationCount = 1; order.confirmedAt = timestamp();
              await save(dataDir, state);
            }
            return send(200, order);
          }
          if (!match[2] && req.method === 'GET') return send(200, order);
          if (!match[2] && req.method === 'DELETE') {
            state.orders = state.orders.filter(x => x.id !== order.id);
            await save(dataDir, state);
            return send(200, { deleted: true, id: order.id });
          }
          fail(405, 'METHOD_NOT_ALLOWED', 'Método no permitido');
        }
        fail(404, 'NOT_FOUND', 'Ruta inexistente');
      } catch (error) {
        send(error.status || 500, { error: { code: error.code && error.status ? error.code : 'INTERNAL_ERROR', message: error.status ? error.message : 'Error interno' } }, error.status === 401 ? { 'WWW-Authenticate': 'Bearer' } : {});
      }
    }).catch(() => { if (!res.writableEnded) res.end(); });
  });
  return server;
}

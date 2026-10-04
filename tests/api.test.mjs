import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('API real: permisos, validación, paginación, persistencia e idempotencia', async () => {
  const { createApi, prepareData } = await import('../src/api.mjs');
  const dir = await mkdtemp(join(tmpdir(), 'pedidos-test-'));
  let server;
  try {
    const state = await prepareData(dir);
    server = await createApi({ dataDir: dir });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    let base = `http://127.0.0.1:${server.address().port}`;
    const call = async (path, method = 'GET', body, token = state.tokens.usuario_a) => {
      const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      return { status: response.status, body: await response.json() };
    };
    const input = { product: 'CUADERNO', quantity: 2 };
    const created = await call('/orders', 'POST', input);
    assert.equal(created.status, 201);
    assert.equal(created.body.total, 50);
    assert.equal((await call(`/orders/${created.body.id}`)).body.quantity, 2);
    assert.equal((await call(`/orders/${created.body.id}`, 'GET', undefined, state.tokens.usuario_b)).status, 403);
    assert.equal((await call('/orders', 'GET', undefined, '')).status, 401);
    assert.equal((await call('/orders', 'GET', undefined, 'invalid')).status, 401);
    for (const body of [{ product: 'CUADERNO' }, { ...input, quantity: 0 }, { ...input, quantity: 1.5 }, { ...input, quantity: '2' }, { ...input, total: 1 }]) {
      assert.equal((await call('/orders', 'POST', body)).status, 400);
    }
    for (const query of ['page=0', 'limit=21', 'page=abc', 'page=1&page=2', 'other=x']) {
      assert.equal((await call(`/orders?${query}`)).status, 400);
    }
    const first = await call('/orders?page=1&limit=2');
    const second = await call('/orders?page=2&limit=2');
    assert.equal(first.body.total, 4);
    assert.equal(first.body.items.length, 2);
    assert.equal(second.body.items.length, 2);
    assert.equal(first.body.items.some(x => second.body.items.some(y => x.id === y.id)), false);
    assert.equal((await call('/orders?page=99&limit=2')).body.items.length, 0);
    assert.equal((await call('/orders/00000000-0000-4000-8000-000000000000')).status, 404);
    assert.equal((await call(`/orders/${created.body.id}/confirmation`, 'PUT', {})).status, 400);
    const confirmed = await call(`/orders/${created.body.id}/confirmation`, 'PUT');
    const repeated = await call(`/orders/${created.body.id}/confirmation`, 'PUT');
    assert.equal(confirmed.status, 200);
    assert.equal(confirmed.body.confirmationCount, 1);
    assert.deepEqual(repeated.body, confirmed.body);
    await new Promise(resolve => server.close(resolve));
    server = await createApi({ dataDir: dir });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    base = `http://127.0.0.1:${server.address().port}`;
    const persisted = await call(`/orders/${created.body.id}`);
    assert.equal(persisted.body.confirmationCount, 1);
    assert.equal(persisted.body.confirmedAt, confirmed.body.confirmedAt);
    const disk = JSON.parse(await readFile(join(dir, 'state.json'), 'utf8'));
    assert.equal(disk.orders.find(x => x.id === created.body.id).confirmationCount, 1);
    assert.equal((await call(`/orders/${created.body.id}`, 'DELETE')).status, 200);
    assert.equal((await call(`/orders/${created.body.id}`)).status, 404);
  } finally {
    if (server?.listening) await new Promise(resolve => server.close(resolve));
    await rm(dir, { recursive: true, force: true });
  }
});

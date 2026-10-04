import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarizeExecutions } from '../scripts/summarize.mjs';
test('Una lectura auxiliar no duplica el caso ni oculta su fallo o estado principal', () => {
  const item = { name: 'TC03 | creación' };
  const raw = [
    { item, response: { code: 200 }, assertions: [{ assertion: 'TC03 | estado 201' }, { assertion: 'TC03 | esquema', error: { message: 'wrong type' } }] },
    { item, response: { code: 200 }, assertions: [{ assertion: 'TC03 | estado 201' }, { assertion: 'TC03 | lectura final' }] }
  ];
  const grouped = summarizeExecutions(raw, new Map([[item.name, 201]]));
  assert.equal(grouped.length, 1);
  assert.equal(grouped[0].status, 201);
  assert.equal(grouped[0].assertions.length, 3);
  assert.equal(grouped[0].assertions.find(a=>a.name.endsWith('esquema')).passed, false);
});

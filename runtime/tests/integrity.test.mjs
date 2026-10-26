import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { measureExecution } from '../adapter.mjs';
import { generation, testConfig, sseReply, view } from './helpers.mjs';

const text = 'été 😀';
const final = () => ({ response_text: text, response_length: [...text].length,
  response_bytes: Buffer.byteLength(text), response_sha256: createHash('sha256').update(text).digest('hex'),
  measurement_status: 'incomplete', score: null });
async function run(done, chunks = [{ content: text }]) {
  let calls = 0;
  const raw = chunks.map(c => `event: chunk\ndata: ${JSON.stringify(c)}\n\n`).join('') +
    `event: done\ndata: ${JSON.stringify(done)}\n\n`;
  const result = await measureExecution(generation(), { config: testConfig(),
    fetchImpl: async () => { calls++; return sseReply(raw, { fragmentBytes: 1 }); } });
  assert.equal(calls, 1);
  assert.deepEqual(view(result.response), done);
  return result;
}
test('SSE verifies Unicode assembly and all supplied integrity fields without modifying the payload', async () => {
  const r = await run(final());
  assert.equal(r.adapter_error, null);
  assert.equal(r.integrity.status, 'verified');
  assert.equal(r.response.score, null);
  assert.equal(r.validation.contract, 'not_validated');
});
for (const [key, value] of [['response_text', 'different'], ['response_length', 1],
  ['response_bytes', 1], ['response_sha256', 'bad']]) {
  test(`SSE rejects a mismatched ${key}, retaining the raw server evidence`, async () => {
    const r = await run({ ...final(), [key]: value });
    assert.equal(r.adapter_error?.code, 'SSE_INTEGRITY_INVALID');
    assert.equal(r.validation.transport, 'not_validated');
    assert.equal(r.integrity.status, 'failed');
  });
}
test('server-declared interruption cannot be a transport success', async () => {
  const r = await run({ ...final(), stream_interrupted: true });
  assert.equal(r.adapter_error?.code, 'SSE_INTERRUPTED');
});
test('missing integrity fields are not invented and an opaque historical done stays supported', async () => {
  const r = await run({ state: 'partial', value: null });
  assert.equal(r.adapter_error, null);
  assert.equal(r.integrity.status, 'not_assessed');
  assert.ok(r.integrity.missing.includes('response_text'));
});
test('a recap without recognized chunk text cannot claim complete assembly verification', async () => {
  const r = await run(final(), [{ opaque: null }]);
  assert.equal(r.integrity.status, 'not_assessed');
  assert.ok(r.integrity.missing.includes('chunk_content'));
});
test('invalid known chunk content is a protocol failure', async () => {
  const r = await measureExecution(generation(), { config: testConfig(), fetchImpl: async () =>
    sseReply('event: chunk\ndata: {"content":null}\n\nevent: done\ndata: {}\n\n') });
  assert.equal(r.adapter_error?.code, 'SSE_INTEGRITY_INVALID');
});

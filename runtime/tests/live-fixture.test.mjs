import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { measureExecution } from '../adapter.mjs';
import { matches, outputSchema } from '../contract.mjs';
import { createMcpServer } from '../server.mjs';
import { AgentMcpClient } from '../examples/agent-client.mjs';
import { apiMock, generation, jsonReply, sseReply, testConfig, view } from './helpers.mjs';

// Historical anonymized observation only. No environment credentials or live API.
// SSE framing is reconstructed for replay; it is not an original byte capture.
const fixture = JSON.parse(readFileSync(new URL('../LIVE_API_RESULT.json', import.meta.url), 'utf8'));
const stream = fixture.events.map(e => `event: ${e.event}\ndata: ${JSON.stringify(e.data)}\n\n`).join('');
const args = { generation: Object.fromEntries(Object.entries(fixture.request).filter(([k]) => k !== 'endpoint')) };

test('real anonymized fixture preserves every event and server value with done and unknown provenance', async () => {
  const mock = apiMock(sseReply(stream, { fragmentBytes: 1, stayOpen: true }));
  const result = await measureExecution(args, { config: testConfig(), fetchImpl: mock.fetch });
  assert.equal(mock.calls.length, 1);
  assert.equal(result.adapter_error, null);
  assert.equal(matches(outputSchema, result), true);
  assert.equal(result.sse.termination, 'done');
  assert.deepEqual(view(result.sse.events.map(({event, data}) => ({event, data}))), fixture.events);
  assert.deepEqual(view(result.response), fixture.result);
  assert.equal(result.raw_response, JSON.stringify(fixture.result));
  assert.equal(result.response.response_text, 'Bonjour !');
  assert.equal(result.contract_version, null);
  assert.equal(Object.hasOwn(result.response, 'contract_version'), false);
  assert.equal(Object.hasOwn(result.response, 'token_count_source'), false);
  assert.equal(result.token_count_source, 'unknown');
  assert.deepEqual(result.validation, { transport: 'validated', contract: 'not_validated',
    metadata_gaps: ['contract_version_missing', 'token_count_source_unknown'] });
});

test('explicit provenance is preserved; absent, null and blank provenance stay unknown without payload rewriting', async () => {
  for (const source of [undefined, null, '', ' ', 'unknown', 'provider_usage', 'backend_future_source']) {
    const payload = { ...fixture.result, contract_version: 'future-version',
      ...(source === undefined ? {} : { token_count_source: source }) };
    const mock = apiMock(jsonReply(JSON.stringify(payload)));
    const result = await measureExecution({ execution: { raw_metrics: { token_count: 1, latency_ms: 1 } } },
      { config: testConfig(), fetchImpl: mock.fetch });
    assert.deepEqual(view(result.response), payload);
    assert.equal(result.token_count_source, typeof source === 'string' && source.trim() ? source : 'unknown');
    assert.equal(result.contract_version, 'future-version');
    assert.equal(result.validation.transport, 'validated');
    assert.equal(result.validation.contract, result.token_count_source === 'unknown' ? 'not_validated' : 'not_assessed');
  }
});

test('partial SSE and HTTP errors cannot validate transport and never trigger a retry', async () => {
  for (const reply of [sseReply(stream.slice(0, stream.indexOf('event: done'))), jsonReply('{}', 503)]) {
    const mock = apiMock(reply);
    const result = await measureExecution(generation(), { config: testConfig(), fetchImpl: mock.fetch });
    assert.equal(mock.calls.length, 1);
    assert.notEqual(result.adapter_error, null);
    assert.equal(result.validation.transport, 'not_validated');
    assert.equal(result.validation.contract, 'not_assessed');
    assert.equal(result.contract_version, null);
    assert.equal(result.token_count_source, 'unknown');
    assert.equal(matches(outputSchema, result), true);
  }
});

test('intermediate chunk provenance is not mistaken for final token provenance; literal DONE remains supported', async () => {
  const mock = apiMock(sseReply('event: chunk\ndata: {"token_count_source":"chunk_counter"}\n\ndata: [DONE]\n\n'));
  const result = await measureExecution(generation(), { config: testConfig(), fetchImpl: mock.fetch });
  assert.equal(result.token_count_source, 'unknown');
  assert.equal(result.sse.events[0].data.token_count_source, 'chunk_counter');
  assert.equal(result.response, null);
  assert.equal(result.validation.transport, 'validated');
});

test('MCP fixture replay succeeds despite punctuation and incomplete contract metadata', async t => {
  let calls = 0;
  const config = testConfig();
  const app = createMcpServer({ config, fetchImpl: async () => { calls++; return sseReply(stream); } });
  t.after(() => app.close());
  const client = new AgentMcpClient({ endpoint: await app.listen(0), apiKey: config.mcpKey });
  await client.connect();
  const result = await client.measure(args);
  assert.equal(calls, 1);
  assert.equal(result.isError, false);
  assert.deepEqual(view(result.structuredContent.response), fixture.result);
  assert.equal(result.structuredContent.validation.transport, 'validated');
  assert.equal(result.structuredContent.validation.contract, 'not_validated');
  assert.deepEqual(JSON.parse(result.content[0].text), view(result.structuredContent));
  await client.close();
});

import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createMcpServer } from '../server.mjs';
import { AgentMcpClient } from '../examples/agent-client.mjs';
import { execution, generation, jsonReply, sseReply, syntheticMeasurement, testConfig, view } from './helpers.mjs';

async function start(t, fetchImpl = async () => jsonReply('{}'), overrides = {}) {
  const config = testConfig(overrides);
  const app = createMcpServer({ config, fetchImpl });
  const endpoint = await app.listen(0);
  t.after(() => app.close());
  const client = new AgentMcpClient({ endpoint, apiKey: config.mcpKey });
  await client.connect();
  return { config, app, endpoint, client };
}
const post = (endpoint, body, headers) => fetch(endpoint, {
  method: 'POST', headers, body: typeof body === 'string' ? body : JSON.stringify(body),
  signal: AbortSignal.timeout(3000),
});
const init = () => ({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {
  protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'synthetic-test', version: '1' },
} });

test('real local Streamable HTTP lifecycle advertises exactly one tool and preserves the mocked API response', async (t) => {
  const expected = syntheticMeasurement();
  let calls = 0;
  const { client } = await start(t, async (url, options) => {
    calls++;
    assert.equal(url, testConfig().baseUrl + '/v1/govern');
    assert.deepEqual(JSON.parse(options.body), execution().execution);
    return jsonReply(JSON.stringify(expected));
  });
  const listed = await client.listTools();
  assert.equal(listed.length, 1);
  assert.equal(listed[0].name, 'measure_execution');
  assert.equal(listed[0].inputSchema.additionalProperties, false);
  assert.equal(listed[0].outputSchema.properties.response.additionalProperties, true);
  const measured = await client.measure(execution());
  assert.equal(measured.isError, false);
  assert.deepEqual(view(measured.structuredContent.response), expected);
  assert.deepEqual(JSON.parse(measured.content[0].text), view(measured.structuredContent));
  assert.equal(calls, 1);
  assert.deepEqual(view(await client.request('ping')), {});
  await client.close();
});

test('authentication is required on initialization, GET, DELETE and all tool calls', async (t) => {
  let calls = 0;
  const { endpoint, client } = await start(t, async () => { calls++; return jsonReply('{}'); });
  for (const method of ['GET', 'DELETE', 'POST']) {
    const response = await fetch(endpoint, { method, ...(method === 'POST' ? { body: JSON.stringify(init()) } : {}) });
    assert.equal(response.status, 401);
    assert.equal((await response.json()).error, 'unauthorized');
  }
  const invalid = await post(endpoint, { jsonrpc: '2.0', id: 2, method: 'tools/list' }, { ...client.headers(), Authorization: 'Bearer wrong-synthetic-value' });
  assert.equal(invalid.status, 401);
  assert.equal(calls, 0);
});

test('Origin and Host validation rejects rebinding and browser cross-origin requests before API access', async (t) => {
  const { endpoint, client } = await start(t);
  for (const header of [{ Origin: 'https://untrusted.invalid' }, { Origin: 'null' }]) {
    const response = await post(endpoint, { jsonrpc: '2.0', id: 2, method: 'ping' }, { ...client.headers(), ...header });
    assert.equal(response.status, 403);
    await response.text();
  }
  // fetch controls Host itself; use an actual raw HTTP header for this test.
  const status = await new Promise((resolve, reject) => {
    const request = http.request(endpoint, { method: 'POST', headers: { ...client.headers(), Host: 'untrusted.invalid' } }, (response) => {
      response.resume(); response.on('end', () => resolve(response.statusCode));
    });
    request.on('error', reject);
    request.end(JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'ping' }));
  });
  assert.equal(status, 403);
});

test('GET event stream is explicitly unsupported; Streamable HTTP JSON POST remains available', async (t) => {
  const { endpoint, client } = await start(t);
  const response = await fetch(endpoint, { headers: client.headers() });
  assert.equal(response.status, 405);
  assert.equal(response.headers.get('allow'), 'POST, DELETE');
  await response.text();
  assert.equal((await client.listTools()).length, 1);
});

test('MCP content negotiation, malformed JSON, batches and unrepresentable numbers fail before the API', async (t) => {
  let calls = 0;
  const { endpoint, client } = await start(t, async () => { calls++; return jsonReply('{}'); });
  const cases = [
    ['{}', { Accept: 'application/json' }, 406],
    ['{}', { Accept: 'application/json;q=0, text/event-stream' }, 406],
    ['{}', { 'Content-Type': 'text/plain' }, 415],
    ['{invalid}', {}, 400],
    ['[]', {}, 400],
    ['{"jsonrpc":"2.0","id":9007199254740993,"method":"ping"}', {}, 400],
    ['{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"measure_execution","arguments":{"execution":{"raw_metrics":{"token_count":1,"latency_ms":0.100000000000000001}}}}}', {}, 400],
  ];
  for (const [body, headers, status] of cases) {
    const response = await post(endpoint, body, { ...client.headers(), ...headers });
    assert.equal(response.status, status);
    await response.text();
  }
  assert.equal(calls, 0);
});

test('session and protocol identifiers are enforced and deleted sessions cannot be reused', async (t) => {
  const { endpoint, client } = await start(t);
  const body = { jsonrpc: '2.0', id: 2, method: 'tools/list' };
  const missing = client.headers(); delete missing['Mcp-Session-Id'];
  for (const [headers, expected] of [
    [missing, 400],
    [{ ...client.headers(), 'Mcp-Session-Id': 'not-a-session' }, 404],
    [{ ...client.headers(), 'MCP-Protocol-Version': 'future-unsupported-version' }, 400],
  ]) {
    const response = await post(endpoint, body, headers);
    assert.equal(response.status, expected); await response.text();
  }
  const staleHeaders = client.headers();
  await client.close();
  const response = await post(endpoint, body, staleHeaders);
  assert.equal(response.status, 404); await response.text();
});

test('unknown tools/methods and invalid tool arguments never contact NeoMundi', async (t) => {
  let calls = 0;
  const { client } = await start(t, async () => { calls++; return jsonReply('{}'); });
  await assert.rejects(client.request('tools/call', { name: 'another_tool', arguments: {} }), { code: -32602 });
  await assert.rejects(client.request('resources/list'), { code: -32601 });
  const result = await client.measure({ execution: { raw_metrics: { token_count: false, latency_ms: 1 } } });
  assert.equal(result.isError, true);
  assert.equal(result.structuredContent.adapter_error.code, 'INVALID_ARGUMENTS');
  assert.equal(calls, 0);
});

test('SSE done and [DONE] pass through an actual local MCP HTTP call', async (t) => {
  let call = 0;
  const { client } = await start(t, async () => ++call === 1 ?
    sseReply('event: done\ndata: {"state":"not_determinable","value":null,"contract_version":"raw"}\n\n') :
    sseReply('data: {"state":"not_assessed","value":null}\n\ndata: [DONE]\n\n'));
  const first = await client.measure(generation());
  const second = await client.measure(generation());
  assert.equal(first.isError, false);
  assert.equal(first.structuredContent.response.state, 'not_determinable');
  assert.equal(first.structuredContent.contract_version, 'raw');
  assert.equal(second.structuredContent.sse.events[0].data.state, 'not_assessed');
  assert.equal(second.structuredContent.response, null);
  assert.equal(second.isError, false);
  assert.equal(call, 2);
});

test('HTTP and interrupted SSE errors are MCP tool errors, not fabricated measurement statuses', async (t) => {
  let call = 0;
  const { client } = await start(t, async () => ++call === 1 ?
    jsonReply('{"detail":"synthetic failure"}', 429) : sseReply('data: {"value":null}\n\n'));
  const rateLimited = await client.measure(execution());
  assert.equal(rateLimited.isError, true);
  assert.equal(view(rateLimited.structuredContent.adapter_error).http_status, 429);
  const interrupted = await client.measure(generation());
  assert.equal(interrupted.isError, true);
  assert.equal(interrupted.structuredContent.adapter_error.code, 'SSE_INTERRUPTED');
  assert.equal(interrupted.structuredContent.response, null);
});

test('notifications/cancelled aborts only its own session even if another client has the same request ID', { timeout: 3000 }, async (t) => {
  let started;
  const bothStarted = new Promise((resolve) => { started = resolve; });
  const upstreamSignals = [];
  const { endpoint, client, config } = await start(t, async (_url, options) => {
    upstreamSignals.push(options.signal);
    if (upstreamSignals.length === 2) started();
    return new Promise(() => {});
  });
  const other = new AgentMcpClient({ endpoint, apiKey: config.mcpKey });
  await other.connect();
  const first = client.measure(execution(), { id: 50 });
  const second = other.measure(execution(), { id: 50 });
  await bothStarted;
  await client.cancel(50);
  assert.equal((await first).structuredContent.adapter_error.code, 'CANCELLED');
  assert.equal(upstreamSignals.filter((signal) => signal.aborted).length, 1);
  await other.cancel(50);
  assert.equal((await second).structuredContent.adapter_error.code, 'CANCELLED');
  assert.equal(upstreamSignals.every((signal) => signal.aborted), true);
});

test('local HTTP disconnect propagates cancellation to the pending upstream request', { timeout: 3000 }, async (t) => {
  let ready; let aborted;
  const started = new Promise((resolve) => { ready = resolve; });
  const upstreamAborted = new Promise((resolve) => { aborted = resolve; });
  const { client } = await start(t, async (_url, options) => {
    options.signal.addEventListener('abort', aborted, { once: true });
    ready();
    return new Promise(() => {});
  });
  const controller = new AbortController();
  const request = client.measure(execution(), { signal: controller.signal }).catch((error) => error);
  await started;
  controller.abort();
  await request;
  await upstreamAborted;
});

test('duplicate active IDs and concurrency limit do not duplicate measurements', { timeout: 3000 }, async (t) => {
  let ready;
  const started = new Promise((resolve) => { ready = resolve; });
  let calls = 0;
  const { client } = await start(t, async () => { calls++; ready(); return new Promise(() => {}); }, { maxConcurrent: 1 });
  const pending = client.measure(execution(), { id: 70 });
  await started;
  await assert.rejects(client.measure(execution(), { id: 70 }), { code: -32600 });
  await assert.rejects(client.measure(execution(), { id: 71 }), { status: 429 });
  await client.cancel(70);
  assert.equal((await pending).structuredContent.adapter_error.code, 'CANCELLED');
  assert.equal(calls, 1);
});

test('session limits and body size limits are enforced locally', async (t) => {
  const { endpoint, client } = await start(t, undefined, { maxSessions: 1, maxRequestBytes: 1024 });
  const headers = client.headers(); delete headers['Mcp-Session-Id']; delete headers['MCP-Protocol-Version'];
  const extra = await post(endpoint, init(), headers);
  assert.equal(extra.status, 503); await extra.text();
  const large = await post(endpoint, ' '.repeat(1100), client.headers());
  assert.equal(large.status, 413); await large.text();
});

test('a chunked oversized request gets an explicit HTTP 413 without a NeoMundi call', async (t) => {
  let calls = 0;
  const { endpoint, client } = await start(t, async () => { calls++; return jsonReply('{}'); }, { maxRequestBytes: 1024 });
  const status = await new Promise((resolve, reject) => {
    const request = http.request(endpoint, { method: 'POST', headers: { ...client.headers(), 'Transfer-Encoding': 'chunked' } }, (response) => {
      response.resume(); response.on('end', () => resolve(response.statusCode));
    });
    request.on('error', reject);
    request.write(' '.repeat(800));
    request.end(' '.repeat(800));
  });
  assert.equal(status, 413);
  assert.equal(calls, 0);
});

test('protocol negotiation, initialized notification and DELETE version are handled explicitly', async (t) => {
  const { endpoint, client } = await start(t);
  const initialHeaders = client.headers();
  delete initialHeaders['Mcp-Session-Id']; delete initialHeaders['MCP-Protocol-Version'];
  const initialization = init(); initialization.params.protocolVersion = '2025-03-26';
  const response = await post(endpoint, initialization, initialHeaders);
  const envelope = await response.json();
  assert.equal(envelope.result.protocolVersion, '2025-03-26');
  const headers = { ...initialHeaders, 'Mcp-Session-Id': response.headers.get('mcp-session-id') };
  const beforeReady = await post(endpoint, { jsonrpc: '2.0', id: 4, method: 'tools/list' }, headers);
  assert.equal((await beforeReady.json()).error.code, -32000);
  const ready = await post(endpoint, { jsonrpc: '2.0', method: 'notifications/initialized', params: {} }, headers);
  assert.equal(ready.status, 202);
  assert.equal(await ready.text(), '');
  const list = await post(endpoint, { jsonrpc: '2.0', id: 5, method: 'tools/list' }, headers);
  assert.equal((await list.json()).result.tools.length, 1);
  const badDelete = await fetch(endpoint, { method: 'DELETE', headers: { ...headers, 'MCP-Protocol-Version': 'not-supported' } });
  assert.equal(badDelete.status, 400); await badDelete.text();
  const goodDelete = await fetch(endpoint, { method: 'DELETE', headers });
  assert.equal(goodDelete.status, 204);
  initialization.params.protocolVersion = 'future-client-version';
  const negotiated = await post(endpoint, initialization, initialHeaders);
  assert.equal((await negotiated.json()).result.protocolVersion, '2025-06-18');
});

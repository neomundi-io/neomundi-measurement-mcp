import test from 'node:test';
import assert from 'node:assert/strict';
import { measureExecution } from '../adapter.mjs';
import { inputSchema, outputSchema, matches, parseInputJson } from '../contract.mjs';
import { loadConfiguration } from '../config.mjs';
import { apiMock, execution, generation, jsonReply, sseReply, syntheticMeasurement, testConfig, view } from './helpers.mjs';

async function run(args, reply, overrides = {}, signal) {
  const mocked = apiMock(reply);
  const result = await measureExecution(args, { config: testConfig(overrides), fetchImpl: mocked.fetch, signal });
  assert.equal(matches(outputSchema, result), true, 'tool envelope follows its output schema');
  return { result, calls: mocked.calls };
}

test('observation forwards exactly supplied fields, performs one real HTTP-shaped POST, and preserves the entire raw response', async () => {
  const payload = syntheticMeasurement();
  const raw = JSON.stringify(payload, null, 2);
  const args = execution();
  args.execution.llm_prompt = null;
  args.execution.rag_context = null;
  const { result, calls } = await run(args, jsonReply(raw));
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://neomundi-unit-test.invalid/v1/govern');
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(calls[0].options.redirect, 'error');
  assert.equal(calls[0].options.headers['X-API-Key'], testConfig().apiKey);
  assert.equal(calls[0].options.headers.Authorization, undefined);
  assert.deepEqual(JSON.parse(calls[0].options.body), args.execution);
  assert.equal(Object.hasOwn(JSON.parse(calls[0].options.body).raw_metrics, 'cost'), false);
  assert.deepEqual(view(result.response), payload);
  assert.equal(result.raw_response, raw);
  assert.equal(result.contract_version, payload.contract_version);
  assert.equal(result.adapter_error, null);
  assert.equal(result.sse, null);
});

test('large integers, precise decimals, negative zero and raw contract_version are never rounded on output', async () => {
  const raw = '{"large":900719925474099312345,"precise":0.123456789012345678901,"negative_zero":-0,"contract_version":null}';
  const { result } = await run(execution(), jsonReply(raw));
  assert.equal(JSON.stringify(result.response), raw);
  assert.equal(result.raw_response, raw);
  assert.equal(result.contract_version, null);
});

test('contract_version defaults to null; schema_version is not re-labelled', async () => {
  const { result } = await run(execution(), jsonReply('{"identity":{"schema_version":"0.1.0"},"runtime":null}'));
  assert.equal(result.contract_version, null);
  assert.deepEqual(view(result.response), { identity: { schema_version: '0.1.0' }, runtime: null });
});

for (const state of ['measured', 'not_measured', 'insufficient_coverage', 'complete', 'partial', 'within_bounds', 'not_assessed', 'not_determinable']) {
  test(`opaque API state ${state} and null are preserved without assessment`, async () => {
    const payload = { state, value: null, unknown: [state, null] };
    const { result } = await run(execution(), jsonReply(JSON.stringify(payload)));
    assert.deepEqual(view(result.response), payload);
    assert.equal(result.adapter_error, null);
  });
}

test('a historically inconsistent measurement is returned unchanged, without correction', async () => {
  const raw = '{"measurement_status":"complete","measurement_coverage":0.6,"value":null}';
  const { result } = await run(execution(), jsonReply(raw));
  assert.equal(JSON.stringify(result.response), raw);
  assert.equal(result.adapter_error, null);
});

const invalidInputs = [
  {}, { execution: {}, generation: { prompt: 'x' } },
  { execution: { raw_metrics: { token_count: true, latency_ms: 0 } } },
  { execution: { raw_metrics: { token_count: '1', latency_ms: 0 } } },
  { execution: { raw_metrics: { token_count: 1.5, latency_ms: 0 } } },
  { execution: { raw_metrics: { token_count: 1, latency_ms: null } } },
  { execution: { raw_metrics: { token_count: -1, latency_ms: 0 } } },
  { execution: { raw_metrics: { token_count: 1, latency_ms: -0.5 } } },
  { execution: { raw_metrics: { token_count: 1, latency_ms: 0, semantic_risk: 1.01 } } },
  { execution: { raw_metrics: { token_count: 1, latency_ms: 0, cost: null } } },
  { execution: { raw_metrics: { token_count: Number.MAX_SAFE_INTEGER + 1, latency_ms: 0 } } },
  { execution: { raw_metrics: { token_count: 1, latency_ms: Infinity } } },
  { ...execution(), remote_url: 'https://not-allowed.invalid' },
  { execution: { ...execution().execution, provider_api_key: 'forbidden-argument' } },
  { execution: { ...execution().execution, mode: 'ENF' } },
  { generation: { prompt: '' } },
  { generation: { prompt: 'x', provider_api_key: 'forbidden-argument' } },
  { generation: { prompt: 'x', temperature: 3 } },
  { generation: { prompt: 'x', max_tokens: 16385 } },
  { generation: { prompt: 'x', max_tokens: 0 } },
  { execution: { ...execution().execution, documents: [{ title: '', text: 'x' }] } },
];
test('strict input validation rejects invalid values and unknown fields without a remote call or input echo', async () => {
  for (const args of invalidInputs) {
    const { result, calls } = await run(args, () => { throw new Error('must not be called'); });
    assert.equal(calls.length, 0);
    assert.equal(result.adapter_error.code, 'INVALID_ARGUMENTS');
    assert.equal(JSON.stringify(result).includes('forbidden-argument'), false);
  }
});

test('input validation uses Unicode character lengths, nullable fields and document limits from the backend', () => {
  const args = execution();
  args.execution.llm_prompt = '😀'.repeat(10000);
  args.execution.documents = null;
  assert.equal(matches(inputSchema, args), true);
  args.execution.llm_prompt += 'x';
  assert.equal(matches(inputSchema, args), false);
  args.execution.llm_prompt = null;
  args.execution.documents = Array.from({ length: 11 }, () => ({ title: 'a', text: 'b' }));
  assert.equal(matches(inputSchema, args), false);
});

test('strict JSON input parser preserves number spelling and refuses silent IEEE-754 rounding', () => {
  assert.equal(JSON.stringify(parseInputJson('{"x":12.500,"y":1e2}')), '{"x":12.500,"y":1e2}');
  for (const raw of ['{"x":9007199254740993}', '{"x":0.100000000000000001}', '{"x":1e999}', '{"x":1e-999}']) {
    assert.throws(() => parseInputJson(raw));
  }
});

test('named done SSE supports fragmented UTF-8, CRLF, comments, id and multiline JSON', async () => {
  const raw = ': heartbeat\r\n\r\nevent: chunk\r\nid: event-one\r\ndata: {"content":"été 😀",\r\ndata: "unknown":null}\r\n\r\n' +
    'event: unfamiliar\r\ndata: {"state":"not_assessed","v":null}\r\n\r\n' +
    'event: done\r\ndata: {"contract_version":"backend-raw","state":"not_determinable","value":null,"n":9007199254740993}\r\n\r\n';
  let cancelled = false;
  const { result, calls } = await run(generation(), sseReply(raw, { fragmentBytes: 1, stayOpen: true, onCancel: () => { cancelled = true; } }));
  assert.equal(result.adapter_error, null);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://neomundi-unit-test.invalid/v1/govern/stream');
  assert.deepEqual(JSON.parse(calls[0].options.body), { ...generation().generation, provider_api_key: testConfig().providerKey });
  assert.equal(Object.hasOwn(JSON.parse(calls[0].options.body), 'temperature'), false);
  assert.equal(result.sse.termination, 'done');
  // A CR alone terminates the event. With byte-sized reads the following LF
  // has not been read when the local client closes; no framing byte is invented.
  assert.equal(result.sse.raw_stream, raw.slice(0, -1));
  assert.equal(result.sse.events.length, 3);
  assert.equal(result.sse.events[0].id, 'event-one');
  assert.equal(result.sse.events[0].data.content, 'été 😀');
  assert.equal(result.sse.events[0].data.unknown, null);
  assert.equal(result.sse.events[1].event, 'unfamiliar');
  assert.equal(result.response.state, 'not_determinable');
  assert.equal(result.contract_version, 'backend-raw');
  assert.ok(JSON.stringify(result.response).includes('9007199254740993'));
  assert.equal(cancelled, true);
});

test('[DONE] SSE is a transport terminal; no final measurement object is invented', async () => {
  const source = 'data: {"content":"texte","contract_version":null}\n\ndata: {"response_text":"texte","measurement_status":"partial"}\n\ndata: [DONE]\n\n';
  const { result } = await run(generation(), sseReply(source));
  assert.equal(result.adapter_error, null);
  assert.equal(result.sse.termination, '[DONE]');
  assert.equal(result.response, null);
  assert.equal(result.raw_response, null);
  assert.equal(result.contract_version, null);
  assert.equal(result.sse.events[1].data.measurement_status, 'partial');
  assert.equal(result.sse.events[2].data, '[DONE]');
});

test('first terminal wins when named done and [DONE] appear in the same packet', async () => {
  const source = 'event: done\ndata: {"value":null}\n\ndata: [DONE]\n\n';
  const { result } = await run(generation(), sseReply(source, { fragmentBytes: 10000 }));
  assert.equal(result.sse.termination, 'done');
  assert.deepEqual(view(result.response), { value: null });
  assert.equal(result.sse.raw_stream, source);
});

test('SSE supports an initial BOM and CR-only delimiters even without a remote close', async () => {
  const source = '\uFEFF: heartbeat\r\revent: done\rdata: {"value":null}\r\r';
  const { result } = await run(generation(), sseReply(source, { fragmentBytes: 1, stayOpen: true }));
  assert.equal(result.adapter_error, null);
  assert.equal(result.sse.termination, 'done');
  assert.equal(result.sse.raw_stream, source);
});

test('SSE error retains received raw events and never becomes a successful measurement', async () => {
  const source = 'event: chunk\ndata: {"content":"partial text"}\n\nevent: error\ndata: {"error":"synthetic provider rejection","tokens_so_far":1,"extra":null}\n\n';
  const { result } = await run(generation(), sseReply(source));
  assert.equal(result.adapter_error.code, 'SSE_ERROR');
  assert.equal(result.response, null);
  assert.equal(result.sse.termination, null);
  assert.equal(result.sse.events.length, 2);
  assert.equal(result.sse.events[1].data.extra, null);
});

for (const [label, source, code] of [
  ['EOF', 'event: chunk\ndata: {"content":"x"}\n\n', 'SSE_INTERRUPTED'],
  ['truncated terminal', 'event: done\ndata: {"x":1}', 'SSE_INTERRUPTED'],
  ['invalid JSON', 'event: chunk\ndata: {bad}\n\n', 'SSE_JSON_INVALID'],
  ['wrong final shape', 'event: done\ndata: [1,2]\n\n', 'SSE_TERMINAL_INVALID'],
]) {
  test(`SSE ${label} is explicit and not classified partial/complete`, async () => {
    const { result } = await run(generation(), sseReply(source));
    assert.equal(result.adapter_error.code, code);
    assert.equal(result.response, null);
    assert.equal(result.sse.termination, null);
  });
}

test('JSON HTTP errors preserve status without exposing upstream body or authentication', async () => {
  for (const status of [400, 401, 402, 403, 404, 413, 422, 429, 500, 503]) {
    const { result, calls } = await run(execution(), jsonReply(JSON.stringify({ error: testConfig().apiKey }), status));
    assert.equal(result.adapter_error.code, 'UPSTREAM_HTTP_ERROR');
    assert.equal(result.adapter_error.http_status, status);
    assert.equal(JSON.stringify(result).includes(testConfig().apiKey), false);
    assert.equal(calls.length, 1);
  }
});

test('wrong content type, invalid JSON and invalid UTF-8 fail explicitly', async () => {
  assert.equal((await run(execution(), new Response('{}', { headers: { 'Content-Type': 'text/html' } }))).result.adapter_error.code, 'UPSTREAM_CONTENT_TYPE');
  assert.equal((await run(execution(), jsonReply('{bad}'))).result.adapter_error.code, 'UPSTREAM_JSON_INVALID');
  assert.equal((await run(execution(), jsonReply('[1,2]'))).result.adapter_error.code, 'UPSTREAM_JSON_INVALID');
  const invalid = new Response(new Uint8Array([0xc3, 0x28]), { headers: { 'Content-Type': 'application/json' } });
  assert.equal((await run(execution(), invalid)).result.adapter_error.code, 'UTF8_INVALID');
});

test('request size, response size and SSE event count are bounded', async () => {
  assert.equal((await run(execution(), jsonReply('{}'), { maxRequestBytes: 8 })).result.adapter_error.code, 'REQUEST_TOO_LARGE');
  assert.equal((await run(execution(), jsonReply('{"long":"123456789"}'), { maxResponseBytes: 8 })).result.adapter_error.code, 'RESPONSE_TOO_LARGE');
  const source = 'data: {}\n\ndata: {}\n\ndata: [DONE]\n\n';
  assert.equal((await run(generation(), sseReply(source), { maxEvents: 1 })).result.adapter_error.code, 'RESPONSE_TOO_LARGE');
});

test('an echoed credential is withheld as a whole result, never redacted into a changed measure', async () => {
  for (const credential of [testConfig().apiKey, testConfig().providerKey, testConfig().mcpKey]) {
    const escaped = [...credential].map((char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`).join('');
    const { result } = await run(execution(), jsonReply(`{"echo":"${escaped}"}`));
    assert.equal(result.adapter_error.code, 'CREDENTIAL_DISCLOSURE');
    assert.equal(result.response, null);
    assert.equal(result.raw_response, null);
    assert.equal(JSON.stringify(result).includes(credential), false);
  }
});

test('SSE credential echo discards all received events instead of editing any event', async () => {
  const source = `event: chunk\ndata: {"x":null}\n\nevent: error\ndata: {"error":"${testConfig().providerKey}"}\n\n`;
  const { result } = await run(generation(), sseReply(source));
  assert.equal(result.adapter_error.code, 'CREDENTIAL_DISCLOSURE');
  assert.equal(result.sse, null);
});

test('idle timeout aborts a stalled SSE reader and retains earlier events', async () => {
  let cancelled = false;
  const reply = sseReply('data: {"value":null}\n\n', { stayOpen: true, onCancel: () => { cancelled = true; } });
  const { result } = await run(generation(), reply, { idleTimeoutMs: 20, totalTimeoutMs: 1000 });
  assert.equal(result.adapter_error.code, 'IDLE_TIMEOUT');
  assert.equal(result.sse.events.length, 1);
  assert.equal(cancelled, true);
});

test('global timeout aborts a pending fetch once without retrying', async () => {
  let aborted = false;
  const { result, calls } = await run(execution(), (_url, options) => {
    options.signal.addEventListener('abort', () => { aborted = true; });
    return new Promise(() => {});
  }, { totalTimeoutMs: 20, idleTimeoutMs: 1000 });
  assert.equal(result.adapter_error.code, 'TOTAL_TIMEOUT');
  assert.equal(calls.length, 1);
  assert.equal(aborted, true);
});

test('heartbeats reset inactivity but cannot extend the total SSE deadline', async () => {
  let stopped = false;
  let timer;
  const body = new ReadableStream({
    start(controller) { timer = setInterval(() => controller.enqueue(new TextEncoder().encode(': heartbeat\n\n')), 5); },
    cancel() { clearInterval(timer); stopped = true; },
  });
  const { result } = await run(generation(), new Response(body, { headers: { 'Content-Type': 'text/event-stream' } }), {
    totalTimeoutMs: 40, idleTimeoutMs: 1000,
  });
  assert.equal(result.adapter_error.code, 'TOTAL_TIMEOUT');
  assert.equal(stopped, true);
});

test('network exceptions are not echoed, and no fallback or retry is attempted', async () => {
  const { result, calls } = await run(execution(), () => { throw new Error('sensitive arbitrary upstream exception'); });
  assert.equal(result.adapter_error.code, 'NETWORK_ERROR');
  assert.equal(JSON.stringify(result).includes('sensitive arbitrary upstream exception'), false);
  assert.equal(calls.length, 1);
});

test('explicit cancellation aborts locally without fabricating a remote outcome', async () => {
  const controller = new AbortController();
  const job = run(generation(), sseReply('', { stayOpen: true }), {}, controller.signal);
  setTimeout(() => controller.abort(), 15);
  assert.equal((await job).result.adapter_error.code, 'CANCELLED');
});

test('missing provider configuration and pre-cancellation never contact the API', async () => {
  const noProvider = await run(generation(), jsonReply('{}'), { providerKey: undefined });
  assert.equal(noProvider.result.adapter_error.code, 'PROVIDER_KEY_NOT_CONFIGURED');
  assert.equal(noProvider.calls.length, 0);
  const controller = new AbortController(); controller.abort();
  const cancelled = await run(execution(), jsonReply('{}'), {}, controller.signal);
  assert.equal(cancelled.result.adapter_error.code, 'CANCELLED');
  assert.equal(cancelled.calls.length, 0);
});

test('configuration rejects insecure URLs, embedded credentials and invalid limits using artificial environment only', () => {
  const values = { NEOMUNDI_API_KEY: 'mock-api', NEOMUNDI_MCP_API_KEY: 'mock-mcp' };
  for (const url of ['http://example.invalid', 'https://user:pass@example.invalid', 'https://example.invalid/path', 'https://example.invalid/?key=value']) {
    assert.throws(() => loadConfiguration({ ...values, NEOMUNDI_API_BASE_URL: url }));
  }
  assert.throws(() => loadConfiguration({}));
  assert.throws(() => loadConfiguration({ ...values, NEOMUNDI_TIMEOUT_MS: '0' }));
  assert.throws(() => loadConfiguration({ ...values, NEOMUNDI_MCP_API_KEY: 'mock\ninjection' }));
});

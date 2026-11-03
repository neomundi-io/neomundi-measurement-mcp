import test from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { runStdio } from '../stdio.mjs';
import { jsonReply, sseReply } from './helpers.mjs';
import { CARD_RESOURCE_URI } from '../ui/card.mjs';

async function host(t, fetchImpl) {
  const input = new PassThrough(), output = new PassThrough();
  const waiting = new Map();
  let buffer = '', id = 0;
  const replies = [];
  output.on('data', bytes => {
    buffer += bytes.toString();
    let newline;
    while ((newline = buffer.indexOf('\n')) >= 0) {
      const reply = JSON.parse(buffer.slice(0, newline)); buffer = buffer.slice(newline + 1);
      replies.push(reply); waiting.get(reply.id)?.(reply); waiting.delete(reply.id);
    }
  });
  const running = runStdio({ input, output, fetchImpl, environment: {
    NEOMUNDI_API_BASE_URL: 'https://neomundi-unit-test.invalid',
    NEOMUNDI_API_KEY: 'mock-api-not-a-secret', NEOMUNDI_PROVIDER_API_KEY: 'mock-provider-not-a-secret',
  } });
  t.after(async () => { input.end(); await running; });
  function send(method, params, notify = false) {
    const request = { jsonrpc: '2.0', method, params };
    if (notify) { input.write(JSON.stringify(request) + '\n'); return; }
    request.id = ++id;
    const result = new Promise(resolve => waiting.set(id, resolve));
    input.write(JSON.stringify(request) + '\n');
    return result;
  }
  const hello = await send('initialize', { protocolVersion: '2025-06-18', capabilities: {},
    clientInfo: { name: 'stdio-test-host', version: '1' } });
  assert.equal(hello.result.protocolVersion, '2025-06-18');
  send('notifications/initialized', {}, true);
  return { send, replies, input };
}

test('stdio preserves initialization order even when notification HTTP handling is delayed', async t => {
  const originalFetch=globalThis.fetch;
  t.mock.method(globalThis,'fetch',async(url,options)=>{
    if(JSON.parse(options.body).method==='notifications/initialized') {
      await new Promise(resolve=>setTimeout(resolve,30));
    }
    return originalFetch(url,options);
  });
  let calls=0;
  const h=await host(t,async()=>{calls++;throw Error('unexpected upstream call');});
  const listed=await h.send('tools/list',{});
  assert.equal(listed.error,undefined);
  assert.equal(listed.result.tools[0].name,'measure_execution');
  assert.equal(calls,0);
});

test('stdio startup, initialize and tools/list emit only JSON-RPC and never contact the API', async t => {
  let calls = 0;
  const h = await host(t, async () => { calls++; throw Error('unexpected'); });
  const listed = await h.send('tools/list', {});
  assert.equal(listed.result.tools.length, 1);
  assert.equal(listed.result.tools[0].name, 'measure_execution');
  assert.equal(calls, 0);
});

test('stdio REST preserves raw numeric precision and performs exactly one API request', async t => {
  let calls = 0;
  const h = await host(t, async () => { calls++; return jsonReply('{"n":900719925474099312345,"value":null}'); });
  const reply = await h.send('tools/call', { name: 'measure_execution', arguments: {
    execution: { raw_metrics: { token_count: 0, latency_ms: 0 } } } });
  assert.equal(calls, 1);
  assert.equal(reply.result.isError, false);
  assert.match(reply.result.content[0].text, /900719925474099312345/);
  assert.equal(reply.result.structuredContent.response.value, null);
});

test('stdio SSE relays done and upstream errors do not create extra calls', async t => {
  let calls = 0;
  const h = await host(t, async () => { calls++; return sseReply('event: chunk\ndata: {"content":"x"}\n\nevent: done\ndata: {"response_text":"x"}\n\n'); });
  const r = await h.send('tools/call', { name: 'measure_execution', arguments: {
    generation: { prompt: 'synthetic', model: 'synthetic-model', provider: 'openai' } } });
  assert.equal(r.result.structuredContent.sse.termination, 'done');
  assert.equal(r.result.structuredContent.integrity.status, 'not_assessed');
  assert.equal(calls, 1);
  const bad = await h.send('tools/call', { name: 'measure_execution', arguments: {} });
  assert.equal(bad.result.isError, true);
  assert.equal(calls, 1);
});

test('a request still gets its answer when stdin ends immediately after it', async () => {
  // The regression this guards. `runStdio` used to close the HTTP dispatcher
  // in its `finally` BEFORE draining the requests still in flight. Closing
  // aborts in-flight calls by design, which is right for a signal and wrong
  // for end-of-input: stdin ending means the host has sent everything, not
  // that it wants the answers discarded.
  //
  // The visible effect was a -32603 transport failure for a call that had
  // already been made — and for a measurement, already been billed. This
  // connector never replays, so that answer was simply lost.
  //
  // Driving it by writing every line and ending stdin at once is exactly how
  // a smoke test or a batch client drives a stdio plugin, so the failure was
  // reachable without any host at all.
  const input = new PassThrough(), output = new PassThrough();
  let buffer = '';
  const replies = [];
  output.on('data', (bytes) => {
    buffer += bytes.toString();
    let newline;
    while ((newline = buffer.indexOf('\n')) >= 0) {
      replies.push(JSON.parse(buffer.slice(0, newline)));
      buffer = buffer.slice(newline + 1);
    }
  });
  const running = runStdio({ input, output, environment: {
    NEOMUNDI_API_BASE_URL: 'https://neomundi-unit-test.invalid',
    NEOMUNDI_API_KEY: 'mock-api-not-a-secret',
  } });
  for (const message of [
    { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'batch', version: '1' } } },
    { jsonrpc: '2.0', method: 'notifications/initialized' },
    { jsonrpc: '2.0', id: 2, method: 'tools/list' },
    { jsonrpc: '2.0', id: 3, method: 'resources/list' },
  ]) input.write(JSON.stringify(message) + '\n');
  input.end();
  await running;

  const byId = new Map(replies.filter((r) => r.id !== undefined).map((r) => [r.id, r]));
  for (const id of [1, 2, 3]) {
    assert.ok(byId.has(id), `request ${id} must receive an answer`);
    assert.equal(byId.get(id).error, undefined, `request ${id} must not fail in transport`);
  }
  assert.equal(byId.get(2).result.tools[0].name, 'measure_execution');
  // The constant, not a copy of it: the URI is a cache key that is bumped on
  // a breaking card change, and a literal here would turn that into a
  // failure in an unrelated transport test.
  assert.equal(byId.get(3).result.resources[0].uri, CARD_RESOURCE_URI);
});

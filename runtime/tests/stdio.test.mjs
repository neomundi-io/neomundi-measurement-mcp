import test from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { runStdio } from '../stdio.mjs';
import { jsonReply, sseReply } from './helpers.mjs';

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

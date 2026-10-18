// Upstream HTTP statuses, told apart. An HTTP error is a transport outcome:
// never a decision, a score, or an absence of risk.
import test from 'node:test';
import assert from 'node:assert/strict';
import { measureExecution } from '../adapter.mjs';
import { matches, outputSchema } from '../contract.mjs';
import { BILLING, CLASSIFIED_STATUSES, RETRY, classifyUpstreamStatus } from '../upstream.mjs';
import { apiMock, execution, jsonReply, testConfig, view } from './helpers.mjs';

const call = async (status, body = '{"detail":"synthetic"}') => {
  const mock = apiMock(jsonReply(body, status));
  const result = await measureExecution(execution(), { config: testConfig(), fetchImpl: mock.fetch });
  return { result, calls: mock.calls };
};

test('the statuses named in the brief are each classified distinctly', async () => {
  const expected = new Map([
    [401, 'authentication'],
    [402, 'quota_or_payment'],
    [413, 'request_too_large'],
    [422, 'invalid_request'],
    [429, 'rate_limited'],
    [500, 'server_error'],
    [503, 'service_unavailable'],
  ]);
  const seen = new Set();
  for (const [status, httpClass] of expected) {
    const { result } = await call(status);
    const upstream = view(result.adapter_error).upstream;
    assert.equal(upstream.http_status, status);
    assert.equal(upstream.class, httpClass, `status ${status}`);
    assert.ok(upstream.meaning.length > 20, `status ${status} needs a meaning`);
    assert.ok(upstream.guidance.length > 20, `status ${status} needs guidance`);
    seen.add(httpClass);
  }
  // 500 and 503 must not collapse into one class: one declares it did not
  // process the call, the other leaves the outcome unknown.
  assert.equal(seen.size, 7);
});

test('the transport taxonomy and the status classification stay separate', async () => {
  const { result } = await call(422);
  // `code` keeps its own, unchanged meaning, so existing consumers that
  // branch on it are not silently redefined.
  assert.equal(result.adapter_error.code, 'UPSTREAM_HTTP_ERROR');
  assert.equal(result.adapter_error.http_status, 422);
  assert.equal(view(result.adapter_error).upstream.class, 'invalid_request');
  assert.equal(matches(outputSchema, result), true);
});

test('billing exposure is stated only where the reference revision establishes it', async () => {
  // Established by reading the reference backend: the auth dependency raises
  // 401 and 429 before any quota debit, 402 is raised by the debit itself when
  // the quota is already exhausted, and 422 comes from body validation which
  // runs before the debit.
  for (const status of [401, 402, 403, 404, 413, 422, 429, 503]) {
    const { result } = await call(status);
    assert.equal(view(result.adapter_error).upstream.billing, BILLING.NOT_BILLED, `status ${status}`);
  }
  // A 5xx can land after the debit, and the upstream refund filters on the
  // same account-status clause that makes BL-001 misfire.
  for (const status of [500, 502, 504]) {
    const { result } = await call(status);
    assert.equal(view(result.adapter_error).upstream.billing, BILLING.UNKNOWN, `status ${status}`);
  }
});

test('no measurement call is ever retried automatically, whatever the status', async () => {
  // The invariant that matters most: POST /v1/govern is not idempotent and
  // carries no Idempotency-Key, so one accepted call creates an observation,
  // debits quota and overwrites the server-side delta_g reference.
  for (const status of [401, 402, 413, 422, 429, 500, 502, 503, 504, 418, 599]) {
    const { calls } = await call(status);
    assert.equal(calls.length, 1, `status ${status} produced ${calls.length} upstream calls`);
  }
});

test('what a caller may do is distinguished from what this adapter does', async () => {
  const outcome = async (status) => view((await call(status)).result.adapter_error).upstream.retry;
  // Refused identically on a repeat: fixing the cause is the only way forward.
  for (const status of [401, 402, 403, 404, 413, 422]) {
    assert.equal(await outcome(status), RETRY.POINTLESS, `status ${status}`);
  }
  // A later identical request can succeed; this one changed nothing.
  assert.equal(await outcome(429), RETRY.AFTER_DELAY);
  assert.equal(await outcome(503), RETRY.AFTER_DELAY);
  // Outcome unknown: a repeat risks a double charge and a duplicate observation.
  for (const status of [500, 502, 504]) {
    assert.equal(await outcome(status), RETRY.UNSAFE, `status ${status}`);
  }
});

test('the statuses that bear a known limitation say so in their guidance', async () => {
  const guidance = async (status) => view((await call(status)).result.adapter_error).upstream.guidance;
  // A 402 claiming an exhausted quota may be BL-001 rather than a real limit,
  // and the 401 that follows may be its suspended keys.
  assert.match(await guidance(402), /BL-001/);
  assert.match(await guidance(401), /BL-001/);
  // After a 500 the refund path is affected by the same defect.
  assert.match(await guidance(500), /BL-001|refund/);
});

test('the upstream error body is never exposed, and never leaks a credential', async () => {
  const config = testConfig();
  const bodies = [
    JSON.stringify({ error: config.apiKey }),
    JSON.stringify({ detail: 'submitted prompt echoed back verbatim' }),
    JSON.stringify({ provider_api_key: config.providerKey }),
  ];
  for (const status of [401, 402, 422, 500]) {
    for (const body of bodies) {
      const mock = apiMock(jsonReply(body, status));
      const result = await measureExecution(execution(), { config, fetchImpl: mock.fetch });
      const serialized = JSON.stringify(result);
      assert.equal(serialized.includes(config.apiKey), false, `status ${status}`);
      assert.equal(serialized.includes(config.providerKey), false, `status ${status}`);
      assert.equal(serialized.includes('echoed back verbatim'), false,
        'an error body can echo submitted content and must not be surfaced');
      assert.equal(result.response, null);
      assert.equal(result.raw_response, null);
    }
  }
});

test('an unlisted status falls back to its family without pretending to be specific', () => {
  const client = classifyUpstreamStatus(418);
  assert.equal(client.class, 'client_error');
  assert.equal(client.billing, BILLING.NOT_BILLED);
  assert.match(client.guidance, /the upstream contract moved/);

  const server = classifyUpstreamStatus(599);
  assert.equal(server.class, 'server_error');
  assert.equal(server.billing, BILLING.UNKNOWN);
  assert.equal(server.retry, RETRY.UNSAFE);

  const odd = classifyUpstreamStatus(302);
  assert.equal(odd.class, 'unexpected_status');
  assert.equal(odd.billing, BILLING.UNKNOWN);
  assert.equal(odd.retry, RETRY.UNSAFE);
});

test('classification never throws and never invents a status', () => {
  for (const bad of [undefined, null, '401', 4.5, NaN, Infinity, {}, []]) {
    assert.equal(classifyUpstreamStatus(bad), null, String(bad));
  }
  assert.deepEqual(CLASSIFIED_STATUSES.slice().sort((a, b) => a - b),
    [401, 402, 403, 404, 413, 422, 429, 500, 502, 503, 504]);
});

test('a non-HTTP failure carries no status classification at all', async () => {
  // A local timeout, a cancellation or a malformed body is not an upstream
  // status, and must not be dressed up as one.
  const network = await measureExecution(execution(),
    { config: testConfig(), fetchImpl: async () => { throw new TypeError('network down'); } });
  assert.equal(network.adapter_error.code, 'NETWORK_ERROR');
  assert.equal(Object.hasOwn(view(network.adapter_error), 'upstream'), false);
  assert.equal(Object.hasOwn(view(network.adapter_error), 'http_status'), false);

  const invalid = await measureExecution({ execution: { raw_metrics: {} } },
    { config: testConfig(), fetchImpl: apiMock(jsonReply('{}')).fetch });
  assert.equal(invalid.adapter_error.code, 'INVALID_ARGUMENTS');
  assert.equal(Object.hasOwn(view(invalid.adapter_error), 'upstream'), false);
});

test('an HTTP error is not turned into a measurement status', async () => {
  for (const status of [402, 429, 500, 503]) {
    const { result } = await call(status);
    // Nothing is fabricated: no response, no reading aid, no declared version,
    // and the transport is explicitly not validated.
    assert.equal(result.response, null);
    assert.equal(result.reading_aid, null);
    assert.equal(result.validation.transport, 'not_validated');
    assert.equal(result.measurement_reference.agreement, 'not_declared');
    assert.equal(result.token_count_source, 'unknown');
    assert.equal(result.contract_version, null);
  }
});

test('the whole classification reaches an agent through a real local MCP call', async (t) => {
  const { createMcpServer } = await import('../server.mjs');
  const { AgentMcpClient } = await import('../examples/agent-client.mjs');
  const config = testConfig();
  const app = createMcpServer({ config, fetchImpl: apiMock(jsonReply('{"detail":"synthetic"}', 402)).fetch });
  t.after(() => app.close());
  const client = new AgentMcpClient({ endpoint: await app.listen(0), apiKey: config.mcpKey });
  await client.connect();

  const called = await client.measure(execution());
  // isError stays the adapter's own signal; the status detail sits beneath it.
  assert.equal(called.isError, true);
  const upstream = view(called.structuredContent.adapter_error).upstream;
  assert.equal(upstream.http_status, 402);
  assert.equal(upstream.class, 'quota_or_payment');
  assert.equal(upstream.retry, RETRY.POINTLESS);
  assert.match(upstream.guidance, /BL-001/);
  assert.deepEqual(JSON.parse(called.content[0].text), view(called.structuredContent));
  await client.close();
});

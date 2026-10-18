// The REST contract replayed against responses RECORDED FROM A REAL INSTANCE.
//
// Every other test in this directory drives the adapter with payloads written
// by hand. These drive it with 11 responses a NeoMundi instance actually
// emitted — built from the commit `reference.mjs` pins — captured by the
// NeoMundi Python SDK campaign of 2026-10-17 and stored outside both projects,
// because recorded responses are execution data, not source.
//
// The recordings are therefore NOT in this repository. These tests skip, with a
// stated reason, wherever the directory is absent: a fresh checkout still runs
// its full suite and is told plainly what it could not verify. Point
// NEOMUNDI_CAPTURED_FIXTURES at the directory to run them elsewhere.
//
// What a failure here means: the instance emitted something this connector's
// reading of the contract does not account for. That is an observation about
// the upstream contract to report, never a licence to loosen an assertion or
// to alter a server payload so a test turns green.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMcpServer } from '../server.mjs';
import { AgentMcpClient } from '../examples/agent-client.mjs';
import { measureExecution } from '../adapter.mjs';
import { matches, outputSchema, parseApiJson } from '../contract.mjs';
import { AGREEMENT, BACKEND_REFERENCE, VERSION_PATH } from '../reference.mjs';
import { AID_REFERENCE } from '../guidance.mjs';
import { apiMock, execution, jsonReply, testConfig, view } from './helpers.mjs';

const DEFAULT_DIRECTORY = fileURLToPath(
  new URL('../../../../SDK/neomundi-python-sdk/tests/fixtures/captured/', import.meta.url),
);
const DIRECTORY = process.env.NEOMUNDI_CAPTURED_FIXTURES || DEFAULT_DIRECTORY;

function listCaptures() {
  try {
    if (!statSync(DIRECTORY).isDirectory()) return [];
    return readdirSync(DIRECTORY).filter((name) => name.endsWith('.json')).sort();
  } catch {
    return [];
  }
}

const CAPTURES = listCaptures();
const skip = CAPTURES.length === 0
  ? `no recorded response available. These are execution data, kept outside the repository. Set NEOMUNDI_CAPTURED_FIXTURES to the directory holding them (looked in ${DIRECTORY}).`
  : false;

/** Returns the recorded response exactly as the instance sent it.
 *
 * The capture files carry `_fixture_*` bookkeeping keys added by the recorder;
 * those were never part of the API response and are removed. Removal goes
 * through `parseApiJson`, so every number keeps its original JSON token: a
 * naive parse would rewrite `1.0` as `1` in the mock itself and the fidelity
 * assertions below would then prove nothing.
 */
function recorded(name) {
  const text = readFileSync(join(DIRECTORY, name), 'utf8');
  const parsed = parseApiJson(text.replace(/^﻿/, ''));
  const payload = Object.fromEntries(Object.entries(parsed).filter(([key]) => !key.startsWith('_fixture_')));
  return { text, payload, body: JSON.stringify(payload) };
}

async function replay(name) {
  const { text, payload, body } = recorded(name);
  const mock = apiMock(jsonReply(body));
  const result = await measureExecution(execution(), { config: testConfig(), fetchImpl: mock.fetch });
  return { text, payload, body, result, calls: mock.calls };
}

test('recorded responses are available and cover the three measurement families', { skip }, async () => {
  assert.equal(CAPTURES.length, 11, `expected the 11 recorded responses, found ${CAPTURES.length}`);
  const bases = new Set();
  for (const name of CAPTURES) {
    const { payload } = recorded(name);
    bases.add(payload.governance?.decision_basis);
  }
  // A set of recordings covering only the nominal case would verify nothing
  // that distinguishes NeoMundi from any other HTTP endpoint.
  for (const expected of ['measured_thresholds', 'incomplete_measurement', 'no_check_attempted']) {
    assert.ok(bases.has(expected), `no recorded response exercises decision_basis ${expected}`);
  }
});

/** Per-recording checks, by family. Declared once per recording.
 *
 * With no recording present these would simply not exist, and a run would say
 * "3 skipped" while silently omitting five families of verification. Each
 * family is therefore declared once as skipped instead, so the output names
 * what could not be checked rather than leaving it absent.
 */
const FAMILIES = [
  'passes through unaltered',
  'numeric spelling survives the round trip',
  'declared measurement version is reported beside the expected one',
  'withheld aggregate is always declared by the instance',
  'every unmeasured signal carries a named cause',
  'reading aid matches what the instance actually published',
];
if (skip) {
  for (const family of FAMILIES) {
    test(`not verified against any recorded response: ${family}`, { skip }, () => {});
  }
}

for (const name of CAPTURES) {
  test(`recorded REST response passes through unaltered: ${name}`, { skip }, async () => {
    const { payload, result, calls } = await replay(name);

    assert.equal(calls.length, 1, 'exactly one upstream request per invocation');
    assert.ok(calls[0].url.endsWith('/v1/govern'), 'the execution path must use the REST route');
    assert.equal(result.adapter_error, null);
    assert.equal(result.transport, 'json');
    assert.equal(result.sse, null);
    assert.equal(matches(outputSchema, result), true, 'envelope follows its declared output schema');

    // The central assertion of this file: the connector is a pipe. Every key
    // the instance sent is present, with the same value, and nothing was added.
    assert.deepEqual(view(result.response), view(payload));
    assert.deepEqual(Object.keys(view(result.response)), Object.keys(view(payload)), 'key order preserved');
  });

  test(`recorded numeric spelling survives the round trip: ${name}`, { skip }, async () => {
    const { text, body, result } = await replay(name);

    // `raw_response` must be the bytes the mock served, byte for byte.
    assert.equal(result.raw_response, body);

    // Anchored on the recorded FILE, not on a round trip through this code: a
    // float written `1.0` or `0.0` by the instance must not reappear as `1`
    // or `0`. Plain JSON.parse/stringify loses exactly this, and losing it
    // would silently change a published measurement.
    const serialized = JSON.stringify(result.response);
    const fragile = [...text.matchAll(/"([a-z_]+)": (-?\d+\.\d*0)(?=[,\n\r}])/g)];
    for (const [, key, token] of fragile) {
      assert.ok(
        serialized.includes(`"${key}":${token}`),
        `${key} was recorded as ${token} and is not serialized with that spelling`,
      );
    }
  });

  test(`declared measurement version is reported beside the expected one: ${name}`, { skip }, async () => {
    const { payload, result } = await replay(name);
    const reference = result.measurement_reference;

    assert.equal(reference.expected_measurement_version, BACKEND_REFERENCE.measurement_version);
    assert.equal(reference.expected_backend_commit, BACKEND_REFERENCE.backend_commit);
    assert.equal(reference.version_path, VERSION_PATH);
    // Verbatim, and read from the path the backend actually stamps.
    assert.equal(reference.received_measurement_version, payload.audit.measurement_version);
    assert.equal(reference.received_normalizer_version, payload.audit.normalizer_version);
    assert.equal(
      reference.agreement,
      AGREEMENT.MATCH,
      `the recorded instance declared ${reference.received_measurement_version}, this code expects ${reference.expected_measurement_version}`,
    );
  });

  test(`a withheld aggregate is always declared by the instance: ${name}`, { skip }, async () => {
    const { payload } = await replay(name);
    // An invariant of the UPSTREAM contract, checked on real data rather than
    // asserted in prose: when the server publishes no aggregate it must say so,
    // otherwise a null is indistinguishable from a serialization gap. This test
    // makes no claim about the connector; a failure is a backend finding.
    const measurement = payload.measurement ?? {};
    if (payload.g_score !== null && payload.g_score !== undefined) {
      assert.notEqual(measurement.aggregates_publishable, false,
        'an aggregate was published while the instance declared aggregates unpublishable');
      return;
    }
    const declared = measurement.aggregates_publishable === false
      || payload.governance?.decision_basis === 'incomplete_measurement'
      || (Array.isArray(measurement.missing_required_signals) && measurement.missing_required_signals.length > 0);
    assert.ok(declared,
      `g_score is null with no declaration: aggregates_publishable=${measurement.aggregates_publishable}, basis=${payload.governance?.decision_basis}`);
  });

  test(`every unmeasured signal carries a named cause: ${name}`, { skip }, async () => {
    const { payload } = await replay(name);
    // Also an upstream invariant. A signal reported as not measured without a
    // cause would leave an agent unable to tell an outage from a gated tier.
    const unmeasured = payload.unmeasured_signals ?? {};
    for (const [signal, cause] of Object.entries(unmeasured)) {
      assert.equal(typeof cause, 'string', `${signal} is unmeasured without a cause`);
      assert.notEqual(cause.trim(), '', `${signal} carries an empty cause`);
    }
    const measured = payload.measured_signals ?? [];
    for (const signal of measured) {
      assert.equal(Object.hasOwn(unmeasured, signal), false,
        `${signal} is reported both measured and unmeasured`);
    }
  });

  test(`reading aid matches what the instance actually published: ${name}`, { skip }, async () => {
    const { payload, result } = await replay(name);
    const aid = result.reading_aid;
    assert.notEqual(aid, null);

    // Each homonym reported must exist at the stated path in THIS response,
    // and every reading of it must be present: reporting one of an inverted
    // pair without the other is how an agent reaches the opposite conclusion.
    for (const group of aid.homonyms) {
      for (const reading of group.readings) {
        const [block, field] = reading.path.split('.');
        const node = field === undefined ? payload : payload[block];
        const key = field ?? block;
        assert.ok(node && Object.hasOwn(node, key), `${reading.path} reported but absent`);
      }
    }
    const inverted = aid.homonyms.find((group) => group.name === 'stability_score');
    if (inverted) {
      assert.equal(inverted.readings.length, 2, 'both inverted readings must be reported');
      // Both readings are withheld together when a required signal was not
      // measured, so the inversion can only be checked where both are numeric.
      // `Number(null)` is 0, so nullity must be tested BEFORE converting.
      const q = JSON.parse(JSON.stringify(payload.quality.stability_score));
      const m = JSON.parse(JSON.stringify(payload.metrics.stability_score));
      if (typeof q === 'number' && typeof m === 'number') {
        // The inversion is not a claim taken from a document: it holds
        // numerically on every recorded response where both are published.
        assert.equal(Math.round((q + m) * 1e6) / 1e6, 1,
          `the two stability_score readings should sum to 1, got ${q} + ${m}`);
      } else {
        // Withheld together, or not at all: never one published and the other
        // null, which would leave an agent reading a lone inverted value.
        assert.equal(q, null, 'quality.stability_score should be null here');
        assert.equal(m, null, 'metrics.stability_score should be null here');
      }
    }

    // The aid's view of withholding must agree with the instance's own fields.
    const measurement = payload.measurement ?? {};
    assert.equal(aid.aggregates.publishable,
      Object.hasOwn(measurement, 'aggregates_publishable')
        ? JSON.parse(JSON.stringify(measurement.aggregates_publishable)) : null);
    assert.equal(aid.aggregates.undeclared_withholding, false,
      'a recorded response withheld an aggregate without declaring it');
    for (const path of aid.aggregates.withheld_paths) {
      const [block, field] = path.split('.');
      const value = field === undefined ? payload[block] : payload[block][field];
      assert.equal(value, null, `${path} listed as withheld but is not null`);
    }

    // Every unmeasured signal the instance named is reported with its cause,
    // verbatim, and none is invented.
    const unmeasured = payload.unmeasured_signals ?? {};
    assert.deepEqual(aid.unmeasured_signals.map((entry) => entry.signal).sort(),
      Object.keys(unmeasured).sort());
    for (const entry of aid.unmeasured_signals) {
      assert.equal(entry.cause, unmeasured[entry.signal]);
    }

    // Nulls are reported, not substituted, and the paths really are null.
    for (const path of aid.nulls.paths) {
      const value = path.split('.').reduce((node, key) => node[key], payload);
      assert.equal(value, null, `${path} listed as null but is not`);
    }

    // The three limitations travel with every real response, and BL-002 is
    // never marked observable on the REST path.
    assert.deepEqual(aid.known_limitations.map((entry) => entry.id),
      AID_REFERENCE.LIMITATIONS.map((entry) => entry.id));
    assert.equal(aid.known_limitations.find((entry) => entry.id === 'BL-002').observable_here, false);
    assert.equal(aid.applies_to, 'json');
  });

}
test('an instance declaring another version is reported divergent, not corrected', { skip }, async () => {
  const { payload } = recorded(CAPTURES[0]);
  // The recorded response is modified HERE, in the test harness, to simulate a
  // different instance. The connector is given a response it never produced,
  // and must report the divergence verbatim without touching the payload.
  const drifted = { ...payload, audit: { ...payload.audit, measurement_version: '9.9.9' } };
  const mock = apiMock(jsonReply(JSON.stringify(drifted)));
  const result = await measureExecution(execution(), { config: testConfig(), fetchImpl: mock.fetch });

  assert.equal(result.adapter_error, null, 'a version divergence is not a transport failure');
  assert.equal(result.measurement_reference.agreement, AGREEMENT.DIVERGENT);
  assert.equal(result.measurement_reference.received_measurement_version, '9.9.9');
  assert.equal(result.measurement_reference.expected_measurement_version, BACKEND_REFERENCE.measurement_version);
  // The payload still says 9.9.9. Nothing was rewritten to agree with us.
  assert.equal(view(result.response).audit.measurement_version, '9.9.9');
  assert.deepEqual(view(result.response), view(drifted));
});

test('a recorded response reaches an agent through a real local MCP call', { skip }, async (t) => {
  // End to end: real loopback MCP server, real JSON-RPC client, real session
  // lifecycle. Only the upstream NeoMundi call is replaced — by the recording.
  const { payload, body } = recorded(CAPTURES[0]);
  const config = testConfig();
  const app = createMcpServer({ config, fetchImpl: apiMock(jsonReply(body)).fetch });
  t.after(() => app.close());
  const client = new AgentMcpClient({ endpoint: await app.listen(0), apiKey: config.mcpKey });
  await client.connect();

  const called = await client.measure(execution());
  assert.equal(called.isError, false);
  assert.deepEqual(view(called.structuredContent.response), view(payload));
  assert.equal(called.structuredContent.measurement_reference.agreement, AGREEMENT.MATCH);
  assert.equal(called.structuredContent.measurement_reference.received_measurement_version,
    payload.audit.measurement_version);
  // The text block an agent reads must agree with the structured content.
  assert.deepEqual(JSON.parse(called.content[0].text), view(called.structuredContent));
  await client.close();
});

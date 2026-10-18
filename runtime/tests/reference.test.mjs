// Version provenance: what this code expects, and what the instance declared.
// No recorded response is needed here, so these run everywhere.
import test from 'node:test';
import assert from 'node:assert/strict';
import { measureExecution } from '../adapter.mjs';
import { parseApiJson } from '../contract.mjs';
import { AGREEMENT, BACKEND_REFERENCE, VERSION_PATH, measurementReference } from '../reference.mjs';
import { apiMock, execution, jsonReply, sseReply, testConfig, view } from './helpers.mjs';

const audited = (audit, rest = {}) => parseApiJson(JSON.stringify({ ...rest, audit }));

test('the pinned reference identifies one backend revision and cannot be mutated', () => {
  assert.equal(BACKEND_REFERENCE.backend_commit, '68d6057cf620e430e6488da3cfcec9c471c75ed6');
  assert.equal(BACKEND_REFERENCE.measurement_version, '3.3.0');
  assert.equal(BACKEND_REFERENCE.normalizer_version, '1.0.0');
  // No frozen OpenAPI document exists server-side; this must be stated, not
  // quietly assumed, because it is why a commit is pinned at all.
  assert.equal(BACKEND_REFERENCE.openapi_frozen, false);
  assert.equal(Object.isFrozen(BACKEND_REFERENCE), true);
  assert.throws(() => { BACKEND_REFERENCE.measurement_version = '4.0.0'; }, TypeError);
});

test('with no response at all, the expectation is still reported and nothing is claimed', () => {
  for (const absent of [null, undefined, 'text', 42, [], { audit: null }, { audit: 'audit' }, {}]) {
    const reference = measurementReference(absent);
    assert.equal(reference.agreement, AGREEMENT.NOT_DECLARED);
    assert.equal(reference.received_measurement_version, null);
    assert.equal(reference.received_normalizer_version, null);
    // version_path stays null: the field was never there to read.
    assert.equal(reference.version_path, null);
    assert.equal(reference.expected_measurement_version, BACKEND_REFERENCE.measurement_version);
    assert.equal(reference.expected_backend_commit, BACKEND_REFERENCE.backend_commit);
  }
});

test('the declared version is read verbatim from the audit block, and compared there only', () => {
  const matching = measurementReference(audited({ measurement_version: '3.3.0', normalizer_version: '1.0.0' }));
  assert.equal(matching.agreement, AGREEMENT.MATCH);
  assert.equal(matching.received_measurement_version, '3.3.0');
  assert.equal(matching.received_normalizer_version, '1.0.0');
  assert.equal(matching.version_path, VERSION_PATH);

  const drifted = measurementReference(audited({ measurement_version: '3.4.0' }));
  assert.equal(drifted.agreement, AGREEMENT.DIVERGENT);
  assert.equal(drifted.received_measurement_version, '3.4.0');
  // The expectation is unchanged by what arrived: both are reported side by side.
  assert.equal(drifted.expected_measurement_version, '3.3.0');
  assert.equal(drifted.received_normalizer_version, null);
});

test('a top-level measurement_version is not mistaken for the audited one', () => {
  // Reading a version from a path the backend does not stamp would attribute a
  // measurement to a revision on no evidence.
  const reference = measurementReference(audited({ trace_id: 'trace-1' }, { measurement_version: '3.3.0' }));
  assert.equal(reference.agreement, AGREEMENT.NOT_DECLARED);
  assert.equal(reference.received_measurement_version, null);
  assert.equal(reference.version_path, null);
});

test('a present but unusable version is reported as such, never converted', () => {
  // A number arrives wrapped as raw JSON. Rendering it '3.3' would invent a
  // declaration; the raw value stays visible under response.audit instead.
  const numeric = measurementReference(audited({ measurement_version: 3.3 }));
  assert.equal(numeric.agreement, AGREEMENT.DECLARED_UNUSABLE);
  assert.equal(numeric.received_measurement_version, null);
  // The field existed, so its path is recorded: absent and unusable differ.
  assert.equal(numeric.version_path, VERSION_PATH);

  for (const unusable of [null, '', '   ', true, { major: 3 }, ['3.3.0']]) {
    const reference = measurementReference(audited({ measurement_version: unusable }));
    assert.equal(reference.agreement, AGREEMENT.DECLARED_UNUSABLE, JSON.stringify(unusable));
    assert.equal(reference.received_measurement_version, null);
    assert.equal(reference.version_path, VERSION_PATH);
  }
});

test('an empty-string version is not silently promoted to the expected one', () => {
  const reference = measurementReference(audited({ measurement_version: '' }));
  assert.notEqual(reference.agreement, AGREEMENT.MATCH);
  assert.equal(reference.received_measurement_version, null);
});

test('a JSON response carries the reference, and the payload is left intact', async () => {
  const payload = { audit: { measurement_version: '3.3.0', normalizer_version: '1.0.0' }, g_score: 0.5 };
  const mock = apiMock(jsonReply(JSON.stringify(payload)));
  const result = await measureExecution(execution(), { config: testConfig(), fetchImpl: mock.fetch });

  assert.equal(result.adapter_error, null);
  assert.equal(result.measurement_reference.agreement, AGREEMENT.MATCH);
  assert.deepEqual(view(result.response), payload);
  // The envelope's own contract_version alias keeps its unchanged meaning and
  // is not fed by the audit block.
  assert.equal(result.contract_version, null);
});

test('the SSE done event declares no version, and that is not an error', async () => {
  // Observed on the gateway: the named done event carries no audit block, so
  // no version is published on that path. An absence in the upstream contract
  // must read as not_declared, not as agreement and not as a failure.
  const mock = apiMock(sseReply('event: done\ndata: {"decision":"ALLOW","stability_score":0.9231}\n\n'));
  const result = await measureExecution({ generation: { prompt: 'Question synthétique' } },
    { config: testConfig(), fetchImpl: mock.fetch });

  assert.equal(result.adapter_error, null);
  assert.equal(result.sse.termination, 'done');
  assert.equal(result.measurement_reference.agreement, AGREEMENT.NOT_DECLARED);
  assert.equal(result.measurement_reference.version_path, null);
  assert.equal(result.measurement_reference.expected_measurement_version, '3.3.0');
});

test('a [DONE]-only stream has no final object, so no version is attributed to it', async () => {
  const mock = apiMock(sseReply('data: {"content":"x"}\n\ndata: [DONE]\n\n'));
  const result = await measureExecution({ generation: { prompt: 'Question synthétique' } },
    { config: testConfig(), fetchImpl: mock.fetch });
  assert.equal(result.sse.termination, '[DONE]');
  assert.equal(result.response, null);
  assert.equal(result.measurement_reference.agreement, AGREEMENT.NOT_DECLARED);
});

test('a failed call still reports what this code expected', async () => {
  const mock = apiMock(jsonReply('{"error":"nope"}', 402));
  const result = await measureExecution(execution(), { config: testConfig(), fetchImpl: mock.fetch });

  assert.equal(result.adapter_error.code, 'UPSTREAM_HTTP_ERROR');
  assert.equal(result.adapter_error.http_status, 402);
  assert.equal(result.measurement_reference.expected_measurement_version, '3.3.0');
  assert.equal(result.measurement_reference.expected_backend_commit, BACKEND_REFERENCE.backend_commit);
  // Nothing was received, so nothing is declared.
  assert.equal(result.measurement_reference.agreement, AGREEMENT.NOT_DECLARED);
});

test('invalid arguments report the expectation without contacting NeoMundi', async () => {
  const mock = apiMock(jsonReply('{}'));
  const result = await measureExecution({ execution: { raw_metrics: {} } },
    { config: testConfig(), fetchImpl: mock.fetch });
  assert.equal(mock.calls.length, 0);
  assert.equal(result.adapter_error.code, 'INVALID_ARGUMENTS');
  assert.equal(result.measurement_reference.expected_measurement_version, '3.3.0');
});

test('a withheld result after credential disclosure declares no received version', async () => {
  const config = testConfig();
  const payload = { audit: { measurement_version: '3.3.0' }, leaked: config.apiKey };
  const mock = apiMock(jsonReply(JSON.stringify(payload)));
  const result = await measureExecution(execution(), { config, fetchImpl: mock.fetch });

  assert.equal(result.adapter_error.code, 'CREDENTIAL_DISCLOSURE');
  assert.equal(result.response, null);
  // The whole result was withheld: reporting a version read from it would
  // leak the fact that a payload was parsed before being dropped.
  assert.equal(result.measurement_reference.agreement, AGREEMENT.NOT_DECLARED);
  assert.equal(result.measurement_reference.received_measurement_version, null);
  assert.equal(JSON.stringify(result).includes(config.apiKey), false);
});

test('the tool description tells an agent to read the agreement before comparing figures', async () => {
  const { toolDefinition } = await import('../contract.mjs');
  assert.match(toolDefinition.description, /measurement_reference/);
  assert.match(toolDefinition.description, /divergent means not comparable/);
  const schema = toolDefinition.outputSchema.properties.measurement_reference;
  assert.equal(schema.additionalProperties, false);
  assert.deepEqual(schema.properties.agreement.enum, Object.values(AGREEMENT));
  assert.deepEqual(
    schema.required.slice().sort(),
    Object.keys(measurementReference(null)).sort(),
    'the declared schema and the produced object must list the same fields',
  );
});

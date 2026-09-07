// Tests of local audit evidence only. No MCP server or API call is simulated.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const root = new URL('../', import.meta.url);
const bytes = (path) => readFileSync(new URL(path, root));
const json = (path) => JSON.parse(bytes(path).toString('utf8').replace(/^\uFEFF/, ''));
const b = json('schemas/backend-v2-rgc-0.1.0.schema.json');
const r1 = json('schemas/runtime-contract-v0.1.schema.json');
const r2 = json('schemas/runtime-contract-v0.2.schema.json');
const defs = (schema) => schema.$defs;

test('source schema copies retain their recorded SHA-256', () => {
  const provenance = json('schemas/provenance.json');
  assert.equal(provenance.length, 3);
  for (const item of provenance) {
    assert.equal(createHash('sha256').update(bytes(item.copy)).digest('hex'), item.sha256);
  }
});

test('0.1.0 does not identify a unique contract', () => {
  assert.equal(defs(b).RgcIdentity.properties.schema_version.const, '0.1.0');
  assert.equal(defs(r1).RgcIdentity.properties.schema_version.default, '0.1.0');
  assert.notDeepEqual(b, r1);
  assert.ok(defs(b).RgcObservedSignals.properties.signal_status);
  assert.equal(defs(r1).RgcObservedSignals.properties.signal_status, undefined);
});

test('nullability differs between the two 0.1.0 source schemas', () => {
  for (const name of ['stability_score', 'coherence_score', 'factual_hallucination_score', 'semantic_instability_score', 'semantic_risk']) {
    assert.ok(defs(b).RgcObservedSignals.properties[name].anyOf.some((s) => s.type === 'null'));
    assert.equal(defs(r1).RgcObservedSignals.properties[name].type, 'number');
    assert.ok(defs(r2).RgcObservedSignals.properties[name].anyOf.some((s) => s.type === 'null'));
  }
});

test('classification vocabularies remain different, without mapping', () => {
  assert.deepEqual(defs(b).RgcObservedSignals.properties.observation_class.enum,
    ['within_bounds', 'flagged', 'not_determinable']);
  assert.deepEqual(defs(r2).RgcObservedSignals.properties.observation_class.enum,
    ['within_bounds', 'flagged', 'not_assessed']);
});

test('backend evidence preserves all three per-signal states', () => {
  for (const field of Object.values(defs(b).RgcSignalStatus.properties)) {
    assert.deepEqual(field.enum, ['measured', 'not_measured', 'insufficient_coverage']);
  }
});

test('all source schemas retain the no-execution-permission invariant', () => {
  for (const schema of [b, r1, r2]) {
    assert.equal(defs(schema).RgcGovernanceBoundary.properties.execution_permission_changed.const, false);
  }
});

test('agent example is marked synthetic and not executable', () => {
  const example = json('examples/measure-execution.proposed.json');
  assert.equal(example.status, 'proposal_only_no_server_implemented');
  assert.equal(example.proposed_jsonrpc_request.params.name, 'measure_execution');
  assert.equal(example.proposed_jsonrpc_request.params.arguments.provider_api_key, undefined);
});

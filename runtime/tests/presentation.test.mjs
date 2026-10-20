// Fidelity of the projection. These tests exist to make one failure mode
// impossible, and a dozen smaller ones expensive.
//
// THE FAILURE MODE. Two real recorded responses both decide ALLOW:
// tier02_01_complete_nominale, decided against thresholds on three measured
// checks, and tier02_04_aucun_controle, decided with NO check attempted at
// all. A presentation that renders them the same has destroyed the distinction
// the measurement exists to make — and it would do so while displaying only
// values the server really published. Test 2 fails if they ever come out equal
// on that point.
//
// What a failure here means: the projection started saying something the
// response does not say. That is never fixed by loosening an assertion.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isObject, matches, outputSchema, parseApiJson, scalar } from '../contract.mjs';
import { AID_REFERENCE, readingAid } from '../guidance.mjs';
import { AGREEMENT } from '../reference.mjs';
import { FIELD_SOURCES, PRESENTATION_SCHEMA, presentation } from '../presentation.mjs';
import { measureExecution } from '../adapter.mjs';
import { apiMock, execution, jsonReply, testConfig, view } from './helpers.mjs';
import { resolveCaptures } from './captured-fixtures.mjs';

const resolved = resolveCaptures(process.env.NEOMUNDI_CAPTURED_FIXTURES);
const skip = resolved.captures.length === 0
  ? `no recorded response available (looked in ${resolved.attempted.join(', ')}).`
  : false;

/** The recorded response, with the fixture bookkeeping removed. */
function recorded(name) {
  const text = readFileSync(join(resolved.directory, name), 'utf8').replace(/^﻿/, '');
  const parsed = parseApiJson(text);
  return Object.fromEntries(Object.entries(parsed).filter(([key]) => !key.startsWith('_fixture_')));
}

const project = (response, reference = { agreement: AGREEMENT.MATCH, divergence_scope: null }) =>
  presentation(response, { aid: readingAid(response, 'json'), reference, aidReference: AID_REFERENCE });

/** Reads a dotted path, mirroring the module's own reader. */
function at(response, path) {
  let current = response;
  for (const key of path.split('.')) {
    if (!isObject(current) || !Object.hasOwn(current, key)) return { present: false };
    current = current[key];
  }
  return { present: true, value: current };
}

/** The three places the module is allowed to author a string itself. */
const SELF_AUTHORED = Object.freeze(['schema', 'statement', 'field_sources']);

/** The paths the projection may name, drawn from the reading aid's own
 * reference data rather than a second list that could drift from it.
 */
const DECLARED_PATHS = new Set([
  ...AID_REFERENCE.AGGREGATE_PATHS,
  ...AID_REFERENCE.SIGNAL_DERIVED.map((entry) => entry.path),
]);

/** The limitation identifiers the projection may carry in `caveats`. Also a
 * declared vocabulary — the register's own — and an identifier, never a
 * restatement of what the limitation says.
 */
const DECLARED_LIMITATION_IDS = new Set(AID_REFERENCE.LIMITATIONS.map((entry) => entry.id));

/** Every string the projection carries, outside those three. */
function carriedStrings(value, out = []) {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) for (const item of value) carriedStrings(item, out);
  else if (isObject(value)) for (const key of Object.keys(value)) carriedStrings(value[key], out);
  return out;
}

// ---------------------------------------------------------------- test 1

test('round trip: every presented value equals its source path, untouched', { skip }, () => {
  const direct = {
    request_id: 'request_id', timestamp: 'timestamp', system_id: 'system_id', mode: 'mode',
    model: 'model', provider: 'provider', trace_id: 'audit.trace_id',
    measurement_version: 'audit.measurement_version', normalizer_version: 'audit.normalizer_version',
    decision: 'governance.decision', decision_basis: 'governance.decision_basis',
    decision_confidence: 'governance.confidence',
    measurement_status: 'measurement.status', checks_attempted: 'measurement.checks_attempted',
    checks_succeeded: 'measurement.checks_succeeded', checks_emitted: 'checks_emitted',
    coverage: 'measurement.coverage', confidence_basis: 'measurement.confidence_basis',
    aggregates_publishable: 'measurement.aggregates_publishable',
  };
  for (const name of resolved.captures) {
    const response = recorded(name);
    const projected = project(response);
    for (const [field, path] of Object.entries(direct)) {
      const found = at(response, path);
      const expected = found.present ? scalar(found.value) : null;
      assert.deepEqual(projected[field], expected, `${name}: ${field} must equal ${path}`);
    }
    // Lists are copied whole: same length, same order, same values.
    for (const [field, path] of Object.entries({
      decision_reasons: 'governance.reasons',
      measured_signals: 'measured_signals',
      missing_required_signals: 'measurement.missing_required_signals',
      degraded_g_inputs: 'measurement.degraded_g_inputs',
    })) {
      const found = at(response, path);
      if (!found.present || !Array.isArray(found.value)) {
        assert.equal(projected[field], null, `${name}: ${field}`);
        continue;
      }
      assert.deepEqual(view(projected[field]), view(found.value), `${name}: ${field} copied whole and in order`);
    }
  }
});

// ---------------------------------------------------------------- test 2

test('the ALLOW pair stays distinguishable — the whole point of this module', { skip }, () => {
  const complete = project(recorded('tier02_01_complete_nominale.json'));
  const none = project(recorded('tier02_04_aucun_controle.json'));

  // Same word. Not the same statement.
  assert.equal(complete.decision, 'ALLOW');
  assert.equal(none.decision, 'ALLOW');

  // The four the framing requires, each asserted on its own so a failure says
  // which distinction was lost.
  assert.notEqual(complete.decision_basis, none.decision_basis);
  assert.notEqual(complete.measurement_status, none.measurement_status);
  assert.notEqual(complete.checks_attempted, none.checks_attempted);
  assert.notEqual(complete.decision_is_measured, none.decision_is_measured);

  // And the values themselves, so a change that merely keeps them unequal
  // while corrupting both still fails.
  assert.equal(complete.decision_basis, 'measured_thresholds');
  assert.equal(complete.measurement_status, 'complete');
  assert.equal(complete.checks_attempted, 3);
  assert.equal(complete.decision_is_measured, true);

  assert.equal(none.decision_basis, 'no_check_attempted');
  assert.equal(none.measurement_status, 'not_attempted');
  assert.equal(none.checks_attempted, 0);
  assert.equal(none.decision_is_measured, false);

  // The unevaluated case must also show four evaluators that did not run, and
  // a factuality-derived value that is null rather than zero.
  const notAttempted = none.evaluators.filter((entry) => entry.status === 'not_attempted');
  assert.equal(notAttempted.length, 4);
  assert.equal(complete.evaluators.filter((entry) => entry.status === 'not_attempted').length, 0);
  const vScore = (projected) => projected.published_values.find((entry) => entry.path === 'v_score');
  assert.equal(vScore(none).value, null);
  assert.notEqual(vScore(complete).value, null);
});

// ---------------------------------------------------------------- test 3

test('absence is absence: a missing path yields null, never a default', () => {
  const projected = project(parseApiJson('{}'));
  for (const field of [
    'request_id', 'timestamp', 'system_id', 'mode', 'model', 'provider', 'trace_id',
    'measurement_version', 'normalizer_version', 'decision', 'decision_basis',
    'decision_confidence', 'decision_reasons', 'decision_is_measured',
    'measurement_status', 'checks_attempted', 'checks_succeeded', 'checks_emitted',
    'coverage', 'confidence_basis', 'aggregates_publishable', 'missing_required_signals',
    'degraded_g_inputs', 'failed_checks', 'measured_signals', 'unmeasured', 'evaluators',
  ]) {
    assert.equal(projected[field], null, `${field} must be null, not a default`);
  }
  // Never an empty string, a zero or a false standing in for an absence.
  for (const field of Object.keys(projected)) {
    assert.notEqual(projected[field], '', `${field} must not be an empty string`);
  }
  assert.deepEqual(projected.published_values, []);
  assert.deepEqual(projected.unmodelled_root_fields, []);
});

test('a published null stays null and is never substituted', () => {
  const response = parseApiJson(JSON.stringify({
    v_score: null, provider: null, trajectory_points: null,
    governance: { decision: 'ALLOW', decision_basis: null, confidence: null },
    measurement: { status: 'partial', checks_attempted: 0, coverage: null, aggregates_publishable: false },
  }));
  const projected = project(response);
  assert.equal(projected.provider, null);
  assert.equal(projected.coverage, null);
  assert.equal(projected.decision_confidence, null);
  // false is published, and stays false — not null, not absent.
  assert.equal(projected.aggregates_publishable, false);
  // Zero is published, and stays zero — not null.
  assert.equal(projected.checks_attempted, 0);
  // A withheld signal-derived value stays null in published_values.
  assert.deepEqual(projected.published_values, [{ path: 'v_score', value: null }]);
  // decision_basis is present but null: the derived field reports false, not
  // null, because the path WAS declared.
  assert.equal(projected.decision_is_measured, false);
});

test('not_attempted is never rendered as a performed measurement', () => {
  const response = parseApiJson(JSON.stringify({
    governance: { decision: 'ALLOW', decision_basis: 'no_check_attempted' },
    measurement: { status: 'not_attempted', checks_attempted: 0, checks_succeeded: 0 },
    evaluators: { coherence_score: { evaluator: 'x', status: 'not_attempted', model_used: null, reason: null } },
  }));
  const projected = project(response);
  assert.equal(projected.measurement_status, 'not_attempted');
  assert.equal(projected.decision_is_measured, false);
  // An evaluator that did not run is reported, not dropped: dropping it would
  // make an unevaluated answer look evaluated.
  assert.deepEqual(projected.evaluators, [{
    signal: 'coherence_score', evaluator: 'x', model_used: null, status: 'not_attempted', reason: null,
  }]);
});

// ---------------------------------------------------------------- test 4

test('no invention: every string carried comes from the response or the envelope', { skip }, () => {
  // Two fields are sourced from the ENVELOPE rather than the payload, and
  // FIELD_SOURCES says so in those words. They are checked against the
  // envelope instead of the response, not exempted from being checked.
  const fromEnvelope = ['version_agreement', 'version_scope'];
  for (const field of fromEnvelope) assert.match(FIELD_SOURCES[field], /envelope, not the response/);

  for (const name of resolved.captures) {
    const response = recorded(name);
    const reference = { agreement: AGREEMENT.MATCH, divergence_scope: null };
    const projected = project(response, reference);
    const haystack = JSON.stringify(view(response));
    const own = { ...projected };
    for (const key of [...SELF_AUTHORED, ...fromEnvelope]) delete own[key];

    for (const carried of carriedStrings(own)) {
      // Field names and read paths are STRUCTURE, not content. Both come from
      // a declared, frozen vocabulary — the module's own field list, and the
      // reading aid's path list — so neither can be an invented string.
      if (Object.hasOwn(FIELD_SOURCES, carried)) continue;
      if (DECLARED_PATHS.has(carried) || DECLARED_LIMITATION_IDS.has(carried)) continue;
      assert.ok(haystack.includes(JSON.stringify(carried).slice(1, -1)),
        `${name}: "${carried}" appears in the projection but not in the response`);
    }
    // The paths the projection names are exactly the aid's, never others.
    for (const entry of projected.published_values) {
      assert.ok(DECLARED_PATHS.has(entry.path), `${name}: "${entry.path}" is not a declared path`);
    }
    // And a caveat is an identifier from the register, never free text.
    for (const caveat of projected.caveats) {
      assert.ok(DECLARED_LIMITATION_IDS.has(caveat), `${name}: "${caveat}" is not a register identifier`);
    }
    // And the envelope-sourced pair is exactly what the envelope said.
    assert.equal(projected.version_agreement, reference.agreement, `${name}: version_agreement`);
    assert.equal(projected.version_scope, reference.divergence_scope, `${name}: version_scope`);
  }
});

test('the module authors text in exactly three places, and they are frozen', () => {
  const projected = project(parseApiJson('{}'));
  assert.equal(projected.schema, PRESENTATION_SCHEMA);
  assert.equal(Object.isFrozen(FIELD_SOURCES), true);
  assert.throws(() => { FIELD_SOURCES.decision = 'elsewhere'; }, TypeError);
  // The statement says what the projection is NOT. It must keep saying it.
  assert.match(projected.statement, /copied from the response/);
  assert.match(projected.statement, /Nothing is computed, rescaled or rounded/);
  assert.match(projected.statement, /not a permission, a compliance verdict/);
  // And it must not have become advice.
  for (const forbidden of [/\bsafe\b/i, /\bdangerous\b/i, /\brecommend/i, /\bapproved?\b/i, /\btrust\b/i]) {
    assert.doesNotMatch(projected.statement, forbidden, `statement must not read as ${forbidden}`);
  }
});

test('no severity scale, no ranking, no composite score is introduced', { skip }, () => {
  // Whole field names, not substrings: `degraded_g_inputs` legitimately
  // contains "grade", and a substring match would have condemned a field the
  // server itself publishes.
  const forbidden = new Set([
    'severity', 'level', 'rating', 'grade', 'score', 'risk_label',
    'summary', 'verdict', 'advice', 'recommendation', 'label', 'colour', 'color',
  ]);
  for (const name of resolved.captures) {
    const projected = project(recorded(name));
    for (const key of Object.keys(projected)) {
      if (SELF_AUTHORED.includes(key)) continue;
      assert.ok(!forbidden.has(key), `${name}: a field named "${key}" would be a judgement`);
      // Nor as a word inside a compound name this module authored.
      for (const word of key.split('_')) {
        assert.ok(!forbidden.has(word) || Object.hasOwn(FIELD_SOURCES, key),
          `${name}: "${key}" introduces the notion "${word}"`);
      }
    }
  }
});

// ---------------------------------------------------------------- test 5

test('an unmodelled root field appears by name, and is neither labelled nor dropped', () => {
  const response = parseApiJson(JSON.stringify({
    request_id: 'r', a_brand_new_block: { nested: 1 }, another_unknown: 'value',
    governance: { decision: 'ALLOW' },
  }));
  const projected = project(response);
  assert.deepEqual(projected.unmodelled_root_fields, ['a_brand_new_block', 'another_unknown']);
  // By name only: no value, no interpretation, no category.
  for (const entry of projected.unmodelled_root_fields) assert.equal(typeof entry, 'string');
  // And the response still carries them untouched.
  assert.deepEqual(view(response.a_brand_new_block), { nested: 1 });
});

test('a known root field is not reported as unmodelled', { skip }, () => {
  for (const name of resolved.captures) {
    assert.deepEqual(project(recorded(name)).unmodelled_root_fields, [],
      `${name}: the recorded contract should be fully modelled`);
  }
});

// ---------------------------------------------------------------- test 6

test('a divergent version is carried into the projection, with its scope', () => {
  const response = parseApiJson(JSON.stringify({
    audit: { measurement_version: '3.3.1', normalizer_version: '1.0.0' },
    governance: { decision: 'ALLOW', decision_basis: 'measured_thresholds' },
  }));
  const scope = { rest: 'identical', sse: 'decision_may_differ' };
  const projected = project(response, { agreement: AGREEMENT.DIVERGENT, divergence_scope: scope });
  assert.equal(projected.version_agreement, AGREEMENT.DIVERGENT);
  assert.deepEqual(projected.version_scope, scope);
  // The version the instance declared is carried verbatim beside the verdict.
  assert.equal(projected.measurement_version, '3.3.1');
  // Nothing in the projection marks the result as comparable.
  const keys = Object.keys(projected).join(' ');
  for (const forbidden of ['comparable', 'equivalent', 'same_as']) {
    assert.ok(!keys.includes(forbidden), `a field named like "${forbidden}" would mask the divergence`);
  }
});

test('version provenance is absent only when the envelope has none', () => {
  const projected = project(parseApiJson('{}'), null);
  assert.equal(projected.version_agreement, null);
  assert.equal(projected.version_scope, null);
});

// ---------------------------------------------------------------- test 7

test('all eleven recordings project without throwing, and emit no field off-contract', { skip }, () => {
  const allowed = new Set([...SELF_AUTHORED, ...Object.keys(FIELD_SOURCES)]);
  assert.ok(resolved.captures.length >= 11, `expected at least 11 recordings, found ${resolved.captures.length}`);
  for (const name of resolved.captures) {
    const projected = project(recorded(name));
    assert.ok(isObject(projected), `${name}: a projection was produced`);
    for (const key of Object.keys(projected)) {
      assert.ok(allowed.has(key), `${name}: "${key}" is not in the declared contract`);
    }
    // Every declared field is present, so a reader never has to guess whether
    // an absent key means absent data or an omitted field.
    for (const key of Object.keys(FIELD_SOURCES)) {
      assert.ok(Object.hasOwn(projected, key), `${name}: "${key}" is declared but missing`);
    }
  }
});

// ---------------------------------------------------- non-mutation, envelope

test('the response is not mutated, deeply, by being projected', { skip }, () => {
  for (const name of resolved.captures) {
    const response = recorded(name);
    const before = JSON.stringify(view(response));
    project(response);
    assert.equal(JSON.stringify(view(response)), before, `${name}: the response changed`);
  }
});

test('the projection reaches the envelope beside an untouched response', async () => {
  const payload = {
    request_id: 'r-1',
    audit: { measurement_version: '3.3.0', normalizer_version: '1.0.0' },
    governance: { decision: 'FLAG', decision_basis: 'measured_thresholds' },
    measurement: { status: 'partial', checks_attempted: 2, checks_succeeded: 1, coverage: 0.5 },
    unmeasured_signals: { coherence_score: 'coherence_no_input_text' },
  };
  const mock = apiMock(jsonReply(JSON.stringify(payload)));
  const output = await measureExecution(execution(), { config: testConfig(), fetchImpl: mock.fetch });

  assert.equal(output.adapter_error, null);
  // Beside, not inside: the payload is byte-identical to what was sent.
  assert.deepEqual(view(output.response), payload);
  assert.equal(Object.hasOwn(output.response, 'presentation'), false);

  assert.equal(output.presentation.decision, 'FLAG');
  assert.equal(output.presentation.measurement_status, 'partial');
  assert.equal(output.presentation.coverage, 0.5);
  assert.deepEqual(output.presentation.unmeasured, [{ signal: 'coherence_score', cause: 'coherence_no_input_text' }]);
  // FLAG is carried as the word the server published, with nothing added.
  const carried = carriedStrings({ ...output.presentation, schema: undefined, statement: undefined, field_sources: undefined });
  assert.ok(carried.includes('FLAG'));
  for (const invented of ['dangerous', 'unsafe', 'risky', 'blocked', 'rejected']) {
    assert.ok(!carried.includes(invented), `"${invented}" must not appear beside a FLAG`);
  }
  assert.equal(matches(outputSchema, output), true);
});

test('a failed call carries no projection rather than an empty-looking one', async () => {
  const mock = apiMock(jsonReply('{"detail":"nope"}', 500));
  const output = await measureExecution(execution(), { config: testConfig(), fetchImpl: mock.fetch });
  assert.equal(output.adapter_error.code, 'UPSTREAM_HTTP_ERROR');
  assert.equal(output.response, null);
  // null, not a shape full of nulls that would read as a measurement of nothing.
  assert.equal(output.presentation, null);
  assert.equal(matches(outputSchema, output), true);
});

test('partial coverage keeps its limits visible', { skip }, () => {
  const partial = resolved.captures
    .map((name) => ({ name, response: recorded(name) }))
    .filter(({ response }) => scalar(response.measurement?.status) === 'partial');
  assert.ok(partial.length > 0, 'at least one recording should be a partial measurement');
  for (const { name, response } of partial) {
    const projected = project(response);
    assert.equal(projected.measurement_status, 'partial');
    assert.equal(projected.decision_is_measured !== null, true, `${name}`);
    // The cause of every unmeasured signal is carried, named, and not blanked.
    if (isObject(response.unmeasured_signals)) {
      const signals = Object.keys(response.unmeasured_signals);
      assert.deepEqual(projected.unmeasured.map((entry) => entry.signal), signals, `${name}`);
      for (const entry of projected.unmeasured) {
        assert.deepEqual(entry.cause, scalar(response.unmeasured_signals[entry.signal]), `${name}: ${entry.signal}`);
      }
    }
  }
});

test('field_sources names a source for every field the projection emits', () => {
  const projected = project(parseApiJson('{}'));
  for (const key of Object.keys(projected)) {
    if (SELF_AUTHORED.includes(key)) continue;
    assert.ok(Object.hasOwn(FIELD_SOURCES, key), `${key} is emitted without a declared source`);
    assert.equal(typeof FIELD_SOURCES[key], 'string');
    assert.ok(FIELD_SOURCES[key].length > 0);
  }
  // The one derived field says so, in those words.
  assert.match(FIELD_SOURCES.decision_is_measured, /^DERIVED:/);
  // And it is the only one.
  const derived = Object.entries(FIELD_SOURCES).filter(([, source]) => source.startsWith('DERIVED:'));
  assert.equal(derived.length, 1);
});

test('the evaluator subset is declared as a subset', () => {
  assert.match(FIELD_SOURCES.evaluators, /NAMED SUBSET/);
  assert.match(FIELD_SOURCES.evaluators, /full record stays at response\.evaluators/);
});

test('lists are never shortened, however long', () => {
  const reasons = Array.from({ length: 200 }, (_, index) => `reason ${index}`);
  const response = parseApiJson(JSON.stringify({ governance: { decision: 'ALLOW', reasons } }));
  const projected = project(response);
  assert.equal(projected.decision_reasons.length, 200);
  assert.deepEqual(view(projected.decision_reasons), reasons);
  assert.match(FIELD_SOURCES.decision_reasons, /never shortened/);
});

test('an observable backend limitation is carried as its identifier, nothing more', () => {
  const response = parseApiJson(JSON.stringify({
    delta_g: 0.25, governance: { decision: 'FLAG', decision_basis: 'incomplete_measurement' },
    measurement: { status: 'partial', aggregates_publishable: false, missing_required_signals: ['semantic_risk'] },
  }));
  const projected = project(response);
  // BL-003: delta_g published while the aggregate is withheld.
  assert.deepEqual(projected.caveats, ['BL-003']);
  // An identifier, not a restatement: the register is the place for the text.
  for (const caveat of projected.caveats) assert.match(caveat, /^BL-\d{3}$/);
});

test('no projection at all when there is no response object', () => {
  for (const absent of [null, undefined, 'text', 42, [], true]) {
    assert.equal(presentation(absent, { aidReference: AID_REFERENCE }), null);
  }
});

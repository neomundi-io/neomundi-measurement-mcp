// The reading aid: built beside the response, and provably not inside it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { measureExecution } from '../adapter.mjs';
import { matches, outputSchema, parseApiJson } from '../contract.mjs';
import { AID_REFERENCE, READING_AID_SCHEMA, readingAid } from '../guidance.mjs';
import { apiMock, execution, jsonReply, sseReply, testConfig, view } from './helpers.mjs';

const api = (payload) => parseApiJson(JSON.stringify(payload));
const run = async (payload) => {
  const mock = apiMock(jsonReply(JSON.stringify(payload)));
  return measureExecution(execution(), { config: testConfig(), fetchImpl: mock.fetch });
};

// A payload shaped like a real complete response, with the five same-name
// fields and both energy values present.
const complete = () => ({
  g_score: 0.56199,
  g_final: 0.81,
  v_score: 1.0,
  delta_g: 0.02,
  measured_signals: ['coherence_score', 'semantic_risk'],
  unmeasured_signals: {},
  measurement: { status: 'complete', checks_attempted: 3, checks_succeeded: 3, coverage: 1.0,
    missing_required_signals: [], aggregates_publishable: true },
  governance: { decision: 'ALLOW', decision_basis: 'measured_thresholds', confidence: 1.0 },
  quality: { g_score: 0.56199, stability_score: 0.93665, information_density: 0.4659, confidence: 1.0 },
  metrics: { stability_score: 0.06335, energy_score: 0.06335, e_token: 0.5 },
  esi: { g_final: 0.81, q_value: 1.0 },
  baseline: { esi_q: 1.0, delta_E: 0.0234, observed_energy: 0.0266, reference_energy: 0.05 },
  density: { informational_density: 1.0 },
  audit: { measurement_version: '3.3.0', normalizer_version: '1.0.0' },
});

const withheld = () => ({
  g_score: null,
  g_final: null,
  delta_g: -0.56199,
  measured_signals: [],
  unmeasured_signals: {
    semantic_risk: 'moderation_service_unavailable',
    coherence_score: 'coherence_service_unavailable',
    factual_hallucination_score: 'hallucination_judge_no_score_key',
  },
  measurement: { status: 'partial', checks_attempted: 3, checks_succeeded: 0, coverage: 0.0,
    missing_required_signals: ['semantic_risk', 'coherence_score'], aggregates_publishable: false },
  governance: { decision: 'FLAG', decision_basis: 'incomplete_measurement', confidence: 0.0 },
  quality: { g_score: null, stability_score: null, coherence_score: null },
  metrics: { stability_score: null, energy_score: null, e_token: 0.5 },
  audit: { measurement_version: '3.3.0' },
});

test('the aid is absent when there is no response to read', async () => {
  assert.equal(readingAid(null, 'json'), null);
  assert.equal(readingAid('text', 'json'), null);
  assert.equal(readingAid([], 'json'), null);
  const failed = await run(complete());
  assert.notEqual(failed.reading_aid, null);
  // On a transport failure with nothing parsed, the aid stays null.
  const mock = apiMock(jsonReply('{}', 500));
  const errored = await measureExecution(execution(), { config: testConfig(), fetchImpl: mock.fetch });
  assert.equal(errored.reading_aid, null);
});

test('the response is not touched: no key, no value, no order changes', async () => {
  const payload = complete();
  const result = await run(payload);
  assert.notEqual(result.reading_aid, null);
  assert.deepEqual(view(result.response), payload);
  assert.deepEqual(Object.keys(view(result.response)), Object.keys(payload));
  // The aid is a sibling of response, never a member of it.
  assert.equal(Object.hasOwn(view(result.response), 'reading_aid'), false);
  assert.equal(Object.hasOwn(view(result.response), 'schema'), false);
  assert.equal(matches(outputSchema, result), true);
});

test('both readings of an inverted-scale homonym are reported, and neither is chosen', async () => {
  const result = await run(complete());
  const group = result.reading_aid.homonyms.find((entry) => entry.name === 'stability_score');
  assert.equal(group.severity, 'inverted_scales');
  assert.deepEqual(group.readings.map((reading) => reading.path),
    ['quality.stability_score', 'metrics.stability_score']);
  assert.match(group.readings[0].scale, /1 = stable/);
  assert.match(group.readings[1].scale, /0 = stable/);
  // No third, "corrected" value is derived anywhere in the aid.
  const serialized = JSON.stringify(result.reading_aid);
  assert.equal(serialized.includes('0.93665'), false, 'the aid must not restate a measured value');
  assert.equal(serialized.includes('0.06335'), false);
});

test('the five same-name fields are all covered, and only when present', async () => {
  const names = AID_REFERENCE.HOMONYMS.map((group) => group.name);
  assert.deepEqual(names, ['stability_score', 'Q', 'density', 'delta_E', 'delta_g']);

  const full = await run(complete());
  assert.deepEqual(full.reading_aid.homonyms.map((group) => group.name), names);

  // A payload missing those blocks must produce no entry for them, rather than
  // an entry asserting they are null.
  const bare = await run({ audit: { measurement_version: '3.3.0' }, governance: { decision: 'ALLOW' } });
  assert.deepEqual(bare.reading_aid.homonyms, []);
});

test('delta_E points at the two values a reader can recompute from', async () => {
  const result = await run(complete());
  const group = result.reading_aid.homonyms.find((entry) => entry.name === 'delta_E');
  assert.equal(group.severity, 'ambiguous_sign');
  assert.match(group.note, /observed_energy/);
  assert.match(group.note, /reference_energy/);
  // The aid states the ambiguity; it does not resolve it by recomputing.
  assert.equal(JSON.stringify(group).includes('0.0234'), false);
});

test('a withheld aggregate is identified, with what declared it', async () => {
  const result = await run(withheld());
  const aggregates = result.reading_aid.aggregates;

  assert.equal(aggregates.publishable, false);
  for (const path of ['g_score', 'g_final', 'quality.g_score', 'quality.stability_score',
    'metrics.stability_score', 'metrics.energy_score', 'esi.g_final'].filter((p) => !p.startsWith('esi'))) {
    assert.ok(aggregates.withheld_paths.includes(path), `${path} should be listed as withheld`);
  }
  assert.deepEqual(aggregates.published_paths, []);
  assert.deepEqual(aggregates.declared_by.slice().sort(),
    ['governance.decision_basis', 'measurement.aggregates_publishable', 'measurement.missing_required_signals']);
  assert.deepEqual(aggregates.missing_required_signals, ['semantic_risk', 'coherence_score']);
  assert.equal(aggregates.undeclared_withholding, false);
});

test('a published aggregate is listed as published, not as withheld', async () => {
  const aggregates = (await run(complete())).reading_aid.aggregates;
  assert.equal(aggregates.publishable, true);
  assert.deepEqual(aggregates.withheld_paths, []);
  assert.ok(aggregates.published_paths.includes('g_score'));
  assert.ok(aggregates.published_paths.includes('esi.g_final'));
  assert.deepEqual(aggregates.declared_by, []);
  assert.equal(aggregates.undeclared_withholding, false);
});

test('a withheld aggregate that nothing declares is flagged as an anomaly', async () => {
  // Constructed here, in the harness: the reference instance never did this.
  // The aid must surface it rather than smooth it over, because an undeclared
  // null is indistinguishable from a serialization gap.
  const result = await run({ g_score: null, governance: { decision: 'ALLOW', decision_basis: 'measured_thresholds' },
    measurement: { status: 'complete' }, audit: { measurement_version: '3.3.0' } });
  const aggregates = result.reading_aid.aggregates;
  assert.deepEqual(aggregates.withheld_paths, ['g_score']);
  assert.deepEqual(aggregates.declared_by, []);
  assert.equal(aggregates.undeclared_withholding, true);
});

test('each unmeasured signal carries its verbatim cause, and ambiguity is named', async () => {
  const signals = (await run(withheld())).reading_aid.unmeasured_signals;
  const byName = Object.fromEntries(signals.map((entry) => [entry.signal, entry]));

  assert.equal(byName.semantic_risk.cause, 'moderation_service_unavailable');
  // A timeout and an unreachable evaluator share this one cause upstream.
  assert.equal(byName.semantic_risk.cause_is_ambiguous, true);
  assert.equal(byName.coherence_score.cause_is_ambiguous, true);
  // A parse failure is specific, so it is not flagged ambiguous.
  assert.equal(byName.factual_hallucination_score.cause, 'hallucination_judge_no_score_key');
  assert.equal(byName.factual_hallucination_score.cause_is_ambiguous, false);
});

test('a signal reported unmeasured without a usable cause yields a null cause, not an invented one', async () => {
  const result = await run({ unmeasured_signals: { semantic_risk: '', coherence_score: null },
    audit: { measurement_version: '3.3.0' } });
  const byName = Object.fromEntries(result.reading_aid.unmeasured_signals.map((e) => [e.signal, e]));
  assert.equal(byName.semantic_risk.cause, null);
  assert.equal(byName.coherence_score.cause, null);
  assert.equal(byName.semantic_risk.cause_is_ambiguous, false);
});

test('nulls are reported by path as a declared absence, and never substituted', async () => {
  const result = await run(withheld());
  const nulls = result.reading_aid.nulls;

  for (const path of ['g_score', 'g_final', 'quality.g_score', 'quality.stability_score',
    'quality.coherence_score', 'metrics.stability_score', 'metrics.energy_score']) {
    assert.ok(nulls.paths.includes(path), `${path} should be reported as null`);
  }
  assert.equal(nulls.truncated, false);
  assert.equal(nulls.count, nulls.paths.length);
  // The response itself still holds null, not zero, false or a missing key.
  const response = view(result.response);
  assert.equal(response.g_score, null);
  assert.equal(Object.hasOwn(response, 'g_score'), true);
  assert.equal(response.quality.stability_score, null);
});

test('a very large number of nulls is truncated and says so', async () => {
  const many = { audit: { measurement_version: '3.3.0' } };
  for (let index = 0; index < 100; index += 1) many[`field_${index}`] = null;
  const nulls = (await run(many)).reading_aid.nulls;
  assert.equal(nulls.truncated, true);
  assert.equal(nulls.paths.length, 64);
  assert.equal(nulls.count, 64);
});

test('decision_basis is explained, and an undocumented value is reported as such', async () => {
  for (const [basis, pattern] of [
    ['measured_thresholds', /thresholds on measured signals/],
    ['incomplete_measurement', /aggregates are withheld/],
    ['no_check_attempted', /not a statement that nothing was found/],
  ]) {
    const result = await run({ governance: { decision: 'ALLOW', decision_basis: basis },
      audit: { measurement_version: '3.3.0' } });
    assert.equal(result.reading_aid.decision_basis.value, basis);
    assert.match(result.reading_aid.decision_basis.meaning, pattern);
  }
  const drifted = await run({ governance: { decision: 'ALLOW', decision_basis: 'something_new' },
    audit: { measurement_version: '3.3.0' } });
  assert.match(drifted.reading_aid.decision_basis.meaning, /the upstream contract moved/);

  const absent = await run({ audit: { measurement_version: '3.3.0' } });
  assert.equal(absent.reading_aid.decision_basis.value, null);
  assert.match(absent.reading_aid.decision_basis.meaning, /Not declared/);
});

test('the three known limitations travel with every response', async () => {
  const limitations = (await run(complete())).reading_aid.known_limitations;
  assert.deepEqual(limitations.map((entry) => entry.id), ['BL-001', 'BL-002', 'BL-003']);
  for (const limitation of limitations) {
    assert.ok(limitation.statement.length > 40, limitation.id);
    assert.ok(limitation.what_to_do.length > 20, limitation.id);
  }
  assert.match(limitations[0].statement, /402/);
  assert.match(limitations[1].statement, /chunks/);
  assert.match(limitations[2].statement, /withheld/);
});

test('BL-002 is marked observable only on the streaming path', async () => {
  const rest = (await run(complete())).reading_aid.known_limitations
    .find((entry) => entry.id === 'BL-002');
  assert.equal(rest.observable_here, false, 'REST is unaffected by BL-002');

  const mock = apiMock(sseReply('event: done\ndata: {"decision":"ALLOW","stability_score":0.9231}\n\n'));
  const streamed = await measureExecution({ generation: { prompt: 'Question synthétique' } },
    { config: testConfig(), fetchImpl: mock.fetch });
  const sse = streamed.reading_aid.known_limitations.find((entry) => entry.id === 'BL-002');
  assert.equal(sse.observable_here, true);
  assert.equal(streamed.reading_aid.applies_to, 'sse');
});

test('BL-003 is marked observable exactly when delta_g survives a withheld aggregate', async () => {
  const hit = (await run(withheld())).reading_aid.known_limitations
    .find((entry) => entry.id === 'BL-003');
  assert.equal(hit.observable_here, true, 'delta_g is numeric while aggregates are withheld');

  const miss = (await run(complete())).reading_aid.known_limitations
    .find((entry) => entry.id === 'BL-003');
  assert.equal(miss.observable_here, false, 'aggregates are publishable here');
});

test('the aid states that a measurement is not a permission', async () => {
  const aid = (await run(complete())).reading_aid;
  assert.equal(aid.schema, READING_AID_SCHEMA);
  assert.match(aid.statement, /not a permission/);
  assert.match(aid.statement, /changes nothing in it/);
  assert.equal(aid.applies_to, 'json');
});

test('the aid never carries a credential, even when the response did', async () => {
  const config = testConfig();
  const mock = apiMock(jsonReply(JSON.stringify({ ...complete(), leaked: config.apiKey })));
  const result = await measureExecution(execution(), { config, fetchImpl: mock.fetch });
  // The whole result is withheld on disclosure, so there is no aid to leak.
  assert.equal(result.adapter_error.code, 'CREDENTIAL_DISCLOSURE');
  assert.equal(result.reading_aid, null);
  assert.equal(JSON.stringify(result).includes(config.apiKey), false);
});

test('a number in the response is never rewritten by building the aid', async () => {
  // Raw JSON tokens pass through the aid's traversal untouched.
  const payload = '{"g_score":0.5,"quality":{"stability_score":1.0},"metrics":{"stability_score":0.0},"audit":{"measurement_version":"3.3.0"}}';
  const mock = apiMock(jsonReply(payload));
  const result = await measureExecution(execution(), { config: testConfig(), fetchImpl: mock.fetch });
  const serialized = JSON.stringify(result.response);
  assert.ok(serialized.includes('"stability_score":1.0'), serialized);
  assert.ok(serialized.includes('"stability_score":0.0'), serialized);
  assert.equal(result.raw_response, payload);
});

test('a signal-derived null is not reported as a withheld aggregate', async () => {
  // Found by replaying real responses: on both recordings whose basis is
  // `no_check_attempted`, v_score is null while aggregates_publishable is true
  // and every aggregate is published. v_score's own contract says it is null
  // "whenever the factuality signal was not measured", so its null is declared
  // by the signal state, not by aggregate publishability. Classifying it as an
  // aggregate reported those responses as undeclared withholdings, which they
  // are not. This test exists so that misclassification cannot come back.
  const result = await run({
    g_score: 0.6,
    g_final: 1.0,
    v_score: null,
    measured_signals: [],
    unmeasured_signals: {},
    measurement: { status: 'not_attempted', checks_attempted: 0, coverage: 1.0,
      missing_required_signals: [], aggregates_publishable: true },
    governance: { decision: 'ALLOW', decision_basis: 'no_check_attempted' },
    quality: { g_score: 0.6, stability_score: 1.0, confidence: 1.0 },
    metrics: { stability_score: 0.0, energy_score: 0.0 },
    esi: { g_final: 1.0 },
    audit: { measurement_version: '3.3.0' },
  });
  const aid = result.reading_aid;

  assert.deepEqual(aid.aggregates.withheld_paths, []);
  assert.equal(aid.aggregates.undeclared_withholding, false);
  assert.equal(aid.aggregates.publishable, true);

  const derived = aid.signal_derived.find((entry) => entry.path === 'v_score');
  assert.equal(derived.withheld, true);
  assert.equal(derived.signal, 'factual_hallucination_score');
  assert.ok(derived.declared_by.includes('measurement.status'));
  assert.match(derived.null_means, /not by aggregates_publishable/);
});

test('a published signal-derived value is reported as published', async () => {
  const aid = (await run({ ...complete(), v_score: 1.0 })).reading_aid;
  const derived = aid.signal_derived.find((entry) => entry.path === 'v_score');
  assert.equal(derived.withheld, false);
  assert.deepEqual(derived.declared_by, []);
});

test('the two null categories stay separate on a fully withheld response', async () => {
  const aid = (await run({ ...withheld(), v_score: null })).reading_aid;
  // Aggregates withheld AND declared, and the signal-derived null declared by
  // its own mechanism. Both reported, never merged into one verdict.
  assert.ok(aid.aggregates.withheld_paths.length > 0);
  assert.ok(aid.aggregates.declared_by.includes('measurement.aggregates_publishable'));
  const derived = aid.signal_derived.find((entry) => entry.path === 'v_score');
  assert.equal(derived.withheld, true);
  assert.ok(derived.declared_by.includes('unmeasured_signals'));
});

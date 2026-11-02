// The measurement card, held to the presentation layer's standard.
//
// A card is the one surface a person actually reads, so it is the surface
// where honesty is cheapest to lose. These tests are written against the same
// failure the presentation layer exists to prevent, and they use the same two
// REAL recorded responses to do it:
//
//   tier02_01_complete_nominale -> ALLOW, measured_thresholds, 3 checks
//   tier02_04_aucun_controle    -> ALLOW, no_check_attempted, 0 checks
//
// Both decide ALLOW. A card that renders them alike has destroyed the
// distinction the measurement exists to produce, while displaying only values
// the server really published.
//
// V2 ADDED A PICTURE, WHICH IS WHERE THAT FAILURE GETS CHEAP AGAIN. A weather
// keyed to the decision would be the green badge the brand foundation forbids,
// drawn better. So the sky depicts HOW MUCH WAS MEASURED and nothing else, and
// the two tests under "the weather" hold both halves of that: the decision
// cannot move it, and the unevaluated ALLOW draws the emptiest sky there is.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseApiJson } from '../contract.mjs';
import { AID_REFERENCE, readingAid } from '../guidance.mjs';
import { AGREEMENT } from '../reference.mjs';
import { presentation } from '../presentation.mjs';
import { toolDefinition } from '../contract.mjs';
import {
  CARD_SCHEMA, DEFAULT_LANGUAGE, LABELS, LANGUAGES, WEATHER, WEATHER_RULES,
  buildCardModel, label, weatherState,
} from '../ui/view-model.mjs';
import {
  CARD_MIME_TYPE, CARD_RESOURCE_URI, cardHtml, cardResource, cardSha256,
} from '../ui/card.mjs';
import { resolveCaptures } from './captured-fixtures.mjs';

const resolved = resolveCaptures(process.env.NEOMUNDI_CAPTURED_FIXTURES);
const skip = resolved.captures.length === 0
  ? `no recorded response available (looked in ${resolved.attempted.join(', ')}).`
  : false;

function recorded(name) {
  const text = readFileSync(join(resolved.directory, name), 'utf8').replace(/^﻿/, '');
  const parsed = parseApiJson(text);
  return Object.fromEntries(Object.entries(parsed).filter(([key]) => !key.startsWith('_fixture_')));
}

/** Builds the envelope slice the card consumes, through the real projection. */
const envelope = (response, reference = { agreement: AGREEMENT.MATCH, divergence_scope: null }) => ({
  adapter_error: null,
  measurement_reference: reference,
  presentation: presentation(response, {
    aid: readingAid(response, 'json'), reference, aidReference: AID_REFERENCE,
  }),
});

const keyed = (rows, key) => rows.find((r) => r.key === key);

/** A hand-built envelope, for the cases no recording covers. Every field is
 * one the projection publishes; nothing here is invented beyond the shape.
 */
const synthetic = (presentationOverrides = {}, reference = { agreement: AGREEMENT.MATCH, divergence_scope: null }) => ({
  adapter_error: null,
  measurement_reference: reference,
  presentation: {
    decision: 'ALLOW', decision_basis: 'measured_thresholds', decision_is_measured: true,
    measurement_status: 'complete', checks_attempted: 3, checks_succeeded: 3, checks_emitted: 3,
    coverage: 'partial', aggregates_publishable: true, missing_required_signals: [],
    measured_signals: { coherence_score: 0.7697, semantic_risk: 0 },
    unmeasured: {}, evaluators: {}, published_values: {}, caveats: [],
    ...presentationOverrides,
  },
});

// ------------------------------------------------------------- the weather

test('the weather depicts how much was measured, and the decision cannot move it', () => {
  // THE INVARIANT THE WHOLE V2 PICTURE RESTS ON. A sky keyed to the decision
  // would be the green badge on an unevaluated ALLOW that the brand
  // foundation forbids by name, drawn with better art.
  const seen = new Set();
  for (const decision of ['ALLOW', 'FLAG', 'BLOCK', 'REVIEW', null]) {
    seen.add(buildCardModel(synthetic({ decision })).weather.state);
  }
  assert.equal(seen.size, 1, `the decision changed the weather: ${[...seen]}`);
  assert.equal([...seen][0], WEATHER.COMPLETE);

  // And the same from the other side: identical decision, different
  // measurement, different sky.
  const measured = buildCardModel(synthetic({ decision: 'ALLOW' })).weather.state;
  const unmeasured = buildCardModel(synthetic({
    decision: 'ALLOW', decision_is_measured: false, measurement_status: 'not_attempted',
  })).weather.state;
  assert.notEqual(measured, unmeasured);
});

test('an ALLOW decided with no check draws the emptiest sky, never a full one', () => {
  const model = buildCardModel(synthetic({
    decision: 'ALLOW', decision_basis: 'no_check_attempted', decision_is_measured: false,
    measurement_status: 'not_attempted', checks_attempted: 0, checks_succeeded: 0,
    measured_signals: {}, unmeasured: { coherence_score: { cause: 'no_check_attempted' } },
  }));
  assert.equal(model.weather.state, WEATHER.NOT_MEASURED);
  assert.notEqual(model.weather.state, WEATHER.COMPLETE);
  // The reading offered to a non-specialist must not reassure.
  const note = label(model.weather.note_key);
  assert.match(note, /No check was run/);
  assert.match(note, /rests on nothing that was measured/);
});

test('the weather rules are ordered worst-known first, so a complete status cannot bury a gap', () => {
  // A status of `complete` arriving beside a missing required signal is a
  // contradiction in the envelope. The card shows the gap, not the status.
  const contradictory = buildCardModel(synthetic({
    measurement_status: 'complete', missing_required_signals: ['factual_hallucination_score'],
  }));
  assert.equal(contradictory.weather.state, WEATHER.INCOMPLETE);

  // An unmeasured signal alone is enough, with no missing-required list.
  const oneAbsent = buildCardModel(synthetic({
    measurement_status: 'complete', unmeasured: { semantic_risk: { cause: 'judge_unavailable' } },
  }));
  assert.equal(oneAbsent.weather.state, WEATHER.INCOMPLETE);

  // Nothing declared at all is its own state, not a quiet `complete`.
  assert.equal(weatherState({}), WEATHER.UNDECLARED);
  assert.equal(buildCardModel(synthetic({ measurement_status: null })).weather.state, WEATHER.UNDECLARED);

  // The published rules cover every state the function can return.
  const declared = new Set(WEATHER_RULES.map((r) => r.state));
  for (const state of [WEATHER.NOT_MEASURED, WEATHER.INCOMPLETE, WEATHER.COMPLETE, WEATHER.UNDECLARED]) {
    assert.ok(declared.has(state), `${state} is returned but not described in WEATHER_RULES`);
  }
});

test('the only gauges are counts, because a bar asserts a direction a signal value does not carry', () => {
  // `quality.stability_score` has 1 = stable while `metrics.stability_score`
  // has 0 = stable, and `measured_signals` carries no scale. A bar drawn on
  // those would invent a direction for half of them.
  const model = buildCardModel(synthetic({
    checks_attempted: 3, checks_succeeded: 2,
    measured_signals: { coherence_score: 0.7697, semantic_risk: 0 },
    unmeasured: { stability_score: { cause: 'aggregate_withheld' } },
  }));
  assert.deepEqual(Object.keys(model.weather.gauges).sort(), ['checks', 'signals']);
  assert.deepEqual(model.weather.gauges.checks, { numerator: 2, denominator: 3, fraction: 2 / 3 });
  assert.deepEqual(model.weather.gauges.signals, { numerator: 2, denominator: 3, fraction: 2 / 3 });

  // No gauge is ever derived from a measured value.
  const shifted = buildCardModel(synthetic({
    checks_attempted: 3, checks_succeeded: 2,
    measured_signals: { coherence_score: 0.01, semantic_risk: 0.99 },
    unmeasured: { stability_score: { cause: 'aggregate_withheld' } },
  }));
  assert.deepEqual(shifted.weather.gauges, model.weather.gauges);

  // A denominator of zero yields no gauge rather than a division.
  assert.equal(buildCardModel(synthetic({ checks_attempted: 0, checks_succeeded: 0 })).weather.gauges.checks, null);
});

// ------------------------------------------------------------------ test 1

test('the ALLOW pair produces two different cards', { skip }, () => {
  const complete = buildCardModel(envelope(recorded('tier02_01_complete_nominale.json')));
  const none = buildCardModel(envelope(recorded('tier02_04_aucun_controle.json')));

  assert.equal(complete.primary.decision.value.value, none.primary.decision.value.value);
  assert.notEqual(complete.primary.decision.basis.value, none.primary.decision.basis.value);
  assert.notEqual(complete.primary.decision.is_measured.value, none.primary.decision.is_measured.value);
  assert.notEqual(complete.weather.state, none.weather.state);
  assert.ok(none.banners.some((b) => b.kind === 'not_measured'));
  assert.ok(!complete.banners.some((b) => b.kind === 'not_measured'));
});

test('a null is never substituted, and never becomes a zero', () => {
  const model = buildCardModel(synthetic({ coverage: null, confidence_basis: null, measured_signals: { coherence_score: null } }));
  // An unpublished primary row leaves the table and is named instead, so a
  // column of markers cannot bury the facts beside it.
  assert.ok(model.primary.withheld.includes('coverage'));
  assert.ok(model.primary.withheld.includes('confidence_basis'));
  assert.equal(keyed(model.primary.measurement, 'coverage'), undefined);
  // A measured signal with no value stays a signal with no value.
  const signal = model.primary.signals.measured.find((m) => m.name === 'coherence_score');
  assert.equal(signal.published, false);
  assert.equal(signal.value, null);
  assert.notEqual(signal.value, 0);
  assert.notEqual(signal.value, '');
});

test('an unmeasured signal keeps its cause and never joins the measured list', () => {
  const model = buildCardModel(synthetic({
    measured_signals: { coherence_score: 0.7 },
    unmeasured: { factual_hallucination_score: { cause: 'judge_unavailable' } },
  }));
  assert.deepEqual(model.primary.signals.unmeasured, [{ name: 'factual_hallucination_score', cause: 'judge_unavailable' }]);
  assert.equal(model.primary.signals.measured.some((m) => m.name === 'factual_hallucination_score'), false);
});

test('a list of measured signal names is not rendered as missing values', () => {
  const model = buildCardModel(synthetic({ measured_signals: ['coherence_score', 'semantic_risk'] }));
  assert.deepEqual(model.primary.signals.measured_names, ['coherence_score', 'semantic_risk']);
  assert.equal(model.primary.signals.measured.length, 0);
});

test('a divergent version is declared, and narrowed only when something was established', () => {
  const plain = buildCardModel(synthetic({ version_agreement: 'divergent' },
    { agreement: AGREEMENT.DIVERGENT, divergence_scope: null }));
  const divergentBanner = plain.banners.find((b) => b.kind === 'divergent');
  assert.equal(divergentBanner.key, 'banner_divergent');
  assert.match(label(divergentBanner.key), /not comparable/);
  assert.equal(plain.primary.version.scope, null);

  // With an established statement the claim is narrowed, never removed: the
  // agreement row still says divergent, and the per-transport facts appear.
  const scoped = buildCardModel(synthetic({
    version_agreement: 'divergent',
    version_scope: { rest: 'identical', sse: 'decision_may_differ', summary: 'S', unchanged_by_the_bump: 'U' },
  }, { agreement: AGREEMENT.DIVERGENT, divergence_scope: null }));
  assert.equal(scoped.banners.find((b) => b.kind === 'divergent').key, 'banner_divergent_scoped');
  assert.equal(scoped.primary.version.agreement.value, 'divergent');
  assert.equal(scoped.primary.version.scope.rest.value, 'identical');
  assert.equal(scoped.primary.version.scope.sse.value, 'decision_may_differ');
  // The narrowed wording must not claim comparability anywhere.
  assert.equal(/comparable/.test(label('banner_divergent_scoped')), false);
});

test('withheld aggregates and missing required signals are each flagged', () => {
  const withheld = buildCardModel(synthetic({ aggregates_publishable: false }));
  assert.ok(withheld.banners.some((b) => b.kind === 'aggregates_withheld'));
  const missing = buildCardModel(synthetic({ missing_required_signals: ['coherence_score'] }));
  assert.ok(missing.banners.some((b) => b.kind === 'incomplete'));
  assert.deepEqual(missing.primary.lists.missing_required_signals, ['coherence_score']);
});

test('an adapter error is an error, not a measurement', () => {
  const model = buildCardModel({ adapter_error: { code: 'upstream_http_error', message: '502', upstream: { classification: 'transport' } } });
  assert.equal(model.state, 'error');
  assert.equal(model.weather.state, WEATHER.ERROR);
  assert.equal(model.primary, undefined);
  assert.equal(model.error.code.value, 'upstream_http_error');
  assert.match(label(model.weather.note_key), /did not complete/);
});

test('a missing or malformed envelope yields an empty state, never a blank measurement', () => {
  for (const bad of [null, undefined, 'x', 42, []]) {
    const model = buildCardModel(bad);
    assert.equal(model.state, 'empty');
    assert.equal(model.primary, undefined);
    assert.match(label(model.empty_key), /No measurement was produced/);
  }
});

test('the disclaimer is present in every state, in both languages, and is never reworded', () => {
  for (const model of [buildCardModel(null), buildCardModel({ adapter_error: { code: 'x' } }), buildCardModel(synthetic())]) {
    assert.equal(model.disclaimer_key, 'disclaimer');
  }
  for (const language of LANGUAGES) {
    const text = label('disclaimer', language);
    assert.ok(text.length > 40, `${language} disclaimer is too short to say what it must`);
    for (const must of language === 'en'
      ? ['execution permission', 'compliance verdict', 'hallucination']
      : ['autorisation d’exécution', 'verdict de', 'hallucination']) {
      assert.ok(text.includes(must), `the ${language} disclaimer lost "${must}"`);
    }
  }
});

test('the card vocabulary contains no verdict, severity or risk word, in either language', () => {
  const forbidden = [
    'safe', 'unsafe', 'danger', 'risky', 'severe', 'critical', 'warning', 'good', 'bad',
    'pass', 'fail', 'trustworthy', 'reliable', 'accurate', 'correct answer', 'verified',
    'sûr', 'dangereux', 'risqué', 'grave', 'critique', 'fiable', 'exact', 'vérifié', 'bon', 'mauvais',
  ];
  for (const [key, entry] of Object.entries(LABELS)) {
    for (const language of LANGUAGES) {
      const text = (entry[language] ?? '').toLowerCase();
      for (const word of forbidden) {
        // `correct` appears only where the card says it does NOT know whether
        // the answer is correct, which is the opposite of a verdict.
        if (word === 'correct answer' || word === 'exact') continue;
        assert.equal(new RegExp(`\\b${word}\\b`).test(text), false,
          `${key}.${language} contains the ${word === text ? '' : 'forbidden '}word "${word}"`);
      }
    }
  }
});

test('every key the model emits resolves in both languages', () => {
  const keys = new Set();
  const walk = (node) => {
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (node === null || typeof node !== 'object') return;
    if (typeof node.key === 'string') keys.add(node.key);
    for (const [name, value] of Object.entries(node)) {
      if (name.endsWith('_key') && typeof value === 'string') keys.add(value);
      else walk(value);
    }
  };
  for (const model of [
    buildCardModel(null),
    buildCardModel({ adapter_error: { code: 'x', message: 'y', upstream: { classification: 'transport' } } }),
    buildCardModel(synthetic()),
    buildCardModel(synthetic({ decision_is_measured: false, measurement_status: 'not_attempted' })),
    buildCardModel(synthetic({ version_agreement: 'divergent', version_scope: { rest: 'identical', sse: 'decision_may_differ', summary: 'S', unchanged_by_the_bump: 'U' } })),
    buildCardModel(synthetic({ evaluators: { coherence_score: { evaluator: 'embeddings', model_used: 'nomic-embed-text', status: 'ok' } } })),
  ]) walk(model);

  // Section and list headings the renderer resolves directly.
  for (const extra of [
    'card_title', 'not_published', 'language_toggle', 'empty', 'weather_heading', 'weather_rule',
    'checks_ratio', 'signals_ratio', 'section_decision', 'section_measurement', 'section_signals',
    'section_version', 'section_caveats', 'decision_reasons', 'missing_required_signals',
    'degraded_g_inputs', 'failed_checks', 'section_withheld', 'withheld_note', 'details_summary',
    'details_note', 'section_evaluators', 'section_identity', 'section_provenance',
    'section_published', 'section_unmodelled', 'section_error', 'signals_measured',
    'signals_unmeasured', 'signal_cause', 'evaluator_signal', 'evaluator_name', 'evaluator_model',
    'evaluator_status', 'evaluator_reason',
  ]) keys.add(extra);

  assert.ok(keys.size > 25, `only ${keys.size} keys were collected; the walk is not reaching the model`);
  for (const key of keys) {
    assert.ok(Object.hasOwn(LABELS, key), `the model emits "${key}" but LABELS does not declare it`);
    for (const language of LANGUAGES) {
      assert.equal(typeof LABELS[key][language], 'string', `${key} has no ${language} text`);
      assert.ok(LABELS[key][language].length > 0, `${key}.${language} is empty`);
    }
  }
  assert.equal(DEFAULT_LANGUAGE, 'en');
});

test('evaluator identifiers stay out of the primary view', () => {
  // The product view names what was measured. Which model produced it is
  // provenance, and belongs with the rest of the provenance.
  const model = buildCardModel(synthetic({
    evaluators: {
      coherence_score: { evaluator: 'embeddings', model_used: 'nomic-embed-text', status: 'ok' },
      semantic_risk: { evaluator: 'guard', model_used: 'llama-guard3:1b', status: 'ok' },
    },
  }));
  const primary = JSON.stringify(model.primary);
  for (const identifier of ['nomic-embed-text', 'llama-guard3:1b', 'embeddings', 'guard']) {
    assert.equal(primary.includes(identifier), false, `${identifier} leaked into the primary view`);
  }
  // And it is still there, in full, one disclosure away.
  const secondary = JSON.stringify(model.secondary);
  assert.ok(secondary.includes('nomic-embed-text'));
  assert.ok(secondary.includes('llama-guard3:1b'));
});

test('the disclosure is described as a reading device, never as a protection', () => {
  for (const language of LANGUAGES) {
    const note = label('details_note', language);
    for (const must of language === 'en'
      ? ['structured output', 'protects nothing']
      : ['sortie', 'ne protège rien']) {
      assert.ok(note.includes(must), `the ${language} disclosure note lost "${must}"`);
    }
  }
});

test('no list is ever shortened', () => {
  const reasons = Array.from({ length: 200 }, (_, i) => `motif_${i}`);
  const model = buildCardModel(synthetic({ decision_reasons: reasons }));
  assert.equal(model.primary.decision.reasons.length, 200);
  assert.deepEqual(model.primary.decision.reasons, reasons);
});

test('the model does not mutate the envelope it was given', () => {
  const input = synthetic({ unmeasured: { a: { cause: 'b' } } });
  const before = JSON.stringify(input);
  buildCardModel(input);
  assert.equal(JSON.stringify(input), before);
});

// ---------------------------------------------------------------- resource

test('the resource is self-contained, correctly typed, and deterministic', () => {
  const resource = cardResource();
  assert.equal(resource.uri, CARD_RESOURCE_URI);
  assert.equal(resource.mimeType, CARD_MIME_TYPE);
  assert.deepEqual(resource._meta.ui.csp, { connectDomains: [], resourceDomains: [] });
  assert.deepEqual(resource._meta['openai/ui'].availableDisplayModes, ['inline']);

  const summary = resource._meta['openai/widgetDescription'];
  assert.match(summary, /HOW MUCH was measured/);
  assert.match(summary, /not published/);
  assert.match(summary, /grants no\s+execution permission/);
  assert.equal(resource._meta.ui.domain, undefined);

  const html = cardHtml();
  // Nothing is fetched, and the check stays a plain substring search so that
  // "nothing is loaded" is verifiable by reading the document. The aperture
  // is drawn in CSS rather than SVG for exactly this reason: the SVG
  // namespace is itself a URL.
  for (const pattern of [/https?:\/\//, /<link\b/i, /<img\b/i, /\bsrc\s*=/i, /@import/i, /fonts\.googleapis/i]) {
    assert.equal(pattern.test(html), false, `the card must not reference ${pattern}`);
  }
  assert.equal(/innerHTML/.test(html), false, 'the card must never use innerHTML');
  assert.equal(/document\.write/.test(html), false);
  assert.ok(html.includes('textContent'));
  // Responsive by construction: a viewport meta and a narrow-width rule.
  assert.match(html, /name="viewport"/);
  assert.match(html, /@media \(max-width/);

  assert.equal(cardSha256(), cardSha256());
  assert.match(cardSha256(), /^[0-9a-f]{64}$/);
  assert.equal(cardHtml(), html);
});

test('the inlined view model is the tested one, altered only by export stripping', () => {
  const source = readFileSync(new URL('../ui/view-model.mjs', import.meta.url), 'utf8');
  const html = cardHtml();
  assert.equal(/^export /m.test(source), true, 'the module must export');
  const stripped = source.replace(/^export (const|function) /gm, '$1 ');
  assert.ok(html.includes(stripped), 'the card must inline the real view model');
  assert.equal(stripped.length, source.length - ('export '.length * (source.match(/^export (const|function) /gm) ?? []).length));
  assert.equal(/\bexport\b/.test(stripped), false, 'no export may survive into the document');
  assert.equal(/\bimport\b/.test(stripped), false, 'the inlined view model must not import anything');
});

test('the tool points at the card, under both spellings', () => {
  assert.equal(toolDefinition._meta['openai/outputTemplate'], CARD_RESOURCE_URI);
  assert.equal(toolDefinition._meta.ui.resourceUri, CARD_RESOURCE_URI);
  // The URI is a cache key: it carries a version, so a breaking change can
  // publish a new one instead of silently changing this document. V2 did.
  assert.match(CARD_RESOURCE_URI, /^ui:\/\/[a-z0-9-]+\/card-v\d+\.html$/);
  assert.match(CARD_RESOURCE_URI, /card-v2\.html$/);
});

test('the card model declares its own schema', () => {
  assert.equal(CARD_SCHEMA, 'neomundi-mcp-card/2');
  for (const model of [buildCardModel(null), buildCardModel(synthetic())]) {
    assert.equal(model.schema, CARD_SCHEMA);
  }
});

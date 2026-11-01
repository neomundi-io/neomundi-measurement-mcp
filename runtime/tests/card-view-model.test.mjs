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
  CARD_SCHEMA, DISCLAIMER, NOT_PUBLISHED, VOCABULARY, buildCardModel,
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

const labelled = (rows, label) => rows.find((r) => r.label === label);

// ------------------------------------------------------------------ test 1

test('the ALLOW pair produces two different cards', { skip }, () => {
  const complete = buildCardModel(envelope(recorded('tier02_01_complete_nominale.json')));
  const none = buildCardModel(envelope(recorded('tier02_04_aucun_controle.json')));

  // Same word, not the same statement.
  assert.equal(complete.decision.value.value, 'ALLOW');
  assert.equal(none.decision.value.value, 'ALLOW');

  // Each distinction asserted separately, so a failure names which one was lost.
  assert.notEqual(complete.decision.basis.value, none.decision.basis.value);
  assert.notEqual(complete.decision.is_measured.value, none.decision.is_measured.value);
  assert.notEqual(
    labelled(complete.measurement, 'État de la mesure').value,
    labelled(none.measurement, 'État de la mesure').value,
  );
  assert.notEqual(
    labelled(complete.measurement, 'Contrôles tentés').value,
    labelled(none.measurement, 'Contrôles tentés').value,
  );

  // And the unmeasured one carries the banner that says so, in words.
  const kinds = (m) => m.banners.map((b) => b.kind);
  assert.ok(kinds(none).includes('not_measured'), 'the unevaluated ALLOW must be flagged');
  assert.ok(!kinds(complete).includes('not_measured'), 'the measured ALLOW must not be flagged');

  // The two cards must not serialise identically, whatever else changes.
  assert.notDeepEqual(complete, none);
});

// ------------------------------------------------------------------ test 2

test('a null is never substituted, and never becomes a zero', () => {
  const model = buildCardModel({
    adapter_error: null,
    presentation: {
      decision: 'FLAG', decision_basis: 'measured_thresholds', decision_is_measured: true,
      measurement_status: 'partial', coverage: null, checks_attempted: 3,
      measured_signals: { stability_score: 0, coherence_score: null },
      aggregates_publishable: false,
    },
  });
  const coverage = labelled(model.measurement, 'Couverture');
  assert.equal(coverage.published, false);
  assert.equal(coverage.value, null);

  // A real zero stays a published zero; an absent value stays absent. The two
  // must never collapse into one another.
  const zero = labelled(model.signals.measured, 'stability_score');
  const absent = labelled(model.signals.measured, 'coherence_score');
  assert.deepEqual([zero.published, zero.value], [true, 0]);
  assert.deepEqual([absent.published, absent.value], [false, null]);
});

// ------------------------------------------------------------------ test 3

test('an unmeasured signal keeps its cause and never joins the measured list', () => {
  const model = buildCardModel({
    adapter_error: null,
    presentation: {
      decision: 'ALLOW', decision_is_measured: true,
      measured_signals: { stability_score: 0.9 },
      unmeasured: [
        { signal: 'coherence_score', cause: 'coherence_service_unavailable' },
        { signal: 'semantic_risk', cause: 'insufficient_coverage' },
      ],
    },
  });
  assert.equal(model.signals.measured.length, 1);
  assert.equal(model.signals.unmeasured.length, 2);
  assert.deepEqual(model.signals.measured_names, []);
  assert.deepEqual(
    model.signals.unmeasured.map((u) => [u.name, u.cause]),
    [['coherence_score', 'coherence_service_unavailable'], ['semantic_risk', 'insufficient_coverage']],
  );
  // No unmeasured signal may appear among the measured ones under any name.
  const measuredNames = model.signals.measured.map((r) => r.label);
  for (const u of model.signals.unmeasured) assert.ok(!measuredNames.includes(u.name));
});

// ------------------------------------------------------------------ test 4

test('a list of measured signal names is not rendered as missing values', () => {
  // The upstream field is sometimes a mapping name -> value and sometimes a
  // plain list of names. Treating the list as rows would print "non publié"
  // beside every measured signal, which reads as a failure to produce a value
  // for a signal that was in fact measured. The two shapes stay separate.
  const named = buildCardModel({
    adapter_error: null,
    presentation: { decision: 'ALLOW', measured_signals: ['stability_score', 'coherence_score'] },
  });
  assert.deepEqual(named.signals.measured, []);
  assert.deepEqual(named.signals.measured_names, ['stability_score', 'coherence_score']);

  const mapped = buildCardModel({
    adapter_error: null,
    presentation: { decision: 'ALLOW', measured_signals: { stability_score: 0.9 } },
  });
  assert.deepEqual(mapped.signals.measured_names, []);
  assert.deepEqual([mapped.signals.measured[0].label, mapped.signals.measured[0].value], ['stability_score', 0.9]);
});

test('a divergent version is declared not comparable', () => {
  const model = buildCardModel({
    adapter_error: null,
    measurement_reference: { agreement: 'divergent', divergence_scope: { rest: 'identical' } },
    presentation: { decision: 'ALLOW', decision_is_measured: true, version_agreement: 'divergent' },
  });
  const banner = model.banners.find((b) => b.kind === 'divergent');
  assert.ok(banner, 'a divergent agreement must be flagged');
  assert.match(banner.text, /n’est pas comparable/);
  assert.equal(labelled(model.provenance, 'Accord de version').value, 'divergent');
});

// ------------------------------------------------------------------ test 5

test('withheld aggregates and missing required signals are each flagged', () => {
  const model = buildCardModel({
    adapter_error: null,
    presentation: {
      decision: 'ALLOW', decision_is_measured: true,
      aggregates_publishable: false, missing_required_signals: ['coherence_score'],
    },
  });
  const kinds = model.banners.map((b) => b.kind);
  assert.ok(kinds.includes('aggregates_withheld'));
  assert.ok(kinds.includes('incomplete'));
  assert.deepEqual(model.lists.missing_required_signals, ['coherence_score']);
});

// ------------------------------------------------------------------ test 6

test('an adapter error is an error, not a measurement', () => {
  const model = buildCardModel({
    adapter_error: { code: 'NETWORK_ERROR', message: 'upstream unreachable', upstream: null },
    presentation: null,
  });
  assert.equal(model.state, 'error');
  // Nothing that could be read as a result exists on an error card.
  assert.equal(model.decision, undefined);
  assert.equal(model.signals, undefined);
  assert.equal(model.measurement, undefined);
  assert.match(model.empty, /Aucune mesure/);
  assert.equal(model.disclaimer, DISCLAIMER);
});

test('a missing or malformed envelope yields an empty state, never a blank measurement', () => {
  for (const bad of [null, undefined, 'x', 42, []]) {
    const model = buildCardModel(bad);
    assert.equal(model.state, 'empty');
    assert.equal(model.decision, undefined);
    assert.equal(model.disclaimer, DISCLAIMER);
  }
});

// ------------------------------------------------------------------ test 7

test('the disclaimer is present in every state and is never reworded', () => {
  const states = [
    buildCardModel(null),
    buildCardModel({ adapter_error: { code: 'X', message: 'y' } }),
    buildCardModel({ adapter_error: null, presentation: { decision: 'ALLOW' } }),
  ];
  for (const m of states) {
    assert.equal(m.disclaimer, DISCLAIMER);
    assert.match(m.disclaimer, /n’est pas une autorisation/);
    assert.match(m.disclaimer, /ni un verdict de conformité/);
    assert.match(m.disclaimer, /absence d’hallucination/);
  }
});

// ------------------------------------------------------------------ test 8

test('the card vocabulary contains no verdict, severity or risk word', () => {
  // Same guard as the presentation layer's frozen vocabulary: every string the
  // card can emit that was not copied from the server is listed, and none of
  // these words may appear in it.
  // Whole words, not substrings. "sure" is a substring of "mesure" and
  // "risque" of "risquer"; matching on substrings would condemn the word
  // "Mesure" in the card's own title and teach the next reader to weaken the
  // guard instead of trusting it.
  const forbiddenWords = [
    'risqué', 'risqués', 'risque', 'risques', 'dangereux', 'danger', 'sûr', 'sûre', 'sure',
    'fiable', 'conforme', 'conformité', 'approuvé', 'approuvée', 'validé', 'validée',
    'certifié', 'certifiée', 'garanti', 'garantie', 'sécurisé', 'sécurisée',
    'excellent', 'mauvais', 'bon', 'bonne', 'faible', 'élevé', 'élevée',
    'grave', 'critique', 'devrait', 'recommandé', 'recommandation',
  ];
  // The disclaimer is excluded, and only the disclaimer: it is the one string
  // that may name conformity, safety and hallucination, because it DENIES all
  // three. Folding it into the haystack would make this test fail on the very
  // sentence that protects the reader.
  const tokens = new Set(
    VOCABULARY.filter((entry) => entry !== DISCLAIMER)
      .join(' ').toLowerCase()
      .split(/[^\p{L}]+/u).filter(Boolean),
  );
  for (const word of forbiddenWords) {
    assert.equal(tokens.has(word), false, `vocabulary must not contain the word "${word}"`);
  }
  // The guard must still be capable of catching one, or it proves nothing.
  assert.equal(new Set('cette réponse paraît risquée'.split(/[^\p{L}]+/u)).has('risquée'), true);
  assert.ok(DISCLAIMER.includes('conformité'));
  assert.ok(DISCLAIMER.includes('sûreté'));
});

test('every label the model emits is declared in the vocabulary', () => {
  const model = buildCardModel(envelopeLike());
  const labels = [
    ...model.identity.map((r) => r.label),
    ...model.measurement.map((r) => r.label),
    ...model.provenance.map((r) => r.label),
    model.decision.value.label, model.decision.basis.label, model.decision.is_measured.label,
  ];
  for (const label of labels) {
    assert.ok(VOCABULARY.includes(label), `label "${label}" must be declared in VOCABULARY`);
  }
  for (const banner of model.banners) {
    assert.ok(VOCABULARY.includes(banner.text), `banner "${banner.text}" must be declared`);
  }
});

function envelopeLike() {
  return {
    adapter_error: null,
    measurement_reference: { agreement: 'divergent', divergence_scope: null },
    presentation: {
      decision: 'ALLOW', decision_basis: 'no_check_attempted', decision_is_measured: false,
      measurement_status: 'not_attempted', aggregates_publishable: false,
      missing_required_signals: ['coherence_score'], version_agreement: 'divergent',
    },
  };
}

// ------------------------------------------------------------------ test 9

test('no list is ever shortened', () => {
  const reasons = Array.from({ length: 200 }, (_, i) => `motif_${i}`);
  const model = buildCardModel({
    adapter_error: null,
    presentation: { decision: 'FLAG', decision_is_measured: true, decision_reasons: reasons },
  });
  assert.equal(model.decision.reasons.length, 200);
  assert.deepEqual(model.decision.reasons, reasons);
});

test('the model does not mutate the envelope it was given', () => {
  const input = envelopeLike();
  const before = JSON.stringify(input);
  buildCardModel(input);
  assert.equal(JSON.stringify(input), before);
});

// ----------------------------------------------------------------- test 10

test('the resource is self-contained, correctly typed, and deterministic', () => {
  const resource = cardResource();
  assert.equal(resource.uri, CARD_RESOURCE_URI);
  assert.equal(resource.mimeType, CARD_MIME_TYPE);
  // The host applies a strict policy; the card must request nothing.
  assert.deepEqual(resource._meta.ui.csp, { connectDomains: [], resourceDomains: [] });

  const html = cardHtml();
  for (const pattern of [/https?:\/\//, /<link\b/i, /<img\b/i, /\bsrc\s*=/i, /@import/i, /fonts\.googleapis/i]) {
    assert.equal(pattern.test(html), false, `the card must not reference ${pattern}`);
  }
  // Values must reach the document as text, never as markup.
  assert.equal(/innerHTML/.test(html), false, 'the card must never use innerHTML');
  assert.equal(/document\.write/.test(html), false);
  assert.ok(html.includes('textContent'));

  // Same bytes on every build, so the SHA-256 identifies the card.
  assert.equal(cardSha256(), cardSha256());
  assert.match(cardSha256(), /^[0-9a-f]{64}$/);
  assert.equal(cardHtml(), html);
});

test('the inlined view model is the tested one, altered only by export stripping', () => {
  const source = readFileSync(new URL('../ui/view-model.mjs', import.meta.url), 'utf8');
  const html = cardHtml();
  // The card must inline THIS file, so the logic a reader is shown is the
  // logic these tests exercise.
  assert.equal(/^export /m.test(source), true, 'the module must export');
  const stripped = source.replace(/^export (const|function) /gm, '$1 ');
  assert.ok(html.includes(stripped), 'the card must inline the real view model');

  // The transform is removal only: the body is untouched once the `export `
  // prefixes are gone, and nothing is left that a classic script cannot run.
  assert.equal(stripped.length, source.length - ('export '.length * (source.match(/^export (const|function) /gm) ?? []).length));
  assert.equal(/\bexport\b/.test(stripped), false, 'no export may survive into the document');
  assert.equal(/\bimport\b/.test(stripped), false, 'the inlined view model must not import anything');
});

test('the tool points at the card, under both spellings', () => {
  assert.equal(toolDefinition._meta['openai/outputTemplate'], CARD_RESOURCE_URI);
  assert.equal(toolDefinition._meta.ui.resourceUri, CARD_RESOURCE_URI);
  // The URI is a cache key: it carries a version, so a breaking change can
  // publish a new one instead of silently changing this document.
  assert.match(CARD_RESOURCE_URI, /^ui:\/\/[a-z0-9-]+\/card-v\d+\.html$/);
});

test('the card model declares its own schema', () => {
  assert.equal(buildCardModel(envelopeLike()).schema, CARD_SCHEMA);
  assert.equal(NOT_PUBLISHED, 'non publié');
});

import { isObject, owns, scalar } from './contract.mjs';

/** A reading aid for an agent, built BESIDE the response and never inside it.
 *
 * A complete REST response carries 27 root fields and about 160 values across
 * 11 blocks. Five field names appear twice with different meanings, two of them
 * on INVERTED scales. An agent handed that raw can reach the opposite of the
 * measurement in good faith — `metrics.stability_score` of 0.06 means highly
 * stable, and reads like a catastrophe.
 *
 * Three rules this module never breaks:
 *
 *  1. It does not touch `response`. Not a key, not a value, not an order.
 *     It only reads, and it reports what it found by path.
 *  2. It does not resolve an ambiguity. Where two fields share a name, BOTH
 *     are reported with their own meaning; this module never picks one, and
 *     never derives a third "corrected" value.
 *  3. It states nothing it did not observe. Every entry is keyed on a field
 *     actually present in this response. A payload without a block produces no
 *     entry for it, rather than an entry saying null.
 */
export const READING_AID_SCHEMA = 'neomundi-mcp-reading-aid/1';

/** The five same-name fields of the REST contract, with what each one means.
 *
 * Verified present, with these roles, in the 11 recorded responses that
 * `tests/captured-rest.test.mjs` replays. `quality.stability_score` and
 * `metrics.stability_score` summed to exactly 1.0 in every one of them.
 */
const HOMONYMS = Object.freeze([
  Object.freeze({
    name: 'stability_score',
    severity: 'inverted_scales',
    readings: Object.freeze([
      Object.freeze({ path: 'quality.stability_score', formula: 'G / 0.60', scale: '1 = stable, 0 = unstable' }),
      Object.freeze({ path: 'metrics.stability_score', formula: '1 - G / 0.60', scale: '0 = stable, 1 = unstable' }),
    ]),
    note: 'The same name on OPPOSITE scales. Reading the wrong one inverts the conclusion. Observed effective range of the quality reading: [0.60 ; 1.00] — 0.67 is near the floor, not a middling value.',
  }),
  Object.freeze({
    name: 'Q',
    severity: 'different_quantities',
    readings: Object.freeze([
      Object.freeze({ path: 'esi.q_value', formula: 'min(1, N / E)', scale: 'saturated near 1 for a realistic length' }),
      Object.freeze({ path: 'baseline.esi_q', formula: 'sliding-window variability held in server process memory', scale: 'not comparable with esi.q_value' }),
    ]),
    note: 'Two unrelated quantities. baseline.esi_q depends on process-local history, so it is not reproducible across server restarts.',
  }),
  Object.freeze({
    name: 'density',
    severity: 'different_quantities',
    readings: Object.freeze([
      Object.freeze({ path: 'quality.information_density', formula: 'text density', scale: 'enters no aggregate' }),
      Object.freeze({ path: 'density.informational_density', formula: "feeds g_final's P term", scale: 'enters the aggregate' }),
    ]),
    note: 'One is reported only; the other changes g_final. They are not interchangeable.',
  }),
  Object.freeze({
    name: 'delta_E',
    severity: 'ambiguous_sign',
    readings: Object.freeze([
      Object.freeze({ path: 'baseline.delta_E', formula: 'documented as observed - reference; implemented as reference - observed', scale: 'sign is the opposite of its own documentation' }),
    ]),
    note: 'Reported, not settled. baseline.observed_energy and baseline.reference_energy are both published in the same block: recompute from them rather than trusting the sign.',
  }),
  Object.freeze({
    name: 'delta_g',
    severity: 'misleading_name',
    readings: Object.freeze([
      Object.freeze({ path: 'delta_g', formula: 'G of this call minus G of the PREVIOUS call from the same account', scale: 'not a drift measurement' }),
    ]),
    note: 'It compares against whatever request came before on the same account, including an unrelated one. The reference is overwritten on every call and is not published. See BL-003.',
  }),
]);

/** The root aliases and block fields that carry an aggregate. When an aggregate
 * is withheld the server publishes null and says so elsewhere; the point of
 * listing them is that a null here is a DECLARED absence, not a gap.
 */
const AGGREGATE_PATHS = Object.freeze([
  'g_score', 'g_final',
  'quality.g_score', 'quality.stability_score', 'quality.confidence',
  'metrics.stability_score', 'metrics.energy_score',
  'esi.g_final',
]);

/** Values derived from ONE signal, not from the aggregate.
 *
 * `v_score` belongs here and not above. Its contract states it is null
 * "whenever the factuality signal was not measured: no llm_response supplied,
 * detection disabled, OR the judge ran and failed". So its null is declared by
 * the signal state -- `measured_signals`, `unmeasured_signals`,
 * `measurement.status` -- and NOT by `aggregates_publishable`.
 *
 * Observed: on both recorded responses whose decision_basis is
 * `no_check_attempted`, `v_score` is null while `aggregates_publishable` is
 * true and every aggregate is published. Treating it as an aggregate would
 * have reported those as undeclared withholdings, which they are not.
 */
const SIGNAL_DERIVED = Object.freeze([
  Object.freeze({
    path: 'v_score',
    signal: 'factual_hallucination_score',
    formula: '1 - factual_hallucination_score',
    scale: '1 = no detected factual error, 0 = everything looks made up',
    null_means: 'The factuality signal was not measured: no llm_response supplied, detection disabled, or the judge ran and failed. Declared by the signal state, not by aggregates_publishable.',
  }),
]);

const SEMANTIC_SIGNALS = Object.freeze([
  'coherence_score', 'semantic_risk', 'factual_hallucination_score', 'semantic_instability_score',
]);

/** Known backend limitations. `applies` is computed from THIS response only;
 * a limitation that cannot be observed here is reported as not observed rather
 * than omitted, so an agent sees the whole register either way.
 */
const LIMITATIONS = Object.freeze([
  Object.freeze({
    id: 'BL-001',
    title: 'Trial account and key status inconsistency',
    statement: 'A trial-tier account can receive HTTP 402 reporting an exhausted quota while quota remains, and can end up with every key on the account suspended. Later calls then return 401.',
    what_to_do: 'On a 402 or a sudden 401, verify the remaining quota and the key status before concluding the credential is wrong. Report it rather than provisioning a new key.',
  }),
  Object.freeze({
    id: 'BL-002',
    title: 'SSE governance decision depends on network chunking',
    statement: 'On the streaming route the published decision depends on how the provider slices the stream, because the interim measurement windows are counted in chunks rather than in tokens or characters. The same text delivered in a different number of fragments can yield a different decision.',
    what_to_do: 'Do not base a published figure or a comparison between models on a streaming measurement. The REST route is unaffected.',
  }),
  Object.freeze({
    id: 'BL-003',
    title: 'delta_g published while the aggregate is withheld',
    statement: 'delta_g carries a number even when the aggregate is withheld, and the server-side reference it is measured against can be derived from a call whose own aggregate was not published.',
    what_to_do: 'Check that aggregates are publishable before interpreting delta_g. Treat it as an interval against an unpublished reference, never as a drift metric.',
  }),
]);

const at = (response, path) => {
  let node = response;
  for (const key of path.split('.')) {
    if (!isObject(node) || !owns(node, key)) return { present: false };
    node = node[key];
  }
  return { present: true, value: node };
};

/** Collects the paths whose value is explicitly null, so that an agent can see
 * a declared absence as such. A null is never turned into zero, false, an
 * empty string or a missing key — here or anywhere else in this connector.
 */
function nullPaths(node, prefix, found, limit) {
  if (found.length >= limit || !isObject(node)) return;
  for (const key of Object.keys(node)) {
    if (found.length >= limit) return;
    const path = prefix ? `${prefix}.${key}` : key;
    const value = node[key];
    if (value === null) found.push(path);
    else if (isObject(value)) nullPaths(value, path, found, limit);
  }
}

/** Builds the aid for one response. `transport` is the envelope's own value.
 *
 * Returns null when there is nothing to read — no response object at all. An
 * aid describing an absent response would be a statement about nothing.
 */
export function readingAid(response, transport) {
  if (!isObject(response)) return null;
  const NULL_LIMIT = 64;

  const homonyms = HOMONYMS
    .map((group) => {
      const readings = group.readings.filter((reading) => at(response, reading.path).present);
      return readings.length ? { ...group, readings } : null;
    })
    .filter(Boolean);

  const withheld = [];
  const published = [];
  for (const path of AGGREGATE_PATHS) {
    const found = at(response, path);
    if (!found.present) continue;
    (found.value === null ? withheld : published).push(path);
  }

  const measurement = isObject(response.measurement) ? response.measurement : {};
  const publishable = owns(measurement, 'aggregates_publishable')
    ? scalar(measurement.aggregates_publishable) : null;
  const missing = Array.isArray(measurement.missing_required_signals)
    ? measurement.missing_required_signals.map(scalar) : [];

  // How the server DECLARED the withholding. Listing the declarations is the
  // point: a withheld aggregate that nothing declares would be indistinguishable
  // from a serialization gap, and that is worth reporting as an anomaly.
  const declaredBy = [];
  if (publishable === false) declaredBy.push('measurement.aggregates_publishable');
  if (missing.length) declaredBy.push('measurement.missing_required_signals');
  if (scalar(response.governance?.decision_basis) === 'incomplete_measurement') {
    declaredBy.push('governance.decision_basis');
  }

  // Signal-derived values, reported with what declares their null. Separate
  // from the aggregates above, because a different mechanism declares them.
  const measuredSignals = Array.isArray(response.measured_signals)
    ? response.measured_signals.map(scalar) : [];
  const status = scalar(measurement.status) ?? null;
  const signalDerived = SIGNAL_DERIVED
    .map((entry) => {
      const found = at(response, entry.path);
      if (!found.present) return null;
      const withheldHere = found.value === null;
      const declarations = [];
      if (withheldHere) {
        if (isObject(response.unmeasured_signals) && owns(response.unmeasured_signals, entry.signal)) {
          declarations.push('unmeasured_signals');
        }
        if (measuredSignals.length && !measuredSignals.includes(entry.signal)) {
          declarations.push('measured_signals');
        }
        if (status === 'not_attempted' || status === 'partial') declarations.push('measurement.status');
      }
      return { ...entry, withheld: withheldHere, declared_by: declarations };
    })
    .filter(Boolean);

  const unmeasured = [];
  const unmeasuredBlock = isObject(response.unmeasured_signals) ? response.unmeasured_signals : {};
  for (const signal of Object.keys(unmeasuredBlock)) {
    const cause = scalar(unmeasuredBlock[signal]);
    unmeasured.push({
      signal,
      cause: typeof cause === 'string' && cause.trim() ? cause : null,
      // A timeout and an unreachable evaluator share one cause upstream, so a
      // *_service_unavailable value cannot tell them apart. Said once, here.
      cause_is_ambiguous: typeof cause === 'string' && cause.endsWith('_service_unavailable'),
    });
  }

  const nulls = [];
  nullPaths(response, '', nulls, NULL_LIMIT + 1);
  const truncated = nulls.length > NULL_LIMIT;

  const basis = scalar(response.governance?.decision_basis) ?? null;

  return {
    schema: READING_AID_SCHEMA,
    applies_to: transport ?? null,
    // Said first because it is the sentence most often got wrong.
    statement: 'A measurement is not a permission, a compliance verdict, or evidence of truth, safety or absence of hallucination. This aid describes how to read the response beside it; it changes nothing in it.',
    homonyms,
    aggregates: {
      publishable: publishable,
      withheld_paths: withheld,
      published_paths: published,
      missing_required_signals: missing,
      declared_by: declaredBy,
      // The invariant worth checking on every response rather than trusting.
      undeclared_withholding: withheld.length > 0 && declaredBy.length === 0,
    },
    signal_derived: signalDerived,
    decision_basis: {
      value: basis,
      meaning: basis === 'measured_thresholds'
        ? 'Decided against thresholds on measured signals.'
        : basis === 'incomplete_measurement'
          ? 'A required signal was not measured; aggregates are withheld.'
          : basis === 'no_check_attempted'
            ? 'No semantic check was run at all. An ALLOW here is not a statement that nothing was found.'
            : basis === null
              ? 'Not declared in this response.'
              : 'Not one of the three documented values. Report it: the upstream contract moved.',
    },
    unmeasured_signals: unmeasured,
    semantic_signals_watched: SEMANTIC_SIGNALS,
    nulls: {
      count: truncated ? NULL_LIMIT : nulls.length,
      truncated,
      paths: nulls.slice(0, NULL_LIMIT),
      note: 'Explicitly null in the response. A declared absence, preserved as null and never substituted with zero, false or a missing key.',
    },
    known_limitations: LIMITATIONS.map((limitation) => ({
      ...limitation,
      observable_here: limitation.id === 'BL-002'
        ? transport === 'sse'
        : limitation.id === 'BL-003'
          ? at(response, 'delta_g').present && at(response, 'delta_g').value !== null && publishable === false
          : null,
    })),
  };
}

/** Exported for tests, so the aid's reference data is asserted rather than
 * restated in a second place that could drift from it.
 */
export const AID_REFERENCE = Object.freeze({
  HOMONYMS, AGGREGATE_PATHS, SIGNAL_DERIVED, SEMANTIC_SIGNALS, LIMITATIONS,
});

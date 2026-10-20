/** A faithful projection of a measurement, for a reader who needs it flat.
 *
 * WHAT THIS IS. One object, beside `response`, never inside it. Named fields,
 * each either copied verbatim from a declared source path or explicitly null.
 * It exists so a person or an agent can read a result without walking a deep
 * document — and without the walk changing what the result says.
 *
 * WHAT THIS IS NOT. Not a summary, not a verdict, not a score, not prose. It
 * computes nothing, rescales nothing, rounds nothing, and ranks nothing. It
 * adds no adjective the server did not publish. A caller who wants a sentence
 * writes it from these fields and owns what they wrote.
 *
 * THE ONE DERIVED FIELD is `decision_is_measured`, and it is the restatement of
 * an equality — `decision_basis === "measured_thresholds"` — not a judgement.
 * It exists because of the failure this whole module is designed against:
 *
 *   `tier02_01_complete_nominale`  -> ALLOW, measured_thresholds, 3 checks
 *   `tier02_04_aucun_controle`     -> ALLOW, no_check_attempted, 0 checks
 *
 * Both are real recorded responses. Both decide ALLOW. The second was never
 * evaluated. A presentation that renders them the same has destroyed the
 * distinction the measurement exists to make, while displaying only values the
 * server really published. `tests/presentation.test.mjs` fails if they ever
 * come out equal on that point.
 *
 * NOTHING IS EVER TRUNCATED. A list is copied whole or reported absent. A
 * shortened list that did not say so would be a quiet edit of the measurement.
 */
import { isObject, owns, scalar } from './contract.mjs';

export const PRESENTATION_SCHEMA = 'neomundi-mcp-presentation/1';

/** Every field, and the exact path it is copied from.
 *
 * Published inside the presentation itself, so a reader can always go back to
 * the raw value without consulting this file — and so a subset is declared as
 * a subset rather than passing for the whole record.
 */
export const FIELD_SOURCES = Object.freeze({
  request_id: 'request_id',
  timestamp: 'timestamp',
  system_id: 'system_id',
  mode: 'mode',
  model: 'model',
  provider: 'provider',
  trace_id: 'audit.trace_id',
  measurement_version: 'audit.measurement_version',
  normalizer_version: 'audit.normalizer_version',
  version_agreement: 'measurement_reference.agreement (envelope, not the response)',
  version_scope: 'measurement_reference.divergence_scope (envelope, not the response)',
  decision: 'governance.decision',
  decision_basis: 'governance.decision_basis',
  decision_confidence: 'governance.confidence',
  decision_reasons: 'governance.reasons (copied whole, never shortened)',
  decision_is_measured: 'DERIVED: governance.decision_basis === "measured_thresholds"',
  measurement_status: 'measurement.status',
  checks_attempted: 'measurement.checks_attempted',
  checks_succeeded: 'measurement.checks_succeeded',
  checks_emitted: 'checks_emitted',
  coverage: 'measurement.coverage',
  confidence_basis: 'measurement.confidence_basis',
  aggregates_publishable: 'measurement.aggregates_publishable',
  missing_required_signals: 'measurement.missing_required_signals',
  degraded_g_inputs: 'measurement.degraded_g_inputs',
  failed_checks: 'measurement.failed_checks',
  measured_signals: 'measured_signals',
  unmeasured: 'unmeasured_signals, as one entry per signal with its cause',
  evaluators: 'evaluators[<signal>] — NAMED SUBSET: evaluator, model_used, status, reason. The full record stays at response.evaluators[<signal>]',
  published_values: 'the aggregate and signal-derived paths the reading aid watches, each with its value as published',
  unmodelled_root_fields: 'root keys of the response this connector does not model, listed by name',
  caveats: 'reading_aid.known_limitations, restricted to entries whose observable_here is true',
});

/** Root keys this connector models. A key outside this set is reported by name
 * in `unmodelled_root_fields` — never labelled, never dropped, never guessed
 * at. An unmodelled field is an observation about the upstream contract.
 */
const MODELLED_ROOT_KEYS = Object.freeze(new Set([
  'request_id', 'timestamp', 'system_id', 'mode',
  'g_score', 'g_final', 'v_score', 'delta_g', 'checks_emitted',
  'trajectory_points', 'measured_signals', 'measurement', 'unmeasured_signals',
  'processing_time_ms', 'latency_ms', 'model', 'evaluators', 'provider',
  'governance', 'quality', 'runtime', 'metrics', 'baseline', 'audit',
  'density', 'esi', 'rag_grounding', 'contract_version', 'token_count_source',
]));

/** The evaluator fields carried into the projection. A SUBSET, declared as one
 * in FIELD_SOURCES: the full record is one lookup away in the response.
 */
const EVALUATOR_FIELDS = Object.freeze(['evaluator', 'model_used', 'status', 'reason']);

/** Reads a dotted path. Returns whether it was present, and the raw value, so
 * an absent field and a field published as null stay distinguishable.
 */
function at(response, path) {
  let current = response;
  for (const key of path.split('.')) {
    if (!isObject(current) || !owns(current, key)) return { present: false, value: undefined };
    current = current[key];
  }
  return { present: true, value: current };
}

/** Copies a scalar verbatim, or null when the path is absent.
 *
 * A number keeps its original JSON token through `scalar`; nothing is coerced,
 * defaulted or rounded. A path that is absent and a path published as null
 * both yield null HERE — the difference is preserved in the response itself,
 * and `reading_aid.nulls` lists the explicit ones.
 */
function copy(response, path) {
  const found = at(response, path);
  return found.present ? scalar(found.value) : null;
}

/** Copies an array whole, element by element, or null when absent or not an
 * array. Never truncated, never reordered, never deduplicated.
 */
function copyList(response, path) {
  const found = at(response, path);
  if (!found.present || !Array.isArray(found.value)) return null;
  return found.value.map(scalar);
}

/** Copies a flat object of scalars, or null when absent or not an object. */
function copyMap(response, path) {
  const found = at(response, path);
  if (!found.present || !isObject(found.value)) return null;
  const out = {};
  for (const key of Object.keys(found.value)) out[key] = scalar(found.value[key]);
  return out;
}

/** One entry per unmeasured signal, each with the cause the server named.
 *
 * `null` when the block is absent or null — which is NOT the same as "every
 * signal was measured": `tier02_04` has `unmeasured_signals: null` and ran no
 * check at all. `measurement_status` is what says that, and it is published
 * beside this.
 */
function unmeasuredEntries(response) {
  const found = at(response, 'unmeasured_signals');
  if (!found.present || !isObject(found.value)) return null;
  return Object.keys(found.value).map((signal) => ({
    signal,
    cause: scalar(found.value[signal]),
  }));
}

/** One entry per evaluator the response declares, with its status as declared.
 *
 * Reported for every evaluator present, including those whose status is
 * `not_attempted`: an evaluator that did not run is exactly what a reader
 * needs to see, and dropping it would make an unevaluated answer look
 * evaluated.
 */
function evaluatorEntries(response) {
  const found = at(response, 'evaluators');
  if (!found.present || !isObject(found.value)) return null;
  return Object.keys(found.value).map((signal) => {
    const record = found.value[signal];
    const entry = { signal };
    for (const field of EVALUATOR_FIELDS) {
      entry[field] = isObject(record) && owns(record, field) ? scalar(record[field]) : null;
    }
    return entry;
  });
}

/** The aggregate and signal-derived values, each with the path it came from.
 *
 * Only paths actually present are listed, and a published null stays null: a
 * withheld aggregate must not look like a measured zero. The paths come from
 * the reading aid's own reference data rather than a second list that could
 * drift from it.
 */
function publishedValues(response, aidReference) {
  const paths = [
    ...aidReference.AGGREGATE_PATHS,
    ...aidReference.SIGNAL_DERIVED.map((entry) => entry.path),
  ];
  const values = [];
  for (const path of paths) {
    const found = at(response, path);
    if (!found.present) continue;
    values.push({ path, value: scalar(found.value) });
  }
  return values;
}

/** Root keys the connector does not model, by name and nothing else. */
function unmodelledRootFields(response) {
  return Object.keys(response).filter((key) => !MODELLED_ROOT_KEYS.has(key));
}

/** Builds the projection.
 *
 * `response` is never read destructively and never written to. `aid` is the
 * reading aid already built for this same response; only its
 * `known_limitations` is consulted, for `caveats`. `reference` is the envelope's
 * `measurement_reference` — version provenance belongs to the envelope, not to
 * the server payload, and the two are not merged here either.
 *
 * Returns `null` when there is no response object to project. A presentation
 * of nothing would be a statement about nothing.
 */
export function presentation(response, { aid = null, reference = null, aidReference } = {}) {
  if (!isObject(response)) return null;

  const basisFound = at(response, 'governance.decision_basis');
  const basis = basisFound.present ? scalar(basisFound.value) : null;

  return {
    schema: PRESENTATION_SCHEMA,
    // Repeated here rather than assumed read elsewhere: this object is the one
    // a reader is looking at, and it is the one that must carry the warning.
    statement: 'Every field below is copied from the response at the path named in field_sources, or is null. Nothing is computed, rescaled or rounded. A measurement is not a permission, a compliance verdict, or evidence of truth, safety or absence of hallucination.',

    request_id: copy(response, 'request_id'),
    timestamp: copy(response, 'timestamp'),
    system_id: copy(response, 'system_id'),
    mode: copy(response, 'mode'),
    model: copy(response, 'model'),
    provider: copy(response, 'provider'),
    trace_id: copy(response, 'audit.trace_id'),

    measurement_version: copy(response, 'audit.measurement_version'),
    normalizer_version: copy(response, 'audit.normalizer_version'),
    // From the envelope, not the payload. Always present on a real call; null
    // only when a caller builds a presentation without one.
    version_agreement: isObject(reference) && owns(reference, 'agreement') ? reference.agreement : null,
    version_scope: isObject(reference) && owns(reference, 'divergence_scope') ? reference.divergence_scope : null,

    decision: copy(response, 'governance.decision'),
    decision_basis: basis,
    decision_confidence: copy(response, 'governance.confidence'),
    decision_reasons: copyList(response, 'governance.reasons'),
    // The one derived field. An equality restated, so that an ALLOW decided on
    // measured thresholds and an ALLOW decided on nothing at all cannot be
    // read as the same statement.
    decision_is_measured: basisFound.present ? basis === 'measured_thresholds' : null,

    measurement_status: copy(response, 'measurement.status'),
    checks_attempted: copy(response, 'measurement.checks_attempted'),
    checks_succeeded: copy(response, 'measurement.checks_succeeded'),
    checks_emitted: copy(response, 'checks_emitted'),
    coverage: copy(response, 'measurement.coverage'),
    confidence_basis: copy(response, 'measurement.confidence_basis'),
    aggregates_publishable: copy(response, 'measurement.aggregates_publishable'),
    missing_required_signals: copyList(response, 'measurement.missing_required_signals'),
    degraded_g_inputs: copyList(response, 'measurement.degraded_g_inputs'),
    failed_checks: copyMap(response, 'measurement.failed_checks'),

    measured_signals: copyList(response, 'measured_signals'),
    unmeasured: unmeasuredEntries(response),
    evaluators: evaluatorEntries(response),
    published_values: publishedValues(response, aidReference),

    unmodelled_root_fields: unmodelledRootFields(response),
    caveats: Array.isArray(aid?.known_limitations)
      ? aid.known_limitations.filter((limitation) => limitation.observable_here === true).map((limitation) => limitation.id)
      : [],

    field_sources: FIELD_SOURCES,
  };
}

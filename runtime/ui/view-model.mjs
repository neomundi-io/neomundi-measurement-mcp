/** The measurement card's view model — a pure projection, no HTML.
 *
 * WHY THIS FILE EXISTS SEPARATELY. The card is rendered inside ChatGPT, in a
 * sandboxed document, from a script embedded in an MCP UI resource. Logic
 * living only inside that HTML string could not be tested. Every decision
 * about what a reader is shown therefore lives here, as a pure function of the
 * tool's `structuredContent`, and is asserted by `tests/card-view-model.test.mjs`.
 *
 * WHAT IT MAY DO. Select fields, attach a LABEL KEY to each, and mark whether
 * each one was published. Nothing else.
 *
 * WHAT IT MAY NOT DO, and what the tests enforce:
 *   - invent a verdict, a severity, a risk word or a confidence level;
 *   - render an unmeasured signal as a value — `null` never becomes 0, "" or
 *     "low";
 *   - render `not_attempted` and `complete` the same way;
 *   - present a `divergent` version as comparable;
 *   - compute, rescale, round, rank or shorten anything;
 *   - drop a coverage limit, a cause, or a known limitation.
 *
 * KEYS, NOT SENTENCES. The model emits `key` values; `LABELS` below turns a
 * key into English or French. The card is English by default with a coherent
 * French version, and a projection that embedded one language could not have
 * both without duplicating the logic — which is where the two would drift.
 * Server values are NEVER translated: only labels are, and a test holds that
 * every key resolves in both languages.
 *
 * TWO TIERS, AND WHAT THAT IS NOT. The model separates what a reader needs to
 * judge the measurement from the technical detail behind it. The second tier
 * is a READABILITY device and nothing else: everything in it is in the tool's
 * structured output, which the host and the model both receive in full.
 * Collapsing a section in HTML protects nobody, and this file never pretends
 * otherwise — see `details_note`.
 *
 * THE FAILURE THIS IS DESIGNED AGAINST. Two real recorded responses both
 * decide ALLOW: one under `measured_thresholds` with three checks, one under
 * `no_check_attempted` with zero checks and `measurement.status` at
 * `not_attempted`. A card that renders them alike has destroyed the
 * distinction the measurement exists to produce, while showing only values the
 * server really published.
 */

export const CARD_SCHEMA = 'neomundi-mcp-card/2';

export const LANGUAGES = Object.freeze(['en', 'fr']);
export const DEFAULT_LANGUAGE = 'en';

/** Every word this card can show that is not copied from the server.
 *
 * One table, two languages, and the guard that stops a severity or a risk word
 * from entering the card through a later edit: a test walks every entry in
 * both languages against a forbidden vocabulary, and a second test asserts
 * that every key the model emits is declared here.
 */
export const LABELS = Object.freeze({
  // --- frame -------------------------------------------------------------
  card_title: { en: 'NeoMundi measurement', fr: 'Mesure NeoMundi' },
  not_published: { en: 'not published', fr: 'non publié' },
  // A published boolean, rendered in the reader's language. This is a
  // locale rendering of the value the server published, not a
  // reinterpretation of it: `true` and `false` are the only inputs, and
  // nothing else is ever mapped.
  value_true: { en: 'Yes', fr: 'Oui' },
  value_false: { en: 'No', fr: 'Non' },
  language_toggle: { en: 'Français', fr: 'English' },
  empty: {
    en: 'No measurement was produced. Nothing below describes a result.',
    fr: 'Aucune mesure n’a été produite. Rien ci-dessous ne décrit un résultat.',
  },
  disclaimer: {
    en: 'A measurement is not an execution permission, not a compliance verdict, '
      + 'and not evidence of truth, safety or the absence of hallucination.',
    fr: 'Une mesure n’est pas une autorisation d’exécution, ni un verdict de '
      + 'conformité, ni une preuve de vérité, de sûreté ou d’absence d’hallucination.',
  },

  // --- banners -----------------------------------------------------------
  banner_not_measured: {
    en: 'No check was performed: this decision is not a measurement.',
    fr: 'Aucun contrôle n’a été effectué : cette décision n’est pas une mesure.',
  },
  banner_divergent: {
    en: 'Measurement versions differ: this result is not comparable with others.',
    fr: 'Versions de mesure divergentes : ce résultat n’est pas comparable aux autres.',
  },
  // Used ONLY when the connector holds an established statement about this
  // exact version pair. It narrows the claim; it never removes the fact that
  // the versions differ, which stays on the version rows below.
  banner_divergent_scoped: {
    en: 'Measurement versions differ. What has been established about this pair, '
      + 'per transport, is stated under Version.',
    fr: 'Versions de mesure divergentes. Ce qui est établi sur cette paire, par '
      + 'transport, est indiqué sous Version.',
  },
  banner_aggregates_withheld: {
    en: 'Aggregates are not publishable: do not quote an overall score.',
    fr: 'Les agrégats ne sont pas publiables : ne pas citer de score global.',
  },
  banner_incomplete: {
    en: 'The measurement is incomplete: required signals are missing.',
    fr: 'La mesure est incomplète : des signaux requis manquent.',
  },

  // --- the weather -------------------------------------------------------
  //
  // Each state carries a title and a one-line reading for someone who has
  // never heard of metrology. None of them says the answer is good, safe or
  // true, because none of them knows.
  weather_heading: { en: 'What was measured', fr: 'Ce qui a été mesuré' },
  weather_rule: {
    en: 'This depicts how much the instrument could measure — not whether the answer is correct.',
    fr: 'Ceci représente ce que l’instrument a pu mesurer — pas si la réponse est correcte.',
  },
  weather_complete_title: { en: 'Full reading', fr: 'Relevé complet' },
  weather_complete_note: {
    en: 'Every signal the instrument looks for was measured on this response. That says what was observed, not whether the answer is right.',
    fr: 'Tous les signaux recherchés par l’instrument ont été mesurés sur cette réponse. Cela dit ce qui a été observé, pas si la réponse est juste.',
  },
  weather_incomplete_title: { en: 'Partial reading', fr: 'Relevé partiel' },
  weather_incomplete_note: {
    en: 'Part of the instrument could not see. The signals below that have no value were not measured, and each says why. Do not read an absence as reassurance.',
    fr: 'Une partie de l’instrument n’a pas pu voir. Les signaux sans valeur ci-dessous n’ont pas été mesurés, et chacun dit pourquoi. Ne pas lire une absence comme une assurance.',
  },
  weather_not_measured_title: { en: 'No reading', fr: 'Aucun relevé' },
  weather_not_measured_note: {
    en: 'No check was run. A decision was still returned, and it rests on nothing that was measured here.',
    fr: 'Aucun contrôle n’a été exécuté. Une décision a tout de même été rendue, et elle ne repose sur rien de mesuré ici.',
  },
  weather_undeclared_title: { en: 'State not declared', fr: 'État non déclaré' },
  weather_undeclared_note: {
    en: 'The instance published no measurement state this card models. Read the raw fields below before concluding anything.',
    fr: 'L’instance n’a publié aucun état de mesure modélisé par cette carte. Lire les champs bruts ci-dessous avant de conclure.',
  },
  weather_error_title: { en: 'No reading', fr: 'Aucun relevé' },
  weather_error_note: {
    en: 'The call did not complete. Nothing on this card describes a measurement.',
    fr: 'L’appel n’a pas abouti. Rien sur cette carte ne décrit une mesure.',
  },
  checks_ratio: { en: 'Checks', fr: 'Contrôles' },
  signals_ratio: { en: 'Signals measured', fr: 'Signaux mesurés' },

  // --- primary sections --------------------------------------------------
  section_decision: { en: 'Decision', fr: 'Décision' },
  section_measurement: { en: 'Measurement', fr: 'État de la mesure' },
  section_signals: { en: 'Signals', fr: 'Signaux' },
  section_version: { en: 'Version', fr: 'Version' },
  section_caveats: { en: 'Known limitations', fr: 'Limites connues' },

  decision: { en: 'Decision', fr: 'Décision' },
  decision_basis: { en: 'Basis for the decision', fr: 'Fondement de la décision' },
  decision_is_measured: { en: 'Decided on measured thresholds', fr: 'Décision adossée à des seuils mesurés' },
  decision_reasons: { en: 'Stated reasons', fr: 'Motifs déclarés' },

  measurement_status: { en: 'State', fr: 'État' },
  checks_attempted: { en: 'Checks attempted', fr: 'Contrôles tentés' },
  checks_succeeded: { en: 'Checks succeeded', fr: 'Contrôles réussis' },
  checks_emitted: { en: 'Checks emitted', fr: 'Contrôles émis' },
  coverage: { en: 'Coverage', fr: 'Couverture' },
  confidence_basis: { en: 'Confidence basis', fr: 'Base de confiance' },
  aggregates_publishable: { en: 'Aggregates publishable', fr: 'Agrégats publiables' },
  missing_required_signals: { en: 'Missing required signals', fr: 'Signaux requis manquants' },
  degraded_g_inputs: { en: 'Degraded G inputs', fr: 'Entrées dégradées du G' },
  failed_checks: { en: 'Failed checks', fr: 'Contrôles en échec' },

  signals_measured: { en: 'Measured', fr: 'Mesurés' },
  signals_unmeasured: { en: 'Not measured', fr: 'Non mesurés' },
  signal_cause: { en: 'cause', fr: 'cause' },

  // --- the five readings, as a question, a scale and a limit -------------
  //
  // PRODUCT DECISION of 2026-11-03: one plain question, one real measurement,
  // one clear limit. The question is what a reader came with; the scale says
  // which way the number reads; the limit says what the number is not. The
  // three travel together, and a value is never shown without its scale —
  // `stability_score` exists on two OPPOSITE scales under one name, so a bare
  // number here would invert the reading rather than inform it.
  //
  // The limits are not disclaimers appended for safety. Each one is the
  // established fact about its instrument: a cosine is not a truth test, a
  // moderation pass is not a safety guarantee, a judge with no document is
  // stating a belief, instability scores the PROMPT, and the global indicator
  // is derived from the others rather than measured beside them.
  read_relevance_q: {
    en: 'Is the answer related to the question?',
    fr: 'La réponse est-elle en rapport avec la question ?',
  },
  read_relevance_scale: {
    en: 'Vector similarity between question and answer, 0 to 1. Higher means closer in meaning.',
    fr: 'Similarité vectorielle entre la question et la réponse, de 0 à 1. Plus haut, plus proche de sens.',
  },
  read_relevance_limit: {
    en: 'Similarity, not truth. A false answer that stays on topic scores high.',
    fr: 'Similarité, pas vérité. Une réponse fausse mais dans le sujet obtient un score élevé.',
  },

  read_safety_q: {
    en: 'Does the answer contain potentially dangerous material?',
    fr: 'La réponse contient-elle des éléments potentiellement dangereux ?',
  },
  read_safety_scale: {
    en: 'Moderation outcome. Two values only, and nothing between them.',
    fr: 'Résultat de modération. Deux valeurs seulement, et rien entre elles.',
  },
  read_safety_limit: {
    en: 'Moderation, not a guarantee of harmlessness. It classifies categories, and does not judge whether advice is sound.',
    fr: 'Modération, pas garantie d’innocuité. Elle classe des catégories, et ne juge pas si un conseil est avisé.',
  },

  read_factuality_q: {
    en: 'Does the answer contain information that is probably false?',
    fr: 'La réponse contient-elle des informations probablement fausses ?',
  },
  read_factuality_scale: {
    en: '0 to 1. Higher means more of the answer looks made up.',
    fr: 'De 0 à 1. Plus haut, plus la réponse paraît inventée.',
  },
  read_factuality_limit: {
    en: 'The estimate of an AI judge that received no reference document. It reports its own belief, not conformity to a source.',
    fr: 'Estimation d’un juge IA qui n’a reçu aucun document de référence. Il rapporte sa croyance, pas une conformité à une source.',
  },

  read_ambiguity_q: {
    en: 'Can the question be understood in more than one way?',
    fr: 'La question peut-elle être comprise de plusieurs façons ?',
  },
  read_ambiguity_scale: {
    en: '0 to 1, measured on the question.',
    fr: 'De 0 à 1, mesuré sur la question.',
  },
  read_ambiguity_limit: {
    en: 'It scores the question, not the answer. Two different answers to one question receive the same value.',
    fr: 'Il note la question, pas la réponse. Deux réponses différentes à une même question reçoivent la même valeur.',
  },

  // The global indicator is shown apart from the four, because it is not a
  // fifth instrument: it is computed from what the others produced.
  read_global_q: {
    en: 'What does the global indicator computed from the measurements give?',
    fr: 'Que donne l’indicateur global calculé à partir des mesures ?',
  },
  read_global_limit: {
    en: 'A derived indicator, not an independent measurement. It adds no observation of its own, and it is published on two opposite scales under one name.',
    fr: 'Indicateur dérivé, pas une mesure indépendante. Il n’ajoute aucune observation propre, et il est publié sur deux échelles opposées sous un même nom.',
  },
  read_global_quality_scale: {
    en: 'quality.stability_score — 1 means stable, 0 means unstable.',
    fr: 'quality.stability_score — 1 signifie stable, 0 instable.',
  },
  read_global_metrics_scale: {
    en: 'metrics.stability_score — the OPPOSITE scale: 0 means stable, 1 unstable.',
    fr: 'metrics.stability_score — l’échelle INVERSE : 0 signifie stable, 1 instable.',
  },
  read_section: { en: 'What was measured, reading by reading', fr: 'Ce qui a été mesuré, lecture par lecture' },
  read_global_section: { en: 'Global indicator', fr: 'Indicateur global' },
  read_scale: { en: 'Scale', fr: 'Échelle' },
  read_limit: { en: 'Limit', fr: 'Limite' },
  read_not_measured: {
    en: 'Not measured. An absence is not a favourable result, and it is not a zero.',
    fr: 'Non mesuré. Une absence n’est pas un résultat favorable, et ce n’est pas un zéro.',
  },
  // Said when the instance published a number for this signal while no
  // evaluator attests it was measured. The number is not shown: on the
  // recorded no-check responses it is the engine's own default, or the value
  // the CALLER sent, and either would answer the question as a NeoMundi
  // measurement without one having been made.
  read_unattested: {
    en: 'Not measured. The instance published a value here, but no evaluator reports having measured it, so it is not shown as a reading.',
    fr: 'Non mesuré. L’instance a publié une valeur ici, mais aucun évaluateur ne déclare l’avoir mesurée : elle n’est donc pas affichée comme une lecture.',
  },
  read_undeclared: {
    en: 'Not measured. No evaluator was declared for this signal, so nothing attests what the published value is.',
    fr: 'Non mesuré. Aucun évaluateur n’est déclaré pour ce signal : rien n’atteste ce que vaut la valeur publiée.',
  },
  signals_none_unmeasured: {
    en: 'No signal was declared unmeasured.',
    fr: 'Aucun signal n’est déclaré non mesuré.',
  },

  version_declared: { en: 'Declared by the instance', fr: 'Déclarée par l’instance' },
  version_expected: { en: 'Expected by this connector', fr: 'Attendue par ce connecteur' },
  version_agreement: { en: 'Agreement', fr: 'Accord' },
  version_scope_rest: { en: 'On the REST path', fr: 'Sur le chemin REST' },
  version_scope_sse: { en: 'On the streaming path', fr: 'Sur le chemin en flux' },

  // --- the second tier ---------------------------------------------------
  details_summary: { en: 'Technical detail and provenance', fr: 'Détail technique et provenance' },
  details_note: {
    en: 'Collapsed for reading only. Everything here is in the tool’s structured '
      + 'output, which the assistant receives in full: hiding it in this page '
      + 'protects nothing.',
    fr: 'Replié pour la lecture seulement. Tout ceci figure dans la sortie '
      + 'structurée de l’outil, que l’assistant reçoit en entier : le masquer '
      + 'dans cette page ne protège rien.',
  },
  section_evaluators: { en: 'Evaluators', fr: 'Évaluateurs' },
  section_identity: { en: 'Request identifiers', fr: 'Identifiants de requête' },
  section_provenance: { en: 'Provenance', fr: 'Provenance' },
  section_published: { en: 'Published values', fr: 'Valeurs publiées' },
  section_unmodelled: { en: 'Fields this projection does not model', fr: 'Champs non modélisés par cette projection' },
  section_withheld: { en: 'Returned without a value', fr: 'Retournés sans valeur' },
  withheld_note: {
    en: 'These fields were returned as null. An absence is not a favourable result.',
    fr: 'Ces champs ont été retournés à null. Une absence n’est pas un résultat favorable.',
  },

  evaluator_signal: { en: 'Signal', fr: 'Signal' },
  evaluator_name: { en: 'Evaluator', fr: 'Évaluateur' },
  evaluator_model: { en: 'Model used', fr: 'Modèle utilisé' },
  evaluator_status: { en: 'Status', fr: 'État' },
  evaluator_reason: { en: 'Reason', fr: 'Motif' },

  request_id: { en: 'Request identifier', fr: 'Identifiant de requête' },
  timestamp: { en: 'Timestamp', fr: 'Horodatage' },
  system_id: { en: 'System identifier', fr: 'Identifiant système' },
  mode: { en: 'Mode', fr: 'Mode' },
  trace_id: { en: 'Trace identifier', fr: 'Identifiant de trace' },
  normalizer_version: { en: 'Normalizer version', fr: 'Version du normaliseur' },
  model: { en: 'Model', fr: 'Modèle' },
  provider: { en: 'Provider', fr: 'Fournisseur' },
  version_scope_statement: { en: 'Established statement', fr: 'Énoncé établi' },
  version_scope_unchanged: { en: 'Unchanged by the bump', fr: 'Inchangé par le changement de version' },

  // --- error state -------------------------------------------------------
  section_error: { en: 'Error', fr: 'Erreur' },
  error_code: { en: 'Code', fr: 'Code' },
  error_message: { en: 'Message', fr: 'Message' },
  section_upstream: { en: 'Upstream classification', fr: 'Classification amont' },
});

/** Resolves a key in a language, falling back to the default rather than to
 * the key itself: a raw key leaking into the page would read as a value.
 */
export function label(key, language = DEFAULT_LANGUAGE) {
  const entry = LABELS[key];
  if (!entry) return '';
  return entry[language] ?? entry[DEFAULT_LANGUAGE] ?? '';
}

/** Which question, scale and limit belong to each measured signal.
 *
 * A CLOSED LIST, and that is the point. A signal the instrument starts
 * publishing tomorrow has no question and no scale here, so it is carried in
 * the signal lists by name and is NOT given a reading. Inventing a question
 * for an unknown signal, or printing its number without a direction, would be
 * exactly the failure the limits exist to prevent.
 *
 * The four keys are the four `AID_REFERENCE.SEMANTIC_SIGNALS`, and the test
 * suite fails if the two lists ever diverge.
 */
/** What a reading is, as a state rather than as a guess from its value.
 *
 * `measured`    the evaluator reported `measured` AND a value is published.
 *               The value is shown, including a zero.
 * `not_measured` the evaluator exists and did not measure -- `not_measured`,
 *               `not_attempted`, an error, or a status beside a null value.
 *               The value is withheld and the cause is named.
 * `undeclared`  no evaluator record names this signal, so nothing attests the
 *               number. Withheld too, and said to be undeclared rather than
 *               absent: those are different facts.
 */
export const READING_STATE = Object.freeze({
  MEASURED: 'measured',
  NOT_MEASURED: 'not_measured',
  UNDECLARED: 'undeclared',
});

export const READING_KEYS = Object.freeze({
  coherence_score: Object.freeze({
    question: 'read_relevance_q', scale: 'read_relevance_scale', limit: 'read_relevance_limit',
  }),
  semantic_risk: Object.freeze({
    question: 'read_safety_q', scale: 'read_safety_scale', limit: 'read_safety_limit',
  }),
  factual_hallucination_score: Object.freeze({
    question: 'read_factuality_q', scale: 'read_factuality_scale', limit: 'read_factuality_limit',
  }),
  semantic_instability_score: Object.freeze({
    question: 'read_ambiguity_q', scale: 'read_ambiguity_scale', limit: 'read_ambiguity_limit',
  }),
});

/** The weather, and the one thing it depicts.
 *
 * IT SHOWS HOW MUCH WAS MEASURED. NEVER WHAT THE ANSWER IS WORTH.
 *
 * The brand foundation forbids a risk colour anywhere on this card, for a
 * reason that is recorded and real: a green dot on an `ALLOW` decided with no
 * check at all would be exactly the lie the card exists to prevent. A weather
 * metaphor keyed to the DECISION would be that dot with better art.
 *
 * So the sky is the instrument's view of the sky, not a verdict on the
 * answer: an `ALLOW` with zero checks gets the emptiest state there is, and
 * `ALLOW`, `FLAG` and `BLOCK` with identical measurement produce the IDENTICAL
 * weather. Two tests hold both halves of that, because the whole design rests
 * on them.
 *
 * Every state below is decided by published fields and stated rules — no
 * threshold of ours, no scoring, no overall weather number. The order is the
 * precedence order: the first rule that matches wins, worst-known first, so a
 * missing required signal can never be overwritten by a `complete` status.
 */
export const WEATHER = Object.freeze({
  ERROR: 'error',
  NOT_MEASURED: 'not_measured',
  INCOMPLETE: 'incomplete',
  COMPLETE: 'complete',
  UNDECLARED: 'undeclared',
});

/** `[state, rule]` in precedence order, each rule reading published fields
 * only. Exported so a test can walk them and so a reader can check the card
 * against the envelope without reading this file's prose.
 */
export const WEATHER_RULES = Object.freeze([
  Object.freeze({ state: WEATHER.NOT_MEASURED, when: 'decision_is_measured === false, or measurement_status === "not_attempted"' }),
  Object.freeze({ state: WEATHER.INCOMPLETE, when: 'missing_required_signals is non-empty, or measurement_status === "partial", or a signal is declared unmeasured' }),
  Object.freeze({ state: WEATHER.COMPLETE, when: 'measurement_status === "complete", with no missing required signal and no unmeasured signal' }),
  Object.freeze({ state: WEATHER.UNDECLARED, when: 'no rule above matched: the instance published no state this projection models' }),
]);

export function weatherState(presentation, unmeasuredCount = 0) {
  const p = presentation ?? {};
  const missing = Array.isArray(p.missing_required_signals) ? p.missing_required_signals.length : 0;
  if (p.decision_is_measured === false || p.measurement_status === 'not_attempted') return WEATHER.NOT_MEASURED;
  if (missing > 0 || p.measurement_status === 'partial' || unmeasuredCount > 0) return WEATHER.INCOMPLETE;
  if (p.measurement_status === 'complete') return WEATHER.COMPLETE;
  return WEATHER.UNDECLARED;
}

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

/** A labelled row. `published` is the honest part: false means the source path
 * was absent or published as null, and the renderer must show the
 * `not_published` marker rather than a value. The raw value is carried through
 * untouched for the published case — no formatting, no rounding.
 */
function row(key, value) {
  const published = value !== null && value !== undefined;
  return { key, value: published ? value : null, published };
}

/** Copies a list whole, or reports it absent. Never truncated: a shortened
 * list that did not say so would be a quiet edit of the measurement.
 */
function list(value) {
  return Array.isArray(value) ? value.slice() : null;
}

/** Splits rows into the ones that carry a value and the keys of the ones that
 * do not.
 *
 * WHY. A primary panel with a column of "not published" reads as a failure
 * report and buries the three or four facts that matter. The absent ones are
 * not dropped: their keys are listed together, once, under a line that says
 * what an absence is and is not. Nothing is lost, and the eye reaches the
 * measured signals.
 */
function partition(rows) {
  return {
    present: rows.filter((r) => r.published),
    withheld: rows.filter((r) => !r.published).map((r) => r.key),
  };
}

/** Builds the card model from the tool's structured output.
 *
 * Tolerates a malformed or partial envelope by reporting it as such, never by
 * filling gaps: a card is shown beside a real call, and a call that failed
 * must not produce something that looks like a measurement.
 */
export function buildCardModel(output) {
  if (!isObject(output)) {
    return { schema: CARD_SCHEMA, state: 'empty', banners: [], empty_key: 'empty', disclaimer_key: 'disclaimer' };
  }

  // An adapter error is a transport outcome, not a measurement. It is reported
  // as an error state and no measurement section is built, so nothing on the
  // card can be read as a result that was never obtained.
  const error = isObject(output.adapter_error) ? output.adapter_error : null;
  if (error) {
    const upstream = isObject(error.upstream) ? error.upstream : null;
    return {
      schema: CARD_SCHEMA,
      state: 'error',
      banners: [],
      weather: { state: WEATHER.ERROR, title_key: 'weather_error_title', note_key: 'weather_error_note', gauges: { checks: null, signals: null } },
      error: {
        code: row('error_code', error.code ?? null),
        message: row('error_message', error.message ?? null),
        upstream: upstream ? Object.entries(upstream).map(([k, v]) => ({ name: k, ...row('section_upstream', v ?? null) })) : null,
      },
      empty_key: 'empty',
      disclaimer_key: 'disclaimer',
    };
  }

  const p = isObject(output.presentation) ? output.presentation : {};
  const reference = isObject(output.measurement_reference) ? output.measurement_reference : {};

  const agreement = p.version_agreement ?? reference.agreement ?? null;
  const scopeRaw = p.version_scope ?? reference.divergence_scope ?? null;
  const scope = isObject(scopeRaw) ? scopeRaw : null;

  // Banners state a condition that changes how every figure below must be
  // read. Each is driven by one published field, and each says what it
  // forbids rather than how worried to be.
  const banners = [];
  if (p.decision_is_measured === false) banners.push({ kind: 'not_measured', key: 'banner_not_measured' });
  if (agreement === 'divergent') {
    // Scoped ONLY when the connector holds an established statement about
    // this exact pair. Absent one, the flat wording stays — it is the honest
    // default, and narrowing a claim nobody established would be the one
    // thing this card exists to prevent.
    banners.push({ kind: 'divergent', key: scope ? 'banner_divergent_scoped' : 'banner_divergent' });
  }
  if (p.aggregates_publishable === false) banners.push({ kind: 'aggregates_withheld', key: 'banner_aggregates_withheld' });
  const missing = list(p.missing_required_signals);
  if (missing && missing.length > 0) banners.push({ kind: 'incomplete', key: 'banner_incomplete' });

  // Unmeasured signals keep their cause. The cause is the whole point: a
  // signal absent for "insufficient_coverage" and one absent because a
  // service was unavailable are different facts, and neither is a value.
  const unmeasured = [];
  const rawUnmeasured = p.unmeasured;
  if (Array.isArray(rawUnmeasured)) {
    for (const entry of rawUnmeasured) {
      if (isObject(entry)) {
        unmeasured.push({ name: entry.signal ?? entry.name ?? null, cause: entry.cause ?? entry.status ?? entry.reason ?? null });
      }
    }
  } else if (isObject(rawUnmeasured)) {
    for (const [name, cause] of Object.entries(rawUnmeasured)) {
      unmeasured.push({ name, cause: isObject(cause) ? (cause.cause ?? cause.status ?? null) : cause });
    }
  }

  // Measured signals come in two shapes upstream, and conflating them lies in
  // opposite directions.
  //
  // A MAPPING name -> value becomes rows: a signal whose value is null stays
  // null and renders as not published, because a measured signal without a
  // published value is not a zero.
  //
  // A LIST OF NAMES is just that — a list of which signals were measured, with
  // the values living elsewhere. Rendering it as rows would put "not
  // published" beside every measured signal and read as though each had failed
  // to produce a value. So it is carried as names, and the renderer shows a
  // list.
  const measured = [];
  const measuredNames = [];
  if (isObject(p.measured_signals)) {
    for (const [name, value] of Object.entries(p.measured_signals)) measured.push({ name, ...row('signals_measured', value ?? null) });
  } else if (Array.isArray(p.measured_signals)) {
    for (const entry of p.measured_signals) {
      if (isObject(entry)) measured.push({ name: entry.signal ?? entry.name ?? '', ...row('signals_measured', entry.value ?? null) });
      else measuredNames.push(String(entry));
    }
  }

  // The contract declares `presentation.evaluators` an ARRAY of records that
  // each name their own signal, and `published_values` an ARRAY of {path,
  // value}. Both were read with `isObject`, which excludes arrays by
  // definition — so both lists came out empty on every real measurement while
  // every test, driving a hand-built MAPPING, passed. Read the declared shape
  // first; keep the mapping, because the hand-built envelopes use one and the
  // two must never read differently.
  const evaluators = [];
  const evaluatorPairs = Array.isArray(p.evaluators)
    ? p.evaluators.map((record) => [isObject(record) ? (record.signal ?? record.name ?? null) : null, record])
    : isObject(p.evaluators) ? Object.entries(p.evaluators) : [];
  {
    for (const [signal, record] of evaluatorPairs) {
      const r = isObject(record) ? record : {};
      evaluators.push({
        signal,
        evaluator: row('evaluator_name', r.evaluator ?? null),
        model_used: row('evaluator_model', r.model_used ?? null),
        status: row('evaluator_status', r.status ?? null),
        reason: row('evaluator_reason', r.reason ?? null),
      });
    }
  }

  const published = [];
  if (Array.isArray(p.published_values)) {
    for (const entry of p.published_values) {
      if (isObject(entry)) published.push({ name: entry.path ?? entry.name ?? null, ...row('section_published', entry.value ?? null) });
    }
  } else if (isObject(p.published_values)) {
    for (const [path, value] of Object.entries(p.published_values)) published.push({ name: path, ...row('section_published', value ?? null) });
  }

  // The four readings, each as the question a reader arrived with, the value
  // the instrument published, the scale it reads on, and what it is not.
  //
  // A value and its scale travel together or neither travels. The cause of an
  // absence is taken from `unmeasured`, so a signal that did not run keeps the
  // reason it did not — never a zero, never a blank.
  const readings = [];
  const causeOf = (name) => {
    const hit = unmeasured.find((entry) => entry.name === name);
    return hit ? hit.cause : null;
  };
  const evaluatorFor = (name) => evaluators.find((entry) => entry.signal === name) ?? null;
  const sourceReadings = Array.isArray(p.signal_readings)
    ? p.signal_readings.map((entry) => [isObject(entry) ? entry.signal : null, isObject(entry) ? entry.value : null])
    : isObject(p.signal_readings) ? Object.entries(p.signal_readings) : [];
  for (const [signal, value] of sourceReadings) {
    const keys = READING_KEYS[signal];
    if (!keys) continue;
    const evaluator = evaluatorFor(signal);
    const hasValue = value !== null && value !== undefined;
    // THE AUTHORITY ON WHETHER A NUMBER IS A MEASUREMENT IS THE EVALUATOR,
    // NEVER THE PRESENCE OF THE NUMBER.
    //
    // The instance publishes a value at `quality.<signal>` even when the check
    // never ran. On both recorded responses whose basis is
    // `no_check_attempted`, `coherence_score` is 1.0 and `semantic_risk` is
    // 0.0 while their evaluators report `not_attempted` and
    // `unmeasured_signals` is empty. The upstream code says so in its own
    // words: when moderation never ran, the field "keeps the client-declared
    // raw_metrics.semantic_risk -- that value is the caller's own input, not a
    // server measurement".
    //
    // So 1.0 there is the engine's no-credit default and 0.0 is whatever the
    // CALLER declared. Rendering either as a reading would answer "is the
    // answer related to the question?" with a perfect score, and "does it
    // contain dangerous material?" with a clean zero, about an answer nothing
    // ever examined -- under an empty sky saying the opposite. The number is
    // more specific than the picture, so the number is what a reader believes.
    const state = evaluator === null
      ? READING_STATE.UNDECLARED
      : evaluator.status.value === 'measured' && hasValue
        ? READING_STATE.MEASURED
        : READING_STATE.NOT_MEASURED;
    const measured = state === READING_STATE.MEASURED;
    readings.push({
      signal,
      state,
      question_key: keys.question,
      scale_key: keys.scale,
      limit_key: keys.limit,
      // A measured zero is a MEASUREMENT and stays one: `semantic_risk` is 0.0
      // on every nominal recording with its evaluator reporting `measured`.
      // Only an unattested value is withheld, and withholding is not
      // substitution: nothing becomes zero, here or anywhere.
      ...row(keys.question, measured ? value : null),
      // Nothing is erased. What the instance published stays readable, so an
      // inspector can see the caller's own declared input for what it is --
      // it is simply not allowed to answer the question as if NeoMundi had
      // measured it.
      declared_value: hasValue ? value : null,
      cause: measured
        ? null
        : causeOf(signal)
          ?? (evaluator === null ? null : evaluator.reason.value ?? evaluator.status.value),
    });
  }

  // The global indicator, kept apart from the four. Both published readings
  // are carried, each with its own scale, because they run in OPPOSITE
  // directions under the same name and showing one alone invites the wrong
  // conclusion.
  const valueAt = (path) => {
    const hit = published.find((entry) => entry.name === path);
    return hit ? { value: hit.value, published: hit.published } : null;
  };
  const q = valueAt('quality.stability_score');
  const mx = valueAt('metrics.stability_score');
  const stability = (q || mx) ? {
    question_key: 'read_global_q',
    limit_key: 'read_global_limit',
    readings: [
      q ? { path: 'quality.stability_score', scale_key: 'read_global_quality_scale', value: q.value, published: q.published } : null,
      mx ? { path: 'metrics.stability_score', scale_key: 'read_global_metrics_scale', value: mx.value, published: mx.published } : null,
    ].filter(Boolean),
  } : null;

  const measurementRows = [
    row('measurement_status', p.measurement_status ?? null),
    row('checks_attempted', p.checks_attempted ?? null),
    row('checks_succeeded', p.checks_succeeded ?? null),
    row('checks_emitted', p.checks_emitted ?? null),
    row('coverage', p.coverage ?? null),
    row('confidence_basis', p.confidence_basis ?? null),
    row('aggregates_publishable', p.aggregates_publishable ?? null),
  ];
  const measurement = partition(measurementRows);

  // THE ONLY TWO BARS ON THIS CARD, and the reason there are only two.
  //
  // A bar asserts a direction: fuller is more. That is true of a count of
  // checks and of a count of signals, and it is NOT true of a signal value
  // here — `quality.stability_score` has 1 = stable while
  // `metrics.stability_score` has 0 = stable, and the envelope's
  // `measured_signals` carries no scale with it. A bar drawn on those would
  // invent a direction for half of them. Values are therefore printed, never
  // drawn, until a scale contract exists to draw them against.
  const ratio = (numerator, denominator) => (
    Number.isFinite(numerator) && Number.isFinite(denominator) && denominator > 0
      ? { numerator, denominator, fraction: Math.min(1, Math.max(0, numerator / denominator)) }
      : null
  );
  const measuredCount = measured.filter((m) => m.published).length + measuredNames.length;
  const gauges = {
    checks: ratio(p.checks_succeeded, p.checks_attempted),
    signals: ratio(measuredCount, measuredCount + unmeasured.length),
  };

  const weather = weatherState(p, unmeasured.length);

  return {
    schema: CARD_SCHEMA,
    state: 'measurement',
    banners,
    // Decided from measurement fields only. `p.decision` is not read here and
    // must never be: see WEATHER.
    weather: {
      state: weather,
      title_key: `weather_${weather}_title`,
      note_key: `weather_${weather}_note`,
      gauges,
    },
    primary: {
      decision: {
        value: row('decision', p.decision ?? null),
        basis: row('decision_basis', p.decision_basis ?? null),
        // Deliberately a row, not a boolean folded into a colour: the reader
        // is told the fact, and the banner above states what it forbids.
        is_measured: row('decision_is_measured', p.decision_is_measured ?? null),
        reasons: list(p.decision_reasons),
      },
      measurement: measurement.present,
      withheld: measurement.withheld,
      lists: {
        missing_required_signals: missing,
        degraded_g_inputs: list(p.degraded_g_inputs),
        failed_checks: list(p.failed_checks),
      },
      signals: { measured, measured_names: measuredNames, unmeasured },
      readings,
      stability,
      version: {
        declared: row('version_declared', p.measurement_version ?? reference.received_measurement_version ?? null),
        expected: row('version_expected', reference.expected_measurement_version ?? null),
        agreement: row('version_agreement', agreement),
        // Copied verbatim from the established table, per transport. Never
        // summarised into a single verdict: the whole point of the scope is
        // that the two transports differ.
        scope: scope ? {
          rest: row('version_scope_rest', scope.rest ?? null),
          sse: row('version_scope_sse', scope.sse ?? null),
          statement: row('version_scope_statement', scope.summary ?? null),
          unchanged: row('version_scope_unchanged', scope.unchanged_by_the_bump ?? null),
        } : null,
      },
    },
    secondary: {
      evaluators,
      identity: [
        row('request_id', p.request_id ?? null),
        row('timestamp', p.timestamp ?? null),
        row('system_id', p.system_id ?? null),
        row('mode', p.mode ?? null),
        row('trace_id', p.trace_id ?? null),
      ],
      provenance: [
        row('normalizer_version', p.normalizer_version ?? null),
        row('model', p.model ?? null),
        row('provider', p.provider ?? null),
      ],
      published_values: published,
      unmodelled_root_fields: list(p.unmodelled_root_fields),
    },
    caveats: list(p.caveats),
    disclaimer_key: 'disclaimer',
  };
}

/** The measurement card's view model — a pure projection, no HTML.
 *
 * WHY THIS FILE EXISTS SEPARATELY. The card is rendered inside ChatGPT, in a
 * sandboxed document, from a script embedded in an MCP UI resource. Logic
 * living only inside that HTML string could not be tested. Every decision
 * about what a reader is shown therefore lives here, as a pure function of the
 * tool's `structuredContent`, and is asserted by `tests/card-view-model.test.mjs`.
 *
 * WHAT IT MAY DO. Select fields, label them in French, and mark whether each
 * one was published. Nothing else.
 *
 * WHAT IT MAY NOT DO, and what the tests enforce:
 *   - invent a verdict, a severity, a risk word or a confidence level;
 *   - render an unmeasured signal as a value — `null` never becomes 0, "" or
 *     "faible";
 *   - render `not_attempted` and `complete` the same way;
 *   - present a `divergent` version as comparable;
 *   - compute, rescale, round, rank or shorten anything;
 *   - drop a coverage limit, a cause, or a known limitation.
 *
 * It reads the envelope's `presentation` field, which is itself a faithful
 * projection with its own fidelity suite. This module adds a reading order and
 * French labels on top of it — and adds no new value, with one exception that
 * is a restatement, not a judgement: `decision_is_measured`, which the
 * presentation layer already derives and publishes.
 *
 * THE FAILURE THIS IS DESIGNED AGAINST. Two real recorded responses both
 * decide ALLOW: one under `measured_thresholds` with three checks, one under
 * `no_check_attempted` with zero checks and `measurement.status` at
 * `not_attempted`. A card that renders them alike has destroyed the
 * distinction the measurement exists to produce, while showing only values the
 * server really published.
 */

export const CARD_SCHEMA = 'neomundi-mcp-card/1';

/** The marker shown wherever a value was not published.
 *
 * One string, used everywhere, and deliberately not an empty cell: a blank
 * reads as "nothing to report", which is a claim. This reads as "no value",
 * which is the fact. It is never substituted for a real value, and a test
 * asserts it never appears next to a published number.
 */
export const NOT_PUBLISHED = 'non publié';

/** Fixed closing statement. Not generated, not conditional, never reworded by
 * data: a card that could omit it under some payload would omit it exactly
 * when it mattered most.
 */
export const DISCLAIMER = 'Une mesure n’est pas une autorisation d’exécution, '
  + 'ni un verdict de conformité, ni une preuve de vérité, de sûreté ou '
  + 'd’absence d’hallucination.';

/** Every word this module can emit that is not copied from the server.
 *
 * Frozen and asserted test-side, exactly as the presentation layer's
 * vocabulary is: it is the guard that stops a severity or risk word from
 * entering the card through a later edit.
 */
export const VOCABULARY = Object.freeze([
  NOT_PUBLISHED, DISCLAIMER,
  'Mesure NeoMundi', 'Décision', 'Fondement de la décision',
  'Décision adossée à des seuils mesurés', 'Motifs déclarés',
  'État de la mesure', 'Contrôles tentés', 'Contrôles réussis',
  'Contrôles émis', 'Couverture', 'Base de confiance',
  'Agrégats publiables', 'Signaux requis manquants',
  'Entrées dégradées du G', 'Contrôles en échec',
  'Signaux mesurés', 'Signaux non mesurés', 'cause',
  'Provenance', 'Version de mesure', 'Version du normaliseur',
  'Modèle', 'Fournisseur', 'Identifiant de requête', 'Horodatage',
  'Identifiant de trace', 'Identifiant système', 'Mode',
  'Évaluateurs', 'Accord de version', 'Portée de la divergence',
  'Limites connues', 'Champs non modélisés', 'Valeurs publiées',
  'Aucune mesure', 'Erreur', 'Classification amont',
  'Aucun contrôle n’a été effectué : cette décision n’est pas une mesure.',
  'Versions de mesure divergentes : ce résultat n’est pas comparable aux autres.',
  'Les agrégats ne sont pas publiables : ne pas citer de score global.',
  'La mesure est incomplète : des signaux requis manquent.',
  'Aucune mesure n’a été produite. Rien ci-dessous ne décrit un résultat.',
]);

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

/** A labelled row. `published` is the honest part: false means the source path
 * was absent or published as null, and the renderer must show NOT_PUBLISHED
 * rather than a value. The raw value is carried through untouched for the
 * published case — no formatting, no rounding.
 */
function row(label, value) {
  const published = value !== null && value !== undefined;
  return { label, value: published ? value : null, published };
}

/** Copies a list whole, or reports it absent. Never truncated: a shortened
 * list that did not say so would be a quiet edit of the measurement.
 */
function list(value) {
  return Array.isArray(value) ? value.slice() : null;
}

/** Builds the card model from the tool's structured output.
 *
 * Tolerates a malformed or partial envelope by reporting it as such, never by
 * filling gaps: a card is shown beside a real call, and a call that failed
 * must not produce something that looks like a measurement.
 */
export function buildCardModel(output) {
  if (!isObject(output)) {
    return {
      schema: CARD_SCHEMA, state: 'empty', banners: [],
      empty: 'Aucune mesure n’a été produite. Rien ci-dessous ne décrit un résultat.',
      disclaimer: DISCLAIMER,
    };
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
      error: {
        code: row('Erreur', error.code ?? null),
        message: row('Erreur', error.message ?? null),
        upstream: upstream
          ? Object.entries(upstream).map(([key, value]) => row(`Classification amont — ${key}`, value ?? null))
          : null,
      },
      empty: 'Aucune mesure n’a été produite. Rien ci-dessous ne décrit un résultat.',
      disclaimer: DISCLAIMER,
    };
  }

  const p = isObject(output.presentation) ? output.presentation : {};
  const reference = isObject(output.measurement_reference) ? output.measurement_reference : {};

  // Banners state a condition that changes how every figure below must be
  // read. Each is driven by one published field, and each says what it
  // forbids rather than how worried to be.
  const banners = [];
  if (p.decision_is_measured === false) {
    banners.push({ kind: 'not_measured', text: 'Aucun contrôle n’a été effectué : cette décision n’est pas une mesure.' });
  }
  const agreement = p.version_agreement ?? reference.agreement ?? null;
  if (agreement === 'divergent') {
    banners.push({ kind: 'divergent', text: 'Versions de mesure divergentes : ce résultat n’est pas comparable aux autres.' });
  }
  if (p.aggregates_publishable === false) {
    banners.push({ kind: 'aggregates_withheld', text: 'Les agrégats ne sont pas publiables : ne pas citer de score global.' });
  }
  const missing = list(p.missing_required_signals);
  if (missing && missing.length > 0) {
    banners.push({ kind: 'incomplete', text: 'La mesure est incomplète : des signaux requis manquent.' });
  }

  // Unmeasured signals keep their cause. The cause is the whole point: a
  // signal absent for "insufficient_coverage" and one absent because a
  // service was unavailable are different facts, and neither is a value.
  const unmeasured = [];
  const rawUnmeasured = p.unmeasured;
  if (Array.isArray(rawUnmeasured)) {
    for (const entry of rawUnmeasured) {
      if (isObject(entry)) {
        unmeasured.push({
          name: entry.signal ?? entry.name ?? null,
          cause: entry.cause ?? entry.status ?? entry.reason ?? null,
        });
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
  // null and renders NOT_PUBLISHED, because a measured signal without a
  // published value is not a zero.
  //
  // A LIST OF NAMES is just that — a list of which signals were measured, with
  // the values living elsewhere. Rendering it as rows would put "non publié"
  // beside every measured signal and read as though each had failed to
  // produce a value. So it is carried as names, and the renderer shows a list.
  const measured = [];
  const measuredNames = [];
  if (isObject(p.measured_signals)) {
    for (const [name, value] of Object.entries(p.measured_signals)) measured.push(row(name, value ?? null));
  } else if (Array.isArray(p.measured_signals)) {
    for (const entry of p.measured_signals) {
      if (isObject(entry)) measured.push(row(entry.signal ?? entry.name ?? '', entry.value ?? null));
      else measuredNames.push(String(entry));
    }
  }

  const evaluators = [];
  if (isObject(p.evaluators)) {
    for (const [signal, record] of Object.entries(p.evaluators)) {
      const r = isObject(record) ? record : {};
      evaluators.push({
        signal,
        evaluator: row('Évaluateurs', r.evaluator ?? null),
        model_used: row('Modèle', r.model_used ?? null),
        status: row('État de la mesure', r.status ?? null),
        reason: row('cause', r.reason ?? null),
      });
    }
  }

  const published = [];
  if (isObject(p.published_values)) {
    for (const [path, value] of Object.entries(p.published_values)) published.push(row(path, value ?? null));
  }

  return {
    schema: CARD_SCHEMA,
    state: 'measurement',
    banners,
    identity: [
      row('Identifiant de requête', p.request_id ?? null),
      row('Horodatage', p.timestamp ?? null),
      row('Identifiant système', p.system_id ?? null),
      row('Mode', p.mode ?? null),
      row('Identifiant de trace', p.trace_id ?? null),
    ],
    decision: {
      value: row('Décision', p.decision ?? null),
      basis: row('Fondement de la décision', p.decision_basis ?? null),
      // Deliberately a row, not a boolean folded into a colour: the reader is
      // told the fact, and the banner above states what it forbids.
      is_measured: row('Décision adossée à des seuils mesurés', p.decision_is_measured ?? null),
      reasons: list(p.decision_reasons),
    },
    measurement: [
      row('État de la mesure', p.measurement_status ?? null),
      row('Contrôles tentés', p.checks_attempted ?? null),
      row('Contrôles réussis', p.checks_succeeded ?? null),
      row('Contrôles émis', p.checks_emitted ?? null),
      row('Couverture', p.coverage ?? null),
      row('Base de confiance', p.confidence_basis ?? null),
      row('Agrégats publiables', p.aggregates_publishable ?? null),
    ],
    lists: {
      missing_required_signals: missing,
      degraded_g_inputs: list(p.degraded_g_inputs),
      failed_checks: list(p.failed_checks),
    },
    signals: { measured, measured_names: measuredNames, unmeasured },
    provenance: [
      row('Version de mesure', p.measurement_version ?? null),
      row('Version du normaliseur', p.normalizer_version ?? null),
      row('Modèle', p.model ?? null),
      row('Fournisseur', p.provider ?? null),
      row('Accord de version', agreement),
      row('Portée de la divergence', p.version_scope ?? reference.divergence_scope ?? null),
    ],
    evaluators,
    published_values: published,
    caveats: list(p.caveats),
    unmodelled_root_fields: list(p.unmodelled_root_fields),
    disclaimer: DISCLAIMER,
  };
}

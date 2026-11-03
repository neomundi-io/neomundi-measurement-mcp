/** Renders the measurement card from a SYNTHETIC payload, so it can be
 * screenshotted for the submission dossier.
 *
 * WHY SYNTHETIC, AND WHY THAT IS NOT A SHORTCUT. The submission procedure asks
 * for a screenshot of the component. A real measurement is execution data --
 * a prompt, a response, a request identifier that resolves on the API side --
 * and this repository is public, so a capture taken from a recorded response
 * would smuggle that data in as an image. The payloads below are written here,
 * by hand, and they say so on their face: `request_id` is the literal string
 * `synthetique-aucun-appel-reel`. A reader of the screenshot can tell.
 *
 * WHY THE PAYLOADS LOOK LESS FLATTERING THAN THEY COULD. They are what a user
 * actually sees today. The connector is pinned to measurement version 3.3.0
 * while the answering instance declares 3.3.1, so EVERY measurement comes
 * back `version_agreement: divergent` and the card raises its non-comparable
 * banner -- that is `D-8`, a product arbitration, not a defect. A capture
 * showing agreement would be a capture of something that does not happen.
 * The second payload is the case this whole card exists for: a permissive
 * decision taken with no check attempted, which must never look like a
 * measured one.
 *
 * THE HARNESS IS NOT THE CARD. It writes `window.openai.toolOutput` before
 * the card's own script runs, which is one of the two delivery paths the card
 * supports. The card bytes are inserted verbatim: `cardHtml()` is not edited,
 * so the document captured is the document served.
 *
 *     node scripts/card-capture-harness.mjs <output-directory>
 *
 * The output is HTML, outside the package allow-list. Nothing it produces is
 * shipped: `PLUGIN_FILES` excludes captures by construction.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { cardHtml } from '../runtime/ui/card.mjs';

const SYNTHETIC_ID = 'synthetique-aucun-appel-reel';

/** A measurement that completed, on a version pair that does not agree.
 * This is the representative case: three checks emitted, five signals, one
 * of them unmeasured with its cause, and the divergence banner raised.
 */
export const MEASURED = {
  adapter_error: null,
  measurement_reference: { agreement: 'divergent', divergence_scope: null },
  presentation: {
    request_id: SYNTHETIC_ID,
    timestamp: '2026-11-01T00:00:00Z',
    system_id: 'neomundi-measurement-mcp',
    mode: 'OBS',
    trace_id: null,
    decision: 'ALLOW',
    decision_basis: 'measured_thresholds',
    decision_is_measured: true,
    decision_reasons: ['tous les seuils mesures sont respectes'],
    measurement_status: 'complete',
    checks_attempted: 3,
    checks_succeeded: 3,
    checks_emitted: 3,
    coverage: 'partial',
    confidence_basis: 'measured_signals',
    aggregates_publishable: false,
    missing_required_signals: [],
    degraded_g_inputs: [],
    failed_checks: [],
    measured_signals: {
      coherence_score: 0.82,
      semantic_instability_score: 0.17,
      factual_hallucination_score: 0.09,
      semantic_risk: 0.21,
    },
    unmeasured: {
      stability_score: { cause: 'aggregate_withheld' },
    },
    evaluators: {
      coherence_score: { evaluator: 'embeddings', model_used: 'nomic-embed-text', status: 'ok', reason: null },
      factual_hallucination_score: { evaluator: 'judge', model_used: 'mistral24b', status: 'ok', reason: null },
      semantic_risk: { evaluator: 'prompt_rating', model_used: 'mistral24b', status: 'ok', reason: null },
    },
    measurement_version: '3.3.1',
    normalizer_version: '1.0.0',
    model: 'mistral24b',
    provider: 'infomaniak',
    version_agreement: 'divergent',
    // The established statement, in the shape `reference.mjs` publishes it:
    // per transport, never collapsed into one verdict.
    version_scope: {
      rest: 'identical',
      sse: 'decision_may_differ',
      summary: 'On the REST path the two versions are declared identical, so a series may be continued across them. On the streaming path the trajectory rules changed.',
      unchanged_by_the_bump: 'Slicing invariance. The published series still varies with the network framing under both versions.',
    },
    published_values: {
      'quality.coherence_score': 0.82,
      'metrics.semantic_instability_score': 0.17,
    },
    caveats: [
      'Une mesure ne donne aucune autorisation d execution.',
      'La variance des evaluateurs n est pas caracterisee : aucun ecart entre deux valeurs ne peut etre dit significatif (ML-008).',
      'Les agregats ne sont pas publiables pour cette mesure.',
    ],
    unmodelled_root_fields: [],
  },
};

/** The case the card exists to prevent being misread: a permissive decision
 * taken with NO check attempted. Nothing green, nothing reassuring, and the
 * banner says in words that this is not a measurement.
 */
export const NO_CHECK = {
  adapter_error: null,
  measurement_reference: { agreement: 'divergent', divergence_scope: null },
  presentation: {
    request_id: SYNTHETIC_ID,
    timestamp: '2026-11-01T00:00:00Z',
    system_id: 'neomundi-measurement-mcp',
    mode: 'OBS',
    trace_id: null,
    decision: 'ALLOW',
    decision_basis: 'no_check_attempted',
    decision_is_measured: false,
    decision_reasons: [],
    measurement_status: 'not_attempted',
    checks_attempted: 0,
    checks_succeeded: 0,
    checks_emitted: 0,
    coverage: null,
    confidence_basis: null,
    aggregates_publishable: false,
    missing_required_signals: ['coherence_score', 'factual_hallucination_score'],
    degraded_g_inputs: [],
    failed_checks: [],
    measured_signals: {},
    unmeasured: {
      coherence_score: { cause: 'no_check_attempted' },
      semantic_instability_score: { cause: 'no_check_attempted' },
      factual_hallucination_score: { cause: 'no_check_attempted' },
      semantic_risk: { cause: 'no_check_attempted' },
      stability_score: { cause: 'no_check_attempted' },
    },
    evaluators: {},
    measurement_version: '3.3.1',
    normalizer_version: null,
    model: null,
    provider: null,
    version_agreement: 'divergent',
    version_scope: null,
    published_values: {},
    caveats: [
      'Aucun controle n a ete effectue : cette decision n est pas une mesure.',
      'Une mesure ne donne aucune autorisation d execution.',
    ],
    unmodelled_root_fields: [],
  },
};

/** A measurement the instrument could only half see: one signal unmeasured
 * with its cause, required signals missing, several fields returned null.
 * This is the state a pasted answer with no prompt actually produces.
 */
export const PARTIAL = JSON.parse(JSON.stringify(MEASURED));
PARTIAL.presentation.measurement_status = 'partial';
PARTIAL.presentation.checks_succeeded = 2;
PARTIAL.presentation.missing_required_signals = ['factual_hallucination_score'];
PARTIAL.presentation.unmeasured = {
  factual_hallucination_score: { cause: 'no_reference_supplied' },
  stability_score: { cause: 'aggregate_withheld' },
};
delete PARTIAL.presentation.measured_signals.factual_hallucination_score;
PARTIAL.presentation.coverage = null;
PARTIAL.presentation.confidence_basis = null;
PARTIAL.presentation.caveats = [
  'Une mesure ne donne aucune autorisation d execution.',
  'Sans prompt ni reference, l ancrage factuel ne peut pas etre evalue.',
];

/** A call that did not complete. Nothing on the card may read as a result. */
export const ERROR = {
  adapter_error: {
    code: 'upstream_http_error',
    message: 'The measurement service answered 502 and no measurement was produced.',
    upstream: { classification: 'transport', billable: 'unknown', retry: 'not_attempted' },
  },
  measurement_reference: { agreement: 'not_declared', divergence_scope: null },
  presentation: null,
};

export const PAYLOADS = Object.freeze({
  measured: MEASURED, partial: PARTIAL, 'no-check': NO_CHECK, error: ERROR,
});

/** Inserts the host bridge before the card's own script, without touching a
 * byte of the card. The anchor is the root element the card creates; the
 * card's script follows it, so a script placed here runs first.
 */
export function harness(payload) {
  const card = cardHtml();
  const anchor = '<div id="root"></div>';
  if (!card.includes(anchor)) throw new Error('The card no longer contains the root anchor; the harness must be rewritten, not patched.');
  const bridge = `<script>window.openai={toolOutput:${JSON.stringify(payload)}};</script>`;
  return card.replace(anchor, anchor + '\n' + bridge);
}

/** A page that frames the component the way a host does.
 *
 * The card is loaded in an iframe of a fixed, realistic width rather than
 * being stretched across a desktop window. Nothing about the card changes:
 * the frame is the host's job, and simulating it here is the difference
 * between a screenshot of the component and a screenshot of a browser.
 */
export function framePage(componentFile, title) {
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>
  html,body{margin:0;padding:0;background:#eceff3;}
  .wrap{padding:28px 16px;}
  .frame{width:720px;margin:0 auto;background:#fff;border:1px solid #d8dce3;border-radius:14px;overflow:hidden;}
  iframe{display:block;width:100%;border:0;}
</style></head>
<body><div class="wrap"><div class="frame"><iframe id="component" src="${componentFile}" title="${title}"></iframe></div></div>
<script>
  var f = document.getElementById('component');
  function fit(){ try { f.style.height = f.contentDocument.documentElement.scrollHeight + 'px'; } catch (e) {} }
  f.addEventListener('load', function(){ fit(); setTimeout(fit, 50); });
</script>
</body></html>
`;
}

export function writeHarnesses(directory) {
  directory = resolve(directory);
  mkdirSync(directory, { recursive: true });
  const written = [];
  for (const [name, payload] of Object.entries(PAYLOADS)) {
    const component = `card-${name}-component.html`;
    const componentFile = join(directory, component);
    writeFileSync(componentFile, harness(payload), 'utf8');
    const frameFile = join(directory, `card-${name}.html`);
    writeFileSync(frameFile, framePage(component, `Carte de mesure NeoMundi — ${name}`), 'utf8');
    written.push(frameFile, componentFile);
  }
  return written;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!process.argv[2]) {
    console.error('Usage: node scripts/card-capture-harness.mjs <output-directory>');
    console.error('Write OUTSIDE the repository: a capture is not package content.');
    process.exitCode = 2;
  } else {
    for (const file of writeHarnesses(process.argv[2])) console.log(file);
  }
}

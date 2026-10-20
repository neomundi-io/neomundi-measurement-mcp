import { isObject, owns } from './contract.mjs';

/** The backend revision this connector's reading of the REST contract was
 * established against. It is a property of THIS CODE, never a claim about the
 * instance that answers.
 *
 * `API_CONTRACT_AUDIT.md` stopped before implementation for one stated reason:
 * "Révision cible faisant autorité : archive/commit identifié [...] Une URL
 * seule ne suffit pas à identifier la révision." This constant is that
 * identification, and nothing more. Naming a commit does not validate a
 * deployment: no frozen OpenAPI document exists server-side, so the commit and
 * the version string are the only things a measurement can be attributed to.
 *
 * Evidence behind these values: the NeoMundi Python SDK v0.1.0 campaign of
 * 2026-10-17 against a local instance built from this commit — 11 recorded REST
 * responses, every one declaring measurement_version 3.3.0, with no unmodelled
 * field. `tests/captured-rest.test.mjs` replays those responses through this
 * connector. It is local evidence about one instance, not about any hosted
 * deployment.
 */
export const BACKEND_REFERENCE = Object.freeze({
  backend_commit: '68d6057cf620e430e6488da3cfcec9c471c75ed6',
  measurement_version: '3.3.0',
  normalizer_version: '1.0.0',
  contract_source: 'govern-v3/app/models/responses.py, requests.py',
  openapi_frozen: false,
});

/** Where a version is read from, when one is published at all.
 *
 * `audit.measurement_version` is the field the backend itself stamps a
 * measurement row with. The envelope's separate `contract_version` alias keeps
 * its own, unchanged meaning: a verbatim copy of a TOP-LEVEL contract_version.
 * No backend revision inspected so far emits that top-level field, and the two
 * are never conflated — reading one is not a substitute for the other.
 */
export const VERSION_PATH = 'audit.measurement_version';

/** Outcome of comparing the version the instance declared with the version this
 * code was built against. Four outcomes, because collapsing them would hide the
 * one that matters: `divergent` means the results are not comparable with a
 * series produced under the expected version, and fields may have changed
 * meaning. It is not an adapter error and never alters the server payload.
 */
export const AGREEMENT = Object.freeze({
  MATCH: 'match',
  DIVERGENT: 'divergent',
  DECLARED_UNUSABLE: 'declared_unusable',
  NOT_DECLARED: 'not_declared',
});

/** Declared versions whose difference from the pinned one has been ESTABLISHED
 * rather than assumed, and what the difference is.
 *
 * Why this exists. `divergent` says "a different version was declared", and
 * its documented reading is "not comparable". That reading is right by default
 * and must stay the default. But a deployment serving a later version makes
 * EVERY call divergent, and an integrator told only "not comparable" cannot
 * tell a version bump that moved nothing on their transport from one that
 * invalidates their series. Guidance 5.6 asks them to report a divergence
 * instead of absorbing it; without a scope they would report all of them
 * identically, and the signal would be worth nothing.
 *
 * What this is NOT. It never changes `agreement`, never widens `match`, and
 * never silences anything: an entry here ADDS what is known about a specific
 * version pair, beside the verdict. A version absent from this table stays
 * plainly divergent with no scope at all — which is the honest answer, since
 * nothing has been established about it.
 *
 * Admission rule. An entry is added only from the backend's own published
 * comparability statement at the declared revision, with the commit range that
 * carries it named in `evidence`. Not from a changelog, not from a release
 * note, and never from an inference about what a patch version "should" mean.
 */
export const VERSION_EQUIVALENCE = Object.freeze({
  '3.3.1': Object.freeze({
    expected_measurement_version: BACKEND_REFERENCE.measurement_version,
    received_measurement_version: '3.3.1',
    // Per transport, because that is the granularity at which this bump differs.
    rest: 'identical',
    sse: 'decision_may_differ',
    summary: 'On the REST path the two versions are declared identical, so a series may be continued across them. On the streaming path the trajectory rules R1/R2/R3 changed: under 3.3.0 a window computed before the background judges answered could produce a published FLAG from unmeasured points, and under 3.3.1 those rules read only measured points plus the final one. A streaming observation left at ALLOW by the measured signals whose profile was DROP or OSCILLATING from unmeasured points is therefore decided differently. The published trajectory itself is unchanged.',
    unchanged_by_the_bump: 'Slicing invariance. The published series, profile and total variation still vary with the network framing under both versions, and a real drift visible only on a stream too coarsely sliced to produce a measured window is observable under neither.',
    evidence: 'Backend commit range 68d6057..aeff13c. The measurement surface lock (govern-v3/tests/golden/measurement_surface_lock.json) moves the version string and nothing else; govern-v3/app/models/ is byte-identical across the range; the comparability statement is in govern-v3/app/config.py beside MEASUREMENT_VERSION. Read from the repository, not from any running deployment.',
  }),
});

/** What is known about a specific divergence, or `null`.
 *
 * `null` means one of two things, and they are deliberately not distinguished
 * here: there is no divergence, or nothing has been established about this one.
 * Both leave the reader with `agreement` alone, which is the correct fallback.
 */
export function divergenceScope(agreement, receivedVersion, table = VERSION_EQUIVALENCE) {
  if (agreement !== AGREEMENT.DIVERGENT) return null;
  const known = Object.hasOwn(table, receivedVersion) ? table[receivedVersion] : undefined;
  // A table entry established against a different pin is stale, not current:
  // withhold it rather than publish an equivalence nobody re-established.
  if (!known || known.expected_measurement_version !== BACKEND_REFERENCE.measurement_version) return null;
  return known;
}

const usableString = (value) => typeof value === 'string' && value.trim() !== '';

/** Reads the declared versions without coercion, inference or defaulting.
 *
 * A number arrives here wrapped by `parseApiJson` as raw JSON, never as a
 * string: such a value is reported `declared_unusable` rather than converted,
 * because turning a version token into a string would invent a declaration the
 * server did not make. The original value stays visible, untouched, under
 * `response.audit`.
 *
 * `not_declared` is the expected outcome on the SSE path: the named `done`
 * event observed from the gateway carries no audit block, so no version is
 * published there at all. That is an absence in the upstream contract, not a
 * failure of this connector.
 */
export function measurementReference(response) {
  const reference = {
    received_measurement_version: null,
    received_normalizer_version: null,
    expected_measurement_version: BACKEND_REFERENCE.measurement_version,
    expected_backend_commit: BACKEND_REFERENCE.backend_commit,
    agreement: AGREEMENT.NOT_DECLARED,
    version_path: null,
    // Always present, `null` unless something is established about this exact
    // divergence. Set last, from the verdict, so it can never contradict it.
    divergence_scope: null,
  };
  const audit = isObject(response) ? response.audit : undefined;
  if (!isObject(audit) || !owns(audit, 'measurement_version')) return reference;
  // The field exists at the expected path: record that, whatever its value.
  reference.version_path = VERSION_PATH;
  const declared = audit.measurement_version;
  if (usableString(audit.normalizer_version)) reference.received_normalizer_version = audit.normalizer_version;
  if (!usableString(declared)) {
    reference.agreement = AGREEMENT.DECLARED_UNUSABLE;
    return reference;
  }
  reference.received_measurement_version = declared;
  // Only measurement_version decides agreement. normalizer_version is reported
  // verbatim for a reader who needs it, and deliberately not folded into this
  // verdict: it labels the normalizer, not the measurement a row carries.
  reference.agreement = declared === BACKEND_REFERENCE.measurement_version ? AGREEMENT.MATCH : AGREEMENT.DIVERGENT;
  reference.divergence_scope = divergenceScope(reference.agreement, declared);
  return reference;
}

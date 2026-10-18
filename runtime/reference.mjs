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
  return reference;
}

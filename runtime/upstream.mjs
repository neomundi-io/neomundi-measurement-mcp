/** Classification of an upstream HTTP status, for an agent that must decide
 * what to do next.
 *
 * Why this is a separate field and not a change to `adapter_error.code`: the
 * code names the TRANSPORT failure taxonomy of this adapter and existing
 * consumers branch on it. The HTTP status is a fact about the upstream
 * exchange. Reporting both, side by side, keeps each meaning stable — the same
 * discipline applied to `measurement_reference` beside `validation`.
 *
 * None of this classifies a measurement. An HTTP error is a transport outcome;
 * it is never a decision, a score, or an absence of risk.
 */

/** What the status says about whether a measurement was produced and billed.
 *
 * These values were established against the pinned reference revision, not
 * assumed: authentication, rate limiting and request validation all refuse the
 * call before a measurement is produced, a 402 means the quota refused it, and
 * a 5xx can land once the call was already under way.
 *
 * Two caveats are stated rather than hidden. This connector cannot prove that
 * a response came from the application rather than from infrastructure in
 * front of it, and a deployed revision may differ from the pinned one. So
 * `no_measurement_billed` means "declared and consistent with the reference
 * revision", never "proven on your deployment" — and `billing_unknown` means
 * exactly that: unknown, so reconcile rather than retry.
 */
export const BILLING = Object.freeze({
  NOT_BILLED: 'no_measurement_billed',
  UNKNOWN: 'billing_unknown',
});

/** What a CALLER may do. This adapter itself never retries a measurement
 * call: `POST /v1/govern` is not idempotent, carries no `Idempotency-Key`,
 * and one accepted call creates an observation, debits quota or wallet, writes
 * a usage event and overwrites the server-side `delta_g` reference.
 */
export const RETRY = Object.freeze({
  // The same request will be refused the same way. Fix the cause instead.
  POINTLESS: 'identical_request_will_be_refused_identically',
  // A later identical request can succeed; this one changed nothing.
  AFTER_DELAY: 'may_succeed_after_a_delay',
  // The outcome is unknown. Retrying may double-charge and duplicate an
  // observation. Reconcile against your own request log first.
  UNSAFE: 'not_without_idempotency_guarantee',
});

const entry = (httpClass, billing, retry, meaning, guidance) =>
  Object.freeze({ class: httpClass, billing, retry, meaning, guidance });

/** The statuses that carry a distinct, actionable meaning. */
const KNOWN = Object.freeze(new Map([
  [401, entry('authentication', BILLING.NOT_BILLED, RETRY.POINTLESS,
    'The API key was rejected: invalid, suspended or revoked.',
    'Check NEOMUNDI_API_KEY in the server environment. See BL-001 in KNOWN_LIMITATIONS.md before concluding the key is wrong: a trial account can end up with suspended keys, after which every call returns 401.')],
  [402, entry('quota_or_payment', BILLING.NOT_BILLED, RETRY.POINTLESS,
    'Quota or wallet balance refused the call. No measurement was produced.',
    'See BL-001 in KNOWN_LIMITATIONS.md: on a trial-tier account this 402 can report an exhausted quota when quota remains, and can leave the account keys suspended. Verify the remaining quota and the key status before concluding.')],
  [403, entry('authorization', BILLING.NOT_BILLED, RETRY.POINTLESS,
    'The key is accepted but not permitted for this call.',
    'A tier or scope question, not a credential one. Retrying is pointless.')],
  [404, entry('route_not_found', BILLING.NOT_BILLED, RETRY.POINTLESS,
    'The route does not exist on the host that answered.',
    'Check NEOMUNDI_API_BASE_URL. A reverse proxy answering instead of the application produces this too.')],
  [413, entry('request_too_large', BILLING.NOT_BILLED, RETRY.POINTLESS,
    'The upstream refused the request body size.',
    'Reduce llm_prompt, llm_response, rag_context or documents. This adapter also enforces its own local request limit before sending.')],
  [422, entry('invalid_request', BILLING.NOT_BILLED, RETRY.POINTLESS,
    'The request body did not satisfy the upstream schema.',
    'Correct the arguments. The upstream validation detail is deliberately not exposed, because an error body can echo submitted content.')],
  [429, entry('rate_limited', BILLING.NOT_BILLED, RETRY.AFTER_DELAY,
    'A per-key burst limit refused the call before any measurement began.',
    'Space the calls out. The upstream Retry-After header is not surfaced by this adapter, so choose your own delay. This status is a local burst limit, never a statement about the measured content.')],
  [500, entry('server_error', BILLING.UNKNOWN, RETRY.UNSAFE,
    'The upstream failed while handling the call. Whether a measurement was produced is unknown.',
    'Do not retry automatically. The quota may already be debited, and an upstream refund is not guaranteed on a trial account — see BL-001. Reconcile against your own request log instead of repeating the call.')],
  [502, entry('server_error', BILLING.UNKNOWN, RETRY.UNSAFE,
    'A gateway between this connector and the application failed. The outcome is unknown.',
    'Do not retry automatically; the request may have reached the application.')],
  [503, entry('service_unavailable', BILLING.NOT_BILLED, RETRY.AFTER_DELAY,
    'The responder declares it did not process the call.',
    'The one status where a later retry is both safe and useful. This connector still does not retry on its own; the declaration cannot be verified, since the responder may be infrastructure rather than the application.')],
  [504, entry('server_error', BILLING.UNKNOWN, RETRY.UNSAFE,
    'A gateway timed out waiting for the application. The outcome is unknown.',
    'Do not retry automatically. A timeout upstream is the same hazard as a local one: the call may have been executed and billed.')],
]));

const FAMILY = Object.freeze({
  client: entry('client_error', BILLING.NOT_BILLED, RETRY.POINTLESS,
    'The upstream refused the call with an unlisted 4xx status.',
    'Treat as a rejected request. Report the status: an unlisted 4xx means the upstream contract moved.'),
  server: entry('server_error', BILLING.UNKNOWN, RETRY.UNSAFE,
    'The upstream failed with an unlisted 5xx status. The outcome is unknown.',
    'Do not retry automatically. Report the status.'),
  other: entry('unexpected_status', BILLING.UNKNOWN, RETRY.UNSAFE,
    'The responder returned a status outside the 4xx and 5xx ranges for a failed call.',
    'Do not retry automatically. Report the status; this is not a documented outcome.'),
});

/** Classifies one upstream status. Never throws, never consults the response
 * body, and never widens a known status into a family by accident.
 */
export function classifyUpstreamStatus(httpStatus) {
  if (!Number.isInteger(httpStatus)) return null;
  const known = KNOWN.get(httpStatus);
  if (known) return { http_status: httpStatus, ...known };
  const family = httpStatus >= 400 && httpStatus < 500 ? FAMILY.client
    : httpStatus >= 500 && httpStatus < 600 ? FAMILY.server
      : FAMILY.other;
  return { http_status: httpStatus, ...family };
}

/** The statuses this module classifies individually. Exported so a test can
 * assert the list rather than restate it.
 */
export const CLASSIFIED_STATUSES = Object.freeze([...KNOWN.keys()]);

# Known limitations — NeoMundi measurement MCP connector

**Read this before relying on any figure that reaches an agent through this
connector.**

This is the public register of what does and does not work. It is written in
English to stay aligned with the NeoMundi Python SDK's register: the `BL-*`
identifiers, the status vocabulary and the lifecycle rules below are the
**same** in both, so a limitation can be discussed once across both clients.
The connector-specific entries are numbered `ML-*` to keep them distinct from
the SDK's `SL-*`.

Nothing here is softened. An HTTP error is a transport outcome, not a
measurement; and a measurement is not a permission, a compliance verdict, or
evidence of truth, safety or absence of hallucination.

---

## 1. Connector status

**`LIVE_TRANSPORT_VALIDATED_CONTRACT_PENDING`.**

Real transport to a NeoMundi gateway has been observed. Full contract
conformance has not been established, and **`LIVE_API_VALIDATED` is not
awarded.**

| | |
|---|---|
| Transport | Streamable HTTP, loopback only. **Not stdio** |
| Tool surface | one tool, `measure_execution` |
| Runtime dependencies | **none**. Node.js 24 or later |
| Pinned reference revision | backend `68d6057`, measurement version `3.3.0` |

**Three test scopes, deliberately distinguished and never merged.** Figures
re-measured on 2026-10-20, with `npm test` from the repository root:

| Scope | Result |
|---|---|
| **This repository, recordings absent** | **142 passed, 9 skipped** (151 tests) |
| **This repository, recordings present beside it** | **211 passed, 0 skipped** |
| Full working copy, including a local probe excluded from here | 211 + the probe's guard suite |

The skipped tests are the replay of recorded API responses. Those recordings
are **not in this repository** — they are execution data, not source — so the
replay skips with a stated reason, and names each family of check it could not
run. They are not a weaker part of the suite: they are the only part that can
observe a divergence between the contract as read and the contract as served.

Until 2026-10-20 the second row was **unreachable from this repository**: the
lookup resolved one directory too high, so the replay skipped even where the
recordings were present. See **ML-011**. The command that reproduces these
figures is `npm test` at the repository root; `npm test` inside `runtime/` runs
the connector suite only and reports a lower count.

The difference between the second and third rows is the guard suite of a
one-shot live-call probe, excluded from this repository along with the probe
itself: see ML-010.

---

## 2. What is verified, and how

### Verified by execution against a real endpoint

| Observation | Evidence |
|---|---|
| Real transport to a gateway, SSE, terminated cleanly | one observed run, HTTP 200, named `done` event |
| The response is relayed without alteration | same run, plus the recorded-response replay |

**One observed run is one observed run.** It is not a load test, not a
reproducibility claim, and not a statement about any other deployment.

### Verified against recorded real responses

Eleven REST responses recorded from an instance built from the pinned revision
are replayed through the connector. Five families of check, on each:

| Check | What it establishes |
|---|---|
| Passes through unaltered | keys, values **and order** identical to what the instance sent |
| Numeric spelling preserved | a float written `1.0` does not come back as `1` |
| Version provenance | the declared version is read verbatim and reported beside the expected one |
| A withheld aggregate is declared | upstream invariant, checked on real data |
| An unmeasured signal carries a cause | upstream invariant, checked on real data |

The last two make no claim about the connector: a failure there is a backend
finding, to be reported rather than absorbed.

### Verified by the test suite only

Session lifecycle and protocol negotiation; authentication on every request;
`Host` and `Origin` validation; content negotiation; body and response size
limits; concurrency and session limits; cancellation propagation; SSE framing
for both `done` and `[DONE]` terminations; the credential-disclosure guard; the
upstream status classification; and the reading aid.

The guards of the live-call probe are covered too, but in the working copy
only: both the probe and its tests are excluded from here (ML-010).

**A pass on simulated transport does not validate production behaviour.**

### Not verified at all

| Not verified | Consequence |
|---|---|
| Any **hosted deployment** | the recordings come from a local instance built from the pinned revision |
| Behaviour **under load** | no concurrency or saturation characterisation exists |
| Any **real MCP host** | the client configuration example is generic and untested against a specific host |
| Recorded **SSE** payloads | the streaming path has no recorded-response replay; see ML-002 |
| The live-call probe **against a real endpoint** | its guards and its network-failure path are tested; the call itself has not been made |

---

## 3. Known backend limitations

These are limitations of the measurement instrument, not of this connector.
The connector surfaces them; it works around none of them. Each is also
reported inside every response, under `reading_aid.known_limitations`, with
whether it is observable in that particular response.

### BL-001 — Trial account and key status inconsistency

| | |
|---|---|
| **Status** | `Open — observed` |
| **Affected version** | backend `68d6057`, measurement version `3.3.0` |
| **Scope** | accounts on the trial tier |
| **Severity** | **High** — can stop your very first call |
| **Connector impact** | none; the connector reports the server's answer faithfully |

**What is observed.** A trial-tier account can receive **HTTP 402** reporting
an exhausted quota while quota remains, and can end up with **every key on the
account suspended**. Every later call then returns **HTTP 401**.

**Why it matters more than its severity suggests.** The failure is
*misleading*: the message points at a quota that is in fact intact, so
diagnosis starts in the wrong direction. And it changes persistent state — the
suspension does not clear when the call ends.

**How to recognise it.** On a 402, or on a 401 that appears suddenly after a
working call, check the remaining quota and the key status **before**
concluding the credential is wrong. The connector's
`adapter_error.upstream.guidance` says this on both statuses.

**Workaround.** None from the client side. Report it rather than provisioning
a new key.

### BL-002 — SSE governance decision depends on network chunking

| | |
|---|---|
| **Status** | `Open — observed` |
| **Affected version** | backend `68d6057`, measurement version `3.3.0` |
| **Scope** | **`POST /v1/govern/stream` only. REST is unaffected.** |
| **Severity** | **High for streaming**, none for the REST path |
| **Connector impact** | the connector relays it; it cannot correct it |

**What is observed.** On the streaming route the published decision depends on
how the provider slices the stream, because the interim measurement windows
are counted in **chunks** rather than in tokens or characters. The same text
delivered in a different number of fragments can yield a different decision.

**Consequence.** A measurement whose result depends on the transport layer is
not reproducible. **Until BL-002 is resolved, no streaming measurement should
support a published figure, a comparison between models, or a decision you
need to defend.**

**What to do.** Use the `execution` path (REST) for anything you will quote.
Treat the `generation` path as a convenience, and its decision as indicative.

### BL-003 — `delta_g` published while the aggregate is withheld

| | |
|---|---|
| **Status** | `Open — observed`, contract interpretation `Under review` |
| **Affected version** | backend `68d6057`, measurement version `3.3.0` |
| **Scope** | `POST /v1/govern`, when a required signal was not measured |
| **Severity** | **Medium** — a misread field, not a corrupted measurement |
| **Connector impact** | none; the raw value is exposed and the caveat is reported |

**What is observed.** When a required signal could not be measured, the server
correctly withholds the aggregates — `g_score` is `null` and the response says
so. **But `delta_g` still carries a number.**

**Why this is stated carefully.** `delta_g` is an interval against a
reference, not an aggregate, so a defensible reading is that publishing it is
legitimate. What is **not** defensible is that the response does not let you
tell the two readings apart.

**The hazard that is independent of that reading.** The reference `delta_g` is
measured against is held server-side, is **overwritten on every call**, is not
published, and can be derived from a call whose own aggregate was not
published. So the interval can be measured against something that was never a
valid measurement, with nothing in the response to say so.

**What to do.** Check `reading_aid.aggregates.publishable` before interpreting
`delta_g`. Treat it as an interval against an unpublished reference, and never
as a drift metric — see ML-005.

---

## 4. Connector-specific limitations

### ML-001 — Streamable HTTP only, not stdio

`By design`. The server is an HTTP server on `127.0.0.1`; it does not speak
stdio. Hosts that only launch stdio subprocesses cannot use it without an
adapter. `GET /mcp` returns **405** deliberately: no server-initiated MCP event
channel is advertised.

### ML-002 — The streaming path has no recorded-response replay

`Open`. The eleven recordings cover REST. Streaming is covered by the
historical anonymised fixture, whose SSE framing is **reconstructed** — it is
not an exact capture of the upstream bytes. Streaming therefore has strictly
weaker evidence than REST, independently of BL-002.

### ML-003 — The SSE final event publishes no measurement version

`Open`, upstream cause. The named `done` event carries no audit block, so
`measurement_reference.agreement` is always `not_declared` on the streaming
path. A streaming measurement cannot be attributed to a revision, and is not
comparable with a REST measurement. The two routes return **different
contract shapes**, and no authoritative upstream schema exists for the SSE one.

### ML-004 — Contract conformance is permanently unvalidated

`Open`, upstream cause. The envelope reports
`validation.contract: not_validated` on **every** call, because the two
metadata fields it looks for are not emitted by the backend. The field
therefore never discriminates. It is kept unchanged rather than redefined, so
that its published meaning does not shift under existing consumers.
`measurement_reference` is the field that actually carries version
provenance.

### ML-005 — The reading aid interprets nothing

`By design`. `reading_aid` names the same-name fields and their scales, says
which aggregates are withheld and what declared it, gives the cause of each
unmeasured signal, lists the paths that are explicitly `null`, and carries this
register. It **never** computes a value, corrects a sign, picks between two
scales, or carries a decision.

Two consequences worth stating. `quality.stability_score` has **1 = stable**
while `metrics.stability_score` has **0 = stable** — both are reported, neither
is chosen, and choosing for you would settle an ambiguity in the contract.
And `baseline.delta_E` is documented with one sign and implemented with the
other: the aid points at `baseline.observed_energy` and
`baseline.reference_energy` so you can recompute, rather than resolving it.

### ML-006 — No automatic retry, ever

`By design`. `POST /v1/govern` is not idempotent and carries no
`Idempotency-Key`: one accepted call creates an observation, debits quota or
wallet, writes a usage event and overwrites the server-side `delta_g`
reference. The connector therefore **never** retries a measurement call, on any
status, including a timeout whose outcome is unknown.

`adapter_error.upstream.retry` tells **you** what is safe; it does not describe
connector behaviour. The upstream `Retry-After` header is not surfaced, so on a
429 choose your own delay.

### ML-007 — Scores do not use the whole `[0, 1]` range

`By design`, upstream property. In practice `stability_score` falls in
`[0.60 ; 1.00]` and `g_final` in `[0.40 ; 1.00]`: two of `g_final`'s four terms
are numerically saturated. A `g_final` of 0.45 is near the floor, not a middling
value. **The decision is more informative than the score.**

### ML-008 — Judge variance is unmeasured

`Open`, upstream methodology. The factuality judge is non-deterministic and its
variance at constant input has never been characterised. **No difference
between two `stability_score` values can presently be called significant**,
however faithful the transport. This limits the interpretation of every
result, including those already produced.

### ML-010 — The one-shot live-call probe is not distributed

`By design`. A `runtime/live-once.mjs` script performs **one** real call, with
every credential taken from the process environment and none from the file. It
exists so that a real observation is reproducible rather than a result nobody
can re-derive. It is **excluded from this repository**, together with its guard
tests, because its purpose is to contact a real endpoint and consume quota, and
a public repository is not the place to hand someone that.

To make a real call without it: start `runtime/server.mjs` and invoke
`measure_execution` from your client. The effect is identical.

### ML-009 — No real MCP host has been connected

`Open`. The client configuration example in `runtime/README.md` is generic.
Field names vary between hosts, and no host has been verified against this
server. It is not claimed that one has.

### ML-011 — The recorded-response replay skipped where the recordings existed

`Fixed — verified`, 2026-10-20. The lookup for the recorded responses hard-coded
one directory depth, written for a working copy nested one folder deeper than
this repository. In this repository the default therefore resolved **one level
above** the recordings, and the replay skipped with "no recorded response
available" on a checkout where they were present and readable.

The failure mode is the one worth naming: nothing failed and nothing errored.
The suite reported "118 passed, 9 skipped" and correctly named the five
families of verification it had not run — while **the only part of the suite
able to observe a divergence between the contract as read and the contract as
served** was silently inert. A skip that states its reason is still a skip
nobody questioned.

Both layout depths are now tried, nearest first, and the skip reason names
every path attempted. `runtime/tests/captured-discovery.test.mjs` guards the
resolution itself — including that an operator-named directory is never
silently replaced by a discovered one, and that an existing-but-empty candidate
does not mask a populated one. Verified: the repository suite runs **211
passed, 0 skipped** where it previously reported 118 passed and 9 skipped.

### ML-012 — The container image does not listen on loopback

`By design`, with a consequence. Inside a container a listener on `127.0.0.1`
is unreachable through a published port, so the image sets
`NEOMUNDI_MCP_BIND=0.0.0.0`. The MCP endpoint is then reachable from wherever
the container is published, and the `Authorization: Bearer` credential is the
only barrier in front of it. The server states this on stderr at startup.

Outside a container nothing changed: the default is still `127.0.0.1`, and no
variable is needed to get it. Only `127.0.0.1` and `0.0.0.0` are accepted — a
hostname resolves differently between build and run, and an arbitrary interface
would widen exposure in a way nothing here has established.

Widening the bind does **not** widen the `Host` allow-list, which still accepts
only `127.0.0.1:<port>` and `localhost:<port>` for the port actually listened
on. A consequence to plan for: the published port must map one-to-one, or the
forwarded `Host` header is refused with 403. `runtime/tests/bind-address.test.mjs`
holds both properties.

**Not established:** the hardening declared in `compose.yaml` — read-only root
filesystem, all capabilities dropped, `no-new-privileges`, unprivileged user —
is set out of prudence and has **not been exercised under load**.

---

## 5. Guidance for an integrator

**5.1 — Read `decision_basis` next to every decision you record.** An `ALLOW`
under `no_check_attempted` and an `ALLOW` under `measured_thresholds` are not
the same statement, and nothing else in your log will distinguish them later.

**5.2 — Check `aggregates.publishable` before quoting any aggregate**, and
before interpreting `delta_g`.

**5.3 — Never flatten the response.** Use full paths. `stability_score` exists
twice on inverted scales, and so do two densities and two different `Q`.

**5.4 — Treat a partial measurement as a successful call**, not a failure. It
means "this much could be measured, and here is why not more". Dropping
partials from your statistics makes your coverage look better than it is.

**5.5 — Store the evidence.** Keep the raw response, the request id, the
received and expected measurement versions, `decision_basis`, the withholding
state, and the connector and reference versions. Without them a figure cannot
be attributed to anything — no frozen OpenAPI specification exists server-side.

**5.6 — Report a divergence instead of absorbing it.** A
`measurement_reference.agreement` of `divergent`, an
`aggregates.undeclared_withholding` of `true`, an unmodelled root field, or a
`decision_basis` outside the three documented values is an **observation about
the upstream contract**. It is information, not a connector bug, and a
workaround in your code hides the signal from everyone else.

**5.7 — An omission from this register is itself worth reporting.**

---

## 6. Version compatibility

| | |
|---|---|
| Pinned backend revision | `68d6057cf620e430e6488da3cfcec9c471c75ed6` |
| Expected measurement version | `3.3.0` |
| Frozen OpenAPI specification | **none exists server-side** |

### 6.1 — The deployed API declares 3.3.1, and this connector still pins 3.3.0

Established on 2026-10-20, by reading the backend repository over the commit
range `68d6057..aeff13c`. **Not** by observing a running deployment.

| What was compared | Finding |
|---|---|
| `govern-v3/app/models/` (request and response models) | **byte-identical** across the range |
| `govern-v3/tests/golden/measurement_surface_lock.json` | the **version string alone** moves; the RGC schema hash and every other locked field are unchanged |
| `govern-v3/app/api/v1/streaming.py` | changed — the trajectory rules `R1/R2/R3` now read only measured points plus the final one |
| The backend's own comparability statement, beside `MEASUREMENT_VERSION` | REST path, aggregates, coverage statuses and gated fields: **identical**. Streaming: a decision can differ |

**The pin was deliberately left at 3.3.0.** It names the revision this code's
reading of the contract was established against, and the eleven recordings that
back it all declare `3.3.0`. Moving it would detach it from its evidence.

What changed instead: a `divergent` verdict against a 3.3.1 instance now
carries `measurement_reference.divergence_scope`, stating **per transport** what
the pair was found to change and what it does not fix. `agreement` is untouched
— it still reads `divergent`, and `divergent` still means "not comparable" for
anything the scope does not cover.

**Three things this does not do.** It does not validate conformance against any
deployment. It does not make a streaming series comparable across the two
versions. And on the streaming path it publishes nothing at all, because no
version is declared there (ML-003) — so the one transport whose decision the
bump can change is the one where the connector cannot tell which version
produced it.

**Unchanged by the bump, and stated by the backend itself:** slicing invariance.
The published series, profile and total variation still vary with the network
framing under both versions.

Because no specification is published, the pinned commit and the version
string are the only things a measurement can be attributed to. Compare
`measurement_reference.received_measurement_version` with
`expected_measurement_version` on your first call and alert on change: a
`divergent` agreement means results are **not comparable** with a series
produced under the expected version, and fields may have changed meaning.

**Minimum check against your own deployment**, before building on it:

1. no unmodelled root field appears in `response`;
2. the declared measurement version is `3.3.0`;
3. a deliberately incomplete call (omit `llm_response`) yields
   `decision_basis: no_check_attempted` and no fabricated aggregate;
4. `reading_aid.aggregates.undeclared_withholding` is `false`.

If 1, 2 or 4 fails, stop and report before collecting data.

---

## 7. Known limitations lifecycle

Each entry carries a stable identifier. Identifiers are never reused or
renumbered; a resolved entry keeps its identifier and changes status.

**Status vocabulary** — identical to the NeoMundi Python SDK's register.

| Status | Meaning |
|---|---|
`Open — observed` | reproduced on a running instance; conditions stated |
`Open — derived from code` | established by reading the source; not yet reproduced |
`Under review` | the intended contract is being clarified before any fix |
`Fixed — pending verification` | corrected, not yet re-verified against an instance |
`Fixed — verified` | corrected **and** re-verified, with evidence referenced |
`By design` | not a defect; a documented scope decision |

### Register

| ID | Title | Status | Affected version | Scope |
|---|---|---|---|---|
**BL-001** | Trial account and key status inconsistency | `Open — observed` | backend `68d6057` / `3.3.0` | trial-tier accounts |
**BL-002** | SSE chunking-dependent governance decision | `Open — observed` | backend `68d6057` / `3.3.0` | `POST /v1/govern/stream` only; REST unaffected |
**BL-003** | `delta_g` published while the aggregate is withheld | `Open — observed`, contract `Under review` | backend `68d6057` / `3.3.0` | `POST /v1/govern` when a required signal is unmeasured |
**ML-001** | Streamable HTTP only, not stdio | `By design` | connector `0.1.0` | transport |
**ML-002** | No recorded-response replay for SSE | `Open` | connector `0.1.0` | streaming evidence |
**ML-003** | SSE publishes no measurement version | `Open` | backend `3.3.0` | streaming contract |
**ML-004** | Contract conformance permanently unvalidated | `Open` | backend `3.3.0` | envelope metadata |
**ML-005** | The reading aid interprets nothing | `By design` | connector `0.1.0` | connector scope |
**ML-006** | No automatic retry, ever | `By design` | connector `0.1.0` | connector scope |
**ML-007** | Scores do not use the whole range | `By design` | backend `3.3.0` | measurement methodology |
**ML-008** | Judge variance unmeasured | `Open` | backend `3.3.0` | measurement methodology |
**ML-009** | No real MCP host connected | `Open` | connector `0.1.0` | integration |
**ML-010** | One-shot live-call probe not distributed | `By design` | connector `0.1.0` | repository scope |
**ML-011** | Recorded-response replay skipped where the recordings existed | `Fixed — verified` 2026-10-20 | connector `0.1.0` | test evidence |
**ML-012** | The container image does not listen on loopback | `By design` | connector `0.1.0` | packaging |

**Internal tracking.** Each `BL-*` entry maps to an item in an internal
backend correction plan holding reproduction steps, source locations,
candidate corrections, regression tests and acceptance criteria. That plan is
**not published in this repository**. Its existence is recorded here so that a
reader knows these items are tracked rather than merely noted.

**Keeping this document honest.** An entry moves to `Fixed — verified` only
when a re-run against an instance demonstrates it, and the evidence is
referenced. No entry is removed, softened or silently reworded.

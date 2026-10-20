# Trajectory — NeoMundi as a connector callable from ChatGPT

**Written 2026-10-20.** A study, not a plan of record. Nothing here has been
built, and no decision has been taken.

**Two rules this document obeys.** It does not invent a NeoMundi capability:
every capability below is either present in this repository today, or named as
absent. And it does not state the platform's current conditions for
distribution or publication — those change, they are not knowable from this
repository, and inventing them would be the most damaging kind of error here.
Where a platform rule governs the outcome, it is marked **[to verify on the
platform's own documentation, at the moment of the decision]**.

---

## 1. What exists today

| | State |
|---|---|
**Protocol** | MCP, Streamable HTTP. One tool: `measure_execution` |
**Transport reach** | `http://127.0.0.1:8787/mcp` — loopback, plain HTTP. In the container image, `0.0.0.0` on the published port (ML-012) |
**Authentication inbound** | one static credential, `Authorization: Bearer`, timing-safe comparison, plus a `Host` allow-list and an `Origin` check |
**Authentication outbound** | `X-API-Key` to the NeoMundi API — the same header the Python SDK uses |
**Input accepted** | an already-executed exchange (`execution`: prompt, response, metrics, `rag_context`, `documents`) or a generation to run and observe (`generation`, SSE) |
**Output** | the server payload verbatim, plus an envelope: `measurement_reference`, `reading_aid`, `validation`, `adapter_error.upstream` |
**Dependencies** | none. Node 24 |
**Tests** | 211 passed, 0 skipped with the recordings present |
**Hosting** | none. No deployment, no domain, no TLS termination, no registry |
**Real MCP host connected** | **one**, Claude Code 2.1.247 on 2026-10-20, against a local stand-in upstream (ML-009). No second host tried |

The two capabilities that matter for a first useful version are already here:
the tool **accepts `documents[]`** and the response **exposes `rag_grounding`,
`citations` and `ungrounded_claims`** when the API produces them. Nothing needs
inventing to measure an answer against its sources.

---

## 2. What a first useful version needs, and what it would say

**The one thing worth offering first.** A user has an answer and the documents
it was supposed to come from. They want to know: *was this answer actually
grounded in these documents, and which claims were not?* That question is
answerable by `measure_execution` as it stands.

Deliberately **not** in a first version: the generation path (it bills a
provider and carries BL-002), longitudinal series (they need version
comparability the SSE path does not have), and any aggregate (`publishable`
gating must be read before quoting one).

**What the answer must carry, every time.** This is where a connector earns or
loses its integrity, and none of it is optional:

- the decision **and** `decision_basis` — `ALLOW` under `no_check_attempted`
  and `ALLOW` under `measured_thresholds` are different statements;
- which signals were **measured** and which were not, each with its named cause;
- `grounding_score`, citations and ungrounded claims, when the API produced them;
- that a measurement is **not** a permission, a compliance verdict, or evidence
  of truth, safety or absence of hallucination;
- the version agreement, and its scope when there is one.

**The gap is presentation, not capability.** The envelope is a large JSON
document built for an agent that must not flatten it. A person reading a chat
reply needs five or six lines. Writing that reduction is the real work of a
first version — and `reading_aid` already names the fields, the inverted
scales, the withheld aggregates and the unmeasured causes, so the reduction can
be driven by it rather than hand-written per field.

⚠ **The reduction is where honesty gets lost.** `reading_aid` interprets
nothing by design (ML-005). A summariser that turns `FLAG` into "this answer
looks risky" has invented a verdict NeoMundi does not publish. Whatever is
built here must be reviewed as a measurement surface, not as copy.

---

## 3. Adaptations the platform would require

These are gaps in **our** work, stated independently of any platform rule.

| # | Gap | Why it blocks |
|---|---|---|
**P-1** | **No publicly reachable endpoint.** Loopback, plain HTTP, no domain, no TLS, no deployment | A hosted assistant cannot reach a listener on someone's laptop. This is the whole of the problem, and it is an infrastructure decision, not a code one |
**P-2** | **One static shared credential.** No per-user identity, no token issuance, no revocation, no scoping | A multi-user connector needs to know whose NeoMundi key is being spent. Today one credential opens the server, and the server holds one API key for everyone who reaches it |
**P-3** | **A NeoMundi API key per user, and a tier.** `documents[]` grounding requires **TIER_02+** | Without per-user keys, every call is billed to one account, and the tier of that account decides what every user gets |
**P-4** | **No usage accounting at the connector.** `POST /v1/govern` is not idempotent, debits quota and writes a usage event; the connector never retries, by design (ML-006) | A connector that cannot attribute a call cannot explain a bill, and cannot answer "did my call go through?" after a 5xx |
**P-5** | **No reduction layer** (§2) | The raw envelope is unusable as a chat answer, and a careless reduction is worse than none |
**P-6** | **One host verified, against a local stand-in** (ML-009) | The transport and the connector path are exercised; contract conformance against a deployment is not, and no second host has been tried |

**Platform-side requirements are deliberately not enumerated here.** Whether a
connector is exposed as MCP or as an OpenAPI action, what authentication scheme
is accepted, what review a listing requires, and whether a private connector
can be shared inside an organisation — all of that is **[to verify on the
platform's own documentation, at the moment of the decision]**. What can be
said without consulting it: any hosted assistant will need a reachable HTTPS
endpoint, which is **P-1**, and that gap exists whatever the platform decides.

---

## 4. Security and confidentiality

What is already true, and testable:

- the server reads **no** `.env`, creates no key, and logs no header, argument,
  body or measurement;
- an upstream **error body is never exposed** — it can echo submitted content;
- a payload containing a configured credential is **withheld whole** rather
  than rewritten (`CREDENTIAL_DISCLOSURE`);
- `documents[]` and `rag_context` are declared **never persisted** by the API,
  processed in memory for the single request.

What a hosted connector would add, and must be decided before anything is
exposed:

1. **The content leaves the user's machine.** A prompt, an answer and the
   supplied documents travel to the NeoMundi API. That is inherent to measuring
   them, and it must be stated to the user in those words — not buried.
2. **A hosted connector sees that content in transit.** Today the connector
   runs on the user's own machine, which is why this has never mattered. Move
   it to a server and it becomes a processing role with the obligations that
   follow. **[Legal qualification required — not a technical question.]**
3. **One shared credential does not survive contact with multiple users**
   (P-2). Whatever replaces it is the single largest piece of unbuilt work.
4. **No log is kept today.** A hosted service usually needs some record for
   support and billing disputes; every field added is a confidentiality
   decision, and "no logging" is the current, deliberate default.

---

## 5. Conditions for testing

Reachable without any platform decision, and worth doing in this order:

1. ~~Connect one real MCP host to the local server~~ — **done on 2026-10-20**,
   Claude Code against a local stand-in upstream. ML-009 is closed, and what it
   does and does not establish is stated there.
2. **Write the reduction layer and review it as a measurement surface**, using
   the eleven recorded responses as input. No network, no quota, no deployment:
   the recordings already cover the three measurement families.
3. **One real call end to end**, through a host, against a real deployment —
   with the tier and quota confirmed beforehand. **Billable: needs explicit
   authorisation.**
4. Only then: a reachable endpoint, and the authentication model behind it.

Steps 1 and 2 are the whole of what can be learned for free. Neither has been
done.

---

## 6. Publication

**No condition for publication is stated in this document**, because none is
known from this repository and inventing one would be worse than silence.

What is established and bears on it: the connector's status is
`LIVE_TRANSPORT_VALIDATED_CONTRACT_PENDING`, and **`LIVE_API_VALIDATED` has not
been awarded**. The register carries three open backend limitations — BL-001
(trial key and quota inconsistency), BL-002 (chunking-dependent streaming
decision), BL-003 (`delta_g` published while the aggregate is withheld) — and
no frozen OpenAPI specification exists server-side to validate a contract
against. Publishing a measurement connector while its own register says
conformance is unestablished is a decision about what NeoMundi is willing to
claim, and it belongs to Sébastien.

Also unresolved, and tracked as **A-1** in the workspace-level register of open
decisions, which is not published here: the connector pins `3.3.0` while the
deployment declares `3.3.1`. Its bounded extent is in `KNOWN_LIMITATIONS.md`
§6.1.

---

## 7. The shortest honest path

```
ML-009 — connect one real MCP host                            DONE 2026-10-20
      ↓
Reduction layer, driven by reading_aid, on the 11 recordings   no cost, no network
      ↓
One real call through that host                       BILLABLE — needs authorisation
      ↓
P-1 — a reachable HTTPS endpoint                      infrastructure decision
      ↓
P-2 / P-3 — per-user identity and keys                 the largest unbuilt piece
      ↓
Platform conditions                                    [to verify, at that point]
```

The first step is done. The second is free and requires no decision; it is the
one remaining task in this document that is a task rather than a decision.

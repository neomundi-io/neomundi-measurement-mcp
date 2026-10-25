> **Choose your path:** integrate the measurement signal into your own infrastructure with the API, SDK or MCP, or [explore Station](https://github.com/neomundi-io/neomundi-station-public) to use the hosted instrument. The dashboard is a planned capability; see Station's current access and availability.
>
> [Understand the measurements](https://github.com/neomundi-io/neomundi-metric-contract) · [Data flows and confidentiality](https://github.com/neomundi-io/neomundi-io-data-protection)

# NeoMundi measurement MCP

**Status: `LIVE_TRANSPORT_VALIDATED_CONTRACT_PENDING` — experimental.**

An MCP server exposing one tool, **`measure_execution`**, over Streamable HTTP.
It transmits a request to the NeoMundi measurement API and relays the server's
values verbatim. It recomputes nothing, corrects nothing, and decides nothing.

### "Private" here means the deployment posture, not this repository

**This repository is public.** The word *private* appears in the package name,
in `serverInfo.name` and in several document titles, and it has never meant the
repository. Five different things are easy to conflate, so they are separated
once, here:

| | |
|---|---|
| **Repository visibility** | **public.** Anyone can read this source |
| **Software distribution** | **none.** No npm publish, no container registry, no release. The image in `Dockerfile` is built and run locally |
| **Authentication** | **required.** Every MCP request needs `Authorization: Bearer`, compared in constant time, behind a `Host` allow-list and an `Origin` check |
| **Data confidentiality** | **nothing is stored or logged here.** No `.env` is read, no header, argument, body or measurement is logged, and a payload containing a configured credential is withheld whole rather than rewritten |
| **Internal resources** | **not published.** The one-shot live-call probe (ML-010), the recorded API responses, and the internal reports are excluded from this repository, and `check-publication.mjs` fails the build if one of them appears |

What *private* does describe: the server listens on loopback by default and is
not meant to face the public internet. See ML-001 and ML-012.

> ### Read this before relying on any figure
>
> **📋 [`KNOWN_LIMITATIONS.md`](KNOWN_LIMITATIONS.md) — what is verified, what
> is not, and the three open backend defects BL-001, BL-002 and BL-003.**
>
> **BL-002 in particular: on the streaming path the published decision depends
> on how the provider slices the stream.** Until it is resolved, no streaming
> measurement should support a published figure or a comparison between models.
> The REST path is unaffected.

A measurement is not a permission, a compliance verdict, or evidence of truth,
safety or absence of hallucination.

## What works today

| | |
|---|---|
| Transport | Streamable HTTP, **loopback only**. Not stdio |
| Tool | one, `measure_execution`, with two mutually exclusive paths |
| `execution` | `POST /v1/govern` — **verified against 11 recorded real responses** |
| `generation` | `POST /v1/govern/stream` — real transport observed once; see BL-002 and ML-002 |
| Runtime dependencies | **none**. Node.js 24 or later |
| Reading aid | homonym fields and their scales, withheld aggregates, unmeasured causes, preserved nulls, known limitations — all **beside** the response, never inside it |
| Upstream errors | 401, 402, 413, 422, 429, 500, 502, 503, 504 each classified, with what each implies about billing and what a caller may do |
| Retries | **none, ever.** The measurement call is not idempotent |

**Tests in this repository:** `118 passed, 9 skipped` on a fresh clone;
`187 passed` once recorded API responses are present. The recordings are
execution data and are not kept here, so the replay that uses them skips with a
stated reason and names each check it could not run.

## Quick start

Node.js 24 or later, nothing to install.

```
node runtime/server.mjs
```

Credentials come from the process environment and nowhere else; no `.env` file
is ever loaded. Startup contacts no API. **A valid tool call against a running
server reaches NeoMundi and can consume quota, and provider resources on the
`generation` path.**

Verify everything first, with no credentials and no remote call:

```
node runtime/demo.mjs
node --test tests/audit.test.mjs runtime/tests/*.test.mjs
```

## Documentation

| Document | Contents |
|---|---|
| [`KNOWN_LIMITATIONS.md`](KNOWN_LIMITATIONS.md) | **the register of what does and does not work** |
| [`runtime/README.md`](runtime/README.md) | installation, client configuration, tools, envelope, reading aid, upstream statuses, SSE limits, and how the API, the Python SDK and this connector fit together |
| [`runtime/CONSOLIDATION_REPORT.md`](runtime/CONSOLIDATION_REPORT.md) | validation status after the first real observation |
| [`API_CONTRACT_AUDIT.md`](API_CONTRACT_AUDIT.md) | the initial contract audit, kept for the record |
| [`README_AUDIT.md`](README_AUDIT.md) | the historical page from before implementation |

The reports at the root and the schemas under `schemas/` document the
historical audit. The active MCP schemas are under `runtime/schemas/`.
`collect-evidence.ps1` needs local source archives that are not distributed
here.

---

## Explore NeoMundi

[Station](https://github.com/neomundi-io/neomundi-station-public) · [Measurement API](https://github.com/neomundi-io/neomundi-runtime-measurement) · [Evidence library](https://github.com/neomundi-io/neomundi-station-public/blob/main/EVIDENCE.md)

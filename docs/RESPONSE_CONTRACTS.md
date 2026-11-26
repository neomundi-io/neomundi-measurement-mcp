# Verify responses before release

[English](RESPONSE_CONTRACTS.md) · [Français](RESPONSE_CONTRACTS_FR.md)

**0.3.0-rc.1** prepares a release with verifiable response contracts.
The successful 0.2.0 hosted calls remain evidence of transport and SSE integrity;
they cannot prove metadata the server did not emit at that time.

## What the server declares

| Path | Contract | Count source | Scope / unit |
|---|---|---|---|
| REST | `neomundi.govern.rest/1.0` | `caller_declared` | `caller_declared` / `tokens` |
| SSE with usage | `neomundi.govern.sse/1.0` | `provider_usage` | `normalized_provider_total` / `tokens` |
| SSE without usage | same SSE contract | `chunk_count_fallback` | `content_chunks` / `chunks` |

The actual count-selection branch determines these declarations. Provider totals
are normalized by adapters: some providers report a total, others report input/output
counts that the adapter sums. This is not invoice verification. A fallback retains
the historical `total_tokens` field and number, explicitly declaring content chunks.
No computation is changed.

SSE also emits `audit.measurement_version`, `normalizer_version` and `trace_id`.
Measurement versions, wire-contract versions and RGC versions are distinct.
Historical records never acquire current provenance retroactively. REST replay of
a stream retains its original `stream_contract_metadata`, without claiming that the
stream was a newly executed REST observation.

## What the MCP checks

Backend schema bytes are bundled unchanged under `runtime/schemas/contracts/`.
`contract_validation` reports schema id, SHA-256 and status:

- `validated`: the final response satisfies the identified schema for this route.
- `invalid`: constraints fail or the declared contract belongs to the other route.
- `not_identified`: no contract version is declared.
- `unsupported`: the declared version is unknown to this client.
- `not_assessed`: no final response was assessed.

`validation.contract` becomes `validated` only after schema validation. Issues contain
paths and keywords, not response contents. The validator implements the keyword set
used by the bundled schemas and rejects unknown keywords and remote references.
`format` remains an annotation under JSON Schema 2020-12; RFC timestamp conformance
is not asserted. JSON numeric constraints use exact decimal comparisons without
rounding or rewriting response values. Null and permitted future fields are retained.

SSE assembly, character length, UTF-8 bytes and SHA-256 are checked separately.
A schema-valid response may describe an incomplete measurement. Schema conformance
does not establish scientific validity, prompt compliance or execution permission.
`measurement_reference` still reports measurement-version divergence independently.

## Where these schemas come from

The two files under `runtime/schemas/contracts/` are the **public copy of
the backend's own contract files**, taken from
`neomundi-io/Backend_plateforme_v2` at
`govern-v3/app/contracts/schemas/`. They are not transcribed from an
observed HTTP response: a reference that came from the response it is meant
to check would prove nothing.

| | |
|---|---|
| Source revision | `ec9a57646` — *merge(BL-V1): porter BL-V1-001 et BL-V1-002 sur le code REELLEMENT en service*, 2026-11-21 |
| `govern-rest-1.0.json` | 20189 bytes · sha256 `8e27a9110298a9b9ff31d6379daefddb1f068fa0b17452ed7b65e341e16d84c3` |
| `govern-sse-1.0.json` | 7991 bytes · sha256 `d05caa8d48c6f64f0124a53f8977914e9e5fe0558ff6172031d3131d36c4c165` |

Both are byte-identical to what `api.neomundi.io/v1/contracts/*` served on
2026-11-26, and both blobs exist in the backend repository under those
exact git object ids — which is what makes the provenance checkable rather
than asserted.

### What changed from the previous bundle

The bundle this replaces was the `03e2b344` state of 2026-11-15, when REST
gained `log_persisted` and `log_write`. Both documents now also carry, in
`$defs/MeasurementBlock`:

```json
"absent_runtime_metrics": {
  "anyOf": [ { "items": { "type": "string" }, "type": "array" },
             { "type": "null" } ]
}
```

It comes from **BL-V1-001** (`26b3f34f7`, 2026-11-11), which made
`token_count` and `latency_ms` optional *without substituting a value*: so
rather than reporting a figure nobody measured, the contract **names the
runtime metrics that were absent**.

The change is **strictly additive**, verified across every nested container
a 2020-12 schema can hold a subschema in — `$defs`, `properties`, `items`,
`anyOf`/`allOf`/`oneOf` and the rest. Exactly three keyword leaves were
added to each document, none removed, none newly required, no type
narrowed. The optional property is absent from `required`, which stays
`status`, `checks_attempted`, `checks_succeeded`, `coverage`,
`confidence_basis`.

⚠ A reader that treats an unknown root or block property as an error will
still reject a current response. That is a property of the reader, not of
the contract: both documents allow additional future fields by design.

## Complete the release

1. Pass and merge the companion API change, then deploy its identified commit.
2. Fetch both public schemas from `/v1/contracts/govern-rest-1.0.json` and `govern-sse-1.0.json`; compare SHA-256 against the bundled files.
3. Use the installed plugin for at most one REST diagnostic and one bounded SSE generation, with no automatic retry; preserve raw responses and request ids.
4. Require `validation.contract=validated` for both and SSE `integrity.status=verified`; review completeness and measurement versions separately.
5. Only then produce the final archive, hashes and release notes. Qualify the separately hosted MCP server independently.

Directory publication and distribution licensing are separate decisions. This
candidate grants no new rights and is not a final hosted-qualified release.

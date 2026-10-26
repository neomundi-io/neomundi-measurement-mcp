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

## Complete the release

1. Pass and merge the companion API change, then deploy its identified commit.
2. Fetch both public schemas from `/v1/contracts/govern-rest-1.0.json` and `govern-sse-1.0.json`; compare SHA-256 against the bundled files.
3. Use the installed plugin for at most one REST diagnostic and one bounded SSE generation, with no automatic retry; preserve raw responses and request ids.
4. Require `validation.contract=validated` for both and SSE `integrity.status=verified`; review completeness and measurement versions separately.
5. Only then produce the final archive, hashes and release notes. Qualify the separately hosted MCP server independently.

Directory publication and distribution licensing are separate decisions. This
candidate grants no new rights and is not a final hosted-qualified release.

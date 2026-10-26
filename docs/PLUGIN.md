# Install the NeoMundi plugin

[English](PLUGIN.md) · [Français](PLUGIN_FR.md)

Local pilot plugin 0.2.0. Requires Node.js 24+. It includes an MCP server
and usage skill, not a model, credentials, provider account or public-directory
listing. No licence decision or additional reuse grant is made here.

## Connect the two paths

The client launches `runtime/stdio.mjs`. It reuses the existing HTTP MCP
dispatcher on an ephemeral loopback port with a random internal credential.
No public listener or startup NeoMundi API call is made. The standalone
`runtime/server.mjs` entry still provides authenticated Streamable HTTP.

Both expose `measure_execution`: `execution` submits a produced answer to
REST `/v1/govern`; `generation` calls `/v1/govern/stream` and returns the
SSE events with the terminal result. This is not a promise of live token
display in the MCP host. Legacy GET SSE MCP transport is not implemented;
it is separate from upstream generation SSE.

## Configure credentials

Provision the client process environment with `NEOMUNDI_API_KEY` and the
intended `NEOMUNDI_API_BASE_URL`. Generation additionally requires
`NEOMUNDI_PROVIDER_API_KEY`, matching the provider explicitly requested.
Use a secret manager, never tool arguments or committed files.
One provider key is configured per process; use separate instances for
different credentials. No `.env` or CLIXML reader is bundled.

Stdio generates its internal MCP credential; it does not require
`NEOMUNDI_MCP_API_KEY`. The standalone HTTP server still requires it.

## Install in Codex

From the extracted plugin or repository root:

```sh
codex plugin marketplace add .
codex plugin add neomundi-measurement@neomundi-pilot
```

Portable root manifests and a Codex compatibility layout are included.
Restart the client session if prompted, then discover the tool before any
real call. Public directory publication is a separate process. A local
plugin needs its desktop runtime; installation does not provide mobile or
web execution automatically.

Other MCP hosts can launch `node` with the absolute `runtime/stdio.mjs`
path and inherit provisioned credentials. Plugin-aware hosts resolve the
`${PLUGIN_ROOT}` placeholder in `mcp.json`.

## Read the output faithfully

Read `adapter_error` first, preserve raw `response` and event evidence,
then inspect measurement states, coverage, versions and decision basis.
The REST-shaped `presentation` is not a complete SSE projection; read the
actual SSE terminal object. Null stays null. No measurement grants execution
permission or proves truth, safety or compliance.

`integrity` checks assembly and supplied Unicode length, UTF-8 byte length
and SHA-256. Missing checks stay `not_assessed`; mismatches are errors and
leave raw evidence intact. Historical opaque `done` and `[DONE]` remain
supported without inventing a final object. No retries, reconnections or
second REST measurements occur automatically.

Transport integrity does not validate the upstream contract or scientific
measurement. Missing backend contract versions and unknown token provenance
remain explicit. See [audit and executed checks](MCP_PLUGIN_AUDIT.md).

Official format references: [packaging](https://developers.openai.com/plugins/build/plugins)
and [desktop-only plugins](https://developers.openai.com/plugins/deploy/desktop-only).

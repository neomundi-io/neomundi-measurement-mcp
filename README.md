# NeoMundi measurement MCP and plugin

[English](README.md) · [Français](README_FR.md)

![REST](https://img.shields.io/badge/API-REST-blue) ![SSE](https://img.shields.io/badge/API-SSE-blue) ![Plugin](https://img.shields.io/badge/plugin-local_pilot-orange)

Measure an existing AI execution from an agent, or request a generation with
measurements. `measure_execution` preserves server values, null, states and
provenance. [Explore Station](https://github.com/neomundi-io/neomundi-station-public).

## Choose your path

| Need | Path |
|---|---|
| Measure an answer your application already produced | `execution`: REST `/v1/govern` |
| Generate through NeoMundi and receive checks | `generation`: SSE `/v1/govern/stream` |
| Install locally in an agent client | Desktop stdio plugin, Node.js 24+ |
| Host the connector yourself | Authenticated Streamable HTTP |

Upstream SSE is separate from MCP transport. The MCP client receives the
terminal result and retained events, not a promise of live token rendering.
Legacy GET SSE MCP transport is not implemented. A successful transport can
carry an incomplete measurement.

## Where we stand

Connector/plugin version **0.2.0 — pilot evaluation**. The hosted MCP's
historical status remains `LIVE_TRANSPORT_VALIDATED_CONTRACT_PENDING`.
This source delivery does not update that server or grant `LIVE_API_VALIDATED`.

- REST and SSE use the same adapter from HTTP and stdio.
- SSE assembly and supplied Unicode length, UTF-8 bytes and SHA-256 are checked.
- Interruptions and mismatched integrity metadata are explicit errors; raw evidence remains available.
- No retries, reconnections, second measurements or RGC emissions occur automatically.
- Generation requires explicit `model` and `provider`, matching the provider credential provisioned to the process.
- A local installable plugin and FR/EN installation guides are included.

Tests: **192 total, 175 passed, 17 skipped** without private historical REST
captures. Those captures remain excluded. Plugin installation was tested in
an isolated Codex profile; an independent MCP SDK client exercised the installed
REST/SSE entry against a local stand-in. These are not hosted API tests.
See [audit and verification](docs/MCP_PLUGIN_AUDIT.md).

## Install and run

- [Plugin installation](docs/PLUGIN.md) · [Français](docs/PLUGIN_FR.md)
- [HTTP server configuration](runtime/README.md)
- [Known limitations and dated evidence](KNOWN_LIMITATIONS.md)
- [Measurement definitions](https://github.com/neomundi-io/neomundi-metric-contract)
- [Data flows and confidentiality](https://github.com/neomundi-io/neomundi-io-data-protection)

After environment credentials are provisioned:

```sh
# Entry launched by a local MCP client
node runtime/stdio.mjs
# Standalone HTTP server; also requires NEOMUNDI_MCP_API_KEY
node runtime/server.mjs
```

No credentials are bundled or read from `.env`. Stdio generates a random
internal MCP credential and binds an ephemeral loopback listener; HTTP hosting
uses its separately provisioned MCP credential. There is one provider key per
process: use separately provisioned instances for different credentials.
Startup and tool discovery contact no NeoMundi API. Tool calls can consume
quota and provider resources. Output containing a known credential is withheld.

## Verify and package

```sh
npm test
node check-publication.mjs
npm run build:plugin
```

The package builder uses an explicit file allow-list and refuses overwriting
an existing output directory. No npm publication, new licence grant, public
directory submission or hosted deployment is performed by this build.

`integrity` checks transport evidence only. `validation.contract` stays separate:
the connector does not invent absent contract versions or token provenance.
`presentation` is REST-shaped; read the raw final response and events for SSE.
A measurement grants no execution permission and proves neither truth, safety,
absence of hallucination nor compliance. Interpretation remains yours.

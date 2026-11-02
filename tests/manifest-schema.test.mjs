/** Holds the two manifest questions that blocked publication, with the
 * normative artefact in hand rather than a reading of a web page.
 *
 * `P0-1` asked for an `auth` block in `mcp.json`. `P0-2` asked which of two
 * mutually exclusive nestings of the OpenAI block was correct. Both are
 * settled below, against the official Agent Plugins 1.0.0 schemas as
 * downloaded on 2026-11-01 and vendored under `schemas/agent-plugins/` with
 * their SHA-256. Each test states what it would take to make it fail, because
 * a guard whose premise is never restated decays into a guard nobody trusts.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { validate, officialSchema, validateManifests, assertSupported } from '../scripts/validate-manifests.mjs';

const json = (p) => JSON.parse(readFileSync(new URL('../' + p, import.meta.url), 'utf8').replace(/^﻿/, ''));
const MCP_SCHEMA_URL = 'https://agent-plugins.org/schemas/1.0.0/mcp.schema.json';
const PLUGIN_SCHEMA_URL = 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json';

test('the vendored official schemas still match the bytes that were downloaded', () => {
  const provenance = json('schemas/agent-plugins/provenance.json');
  assert.equal(provenance.length, 2);
  for (const entry of provenance) {
    const bytes = readFileSync(new URL('../' + entry.copy, import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256, `${entry.copy} has drifted`);
    assert.equal(bytes.length, entry.bytes);
    assert.equal(entry.fetched, '2026-11-01');
  }
});

test('both manifests are valid against the official schema, not against a reading of the documentation', () => {
  for (const { file, errors } of validateManifests()) {
    assert.deepEqual(errors, [], `${file} is not valid: ${errors.join(' | ')}`);
  }
});

test('the validator refuses rather than passes when the official schema uses a keyword it does not implement', () => {
  // The failure mode this guards against: a schema gains a keyword, the
  // validator silently ignores it, and reports success for a document it
  // never actually checked. A nested mutation is used so the refusal is
  // proved to reach inside $defs, not only the top level.
  const schema = officialSchema(PLUGIN_SCHEMA_URL);
  assert.doesNotThrow(() => assertSupported(schema, 'unmutated', schema));

  schema.properties.keywords.items.minItems = 1;
  assert.throws(
    () => assertSupported(schema, 'mutated', schema),
    /Unsupported schema keyword "minItems" at mutated\/properties\/keywords\/items/,
  );

  // And the same guard runs on load, so no caller can bypass it.
  const mcp = officialSchema(MCP_SCHEMA_URL);
  mcp.$defs.stdioServer.properties.args.contains = { type: 'string' };
  assert.throws(() => assertSupported(mcp, 'mcp', mcp), /Unsupported schema keyword "contains"/);
});

test('P0-1 is answered: a top-level auth block in mcp.json is INVALID, so the task as written cannot come back', () => {
  const schema = officialSchema(MCP_SCHEMA_URL);
  const document = json('mcp.json');

  // Agent Plugins 1.0.0 closes the top level of mcp.json to `$schema` and
  // `mcpServers`, and says so in words: "Agent Plugins 1.0.0 defines no
  // portable OAuth or credential-reference fields. Authentication remains
  // client-managed." Declaring the block the roadmap asked for would have
  // made the document invalid -- and an invalid top-level mcp.json disables
  // MCP for the whole plugin.
  const withAuth = { ...document, auth: { type: 'api_key', headerScheme: 'bearer' } };
  const errors = validate(withAuth, schema);
  assert.ok(errors.some((e) => e.includes('"auth" is not a declared property')), errors.join(' | '));
  assert.deepEqual(validate(document, schema), [], 'the manifest as shipped is valid');
});

test('P0-1 is answered: the placement the platform documents is ALSO invalid against the portable schema, and that conflict is recorded here', () => {
  const schema = officialSchema(MCP_SCHEMA_URL);

  // The platform documents authentication at
  // `mcpServers.<name>.extensions["com.openai"].auth`. The portable
  // specification closes each server variant: "An unknown field, an unknown
  // `type` value, or a field belonging to another variant makes that server
  // entry invalid." Both sources are normative and they disagree.
  //
  // THE BLOCK BELOW IS THE ONE THE SUBMISSION WILL NEED, and it is pinned
  // here rather than left to be retyped from a web page at the worst moment.
  // It says `oauth` and not `api_key` because the server now speaks OAuth
  // 2.1: the portal has no API-key connection flow, and the fixed bearer
  // token it used to be was not a connection method that exists.
  //
  // It is NOT in `mcp.json` yet, and the reason is a date, not a doubt:
  // `mcp.json` would then name a hosted endpoint that does not yet answer
  // OAuth. Switching it is the step that FOLLOWS the deployment, and it is
  // written down in PLUGIN_SUBMISSION_CHECKLIST.md as such.
  const documented = {
    $schema: MCP_SCHEMA_URL,
    mcpServers: {
      neomundi: {
        type: 'streamable-http',
        url: 'https://mcp.neomundi.org/mcp',
        extensions: {
          'com.openai': {
            auth: {
              type: 'oauth',
              client: { mode: 'dcr' },
              registrationUrl: 'https://mcp.neomundi.org/oauth/register',
              baseScopes: ['measure'],
            },
          },
        },
      },
    },
  };
  // The declaration has to match what the server actually advertises, or the
  // portal configures a flow the server does not run.
  const advertised = {
    registration_endpoint: 'https://mcp.neomundi.org/oauth/register',
    scopes_supported: ['measure'],
  };
  assert.equal(documented.mcpServers.neomundi.extensions['com.openai'].auth.registrationUrl, advertised.registration_endpoint);
  assert.deepEqual(documented.mcpServers.neomundi.extensions['com.openai'].auth.baseScopes, advertised.scopes_supported);
  assert.equal(documented.mcpServers.neomundi.url, 'https://mcp.neomundi.org/mcp', 'the url must be the canonical resource identifier');
  const errors = validate(documented, schema);
  assert.ok(errors.some((e) => e.includes('"extensions" is not a declared property')), errors.join(' | '));

  // Without the extension, the same remote entry is perfectly valid. The
  // conflict is the extension, not the transport.
  delete documented.mcpServers.neomundi.extensions;
  assert.deepEqual(validate(documented, schema), []);
});

test('P0-2 is answered: the OpenAI listing fields are NESTED under interface, which is the shape the repository already had', () => {
  const openai = json('plugin.json').extensions['com.openai'];

  // The repository nested these fields under `interface`; a reading of the
  // documentation described them as flat. Only one could be true. The
  // platform's own package example nests them, so the repository was right
  // and the flat reading was wrong.
  assert.equal(typeof openai.interface, 'object');
  assert.equal(typeof openai.interface.displayName, 'string');
  for (const flat of ['displayName', 'shortDescription', 'longDescription', 'category', 'logo']) {
    assert.equal(openai[flat], undefined, `${flat} belongs inside interface, not beside it`);
  }

  // `review` and `publication` go the other way: they sit DIRECTLY under the
  // namespace, never inside `interface`. Getting this backwards is the same
  // class of mistake in the opposite direction.
  assert.equal(typeof openai.review, 'object');
  assert.equal(typeof openai.publication, 'object');
  assert.equal(openai.interface.review, undefined);
  assert.equal(openai.interface.publication, undefined);
});

test('no credential, and no place to put one, travels in either MCP manifest', () => {
  // Configured headers are literal, visible package data. The platform is
  // explicit that public submission rejects nonempty server headers, and
  // that embedding a token there to work around the missing API-key flow is
  // not an option. The reserved plugin variables may not be overridden
  // either.
  for (const file of ['mcp.json', '.mcp.json']) {
    for (const [name, server] of Object.entries(json(file).mcpServers)) {
      assert.equal(server.headers, undefined, `${file}: ${name} declares headers`);
      assert.equal(server.env, undefined, `${file}: ${name} declares env`);
      const serialised = JSON.stringify(server);
      assert.ok(!/sk-|Bearer\s+\S|api[_-]?key"\s*:\s*"[^"]/i.test(serialised), `${file}: ${name} looks like it carries a credential`);
    }
  }
});

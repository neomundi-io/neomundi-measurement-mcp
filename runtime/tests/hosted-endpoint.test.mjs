// What a hosted MCP endpoint needs, and what it must not quietly acquire.
//
// Why this file exists. The `Host` allow-list is built from the listening
// port, so it accepts `127.0.0.1:<port>` and `localhost:<port>` and refuses
// everything else with 403 `invalid_host` — before any credential is read.
// That is right for the loopback posture, and it makes a hosted endpoint
// impossible: a reverse proxy forwards `Host: mcp.example.org`, which was
// refused. A remote assistant can only reach a hosted endpoint, so the
// allow-list became extensible.
//
// These tests pin the four things that must not drift:
//   1. the default is unchanged — nothing is accepted beyond loopback;
//   2. a host is accepted only because it was named, never because the bind
//      was widened (that separation is the anti-rebinding property);
//   3. nothing outside a strict grammar is accepted, and nothing is
//      normalised into acceptance;
//   4. authentication still applies to a named host.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { ConfigurationError, loadConfiguration } from '../config.mjs';
import { createMcpServer } from '../server.mjs';
import { toolDefinition } from '../contract.mjs';
import { testConfig } from './helpers.mjs';

const environment = (overrides = {}) => ({
  NEOMUNDI_API_BASE_URL: 'https://neomundi-unit-test.invalid',
  NEOMUNDI_API_KEY: 'mock-api-not-a-secret',
  NEOMUNDI_MCP_API_KEY: 'mock-mcp-not-a-secret',
  ...overrides,
});

// fetch controls Host and Origin itself, so these need a raw request, exactly
// as the existing Host/Origin tests do.
const call = (endpoint, headers) => new Promise((resolve, reject) => {
  const request = http.request(endpoint, { method: 'POST', headers }, (response) => {
    let body = '';
    response.setEncoding('utf8');
    response.on('data', (chunk) => { body += chunk; });
    response.on('end', () => resolve({ status: response.statusCode, body }));
  });
  request.on('error', reject);
  request.end(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping' }));
});

const authorized = (config, extra = {}) => ({
  Authorization: `Bearer ${config.mcpKey}`,
  Accept: 'application/json, text/event-stream',
  'Content-Type': 'application/json',
  ...extra,
});

test('the default accepts nothing beyond loopback, and needs no variable', () => {
  for (const value of [undefined, '']) {
    const config = loadConfiguration(environment(value === undefined ? {} : { NEOMUNDI_MCP_ALLOWED_HOSTS: value }));
    assert.deepEqual(config.allowedHosts, []);
    assert.equal(config.hostAllowListExtended, false);
    assert.equal(Object.isFrozen(config.allowedHosts), true);
  }
});

test('named hosts are parsed, de-duplicated and declared', () => {
  const config = loadConfiguration(environment({
    NEOMUNDI_MCP_ALLOWED_HOSTS: 'mcp.example.org, mcp.example.org , other.example:8443',
  }));
  assert.deepEqual(config.allowedHosts, ['mcp.example.org', 'other.example:8443']);
  assert.equal(config.hostAllowListExtended, true);
  assert.equal(Object.isFrozen(config), true);
  assert.throws(() => { config.allowedHosts.push('late.example'); }, TypeError);
});

test('nothing outside the grammar is accepted', () => {
  // A host that had to be lowercased or stripped of a scheme to pass is not
  // the string a proxy forwards. A wildcard is refused outright: it would
  // accept hosts nobody named.
  for (const value of [
    '*.example.org', 'MCP.example.org', 'https://mcp.example.org', 'mcp.example.org/mcp',
    'mcp.example.org:0', 'mcp.example.org:70000', 'mcp.example.org:abc', 'mcp..example.org',
    '-mcp.example.org', 'mcp.example.org-', 'mcp example.org',
    ',', ' , ', ',,', 'mcp.example.org:',
    'user@mcp.example.org', `${'a'.repeat(254)}.example.org`,
  ]) {
    assert.throws(
      () => loadConfiguration(environment({ NEOMUNDI_MCP_ALLOWED_HOSTS: value })),
      ConfigurationError,
      `must refuse ${JSON.stringify(value)}`,
    );
  }
});

test('separator slack is tolerated, and it is the only normalisation', () => {
  // The list is comma-separated, so `a.example, b.example` is how an operator
  // writes it: surrounding whitespace and an empty entry are typing slack, not
  // a security boundary. What matters is that each stored string — the one
  // compared against an incoming Host — is the bare host that was named, never
  // a padded variant that could match something else.
  for (const value of ['mcp.example.org\t', '  mcp.example.org  ', '\nmcp.example.org\n', 'mcp.example.org,']) {
    const config = loadConfiguration(environment({ NEOMUNDI_MCP_ALLOWED_HOSTS: value }));
    assert.deepEqual(config.allowedHosts, ['mcp.example.org'], `must accept ${JSON.stringify(value)} as the bare host`);
  }
  // An empty entry between two named hosts drops out; both named hosts stay.
  assert.deepEqual(
    loadConfiguration(environment({ NEOMUNDI_MCP_ALLOWED_HOSTS: 'mcp.example.org,,other.example' })).allowedHosts,
    ['mcp.example.org', 'other.example'],
  );
  // But a list whose every entry is empty names nothing, and is refused
  // rather than silently becoming the loopback-only default.
  for (const value of [',', ' , ', ',,']) {
    assert.throws(() => loadConfiguration(environment({ NEOMUNDI_MCP_ALLOWED_HOSTS: value })), ConfigurationError);
  }
});

test('a named host reaches the protocol, and an unnamed one still does not', async (t) => {
  const config = testConfig({ allowedHosts: Object.freeze(['mcp.example.org']), hostAllowListExtended: true });
  const app = createMcpServer({ config });
  t.after(() => app.close());
  const endpoint = await app.listen(0);
  const port = new URL(endpoint).port;

  // `session_required` is the right answer to a bare ping: it proves the
  // request passed the Host and credential checks and reached the protocol.
  for (const accepted of ['mcp.example.org', `127.0.0.1:${port}`, `localhost:${port}`]) {
    const response = await call(endpoint, authorized(config, { Host: accepted }));
    assert.equal(response.status, 400, `Host ${accepted} must be accepted`);
    assert.deepEqual(JSON.parse(response.body), { error: 'session_required' });
  }
  // Naming one host does not accept its neighbours, its parent domain, or a
  // port-qualified variant of itself.
  for (const refused of [
    'other.example.org', 'example.org', 'mcp.example.org:8443',
    'evil.mcp.example.org', `0.0.0.0:${port}`, `127.0.0.1:${Number(port) + 1}`,
  ]) {
    const response = await call(endpoint, authorized(config, { Host: refused }));
    assert.equal(response.status, 403, `Host ${refused} must be refused`);
    assert.deepEqual(JSON.parse(response.body), { error: 'invalid_host' });
  }
});

test('widening the bind still does not widen the Host allow-list', async (t) => {
  // The regression that would matter most, re-asserted against the new field:
  // an operator who publishes a container must not thereby accept any Host.
  const config = testConfig({ bindAddress: '0.0.0.0', publishedBeyondLoopback: true });
  assert.deepEqual(config.allowedHosts, []);
  const app = createMcpServer({ config });
  t.after(() => app.close());
  const endpoint = await app.listen(0);
  const response = await call(endpoint, authorized(config, { Host: 'mcp.example.org' }));
  assert.equal(response.status, 403);
  assert.deepEqual(JSON.parse(response.body), { error: 'invalid_host' });
});

test('a named host accepts both schemes as Origin, and loopback stays plaintext', async (t) => {
  const config = testConfig({ allowedHosts: Object.freeze(['mcp.example.org']), hostAllowListExtended: true });
  const app = createMcpServer({ config });
  t.after(() => app.close());
  const endpoint = await app.listen(0);
  const port = new URL(endpoint).port;

  // A named host is reached through TLS it does not terminate itself, so both
  // schemes are accepted for it. An absent Origin stays allowed: a server-side
  // MCP client sends none, and the Host check already ran.
  for (const origin of ['https://mcp.example.org', 'http://mcp.example.org', undefined]) {
    const headers = authorized(config, { Host: 'mcp.example.org' });
    if (origin !== undefined) headers.Origin = origin;
    const response = await call(endpoint, headers);
    assert.equal(response.status, 400, `Origin ${origin} must be accepted`);
  }
  // The scheme widening applies to named hosts only.
  const loopback = await call(endpoint, authorized(config, {
    Host: `127.0.0.1:${port}`, Origin: `https://127.0.0.1:${port}`,
  }));
  assert.equal(loopback.status, 403);
  assert.deepEqual(JSON.parse(loopback.body), { error: 'invalid_origin' });
  // And an unrelated origin is refused even on a named host.
  const foreign = await call(endpoint, authorized(config, {
    Host: 'mcp.example.org', Origin: 'https://attacker.example',
  }));
  assert.equal(foreign.status, 403);
  assert.deepEqual(JSON.parse(foreign.body), { error: 'invalid_origin' });
});

test('a named host is still unreachable without the credential', async (t) => {
  // Extending the allow-list moves the endpoint closer to a network, so the
  // credential check is re-asserted on exactly that path.
  const config = testConfig({ allowedHosts: Object.freeze(['mcp.example.org']), hostAllowListExtended: true });
  const app = createMcpServer({ config });
  t.after(() => app.close());
  const endpoint = await app.listen(0);
  const response = await call(endpoint, {
    Host: 'mcp.example.org',
    Accept: 'application/json, text/event-stream',
    'Content-Type': 'application/json',
  });
  assert.equal(response.status, 401);
  assert.deepEqual(JSON.parse(response.body), { error: 'unauthorized' });
});

test('the tool carries a human-readable title that states an action, not an outcome', () => {
  // A host that renders a title shows it to a person, so it is held to the
  // presentation layer's rule: it may name what the tool does and must not
  // suggest what the result means. A title promising safety, compliance or a
  // verdict would be the same failure ML-005 and the presentation tests guard
  // against, in the one string a user is most likely to read.
  assert.equal(typeof toolDefinition.title, 'string');
  assert.ok(toolDefinition.title.length > 0 && toolDefinition.title.length <= 64);
  assert.notEqual(toolDefinition.title, toolDefinition.name);
  for (const forbidden of [
    'safe', 'unsafe', 'risk', 'risky', 'danger', 'compliant', 'compliance', 'verdict',
    'approve', 'approved', 'certify', 'certified', 'guarantee', 'trust', 'trusted',
    'validate', 'validated', 'score', 'grade', 'secure', 'halluc', 'truth',
  ]) {
    assert.equal(
      toolDefinition.title.toLowerCase().includes(forbidden), false,
      `title must not contain "${forbidden}"`,
    );
  }
});

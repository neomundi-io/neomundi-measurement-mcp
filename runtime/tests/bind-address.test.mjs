// Where the local MCP listener binds, and what a non-loopback bind costs.
//
// Why this is tested rather than left to a flag. The default — loopback only —
// is a security property this connector states publicly (ML-001). A
// containerised image cannot run on it, because a listener on loopback is
// unreachable through a published port. So the address became configurable,
// and these tests pin the three things that must not drift: the default is
// unchanged, nothing outside a two-value allow-list is accepted, and widening
// the bind does NOT quietly widen the Host allow-list with it.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { ConfigurationError, loadConfiguration } from '../config.mjs';
import { createMcpServer } from '../server.mjs';
import { testConfig } from './helpers.mjs';

const environment = (overrides = {}) => ({
  NEOMUNDI_API_BASE_URL: 'https://neomundi-unit-test.invalid',
  NEOMUNDI_API_KEY: 'mock-api-not-a-secret',
  NEOMUNDI_MCP_API_KEY: 'mock-mcp-not-a-secret',
  ...overrides,
});

test('loopback is the default, and no environment variable is needed for it', () => {
  for (const value of [undefined, '']) {
    const config = loadConfiguration(environment(value === undefined ? {} : { NEOMUNDI_MCP_BIND: value }));
    assert.equal(config.bindAddress, '127.0.0.1');
    assert.equal(config.publishedBeyondLoopback, false);
  }
});

test('0.0.0.0 is accepted and declared as leaving loopback', () => {
  const config = loadConfiguration(environment({ NEOMUNDI_MCP_BIND: '0.0.0.0' }));
  assert.equal(config.bindAddress, '0.0.0.0');
  // The flag exists so the startup warning and a test both read one value
  // instead of each re-deriving it from a string comparison.
  assert.equal(config.publishedBeyondLoopback, true);
});

test('any other address is refused outright, not normalised', () => {
  // A hostname resolves differently between build and run; an arbitrary
  // interface widens exposure in a way nothing here has established; `::`
  // would bind every v6 interface as well. All refused.
  for (const value of ['0.0.0.0 ', '::', '[::]', '::1', 'localhost', '0.0.0.1',
    '192.168.1.10', '10.0.0.1', 'host.docker.internal', '0', 'true', '127.0.0.2']) {
    assert.throws(() => loadConfiguration(environment({ NEOMUNDI_MCP_BIND: value })),
      ConfigurationError, `must refuse ${JSON.stringify(value)}`);
  }
});

test('the configuration object stays frozen with the new fields', () => {
  const config = loadConfiguration(environment({ NEOMUNDI_MCP_BIND: '0.0.0.0' }));
  assert.equal(Object.isFrozen(config), true);
  assert.throws(() => { config.bindAddress = '192.168.0.1'; }, TypeError);
});

test('a wider bind does not widen the Host allow-list', async (t) => {
  // The regression that would matter. Binding 0.0.0.0 makes the socket
  // reachable; it must not also make an arbitrary Host header acceptable,
  // because that allow-list is what stops a rebinding or proxy confusion.
  const config = testConfig({ bindAddress: '0.0.0.0', publishedBeyondLoopback: true });
  const app = createMcpServer({ config });
  t.after(() => app.close());
  const endpoint = await app.listen(0);
  const port = new URL(endpoint).port;
  // Loopback is reachable even though the listener is wider.
  assert.match(endpoint, /^http:\/\/127\.0\.0\.1:\d+\/mcp$/);

  // fetch controls Host itself, so this needs a raw HTTP request, exactly as
  // the existing Origin/Host test in server.test.mjs does.
  const call = (host) => new Promise((resolve, reject) => {
    const request = http.request(endpoint, {
      method: 'POST',
      headers: {
        Host: host,
        Authorization: `Bearer ${config.mcpKey}`,
        Accept: 'application/json, text/event-stream',
        'Content-Type': 'application/json',
      },
    }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => resolve({ status: response.statusCode, body }));
    });
    request.on('error', reject);
    request.end(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping' }));
  });

  for (const refused of [`neomundi.example:${port}`, `0.0.0.0:${port}`, `127.0.0.1:${Number(port) + 1}`]) {
    const response = await call(refused);
    assert.equal(response.status, 403, `Host ${refused} must be refused`);
    assert.deepEqual(JSON.parse(response.body), { error: 'invalid_host' });
  }
  // And the two accepted ones still get through, so the check was not simply
  // broken. `session_required` is the right answer to a bare ping: it proves
  // the request passed Host and credential checks and reached the protocol.
  for (const accepted of [`127.0.0.1:${port}`, `localhost:${port}`]) {
    const response = await call(accepted);
    assert.equal(response.status, 400, `Host ${accepted} must be accepted`);
    assert.deepEqual(JSON.parse(response.body), { error: 'session_required' });
  }
});

test('an unauthenticated caller is refused whatever the bind address', async (t) => {
  const config = testConfig({ bindAddress: '0.0.0.0', publishedBeyondLoopback: true });
  const app = createMcpServer({ config });
  t.after(() => app.close());
  const endpoint = await app.listen(0);
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { accept: 'application/json, text/event-stream', 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping' }),
  });
  assert.equal(response.status, 401);
  assert.equal(response.headers.get('www-authenticate'), 'Bearer realm="neomundi-private-mcp"');
});

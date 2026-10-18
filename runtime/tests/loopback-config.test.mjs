// Plain HTTP upstream is accepted for loopback hosts and nothing else.
//
// The reason it is accepted at all: a disposable NeoMundi instance built for
// verification serves plain HTTP on a loopback port. Requiring HTTPS put the
// recorded campaign out of reach of this connector, so the REST path could only
// ever be exercised against payloads written by hand.
//
// The reason it stays narrow: plaintext must never leave the machine. These
// tests exist to make that boundary expensive to widen by accident.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ConfigurationError, loadConfiguration } from '../config.mjs';

const load = (base) => loadConfiguration({
  ...(base === undefined ? {} : { NEOMUNDI_API_BASE_URL: base }),
  NEOMUNDI_API_KEY: 'mock-api-not-a-secret',
  NEOMUNDI_MCP_API_KEY: 'mock-mcp-not-a-secret',
});

test('plain HTTP is accepted on loopback hosts, and flagged as plaintext', () => {
  for (const base of ['http://127.0.0.1:18000', 'http://localhost:18000', 'http://[::1]:18000', 'http://127.0.0.1']) {
    const config = load(base);
    assert.equal(config.plaintextLoopback, true, base);
    assert.equal(config.baseUrl, new URL(base).origin, base);
  }
});

test('plain HTTP is refused for every host that is not loopback', () => {
  for (const base of [
    'http://api.neomundi.io',
    'http://example.com:18000',
    'http://10.0.0.1:18000',
    'http://192.168.1.10:18000',
    // A public host resolving to loopback is still a network destination.
    'http://localtest.me:18000',
  ]) {
    assert.throws(() => load(base), ConfigurationError, base);
  }
});

test('hostnames that merely look like loopback are refused', () => {
  // Exact-match hostnames only. A prefix or suffix test here would accept an
  // attacker-controlled domain and send a real API key over the network in
  // cleartext.
  for (const base of [
    'http://127.0.0.1.attacker.example',
    'http://localhost.attacker.example',
    'http://attacker.example/?host=127.0.0.1',
    'http://not-localhost',
    'http://localhosts',
    'http://xlocalhost',
    'http://127.0.0.11',
    'http://0.0.0.0:18000',
    'http://[::2]:18000',
  ]) {
    assert.throws(() => load(base), ConfigurationError, base);
  }
});

test('HTTPS remains accepted everywhere and is never flagged as plaintext', () => {
  for (const base of ['https://api.neomundi.io', 'https://localhost:18000', 'https://127.0.0.1:18000']) {
    const config = load(base);
    assert.equal(config.plaintextLoopback, false, base);
  }
});

test('the default stays HTTPS on the public host', () => {
  for (const base of [undefined, '']) {
    const config = load(base);
    assert.equal(config.baseUrl, 'https://api.neomundi.io');
    assert.equal(config.plaintextLoopback, false);
  }
});

test('every other URL constraint still applies to loopback HTTP', () => {
  // Relaxing the protocol must not relax anything else: a path, query,
  // fragment or embedded credential is still refused, loopback or not.
  for (const base of [
    'http://localhost:18000/v1',
    'http://localhost:18000/',
    'http://localhost:18000?debug=1',
    'http://localhost:18000#fragment',
    'http://user@localhost:18000',
    'http://user:password@localhost:18000',
    'ftp://localhost:18000',
    'file://localhost',
    'ws://localhost:18000',
    'HTTP-not-a-url',
  ].filter((base) => base !== 'http://localhost:18000/')) {
    assert.throws(() => load(base), ConfigurationError, base);
  }
  // A bare "/" path is the normal form of an origin and stays accepted.
  assert.equal(load('http://localhost:18000/').baseUrl, 'http://localhost:18000');
});

test('the configuration object remains frozen and carries no credential in its string form', () => {
  const config = load('http://127.0.0.1:18000');
  assert.equal(Object.isFrozen(config), true);
  assert.throws(() => { config.plaintextLoopback = false; }, TypeError);
  // The flag is a boolean, not a copy of the URL or of any key.
  assert.equal(typeof config.plaintextLoopback, 'boolean');
});

test('an invalid base URL is still a configuration error, with no detail disclosed', () => {
  for (const base of ['not a url', 'http://', '://localhost', 'http://[::1'] ) {
    assert.throws(() => load(base), (error) => {
      assert.ok(error instanceof ConfigurationError, base);
      // The message must not echo the operator's input back.
      assert.equal(error.message.includes(base), false);
      return true;
    }, base);
  }
});

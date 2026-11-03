/** OAuth 2.1 on the hosted MCP endpoint.
 *
 * What these tests are for. OAuth is the only connection method ChatGPT
 * offers that this server can satisfy, so it is now on the critical path of
 * every remote measurement. That makes it the wrong place for a guard that
 * passes because nobody exercised the failing case. Each test below names the
 * failure it exists to catch.
 *
 * Nothing here contacts a network, reads an environment credential, or makes
 * a measurement call. Every secret is a stated sentinel.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { createMcpServer } from '../server.mjs';
import {
  MEASURE_SCOPE, OAuthConfigurationError, challengeHeader, createAuthorizationServer,
  formActionSources, issueAccessToken, loadOAuthConfiguration, readRegistry, sign, verifyAccessToken,
} from '../oauth.mjs';
import { hashSecret, participantEntry, verifySecret } from '../../scripts/participant-credential.mjs';
import { apiMock, execution, jsonReply, syntheticMeasurement, testConfig } from './helpers.mjs';

const SIGNING_KEY = 'unit-test-signing-key-not-a-secret-0123456789';
const SECRET_ALPHA = 'secret-alpha-not-a-real-one';
const SECRET_BETA = 'secret-beta-not-a-real-one';

const environment = (overrides = {}) => ({
  NEOMUNDI_MCP_PUBLIC_URL: 'https://mcp.unit-test.invalid',
  NEOMUNDI_OAUTH_SIGNING_KEY: SIGNING_KEY,
  NEOMUNDI_OAUTH_REGISTRY: '/unit-test/registry.json',
  ...overrides,
});
const oauthConfig = (overrides = {}) => ({ ...loadOAuthConfiguration(environment()), ...overrides });

/** An in-memory stand-in for the registry file. Mutating it between calls is
 * how revocation is exercised: the real reader re-reads the file every time,
 * and this one re-reads the object every time, for the same reason.
 */
function registryOf(participants) {
  const state = { participants };
  const reader = () => ({
    ok: true,
    participants: new Map(state.participants.map((p) => [p.subject, p])),
  });
  reader.state = state;
  return reader;
}
const alpha = () => ({ ...participantEntry({ subject: 'alpha', name: 'Atelier Alpha', secret: SECRET_ALPHA }), scopes: [MEASURE_SCOPE] });
const beta = () => ({ ...participantEntry({ subject: 'beta', name: 'Atelier Beta', secret: SECRET_BETA }), scopes: [MEASURE_SCOPE] });

const pkce = () => {
  const verifier = randomBytes(32).toString('base64url');
  return { verifier, challenge: createHash('sha256').update(verifier, 'ascii').digest('base64url') };
};

/** Boots a real server so the OAuth routes are exercised over HTTP, not by
 * calling a function that happens to be exported.
 */
async function boot({ oauth = oauthConfig(), reader = registryOf([alpha(), beta()]), fetchImpl, config = testConfig() } = {}) {
  const app = createMcpServer({ config, oauth, registryReader: reader, ...(fetchImpl ? { fetchImpl } : {}) });
  await app.listen(0);
  const base = `http://127.0.0.1:${app.server.address().port}`;
  return { app, base, reader, close: () => app.close() };
}

const form = (fields) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams(fields).toString(),
  redirect: 'manual',
});

async function register(base, redirectUri = 'https://chatgpt.com/connector_platform_oauth_redirect') {
  const response = await fetch(`${base}/oauth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ redirect_uris: [redirectUri], client_name: 'Unit test client' }),
  });
  return { status: response.status, body: await response.json(), redirectUri };
}

/** Runs the whole browser half of the flow and returns the authorization
 * code, so the token tests do not each rebuild it.
 */
async function authorizeTo(base, { clientId, redirectUri, challenge, participant, secret, state = 'st-1' }) {
  const query = new URLSearchParams({
    response_type: 'code', client_id: clientId, redirect_uri: redirectUri,
    code_challenge: challenge, code_challenge_method: 'S256',
    state, scope: MEASURE_SCOPE, resource: 'https://mcp.unit-test.invalid/mcp',
  });
  const page = await fetch(`${base}/oauth/authorize?${query}`, { redirect: 'manual' });
  const html = await page.text();
  const carried = /name="request" value="([^"]+)"/.exec(html);
  if (!carried) return { page, html, carried: null };
  const submitted = await fetch(`${base}/oauth/authorize`, form({ request: carried[1], participant, secret }));
  const location = submitted.headers.get('location');
  return {
    page, html, status: submitted.status, location,
    body: location ? null : await submitted.text(),
    code: location ? new URL(location).searchParams.get('code') : null,
    returned: location ? new URL(location).searchParams : null,
    request: carried[1],
  };
}

async function exchange(base, { code, clientId, redirectUri, verifier, extra = {} }) {
  const response = await fetch(`${base}/oauth/token`, form({
    grant_type: 'authorization_code', code, client_id: clientId,
    redirect_uri: redirectUri, code_verifier: verifier,
    resource: 'https://mcp.unit-test.invalid/mcp', ...extra,
  }));
  return { status: response.status, body: await response.json() };
}

/** One complete, successful flow. Returned as a helper because every
 * downstream test needs a real token, and a token minted by hand would not
 * prove the endpoints produced it.
 */
async function fullFlow(base, participant = 'alpha', secret = SECRET_ALPHA) {
  const { body: client, redirectUri } = await register(base);
  const { verifier, challenge } = pkce();
  const authorized = await authorizeTo(base, { clientId: client.client_id, redirectUri, challenge, participant, secret });
  const token = await exchange(base, { code: authorized.code, clientId: client.client_id, redirectUri, verifier });
  return { client, redirectUri, verifier, challenge, authorized, token };
}

/** `initialize` rather than `ping`: a ping without a session is refused with
 * 400 whatever the credential, so it cannot tell an accepted credential from
 * a rejected one. `initialize` is the one method that answers 200 on its own,
 * which makes it the honest probe for "did this credential get in".
 */
const INITIALIZE = () => ({
  jsonrpc: '2.0', id: 1, method: 'initialize',
  params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'unit', version: '1' } },
});

const mcpCall = (base, authorization, message) => fetch(`${base}/mcp`, {
  method: 'POST',
  headers: {
    ...(authorization ? { Authorization: authorization } : {}),
    Accept: 'application/json, text/event-stream', 'Content-Type': 'application/json',
  },
  body: JSON.stringify(message),
});

// ------------------------------------------------------- 1. configuration --

test('OAuth is off unless configured, and an existing deployment keeps exactly the behaviour it has', async () => {
  // The failure this catches: a version bump that silently turns on four
  // public routes on a server whose operator changed nothing.
  assert.deepEqual(loadOAuthConfiguration({}), { enabled: false });
  const { base, close } = await boot({ oauth: { enabled: false } });
  try {
    for (const path of ['/.well-known/oauth-protected-resource', '/.well-known/oauth-authorization-server', '/oauth/token']) {
      const response = await fetch(`${base}${path}`, { redirect: 'manual' });
      // Unauthenticated and not an OAuth route: the credential gate answers
      // first, exactly as it did before this file existed.
      assert.equal(response.status, 401, path);
      assert.equal(response.headers.get('www-authenticate'), 'Bearer realm="neomundi-private-mcp"');
    }
  } finally { await close(); }
});

test('a half-configured OAuth is refused rather than half-enabled', () => {
  // The failure this catches: advertising an authorization endpoint that
  // cannot sign, which sends every user into a flow that cannot complete.
  for (const missing of ['NEOMUNDI_MCP_PUBLIC_URL', 'NEOMUNDI_OAUTH_SIGNING_KEY', 'NEOMUNDI_OAUTH_REGISTRY']) {
    const partial = environment();
    delete partial[missing];
    assert.throws(() => loadOAuthConfiguration(partial), OAuthConfigurationError, missing);
  }
  assert.throws(() => loadOAuthConfiguration(environment({ NEOMUNDI_OAUTH_SIGNING_KEY: 'too-short' })), OAuthConfigurationError);
  assert.throws(() => loadOAuthConfiguration(environment({ NEOMUNDI_MCP_PUBLIC_URL: 'http://mcp.unit-test.invalid' })), OAuthConfigurationError);
  assert.throws(() => loadOAuthConfiguration(environment({ NEOMUNDI_MCP_PUBLIC_URL: 'https://mcp.unit-test.invalid/base' })), OAuthConfigurationError);
});

test('the canonical resource is the MCP endpoint, and only it is ever minted into a token', () => {
  const oauth = loadOAuthConfiguration(environment());
  assert.equal(oauth.issuer, 'https://mcp.unit-test.invalid');
  assert.equal(oauth.resource, 'https://mcp.unit-test.invalid/mcp');
  // Aliases are accepted on the way IN so a client that discovered the origin
  // form is not sent into a dead end; none of them is ever an audience.
  assert.ok(oauth.resourceAliases.includes('https://mcp.unit-test.invalid'));
  const token = issueAccessToken(oauth, { subject: 'alpha', epoch: 1, scope: MEASURE_SCOPE, clientId: 'c' });
  const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
  assert.equal(claims.aud, 'https://mcp.unit-test.invalid/mcp');
});

// ----------------------------------------------------------- 2. discovery --

test('the two discovery documents say what a client needs, and are reachable without a credential', async () => {
  const { base, close } = await boot();
  try {
    const protectedResource = await (await fetch(`${base}/.well-known/oauth-protected-resource`)).json();
    assert.equal(protectedResource.resource, 'https://mcp.unit-test.invalid/mcp');
    assert.deepEqual(protectedResource.authorization_servers, ['https://mcp.unit-test.invalid']);
    assert.deepEqual(protectedResource.scopes_supported, [MEASURE_SCOPE]);
    // The same document is served at the path-inserted location, because a
    // client is allowed to look there first.
    const inserted = await (await fetch(`${base}/.well-known/oauth-protected-resource/mcp`)).json();
    assert.deepEqual(inserted, protectedResource);

    const server = await (await fetch(`${base}/.well-known/oauth-authorization-server`)).json();
    assert.equal(server.issuer, protectedResource.authorization_servers[0]);
    // Without S256 advertised, the platform treats the MCP server as
    // unsupported. This assertion is the whole reason the field exists.
    assert.deepEqual(server.code_challenge_methods_supported, ['S256']);
    assert.deepEqual(server.token_endpoint_auth_methods_supported, ['none']);
    assert.equal(server.authorization_response_iss_parameter_supported, true);
    assert.equal(server.registration_endpoint, 'https://mcp.unit-test.invalid/oauth/register');
    assert.equal(server.resource_indicators_supported, true);
  } finally { await close(); }
});

test('an unauthenticated MCP request points at the metadata instead of just refusing', async () => {
  const { base, close } = await boot();
  try {
    const response = await mcpCall(base, undefined, INITIALIZE());
    assert.equal(response.status, 401);
    const challenge = response.headers.get('www-authenticate');
    // Without resource_metadata a client that has never seen this server has
    // nowhere to look, and discovery never starts.
    assert.match(challenge, /resource_metadata="https:\/\/mcp\.unit-test\.invalid\/\.well-known\/oauth-protected-resource"/);
    assert.match(challenge, /scope="measure"/);
  } finally { await close(); }
});

// -------------------------------------------------------- 3. registration --

test('dynamic registration issues a client id that carries its own registration, and survives a restart', async () => {
  // The failure this catches, named in the platform's own guidance: a client
  // registration that lapses gives every connected user `invalid_client` at
  // an unpredictable moment. Here there is no client table to lose.
  const first = await boot();
  let clientId;
  try {
    const { status, body } = await register(first.base);
    assert.equal(status, 201);
    assert.equal(body.token_endpoint_auth_method, 'none');
    assert.equal(body.client_secret_expires_at, 0);
    assert.equal(body.client_secret, undefined, 'a public client has no secret to leak or lose');
    clientId = body.client_id;
  } finally { await first.close(); }

  // A different process, same signing key: the registration is still valid.
  const second = await boot();
  try {
    const { verifier, challenge } = pkce();
    const result = await authorizeTo(second.base, {
      clientId, redirectUri: 'https://chatgpt.com/connector_platform_oauth_redirect',
      challenge, participant: 'alpha', secret: SECRET_ALPHA,
    });
    assert.ok(result.code, 'the client registered by the previous process still authorizes');
    const token = await exchange(second.base, {
      code: result.code, clientId, redirectUri: 'https://chatgpt.com/connector_platform_oauth_redirect', verifier,
    });
    assert.equal(token.status, 200);
  } finally { await second.close(); }
});

test('registration refuses what it cannot honour, instead of registering it anyway', async () => {
  const { base, close } = await boot();
  try {
    const bad = async (body) => (await fetch(`${base}/oauth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })).status;
    assert.equal(await bad({}), 400);
    assert.equal(await bad({ redirect_uris: [] }), 400);
    assert.equal(await bad({ redirect_uris: ['not-a-url'] }), 400);
    // A fragment in a redirect URI is where an authorization code goes
    // missing from the server's view and stays in the browser.
    assert.equal(await bad({ redirect_uris: ['https://example.test/cb#x'] }), 400);
    assert.equal(await bad({ redirect_uris: ['https://user:pw@example.test/cb'] }), 400);
    assert.equal(await bad({ redirect_uris: ['http://example.test/cb'] }), 400, 'plaintext is refused except on loopback');
    // A client asking for a secret is told so, rather than silently
    // registered as a public client and failing later at the token endpoint.
    assert.equal(await bad({ redirect_uris: ['https://example.test/cb'], token_endpoint_auth_method: 'client_secret_basic' }), 400);
    // Loopback HTTP stays available for a local MCP client doing this flow.
    assert.equal(await bad({ redirect_uris: ['http://127.0.0.1:7777/cb'] }), 201);
  } finally { await close(); }
});

// ------------------------------------------------------- 4. authorization --

test('a bad client or redirect URI is NOT redirected to', async () => {
  // The failure this catches is the classic one: redirecting an error, and
  // later a code, to an address the client never registered.
  const { base, close } = await boot();
  try {
    const { body: client } = await register(base);
    const { challenge } = pkce();
    const attacker = 'https://attacker.test/steal';
    const query = new URLSearchParams({
      response_type: 'code', client_id: client.client_id, redirect_uri: attacker,
      code_challenge: challenge, code_challenge_method: 'S256',
    });
    const response = await fetch(`${base}/oauth/authorize?${query}`, { redirect: 'manual' });
    assert.equal(response.status, 400);
    assert.equal(response.headers.get('location'), null, 'nothing is redirected anywhere');

    const forged = await fetch(`${base}/oauth/authorize?${new URLSearchParams({
      response_type: 'code', client_id: 'nmc1.ZmFrZQ.ZmFrZQ', redirect_uri: attacker,
      code_challenge: challenge, code_challenge_method: 'S256',
    })}`, { redirect: 'manual' });
    assert.equal(forged.status, 400);
    assert.equal(forged.headers.get('location'), null);
  } finally { await close(); }
});

test('a recoverable error goes back to the client with state and iss, as RFC 9207 requires', async () => {
  // The failure this catches: advertising issuer identification and then
  // omitting `iss` on an error response, which makes the host reject the
  // whole exchange.
  const { base, close } = await boot();
  try {
    const { body: client, redirectUri } = await register(base);
    const cases = {
      unsupported_response_type: { response_type: 'token', code_challenge_method: 'S256', code_challenge: pkce().challenge },
      invalid_request: { response_type: 'code', code_challenge_method: 'plain', code_challenge: 'x'.repeat(43) },
      invalid_target: { response_type: 'code', code_challenge_method: 'S256', code_challenge: pkce().challenge, resource: 'https://elsewhere.test/mcp' },
      invalid_scope: { response_type: 'code', code_challenge_method: 'S256', code_challenge: pkce().challenge, scope: 'administer' },
    };
    for (const [expected, parameters] of Object.entries(cases)) {
      const query = new URLSearchParams({ client_id: client.client_id, redirect_uri: redirectUri, state: 'st-9', ...parameters });
      const response = await fetch(`${base}/oauth/authorize?${query}`, { redirect: 'manual' });
      assert.equal(response.status, 302, expected);
      const returned = new URL(response.headers.get('location')).searchParams;
      assert.equal(returned.get('error'), expected);
      assert.equal(returned.get('state'), 'st-9', 'state survives an error');
      assert.equal(returned.get('iss'), 'https://mcp.unit-test.invalid', 'iss is present on error responses too');
    }
  } finally { await close(); }
});

test('the sign-in page states who is asking and what for, and loads nothing', async () => {
  const { base, close } = await boot();
  try {
    const { body: client, redirectUri } = await register(base);
    const query = new URLSearchParams({
      response_type: 'code', client_id: client.client_id, redirect_uri: redirectUri,
      code_challenge: pkce().challenge, code_challenge_method: 'S256',
    });
    const response = await fetch(`${base}/oauth/authorize?${query}`, { redirect: 'manual' });
    assert.equal(response.status, 200);
    const html = await response.text();
    // A consent screen that does not say what is being consented to is a
    // consent screen in name only.
    assert.match(html, /Unit test client/);
    assert.match(html, /https:\/\/mcp\.unit-test\.invalid\/mcp/);
    assert.match(html, /measure/);

    // WHERE THE CODE GOES, and that the name is not vouched for.
    //
    // Registration is open, so anyone can mint a client calling itself
    // "ChatGPT" with their own redirect URI underneath. The destination is
    // the one field they cannot fake, because it is where the authorization
    // code is actually sent. Showing it is what lets a person notice.
    assert.match(html, /Retour vers/);
    assert.match(html, /https:\/\/chatgpt\.com/, 'the redirect destination must be shown to the person signing in');
    assert.match(html, /déclaré par le client/, 'the client name must be labelled as unverified');

    // Nothing is FETCHED while a secret is being typed. A URL printed as text
    // is not a resource reference -- the destination above is one, deliberately
    // -- so this checks loading positions, not the presence of a string.
    for (const pattern of [/<script/i, /<img/i, /<link/i, /\bsrc\s*=/i, /@import/i, /url\s*\(/i]) {
      assert.equal(pattern.test(html), false, `the page must not load anything (${pattern})`);
    }
    assert.equal(/href\s*=/i.test(html), false, 'no outbound link either: a destination is shown, never made clickable');
    assert.match(response.headers.get('content-security-policy'), /default-src 'none'/);
    assert.equal(response.headers.get('cache-control'), 'no-store');

    // THIS LINE USED TO SAY `no-referrer`, AND THAT BROKE A LIVE DEPLOYMENT.
    //
    // Under `no-referrer` a browser serialises the `Origin` header of a
    // form-submission navigation as the string `null` -- such a request is
    // not CORS-tainted, so the referrer policy governs that serialisation
    // too. The sign-in form then arrived with `Origin: null`, the origin
    // allow-list refused it, and nobody could authenticate. Every test
    // passed throughout, because curl and fetch both send a real Origin and
    // neither is a browser.
    //
    // `same-origin` keeps the property that mattered -- the referrer reaches
    // this origin and nowhere else -- and restores the Origin header.
    assert.equal(response.headers.get('referrer-policy'), 'same-origin');
    assert.notEqual(response.headers.get('referrer-policy'), 'no-referrer',
      'no-referrer makes a browser send Origin: null on the form POST, which this server refuses');
  } finally { await close(); }
});

test('form-action names the one destination this request will redirect to, and nothing else', async () => {
  // THE FAILURE THIS CATCHES, measured with a control that differed in this
  // directive alone: `form-action` is enforced against the FINAL destination
  // of a form submission, redirects included. A successful sign-in answers
  // the POST with a 302 to the client's redirect URI, so with `'self'` alone
  // the POST reached the server, the 302 was emitted, and the browser
  // silently refused to follow it. Nothing server-side looked wrong.
  const { base, close } = await boot();
  const pageCsp = async (redirectUri) => {
    const { body: client } = await register(base, redirectUri);
    const query = new URLSearchParams({
      response_type: 'code', client_id: client.client_id, redirect_uri: redirectUri,
      code_challenge: pkce().challenge, code_challenge_method: 'S256', scope: MEASURE_SCOPE,
    });
    const response = await fetch(`${base}/oauth/authorize?${query}`, { redirect: 'manual' });
    return /form-action ([^;]+);/.exec(response.headers.get('content-security-policy'))[1];
  };
  try {
    // ChatGPT's real redirect URI: its origin, and only its origin.
    assert.equal(await pageCsp('https://chatgpt.com/connector_platform_oauth_redirect'), "'self' https://chatgpt.com");

    // A DIFFERENT client gets ITS destination, not a standing allow-list that
    // accumulates whatever anyone has ever registered.
    const other = await pageCsp('https://other.example/cb');
    assert.equal(other, "'self' https://other.example");
    assert.equal(other.includes('chatgpt.com'), false, 'one request, one destination');

    // The path never reaches the header, only the origin -- and a port is
    // carried, because an origin with a port is a different origin.
    assert.equal(await pageCsp('http://127.0.0.1:7777/cb'), "'self' http://127.0.0.1:7777");

    // Checked token by token, not by substring: `https://chatgpt.com`
    // legitimately contains the characters of a scheme-source, and a
    // substring test on `https:` would have failed on a correct header.
    // Every source must be `'self'` or one well-formed origin.
    for (const redirectUri of ['https://chatgpt.com/cb', 'https://other.example/cb']) {
      const sources = (await pageCsp(redirectUri)).split(' ');
      assert.equal(sources.length, 2, 'exactly two sources: self, and one destination');
      assert.equal(sources[0], "'self'");
      assert.match(sources[1], /^https?:\/\/[a-z0-9.-]+(?::\d{1,5})?$/, 'the second source is one origin and nothing else');
      for (const token of sources) {
        assert.equal(['*', 'https:', 'http:', 'data:', "'unsafe-inline'", "'unsafe-eval'"].includes(token), false,
          `${token} is a wildcard or scheme-source and must never appear`);
      }
    }
  } finally { await close(); }
});

test('the destination is only ever the one registration already allowed', () => {
  // `formActionSources` is handed the redirect URI that
  // `validateAuthorizationRequest` matched as an EXACT STRING against the
  // list signed into the client_id. So the header can only ever name an
  // origin the client registered -- there is no path from a request
  // parameter to this directive that does not pass that check first.
  //
  // What is tested here is the last mile: that nothing malformed, and
  // nothing that could break out of a header, gets interpolated.
  assert.equal(formActionSources('https://chatgpt.com/cb'), "'self' https://chatgpt.com");
  assert.equal(formActionSources('http://127.0.0.1:8787/x'), "'self' http://127.0.0.1:8787");
  // Refused outright rather than interpolated: the page then cannot redirect,
  // which is visible, instead of a header that says something unintended.
  for (const rejected of [
    undefined, null, '', 'not-a-url', 42,
    'javascript:alert(1)',
    'data:text/html,x',
    'https://a b.test/cb',
  ]) {
    assert.equal(formActionSources(rejected), "'self'", `${String(rejected)} must not reach the header`);
  }

  // Anything appended after the authority lands in the PATH, and the path
  // never reaches the header -- a payload trying to close the directive is
  // cut off by URL parsing before this function looks at anything. MEASURED,
  // not assumed: both of these reduce to the bare origin.
  for (const payload of ['https://evil.test/cb; form-action *', 'https://evil.test/cb\r\nX-Injected: 1']) {
    const result = formActionSources(payload);
    assert.equal(result, "'self' https://evil.test", 'reduced to its origin');
    for (const character of [';', '*', '\r', '\n']) {
      assert.equal(result.includes(character), false, `${JSON.stringify(character)} must never reach the header`);
    }
  }

  // And why `https://evil.test` appearing there is not a hole: this function
  // is only ever handed a redirect URI that `validateAuthorizationRequest`
  // already matched as an EXACT STRING against the list signed into the
  // client_id. An unregistered destination is refused before any page is
  // rendered, which the test named "a bad client or redirect URI is NOT
  // redirected to" holds.
});

test('an error page carries no form, and keeps the strictest form-action', async () => {
  const { base, close } = await boot();
  try {
    // A bogus request blob renders "Demande expirée": no form, nothing to
    // redirect to, so no destination is named.
    const expired = await fetch(`${base}/oauth/authorize`, {
      method: 'POST', redirect: 'manual',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Origin: new URL(base).origin },
      body: 'request=x',
    });
    assert.equal(expired.status, 400);
    assert.match(expired.headers.get('content-security-policy'), /form-action 'self';/);
    assert.equal(/<form/i.test(await expired.text()), false);
  } finally { await close(); }
});

test('a protocol endpoint is not gated on Origin, whether the caller sends one or not', async () => {
  // The defect this closes is the MIRROR of the one people expect. A caller
  // that sends NO Origin -- ChatGPT's backend -- always walked through. A
  // caller that sends one -- a browser-based MCP client, or any host that
  // stamps it -- was refused, on endpoints where Origin is not an access
  // control at all. The header was blocking the honest case.
  //
  // What protects these is what the protocol says protects them: PKCE and the
  // code's binding on /oauth/token, possession of the token on /oauth/revoke,
  // and nothing on documents that exist to be public. None of them carries
  // ambient authority, so a page calling them has no more power than curl.
  const { base, close } = await boot();
  const origins = [undefined, 'https://mcp.unit-test.invalid', 'https://chatgpt.com', 'https://anything.example', 'null'];
  const header = (origin) => (origin === undefined ? {} : { Origin: origin });
  try {
    for (const origin of origins) {
      const label = origin ?? 'absent Origin';

      for (const path of ['/.well-known/oauth-protected-resource', '/.well-known/oauth-authorization-server']) {
        const r = await fetch(`${base}${path}`, { headers: header(origin) });
        assert.equal(r.status, 200, `${path} with ${label}`);
      }

      const registered = await fetch(`${base}/oauth/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...header(origin) },
        body: JSON.stringify({ redirect_uris: ['https://chatgpt.com/cb'] }),
      });
      assert.equal(registered.status, 201, `/oauth/register with ${label}`);

      // Reaches the handler and is refused on its own terms -- invalid_client,
      // not invalid_origin. That distinction is the whole test.
      const token = await fetch(`${base}/oauth/token`, form({ grant_type: 'authorization_code', client_id: 'nope' }));
      const tokenWithOrigin = await fetch(`${base}/oauth/token`, {
        ...form({ grant_type: 'authorization_code', client_id: 'nope' }),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...header(origin) },
      });
      assert.equal(tokenWithOrigin.status, 401, `/oauth/token with ${label}`);
      assert.equal((await tokenWithOrigin.json()).error, 'invalid_client');
      assert.equal(token.status, 401);

      const revoked = await fetch(`${base}/oauth/revoke`, {
        ...form({ token: 'whatever' }),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...header(origin) },
      });
      assert.equal(revoked.status, 200, `/oauth/revoke with ${label}`);
    }
  } finally { await close(); }
});

test('the page endpoint is tightened, not loosened: only its own origin, and not every configured host', async () => {
  // `/oauth/authorize` used to accept anything in the deployment's host
  // allow-list, in either scheme. It now accepts the issuer it was served as,
  // loopback for a local instance, or nothing at all. That is STRICTER: the
  // plaintext form of the issuer, and any second configured host, are gone.
  const { base, close } = await boot();
  const post = (origin) => fetch(`${base}/oauth/authorize`, {
    method: 'POST', redirect: 'manual',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...(origin === undefined ? {} : { Origin: origin }) },
    body: 'request=x',
  });
  try {
    // Reaches the handler: its own loopback origin, and no Origin at all.
    for (const accepted of [undefined, new URL(base).origin]) {
      assert.equal((await post(accepted)).status, 400, `${accepted ?? 'absent'} must reach the handler`);
    }
    // Refused, including the ones the old shared gate would have let through.
    for (const refused of [
      'null',
      'https://chatgpt.com',
      'https://attacker.test',
      'http://mcp.unit-test.invalid',
      `https://${new URL(base).host}`,
    ]) {
      assert.equal((await post(refused)).status, 403, `${refused} must be refused`);
    }
  } finally { await close(); }
});

test('the MCP endpoint keeps the gate it always had, unchanged', async () => {
  // Nothing in this correction may touch the route the MCP specification's
  // DNS-rebinding concern is about.
  const { base, close } = await boot();
  const call = (origin) => fetch(`${base}/mcp`, {
    method: 'POST',
    headers: {
      Accept: 'application/json, text/event-stream', 'Content-Type': 'application/json',
      ...(origin === undefined ? {} : { Origin: origin }),
    },
    body: JSON.stringify(INITIALIZE()),
  });
  try {
    for (const refused of ['https://chatgpt.com', 'https://attacker.test', 'null']) {
      const r = await call(refused);
      assert.equal(r.status, 403, refused);
      assert.deepEqual(await r.json(), { error: 'invalid_origin' }, 'and still machine-readable');
    }
    // Its own loopback origin and an absent Origin get past the gate, and are
    // then refused by the CREDENTIAL check -- 401, not 403.
    for (const accepted of [undefined, new URL(base).origin]) {
      assert.equal((await call(accepted)).status, 401, `${accepted ?? 'absent'} must reach the credential gate`);
    }
  } finally { await close(); }
});

test('a flood of wrong secrets is refused without lying, and without evaluating the credential', async () => {
  // Verification costs real CPU on purpose. It now runs in the thread pool
  // instead of on the event loop -- a 50 ms block per attempt froze
  // measurements in flight -- and the number in flight is capped. Over the
  // cap the server says it is saturated; it must NOT say the secret was
  // wrong, because it never looked.
  const { base, close } = await boot();
  try {
    const { body: client, redirectUri } = await register(base);
    const query = new URLSearchParams({
      response_type: 'code', client_id: client.client_id, redirect_uri: redirectUri,
      code_challenge: pkce().challenge, code_challenge_method: 'S256', scope: MEASURE_SCOPE,
    });
    const html = await (await fetch(`${base}/oauth/authorize?${query}`)).text();
    const request = /name="request" value="([^"]+)"/.exec(html)[1];

    const attempt = () => fetch(`${base}/oauth/authorize`, form({ request, participant: 'alpha', secret: 'faux' }));
    const results = await Promise.all(Array.from({ length: 12 }, attempt));
    const statuses = results.map((r) => r.status);

    // Every answer is one of exactly two things, and never a success.
    assert.ok(statuses.every((s) => s === 401 || s === 503), `unexpected statuses: ${[...new Set(statuses)]}`);
    assert.equal(statuses.includes(302), false, 'no flood may produce an authorization code');

    const saturated = results.filter((r) => r.status === 503);
    for (const response of saturated) {
      const body = await response.text();
      assert.match(body, /saturé/);
      // The apostrophe is HTML-escaped on the way out, so match around it.
      assert.match(body, /pas été évalué/, 'a saturation answer must not be dressed up as a wrong secret');
      assert.equal(/incorrect/.test(body), false, 'and must not claim the credential was wrong');
    }
    // And the real credential still works once the flood is over.
    const ok = await authorizeTo(base, {
      clientId: client.client_id, redirectUri, challenge: pkce().challenge,
      participant: 'alpha', secret: SECRET_ALPHA,
    });
    assert.equal(ok.status, 302);
  } finally { await close(); }
});

test('the origin gate still refuses what it should, including the null origin the bug produced', async () => {
  // The fix must not have widened anything. `null` is what a sandboxed frame
  // sends too, so accepting it would have been a real relaxation -- the point
  // is that a correctly served page no longer produces it.
  const { base, close } = await boot();
  const post = (origin) => fetch(`${base}/oauth/authorize`, {
    method: 'POST', redirect: 'manual',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...(origin === undefined ? {} : { Origin: origin }) },
    body: 'request=x',
  });
  try {
    for (const refused of ['null', 'https://chatgpt.com', 'https://attacker.test', `http://evil.${new URL(base).host}`]) {
      const response = await post(refused);
      assert.equal(response.status, 403, `${refused} must be refused`);
    }
    // The server's own origin, and a request with no Origin at all, reach the
    // handler -- which then refuses the bogus blob on its own terms, with 400
    // and not 403.
    for (const accepted of [undefined, new URL(base).origin]) {
      const response = await post(accepted);
      assert.equal(response.status, 400, `${accepted ?? 'absent Origin'} must reach the handler`);
    }
  } finally { await close(); }
});

test('a refused origin on an OAuth route explains itself instead of answering a page of JSON', async () => {
  // Not a relaxation: still 403, still refused. The user who met this on
  // 2026-11-02 saw `{"error":"invalid_origin"}` rendered as a page, naming a
  // header they could not see on a request they did not know had one.
  const { base, close } = await boot();
  try {
    const browser = await fetch(`${base}/oauth/authorize`, {
      method: 'POST', redirect: 'manual',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Origin: 'null' },
      body: 'request=x',
    });
    assert.equal(browser.status, 403);
    assert.match(browser.headers.get('content-type'), /text\/html/);
    const html = await browser.text();
    assert.match(html, /origine/i);
    assert.match(html, /origine absente|null/);

    // The MCP endpoint keeps the machine-readable refusal: it is not a
    // browser surface, and a JSON client should not have to parse HTML.
    const api = await fetch(`${base}/mcp`, {
      method: 'POST',
      headers: { Origin: 'https://attacker.test', Accept: 'application/json, text/event-stream', 'Content-Type': 'application/json' },
      body: JSON.stringify(INITIALIZE()),
    });
    assert.equal(api.status, 403);
    assert.deepEqual(await api.json(), { error: 'invalid_origin' });
  } finally { await close(); }
});

test('an unknown participant, a wrong secret and a suspended access are indistinguishable', async () => {
  // The failure this catches: a login page that answers differently for a
  // name that exists, turning it into a way to enumerate who holds an access.
  const reader = registryOf([alpha(), { ...beta(), enabled: false }]);
  const { base, close } = await boot({ reader });
  try {
    const { body: client, redirectUri } = await register(base);
    const messages = new Set();
    for (const [participant, secret] of [['nobody', SECRET_ALPHA], ['alpha', 'wrong-secret'], ['beta', SECRET_BETA]]) {
      const result = await authorizeTo(base, { clientId: client.client_id, redirectUri, challenge: pkce().challenge, participant, secret });
      assert.equal(result.status, 401, `${participant} must not be let in`);
      assert.equal(result.location, null, 'a failed sign-in redirects nowhere, so no code leaves');
      messages.add(/<p class="error">([^<]+)<\/p>/.exec(result.body)?.[1]);
      // The re-render must keep the destination too, otherwise the SECOND
      // attempt is the one a browser refuses to follow.
      assert.match(result.page.headers.get('content-security-policy') ?? '', /form-action 'self'/);
    }
    assert.equal(messages.size, 1, `three different failures produced ${messages.size} different messages`);
  } finally { await close(); }
});

test('a correct sign-in returns a code, with state and iss', async () => {
  const { base, close } = await boot();
  try {
    const { body: client, redirectUri } = await register(base);
    const result = await authorizeTo(base, {
      clientId: client.client_id, redirectUri, challenge: pkce().challenge,
      participant: 'alpha', secret: SECRET_ALPHA, state: 'st-42',
    });
    assert.equal(result.status, 302);
    assert.ok(result.code);
    assert.equal(result.returned.get('state'), 'st-42');
    assert.equal(result.returned.get('iss'), 'https://mcp.unit-test.invalid');
    assert.equal(new URL(result.location).origin + new URL(result.location).pathname, redirectUri);
  } finally { await close(); }
});

// --------------------------------------------------------------- 5. token --

test('PKCE is enforced: a code without its verifier is worth nothing', async () => {
  // The failure this catches: an intercepted authorization code that can be
  // replayed by whoever intercepted it.
  const { base, close } = await boot();
  try {
    const { body: client, redirectUri } = await register(base);
    const { verifier, challenge } = pkce();
    const result = await authorizeTo(base, { clientId: client.client_id, redirectUri, challenge, participant: 'alpha', secret: SECRET_ALPHA });

    const wrong = await exchange(base, { code: result.code, clientId: client.client_id, redirectUri, verifier: pkce().verifier });
    assert.equal(wrong.status, 400);
    assert.equal(wrong.body.error, 'invalid_grant');

    const missing = await fetch(`${base}/oauth/token`, form({
      grant_type: 'authorization_code', code: result.code, client_id: client.client_id, redirect_uri: redirectUri,
    }));
    assert.equal(missing.status, 400);

    const right = await exchange(base, { code: result.code, clientId: client.client_id, redirectUri, verifier });
    assert.equal(right.status, 200, 'the real verifier still works after the failed attempts');
  } finally { await close(); }
});

test('an authorization code is single use, bound to its client and to its redirect URI', async () => {
  const { base, close } = await boot();
  try {
    const { body: client, redirectUri } = await register(base);
    const other = await register(base, 'https://other.test/cb');
    const { verifier, challenge } = pkce();
    const result = await authorizeTo(base, { clientId: client.client_id, redirectUri, challenge, participant: 'alpha', secret: SECRET_ALPHA });

    const stolen = await exchange(base, { code: result.code, clientId: other.body.client_id, redirectUri: 'https://other.test/cb', verifier });
    assert.equal(stolen.body.error, 'invalid_grant', 'a code issued to one client does not work for another');

    const moved = await exchange(base, { code: result.code, clientId: client.client_id, redirectUri: 'https://chatgpt.com/other', verifier });
    assert.equal(moved.body.error, 'invalid_grant', 'the redirect URI must match the authorization request');

    const first = await exchange(base, { code: result.code, clientId: client.client_id, redirectUri, verifier });
    assert.equal(first.status, 200);
    const replay = await exchange(base, { code: result.code, clientId: client.client_id, redirectUri, verifier });
    assert.equal(replay.status, 400);
    assert.equal(replay.body.error, 'invalid_grant', 'a replayed code is a stolen code until proven otherwise');
  } finally { await close(); }
});

test('a refresh token rotates, and the one just spent stops working', async () => {
  const { base, close } = await boot();
  try {
    const { client, token } = await fullFlow(base);
    assert.equal(token.status, 200);
    assert.equal(token.body.token_type, 'Bearer');
    assert.equal(token.body.scope, MEASURE_SCOPE);

    const refreshed = await fetch(`${base}/oauth/token`, form({
      grant_type: 'refresh_token', refresh_token: token.body.refresh_token, client_id: client.client_id,
    }));
    const body = await refreshed.json();
    assert.equal(refreshed.status, 200);
    assert.notEqual(body.refresh_token, token.body.refresh_token, 'the refresh token rotates');

    const replay = await fetch(`${base}/oauth/token`, form({
      grant_type: 'refresh_token', refresh_token: token.body.refresh_token, client_id: client.client_id,
    }));
    assert.equal(replay.status, 400, 'a stolen copy of the old refresh token has a bounded life');
  } finally { await close(); }
});

// -------------------------------------------------- 6. the resource server --

test('an authorized participant reaches the tool, and the measurement comes back untouched', async () => {
  // The claim under test is not only that OAuth lets the call through: it is
  // that nothing about the result changed because of who asked.
  const measurement = syntheticMeasurement();
  const mock = apiMock(() => jsonReply(JSON.stringify(measurement)));
  const { base, close } = await boot({ fetchImpl: mock.fetch });
  try {
    const { token } = await fullFlow(base);
    const authorization = `Bearer ${token.body.access_token}`;
    const init = await mcpCall(base, authorization, {
      jsonrpc: '2.0', id: 1, method: 'initialize',
      params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'unit', version: '1' } },
    });
    assert.equal(init.status, 200);
    const session = init.headers.get('mcp-session-id');
    const headers = { 'Mcp-Session-Id': session, 'Mcp-Protocol-Version': '2025-06-18' };
    await fetch(`${base}/mcp`, {
      method: 'POST',
      headers: { Authorization: authorization, Accept: 'application/json, text/event-stream', 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
    });
    const called = await fetch(`${base}/mcp`, {
      method: 'POST',
      headers: { Authorization: authorization, Accept: 'application/json, text/event-stream', 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'measure_execution', arguments: execution() } }),
    });
    const payload = (await called.json()).result.structuredContent;

    // What a measurement must survive crossing an authentication layer: its
    // states, its nulls, and the fields nobody modelled.
    const signals = payload.response.observation.observed_signals;
    assert.equal(signals.coherence_score, null, 'a null signal stays null');
    assert.equal(signals.signal_status.semantic_risk, 'insufficient_coverage', 'a cause stays its own cause');
    assert.equal(payload.response.untouched_unknown_field.other_class, 'not_assessed');
    assert.equal(payload.response.untouched_unknown_field.zero, 0, '0 is a value, not an absence');
    assert.equal(payload.response.untouched_unknown_field.flag, false);
    // This fixture uses a shape the projection does not model, so the
    // projection publishes NOTHING for it and says where it put the rest.
    // An auth layer that started filling these in would be inventing.
    assert.equal(payload.presentation.measurement_status, null);
    assert.equal(payload.presentation.request_id, 'synthetic-measurement');
    for (const unmodelled of ['observation', 'untouched_unknown_field']) {
      assert.ok(payload.presentation.unmodelled_root_fields.includes(unmodelled));
    }

    // And the identity of the caller reaches NOTHING upstream: the technical
    // API key is the only credential the instrument ever sees. This is the
    // line between the two secrets, asserted rather than asserted about.
    assert.equal(mock.calls.length, 1);
    const sent = JSON.stringify(mock.calls[0]);
    assert.equal(sent.includes('alpha'), false, 'the participant identity must not travel upstream');
    assert.equal(sent.includes(SECRET_ALPHA), false);
    assert.equal(sent.includes(token.body.access_token), false, 'nor does the access token');
  } finally { await close(); }
});

test('the same measurement comes back identical whether the caller used OAuth or the static key', async () => {
  // The strongest form of "no metrological regression" available here: run
  // the one call twice, through two different credentials, and compare the
  // whole structured output byte for byte.
  const config = testConfig();
  const mock = apiMock(() => jsonReply(JSON.stringify(syntheticMeasurement())));
  const { base, close } = await boot({ config, fetchImpl: mock.fetch });

  const measure = async (authorization) => {
    const init = await mcpCall(base, authorization, INITIALIZE());
    const headers = {
      Authorization: authorization, Accept: 'application/json, text/event-stream', 'Content-Type': 'application/json',
      'Mcp-Session-Id': init.headers.get('mcp-session-id'), 'Mcp-Protocol-Version': '2025-06-18',
    };
    await fetch(`${base}/mcp`, { method: 'POST', headers, body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) });
    const called = await fetch(`${base}/mcp`, {
      method: 'POST', headers,
      body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'measure_execution', arguments: execution() } }),
    });
    return (await called.json()).result;
  };

  try {
    const { token } = await fullFlow(base);
    const viaOAuth = await measure(`Bearer ${token.body.access_token}`);
    const viaStaticKey = await measure(`Bearer ${config.mcpKey}`);
    assert.deepEqual(viaOAuth, viaStaticKey, 'who asked must not change a single field of what came back');
    assert.equal(viaOAuth.isError, false);
  } finally { await close(); }
});

test('an expired, forged, wrong-audience or wrong-type token is refused', async () => {
  const oauth = oauthConfig();
  const { base, close } = await boot({ oauth });
  try {
    const ping = INITIALIZE();
    const base64 = (value) => Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');

    const expired = sign(SIGNING_KEY, 'at+jwt', {
      iss: oauth.issuer, sub: 'alpha', aud: oauth.resource, scope: MEASURE_SCOPE, epoch: 1,
      jti: 'x', iat: Math.floor(Date.now() / 1000) - 7200, exp: Math.floor(Date.now() / 1000) - 10,
    });
    const elsewhere = issueAccessToken({ ...oauth, resource: 'https://elsewhere.test/mcp' }, { subject: 'alpha', epoch: 1, scope: MEASURE_SCOPE, clientId: 'c' });
    const otherKey = issueAccessToken({ ...oauth, signingKey: 'a-completely-different-key-0123456789abcdef' }, { subject: 'alpha', epoch: 1, scope: MEASURE_SCOPE, clientId: 'c' });
    // `alg: none` must not reach a list check: it fails because it is not the
    // one expected string.
    const unsigned = `${base64({ alg: 'none', typ: 'at+jwt' })}.${base64({ iss: oauth.issuer, sub: 'alpha', aud: oauth.resource, scope: MEASURE_SCOPE, epoch: 1, iat: 0, exp: 2 ** 40 })}.`;
    // A refresh token presented as an access token: same key, same claims,
    // different type tag.
    const { token } = await fullFlow(base);

    for (const [label, value] of Object.entries({
      expired, elsewhere, otherKey, unsigned,
      refreshAsAccess: token.body.refresh_token,
      garbage: 'not-a-token',
    })) {
      const response = await mcpCall(base, `Bearer ${value}`, ping);
      assert.equal(response.status, 401, label);
      assert.match(response.headers.get('www-authenticate'), /resource_metadata=/, label);
    }
    // And the real one still works, so the refusals above are not a blanket
    // failure of the verifier.
    assert.equal((await mcpCall(base, `Bearer ${token.body.access_token}`, ping)).status, 200);
  } finally { await close(); }
});

test('revocation is real: suspending a participant kills tokens already issued, and leaves everyone else alone', async () => {
  // The failure this catches: a signed token that nothing can withdraw. The
  // registry is the one durable thing in this design precisely so that this
  // test can pass.
  const reader = registryOf([alpha(), beta()]);
  const { base, close } = await boot({ reader });
  try {
    const first = await fullFlow(base, 'alpha', SECRET_ALPHA);
    const second = await fullFlow(base, 'beta', SECRET_BETA);
    const ping = INITIALIZE();
    const alphaAuth = `Bearer ${first.token.body.access_token}`;
    const betaAuth = `Bearer ${second.token.body.access_token}`;
    assert.equal((await mcpCall(base, alphaAuth, ping)).status, 200);
    assert.equal((await mcpCall(base, betaAuth, ping)).status, 200);

    // Suspension, as an operator performs it: one flag in the registry file.
    reader.state.participants = [{ ...alpha(), enabled: false }, beta()];
    assert.equal((await mcpCall(base, alphaAuth, ping)).status, 401, 'the suspended participant is out immediately');
    assert.equal((await mcpCall(base, betaAuth, ping)).status, 200, 'and nobody else is affected');
    // Their refresh token is dead too, so they cannot mint a fresh one.
    const refreshed = await fetch(`${base}/oauth/token`, form({
      grant_type: 'refresh_token', refresh_token: first.token.body.refresh_token, client_id: first.client.client_id,
    }));
    assert.equal(refreshed.status, 400);

    // Rotation, the other lever: the access stays, the issued tokens do not.
    reader.state.participants = [{ ...alpha(), epoch: 2 }, beta()];
    assert.equal((await mcpCall(base, alphaAuth, ping)).status, 401, 'an epoch bump invalidates tokens issued before it');
    const again = await fullFlow(base, 'alpha', SECRET_ALPHA);
    assert.equal((await mcpCall(base, `Bearer ${again.token.body.access_token}`, ping)).status, 200, 'and a new sign-in works');
  } finally { await close(); }
});

test('removing a scope from a participant stops their existing token immediately, with 403 and not 401', async () => {
  // 401 would send the client back through a login that would grant it
  // exactly the same thing, forever.
  const reader = registryOf([alpha()]);
  const { base, close } = await boot({ reader });
  try {
    const { token } = await fullFlow(base, 'alpha', SECRET_ALPHA);
    reader.state.participants = [{ ...alpha(), scopes: [] }];
    const response = await mcpCall(base, `Bearer ${token.body.access_token}`, INITIALIZE());
    assert.equal(response.status, 403);
    assert.match(response.headers.get('www-authenticate'), /error="insufficient_scope"/);
  } finally { await close(); }
});

test('an explicit revocation refuses the token and still answers 200, as RFC 7009 requires', async () => {
  const { base, close } = await boot();
  try {
    const { token } = await fullFlow(base);
    const ping = INITIALIZE();
    assert.equal((await mcpCall(base, `Bearer ${token.body.access_token}`, ping)).status, 200);
    const revoked = await fetch(`${base}/oauth/revoke`, form({ token: token.body.access_token }));
    assert.equal(revoked.status, 200);
    assert.equal((await mcpCall(base, `Bearer ${token.body.access_token}`, ping)).status, 401);
    // Telling a caller that a token was already unknown tells them something
    // about a token they may not own.
    assert.equal((await fetch(`${base}/oauth/revoke`, form({ token: 'never-existed' }))).status, 200);
  } finally { await close(); }
});

// ------------------------------------------------------- 7. the two halves --

test('the static key still works, carries no identity, and is not confused with a participant', async () => {
  // Point of compatibility: Codex, a local client and every existing
  // deployment present this credential. Adding OAuth must not remove it.
  const config = testConfig();
  const { base, close } = await boot({ config });
  try {
    const response = await mcpCall(base, `Bearer ${config.mcpKey}`, INITIALIZE());
    assert.equal(response.status, 200);
    // And it is not an OAuth token: presenting it where one is expected fails
    // the signature check rather than being silently accepted as a subject.
    const oauth = oauthConfig();
    const verdict = verifyAccessToken(oauth, config.mcpKey, { registry: { participants: new Map() }, revoked: new Set() });
    assert.equal(verdict.ok, false);
  } finally { await close(); }
});

test('per-participant ceilings are separate, and nothing is counted when no ceiling is set', async () => {
  const reader = registryOf([alpha(), beta()]);
  const server = createAuthorizationServer({ oauth: oauthConfig({ quotaPerSubject: 2 }), registryReader: reader });
  try {
    assert.equal(server.consume('alpha').allowed, true);
    assert.equal(server.consume('alpha').allowed, true);
    const over = server.consume('alpha');
    assert.equal(over.allowed, false);
    assert.equal(over.used, 2);
    assert.equal(over.limit, 2);
    // Separation is the point: beta's budget is untouched by alpha's.
    assert.equal(server.consume('beta').allowed, true);
  } finally { server.close(); }

  // With no ceiling configured, nothing about anyone is held between
  // requests -- which is what the published privacy statement says today.
  const unmetered = createAuthorizationServer({ oauth: oauthConfig(), registryReader: reader });
  try {
    for (let i = 0; i < 5; i++) assert.equal(unmetered.consume('alpha').allowed, true);
    assert.equal(unmetered._internals.consumption.size, 0, 'no counter exists when no ceiling does');
  } finally { unmetered.close(); }
});

test('a refused call over quota produces NO measurement and makes no upstream call', async () => {
  // The invariant this protects is the one the whole connector exists for: a
  // refusal is never dressed up as a favourable result.
  const mock = apiMock(() => jsonReply(JSON.stringify(syntheticMeasurement())));
  const { base, close } = await boot({ oauth: oauthConfig({ quotaPerSubject: 0 }), fetchImpl: mock.fetch });
  try {
    const { token } = await fullFlow(base);
    const authorization = `Bearer ${token.body.access_token}`;
    const init = await mcpCall(base, authorization, {
      jsonrpc: '2.0', id: 1, method: 'initialize',
      params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'unit', version: '1' } },
    });
    const headers = {
      Authorization: authorization, Accept: 'application/json, text/event-stream', 'Content-Type': 'application/json',
      'Mcp-Session-Id': init.headers.get('mcp-session-id'), 'Mcp-Protocol-Version': '2025-06-18',
    };
    await fetch(`${base}/mcp`, { method: 'POST', headers, body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) });
    const called = await fetch(`${base}/mcp`, {
      method: 'POST', headers,
      body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'measure_execution', arguments: execution() } }),
    });
    assert.equal(called.status, 429);
    const payload = await called.json();
    assert.match(payload.error.message, /No measurement was attempted, and none was produced/);
    assert.equal(payload.result, undefined, 'no result object is fabricated');
    assert.equal(mock.calls.length, 0, 'and the instrument was never called');
  } finally { await close(); }
});

// ------------------------------------------------- 8. registry and secrets --

test('a generated participant entry verifies, and holds nothing reversible', () => {
  const entry = participantEntry({ subject: 'gamma', secret: 'a-sufficiently-long-secret' });
  assert.equal(verifySecret(entry.secret, 'a-sufficiently-long-secret'), true);
  assert.equal(verifySecret(entry.secret, 'a-sufficiently-long-secrez'), false);
  const serialised = JSON.stringify(entry);
  assert.equal(serialised.includes('a-sufficiently-long-secret'), false, 'the secret must not survive into the registry');
  assert.equal(entry.epoch, 1, 'an epoch starts at 1 so the first rotation has somewhere to go');
  // A short secret is refused at the point of creation rather than accepted
  // and regretted.
  assert.throws(() => participantEntry({ subject: 'gamma', secret: 'short' }), /at least 16/);
  assert.throws(() => participantEntry({ subject: 'bad subject', secret: 'a-sufficiently-long-secret' }), /subject/);
  // Two entries for the same secret differ, because the salt does.
  assert.notEqual(hashSecret('same-secret-value-here').hash, hashSecret('same-secret-value-here').hash);
});

test('an unreadable or malformed registry refuses everyone rather than admitting anyone', () => {
  // The failure this catches: a missing file read as "no restrictions".
  const absent = readRegistry('/unit-test/definitely-not-here.json');
  assert.equal(absent.ok, false);
  assert.equal(absent.participants.size, 0);
  const oauth = oauthConfig();
  const token = issueAccessToken(oauth, { subject: 'alpha', epoch: 1, scope: MEASURE_SCOPE, clientId: 'c' });
  const verdict = verifyAccessToken(oauth, token, { registry: absent, revoked: new Set() });
  assert.equal(verdict.ok, false);
  assert.equal(verdict.reason, 'unknown_subject');
});

test('the challenge header keeps its old shape when OAuth is off', () => {
  assert.equal(challengeHeader({ enabled: false }), 'Bearer realm="neomundi-private-mcp"');
  assert.equal(challengeHeader(undefined), 'Bearer realm="neomundi-private-mcp"');
  const header = challengeHeader(oauthConfig(), { error: 'invalid_token' });
  assert.match(header, /^Bearer realm="neomundi-private-mcp", error="invalid_token", resource_metadata=/);
});

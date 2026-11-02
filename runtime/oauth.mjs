/** OAuth 2.1 for the hosted MCP endpoint: authorization server and resource
 * server, in one origin, with no stored state and no new dependency.
 *
 * WHY THIS FILE EXISTS. ChatGPT connects an MCP server with OAuth, with no
 * authentication, or with both. It has no flow for a fixed bearer token, and
 * the two obvious workarounds -- putting the token in `headers`, or declaring
 * a protected server as `type: "none"` -- are refused by name in the
 * submission requirements. A fixed bearer token is therefore not a connection
 * method that exists; OAuth is the only self-serve route.
 *
 * WHY NO DATABASE, AND WHY THAT IS NOT A SHORTCUT. Three things would
 * normally need storing, and each is made stateless on purpose:
 *
 *   - REGISTERED CLIENTS. A `client_id` issued by dynamic registration must
 *     keep working across a redeploy, or every connected user meets
 *     `invalid_client` the next time the container restarts. Instead of a
 *     client table, the `client_id` IS the registration: a signed blob
 *     carrying the redirect URIs. Nothing to lose, nothing to migrate.
 *   - TOKENS. Access and refresh tokens are signed and self-describing, so a
 *     restart does not sign every user out.
 *   - AUTHORIZATION CODES. These are signed too, and single use. Single use
 *     is the one thing that genuinely needs memory, so a 60-second set of
 *     spent identifiers is kept in the process -- and losing it on restart
 *     costs at most one in-flight login.
 *
 * The container runs `read_only: true`. A design that needed to write would
 * have needed a writable volume, and a writable volume on a path the image
 * does not create comes back as `root:root` and a `PermissionError` that
 * nothing in Compose makes visible. Statelessness is cheaper and safer here.
 *
 * WHAT IS *NOT* STATELESS, DELIBERATELY. Participant identity lives in a
 * read-only registry file supplied by the operator. It is the one durable
 * thing, and it is the one thing that must be durable: it is what makes a
 * revocation survive a restart. Disabling a participant, or bumping their
 * `epoch`, invalidates every token already issued to them -- which a signed
 * token cannot do on its own.
 *
 * WHAT THIS DOES NOT CHANGE. Nothing here touches measurement. No signal, no
 * threshold, no decision, no provenance field passes through this file. The
 * user this code identifies is the person asking for a measurement; it is
 * NEVER confused with `NEOMUNDI_API_KEY`, the single technical credential the
 * connector uses to call the instrument. Those are two different secrets with
 * two different lifetimes, and this file never reads the second one.
 */
import { createHash, createHmac, randomUUID, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';

/** The only scope. One tool is exposed, and it does one thing: a second scope
 * would describe a distinction the server does not make.
 */
export const MEASURE_SCOPE = 'measure';
export const SCOPES_SUPPORTED = Object.freeze([MEASURE_SCOPE]);

/** Signed-blob type tags. They are part of the signed payload, so a refresh
 * token cannot be replayed as an access token even though both are signed by
 * the same key.
 */
const TYPE = Object.freeze({
  access: 'at+jwt',
  refresh: 'nm-refresh+jwt',
  code: 'nm-code+jwt',
  request: 'nm-authz-request+jwt',
  client: 'nm-client+jwt',
});

const b64u = (buffer) => Buffer.from(buffer).toString('base64url');
const unb64u = (value) => Buffer.from(value, 'base64url');
const jsonPart = (value) => b64u(Buffer.from(JSON.stringify(value), 'utf8'));
const now = () => Math.floor(Date.now() / 1000);

/** Constant-time comparison that does not leak length through an exception. */
function sameSecret(a, b) {
  const left = createHash('sha256').update(a).digest();
  const right = createHash('sha256').update(b).digest();
  return timingSafeEqual(left, right);
}

/** Compact JWS, HS256, with the type tag inside the protected header.
 *
 * Verification is strict on purpose: the algorithm and the type are compared
 * against exactly one expected value each. `alg: "none"` and algorithm
 * substitution are not rejected by a list check here -- they never reach one,
 * because anything that is not the single expected string fails.
 */
export function sign(key, type, claims) {
  const header = jsonPart({ alg: 'HS256', typ: type });
  const payload = jsonPart(claims);
  const signature = b64u(createHmac('sha256', key).update(`${header}.${payload}`).digest());
  return `${header}.${payload}.${signature}`;
}

export function verify(key, type, token, { clockSkewSeconds = 60 } = {}) {
  if (typeof token !== 'string' || token.length > 8192) return { ok: false, reason: 'malformed' };
  const parts = token.split('.');
  if (parts.length !== 3) return { ok: false, reason: 'malformed' };
  const [header, payload, signature] = parts;
  let expected;
  try { expected = createHmac('sha256', key).update(`${header}.${payload}`).digest(); }
  catch { return { ok: false, reason: 'malformed' }; }
  const supplied = unb64u(signature);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    return { ok: false, reason: 'bad_signature' };
  }
  let decodedHeader; let claims;
  try {
    decodedHeader = JSON.parse(unb64u(header).toString('utf8'));
    claims = JSON.parse(unb64u(payload).toString('utf8'));
  } catch { return { ok: false, reason: 'malformed' }; }
  if (decodedHeader?.alg !== 'HS256' || decodedHeader?.typ !== type) return { ok: false, reason: 'wrong_type' };
  if (claims === null || typeof claims !== 'object' || Array.isArray(claims)) return { ok: false, reason: 'malformed' };
  if (typeof claims.exp !== 'number' || claims.exp <= now()) return { ok: false, reason: 'expired' };
  if (typeof claims.iat !== 'number' || claims.iat > now() + clockSkewSeconds) return { ok: false, reason: 'not_yet_valid' };
  return { ok: true, claims };
}

// --------------------------------------------------------------- registry --

/** Reads the participant registry.
 *
 * Re-read on every authorization and on every token verification rather than
 * cached at startup, and that is the point: disabling a participant has to
 * take effect NOW, not at the next restart. The file is small, the read is a
 * few microseconds, and a revocation that waits for a redeploy is not a
 * revocation.
 *
 * Nothing in this file ever writes it. The container filesystem is read-only
 * and the registry is mounted read-only; that is a deliberate property, not
 * an accident of packaging.
 */
export function readRegistry(path) {
  let document;
  try { document = JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, '')); }
  catch { return { ok: false, participants: new Map() }; }
  if (document === null || typeof document !== 'object' || !Array.isArray(document.participants)) {
    return { ok: false, participants: new Map() };
  }
  const participants = new Map();
  for (const entry of document.participants) {
    if (entry === null || typeof entry !== 'object') continue;
    const { subject, enabled, epoch, scopes, secret } = entry;
    if (typeof subject !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(subject)) continue;
    if (secret === null || typeof secret !== 'object') continue;
    if (secret.algorithm !== 'scrypt' || typeof secret.salt !== 'string' || typeof secret.hash !== 'string') continue;
    participants.set(subject, Object.freeze({
      subject,
      name: typeof entry.name === 'string' ? entry.name : subject,
      enabled: enabled === true,
      epoch: Number.isSafeInteger(epoch) && epoch >= 0 ? epoch : 0,
      scopes: Object.freeze(Array.isArray(scopes) ? scopes.filter((s) => SCOPES_SUPPORTED.includes(s)) : []),
      secret: Object.freeze({ ...secret }),
    }));
  }
  return { ok: true, participants };
}

/** scrypt parameters are read from the stored record, not assumed here, so a
 * registry written with stronger parameters keeps verifying without a code
 * change. The defaults are the ones `scripts/participant-credential.mjs`
 * writes.
 */
export function secretMatches(record, supplied) {
  if (typeof supplied !== 'string' || supplied.length === 0 || supplied.length > 1024) return false;
  const N = Number.isSafeInteger(record.N) ? record.N : 16384;
  const r = Number.isSafeInteger(record.r) ? record.r : 8;
  const p = Number.isSafeInteger(record.p) ? record.p : 1;
  let derived;
  try {
    derived = scryptSync(Buffer.from(supplied, 'utf8'), unb64u(record.salt), 32, { N, r, p, maxmem: 64 * 1024 * 1024 });
  } catch { return false; }
  const stored = unb64u(record.hash);
  if (stored.length !== derived.length) return false;
  return timingSafeEqual(stored, derived);
}

// ---------------------------------------------------------- configuration --

export class OAuthConfigurationError extends Error {
  constructor() { super('Invalid OAuth configuration. See runtime/README.md.'); }
}

/** OAuth is OFF unless all three of its settings are present.
 *
 * That default matters: an existing deployment that sets none of them keeps
 * the exact behaviour it has today, and the static bearer credential stays
 * the only way in. Turning OAuth on is a deliberate act with its own
 * prerequisites, not something a version bump does by itself.
 */
export function loadOAuthConfiguration(environment) {
  const publicUrl = environment.NEOMUNDI_MCP_PUBLIC_URL;
  const signingKey = environment.NEOMUNDI_OAUTH_SIGNING_KEY;
  const registryPath = environment.NEOMUNDI_OAUTH_REGISTRY;
  const declared = [publicUrl, signingKey, registryPath].filter((v) => v !== undefined && v !== '');
  if (declared.length === 0) return Object.freeze({ enabled: false });
  // Partial configuration is refused rather than half-enabled: a server that
  // advertised an authorization endpoint it could not sign for would send
  // every user into a flow that cannot complete.
  if (declared.length !== 3) throw new OAuthConfigurationError();

  let url;
  try { url = new URL(publicUrl); } catch { throw new OAuthConfigurationError(); }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new OAuthConfigurationError();
  }
  // A short signing key is a silent downgrade of every signature on this
  // page, so it is refused loudly instead.
  if (typeof signingKey !== 'string' || Buffer.byteLength(signingKey, 'utf8') < 32 || signingKey.length > 4096) {
    throw new OAuthConfigurationError();
  }
  const seconds = (value, fallback, maximum) => {
    if (value === undefined || value === '') return fallback;
    if (!/^\d+$/.test(value)) throw new OAuthConfigurationError();
    const number = Number(value);
    if (!Number.isSafeInteger(number) || number < 60 || number > maximum) throw new OAuthConfigurationError();
    return number;
  };
  const quota = environment.NEOMUNDI_OAUTH_QUOTA_PER_SUBJECT;
  if (quota !== undefined && quota !== '' && !/^\d+$/.test(quota)) throw new OAuthConfigurationError();

  const issuer = url.origin;
  return Object.freeze({
    enabled: true,
    issuer,
    // The most specific canonical URI the server can name, as the MCP
    // specification asks. `aud` is bound to exactly this string.
    resource: `${issuer}/mcp`,
    // Accepted as aliases on the way in, because a client that discovered the
    // origin form should not be sent into a dead end. Only `resource` above
    // is ever minted into a token.
    resourceAliases: Object.freeze([issuer, `${issuer}/`, `${issuer}/mcp`]),
    signingKey,
    registryPath,
    accessTtl: seconds(environment.NEOMUNDI_OAUTH_ACCESS_TTL_S, 3600, 86400),
    refreshTtl: seconds(environment.NEOMUNDI_OAUTH_REFRESH_TTL_S, 2592000, 31536000),
    // Undefined means no counting happens at all -- see the note in
    // `createAuthorizationServer`.
    quotaPerSubject: quota === undefined || quota === '' ? undefined : Number(quota),
  });
}

// ------------------------------------------------------------- client ids --

/** A `client_id` that carries its own registration.
 *
 * Format: `nmc1.<payload>.<signature>`. The prefix is there so an operator
 * reading a log line can tell what they are looking at without decoding it.
 */
export function issueClientId(oauth, metadata) {
  const payload = jsonPart({
    redirect_uris: metadata.redirect_uris,
    client_name: metadata.client_name ?? null,
    iat: now(),
  });
  const signature = b64u(createHmac('sha256', oauth.signingKey).update(`${TYPE.client}.${payload}`).digest());
  return `nmc1.${payload}.${signature}`;
}

export function readClientId(oauth, clientId) {
  if (typeof clientId !== 'string' || clientId.length > 4096) return null;
  const parts = clientId.split('.');
  if (parts.length !== 3 || parts[0] !== 'nmc1') return null;
  const [, payload, signature] = parts;
  const expected = createHmac('sha256', oauth.signingKey).update(`${TYPE.client}.${payload}`).digest();
  const supplied = unb64u(signature);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
  try {
    const metadata = JSON.parse(unb64u(payload).toString('utf8'));
    if (!Array.isArray(metadata?.redirect_uris) || metadata.redirect_uris.length === 0) return null;
    return metadata;
  } catch { return null; }
}

/** Redirect URIs are compared as exact strings, never parsed and re-compared
 * component by component. Open redirection on an authorization endpoint is
 * the classic way to hand an authorization code to someone else, and every
 * normalisation step is a place where two different URIs start comparing
 * equal.
 */
export function redirectAllowed(metadata, redirectUri) {
  return typeof redirectUri === 'string' && metadata.redirect_uris.includes(redirectUri);
}

/** A registration request is accepted only if every redirect URI is an
 * absolute HTTPS URL without credentials or a fragment. Loopback HTTP is
 * allowed as well, for a local MCP client doing the same flow.
 */
export function validRedirectUri(value) {
  if (typeof value !== 'string' || value.length > 2048) return false;
  let url;
  try { url = new URL(value); } catch { return false; }
  if (url.username || url.password || url.hash) return false;
  if (url.protocol === 'https:') return true;
  return url.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
}

// ------------------------------------------------------------ token logic --

export function issueAccessToken(oauth, { subject, epoch, scope, clientId }) {
  const issued = now();
  return sign(oauth.signingKey, TYPE.access, {
    iss: oauth.issuer,
    sub: subject,
    aud: oauth.resource,
    client_id: clientId,
    scope,
    epoch,
    jti: randomUUID(),
    iat: issued,
    exp: issued + oauth.accessTtl,
  });
}

export function issueRefreshToken(oauth, { subject, epoch, scope, clientId }) {
  const issued = now();
  return sign(oauth.signingKey, TYPE.refresh, {
    iss: oauth.issuer,
    sub: subject,
    aud: oauth.resource,
    client_id: clientId,
    scope,
    epoch,
    jti: randomUUID(),
    iat: issued,
    exp: issued + oauth.refreshTtl,
  });
}

/** Resource-server validation.
 *
 * The audience check is not a formality: a token minted for another resource
 * by the same authorization server must not open this one. The MCP
 * specification says a server MUST validate that a token was issued
 * specifically for it, and this is where that happens.
 *
 * The registry check after the signature check is what makes revocation real.
 * A signed token cannot be withdrawn, so the question asked here is not "is
 * this token still valid" but "is this participant still allowed" -- and that
 * answer comes from a file the operator controls.
 */
export function verifyAccessToken(oauth, token, { registry, revoked }) {
  const result = verify(oauth.signingKey, TYPE.access, token);
  if (!result.ok) return { ok: false, reason: result.reason };
  const claims = result.claims;
  if (claims.iss !== oauth.issuer) return { ok: false, reason: 'wrong_issuer' };
  const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!audience.includes(oauth.resource)) return { ok: false, reason: 'wrong_audience' };
  if (typeof claims.sub !== 'string') return { ok: false, reason: 'malformed' };
  if (revoked?.has(claims.jti)) return { ok: false, reason: 'revoked' };

  const participant = registry.participants.get(claims.sub);
  if (!participant) return { ok: false, reason: 'unknown_subject' };
  if (!participant.enabled) return { ok: false, reason: 'participant_disabled' };
  if (participant.epoch !== claims.epoch) return { ok: false, reason: 'credentials_rotated' };

  const granted = String(claims.scope ?? '').split(' ').filter(Boolean);
  // A scope removed from the registry stops working immediately, without
  // waiting for the token to expire.
  const effective = granted.filter((s) => participant.scopes.includes(s));
  if (!effective.includes(MEASURE_SCOPE)) return { ok: false, reason: 'insufficient_scope', scope: MEASURE_SCOPE };
  return { ok: true, subject: claims.sub, scope: effective.join(' '), jti: claims.jti, expiresAt: claims.exp };
}

// ----------------------------------------------------------------- server --

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);

/** The sign-in page.
 *
 * Self-contained by necessity and by choice: it loads no font, no script and
 * no image, so it needs no content security policy exception and leaks no
 * request to a third party at the exact moment a participant is typing a
 * secret. It states which client is asking and what it will be able to do,
 * because an authorization screen that does not say that is a consent screen
 * in name only.
 */
function authorizePage({ issuer, clientName, scope, request, error, resource }) {
  const rows = [
    ['Service', escapeHtml(issuer)],
    ['Ressource', escapeHtml(resource)],
    ['Client demandeur', escapeHtml(clientName ?? 'client non nommé')],
    ['Autorisation demandée', escapeHtml(scope)],
  ].map(([k, v]) => `<tr><th scope="row">${k}</th><td>${v}</td></tr>`).join('');
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Autoriser l'accès — NeoMundi</title>
<style>
 :root{color-scheme:light dark}
 body{margin:0;padding:2rem 1rem;font:16px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif;background:#f4f6f8;color:#14161a}
 main{max-width:34rem;margin:0 auto;background:#fff;border:1px solid #d8dce3;border-radius:14px;padding:1.75rem}
 h1{font-size:1.25rem;margin:0 0 .25rem}
 p.lede{margin:0 0 1.25rem;color:#5b6370}
 table{width:100%;border-collapse:collapse;margin:0 0 1.5rem;font-size:.9rem}
 th{text-align:left;font-weight:500;color:#5b6370;padding:.35rem .75rem .35rem 0;vertical-align:top;white-space:nowrap}
 td{padding:.35rem 0;word-break:break-all}
 label{display:block;font-size:.85rem;color:#5b6370;margin:0 0 .3rem}
 input{width:100%;box-sizing:border-box;padding:.6rem .7rem;font:inherit;border:1px solid #c6ccd6;border-radius:8px;background:#fff;color:inherit;margin:0 0 1rem}
 button{width:100%;padding:.7rem;font:inherit;font-weight:600;border:0;border-radius:8px;background:#1b4965;color:#fff;cursor:pointer}
 .error{border-left:3px solid #14161a;background:#f4f6f8;padding:.6rem .8rem;margin:0 0 1.25rem;font-size:.9rem}
 footer{margin:1.5rem 0 0;font-size:.8rem;color:#8b929d}
 @media(prefers-color-scheme:dark){
  body{background:#05070d;color:#e8ecf2}
  main{background:#101520;border-color:#242a36}
  p.lede,th,footer{color:#9aa3b2}
  input{background:#05070d;border-color:#242a36;color:#e8ecf2}
  button{background:#7fb2cc;color:#05070d}
  .error{background:#101520;border-left-color:#e8ecf2}
 }
</style></head>
<body><main>
<h1>Autoriser l'accès à la mesure NeoMundi</h1>
<p class="lede">Identifiez-vous avec le code de participant remis par l'association.</p>
${error ? `<p class="error">${escapeHtml(error)}</p>` : ''}
<table>${rows}</table>
<form method="post" action="/oauth/authorize" autocomplete="off">
<input type="hidden" name="request" value="${escapeHtml(request)}">
<label for="participant">Code de participant</label>
<input id="participant" name="participant" type="text" required autocapitalize="off" autocorrect="off" spellcheck="false">
<label for="secret">Secret</label>
<input id="secret" name="secret" type="password" required autocomplete="current-password">
<button type="submit">Autoriser</button>
</form>
<footer>Une mesure ne donne aucune autorisation d'exécution et ne vaut pas verdict de conformité. L'accès est nominatif et révocable.</footer>
</main></body></html>`;
}

function errorPage(title, detail) {
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)} — NeoMundi</title>
<style>:root{color-scheme:light dark}body{margin:0;padding:2rem 1rem;font:16px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif;background:#f4f6f8;color:#14161a}main{max-width:34rem;margin:0 auto;background:#fff;border:1px solid #d8dce3;border-radius:14px;padding:1.75rem}h1{font-size:1.15rem;margin:0 0 .5rem}p{margin:0;color:#5b6370}@media(prefers-color-scheme:dark){body{background:#05070d;color:#e8ecf2}main{background:#101520;border-color:#242a36}p{color:#9aa3b2}}</style>
</head><body><main><h1>${escapeHtml(title)}</h1><p>${escapeHtml(detail)}</p></main></body></html>`;
}

async function readFormBody(request, limit) {
  const chunks = [];
  let length = 0;
  for await (const chunk of request) {
    length += chunk.length;
    if (length > limit) { request.resume(); throw new Error('body_too_large'); }
    chunks.push(chunk);
  }
  return new URLSearchParams(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)));
}

/** The authorization server, as a request handler the MCP server mounts in
 * front of its own credential gate.
 *
 * Every route here is deliberately UNAUTHENTICATED: discovery documents a
 * client reads before it has any credential, a registration endpoint, a login
 * page, and a token endpoint. Putting the existing bearer gate in front of
 * them is what makes OAuth impossible, which is exactly the state this
 * replaces.
 */
export function createAuthorizationServer({ oauth, registryReader = readRegistry }) {
  // Single-use enforcement for authorization codes, and a revocation list for
  // tokens that have not expired yet. Both are bounded by their own
  // expiries and both are in memory on purpose: see the header.
  const spentCodes = new Map();
  const revoked = new Map();
  // Per-participant call counting. `undefined` quota means this map is never
  // written to -- the connector then holds nothing about anyone between
  // requests, which is what its published privacy statement says today.
  const consumption = new Map();

  const sweep = () => {
    const cutoff = now();
    for (const [jti, exp] of spentCodes) if (exp <= cutoff) spentCodes.delete(jti);
    for (const [jti, exp] of revoked) if (exp <= cutoff) revoked.delete(jti);
  };
  const timer = setInterval(sweep, 60000);
  timer.unref();

  const sendJson = (response, status, value, headers = {}) => {
    if (response.destroyed || response.writableEnded) return;
    response.writeHead(status, {
      'Cache-Control': 'no-store', 'Pragma': 'no-cache', 'X-Content-Type-Options': 'nosniff',
      'Content-Type': 'application/json; charset=utf-8', ...headers,
    });
    response.end(JSON.stringify(value));
  };
  const sendHtml = (response, status, html) => {
    if (response.destroyed || response.writableEnded) return;
    response.writeHead(status, {
      'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
      // The page carries a form and a secret field. It loads nothing, so the
      // policy that describes it is the strictest one that still works.
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
      'Referrer-Policy': 'no-referrer',
      'Content-Type': 'text/html; charset=utf-8',
    });
    response.end(html);
  };
  const redirect = (response, location) => {
    if (response.destroyed || response.writableEnded) return;
    response.writeHead(302, { Location: location, 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' });
    response.end();
  };

  /** RFC 9207: `iss` travels on every authorization response, success and
   * error alike. ChatGPT records the issuer before redirecting and compares
   * it on the way back; advertising the parameter and then omitting it on an
   * error response is worse than not advertising it at all.
   */
  const redirectBack = (response, redirectUri, parameters) => {
    const url = new URL(redirectUri);
    for (const [key, value] of Object.entries(parameters)) {
      if (value !== undefined && value !== null) url.searchParams.set(key, value);
    }
    url.searchParams.set('iss', oauth.issuer);
    redirect(response, url.toString());
  };

  const protectedResourceMetadata = () => ({
    resource: oauth.resource,
    authorization_servers: [oauth.issuer],
    scopes_supported: [...SCOPES_SUPPORTED],
    bearer_methods_supported: ['header'],
    resource_name: 'NeoMundi measurement MCP',
    resource_documentation: 'https://github.com/neomundi-io/neomundi-measurement-mcp',
    resource_policy_uri: 'https://neomundi.org/politique-de-confidentialite',
    resource_tos_uri: 'https://neomundi.org/cgu',
  });

  const authorizationServerMetadata = () => ({
    issuer: oauth.issuer,
    authorization_endpoint: `${oauth.issuer}/oauth/authorize`,
    token_endpoint: `${oauth.issuer}/oauth/token`,
    registration_endpoint: `${oauth.issuer}/oauth/register`,
    revocation_endpoint: `${oauth.issuer}/oauth/revoke`,
    scopes_supported: [...SCOPES_SUPPORTED],
    response_types_supported: ['code'],
    response_modes_supported: ['query'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    // Public client plus PKCE. No client secret is issued, so there is no
    // client secret to leak, rotate, or lose across a redeploy.
    token_endpoint_auth_methods_supported: ['none'],
    revocation_endpoint_auth_methods_supported: ['none'],
    code_challenge_methods_supported: ['S256'],
    // Declared true because `iss` is genuinely returned on every
    // authorization response below -- which is what lets ChatGPT use its
    // stable redirect URI instead of a per-callback one.
    authorization_response_iss_parameter_supported: true,
    resource_indicators_supported: true,
    service_documentation: 'https://github.com/neomundi-io/neomundi-measurement-mcp',
    ui_locales_supported: ['fr'],
  });

  function handleRegister(response, body) {
    if (body === null || typeof body !== 'object' || Array.isArray(body)) {
      sendJson(response, 400, { error: 'invalid_client_metadata' }); return;
    }
    const uris = body.redirect_uris;
    if (!Array.isArray(uris) || uris.length === 0 || uris.length > 10 || !uris.every(validRedirectUri)) {
      sendJson(response, 400, { error: 'invalid_redirect_uri' }); return;
    }
    const methods = body.grant_types ?? ['authorization_code'];
    if (!Array.isArray(methods) || methods.some((g) => !['authorization_code', 'refresh_token'].includes(g))) {
      sendJson(response, 400, { error: 'invalid_client_metadata' }); return;
    }
    if (body.token_endpoint_auth_method !== undefined && body.token_endpoint_auth_method !== 'none') {
      // Only the public-client flow exists here, so a client asking for a
      // secret is told plainly rather than silently registered without one.
      sendJson(response, 400, { error: 'invalid_client_metadata' }); return;
    }
    const clientName = typeof body.client_name === 'string' ? body.client_name.slice(0, 200) : null;
    const clientId = issueClientId(oauth, { redirect_uris: uris, client_name: clientName });
    sendJson(response, 201, {
      client_id: clientId,
      // No expiry: a registration that lapses is an `invalid_client` for
      // every already-connected user at an unpredictable moment.
      client_id_issued_at: now(),
      client_secret_expires_at: 0,
      redirect_uris: uris,
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
      ...(clientName === null ? {} : { client_name: clientName }),
    });
  }

  /** Shared by GET (first display) and POST (submitted credentials): the
   * authorization request is validated once and then carried through the form
   * as a signed blob, so no server-side login session has to exist.
   */
  function validateAuthorizationRequest(parameters) {
    const clientId = parameters.get('client_id');
    const redirectUri = parameters.get('redirect_uri');
    const metadata = readClientId(oauth, clientId);
    // A bad client or redirect URI must NOT be redirected to: that is how an
    // authorization code reaches an address the client never registered.
    if (!metadata) return { fatal: 'Client inconnu ou identifiant de client altéré.' };
    if (redirectUri === null || !redirectAllowed(metadata, redirectUri)) {
      return { fatal: "L'adresse de redirection ne fait pas partie de celles enregistrées par ce client." };
    }
    const state = parameters.get('state') ?? undefined;
    const fail = (error, description) => ({ redirectUri, state, error, description });

    if (parameters.get('response_type') !== 'code') return fail('unsupported_response_type', 'Only the authorization code flow is supported.');
    if (parameters.get('code_challenge_method') !== 'S256') return fail('invalid_request', 'PKCE with S256 is required.');
    const challenge = parameters.get('code_challenge');
    if (typeof challenge !== 'string' || !/^[A-Za-z0-9\-._~]{43,128}$/.test(challenge)) {
      return fail('invalid_request', 'A valid S256 code challenge is required.');
    }
    const resource = parameters.get('resource');
    if (resource !== null && !oauth.resourceAliases.includes(resource)) {
      return fail('invalid_target', 'The resource parameter does not identify this MCP server.');
    }
    const requested = (parameters.get('scope') ?? MEASURE_SCOPE).split(' ').filter(Boolean);
    if (requested.some((s) => !SCOPES_SUPPORTED.includes(s))) return fail('invalid_scope', 'Unknown scope.');
    const scope = requested.length ? requested.join(' ') : MEASURE_SCOPE;
    return { ok: true, clientId, metadata, redirectUri, state, challenge, scope };
  }

  function handleAuthorizeGet(response, parameters) {
    const validated = validateAuthorizationRequest(parameters);
    if (validated.fatal) { sendHtml(response, 400, errorPage('Demande refusée', validated.fatal)); return; }
    if (!validated.ok) {
      redirectBack(response, validated.redirectUri, {
        error: validated.error, error_description: validated.description, state: validated.state,
      });
      return;
    }
    const request = sign(oauth.signingKey, TYPE.request, {
      client_id: validated.clientId,
      redirect_uri: validated.redirectUri,
      state: validated.state ?? null,
      code_challenge: validated.challenge,
      scope: validated.scope,
      iat: now(),
      exp: now() + 600,
    });
    sendHtml(response, 200, authorizePage({
      issuer: oauth.issuer, resource: oauth.resource,
      clientName: validated.metadata.client_name, scope: validated.scope, request,
    }));
  }

  async function handleAuthorizePost(response, body) {
    const carried = verify(oauth.signingKey, TYPE.request, body.get('request') ?? '');
    if (!carried.ok) {
      sendHtml(response, 400, errorPage('Demande expirée', "Reprenez la connexion depuis le client : la demande d'autorisation n'est plus valide."));
      return;
    }
    const claims = carried.claims;
    const metadata = readClientId(oauth, claims.client_id);
    if (!metadata || !redirectAllowed(metadata, claims.redirect_uri)) {
      sendHtml(response, 400, errorPage('Demande refusée', 'Client inconnu ou adresse de redirection non enregistrée.'));
      return;
    }
    const again = (message) => sendHtml(response, 401, authorizePage({
      issuer: oauth.issuer, resource: oauth.resource, clientName: metadata.client_name,
      scope: claims.scope, request: body.get('request'), error: message,
    }));

    const registry = registryReader(oauth.registryPath);
    const participant = registry.participants.get(body.get('participant') ?? '');
    // One message for every failure: an unknown participant and a wrong
    // secret must not be distinguishable, or the page becomes a way to
    // enumerate who holds an access.
    const generic = 'Code de participant ou secret incorrect, ou accès suspendu.';
    if (!participant || !participant.enabled) { again(generic); return; }
    if (!secretMatches(participant.secret, body.get('secret') ?? '')) { again(generic); return; }

    const granted = claims.scope.split(' ').filter((s) => participant.scopes.includes(s));
    if (!granted.includes(MEASURE_SCOPE)) {
      redirectBack(response, claims.redirect_uri, {
        error: 'access_denied',
        error_description: 'This participant is not granted the requested scope.',
        state: claims.state ?? undefined,
      });
      return;
    }
    const issued = now();
    const code = sign(oauth.signingKey, TYPE.code, {
      sub: participant.subject,
      epoch: participant.epoch,
      client_id: claims.client_id,
      redirect_uri: claims.redirect_uri,
      code_challenge: claims.code_challenge,
      scope: granted.join(' '),
      jti: randomUUID(),
      iat: issued,
      // Short on purpose: an authorization code is a bearer credential in a
      // URL, and a URL ends up in history, in a referrer, and in a log.
      exp: issued + 60,
    });
    redirectBack(response, claims.redirect_uri, { code, state: claims.state ?? undefined });
  }

  function tokenError(response, error, description, status = 400) {
    sendJson(response, status, { error, error_description: description });
  }

  function handleToken(response, body) {
    const grantType = body.get('grant_type');
    const clientId = body.get('client_id');
    const metadata = readClientId(oauth, clientId);
    if (!metadata) { tokenError(response, 'invalid_client', 'Unknown or altered client identifier.', 401); return; }

    const resource = body.get('resource');
    if (resource !== null && !oauth.resourceAliases.includes(resource)) {
      tokenError(response, 'invalid_target', 'The resource parameter does not identify this MCP server.'); return;
    }
    const registry = registryReader(oauth.registryPath);

    if (grantType === 'authorization_code') {
      const result = verify(oauth.signingKey, TYPE.code, body.get('code') ?? '');
      if (!result.ok) { tokenError(response, 'invalid_grant', 'The authorization code is invalid or expired.'); return; }
      const claims = result.claims;
      // Single use. A replayed code is a stolen code until proven otherwise.
      if (spentCodes.has(claims.jti)) { tokenError(response, 'invalid_grant', 'This authorization code has already been used.'); return; }
      if (claims.client_id !== clientId) { tokenError(response, 'invalid_grant', 'The code was issued to a different client.'); return; }
      if (claims.redirect_uri !== body.get('redirect_uri')) { tokenError(response, 'invalid_grant', 'The redirect URI does not match the authorization request.'); return; }
      const verifier = body.get('code_verifier');
      if (typeof verifier !== 'string' || !/^[A-Za-z0-9\-._~]{43,128}$/.test(verifier)) {
        tokenError(response, 'invalid_grant', 'A valid PKCE code verifier is required.'); return;
      }
      const computed = createHash('sha256').update(verifier, 'ascii').digest('base64url');
      if (!sameSecret(computed, claims.code_challenge)) { tokenError(response, 'invalid_grant', 'The PKCE code verifier does not match.'); return; }

      const participant = registry.participants.get(claims.sub);
      if (!participant || !participant.enabled || participant.epoch !== claims.epoch) {
        tokenError(response, 'invalid_grant', 'The participant access is suspended or has been rotated.'); return;
      }
      spentCodes.set(claims.jti, claims.exp);
      issueTokenPair(response, { subject: claims.sub, epoch: participant.epoch, scope: claims.scope, clientId });
      return;
    }

    if (grantType === 'refresh_token') {
      const result = verify(oauth.signingKey, TYPE.refresh, body.get('refresh_token') ?? '');
      if (!result.ok) { tokenError(response, 'invalid_grant', 'The refresh token is invalid or expired.'); return; }
      const claims = result.claims;
      if (claims.client_id !== clientId) { tokenError(response, 'invalid_grant', 'The refresh token was issued to a different client.'); return; }
      if (revoked.has(claims.jti)) { tokenError(response, 'invalid_grant', 'This refresh token has been revoked.'); return; }
      const participant = registry.participants.get(claims.sub);
      if (!participant || !participant.enabled || participant.epoch !== claims.epoch) {
        tokenError(response, 'invalid_grant', 'The participant access is suspended or has been rotated.'); return;
      }
      const scope = String(claims.scope ?? '').split(' ').filter((s) => participant.scopes.includes(s));
      if (!scope.includes(MEASURE_SCOPE)) { tokenError(response, 'invalid_scope', 'The participant no longer holds the granted scope.'); return; }
      // Rotation: the presented refresh token stops working the moment a new
      // one is issued, so a stolen copy has a bounded life.
      revoked.set(claims.jti, claims.exp);
      issueTokenPair(response, { subject: claims.sub, epoch: participant.epoch, scope: scope.join(' '), clientId });
      return;
    }

    tokenError(response, 'unsupported_grant_type', 'Only authorization_code and refresh_token are supported.');
  }

  function issueTokenPair(response, grant) {
    sendJson(response, 200, {
      access_token: issueAccessToken(oauth, grant),
      token_type: 'Bearer',
      expires_in: oauth.accessTtl,
      refresh_token: issueRefreshToken(oauth, grant),
      scope: grant.scope,
    });
  }

  /** RFC 7009: always 200, whatever the token was. Telling a caller that a
   * token was already unknown is telling them something about a token they
   * may not own.
   */
  function handleRevoke(response, body) {
    const token = body.get('token') ?? '';
    for (const type of [TYPE.access, TYPE.refresh]) {
      const result = verify(oauth.signingKey, type, token);
      if (result.ok && typeof result.claims.jti === 'string') revoked.set(result.claims.jti, result.claims.exp);
    }
    sendJson(response, 200, {});
  }

  /** Per-participant consumption. Returns false when the ceiling is reached.
   *
   * Counting only happens when a ceiling is configured. Left unset, nothing
   * about any participant is held between requests -- which keeps the
   * published statement that this connector retains nothing true, and makes
   * turning quotas on a deliberate act that has a documentation consequence.
   */
  function consume(subject) {
    if (oauth.quotaPerSubject === undefined) return { allowed: true };
    const used = (consumption.get(subject) ?? 0) + 1;
    if (used > oauth.quotaPerSubject) return { allowed: false, used: used - 1, limit: oauth.quotaPerSubject };
    consumption.set(subject, used);
    return { allowed: true, used, limit: oauth.quotaPerSubject };
  }

  /** Handles an OAuth route. Returns true when it answered, false when the
   * path is not one of its own and the caller should carry on.
   */
  async function handle(request, response, pathname) {
    const method = request.method;
    const json = (status, value) => { sendJson(response, status, value); return true; };

    if (pathname === '/.well-known/oauth-protected-resource'
        || pathname === '/.well-known/oauth-protected-resource/mcp') {
      if (method !== 'GET' && method !== 'HEAD') return json(405, { error: 'method_not_allowed' });
      return json(200, protectedResourceMetadata());
    }
    if (pathname === '/.well-known/oauth-authorization-server'
        || pathname === '/.well-known/oauth-authorization-server/mcp') {
      if (method !== 'GET' && method !== 'HEAD') return json(405, { error: 'method_not_allowed' });
      return json(200, authorizationServerMetadata());
    }

    if (pathname === '/oauth/register') {
      if (method !== 'POST') return json(405, { error: 'method_not_allowed' });
      let body;
      try { body = JSON.parse(await readRawBody(request, 16384)); }
      catch { return json(400, { error: 'invalid_client_metadata' }); }
      handleRegister(response, body);
      return true;
    }

    if (pathname === '/oauth/authorize') {
      if (method === 'GET') {
        handleAuthorizeGet(response, new URL(request.url, oauth.issuer).searchParams);
        return true;
      }
      if (method === 'POST') {
        let body;
        try { body = await readFormBody(request, 16384); }
        catch { sendHtml(response, 400, errorPage('Demande refusée', 'Formulaire illisible.')); return true; }
        await handleAuthorizePost(response, body);
        return true;
      }
      return json(405, { error: 'method_not_allowed' });
    }

    if (pathname === '/oauth/token' || pathname === '/oauth/revoke') {
      if (method !== 'POST') return json(405, { error: 'method_not_allowed' });
      let body;
      try { body = await readFormBody(request, 16384); }
      catch { return json(400, { error: 'invalid_request' }); }
      if (pathname === '/oauth/token') handleToken(response, body);
      else handleRevoke(response, body);
      return true;
    }

    return false;
  }

  return {
    handle,
    consume,
    metadata: { protectedResource: protectedResourceMetadata, authorizationServer: authorizationServerMetadata },
    verify: (token) => verifyAccessToken(oauth, token, { registry: registryReader(oauth.registryPath), revoked: new Set(revoked.keys()) }),
    close: () => clearInterval(timer),
    // Exposed for tests and for an operator reading state in a REPL. Never
    // written to a log.
    _internals: { spentCodes, revoked, consumption },
  };
}

async function readRawBody(request, limit) {
  const chunks = [];
  let length = 0;
  for await (const chunk of request) {
    length += chunk.length;
    if (length > limit) { request.resume(); throw new Error('body_too_large'); }
    chunks.push(chunk);
  }
  return new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks));
}

/** The challenge a resource server owes an unauthenticated client.
 *
 * `resource_metadata` is what turns a 401 into a discoverable starting point:
 * without it a client that has never seen this server has nowhere to look.
 */
export function challengeHeader(oauth, { error, description } = {}) {
  if (!oauth?.enabled) return 'Bearer realm="neomundi-private-mcp"';
  const parts = [
    `realm="neomundi-private-mcp"`,
    `resource_metadata="${oauth.issuer}/.well-known/oauth-protected-resource"`,
    `scope="${MEASURE_SCOPE}"`,
  ];
  if (error) parts.splice(1, 0, `error="${error}"`);
  if (description) parts.push(`error_description="${description.replace(/["\\]/g, '')}"`);
  return `Bearer ${parts.join(', ')}`;
}

export const __testing = { TYPE, sameSecret, randomBytes };

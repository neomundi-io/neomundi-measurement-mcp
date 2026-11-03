import http from 'node:http';
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { loadConfiguration } from './config.mjs';
import { isObject, owns, parseInputJson, scalar, toolDefinition } from './contract.mjs';
import { measureExecution } from './adapter.mjs';
import { CARD_RESOURCE_URI, cardResource } from './ui/card.mjs';
import { MEASURE_SCOPE, challengeHeader, createAuthorizationServer, loadOAuthConfiguration, originPolicy, originRefusedPage, pageOrigins } from './oauth.mjs';

export const SUPPORTED_PROTOCOLS = Object.freeze(['2025-06-18', '2025-03-26']);
const digest = (value) => createHash('sha256').update(value).digest();
const requestId = (id) => {
  const value = scalar(id);
  return (typeof value === 'string' && value.length <= 256) || (typeof value === 'number' && Number.isSafeInteger(value));
};
const idKey = (id) => JSON.stringify(scalar(id));

function send(response, status, value, extraHeaders = {}) {
  if (response.destroyed || response.writableEnded) return;
  response.writeHead(status, {
    'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
    ...(value === undefined ? {} : { 'Content-Type': 'application/json; charset=utf-8' }),
    ...extraHeaders,
  });
  response.end(value === undefined ? undefined : JSON.stringify(value));
}
function rpcError(response, id, code, message, status = 200) {
  send(response, status, { jsonrpc: '2.0', id, error: { code, message } });
}
const rpcResult = (response, id, result, headers) => send(response, 200, { jsonrpc: '2.0', id, result }, headers);

async function readBody(request, limit) {
  const chunks = [];
  let length = 0;
  for await (const chunk of request.iterator({ destroyOnReturn: false })) {
    length += chunk.length;
    if (length > limit) { request.resume(); throw new Error('body_too_large'); }
    chunks.push(chunk);
  }
  return new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks));
}

function acceptsBoth(header) {
  const media = new Set((header ?? '').split(',').flatMap((part) => {
    const [type, ...parameters] = part.trim().toLowerCase().split(';');
    if (parameters.some((p) => /^\s*q\s*=\s*0(?:\.0*)?\s*$/.test(p))) return [];
    return [type.trim()];
  }));
  return media.has('application/json') && media.has('text/event-stream');
}

/** Minimal, stateful Streamable HTTP MCP subset. All MCP POST responses use
 * application/json (allowed by Streamable HTTP); GET SSE is deliberately 405.
 * NeoMundi's upstream SSE is a separate transport consumed by the adapter.
 * No SDK, downloaded package, background API access, or request logging.
 */
export function createMcpServer({ config, oauth = { enabled: false }, registryReader, fetchImpl = globalThis.fetch }) {
  const sessions = new Map();
  const expectedCredential = digest(`Bearer ${config.mcpKey}`);
  // Built only when OAuth is configured. Left unconfigured, not one byte of
  // this changes how the server behaves: the static credential stays the only
  // way in, no discovery document is served, and the 401 challenge keeps the
  // exact shape it had.
  const authorizationServer = oauth.enabled
    ? createAuthorizationServer({ oauth, ...(registryReader ? { registryReader } : {}) })
    : null;
  let activeCalls = 0;
  let closing = false;

  const endSession = (id) => {
    const session = sessions.get(id);
    if (!session) return;
    for (const controller of session.active.values()) controller.abort();
    sessions.delete(id);
  };
  const expire = () => {
    for (const [id, session] of sessions) if (session.expiresAt <= Date.now()) endSession(id);
  };
  const sweep = setInterval(expire, Math.min(config.sessionTtlMs, 60000));
  sweep.unref();

  const server = http.createServer({ maxHeaderSize: 16384 }, (request, response) => {
    void dispatch(request, response).catch(() => {
      // Never log an exception object, request, header, body or secret.
      send(response, 500, { error: 'internal_transport_error' });
    });
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  server.keepAliveTimeout = 5000;
  server.on('close', () => clearInterval(sweep));

  async function dispatch(request, response) {
    if (closing) { send(response, 503, { error: 'server_closing' }); return; }
    const port = server.address()?.port;
    const loopbackHosts = [`127.0.0.1:${port}`, `localhost:${port}`];
    // Explicitly named hosts only, and never derived from the bind address:
    // the empty default keeps the loopback-only posture untouched.
    const configuredHosts = config.allowedHosts ?? [];
    const hosts = new Set([...loopbackHosts, ...configuredHosts]);
    if (!hosts.has(request.headers.host)) { send(response, 403, { error: 'invalid_host' }); return; }
    const origin = request.headers.origin;
    // Loopback keeps plaintext only. A named host is reached through TLS
    // termination it does not perform itself, so both schemes are accepted
    // for it and for it alone. An absent Origin stays allowed: a server-side
    // MCP client sends none, and the Host check above already ran.
    const origins = new Set([
      ...loopbackHosts.map((host) => `http://${host}`),
      ...configuredHosts.flatMap((host) => [`https://${host}`, `http://${host}`]),
    ]);
    const pathname = new URL(request.url, 'http://host.invalid').pathname;
    // Three route classes, three rules. See `originPolicy` for why they are
    // not the same rule: a protocol endpoint, a page that carries a secret,
    // and a JSON-RPC API are protected by different things, and giving them
    // one shared Origin gate both blocked the honest caller and protected
    // nothing the protocol did not already protect.
    const policy = authorizationServer ? originPolicy(pathname) : 'api';
    if (policy !== 'protocol' && origin !== undefined) {
      const accepted = policy === 'page' ? pageOrigins(oauth, loopbackHosts) : origins;
      if (!accepted.has(origin)) {
        // Refused either way. The only difference is that a person who
        // arrived through a browser is told why: answering a browser with a
        // page of JSON naming a header they cannot see is how a deployment
        // looks broken without saying what broke.
        if (policy === 'page') {
          response.writeHead(403, {
            'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
            'Content-Type': 'text/html; charset=utf-8',
          });
          response.end(originRefusedPage(origin));
          return;
        }
        send(response, 403, { error: 'invalid_origin' }); return;
      }
    }
    // The OAuth surface sits IN FRONT of the credential gate, and has to.
    // Every one of its routes is something a client reads before it holds any
    // credential at all: the discovery documents, the registration endpoint,
    // the sign-in page, the token endpoint. Putting the bearer check in front
    // of them is precisely what made OAuth impossible here.
    if (authorizationServer && await authorizationServer.handle(request, response, pathname)) return;

    const authCount = request.rawHeaders.filter((_entry, i) => i % 2 === 0 && request.rawHeaders[i].toLowerCase() === 'authorization').length;
    const supplied = request.headers.authorization;
    // Two accepted credentials, checked in this order and never blended:
    //
    //   1. the static key, which is what Codex, a local client and every
    //      existing deployment use. It is NOT removed by adding OAuth, and
    //      removing it would break a working installation to no benefit.
    //   2. an OAuth access token, which is the only thing ChatGPT can
    //      present.
    //
    // The static key carries no subject: it is one shared credential and the
    // server does not pretend otherwise by inventing an identity for it.
    let identity = null;
    const staticMatch = authCount === 1 && typeof supplied === 'string' && timingSafeEqual(digest(supplied), expectedCredential);
    if (staticMatch) {
      identity = { subject: null, scope: MEASURE_SCOPE, via: 'static_key' };
    } else if (authorizationServer && authCount === 1 && typeof supplied === 'string' && /^Bearer\s/.test(supplied)) {
      const verdict = authorizationServer.verify(supplied.replace(/^Bearer\s+/, ''));
      if (verdict.ok) {
        identity = { subject: verdict.subject, scope: verdict.scope, via: 'oauth' };
      } else if (verdict.reason === 'insufficient_scope') {
        // 403, not 401: the token is valid, the permission is not. Answering
        // 401 would send the client back through a login that would grant it
        // exactly the same thing.
        send(response, 403, { error: 'insufficient_scope' },
          { 'WWW-Authenticate': challengeHeader(oauth, { error: 'insufficient_scope' }) });
        return;
      }
    }
    if (!identity) {
      send(response, 401, { error: 'unauthorized' },
        { 'WWW-Authenticate': challengeHeader(oauth, oauth.enabled ? { error: 'invalid_token' } : undefined) });
      return;
    }
    if (pathname !== '/mcp') { send(response, 404, { error: 'not_found' }); return; }
    if (!['POST', 'DELETE'].includes(request.method)) {
      send(response, 405, { error: 'method_not_allowed' }, { Allow: 'POST, DELETE' }); return;
    }
    expire();
    const sessionId = request.headers['mcp-session-id'];
    if (request.method === 'DELETE') {
      if (!sessionId) { send(response, 400, { error: 'session_required' }); return; }
      if (!sessions.has(sessionId)) { send(response, 404, { error: 'session_not_found' }); return; }
      const version = request.headers['mcp-protocol-version'] ?? '2025-03-26';
      if (!SUPPORTED_PROTOCOLS.includes(version) || version !== sessions.get(sessionId).protocolVersion) {
        send(response, 400, { error: 'unsupported_or_mismatched_protocol_version' }); return;
      }
      endSession(sessionId);
      send(response, 204);
      return;
    }
    if (!acceptsBoth(request.headers.accept)) { send(response, 406, { error: 'accept_json_and_sse_required' }); return; }
    if (request.headers['content-type']?.split(';')[0].trim().toLowerCase() !== 'application/json') {
      send(response, 415, { error: 'application_json_required' }); return;
    }
    if (Number(request.headers['content-length'] ?? 0) > config.maxRequestBytes) {
      send(response, 413, { error: 'request_too_large' }); return;
    }
    let message;
    try { message = parseInputJson(await readBody(request, config.maxRequestBytes)); }
    catch (error) {
      if (error.message === 'body_too_large') send(response, 413, { error: 'request_too_large' }, { Connection: 'close' });
      else rpcError(response, null, -32700, 'Invalid JSON, UTF-8, or an input number that cannot be represented without rounding.', 400);
      return;
    }
    if (!isObject(message) || message.jsonrpc !== '2.0' || typeof message.method !== 'string' ||
        Object.keys(message).some((key) => !['jsonrpc', 'id', 'method', 'params'].includes(key)) ||
        (owns(message, 'id') && !requestId(message.id)) ||
        (owns(message, 'params') && !isObject(message.params))) {
      rpcError(response, null, -32600, 'Invalid JSON-RPC request. Batches are not supported.', 400); return;
    }
    const hasId = owns(message, 'id');
    const id = hasId ? message.id : null;
    const params = message.params ?? {};
    if (message.method === 'initialize') {
      if (!hasId || sessionId || typeof params.protocolVersion !== 'string' || !isObject(params.capabilities) ||
          !isObject(params.clientInfo) || typeof params.clientInfo.name !== 'string' || typeof params.clientInfo.version !== 'string') {
        rpcError(response, id, -32602, 'Invalid initialization parameters.', 400); return;
      }
      if (sessions.size >= config.maxSessions) { send(response, 503, { error: 'session_limit' }); return; }
      const protocolVersion = SUPPORTED_PROTOCOLS.includes(params.protocolVersion) ? params.protocolVersion : SUPPORTED_PROTOCOLS[0];
      // Opaque routing identifier, never an authentication credential. Every
      // request still requires the independently configured API key.
      const newId = randomUUID();
      sessions.set(newId, { protocolVersion, initialized: false, active: new Map(), expiresAt: Date.now() + config.sessionTtlMs });
      rpcResult(response, id, {
        protocolVersion,
        // `resources` is declared because the measurement card is served as
        // one. It is read-only and static: no subscriptions, no change
        // notifications, and the only resource is the card document itself.
        capabilities: { tools: { listChanged: false }, resources: { listChanged: false, subscribe: false } },
        serverInfo: { name: 'neomundi-measurement-mcp-private', version: '0.3.0-rc.1' },
        instructions: 'NeoMundi supplies raw measurements and metrological context. Preserve all states and null. No measurement grants execution permission or constitutes a compliance, safety, assurance or governance decision. API errors are transport errors, not measurement classifications.',
      }, { 'Mcp-Session-Id': newId });
      return;
    }
    if (!sessionId) { send(response, 400, { error: 'session_required' }); return; }
    const session = sessions.get(sessionId);
    if (!session) { send(response, 404, { error: 'session_not_found' }); return; }
    const protocolHeader = request.headers['mcp-protocol-version'] ?? '2025-03-26';
    if (!SUPPORTED_PROTOCOLS.includes(protocolHeader) || protocolHeader !== session.protocolVersion) {
      send(response, 400, { error: 'unsupported_or_mismatched_protocol_version' }); return;
    }
    session.expiresAt = Date.now() + config.sessionTtlMs;
    if (!hasId) {
      if (message.method === 'notifications/initialized') session.initialized = true;
      if (message.method === 'notifications/cancelled' && requestId(params.requestId)) {
        session.active.get(idKey(params.requestId))?.abort();
      }
      // JSON-RPC notifications have no response body, including unknown ones.
      send(response, 202);
      return;
    }
    if (session.active.has(idKey(id))) { rpcError(response, id, -32600, 'Request ID already active in this session.'); return; }
    if (message.method === 'ping') { rpcResult(response, id, {}); return; }
    if (!session.initialized) { rpcError(response, id, -32000, 'Session initialization notification required.'); return; }
    if (message.method === 'tools/list') {
      if (owns(params, 'cursor')) { rpcError(response, id, -32602, 'This server has no paginated tools.'); return; }
      rpcResult(response, id, { tools: [toolDefinition] });
      return;
    }
    // The measurement card. Static, credential-free in content, and served
    // from memory: reading it makes no upstream call and consumes no quota.
    if (message.method === 'resources/list') {
      if (owns(params, 'cursor')) { rpcError(response, id, -32602, 'This server has no paginated resources.'); return; }
      const { text: _text, ...listed } = cardResource();
      rpcResult(response, id, { resources: [listed] });
      return;
    }
    if (message.method === 'resources/read') {
      if (params.uri !== CARD_RESOURCE_URI) {
        rpcError(response, id, -32602, 'Unknown resource URI.'); return;
      }
      const { uri, mimeType, text, _meta } = cardResource();
      rpcResult(response, id, { contents: [{ uri, mimeType, text, _meta }] });
      return;
    }
    if (message.method === 'resources/templates/list') { rpcResult(response, id, { resourceTemplates: [] }); return; }
    if (message.method !== 'tools/call') { rpcError(response, id, -32601, 'Method not found.'); return; }
    if (params.name !== 'measure_execution' || Object.keys(params).some((key) => !['name', 'arguments', '_meta'].includes(key))) {
      rpcError(response, id, -32602, 'Unknown tool or invalid tool call parameters.'); return;
    }
    if (activeCalls >= config.maxConcurrent) { rpcError(response, id, -32000, 'Local concurrent call limit reached.', 429); return; }
    // Per-participant ceiling, and only when one is configured. A refusal
    // here says why, and it fabricates nothing: no measurement is produced,
    // no upstream call is made, and no favourable result is invented out of a
    // quota decision.
    if (identity.subject !== null) {
      const budget = authorizationServer.consume(identity.subject);
      if (!budget.allowed) {
        rpcError(response, id, -32000,
          `Per-participant call ceiling reached (${budget.used}/${budget.limit}). No measurement was attempted, and none was produced.`, 429);
        return;
      }
    }
    const controller = new AbortController();
    const disconnect = () => { if (!response.writableEnded) controller.abort(); };
    response.on('close', disconnect);
    request.on('aborted', disconnect);
    session.active.set(idKey(id), controller);
    activeCalls++;
    try {
      const output = await measureExecution(params.arguments, { config, fetchImpl, signal: controller.signal });
      rpcResult(response, id, {
        content: [{ type: 'text', text: JSON.stringify(output) }],
        structuredContent: output,
        isError: output.adapter_error !== null,
      });
    } finally {
      response.removeListener('close', disconnect);
      request.removeListener('aborted', disconnect);
      session.active.delete(idKey(id));
      activeCalls--;
    }
  }

  return {
    server,
    async listen(port = config.port, address = config.bindAddress ?? '127.0.0.1') {
      await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, address, () => { server.removeListener('error', reject); resolve(); });
      });
      // The URL still names loopback even when the listener is wider: that is
      // the address a client on this machine uses, and the Host allow-list
      // below accepts nothing else. A published port must therefore be mapped
      // one-to-one, or the forwarded Host header will not match.
      return `http://127.0.0.1:${server.address().port}/mcp`;
    },
    async close() {
      closing = true;
      clearInterval(sweep);
      authorizationServer?.close();
      for (const id of [...sessions.keys()]) endSession(id);
      if (!server.listening) return;
      await new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); });
    },
  };
}

async function main() {
  let app;
  try {
    const config = loadConfiguration(process.env);
    const oauth = loadOAuthConfiguration(process.env);
    app = createMcpServer({ config, oauth });
    const address = await app.listen();
    process.stdout.write(`Private NeoMundi MCP listening on ${address}\n`);
    if (oauth.enabled) {
      // Said once, plainly, like every other widening of exposure here. Four
      // public routes now exist in front of the credential gate, by design.
      process.stderr.write(`OAuth 2.1 enabled for issuer ${oauth.issuer}, resource ${oauth.resource}. Discovery, registration, authorization and token endpoints answer WITHOUT a credential, which is what the flow requires. The static NEOMUNDI_MCP_API_KEY still works and is unchanged.\n`);
      process.stderr.write(`Participant registry read from ${oauth.registryPath} on every authorization and every token check, so a suspension takes effect immediately. It is never written.\n`);
      if (oauth.quotaPerSubject !== undefined) {
        // This is the one setting that makes the connector hold something
        // about a person between two requests. The operator is told, because
        // the published privacy statement has to match it.
        process.stderr.write(`Per-participant call ceiling set to ${oauth.quotaPerSubject}. Counts are held IN MEMORY for the lifetime of this process and reset when it restarts; nothing is written to disk. Check that the published privacy statement describes this before relying on it.\n`);
      }
    }
    if (config.plaintextLoopback) {
      // Told once, on stderr, so a verification run against a disposable local
      // instance is never mistaken for a call to a real deployment.
      process.stderr.write(`Upstream transport is plain HTTP on loopback (${config.baseUrl}). Verification only.\n`);
    }
    if (config.publishedBeyondLoopback) {
      // Said plainly, once. The listener is no longer confined to this
      // machine, and the Bearer credential is the only barrier in front of it.
      process.stderr.write(`Listener bound to ${config.bindAddress}, not loopback: the MCP endpoint is reachable from wherever this process is published, and NEOMUNDI_MCP_API_KEY is the only barrier. Publish the port one-to-one, or the forwarded Host header will be refused.\n`);
    }
    if (config.hostAllowListExtended) {
      // Said plainly, once, like the bind warning above. Each named host is a
      // Host header this process will now answer, and the Bearer credential
      // stays the only barrier in front of it.
      process.stderr.write(`Host allow-list extended to ${config.allowedHosts.join(', ')} beyond loopback: requests carrying these Host headers are answered, and NEOMUNDI_MCP_API_KEY is the only barrier. Terminate TLS in front of this process; it serves plain HTTP.\n`);
    }
    // Containers stop by signal, so a clean exit is the normal path, not an
    // edge case: stop accepting, abort in-flight calls, let the loop drain.
    // A second signal is left to the default handler rather than swallowed, so
    // an operator can always force the issue.
    for (const event of ['SIGINT', 'SIGTERM']) process.once(event, () => { void app.close(); });
  } catch {
    await app?.close();
    process.stderr.write('MCP startup failed. Check runtime/README.md and locally provisioned environment configuration.\n');
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();

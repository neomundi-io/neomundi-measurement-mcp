import http from 'node:http';
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { loadConfiguration } from './config.mjs';
import { isObject, owns, parseInputJson, scalar, toolDefinition } from './contract.mjs';
import { measureExecution } from './adapter.mjs';

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
export function createMcpServer({ config, fetchImpl = globalThis.fetch }) {
  const sessions = new Map();
  const expectedCredential = digest(`Bearer ${config.mcpKey}`);
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
    const hosts = new Set([`127.0.0.1:${port}`, `localhost:${port}`]);
    if (!hosts.has(request.headers.host)) { send(response, 403, { error: 'invalid_host' }); return; }
    const origin = request.headers.origin;
    if (origin !== undefined && !new Set([...hosts].map((host) => `http://${host}`)).has(origin)) {
      send(response, 403, { error: 'invalid_origin' }); return;
    }
    const authCount = request.rawHeaders.filter((_entry, i) => i % 2 === 0 && request.rawHeaders[i].toLowerCase() === 'authorization').length;
    const supplied = request.headers.authorization;
    if (authCount !== 1 || typeof supplied !== 'string' || !timingSafeEqual(digest(supplied), expectedCredential)) {
      send(response, 401, { error: 'unauthorized' }, { 'WWW-Authenticate': 'Bearer realm="neomundi-private-mcp"' }); return;
    }
    if (request.url !== '/mcp') { send(response, 404, { error: 'not_found' }); return; }
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
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'neomundi-measurement-mcp-private', version: '0.1.0' },
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
    if (message.method !== 'tools/call') { rpcError(response, id, -32601, 'Method not found.'); return; }
    if (params.name !== 'measure_execution' || Object.keys(params).some((key) => !['name', 'arguments', '_meta'].includes(key))) {
      rpcError(response, id, -32602, 'Unknown tool or invalid tool call parameters.'); return;
    }
    if (activeCalls >= config.maxConcurrent) { rpcError(response, id, -32000, 'Local concurrent call limit reached.', 429); return; }
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
    async listen(port = config.port) {
      await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, '127.0.0.1', () => { server.removeListener('error', reject); resolve(); });
      });
      return `http://127.0.0.1:${server.address().port}/mcp`;
    },
    async close() {
      closing = true;
      clearInterval(sweep);
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
    app = createMcpServer({ config });
    const address = await app.listen();
    process.stdout.write(`Private NeoMundi MCP listening on ${address}\n`);
    for (const event of ['SIGINT', 'SIGTERM']) process.once(event, () => { void app.close(); });
  } catch {
    await app?.close();
    process.stderr.write('MCP startup failed. Check runtime/README.md and locally provisioned environment configuration.\n');
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();

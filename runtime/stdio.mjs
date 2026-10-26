/** Desktop stdio entry point. Reuses the tested HTTP dispatcher on a private,
 * ephemeral loopback port; stdout contains JSON-RPC only. No startup API call.
 * Credentials come from the child-process environment, never tool arguments.
 */
import { randomBytes } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { loadConfiguration } from './config.mjs';
import { createMcpServer } from './server.mjs';
import { isObject, owns, parseApiJson, parseInputJson } from './contract.mjs';

export async function runStdio({ environment = process.env, input = process.stdin,
  output = process.stdout, fetchImpl = globalThis.fetch } = {}) {
  const config = loadConfiguration({ ...environment,
    NEOMUNDI_MCP_API_KEY: randomBytes(32).toString('hex'), NEOMUNDI_MCP_BIND: '127.0.0.1' });
  const app = createMcpServer({ config, fetchImpl });
  const url = await app.listen(0, '127.0.0.1');
  let session, version, initialization = Promise.resolve();
  const pending = new Set();
  const write = value => output.write(JSON.stringify(value) + '\n');
  const error = (id, code, message) => write({ jsonrpc: '2.0', id, error: { code, message } });
  async function forward(message) {
    if (message.method !== 'initialize') await initialization;
    const headers = { Authorization: `Bearer ${config.mcpKey}`,
      Accept: 'application/json, text/event-stream', 'Content-Type': 'application/json',
      ...(session ? { 'Mcp-Session-Id': session, 'Mcp-Protocol-Version': version } : {}) };
    const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(message), redirect: 'error' });
    if (response.status === 202) return;
    const body = parseApiJson(await response.text());
    if (message.method === 'initialize' && isObject(body.result)) {
      session = response.headers.get('mcp-session-id'); version = body.result.protocolVersion;
    }
    if (owns(message, 'id')) {
      if (body.jsonrpc === '2.0') write(body);
      else error(message.id, -32603, 'Local MCP transport refused the request.');
    }
  }
  function accept(line) {
    let message;
    try { message = parseInputJson(line); }
    catch { error(null, -32700, 'Invalid JSON or unrepresentable input number.'); return; }
    if (!isObject(message)) { error(null, -32600, 'Expected a JSON-RPC object.'); return; }
    if (pending.size >= config.maxConcurrent + 8) {
      if (owns(message, 'id')) error(message.id, -32000, 'Local pending request limit reached.');
      return;
    }
    const job = forward(message).catch(() => {
      if (owns(message, 'id')) error(message.id, -32603, 'Local MCP transport failed. Outcome may be unknown; do not replay automatically.');
    }).finally(() => pending.delete(job));
    pending.add(job);
    // Preserve the stdio handshake order across concurrent loopback HTTP
    // requests. Tool calls must wait for the initialized notification too.
    // Do not serialize ordinary calls: cancellation must remain concurrent.
    if (message.method === 'initialize' || message.method === 'notifications/initialized') initialization = job;
  }
  try {
    const decoder = new TextDecoder('utf-8', { fatal: true });
    let buffer = '';
    for await (const bytes of input) {
      buffer += decoder.decode(bytes, { stream: true });
      let newline;
      while ((newline = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, newline).replace(/\r$/, '');
        buffer = buffer.slice(newline + 1);
        if (Buffer.byteLength(line) > config.maxRequestBytes) throw new Error('request_too_large');
        if (line.trim()) accept(line);
      }
      if (Buffer.byteLength(buffer) > config.maxRequestBytes) throw new Error('request_too_large');
    }
    buffer += decoder.decode();
    if (buffer.trim()) error(null, -32700, 'Unterminated JSON-RPC line.');
  } finally {
    await app.close();
    await Promise.allSettled(pending);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { await runStdio(); }
  catch { process.stderr.write('NeoMundi MCP stdio stopped: check configuration or input framing.\n'); process.exitCode = 1; }
}

import { parseApiJson, scalar } from '../contract.mjs';

// Reusable example for an agent host, restricted to the local private server.
// Calling measure() against the REAL server triggers a NeoMundi API call.
// Tests and demo use this client only with an injected-mock local MCP server.
export class AgentMcpClient {
  constructor({ endpoint, apiKey, fetchImpl = globalThis.fetch }) {
    const url = new URL(endpoint);
    if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(url.hostname) ||
        url.pathname !== '/mcp' || url.search || url.hash || url.username || url.password) {
      throw new Error('This example accepts only a loopback HTTP /mcp endpoint.');
    }
    this.endpoint = url.href;
    this.apiKey = apiKey;
    this.fetchImpl = fetchImpl;
    this.nextId = 1;
  }
  headers() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      Accept: 'application/json, text/event-stream',
      'Content-Type': 'application/json',
      ...(this.sessionId ? { 'Mcp-Session-Id': this.sessionId, 'MCP-Protocol-Version': this.protocolVersion } : {}),
    };
  }
  async exchange(message, { signal } = {}) {
    const response = await this.fetchImpl(this.endpoint, {
      method: 'POST', headers: this.headers(), body: JSON.stringify(message),
      redirect: 'error', signal: signal ?? AbortSignal.timeout(180000),
    });
    if (!response.ok) {
      void response.body?.cancel().catch(() => {});
      const error = new Error('Local MCP HTTP request failed.');
      error.status = response.status;
      throw error;
    }
    if (response.status === 202) return undefined;
    const text = await response.text();
    const envelope = parseApiJson(text);
    if (envelope.jsonrpc !== '2.0' || scalar(envelope.id) !== message.id) throw new Error('Invalid MCP response envelope.');
    if (envelope.error) {
      const error = new Error('Local MCP protocol request failed.');
      error.code = scalar(envelope.error.code);
      throw error;
    }
    return { result: envelope.result, response };
  }
  async connect() {
    const received = await this.exchange({
      jsonrpc: '2.0', id: this.nextId++, method: 'initialize',
      params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'neomundi-local-agent-example', version: '0.1.0' } },
    });
    this.sessionId = received.response.headers.get('mcp-session-id');
    this.protocolVersion = received.result.protocolVersion;
    if (!this.sessionId || !['2025-06-18', '2025-03-26'].includes(this.protocolVersion)) throw new Error('Unsupported MCP initialization.');
    await this.notify('notifications/initialized', {});
    return received.result;
  }
  async request(method, params = {}, { id = this.nextId++, signal } = {}) {
    return (await this.exchange({ jsonrpc: '2.0', id, method, params }, { signal })).result;
  }
  async notify(method, params) {
    await this.exchange({ jsonrpc: '2.0', method, params });
  }
  async listTools() { return (await this.request('tools/list')).tools; }
  async measure(arguments_, options) { return this.request('tools/call', { name: 'measure_execution', arguments: arguments_ }, options); }
  async cancel(id) { return this.notify('notifications/cancelled', { requestId: id }); }
  async close() {
    if (!this.sessionId) return;
    const response = await this.fetchImpl(this.endpoint, {
      method: 'DELETE', headers: this.headers(), redirect: 'error', signal: AbortSignal.timeout(5000),
    });
    if (!response.ok && response.status !== 404) throw new Error('Local MCP session close failed.');
    void response.body?.cancel().catch(() => {});
    this.sessionId = undefined;
  }
}

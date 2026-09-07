import { inputSchema, isObject, matches, owns, parseApiJson } from './contract.mjs';

const messages = Object.freeze({
  INVALID_ARGUMENTS: 'Arguments do not match the declared tool schema. No API call was made.',
  PROVIDER_KEY_NOT_CONFIGURED: 'Generation requires a provider credential configured in the server environment.',
  UPSTREAM_HTTP_ERROR: 'NeoMundi returned an HTTP error. Its status is preserved; its error body is not exposed.',
  UPSTREAM_CONTENT_TYPE: 'NeoMundi returned an unexpected content type.',
  UPSTREAM_JSON_INVALID: 'NeoMundi returned invalid JSON or an unexpected top-level response shape.',
  SSE_JSON_INVALID: 'An SSE data event did not contain valid JSON.',
  SSE_ERROR: 'NeoMundi emitted an SSE error event. Received events are retained.',
  SSE_INTERRUPTED: 'The SSE connection ended without done or [DONE]. The remote execution outcome is unknown.',
  SSE_TERMINAL_INVALID: 'The named done event did not contain a JSON object or null.',
  RESPONSE_TOO_LARGE: 'The configured response size or event limit was exceeded. The remote outcome may be unknown.',
  UTF8_INVALID: 'NeoMundi returned invalid UTF-8.',
  TOTAL_TIMEOUT: 'The configured total API deadline elapsed. The remote execution outcome may be unknown.',
  IDLE_TIMEOUT: 'No upstream bytes arrived within the configured inactivity deadline. The remote outcome may be unknown.',
  CANCELLED: 'The local call was cancelled. This does not prove cancellation or refund on NeoMundi.',
  NETWORK_ERROR: 'The NeoMundi connection failed. The remote execution outcome may be unknown.',
  CREDENTIAL_DISCLOSURE: 'An upstream payload contained a configured credential. The whole result was withheld without rewriting the measurement.',
  REQUEST_TOO_LARGE: 'The serialized API request exceeds the local request limit.',
});

export class AdapterFailure extends Error {
  constructor(code, httpStatus) {
    super(messages[code]);
    this.code = code;
    this.httpStatus = httpStatus;
  }
}
export function emptyOutput() {
  return { transport: null, response: null, raw_response: null, sse: null, adapter_error: null,
    contract_version: null, token_count_source: 'unknown',
    validation: { transport: 'not_validated', contract: 'not_assessed', metadata_gaps: [] } };
}
export function failedOutput(code, output = emptyOutput(), httpStatus) {
  output.adapter_error = { code, message: messages[code] };
  output.validation.transport = 'not_validated';
  if (httpStatus !== undefined) output.adapter_error.http_status = httpStatus;
  return output;
}

function waitFor(promise, signal, idleMs) {
  return new Promise((resolve, reject) => {
    let timer;
    const finish = (callback, result) => {
      clearTimeout(timer);
      signal.removeEventListener('abort', aborted);
      callback(result);
    };
    const aborted = () => finish(reject, signal.reason instanceof AdapterFailure ? signal.reason : new AdapterFailure('CANCELLED'));
    if (signal.aborted) { void Promise.resolve(promise).catch(() => {}); aborted(); return; }
    signal.addEventListener('abort', aborted, { once: true });
    timer = setTimeout(() => finish(reject, new AdapterFailure('IDLE_TIMEOUT')), idleMs);
    Promise.resolve(promise).then((value) => finish(resolve, value), (error) => finish(reject, error));
  });
}

function containsCredential(value, credentials) {
  const pending = [value];
  while (pending.length) {
    const item = pending.pop();
    if (typeof item === 'string' && credentials.some((key) => item.includes(key))) return true;
    if (item && typeof item === 'object' && !JSON.isRawJSON(item)) {
      for (const key of Object.keys(item)) {
        if (credentials.some((secret) => key.includes(secret))) return true;
        pending.push(item[key]);
      }
    }
  }
  return false;
}

function exposeVersion(output, payload) {
  if (isObject(payload) && owns(payload, 'contract_version')) output.contract_version = payload.contract_version;
}

function completedOutput(output) {
  // Envelope metadata only. Never change the server payload or infer provenance
  // from counts, provider name, cost, intermediate chunks or model identity.
  const source = output.response?.token_count_source;
  output.token_count_source = typeof source === 'string' && source.trim() ? source : 'unknown';
  output.validation.transport = 'validated';
  output.validation.metadata_gaps = [
    ...(output.contract_version === null ? ['contract_version_missing'] : []),
    ...(output.token_count_source === 'unknown' ? ['token_count_source_unknown'] : []),
  ];
  // A version label alone cannot validate an opaque, unversioned SSE schema.
  output.validation.contract = output.validation.metadata_gaps.length ? 'not_validated' : 'not_assessed';
  return output;
}

// Only SSE framing is decoded. Event data is never merged into a new measure.
// A [DONE]-only stream has no named final object: response remains null and
// every data payload remains in events, including any advertised contract version.
class SseParser {
  constructor(output, config, guard) {
    this.output = output;
    this.config = config;
    this.guard = guard;
    this.buffer = '';
    this.lines = [];
    this.event = '';
    this.id = undefined;
    this.afterCR = false;
  }
  feed(chunk) {
    let start = this.afterCR && chunk.startsWith('\n') ? 1 : 0;
    if (chunk.length) this.afterCR = false;
    const separators = /[\r\n]/g;
    separators.lastIndex = start;
    let match;
    while (!this.output.sse.termination && (match = separators.exec(chunk))) {
      const index = match.index;
      const line = this.buffer + chunk.slice(start, index);
      this.buffer = '';
      const cr = chunk[index] === '\r';
      start = index + (cr && chunk[index + 1] === '\n' ? 2 : 1);
      this.afterCR = cr && start === chunk.length;
      separators.lastIndex = start;
      this.line(line);
    }
    if (!this.output.sse.termination) this.buffer += chunk.slice(start);
  }
  line(line) {
    if (line === '') {
      if (this.lines.length) this.dispatch();
      this.lines = [];
      this.event = '';
      this.id = undefined;
      return;
    }
    if (line.startsWith(':')) return;
    const colon = line.indexOf(':');
    const field = colon < 0 ? line : line.slice(0, colon);
    let value = colon < 0 ? '' : line.slice(colon + 1);
    if (value.startsWith(' ')) value = value.slice(1);
    if (field === 'data') this.lines.push(value);
    else if (field === 'event') this.event = value;
    else if (field === 'id' && !value.includes('\0')) this.id = value;
    // Unknown SSE fields and retry hints remain available in raw_stream.
  }
  dispatch() {
    if (this.output.sse.events.length >= this.config.maxEvents) throw new AdapterFailure('RESPONSE_TOO_LARGE');
    const raw = this.lines.join('\n');
    const marker = raw.trim() === '[DONE]';
    let data;
    if (marker) data = raw;
    else {
      try { data = parseApiJson(raw); }
      catch { throw new AdapterFailure('SSE_JSON_INVALID'); }
    }
    this.guard(data);
    const event = { event: this.event || 'message', data, raw_data: raw };
    if (this.id !== undefined) event.id = this.id;
    this.output.sse.events.push(event);
    exposeVersion(this.output, data);
    if (event.event === 'error') throw new AdapterFailure('SSE_ERROR');
    if (marker) {
      this.output.sse.termination = '[DONE]';
    } else if (event.event === 'done') {
      if (data !== null && !isObject(data)) throw new AdapterFailure('SSE_TERMINAL_INVALID');
      this.output.response = data;
      this.output.raw_response = raw;
      this.output.sse.termination = 'done';
    }
  }
}

export async function measureExecution(arguments_, { config, fetchImpl = globalThis.fetch, signal } = {}) {
  let output = emptyOutput();
  let reader;
  let upstream;
  let totalTimer;
  const controller = new AbortController();
  const cancel = () => controller.abort(new AdapterFailure('CANCELLED'));
  const credentials = [config.apiKey, config.providerKey, config.mcpKey].filter(Boolean);
  const guard = (value) => {
    if (containsCredential(value, credentials)) throw new AdapterFailure('CREDENTIAL_DISCLOSURE');
  };
  try {
    if (!matches(inputSchema, arguments_)) throw new AdapterFailure('INVALID_ARGUMENTS');
    const streaming = owns(arguments_, 'generation');
    output.transport = streaming ? 'sse' : 'json';
    if (streaming && !config.providerKey) throw new AdapterFailure('PROVIDER_KEY_NOT_CONFIGURED');
    const payload = streaming ? { ...arguments_.generation, provider_api_key: config.providerKey } : arguments_.execution;
    const body = JSON.stringify(payload);
    if (Buffer.byteLength(body) > config.maxRequestBytes) throw new AdapterFailure('REQUEST_TOO_LARGE');
    if (signal?.aborted) throw new AdapterFailure('CANCELLED');
    signal?.addEventListener('abort', cancel, { once: true });
    totalTimer = setTimeout(() => controller.abort(new AdapterFailure('TOTAL_TIMEOUT')), config.totalTimeoutMs);
    const endpoint = streaming ? '/v1/govern/stream' : '/v1/govern';
    upstream = await waitFor(fetchImpl(config.baseUrl + endpoint, {
      method: 'POST',
      headers: { 'X-API-Key': config.apiKey, Accept: streaming ? 'text/event-stream' : 'application/json', 'Content-Type': 'application/json; charset=utf-8' },
      body,
      redirect: 'error',
      signal: controller.signal,
    }), controller.signal, config.idleTimeoutMs);
    if (!upstream.ok) throw new AdapterFailure('UPSTREAM_HTTP_ERROR', upstream.status);
    const mime = upstream.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
    if (mime !== (streaming ? 'text/event-stream' : 'application/json')) throw new AdapterFailure('UPSTREAM_CONTENT_TYPE');
    if (!upstream.body) throw new AdapterFailure(streaming ? 'SSE_INTERRUPTED' : 'UPSTREAM_JSON_INVALID');
    const declaredLength = upstream.headers.get('content-length');
    if (declaredLength && /^\d+$/.test(declaredLength) && Number(declaredLength) > config.maxResponseBytes) {
      throw new AdapterFailure('RESPONSE_TOO_LARGE');
    }
    reader = upstream.body.getReader();
    const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });
    let raw = '';
    let credentialTail = '';
    const credentialTailLength = Math.max(0, ...credentials.map((key) => key.length - 1));
    let size = 0;
    let firstText = true;
    if (streaming) output.sse = { events: [], termination: null, raw_stream: '' };
    const parser = streaming ? new SseParser(output, config, guard) : null;
    for (;;) {
      const packet = await waitFor(reader.read(), controller.signal, config.idleTimeoutMs);
      if (packet.value) size += packet.value.byteLength;
      if (size > config.maxResponseBytes) throw new AdapterFailure('RESPONSE_TOO_LARGE');
      let text;
      try { text = packet.done ? decoder.decode() : decoder.decode(packet.value, { stream: true }); }
      catch { throw new AdapterFailure('UTF8_INVALID'); }
      raw += text;
      const credentialWindow = credentialTail + text;
      guard(credentialWindow);
      credentialTail = credentialTailLength ? credentialWindow.slice(-credentialTailLength) : '';
      if (streaming) {
        output.sse.raw_stream = raw;
        // An optional initial UTF-8 BOM is framing, retained in raw_stream.
        if (firstText && text.length) {
          firstText = false;
          if (text.startsWith('\uFEFF')) text = text.slice(1);
        }
        parser.feed(text);
        if (output.sse.termination) break;
      }
      if (packet.done) {
        if (streaming) throw new AdapterFailure('SSE_INTERRUPTED');
        output.raw_response = raw;
        let parsed;
        try { parsed = parseApiJson(raw); }
        catch { throw new AdapterFailure('UPSTREAM_JSON_INVALID'); }
        guard(parsed);
        if (parsed !== null && !isObject(parsed)) throw new AdapterFailure('UPSTREAM_JSON_INVALID');
        output.response = parsed;
        exposeVersion(output, output.response);
        break;
      }
    }
    return completedOutput(output);
  } catch (error) {
    const failure = error instanceof AdapterFailure ? error :
      controller.signal.aborted && controller.signal.reason instanceof AdapterFailure ? controller.signal.reason :
        new AdapterFailure('NETWORK_ERROR');
    if (failure.code === 'CREDENTIAL_DISCLOSURE') output = emptyOutput();
    return failedOutput(failure.code, output, failure.httpStatus);
  } finally {
    clearTimeout(totalTimer);
    signal?.removeEventListener('abort', cancel);
    controller.abort();
    // Never retry a POST with an unknown remote outcome. Close local resources;
    // no assertion is made about remote cancellation or quota refunds.
    if (reader) {
      void reader.cancel().catch(() => {});
      try { reader.releaseLock(); } catch { /* pending read will be aborted */ }
    } else if (upstream?.body) {
      void upstream.body.cancel().catch(() => {});
    }
  }
}

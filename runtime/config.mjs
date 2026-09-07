export class ConfigurationError extends Error {
  constructor() { super('Invalid or missing server configuration. See runtime/README.md.'); }
}

const positive = (value, fallback, maximum) => {
  if (value === undefined || value === '') return fallback;
  if (!/^\d+$/.test(value)) throw new ConfigurationError();
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1 || number > maximum) throw new ConfigurationError();
  return number;
};
const credential = (value, required) => {
  if (value === undefined || value === '') {
    if (required) throw new ConfigurationError();
    return undefined;
  }
  if (typeof value !== 'string' || value.length > 8192 || /[\s\x00-\x1f\x7f]/u.test(value)) throw new ConfigurationError();
  return value;
};

// Read by the deployed process only. Tests inject an artificial object and
// never inspect real environment credentials. No .env loader or filesystem keys.
export function loadConfiguration(environment) {
  let url;
  try { url = new URL(environment.NEOMUNDI_API_BASE_URL || 'https://api.neomundi.io'); }
  catch { throw new ConfigurationError(); }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new ConfigurationError();
  }
  return Object.freeze({
    baseUrl: url.origin,
    apiKey: credential(environment.NEOMUNDI_API_KEY, true),
    mcpKey: credential(environment.NEOMUNDI_MCP_API_KEY, true),
    providerKey: credential(environment.NEOMUNDI_PROVIDER_API_KEY, false),
    port: positive(environment.NEOMUNDI_MCP_PORT, 8787, 65535),
    totalTimeoutMs: positive(environment.NEOMUNDI_TIMEOUT_MS, 120000, 3600000),
    idleTimeoutMs: positive(environment.NEOMUNDI_IDLE_TIMEOUT_MS, 30000, 3600000),
    maxResponseBytes: positive(environment.NEOMUNDI_MAX_RESPONSE_BYTES, 2097152, 16777216),
    maxRequestBytes: 1048576,
    maxEvents: 10000,
    maxConcurrent: 8,
    maxSessions: 32,
    sessionTtlMs: 1800000,
  });
}

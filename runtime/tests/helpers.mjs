import { loadConfiguration } from '../config.mjs';

// Deliberately public, non-operational sentinels, never production credentials.
// No test reads process.env or makes an upstream network request.
export const testConfig = (overrides = {}) => Object.freeze({
  ...loadConfiguration({
    NEOMUNDI_API_BASE_URL: 'https://neomundi-unit-test.invalid',
    NEOMUNDI_API_KEY: 'mock-api-not-a-secret',
    NEOMUNDI_MCP_API_KEY: 'mock-mcp-not-a-secret',
    NEOMUNDI_PROVIDER_API_KEY: 'mock-provider-not-a-secret',
  }),
  ...overrides,
});
export const execution = () => ({ execution: {
  mode: 'OBS', source_type: 'llm', llm_prompt: 'Question synthétique', llm_response: 'Réponse synthétique',
  raw_metrics: { token_count: 4, latency_ms: 12.5 },
} });
export const generation = () => ({ generation: { prompt: 'Question synthétique', provider: 'openai', model: 'synthetic-model' } });
export const view = (value) => JSON.parse(JSON.stringify(value));
export const jsonReply = (text, status = 200, headers = {}) => new Response(text, {
  status, headers: { 'Content-Type': 'application/json', ...headers },
});

export function sseReply(text, { fragmentBytes = 11, stayOpen = false, onCancel = () => {} } = {}) {
  const bytes = new TextEncoder().encode(text);
  let offset = 0;
  return new Response(new ReadableStream({
    pull(controller) {
      if (offset < bytes.length) {
        controller.enqueue(bytes.slice(offset, offset + fragmentBytes));
        offset += fragmentBytes;
      } else if (!stayOpen) controller.close();
    },
    cancel() { onCancel(); },
  }), { headers: { 'Content-Type': 'text/event-stream; charset=utf-8' } });
}

export function apiMock(reply) {
  const calls = [];
  return {
    calls,
    fetch: async (url, options) => {
      if (!url.startsWith('https://neomundi-unit-test.invalid/v1/govern')) throw new Error('Unexpected mocked endpoint');
      calls.push({ url, options });
      return typeof reply === 'function' ? reply(url, options) : reply;
    },
  };
}

export function syntheticMeasurement() {
  return {
    fixture: 'synthetic-unit-test-only',
    contract_version: 'backend-unmapped-version',
    request_id: 'synthetic-measurement',
    observation: {
      measurement_status: 'partial', measurement_coverage: 0.6,
      observed_signals: {
        stability_score: 0.9, coherence_score: null, semantic_risk: null,
        signal_status: { stability_score: 'measured', coherence_score: 'not_measured', semantic_risk: 'insufficient_coverage' },
        observation_class: 'not_determinable', confidence: null,
      },
    },
    untouched_unknown_field: { other_class: 'not_assessed', empty: null, zero: 0, flag: false, list: [null, ''] },
    governance: { governance_boundary: { execution_permission_changed: false } },
  };
}

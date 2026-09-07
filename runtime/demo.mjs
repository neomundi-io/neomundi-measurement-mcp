import assert from 'node:assert/strict';
import { createMcpServer } from './server.mjs';
import { AgentMcpClient } from './examples/agent-client.mjs';
import { execution, generation, jsonReply, sseReply, syntheticMeasurement, testConfig, view } from './tests/helpers.mjs';

// Fully local reproduction: actual MCP HTTP on loopback, API fetch replaced.
// No process.env, secret access, DNS lookup, dependency install or remote call.
const config = testConfig();
const measurement = syntheticMeasurement();
let apiCalls = 0;
let streamCalls = 0;
const app = createMcpServer({ config, fetchImpl: async (url, options) => {
  assert.equal(options.method, 'POST');
  apiCalls++;
  if (url === config.baseUrl + '/v1/govern') return jsonReply(JSON.stringify(measurement));
  assert.equal(url, config.baseUrl + '/v1/govern/stream');
  streamCalls++;
  return sseReply(streamCalls === 1 ?
    `event: done\ndata: ${JSON.stringify(measurement)}\n\n` :
    `data: ${JSON.stringify(measurement)}\n\ndata: [DONE]\n\n`);
} });
let client;
try {
  const endpoint = await app.listen(0);
  client = new AgentMcpClient({ endpoint, apiKey: config.mcpKey });
  await client.connect();
  const tools = await client.listTools();
  assert.deepEqual(tools.map((tool) => tool.name), ['measure_execution']);
  const postCall = await client.measure(execution());
  assert.equal(postCall.isError, false);
  assert.deepEqual(view(postCall.structuredContent.response), measurement);
  const namedDone = await client.measure(generation());
  assert.equal(namedDone.structuredContent.sse.termination, 'done');
  assert.deepEqual(view(namedDone.structuredContent.response), measurement);
  const literalDone = await client.measure(generation());
  assert.equal(literalDone.structuredContent.sse.termination, '[DONE]');
  assert.equal(literalDone.structuredContent.response, null);
  assert.deepEqual(view(literalDone.structuredContent.sse.events[0].data), measurement);
  assert.equal(apiCalls, 3);
  process.stdout.write('PASS: local MCP initialization, tools/list, observation, SSE done, SSE [DONE].\n');
  process.stdout.write('NeoMundi API: 3 mocked requests; 0 remote calls; no environment credentials read.\n');
} finally {
  try { await client?.close(); } finally { await app.close(); }
}

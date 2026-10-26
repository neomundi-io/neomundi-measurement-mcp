import test from 'node:test';
import assert from 'node:assert/strict';
import { measureExecution } from '../adapter.mjs';
import { testConfig } from './helpers.mjs';

for (const generation of [
  { prompt: 'x' }, { prompt: 'x', model: 'm' }, { prompt: 'x', provider: 'openai' },
  { prompt: 'x', model: 'm', provider: null }, { prompt: 'x', model: 'm', provider: '' },
]) {
  test(`generation refuses implicit provider/model before any API call: ${JSON.stringify(generation)}`, async () => {
    let calls = 0;
    const r = await measureExecution({ generation }, { config: testConfig(),
      fetchImpl: async () => { calls++; throw Error('unexpected'); } });
    assert.equal(r.adapter_error.code, 'INVALID_ARGUMENTS');
    assert.equal(calls, 0);
  });
}

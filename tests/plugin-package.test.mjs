import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { buildPlugin, PLUGIN_FILES } from '../scripts/build-plugin.mjs';

test('plugin package includes its executable and schemas, excludes captures, and refuses overwriting', () => {
  const output = join(mkdtempSync(join(tmpdir(), 'neomundi-package-test-')), 'plugin');
  buildPlugin(output);
  assert.ok(!readdirSync(output).includes('tests'));
  assert.ok(!readdirSync(join(output, 'runtime')).includes('LIVE_API_RESULT.json'));
  assert.ok(PLUGIN_FILES.includes('runtime/stdio.mjs'));
  assert.throws(() => buildPlugin(output), /already exists/);
  for (const line of readFileSync(join(output, 'SHA256.txt'), 'utf8').trim().split('\n')) {
    const [hash, path] = line.split('  ');
    assert.equal(createHash('sha256').update(readFileSync(join(output, path))).digest('hex'), hash);
  }
});

test('plugin and compatibility manifests point to the same credential-free MCP entry', () => {
  const load = path => JSON.parse(readFileSync(new URL('../'+path, import.meta.url)));
  const portable = load('mcp.json').mcpServers.neomundi;
  assert.deepEqual(load('.mcp.json').mcpServers.neomundi, portable);
  assert.equal(portable.type, 'stdio');
  assert.equal(portable.args[0], '${PLUGIN_ROOT}/runtime/stdio.mjs');
  assert.equal(portable.env, undefined);
  assert.equal(load('plugin.json').version, load('runtime/package.json').version);
});

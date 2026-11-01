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

test('listing metadata stays inside the platform limits, and claims no policy that does not exist', () => {
  const load = path => JSON.parse(readFileSync(new URL('../' + path, import.meta.url)));
  const manifest = load('plugin.json');
  const openai = manifest.extensions['com.openai'].interface;

  // Limits read from the platform's submission documentation on 2026-11-01.
  // They are platform facts, not ours: re-verify them at submission time.
  // shortDescription was 43 characters against a maximum of 30 before this
  // was pinned, which the automated submission checks would have rejected.
  for (const [field, max] of Object.entries({
    displayName: 30, shortDescription: 30, longDescription: 4000, developerName: 80,
  })) {
    const value = openai[field];
    assert.equal(typeof value, 'string', `${field} must be present`);
    assert.ok([...value].length <= max, `${field} is ${[...value].length} characters, max ${max}`);
  }
  assert.ok([...manifest.name].length <= 64);
  assert.match(manifest.name, /^[a-z0-9]+(-[a-z0-9]+)*$/, 'the plugin name must be kebab-case');

  // Every URL declared here resolved when it was written. A URL that does not
  // resolve is a stated rejection reason, so none may be invented to fill a
  // field. `termsOfServiceURL` was deliberately absent for as long as no terms
  // existed; version 1.0 was published on 2026-11-01, so it is now required --
  // and it must keep pointing at the French text, which is the one that
  // prevails.
  assert.equal(openai.websiteURL, 'https://neomundi.org');
  assert.equal(openai.privacyPolicyURL, 'https://neomundi.org/politique-de-confidentialite');
  assert.equal(openai.supportURL, 'https://neomundi.org/contact');
  assert.equal(openai.termsOfServiceURL, 'https://neomundi.org/cgu');

  // The association carries the plugin, so the identity shown is the
  // association's and the site is the .org that publishes the evidence --
  // never the .io that carries the commercial offer.
  assert.equal(openai.developerName, 'Neomundi Recherche');
  assert.equal(manifest.author.name, 'Neomundi Recherche');
  assert.ok(openai.longDescription.includes('association loi 1901'));
  // The claim the whole connector exists to protect must survive packaging.
  assert.ok(openai.longDescription.includes('aucune autorisation d’exécution'));
});

test('the declared icons exist, are square, and are large enough to be listed', () => {
  const manifest = JSON.parse(readFileSync(new URL('../plugin.json', import.meta.url)));
  const declared = Object.values(manifest.icons);
  assert.ok(declared.every(p => p.startsWith('./')), 'icon paths stay relative to the plugin root');
  for (const [size, relative] of Object.entries(manifest.icons)) {
    const bytes = readFileSync(new URL('../' + relative.slice(2), import.meta.url));
    // PNG IHDR carries width and height big-endian at bytes 16 and 20.
    const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
    assert.equal(width, Number(size), `${relative} must be ${size} wide`);
    assert.equal(width, height, `${relative} must be square`);
    assert.ok(width >= 48, 'the listing icon has a 48 pixel minimum');
  }
  assert.equal(manifest.extensions['com.openai'].interface.icon, './assets/icon-512.png');
});

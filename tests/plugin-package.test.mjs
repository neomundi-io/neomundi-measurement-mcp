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
    websiteURL: 1024, supportURL: 1024, privacyPolicyURL: 1024, termsOfServiceURL: 1024,
  })) {
    const value = openai[field];
    assert.equal(typeof value, 'string', `${field} must be present`);
    assert.ok([...value].length <= max, `${field} is ${[...value].length} characters, max ${max}`);
  }

  // Up to three starter prompts, 128 characters each, and they must be
  // distinct: a repeated prompt is a listed rejection reason.
  assert.ok(Array.isArray(openai.defaultPrompt) && openai.defaultPrompt.length <= 3);
  assert.equal(new Set(openai.defaultPrompt).size, openai.defaultPrompt.length);
  for (const prompt of openai.defaultPrompt) {
    assert.ok([...prompt].length <= 128, `starter prompt is ${[...prompt].length} characters, max 128`);
    assert.ok(!prompt.includes('@'), 'starter prompts carry no app mention');
  }

  // The category has to be a title from the dashboard. It was "Developer
  // tools" with a lowercase t, which is not the title the platform lists.
  assert.equal(openai.category, 'Developer Tools');
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

  // The base listing text is English because the platform asks for English in
  // the base fields and for every other language under
  // `publication.translations`. The French text is therefore no longer in
  // `longDescription`; it is the fr-FR translation, and it still prevails for
  // the legal pages the two URLs above point at.
  const french = manifest.extensions['com.openai'].publication.translations['fr-FR'];
  assert.ok([...french.subtitle].length <= 30, 'a translated subtitle is one line of at most 30 characters');
  assert.ok([...french.description].length <= 4000);

  // The claim the whole connector exists to protect must survive packaging,
  // in BOTH languages. It is the one sentence a reader of either listing has
  // to see: a measurement is not a permission.
  assert.ok(openai.longDescription.includes('grants no execution permission'));
  assert.ok(french.description.includes('aucune autorisation d’exécution'));
  assert.ok(french.description.includes('association loi 1901'));
});

test('the submission review cases are exactly five positive and three negative, and the negatives are the ones that prove nothing is invented', () => {
  const manifest = JSON.parse(readFileSync(new URL('../plugin.json', import.meta.url)));
  const review = manifest.extensions['com.openai'].review;

  // "Initial MCP app review requires exactly five positive and three negative
  // cases." An upload accepts a partial list, so the count is checked here
  // rather than discovered in the portal.
  assert.equal(review.test_cases.positive.length, 5);
  assert.equal(review.test_cases.negative.length, 3);

  for (const positive of review.test_cases.positive) {
    for (const field of ['description', 'prompt', 'tools_triggered', 'expected_behavior']) {
      assert.equal(typeof positive[field], 'string', `a positive case needs ${field}`);
      assert.ok(positive[field].trim().length > 0);
    }
    assert.ok([...positive.description].length <= 4000);
    assert.equal(positive.tools_triggered, 'measure_execution', 'the package exposes exactly one tool');
  }
  for (const negative of review.test_cases.negative) {
    for (const field of ['description', 'prompt']) {
      assert.equal(typeof negative[field], 'string', `a negative case needs ${field}`);
      assert.ok(negative[field].trim().length > 0);
    }
  }

  // The three negatives are not decoration. They are the connector's
  // argument, and they come straight out of the suite: a permissive decision
  // taken with no check, an upstream failure, and a demand for a verdict.
  const negatives = review.test_cases.negative.map((c) => c.description).join(' ');
  assert.ok(/no check/i.test(negatives), 'one negative case must be the decision taken with no check attempted');
  assert.ok(/no automatic retry|triggerno|trigger no/i.test(negatives), 'one negative case must show that no retry is attempted');
  assert.ok(/fabricate no measurement|does not certify/i.test(negatives), 'the negatives must show that nothing is invented');

  // Reviewer credentials never travel in the package: the ZIP metadata
  // rejects `test_credentials` and `reviewer_instructions` outright.
  assert.equal(review.test_credentials, undefined);
  assert.equal(review.reviewer_instructions, undefined);
});

test('the declared icons exist, are square, and are large enough to be listed', () => {
  const manifest = JSON.parse(readFileSync(new URL('../plugin.json', import.meta.url)));
  const openai = manifest.extensions['com.openai'].interface;

  // A top-level `icons` object used to carry these paths. The portable
  // manifest schema is CLOSED -- `icons` is not one of its declared fields --
  // so it was a schema violation, and `interface.icon` was not a declared
  // listing field either. The listing icon is `logo`, and the composer icon
  // is `composerIcon`; both are declared inside the OpenAI interface object.
  assert.equal(manifest.icons, undefined, 'icons is not a field of the portable manifest');
  assert.equal(openai.icon, undefined, 'the listing field is logo, not icon');

  const declared = { logo: 512, composerIcon: 128 };
  for (const [field, expected] of Object.entries(declared)) {
    const relative = openai[field];
    assert.equal(typeof relative, 'string', `${field} must be declared`);
    assert.ok(relative.startsWith('./'), 'icon paths stay relative to the plugin root');
    const bytes = readFileSync(new URL('../' + relative.slice(2), import.meta.url));
    // PNG IHDR carries width and height big-endian at bytes 16 and 20.
    const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
    assert.equal(width, expected, `${relative} must be ${expected} wide`);
    assert.equal(width, height, `${relative} must be square`);
    assert.ok(width >= 48, 'the listing icon has a 48 pixel minimum');
    assert.ok(width <= 4096, 'a raster listing image has a 4096 pixel maximum');
  }

  // The brand foundation leaves the accent colour undecided, and says the
  // mark does not need one to exist. `brandColor` is optional, so declaring
  // one here would settle an identity question that is not settled -- and the
  // card refuses colour-coded risk for the same reason.
  assert.equal(openai.brandColor, undefined);
  assert.equal(openai.brandColorDark, undefined);

  // Every icon file still shipped must be reachable from the package list.
  for (const size of [512, 256, 128, 48]) {
    readFileSync(new URL(`../assets/icon-${size}.png`, import.meta.url));
  }
});

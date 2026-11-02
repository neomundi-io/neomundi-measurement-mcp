/** The image must receive every source directory the repository has.
 *
 * WHY THIS EXISTS, AND WHY IT IS NOT PARANOIA. The Dockerfile runs the whole
 * suite at build time -- `RUN npm test` -- which is a good property: an image
 * that cannot pass its own tests is never produced. The cost of that property
 * is that the image needs every file the tests READ, not merely the files the
 * server imports. Those two sets have drifted apart twice:
 *
 *   1. `tests/plugin-package.test.mjs` landed, the packaging inputs were not
 *      copied, and every `docker build` failed from that commit onward. It
 *      went unnoticed because no image was rebuilt in between.
 *   2. The legal corpus landed with `tests/cgu-versions.test.mjs`, `legal/`
 *      was not copied, and on 2026-11-02 an AUTHORISED deployment stopped at
 *      the door: five failures, one cause, `/app/legal/cgu-versions.json`.
 *
 * Both times the Dockerfile gained a comment telling the next person to keep
 * the list in step. Both times that was not enough, because a comment cannot
 * fail. This can.
 *
 * WHY IT SKIPS INSIDE THE IMAGE. `.dockerignore` excludes the Dockerfile
 * itself, so during `RUN npm test` there is nothing to read. The skip is
 * therefore expected and states its reason, rather than quietly passing.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const DOCKERFILE = join(ROOT, 'Dockerfile');

/** Directories deliberately kept OUT of the image. Each needs a reason here,
 * so that adding one is a decision somebody wrote down rather than a file
 * that quietly never arrived.
 */
const DELIBERATELY_ABSENT = Object.freeze({
  dist: 'build output: the image builds its own, and shipping one would ship a stale artefact',
  node_modules: 'there are no dependencies; a directory of them would be a surprise, not an input',
});

test('every source directory of the repository reaches the image', { skip: existsSync(DOCKERFILE) ? false : 'running from a copy without the Dockerfile, which is what .dockerignore produces inside the image' }, () => {
  const dockerfile = readFileSync(DOCKERFILE, 'utf8');

  // Every `COPY <src>` target, reduced to its top-level directory name.
  const copied = new Set();
  for (const line of dockerfile.split('\n')) {
    const match = /^COPY\s+(.+?)\s+\.\/?\S*\s*$/.exec(line.trim());
    if (!match) continue;
    for (const source of match[1].split(/\s+/)) {
      copied.add(source.replace(/\/.*$/, '').replace(/^\.\//, ''));
    }
  }

  const onDisk = readdirSync(ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => entry.name);

  for (const directory of onDisk) {
    if (Object.hasOwn(DELIBERATELY_ABSENT, directory)) continue;
    assert.ok(
      copied.has(directory),
      `${directory}/ exists in the repository but no COPY brings it into the image. `
      + 'Either add it to the Dockerfile, or name it in DELIBERATELY_ABSENT with the reason. '
      + 'A directory the build-time suite reads and the image does not have makes every build fail.',
    );
  }

  // The two that have actually bitten, named so a reader sees the shape of
  // the failure rather than only the rule.
  assert.ok(copied.has('legal'), 'legal/ holds cgu-versions.json, which tests/cgu-versions.test.mjs reads');
  assert.ok(copied.has('scripts'), 'scripts/ holds the package builder that tests/plugin-package.test.mjs runs');
  assert.ok(copied.has('schemas'), 'schemas/ holds the archived source schemas that tests/audit.test.mjs hashes');
});

test('the build still runs the suite, so an image that cannot pass its tests is never produced', { skip: existsSync(DOCKERFILE) ? false : 'no Dockerfile in this copy' }, () => {
  const dockerfile = readFileSync(DOCKERFILE, 'utf8');
  // Removing this line would make every one of the guards above pointless:
  // the file list would stop mattering, and so would the tests.
  assert.match(dockerfile, /^RUN npm test$/m, 'the image must run the suite at build time');
  // And it must happen before dropping privileges, or the suite would run as
  // a user that cannot read what the build just wrote.
  assert.ok(dockerfile.indexOf('RUN npm test') < dockerfile.indexOf('USER node'));
});

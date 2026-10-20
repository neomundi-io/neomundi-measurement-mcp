// Locating the recorded API responses. A helper, not a test file: importing a
// test file to reuse one function would run its whole suite a second time.
//
// The recordings are execution data kept outside both projects, next to the
// Python SDK campaign that produced them. See captured-rest.test.mjs for what
// they are and what a failure against them means.
import { readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** Where the recordings are looked for when the environment names nothing.
 *
 * The recordings live in a sibling checkout of the Python SDK. How far up that
 * sibling sits depends on where THIS repository was placed: cloned next to
 * `SDK/` it is three levels above this directory, and unpacked one folder
 * deeper — the shape a downloaded archive produces — it is four. A single
 * hard-coded depth silently skips the replay in the other layout, which is how
 * the suite came to report "9 skipped, recordings absent" on a checkout where
 * the recordings were present and readable.
 *
 * Both candidates are therefore tried, nearest first. Order matters only when
 * both exist, in which case the nearer checkout is the one this repository was
 * cloned beside.
 */
export const CANDIDATE_DIRECTORIES = Object.freeze(
  ['../../../', '../../../../'].map((prefix) =>
    fileURLToPath(new URL(`${prefix}SDK/neomundi-python-sdk/tests/fixtures/captured/`, import.meta.url))),
);

/** Recording file names in `directory`, sorted; `[]` when it is absent, not a
 * directory, or unreadable. Never throws: an unreadable path is an absence,
 * not a test error.
 */
export function capturesIn(directory) {
  try {
    if (!statSync(directory).isDirectory()) return [];
    return readdirSync(directory).filter((name) => name.endsWith('.json')).sort();
  } catch {
    return [];
  }
}

/** Resolves the recordings directory.
 *
 * `environmentPath`, when set, is the only path considered: an operator who
 * names a directory is not silently overridden by a discovered one. Otherwise
 * the candidates are tried in order and the first that actually HOLDS
 * recordings wins — existing but empty is not a match, because an empty
 * directory would otherwise mask a populated one further up.
 *
 * `attempted` is returned so the skip reason can name every path tried.
 */
export function resolveCaptures(environmentPath, candidates = CANDIDATE_DIRECTORIES) {
  const attempted = environmentPath ? [environmentPath] : [...candidates];
  for (const directory of attempted) {
    const captures = capturesIn(directory);
    if (captures.length) return { directory, captures, attempted };
  }
  return { directory: attempted[0], captures: [], attempted };
}

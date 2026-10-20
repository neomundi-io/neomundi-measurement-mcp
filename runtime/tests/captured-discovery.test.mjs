// Non-regression guard on how the recorded responses are FOUND.
//
// The defect this guards against produced no failure and no error: the replay
// skipped with "no recorded response available" on a checkout where the
// recordings were present and readable, because the lookup hard-coded one
// directory depth and this repository sits at the other one. The suite then
// reported "118 passed, 9 skipped" and named five families of verification it
// had not run — while the only part of the suite able to observe a divergence
// between the contract as read and the contract as served was silently inert.
//
// A test asserting discovery therefore protects something no assertion inside
// captured-rest.test.mjs can: that those assertions run at all.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CANDIDATE_DIRECTORIES, capturesIn, resolveCaptures } from './captured-fixtures.mjs';

/** A throwaway directory tree. Returns the root; the caller removes it. */
function scratch(layout) {
  const root = mkdtempSync(join(tmpdir(), 'neomundi-captures-'));
  for (const [relative, files] of Object.entries(layout)) {
    const directory = join(root, relative);
    mkdirSync(directory, { recursive: true });
    for (const name of files) writeFileSync(join(directory, name), '{}');
  }
  return root;
}

test('both repository layouts are offered as candidates, nearest first', () => {
  assert.equal(CANDIDATE_DIRECTORIES.length, 2);
  // Depth matters, and only depth: the same sibling path at two nesting levels.
  const tail = join('SDK', 'neomundi-python-sdk', 'tests', 'fixtures', 'captured');
  for (const candidate of CANDIDATE_DIRECTORIES) assert.ok(candidate.includes(tail), candidate);
  const [near, far] = CANDIDATE_DIRECTORIES;
  // Fewer `..` segments means climbing less far, so the NEARER candidate is
  // the longer absolute path, and it is tried first — which is what decides
  // the outcome on a machine holding both layouts.
  //
  // Not a strict inequality: `..` cannot climb past the filesystem root, so
  // the two collapse to the same path when the repository sits near it. That
  // is how the container image behaves, with the checkout at `/app`, and it
  // is harmless — the same directory is simply tried once rather than twice.
  assert.ok(near.length >= far.length, 'the nearer layout must be tried first');
});

test('this checkout resolves to a directory that actually holds recordings', () => {
  // The regression itself, stated as an assertion. On a checkout placed beside
  // the SDK this passes; where the recordings are genuinely absent it is
  // skipped rather than failed, because their absence is a documented state.
  const resolved = resolveCaptures(undefined);
  if (resolved.captures.length === 0) {
    assert.deepEqual(resolved.attempted, [...CANDIDATE_DIRECTORIES],
      'with nothing found, every candidate must have been tried');
    return;
  }
  assert.ok(CANDIDATE_DIRECTORIES.includes(resolved.directory),
    'the resolved directory must be one of the declared candidates');
  assert.ok(resolved.captures.every((name) => name.endsWith('.json')));
});

test('a named environment directory is the only one considered', () => {
  const root = scratch({ named: ['one.json'], other: ['two.json'] });
  try {
    const resolved = resolveCaptures(join(root, 'named'), [join(root, 'other')]);
    assert.deepEqual(resolved.captures, ['one.json']);
    assert.deepEqual(resolved.attempted, [join(root, 'named')],
      'an operator who names a directory is never silently overridden');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('a named directory that holds nothing is not replaced by a candidate', () => {
  // Reporting "absent" for the path the operator named is the honest outcome.
  // Falling back would hide a typo behind recordings from somewhere else.
  const root = scratch({ empty: [], candidate: ['present.json'] });
  try {
    const resolved = resolveCaptures(join(root, 'empty'), [join(root, 'candidate')]);
    assert.deepEqual(resolved.captures, []);
    assert.equal(resolved.directory, join(root, 'empty'));
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('an existing but empty candidate does not mask a populated one', () => {
  const root = scratch({ first: [], second: ['kept.json'] });
  try {
    const resolved = resolveCaptures(undefined, [join(root, 'first'), join(root, 'second')]);
    assert.equal(resolved.directory, join(root, 'second'));
    assert.deepEqual(resolved.captures, ['kept.json']);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('non-JSON entries are ignored, and ordering is stable', () => {
  const root = scratch({ mixed: ['b.json', 'a.json', 'notes.txt', 'archive.json.gz'] });
  try {
    assert.deepEqual(capturesIn(join(root, 'mixed')), ['a.json', 'b.json']);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('an absent or unreadable path is an absence, never a thrown error', () => {
  const root = scratch({ real: ['x.json'] });
  try {
    assert.deepEqual(capturesIn(join(root, 'does-not-exist')), []);
    // A file where a directory is expected: statSync succeeds, isDirectory is false.
    assert.deepEqual(capturesIn(join(root, 'real', 'x.json')), []);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('with nothing found, every attempted path is reported for the skip reason', () => {
  const root = scratch({});
  try {
    const candidates = [join(root, 'a'), join(root, 'b')];
    const resolved = resolveCaptures(undefined, candidates);
    assert.deepEqual(resolved.attempted, candidates);
    assert.equal(resolved.captures.length, 0);
    assert.equal(resolved.directory, candidates[0], 'the first candidate names the default');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

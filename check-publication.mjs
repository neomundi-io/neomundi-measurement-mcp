/** Pre-publication gate, runnable on a plain directory.
 *
 * The existing `check-mcp-publication.mjs` in the working tree alongside this
 * repository drives `git ls-files`, so it needs a staged index. This one walks
 * the directory and applies `.gitignore` itself, so the publishable set can be
 * reviewed before any repository exists — which is the situation this folder is
 * in.
 *
 * It fails loudly rather than reporting a pass it cannot justify. Run it before
 * any push:
 *
 *     node check-publication.mjs          # report and exit non-zero on a finding
 *     node check-publication.mjs --list   # also print the publishable set
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, posix, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const findings = [];
const fail = (path, why) => findings.push({ path, why });

// --- .gitignore, reduced to the forms this repository actually uses ---------
const RULES = readFileSync(join(ROOT, '.gitignore'), 'utf8')
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith('#'))
  .map((line) => ({
    negated: line.startsWith('!'),
    body: (line.startsWith('!') ? line.slice(1) : line).replace(/\/$/, ''),
    directory: line.endsWith('/'),
  }));

function ignored(relPath, isDirectory) {
  let result = false;
  for (const rule of RULES) {
    const pattern = rule.body.replace(/^\*\*\//, '');
    const anchored = pattern.includes('/');
    const expression = new RegExp(`^${pattern
      .split('*').map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[^/]*')}$`);
    const candidates = anchored ? [relPath] : [relPath, posix.basename(relPath)];
    // A directory rule also covers everything beneath it.
    const prefixed = anchored && relPath.startsWith(`${pattern}/`);
    const hit = candidates.some((candidate) => expression.test(candidate))
      || prefixed
      || (!anchored && relPath.split('/').some((segment) => expression.test(segment)));
    if (!hit) continue;
    if (rule.directory && !isDirectory && !prefixed
      && !relPath.split('/').slice(0, -1).some((segment) => expression.test(segment))) continue;
    result = !rule.negated;
  }
  return result;
}

function walk(directory = '', collected = []) {
  for (const entry of readdirSync(join(ROOT, directory), { withFileTypes: true })) {
    const relPath = directory ? `${directory}/${entry.name}` : entry.name;
    if (entry.name === '.git' || ignored(relPath, entry.isDirectory())) continue;
    if (entry.isDirectory()) walk(relPath, collected);
    else collected.push(relPath);
  }
  return collected;
}

const published = walk().sort();

// --- 1. Paths that must never be published --------------------------------
const FORBIDDEN = [
  { test: (p) => p.includes('..'), why: 'path traversal' },
  { test: (p) => /(?:^|\/)\.env(?:\..*)?$/.test(p) && !p.endsWith('.env.example'), why: 'environment file' },
  { test: (p) => /(?:^|\/)live-once\.mjs$/.test(p), why: 'one-shot live probe' },
  { test: (p) => /(?:^|\/)live-once\.test\.mjs$/.test(p), why: 'guard tests of the live probe' },
  { test: (p) => /(?:^|\/)\.live-api-attempted$/.test(p), why: 'live attempt marker' },
  { test: (p) => /\.(zip|key|pem|pfx|p12|crt|der)$/i.test(p), why: 'archive or key material' },
  { test: (p) => /fixtures\/captured\//.test(p), why: 'recorded API response' },
  { test: (p) => /(?:^|\/)(REFERENCE_AND_LOOPBACK_REPORT|FINALISATION_REPORT|PUBLICATION_READINESS_REPORT)\.md$/.test(p), why: 'internal report' },
  { test: (p) => /(?:^|\/)(RAPPORT_|PLAN_CORRECTION)/.test(p), why: 'internal report' },
];
for (const path of published) {
  for (const rule of FORBIDDEN) if (rule.test(path)) fail(path, rule.why);
}

// --- 2. Secret patterns, in every publishable byte -------------------------
// The all-zero test key and the `mock-*-not-a-secret` sentinels are inert by
// construction; everything else that looks like a credential is a finding.
const SECRETS = [
  { pattern: /-----BEGIN (?:RSA |EC |OPENSSH |ENCRYPTED |PGP )?PRIVATE KEY-----/, why: 'private key block' },
  { pattern: /\bsk-[A-Za-z0-9_-]{16,}\b/, why: 'provider key' },
  { pattern: /\bct_(?:live|test|trial)_(?!0{8})[A-Za-z0-9_-]{12,}\b/, why: 'NeoMundi key' },
  { pattern: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/, why: 'AWS key id' },
  { pattern: /\bgh[pousr]_[A-Za-z0-9]{20,}\b/, why: 'GitHub token' },
  { pattern: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/, why: 'GitHub fine-grained token' },
  { pattern: /\beyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\b/, why: 'JWT' },
  { pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/, why: 'Slack token' },
];

// --- 3. Local machine traces ----------------------------------------------
const LOCAL_TRACES = [
  { pattern: /[A-Za-z]:[\\/]Users[\\/][^\s"'`)\]]+/, why: 'absolute user path' },
  { pattern: /\/(?:home|Users)\/[A-Za-z0-9._-]+\/[^\s"'`)\]]+/, why: 'absolute home path' },
  // Reserved names (RFC 2606 / RFC 6761) cannot route anywhere, so they are
  // not addresses. Everything else that looks like one is a finding.
  { pattern: /[A-Za-z0-9._%+-]+@(?![A-Za-z0-9.-]*\.(?:invalid|test|example|localhost))(?!example\.(?:com|org|net))[A-Za-z0-9.-]+\.[A-Za-z]{2,}/, why: 'email address' },
];

const TEXT = /\.(mjs|js|json|md|ps1|yml|yaml|txt|example|gitignore|gitattributes)$/i;
for (const path of published) {
  if (!TEXT.test(path) && !/(?:^|\/)\.[a-z]+$/.test(path)) continue;
  const content = readFileSync(join(ROOT, path), 'utf8');
  for (const { pattern, why } of SECRETS) {
    // The value is deliberately not printed: a finding names the file only.
    if (pattern.test(content)) fail(path, `${why} (value withheld)`);
  }
  for (const { pattern, why } of LOCAL_TRACES) {
    const hit = pattern.exec(content);
    if (hit) fail(path, `${why} near "${hit[0].slice(0, 28)}…"`);
  }
}

// --- 3b. A recorded measurement response, wherever it sits ----------------
// Rule 1 catches the directory recordings normally live in. This catches one
// that was copied somewhere else: a REST measurement response is recognisable
// by its own shape, so the check does not depend on where the file was put.
// `runtime/LIVE_API_RESULT.json` is the reviewed, anonymised SSE fixture and
// has no audit block, so it is not matched.
for (const path of published.filter((p) => p.endsWith('.json'))) {
  let payload;
  try { payload = JSON.parse(readFileSync(join(ROOT, path), 'utf8').replace(/^﻿/, '')); }
  catch { continue; }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) continue;
  const audited = payload.audit && typeof payload.audit === 'object'
    && typeof payload.audit.measurement_version === 'string';
  const governed = payload.governance && typeof payload.governance === 'object'
    && typeof payload.governance.decision === 'string';
  if (audited && governed) fail(path, 'looks like a recorded measurement response (execution data)');
}

// --- 4. The archived source schemas must still match their recorded hashes -
try {
  const provenance = JSON.parse(readFileSync(join(ROOT, 'schemas/provenance.json'), 'utf8').replace(/^\uFEFF/, ''));
  for (const entry of provenance) {
    const bytes = readFileSync(join(ROOT, entry.copy.split('/').join(sep)));
    if (createHash('sha256').update(bytes).digest('hex') !== entry.sha256) {
      fail(entry.copy, 'archived schema no longer matches its recorded SHA-256');
    }
  }
} catch (error) {
  fail('schemas/provenance.json', `unreadable: ${error.code ?? 'error'}`);
}

// --- 5. A published document must not link to an excluded file -------------
const excluded = new Set(['runtime/live-once.mjs', 'runtime/tests/live-once.test.mjs',
  'runtime/REFERENCE_AND_LOOPBACK_REPORT.md', 'runtime/FINALISATION_REPORT.md',
  'runtime/PUBLICATION_READINESS_REPORT.md']);
for (const path of published.filter((p) => p.endsWith('.md'))) {
  const content = readFileSync(join(ROOT, path), 'utf8');
  const directory = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '';
  for (const [, target] of content.matchAll(/\]\(([^)#:]+\.(?:md|mjs|json|ps1))\)/g)) {
    const resolved = posix.normalize(directory ? `${directory}/${target}` : target);
    if (excluded.has(resolved)) fail(path, `links to the excluded file ${resolved}`);
    else if (!published.includes(resolved)) {
      try { statSync(join(ROOT, resolved)); fail(path, `links to ${resolved}, which is not published`); }
      catch { fail(path, `links to ${resolved}, which does not exist`); }
    }
  }
}

// --- Report ---------------------------------------------------------------
if (process.argv.includes('--list')) {
  process.stdout.write(`Publishable set (${published.length} files):\n`);
  for (const path of published) {
    process.stdout.write(`  ${String(statSync(join(ROOT, path)).size).padStart(7)}  ${path}\n`);
  }
  process.stdout.write('\n');
}

if (findings.length) {
  process.stderr.write(`FAIL: ${findings.length} finding(s).\n`);
  for (const { path, why } of findings) process.stderr.write(`  ${path}: ${why}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(
    `PASS: ${published.length} publishable files; no forbidden path, no known secret pattern, `
    + 'no local machine trace, archived schema hashes preserved, no link to an excluded file.\n',
  );
}

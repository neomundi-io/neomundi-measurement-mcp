/** Explicit allow-list: no captured responses, tests, credentials or archives. */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

const root = fileURLToPath(new URL('../', import.meta.url));
export const PLUGIN_FILES = Object.freeze([
  'plugin.json', 'mcp.json', '.mcp.json', '.codex-plugin/plugin.json',
  '.agents/plugins/marketplace.json', 'README_FR.md', 'README.md',
  'docs/PLUGIN_FR.md', 'docs/PLUGIN.md', 'docs/MCP_PLUGIN_AUDIT.md',
  'docs/RESPONSE_CONTRACTS.md', 'docs/RESPONSE_CONTRACTS_FR.md',
  'skills/measure-execution/SKILL.md',
  ...['adapter', 'config', 'contract', 'guidance', 'integrity', 'presentation',
    'reference', 'response-contracts', 'schema-validation', 'server', 'stdio', 'upstream'].map(n => `runtime/${n}.mjs`),
  'runtime/package.json', 'runtime/schemas/measure_execution.input.schema.json',
  'runtime/schemas/measure_execution.output.schema.json',
  'runtime/schemas/contracts/govern-rest-1.0.json', 'runtime/schemas/contracts/govern-sse-1.0.json',
]);

export function buildPlugin(destination) {
  destination = resolve(destination);
  if (existsSync(destination)) throw new Error('Output already exists; choose a new directory. No existing file was removed.');
  for (const p of PLUGIN_FILES) if (!existsSync(join(root, p))) throw new Error(`Missing package file: ${p}`);
  mkdirSync(destination, { recursive: true });
  const hashes = [];
  for (const p of PLUGIN_FILES) {
    const target = join(destination, p);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(join(root, p), target);
    // Package home pages link only to included guides, not historical repo-only files.
    if (p === 'README_FR.md' || p === 'README.md') {
      const french = p === 'README_FR.md';
      writeFileSync(target, french
        ? '# NeoMundi Measurement — plugin local 0.3.0-rc.1\n\n[Français](README_FR.md) · [English](README.md)\n\n[Installation et usage](docs/PLUGIN_FR.md) · [Audit et limites](docs/MCP_PLUGIN_AUDIT.md)\n\nNode.js 24+. REST et SSE via MCP stdio. Les clés doivent être provisionnées dans l’environnement du client. Aucun appel API au démarrage. Une mesure ne donne aucune autorisation d’exécution. Qualification hébergée distincte.\n\n[Documentation complète](https://github.com/neomundi-io/neomundi-measurement-mcp)\n'
        : '# NeoMundi Measurement — local plugin 0.3.0-rc.1\n\n[English](README.md) · [Français](README_FR.md)\n\n[Install and use](docs/PLUGIN.md) · [Audit and limits](docs/MCP_PLUGIN_AUDIT.md)\n\nRequires Node.js 24+. REST and SSE through MCP stdio. Provision credentials in the client environment. No startup API call. Measurements grant no execution permission. Hosted qualification remains separate.\n\n[Full repository documentation](https://github.com/neomundi-io/neomundi-measurement-mcp)\n');
    }
    hashes.push(`${createHash('sha256').update(readFileSync(target)).digest('hex')}  ${p}`);
  }
  writeFileSync(join(destination, 'SHA256.txt'), hashes.join('\n') + '\n');
  return { destination, files: PLUGIN_FILES.length };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(JSON.stringify(buildPlugin(process.argv[2] ?? join(root, 'dist/neomundi-measurement'))));
}

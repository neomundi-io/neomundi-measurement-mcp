/** Builds the publication ZIP from the plugin package.
 *
 * WHY A ZIP WRITER AND NOT A LIBRARY. This repository has no runtime
 * dependencies, and a packaging step is the worst place to acquire the first
 * one: the archive is the artefact that would be handed to a reviewer, so
 * every byte in it should come from code that is read here. ZIP is a simple
 * container, and `zlib` is built in.
 *
 * DETERMINISTIC BY CONSTRUCTION. Entry order is the package's own declared
 * order, every timestamp is a single fixed constant, and no attribute depends
 * on the building machine. Two runs on the same commit therefore produce the
 * same bytes and the same SHA-256 — which is what makes the archive citable as
 * evidence rather than merely transferable.
 *
 * NOTHING EXTRA ENTERS. The content is exactly `PLUGIN_FILES`, an explicit
 * allow-list: no test, no recording, no credential, no archive, no report.
 */
import { deflateRawSync, crc32 } from 'node:zlib';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildPlugin, PLUGIN_FILES } from './build-plugin.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));

/** One fixed instant for every entry: 1980-01-01 00:00:00, the earliest the
 * DOS timestamp format can express. A real mtime would make the archive
 * differ on every build and destroy the reproducibility above.
 */
const DOS_TIME = 0;
const DOS_DATE = 0x0021;

/** Builds the ZIP in memory. Small by design — the package is source text, a
 * handful of schemas and four icons.
 */
export function zipFromFiles(entries) {
  const locals = [];
  const central = [];
  let offset = 0;

  for (const { name, data } of entries) {
    const nameBytes = Buffer.from(name, 'utf8');
    const compressed = deflateRawSync(data, { level: 9 });
    // Stored is used when deflate does not actually help, which happens on the
    // already-compressed PNG icons: it keeps the archive honest about size
    // rather than paying a deflate wrapper for nothing.
    const useStore = compressed.length >= data.length;
    const payload = useStore ? data : compressed;
    const method = useStore ? 0 : 8;
    const sum = crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);          // version needed
    local.writeUInt16LE(0x0800, 6);      // UTF-8 names
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(sum, 14);
    local.writeUInt32LE(payload.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, nameBytes, payload);

    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50, 0);
    entry.writeUInt16LE(20, 4);          // version made by
    entry.writeUInt16LE(20, 6);          // version needed
    entry.writeUInt16LE(0x0800, 8);
    entry.writeUInt16LE(method, 10);
    entry.writeUInt16LE(DOS_TIME, 12);
    entry.writeUInt16LE(DOS_DATE, 14);
    entry.writeUInt32LE(sum, 16);
    entry.writeUInt32LE(payload.length, 20);
    entry.writeUInt32LE(data.length, 24);
    entry.writeUInt16LE(nameBytes.length, 28);
    entry.writeUInt32LE(0, 30);          // extra + comment lengths
    entry.writeUInt16LE(0, 36);          // disk number
    entry.writeUInt32LE(0, 38);          // attributes
    entry.writeUInt32LE(offset, 42);
    central.push(entry, nameBytes);

    offset += local.length + nameBytes.length + payload.length;
  }

  const centralBytes = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBytes.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralBytes, end]);
}

export function buildPackage(destination = join(root, 'dist')) {
  // The staging directory is built by the existing, tested packager, so the
  // ZIP can never contain something the directory package would not.
  const staging = join(mkdtempSync(join(tmpdir(), 'neomundi-zip-')), 'plugin');
  try {
    buildPlugin(staging);
    const names = [...PLUGIN_FILES, 'SHA256.txt'];
    const entries = names.map((name) => ({ name, data: readFileSync(join(staging, name)) }));
    const zip = zipFromFiles(entries);

    const version = JSON.parse(readFileSync(join(root, 'plugin.json'), 'utf8')).version;
    mkdirSync(destination, { recursive: true });
    const file = join(destination, `neomundi-measurement-${version}.zip`);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, zip);
    return {
      file, files: entries.length, bytes: zip.length,
      sha256: createHash('sha256').update(zip).digest('hex'),
    };
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(JSON.stringify(buildPackage(process.argv[2]), null, 2));
}

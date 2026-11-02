/** Builds one participant entry for the OAuth registry.
 *
 *     node scripts/participant-credential.mjs <subject> [--name "Atelier Alpha"]
 *
 * The secret is read from STDIN, never from an argument: an argument is
 * visible in the process list, in shell history, and in any supervisor that
 * records a command line. With no secret on stdin, one is generated and
 * printed ONCE on stderr -- stderr rather than stdout so that redirecting the
 * entry into a file does not quietly write the secret into it too.
 *
 *     printf '%s' "$SECRET" | node scripts/participant-credential.mjs alpha
 *     node scripts/participant-credential.mjs alpha > entry.json   # generated
 *
 * WHAT ENDS UP IN THE REGISTRY. A subject, a display name, an enabled flag,
 * an epoch, the granted scopes, and a scrypt hash with its salt and its
 * parameters. No secret, no token, nothing reversible. The registry can sit
 * on a server and be mounted read-only without being a list of passwords.
 *
 * REVOKING. Two levers, both durable because the registry is the one durable
 * thing in this design:
 *   - `"enabled": false` stops that participant immediately, next request.
 *   - bumping `"epoch"` invalidates every token already issued to them while
 *     leaving the access itself in place, which is what a rotation is.
 * Neither needs a restart: the file is re-read on every check.
 */
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { pathToFileURL } from 'node:url';

export const SCRYPT = Object.freeze({ N: 16384, r: 8, p: 1, keyLength: 32 });

export function hashSecret(secret, salt = randomBytes(16)) {
  const derived = scryptSync(Buffer.from(secret, 'utf8'), salt, SCRYPT.keyLength, {
    N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p, maxmem: 64 * 1024 * 1024,
  });
  return {
    algorithm: 'scrypt',
    N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p,
    salt: salt.toString('base64url'),
    hash: derived.toString('base64url'),
  };
}

export function participantEntry({ subject, name, secret, scopes = ['measure'] }) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(subject)) {
    throw new Error('A subject is 1 to 64 characters of letters, digits, dot, dash or underscore, starting with a letter or a digit.');
  }
  if (typeof secret !== 'string' || secret.length < 16) {
    throw new Error('A participant secret is at least 16 characters. Shorter ones are refused here rather than accepted and regretted.');
  }
  return {
    subject,
    name: name ?? subject,
    enabled: true,
    // Starts at 1 rather than 0 so that "bump the epoch to rotate" has
    // somewhere to go from on the very first rotation.
    epoch: 1,
    scopes,
    secret: hashSecret(secret),
  };
}

/** Kept here so the generator and the server agree on what a match is, and so
 * a test can prove a generated entry verifies.
 */
export function verifySecret(record, supplied) {
  const derived = scryptSync(Buffer.from(supplied, 'utf8'), Buffer.from(record.salt, 'base64url'), SCRYPT.keyLength, {
    N: record.N, r: record.r, p: record.p, maxmem: 64 * 1024 * 1024,
  });
  const stored = Buffer.from(record.hash, 'base64url');
  return stored.length === derived.length && timingSafeEqual(stored, derived);
}

async function readStdin() {
  if (process.stdin.isTTY) return '';
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8').replace(/\r?\n$/, '');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [subject, ...rest] = process.argv.slice(2);
  const nameIndex = rest.indexOf('--name');
  const name = nameIndex === -1 ? undefined : rest[nameIndex + 1];
  if (!subject) {
    process.stderr.write('Usage: node scripts/participant-credential.mjs <subject> [--name "Display name"]\n');
    process.stderr.write('The secret is read from stdin. With no stdin, one is generated and printed once on stderr.\n');
    process.exitCode = 2;
  } else {
    let secret = await readStdin();
    let generated = false;
    if (!secret) {
      // 32 bytes of base64url: long enough that a ceiling on attempts is a
      // convenience rather than the thing standing between an attacker and
      // the account.
      secret = randomBytes(32).toString('base64url');
      generated = true;
    }
    try {
      const entry = participantEntry({ subject, name, secret });
      if (generated) {
        process.stderr.write('\nSECRET, SHOWN ONCE. It is not stored anywhere by this script and cannot be recovered from the entry below.\n\n');
        process.stderr.write(`  ${secret}\n\n`);
        process.stderr.write(`Fingerprint, safe to quote in a message: sha256:${createHash('sha256').update(secret).digest('hex').slice(0, 16)}\n\n`);
      }
      process.stdout.write(JSON.stringify(entry, null, 2) + '\n');
    } catch (error) {
      process.stderr.write(`${error.message}\n`);
      process.exitCode = 1;
    }
  }
}

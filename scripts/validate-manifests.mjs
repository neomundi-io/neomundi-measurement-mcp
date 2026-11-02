/** Validates `plugin.json` and `mcp.json` against the OFFICIAL Agent Plugins
 * 1.0.0 schemas, as downloaded, byte for byte.
 *
 * WHY THIS FILE EXISTS. Both manifest questions that blocked publication --
 * `P0-1` (where does authentication go?) and `P0-2` (is the OpenAI block flat
 * or nested?) -- had been argued from readings of documentation. Two readings
 * cannot both be true, and neither had been checked against the normative
 * artefact. So the artefact is now in the repository, with its SHA-256, and
 * this script checks the manifests against it rather than against anyone's
 * memory of a web page. `schemas/agent-plugins/provenance.json` records where
 * each copy came from and when.
 *
 * WHY NO LIBRARY. This repository has no runtime dependencies, and a validator
 * is the worst place to acquire the first one: it is the thing that decides
 * whether the package is publishable, so every byte of it should be readable
 * here. The two schemas use a small, closed set of JSON Schema 2020-12
 * keywords -- listed in `SUPPORTED` below -- and `assertSupported` REFUSES to
 * validate if a schema ever starts using a keyword this file does not
 * implement. A validator that silently ignores a keyword it does not know
 * would report success for a document it never checked; that failure mode is
 * worse than having no validator at all.
 *
 * WHAT IT DOES NOT DO. It validates the PORTABLE contract only. Agent Plugins
 * assigns no semantics to the contents of an extension namespace -- the
 * specification says so in as many words -- so nothing here can validate
 * `extensions["com.openai"]`. Those fields are governed by the platform's own
 * submission documentation, and they are held by `tests/plugin-package.test.mjs`
 * and `tests/manifest-schema.test.mjs` instead. Schema validity is not
 * submission readiness; see PLUGIN_SUBMISSION_CHECKLIST.md.
 */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join } from 'node:path';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const read = (p) => readFileSync(join(ROOT, p), 'utf8').replace(/^﻿/, '');
const json = (p) => JSON.parse(read(p));

/** Every keyword the two official schemas actually use. Anything outside this
 * set makes validation refuse rather than pass. Keep the annotation-only
 * keywords here too: they are recognised and deliberately ignored.
 */
const SUPPORTED = new Set([
  '$schema', '$id', 'title', 'description', 'type', 'properties', 'required',
  'additionalProperties', '$defs', '$ref', 'oneOf', 'const', 'enum', 'not',
  'items', 'minLength', 'maxLength', 'pattern', 'propertyNames',
]);

export function assertSupported(schema, where, root) {
  if (typeof schema !== 'object' || schema === null) return;
  for (const key of Object.keys(schema)) {
    if (!SUPPORTED.has(key)) {
      throw new Error(`Unsupported schema keyword "${key}" at ${where}. `
        + 'The official schema has started using a keyword this validator does not '
        + 'implement. Implement it before trusting any result.');
    }
  }
  for (const [name, sub] of Object.entries(schema.properties ?? {})) assertSupported(sub, `${where}/properties/${name}`, root);
  for (const [name, sub] of Object.entries(schema.$defs ?? {})) assertSupported(sub, `${where}/$defs/${name}`, root);
  for (const [i, sub] of (schema.oneOf ?? []).entries()) assertSupported(sub, `${where}/oneOf/${i}`, root);
  if (typeof schema.additionalProperties === 'object') assertSupported(schema.additionalProperties, `${where}/additionalProperties`, root);
  if (schema.items) assertSupported(schema.items, `${where}/items`, root);
  if (schema.propertyNames) assertSupported(schema.propertyNames, `${where}/propertyNames`, root);
  if (schema.not) assertSupported(schema.not, `${where}/not`, root);
}

function resolveRef(ref, root) {
  if (!ref.startsWith('#/')) throw new Error(`Only local $ref is implemented; got ${ref}`);
  let node = root;
  for (const segment of ref.slice(2).split('/')) {
    node = node?.[segment.replace(/~1/g, '/').replace(/~0/g, '~')];
    if (node === undefined) throw new Error(`Unresolvable $ref ${ref}`);
  }
  return node;
}

/** Returns an array of human-readable violations. Empty means valid. */
export function validate(value, schema, root = schema, path = '') {
  const at = path || '(root)';
  const errors = [];
  if (schema.$ref) return validate(value, resolveRef(schema.$ref, root), root, path);

  if (schema.type === 'object') {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return [`${at}: expected an object`];
  } else if (schema.type === 'array') {
    if (!Array.isArray(value)) return [`${at}: expected an array`];
  } else if (schema.type === 'string') {
    if (typeof value !== 'string') return [`${at}: expected a string`];
  }

  if ('const' in schema && value !== schema.const) errors.push(`${at}: must be ${JSON.stringify(schema.const)}`);
  if (schema.enum && !schema.enum.includes(value)) errors.push(`${at}: must be one of ${JSON.stringify(schema.enum)}`);
  if (schema.not && validate(value, schema.not, root, path).length === 0) errors.push(`${at}: must not match the forbidden shape`);

  if (typeof value === 'string') {
    const length = [...value].length;
    if (schema.minLength !== undefined && length < schema.minLength) errors.push(`${at}: shorter than ${schema.minLength}`);
    if (schema.maxLength !== undefined && length > schema.maxLength) errors.push(`${at}: longer than ${schema.maxLength}`);
    if (schema.pattern !== undefined && !new RegExp(schema.pattern, 'u').test(value)) errors.push(`${at}: does not match ${schema.pattern}`);
  }

  if (Array.isArray(value) && schema.items) {
    value.forEach((item, i) => errors.push(...validate(item, schema.items, root, `${at}[${i}]`)));
  }

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const name of schema.required ?? []) {
      if (!Object.hasOwn(value, name)) errors.push(`${at}: missing required property "${name}"`);
    }
    const declared = new Set(Object.keys(schema.properties ?? {}));
    for (const [name, item] of Object.entries(value)) {
      if (schema.propertyNames) errors.push(...validate(name, schema.propertyNames, root, `${at}: property name "${name}"`));
      if (declared.has(name)) {
        errors.push(...validate(item, schema.properties[name], root, `${at}.${name}`));
      } else if (schema.additionalProperties === false) {
        errors.push(`${at}: "${name}" is not a declared property, and this object is closed`);
      } else if (typeof schema.additionalProperties === 'object') {
        errors.push(...validate(item, schema.additionalProperties, root, `${at}.${name}`));
      }
    }
  }

  if (schema.oneOf) {
    const matches = schema.oneOf.filter((sub) => validate(value, sub, root, path).length === 0);
    if (matches.length !== 1) {
      const detail = schema.oneOf.map((sub, i) => `  [${i} ${sub.$ref ?? sub.title ?? 'variant'}] ${validate(value, sub, root, path).join('; ') || 'matches'}`).join('\n');
      errors.push(`${at}: matched ${matches.length} of ${schema.oneOf.length} alternatives, expected exactly 1\n${detail}`);
    }
  }

  return errors;
}

/** Loads a vendored schema and refuses it if its bytes have drifted from the
 * recorded hash. A drifted copy is not a copy of anything.
 */
export function officialSchema(url) {
  const entry = json('schemas/agent-plugins/provenance.json').find((e) => e.url === url);
  if (!entry) throw new Error(`No recorded copy of ${url}`);
  const bytes = readFileSync(join(ROOT, entry.copy));
  const actual = createHash('sha256').update(bytes).digest('hex');
  if (actual !== entry.sha256) {
    throw new Error(`${entry.copy} no longer matches its recorded SHA-256. `
      + 'Do not edit a vendored schema: re-download it and update the provenance entry.');
  }
  const schema = JSON.parse(bytes.toString('utf8').replace(/^﻿/, ''));
  assertSupported(schema, entry.copy, schema);
  return schema;
}

export const MANIFESTS = Object.freeze([
  { file: 'plugin.json', url: 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json' },
  { file: 'mcp.json', url: 'https://agent-plugins.org/schemas/1.0.0/mcp.schema.json' },
]);

/** Validates both manifests. Returns `[{ file, errors }]`. */
export function validateManifests() {
  return MANIFESTS.map(({ file, url }) => {
    const document = json(file);
    const schema = officialSchema(url);
    const errors = validate(document, schema);
    // The document must also target the schema it was validated against,
    // otherwise a future version would be checked by the wrong contract.
    if (document.$schema !== url) errors.push(`(root).$schema must be ${url}`);
    return { file, errors };
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const results = validateManifests();
  for (const { file, errors } of results) {
    if (errors.length === 0) console.log(`OK   ${file} is valid against the official Agent Plugins 1.0.0 schema.`);
    else console.log(`FAIL ${file}\n${errors.map((e) => `     - ${e}`).join('\n')}`);
  }
  process.exitCode = results.some((r) => r.errors.length > 0) ? 1 : 0;
}

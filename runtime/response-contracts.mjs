import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { compileSchema } from './schema-validation.mjs';

const registry = new Map();
for (const [version, file, transport] of [
  ['neomundi.govern.rest/1.0', 'govern-rest-1.0.json', 'json'],
  ['neomundi.govern.sse/1.0', 'govern-sse-1.0.json', 'sse'],
]) {
  const bytes = readFileSync(new URL('./schemas/contracts/'+file, import.meta.url));
  const schema = JSON.parse(bytes);
  registry.set(version, { transport, schema_id: schema.$id,
    schema_sha256: createHash('sha256').update(bytes).digest('hex'), validate: compileSchema(schema) });
}

export function responseContract(response, transport) {
  const empty = { status: 'not_identified', schema_id: null, schema_sha256: null,
    schema_origin: 'bundled_backend_wire_schema', issues: [] };
  const version = response?.contract_version;
  if (typeof version !== 'string' || !version.trim()) return empty;
  const found = registry.get(version);
  if (!found) return { ...empty, status: 'unsupported' };
  const result = { ...empty, schema_id: found.schema_id, schema_sha256: found.schema_sha256 };
  if (found.transport !== transport) return { ...result, status: 'invalid', issues: [{ path:'', keyword:'route_mismatch' }] };
  const validation = found.validate(response);
  return { ...result, status: validation.valid ? 'validated' : 'invalid', issues: validation.issues };
}

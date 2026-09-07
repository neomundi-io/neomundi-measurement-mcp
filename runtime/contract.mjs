import { readFileSync } from 'node:fs';

export const inputSchema = JSON.parse(readFileSync(new URL('./schemas/measure_execution.input.schema.json', import.meta.url)));
export const outputSchema = JSON.parse(readFileSync(new URL('./schemas/measure_execution.output.schema.json', import.meta.url)));
export const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value) && !JSON.isRawJSON(value);
export const owns = (value, key) => Object.hasOwn(value, key);

// API numbers retain their original JSON tokens, including large integers and
// decimals beyond IEEE-754 precision. JSON.stringify emits these tokens verbatim.
// No rounding, numeric conversion or semantic migration of API output occurs.
export function parseApiJson(text) {
  return JSON.parse(text, (_key, value, context) => typeof value === 'number' ? JSON.rawJSON(context.source) : value);
}

function decimalIdentity(token) {
  const match = /^(-?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/.exec(token);
  if (!match) throw new Error('invalid_number');
  let digits = (match[2] + (match[3] ?? '')).replace(/^0+/, '');
  if (!digits) return '0';
  let power = BigInt(match[4] ?? '0') - BigInt((match[3] ?? '').length);
  const trailing = /0+$/.exec(digits)?.[0].length ?? 0;
  if (trailing) { digits = digits.slice(0, -trailing); power += BigInt(trailing); }
  return `${match[1]}${digits}e${power}`;
}

// Strict input: reject silently rounded numbers rather than changing a metric.
// Safe values keep their source token for the upstream request serialization.
export function parseInputJson(text) {
  return JSON.parse(text, (_key, value, context) => {
    if (typeof value !== 'number') return value;
    if (!Number.isFinite(value) || (Number.isInteger(value) && !Number.isSafeInteger(value)) ||
        decimalIdentity(context.source) !== decimalIdentity(JSON.stringify(value))) {
      throw new Error('unrepresentable_input_number');
    }
    return JSON.rawJSON(context.source);
  });
}

export function scalar(value) {
  return JSON.isRawJSON(value) ? JSON.parse(value.rawJSON) : value;
}

// Implements only the keywords used in the checked-in input/output schemas.
// It never coerces, fills defaults, clamps numbers, or mutates its argument.
export function matches(schema, original, depth = 0) {
  if (depth > 64) return false;
  const value = scalar(original);
  const alternatives = schema.type === undefined ? null : [].concat(schema.type);
  const typed = (type) => ({
    object: () => isObject(original), array: () => Array.isArray(value),
    string: () => typeof value === 'string', null: () => value === null,
    boolean: () => typeof value === 'boolean',
    number: () => typeof value === 'number' && Number.isFinite(value),
    integer: () => typeof value === 'number' && Number.isSafeInteger(value),
  }[type]?.() ?? false);
  if (alternatives && !alternatives.some(typed)) return false;
  if (schema.enum && !schema.enum.some((entry) => Object.is(entry, value))) return false;
  if (schema.not && matches(schema.not, original, depth + 1)) return false;
  if (schema.oneOf && schema.oneOf.filter((s) => matches(s, original, depth + 1)).length !== 1) return false;
  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) return false;
    if (schema.maximum !== undefined && value > schema.maximum) return false;
  }
  if (typeof value === 'string') {
    const length = [...value].length;
    if (schema.minLength !== undefined && length < schema.minLength) return false;
    if (schema.maxLength !== undefined && length > schema.maxLength) return false;
  }
  if (Array.isArray(value)) {
    if (schema.maxItems !== undefined && value.length > schema.maxItems) return false;
    if (schema.items && !value.every((entry) => matches(schema.items, entry, depth + 1))) return false;
  }
  if (isObject(original)) {
    if (schema.required?.some((key) => !owns(original, key))) return false;
    for (const key of Object.keys(original)) {
      if (schema.properties && owns(schema.properties, key)) {
        if (!matches(schema.properties[key], original[key], depth + 1)) return false;
      } else if (schema.additionalProperties === false) return false;
    }
  }
  return true;
}

export const toolDefinition = {
  name: 'measure_execution',
  description: 'Transmit one existing execution or generation request to NeoMundi. Preserve server values and states verbatim. Envelope contract_version is null when absent; token_count_source is unknown without explicit provenance in the final response. Transport validation is separate from contract conformance and prompt compliance. No automatic retry, second measurement, or RGC emission.',
  inputSchema,
  outputSchema,
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
};

/** Validator for the keyword set used by our immutable bundled 2020-12 schemas.
 * Unknown assertion keywords are refused at load time, never silently ignored.
 * `format` is an annotation, as in the default 2020-12 vocabulary.
 * No coercion, defaults, response mutation, remote refs or downloaded code.
 */
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v) && !JSON.isRawJSON(v);
// Compare decimal JSON tokens exactly, including integers beyond 2^53 and
// exponents outside IEEE-754. Never round or rewrite an upstream number.
function decimal(value) {
  const text = JSON.isRawJSON(value) ? value.rawJSON
    : typeof value === 'number' && Number.isFinite(value) ? String(value) : '';
  const match = /^(-?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/.exec(text);
  if (!match) return null;
  let digits = (match[2] + (match[3] ?? '')).replace(/^0+/, '');
  let exponent = BigInt(match[4] ?? '0') - BigInt((match[3] ?? '').length);
  if (!digits) return { sign: 0, digits: '0', exponent: 0n };
  const trailing = /0+$/.exec(digits)?.[0].length ?? 0;
  if (trailing) { digits = digits.slice(0, -trailing); exponent += BigInt(trailing); }
  return { sign: match[1] ? -1 : 1, digits, exponent };
}
function compare(a, b) {
  if (a.sign !== b.sign) return Math.sign(a.sign - b.sign);
  if (!a.sign) return 0;
  const leftOrder = BigInt(a.digits.length) + a.exponent;
  const rightOrder = BigInt(b.digits.length) + b.exponent;
  if (leftOrder !== rightOrder) return (leftOrder < rightOrder ? -1 : 1) * a.sign;
  const size = Math.max(a.digits.length, b.digits.length);
  const left = a.digits.padEnd(size, '0'), right = b.digits.padEnd(size, '0');
  return (left < right ? -1 : left > right ? 1 : 0) * a.sign;
}
const equal = (a, b) => {
  const left = decimal(a), right = decimal(b);
  return left && right ? compare(left, right) === 0 : Object.is(a, b);
};
const KEYS = new Set(['$schema', '$id', '$defs', '$ref', 'type', 'const', 'enum',
  'properties', 'required', 'additionalProperties', 'items', 'anyOf', 'allOf',
  'if', 'then', 'else', 'minimum', 'maximum', 'minLength', 'maxLength', 'pattern', 'format']);

export function compileSchema(root) {
  function check(s) {
    if (typeof s === 'boolean') return;
    if (!object(s)) throw Error('invalid_contract_schema');
    for (const key of Object.keys(s)) if (!KEYS.has(key)) throw Error('unsupported_schema_keyword');
    if (s.$ref && !s.$ref.startsWith('#/$defs/')) throw Error('remote_schema_ref_refused');
    if (s.pattern) new RegExp(s.pattern, 'u');
    for (const map of [s.properties, s.$defs]) if (map) for (const v of Object.values(map)) check(v);
    for (const key of ['items', 'additionalProperties', 'if', 'then', 'else']) if (s[key] !== undefined) check(s[key]);
    for (const key of ['anyOf', 'allOf']) if (s[key]) s[key].forEach(check);
  }
  check(root);
  function validate(s, value, path, errors, depth) {
    const fail = keyword => { if (errors.length < 32) errors.push({ path, keyword }); return false; };
    if (depth > 64) return fail('depth');
    if (s === true) return true;
    if (s === false) return fail('false_schema');
    let valid = true;
    if (s.$ref) {
      const target = s.$ref.slice(2).split('/').reduce((v, k) => v?.[k.replace(/~1/g, '/').replace(/~0/g, '~')], root);
      if (target === undefined) return fail('$ref');
      valid = validate(target, value, path, errors, depth + 1) && valid;
    }
    const numeric = decimal(value);
    const typed = type => ({ object: () => object(value), array: () => Array.isArray(value),
      string: () => typeof value === 'string', boolean: () => typeof value === 'boolean',
      null: () => value === null, number: () => numeric !== null,
      integer: () => numeric !== null && numeric.exponent >= 0n,
    }[type]?.() ?? false);
    if (s.type && ![].concat(s.type).some(typed)) return fail('type');
    if (Object.hasOwn(s, 'const') && !equal(s.const, value)) valid = fail('const');
    if (s.enum && !s.enum.some(v => equal(v, value))) valid = fail('enum');
    if (s.anyOf && !s.anyOf.some(v => validate(v, value, path, [], depth + 1))) valid = fail('anyOf');
    if (s.allOf) for (const v of s.allOf) valid = validate(v, value, path, errors, depth + 1) && valid;
    if (s.if) {
      const branch = validate(s.if, value, path, [], depth + 1) ? s.then : s.else;
      if (branch !== undefined) valid = validate(branch, value, path, errors, depth + 1) && valid;
    }
    if (object(value)) {
      for (const k of s.required ?? []) if (!Object.hasOwn(value, k)) valid = fail('required:' + k);
      for (const [k, v] of Object.entries(value)) {
        const property = s.properties && Object.hasOwn(s.properties, k) ? s.properties[k] : s.additionalProperties;
        if (property !== undefined) valid = validate(property, v, path+'/'+k.replace(/~/g,'~0').replace(/\//g,'~1'), errors, depth + 1) && valid;
      }
    }
    if (Array.isArray(value) && s.items !== undefined) {
      value.forEach((v, i) => { valid = validate(s.items, v, path+'/'+i, errors, depth+1) && valid; });
    }
    if (typeof value === 'string') {
      const length = [...value].length;
      if (s.minLength !== undefined && length < s.minLength) valid = fail('minLength');
      if (s.maxLength !== undefined && length > s.maxLength) valid = fail('maxLength');
      if (s.pattern && !new RegExp(s.pattern, 'u').test(value)) valid = fail('pattern');
    }
    if (numeric) {
      if (s.minimum !== undefined && compare(numeric, decimal(s.minimum)) < 0) valid = fail('minimum');
      if (s.maximum !== undefined && compare(numeric, decimal(s.maximum)) > 0) valid = fail('maximum');
    }
    return valid;
  }
  return value => { const issues = []; const valid = validate(root, value, '', issues, 0); return { valid, issues }; };
}

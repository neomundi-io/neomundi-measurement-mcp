import { createHash } from 'node:crypto';
import { isObject, owns, scalar } from './contract.mjs';

// Transport evidence only, never a correction or a scientific assessment.
export class StreamIntegrity {
  constructor() { this.chunks = []; this.unknownChunks = false; }
  chunk(data) {
    if (!isObject(data) || !owns(data, 'content')) { this.unknownChunks = true; return true; }
    if (typeof data.content !== 'string' || !data.content.isWellFormed()) return false;
    this.chunks.push(data.content);
    return true;
  }
  finish(data) {
    const result = { status: 'not_assessed', checks: [], missing: [] };
    const fail = () => { result.status = 'failed'; return result; };
    if (!isObject(data) || !owns(data, 'response_text')) {
      result.missing.push('response_text'); return result;
    }
    const text = data.response_text;
    if (typeof text !== 'string' || !text.isWellFormed()) return fail();
    if (this.unknownChunks || (!this.chunks.length && text !== '')) result.missing.push('chunk_content');
    else if (this.chunks.join('') !== text) return fail();
    else result.checks.push('chunk_assembly');
    for (const [key, expected] of [
      ['response_length', [...text].length], ['response_bytes', Buffer.byteLength(text, 'utf8')],
    ]) {
      if (!owns(data, key)) result.missing.push(key);
      else if (!Number.isSafeInteger(scalar(data[key])) || scalar(data[key]) !== expected) return fail();
      else result.checks.push(key);
    }
    if (!owns(data, 'response_sha256')) result.missing.push('response_sha256');
    else if (typeof data.response_sha256 !== 'string' ||
      data.response_sha256.toLowerCase() !== createHash('sha256').update(text).digest('hex')) return fail();
    else result.checks.push('response_sha256');
    if (!result.missing.length) result.status = 'verified';
    return result;
  }
}

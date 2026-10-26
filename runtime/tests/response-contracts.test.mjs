import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { responseContract } from '../response-contracts.mjs';
import { measureExecution } from '../adapter.mjs';
import { compileSchema } from '../schema-validation.mjs';
import { execution, generation, jsonReply, sseReply, testConfig, view } from './helpers.mjs';

const rest = () => ({ contract_version:'neomundi.govern.rest/1.0', token_count_source:'caller_declared',
  token_count_scope:'caller_declared', token_count_unit:'tokens', request_id:'synthetic-contract-rest', mode:'OBS',
  governance:{ decision:'FLAG', confidence:0, decision_basis:'incomplete_measurement', reasons:[] },
  metrics:{energy_score:null,e_token:null,cost_proxy:null,latency_proxy:null,stability_score:null},
  baseline:{reference_energy:null,observed_energy:null,delta_E:null},
  audit:{measurement_version:'3.3.1',normalizer_version:'1.0.0',trace_id:'synthetic-trace'},
});
const done = () => ({ contract_version:'neomundi.govern.sse/1.0', token_count_source:'provider_usage',
  token_count_scope:'normalized_provider_total',token_count_unit:'tokens',
  audit:{measurement_version:'3.3.1',normalizer_version:'1.0.0',trace_id:'synthetic-trace'},
  request_id:'synthetic-contract-sse',timestamp:'2026-10-26T00:00:00',mode:'OBS',provider:'synthetic',model:'synthetic',
  decision:'FLAG',decision_basis:'incomplete_measurement',reasons:[],stability_score:null,r_score:0.2,regime:'SYNTHETIC',
  total_tokens:3,latency_ms:1,cost:0,stream_interrupted:false,response_text:'x',response_length:1,response_bytes:1,
  response_sha256:createHash('sha256').update('x').digest('hex'),counter_units:{total_tokens:'tokens'},
  is_long_form_safe:false,delta_g:{},measured_signals:[],unmeasured_signals:{coherence_score:'unavailable'},
  checks_emitted:0,trajectory_points:1,evaluators:{},measurement:null,confidence:0,
});

for (const [transport, factory] of [['json',rest],['sse',done]]) {
  test(`source-derived ${transport} schema validates partial/null response without mutating it`, () => {
    const payload=factory();payload.future={value:null};const before=JSON.stringify(payload);
    const result=responseContract(payload,transport);
    assert.equal(result.status,'validated');assert.equal(result.issues.length,0);
    assert.match(result.schema_sha256,/^[a-f0-9]{64}$/);
    assert.equal(JSON.stringify(payload),before);
  });
}
test('a version label and provenance alone cannot claim schema conformance', () => {
  const r=responseContract({contract_version:'neomundi.govern.sse/1.0',token_count_source:'provider_usage'},'sse');
  assert.equal(r.status,'invalid');assert.ok(r.issues.length);
});
test('legacy payloads, RGC versions and missing provenance are not promoted', () => {
  assert.equal(responseContract({state:'complete'},'json').status,'not_identified');
  assert.equal(responseContract({contract_version:'0.1.0'},'json').status,'unsupported');
  const p=rest();delete p.token_count_source;
  assert.equal(responseContract(p,'json').status,'invalid');
});
test('using a valid REST envelope on the SSE route is rejected', () => {
  const r=responseContract(rest(),'sse');
  assert.equal(r.status,'invalid');assert.equal(r.issues[0].keyword,'route_mismatch');
});
for (const [key,value] of [['token_count_source','made_up'],['token_count_unit','chunks'],
  ['token_count_scope','content_chunks'],['response_length',-1],['response_sha256','bad'],['decision',false]]) {
  test(`SSE contract rejects ${key} mismatch`,()=>{
    assert.equal(responseContract({...done(),[key]:value},'sse').status,'invalid');
  });
}
test('chunk fallback has its own explicit unit and scope and remains valid',()=>{
  const p={...done(),token_count_source:'chunk_count_fallback',token_count_scope:'content_chunks',token_count_unit:'chunks'};
  p.counter_units.total_tokens='chunks';
  assert.equal(responseContract(p,'sse').status,'validated');
  p.counter_units.total_tokens='tokens';
  assert.equal(responseContract(p,'sse').status,'invalid');
});
test('actual adapter validates REST and SSE schemas independently of integrity',async()=>{
  const a=await measureExecution(execution(),{config:testConfig(),fetchImpl:async()=>jsonReply(JSON.stringify(rest()))});
  assert.equal(a.validation.contract,'validated');assert.equal(a.contract_validation.status,'validated');
  assert.equal(a.integrity.status,'not_assessed');
  const data=done();
  const b=await measureExecution(generation(),{config:testConfig(),fetchImpl:async()=>sseReply(
    'event: chunk\ndata: {"content":"x"}\n\nevent: done\ndata: '+JSON.stringify(data)+'\n\n')});
  assert.equal(b.validation.contract,'validated');assert.equal(b.integrity.status,'verified');
  assert.deepEqual(view(b.response),data);assert.equal(b.response.stability_score,null);
});
test('an intermediate SSE version cannot fill missing final contract metadata',async()=>{
  const data=done();delete data.contract_version;
  const result=await measureExecution(generation(),{config:testConfig(),fetchImpl:async()=>sseReply(
    'event: provider_info\ndata: {"contract_version":"neomundi.govern.sse/1.0"}\n\n'+
    'event: chunk\ndata: {"content":"x"}\n\nevent: done\ndata: '+JSON.stringify(data)+'\n\n')});
  assert.equal(result.contract_validation.status,'not_identified');
  assert.equal(result.validation.contract,'not_validated');
  assert.ok(result.validation.metadata_gaps.includes('contract_version_missing'));
});
test('unknown assertion keywords and remote references fail closed',()=>{
  assert.throws(()=>compileSchema({type:'string',minProperties:1}),/unsupported_schema_keyword/);
  assert.throws(()=>compileSchema({$ref:'https://example.invalid/schema'}),/remote_schema_ref_refused/);
});
test('numeric constraints use exact JSON decimal values without IEEE rounding',()=>{
  const integer=compileSchema({type:'integer',minimum:0});
  for(const text of ['9007199254740993','1e999','10.000','0.0','-0']) {
    assert.equal(integer(JSON.rawJSON(text)).valid,true,text);
  }
  for(const text of ['9007199254740992.1','-1e-999','0.0000000000000000001']) {
    assert.equal(integer(JSON.rawJSON(text)).valid,false,text);
  }
  const bounded=compileSchema({type:'number',maximum:1,minimum:0});
  assert.equal(bounded(JSON.rawJSON('1.00000000000000000001')).valid,false);
  assert.equal(bounded(JSON.rawJSON('0.99999999999999999999')).valid,true);
  assert.equal(bounded(JSON.rawJSON('-1e-999')).valid,false);
  const exact=compileSchema({const:1});
  assert.equal(exact(JSON.rawJSON('1e0')).valid,true);
  assert.equal(exact(JSON.rawJSON('1.00000000000000000001')).valid,false);
});
test('bundled schemas remain exactly the audited backend artifact bytes',()=>{
  for(const [version,name,transport] of [['neomundi.govern.rest/1.0','govern-rest-1.0.json','json'],
    ['neomundi.govern.sse/1.0','govern-sse-1.0.json','sse']]) {
    const bytes=readFileSync(new URL('../schemas/contracts/'+name,import.meta.url));
    const result=responseContract({contract_version:version},transport);
    assert.equal(result.schema_sha256,createHash('sha256').update(bytes).digest('hex'));
  }
});

// What is known about a SPECIFIC divergence, beside the verdict that there is
// one. No recorded response is needed here, so these run everywhere.
//
// The question this answers. A deployment serving a later measurement version
// makes every single call `divergent`, and `divergent` reads as "not
// comparable". Guidance 5.6 asks an integrator to report a divergence rather
// than absorb it — but reporting every version bump identically tells nobody
// whether their series survived it. `divergence_scope` carries what was
// established about one version pair, per transport, or stays null.
//
// What these tests protect. That the scope never contradicts, softens or
// replaces `agreement`; that an unknown version gets no scope at all; and that
// the table cannot go stale behind the pinned version without the scope
// disappearing with it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { measureExecution } from '../adapter.mjs';
import { matches, outputSchema, parseApiJson, toolDefinition } from '../contract.mjs';
import {
  AGREEMENT, BACKEND_REFERENCE, VERSION_EQUIVALENCE, divergenceScope, measurementReference,
} from '../reference.mjs';
import { apiMock, execution, generation, jsonReply, sseReply, testConfig, view } from './helpers.mjs';

const audited = (audit, rest = {}) => parseApiJson(JSON.stringify({ ...rest, audit }));
const DECLARED = '3.3.1';

test('the equivalence table is frozen, and every entry is fully stated', () => {
  assert.equal(Object.isFrozen(VERSION_EQUIVALENCE), true);
  const entries = Object.entries(VERSION_EQUIVALENCE);
  assert.ok(entries.length >= 1);
  for (const [version, entry] of entries) {
    assert.equal(Object.isFrozen(entry), true);
    assert.throws(() => { entry.rest = 'identical'; }, TypeError);
    // The key and the value must agree: a table indexed by one version and
    // describing another would attach a scope to the wrong result.
    assert.equal(entry.received_measurement_version, version);
    // An entry must name what it does NOT fix and where it was read, or it is
    // a reassurance rather than a finding.
    for (const field of ['summary', 'unchanged_by_the_bump', 'evidence']) {
      assert.equal(typeof entry[field], 'string');
      assert.ok(entry[field].trim().length > 0, `${version}.${field}`);
    }
    assert.ok(['identical', 'may_differ', 'unknown'].includes(entry.rest));
    assert.ok(['identical', 'may_differ', 'decision_may_differ', 'unknown'].includes(entry.sse));
  }
});

test('the 3.3.1 entry states the REST and streaming outcomes separately', () => {
  const entry = VERSION_EQUIVALENCE[DECLARED];
  assert.ok(entry, '3.3.1 must be described: it is the version the deployment declares');
  assert.equal(entry.expected_measurement_version, BACKEND_REFERENCE.measurement_version);
  assert.equal(entry.rest, 'identical');
  // Not `identical`: the published measurement is unchanged, the decision
  // assigned from it can differ. Collapsing the two would lose the whole point.
  assert.equal(entry.sse, 'decision_may_differ');
  assert.match(entry.evidence, /68d6057\.\.aeff13c/);
  assert.match(entry.unchanged_by_the_bump, /invariance/i);
});

test('a scope is attached only to a divergence, never to any other verdict', () => {
  for (const agreement of [AGREEMENT.MATCH, AGREEMENT.DECLARED_UNUSABLE, AGREEMENT.NOT_DECLARED]) {
    assert.equal(divergenceScope(agreement, DECLARED), null, agreement);
  }
  assert.notEqual(divergenceScope(AGREEMENT.DIVERGENT, DECLARED), null);
});

test('an undescribed version diverges with no scope at all', () => {
  // The honest answer: nothing has been established about it. Inventing a
  // scope from a version number would be exactly the inference this table
  // exists to refuse.
  for (const unknown of ['3.4.0', '4.0.0', '3.3.2', '3.2.0', '', 'next']) {
    assert.equal(divergenceScope(AGREEMENT.DIVERGENT, unknown), null, unknown);
  }
});

test('the scope is withheld if the table no longer matches the pinned version', () => {
  // Guards the one way this could mislead: the pin moves, the table does not,
  // and a stale equivalence keeps being published as if it were current.
  const stale = { ...VERSION_EQUIVALENCE[DECLARED], expected_measurement_version: '0.0.0' };
  assert.equal(divergenceScope(AGREEMENT.DIVERGENT, DECLARED, { [DECLARED]: stale }), null);
});

test('a response declaring 3.3.1 is divergent, and says what that divergence covers', () => {
  const reference = measurementReference(audited({ measurement_version: DECLARED, normalizer_version: '1.0.0' }));
  // The verdict is unchanged. This is the assertion that matters most.
  assert.equal(reference.agreement, AGREEMENT.DIVERGENT);
  assert.equal(reference.received_measurement_version, DECLARED);
  assert.equal(reference.expected_measurement_version, '3.3.0');
  assert.equal(reference.divergence_scope.rest, 'identical');
  assert.equal(reference.divergence_scope.sse, 'decision_may_differ');
});

test('every other verdict carries divergence_scope null, and the field is always present', () => {
  const cases = [
    [null, AGREEMENT.NOT_DECLARED],
    [audited({ measurement_version: '3.3.0' }), AGREEMENT.MATCH],
    [audited({ measurement_version: '' }), AGREEMENT.DECLARED_UNUSABLE],
    [audited({ measurement_version: '9.9.9' }), AGREEMENT.DIVERGENT],
  ];
  for (const [response, expected] of cases) {
    const reference = measurementReference(response);
    assert.equal(reference.agreement, expected);
    assert.equal(Object.hasOwn(reference, 'divergence_scope'), true);
    assert.equal(reference.divergence_scope, null);
  }
});

test('a JSON call against a 3.3.1 instance publishes the scope, and stays schema-valid', async () => {
  const payload = { decision: 'ALLOW', audit: { measurement_version: DECLARED, normalizer_version: '1.0.0' } };
  const mock = apiMock(jsonReply(JSON.stringify(payload)));
  const output = await measureExecution(execution(), { config: testConfig(), fetchImpl: mock.fetch });
  assert.equal(output.adapter_error, null);
  assert.equal(output.measurement_reference.agreement, AGREEMENT.DIVERGENT);
  assert.equal(output.measurement_reference.divergence_scope.received_measurement_version, DECLARED);
  assert.equal(output.measurement_reference.divergence_scope.rest, 'identical');
  // The payload itself is untouched: a scope is a statement beside the
  // response, exactly like the reading aid.
  assert.deepEqual(view(output.response), payload);
  assert.equal(matches(outputSchema, output), true);
});

test('the SSE done event declares no version, so no scope is attached there either', async () => {
  const mock = apiMock(sseReply('event: done\ndata: {"decision":"ALLOW"}\n\n'));
  const output = await measureExecution(generation(), { config: testConfig(), fetchImpl: mock.fetch });
  // ML-003: the streaming contract publishes no version at all, so the one
  // transport whose DECISION the bump can change is also the one where this
  // connector cannot tell which version produced it. Stated, not patched.
  assert.equal(output.measurement_reference.agreement, AGREEMENT.NOT_DECLARED);
  assert.equal(output.measurement_reference.divergence_scope, null);
  assert.equal(matches(outputSchema, output), true);
});

test('the tool description tells an agent the scope exists and never overrides the verdict', () => {
  // An agent reads the tool description, not this repository. If the field
  // were published without being described there, it would be noise.
  const text = toolDefinition.description;
  assert.match(text, /divergence_scope is null unless/);
  assert.match(text, /never overrides the agreement/);
  // The original instruction must survive the addition.
  assert.match(text, /divergent means not comparable/);
});

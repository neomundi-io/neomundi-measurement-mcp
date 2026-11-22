/**
 * BL-V1-001 / BL-V1-002 — mesurer sans avoir observe les metriques.
 *
 * L'API accepte depuis le 2026-11-21 qu'une observation arrive SANS
 * `token_count` ni `latency_ms`, et meme sans le bloc `raw_metrics` du
 * tout : un appelant qui n'a pas execute l'appel LLM n'a pas ces
 * nombres, et la consigne est de les OMETTRE plutot que de les inventer.
 *
 * 🔴 Le plugin, lui, les exigeait encore. Mesure du 2026-11-22, sur son
 * propre validateur :
 *
 *     REFUSE  raw_metrics omis
 *     REFUSE  bloc present, les deux metriques omises
 *     REFUSE  bloc present, les deux metriques a null
 *     ACCEPTE bloc complet
 *
 * Le refus venait du plugin, pas de l'API : `adapter.mjs` valide
 * `inputSchema` AVANT tout appel reseau et leve `INVALID_ARGUMENTS`. Un
 * appelant conforme au contrat publie etait donc arrete en amont, et le
 * message ne disait pas que c'etait le plugin qui refusait.
 *
 * 🔴 Et `null` devait etre accepte autant que l'omission. Sinon un
 * appelant qui DECLARE explicitement n'avoir rien observe est refuse
 * pour l'avoir dit -- ce qui pousse exactement au `0` invente que
 * BL-V1-001 existe pour empecher.
 *
 * Ce fichier fige les deux sens : ce qui doit passer, et ce qui doit
 * continuer d'etre refuse. Relacher une exigence ne doit pas relacher la
 * validation.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { inputSchema, matches } from '../contract.mjs';

const ACCEPTE = [
  ['le bloc entier omis (BL-V1-002)',
    { execution: { source_type: 'llm', mode: 'OBS', llm_response: 'r' } }],
  ['les deux metriques omises (BL-V1-001)',
    { execution: { raw_metrics: { prompt_length: 42, response_length: 266, model_name: 'gpt-4o' } } }],
  ['les deux metriques a null, declarees absentes',
    { execution: { raw_metrics: { token_count: null, latency_ms: null } } }],
  ['token_count seul omis',
    { execution: { raw_metrics: { latency_ms: 230.5 } } }],
  ['latency_ms seule omise',
    { execution: { raw_metrics: { token_count: 1500 } } }],
  ['un bloc vide, equivalent a son omission',
    { execution: { raw_metrics: {} } }],
  ['un bloc complet, appelant qui a vraiment execute',
    { execution: { raw_metrics: { token_count: 1500, latency_ms: 230.5, cost: 0.003,
      semantic_risk: 0, prompt_length: 480, response_length: 1200, model_name: 'gpt-4o' } } }],
];

const REFUSE = [
  ['un token_count negatif', { execution: { raw_metrics: { token_count: -1 } } }],
  ['une latency_ms negative', { execution: { raw_metrics: { latency_ms: -0.1 } } }],
  ['un token_count en texte', { execution: { raw_metrics: { token_count: '1500' } } }],
  ['un token_count fractionnaire', { execution: { raw_metrics: { token_count: 1.5 } } }],
  ['une latency_ms en texte', { execution: { raw_metrics: { latency_ms: 'vite' } } }],
  ['un champ inconnu dans le bloc', { execution: { raw_metrics: { inconnu: 1 } } }],
  ['un champ inconnu dans execution', { execution: { inconnu: 1 } } ],
  ['un model_name vide', { execution: { raw_metrics: { model_name: '' } } }],
  ['un semantic_risk au-dela de 1', { execution: { raw_metrics: { semantic_risk: 1.5 } } }],
];

for (const [nom, args] of ACCEPTE) {
  test(`accepte ${nom}`, () => {
    assert.equal(matches(inputSchema, args), true,
      `le plugin doit accepter ce que l'API accepte : ${nom}`);
  });
}

for (const [nom, args] of REFUSE) {
  test(`refuse encore ${nom}`, () => {
    assert.equal(matches(inputSchema, args), false,
      `relacher une exigence ne doit pas relacher la validation : ${nom}`);
  });
}

test("ni le bloc ni les deux metriques ne sont declares requis", () => {
  const execution = inputSchema.properties.execution;
  const raw = execution.properties.raw_metrics;

  assert.equal(Object.hasOwn(execution, 'required'), false,
    'BL-V1-002 : `raw_metrics` ne doit plus etre exige');
  assert.equal(Object.hasOwn(raw, 'required'), false,
    'BL-V1-001 : `token_count` et `latency_ms` ne doivent plus etre exiges');
});

test("les deux metriques admettent explicitement null", () => {
  const props = inputSchema.properties.execution.properties.raw_metrics.properties;

  assert.deepEqual(props.token_count.type, ['integer', 'null']);
  assert.deepEqual(props.latency_ms.type, ['number', 'null']);
});

test("le bloc reste ferme aux champs inconnus", () => {
  const raw = inputSchema.properties.execution.properties.raw_metrics;

  // 🔴 C'est ce qui empeche une faute de frappe de passer pour une
  // metrique : `latency` au lieu de `latency_ms` doit etre un refus,
  // pas une valeur perdue en silence.
  assert.equal(raw.additionalProperties, false);
  assert.equal(inputSchema.properties.execution.additionalProperties, false);
});

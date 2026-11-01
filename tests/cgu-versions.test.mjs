// Le registre des versions de CGU doit rester vrai.
//
// Ce que ces tests protègent. Une acceptation enregistre l'EMPREINTE du texte
// accepté. Si le texte change sans que l'empreinte suive, deux choses cassent
// en même temps : on ne peut plus prouver ce qui a été accepté, et on risque
// d'opposer à quelqu'un un texte qu'il n'a jamais lu.
//
// La bonne réaction à un échec ici n'est donc JAMAIS de recopier l'empreinte
// obtenue dans le registre. C'est de créer une NOUVELLE version.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { acceptableVersion, fingerprint, loadRegistry, verifyRegistry } from '../scripts/cgu-fingerprint.mjs';

test('chaque empreinte du registre correspond encore à son fichier', () => {
  const findings = verifyRegistry();
  assert.deepEqual(findings, [],
    'Une empreinte ne correspond plus. Le texte a changé : créer une NOUVELLE '
    + 'version dans legal/cgu-versions.json, et ne pas corriger l\'empreinte de l\'ancienne.');
});

test('les fichiers épinglés existent et sont les CGU', () => {
  for (const entry of loadRegistry().versions) {
    for (const [langue, document] of Object.entries(entry.documents)) {
      const texte = readFileSync(new URL('../' + document.fichier, import.meta.url), 'utf8');
      assert.match(document.fichier, /^legal\/CGU_MCP_(FR|EN)\.md$/);
      assert.equal(fingerprint(document.fichier), document.sha256);
      // Le texte doit porter la clause qui justifie tout le reste.
      const invariant = langue === 'fr'
        ? /n'est pas une autorisation d'exécution/
        : /is not an execution permission/;
      assert.match(texte, invariant, `${document.fichier} doit conserver la clause centrale`);
    }
  }
});

test('une version acceptable est complètement décrite, ou elle ne l\'est pas', () => {
  // Le piège à éviter : marquer une version acceptable alors qu'on ne peut ni
  // la dater ni la retrouver en ligne. L'acceptation désignerait alors un
  // texte introuvable.
  for (const entry of loadRegistry().versions) {
    if (!entry.acceptable) continue;
    assert.ok(entry.date_entree_en_vigueur, `${entry.version} : date d'entrée en vigueur requise`);
    for (const [langue, document] of Object.entries(entry.documents)) {
      assert.ok(document.url_publiee, `${entry.version}/${langue} : url_publiee requise`);
      assert.match(document.url_publiee, /^https:\/\//);
    }
    assert.ok(entry.langue_faisant_foi, `${entry.version} : langue faisant foi requise`);
  }
});

test('aucune version n\'est acceptable tant que les CGU sont un projet', () => {
  // Garde volontaire. Elle tombera le jour où une version est validée et
  // publiée — et ce test devra alors être mis à jour SCIEMMENT, pas par
  // accident.
  const acceptable = acceptableVersion();
  const projets = loadRegistry().versions.filter((entry) => entry.statut === 'projet');
  for (const entry of projets) {
    assert.equal(entry.acceptable, false,
      `${entry.version} est un projet : aucune acceptation ne peut être recueillie dessus`);
  }
  if (acceptable === null) {
    assert.ok(projets.length > 0, 'si rien n\'est acceptable, il doit exister au moins un projet');
  }
});

test('les versions sont uniques et les empreintes distinctes', () => {
  const registry = loadRegistry();
  const versions = registry.versions.map((e) => e.version);
  assert.equal(new Set(versions).size, versions.length, 'deux entrées portent le même numéro de version');
  const empreintes = registry.versions.flatMap((e) => Object.values(e.documents).map((d) => d.sha256));
  assert.equal(new Set(empreintes).size, empreintes.length, 'deux documents partagent une empreinte');
  for (const h of empreintes) assert.match(h, /^[0-9a-f]{64}$/);
});

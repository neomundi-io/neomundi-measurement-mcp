/** Empreintes des versions de CGU — calcul et vérification.
 *
 * POURQUOI UNE EMPREINTE. Une acceptation doit pouvoir désigner **quel texte
 * exact** a été accepté. Nommer « la version 0.3 » ne suffit pas : un texte
 * peut être retouché sans changer de numéro. Nommer l'URL ne suffit pas non
 * plus : la page change de balisage avec le thème.
 *
 * On épingle donc l'empreinte SHA-256 du **texte canonique** — le fichier
 * Markdown de ce dépôt, dont la page publiée est dérivée. Une acceptation qui
 * enregistre cette empreinte reste vérifiable des années plus tard, sans
 * archiver une copie du document auprès de chaque participant.
 *
 * AUCUNE DÉPENDANCE, aucune infrastructure : `node:crypto` et `node:fs`.
 *
 *   node scripts/cgu-fingerprint.mjs            # vérifie le registre
 *   node scripts/cgu-fingerprint.mjs --compute  # recalcule et affiche
 */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
export const REGISTRY = join(root, 'legal', 'cgu-versions.json');

/** Empreinte d'un fichier du dépôt, par son chemin relatif à la racine.
 *
 * Les octets sont lus tels quels : aucune normalisation de fin de ligne, car
 * normaliser reviendrait à faire correspondre deux textes différents.
 */
export function fingerprint(relativePath) {
  return createHash('sha256').update(readFileSync(join(root, relativePath))).digest('hex');
}

export const loadRegistry = () => JSON.parse(readFileSync(REGISTRY, 'utf8'));

/** Vérifie que chaque empreinte du registre correspond à son fichier.
 *
 * Rend la liste des écarts. Un écart n'est pas forcément une faute : c'est le
 * signe qu'un texte a changé et qu'il faut créer une NOUVELLE version, pas
 * corriger l'empreinte de l'ancienne.
 */
export function verifyRegistry(registry = loadRegistry()) {
  const findings = [];
  for (const entry of registry.versions) {
    for (const [langue, document] of Object.entries(entry.documents)) {
      const actual = fingerprint(document.fichier);
      if (actual !== document.sha256) {
        findings.push({
          version: entry.version, langue, fichier: document.fichier,
          attendue: document.sha256, obtenue: actual,
        });
      }
    }
    // Une version acceptable doit être complètement décrite, sinon une
    // acceptation désignerait un texte qu'on ne peut ni dater ni retrouver.
    if (entry.acceptable) {
      for (const [langue, document] of Object.entries(entry.documents)) {
        if (!document.url_publiee) {
          findings.push({ version: entry.version, langue, probleme: 'acceptable sans url_publiee' });
        }
      }
      if (!entry.date_entree_en_vigueur) {
        findings.push({ version: entry.version, probleme: 'acceptable sans date_entree_en_vigueur' });
      }
    }
  }
  return findings;
}

/** La version que l'on peut faire accepter aujourd'hui, ou null. */
export function acceptableVersion(registry = loadRegistry()) {
  return registry.versions.find((entry) => entry.acceptable === true) ?? null;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const registry = loadRegistry();
  if (process.argv.includes('--compute')) {
    for (const entry of registry.versions) {
      for (const [langue, document] of Object.entries(entry.documents)) {
        process.stdout.write(`${entry.version}  ${langue}  ${fingerprint(document.fichier)}  ${document.fichier}\n`);
      }
    }
  } else {
    const findings = verifyRegistry(registry);
    const acceptable = acceptableVersion(registry);
    if (findings.length) {
      process.stderr.write(`ECART: ${findings.length} constat(s).\n`);
      for (const f of findings) process.stderr.write(`  ${JSON.stringify(f)}\n`);
      process.stderr.write('Une empreinte qui ne correspond plus signifie que le texte a change:\n'
        + 'creer une NOUVELLE version, ne pas corriger l empreinte de l ancienne.\n');
      process.exitCode = 1;
    } else {
      process.stdout.write(`OK: ${registry.versions.length} version(s), toutes les empreintes correspondent.\n`);
      process.stdout.write(acceptable
        ? `Version acceptable aujourd hui: ${acceptable.version}.\n`
        : 'Aucune version acceptable aujourd hui: aucune acceptation ne doit etre recueillie.\n');
    }
  }
}

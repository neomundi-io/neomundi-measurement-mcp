# Checklist de candidature — connecteur MCP NeoMundi

**Dressée le 1er novembre 2026** à partir des exigences officielles lues ce
jour-là, pas d'instructions antérieures. Les sources sont listées au §7 de
[`PLUGIN_RELEASE_READINESS.md`](PLUGIN_RELEASE_READINESS.md).

> **Un paquet qui se téléverse n'est pas un paquet soumissible.** La
> plateforme le dit : « *un téléversement réussi ne signifie pas que le
> référencement est prêt à être soumis* ». Les limites ci-dessous sont celles
> de la **soumission**, pas celles du dépôt de fichier.

---

## 0. L'ordre réel

```
ÉTAPE 0   Trancher B-1 : OAuth, dérogation, ou bureau seulement   [SÉBASTIEN]
             |                       rien en aval ne bouge avant
             +--> en parallèle, sans dépendance :
                  vérification d'identité d'organisation          [SÉBASTIEN]
                  jeton de défi de domaine sur neomundi.org       [SÉBASTIEN]
                  origine dédiée de la carte (un nom d'hôte)      [SÉBASTIEN]
ÉTAPE 1   Brancher et mesurer réellement depuis ChatGPT
ÉTAPE 2   Rejouer les 8 cas depuis l'hôte, capturer
ÉTAPE 3   Vidéo, compte de démonstration, dossier
ÉTAPE 4   Revérifier manifeste, URL et empreintes le jour J
ÉTAPE 5   Téléverser, résoudre les constats, soumettre
```

---

## 1. Paquet et manifeste — **FAIT**

| | Exigence | État |
|---|---|---|
| ☑ | `plugin.json` valide contre le schéma officiel **téléchargé** | `node scripts/validate-manifests.mjs` |
| ☑ | `mcp.json` valide contre le schéma officiel **téléchargé** | idem |
| ☑ | `$schema` présent et canonique dans les deux | tenu par un test |
| ☑ | `name` ≤ 64, minuscules, tirets simples | `neomundi-measurement` |
| ☑ | `version` sémantique explicite | `0.3.0-rc.1` |
| ☑ | Aucun champ hors du manifeste clos | `icons` retiré |
| ☑ | Réglages OpenAI sous `extensions.com.openai` | et **`interface` imbriqué** |
| ☑ | `review` et `publication` **à côté** d'`interface`, jamais dedans | tenu par un test |
| ☑ | Aucun secret, aucun `headers`, aucun `env` dans `mcp.json` | tenu par un test |
| ☑ | Paquet reconstruit, reproductible | `9dd06242…6bd6398`, 38 fichiers |

## 2. Métadonnées de référencement — **FAIT**

| | Champ | Limite | Valeur |
|---|---|---|---|
| ☑ | `displayName` | 30 | `NeoMundi Measurement` (20) |
| ☑ | `shortDescription` | 30 | `Measure an AI execution` (23) |
| ☑ | `longDescription` | 4000 | 971 — **en anglais**, comme exigé |
| ☑ | `developerName` | 80 | `Neomundi Recherche` (18) |
| ☑ | `category` | titre du tableau de bord | `Developer Tools` |
| ☑ | `websiteURL` | 1024, HTTPS | `https://neomundi.org` |
| ☑ | `supportURL` | 1024, HTTPS | `https://neomundi.org/contact` |
| ☑ | `privacyPolicyURL` | 1024, HTTPS | `…/politique-de-confidentialite` |
| ☑ | `termsOfServiceURL` | 1024, HTTPS | `…/cgu` |
| ☑ | `defaultPrompt` | 3 max, 128 chacun, uniques, sans `@` | 3 |
| ☑ | `publication.translations["fr-FR"]` | sous-titre 30, description 4000 | 26 / 980 |
| ☐ | `brandColor` | optionnel, contraste ≥ 2:1 | **non déclaré** — décision d'identité non prise |
| ☐ | `capabilities` | optionnel ici | **non déclaré** — vocabulaire du tableau de bord non lu |

> **Les quatre URL sont toutes exigées** pour une application MCP soumise à
> revue publique. Elles pointent vers les **pages françaises**, qui font foi.

## 3. Icônes et captures

| | Exigence | État |
|---|---|---|
| ☑ | `logo` déclaré, carré, ≥ 48 px, ≤ 4096 px | `./assets/icon-512.png` |
| ☑ | `composerIcon` déclaré | `./assets/icon-128.png` |
| ☑ | Format PNG/JPEG/WebP/SVG, ≤ 5 Mio | PNG |
| ☑ | Chemins relatifs préfixés `./` | tenu par un test |
| ☑ | Capture de la carte produite, **charge synthétique** | `…/plugin-candidature-20261101/captures/` |
| ☐ | Captures déclarées dans `screenshots` | **après** l'étape 2 — une capture prise dans l'hôte vaut mieux |
| ☐ | **`_meta.ui.domain`** : origine dédiée, **unique par plugin** | **exigée pour soumettre avec interface** — `B-4` |

## 4. Serveur MCP et authentification — **BLOQUÉ**

| | Exigence | État |
|---|---|---|
| ☑ | Serveur joignable sur un domaine public HTTPS | `mcp.neomundi.org`, TLS valide jusqu'au 6 décembre 2026 |
| ☑ | Aucun chemin ouvert sans jeton | `401` sur `/`, `/health`, `/mcp` |
| ☑ | Un seul serveur à connecter | un seul outil, `measure_execution` |
| ☑ | Annotations d'outil présentes et conformes au comportement | `readOnlyHint: false`, `openWorldHint: true` |
| ☑ | CSP de l'interface déclarée et exacte | `connectDomains: []`, `resourceDomains: []` — la carte ne charge rien |
| ☐ | **Méthode d'authentification connectable** | **`B-1` — clé d'API non supportée par le portail** |
| ☐ | **Défi de domaine servi en clair** | **`B-2`** — `401` sur l'hôte MCP ; **publier sur `neomundi.org`** |
| ☐ | Point d'entrée **distant** déclaré dans `mcp.json` | aujourd'hui `stdio` — ne basculer qu'après `B-1` |
| ☐ | Projet **sans résidence de données UE** | la plateforme refuse les soumissions MCP depuis un tel projet |

## 5. Dossier de revue

| | Exigence | État |
|---|---|---|
| ☑ | **Exactement 5 cas positifs**, avec `tools_triggered` et `expected_behavior` | dans `plugin.json` |
| ☑ | **Exactement 3 cas négatifs** | les trois qui prouvent que rien n'est inventé |
| ☑ | Aucun `test_credentials` ni `reviewer_instructions` dans le ZIP | **rejeté** par la plateforme ; tenu par un test |
| ☑ | `publication.release_notes` | présent |
| ☐ | **Les 8 cas rejoués depuis ChatGPT**, avec capture | après `B-1` |
| ☐ | **`review.demo_recording_url`** — vidéo accessible au relecteur | **`B-5`** |
| ☐ | **Compte de démonstration, identifiant + mot de passe, sans MFA** | **`B-6`** — saisi dans le formulaire sécurisé, jamais dans le paquet |
| ☐ | Justification si une iframe est utilisée | sans objet : la carte n'en ouvre aucune |

## 6. Identité et droits — **SÉBASTIEN**

| | Exigence | État |
|---|---|---|
| ☐ | **Vérification d'identité** individuelle ou d'entreprise, sous le nom de publication | **`B-3`** — « publier sous un nom non vérifié entraîne un rejet » |
| ☐ | Permission `api.apps.write` sur l'organisation | à confirmer |
| ☐ | Organisation et projet propriétaires choisis | à confirmer |
| ☑ | CGU v1.0 et politique de confidentialité **publiées**, FR et EN | `legal/README.md` |
| ☑ | Les deux URL résolvent | revérifier le jour J |
| ☑ | L'identité affichée est celle de l'association | tenu par un test |

> **Attention au nom.** Le référencement affiche le nom attaché à l'identité
> vérifiée, **pas** `developerName`. Les deux doivent désigner la même entité.
> Trois personnes morales distinctes existent côté NeoMundi : c'est
> **l'association** qui porte ce connecteur.

## 7. À rejouer le jour de la soumission

```
curl -s -o /dev/null -w "%{http_code}\n" https://neomundi.org/cgu
curl -s -o /dev/null -w "%{http_code}\n" https://neomundi.org/politique-de-confidentialite
curl -s -o /dev/null -w "%{http_code}\n" https://neomundi.org/contact
curl -s -o /dev/null -w "%{http_code}\n" https://neomundi.org
node scripts/cgu-fingerprint.mjs
node scripts/validate-manifests.mjs
node check-publication.mjs
npm test
node scripts/build-package.mjs
```

Quatre `200`, empreintes identiques au registre, deux `OK`, un `PASS`, la
suite verte, et l'empreinte du ZIP consignée.

> **Et retélécharger les deux schémas officiels.** `plugin.schema.json` a été
> modifié à la source le matin même du 2026-11-01. Si une empreinte a bougé,
> **ne pas éditer la copie archivée** : retélécharger et mettre à jour
> `schemas/agent-plugins/provenance.json`, puis relire ce que le changement
> implique.

## 8. Interdits, rappelés parce qu'ils sont tentants

- **Ne pas** mettre le jeton dans `headers` pour contourner `B-1`. La
  soumission publique rejette des en-têtes de serveur non vides, et la
  plateforme nomme explicitement ce contournement.
- **Ne pas** déclarer `auth.type: "none"` sur un serveur protégé.
- **Ne pas** inventer une URL, une politique, une couleur de marque ou une
  étiquette de capacité pour remplir un champ. Une URL qui ne résout pas est
  un motif de rejet déclaré.
- **Ne pas** produire une capture à partir d'un enregistrement réel : ce
  serait faire entrer des données d'exécution dans un dépôt public par
  l'image.
- **Ne pas** présenter le connecteur comme multi-utilisateur. L'accès n'est
  pas individualisé, **donc la suspension est collective** — et les CGU le
  disent déjà à l'article 6.
- **Ne pas** déployer, ni fusionner, sans autorisation explicite sur un SHA
  nommé.

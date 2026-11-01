# Point de clôture — connecteur MCP NeoMundi, 1er novembre 2026

**Clôture de la première phase du chantier.** Ce document fige l'état réel des
composants, composant par composant, avec son statut et sa preuve.

> ## Comment lire les statuts
>
> | Statut | Ce qu'il signifie |
> |---|---|
> | **VALIDÉ** | vérifié par exécution, et la preuve est citée ici |
> | **PARTIEL** | fonctionne, mais une limite connue restreint sa portée |
> | **NON TESTÉ** | jamais exercé — **pas** « probablement bon » |
> | **BLOQUÉ** | dépend d'une action qui n'a pas eu lieu |
>
> **Un composant joignable n'est pas un composant testé.** La distinction porte
> tout ce document : le serveur répond depuis l'extérieur, et pourtant
> « connexion depuis ChatGPT » est **NON TESTÉ**, parce que personne n'a
> connecté ChatGPT.

---

## 1. Tableau d'ensemble

| Composant | Statut | En une phrase |
|---|---|---|
| Serveur MCP | **VALIDÉ** | `0.3.0-rc.1` servi en HTTPS, authentification exigée sur tous les chemins |
| API de mesure | **PARTIEL** | la production déclare `3.3.1`, le connecteur est épinglé sur `3.3.0` |
| Plugin ChatGPT | **NON TESTÉ** | aucune connexion depuis ChatGPT n'a jamais été établie |
| Interface graphique | **PARTIEL** | 39 tests la couvrent ; jamais rendue dans ChatGPT |
| Image Docker | **VALIDÉ** | épinglée par empreinte, déployée, retour arrière armé |
| Paquet de distribution | **VALIDÉ** | reproductible **octet pour octet**, vérifié deux fois aujourd'hui |
| CGU | **VALIDÉ** | v1.0 publiées FR/EN, épinglées par empreinte |
| Politique de confidentialité | **VALIDÉ** | publiée FR/EN, couvre le service de mesure |
| Documentation | **VALIDÉ** | garde de publication verte sur 111 fichiers |
| GitHub | **PARTIEL** | 13 PR fusionnées, **3 PR empilées en brouillon** non fusionnées |

---

## 2. Serveur MCP — **VALIDÉ**

| | |
|---|---|
| Version servie | **`0.3.0-rc.1`** |
| Révision | **`da71f5d327da83247c5f4a69dfc1b6ea6e80f048`** |
| URL | `https://mcp.neomundi.org/mcp` — Streamable HTTP |
| En service depuis | **2026-11-01, 11:38 UTC** |
| Protocole MCP | `2025-06-18` (et `2025-03-26`) |
| Outil exposé | un seul — `measure_execution` |

**HTTPS.** Certificat Let's Encrypt (émetteur `YE2`), valide du **7 septembre**
au **6 décembre 2026**. Vérifié aujourd'hui.

**Authentification.** `/`, `/health` et `/mcp` répondent tous **`401`** sans
jeton. Vérifié aujourd'hui depuis l'extérieur. C'est un point important : il
n'existe **aucun** chemin ouvert, pas même un contrôle de santé.

> ### La limite qui compte — D-4
>
> **Un credential partagé ouvre le serveur pour tout le monde, et une seule clé
> API NeoMundi est dépensée derrière.** Il n'y a ni identité par utilisateur, ni
> révocation, ni périmètre, ni attribution d'usage. Acceptable pour un essai
> privé porté par l'association ; **ce n'est pas un connecteur
> multi-utilisateur**, et cela ne doit pas être présenté comme tel.

---

## 3. API de mesure — **PARTIEL**

| | |
|---|---|
| Version déclarée par la production | **`3.3.1`** |
| Version épinglée dans le connecteur | **`3.3.0`** |
| Conséquence | **toute** mesure ressort `version_agreement: divergent` |

La carte affiche donc « ce résultat n'est pas comparable aux autres ».
**C'est le comportement voulu** : `divergence_scope` n'écrase jamais l'accord.
Mais la portée publiée précise que **sur le chemin REST les deux versions sont
déclarées identiques** — le bandeau est donc plus prudent que la portée.

**Lever l'épinglage est un arbitrage produit, pas un correctif** — `D-8`.

### Mesure réelle, de bout en bout

| | |
|---|---|
| `request_id` | **`2ca02f65-e2de-4f21-a35d-0e845329d4b2`** |
| Réponse | HTTP 200 en **1,84 s** |
| Décision | `ALLOW` sur fondement `measured_thresholds` |
| État | mesure **`complete`**, **3 contrôles sur 3**, couverture `1` |
| Signaux | **cinq mesurés, aucun non mesuré** |
| Contrat | `contract_validation` = **`validated`** |
| Évaluateurs | réels — `nomic-embed-text`, `llama-guard3:1b` |

**Aucun signal ni provenance n'a été modifié.**

### Trois champs racine non modélisés — D-9

`token_count_scope`, `token_count_unit`, `stream_contract_metadata`. **La carte
les nomme plutôt que de les cacher.** À remonter au backend.

---

## 4. Plugin ChatGPT — **NON TESTÉ**

**C'est le point le plus important de ce document, et le plus facile à mal
lire.**

| Question | Réponse honnête |
|---|---|
| Le serveur est-il joignable depuis l'extérieur ? | **oui**, vérifié |
| Un hôte MCP réel a-t-il été connecté ? | **oui** — **Claude Code 2.1.247**, `ML-009` |
| **ChatGPT a-t-il été connecté ?** | **NON. Jamais.** |
| La carte a-t-elle été rendue dans ChatGPT ? | **non** |

**Ce que `ML-009` établit, et ce qu'il n'établit pas.** Un hôte a été connecté :
`✔ Connected`, poignée de main au protocole `2025-06-18`, outil découvert et
invoqué. Mais **l'amont était un substitut local** servant une réponse
enregistrée : cela valide le chemin du connecteur et le transport MCP, **pas la
conformité de contrat face à un déploiement**. `LIVE_API_VALIDATED` reste non
décerné. **Exactement un** hôte a été vérifié, et les noms de champs de
configuration varient d'un hôte à l'autre.

### Ce qui bloque l'ajout dans ChatGPT

**`P-6` — le bloc `auth` n'est pas déclaré dans `mcp.json`.** Sa forme doit être
vérifiée contre le schéma officiel. C'est la seule marche technique restante
avant une première connexion.

---

## 5. Interface graphique — **PARTIEL**

| | |
|---|---|
| Code | `runtime/ui/card.mjs`, `runtime/ui/view-model.mjs` |
| Ressource MCP Apps | `ui://neomundi-measurement/card-v1.html` |
| Type | `text/html;profile=mcp-app` |
| CSP déclarée | **vide** — la carte ne charge rien |
| Tests | **17** (`card-view-model`) + **22** (`presentation`) = **39** |

**Ce que la carte garantit.** Elle affiche la décision **et son fondement**,
l'état de la mesure, les signaux mesurés **et non mesurés avec leur cause**, et
la provenance. Les `null` et les états restent visibles. **Aucune valeur n'est
calculée ni interprétée** : `view-model.mjs` est une fonction pure, le
vocabulaire est figé, et l'absence se dit `non publié`.

**Ce qui n'est pas vérifié.** Le rendu **dans ChatGPT**. Le code est testé, la
ressource est servie et a été lue depuis l'extérieur ; personne n'a vu la carte
s'afficher dans l'hôte cible — `P-9` demande d'ailleurs une capture, à produire
depuis une charge **synthétique**.

---

## 6. Image Docker — **VALIDÉ**

| | |
|---|---|
| Image déployée | **`sha256:a50a2679d18e…`** |
| Base | `node@sha256:8a32c8cf649a49915a66e81e7a609223c708d0adabf288ee3f4077d765542f85` |
| Dépendances d'exécution | **aucune** — uniquement des modules `node:` |
| Durcissement | `read_only: true`, port lié à la boucle locale en local |
| Arrêt | `stop_grace_period: 45s`, SIGTERM traité |

**Pourquoi 45 s et non 10.** Une mesure en vol **n'est pas relancée** : couper
court laisse une issue inconnue, et le connecteur ne peut pas demander à
NeoMundi si l'appel a été facturé.

### Procédure de déploiement et retour arrière

Détail, empreintes et commandes : [`docs/DEPLOIEMENT_HTTPS.md`](docs/DEPLOIEMENT_HTTPS.md) §0.

```bash
# retour arriere, en deux commandes
sudo systemctl disable --now neomundi-mcp-docker.service
sudo systemctl enable  --now neomundi-mcp.service
```

L'unité `0.1.0` est **conservée**, le dépôt de retour arrière est resté à
`0cbd369`, et il n'y a **ni base, ni état persistant, ni migration**. Le retour
arrière a été **armé et vérifié**.

> **Un index OCI n'est pas un manifeste de plateforme.** L'empreinte de base
> ci-dessus désigne l'index ; lire la plateforme exige
> `docker manifest inspect --verbose`.

---

## 7. Paquet de distribution — **VALIDÉ**

| | |
|---|---|
| Fichier | `dist/neomundi-measurement-0.3.0-rc.1.zip` (hors Git — `dist/` est ignoré) |
| Construction | `node scripts/build-package.mjs` |
| Contenu | **38 fichiers**, **172 817 octets** |
| Empreinte | **`7ad3e53327f3214a8705802260ec7f5fc0051467534aa102e7d160b8eff6fe0b`** |

**Reproductible octet pour octet** : deux constructions successives aujourd'hui
ont rendu **la même empreinte**. C'est vérifié, pas supposé.

Le paquet embarque le manifeste, `mcp.json`, les deux descripteurs d'hôte, les
deux README, la documentation du plugin et des contrats, la compétence, les
onze modules d'exécution, la carte et son modèle de vue, et les schémas d'entrée
et de sortie.

> **L'image Docker, elle, n'est pas reproductible au même titre** : les couches
> le sont, l'identifiant d'image non. Ne pas confondre les deux garanties.

---

## 8. CGU — **VALIDÉ**

| | Français — **fait foi** | Anglais — information |
|---|---|---|
| Page | **`https://neomundi.org/cgu`** | **`https://neomundi.org/en/terms-of-use`** |
| Identifiant | 3772 | 3773 |
| Version | **1.0**, en vigueur depuis le **2026-11-01**, **sans rétroactivité** |
| Source canonique | `legal/CGU_MCP_FR.md` | `legal/CGU_MCP_EN.md` |
| Empreinte SHA-256 | `01e5191f5b0f55785a8c43cd86f3286164a55387b95b3d7a83bf330b7a79034d` | `346de3fc524d0ac0c2efa17c12ab384b0e264ca0bbe7c5084cb079a294e4473d` |

`node scripts/cgu-fingerprint.mjs` → « OK : 1 version(s). Version acceptable
aujourd'hui : 1.0. » **Les empreintes portent sur les octets versionnés**
(`eol=lf`), pas sur une copie de travail.

`termsOfServiceURL` du manifeste pointe vers **la page française**, celle qui
fait foi.

> **Les douze clauses non arbitrées ont été retirées du texte, pas tranchées.**
> Elles sont suivies hors dépôt. Lire les CGU et en conclure que les questions
> juridiques sont réglées est l'erreur que ce découpage rend facile.

---

## 9. Politique de confidentialité — **VALIDÉ**

| | Français — **fait foi** | Anglais |
|---|---|---|
| Page | **`https://neomundi.org/politique-de-confidentialite`** | **`https://neomundi.org/en/privacy-policy`** |
| Identifiant | 916 | 919 |
| Statut | **publiée**, mise à jour le 2026-11-01 | **publiée** |
| Copie canonique | `legal/POLITIQUE_CONFIDENTIALITE_FR.md` | `legal/PRIVACY_POLICY_EN.md` |
| Empreinte SHA-256 | `c6e9b0a9a732986b01968cbbd66cf9f83d3387857de972a9029a884332456ec2` | `29b50bfab4c554eb10eb7a5ee991a3d3ed96479195bc0aae6fd11a05fa6340d7` |

Elle **couvre le service de mesure** depuis le 2026-11-01 — section « Service de
mesure NeoMundi », quatorze sous-sections. C'est ce qui lève `P-3`, qui était un
**motif de rejet explicite** de la candidature.

**Le sens de versionnage est inversé par rapport aux CGU, et c'est voulu** : ces
copies sont **dérivées des pages servies**. Une divergence fichier/page est
impossible par construction.

---

## 10. Documentation — **VALIDÉ**

| Document | Objet |
|---|---|
| [`START_HERE.md`](START_HERE.md) | **point d'entrée unique** de reprise |
| [`KNOWN_LIMITATIONS.md`](KNOWN_LIMITATIONS.md) | `BL-*` backend, `ML-*` connecteur — **la source sur ce qui n'est pas acquis** |
| [`docs/PUBLICATION.md`](docs/PUBLICATION.md) | candidature : §4.1 prêt, §4.2 bloquant |
| [`docs/DEPLOIEMENT_HTTPS.md`](docs/DEPLOIEMENT_HTTPS.md) | déploiement, empreintes, retour arrière |
| [`docs/PLUGIN.md`](docs/PLUGIN.md) · [`PLUGIN_FR.md`](docs/PLUGIN_FR.md) | installation |
| [`docs/RESPONSE_CONTRACTS.md`](docs/RESPONSE_CONTRACTS.md) · [`_FR`](docs/RESPONSE_CONTRACTS_FR.md) | contrats REST/SSE |
| [`PLUGIN_ARCHITECTURE.md`](PLUGIN_ARCHITECTURE.md) · [`PLUGIN_GAP_ANALYSIS.md`](PLUGIN_GAP_ANALYSIS.md) · [`PLUGIN_ROADMAP.md`](PLUGIN_ROADMAP.md) | compatibilité plugin |
| [`LEGAL_STATUS_V1.md`](LEGAL_STATUS_V1.md) | **source unique** sur l'état de publication juridique |
| [`legal/README.md`](legal/README.md) | textes publiés et leurs empreintes |

**Garde de publication** : `node check-publication.mjs` → **PASS, 111 fichiers
publiables**, aucun chemin interdit, aucun motif de secret connu, aucune trace
de machine locale, empreintes de schémas archivés préservées, aucun lien vers un
fichier exclu.

### Séparation public / interne — vérifiée

**Aucun document interne n'est dans le dépôt.** `legal/` ne contient que les
quatre textes publiés, leur README et le registre des versions. Recherche sur
`convention`, `licence`, `PV`, `NDA`, `statut`, `acceptation`, `interne`,
`draft` dans l'index Git : **zéro résultat**.

Les projets vivent hors dépôt, en statut PROJET, dans
`DOCUMENTATION/Interne/DOSSIER_JURIDIQUE_MCP_DRAFT/`, avec un registre de
consolidation dont l'échéance est le **11 novembre 2026**.

> **Une réserve d'honnêteté** : l'historique Git garde la trace du passage de
> ces projets dans le dépôt, avant leur retrait du 2026-11-01. Le retrait
> protège les versions futures, pas les anciennes.

---

## 11. GitHub — **PARTIEL**

### Branche et commits

| | |
|---|---|
| `origin/main` | **`da71f5d327da83247c5f4a69dfc1b6ea6e80f048`** |
| **Révision servie en production** | **la même** — `da71f5d` |
| Travail de clôture | branche `chore/cloture-session-20261101` |
| Modifications locales | **aucune**, hors `AGENTS.md` non suivi (voir §13) |

**`main` est exactement ce qui tourne.** C'est net, et il faut le savoir :
**tout le corpus juridique et documentaire du 1er novembre est absent de
`main`** — il attend dans trois PR empilées.

### Les seize PR

| # | État | Branche → base |
|---|---|---|
| **16** | **FUSIONNÉE** | `legal/politique-confidentialite-20261101` → `docs/cloture-juridique-20261101` |
| **15** | **FUSIONNÉE** | `legal/publication-cgu-20261101` → `docs/cloture-juridique-20261101` |
| **14** | **FUSIONNÉE** | `legal/acceptation-cgu-20261101` → `docs/cloture-juridique-20261101` |
| **13** | **FUSIONNÉE** | `legal/dossier-juridique-20261101` → `docs/cloture-juridique-20261101` |
| **12** | **BROUILLON** | `docs/cloture-juridique-20261101` → `audit/cgu-prepublication-20261101` |
| **11** | **BROUILLON** | `audit/cgu-prepublication-20261101` → `docs/mise-en-service-20261101` |
| **10** | **BROUILLON** | `docs/mise-en-service-20261101` → **`main`** |
| 9 | FUSIONNÉE | `feat/chatgpt-plugin-hosted-compat` → `main` |
| 8 | FUSIONNÉE | `feat/validate-versioned-contracts` → `main` |
| 7 | FUSIONNÉE | `feat/mcp-plugin-consolidation` → `main` |
| 6 | FUSIONNÉE | `docs/start-here-presentation-20261020` → `main` |
| 5 | FUSIONNÉE | `feat/presentation-layer-20261020` → `main` |
| 4 | FUSIONNÉE | `docs/start-here-apres-ci-20261020` → `main` |
| 3 | FUSIONNÉE | `ci/mcp-tests-publication-20261020` → `main` |
| 2 | FUSIONNÉE | `chantier/mcp-consolidation-20261020` → `main` |
| 1 | FUSIONNÉE | `consolidation-mcp-v0.1` → `main` |

**13 fusionnées, 3 en brouillon.** Les quatre PR juridiques (#13 à #16) sont
déjà dans `docs/cloture-juridique-20261101`.

### Ordre de fusion de la pile

```
#12  docs/cloture-juridique-20261101   ->  audit/cgu-prepublication-20261101
#11  audit/cgu-prepublication-20261101 ->  docs/mise-en-service-20261101
#10  docs/mise-en-service-20261101     ->  main
```

**Dans cet ordre, et seulement dans cet ordre.** PR #12 est `mergeable: clean`,
11 commits, **+2 795 / −9 sur 16 fichiers**.

> **Aucune fusion n'a été faite, et aucune ne doit l'être sans validation.**

---

## 12. Tests et CI

### Suite locale — **304 cas, 304 réussis, 0 échec**

Exécutée aujourd'hui sur la tête de branche. **21 fichiers** :

| Fichier | Cas | | Fichier | Cas |
|---|---:|---|---|---:|
| `captured-rest` | 69 | | `reference` | 13 |
| `adapter` | 36 | | `upstream-status` | 12 |
| `guidance` | 22 | | `version-equivalence` | 10 |
| `presentation` | 22 | | `hosted-endpoint` | 9 |
| `card-view-model` | 17 | | `integrity` | 9 |
| `response-contracts` | 17 | | `captured-discovery` | 8 |
| `server` | 15 | | `loopback-config` | 8 |
| `audit` | 7 | | `bind-address` | 6 |
| `cgu-versions` | 5 | | `generation-explicit` | 5 |
| `live-fixture` | 5 | | `stdio` | 5 |
| `plugin-package` | 4 | | | |

**Aucun appel réel.** La suite pilote l'adaptateur avec des substituts injectés,
ne lit aucun credential et ne contacte aucun point d'entrée. La sonde d'appel
réel à un coup est **exclue du dépôt** (`ML-010`).

### CI — une seule porte, et elle n'est pas où on croit

`.github/workflows/checks.yml` se déclenche sur :

```yaml
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]
```

**Conséquence structurelle, pas défaut :** une PR dont la base **n'est pas
`main`** ne déclenche **rien**. Vérifié par requête :

| Branche | Exécutions CI |
|---|---|
| `docs/mise-en-service-20261101` (PR #10, base `main`) | **succès** sur `a756a881` |
| `docs/cloture-juridique-20261101` (PR #12) | **aucune** |
| `audit/cgu-prepublication-20261101` (PR #11) | **aucune** |
| `legal/politique-confidentialite-20261101` (PR #16) | **aucune** |

> **La seule porte verte est PR #10 → `main`.** Quand #12, puis #11, puis #10
> seront fusionnées, la CI de #10 s'exécutera sur **le contenu accumulé** — et
> c'est à ce moment-là, et pas avant, que la pile sera mesurée.
>
> `mergeable: clean` ne veut **pas** dire « vérifié ».

---

## 13. État Git de fin de session

**Arbre de travail propre, à une exception documentée.**

| | |
|---|---|
| Fichiers modifiés non commités | **aucun** |
| Fichiers non suivis | **`AGENTS.md`** |

**`AGENTS.md`** est un fichier local du **27 octobre 2026**, 867 octets, portant
des gardes permanentes sur les dépendances vers l'API NeoMundi. Il n'a **jamais
été suivi** par Git et est **étranger à ce chantier**. Il a été délibérément
laissé hors de chaque commit de la session : l'ajouter au dépôt public serait
une décision à prendre, pas un effet de bord.

`dist/` contient le paquet construit aujourd'hui ; le dossier est **ignoré** par
`.gitignore:46`.

### Branches à ne pas supprimer

Les trois branches de la pile — `docs/cloture-juridique-20261101`,
`audit/cgu-prepublication-20261101`, `docs/mise-en-service-20261101` — portent
**tout** le travail documentaire et juridique du 1er novembre. Les supprimer
perdrait trois PR non fusionnées.

Deux branches locales pointent vers des branches distantes **supprimées après
fusion** (`legal/acceptation-cgu-20261101`, `legal/dossier-juridique-20261101`).
Leur contenu est dans `docs/cloture-juridique-20261101` : elles sont sans
risque, et sans intérêt.

---

## 14. AUDIT_PRADEEP_PENDING

> ## Rien de cet audit n'est intégré, et rien ne doit l'être ici.
>
> L'audit indépendant de l'écosystème Station / SDK / MCP est confié à **Codex**,
> à partir du rapport et des modules de **Pradeep Kumar**. **Aucun correctif de
> Pradeep n'est intégré à ce stade.** Ce document ne fait qu'enregistrer ce que
> l'audit touche, et ce qu'il ne doit pas casser.

### Le fait marquant : deux de ses cinq points sont déjà des limites connues ici

**Ce n'est pas une coïncidence, et cela change la lecture de ses conclusions.**
Si l'audit confirme ces deux points, il **confirme** notre propre
documentation ; il ne découvre pas un défaut caché.

| Point de l'audit | Déjà consigné ici | Depuis |
|---|---|---|
| **4. Variance des évaluateurs** | **`ML-008`** — « la variance du juge de factualité à entrée constante n'a jamais été caractérisée ; **aucune différence entre deux valeurs ne peut présentement être dite significative** » | avant cette session |
| **5. Invariance au découpage du streaming** | **`BL-002`** — « la décision publiée dépend de la façon dont le fournisseur découpe le flux, parce que les fenêtres sont comptées en **fragments** et non en jetons » | avant cette session |

`BL-002` porte une consigne déjà écrite : **`POST /v1/govern/stream`
uniquement, REST non affecté** ; « tant que `BL-002` n'est pas résolu, aucune
mesure en flux ne doit soutenir un chiffre publié, une comparaison entre modèles
ou une décision à défendre ».

### Les cinq points, et les composants concernés

| # | Point de l'audit | Composants potentiellement concernés |
|---|---|---|
| 1 | **Compatibilité des statuts Station / SDK / MCP** | `runtime/contract.mjs`, `runtime/response-contracts.mjs`, `runtime/upstream.mjs`, `schemas/`, et le vocabulaire **figé** de `runtime/ui/view-model.mjs` |
| 2 | **Sérialisation des résultats vers Station** | `runtime/presentation.mjs` (projection fidèle, `ML-013`), `runtime/reference.mjs` |
| 3 | **Validation CI des schémas** | `.github/workflows/checks.yml`, `runtime/schema-validation.mjs`, `runtime/tests/response-contracts.test.mjs`, empreintes de schémas archivés gardées par `check-publication.mjs` |
| 4 | **Variance des évaluateurs** | **méthodologie amont** — `ML-008`. Le connecteur **relaie**, il ne corrige pas |
| 5 | **Invariance au découpage du streaming** | **cause amont** — `BL-002`, chemin SSE seul. Voir aussi `ML-003` (l'évènement final ne publie aucune version de mesure) |

### Contrats à préserver — non négociables

Ces invariants sont tenus par des tests. **Un correctif qui les casse est un
correctif à refuser, pas à adapter.**

1. **Aucune mesure n'est jamais fabriquée.** Une erreur amont est classée comme
   transport ; elle ne produit pas de mesure et **aucune relance n'est tentée**
   (`ML-006`).
2. **Les `null` et les états survivent.** Un signal non mesuré reste non mesuré,
   **avec sa cause nommée**. `view-model.mjs` ne calcule ni n'interprète rien.
3. **Une absence de mesure n'est jamais un résultat favorable.** Un `ALLOW`
   décidé sans aucun contrôle est **déclaré comme tel** par la carte.
4. **La provenance n'est pas réécrite.** Identifiants d'évaluateurs, versions et
   empreintes ressortent tels que reçus.
5. **La comparabilité est déclarée, jamais supposée.** Deux mesures de versions
   divergentes sont annoncées non comparables, et `divergence_scope` **n'écrase
   jamais** l'accord.
6. **Les nombres restent exacts à l'octet** (`JSON.rawJSON`).
7. **Aucun credential ne sort dans une enveloppe d'outil.** Une charge contenant
   un credential configuré est **retenue entière** plutôt que réécrite.
8. **Les champs non modélisés sont nommés**, ni interprétés ni jetés (`D-9`).

### Points nécessitant un test de régression si l'audit conduit à toucher le code

| Si l'audit touche… | Alors vérifier impérativement |
|---|---|
| le contrat ou les schémas | `response-contracts` (17), `captured-rest` (69), `integrity` (9) — et les **empreintes de schémas archivés** |
| la projection vers Station | `presentation` (22), `reference` (13) — `ML-013` dit déjà que la projection est **de forme REST et un sous-ensemble en deux endroits** |
| la gestion des versions | `version-equivalence` (10) — et **ne pas** lever l'épinglage `3.3.0` sans trancher `D-8` |
| la carte | `card-view-model` (17) — le **vocabulaire figé** et `non publié` |
| le transport ou le serveur | `server` (15), `hosted-endpoint` (9), `stdio` (5), `bind-address` (6), `loopback-config` (8) |
| l'adaptateur | `adapter` (36), `upstream-status` (12), `guidance` (22) |

### Conclusions attendues avant toute modification du code

**Aucune ligne de `runtime/` ne doit bouger avant que les quatre réponses
suivantes soient écrites.**

1. **Les divergences de statuts sont-elles réelles, ou nominales ?** Un même
   état sous deux noms n'est pas le même problème qu'un état absent.
2. **La variance des évaluateurs est-elle quantifiée ?** `ML-008` dit
   qu'**aucune** différence n'est présentement significative. Si l'audit fournit
   un chiffre, c'est une **méthodologie amont** qui change — pas le connecteur.
3. **`BL-002` est-il confirmé comme amont ?** Si oui, le connecteur **ne doit
   pas** le corriger : il le relaie, et c'est déjà documenté. Le corriger ici
   fabriquerait une mesure que l'API ne produit pas.
4. **Que valide exactement la CI de schémas proposée ?** Le dépôt n'a **aucune
   dépendance d'exécution** et **aucun fichier de verrouillage** : `npm ci`
   échouerait, `npm install` ne résoudrait rien. Toute proposition de CI qui
   suppose un installateur est à refuser en l'état.

> **Un piège déjà rencontré trois fois sur ce chantier :** attribuer plusieurs
> pannes distinctes à une cause unique. Les cinq points ci-dessus sont
> **indépendants**. Les traiter comme un seul défaut amont serait l'erreur
> exacte à éviter.

---

## 15. Ce qui est opérationnel, et ce qui ne l'est pas

### Opérationnel aujourd'hui

- **Mesurer une exécution réelle** par `https://mcp.neomundi.org/mcp`, avec
  authentification, et recevoir cinq signaux, un état, une provenance et une
  décision motivée — **prouvé** par `2ca02f65-e2de-4f21-a35d-0e845329d4b2`.
- **Installer le connecteur en local** par le paquet reproductible, ou par
  `compose.yaml` avec deux credentials passés par l'environnement.
- **Connecter un hôte MCP** — vérifié avec Claude Code, amont substitué.
- **Revenir en arrière** sur `0.1.0` en deux commandes.
- **Opposer des CGU** à un participant, avec preuve de la version acceptée par
  empreinte.
- **Renvoyer un visiteur** vers une politique de confidentialité qui décrit
  réellement le traitement.

### Pas opérationnel

| Limite | Nature |
|---|---|
| **Connexion depuis ChatGPT** | jamais tentée — `P-6` d'abord |
| **Multi-utilisateur** | aucune identité, aucune révocation, aucune attribution — `D-4` |
| **Chemin SSE pour un chiffre publiable** | `BL-002`, `ML-003` |
| **Comparabilité entre mesures** | toutes `divergent` — `D-8` |
| **Conformité de contrat face à un déploiement** | `LIVE_API_VALIDATED` non décerné |
| **Signification d'un écart entre deux scores** | `ML-008` |
| **Durée de conservation des mesures** | aucune n'est configurée |

---

## 16. Preuves citées dans ce document

| Preuve | Obtenue par |
|---|---|
| `0.3.0-rc.1` servi, révision `da71f5d` | section de mise en service de `START_HERE.md`, confirmée par `git rev-parse origin/main` |
| `401` sur `/`, `/health`, `/mcp` | requête HTTPS du 2026-11-01 |
| Certificat valide 7 sept → 6 déc 2026 | `openssl s_client` du 2026-11-01 |
| 304 tests réussis, 21 fichiers | `npm test` du 2026-11-01 |
| CI absente sur les PR empilées | API GitHub, `actions/runs?branch=…`, et lecture de `checks.yml` |
| Paquet reproductible, `7ad3e533…` | deux exécutions de `scripts/build-package.mjs` le 2026-11-01 |
| Garde de publication, 111 fichiers | `node check-publication.mjs` du 2026-11-01 |
| Empreintes CGU inchangées | `node scripts/cgu-fingerprint.mjs` du 2026-11-01 |
| Quatre pages juridiques en ligne | requêtes HTTPS du 2026-11-01, toutes `200` |
| Séparation public/interne | `git ls-files` filtré sur neuf motifs, zéro résultat |
| `mergeable: clean`, +2 795/−9 | API GitHub, PR #12 |

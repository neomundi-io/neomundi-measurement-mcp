> **0.2.0 update:** this page retains the HTTP configuration and historical
> evidence. A local stdio/plugin entry is now available; read
> [installation](../docs/PLUGIN.md) ([Français](../docs/PLUGIN_FR.md)).
> Generation requires explicit provider/model. The envelope adds transport
> `integrity` checks without certifying the backend contract. Current tests
> and hosted qualification limits are in [the audit](../docs/MCP_PLUGIN_AUDIT.md).

# NeoMundi measurement MCP — MVP privé local

Le serveur expose **un seul outil `measure_execution`**, via Streamable HTTP sur `/mcp`. Il transmet une requête à l'API existante, puis restitue ses données sans calcul, normalisation métrologique, interprétation ou décision dérivée.

Cette implémentation fait suite à l'autorisation de continuer malgré les divergences documentaires. Elle a été ajoutée dans `runtime/` pour préserver tous les fichiers préexistants, y compris l'ancien rapport d'arrêt. Le rapport actuel est [IMPLEMENTATION_REPORT.md](IMPLEMENTATION_REPORT.md) ; les sources techniques restent documentées dans [l'audit initial](../API_CONTRACT_AUDIT.md).

## Prérequis et démarrage exact

**Node.js 24 ou supérieur. Aucune dépendance à installer.** Version locale testée : `v24.20.0`.

Le processus réel doit recevoir deux clés déjà provisionnées par votre mécanisme habituel d'environnement :

- `NEOMUNDI_API_KEY` : authentification de l'appel NeoMundi, header `X-API-Key`.
- `NEOMUNDI_MCP_API_KEY` : authentification du client MCP local, header `Authorization: Bearer …`.
- `NEOMUNDI_PROVIDER_API_KEY` : facultative pour l'observation ; obligatoire pour la génération SSE.

Ces clés ne font jamais partie du schéma d'arguments de l'outil. Le serveur n'en crée aucune, ne charge aucun fichier `.env` et ne journalise ni headers, ni arguments, ni mesures. [.env.example](.env.example) décrit les variables sans contenir de secret. Les tests et la démonstration ne consultent pas les clés de l'environnement.

Depuis la racine du dépôt :

```powershell
node runtime/server.mjs
```

Depuis ce dossier `runtime` : `node server.mjs`.

Adresse par défaut : **`http://127.0.0.1:8787/mcp`**. Le démarrage n'appelle aucune API. Un `tools/call` valide contre ce serveur réel déclenchera un appel NeoMundi ; cela pourra consommer du quota et, en génération, des ressources fournisseur. Le processus échoue avec un message générique si les clés requises ne sont pas configurées ; il n'affiche pas leur valeur. `Ctrl+C` ferme les connexions locales.

| Variable facultative | Défaut | Contrainte |
|---|---|---|
| `NEOMUNDI_API_BASE_URL` | `https://api.neomundi.io` | origine seule, sans identifiants, chemin, query ou fragment. HTTPS partout ; **HTTP accepté uniquement pour `127.0.0.1`, `localhost` et `[::1]`** — voir « Vérification contre une instance locale » |
| `NEOMUNDI_MCP_PORT` | 8787 | entier 1–65535 |
| `NEOMUNDI_MCP_BIND` | `127.0.0.1` | `127.0.0.1` ou `0.0.0.0`, **et rien d'autre**. Voir « Exécution en conteneur » avant de changer cette valeur |
| `NEOMUNDI_TIMEOUT_MS` | 120000 | délai global, entier positif ≤ 3600000 |
| `NEOMUNDI_IDLE_TIMEOUT_MS` | 30000 | inactivité réseau, entier positif ≤ 3600000 |
| `NEOMUNDI_MAX_RESPONSE_BYTES` | 2097152 | taille amont maximale en octets, ≤ 16777216 |

Autres limites locales fixes : requête de 1 048 576 octets, 10 000 événements SSE, 8 appels concurrents, 32 sessions, expiration de session après 30 minutes sans requête MCP. Ces limites appartiennent à l'adaptateur ; elles ne décrivent pas une garantie de service NeoMundi.

## Test local reproductible, sans clés ni appel distant

Depuis `CONNECTEUR1` :

```powershell
node .\neomundi-measurement-mcp\runtime\demo.mjs
node --test .\neomundi-measurement-mcp\runtime\tests\*.test.mjs
```

Pour inclure aussi les sept contrôles historiques des schémas :

```powershell
node --test .\neomundi-measurement-mcp\tests\audit.test.mjs .\neomundi-measurement-mcp\runtime\tests\*.test.mjs
```

La démonstration démarre un vrai serveur MCP HTTP sur un port loopback éphémère, initialise un client, liste l'outil et appelle les modes JSON, SSE `done` et SSE `[DONE]`. Seul le transport sortant vers NeoMundi est remplacé par des mocks injectés. Le processus s'arrête ensuite. Les valeurs de test sont publiques, synthétiques et non opérationnelles ; ce ne sont pas de nouveaux secrets.

## Entrées : deux parcours, une seule requête API par invocation

Le [schéma d'entrée](schemas/measure_execution.input.schema.json) impose exactement une propriété racine : `execution` **ou** `generation`. Les propriétés inconnues sont refusées. Les champs facultatifs omis restent omis : aucun défaut, estimation de tokens, arrondi, bornage de risque ou mesure complémentaire n'est ajouté par le connecteur.

### Mesurer une exécution déjà effectuée

`execution` est envoyé tel quel à `POST /v1/govern` sous `X-API-Key`. Il reprend `GovernRequest` du backend V2, dont `raw_metrics.token_count` et `raw_metrics.latency_ms` sont obligatoires. Les valeurs réelles doivent être fournies par le système appelant, pas inventées par l'agent.

Exemple **synthétique pour un mock**, à remplacer par des observations réelles pour un appel réel :

```json
{
  "execution": {
    "source_type": "llm",
    "mode": "OBS",
    "llm_prompt": "Question synthétique",
    "llm_response": "Réponse synthétique",
    "raw_metrics": { "token_count": 4, "latency_ms": 12.5 }
  }
}
```

`llm_prompt`, `llm_response`, `rag_context` et `documents` acceptent les null déclarés par le backend. Les champs numériques de `raw_metrics` ne sont pas nullable. Le risque hors [0,1] est rejeté, pas corrigé. Pour éviter une coercition silencieuse, les entiers d'entrée sont limités aux entiers exacts JavaScript et un nombre JSON qui serait arrondi par IEEE-754 est rejeté avant l'appel API. Les lexèmes numériques acceptés sont retransmis sans changement. Cette restriction d'entrée est propre au MVP.

### Générer et mesurer via SSE

`generation` est envoyé à `POST /v1/govern/stream`. Le serveur y ajoute uniquement `provider_api_key`, provenant de `NEOMUNDI_PROVIDER_API_KEY`. Il ne transmet jamais la clé MCP à NeoMundi. Le fournisseur et le modèle restent les valeurs explicitement données par l'appelant ; le registre du backend décide des valeurs supportées.

Exemple d'arguments :

```json
{
  "generation": {
    "prompt": "Question synthétique",
    "provider": "openai",
    "model": "identifiant-du-modele-fourni-par-votre-systeme"
  }
}
```

La clé fournisseur doit correspondre au fournisseur demandé. Le backend V2 applique ses propres défauts, notamment `temperature=0.7` lorsque ce champ est absent. L'adaptateur n'impose pas une politique de génération « native » contraire au code backend.

Après le flux SSE, **aucune seconde mesure `/v1/govern` et aucune émission RGC ne sont déclenchées**. La sortie SSE n'est pas transformée en `GovernResponse` ou en contrat signé. Un contrat ou un état absent de la réponse n'est pas fabriqué.

## Sortie transparente et versions

Le [schéma de sortie](schemas/measure_execution.output.schema.json) valide uniquement une enveloppe de transport. Les champs de mesure eux-mêmes restent permissifs : aucun schéma documentaire RGC n'est imposé.

| Champ d'enveloppe | Signification |
|---|---|
| `transport` | `json`, `sse`, ou null si aucun parcours n'a pu être établi |
| `response` | objet JSON réel de `/v1/govern`, ou donnée réelle d'un événement SSE nommé `done` ; sinon null |
| `raw_response` | texte JSON original correspondant, sans changement de précision numérique ; sinon null |
| `contract_version` | alias du champ racine fourni par la réponse API ou du dernier événement JSON qui l'a explicitement fourni ; null lorsqu'il est absent |
| `token_count_source` | provenance explicite non vide de la réponse finale ; `unknown` lorsqu'elle manque, sans déduction à partir des compteurs |
| `measurement_reference` | provenance de version : ce que **ce code** attend, à côté de ce que l'instance a **déclaré**. Jamais fusionnés |
| `validation` | validation du transport distincte de la conformité du contrat ; lacunes de métadonnées dans `metadata_gaps` |
| `presentation` | **projection plate pour un lecteur**, à côté de la réponse et jamais dedans. Chaque champ est copié du chemin nommé dans son propre `field_sources`, ou vaut `null`. `null` quand il n'y a pas de réponse à projeter — voir la section dédiée ci-dessous |
| `sse.events` | tous les événements de données décodés jusqu'au terminal, avec nom, JSON, texte `raw_data` et `id` lorsqu'il était explicitement présent |
| `sse.raw_stream` | texte UTF-8 effectivement reçu, commentaires et champs SSE compris |
| `sse.termination` | `done`, `[DONE]`, ou null ; marqueur de transport, jamais un état métrologique |
| `adapter_error` | erreur technique locale explicite, ou null |

`response.contract_version` reste aussi dans la réponse brute. Si `contract_version` vaut null ou n'existe pas, l'alias vaut null. Les champs imbriqués, dont `identity.schema_version`, restent à leur emplacement ; aucune version n'est déduite ou rebaptisée. Si plusieurs événements annoncent une version, leur historique intégral demeure dans `sse.events`.

Ces valeurs de repli appartiennent uniquement à l'enveloppe MCP : aucun champ n'est ajouté à la réponse serveur. La provenance est reprise du champ `token_count_source` de la réponse finale JSON ou `done`, jamais d'un compteur intermédiaire. Un champ null ou vide reste inchangé dans les données brutes et donne `unknown` dans l'enveloppe.

`validation.transport` vaut `validated` après une réponse JSON valide ou une terminaison SSE `done` ou `[DONE]` sans erreur adaptateur. Sinon il vaut `not_validated`. La conformité du prompt, dont la ponctuation, n'intervient pas dans `isError`. Après transport réussi, `validation.contract` vaut `not_validated` lorsque la version manque ou la provenance est inconnue, sinon `not_assessed` : aucune conformité à un schéma backend autoritatif n'est certifiée par la seule présence de métadonnées. En cas d'erreur de transport, le contrat reste `not_assessed`.

La consolidation utilise [LIVE_API_RESULT.json](LIVE_API_RESULT.json) comme fixture historique anonymisée. Les tests reconstruisent son cadrage SSE, sans prétendre disposer des octets originaux, et ignorent son ancienne appréciation de conformité au prompt pour décider du succès du connecteur. Voir [CONSOLIDATION_REPORT.md](CONSOLIDATION_REPORT.md) pour le statut actuel et les corrections backend restantes. La révision épinglée et le rejeu des réponses enregistrées sont décrits plus bas ; le registre public des limites est [KNOWN_LIMITATIONS.md](../KNOWN_LIMITATIONS.md).

Avec `[DONE]` sans événement nommé `done`, `response` reste null : le connecteur ne devine pas quel événement serait une mesure finale. Les données restent accessibles dans `sse.events`, y compris un éventuel objet de mesure avant le marqueur. `isError: false` signifie seulement que le transport s'est achevé correctement ; il ne signifie ni mesure complète ni résultat favorable.

Les nombres de sortie sont sérialisés avec leurs tokens JSON d'origine grâce à `JSON.rawJSON`. Les grands entiers, décimales précises et `-0` ne sont pas arrondis par le serveur. Un autre client peut néanmoins avoir son propre parseur numérique : `raw_response` et `raw_data` permettent alors une lecture exacte. L'ordre original et les doublons éventuels de clés JSON restent observables dans le texte brut ; une vue objet JSON ne peut pas représenter plusieurs occurrences d'une même clé.

Le connecteur conserve distincts `measured`, `not_measured`, `insufficient_coverage`, `complete`, `partial`, `within_bounds`, `not_assessed` et `not_determinable`, ainsi que tout état inconnu. Aucun null ne devient zéro, false, string vide ou champ absent. Les zéros de masquage par tier renvoyés par NeoMundi ne sont pas corrigés ; leur contexte, notamment `measured_signals`, est conservé.

### Révision de référence et version déclarée

`API_CONTRACT_AUDIT.md` s'était arrêté avant implémentation pour une raison précise : *« Révision cible faisant autorité : archive/commit identifié […] Une URL seule ne suffit pas à identifier la révision. »* [reference.mjs](reference.mjs) est cette identification, et rien de plus :

| Valeur épinglée | |
|---|---|
| `backend_commit` | `68d6057cf620e430e6488da3cfcec9c471c75ed6` |
| `measurement_version` | `3.3.0` |
| `normalizer_version` | `1.0.0` |
| `openapi_frozen` | `false` |

**Épingler un commit ne valide aucun déploiement.** Aucune spécification OpenAPI figée n'existe côté serveur : ce commit et cette chaîne de version sont les seules choses auxquelles une mesure puisse être rattachée. La preuve derrière ces valeurs est la campagne du SDK Python NeoMundi v0.1.0 du 2026-10-17 contre une instance locale construite depuis ce commit — 11 réponses REST enregistrées, toutes déclarant `measurement_version 3.3.0`. C'est une preuve **locale, sur une instance**, pas sur un déploiement hébergé.

L'enveloppe rapporte les deux faces séparément, et ne les fusionne jamais :

| Champ de `measurement_reference` | Signification |
|---|---|
| `expected_measurement_version`, `expected_backend_commit` | propriété de **ce code**. Toujours connus, y compris avant le premier octet reçu |
| `received_measurement_version`, `received_normalizer_version` | valeurs **verbatim** déclarées par l'instance, lues à `audit.measurement_version` ; null si elle n'en déclare pas |
| `version_path` | chemin de lecture quand le champ était présent, sinon null. Distingue un champ **absent** d'un champ présent mais inutilisable |
| `agreement` | `match`, `divergent`, `declared_unusable`, `not_declared` |
| `divergence_scope` | `null`, ou ce qui est **établi** au sujet de cette divergence précise. Ne remplace jamais `agreement` |

**`divergent` est le signal qui compte** : les résultats ne sont pas comparables à une série produite sous la version attendue, et des champs peuvent avoir changé de sens. Ce n'est **pas** une erreur adaptateur, `isError` reste faux, et la charge serveur n'est jamais réécrite pour s'accorder avec l'attente. Un agent doit lire `agreement` avant de comparer deux chiffres entre appels.

#### `divergence_scope` — pourquoi ce champ existe

Un déploiement qui sert une version postérieure à la version épinglée rend **tous** les appels `divergent`. Un intégrateur à qui l'on ne dit que « non comparable » ne peut pas distinguer un incrément qui n'a rien déplacé sur son transport d'un incrément qui invalide sa série. La consigne 5.6 de `KNOWN_LIMITATIONS.md` lui demande de **signaler** une divergence plutôt que de l'absorber ; sans portée, il les signalerait toutes à l'identique et le signal ne vaudrait rien.

`divergence_scope` est donc `null` sauf si quelque chose a été **établi** sur ce couple de versions exact, et il ne modifie ni `agreement`, ni la charge serveur. Une version absente de la table reste simplement `divergent` **sans portée** — la réponse honnête, puisque rien n'a été établi à son sujet.

Une entrée n'est admise qu'à partir de la **déclaration de comparabilité publiée par le backend lui-même** à la révision déclarée, avec la plage de commits qui la porte nommée dans `evidence`. Jamais depuis un changelog, jamais depuis une inférence sur ce qu'un numéro de correctif « devrait » signifier.

| Champ | Signification |
|---|---|
| `expected_measurement_version` | la version épinglée contre laquelle cette portée a été établie. Si elle diffère de `measurement_reference.expected_measurement_version`, la portée est **retirée** : une table périmée ne se publie pas comme actuelle |
| `received_measurement_version` | la version déclarée que cette entrée décrit |
| `rest` | `identical`, `may_differ` ou `unknown` — ce que le couple change sur `POST /v1/govern` |
| `sse` | `identical`, `may_differ`, `decision_may_differ` ou `unknown` — sur `POST /v1/govern/stream`. `decision_may_differ` : la mesure publiée est inchangée, mais la décision qui en est tirée peut différer |
| `summary` | ce qui a changé, dans les termes du backend. Ni une réassurance, ni une recommandation |
| `unchanged_by_the_bump` | ce que l'incrément de version **ne corrige pas**, pour qu'il ne soit jamais lu comme le corrigeant |
| `evidence` | où cela a été lu : la plage de commits et les fichiers porteurs. Preuve **de dépôt**, jamais l'observation d'un déploiement en marche |

**Une seule entrée existe aujourd'hui : `3.3.1`.** Sur REST, les deux versions sont déclarées identiques par le verrou de surface de mesure du backend. Sur SSE, les règles de trajectoire `R1/R2/R3` ont changé : une observation laissée en `ALLOW` par les signaux mesurés, dont le profil était `DROP` ou `OSCILLATING` à partir de points **non mesurés**, est décidée différemment. L'invariance au découpage n'est corrigée **ni** sous 3.3.0 **ni** sous 3.3.1.

⚠ **Le transport dont la décision peut changer est aussi celui où aucune version n'est publiée** (ML-003). Sur SSE, `agreement` vaut `not_declared` et `divergence_scope` reste `null` : le connecteur ne peut pas dire quelle version a produit la décision qu'il relaie. C'est énoncé, pas corrigé.

`declared_unusable` couvre un champ présent dont la valeur n'est pas une chaîne non vide — un nombre, par exemple. Il n'est **pas** converti : fabriquer `"3.3"` depuis `3.3` inventerait une déclaration que le serveur n'a pas faite. La valeur d'origine reste intacte sous `response.audit`.

`not_declared` est le cas **attendu sur le chemin SSE** : l'événement nommé `done` observé depuis la passerelle ne porte aucun bloc `audit`, donc aucune version n'y est publiée. C'est une absence du contrat amont, pas une défaillance du connecteur.

Ce champ est rapporté **à côté de `validation`, jamais dedans** : la signification publiée des trois états de `validation` est inchangée, et un accord de version n'est pas un verdict de conformité de contrat. De même, l'alias `contract_version` garde son sens propre — copie verbatim d'un `contract_version` **racine** — et n'est pas alimenté par le bloc `audit`. Aucune révision backend inspectée n'émet ce champ racine ; lire l'un ne remplace pas l'autre.

### Vérification contre une instance locale

Une instance NeoMundi jetable construite pour vérification sert du HTTP en clair sur un port loopback. Exiger HTTPS la rendait inatteignable : le chemin REST ne pouvait donc être exercé que contre des charges écrites à la main.

`NEOMUNDI_API_BASE_URL` accepte désormais `http://` **pour `127.0.0.1`, `localhost` et `[::1]` exclusivement**, par égalité exacte du nom d'hôte. `http://127.0.0.1.attacker.example` reste refusé, comme tout hôte non loopback : le texte en clair ne quitte jamais la machine, et HTTPS reste obligatoire partout ailleurs. Aucune autre contrainte n'est relâchée — identifiants intégrés, chemin, query et fragment restent refusés. Quand ce mode est actif, `config.plaintextLoopback` vaut `true` et le serveur l'annonce une fois sur stderr au démarrage, pour qu'une vérification locale ne soit jamais prise pour un appel à un déploiement réel.

**Rejeu des 11 réponses enregistrées** — [tests/captured-rest.test.mjs](tests/captured-rest.test.mjs) :

```powershell
# Sur un poste qui dispose des enregistrements, à leur emplacement par défaut :
node --test tests/captured-rest.test.mjs

# Ailleurs :
$env:NEOMUNDI_CAPTURED_FIXTURES = 'C:\chemin\vers\captured'; node --test tests/captured-rest.test.mjs
```

Les enregistrements **ne sont pas dans ce dépôt** : ce sont des données d'exécution, pas du code source. Les tests s'ignorent alors avec un motif affiché, et chaque **famille** de contrôle non exécutée est nommée dans la sortie — un poste sans enregistrements est informé de ce qu'il n'a pas pu vérifier, au lieu de ne rien voir.

Cinq familles sont vérifiées sur chaque réponse réelle : passage sans altération (clés, valeurs et ordre identiques), conservation de la graphie numérique (`1.0` ne doit pas revenir en `1`), provenance de version, et deux invariants du contrat **amont** — un agrégat retenu est toujours déclaré, un signal non mesuré porte toujours une cause nommée.

**Un échec ici est une observation sur le contrat amont, à remonter.** Ce n'est jamais une autorisation d'assouplir une assertion ni de modifier une charge serveur pour faire passer un test.

### `presentation` — la projection fidèle

**Ce que c'est.** Un objet plat, **à côté** de `response`, jamais dedans. Chaque champ est **copié verbatim** du chemin déclaré dans `presentation.field_sources`, ou vaut explicitement `null`. Il existe pour qu'une personne ou un agent lise un résultat sans parcourir un document profond — et sans que le parcours change ce que le résultat dit.

**Ce que ce n'est pas.** Ni un résumé, ni un verdict, ni un score, ni de la prose. Rien n'est calculé, remis à l'échelle, arrondi, classé ou raccourci. Aucun adjectif que le serveur n'a pas publié n'est ajouté. **Ce n'est pas un substitut à la lecture de `response`**, qui reste intacte à côté.

**Le cas contre lequel ce module est conçu.** Deux réponses réellement enregistrées décident toutes deux `ALLOW` :

| | `tier02_01_complete_nominale` | `tier02_04_aucun_controle` |
|---|---|---|
`decision` | `ALLOW` | `ALLOW` |
`decision_basis` | `measured_thresholds` | **`no_check_attempted`** |
`decision_is_measured` | **`true`** | **`false`** |
`measurement_status` | `complete` | **`not_attempted`** |
`checks_attempted` · `checks_emitted` | 3 · 3 | **0 · 0** |
`confidence_basis` | `measurement_coverage` | **`no_server_check`** |
évaluateurs `not_attempted` | 0 | **4** |
`v_score` dans `published_values` | `1` | **`null`** |

La seconde réponse **n'a jamais été évaluée**. Une présentation qui les rend identiques détruit la distinction que la mesure existe pour produire — et le ferait en n'affichant que des valeurs réellement publiées. `tests/presentation.test.mjs` échoue si elles redeviennent équivalentes sur ce point.

**Le seul champ dérivé** est `decision_is_measured` : la reformulation d'une égalité (`decision_basis === "measured_thresholds"`), pas un jugement. Tous les autres sont des copies.

**Garanties tenues par les tests :**

| Garantie | Ce qu'elle interdit |
|---|---|
Aller-retour | toute valeur qui différerait de son chemin source |
Absence = absence | un défaut, un zéro, un `false` ou une chaîne vide à la place d'un champ absent |
`null` publié reste `null` | un agrégat retenu présenté comme un zéro mesuré |
`not_attempted` ≠ mesuré | un évaluateur qui n'a pas tourné, omis de la liste |
Aucune invention | une chaîne qui ne vienne pas de la réponse, de l'enveloppe, ou d'un vocabulaire **gelé** (noms de champs, chemins de l'aide de lecture, identifiants `BL-*`) |
Champs inconnus préservés | une clé racine non modélisée, étiquetée ou supprimée au lieu d'être **nommée** |
Divergence portée | un résultat `divergent` présenté comme comparable |
Aucune troncature | une liste raccourcie sans le dire |
Non-mutation | la moindre modification de `response` |

**Correspondance champ → source.** Elle est publiée **dans la projection elle-même**, sous `field_sources`, pour qu'un lecteur remonte toujours à la valeur brute sans consulter ce README — et pour qu'un sous-ensemble soit déclaré comme tel : `evaluators` porte `evaluator`, `model_used`, `status` et `reason`, et le dossier complet reste dans `response.evaluators[<signal>]`.

**Limites, énoncées plutôt que corrigées.** La projection est **spécifique au chemin REST** : sur SSE, l'événement `done` ne publie ni bloc `audit` ni la plupart de ces chemins, donc la plupart des champs y valent `null` — c'est une absence du contrat amont (ML-003), pas une défaillance. Elle ne couvre pas `rag_grounding`, `density`, `esi` ni `baseline` autrement que par les chemins d'agrégats que l'aide de lecture surveille déjà. Voir **ML-013**.

### Aide de lecture pour l'agent

Une réponse REST complète porte 27 champs racine et environ 160 valeurs dans 11 blocs. **Cinq noms de champs y apparaissent deux fois**, dont deux sur des **échelles inversées**. Un agent qui reçoit cela brut peut conclure l'inverse de la mesure en toute bonne foi : `metrics.stability_score` à 0,06 signifie *très stable*, et se lit comme une catastrophe.

`reading_aid` répond à ce problème, et à lui seul. **Trois règles qu'il ne viole jamais :**

1. **Il ne touche pas `response`.** Ni une clé, ni une valeur, ni l'ordre. Il lit, et rapporte ce qu'il a trouvé par chemin.
2. **Il ne tranche aucune ambiguïté.** Là où deux champs partagent un nom, **les deux** sont rapportés avec leur sens propre. Il n'en choisit jamais un, et ne dérive jamais une troisième valeur « corrigée ».
3. **Il n'affirme rien qu'il n'ait observé.** Chaque entrée porte sur un champ réellement présent dans *cette* réponse. Un bloc absent ne produit aucune entrée, plutôt qu'une entrée disant null.

| Champ de `reading_aid` | Contenu |
|---|---|
| `statement` | la phrase la plus souvent mal comprise : une mesure n'est ni une permission, ni un verdict de conformité, ni une preuve de vérité ou d'absence d'hallucination |
| `homonyms` | les champs homonymes **présents ici**, chaque lecture avec sa formule et son échelle |
| `aggregates` | agrégats retenus, agrégats publiés, et **ce qui a déclaré la rétention**. `undeclared_withholding` à `true` est une anomalie à remonter |
| `signal_derived` | valeurs dérivées d'**un seul signal**, dont la nullité est déclarée autrement — voir ci-dessous |
| `decision_basis` | la valeur, et ce qu'elle signifie. Une valeur hors des trois documentées est signalée comme telle |
| `unmeasured_signals` | un signal, sa cause **verbatim**, et si cette cause est ambiguë en amont |
| `nulls` | les chemins explicitement `null` : une absence **déclarée**, jamais remplacée par zéro, `false` ou un champ absent |
| `known_limitations` | BL-001, BL-002, BL-003, avec si chacune est observable dans *cette* réponse |

#### Les cinq homonymes

| Nom | Lectures | Nature du piège |
|---|---|---|
| `stability_score` | `quality.stability_score` (`G/0.60`, **1 = stable**) et `metrics.stability_score` (`1 − G/0.60`, **0 = stable**) | **échelles inversées**. Lire le mauvais champ inverse la conclusion. Plage effective de la lecture `quality` : `[0.60 ; 1.00]` — 0,67 est près du plancher, pas une valeur moyenne |
| `Q` | `esi.q_value` (`min(1, N/E)`) et `baseline.esi_q` (variabilité en fenêtre glissante, mémoire du processus serveur) | deux grandeurs sans rapport. La seconde dépend d'un historique local au processus, donc non reproductible après redémarrage |
| densité | `quality.information_density` (n'entre dans aucun agrégat) et `density.informational_density` (alimente le terme `P` de `g_final`) | l'une est informative, l'autre change l'agrégat |
| `delta_E` | `baseline.delta_E` | **signe ambigu** : documenté `observed − reference`, implémenté `reference − observed`. Rapporté, non tranché. `baseline.observed_energy` et `baseline.reference_energy` sont publiés dans le même bloc : recalculez depuis eux |
| `delta_g` | `delta_g` | **nom trompeur** : ce n'est pas une dérive, mais l'écart de `G` avec l'**appel précédent du même compte**, y compris un appel sans rapport. La référence est écrasée à chaque appel et n'est pas publiée. Voir BL-003 |

#### Agrégat retenu contre valeur dérivée d'un signal

Deux mécanismes distincts produisent un `null`, et les confondre produit de faux signalements.

Un **agrégat** retenu l'est parce qu'un signal requis n'a pas été mesuré, et la rétention est déclarée par `measurement.aggregates_publishable`, `measurement.missing_required_signals` ou `governance.decision_basis`.

Une **valeur dérivée d'un signal** est nulle parce que *ce signal* n'a pas été mesuré. `v_score` en est le cas : son contrat le déclare null « whenever the factuality signal was not measured ». Sa nullité est déclarée par `measured_signals`, `unmeasured_signals` ou `measurement.status` — **pas** par `aggregates_publishable`.

Ce n'est pas une distinction théorique : sur les deux réponses enregistrées dont la base de décision est `no_check_attempted`, `v_score` est `null` alors que `aggregates_publishable` vaut `true` et que tous les agrégats sont publiés. Les classer ensemble signalait ces réponses comme des rétentions non déclarées, ce qu'elles ne sont pas.

#### Ce que l'aide ne fait pas

Elle ne calcule aucune valeur, ne corrige aucun signe, ne choisit aucune échelle, et ne porte aucune décision. `isError` continue de n'exprimer que les erreurs adaptateur. Un agent qui ignore `reading_aid` reçoit exactement la même réponse qu'avant.

### Statuts HTTP amont : ce qu'ils disent, ce qu'ils n'autorisent pas

Un statut HTTP est un **résultat de transport**. Ce n'est jamais une décision, un score, ni une absence de risque. Sur une erreur amont, `adapter_error.upstream` classe le statut sans rien inventer sur la mesure.

`adapter_error.code` **ne change pas de sens** : il reste la taxonomie des échecs de cet adaptateur. Le statut amont est un fait distinct, rapporté à côté — la même discipline que `measurement_reference` à côté de `validation`. Le **corps** d'erreur amont n'est jamais exposé : il peut renvoyer en écho le contenu soumis.

| Statut | `class` | `billing` | `retry` |
|---|---|---|---|
| 401 | `authentication` | `no_measurement_billed` | refusé à l'identique |
| 402 | `quota_or_payment` | `no_measurement_billed` | refusé à l'identique |
| 403 | `authorization` | `no_measurement_billed` | refusé à l'identique |
| 404 | `route_not_found` | `no_measurement_billed` | refusé à l'identique |
| 413 | `request_too_large` | `no_measurement_billed` | refusé à l'identique |
| 422 | `invalid_request` | `no_measurement_billed` | refusé à l'identique |
| 429 | `rate_limited` | `no_measurement_billed` | **peut réussir après un délai** |
| 500, 502, 504 | `server_error` | **`billing_unknown`** | **pas sans garantie d'idempotence** |
| 503 | `service_unavailable` | `no_measurement_billed` | **peut réussir après un délai** |
| autre 4xx / 5xx | `client_error` / `server_error` | selon la famille | selon la famille |

**D'où vient `billing`.** Établi contre la révision de référence épinglée, pas supposé : l'authentification, la limitation de débit et la validation de requête refusent toutes l'appel **avant** qu'une mesure soit produite ; un 402 signifie que le quota l'a refusé ; un 5xx, en revanche, peut survenir alors que l'appel était **déjà engagé**. Dans ce dernier cas la mesure a pu être produite et facturée, et un remboursement amont n'est pas garanti sur un compte d'essai — voir **BL-001** dans [KNOWN_LIMITATIONS.md](../KNOWN_LIMITATIONS.md). D'où `billing_unknown` : inconnu veut dire inconnu, donc réconciliez plutôt que de réessayer.

**Deux réserves, énoncées plutôt que masquées.** Ce connecteur ne peut pas prouver qu'une réponse vient de l'application plutôt que d'une infrastructure placée devant elle, et une révision déployée peut différer de la révision épinglée. `no_measurement_billed` signifie donc « déclaré et cohérent avec la révision de référence », **jamais « prouvé sur votre déploiement »**.

**Aucun réessai automatique, en aucun cas.** `POST /v1/govern` n'est pas idempotent et ne porte pas d'`Idempotency-Key` : un appel accepté crée une observation, débite un quota ou un portefeuille, écrit un événement d'usage et écrase la référence `delta_g` côté serveur. Le champ `retry` dit ce qu'un **appelant** peut faire ; cet adaptateur, lui, n'en fait rien. Un test vérifie qu'aucun statut, y compris 503, ne produit plus d'une requête amont.

Le `Retry-After` amont n'est pas exposé : choisissez votre propre délai sur un 429.

## Erreurs, interruptions et limites de conservation

Une erreur d'exécution est renvoyée avec `isError: true` et `adapter_error`. Elle ne crée pas de `measurement_status`. Les événements reçus avant une interruption restent disponibles, sans concaténation en réponse inventée.

- `INVALID_ARGUMENTS`, `REQUEST_TOO_LARGE`, `PROVIDER_KEY_NOT_CONFIGURED` : rejet local avant appel amont.
- `UPSTREAM_HTTP_ERROR` : statut HTTP NeoMundi conservé. Le corps d'erreur HTTP n'est pas exposé, car il peut contenir des détails ou identifiants sensibles ; ce n'est pas un objet de mesure accepté.
- `SSE_ERROR`, `SSE_INTERRUPTED`, `SSE_JSON_INVALID`, `SSE_TERMINAL_INVALID` : erreur SSE, terminal absent ou données invalides ; événements déjà décodés conservés.
- `TOTAL_TIMEOUT`, `IDLE_TIMEOUT`, `CANCELLED`, `NETWORK_ERROR` : fin locale explicite, résultat distant potentiellement inconnu.
- `UPSTREAM_CONTENT_TYPE`, `UPSTREAM_JSON_INVALID`, `UTF8_INVALID`, `RESPONSE_TOO_LARGE` : réponse hors du contrat de transport ou des limites locales.
- `CREDENTIAL_DISCLOSURE` : si une réponse contient une clé configurée détectable, le résultat entier est retenu plutôt que d'altérer la mesure par une expurgation partielle. Cette garde ne constitue pas un détecteur universel de secrets inconnus.

Le parseur SSE gère les découpages réseau arbitraires, UTF-8 fragmenté, LF/CRLF/CR, BOM initial, commentaires heartbeat, événements nommés inconnus et plusieurs lignes `data:`. Un événement de données ordinaire doit contenir du JSON, conformément au backend. Le premier terminal accepté arrête la lecture ; le connecteur n'attend pas `[DONE]` après `done`. Les octets non encore lus après le terminal ne sont pas inventés : par exemple un LF séparé après un CR terminal peut ne pas avoir été reçu. Une limite de taille dépassée reste une erreur, jamais un résultat tronqué présenté comme réussi.

Les heartbeats évitent le délai d'inactivité mais ne prolongent pas le délai global. Une annulation MCP, une déconnexion HTTP, la suppression d'une session ou l'arrêt local interrompt la requête amont locale. Cela ne prouve ni annulation de l'exécution distante, ni remboursement, ni absence de persistance. Aucun retry, redirect, basculement d'endpoint ou reprise par `Last-Event-ID` n'est effectué.

## Transport MCP et appel depuis un agent

Le serveur implémente le sous-ensemble nécessaire des versions MCP `2025-06-18` et `2025-03-26` : `initialize`, `notifications/initialized`, `ping`, `tools/list`, `tools/call`, `notifications/cancelled`, et suppression de session HTTP `DELETE`.

1. Le client envoie `initialize` par POST avec `Authorization`, `Content-Type: application/json` et `Accept: application/json, text/event-stream`.
2. Il conserve le header `Mcp-Session-Id` et la version négociée, puis notifie `notifications/initialized`.
3. Les requêtes suivantes incluent `Mcp-Session-Id` et `MCP-Protocol-Version`.
4. `tools/list` annonce le seul outil et ses deux schémas. `tools/call` renvoie `structuredContent` et son équivalent JSON textuel.
5. `DELETE /mcp` ferme la session. Les identifiants de session ne remplacent jamais l'authentification et ne sont pas des clés créées pour le déploiement.

Les POST MCP répondent en `application/json`, une forme de réponse Streamable HTTP. `GET /mcp` renvoie explicitement 405 : aucun canal SSE d'événements initiés par le serveur MCP n'est annoncé. Cela n'empêche pas le client amont de consommer le SSE NeoMundi. Les notifications sont acquittées par HTTP 202 sans corps. Les batches, ressources, prompts, abonnements et reprises MCP ne sont pas implémentés.

Un [client agent réutilisable](examples/agent-client.mjs) est fourni. Exemple pour un hôte d'agent qui reçoit déjà une clé de son environnement sécurisé et des données réelles d'exécution :

```javascript
import { AgentMcpClient } from './examples/agent-client.mjs';

// mcpApiKey et actualExecution sont fournis par l'hôte ; ne pas les journaliser.
const client = new AgentMcpClient({
  endpoint: 'http://127.0.0.1:8787/mcp',
  apiKey: mcpApiKey,
});
await client.connect();
try {
  const result = await client.measure({ execution: actualExecution });
  // Remettre result tel quel au consommateur ; aucune décision dérivée ici.
} finally {
  await client.close();
}
```

Le client doit pouvoir transmettre le header Bearer configuré. Aucun branchement spécifique à ChatGPT ou Codex n'a été testé. Un service hébergé à distance ne peut pas joindre cette adresse loopback : ce MVP local n'est pas un connecteur ChatGPT cloud déployé.

## Exécution en conteneur

Une image locale existe depuis le 2026-10-20 : [`Dockerfile`](../Dockerfile) et [`compose.yaml`](../compose.yaml) à la racine du dépôt. **Elle n'est publiée sur aucun registre, et ne doit pas l'être sans décision explicite.** Le dépôt est public, mais le logiciel n'est **pas distribué** : aucun paquet npm, aucun registre d'images, aucune release. Une image publiée serait un canal de distribution, et c'est une décision distincte de la visibilité du dépôt — voir le tableau des cinq axes dans le [README racine](../README.md).

L'image est reproductible par construction : le connecteur n'a **aucune dépendance d'exécution**, donc rien à installer, aucun verrou à résoudre et aucun accès réseau au moment du build. Elle vaut la base épinglée plus les sources du dépôt. La suite hors ligne tourne **pendant** le build : un build qui ne passe pas ses propres tests ne produit pas d'image.

```bash
docker build -t neomundi-measurement-mcp:local .

# Les clés viennent de votre environnement, jamais de l'image ni d'un .env.
NEOMUNDI_API_KEY=… NEOMUNDI_MCP_API_KEY=… docker compose up --build
```

### Les deux contraintes à connaître avant de publier un port

**1. L'écoute n'est plus confinée au loopback dans l'image.** Dans un conteneur, un processus écoutant sur `127.0.0.1` est inatteignable à travers un port publié ; l'image fixe donc `NEOMUNDI_MCP_BIND=0.0.0.0`. La conséquence est réelle et le serveur l'énonce sur stderr au démarrage : **le point d'entrée MCP devient joignable depuis là où le conteneur est publié, et `NEOMUNDI_MCP_API_KEY` est alors la seule barrière devant lui.** Le `compose.yaml` fourni compense en ne publiant que sur le loopback de l'hôte (`127.0.0.1:8787:8787`).

Hors conteneur, **rien ne change** : le défaut reste `127.0.0.1`, et aucune variable n'est nécessaire pour l'obtenir.

**2. Le port doit être publié à l'identique.** La liste blanche `Host` n'accepte que `127.0.0.1:<port>` et `localhost:<port>` pour le port réellement écouté. `-p 9000:8787` fait envoyer `Host: localhost:9000` par le client, refusé en **403 `invalid_host`**. Ce contrôle est délibéré — il est ce qui bloque un rebinding DNS ou une confusion de proxy — et élargir l'écoute ne l'élargit pas : `tests/bind-address.test.mjs` le vérifie.

### Ce qui a été vérifié sur l'image, le 2026-10-20

| Vérification | Résultat observé |
|---|---|
| Build | image construite, **suite hors ligne passée dans l'image** |
| Démarrage sans secret | refus, message générique, **code de sortie 1**, aucune valeur affichée |
| Clé malformée, adresse de bind non autorisée | refus au démarrage, même message |
| Démarrage nominal | `Private NeoMundi MCP listening on http://127.0.0.1:8787/mcp` + l'avertissement de bind sur stderr |
| Sans credential, puis avec un mauvais credential | **401** dans les deux cas, en-tête `WWW-Authenticate` présent |
| `initialize` puis `tools/list` | session établie, protocole `2025-06-18`, un outil : `measure_execution` |
| Amont injoignable | `adapter_error.code = NETWORK_ERROR`, `response: null`, `transport: not_validated`, **aucune mesure fabriquée** |
| Secrets dans les journaux | **zéro occurrence** des deux sentinelles |
| `docker stop` | arrêt **immédiat**, `exitcode=0`, pas de kill |
| Contenu de l'image | ni sonde d'appel réel, ni rapports internes, ni aucun `.env` — 247 Mo |

Le durcissement du `compose.yaml` — `read_only`, `cap_drop: ALL`, `no-new-privileges`, utilisateur `node` — est déclaré mais **n'a pas été exercé sous charge** : il est posé par prudence, pas par mesure.

Aucune sonde `HEALTHCHECK` n'est déclarée : elle devrait présenter le credential Bearer pour franchir le 401, et une sonde portant le credential dans les métadonnées de l'image serait pire que pas de sonde. La vivacité se vérifie depuis l'extérieur, avec le credential que vous détenez déjà.

Le délai de grâce à l'arrêt est porté à 45 s dans le `compose.yaml` : un appel de mesure en vol **n'est jamais rejoué**, et le couper court laisse une issue inconnue que le connecteur ne peut pas lever auprès de NeoMundi.

## Installation et configuration d'un client MCP

### Ce qu'il faut savoir avant de brancher quoi que ce soit

Ce serveur parle **Streamable HTTP**, pas **stdio**. Beaucoup d'hôtes MCP attendent par défaut un processus stdio ; celui-ci est un serveur HTTP sur loopback. Vérifiez que votre hôte accepte un transport HTTP distant avant d'écrire une configuration.

Trois propriétés qui conditionnent la configuration :

- il écoute **uniquement sur `127.0.0.1`**, et vérifie l'en-tête `Host` et l'origine. Un hôte qui s'y connecte par un autre nom recevra un 403 ;
- l'authentification est **obligatoire sur chaque requête**, en `Authorization: Bearer <NEOMUNDI_MCP_API_KEY>`. Cette clé est **distincte** de la clé NeoMundi et n'est pas un secret partagé avec l'API ;
- `GET /mcp` renvoie délibérément **405**. Aucun canal SSE initié par le serveur MCP n'est annoncé ; cela n'empêche pas la consommation du SSE NeoMundi en amont.

### Démarrage

```powershell
# Les clés viennent de votre mécanisme d'environnement habituel. Ce serveur ne
# lit aucun fichier .env et n'en crée aucune.
$env:NEOMUNDI_API_KEY = '<cle NeoMundi>'
$env:NEOMUNDI_MCP_API_KEY = '<secret local pour le client MCP>'
node runtime/server.mjs
# Private NeoMundi MCP listening on http://127.0.0.1:8787/mcp
```

Vérifiez d'abord sans aucune clé et sans appel distant :

```powershell
node runtime/demo.mjs
# PASS: local MCP initialization, tools/list, observation, SSE done, SSE [DONE].
# NeoMundi API: 3 mocked requests; 0 remote calls; no environment credentials read.
```

### Exemple de configuration client

Forme générique d'un hôte MCP acceptant un transport HTTP. **Ne mettez pas la clé dans ce fichier** : référencez une variable d'environnement si votre hôte le permet, sinon utilisez son magasin de secrets.

```json
{
  "mcpServers": {
    "neomundi-measurement": {
      "type": "http",
      "url": "http://127.0.0.1:8787/mcp",
      "headers": {
        "Authorization": "Bearer ${NEOMUNDI_MCP_API_KEY}"
      }
    }
  }
}
```

Les noms de champs varient d'un hôte à l'autre (`type`, `transport`, `serverUrl`…) : reportez-vous à la documentation du vôtre. **Un seul hôte a été vérifié** : Claude Code 2.1.247, le 2026-10-20, en transport HTTP — connexion, handshake, découverte de l'outil et invocation (ML-009, et `START_HERE.md` §3). Ce bloc reste générique : il n'est vérifié contre aucun **autre** hôte, et cela n'est pas affirmé.

Le serveur doit être démarré séparément : cette configuration ne le lance pas.

Pour un agent écrit en JavaScript, [`examples/agent-client.mjs`](examples/agent-client.mjs) fournit un client réutilisable qui gère l'initialisation, la session et l'annulation.

### Outils MCP disponibles

**Un seul outil**, et c'est délibéré.

| | |
|---|---|
| Nom | `measure_execution` |
| Effet | **une seule** requête API par invocation |
| `readOnlyHint` | `false` — l'appel crée une observation côté serveur |
| `destructiveHint` | `false` |
| `idempotentHint` | **`false`** — ne jamais rejouer automatiquement |
| `openWorldHint` | `true` |

Deux parcours mutuellement exclusifs, exactement un par appel :

| Argument | Route appelée | Coût |
|---|---|---|
| `execution` | `POST /v1/govern` | quota NeoMundi |
| `generation` | `POST /v1/govern/stream` | quota NeoMundi **et** ressources fournisseur |

`execution.raw_metrics` exige `token_count` et `latency_ms` ; `cost`, `model_name`, `prompt_length`, `response_length` et `semantic_risk` sont facultatifs. Seuls les champs explicitement fournis sont transmis : **aucune valeur par défaut ni estimation locale**. Aucun identifiant ne figure dans le schéma d'arguments.

Ni ressources, ni prompts, ni abonnements, ni batches MCP ne sont implémentés. `tools/list` annonce exactement un outil et n'est pas paginé.

### Un appel réel, reproductible — hors dépôt

Un script `runtime/live-once.mjs` effectue **un** appel réel, à travers un vrai serveur MCP local, avec tous les identifiants pris dans l'environnement du processus et aucun dans le fichier. Il rétablit ce que le projet avait perdu : la seule preuve de transport réel existait sous forme de résultat, mais le script qui l'avait produite n'était plus là, donc l'observation n'était pas rejouable.

**Il n'est pas distribué dans ce dépôt.** `.gitignore` l'exclut, avec `runtime/.live-api-attempted`, comme toute sonde locale : son objet est de contacter un endpoint réel et de consommer du quota, et un dépôt public n'est pas l'endroit pour en proposer un. Il figure dans la copie de travail de l'équipe.

Ses garde-fous sont vérifiés **sans aucun appel réel** par `runtime/tests/live-once.test.mjs`, lui-même exclu du dépôt avec lui : refus sans `--yes` avec un code de sortie distinct, annonce préalable de la destination exacte, du transport, de la facturation et de la charge complète, refus de la génération sans clé fournisseur, annonce du transport en clair sur loopback, aucun artefact écrit sur un refus, et aucune valeur d'identifiant dans la sortie. Le texte envoyé est **synthétique et fixe** : jamais un prompt réel, jamais une donnée client.

Pour effectuer un appel réel sans ce script, démarrez `server.mjs` et invoquez `measure_execution` depuis votre client : l'effet est le même, et la [frontière de consommation](#frontière-de-consommation) s'applique à l'identique.

## Limites du chemin SSE

Le chemin `generation` fonctionne et a été observé en réel une fois. Il porte néanmoins des limites qu'il faut connaître avant de s'appuyer sur un chiffre qui en sort.

**BL-002 — la décision dépend du découpage réseau.** Les fenêtres de mesure intermédiaires se déclenchent tous les N **chunks**, pas tous les N tokens ni caractères. Le même texte livré en 100 fragments produit 5 fenêtres ; livré en 15 fragments, aucune. La série `delta_g`, sa variation totale, son profil et donc les règles qui peuvent transformer un `ALLOW` en `FLAG` varient avec cette fragmentation. **Tant que BL-002 est ouverte, aucune mesure SSE ne doit fonder une affirmation chiffrée, une publication ou une comparaison entre modèles.** Le chemin REST n'est pas concerné.

**Aucune version de mesure n'est publiée.** L'événement nommé `done` observé depuis la passerelle ne porte **aucun bloc `audit`**. `measurement_reference.agreement` y vaut donc toujours `not_declared` — une absence du contrat amont, pas une défaillance du connecteur. Une mesure SSE n'est par conséquent **pas rattachable à une révision**, et n'est pas comparable à une mesure REST.

**La forme du `done` SSE diffère de celle de `/v1/govern`.** Le `done` observé est plat (`decision`, `stability_score`, `r_score`, `regime`, `total_tokens`, `delta_g`, `moderation`, `hallucination`…) là où la réponse REST est structurée en blocs (`governance`, `quality`, `metrics`, `baseline`, `audit`, `esi`…). Ce sont **deux contrats différents**. Aucun schéma amont ne fait autorité pour le SSE, et l'aide de lecture, construite sur les chemins REST, n'y produit donc presque aucune entrée.

**Aucune charge SSE enregistrée n'existe.** Les 11 enregistrements réels portent sur REST. Le SSE reste adossé à la fixture historique [`LIVE_API_RESULT.json`](LIVE_API_RESULT.json) et à des charges écrites à la main : son cadrage est reconstruit, ce n'est pas une capture exacte des octets amont.

**`[DONE]` sans `done` nommé laisse `response` à `null`.** Le connecteur ne devine pas quel événement serait une mesure finale. Les données restent dans `sse.events`.

**La provenance du décompte de tokens est inconnue.** Aucun `token_count_source` n'est émis, et le compteur intermédiaire n'est pas un décompte fournisseur exact.

## Comment l'API, le SDK et ce connecteur s'articulent

Trois composants, trois rôles, **une seule source de vérité**.

| | Rôle | Langage |
|---|---|---|
| **API NeoMundi** (`govern-v3`) | produit la mesure. Seule autorité sur les valeurs, les seuils et les décisions | Python |
| **SDK Python v0.1** | client Python. Modélise le contrat REST, protège la lecture, refuse toute conversion | Python |
| **Ce connecteur MCP** | expose la mesure à un agent IA, en REST et en SSE | **Node.js** |

**Le SDK n'est pas importé ici, et ne peut pas l'être** : un module Python ne s'importe pas depuis Node.js. Ce qui a été reporté n'est pas son code mais **son savoir** — quels champs sont homonymes, quelles échelles sont inversées, quand un agrégat est retenu, quelle cause accompagne un signal non mesuré.

**Ce que chacun a établi, et seulement cela :**

| | SDK Python | Ce connecteur |
|---|---|---|
| REST `/v1/govern` | **validé en réel** : 11 réponses enregistrées, 0 écart de type, 0 champ non modélisé | **rejoue ces 11 mêmes réponses** |
| SSE `/v1/govern/stream` | **non implémenté** | **observé en réel une fois**, limites ci-dessus |
| Lecture des résultats | 11 modèles typés, parsing non coercitif | `reading_aid`, à côté de la réponse brute |

Les deux sont donc **complémentaires**, et leur point d'accord est vérifiable : les **mêmes** enregistrements réels alimentent les deux suites de tests. Si le backend change, les deux le signalent — le SDK par un `parse_warning`, ce connecteur par un `agreement: divergent` ou un champ racine inconnu.

**Risque assumé de ce découpage** : deux implémentations des mêmes règles peuvent dériver l'une de l'autre. La parade est ici que [`reference.mjs`](reference.mjs) épingle la même révision que le `API_CONTRACT` du SDK, et que les deux suites rejouent les mêmes enregistrements. Un désaccord devient un test rouge, pas une divergence silencieuse.

**Ce qu'aucun des trois ne fournit** : une spécification OpenAPI figée côté serveur. C'est pourquoi un commit est épinglé, et pourquoi une capture réelle reste le seul moyen de détecter une dérive de contrat.

## Frontière de consommation

NeoMundi fournit le signal et son contexte métrologique ; le système consommateur conserve ses politiques et ses décisions. Les noms historiques `governance.decision` ou `is_long_form_safe`, s'ils sont reçus, restent des champs bruts. Le connecteur n'en tire aucune conclusion de conformité, sécurité, assurance, autorisation ou gouvernance.

Les divergences de contrat sont acceptées opérationnellement par cette interface privée permissive. Leur résolution, les validations avec l'API réelle et les clients visés, et le mode d'accès public restent détaillés dans [le rapport actuel](IMPLEMENTATION_REPORT.md). Rien n'est déployé ou publié par les commandes de test.

# Audit du contrat API — 7 septembre 2026

## Conclusion préalable

**La source locale ne définit pas un contrat cible unique. Arrêt avant implémentation du connecteur.** Les routes sont identifiables dans le code, mais la version effectivement servie par le domaine public n'est pas établie par les archives. Deux schémas sous `0.1.0` divergent sur la nullabilité et les statuts ; le schéma documentaire v0.2 utilise un autre état d'absence de classification. Un adaptateur ne doit ni arbitrer silencieusement entre eux ni produire un contrat normalisé.

Cet audit est une lecture statique locale. Il ne constitue pas une observation de l'API déployée. Aucun moteur n'a été exécuté. Les fichiers de secrets, configurations `.env`, clés privées et guides administratifs sensibles n'ont pas été ouverts. Aucun environnement secret n'a été interrogé.

## Sources et notation

Les chemins ci-dessous sont des entrées ZIP, pas des fichiers de production extraits.

- **B** : `Backend_plateforme_v2-main.zip`, préfixe `Backend_plateforme_v2-main/govern-v3/`.
- **R** : `neomundi-runtime-measurement-main.zip`, préfixe `neomundi-runtime-measurement-main/`.
- Les archives `api-de-prod-avec-documentation-main.zip` et `plateforme_backend_and_full_documentation_v1-main.zip` contiennent aussi des modèles et routes, avec des empreintes différentes de B.
- `ONBOARDING_SOURCE_AUDIT.md` et `DEVELOPER_ONBOARDING_DRAFT.md` sont des analyses secondaires : leurs qualificatifs « production » ou « current » ne prouvent pas la révision déployée.
- `DOCUMENTATION.zip` contient des doublons imbriqués. Le schéma RGC backend imbriqué a la même empreinte que celui de B ; les empreintes des schémas runtime imbriqués ont aussi été relevées. Aucune archive n'a été extraite globalement.

Les trois schémas sont conservés indépendamment dans `schemas/`, avec leurs chemins et empreintes dans `provenance.json`. L'index `backend-model-declarations.json` référence les classes, champs, types et numéros de ligne. Il n'est pas un JSON Schema généré : il ne prétend pas encoder les contraintes et validateurs Pydantic.

## Endpoints établis dans le code

Le préfixe `/v1` vient de B `app/main.py::_include_routers`. Les routeurs ajoutent `/govern` et `/rgc`.

| Route | Rôle réellement codé | Source B |
|---|---|---|
| `POST /v1/govern` | Mesure post-appel à partir de `GovernRequest`, réponse JSON `GovernResponse` | `app/api/v1/governance.py:78`, `:96` |
| `POST /v1/govern/stream` | Appel au fournisseur avec sa clé, génération et contrôles, réponse SSE | `app/api/v1/streaming.py:71`, `:103`, `:221` |
| `GET /v1/govern/{request_id}` | Lecture d'un résultat existant, `GovernResponse` | `app/api/v1/governance.py:622` |
| `POST /v1/rgc/contracts/{request_id}` | Construction, signature et stockage du contrat côté NeoMundi depuis le log existant | `app/api/v1/rgc.py:59` |
| `GET /v1/rgc/contracts/{request_id}` | Lecture d'un contrat déjà émis | `app/api/v1/rgc.py:107` |
| `GET /v1/rgc/schema` | Schéma RGC du backend, route publique | `app/api/v1/rgc.py:46` |

R `API_INTEGRATION_GUIDE.md` annonce `https://api.neomundi.io`. C'est une URL documentaire, non contactée. Aucune route `measure_execution` n'existe dans les sources inspectées : ce nom désigne le futur outil MCP.

La route de mesure consomme du quota et persiste des résultats. La génération SSE déclenche un appel fournisseur. L'émission RGC est un POST avec signature et stockage. Aucun de ces appels ne doit être assimilé à une simple lecture, ni répété automatiquement après un délai dont l'issue serveur est inconnue.

## Schéma d'entrée post-appel : B `app/models/requests.py:118`

Objet `GovernRequest` ; `raw_metrics` est obligatoire. Les valeurs ci-dessous sont celles du backend, **pas des valeurs que l'adaptateur devrait injecter**.

| Champ | Type, contraintes | Défaut serveur |
|---|---|---|
| `source_type` | string, longueur 1–50 ; description `llm / iot / financial`, pas un enum Pydantic | `llm` |
| `mode` | enum `OBS` uniquement | `OBS` |
| `raw_metrics` | objet `RawMetrics` | obligatoire |
| `llm_response` | string ou null, longueur maximale 50 000 | null |
| `llm_prompt` | string ou null, longueur maximale 10 000 | null |
| `rag_context` | liste de strings ou null, au plus 50 éléments | null |
| `documents` | liste de `DocumentInput` ou null, au plus 10 éléments | null |
| `metadata` | objet à valeurs arbitraires | objet vide |

`DocumentInput` : `title` string obligatoire, longueur 1–200 ; `text` string obligatoire, longueur 1–10 000.

`RawMetrics`, B `app/models/requests.py:28` :

| Champ | Type, contraintes | Défaut serveur |
|---|---|---|
| `token_count` | entier ≥ 0 | obligatoire |
| `latency_ms` | float ≥ 0 | obligatoire |
| `cost` | float ≥ 0 | 0.0 |
| `semantic_risk` | float de 0 à 1 | 0.0 |
| `prompt_length`, `response_length` | entiers ≥ 0 | 0 |
| `model_name` | string, longueur 1–255 | `unknown` |

Ces champs scalaires ne sont pas déclarés nullable. Le validateur `_clamp_risk` borne les nombres dans [0,1] côté backend. Le modèle n'active pas explicitement `strict=True` ni `extra='forbid'`. Un futur adaptateur strict devra rejeter les arguments inconnus et les types invalides sans reproduire une coercition ou un bornage. L'omission doit rester une omission ; les null autorisés doivent rester null. Aucune estimation locale de tokens, coût ou latence de génération ne doit compléter les données manquantes.

Contradiction documentaire : R §4 décrit `latency_ms` comme entier arrondi, alors que B accepte un float. B décrit les métriques comme réelles, R §4 admet des tokens « measured or estimated ». Le connecteur ne peut pas inventer ces métriques.

## Schéma d'entrée streaming : B `app/models/requests.py:215`

| Champ | Type, contraintes | Défaut serveur |
|---|---|---|
| `prompt` | string obligatoire, longueur 1–50 000 | aucun |
| `provider_api_key` | string obligatoire, longueur minimale 10 | aucun |
| `system_prompt` | string, longueur maximale 10 000 | `You are a helpful assistant.` |
| `model` | string, longueur 1–100 | `gpt-4o` |
| `provider` | string ou null, longueur maximale 50 | null |
| `max_tokens` | entier de 1 à 16 384 | 4 096 |
| `temperature` | float de 0 à 2 | 0.7 |
| `mode` | enum `OBS` | `OBS` |
| `metadata` | objet à valeurs arbitraires | objet vide |

Le backend retire les espaces de la clé fournisseur, rejette les préfixes NeoMundi `ct_test_` et `ct_live_` à cet emplacement, et normalise le nom du fournisseur. Une liste exhaustive de fournisseurs n'est pas garantie par ce modèle : le registre la décide. Le connecteur ne doit pas exposer `provider_api_key` dans les arguments MCP ; toute utilisation ultérieure devra provenir exclusivement de l'environnement serveur.

**Contradiction de génération :** R §3 demande de ne pas envoyer `temperature` pour utiliser la politique native du fournisseur. B initialise `temperature=0.7` et le passe au fournisseur même lorsque le client omet ce champ (`streaming.py:230`). Choisir une version a donc un effet sur l'exécution mesurée, pas seulement sur le parsing.

## Schéma de sortie JSON post-appel

B `app/models/responses.py:488–621` déclare `GovernResponse` :

- Requis sans défaut : `request_id: string`, `mode: string`, `governance`, `metrics`, `baseline`, `audit`.
- `timestamp: datetime` avec défaut UTC courant, sérialisé JSON ; `system_id: string` avec défaut `controltower-api`.
- Nullable, défaut null : `g_score`, `g_final`, `v_score` (nombres [0,1]), `delta_g` (nombre), `checks_emitted` (entier ≥ 0), `measured_signals` (liste de strings), `processing_time_ms` et `latency_ms` (nombres ≥ 0), `model` (string).
- Blocs nullable, défaut null : `quality`, `runtime`, `density`, `esi`, `rag_grounding`.

`governance` contient `decision: string` requise (description `ALLOW | FLAG`, sans enum de validation), `confidence: number [0,1]` requis et `reasons: string[]` avec défaut liste vide. Le guide R annonce cinq décisions possibles. Il ne faut ni restreindre une valeur observée à deux décisions à partir d'une simple description, ni produire soi-même une décision.

`quality` contient notamment `g_score`, `stability_score`, `confidence`, `coherence_score`, `semantic_risk`, `factual_hallucination_score`, `semantic_instability_score`, plus `information_density` et `suspect_phrases` nullable. Plusieurs scores ont des défauts numériques serveur. `runtime` contient `r_score`, `latency_score`, `cost_score`, `e_token`, `energy_score`. `metrics` contient `energy_score`, `e_token`, `cost_proxy`, `latency_proxy`, `stability_score`. `baseline` contient `reference_energy`, `observed_energy`, `delta_E`, et les métadonnées nullable `calibration_status`, `esi_q`, `esi_bootstrap`. `audit` contient les versions de mesure/normalisation et `trace_id`. L'index des déclarations fournit aussi les structures des blocs RAG, densité et ESI.

**Le schéma de sortie MCP n'est pas arrêté.** `GovernResponse`, l'objet final SSE et le contrat RGC sont trois sorties différentes. Un JSON Schema RGC n'est pas le schéma de `/v1/govern`.

### Différence entre null, zéro et absence de mesure

B `governance.py::_apply_tier_filter`, lignes 1455–1518, conserve certains scores mais remplace des valeurs non exposées par zéro, met `runtime`, `density`, `esi`, `g_final` à null et restreint `measured_signals` aux signaux exposés. Le commentaire de `responses.py` qui annonce `g_score` null en entrée de gamme est contredit par ce code qui le conserve.

Il faut restituer exactement l'objet serveur et ses marqueurs de provenance, sans convertir les zéros en null ou affirmer qu'ils sont mesurés. Réciproquement, ne jamais convertir null en zéro, false, string vide ou tableau vide. Un champ absent ne doit pas être ajouté avec une valeur par défaut. La cohérence entre contexte et signal doit rester attachée au résultat.

## Authentification et erreurs HTTP

B `app/auth/api_key.py:586` exige le header `X-API-Key`. Le format accepte les préfixes `ct_live_`, `ct_test_`, `ct_trial_`. Le backend effectue une recherche via cache Redis puis base PostgreSQL, avec hash SHA-256 côté authentification. Le JWT du portail ne remplace pas cette clé. L'authentification entrante du futur MCP n'est pas définie par l'API NeoMundi.

| Cas établi dans B | Comportement |
|---|---|
| Header obligatoire absent | Erreur de validation FastAPI, normalement HTTP 422 |
| Format de clé invalide, clé invalide/suspendue/révoquée | HTTP 401 |
| Limite de fréquence | HTTP 429, notamment `Retry-After` |
| Budget/solde/quota épuisé | HTTP 402 |
| Paramètres invalides | HTTP 422 ; fournisseur non détectable : HTTP 400 |
| Corps déclaré supérieur à 1 048 576 octets | HTTP 413 dans le middleware de taille |
| Erreur de mesure non traitée | HTTP 500 |
| Contrat RGC sans Tier 03 | HTTP 403 |
| Log ou contrat absent | HTTP 404 |
| Signature RGC non configurée | HTTP 503 |
| Log non représentable en contrat | HTTP 422, aucun contrat de substitution |

B `app/main.py::_register_exception_handlers` renvoie généralement `error`, `detail`, `request_id`, `timestamp`. `detail` peut être une liste de descriptions de validation ; le modèle `ErrorResponse.detail: str` n'en décrit donc pas tous les cas. Le middleware 413 peut renvoyer seulement `error` et `detail`. La table `_status_to_error_code` ne nomme pas spécifiquement 402 : son code texte peut être simplement `error`. Il faut conserver le statut HTTP sans inventer un enum exhaustif à partir du modèle d'erreur.

## Streaming SSE réellement codé dans B

`EventSourceResponse` produit `text/event-stream`. `_sse_event` sérialise des dictionnaires sous la forme événement nommé + donnée JSON. Les émissions inspectées incluent `provider_info`, `chunk`, `governance_check`, `stability_check`, `coherence_check`, `hallucination_check`, `density`, `done`, `error`. Le commentaire d'en-tête mentionne aussi `moderation` : cette mention ne suffit pas à prouver une émission distincte.

`chunk` transporte `content` et `tokens_so_far`. Dans ce code, le compteur intermédiaire augmente par chunk : il n'est pas un décompte exact des tokens. Le connecteur ne doit pas le convertir en mesure définitive.

`done` contient les champs construits aux lignes 562–584 : `decision`, `request_id`, `provider`, `stability_score`, `r_score`, `regime`, `total_tokens`, `latency_ms`, `cost`, `stream_interrupted` (false dans ce chemin), `reasons`, `response_text`, `is_long_form_safe`, `delta_g`. Ce dernier contient `profile`, `series`, `min_stability`, `max_stability`, `total_variation`, `flagged_by_profile`. Des blocs `moderation`, `coherence`, `hallucination`, `geometry` sont ajoutés conditionnellement. Aucun modèle Pydantic de sortie SSE complet n'est déclaré sur la route.

Le code émet `done` en dernier, après les tentatives de persistance, puis termine le générateur. Certains échecs de persistance sont capturés : un `done` reçu n'est pas à lui seul une garantie indépendante de récupération ultérieure d'un contrat. **Ce code n'émet pas de marqueur littéral `[DONE]`.** R §3 affirme une terminaison `data: [DONE]` et présente des données sans noms d'événement. Ce sont des descriptions différentes.

En cas d'erreur fournisseur après ouverture, B émet `error` avec `error`, `provider`, `tokens_so_far`. Le message d'auth fournisseur est spécifique ; d'autres erreurs reprennent `str(exc)`. Le connecteur futur ne doit pas journaliser ou réexposer aveuglément un texte d'exception susceptible de contenir des données sensibles. Une `HTTPException` dans le générateur est relancée après tentative de remboursement : le client peut observer une coupure sans événement terminal, alors que les headers HTTP ont déjà été envoyés.

Les sources inspectées n'établissent aucun protocole applicatif de reprise avec `Last-Event-ID`, aucune garantie d'idempotence, aucune durée maximale contractuelle ni délai garanti entre deux événements. Une coupure, une annulation ou un timeout ne prouve pas l'annulation distante ni le remboursement. Le futur client devra gérer UTF-8 fragmenté, délimitation des événements, commentaires heartbeat, données multilignes, fin prématurée, JSON invalide, limite de taille, timeout global et inactivité, et annuler son flux HTTP local. Ces exigences ne sont pas encore implémentées ou testées.

R §3–5 demande d'utiliser l'identifiant de la mesure post-appel pour RGC, pas celui du streaming. Le backend SSE persiste pourtant son propre résultat sous son identifiant. La chaîne autoritative (SSE seul, puis RGC ; ou SSE puis nouvelle mesure post-appel puis RGC) doit être désignée, sans déclencher silencieusement deux mesures.

## États du contrat RGC : contradiction bloquante

Les trois schémas ont les blocs `identity`, `provenance`, `observation`, `governance`, `integrity`, mais leurs contraintes divergent.

| Propriété | B RGC `0.1.0` | R contrat v0.1 | R contrat v0.2 |
|---|---|---|---|
| Version | const `0.1.0` | string, défaut `0.1.0` | const `0.2.0` |
| Valeurs des cinq signaux de couverture | nombre ou null | nombre, pas null | nombre ou null |
| Statut par signal | `measured`, `not_measured`, `insufficient_coverage` | pas de bloc équivalent | mêmes trois états |
| Classification | `within_bounds`, `flagged`, `not_determinable` | string, description `within_bounds / flagged` | `within_bounds`, `flagged`, `not_assessed` |
| `confidence` | nombre ou null, hors couverture | nombre | nombre |
| Contexte du domaine mesuré | `observation_class_scope` et frontière temporelle explicites | structure plus ancienne | ne reprend pas exactement celle de B |

Dans B, la présence numérique des cinq signaux est liée à `measured`. `not_measured` et `insufficient_coverage` imposent null. `complete` suppose les cinq signaux mesurés, couverture 1 ; `partial` décrit les autres cas. Ces contraintes sont émises par le schéma source ; l'adaptateur n'a pas à recalculer la couverture ni à corriger un résultat qui les contredit.

`within_bounds` porte uniquement sur le domaine mesuré. `not_assessed` et `not_determinable` appartiennent à des contrats distincts : aucune équivalence n'est établie. Les remplacer violerait la conservation des états demandée. Les schémas conservent `execution_permission_changed: false`. Le signal n'accorde aucune autorisation et ne constitue aucune décision de conformité, sécurité, assurance ou gouvernance.

R `source-notes/SOURCE_STATUS.md` relève en outre un exemple historique signé v0.1 avec `complete` et couverture 0.6, incompatible avec les contraintes plus récentes. Cette observation est ici attribuée à la documentation, pas à une nouvelle vérification cryptographique. Aucun artefact signé n'a été modifié ou re-signé.

## Informations exactes manquantes pour implémenter

1. **Révision cible faisant autorité** : archive/commit identifié pour l'environnement à adapter, afin de trancher modèles, politique de génération et protocole SSE. Une URL seule ne suffit pas à identifier la révision.
2. **Contrat de sortie choisi** : réponse brute `GovernResponse`, événement final SSE, contrat RGC, ou enveloppe explicitement définie contenant les réponses distinctes. Le RGC doit être obtenu du serveur, jamais reconstruit dans le MCP.
3. **Schéma RGC exact et disponibilité** : choix parmi les schémas conservés, état attendu (`not_determinable` ou `not_assessed`), accès Tier 03 et signature disponibles si l'émission est retenue. La seule chaîne `0.1.0` ne permet pas ce choix.

Après ces confirmations, la stratégie d'erreurs, les limites locales et les timeouts pourront être définis comme paramètres propres à l'adaptateur, sans prétendre qu'ils viennent du contrat NeoMundi. Les tests de transport MCP/SSE et les mocks ne remplaceraient pas ces confirmations de source. Un éventuel test distant demanderait ensuite une autorisation explicite et une clé de test déjà provisionnée de manière sûre, sans lecture de sa valeur par l'agent.

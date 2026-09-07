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

Depuis `C:\Users\Danielle\Documents\DATASET\CONNECTEUR1` :

```powershell
node .\neomundi-measurement-mcp\runtime\server.mjs
```

Depuis ce dossier `runtime` : `node server.mjs`.

Adresse par défaut : **`http://127.0.0.1:8787/mcp`**. Le démarrage n'appelle aucune API. Un `tools/call` valide contre ce serveur réel déclenchera un appel NeoMundi ; cela pourra consommer du quota et, en génération, des ressources fournisseur. Le processus échoue avec un message générique si les clés requises ne sont pas configurées ; il n'affiche pas leur valeur. `Ctrl+C` ferme les connexions locales.

| Variable facultative | Défaut | Contrainte |
|---|---|---|
| `NEOMUNDI_API_BASE_URL` | `https://api.neomundi.io` | origine HTTPS seule, sans identifiants, chemin, query ou fragment |
| `NEOMUNDI_MCP_PORT` | 8787 | entier 1–65535 ; écoute toujours sur loopback |
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
| `validation` | validation du transport distincte de la conformité du contrat ; lacunes de métadonnées dans `metadata_gaps` |
| `sse.events` | tous les événements de données décodés jusqu'au terminal, avec nom, JSON, texte `raw_data` et `id` lorsqu'il était explicitement présent |
| `sse.raw_stream` | texte UTF-8 effectivement reçu, commentaires et champs SSE compris |
| `sse.termination` | `done`, `[DONE]`, ou null ; marqueur de transport, jamais un état métrologique |
| `adapter_error` | erreur technique locale explicite, ou null |

`response.contract_version` reste aussi dans la réponse brute. Si `contract_version` vaut null ou n'existe pas, l'alias vaut null. Les champs imbriqués, dont `identity.schema_version`, restent à leur emplacement ; aucune version n'est déduite ou rebaptisée. Si plusieurs événements annoncent une version, leur historique intégral demeure dans `sse.events`.

Ces valeurs de repli appartiennent uniquement à l'enveloppe MCP : aucun champ n'est ajouté à la réponse serveur. La provenance est reprise du champ `token_count_source` de la réponse finale JSON ou `done`, jamais d'un compteur intermédiaire. Un champ null ou vide reste inchangé dans les données brutes et donne `unknown` dans l'enveloppe.

`validation.transport` vaut `validated` après une réponse JSON valide ou une terminaison SSE `done` ou `[DONE]` sans erreur adaptateur. Sinon il vaut `not_validated`. La conformité du prompt, dont la ponctuation, n'intervient pas dans `isError`. Après transport réussi, `validation.contract` vaut `not_validated` lorsque la version manque ou la provenance est inconnue, sinon `not_assessed` : aucune conformité à un schéma backend autoritatif n'est certifiée par la seule présence de métadonnées. En cas d'erreur de transport, le contrat reste `not_assessed`.

La consolidation utilise [LIVE_API_RESULT.json](LIVE_API_RESULT.json) comme fixture historique anonymisée. Les tests reconstruisent son cadrage SSE, sans prétendre disposer des octets originaux, et ignorent son ancienne appréciation de conformité au prompt pour décider du succès du connecteur. Voir [CONSOLIDATION_REPORT.md](CONSOLIDATION_REPORT.md) pour le statut actuel et les corrections backend restantes.

Avec `[DONE]` sans événement nommé `done`, `response` reste null : le connecteur ne devine pas quel événement serait une mesure finale. Les données restent accessibles dans `sse.events`, y compris un éventuel objet de mesure avant le marqueur. `isError: false` signifie seulement que le transport s'est achevé correctement ; il ne signifie ni mesure complète ni résultat favorable.

Les nombres de sortie sont sérialisés avec leurs tokens JSON d'origine grâce à `JSON.rawJSON`. Les grands entiers, décimales précises et `-0` ne sont pas arrondis par le serveur. Un autre client peut néanmoins avoir son propre parseur numérique : `raw_response` et `raw_data` permettent alors une lecture exacte. L'ordre original et les doublons éventuels de clés JSON restent observables dans le texte brut ; une vue objet JSON ne peut pas représenter plusieurs occurrences d'une même clé.

Le connecteur conserve distincts `measured`, `not_measured`, `insufficient_coverage`, `complete`, `partial`, `within_bounds`, `not_assessed` et `not_determinable`, ainsi que tout état inconnu. Aucun null ne devient zéro, false, string vide ou champ absent. Les zéros de masquage par tier renvoyés par NeoMundi ne sont pas corrigés ; leur contexte, notamment `measured_signals`, est conservé.

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

## Frontière de consommation

NeoMundi fournit le signal et son contexte métrologique ; le système consommateur conserve ses politiques et ses décisions. Les noms historiques `governance.decision` ou `is_long_form_safe`, s'ils sont reçus, restent des champs bruts. Le connecteur n'en tire aucune conclusion de conformité, sécurité, assurance, autorisation ou gouvernance.

Les divergences de contrat sont acceptées opérationnellement par cette interface privée permissive. Leur résolution, les validations avec l'API réelle et les clients visés, et le mode d'accès public restent détaillés dans [le rapport actuel](IMPLEMENTATION_REPORT.md). Rien n'est déployé ou publié par les commandes de test.

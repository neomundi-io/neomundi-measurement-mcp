# Audit du traitement des données — connecteur MCP NeoMundi

**Relevé du 2026-11-01.** Établi sur `0.3.0-rc.1` (`da71f5d`), tel que
**réellement déployé** sur `mcp.neomundi.org`, par lecture du code **et** par
commande sur le serveur.

Chaque constat porte une marque, et elles ne sont jamais mélangées :

- **VÉRIFIÉ** — observé par commande ou lu dans le code servi, cette passe ;
- **NON VÉRIFIÉ** — hors de portée de cet audit, ou non observable d'ici ;
- **DÉCISION** — rien n'est cassé ; il manque un arbitrage.

> ⚠ Cet audit est **technique**. Il ne vaut pas avis juridique, ni analyse
> d'impact RGPD, ni qualification des rôles responsable/sous-traitant.

---

## 1. Le chemin complet d'une donnée

```
  client MCP (ChatGPT / Codex / Claude)
        │  JSON-RPC sur HTTPS
        ▼
  Caddy  (TLS, mcp.neomundi.org)                   ← aucun journal d'accès
        │  HTTP en clair sur 127.0.0.1:8787
        ▼
  conteneur neomundi-mcp  (ce connecteur)          ← aucune écriture disque
        │  HTTPS, en-tête X-API-Key
        ▼
  api.neomundi.io  (/v1/govern)  « controltower-api »
        │
        ▼
  évaluateurs (embeddings, modération, juge)
```

**Le connecteur est un passage, pas un entrepôt.** Tout ce qui suit découle de
ce fait, et chaque élément en a été vérifié séparément.

---

## 2. Ce qui est reçu du client

**VÉRIFIÉ** — par le schéma d'entrée servi et par `tools/list` en production.

L'outil `measure_execution` accepte **un seul** objet, dans l'une de deux
formes exclusives :

| Champ | Contenu | Borne déclarée |
|---|---|---|
`execution.llm_prompt` | **le prompt soumis à l'IA observée** | 10 000 caractères |
`execution.llm_response` | **la réponse produite par l'IA observée** | 50 000 caractères |
`execution.rag_context` | extraits de contexte | 50 entrées |
`execution.documents` | **documents sources** | 10 entrées |
`execution.raw_metrics` | jetons, latence — **seul champ requis** | — |
`execution.mode`, `source_type` | `OBS`, type de source | — |
`generation.prompt`, `provider`, `model` | demande de génération à exécuter | — |

**Ce sont des données potentiellement personnelles ou confidentielles.** Un
prompt et une réponse peuvent contenir n'importe quoi : le connecteur n'en sait
rien et ne les inspecte pas.

**VÉRIFIÉ — rien d'autre n'est reçu.** Le serveur refuse tout champ non déclaré
(`additionalProperties: false`), refuse les lots JSON-RPC, et refuse tout corps
dépassant **1 Mio**. Aucun champ d'identité d'utilisateur final n'existe dans
le schéma : **le connecteur ne demande ni ne reçoit d'identifiant de la
personne qui utilise ChatGPT**.

**VÉRIFIÉ — en-têtes.** `Authorization: Bearer` (credential partagé),
`Mcp-Session-Id` (identifiant de routage opaque, voir §5), `Accept`,
`Content-Type`, `Host`, `Origin`. L'adresse IP du client est vue par Caddy au
niveau TCP, **et n'est journalisée nulle part** (§6).

---

## 3. Ce qui est envoyé à l'API NeoMundi

**VÉRIFIÉ** — `runtime/adapter.mjs`, construction de la requête amont.

**Le corps transmis est l'objet `execution` du client, verbatim.** Il n'est ni
filtré, ni tronqué, ni anonymisé, ni réécrit. Prompt, réponse, `rag_context` et
`documents` **quittent la machine** vers `https://api.neomundi.io/v1/govern`.

C'est **inhérent au fait de mesurer** : on ne mesure pas la cohérence d'une
réponse sans la lire. Cela doit être dit au client dans ces termes, et non
enfoui.

| | |
|---|---|
Destination | `https://api.neomundi.io` — défaut, **non surchargé** sur la production (`NEOMUNDI_API_BASE_URL` absent de l'environnement) |
Route | `/v1/govern` (REST) ou `/v1/govern/stream` (génération) |
Authentification | en-tête **`X-API-Key`** — la clé **unique** de l'association |
TLS | obligatoire ; le HTTP en clair n'est accepté **que** pour un hôte loopback |

**VÉRIFIÉ — sur le chemin génération uniquement**, le connecteur ajoute
`provider_api_key` au corps : **la clé fournisseur est transmise à l'API
NeoMundi**. Ce n'est pas une donnée personnelle, mais c'est un secret qui
traverse un tiers, et cela doit être assumé explicitement.

**VÉRIFIÉ — ce qui n'est PAS transmis** : aucune adresse IP du client, aucun
en-tête du client, aucun identifiant de session MCP, aucun `User-Agent`
personnalisé. Le connecteur n'ajoute **aucune** donnée de traçage.

---

## 4. Ce qui est enregistré — et pendant combien de temps

C'est la question centrale, et la réponse est inhabituellement nette.

### 4.1 Par le connecteur : rien

**VÉRIFIÉ par recherche exhaustive dans `runtime/`** :

- **aucune écriture de fichier.** Zéro `writeFile`, `appendFile`,
  `createWriteStream`. Les seules lectures sont ses propres schémas ;
- **six écritures de journal au total**, toutes sur `stdout`/`stderr`, toutes
  des **chaînes fixes** : démarrage, avertissements de configuration, échec de
  démarrage. Aucune n'interpole un prompt, un en-tête, un corps, un argument
  ni un résultat ;
- le gestionnaire d'erreur du transport ne journalise **jamais** l'exception :
  le commentaire du code le dit, et la relecture le confirme ;
- **aucune base de données, aucun cache, aucun état persistant.** Les sessions
  MCP vivent en mémoire et expirent après 30 minutes sans requête.

**VÉRIFIÉ en production — le journal du conteneur contient exactement deux
lignes**, les deux de démarrage, 432 octets au total. Aucune requête n'y
figure.

### 4.2 Par Caddy : aucun journal d'accès

**VÉRIFIÉ.** Le `Caddyfile` ne contient **aucune directive `log`**, et
`/var/log/caddy` est **vide**. Sur sept jours, Caddy n'a écrit que **14 lignes**
dans journald, toutes relatives au nettoyage du stockage TLS.

**Conséquence : aucune adresse IP de client n'est enregistrée, nulle part.**
C'est vérifié, pas supposé — et c'est une propriété qu'il faut *décider de
conserver*, car activer un journal d'accès Caddy est une ligne de
configuration.

### 4.3 Preuve négative, sur une mesure réelle

La mesure réelle du 2026-11-01 portait un prompt connu et un `request_id`
connu. Après coup :

| Recherche | Résultat |
|---|---|
le prompt, dans journald | **0 occurrence** |
le prompt, dans le journal du conteneur | **0 occurrence** |
le `request_id`, dans journald | **0 occurrence** |

> **Honnêteté sur une fausse piste.** Une recherche naïve du mot du prompt
> trouve deux occurrences dans `/var/log/auth.log`. Ce sont **les lignes de
> commande de cet audit**, journalisées par `sudo` — pas le service qui
> journaliserait un prompt. Vérifié en lisant les entrées : elles commencent
> par `COMMAND=/usr/bin/grep`.

### 4.4 Durées de conservation réellement configurées

| Élément | Conservation configurée |
|---|---|
Prompts, réponses, documents | **aucune** — jamais écrits |
Résultats de mesure | **aucune** — relayés au client, jamais stockés |
Journal du conteneur | pilote `json-file`, **sans rotation configurée** — ne contient que le démarrage, donc n'enfle pas |
journald | **294 Mo**, **aucune limite d'âge configurée** — plafond par défaut à 10 % de `/var` |
Sessions MCP | en mémoire, expiration **30 minutes** sans requête |

**DÉCISION — journald n'a aucune politique d'âge.** Il ne contient aujourd'hui
aucune donnée de mesure, donc le risque est faible ; mais « pas de politique »
n'est pas « politique de zéro jour », et une CGU ne peut pas promettre une
durée qui n'est configurée nulle part.

### 4.5 Un défaut introduit par cet audit, et corrigé

**VÉRIFIÉ.** La vérification de mise en service avait laissé `/tmp/nm-verif/`
sur la machine, contenant `measure.json` (47 Ko, **prompt et réponse réels**)
et `payload.json`, en lecture pour tous les utilisateurs locaux.
**Supprimés au cours de cet audit**, et l'absence a été revérifiée.

C'est exactement le mécanisme par lequel une architecture « sans stockage »
accumule des données : non par le service, mais par l'exploitation. À inscrire
dans toute procédure d'intervention.

---

## 5. Identifiants, jetons et clés

| Élément | Statut |
|---|---|
`Mcp-Session-Id` | **VÉRIFIÉ** — `randomUUID`, **identifiant de routage opaque, jamais un credential** : chaque requête exige en plus le Bearer. En mémoire, expire en 30 min |
`request_id` amont | **VÉRIFIÉ** — UUID **généré par l'API**, relayé au client. Non persisté par le connecteur |
`trace_id` | **VÉRIFIÉ** — dérivé du `request_id` par l'amont |
`system_id` | **VÉRIFIÉ** — vaut `controltower-api` : l'amont s'identifie comme ControlTower |
Credential d'entrée | **VÉRIFIÉ** — un seul, partagé, comparé en **temps constant**. Jamais journalisé |
Clé API NeoMundi | **VÉRIFIÉ** — une seule, lue dans l'environnement du processus. **Aucun fichier `.env` n'est lu par le serveur** |
Clé fournisseur | **VÉRIFIÉ** — une seule par processus ; transmise à l'amont sur le chemin génération (§3) |
Adresse IP | **VÉRIFIÉ** — vue par Caddy, **jamais enregistrée** |

**VÉRIFIÉ — garde anti-divulgation.** Si une charge amont contient un
credential configuré, le connecteur **retient le résultat entier** plutôt que
de le réécrire (`CREDENTIAL_DISCLOSURE`). Il préfère ne rien rendre plutôt que
rendre une mesure modifiée.

**VÉRIFIÉ — les corps d'erreur amont ne sont jamais exposés**, précisément
parce qu'un message d'erreur peut recopier le contenu soumis.

---

## 6. Sous-traitants et transmissions externes

| Tiers | Rôle | Statut |
|---|---|---|
**Infomaniak** | hébergeur du VPS (`ov-227532.infomaniak.ch`) | **VÉRIFIÉ** |
**Let's Encrypt** | autorité de certification, via Caddy | **VÉRIFIÉ** — le certificat le nomme |
**`api.neomundi.io`** | destinataire de **tout** le contenu mesuré | **VÉRIFIÉ** côté connecteur |
Hébergeur de `api.neomundi.io` | — | **NON VÉRIFIÉ** depuis ce dépôt |
Évaluateurs | `nomic-embed-text` (embeddings), `llama-guard3:1b` (modération), juge de factualité | **VÉRIFIÉ** par `evaluators` d'une mesure réelle — mais **où** ils s'exécutent et **chez qui** est **NON VÉRIFIÉ** d'ici |
Fournisseur de génération | appelé **via l'amont**, pas par le connecteur | **VÉRIFIÉ** |
ChatGPT / OpenAI | voit la requête et le résultat **côté client**, hors de notre périmètre | **VÉRIFIÉ** par construction |

**DÉCISION — la chaîne de sous-traitance réelle n'est pas documentée.** Le
connecteur sait vers **qui** il émet ; il ne sait pas où ce destinataire
exécute ses évaluateurs ni qui les héberge. Une CGU ou une politique de
confidentialité qui énumère des sous-traitants doit s'appuyer sur un relevé
côté API, **pas sur cet audit**.

---

## 7. Suppression

| Mécanisme | État |
|---|---|
Suppression côté connecteur | **sans objet** — rien n'est conservé |
Suppression côté API | **NON VÉRIFIÉ** — aucune route de suppression n'est exposée par l'outil, et l'amont persiste ses observations |
Droit d'effacement d'une personne concernée | **DÉCISION** — techniquement impossible à honorer depuis le connecteur : il ne conserve rien et ne peut rien supprimer en amont |
Réversibilité d'une mesure | **VÉRIFIÉ, négatif** — resoumettre crée une **observation neuve**, jamais une correction |

---

## 8. Synthèse — ce qui est solide, ce qui manque

**Solide, et rare :** aucune écriture disque, aucun journal d'accès, aucune IP
enregistrée, aucun prompt journalisé, pas de `.env` lu, corps d'erreur amont
jamais exposés, et une garde qui retient un résultat entier plutôt que de le
réécrire. **Ces propriétés sont vérifiées, pas déclarées.**

**Ce qui manque, et qui relève d'une décision :**

| # | Point | Nature |
|---|---|---|
**D-A** | Le contenu mesuré **part vers un tiers** (`api.neomundi.io`), ce qui est inhérent — mais doit être **dit** | rédactionnel |
**D-B** | La chaîne de sous-traitance en aval de l'API n'est pas établie | enquête |
**D-C** | journald n'a **aucune politique d'âge** | configuration |
**D-D** | Aucun mécanisme de suppression ni d'exercice des droits n'existe de bout en bout | produit |
**D-E** | Un credential partagé rend **toute attribution impossible** : on ne peut dire *quelle* personne a soumis *quelle* donnée | architecture |
**D-F** | Les artefacts d'exploitation doivent être effacés après intervention (§4.5) | procédure |

# START HERE — connecteur MCP NeoMundi

**Point d'entrée de reprise de ce dépôt. À lire en premier.**
**Relevé du 2026-10-20.** Tout état Git ci-dessous est un **relevé daté** : le
revérifier par commande avant toute modification.

---

## 1. Où en est le dépôt

| | |
|---|---|
**Branche de travail** | `chantier/mcp-consolidation-20261020`. **Son dernier commit n'est pas recopié ici** : un document ne peut pas porter l'empreinte du commit qui le contient, et chaque rectification creuserait l'écart qu'elle prétend combler. La commande du §7 le lit |
**Base** | `main` = `ad173e0` |
**PR** | **[#2](https://github.com/neomundi-io/neomundi-measurement-mcp/pull/2) — OUVERTE, NON FUSIONNÉE.** Aucun conflit, fusion automatique possible |
**CI** | **aucune.** Zéro workflow, zéro run, zéro check-run, zéro statut |
**Tests** | **211 passés, 0 sauté** (`npm test` à la racine, enregistrements présents). Sans eux : 151 tests, 142 passés, 9 sautés |
**Statut du connecteur** | `LIVE_TRANSPORT_VALIDATED_CONTRACT_PENDING`. **`LIVE_API_VALIDATED` non accordé** |
**Épinglage** | backend `68d6057`, mesure `3.3.0`. Le déploiement déclare **`3.3.1`** — écart borné (§6.1 de `KNOWN_LIMITATIONS.md`), épinglage **volontairement conservé** |
**Conteneur** | image locale. **Publiée sur aucun registre** |
**ML-009** | **clos le 2026-10-20** — §3 |

> ⚠ **Ce dépôt est public.** Vérifié le 2026-10-20 par l'API GitHub anonyme :
> `private: false`, `visibility: public`. Sa documentation le décrit pourtant
> comme privé — le titre de `MVP_PRIVATE.md`, `serverInfo.name` et le nom de
> paquet portent tous « private ». **Rien n'a fuité** : `check-publication.mjs`
> passe, et les 53 fichiers publiés ne contiennent ni sonde d'appel réel, ni
> enregistrement de réponse, ni rapport interne, ni `.env`. Mais l'écart entre
> ce que les documents affirment et ce que le dépôt est **demande une décision**.

---

## 2. Ordre de lecture

1. **ce fichier** ;
2. [`KNOWN_LIMITATIONS.md`](KNOWN_LIMITATIONS.md) — registre public `BL-*` / `ML-*`, le compte de tests par portée (§1) et **3.3.0 contre 3.3.1** (§6.1) ;
3. [`runtime/README.md`](runtime/README.md) — installation, contrat, `divergence_scope`, exécution en conteneur ;
4. [`CHATGPT_CONNECTOR_ROADMAP.md`](CHATGPT_CONNECTOR_ROADMAP.md) — trajectoire vers un connecteur appelable depuis ChatGPT. **Étude, pas un plan de référence.**

Le rapport de consolidation du 2026-10-20 **n'est pas publié ici** :
`check-publication.mjs` refuse tout chemin `RAPPORT_*`, et il porte les
priorités de correction et les blocages demandant une autorisation de
facturation. Il vit dans la copie de travail, avec une copie sauvegardée aux
côtés des autres fichiers hors Git du connecteur. Son existence est consignée
ici pour qu'un lecteur sache que ces éléments sont **suivis, et non omis**.

---

## 3. ML-009 — un vrai hôte MCP a été connecté

**Clos le 2026-10-20.** C'était la dernière affirmation d'intégration non
testée de ce dépôt.

**Hôte :** Claude Code 2.1.247, client MCP tiers, transport HTTP.
**Amont :** un stand-in **local** servant une réponse réellement enregistrée
(campagne SDK Python du 2026-10-17). **Aucun appel à un déploiement NeoMundi,
aucun quota consommé.**

| Vérification | Résultat observé |
|---|---|
Démarrage et connexion | `claude mcp list` → **`✔ Connected`** ; `claude mcp get` → `Status: ✔ Connected`, type `http` |
Handshake MCP | `initialize` accepté, protocole **`2025-06-18`**, session attribuée, `notifications/initialized` → **202** |
Découverte des outils | **un** outil exposé : `measure_execution` |
Invocation, cas nominal | `adapter_error=null`, `request_id=13a7e4d7-…` et `g_score=0.56199` **identiques à l'enregistrement** — la charge serveur traverse verbatim |
Invocation, `divergence_scope` | amont déclarant `3.3.1` → `agreement=divergent`, `rest: identical`, `sse: decision_may_differ`, et `g_score` **inchangé** |
Erreur, arguments invalides | `INVALID_ARGUMENTS`, `response: null`, `not_validated` — et **aucune ligne nouvelle côté amont** : aucun appel n'a été émis |
Erreur, amont injoignable | `NETWORK_ERROR`, `response: null`, `reading_aid: null`, **aucune mesure fabriquée**, et **aucune** classification de statut amont — un échec non-HTTP n'en porte pas |
Authentification | 401 sans credential ; le stand-in confirme que `X-API-Key` **est présenté** en amont |
Fuite de secrets | **0 occurrence** des deux sentinelles dans l'enveloppe complète de 32 916 octets, sur deux appels |

**Limites de ce test, à ne pas surinterpréter :**

- l'amont était un **stand-in local**, pas NeoMundi. Il valide le chemin du
  connecteur et le transport MCP, **pas** la conformité de contrat d'un
  déploiement. `LIVE_API_VALIDATED` reste non accordé ;
- **un seul hôte** a été vérifié. Les noms de champs de configuration varient
  d'un hôte à l'autre ;
- le cas `3.3.1` a été produit par une **variante synthétique** d'un
  enregistrement — un seul champ modifié, la version déclarée. Ce n'est pas un
  enregistrement ;
- le **chemin SSE n'a pas été exercé** par cette passe : il exige une clé
  fournisseur et facture une génération.

**Reproduire :** démarrer un stand-in loopback servant un enregistrement, lancer
`node runtime/server.mjs` avec `NEOMUNDI_API_BASE_URL` pointé dessus, puis
`claude mcp add --scope local --transport http <nom> http://127.0.0.1:8787/mcp --header "Authorization: Bearer <clé>"`.
Retirer l'enregistrement avec `claude mcp remove <nom> -s local` après usage.

---

## 4. Ce qui fonctionne, et ce qui n'est pas acquis

| Brique | État |
|---|---|
Chemin REST, contrat d'entrée et de sortie | **vérifié** — bornes identiques au modèle de l'API, 11 réponses réelles rejouées |
Transport MCP, Streamable HTTP | **vérifié**, et maintenant depuis un hôte réel |
Classification des statuts amont, aucune relance automatique | **vérifié** par tests |
Hygiène des secrets | **vérifiée** — aucun `.env` lu, rien journalisé, charge retenue entière si un credential y apparaît |
Image conteneur | **vérifiée** — démarrage, refus, 401, handshake, erreur amont, arrêt propre |
Chemin SSE | **preuve strictement plus faible** que REST — ML-002, ML-003 |
Conformité de contrat sur un déploiement | **non établie** |
CI | **inexistante** |

---

## 5. Prochaine tâche — une seule

**Écrire la couche de réduction**, celle qui rend l'enveloppe lisible par une
personne, et la relire **comme une surface de mesure, pas comme du texte**.

Sans coût, sans réseau, sans décision : les onze enregistrements couvrent les
trois familles de mesure, et `reading_aid` nomme déjà les champs, les échelles
inversées, les agrégats retenus et la cause de chaque signal non mesuré — la
réduction se pilote donc sur lui plutôt que champ par champ.

⚠ **C'est l'endroit où l'honnêteté se perd.** `reading_aid` n'interprète rien,
par conception (ML-005). Un résumé qui transforme `FLAG` en « cette réponse
paraît risquée » invente un verdict que NeoMundi ne publie pas. Ce qui doit
survivre à la réduction, systématiquement : la décision **et** son
`decision_basis`, quels signaux ont été mesurés et lesquels non avec leur
cause, et le fait qu'une mesure n'est **ni** une permission, **ni** un verdict
de conformité, **ni** une preuve de vérité ou d'absence d'hallucination.

Ensuite seulement, et chacune demandant une décision : la CI (§6), un appel réel
autorisé, puis l'hébergement.

---

## 6. Blocages

| # | Blocage | Qui le lève |
|---|---|---|
**B-1** | **Aucune CI.** Un workflow exécutant `npm test` est la correction évidente ; elle n'est pas dans la PR #2 | une session |
**B-2** | **PR #2 non fusionnée.** Aucun contrôle requis vert n'existe pour l'adosser : la seule vérification est la suite locale | **Sébastien** |
**B-3** | **Conformité de contrat non établie**, `LIVE_API_VALIDATED` non accordé. Demande un appel réel — donc **facturé** | **autorisation de Sébastien** |
**B-4** | **Palier et quota de la clé inconnus.** `documents[]` exige **TIER_02+** | registre des clés |
**B-5** | **Épinglage `3.3.0` face à `3.3.1`** — borné et documenté, décision ouverte | **Sébastien** |
**B-6** | **Base Docker épinglée par tag, pas par digest.** La ligne est préparée, non renseignée | une session |
**B-7** | **Dépôt public, documentation « privé »** — voir l'encadré du §1 | **Sébastien** |
**B-8** | **Pas de couche de réduction** — §5 | une session, sans coût |

---

## 7. Revérifier avant toute modification

```bash
git -C . remote -v && git branch --show-current && git log -1 --oneline && git status --porcelain
npm test                      # 211 passés, 0 sauté, enregistrements présents
node check-publication.mjs    # ce qui sort du dépôt
```

Les empreintes de commit citées en §1 datent de leur écriture. **La commande
fait foi**, pas ce document.

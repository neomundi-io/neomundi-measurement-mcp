# Écarts — connecteur MCP face à un plugin ChatGPT / Codex

**Relevé du 2026-11-01.** Base vérifiée : `origin/main` à `0e06d5c`,
version `0.3.0-rc.1`.

Deux sources, jamais mélangées :

- **ce dépôt** — tout ce qui est marqué *mesuré* ci-dessous a été observé par
  commande au cours de cette passe, pas lu dans une fiche ;
- **la plateforme** — les exigences citées proviennent de
  `developers.openai.com/plugins` (`quickstart`, `build/mcp-server`,
  `build/plugins`, `deploy/app-review`, `deploy/submission`), **consultées le
  2026-11-01**. Elles changent sans préavis : les revérifier au moment de la
  décision, et ne jamais les déduire de ce document.

---

## 0. Avertissement de méthode — l'état réel n'était pas l'état documenté

La copie de travail d'où part cette passe était **en retard de sept commits**
sur `origin/main`. Sa fiche de reprise annonçait `0.2.0`, « qualifier contre
l'environnement hébergé » comme prochaine étape, et `LIVE_API_VALIDATED` non
accordé.

`origin/main` dit autre chose, et c'est lui qui fait foi :

| | Copie locale (`f6fa7fe`) | `origin/main` (`0e06d5c`) |
|---|---|---|
Version | `0.2.0` | **`0.3.0-rc.1`** |
Appel réel | « aucun nouvel appel API hébergé » | **un diagnostic REST réel et une génération SSE réelle bornée, le 26 octobre**, les deux mesures complètes |
Contrats de réponse | absents | **schémas REST/SSE versionnés embarqués et validés** (`runtime/schemas/contracts/`) |

La branche locale était **déjà fusionnée** dans `main`. Aucun travail n'a été
perdu, mais toute conclusion tirée de cette copie sans `git fetch` aurait été
fausse. C'est le premier écart à corriger, et il n'est pas technique :
**la fiche de reprise doit être relue depuis `origin/main`, jamais depuis une
copie.**

---

## 1. Mesures de cette passe

Commandes exécutées sur `0e06d5c`, puis sur la branche de travail :

| Vérification | Résultat observé |
|---|---|
Suite complète, captures présentes | **270 passés, 0 échec, 0 sauté** sur `main` ; **279 passés, 0 échec, 0 sauté** après les ajouts de cette passe |
Garde de publication | `PASS`, 83 fichiers publiables, aucun secret, aucune trace machine |
Surface d'outils réellement exposée | **un** outil, `measure_execution`, lu par `tools/list` sur une session MCP réelle |
`inputSchema` / `outputSchema` | **les deux présents** dans la réponse `tools/list` |
`annotations` | présentes : `readOnlyHint:false`, `destructiveHint:false`, `idempotentHint:false`, `openWorldHint:true` |
Transport | `POST /mcp` accepté, protocole négocié **`2025-06-18`**, session attribuée |
`GET /mcp` | **405** `method_not_allowed` — SSE MCP historique non implémenté |
**`Host` d'un domaine hébergé** | **403 `invalid_host`** sur `main`, *avant* toute lecture de credential |
Sans credential | **401** `unauthorized`, en-tête `WWW-Authenticate` présent |

Le 403 ci-dessus est le point dur, et il est mesuré et non déduit : la liste
d'hôtes autorisés était dérivée du port d'écoute, donc `127.0.0.1:<port>` et
`localhost:<port>` et rien d'autre. Un proxy inverse transmet
`Host: mcp.example.org`, que le serveur refusait. **Aucun assistant distant ne
pouvait atteindre ce connecteur, quelle que soit l'infrastructure autour.**

---

## 2. Matrice

### 2.1 Protocole et transport

| Exigence plateforme | État | Détail |
|---|---|---|
Point d'entrée Streamable HTTP, typiquement `/mcp` | **EXISTANT** | `POST /mcp`, sous-ensemble Streamable HTTP écrit à la main, sans SDK |
Protocole MCP négocié | **EXISTANT** | `2025-06-18` et `2025-03-26` |
`structuredContent` + `content` | **EXISTANT** | les deux émis par `tools/call` |
`outputSchema` quand la sortie est structurée | **EXISTANT** | présent et servi |
Annotations de sûreté exactes | **EXISTANT** | et **exactes** : `readOnlyHint:false` est le bon choix — un appel débite un quota et écrit un évènement d'usage. Une annotation inexacte est un motif de rejet déclaré |
`Host` d'un domaine hébergé accepté | **CORRIGÉ cette passe** | opt-in explicite `NEOMUNDI_MCP_ALLOWED_HOSTS`, défaut inchangé |
Titre lisible par une personne | **CORRIGÉ cette passe** | `title` ajouté à l'outil ; absent auparavant |
HTTPS, domaine public joignable | **MANQUANT** | aucun déploiement, aucun domaine, aucune terminaison TLS. Le serveur sert du HTTP en clair et attend un proxy devant lui |
SSE MCP historique (`GET /mcp`) | **MANQUANT, assumé** | 405. Non exigé par Streamable HTTP ; à revérifier si un hôte le réclame |

### 2.2 Authentification et séparation des utilisateurs

| Exigence plateforme | État | Détail |
|---|---|---|
Schéma d'authentification déclaré dans `mcp.json` (`extensions["com.openai"].auth`) | **MANQUANT** | `mcp.json` ne déclare aucun bloc `auth`. La plateforme documente `none`, `oauth`, `api_key`, `mixed` |
Authentification inbound | **EXISTANT, insuffisant pour plusieurs utilisateurs** | **un** credential statique partagé, `Authorization: Bearer`, comparaison à temps constant, plus liste d'hôtes et contrôle d'`Origin` |
OAuth 2.1 | **MANQUANT** | aucune émission de jeton, aucune révocation, aucun périmètre |
Séparation des utilisateurs | **MANQUANT** | le serveur détient **une** clé API NeoMundi pour tous ceux qui l'atteignent. Tout appel est facturé au même compte, et le palier de ce compte décide de ce que chacun obtient |
Attribution d'usage | **MANQUANT** | `POST /v1/govern` n'est pas idempotent, débite un quota et écrit un évènement d'usage ; le connecteur ne relance jamais, par conception. Il ne peut donc ni expliquer une facture, ni répondre « mon appel est-il passé ? » après un 5xx |

C'est le plus gros bloc non construit, et il est antérieur à toute question de
plateforme : **un credential partagé ne survit pas au contact de plusieurs
utilisateurs.**

### 2.3 Manifeste et métadonnées

Limites de la plateforme relevées le 2026-11-01, confrontées au fichier :

| Champ | Limite | Mesuré avant | État |
|---|---|---|---|
`name` (kebab-case) | 64 | 20, `neomundi-measurement` | **EXISTANT** |
`displayName` | 30 | 20 | **EXISTANT** |
`shortDescription` | **30** | **43 — dépassait** | **CORRIGÉ cette passe** → 26 |
`longDescription` | 4000 | 168 | **EXISTANT** |
`developerName` | 80 | 8 | **EXISTANT** |
`websiteURL` | requis | absent | **CORRIGÉ cette passe** — reprise de `author.url`, déjà déclarée dans le fichier |
`privacyPolicyURL` | requis | absent | **MANQUANT — arbitrage** |
`termsOfServiceURL` | requis | absent | **MANQUANT — arbitrage** |
`capabilities` | attendu | absent | **MANQUANT** |
Icône carrée ≥ 48×48 | requise | absente | **MANQUANT** |
Capture d'écran | recommandée | absente | **MANQUANT** |

Les deux URL de politique n'ont **pas** été inventées. Écrire une URL qui ne
résout pas est un motif de rejet déclaré, et affirmer une politique qui
n'existe pas est pire que son absence. Elles demandent une décision, pas une
ligne de code.

**NON VÉRIFIÉ — imbrication de `extensions.com.openai`.** Le dépôt place les
champs de présentation sous une clé `interface`. La documentation consultée les
décrit directement sous `extensions.com.openai`. Les deux formes ne peuvent pas
être vraies à la fois ; laquelle la plateforme lit n'a **pas** été établie, et
aucune n'a été testée contre un validateur. À trancher sur le schéma officiel
avant toute soumission, et non par analogie.

### 2.4 Robustesse, erreurs, limites

| Exigence | État | Détail |
|---|---|---|
Délais appliqués | **EXISTANT** | total 120 s, inactivité 30 s, `requestTimeout` 15 s, `headersTimeout` 10 s |
Bornes de taille | **EXISTANT** | requête 1 MiB, réponse 2 MiB, 10 000 évènements |
Limite de concurrence | **EXISTANT, local seulement** | 8 appels simultanés, 32 sessions ; renvoie `429`. Ce n'est **pas** une limitation de débit par utilisateur |
Limitation de débit par utilisateur | **MANQUANT** | sans identité, il n'y a rien sur quoi la poser |
Erreurs non transformées en mesure | **EXISTANT, et c'est l'invariant central** | une erreur HTTP est classée comme transport ; aucune mesure n'est fabriquée, aucune relance automatique |
Journaux et métriques d'échec | **MANQUANT, délibérément** | rien n'est journalisé — ni en-tête, ni corps, ni argument. La plateforme demande des journaux d'échec ; chaque champ ajouté est une décision de confidentialité |
Pas de secret ni de PII en retour d'outil | **EXISTANT** | une charge contenant un credential configuré est **retenue entière** plutôt que réécrite (`CREDENTIAL_DISCLOSURE`) ; un corps d'erreur amont n'est jamais exposé |

### 2.5 Revue et publication

| Exigence | État |
|---|---|
Serveur MCP sur un domaine public, **pas** un point d'entrée local ou de test | **MANQUANT** — c'est `P-1`, et la revue le refuse explicitement |
Défi de vérification de domaine | **MANQUANT** |
Vérification d'identité de l'organisation sur le tableau de bord OpenAI | **NON VÉRIFIÉ** — état inconnu depuis ce dépôt |
Cinq cas de test positifs, trois négatifs | **MANQUANT** — aucun n'est rédigé |
Vidéo de démonstration et URL accessible au relecteur | **MANQUANT** |
Compte de test sans MFA | **MANQUANT**, et dépend du modèle d'authentification (§2.2) |
Politique de confidentialité couvrant les données retournées | **MANQUANT** — et §4 ci-dessous dit pourquoi ce n'est pas une formalité |
Notes de version | **MANQUANT** pour une soumission ; l'historique est tenu par ailleurs |
Tests avec MCP Inspector | **NON VÉRIFIÉ** — jamais exécuté. Un hôte MCP réel a été connecté, ce qui n'est pas la même preuve |

---

## 3. Ce que cette passe a changé, et ce qu'elle n'a pas touché

Changé — trois corrections, toutes côté client, aucune sur l'API :

1. **Liste d'hôtes extensible** (`NEOMUNDI_MCP_ALLOWED_HOSTS`). Défaut vide :
   une installation qui ne règle rien se comporte **exactement** comme avant.
   Un hôte n'est accepté que parce qu'il a été **nommé** — jamais parce que
   l'écoute a été élargie. Cette séparation est l'invariant anti-rebinding du
   dépôt, et elle est désormais affirmée deux fois : par son test d'origine et
   par un test de cette passe.
2. **`title` sur l'outil**, avec une garde qui refuse tout vocabulaire de
   verdict dans ce champ (`safe`, `risk`, `compliant`, `validated`, `score`…).
   Un hôte affiche ce titre à une personne : il nomme l'action, jamais un
   résultat.
3. **`shortDescription` ramenée sous la limite**, et `websiteURL` renseignée
   depuis une valeur déjà présente dans le manifeste.

Non touché, volontairement : les schémas de mesure, la couche de présentation,
`reading_aid`, la classification des statuts amont, la validation de contrat,
et l'API NeoMundi. **Aucune sémantique de mesure n'a bougé.** Les 270 tests de
`main` passent toujours, avec les neuf ajoutés.

---

## 4. Ce que la plateforme exige et qui n'est pas qu'un formulaire

Deux points que la conformité documentaire ne résout pas :

**Le contenu quitte la machine de l'utilisateur.** Un prompt, une réponse et
les documents fournis voyagent vers l'API NeoMundi — c'est inhérent au fait de
les mesurer. Aujourd'hui le connecteur tourne sur la machine de l'utilisateur,
ce qui rend la question théorique. **Hébergé, il voit ce contenu en transit**,
et cela devient un rôle de traitement avec les obligations qui suivent.
*Qualification juridique requise — ce n'est pas une question technique.*

**La politique de confidentialité doit couvrir ce qui est réellement
retourné.** Un retour de données non déclarées dans la politique est un motif
de rejet explicite. La liste de ce que l'enveloppe expose est connue et
testée ; elle n'a jamais été confrontée à une politique, parce qu'il n'y en a
pas.

---

## 5. Ce qui bloque, et qui le lève

| # | Blocage | Qui le lève |
|---|---|---|
**G-1** | Aucun point d'entrée HTTPS public. Le code l'accepte désormais ; l'infrastructure n'existe pas | décision d'infrastructure — **Sébastien**, et un déploiement n'est pas autorisé par cette passe |
**G-2** | Un seul credential partagé, aucune identité par utilisateur | **la plus grosse pièce non construite** ; demande un arbitrage avant tout code |
**G-3** | `privacyPolicyURL` et `termsOfServiceURL` inexistantes | **Sébastien** |
**G-4** | Vérification d'identité de l'organisation : état inconnu | **Sébastien**, hors dépôt |
**G-5** | Imbrication de `extensions.com.openai` non établie | une session, sur le schéma officiel |
**G-6** | Icône, captures, 5+3 cas de test, vidéo | une session, une fois G-1 et G-2 tranchés |
**G-7** | Qualification du nouveau contrat `0.3.0-rc.1` en production | porte de release ; le backend doit publier métadonnées et schémas |
**G-8** | MCP Inspector jamais exécuté | une session, sans coût |

Rien dans cette liste n'autorise un déploiement, une publication ou une
dépense. `AGENTS.md` le dit : une PR, une CI verte ou une fusion n'autorise pas
la production.

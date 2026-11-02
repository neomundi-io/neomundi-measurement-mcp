# État de préparation à la publication — connecteur MCP NeoMundi

**Établi le 1er novembre 2026**, après vérification des exigences officielles
en vigueur ce jour-là. Les sources sont citées et horodatées : ce document ne
reprend aucune instruction ancienne.

> ## Mise à jour du 1er novembre 2026 — `B-1` est traité dans le code
>
> **OAuth 2.1 est implémenté et testé** : découverte, inscription dynamique,
> code d'autorisation avec PKCE S256, jetons, rotation, révocation, identité
> individuelle et portées — sans dépendance ajoutée, sans base de données, et
> sans toucher à la mesure. **27 nouveaux cas de test**, et un essai de bout en
> bout sur une instance réelle.
>
> **Il n'est pas déployé.** Le blocage n'est donc plus technique : c'est une
> autorisation. Détail : [`OAUTH_IMPLEMENTATION_REPORT.md`](OAUTH_IMPLEMENTATION_REPORT.md).
> Procédure : [`CHATGPT_CONNECTION_GUIDE.md`](CHATGPT_CONNECTION_GUIDE.md).
>
> **Une précondition est confirmée sans rien avoir changé en production** : le
> proxy transmet déjà toutes les routes au serveur Node, donc **aucune
> modification de Caddy n'est nécessaire**.
>
> Le constat ci-dessous reste vrai de l'**état servi aujourd'hui**.

> ## Le fait qui gouverne tout le reste
>
> **Le manifeste n'était pas le blocage. L'authentification du serveur l'est.**
>
> ChatGPT ne propose que trois méthodes de connexion pour un serveur MCP —
> **OAuth**, **aucune authentification**, et **OAuth ou aucune**. Le serveur
> `mcp.neomundi.org` exige un jeton `Bearer` fixe, ce qui est de
> l'authentification **par clé d'API**. La plateforme écrit, dans sa page de
> soumission : « *le portail ne fournit pas de flux de connexion par clé
> d'API ni de champ de saisie de jeton* », et ajoute que **déposer une telle
> déclaration seule ne permet pas d'achever la mise en place du MCP**.
>
> Les deux contournements évidents sont **nommément interdits** : mettre le
> jeton dans `headers` (« *la soumission publique rejette des en-têtes de
> serveur non vides* ») et déclarer un serveur protégé comme `type: "none"`.
>
> **Conséquence : en l'état, ni la soumission publique ni même un simple
> branchement d'essai dans ChatGPT ne peuvent aboutir.** Ce n'est pas un
> défaut de ce dépôt ; c'est une propriété du service hébergé.

---

## 1. Ce qui est terminé

| Point | État | Preuve |
|---|---|---|
| **`P0-1` — où va l'authentification** | **RÉSOLU**, et la tâche était mal posée | `tests/manifest-schema.test.mjs`, 3 cas |
| **`P0-2` — imbrication `extensions.com.openai`** | **RÉSOLU** — le dépôt avait raison | idem, 1 cas |
| Manifeste valide contre le schéma **officiel téléchargé** | **VALIDÉ** | `node scripts/validate-manifests.mjs` → 2 × OK |
| Métadonnées de référencement aux limites de la plateforme | **VALIDÉ** | `tests/plugin-package.test.mjs` |
| Huit cas de revue rédigés au format exigé | **VALIDÉ** dans le paquet | 5 positifs + 3 négatifs, `plugin.json` |
| Carte de mesure : `_meta` à jour | **VALIDÉ** | `runtime/tests/card-view-model.test.mjs` |
| **Carte vue et capturée** | **FAIT**, charge synthétique | voir §5 |
| Paquet de distribution reconstruit | **VALIDÉ**, reproductible | §5 |
| **OAuth 2.1 : serveur d'autorisation et de ressource** | **ÉCRIT ET TESTÉ**, non déployé | `runtime/tests/oauth.test.mjs`, 27 cas |
| **Identité individuelle, portées, révocation** | **ÉCRIT ET TESTÉ** | idem, et `scripts/participant-credential.mjs` |
| **Compatibilité Codex et clé statique** | **PRÉSERVÉE** | test dédié ; `stdio.mjs` n'importe pas `oauth.mjs` |
| Suite complète | **339 cas, 339 réussis** | `npm test` |
| Séparation public / interne | **VALIDÉ** | `node check-publication.mjs` → 125 fichiers |

### 1.1 `P0-1` — la tâche demandait quelque chose d'impossible

La feuille de route demandait de « déclarer le bloc `auth` dans `mcp.json` ».
Le schéma officiel, téléchargé le 2026-11-01 et archivé sous
`schemas/agent-plugins/` avec son SHA-256, **ferme** le niveau supérieur de
`mcp.json` à `$schema` et `mcpServers`. La spécification le dit en toutes
lettres :

> *Agent Plugins 1.0.0 ne définit aucun champ portable d'OAuth ou de référence
> de secret. L'authentification reste gérée par le client.*

Ajouter ce bloc aurait rendu le document **invalide** — et « *un `mcp.json`
invalide au niveau supérieur désactive MCP pour le plugin* ». La tâche aurait
donc cassé un artefact qui fonctionne.

**Un conflit réel a été mis au jour au passage.** La plateforme documente
l'authentification à `mcpServers.<nom>.extensions["com.openai"].auth`. La
spécification portable ferme chaque variante de serveur : « *un champ inconnu
[…] rend cette entrée de serveur invalide* ». **Les deux sources sont
normatives et se contredisent.** Le bloc exact est figé dans un test, pour ne
pas être redécouvert — et il dit désormais `oauth`, pas `api_key`, puisque le
serveur parle OAuth. Il n'est pas encore dans `mcp.json` parce que `mcp.json`
nommerait alors un point d'entrée qui ne répond pas encore en OAuth : c'est la
première étape **après** le déploiement.

### 1.2 `P0-2` — le dépôt avait raison, la lecture de la documentation avait tort

Les champs de référencement sont bien **imbriqués sous `interface`**. L'exemple
de paquet publié par la plateforme les imbrique. La lecture « à plat » était
fausse.

Trois défauts réels sont tombés en vérifiant :

1. **`icons` au niveau supérieur était une violation de schéma.** Le manifeste
   portable est **clos** et `icons` n'y figure pas. Remplacé par `logo` et
   `composerIcon`, **à l'intérieur de `interface`**, qui sont les champs
   documentés. `interface.icon` n'existait pas non plus.
2. **`category` valait `"Developer tools"`**, minuscule ; le titre du tableau
   de bord est `"Developer Tools"`.
3. **Le texte de base était en français.** La plateforme attend l'anglais dans
   les champs de base et toute autre langue sous
   `publication.translations`. Le français est désormais la traduction
   `fr-FR` — et les **URL juridiques continuent de pointer vers les pages
   françaises, qui font foi**.

---

## 2. Ce qui bloque, et qui peut le lever

| # | Blocage | Vérifié le 2026-11-01 | Qui le lève |
|---|---|---|---|
| **B-1** | ~~Authentification par clé d'API non connectable~~ → **OAuth 2.1 écrit et testé, PAS DÉPLOYÉ** | 339 cas verts, essai de bout en bout, proxy confirmé sans changement | **Sébastien** : **autoriser le déploiement**, sur un SHA nommé |
| **B-2** | **Vérification de domaine impossible en l'état** | `https://mcp.neomundi.org/.well-known/openai-apps-challenge` → **`401`** | **Sébastien** — mais voir §2.2, c'est facile |
| **B-3** | **Identité d'organisation non vérifiée** | état inconnu depuis ce dépôt | **Sébastien**, tableau de bord |
| **B-4** | **Origine dédiée de la carte non décidée** | `_meta.ui.domain` absent ; exigé pour soumettre un plugin **avec interface** | **Sébastien** : un nom d'hôte |
| **B-5** | **Vidéo de démonstration absente** | `review.demo_recording_url` non renseigné — exigé pour la revue MCP | après B-1 |
| **B-6** | **Compte de démonstration** | la plateforme exige « *un identifiant et un mot de passe pour un compte de démonstration pleinement fonctionnel* » ; notre accès est un jeton partagé | **Sébastien** |

### 2.1 B-1 — l'issue retenue, et ce qu'il en reste

Trois issues existaient. **L'issue A a été prise et construite.**

| Issue | État |
|---|---|
| **A — implémenter OAuth 2.1** sur `mcp.neomundi.org` | **FAIT, testé, non déployé.** La seule en libre-service : elle ne dépend d'aucune relation avec OpenAI |
| **B — demander une dérogation** pour la clé d'API | abandonnée : dépend d'une réponse, délai inconnu |
| **C — soumission « bureau seulement »** | abandonnée : « *limitée aux partenaires agréés* », et l'association n'a pas de représentant OpenAI |

Ce qui reste de `B-1` n'est plus un chantier, c'est **une autorisation de
déploiement et deux secrets à provisionner** — §1 et §2 du guide de connexion.

**Et la soumission publique redevient possible** : elle exigeait un point
d'entrée HTTPS public avec une méthode d'authentification que le portail sait
connecter. Les deux seront vrais une fois déployé.

> **Le tunnel MCP sécurisé n'est plus nécessaire.** Il restait l'issue de
> secours pour un essai sans OAuth ; OAuth existant, l'essai réel passe par le
> chemin qui sera aussi celui de la soumission, ce qui évite de prouver une
> chose et d'en soumettre une autre.

### 2.2 B-2 — un blocage facile, et une solution qui ne touche pas au serveur

Le défi de vérification doit être servi **en texte brut, sans authentification**,
à `https://<hôte>/.well-known/openai-apps-challenge`. Sur l'hôte MCP, ce
chemin répond `401` comme tous les autres : la vérification échouerait.

**Mais la base du défi peut être « une origine HTTPS sur le nom d'hôte MCP ou
un domaine parent éligible ».** Or :

```
https://mcp.neomundi.org/.well-known/openai-apps-challenge  ->  401
https://neomundi.org/.well-known/openai-apps-challenge      ->  404
```

`neomundi.org` est le parent, il est joignable, et il ne demande rien.
**Publier le jeton sur `neomundi.org` évite entièrement d'ouvrir un chemin sur
l'hôte authentifié.** C'est la voie recommandée.

---

## 3. Le plugin fonctionne-t-il réellement dans ChatGPT ?

**Non, et il n'a toujours jamais été branché.** Aucun compte ChatGPT n'a été
utilisé, aucun connecteur n'a été ajouté, aucune mesure n'est revenue d'un
hôte.

Ce qui a changé en deux temps : on sait **pourquoi** (le serveur parlait une
méthode que l'hôte ne propose pas), et **l'obstacle est levé dans le code** —
il ne reste qu'un déploiement à autoriser.

| Vérifié où | Ce que cela prouve | Ce que cela ne prouve pas |
|---|---|---|
| **Claude Code 2.1.247**, amont **substitué** (`ML-009`) | le transport MCP, la découverte d'outils | rien sur ChatGPT, rien sur un amont réel |
| **Navigateur local**, charge **synthétique** | la carte s'affiche, et affiche la bonne chose | rien sur le rendu *dans* ChatGPT |
| **Instance locale réelle + navigateur**, flux OAuth complet | inscription, PKCE, `iss`, jeton lié à la bonne audience, `200` sur `initialize`, clé statique intacte | **rien sur ChatGPT** : c'est un navigateur local contre une instance locale |
| **`mcp.neomundi.org` depuis l'extérieur** | TLS, `401` sur tous les chemins, **proxy qui relaie tout** | rien sur une mesure de bout en bout |

> `LIVE_API_VALIDATED` reste **non décerné**. Ne jamais présenter la carte
> capturée en §5 comme une capture prise dans ChatGPT.

---

## 4. Ce qui a été délibérément laissé de côté

| Décision | Pourquoi |
|---|---|
| **`brandColor` non déclarée** | la fondation de marque laisse la couleur d'accent **non arrêtée** et dit que la marque n'en a pas besoin. Le champ est optionnel : en déclarer une trancherait une question d'identité qui n'est pas tranchée |
| **`capabilities` non déclaré** | optionnel pour ce format ; les étiquettes viennent d'un vocabulaire du tableau de bord qu'on n'a pas lu. En inventer exposerait à un constat automatique |
| **`review.demo_recording_url` absent** | **ne jamais inventer une URL pour remplir un champ.** Une URL qui ne résout pas est un motif de rejet déclaré |
| **`license` absent** | aucun fichier de licence au dépôt. Déclarer un identifiant SPDX serait une affirmation juridique sans support |
| **`_meta.ui.domain` absent** | c'est une décision de nom d'hôte, pas de code |
| **`mcp.json` laissé en `stdio`** | le basculer aujourd'hui nommerait un point d'entrée qui ne répond pas encore en OAuth. C'est la première étape **après** le déploiement, et le bloc exact est figé par un test |
| **CIMD, OIDC, `private_key_jwt` non implémentés** | DCR suffit et est explicitement supporté ; CIMD obligerait le serveur à aller chercher un document chez le client, pour un gain qui n'existe qu'à grande échelle |
| **Plafond par participant désactivé par défaut** | compter, c'est tenir quelque chose sur une personne entre deux requêtes, et la politique publiée dit « aucune conservation ». Mettre la page à jour d'abord, activer ensuite |
| **Aucun module Pradeep intégré** | décision de la mission. `P1-5`, `P2-2` et `P2-4` restent fermées |

---

## 5. Preuves produites par cette session

```
npm test                          339 cas, 339 réussis, 0 échec, 23 fichiers
                                  dont 27 cas OAuth
node scripts/validate-manifests.mjs   OK plugin.json · OK mcp.json
node check-publication.mjs        PASS, 125 fichiers publiables
node scripts/cgu-fingerprint.mjs  OK, version acceptable : 1.0
node scripts/build-package.mjs    39 fichiers, 190 729 octets
                                  sha256 8e0e8652299b5c70b7363d4a5dd52474b82bceda27eced6efdec48309bf9debf
                                  construit deux fois, empreinte identique
```

**Schémas officiels archivés**, avec leur provenance et leur SHA-256 :

| Copie | SHA-256 | `Last-Modified` à la source |
|---|---|---|
| `schemas/agent-plugins/mcp-1.0.0.schema.json` | `6539175b…16d3acb` | 2026-10-30 22:13:42 GMT |
| `schemas/agent-plugins/plugin-1.0.0.schema.json` | `0a4aad95…c0b3ab883` | 2026-11-01 09:44:38 GMT |

**Captures de la carte**, charge **synthétique**, hors du dépôt :

```
NEOMUNDI_WORKSPACE/plugin-candidature-20261101/captures/
  carte-mesure-complete-synthetique.jpg
  carte-allow-sans-controle-synthetique.jpg
  oauth-page-autorisation.jpg      <- navigateur LOCAL, pas ChatGPT
```

Elles sont reproductibles : `node scripts/card-capture-harness.mjs <dossier>`.
Le `request_id` qu'elles affichent est la chaîne littérale
`synthetique-aucun-appel-reel`, pour qu'un lecteur de l'image sache qu'elle ne
vient d'aucun enregistrement.

> **La seconde capture est la pièce la plus défendable du dossier.** Un `ALLOW`
> décidé **sans aucun contrôle** y porte quatre bandeaux, les champs absents
> disent *non publié* en gris, et **rien n'est vert**. C'est précisément le
> cas qu'un référencement ordinaire présenterait comme un succès.

---

## 6. Ce qui n'a pas bougé, et ne doit pas bouger

- **Aucune modification de l'API, du moteur de mesure, des seuils ou des
  décisions.** Le diff de cette session ne touche ni `adapter.mjs`, ni
  `upstream.mjs`, ni `contract.mjs`, ni aucun schéma de mesure.
- **Aucun déploiement.** Une PR, une CI verte ou une fusion n'autorise pas la
  production.
- **Aucune mesure fabriquée.** Les huit contrats à préserver sont intacts et
  tenus par la suite.
- **La divergence de version reste `D-8`** : le connecteur est épinglé sur
  `3.3.0`, la production déclare `3.3.1`, **toute** mesure ressort
  `version_agreement: divergent`. Lever l'épinglage est un arbitrage produit.

---

## 7. Sources vérifiées le 2026-11-01

| Source | Ce qu'on y a lu |
|---|---|
| `agent-plugins.org/schemas/1.0.0/{plugin,mcp}.schema.json` | les deux schémas, téléchargés et archivés |
| `agent-plugins.org/specification` | « un champ inconnu […] rend cette entrée de serveur invalide » |
| `agent-plugins.org/plugin-authors/mcp-servers` | « aucun champ portable d'OAuth […] l'authentification reste gérée par le client » |
| `developers.openai.com/plugins/build/plugins` | emplacement de `extensions["com.openai"].auth`, structure d'`interface` |
| `developers.openai.com/plugins/deploy/submission` | limites de champs, cas de revue 5+3, limitations d'authentification, défi de domaine |
| `developers.openai.com/plugins/deploy/desktop-only` | « limitées aux partenaires agréés » |
| `developers.openai.com/plugins/deploy/app-review` | exigences du serveur distant ; résidence de données UE |
| `developers.openai.com/plugins/reference` | `_meta.ui.*`, `openai/ui`, `ui.domain` exigée à la soumission |
| `developers.openai.com/api/docs/guides/custom-mcp-server` | **« OAuth, aucune authentification, ou OAuth ou aucune »** |
| `developers.openai.com/api/docs/guides/secure-mcp-tunnels` | l'essai sans exposition publique |

> **À revérifier le jour de la soumission.** Le schéma `plugin.schema.json` a
> été modifié à la source **le matin même** de cette vérification. Ces
> exigences bougent.

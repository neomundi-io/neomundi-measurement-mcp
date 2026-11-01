# État de préparation à la publication — connecteur MCP NeoMundi

**Établi le 1er novembre 2026**, après vérification des exigences officielles
en vigueur ce jour-là. Les sources sont citées et horodatées : ce document ne
reprend aucune instruction ancienne.

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
| Suite complète | **312 cas, 312 réussis** | `npm test` |
| Séparation public / interne | **VALIDÉ** | `node check-publication.mjs` → 120 fichiers |

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
normatives et se contredisent.** Rien n'est déclaré aujourd'hui parce que rien
ne serait gagné aujourd'hui — le portail ne sait pas consommer une clé d'API.
Le bloc exact et son coût sont figés dans un test, pour ne pas être
redécouverts.

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
| **B-1** | **Authentification par clé d'API non connectable** | `401` sur `/`, `/health`, `/mcp` ; ChatGPT n'offre qu'OAuth / aucune | **Sébastien** : arbitrage, puis chantier |
| **B-2** | **Vérification de domaine impossible en l'état** | `https://mcp.neomundi.org/.well-known/openai-apps-challenge` → **`401`** | **Sébastien** — mais voir §2.2, c'est facile |
| **B-3** | **Identité d'organisation non vérifiée** | état inconnu depuis ce dépôt | **Sébastien**, tableau de bord |
| **B-4** | **Origine dédiée de la carte non décidée** | `_meta.ui.domain` absent ; exigé pour soumettre un plugin **avec interface** | **Sébastien** : un nom d'hôte |
| **B-5** | **Vidéo de démonstration absente** | `review.demo_recording_url` non renseigné — exigé pour la revue MCP | après B-1 |
| **B-6** | **Compte de démonstration** | la plateforme exige « *un identifiant et un mot de passe pour un compte de démonstration pleinement fonctionnel* » ; notre accès est un jeton partagé | **Sébastien** |

### 2.1 B-1 — les trois issues, aucune n'est gratuite

| Issue | Ce qu'elle exige | Ce qu'elle donne |
|---|---|---|
| **A — implémenter OAuth 2.1** sur `mcp.neomundi.org` | métadonnées de ressource protégée, serveur d'autorisation, DCR ou CIMD, `resource` répercuté | **la seule issue en libre-service.** Débloque la soumission publique *et* l'essai dans ChatGPT |
| **B — demander une dérogation** pour la clé d'API | « *Contactez OpenAI si votre soumission exige cette méthode* » | dépend d'une réponse ; délai inconnu |
| **C — soumission « bureau seulement »** (serveur local stdio) | **mise en liste blanche de l'organisation par un représentant OpenAI** | badge *Desktop only*, installation depuis l'application de bureau uniquement |

> **L'issue C est celle vers laquelle le dépôt penche aujourd'hui** —
> `mcp.json` déclare un serveur `stdio` et `requires_local_executor` vaut
> `true` — **et c'est la plus fermée des trois** : elle est « *limitée aux
> partenaires agréés* ». L'association n'a pas de représentant OpenAI.

**Un essai réel dans ChatGPT reste possible dès maintenant, sans OAuth**, par
le **tunnel MCP sécurisé** : `tunnel-client` tourne dans le réseau, joint le
serveur MCP en `stdio` ou en HTTP, et ChatGPT l'appelle par un point d'entrée
hébergé. La plateforme précise que **cela ne remplace pas** le point d'entrée
public exigé pour la soumission — mais cela produirait exactement la preuve
qui manque à `P0-3` : une mesure réelle, revenue dans ChatGPT, avec un
`request_id` retrouvable des deux côtés.

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

**Non, et il n'a jamais été branché.** Cette réponse n'a pas changé depuis la
clôture du 1er novembre, et la session n'a rien fait qui permette de la
changer : aucun compte ChatGPT n'a été utilisé, aucun connecteur n'a été
ajouté, aucune mesure n'est revenue d'un hôte.

Ce qui a changé, c'est qu'on sait **pourquoi** : le serveur parle une méthode
d'authentification que l'hôte ne propose pas. Ce n'était pas écrit avant.

| Vérifié où | Ce que cela prouve | Ce que cela ne prouve pas |
|---|---|---|
| **Claude Code 2.1.247**, amont **substitué** (`ML-009`) | le transport MCP, la découverte d'outils | rien sur ChatGPT, rien sur un amont réel |
| **Navigateur local**, charge **synthétique** | la carte s'affiche, et affiche la bonne chose | rien sur le rendu *dans* ChatGPT |
| **`mcp.neomundi.org` depuis l'extérieur** | TLS, `401` sur tous les chemins | rien sur une mesure de bout en bout |

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
| **`mcp.json` laissé en `stdio`** | le basculer en `streamable-http` aujourd'hui casserait l'installation locale qui marche, **sans rien débloquer** tant que B-1 tient |
| **Aucun module Pradeep intégré** | décision de la mission. `P1-5`, `P2-2` et `P2-4` restent fermées |

---

## 5. Preuves produites par cette session

```
npm test                          312 cas, 312 réussis, 0 échec, 22 fichiers
node scripts/validate-manifests.mjs   OK plugin.json · OK mcp.json
node check-publication.mjs        PASS, 120 fichiers publiables
node scripts/cgu-fingerprint.mjs  OK, version acceptable : 1.0
node scripts/build-package.mjs    38 fichiers, 175 768 octets
                                  sha256 9dd06242c0827b29788e707ddd6d1111a5d8291976c89984a0e4d1b376bd6398
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

# OAuth 2.1 sur le connecteur MCP — rapport d'implémentation

**1er novembre 2026.** Branche `feat/oauth-chatgpt-20261101`.

> ## En une phrase
>
> Le serveur hébergé parle désormais **OAuth 2.1 complet** — découverte,
> inscription dynamique, code d'autorisation avec PKCE, jetons, rotation,
> révocation — **sans aucune dépendance ajoutée, sans base de données, et sans
> toucher à la mesure**. Il **n'est pas déployé** : le déploiement est la seule
> opération qui exige votre autorisation.

---

## 1. Le problème que cela règle

Vérifié le 2026-11-01 : ChatGPT ne connecte un serveur MCP qu'avec **OAuth**,
**aucune authentification**, ou **les deux**. Il n'existe aucun flux pour un
jeton `Bearer` fixe, et les deux contournements évidents — mettre le jeton
dans `headers`, déclarer un serveur protégé en `type: "none"` — sont refusés
nommément par les exigences de soumission.

`mcp.neomundi.org` exigeait un `Bearer` fixe. **C'était de l'authentification
par clé d'API, c'est-à-dire une méthode qui n'existe pas côté hôte.** OAuth
était la seule issue en libre-service, et c'est elle qui est implémentée.

---

## 2. Architecture, et pourquoi elle n'ajoute rien

**Une seule origine, deux rôles.** `mcp.neomundi.org` est à la fois serveur de
ressource (`/mcp`) et serveur d'autorisation (`issuer = https://mcp.neomundi.org`).
Pas de nouveau domaine, pas de nouveau conteneur, pas de fournisseur
d'identité tiers, **pas une seule dépendance** : le connecteur n'en a aucune et
n'en acquiert pas ici.

### 2.1 Sept routes, toutes dans `runtime/oauth.mjs`

| Route | Rôle | Référence |
|---|---|---|
| `GET /.well-known/oauth-protected-resource` | où est le serveur d'autorisation | RFC 9728 |
| `GET /.well-known/oauth-authorization-server` | points d'entrée et capacités | RFC 8414 |
| `POST /oauth/register` | inscription dynamique de client | RFC 7591 |
| `GET /oauth/authorize` | page d'identification du participant | OAuth 2.1 |
| `POST /oauth/authorize` | soumission, puis redirection avec le code | OAuth 2.1 |
| `POST /oauth/token` | code → jetons, et rafraîchissement | OAuth 2.1 |
| `POST /oauth/revoke` | révocation explicite | RFC 7009 |

Les deux documents de découverte sont aussi servis à la forme
`/.well-known/<nom>/mcp`, parce qu'un client a le droit d'y regarder d'abord.

**Ces routes sont devant la porte d'authentification, et il le fallait.**
Chacune est quelque chose qu'un client lit *avant* de détenir le moindre
credential. Les placer derrière le `Bearer` est précisément ce qui rendait
OAuth impossible ici.

### 2.2 Rien n'est stocké, et ce n'est pas un raccourci

Trois choses se stockent d'habitude. Chacune est rendue sans état **pour une
raison nommée** :

| Ce qui se stocke d'habitude | Ici | Pourquoi |
|---|---|---|
| **Clients inscrits** | le `client_id` **est** l'inscription : un blob signé qui porte ses `redirect_uris` | la plateforme prévient qu'une inscription qui expire donne `invalid_client` à tous les utilisateurs connectés, à un moment imprévisible. Sans table, rien à perdre au redéploiement |
| **Jetons** | signés et auto-descriptifs (HS256, `at+jwt`) | un redémarrage ne déconnecte personne |
| **Codes d'autorisation** | signés, et **usage unique** | l'usage unique est la seule chose qui demande vraiment de la mémoire : un ensemble de 60 secondes, dont la perte coûte au pire une connexion en cours |

Le conteneur tourne en `read_only: true`. Une conception qui écrivait aurait
exigé un volume inscriptible — et un volume neuf sur un chemin absent de
l'image revient en `root:root`, avec un `PermissionError` que rien dans Compose
ne laisse voir. **L'absence d'état est ici moins chère et plus sûre.**

### 2.3 Ce qui est durable, délibérément

**Le registre des participants**, un fichier JSON monté en **lecture seule**.
C'est la seule chose durable, et c'est la seule qui doit l'être : **c'est elle
qui fait survivre une révocation à un redémarrage**, ce qu'un jeton signé ne
sait pas faire seul.

Il est **relu à chaque autorisation et à chaque vérification de jeton**, jamais
mis en cache au démarrage. Une révocation qui attend un redéploiement n'est pas
une révocation.

Il ne contient **aucun secret** : un identifiant, un nom, un drapeau
`enabled`, un `epoch`, des portées, et une empreinte **scrypt** avec son sel et
ses paramètres. Il peut être posé sur un serveur sans être une liste de mots de
passe.

---

## 3. La ligne entre les deux secrets

> **`NEOMUNDI_API_KEY` est la clé TECHNIQUE qui appelle l'instrument.
> L'identité OAuth est la personne qui demande une mesure. Deux secrets, deux
> durées de vie, et le serveur ne les mélange jamais.**

C'est affirmé **et testé** : le test « *l'identité du demandeur ne remonte
nulle part* » vérifie que ni le `subject`, ni le secret du participant, ni le
jeton d'accès n'apparaissent dans ce qui part vers l'instrument.
`runtime/oauth.mjs` ne lit jamais `NEOMUNDI_API_KEY`.

---

## 4. Identité, droits, consommations

### 4.1 Identification individuelle

Chaque participant a un identifiant stable, un secret dérivé en **scrypt**
(N=16384, r=8, p=1, sel aléatoire de 16 octets), des portées, et un `epoch`.
Les entrées se fabriquent avec :

```
printf '%s' "$SECRET" | node scripts/participant-credential.mjs alpha --name "Atelier Alpha"
```

Le secret est lu sur **l'entrée standard**, jamais en argument : un argument
est visible dans la liste des processus, dans l'historique du shell, et dans
tout superviseur qui enregistre une ligne de commande. Sans entrée standard,
un secret est généré et **affiché une seule fois sur la sortie d'erreur** —
pas sur la sortie standard, pour qu'une redirection de l'entrée dans un fichier
n'y écrive pas aussi le secret.

### 4.2 Séparation des droits

La portée `measure` est la seule, parce qu'il n'y a qu'un outil et qu'il fait
une chose. **Retirer la portée d'un participant arrête son jeton existant
immédiatement**, avec un `403` et non un `401` — un `401` le renverrait dans
une connexion qui lui accorderait exactement la même chose, indéfiniment.

### 4.3 Séparation des consommations, et son prix

Un plafond **par participant** existe (`NEOMUNDI_OAUTH_QUOTA_PER_SUBJECT`).
Un dépassement produit un refus qui **dit pourquoi**, ne fabrique aucune
mesure, et **n'appelle pas l'instrument** — vérifié par un test qui compte les
appels sortants.

> **Il est désactivé par défaut, et c'est une décision.** Compter, c'est tenir
> quelque chose sur une personne entre deux requêtes. La politique de
> confidentialité publiée dit aujourd'hui, en toutes lettres : « *Connecteur
> MCP : aucune conservation* ». Laissé vide, **aucun compteur n'existe** — ce
> qu'un test vérifie. Le renseigner rend cette phrase fausse.
>
> **L'ordre est le même que pour `P1-4` : appliquer d'abord, publier ensuite.**
> Ici : mettre la page à jour **avant** d'activer le plafond, jamais l'inverse.

### 4.4 Révocation : deux leviers, tous deux durables

| Geste | Effet | Immédiat ? |
|---|---|---|
| `"enabled": false` | le participant est dehors, jetons déjà émis compris | oui, à la requête suivante |
| `"epoch"` incrémenté | ses jetons émis sont invalidés, l'accès reste | oui |
| `POST /oauth/revoke` | ce jeton précis cesse, jusqu'à son expiration | oui, mais **en mémoire** |

Les deux premiers survivent à un redémarrage. **Le troisième non**, et c'est
dit : la révocation durable passe par le registre, pas par l'endpoint.

---

## 5. Ce qui a été préservé

| Point | État | Preuve |
|---|---|---|
| **Clé statique** (`NEOMUNDI_MCP_API_KEY`) | **inchangée, et toujours acceptée** | test dédié ; essai réel ci-dessous, étape 7 |
| **Codex et les clients `stdio`** | **intacts** : `stdio.mjs` n'importe pas `oauth.mjs` et la spécification MCP dit explicitement qu'un transport stdio **ne doit pas** suivre ce chapitre, mais lire ses credentials dans l'environnement | suite complète verte |
| **OAuth désactivé par défaut** | une installation qui ne change rien se comporte **exactement** comme avant : pas de route publique, et le `401` garde sa forme d'origine | test dédié |
| **Mesure, seuils, décisions** | **aucune modification.** Le diff ne touche ni `adapter.mjs`, ni `upstream.mjs`, ni `contract.mjs`, ni `presentation.mjs`, ni aucun schéma | voir §7 |
| **Provenance et états** | la même mesure revient **identique** selon qu'on a présenté un jeton OAuth ou la clé statique | test de comparaison champ par champ |

---

## 6. Sécurité : ce qui est tenu, et par quel test

| Propriété | Test |
|---|---|
| PKCE **S256 obligatoire** ; un code sans son vérificateur ne vaut rien | *PKCE is enforced* |
| Code **à usage unique**, lié à son client **et** à son `redirect_uri` | *an authorization code is single use…* |
| **Aucune redirection** vers un client ou une adresse non enregistrés | *a bad client or redirect URI is NOT redirected to* |
| `iss` renvoyé sur **toute** réponse d'autorisation, succès **et erreur** (RFC 9207) | *a recoverable error goes back…* |
| Audience vérifiée : un jeton émis pour une autre ressource n'ouvre pas celle-ci | *an expired, forged, wrong-audience…* |
| `alg: none`, clé étrangère, jeton de rafraîchissement présenté comme jeton d'accès : tous refusés | idem |
| Rotation du jeton de rafraîchissement ; celui qu'on vient de dépenser meurt | *a refresh token rotates…* |
| Participant inconnu, secret faux, accès suspendu : **un seul message**, pour ne pas énumérer qui détient un accès | *…are indistinguishable* |
| Registre absent ou illisible → **personne n'entre** (jamais lu comme « aucune restriction ») | *an unreadable or malformed registry…* |
| La page d'identification **ne charge rien** et porte une CSP `default-src 'none'` | *the sign-in page…* |
| Un refus de quota **ne fabrique aucune mesure** et n'appelle pas l'instrument | *a refused call over quota…* |

**Les URI de redirection sont comparées comme des chaînes exactes**, jamais
analysées puis recomparées composant par composant : chaque normalisation est
un endroit où deux URI différentes se mettent à être égales.

---

## 7. Preuves exécutées

```
npm test                              339 cas, 339 réussis, 0 échec, 23 fichiers
                                      dont 27 nouveaux cas OAuth
node scripts/validate-manifests.mjs   OK plugin.json · OK mcp.json
node check-publication.mjs            PASS, 125 fichiers publiables
node scripts/cgu-fingerprint.mjs      OK, version acceptable : 1.0
node scripts/build-package.mjs        39 fichiers, 190 729 octets
                                      sha256 8e0e8652299b5c70b7363d4a5dd52474b82bceda27eced6efdec48309bf9debf
                                      construit deux fois, empreinte identique
```

### 7.1 Essai de bout en bout, hors suite de tests

Une instance réelle, lancée avec un registre réel, parcourue par un script
indépendant (`scripts/` n'y est pas : l'essai vit hors du dépôt).

```
1. register         -> client_id 223 chars, auth method none
2. authorize (GET)  -> sign-in page served, 3438 bytes, no external reference: true
3. authorize (POST) -> 302 to https://chatgpt.com/connector_platform_oauth_redirect
                       | state essai-local | iss https://mcp.neomundi.org
4. token            -> Bearer | expires_in 3600 | scope measure
   access token aud = https://mcp.neomundi.org/mcp | sub = demo | epoch = 1
5. MCP initialize   -> 200 {"name":"neomundi-measurement-mcp-private","version":"0.3.0-rc.1"}
6. tampered token   -> 401 (expected 401)
7. static key       -> 200 (expected 200 — Codex path intact)
```

**Capture de la page d'autorisation** :
`NEOMUNDI_WORKSPACE/plugin-candidature-20261101/captures/oauth-page-autorisation.jpg`.

> **Ce n'est pas ChatGPT.** C'est un navigateur local contre une instance
> locale. Aucun compte ChatGPT n'a été utilisé, aucun connecteur n'a été ajouté,
> aucune mesure n'est revenue d'un hôte. Ne jamais présenter cette capture
> autrement.

---

## 8. Déploiement : une précondition confirmée, une autorisation manquante

### 8.1 Ce qui est confirmé, sans rien changer en production

Le proxy **transmet déjà toutes les routes** au serveur Node. Vérifié le
2026-11-01 :

```
https://mcp.neomundi.org/.well-known/oauth-protected-resource    -> 401
https://mcp.neomundi.org/.well-known/oauth-authorization-server  -> 401
https://mcp.neomundi.org/oauth/token                             -> 401
https://mcp.neomundi.org/nonexistent-path-probe                  -> 401
```

Les quatre portent `WWW-Authenticate: Bearer realm="neomundi-private-mcp"`,
**qui est la chaîne de notre serveur Node**, pas celle de Caddy. Donc : Caddy
relaie tout, n'ajoute aucune authentification à lui, et **aucune modification
de Caddy n'est nécessaire**. Les quatre routes OAuth répondront dès que l'image
tournera avec les trois variables.

TLS : Let's Encrypt, valide du **7 septembre** au **6 décembre 2026**.

### 8.2 Ce qui manque : votre autorisation

**Rien n'a été déployé.** La règle permanente — *aucun déploiement sans
autorisation explicite de Sébastien, sur un SHA nommé* — n'est pas couverte par
cette mission, et une PR ou une CI verte n'est pas une autorisation.

L'opération exacte, et le retour arrière, sont dans
[`CHATGPT_CONNECTION_GUIDE.md`](CHATGPT_CONNECTION_GUIDE.md) §2.

---

## 9. Ce qui reste ouvert

| # | Point | Qui |
|---|---|---|
| **O-1** | **Autoriser le déploiement** sur un SHA nommé | **Sébastien** |
| **O-2** | Générer la clé de signature et la placer dans l'environnement du VPS | **Sébastien** |
| **O-3** | Créer le registre des participants et le monter en lecture seule | **Sébastien** |
| **O-4** | Vérification d'identité de l'organisation sur le tableau de bord | **Sébastien** |
| **O-5** | Jeton de défi de domaine, à publier sur `neomundi.org` | **Sébastien** |
| **O-6** | Origine dédiée pour la carte (`_meta.ui.domain`), exigée pour soumettre avec interface | **Sébastien** |
| **O-7** | Basculer `mcp.json` en `streamable-http` + bloc `auth` **après** le déploiement | une session |
| **O-8** | Si le plafond par participant est activé : **mettre à jour la page de confidentialité d'abord** | **Sébastien** |

### Ce qui n'est délibérément pas fait

- **CIMD** (`client_id_metadata_document_supported`). DCR suffit, est
  explicitement supporté, et CIMD obligerait le serveur à aller chercher un
  document chez le client — une requête sortante et une surface SSRF pour un
  gain d'administration qui n'existe qu'à grande échelle.
- **OIDC, `openid`/`email`, UserInfo.** Utile seulement pour la restriction de
  domaine des espaces ChatGPT Entreprise. Rien ici n'en a besoin, et publier
  des portées non servies est une façon d'échouer plus tard.
- **`private_key_jwt`.** Déclarer la méthode ne configure aucune clé de
  signature ; la plateforme demande de confirmer la mise en place avant de
  l'utiliser pour une soumission.
- **`mcp.json` n'est pas encore basculé** : il nommerait un point d'entrée qui
  ne répond pas encore en OAuth. Le bloc exact est **figé par un test**, dans
  `tests/manifest-schema.test.mjs`.

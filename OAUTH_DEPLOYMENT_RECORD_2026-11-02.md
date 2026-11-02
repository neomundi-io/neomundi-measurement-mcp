# Déploiement d'OAuth 2.1 sur `mcp.neomundi.org` — 2 novembre 2026

**Autorisé par Sébastien.** Bascule à **`2026-11-02T05:35:36Z`**.

> ## Ce qui tourne maintenant — **`ed41658`, depuis 20:13:56Z**
>
> | | |
> |---|---|
> | Image | `neomundi-measurement-mcp:ed41658` |
> | Empreinte | `sha256:953d6aa49d50887bd9502e3188603a1b30d4d52be0bbe9d626ba8a5c27cde2fe` |
> | Révision | `ed41658469aceec415e2f2bcf3e2b26de4d48c97` |
> | OAuth | **actif** — issuer `https://mcp.neomundi.org`, ressource `https://mcp.neomundi.org/mcp` |
> | Participants | **2**, `sebastien` et `pilote-1`, tous deux `enabled`, `epoch` 1, portée `measure` |
> | Plafond par participant | **non configuré** — rien n'est retenu entre deux requêtes |
> | Retour arrière | **exercé**, pas seulement écrit — §5, et §6 ter pour les DEUX cibles |
>
> La bascule du 05:35 a mis OAuth en service (`b30d631`) ; celle de 20:13 a
> corrigé le traitement de l'en-tête `Origin` (`ed41658`). Les deux sont
> consignées ci-dessous, dans l'ordre.

---

## 1. L'autorisation portait sur `d1a6296`. Ce n'est pas ce qui est déployé.

**`d1a6296` ne peut pas produire d'image.** Son `Dockerfile` ne copie pas
`legal/`, que `tests/cgu-versions.test.mjs` lit ; le `RUN npm test` du build
échoue — **5 échecs, une seule cause**, `ENOENT /app/legal/cgu-versions.json`.

Ce n'est pas un défaut d'OAuth. Il est hérité des PR juridiques et dormait
depuis, faute de reconstruction d'image — **exactement le mode de panne que le
`Dockerfile` décrivait déjà pour les entrées d'empaquetage**, répété une
seconde fois.

Le travail s'est donc arrêté à la porte, **avant toute modification du
service**, et une autorisation distincte a été demandée pour `b30d631`.

`b30d631` ajoute `COPY legal/`, un test qui fait échouer la suite si une source
cesse d'entrer dans l'image, et la précondition de §2.2 dans le guide.
**`runtime/` est octet pour octet identique à `d1a6296`** :

```
git diff --stat d1a6296..b30d631 -- runtime/   →   (vide)
```

Autrement dit : le code servi est celui qui a été autorisé ; seul l'emballage
a changé.

## 2. Une seconde précondition, mesurée et non raisonnée

**Sans `NEOMUNDI_MCP_ALLOWED_HOSTS`, personne n'aurait pu s'authentifier.**

Caddy réécrit `Host` en `127.0.0.1:8787` — donc le contrôle d'hôte passe par la
paire loopback — mais **il ne réécrit pas `Origin`**, et le navigateur envoie
`Origin: https://mcp.neomundi.org`. Les origines acceptées sont dérivées de la
paire loopback et des hôtes explicitement nommés ; sans nommer celui-ci,
l'origine du navigateur n'est dans aucune des deux listes.

Mesuré contre le code, avant la bascule :

```
ALLOWED_HOSTS = (non défini)       → POST /oauth/authorize  403 invalid_origin
ALLOWED_HOSTS = mcp.neomundi.org   → POST /oauth/authorize  traité
```

Le symptôme n'aurait pas ressemblé à sa cause. La variable est désormais posée.

## 3. Essai isolé avant la bascule

Un conteneur jetable sur `127.0.0.1:8788`, image `b30d631`, registre d'essai
monté en lecture seule, **sans toucher au service en production** :

```
1. protected-resource -> 200  https://mcp.neomundi.org/mcp
2. auth-server        -> 200  S256: ["S256"]  iss param: true
3. register           -> 201  auth method: none
4. authorize GET      -> page 3396 octets, aucune référence externe
5. mauvais secret     -> 401, aucune redirection
6. bon secret         -> 302  state conservé, iss renvoyé
7. token              -> 200  Bearer, aud = https://mcp.neomundi.org/mcp
8. MCP en OAuth       -> 200
9. MCP clé statique   -> 200   (chemin Codex)
10. jeton falsifié    -> 401
11. rejeu du code     -> 400 invalid_grant
```

Ce qu'il a aussi prouvé : le montage **en lecture seule** fonctionne dans un
conteneur `--read-only`, et l'utilisateur non privilégié `node` lit bien le
registre.

## 4. Vérification APRÈS la bascule, contre `https://mcp.neomundi.org`

### 4.1 Surface publique, sans credential

```
/.well-known/oauth-protected-resource    200
/.well-known/oauth-authorization-server  200   code_challenge_methods_supported: ["S256"]
                                               authorization_response_iss_parameter_supported: true
                                               token_endpoint_auth_methods_supported: ["none"]
401 sur /mcp :
  WWW-Authenticate: Bearer realm="neomundi-private-mcp", error="invalid_token",
                    resource_metadata="https://mcp.neomundi.org/.well-known/oauth-protected-resource",
                    scope="measure"
```

### 4.2 Authentification, isolation, rotation, révocation

Exécuté par le **vrai chemin** : HTTPS, à travers Caddy.

| Contrôle | Résultat |
|---|---|
| `sebastien` s'identifie | `iss` conforme, `state` conservé, **MCP 200** |
| `pilote-1` s'identifie | `iss` conforme, `state` conservé, **MCP 200** |
| Mauvais secret | **401**, et **aucune redirection** — rien ne part vers le client |
| Clé statique (chemin Codex) | **200**, inchangée |
| Rejeu d'un code d'autorisation | **`invalid_grant`** |
| **`pilote-1` suspendu** (`enabled: false`) | son jeton → **401** ; **`sebastien` → 200** ; **sans redémarrage** |
| **`epoch` de `pilote-1` porté à 2** | son jeton → **401** ; nouvelle connexion → **200** |
| Révocation explicite | endpoint **200**, puis jeton → **401** |

> **C'est la preuve d'isolation.** Suspendre un participant n'a eu aucun effet
> sur l'autre, et l'effet a été immédiat parce que le registre est relu à
> chaque vérification.

Le registre a été **remis à l'identique** après ces essais, vérifié par
empreinte : `sha256sum -c` → `OK`.

### 4.3 Surface MCP

```
initialize     : 200  {"name":"neomundi-measurement-mcp-private","version":"0.3.0-rc.1"}  caps: tools,resources
tools/list     : 1 outil -> measure_execution  | outputTemplate: ui://neomundi-measurement/card-v1.html
resources/list : 1 ressource -> ui://neomundi-measurement/card-v1.html | text/html;profile=mcp-app
resources/read : 19 360 octets | displayModes ["inline"] | csp {connectDomains:[],resourceDomains:[]}
session delete : 204
```

## 5. Retour arrière — exercé, pas affirmé

Il a été **réellement effectué puis annulé** le 2026-11-02, pour que
« opérationnel » veuille dire quelque chose :

```
retour   : image da71f5d, en-tête 401 d'origine, /.well-known/... → 401
aller    : image b30d631, /.well-known/... → 200, défi avec resource_metadata
```

### La procédure, en trois commandes

```bash
sudo cp -p /root/neomundi-mcp-backup-20261102/neomundi-mcp-docker.service /etc/systemd/system/
sudo cp -p /root/neomundi-mcp-backup-20261102/neomundi-mcp.env /etc/neomundi-mcp.env
sudo systemctl daemon-reload && sudo systemctl restart neomundi-mcp-docker
```

**Rien à migrer, rien à perdre** : ce déploiement n'a ni base, ni état, ni
données. Le retour arrière reprend l'état d'avant, où la clé statique était le
seul accès.

Conservé dans `/root/neomundi-mcp-backup-20261102` (`0700`, `root`) :
l'ancienne unité, l'ancien `.env`, le `Caddyfile`, l'empreinte de l'image de
retour `sha256:a50a2679d18e…05eefe9`, et les secrets de §6. L'image `da71f5d`
**n'a pas été supprimée** ; ne pas lancer `docker image prune`.

> **Arrêt d'urgence, plus radical que le retour arrière** : changer
> `NEOMUNDI_OAUTH_SIGNING_KEY`. Cela invalide instantanément **tous** les
> jetons et **toutes** les inscriptions de clients, sans rien désinstaller.

## 6. Les secrets — où ils sont, et ce qui n'est pas passé par la conversation

**Tout a été généré sur le VPS. Aucune valeur secrète n'a transité par la
session, ni par un journal, ni par le dépôt.** Seules des empreintes
tronquées ont été échangées :

| Fichier (`/root/neomundi-mcp-backup-20261102/`, `0600`) | Empreinte |
|---|---|
| `oauth-signing-key` | `sha256:31a50585fcdfa825…` |
| `secret-sebastien` | `sha256:715a81ad22adc142…` |
| `secret-pilote-1` | `sha256:0a102f359b1a0ba5…` |

Pour lire un secret, depuis le VPS :

```bash
sudo cat /root/neomundi-mcp-backup-20261102/secret-sebastien
```

Le registre `/etc/neomundi/participants.json` (`0444`, `root`) **ne contient
aucun secret** : identifiants, drapeaux et empreintes **scrypt** uniquement.
Vérifié : le secret en clair n'y apparaît pas.

## 6 bis. Incident du 2026-11-02 — `invalid_origin` à la saisie du secret

**Symptôme.** La page d'autorisation s'affiche correctement, annonce bien
« Client demandeur : ChatGPT », puis la validation du formulaire rend
`{"error":"invalid_origin"}`.

**Ce n'était pas propre à ChatGPT.** Reproduit à l'identique dans un Chrome
ordinaire, contre la production.

### La cause

**C'est notre propre en-tête `Referrer-Policy: no-referrer` sur la page de
connexion.**

Sous `no-referrer`, un navigateur sérialise l'`Origin` d'une **navigation de
soumission de formulaire** en la chaîne littérale **`null`** : une telle
requête n'est pas teintée CORS, et la politique de référent gouverne aussi
cette sérialisation. Le formulaire arrivait donc avec `Origin: null`, que la
liste d'origines refuse — à juste titre, car `null` est aussi ce qu'envoie une
iframe en bac à sable.

### Pourquoi rien ne l'avait attrapé

**Aucun des contrôles n'était un navigateur.** `curl` et `fetch` envoient tous
deux une `Origin` réelle ; ils ne pouvaient pas produire le défaut. Mesuré
après coup, depuis la page elle-même :

| Depuis la page servie | Résultat |
|---|---|
| `fetch()` (mode `cors`) | **400** — l'origine passe |
| soumission du formulaire | **403 `invalid_origin`** |

### Le témoin qui ferme la démonstration

Banc isolé, même navigateur, même formulaire, **une seule variable** :

| `Referrer-Policy` | `Origin` reçue |
|---|---|
| `no-referrer` | **`"null"`** |
| absent | `"http://127.0.0.1:8900"` |
| `same-origin` | `"http://127.0.0.1:8900"`, référent **same-origin uniquement** |

### Le correctif

**`Referrer-Policy: same-origin`** au lieu de `no-referrer`, dans
`runtime/oauth.mjs`. La propriété de confidentialité qui comptait est
conservée — le référent va à cette origine et **nulle part ailleurs**, donc
les paramètres de la demande d'autorisation ne sortent jamais — et l'`Origin`
est restituée.

**Aucun contrôle n'est assoupli.** `Origin: null`, une origine tierce et une
origine à casse différente restent **refusées**, ce que trois nouveaux cas de
test verrouillent.

S'y ajoute une correction de lisibilité : un refus d'origine sur une route
OAuth rend désormais **une page expliquant la cause** au lieu d'un bloc JSON.
Le refus est identique ; seul le message change. Le point d'entrée MCP garde
son refus machine `{"error":"invalid_origin"}`, parce que ce n'est pas une
surface de navigateur.

### Le second défaut, miroir du premier

En vérifiant les endpoints appelés par le backend ChatGPT, la mesure a
**corrigé la prémisse** : une requête **sans `Origin` passait déjà**. C'est
l'inverse qui était cassé.

| Endpoint | sans `Origin` | `Origin` tierce |
|---|---|---|
| `/oauth/token` | **401 `invalid_client`** — atteint le gestionnaire | **403 `invalid_origin`** |
| `/oauth/register` | **201** | **403** |
| `/oauth/revoke` | **200** | **403** |

**L'en-tête bloquait le cas honnête et laissait passer tout le reste.** Sur ces
routes, `Origin` n'est pas un contrôle d'accès : elles ne portent **aucune
autorité ambiante**, donc une page qui les appelle n'a pas plus de pouvoir que
`curl`. Ce qui les protège est ce que le protocole dit : PKCE et la liaison du
code à son client et à son URI de redirection sur `/oauth/token`, la
possession du jeton sur `/oauth/revoke`, et rien du tout sur des documents
faits pour être publics.

### Le correctif consolidé — `b43b0e0`

**Trois classes de routes, trois règles.**

| Classe | Routes | Règle |
|---|---|---|
| **protocole** | les deux `/.well-known/*`, `/oauth/register`, `/oauth/token`, `/oauth/revoke` | **aucune restriction d'origine** |
| **page** | `/oauth/authorize` | **l'origine propre de la page**, ou absente — et **rien d'autre** |
| **api** | `/mcp` | la liste configurée, **inchangée** |

**La route navigateur est resserrée, pas ouverte** : la forme `http://` de
l'émetteur et tout second hôte configuré, que la porte partagée acceptait, ne
sont plus acceptés.

Deux protections contre l'abus s'y ajoutent :

- **La page de consentement affiche où part le code** et marque le nom du
  client comme *déclaré*. L'inscription est ouverte par conception : n'importe
  qui peut forger un client se nommant « ChatGPT » avec sa propre URI de
  redirection dessous. La destination est le seul champ qu'il ne peut pas
  falsifier — elle est affichée, et jamais rendue cliquable.
- **La vérification du secret quitte la boucle d'événements.** `scryptSync`
  coûtait ~50 ms et bloquait tout pendant ce temps, mesures en vol comprises,
  et personne n'a besoin d'être authentifié pour envoyer de faux secrets. Elle
  passe au pool de threads, **deux au plus en vol** ; au-delà le serveur dit
  qu'il est saturé et **n'évalue pas** le credential — dire « secret
  incorrect » serait un autre fait, et un faux.

### Vérification

| Contrôle | Résultat |
|---|---|
| Soumission de formulaire **dans un vrai navigateur** | atteint le gestionnaire (« Demande expirée »), plus le `403` de la porte |
| Flux complet avec `Origin` présente à chaque étape serveur-à-serveur | `register` 201 · `authorize` 302 avec `iss` · `token` Bearer · **MCP 200** · `revoke` 200 puis **401** |
| Clé statique (chemin Codex) | **200** |
| `stdio.mjs` | charge sans configuration OAuth, **0 référence** à `oauth.mjs` |
| `npm test` | **347 cas, 347 réussis** |
| Paquet | 39 fichiers, 194 101 octets, `sha256 ad169807…44e7533f`, construit deux fois à l'identique |

## 6 ter. Déploiement du correctif consolidé — `ed41658`

**Autorisé par Sébastien. Bascule à `2026-11-02T20:13:56Z`.**

| | |
|---|---|
| Image | `neomundi-measurement-mcp:ed41658` |
| Empreinte | `sha256:953d6aa49d50887bd9502e3188603a1b30d4d52be0bbe9d626ba8a5c27cde2fe` |
| Révision | `ed41658469aceec415e2f2bcf3e2b26de4d48c97` |
| Build | **287 cas dans l'image, 0 échec** (20 ignorés : les enregistrements que `.dockerignore` exclut) |

**Transfert par bundle Git, faute de pouvoir pousser.** Le credential GitHub a
disparu du gestionnaire du poste en cours de session. Un `git bundle` porte le
SHA et se vérifie de l'autre côté : empreinte et taille identiques à
l'arrivée, `git bundle verify` concluant, et `git rev-parse HEAD` rendant
exactement le SHA autorisé. **La branche n'est toujours pas sur `origin`.**

### Vérifié en production, après bascule

Le défaut corrigé, d'abord — `Origin` présente sur les endpoints protocole :

| Endpoint | sans `Origin` | `Origin: chatgpt.com` | `Origin: null` |
|---|---|---|---|
| `/oauth/token` | 401 `invalid_client` | **401** | **401** |
| `/oauth/register` | 201 | **201** | **201** |
| `/oauth/revoke` | 200 | **200** | **200** |

Et la route navigateur, qui reste stricte :

| `Origin` sur `/oauth/authorize` | Résultat |
|---|---|
| `https://mcp.neomundi.org` | **400** — atteint le gestionnaire |
| `null` · `https://chatgpt.com` · `http://mcp.neomundi.org` | **403** |

Page de connexion : `Referrer-Policy: same-origin`, CSP inchangée, destination
du code **affichée** (`https://chatgpt.com`), nom du client **marqué déclaré**.

Parcours complet, par le vrai chemin HTTPS :

```
1. register (Origin chatgpt.com) -> 201
2. authorize POST (Origin = page) -> 302 | state v2 | iss https://mcp.neomundi.org
3. token (Origin chatgpt.com)     -> Bearer | expires_in 3600 | scope measure
   aud https://mcp.neomundi.org/mcp | sub sebastien | epoch 1
4. wrong secret                   -> 401 | redirected: false
5. code replay                    -> invalid_grant
6. MCP initialize (OAuth)         -> 200 {"name":"neomundi-measurement-mcp-private","version":"0.3.0-rc.1"}
7. tools/list                     -> 1 outil: measure_execution
8. resources/read                 -> 19360 octets | text/html;profile=mcp-app
9. MCP initialize (cle statique)  -> 200 (chemin Codex)
10. revoke + jeton ensuite        -> 200 / 401
```

### Retour arrière, mis à jour

Deux cibles existent désormais, et **ce sont deux états différents** :

| Sauvegarde | Ramène à |
|---|---|
| `/root/neomundi-mcp-backup-20261102b` | **`b30d631`, OAuth actif** — l'état d'avant ce correctif |
| `/root/neomundi-mcp-backup-20261102` | **`da71f5d`, OAuth absent** — l'état d'avant OAuth |

```bash
sudo cp -p /root/neomundi-mcp-backup-20261102b/neomundi-mcp-docker.service /etc/systemd/system/
sudo cp -p /root/neomundi-mcp-backup-20261102b/neomundi-mcp.env /etc/neomundi-mcp.env
sudo systemctl daemon-reload && sudo systemctl restart neomundi-mcp-docker
```

Les images `ed41658`, `b30d631` et `da71f5d` sont toutes présentes sur le VPS.
**Ne pas lancer `docker image prune`.**

## 7. Ce qui n'a pas changé

- **Aucune modification de l'API ni de l'instrument.** `NEOMUNDI_API_KEY` est
  inchangée et reste la seule clé que l'instrument voit.
- **Aucune modification de Caddy.** Le `Caddyfile` est celui du 7 septembre.
- **Aucun calcul, seuil ou décision de mesure touché.**
- **La clé statique fonctionne**, donc Codex et tout client existant sont
  intacts.
- **Toute mesure ressort toujours `version_agreement: divergent`** : le
  connecteur est épinglé sur `3.3.0`, la production déclare `3.3.1`. C'est
  `D-8`, un arbitrage produit, et c'est ce qu'un utilisateur verra.

## 8. Ce qui reste ouvert

| # | Point | Qui |
|---|---|---|
| **O-4** | Vérification d'identité de l'organisation sur le tableau de bord | **Sébastien** |
| **O-5** | Jeton de défi de domaine, à publier sur `neomundi.org` *(pas sur l'hôte MCP, qui répond `401`)* | **Sébastien** |
| **O-6** | Origine dédiée de la carte (`_meta.ui.domain`), exigée pour soumettre avec interface | **Sébastien** |
| **O-7** | Basculer `mcp.json` en `streamable-http` + bloc `auth` — **maintenant possible** | une session |
| **O-8** | Si le plafond par participant est activé : **mettre à jour la page de confidentialité d'abord** | **Sébastien** |
| **O-9** | L'article 6 des CGU dit encore que la suspension est **collective**. Elle ne l'est plus. | **Sébastien** |

> **`O-9` est nouveau, et c'est une conséquence directe de ce déploiement.**
> Le service est désormais multi-utilisateur avec révocation unitaire — §4.2
> le prouve. Le texte publié décrit l'état d'avant. **Ne pas présenter le
> connecteur comme multi-utilisateur avant que l'article soit à jour.**

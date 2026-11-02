# Déploiement d'OAuth 2.1 sur `mcp.neomundi.org` — 2 novembre 2026

**Autorisé par Sébastien.** Bascule à **`2026-11-02T05:35:36Z`**.

> ## Ce qui tourne maintenant
>
> | | |
> |---|---|
> | Image | `neomundi-measurement-mcp:b30d631` |
> | Empreinte | `sha256:2c92de45737346622cd83b534fae8e189078d3f677d463eabd154f38eead43c9` |
> | Révision | `b30d6314a55689b19c4e02da8d19853cfd442180` |
> | OAuth | **actif** — issuer `https://mcp.neomundi.org`, ressource `https://mcp.neomundi.org/mcp` |
> | Participants | **2**, `sebastien` et `pilote-1`, tous deux `enabled`, `epoch` 1, portée `measure` |
> | Plafond par participant | **non configuré** — rien n'est retenu entre deux requêtes |
> | Retour arrière | **exercé**, pas seulement écrit — voir §5 |

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

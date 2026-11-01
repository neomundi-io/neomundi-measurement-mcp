# Déploiement HTTPS — `mcp.neomundi.org`

**Relevé du 2026-11-01**, établi par commande sur le serveur. Tout ce qui suit
est un **constat** ou une **procédure préparée** : rien n'a été déployé,
redémarré ni modifié sur la machine au cours de cette passe.

---

## 1. Le point d'entrée existe déjà, et il sert une version périmée

C'est le constat principal, et il change l'ordre des priorités.

### 1.1 Ce qui tourne

| | Observé |
|---|---|
Hôte | VPS Infomaniak, `ov-227532.infomaniak.ch`, Ubuntu 24.04.4 LTS, noyau 6.8, x86_64, **2 vCPU, 3,8 Gio, 58 Go** |
Accès | SSH par clé, utilisateur `ubuntu`, `sudo` sans mot de passe. `root` refusé explicitement par le serveur |
Service | `neomundi-mcp.service`, **actif depuis le 2026-10-25**, `Restart=on-failure`, `NoNewPrivileges=true` |
Exécution | `/usr/bin/node …/runtime/server.mjs`, écoute `127.0.0.1:8787` |
Secrets | `/etc/neomundi-mcp.env`, `-rw------- root root`, lu par `EnvironmentFile=`. Trois variables : `NEOMUNDI_API_KEY`, `NEOMUNDI_PROVIDER_API_KEY`, `NEOMUNDI_MCP_API_KEY` |
Proxy | **Caddy**, actif, `:80` et `:443`, HTTP/3 annoncé |
TLS | Let's Encrypt, `CN=mcp.neomundi.org`, valide jusqu'au **2026-12-06**, renouvelé par Caddy |
Pare-feu | `ufw` **inactif** |
Docker | **absent de la machine** (`docker.io` disponible dans APT, dépôt officiel non configuré) |
Mises à jour | **34 en attente**, dont une de sécurité ESM |

Le point d'entrée public répond : `POST https://mcp.neomundi.org/mcp` sans
credential renvoie **401** avec `WWW-Authenticate: Bearer realm="neomundi-private-mcp"`.
**Le transport HTTPS est donc acquis.** Ce n'était pas connu de la fiche de
reprise du dépôt, qui présentait l'hébergement comme inexistant.

### 1.2 Comment le `Host` passe aujourd'hui

```
mcp.neomundi.org {
    reverse_proxy 127.0.0.1:8787 {
        header_up Host 127.0.0.1:8787
    }
}
```

Caddy **réécrit** l'en-tête `Host` pour satisfaire la liste blanche du
connecteur, qui n'acceptait que la paire loopback. C'est un contournement
correct et il fonctionne. Depuis l'ajout de `NEOMUNDI_MCP_ALLOWED_HOSTS` il
n'est plus nécessaire, et le laisser ou le retirer est un choix — §4.3.

### 1.3 Ce que la version servie ne contient pas — le vrai problème

Le dépôt déployé est à **`0cbd369`, daté du 2026-09-07**, soit **32 commits
derrière `main`**. Le serveur se déclare en **`0.1.0`**.

Interrogé en local sur la machine, ce service expose bien `measure_execution`,
avec `inputSchema` et `outputSchema`. Mais les modules suivants sont **absents
du code servi**, vérifié fichier par fichier :

| Module | Présent en production |
|---|---|
`presentation.mjs` — la projection fidèle | **non** |
`guidance.mjs` — `reading_aid` | **non** |
`reference.mjs` — `measurement_reference`, accord et portée de divergence | **non** |
`integrity.mjs` — intégrité d'assemblage SSE | **non** |
`response-contracts.mjs` / `schema-validation.mjs` — validation de contrat | **non** |
`stdio.mjs` | **non** |

`adapter.mjs` en production ne mentionne **aucune** de ces clés d'enveloppe :
zéro occurrence de `presentation`, `reading_aid`, `measurement_reference`,
`contract_validation` et `integrity`.

**Conséquence, et elle est métrologique, pas cosmétique.** Ce sont exactement
les champs qui distinguent un `ALLOW` mesuré d'un `ALLOW` décidé sans aucun
contrôle, qui portent la cause de chaque signal non mesuré, et qui signalent
qu'une version divergente n'est pas comparable. **La carte de mesure ne peut
pas fonctionner contre cette version** : elle lit `presentation`, qui n'existe
pas là-bas.

> **Mettre à jour la production n'est donc pas une amélioration de confort.
> C'est la condition pour qu'un plugin ChatGPT affiche autre chose qu'une
> mesure dépouillée de ses garde-fous.**

---

## 2. Ce qui a été préparé

- **image Docker** construite et vérifiée localement, base épinglée **par
  digest d'index OCI**, suite hors-ligne exécutée **dans** l'image au moment du
  build (§3) ;
- **liste d'hôtes** configurable, qui rend la réécriture Caddy facultative ;
- **paquet ZIP** reproductible bit pour bit ;
- **procédure de bascule** ci-dessous, avec son retour arrière.

Rien de tout cela n'a été appliqué au serveur.

---

## 3. L'image Docker

```bash
docker build -t neomundi-measurement-mcp:0.3.0-rc.1 .
```

Propriétés vérifiées le 2026-11-01 :

| | Résultat |
|---|---|
Base | `node@sha256:8a32c8cf…`, **index OCI multi-plateforme** — pas un manifeste mono-architecture, qui casserait sur arm64 |
Dépendances | **aucune**. Pas de `npm install`, donc pas de chaîne d'approvisionnement au build |
Tests | la suite hors-ligne tourne **dans l'image**. Un build qui ne passe pas ses tests ne produit pas d'image |
Taille | 248 Mo |
Utilisateur | `node`, non privilégié ; `read_only`, `cap_drop: ALL`, `no-new-privileges` dans `compose.yaml` |
Reproductibilité | **les couches du système de fichiers sont identiques** d'un build à l'autre — digests de couche égaux, horodatage `created` identique |

**Limite honnête sur la reproductibilité.** Les couches sont identiques, mais
l'**identifiant d'image** diffère entre deux builds : la configuration de
l'image n'est pas encore bit-stable, et `SOURCE_DATE_EPOCH` ne suffit pas à
l'obtenir avec ce moteur. Ce qui est donc établi est *« même contenu »*, pas
*« même digest d'image »*. Citer un digest d'image comme preuve exige de
régler cela d'abord, ou de publier l'image une fois et de la référencer.

**Correction au passage.** `docker build` **échouait sur `main`** : les
fichiers de `PLUGIN_FILES` n'étaient pas copiés dans le contexte, et
`tests/plugin-package.test.mjs` échouait donc au build depuis le commit où ce
test est arrivé. L'image n'avait simplement pas été reconstruite depuis.

---

## 4. Bascule préparée — **non exécutée**

> **Aucune autorisation de déploiement n'est accordée par ce document.** Une PR,
> une CI verte ou une fusion n'autorise pas la production. Manal déploie, ou
> Sébastien ; l'agent ne déploie pas.

### 4.1 Deux stratégies, et laquelle choisir

| | `systemd` + Node (actuel) | Docker |
|---|---|---|
Déjà en place | **oui**, stable depuis 6 jours | non, Docker absent de la machine |
Changement requis | `git fetch` + `checkout` + `restart` | installer Docker, écrire une unité, publier un port |
Retour arrière | `checkout` du SHA précédent + `restart` | retag de l'image précédente |
Risque introduit | faible | installe un démon privilégié sur une machine à 2 vCPU |

**Recommandation : garder `systemd` + Node pour la bascule de version.**
L'image Docker reste l'artefact reproductible et portable, utile pour
reconstruire ailleurs et pour la revue, mais introduire Docker sur cette
machine n'est pas nécessaire pour servir `0.3.0-rc.1`, et la discipline du
chantier est de ne pas créer d'infrastructure sans nécessité démontrée.

### 4.2 Procédure, `systemd` + Node

Relever d'abord le SHA servi, pour pouvoir y revenir :

```bash
cd ~/neomundi-measurement-mcp
git rev-parse HEAD                 # noter cette valeur : c'est la cible du retour arriere
sudo systemctl is-active neomundi-mcp
```

Puis :

```bash
git fetch --prune
git checkout <SHA de la revision validee>
node --version                     # doit etre >= 24 : sinon le connecteur NE DEMARRE PAS
npm test                           # hors ligne, sans credential, sans appel amont
sudo systemctl restart neomundi-mcp
sudo systemctl status neomundi-mcp --no-pager
```

Vérifier **depuis l'extérieur**, sans secret dans la ligne de commande :

```bash
curl -s -o /dev/null -w '%{http_code}\n' -X POST https://mcp.neomundi.org/mcp \
  -H 'Accept: application/json, text/event-stream' -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"ping"}'          # attendu : 401
```

Puis, avec le credential fourni par l'environnement et **jamais** écrit dans
l'historique du shell, un `initialize` doit renvoyer `0.3.0-rc.1`, et
`resources/list` doit exposer `ui://neomundi-measurement/card-v1.html`.

**Retour arrière :** `git checkout <SHA releve>` puis
`sudo systemctl restart neomundi-mcp`. La version précédente ne dépend
d'aucune migration : il n'y a ni base de données, ni état persistant, ni
schéma à redescendre.

### 4.3 Caddy — ce qu'il faut décider, et ce qu'il ne faut pas casser

Deux configurations possibles une fois `0.3.0-rc.1` déployé :

**A. Ne rien changer.** `header_up Host 127.0.0.1:8787` continue de
fonctionner, `NEOMUNDI_MCP_ALLOWED_HOSTS` reste vide. **C'est le choix par
défaut, et il ne demande aucune action.**

**B. Retirer la réécriture** et nommer le domaine :

```
mcp.neomundi.org {
    reverse_proxy 127.0.0.1:8787
}
```

avec `NEOMUNDI_MCP_ALLOWED_HOSTS=mcp.neomundi.org` dans
`/etc/neomundi-mcp.env`. Le connecteur voit alors le vrai `Host`, ce qui est
plus lisible dans un diagnostic.

⚠ **Les deux changements vont ensemble.** Retirer la réécriture *sans* nommer
le domaine donne **403 `invalid_host` sur toutes les requêtes** ; nommer le
domaine sans retirer la réécriture est inoffensif. Dans le doute, faire B dans
cet ordre : d'abord la variable et un redémarrage du service, ensuite le
Caddyfile et `sudo systemctl reload caddy`.

---

## 5. Ce qui reste ouvert sur cette machine

| # | Point | Qui tranche |
|---|---|---|
**D-1** | **La bascule de version elle-même.** La production sert `0.1.0` sans les garde-fous métrologiques | **Sébastien**, sur un SHA |
**D-2** | **34 mises à jour système en attente**, dont une de sécurité | **Sébastien** |
**D-3** | **`ufw` inactif.** Seuls 22, 80 et 443 sont exposés aujourd'hui, mais rien ne le garantit | **Sébastien** |
**D-4** | **Un seul credential partagé** ouvre le point d'entrée, et **une seule** clé API NeoMundi est dépensée pour tous. Le rendre joignable depuis ChatGPT ne change pas cela | **Sébastien** — c'est le plus gros arbitrage restant |
**D-5** | **Aucune surveillance ni journalisation.** Le connecteur ne journalise rien, délibérément ; un service public en a généralement besoin, et chaque champ ajouté est une décision de confidentialité | **Sébastien** |
**D-6** | **Le certificat expire le 2026-12-06.** Caddy le renouvelle seul ; à surveiller une fois, pas à supposer | — |
**D-7** | Identifiant d'image Docker non bit-stable (§3) | une session |

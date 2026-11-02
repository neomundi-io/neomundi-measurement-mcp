# Déploiement HTTPS — `mcp.neomundi.org`

# 0. MISE EN SERVICE EFFECTUÉE — 2026-11-01

**`0.3.0-rc.1` est en production.** Autorisée par Sébastien, exécutée le
2026-11-01 entre 11:31 et 11:38 UTC. Les sections 1 à 5 qui suivent décrivent
l'état **antérieur** et restent comme relevé historique.

## 0.1 Empreintes

| | |
|---|---|
Révision déployée | **`da71f5d327da83247c5f4a69dfc1b6ea6e80f048`** — fusion de la PR #9, contrôles verts |
Révision précédente | `0cbd369ebc1192400b199fa3d5c794eb810b15e3` — version **`0.1.0`**, servie depuis le 2026-10-25 |
Image | **`sha256:a50a2679d18e488df303706aaa1e47f8eff0f5a4c8aa1bb8e598de6aa05eefe9`**, étiquetée `neomundi-measurement-mcp:da71f5d` |
Base de l'image | `node@sha256:8a32c8cf649a49915a66e81e7a609223c708d0adabf288ee3f4077d765542f85` (index OCI multi-plateforme) |
Suite **dans** l'image | **221 passés, 0 échec, 18 sautés** — les sautés sont le rejeu des enregistrements, absents de l'image par conception |
Docker | installé pour l'occasion : `29.1.3-0ubuntu3~24.04.2`, dépôt Ubuntu |

## 0.2 Ce qui a changé sur la machine

- **Docker installé** (`apt install docker.io`), activé au démarrage ;
- **clone neuf en `/opt/neomundi-mcp`** à `da71f5d`, utilisé comme source de
  construction. `~/neomundi-measurement-mcp` est **laissé intact à
  `0cbd369`** : c'est le chemin de retour arrière ;
- **nouvelle unité `neomundi-mcp-docker.service`**, activée, qui publie le
  conteneur sur `127.0.0.1:8787` **un pour un** ;
- **`neomundi-mcp.service` arrêté et désactivé**, son unité conservée ;
- **Caddy n'a pas été touché.** `header_up Host 127.0.0.1:8787` reste en place
  et continue de fonctionner, le port étant publié à l'identique. Une
  sauvegarde `/etc/caddy/Caddyfile.avant-0.3.0` a été prise.

Le conteneur tourne `--read-only`, `--cap-drop ALL`,
`--security-opt no-new-privileges`, avec `TimeoutStopSec=60` et
`docker stop -t 45` : une mesure en vol n'est jamais rejouée, donc on lui
laisse le temps de finir plutôt que de laisser son issue inconnue.

> **Choix assumé.** Ce document recommandait `systemd` + Node plutôt que
> Docker, Docker étant absent de la machine. Sébastien a demandé
> explicitement le déploiement par image. Les deux coexistent donc : le
> conteneur sert, le service Node reste armé comme retour arrière.

## 0.3 Vérifications, dans l'ordre où elles ont été faites

**Depuis l'Internet public :**

| Contrôle | Résultat |
|---|---|
Certificat | `CN=mcp.neomundi.org`, Let's Encrypt, valide jusqu'au **2026-12-06** |
`POST /mcp` sans credential | **401**, `WWW-Authenticate: Bearer realm="neomundi-private-mcp"` |
`POST /mcp` credential invalide | **401** |
En-têtes | `Server: Caddy`, `Alt-Svc: h3=":443"` |

**Via l'URL publique, authentifié** — donc à travers TLS, Caddy et le conteneur :

| Contrôle | Résultat |
|---|---|
`initialize` | protocole **`2025-06-18`**, `serverInfo.version` = **`0.3.0-rc.1`** |
Capacités | **`tools`** et **`resources`** |
`tools/list` | `measure_execution`, `title` présent, `outputSchema` présent, annotations exactes |
`_meta` | `ui.resourceUri` **et** `openai/outputTemplate` → `ui://neomundi-measurement/card-v1.html` |
`resources/read` | **19 360 octets**, `text/html;profile=mcp-app`, SHA-256 `a6b85945c4491e258fee50869eb6da91230c5e6fcdc12d04c97998e37b0a4424` |
Carte | **autonome** (aucune URL externe), **aucun `innerHTML`**, CSP déclarée vide |

## 0.4 Mesure réelle — la preuve de bout en bout

Un appel **réellement facturé**, mode `OBS` sur un échange déjà exécuté. Aucun
fournisseur appelé, donc aucune génération facturée côté fournisseur.

| | |
|---|---|
Horodatage | 2026-11-01T11:38:19Z |
Transport | **HTTP 200 en 1,84 s** |
`request_id` | **`2ca02f65-e2de-4f21-a35d-0e845329d4b2`** |
`adapter_error` | `null` |
Enveloppe | `presentation`, `reading_aid`, `measurement_reference`, `contract_validation`, `integrity` — **toutes présentes** |
Décision | `ALLOW`, fondement **`measured_thresholds`**, `decision_is_measured` **`true`** |
Mesure | `complete`, **3 contrôles tentés / 3 réussis / 3 émis**, couverture `1`, agrégats publiables |
Signaux mesurés | `stability_score`, `coherence_score`, `semantic_risk`, `factual_hallucination_score`, `semantic_instability_score` — **aucun non mesuré** |
Évaluateurs | `runtime_engine.process`, `embedding_detector.compute_coherence` (`nomic-embed-text`), `semantic_risk.moderate` (`llama-guard3:1b`) |
Validation de contrat | **`validated`** contre `govern-rest-1.0`, schéma SHA-256 `bcd5588e…` |
Empreinte de l'enveloppe | `41fa201ec84c0eb746cde0802305e357a2a755a7739f73b006efe86a0c224c20` |

**Aucun signal ni provenance n'a été modifié** : l'enveloppe a été lue, jamais
réécrite.

### Ce que cette mesure a révélé, et qui mérite une décision

**`version_agreement` vaut `divergent`.** Le déploiement déclare
`measurement_version` **`3.3.1`** tandis que le connecteur est épinglé sur
**`3.3.0`**. La carte affiche donc, correctement :

> « Versions de mesure divergentes : ce résultat n'est pas comparable aux
> autres. »

C'est le comportement voulu — `divergence_scope` **n'écrase jamais**
l'accord — et la portée publiée précise que, **sur le chemin REST, les deux
versions sont déclarées identiques** : une série REST peut donc être
poursuivie. Le bandeau est plus prudent que la portée. **Lever l'épinglage
vers `3.3.1` est un arbitrage produit, pas un correctif** (§5, D-8).

**Trois champs racine ne sont pas modélisés** par le connecteur, et la carte
les nomme au lieu de les cacher : `token_count_scope`, `token_count_unit`,
`stream_contract_metadata`. C'est une observation sur le contrat amont, à
remonter plutôt qu'à absorber.

## 0.5 Retour arrière — armé, vérifié, non déclenché

Vérifié après la bascule, sans rien basculer :

- unité `neomundi-mcp.service` **présente**, `inactive` / `disabled` ;
- dépôt de retour arrière **à `0cbd369`**, conforme ;
- `Caddyfile` inchangé, sauvegarde présente.

```bash
# Retour arriere vers 0.1.0, en deux commandes :
sudo systemctl disable --now neomundi-mcp-docker.service
sudo systemctl enable  --now neomundi-mcp.service
# Verifier :
sudo systemctl is-active neomundi-mcp.service
```

Il n'y a **ni base de données, ni état persistant, ni migration** : le retour
arrière est un échange de services, et rien d'autre.

---

**Relevé du 2026-11-01**, établi par commande sur le serveur. Les sections 1 à
5 décrivent l'état **avant** la mise en service du §0 et sont conservées comme
relevé historique.

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
**D-1** | ~~La bascule de version~~ — **faite le 2026-11-01**, §0. La production sert `0.3.0-rc.1` | — |
**D-8** | **Épinglage `3.3.0` face au `3.3.1` servi.** Toute mesure ressort `divergent`, et la carte la déclare non comparable — alors que la portée publiée dit le chemin REST identique. Lever l'épinglage est un **arbitrage produit**, pas un correctif | **Sébastien** |
**D-9** | **Trois champs racine non modélisés** remontés par la production : `token_count_scope`, `token_count_unit`, `stream_contract_metadata`. Observation sur le contrat amont | **chantier backend** |
**D-10** | **La portée de divergence s'affiche en bloc JSON brut** sur la carte — honnête, puisque rien n'est raccourci, mais difficile à lire. Mettre en avant son champ `summary` sans rien retirer serait une amélioration ; raccourcir serait une faute | une session |
**D-2** | **34 mises à jour système en attente**, dont une de sécurité | **Sébastien** |
**D-3** | **`ufw` inactif.** Seuls 22, 80 et 443 sont exposés aujourd'hui, mais rien ne le garantit | **Sébastien** |
**D-4** | **Un seul credential partagé** ouvre le point d'entrée, et **une seule** clé API NeoMundi est dépensée pour tous. Le rendre joignable depuis ChatGPT ne change pas cela | **Sébastien** — c'est le plus gros arbitrage restant |
**D-5** | **Aucune surveillance ni journalisation.** Le connecteur ne journalise rien, délibérément ; un service public en a généralement besoin, et chaque champ ajouté est une décision de confidentialité | **Sébastien** |
**D-6** | **Le certificat expire le 2026-12-06.** Caddy le renouvelle seul ; à surveiller une fois, pas à supposer | — |
**D-7** | Identifiant d'image Docker non bit-stable (§3) | une session |

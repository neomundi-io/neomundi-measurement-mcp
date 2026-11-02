# Connecter `mcp.neomundi.org` à ChatGPT — procédure exacte

**Écrit le 1er novembre 2026**, contre les exigences officielles lues ce
jour-là. Implémentation : [`OAUTH_IMPLEMENTATION_REPORT.md`](OAUTH_IMPLEMENTATION_REPORT.md).

> ## État au 2 novembre 2026 — **§1 et §2 sont FAITS**
>
> **`mcp.neomundi.org` parle OAuth 2.1 depuis le 2026-11-02T05:35:36Z.** La clé
> de signature est posée, deux participants existent, et le flux complet a été
> vérifié par le vrai chemin — voir
> [`OAUTH_DEPLOYMENT_RECORD_2026-11-02.md`](OAUTH_DEPLOYMENT_RECORD_2026-11-02.md).
>
> **Allez directement au §3.** C'est la seule partie qui demande vos mains :
> elle se passe dans ChatGPT, où personne ne peut se connecter à votre place.
> §1 et §2 restent ici comme référence et comme procédure de reprise.
>
> Votre code de participant est **`sebastien`**. Pour lire son secret, depuis
> le VPS :
>
> ```bash
> sudo cat /root/neomundi-mcp-backup-20261102/secret-sebastien
> ```

---

## 0. Ce qu'il faut avoir sous la main

| | |
|---|---|
| Accès SSH au VPS Infomaniak qui sert `mcp.neomundi.org` | |
| Un compte ChatGPT pouvant ajouter un serveur MCP personnalisé | les politiques d'espace de travail s'appliquent |
| Le SHA que vous autorisez à déployer | une PR ou une CI verte n'est **pas** une autorisation |

**Aucune modification de Caddy n'est nécessaire.** Vérifié le 2026-11-01 : le
proxy transmet déjà toutes les routes au serveur Node, y compris
`/.well-known/*` et `/oauth/*`. Les quatre routes répondront dès que l'image
tournera avec les variables de §1.

---

## 1. Préparer les deux secrets et le registre — **Sébastien**

### 1.1 La clé de signature

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Au moins 32 octets, sinon le serveur **refuse de démarrer**. Elle signe les
jetons **et** les `client_id`.

> **La changer invalide tous les jetons et toutes les inscriptions de
> clients.** C'est donc aussi le bouton d'arrêt d'urgence : la remplacer
> déconnecte tout le monde, immédiatement et sans exception.

### 1.2 Le registre des participants

Une entrée par participant :

```bash
printf '%s' "$SECRET_DU_PARTICIPANT" \
  | node scripts/participant-credential.mjs alpha --name "Atelier Alpha"
```

Sans entrée standard, un secret est généré et **affiché une seule fois sur la
sortie d'erreur**. Rassemblez les entrées :

```json
{ "version": 1, "participants": [ { …entrée… }, { …entrée… } ] }
```

Posez le fichier sur le VPS, par exemple `/etc/neomundi/participants.json`,
en `chmod 0444`. Il ne contient **aucun secret réversible**, mais c'est lui qui
décide qui entre.

> **Ne mettez jamais `NEOMUNDI_API_KEY` dans ce fichier.** C'est la clé
> technique qui appelle l'instrument ; elle n'a rien à voir avec l'identité des
> participants, et le serveur ne les mélange jamais.

### 1.3 Les variables

```
NEOMUNDI_MCP_PUBLIC_URL=https://mcp.neomundi.org
NEOMUNDI_OAUTH_SIGNING_KEY=<la clé de 1.1>
NEOMUNDI_OAUTH_REGISTRY=/etc/neomundi/participants.json
NEOMUNDI_MCP_ALLOWED_HOSTS=mcp.neomundi.org
```

Les **trois premières ou aucune** : une configuration partielle est refusée au
démarrage plutôt qu'à moitié activée. Laissez
`NEOMUNDI_OAUTH_QUOTA_PER_SUBJECT` **vide** — voir §6.

> ### La quatrième n'est pas optionnelle, et la raison est mesurée
>
> **Sans `NEOMUNDI_MCP_ALLOWED_HOSTS`, la soumission du formulaire
> d'identification est refusée avec `403 invalid_origin`.** Personne ne peut
> s'authentifier, et le symptôme ne ressemble pas à sa cause.
>
> Pourquoi. Caddy réécrit l'en-tête `Host` en `127.0.0.1:8787`, donc le
> contrôle d'hôte passe par la paire loopback — mais il **ne réécrit pas**
> `Origin`, et le navigateur envoie `Origin: https://mcp.neomundi.org`. Les
> origines acceptées sont dérivées de la paire loopback **et des hôtes
> explicitement nommés** ; sans nommer celui-ci, l'origine du navigateur n'est
> dans aucune des deux listes.
>
> La nommer ajoute `https://mcp.neomundi.org` aux origines acceptées. Cela
> ajoute aussi cet hôte à la liste des `Host` acceptés, ce qui est sans effet
> ici puisque Caddy en envoie un autre.
>
> Mesuré le 2026-11-02 contre le code déployé : `403 invalid_origin` sans la
> variable, requête traitée avec elle.

Et dans Compose, décommentez le montage, **en lecture seule, sur le fichier et
pas son dossier** :

```yaml
volumes:
  - /etc/neomundi/participants.json:/etc/neomundi/participants.json:ro
```

---

## 2. Déployer — **l'opération qui exige votre autorisation**

**C'est la seule chose de ce document qui modifie la production.** Elle n'est
pas couverte par une autorisation existante.

### 2.1 L'opération, mot pour mot

1. Construire l'image depuis le SHA que vous nommez.
2. Ajouter les trois variables de §1.3 à l'environnement du service.
3. Monter le registre en lecture seule.
4. Redémarrer le service `mcp`.

### 2.2 Le retour arrière, avant de commencer

Notez l'empreinte de l'image **actuellement servie** avant de la remplacer.
Le retour arrière est : remettre cette empreinte, retirer les trois variables,
redémarrer. **Rien dans ce changement ne touche la mesure**, donc un retour
arrière ne perd aucune donnée — il reprend l'état d'avant, où la clé statique
était le seul accès.

### 2.3 Vérifier après redémarrage, dans cet ordre

```bash
# 1. Les deux documents de découverte répondent SANS credential.
curl -s https://mcp.neomundi.org/.well-known/oauth-protected-resource   | head -c 400; echo
curl -s https://mcp.neomundi.org/.well-known/oauth-authorization-server | head -c 400; echo

# 2. Le défi 401 pointe vers les métadonnées.
curl -sI -X POST https://mcp.neomundi.org/mcp | grep -i www-authenticate

# 3. La clé statique marche toujours — la compatibilité Codex.
curl -s -o /dev/null -w "%{http_code}\n" https://mcp.neomundi.org/mcp \
  -X POST -H "Authorization: Bearer $NEOMUNDI_MCP_API_KEY" \
  -H "Accept: application/json, text/event-stream" -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"probe","version":"1"}}}'
```

Attendu : deux documents JSON, un en-tête portant
`resource_metadata="https://mcp.neomundi.org/.well-known/oauth-protected-resource"`
et `scope="measure"`, puis un `200`.

**Si `code_challenge_methods_supported` n'affiche pas `["S256"]`, arrêtez-vous
là** : sans ce champ, la plateforme considère le serveur comme non supporté, et
la suite ne peut pas aboutir.

---

## 3. Connecter dans ChatGPT — **à faire par Sébastien**

C'est la seule étape qui demande une intervention humaine.

| | Geste | Ce que vous devez voir |
|---|---|---|
| 1 | Ouvrir [`chatgpt.com/plugins`](https://chatgpt.com/plugins) | la page Plugins |
| 2 | Bouton **+** → **Add custom MCP server** | un formulaire de connexion |
| 3 | **Nom** : `NeoMundi Measurement`<br>**Description** : *Mesurer une exécution d'IA et lire ce qui a réellement été mesuré.* | |
| 4 | **Connection** : URL **`https://mcp.neomundi.org/mcp`** — avec le chemin `/mcp` | |
| 5 | **Authentication** : choisir **OAuth** | **aucun secret client à saisir** : ChatGPT s'inscrit seul par DCR, et le serveur n'émet pas de secret |
| 6 | Lire l'avertissement de risque → **I understand and want to continue** | |
| 7 | **Create as a plugin** | |
| 8 | ChatGPT ouvre **la page d'autorisation NeoMundi** | titre « Autoriser l'accès à la mesure NeoMundi », et un tableau disant **Client demandeur : ChatGPT** |
| 9 | Saisir **`sebastien`** et le secret lu plus haut | retour automatique vers ChatGPT |
| 10 | Relire les outils découverts | **un seul**, `measure_execution` |
| 11 | Installer le plugin, puis ouvrir l'onglet **Work** | |
| 12 | Nouvelle conversation, taper `@` et choisir le plugin | |

> **Si l'étape 8 n'affiche pas « ChatGPT » comme client demandeur,
> arrêtez-vous.** La page nomme le client qui demande ; un autre nom veut dire
> que vous n'êtes pas sur la demande que vous croyez.

### Première mesure, et ce qu'il faut relever

> *Mesure cette exécution avec NeoMundi : prompt « Quelle est la capitale de la
> Suisse ? », réponse « Berne est la ville fédérale de la Suisse. », 14 jetons,
> 840 ms de latence.*

| À relever | Pourquoi |
|---|---|
| Le `request_id` | il doit se retrouver côté API |
| La décision **et son fondement**, côte à côte | c'est la propriété centrale de la carte |
| Le bandeau **« Versions de mesure divergentes »** | **attendu** : `D-8`, le connecteur épingle `3.3.0`, la production déclare `3.3.1` |
| Les signaux **non mesurés**, avec leur cause | ils doivent dire *non publié*, jamais zéro |
| L'affichage de la carte | personne ne l'a encore vue dans ChatGPT |

> **Rien de ce qui précède n'a été vérifié dans ChatGPT.** Le flux OAuth l'a
> été par le vrai chemin HTTPS, et la carte dans un navigateur local. Tant que
> l'étape 12 n'a pas tourné, **ne pas écrire que le plugin fonctionne dans
> ChatGPT**.

---

## 4. Les huit cas à rejouer depuis ChatGPT

Les textes sont déjà dans `plugin.json`, sous
`extensions.com.openai.review.test_cases`. Les rejouer **dans ChatGPT**, pas
dans un client local, et capturer chacun.

**Cinq positifs** : mesure complète · mesure contre un document source ·
signal non mesuré avec sa cause · versions divergentes déclarées non
comparables · explication de ce que chaque signal mesure.

**Trois négatifs** : un `ALLOW` décidé **sans aucun contrôle**, déclaré comme
tel · une erreur amont classée transport, **sans mesure fabriquée ni relance** ·
une demande de verdict, **refusée comme telle**.

> **Attendez-vous à voir le bandeau de divergence sur chaque mesure.** Le
> connecteur est épinglé sur `3.3.0` et la production déclare `3.3.1` : toute
> mesure ressort `version_agreement: divergent`. C'est `D-8`, un arbitrage
> produit, pas un défaut — et c'est ce qu'un utilisateur voit réellement
> aujourd'hui.

---

## 5. Révoquer, suspendre, tourner

Le registre est `/etc/neomundi/participants.json` sur le VPS (`0444`, `root`).
Il contient aujourd'hui **`sebastien`** et **`pilote-1`**, tous deux actifs.
Les quatre premières lignes ci-dessous ont été **exercées en production** le
2026-11-02 : voir le §4.2 du registre de déploiement.

| Geste | Comment | Effet |
|---|---|---|
| Suspendre un participant | `"enabled": false` dans le registre | immédiat, jetons déjà émis compris |
| Tourner ses jetons sans lui retirer l'accès | incrémenter son `"epoch"` | immédiat |
| Lui retirer le droit de mesurer | vider ses `"scopes"` | immédiat, `403` |
| Déconnecter **tout le monde** | changer `NEOMUNDI_OAUTH_SIGNING_KEY` | immédiat, inscriptions de clients comprises |

**Aucun redémarrage n'est nécessaire** pour les trois premiers : le registre
est relu à chaque vérification.

`POST /oauth/revoke` existe et répond `200` quoi qu'il arrive, comme la RFC
l'exige — mais sa liste est **en mémoire** et ne survit pas à un redémarrage.
**La révocation durable passe par le registre.**

---

## 6. Le plafond par participant, et l'ordre à respecter

`NEOMUNDI_OAUTH_QUOTA_PER_SUBJECT` plafonne les appels **par participant**. Un
dépassement dit pourquoi, ne fabrique aucune mesure et n'appelle pas
l'instrument.

> **Laissé vide, aucun compteur n'existe.** La politique de confidentialité
> publiée dit : « *Connecteur MCP : aucune conservation* ». Activer le plafond
> rend cette phrase fausse.
>
> **Mettez la page à jour d'abord, activez ensuite.** L'inverse publierait une
> affirmation fausse — c'est la même règle d'ordre que `P1-4`.

---

## 7. Après la connexion : ce qui reste pour la candidature

1. Basculer `mcp.json` en `streamable-http` avec le bloc `auth`. **Le bloc
   exact est figé** dans `tests/manifest-schema.test.mjs` ; il déclare
   `type: "oauth"`, `client.mode: "dcr"` et `registrationUrl`.
   *(Attention : ce bloc rend `mcp.json` invalide contre le schéma portable
   Agent Plugins, qui ferme chaque variante de serveur. Les deux sources sont
   normatives et se contredisent ; le conflit est documenté et le test
   l'explicite.)*
2. Captures des huit cas, prises **dans ChatGPT**.
3. Vidéo de démonstration → `review.demo_recording_url`.
4. Compte de démonstration pour le relecteur : identifiant et mot de passe,
   **sans MFA**, saisis dans le formulaire sécurisé du tableau de bord —
   **jamais dans le paquet**, qui rejette `test_credentials`.
5. Origine dédiée de la carte (`_meta.ui.domain`), exigée pour soumettre un
   plugin avec interface.
6. Vérification d'identité de l'organisation, et défi de domaine publié sur
   `neomundi.org`.

---

## 8. Si ça ne marche pas

| Symptôme | Cause la plus probable |
|---|---|
| **`403 invalid_origin` en validant le formulaire** | `NEOMUNDI_MCP_ALLOWED_HOSTS` n'est pas renseignée — voir §1.3 |
| ChatGPT ne propose pas OAuth | les métadonnées ne sont pas servies : vérifier §2.3 étape 1 |
| « serveur non supporté » | `code_challenge_methods_supported` n'annonce pas `S256` |
| `invalid_client` à la connexion | la clé de signature a changé depuis l'inscription du client. Reconnecter le serveur dans ChatGPT |
| La page d'autorisation refuse tout | le registre est absent, illisible ou mal formé — il refuse alors **tout le monde**, délibérément |
| `403` après une connexion réussie | le participant n'a plus la portée `measure` |
| `401` sur **toutes** les routes, y compris la découverte | le service tourne encore **sans** les trois variables : OAuth est désactivé |
| Le défi de domaine échoue | il est servi depuis l'hôte MCP, qui répond `401`. **Le publier sur `neomundi.org`**, parent éligible |

**Ne pas, jamais** : mettre le jeton dans `headers` du manifeste (la soumission
publique rejette les en-têtes de serveur non vides), ni déclarer le serveur
`type: "none"`, ni exposer la clé de signature ou un secret de participant dans
un journal, une capture ou le dépôt.

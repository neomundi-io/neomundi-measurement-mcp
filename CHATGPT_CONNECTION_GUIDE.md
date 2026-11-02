# Connecter `mcp.neomundi.org` à ChatGPT — procédure exacte

**Écrit le 1er novembre 2026**, contre les exigences officielles lues ce
jour-là. Implémentation : [`OAUTH_IMPLEMENTATION_REPORT.md`](OAUTH_IMPLEMENTATION_REPORT.md).

> **État : rien de ceci n'a été fait.** Le code est écrit et testé ; le serveur
> hébergé **ne parle pas encore OAuth**, parce qu'il n'a pas été déployé et que
> le déploiement exige votre autorisation. Les étapes ci-dessous sont à
> exécuter **dans cet ordre** ; §1 et §2 sont à vous, §3 et §4 se font une fois
> §2 fait.

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
```

Les **trois ou aucune** : une configuration partielle est refusée au démarrage
plutôt qu'à moitié activée. Laissez `NEOMUNDI_OAUTH_QUOTA_PER_SUBJECT` **vide**
— voir §6.

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

## 3. Connecter dans ChatGPT — intervention humaine

1. Ouvrir **ChatGPT → Plugins** (`chatgpt.com/plugins`).
2. Bouton **+**, puis **Add custom MCP server**.
3. **Nom** : `NeoMundi Measurement`. **Description** : *Mesurer une exécution
   d'IA et lire ce qui a réellement été mesuré.*
4. **Connection** : point d'entrée public, URL **`https://mcp.neomundi.org/mcp`**
   — avec le chemin `/mcp`.
5. **Authentication** : choisir **OAuth**. ChatGPT lit les métadonnées, trouve
   `registration_endpoint`, et s'inscrit tout seul par DCR. **Aucun secret
   client à saisir** : le serveur n'en émet pas.
6. Lire l'avertissement de risque, puis **I understand and want to continue**.
7. **Create as a plugin**.
8. ChatGPT ouvre la page d'autorisation NeoMundi. Saisir **le code de
   participant et le secret** de §1.2. *(C'est l'écran capturé dans
   `captures/oauth-page-autorisation.jpg`.)*
9. Relire les outils découverts : il doit y en avoir **un**,
   `measure_execution`.

### Ce qu'il faut consigner à ce moment-là

| À relever | Pourquoi |
|---|---|
| L'outil est-il découvert, et un seul ? | découverte des outils |
| L'écran d'autorisation s'affiche-t-il, et dit-il « ChatGPT » comme client ? | authentification individuelle |
| Le `request_id` de la première mesure | il doit se retrouver côté API |
| La carte s'affiche-t-elle, et avec quels bandeaux ? | interface graphique |
| Les signaux non mesurés disent-ils *non publié* **avec leur cause** ? | la propriété centrale |

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

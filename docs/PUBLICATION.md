# Connexion à ChatGPT, et procédure de publication

**Écrit le 2026-11-01.** Les exigences de plateforme citées ont été lues ce
jour-là sur `developers.openai.com/plugins`. **Elles changent sans préavis :
les revérifier au moment de la soumission, et ne jamais les déduire de ce
document.**

Deux choses très différentes sont décrites ici, dans l'ordre :

1. **brancher le plugin en privé** — faisable, c'est la priorité ;
2. **le publier** — soumis à l'accord de Sébastien, et encore bloqué.

---

## 1. Les trois formes de livraison

| Forme | Transport | Ce qu'il faut | État |
|---|---|---|---|
**A. Plugin local** (Codex, Claude Desktop…) | stdio | le ZIP, Node 24+, les clés dans l'environnement | **prêt** |
**B. Connecteur ChatGPT privé** | Streamable HTTP | un point d'entrée HTTPS public | **le point d'entrée existe**, mais sert une version périmée |
**C. Plugin publié** | Streamable HTTP | revue de la plateforme | **bloqué** — §4 |

---

## 2. A — installer le plugin local

```bash
node scripts/build-package.mjs          # produit dist/neomundi-measurement-<version>.zip
```

Le paquet est **reproductible bit pour bit** : deux constructions du même
commit donnent le même SHA-256. Il contient 38 fichiers — code d'exécution,
schémas, guides, icônes, et un `SHA256.txt` qui couvre chacun. Il ne contient
**ni test, ni enregistrement, ni `.env`, ni credential** : la liste est une
liste blanche explicite, et une entrée manquante fait échouer la construction
au lieu de produire un paquet incomplet.

Vérifier un paquet reçu :

```bash
python3 -c "import zipfile;print(zipfile.ZipFile('dist/neomundi-measurement-0.3.0-rc.1.zip').testzip() or 'CRC OK')"
```

Puis extraire, et fournir les clés **par l'environnement** — jamais dans un
fichier du paquet, jamais en argument d'outil :

```bash
export NEOMUNDI_API_KEY=...            # la clé NeoMundi
export NEOMUNDI_MCP_API_KEY=...        # le credential d'entrée, ignoré en stdio
node runtime/stdio.mjs
```

`mcp.json` déclare déjà l'entrée stdio avec `${PLUGIN_ROOT}`, donc un hôte qui
lit un plugin portable n'a rien à écrire à la main.

**Vérification en une commande**, sans réseau et sans quota :

```bash
printf '%s\n' \
 '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"t","version":"1"}}}' \
 '{"jsonrpc":"2.0","method":"notifications/initialized"}' \
 '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' \
 '{"jsonrpc":"2.0","id":3,"method":"resources/list"}' | node runtime/stdio.mjs
```

Attendu : `0.3.0-rc.1`, l'outil `measure_execution`, et la ressource
`ui://neomundi-measurement/card-v1.html`.

---

## 3. B — brancher le connecteur privé dans ChatGPT

### 3.1 Avant de brancher quoi que ce soit

**La production sert `0.1.0`**, sans `presentation`, sans `reading_aid`, sans
`measurement_reference`, sans validation de contrat. La carte de mesure lit
`presentation` : **branchée sur la version actuellement déployée, elle
n'affichera pas de mesure.** La bascule décrite dans
[le déploiement HTTPS](DEPLOIEMENT_HTTPS.md) §4 est donc un **préalable**, pas
une amélioration.

### 3.2 Le branchement

Côté plateforme, le chemin documenté est : *Plugins → ajouter un serveur MCP
personnalisé → nom, URL, méthode d'authentification*, puis acceptation de
l'avertissement de risque. L'URL est :

```
https://mcp.neomundi.org/mcp
```

L'authentification actuelle est un **credential statique partagé** présenté en
`Authorization: Bearer`. La plateforme documente `none`, `oauth`, `api_key` et
`mixed` ; le cas `api_key` est celui qui correspond, et il reste à déclarer
dans `mcp.json` sous `extensions["com.openai"].auth` — ce bloc **n'existe pas
encore**, parce que sa forme exacte n'a pas été vérifiée contre le schéma
officiel et qu'une valeur inventée ici serait pire qu'un champ absent.

### 3.3 Ce que ce branchement ne donne pas

Un credential partagé ouvre le serveur **pour tout le monde**, et **une seule**
clé API NeoMundi est dépensée derrière. Il n'y a ni identité par utilisateur,
ni révocation, ni périmètre, ni attribution d'usage. C'est acceptable pour un
essai privé mené par l'association ; **ce n'est pas un connecteur
multi-utilisateur**, et cela ne doit pas être présenté comme tel.

---

## 4. C — publier : ce qui est prêt, ce qui bloque

### 4.1 Prêt

| Exigence | État |
|---|---|
Streamable HTTP sur `/mcp`, HTTPS, domaine public | **oui** — certificat Let's Encrypt valide |
`structuredContent` + `content` | **oui** |
`outputSchema` quand la sortie est structurée | **oui** |
Titre lisible de l'outil | **oui** |
Annotations de sûreté **exactes** | **oui** — `readOnlyHint: false` est le bon choix : un appel débite un quota et écrit un évènement d'usage. Une annotation inexacte est un motif de rejet déclaré |
Interface personnalisée (MCP Apps) | **oui** — ressource `ui://`, type `text/html;profile=mcp-app`, CSP déclarée **vide** parce que la carte ne charge rien |
Pas de secret ni de PII en retour d'outil | **oui** — une charge contenant un credential configuré est retenue **entière** plutôt que réécrite |
Nom en kebab-case, limites de longueur | **oui**, et tenus par un test |
Icône carrée ≥ 48 px | **oui** — 512/256/128/48, dérivées de la marque |
Politique de confidentialité | **oui** — `https://neomundi.org/politique-de-confidentialite` |
Site et support | **oui** — `https://neomundi.org`, `https://neomundi.org/contact` |

### 4.2 Bloquant

| # | Manque | Qui le lève |
|---|---|---|
**P-1** | **La production sert `0.1.0`.** Publier cela publierait une mesure sans ses garde-fous | **Sébastien** — §3.1 |
**P-2** | **Conditions générales inexistantes.** `termsOfServiceURL` est demandé à la soumission. Neomundi Recherche publie des mentions légales et une politique de confidentialité, **pas** de CGU. Le champ est **volontairement absent** du manifeste, et un test échoue si quelqu'un l'invente | **Sébastien** |
**P-3** | **La politique de confidentialité doit couvrir ce que l'outil retourne.** Retourner des données non déclarées dans la politique est un motif de rejet explicite. Elle n'a jamais été relue face au contenu de l'enveloppe | **Sébastien** |
**P-4** | **Vérification d'identité de l'organisation** sur le tableau de bord de la plateforme, sous le nom de publication. État inconnu depuis ce dépôt | **Sébastien** |
**P-5** | **Défi de vérification de domaine** pour `mcp.neomundi.org` | une session, après P-1 |
**P-6** | **Bloc `auth` dans `mcp.json`**, forme à vérifier sur le schéma officiel | une session |
**P-7** | **Imbrication de `extensions.com.openai`** : le dépôt place les champs sous `interface`, la documentation lue les décrit à plat. Les deux ne peuvent être vraies ; aucune n'a été validée contre le schéma | une session |
**P-8** | **Cinq cas de test positifs et trois négatifs**, une **vidéo** de démonstration, une URL accessible au relecteur, un **compte de test sans MFA**, des notes de version | une session, après P-1 et P-4 |
**P-9** | **Capture d'écran** de la carte, à produire depuis une charge **synthétique** — pas depuis un enregistrement réel, qui est une donnée d'exécution tenue hors du dépôt | une session |
**P-10** | **Multi-utilisateur** : identité, clés par utilisateur, révocation, attribution d'usage. Non requis pour un essai privé, requis dès qu'un tiers l'utilise | **Sébastien** |

### 4.3 Les trois cas négatifs sont déjà écrits, en substance

C'est l'endroit où ce connecteur est plus défendable que la moyenne, et les
trois cas sortent directement de la suite de tests :

1. un `ALLOW` décidé **sans aucun contrôle** — la carte le déclare en toutes
   lettres et ne le rend pas comme un `ALLOW` mesuré ;
2. une **version divergente** — le résultat est déclaré non comparable ;
3. une **erreur amont** — classée comme transport, et **aucune mesure n'est
   fabriquée**, aucune relance n'est tentée.

---

## 5. Règles qui ne bougent pas

- **Ne pas publier** sans l'accord explicite de Sébastien.
- **Ne pas déployer** sur l'infrastructure sans autorisation distincte, sur un
  SHA. Une PR, une CI verte ou une fusion n'autorise pas la production.
- **Ne pas inventer** une URL de politique, une provenance ou un palier de clé
  pour satisfaire un formulaire : une URL qui ne résout pas est un motif de
  rejet, et une politique affirmée mais inexistante est pire que son absence.
- **Ne pas publier les enregistrements** pour verdir un compte de tests.

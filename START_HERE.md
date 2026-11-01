# ACCEPTATION DES CGU — mécanisme arrêté, 1er novembre 2026

**Cette section prime sur toutes les suivantes. Aucune page WordPress
modifiée, aucun document publié, API et moteur de mesure non modifiés.**

## Le constat qui change la mission

**Les pages de CGU ne sont pas en ligne.** Vérifié par l'API WordPress : **33
pages publiées**, aucune relative aux conditions d'utilisation, et **aucune
modification après le 15 octobre**. Si elles existent, elles sont en
**brouillon** — l'API ne montre que le publié. **Leur contenu n'a donc pas pu
être vérifié.**

En revanche `/politique-de-confidentialite`, `/en/privacy-policy`,
`/mentions-legales` et `/en/legal-notice` répondent bien `200`.

## Le mécanisme d'acceptation — B-1 est levé

**Principe : l'accès est délivré en échange d'une acceptation écrite, et
l'acceptation désigne un texte identifiable par son empreinte SHA-256.**

Aucune infrastructure : ni compte, ni base, ni formulaire en ligne, ni case à
cocher. Un échange de courriels et un fichier.

| Document | Rôle |
|---|---|
[Mécanisme et preuve](legal/ACCEPTATION_CGU.md) | procédure en trois étapes, registre, retrait, changement de version |
[Modèle FR](legal/MODELE_ACCEPTATION_FR.md) · [EN](legal/MODELE_ACCEPTATION_EN.md) | formulaire à renvoyer |
[`legal/cgu-versions.json`](legal/cgu-versions.json) | registre des versions, **épinglées par empreinte** |
`scripts/cgu-fingerprint.mjs` | calcule et vérifie les empreintes |

**Preuve de consentement — quatre champs, et rien de plus :** identité du
signataire, date, **version et empreinte** acceptées, méthode. Pas d'adresse
personnelle, pas de pièce d'identité, pas d'IP, pas de traceur.

> **Pourquoi l'empreinte évite de collecter davantage.** Sans elle, prouver
> *quel* texte a été accepté obligerait à archiver une copie du document chez
> chaque participant. Une chaîne de 64 caractères remplace cela.

## Une garde qui refuse de s'exécuter trop tôt

```bash
node scripts/cgu-fingerprint.mjs
# → « Aucune version acceptable aujourd'hui : aucune acceptation ne doit
#     être recueillie. »
```

Tant que les CGU sont un **projet non publié**, l'outil **refuse** de désigner
une version acceptable, et le modèle d'acceptation porte le même avertissement.
Cinq tests (`tests/cgu-versions.test.mjs`) échouent si une empreinte ne
correspond plus à son fichier — et **la bonne réaction n'est jamais de
corriger l'empreinte**, mais de créer une version.

## CGU passées en 0.4

L'article 4 portait un `[À COMPLÉTER]` sur le mécanisme ; il est désormais
rédigé, en FR et EN. Modifier le texte change son empreinte : j'ai donc
**appliqué la règle du registre** et bumpé 0.3 → **0.4** plutôt que de
corriger une empreinte. La 0.3 n'a jamais été publiée ni acceptée.

## Ce qu'il reste pour rendre le mécanisme utilisable

1. **Valider et publier les CGU** — le mécanisme est prêt, le texte ne l'est
   pas ;
2. renseigner `url_publiee` et `date_entree_en_vigueur`, puis passer
   `acceptable` à `true` ;
3. **fixer la durée de conservation** du registre d'acceptations ;
4. créer le registre à son emplacement définitif, **hors de ce dépôt public**.

---

# DOSSIER JURIDIQUE — projets rédigés, 1er novembre 2026

**Cette section prime sur toutes les suivantes. Aucun document n'est publié
ni signé. API, moteur de mesure et production : non modifiés.**

Tout est dans **[`legal/`](legal/README.md)** — huit documents, versionnés.

## Ce qui est rédigé

| Livrable | État |
|---|---|
[CGU FR](legal/CGU_MCP_FR.md) · [EN](legal/CGU_MCP_EN.md) | **V0.3** — reprend la structure de la V0.1, change l'entité, le droit applicable et le mode d'accès |
[Politique de confidentialité FR](legal/POLITIQUE_CONFIDENTIALITE_MCP_FR.md) · [EN](legal/PRIVACY_POLICY_MCP_EN.md) | **V0.1** — **sept traitements** détaillés |
[Convention pilote FR](legal/CONVENTION_PILOTE_FR.md) | **V0.1** |
[Licence d'exploitation FR](legal/LICENCE_EXPLOITATION_ASSOCIATIVE_FR.md) | **V0.2** — reprend le projet V0.1 du fondateur |
[Annexe de périmètre des droits](legal/ANNEXE_PERIMETRE_DROITS.md) | **V0.1** — **incomplète par construction** |
[Décisions ouvertes](legal/DECISIONS_OUVERTES.md) · [Checklist](legal/CHECKLIST_PUBLICATION.md) | — |

## Deux choses manquaient, et il faut le savoir

**Il n'existe pas de CGU V0.2.** Recherché sur Drive, sur le disque et dans le
dépôt : seule la **V0.1 « ControlTower / Louis M Sàrl »** existe. Le texte
transmis sous ce nom était en réalité le **projet de licence d'exploitation**,
repris comme base de la Phase 4. La CGU V0.3 part donc de la **V0.1 + les
audits**, sans repartir de zéro.

**Les statuts n'ont pas pu être lus.** L'archive `ASSOCIATION.zip` fournie le
2026-11-01 fait **122 octets et ne contient qu'un dossier vide**. Les pouvoirs
de signature sont donc des **champs à compléter**, et **aucun n'est présumé**.

## Les cinq bloquants réels

| # | Bloquant | Effet |
|---|---|---|
**A-1** | **Aucune durée de conservation n'est configurée** | La politique ne peut pas être publiée comme conforme |
**A-4 / A-5** | **DPA Infomaniak** au nom de l'association, et **ce qu'Infomaniak conserve** | Seul point où du contenu sort de nos machines |
**B-1** | **Aucun mécanisme d'acceptation des CGU** | **Opposabilité non établie** — et c'est le bloquant le plus simple à lever |
**C-1 / C-2** | **Annexe de périmètre vide** et **statuts non lus** | La licence **ne peut pas être signée** |
**O-1** | **La politique publiée ne couvre pas le MCP** | **Motif de rejet explicite** de la plateforme |

## Un point que la décision d'entité n'a pas réglé

Le fondateur accorde une licence **sans transfert de propriété** — c'est noté
et appliqué partout. Mais **le service tourne depuis le 2026-10-25**, soit
avant que la licence n'existe. L'article 3 de la licence **couvre
explicitement l'exploitation déjà engagée** plutôt que de laisser une période
non couverte.

Et le **conflit d'intérêts** fondateur / association est traité à l'article 12,
avec abstention et signature par une autre personne habilitée : une convention
signée des deux côtés par la même personne serait fragile.

## Prochaine action

**Lever B-1** — décider comment les CGU sont acceptées. Une décision, aucune
infrastructure, et l'opposabilité est acquise. Puis **lire les statuts**, qui
débloquent la signature de la licence.

---

# CLÔTURE JURIDIQUE — traitement en aval mesuré, 1er novembre 2026

**Cette section prime sur toutes les suivantes. Production non modifiée,
moteur de mesure non modifié, aucun texte juridique publié.**

**Entité éditrice tranchée : Neomundi Recherche, association loi 1901.**

## Le fait qui corrige une conclusion précédente

L'audit de la veille concluait, sur la foi d'un relevé antérieur, que **ni le
prompt ni la réponse** n'étaient conservés. **La moitié est fausse.**

| | Vérifié par requête sur la base de production |
|---|---|
**L'invite** | **jamais conservée** — seule sa longueur l'est |
**La réponse** | **des extraits verbatim sont conservés** dans `quality.suspect_phrases` |

Le code déployé l'instruit explicitement : *« VERBATIM substrings copied
EXACTLY from RESPONSE »*, jusqu'à 5 extraits, quand le score de factualité
dépasse 0,3. **21 870 lignes sur 338 578 (6,5 %)** en portent, 498 caractères
en moyenne, **chaque mois depuis mai 2026**.

> **Écrire « aucun contenu client n'est conservé » serait faux.** C'est le
> genre d'erreur qu'il vaut mieux trouver ici que dans une réclamation.

## Conservation réellement configurée

| Donnée | Durée |
|---|---|
Mesures en base, **extraits compris** | **indéfinie** — aucune purge, aucun cron, aucun script |
Sauvegardes de la base | **14 jours** (`pg_dump` nocturne + `-mtime +14 -delete`) |
Journaux nginx (IP, User-Agent) | **14 jours** |
Journaux conteneurs et `journald` | **indéfinie** — aucune rotation |
Côté **connecteur MCP** | **aucune** — confirmé |

## Prestataires — un seul, et deux faux positifs écartés

**Infomaniak est le seul prestataire externe d'une mesure** : il héberge les
serveurs **et** fournit le modèle de factualité (`api.infomaniak.com`,
`mistral24b`). **Trois signaux sur cinq ne quittent jamais le serveur** —
Ollama tourne en conteneur local.

- **« openai » dans les journaux n'est pas OpenAI** : c'est le dialecte
  compatible OpenAI *d'Infomaniak*. **Ne pas l'inscrire comme sous-traitant.**
- **« cohere » en base est la sous-chaîne de `co·here·nce_score`.** Configuré
  n'est pas appelé.

**Hébergement : Suisse** (RDAP : `CH-INFOMANIAK-20250220` et
`INFOMANIAK-CLOUD`, pays `CH`) — donc **hors UE** pour une association
française. À énoncer, pas à supposer.

## Livrable

[Rapport aval](MCP_DOWNSTREAM_DATA_REPORT.md) — faits vérifiés avec preuves,
**sept inconnues** restantes, et les **formulations proposées en FR et EN**
pour la politique de confidentialité, les CGU et les mentions légales.

## Les quatre décisions qui restent

| # | Décision | Pourquoi elle commande le reste |
|---|---|---|
**I-4** | **Garder, tronquer ou supprimer `suspect_phrases`** | C'est le **seul** mécanisme de persistance de contenu client. Le trancher simplifie ou alourdit tout le corpus |
**I-3** | **Fixer une durée de conservation** | Aujourd'hui aucune n'est configurée ; un texte ne peut pas promettre ce qui n'existe pas |
**I-1 / I-2** | **DPA Infomaniak**, et **ce qu'Infomaniak conserve** du contenu envoyé à son IA | Seul point où du contenu client sort de nos machines |
**P-E** | **Droit de l'association d'exploiter l'instrument** | La décision d'entité **augmente** son exposition : elle est éditeur sans licence écrite |

---

# AUDIT PRÉPUBLICATION CGU — 1er novembre 2026

**Cette section prime sur toutes les suivantes. Aucun code n'a été modifié,
rien n'a été publié, et l'infrastructure n'a pas été touchée.**

## Le constat qui commande tout

**Le brouillon de CGU ne décrit pas ce service.** Il porte sur **ControlTower**,
opéré par **Louis M Sàrl** (société suisse, Morges), en droit suisse, pour des
**clients professionnels sous contrat**. Le connecteur MCP est déclaré édité
par **Neomundi Recherche** (association loi 1901, Paris), **gratuit, sans
compte ni contrat**, sur `mcp.neomundi.org` — point d'accès que le brouillon ne
mentionne nulle part.

Tant que l'entité éditrice n'est pas tranchée, **aucun article ne peut être
finalisé**.

## Les trois audits

1. [Traitement des données](MCP_DATA_PROCESSING_AUDIT.md) — ce qui est reçu,
   envoyé, journalisé, conservé ;
2. [Accès et limites](MCP_ACCESS_POLICY.md) — authentification, quotas,
   suspension, abus, coûts ;
3. [Propriété intellectuelle](MCP_IP_LICENSE_AUDIT.md) — licences, marque,
   dépendances ;
4. [Matrice de conformité](CGU_CONFORMITE_MATRICE.md) — articles 4, 7, 8, 9,
   10, et cohérence avec les documents publiés.

## Ce que l'audit a vérifié, et qui est solide

- **Aucune écriture disque** dans le connecteur ; **aucun journal d'accès**
  Caddy ; **aucune adresse IP enregistrée** ; **aucun prompt journalisé** —
  vérifié par recherche sur une mesure réelle, dont le `request_id` n'apparaît
  dans aucun journal.
- Le journal du conteneur contient **deux lignes**, toutes deux de démarrage.
- **Aucune dépendance tierce** : uniquement des modules Node natifs.
- La discipline de l'**article 8** du brouillon est déjà **tenue par le code et
  par des tests**, pas seulement promise.

## Les quatre écarts qui bloquent une publication

| # | Écart | Gravité |
|---|---|---|
**E-1** | L'entité du brouillon n'est pas celle qui édite le service | **bloquant** |
**E-2** | La **politique de confidentialité ne couvre pas le traitement MCP**, alors que le manifeste la lui oppose — et c'est aussi un motif de rejet déclaré de la plateforme | **bloquant** |
**E-3** | **Aucune acceptation des CGU n'est recueillie** : l'opposabilité n'est pas établie | **majeur** |
**E-4** | L'**article 10 ne dit pas** que le contenu soumis est **transmis à un tiers** pour être mesuré | **majeur** |

## Deux faits à ne pas perdre

**Le dépôt est public et n'a aucune licence** — ni fichier `LICENSE`, ni champ
`license`, ni mention de copyright. Public sans licence signifie **tous droits
réservés** : ni ouvert, ni clairement fermé. **L'ambiguïté est le seul choix
qui n'en est pas un.**

**Un credential partagé rend toute attribution impossible.** Sans identité :
pas de quota par utilisateur, pas de suspension individuelle, pas de constat
d'abus, pas d'exercice des droits. Plusieurs articles du brouillon supposent
un « Client » que l'architecture ne permet **ni d'identifier, ni de
contacter**.

## Corrigé au passage

La vérification de mise en service avait laissé sur la production
`/tmp/nm-verif/measure.json` — **prompt et réponse réels**, lisible par tout
utilisateur local. **Supprimé, absence revérifiée.** C'est ainsi qu'une
architecture « sans stockage » accumule des données : par l'exploitation, pas
par le service.

## Prochaine action concrète

**Trancher l'entité éditrice du service MCP** (arbitrage 1 de la
[matrice](CGU_CONFORMITE_MATRICE.md) §4). Les neuf autres arbitrages en
dépendent, et deux enquêtes peuvent démarrer en parallèle sans décision : la
**conservation en aval** chez l'API, et la **liste réelle des sous-traitants**.

---

# MISE EN SERVICE — `0.3.0-rc.1` est en production, 1er novembre 2026

**Cette section prime sur toutes les suivantes.**

`https://mcp.neomundi.org/mcp` sert **`0.3.0-rc.1`** depuis le 2026-11-01,
11:38 UTC. La PR #9 a été fusionnée (`da71f5d`), contrôles verts.

| | |
|---|---|
Révision servie | **`da71f5d327da83247c5f4a69dfc1b6ea6e80f048`** |
Image | `sha256:a50a2679d18e…`, base `node@sha256:8a32c8cf…` (index OCI) |
Avant | `0cbd369`, version `0.1.0` — **retour arrière armé et vérifié** |
Mesure réelle | `request_id` **`2ca02f65-e2de-4f21-a35d-0e845329d4b2`**, HTTP 200 en 1,84 s |

**Preuve de bout en bout** : décision `ALLOW` sur fondement
`measured_thresholds`, mesure `complete`, **3 contrôles sur 3**, couverture
`1`, cinq signaux mesurés, aucun non mesuré, `contract_validation` à
**`validated`**, évaluateurs réels (`nomic-embed-text`, `llama-guard3:1b`).
Aucun signal ni provenance n'a été modifié.

Détail complet, empreintes et commandes : [déploiement HTTPS](docs/DEPLOIEMENT_HTTPS.md) §0.

## Retour arrière, en deux commandes

```bash
sudo systemctl disable --now neomundi-mcp-docker.service
sudo systemctl enable  --now neomundi-mcp.service
```

L'unité `0.1.0` est conservée, le dépôt de retour arrière est resté à
`0cbd369`, et il n'y a **ni base, ni état persistant, ni migration**.

## Ce que cette mise en service a révélé

**Toute mesure ressort `version_agreement: divergent`** : la production déclare
`3.3.1`, le connecteur est épinglé sur `3.3.0`. La carte affiche donc « ce
résultat n'est pas comparable aux autres » — comportement **voulu**, puisque
`divergence_scope` n'écrase jamais l'accord. Mais la portée publiée précise
que **sur le chemin REST les deux versions sont déclarées identiques**. Le
bandeau est donc plus prudent que la portée. **Lever l'épinglage est un
arbitrage produit, pas un correctif** — `D-8`.

**Trois champs racine ne sont pas modélisés** et la carte les nomme plutôt que
de les cacher : `token_count_scope`, `token_count_unit`,
`stream_contract_metadata` — `D-9`, à remonter au backend.

## Accessible depuis ChatGPT ?

**Techniquement oui** : point d'entrée HTTPS public, Streamable HTTP sur
`/mcp`, authentification par `Bearer`, outil et ressource d'interface servis
et vérifiés depuis l'extérieur. Il reste à **déclarer le bloc `auth` dans
`mcp.json`** (`P-6`) avant d'ajouter le connecteur dans ChatGPT.

**Mais ce n'est pas un connecteur multi-utilisateur** : un credential partagé
ouvre le serveur et **une seule** clé API NeoMundi est dépensée pour tous.
Acceptable pour un essai privé porté par l'association ; à ne pas présenter
autrement — `D-4`.

Ce qui manque pour le **catalogue** : [procédure de publication](docs/PUBLICATION.md) §4.2.

---

# Reprise — plugin V1, carte de mesure et VPS, 1er novembre 2026

**Cette section prime sur toutes les suivantes.**

## Le constat qui commande tout le reste

**`mcp.neomundi.org` existe, répond en HTTPS — et sert `0.1.0`.**

Le VPS Infomaniak héberge un service actif depuis le 2026-10-25, derrière
Caddy, avec un certificat Let's Encrypt valide. Le code servi est à
**`0cbd369` du 2026-09-07, 32 commits derrière `main`**. Les modules
`presentation.mjs`, `guidance.mjs`, `reference.mjs`, `integrity.mjs`,
`response-contracts.mjs` et `stdio.mjs` en sont **absents**, vérifié fichier
par fichier sur la machine.

Ce sont exactement les champs qui distinguent un `ALLOW` mesuré d'un `ALLOW`
décidé sans aucun contrôle. **La carte de mesure lit `presentation` : branchée
sur la production actuelle, elle n'affiche pas de mesure.** Mettre la
production à niveau est donc un **préalable**, pas un confort.

Détail et procédure de bascule — non exécutée : [déploiement HTTPS](docs/DEPLOIEMENT_HTTPS.md).

## État Git et vérifications

| | |
|---|---|
Base | `origin/main` à **`0e06d5c`**, version **`0.3.0-rc.1`** |
Branche | **`feat/chatgpt-plugin-hosted-compat`** — consulter Git et la PR pour l'état de fusion |
Tests | **299 passés, 0 échec, 0 sauté** avec les enregistrements à côté (270 sur `main` avant ces deux passes) |
Garde de publication | `PASS`, 95 fichiers, aucun secret, aucune trace machine |
Image Docker | **construite et vérifiée**, base épinglée par digest d'index OCI, suite hors ligne exécutée **dans** l'image |
Paquet | `dist/neomundi-measurement-0.3.0-rc.1.zip`, 38 fichiers, **reproductible bit pour bit** |
MCP Inspector | **exécuté** — outil, ressource, schémas et `_meta` confirmés |

## Livré par cette passe

1. **Carte de mesure MCP Apps** — ressource `ui://neomundi-measurement/card-v1.html`,
   type `text/html;profile=mcp-app`, servie par `resources/list` et
   `resources/read`, référencée par le `_meta` de l'outil sous les deux
   orthographes (`ui.resourceUri` et `openai/outputTemplate`).
   Document **autonome** : aucune ressource externe, CSP déclarée **vide**,
   toute valeur écrite en `textContent` et jamais en balisage.
   La logique d'affichage vit dans `runtime/ui/view-model.mjs`, **fonction
   pure testée en Node**, et c'est ce fichier exact qui est inliné dans la
   page. **Aucun feu tricolore** : la fondation de marque l'interdit, et une
   pastille verte sur un `ALLOW` jamais évalué serait le mensonge que cette
   carte existe pour empêcher. Les conditions sont écrites **en mots**.
2. **Icônes** 512/256/128/48, carrées, **dérivées** de la marque existante par
   détourage et remplissage — jamais par étirement. Provenance et
   transformation exactes : [`assets/README.md`](assets/README.md).
3. **Identité de l'association** dans le manifeste, **relevée, pas inventée** :
   Neomundi Recherche, association loi 1901, et les URL de site, de support et
   de politique de confidentialité, **toutes vérifiées comme résolvant**.
4. **Paquet ZIP** reproductible, construit sans aucune dépendance.
5. **Deux corrections de défauts préexistants sur `main`** — §suivant.

## Deux défauts corrigés, tous deux antérieurs à cette passe

**`docker build` échouait sur `main`.** Les fichiers de `PLUGIN_FILES`
n'étaient pas copiés dans le contexte de build, donc
`tests/plugin-package.test.mjs` échouait **pendant le build** depuis le commit
où ce test est arrivé. L'image n'avait pas été reconstruite depuis.

**`stdio` perdait la réponse d'un appel déjà émis.** `runStdio` fermait le
dispatcher HTTP **avant** de drainer les requêtes en vol. Fermer interrompt
les appels en cours — correct pour un signal, faux pour une fin d'entrée :
stdin qui se termine signifie « j'ai tout envoyé », pas « jette ce que tu
tiens ». L'appelant recevait un échec de transport **pour un appel déjà émis
et, pour une mesure, déjà facturé** — et ce connecteur ne rejoue jamais.
Corrigé, avec un test de non-régression.

## Ce qui bloque, et qui le lève

| # | Blocage | Qui |
|---|---|---|
**D-1** | **La production sert `0.1.0`** sans les garde-fous métrologiques | **Sébastien**, sur un SHA — rien n'a été déployé |
**D-4** | **Un credential partagé, une seule clé API** pour tous. Joignable ≠ multi-utilisateur | **Sébastien** |
**P-2** | **Aucunes conditions générales n'existent.** `termsOfServiceURL` est demandé à la soumission ; le champ est **volontairement absent**, et un test échoue si on l'invente | **Sébastien** |
**P-3** | La politique de confidentialité n'a jamais été relue face à ce que l'enveloppe retourne réellement | **Sébastien** |
**P-4** | Vérification d'identité de l'organisation côté plateforme : état inconnu | **Sébastien** |
**D-2 / D-3** | 34 mises à jour système en attente dont une de sécurité ; `ufw` inactif | **Sébastien** |
**P-7** | Imbrication de `extensions.com.openai` (`interface` ou à plat) non établie sur le schéma officiel | une session |

## Prochaine action concrète

**Autoriser la bascule de `mcp.neomundi.org` vers `0.3.0-rc.1`**, sur un SHA.
C'est le seul pas qui débloque la démonstration du plugin dans ChatGPT : tout
le reste est prêt et vérifié localement. La procédure et son retour arrière
sont écrits dans [le déploiement HTTPS](docs/DEPLOIEMENT_HTTPS.md) §4.

Sans cette autorisation, une chose reste faisable sans coût : installer le ZIP
en **plugin local** (Codex, bureau) et l'exercer hors ligne —
[procédure](docs/PUBLICATION.md) §2.

## Revérifier avant toute modification

```bash
git fetch --prune                 # une copie locale ne fait pas foi
git log -1 --oneline origin/main && git status -sb
npm test                          # 299 passés, 0 sauté, enregistrements présents à côté
node check-publication.mjs        # ce qui sort du depot
node scripts/build-package.mjs    # paquet reproductible
```

---

# Reprise — compatibilité plugin ChatGPT / Codex, 1er novembre 2026

**Cette section prime sur tous les relevés ci-dessous.**

## État Git, vérifié par commande

| | |
|---|---|
Base de travail | `origin/main` à **`0e06d5c`** — *« Merge pull request #8 … »* |
Version | **`0.3.0-rc.1`** |
Branche de cette passe | **`feat/chatgpt-plugin-hosted-compat`**, partie de `0e06d5c`. Consulter Git et la PR pour l'état de fusion ; **ne rien déduire de cette fiche** |
Suite de tests | **279 passés, 0 échec, 0 sauté** avec les enregistrements présents à côté. Base `main` avant cette passe : **270 passés** |
Garde de publication | `PASS`, 83 fichiers publiables, aucun secret, aucune trace machine |

> ⚠ **Le piège qui a coûté le plus de temps dans cette passe.** Les copies de
> travail locales du connecteur étaient **en retard de sept commits** sur
> `origin/main`, et leur fiche annonçait `0.2.0` avec « aucun appel API
> hébergé ». `origin/main` porte `0.3.0-rc.1`, **un diagnostic REST réel et une
> génération SSE réelle bornée du 26 octobre**, et les schémas de contrat
> REST/SSE versionnés. La branche locale était déjà fusionnée.
>
> **Faire `git fetch --prune` et relire depuis `origin/main` avant toute
> conclusion.** Une copie locale ne fait pas foi, et une fiche encore moins.

## Livré par cette passe — trois corrections, aucune sur l'API

1. **Un `Host` de domaine hébergé est désormais acceptable.** Il ne l'était
   pas : la liste d'hôtes était dérivée du port d'écoute, et un
   `Host: mcp.example.org` recevait **403 `invalid_host` avant toute lecture de
   credential** — mesuré, non déduit. Aucun assistant distant ne pouvait
   atteindre ce connecteur. Nouvelle variable **`NEOMUNDI_MCP_ALLOWED_HOSTS`**,
   opt-in explicite, **défaut vide donc comportement inchangé**. Un hôte n'est
   accepté que parce qu'il a été *nommé*, jamais parce que l'écoute a été
   élargie : cette séparation est l'invariant anti-rebinding du dépôt, et elle
   est maintenant affirmée par son test d'origine **et** par un test de cette
   passe.
2. **`title` sur l'outil**, avec une garde qui refuse tout vocabulaire de
   verdict dans ce champ. Un hôte l'affiche à une personne.
3. **Manifeste** : `shortDescription` ramenée de **43 à 26 caractères** (la
   limite de la plateforme est 30 — elle était dépassée), et `websiteURL`
   renseignée depuis une valeur déjà présente dans le fichier.

Aucune sémantique de mesure n'a bougé : schémas, présentation, `reading_aid`,
classification amont et validation de contrat sont intacts.

## Documents de cette passe

1. [Analyse d'écarts](PLUGIN_GAP_ANALYSIS.md) — matrice *existant / manquant /
   à corriger / non vérifié*, et les mesures qui l'appuient ;
2. [Architecture](PLUGIN_ARCHITECTURE.md) — interface compatible avec un
   instrument propriétaire **ou** ouvert, sans décision irréversible ;
3. [Feuille de route](PLUGIN_ROADMAP.md) — P0 / P1 / P2.

## Blocages, et qui les lève

| # | Blocage | Qui |
|---|---|---|
**G-1** | Aucun point d'entrée HTTPS public. Le code l'accepte ; l'infrastructure n'existe pas | **Sébastien** — et cette passe **n'autorise aucun déploiement** |
**G-2** | Un credential statique partagé, aucune identité par utilisateur. Tout appel est facturé au même compte | **Sébastien** — plus grosse pièce non construite |
**G-3** | `privacyPolicyURL` et `termsOfServiceURL` inexistantes — **volontairement non inventées** | **Sébastien** |
**G-4** | Vérification d'identité de l'organisation côté plateforme : état inconnu | **Sébastien** |
**G-5** | Imbrication de `extensions.com.openai` (`interface` ou champs à plat) non établie | une session |
**G-7** | Qualification de `0.3.0-rc.1` en production — le backend doit publier métadonnées et schémas | porte de release |
**G-8** | MCP Inspector jamais exécuté | une session, sans coût |

## Prochaine action concrète

**Trancher le modèle d'authentification — `P0-3` de la feuille de route.** Tout
le reste en dépend, et c'est le seul vrai blocage du premier palier.
Recommandation : commencer par un **plugin local avec la clé de
l'utilisateur**, compatible avec les deux scénarios de distribution, sans
infrastructure et sans facture.

Sans décision, une tâche reste faisable immédiatement et sans coût :
**exécuter MCP Inspector** contre le serveur local (`P0-4`).

## Revérifier avant toute modification

```bash
git fetch --prune                 # avant tout : une copie locale ne fait pas foi
git log -1 --oneline origin/main && git status -sb
npm test                          # 279 passés, 0 sauté, enregistrements présents à côté
node check-publication.mjs        # ce qui sort du dépôt
```

Les enregistrements rejoués sont cherchés dans un répertoire frère du SDK
Python ; absents, les tests concernés se sautent **en le disant**. Un compte
inférieur n'est donc pas un échec, mais il n'est pas la même preuve.

---

# Reprise — contrats REST/SSE et prochaine release

Source : **0.3.0-rc.1**, candidate. Le test réel réussi du 26 octobre porte sur **0.2.0**.
Lire [contrats et livraison](docs/RESPONSE_CONTRACTS_FR.md), puis [installation](docs/PLUGIN_FR.md).
Le backend doit publier les métadonnées et les deux schémas avant la qualification finale.
Les captures historiques restent inchangées ; elles ne deviennent pas conformes rétroactivement.
Le serveur MCP hébergé reste un déploiement séparé. Aucun annuaire public n'est déclaré validé.

Les relevés datés ci-dessous sont conservés pour la traçabilité.

---

# Reprise — MCP et plugin 0.2.0, 26 octobre 2026

Cette section prime sur les relevés historiques ci-dessous.
Base du travail : `574a4fd92c96906b548d27f2bf31d7765df15e81`.
La branche de livraison est `feat/mcp-plugin-consolidation` ; consulter Git
et la PR pour l'état de fusion, sans déduire un déploiement de cette fiche.

Livré : contrôles SSE d'assemblage et d'intégrité, interruption déclarée
refusée, modèle/fournisseur explicites, entrée MCP stdio réutilisant HTTP,
plugin local portable et compatibilité Codex, guides FR/EN.

Vérifications : 192 tests, 175 réussis, 17 ignorés sans captures privées.
Installation dans un profil Codex isolé et appels REST/SSE via un client MCP
indépendant contre un stand-in local. Aucun nouvel appel API hébergé ou
fournisseur. Lire [l'audit](docs/MCP_PLUGIN_AUDIT.md).

Prochaine étape : qualifier le nouveau code contre l'environnement hébergé
après accès opérateur et déploiement contrôlé. La provenance des tokens et
le contrat SSE backend manquants restent un chantier backend, pas des champs
que le connecteur peut fabriquer. Station, Runner et Cohere inchangés.

Les anciens résultats et totaux ci-dessous sont conservés comme historiques.

---

# START HERE — connecteur MCP NeoMundi

**Point d'entrée de reprise de ce dépôt. À lire en premier.**
**Relevé du 2026-10-20.** Tout état Git ci-dessous est un **relevé daté** : le
revérifier par commande avant toute modification.

---

## 1. Où en est le dépôt

| | |
|---|---|
**`origin/main`** | **`920fdd6`** — *« Merge pull request #5 … »*. Avant lui : `28194cb` (PR #4), `8a12bf3` (PR #3), `50e1c96` (PR #2). Les commits des quatre PR sont **ancêtres de `main`** |
**Branche de travail** | aucune en cours. Ce document est amené par une PR documentaire ; **son commit n'est pas recopié ici** — un document ne peut pas porter l'empreinte du commit qui le contient, et chaque rectification creuserait l'écart qu'elle prétend combler. La commande du §7 le lit |
**PR** | **#2** `50e1c96` · **#3** `8a12bf3` CI et visibilité · **#4** `28194cb` reprise · **#5** `920fdd6` couche de présentation — **les cinq fusionnées, aucune ouverte** |
**CI** | **en place et verte.** `.github/workflows/checks.yml` — suite complète + garde-fou de publication, sur `pull_request` et `push` vers `main`. **Trois runs verts sur `main`** : `8a12bf3`, `28194cb`, `920fdd6`. Avant la PR #3 : zéro workflow, zéro run |
**Tests** | **233 passés, 0 échec, 0 sauté** (`npm test` à la racine, enregistrements présents). **Sans eux — ce que voit la CI : 173 tests, 156 passés, 0 échec, 17 sautés** |
**Statut du connecteur** | `LIVE_TRANSPORT_VALIDATED_CONTRACT_PENDING`. **`LIVE_API_VALIDATED` non accordé** |
**Épinglage** | backend `68d6057`, mesure `3.3.0`. Le déploiement déclare **`3.3.1`** — écart borné (§6.1 de `KNOWN_LIMITATIONS.md`), épinglage **volontairement conservé** |
**Conteneur** | image locale. **Publiée sur aucun registre** |
**ML-009** | **clos le 2026-10-20** — §3 |
**Couche de présentation** | **livrée** — champ `presentation` de l'enveloppe, `runtime/presentation.mjs`, 22 tests de fidélité. Limites déclarées : **ML-013** |

> **Ce dépôt est public.** Vérifié le 2026-10-20 par l'API GitHub anonyme :
> `private: false`, `visibility: public`.
>
> **Rectification du relevé précédent.** Il affirmait que « la documentation
> décrit le dépôt comme privé ». **C'était inexact** : après relecture ligne à
> ligne, **aucun document n'affirme que ce dépôt est privé**, et ML-010 le
> traite déjà explicitement comme public. Ce qui existe est une **ambiguïté du
> mot « privé »**, qui désigne la posture de déploiement — écoute loopback, non
> exposée — et les noms de paquet et de serveur, jamais la visibilité du dépôt.
> Les cinq axes sont désormais séparés une fois pour toutes dans le
> [README racine](README.md).
>
> **Rien n'a fuité** : `check-publication.mjs` passe, et les fichiers publiés ne
> contiennent ni sonde d'appel réel, ni enregistrement de réponse, ni rapport
> interne, ni `.env` — revérifié sur l'arbre de `origin/main`.

---

## 2. Ordre de lecture

1. **ce fichier** ;
2. [`KNOWN_LIMITATIONS.md`](KNOWN_LIMITATIONS.md) — registre public `BL-*` / `ML-*`, le compte de tests par portée (§1) et **3.3.0 contre 3.3.1** (§6.1) ;
3. [`runtime/README.md`](runtime/README.md) — installation, contrat, `divergence_scope`, exécution en conteneur ;
4. [`CHATGPT_CONNECTOR_ROADMAP.md`](CHATGPT_CONNECTOR_ROADMAP.md) — trajectoire vers un connecteur appelable depuis ChatGPT. **Étude, pas un plan de référence.**

Le rapport de consolidation du 2026-10-20 **n'est pas publié ici** :
`check-publication.mjs` refuse tout chemin `RAPPORT_*`, et il porte les
priorités de correction et les blocages demandant une autorisation de
facturation. Il vit dans la copie de travail, avec une copie sauvegardée aux
côtés des autres fichiers hors Git du connecteur. Son existence est consignée
ici pour qu'un lecteur sache que ces éléments sont **suivis, et non omis**.

---

## 3. ML-009 — un vrai hôte MCP a été connecté

**Clos le 2026-10-20.** C'était la dernière affirmation d'intégration non
testée de ce dépôt.

**Hôte :** Claude Code 2.1.247, client MCP tiers, transport HTTP.
**Amont :** un stand-in **local** servant une réponse réellement enregistrée
(campagne SDK Python du 2026-10-17). **Aucun appel à un déploiement NeoMundi,
aucun quota consommé.**

| Vérification | Résultat observé |
|---|---|
Démarrage et connexion | `claude mcp list` → **`✔ Connected`** ; `claude mcp get` → `Status: ✔ Connected`, type `http` |
Handshake MCP | `initialize` accepté, protocole **`2025-06-18`**, session attribuée, `notifications/initialized` → **202** |
Découverte des outils | **un** outil exposé : `measure_execution` |
Invocation, cas nominal | `adapter_error=null`, `request_id=13a7e4d7-…` et `g_score=0.56199` **identiques à l'enregistrement** — la charge serveur traverse verbatim |
Invocation, `divergence_scope` | amont déclarant `3.3.1` → `agreement=divergent`, `rest: identical`, `sse: decision_may_differ`, et `g_score` **inchangé** |
Erreur, arguments invalides | `INVALID_ARGUMENTS`, `response: null`, `not_validated` — et **aucune ligne nouvelle côté amont** : aucun appel n'a été émis |
Erreur, amont injoignable | `NETWORK_ERROR`, `response: null`, `reading_aid: null`, **aucune mesure fabriquée**, et **aucune** classification de statut amont — un échec non-HTTP n'en porte pas |
Authentification | 401 sans credential ; le stand-in confirme que `X-API-Key` **est présenté** en amont |
Fuite de secrets | **0 occurrence** des deux sentinelles dans l'enveloppe complète de 32 916 octets, sur deux appels |

**Limites de ce test, à ne pas surinterpréter :**

- l'amont était un **stand-in local**, pas NeoMundi. Il valide le chemin du
  connecteur et le transport MCP, **pas** la conformité de contrat d'un
  déploiement. `LIVE_API_VALIDATED` reste non accordé ;
- **un seul hôte** a été vérifié. Les noms de champs de configuration varient
  d'un hôte à l'autre ;
- le cas `3.3.1` a été produit par une **variante synthétique** d'un
  enregistrement — un seul champ modifié, la version déclarée. Ce n'est pas un
  enregistrement ;
- le **chemin SSE n'a pas été exercé** par cette passe : il exige une clé
  fournisseur et facture une génération.

**Reproduire :** démarrer un stand-in loopback servant un enregistrement, lancer
`node runtime/server.mjs` avec `NEOMUNDI_API_BASE_URL` pointé dessus, puis
`claude mcp add --scope local --transport http <nom> http://127.0.0.1:8787/mcp --header "Authorization: Bearer <clé>"`.
Retirer l'enregistrement avec `claude mcp remove <nom> -s local` après usage.

---

## 4. Ce qui fonctionne, et ce qui n'est pas acquis

| Brique | État |
|---|---|
Chemin REST, contrat d'entrée et de sortie | **vérifié** — bornes identiques au modèle de l'API, 11 réponses réelles rejouées |
Transport MCP, Streamable HTTP | **vérifié**, et maintenant depuis un hôte réel |
Classification des statuts amont, aucune relance automatique | **vérifié** par tests |
Hygiène des secrets | **vérifiée** — aucun `.env` lu, rien journalisé, charge retenue entière si un credential y apparaît |
Image conteneur | **vérifiée** — démarrage, refus, 401, handshake, erreur amont, arrêt propre |
Couche de présentation | **vérifiée** — aller-retour sur les 11 enregistrements, non-mutation, `null` jamais substitué, `not_attempted` jamais rendu comme mesuré |
Chemin SSE | **preuve strictement plus faible** que REST — ML-002, ML-003. La projection y est **majoritairement nulle**, faute de chemins publiés (ML-013) |
Conformité de contrat sur un déploiement | **non établie** |
CI | **en place** — suite complète et garde-fou de publication, sur `pull_request` et `push` vers `main`. Elle exécute **151 tests, 142 passés, 9 sautés** : le rejeu des enregistrements ne tourne pas sur un runner (B-9) |

---

## 5. Prochaine tâche — une seule

> **La couche de présentation est livrée.** Ce qui suit décrivait la tâche ;
> elle est faite, et §5bis dit ce qui vient après.

**~~Écrire la couche de réduction~~**, celle qui rend l'enveloppe lisible par une
personne, et la relire **comme une surface de mesure, pas comme du texte**.

Sans coût, sans réseau, sans décision : les onze enregistrements couvrent les
trois familles de mesure, et `reading_aid` nomme déjà les champs, les échelles
inversées, les agrégats retenus et la cause de chaque signal non mesuré — la
réduction se pilote donc sur lui plutôt que champ par champ.

⚠ **C'est l'endroit où l'honnêteté se perd.** `reading_aid` n'interprète rien,
par conception (ML-005). Un résumé qui transforme `FLAG` en « cette réponse
paraît risquée » invente un verdict que NeoMundi ne publie pas. Ce qui doit
survivre à la réduction, systématiquement : la décision **et** son
`decision_basis`, quels signaux ont été mesurés et lesquels non avec leur
cause, et le fait qu'une mesure n'est **ni** une permission, **ni** un verdict
de conformité, **ni** une preuve de vérité ou d'absence d'hallucination.

**Son cadrage est écrit et prêt** : `CHATGPT_CONNECTOR_ROADMAP.md` §2.1 — les
dix contraintes et ce que chacune interdit, la forme proposée champ par champ
avec sa source verbatim, les sept tests de fidélité, et les trois questions à
trancher avant la première ligne de code. **Rien n'est implémenté**, et rien ne
doit l'être sans une instruction distincte.

Le cas qui justifie tout l'exercice y est posé sur deux enregistrements réels :
`tier02_01_complete_nominale` et `tier02_04_aucun_controle` décident **tous deux
`ALLOW`** — le premier sous `measured_thresholds` avec 3 contrôles, le second
sous `no_check_attempted` avec **zéro contrôle** et `measurement.status`
`not_attempted`. Une présentation qui les rend identiques a détruit la
distinction que la mesure existe pour produire, **en n'affichant que des valeurs
réellement publiées par le serveur**.

---

## 5bis. Ce qui a été livré, et ce qui vient ensuite

**Livré le 2026-10-20** — champ `presentation` de l'enveloppe. Projection plate,
chaque champ copié du chemin déclaré dans son propre `field_sources` ou `null`.
Un seul champ dérivé, `decision_is_measured`, reformulation d'une égalité.
Rien n'est calculé, remis à l'échelle, arrondi, classé ni raccourci.
`response` reste intacte à côté. Détail : `runtime/README.md`, section
« `presentation` — la projection fidèle ». Limites : **ML-013**.

**Prochaine tâche — aucune n'est gratuite.** Les trois qui restent demandent
chacune une décision, et dans cet ordre de dépendance :

1. **Un appel réel autorisé** contre le déploiement, avec le palier de clé
   confirmé au préalable. **Facturé** — B-3, B-4. C'est ce qui ferme la
   conformité de contrat et peut accorder `LIVE_API_VALIDATED`.
2. **Épingler la base Docker par digest** — B-6. Sans décision produit, mais
   sans elle un build ne vaut pas preuve.
3. **L'hébergement HTTPS et l'authentification individuelle** — la pièce la
   plus lourde, et la seule qui ouvre un connecteur multi-utilisateur.
   `CHATGPT_CONNECTOR_ROADMAP.md` §3, P-1 à P-3.

**Ne pas commencer l'intégration ChatGPT** avant que 1 et 3 soient tranchées.

---

## 6. Blocages

| # | Blocage | Qui le lève |
|---|---|---|
**B-1** | ~~Aucune CI~~ — **levé**, PR #3 : la suite complète et le garde-fou tournent sur `pull_request` et `push` vers `main`, vérifiés verts sur les deux | — |
**B-2** | ~~PR #2 non fusionnée~~ — **fusionnée** le 2026-10-20T11:29:48Z en `50e1c96` | — |
**B-10** | **Aucun contrôle n'est *requis* côté GitHub.** La CI est verte, mais rien n'empêche techniquement de fusionner une PR rouge : aucune règle de protection de branche n'est configurée sur `main` | **Sébastien** — c'est un réglage de dépôt, pas du code |
**B-3** | **Conformité de contrat non établie**, `LIVE_API_VALIDATED` non accordé. Demande un appel réel — donc **facturé** | **autorisation de Sébastien** |
**B-4** | **Palier et quota de la clé inconnus.** `documents[]` exige **TIER_02+** | registre des clés |
**B-5** | **Épinglage `3.3.0` face à `3.3.1`** — borné et documenté, décision ouverte | **Sébastien** |
**B-6** | **Base Docker épinglée par tag, pas par digest.** La ligne est préparée, non renseignée | une session |
**B-7** | ~~Dépôt public, documentation « privé »~~ — **levé** : aucun document n'affirmait le contraire ; l'ambiguïté du mot est tranchée par le tableau des cinq axes du [README racine](README.md), et le relevé qui l'affirmait est rectifié au §1 | — |
**B-8** | ~~Pas de couche de présentation fidèle~~ — **levée** : livrée le 2026-10-20, cadrage §2.1 respecté, limites en ML-013 | — |
**B-9** | **Les 9 tests de rejeu sont sautés en CI**, les enregistrements étant hors dépôt par conception. La partie de la suite capable de voir une dérive de contrat ne tourne donc **pas** sur un runner. Publier les enregistrements pour verdir le chiffre est exactement ce qu'il ne faut pas faire | **Sébastien**, si une preuve en CI est voulue |

---

## 7. Revérifier avant toute modification

```bash
git fetch --prune                                  # avant tout : main local n'est pas origin/main
git log -1 --oneline origin/main && git status -sb
npm test                      # 211 passés, 0 sauté, enregistrements présents à côté
node check-publication.mjs    # ce qui sort du dépôt
```

L'état de la CI se lit sans authentification, le dépôt étant public :

```bash
curl -s "https://api.github.com/repos/neomundi-io/neomundi-measurement-mcp/actions/runs?branch=main&per_page=1"
```

⚠ L'API anonyme est limitée à **60 requêtes par heure**. Interroger en boucle
serrée l'épuise, et les appels suivants renvoient une erreur qui ressemble à
une absence de résultat. Interroger une fois, espacer.

Les empreintes de commit citées en §1 datent de leur écriture. **La commande
fait foi**, pas ce document.

## 8. Ordre de reprise

1. lire ce fichier ;
2. `git fetch --prune`, puis comparer `origin/main` au §1 ;
3. `npm test` et `node check-publication.mjs` — les deux doivent passer avant
   toute modification ;
4. lire le registre (`KNOWN_LIMITATIONS.md`), puis le document du domaine
   touché selon le §2 ;
5. travailler **sur une branche**, ouvrir une PR, laisser la CI se prononcer.
   **Ne jamais pousser directement sur `main`** — y compris pour un document :
   la PR #3 et la PR documentaire qui a amené cette version ont toutes deux
   suivi ce chemin ;
6. ne pas relancer un travail déjà fait : §3 pour ML-009, §4 pour ce qui est
   vérifié, §6 pour ce qui reste ouvert.

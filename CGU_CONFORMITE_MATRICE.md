# Matrice de conformité — CGU v0.1 face au service réel

**Relevé du 2026-11-01.** Confronte le brouillon
**`CGU_ControlTower_v0.1_PROJET_A_FINALISER`** (document de travail interne,
non publiable en l'état, conservé hors de ce dépôt) au connecteur MCP
`0.3.0-rc.1` **tel que déployé** sur `mcp.neomundi.org`.

Faits issus de : [audit des données](MCP_DATA_PROCESSING_AUDIT.md) ·
[accès et limites](MCP_ACCESS_POLICY.md) ·
[propriété intellectuelle](MCP_IP_LICENSE_AUDIT.md).

> **Aucune formulation juridique n'est modifiée ici.** Les colonnes
> « correction proposée » sont des **propositions soumises à arbitrage**, à
> valider par un juriste avant toute publication.

---

## 0bis. Mise à jour du 2026-11-01 — E-1 est tranché

**Neomundi Recherche, association loi 1901, est l'entité éditrice.** L'écart
`E-1`, qui bloquait tous les autres, est **levé** : la seconde lecture du §0
est retenue — il faut un texte **porté par l'association**, et non une
extension des CGU ControlTower.

Trois conséquences immédiates sur la matrice :

- **le droit applicable et le for changent** : le brouillon prévoit le droit
  suisse et le for vaudois pour une Sàrl de Morges. L'éditeur est une
  association **française**. **À reprendre entièrement avec un juriste** ;
- **l'article 1 doit nommer l'association** — identité déjà publiée et
  vérifiée : RNA `W563015824`, siège parisien, directeur de publication ;
- **l'article 5 devient contradictoire** : il réserve le service aux
  professionnels, alors qu'un catalogue public expose des particuliers. La
  question `10` reste entière, et devient prioritaire.

**`E-2` et `E-4` sont désormais chiffrés** par le
[rapport aval](MCP_DOWNSTREAM_DATA_REPORT.md), qui établit ce qui est
réellement conservé — **y compris un point que l'audit précédent avait tenu
pour acquis à tort** : des extraits verbatim de la **réponse** sont conservés
(21 870 lignes sur 338 578). Les formulations correspondantes y sont proposées
en FR et en EN.

**`E-6` est levé** : la conservation en aval est maintenant mesurée —
**indéfinie** pour les mesures, **14 jours** pour les sauvegardes et les
journaux nginx.

---

## 0. L'écart qui précède tous les autres

**Le brouillon ne décrit pas ce service.**

| | Brouillon CGU v0.1 | Service réellement déployé |
|---|---|---|
Objet | **ControlTower**, service SaaS | **connecteur MCP**, plugin pour assistants |
Opérateur | **Louis M Sàrl**, société suisse, Morges | **Neomundi Recherche**, association loi 1901, Paris — déclarée `author` du plugin |
Droit applicable | **droit suisse**, for vaudois | association **française** éditant depuis un domaine `.org` français |
Clients visés | **professionnels**, par contrat signé | public potentiel d'un catalogue ChatGPT, **sans compte ni contrat** |
Point d'accès nommé | `api.neomundi.io/v1/govern/stream` | **`mcp.neomundi.org/mcp`** — jamais mentionné |
Accès | plans, quotas, bons de commande | **gratuit, sans compte, credential partagé** |

**Deux lectures possibles, et il faut choisir :**

1. **ces CGU ne s'appliquent pas au MCP** — il faut alors un texte distinct,
   porté par l'association, en droit français ;
2. **elles doivent le couvrir** — il faut alors y ajouter l'entité, le point
   d'accès, le mode gratuit et l'absence de compte, ce qui en change la nature.

**Tant que ce choix n'est pas fait, aucun article ne peut être finalisé** :
chaque correction ci-dessous dépend de l'entité retenue.

> **Fait utile :** le brouillon est **déjà honnête sur son inachèvement** — 27
> zones « INFORMATION À RENSEIGNER » et une annexe qui les récapitule. Cet
> audit en confirme plusieurs par des faits, et en ajoute.

---

## 1. Matrice — articles 4, 7, 8, 9, 10

### Article 4 — Champ d'application et hiérarchie contractuelle

| | |
|---|---|
**Clause** | « Les présentes CGU s'appliquent à **tout accès au Service**. En cas de contrat signé ou de conditions particulières, ceux-ci prévalent […] » |
**Fait vérifié** | Le connecteur **n'a ni compte, ni contrat signé, ni conditions particulières, ni bon de commande** : un credential partagé ouvre l'accès, et **aucune acceptation n'est recueillie ni enregistrée**. Aucun mécanisme technique ne présente de CGU à l'appelant |
**Écart** | **Majeur.** Une hiérarchie contractuelle à six niveaux est décrite, dont **cinq n'existent pas** pour ce service. Surtout : **l'opposabilité n'est pas établie** — rien ne prouve qu'un utilisateur ait eu connaissance des CGU |
**Correction proposée** | Ajouter un alinéa nommant explicitement l'accès expérimental MCP et **le mode d'acceptation retenu**. Deux options à trancher : (a) acceptation **hors bande**, par la fiche du plugin dans le catalogue et la documentation d'installation ; (b) acceptation **technique**, en exigeant un credential nominatif délivré après acceptation — ce qui suppose l'arbitrage `A-1`. **Sans l'une des deux, l'article 4 décrit une opposabilité qui n'existe pas** |

### Article 7 — Description du Service

| | |
|---|---|
**Clause** | « Le Service permet, **selon le plan souscrit**, de recevoir ou superviser des Requêtes, Résultats, traces et métadonnées, de calculer des Signaux, de suivre leur évolution et de produire des Exports, en Mode OBS et/ou en Mode GOV » |
**Fait vérifié** | Le connecteur expose **un seul outil**, `measure_execution`, en **mode OBS** et en génération SSE. Il **ne calcule aucun signal** : il transmet à `api.neomundi.io` et restitue verbatim. Il **ne suit aucune évolution** — chaque appel est indépendant, rien n'est conservé. Il **ne produit aucun Export**. Il n'y a **aucun « plan souscrit »** |
**Écart** | **Majeur par excès.** Quatre capacités annoncées sont absentes : plans, calcul local, suivi longitudinal, exports. L'article promet plus que ce qui est livré |
**Correction proposée** | Ajouter une sous-section « Accès expérimental MCP » énonçant : un seul outil ; **aucun plan** ; **aucun suivi dans le temps** ; **aucun export** ; le connecteur **ne calcule rien et ne conserve rien** ; et que **la mesure est produite par un service tiers** auquel le contenu est transmis (voir art. 10). Reprendre la réserve existante — « L'Opérateur ne garantit pas la disponibilité future d'une fonctionnalité non encore mise en production » — et l'étendre aux fonctions **jamais** prévues sur ce chemin |

### Article 8 — Nature des métriques et des résultats

| | |
|---|---|
**Clause** | « […] **ne constituent en aucun cas une certification, un verdict, ni une garantie** de conformité, de sécurité, de stabilité, de factualité ou de licéité […] les méthodes de calcul sont susceptibles d'évoluer » |
**Fait vérifié** | **Conforme, et même en avance sur le texte.** Le connecteur applique cette discipline **techniquement** : la carte de mesure affiche la décision **et son fondement**, distingue un `ALLOW` mesuré d'un `ALLOW` décidé **sans aucun contrôle**, nomme la cause de chaque signal non mesuré, **n'invente aucun verdict** (vocabulaire figé, vérifié par test) et **n'affiche aucun feu tricolore**. La mention « une mesure n'est pas une autorisation d'exécution, ni un verdict de conformité, ni une preuve de vérité, de sûreté ou d'absence d'hallucination » est affichée **à chaque rendu** |
**Écart** | **Aucun sur le fond.** Deux manques mineurs : (a) l'article ne dit pas que la **comparabilité entre versions** peut être rompue — or le service **déclare aujourd'hui `version_agreement: divergent` sur chaque mesure** ; (b) il ne mentionne pas que des champs amont peuvent être **non modélisés** par le connecteur — trois le sont aujourd'hui |
**Correction proposée** | Ajouter deux alinéas : « Les résultats sont rattachés à une **version de mesure** ; deux résultats produits sous des versions divergentes **ne sont pas comparables**, et le Service le signale. » ; et « Le Service peut restituer des champs qu'il **ne modélise pas** ; ils sont alors **nommés comme tels** et ne sont ni interprétés ni supprimés. » **C'est l'article le plus solide du brouillon : il mérite d'être renforcé, pas réécrit** |

### Article 9 — Responsabilités du Client

| | |
|---|---|
**Clause** | Dix responsabilités, dont « la **base juridique** de tout traitement de données personnelles impliqué », « le **choix du Protocole** applicable », « la **supervision humaine effective** », « la publication ou communication à des tiers des **Exports** » |
**Fait vérifié** | Cohérent **dans son principe**. Trois inexactitudes de fait : (a) **aucun « Protocole » n'est choisissable** — l'outil n'expose aucun paramètre de protocole ; (b) **aucun Export n'est produit** ; (c) la responsabilité de la base juridique suppose un **Client identifié**, or **il n'y en a aucun** : l'appelant est anonyme et **aucun appel n'est attribuable** |
**Écart** | **Moyen.** L'article attribue des responsabilités à un « Client » que l'architecture ne permet **ni d'identifier, ni de contacter, ni de mettre en demeure** |
**Correction proposée** | Retirer « choix du Protocole » et « Exports » pour le chemin MCP, ou les réserver explicitement au chemin contractuel. **Ajouter** une responsabilité qui manque et qui est centrale ici : « l'Utilisateur s'assure de **disposer du droit de transmettre** le prompt, la réponse et les documents soumis, **y compris lorsqu'ils contiennent des données de tiers**, et de ne soumettre que ce qui est **nécessaire** à la mesure ». Et constater que, **faute d'identité**, ces obligations reposent sur une **déclaration non vérifiable** — ce que l'article devrait assumer plutôt que masquer |

### Article 10 — Données et contenus soumis

| | |
|---|---|
**Clause** | « Le Client **garantit disposer des droits** […] et s'engage à ne transmettre que les données **strictement nécessaires** à son cas d'usage (principe de minimisation) » |
**Fait vérifié** | Le contenu soumis — **prompt (10 000 car.), réponse (50 000 car.), `rag_context` (50 entrées), `documents` (10 entrées)** — est transmis **verbatim** à `api.neomundi.io`, sans filtrage ni anonymisation. **Côté connecteur, rien n'est conservé** : aucune écriture disque, aucun journal d'accès, **aucune IP enregistrée**, aucun prompt journalisé — vérifié par recherche sur une mesure réelle. **Aucun mécanisme technique n'impose la minimisation** : elle est entièrement déclarative |
**Écart** | **Majeur par omission.** L'article énonce une obligation du Client mais **ne dit nulle part ce que l'Opérateur fait du contenu** : ni qu'il est **transmis à un tiers**, ni combien de temps il est **conservé en aval**, ni comment demander sa suppression. **C'est l'information que l'utilisateur attend en premier, et elle est absente** |
**Correction proposée** | Ajouter un alinéa de transparence, en langage direct : « Le prompt, la réponse et les documents soumis sont **transmis à l'infrastructure de mesure** afin d'y être mesurés — c'est **inhérent à la mesure**. Le connecteur **ne les conserve pas** : il n'écrit aucun fichier, ne journalise aucun contenu et n'enregistre aucune adresse IP. **La durée de conservation en aval est régie par** [document à nommer], et **le Service ne doit pas être utilisé pour soumettre des données sensibles** (voir art. 11). » **La conservation en aval est `NON VÉRIFIÉE` : ce renvoi ne peut être écrit qu'une fois le document correspondant établi** |

---

## 2. Cohérence avec les documents publiés sur `neomundi.org`

### 2.1 Mentions légales — **cohérentes, et utiles**

**VÉRIFIÉ.** Elles nomment **Neomundi Recherche**, association loi 1901, RNA
`W563015824`, siège parisien, directeur de publication, hébergeur Infomaniak,
contact par formulaire. **Elles sont à jour et exploitables.**

**Écart : elles ne couvrent que le site.** Elles ne mentionnent ni le service
MCP, ni `mcp.neomundi.org`, ni la mise à disposition d'un outil de mesure.

**Correction proposée** — ajouter une ligne nommant le sous-domaine et le
service expérimental, et l'entité qui l'exploite. **C'est le point le moins
coûteux de tout ce rapport, et il lève l'ambiguïté la plus visible.**

### 2.2 Politique de confidentialité — **écart majeur**

**VÉRIFIÉ.** Elle couvre **le site** : formulaire de contact, newsletter,
données techniques (**adresse IP**, date et heure, navigateur), sous-traitants
**Infomaniak** et **Koko Analytics**, conservation « pendant la durée
nécessaire », droits d'accès et d'effacement par formulaire.

**Elle ne mentionne ni API, ni connecteur MCP, ni prompts, ni entrées ou
sorties d'IA, ni service de mesure.**

**Or le manifeste du plugin la déclare comme politique de confidentialité du
plugin** (`privacyPolicyURL`), et le service traite des prompts et des réponses
qu'elle ne décrit pas.

**Écart, et il est doublement sérieux :**

1. **juridiquement** — un traitement non décrit dans la politique qui lui est
   opposée ;
2. **pour la publication** — retourner des catégories de données non déclarées
   dans la politique de confidentialité est un **motif de rejet explicite** de
   la revue de la plateforme.

**Correction proposée** — ajouter une section dédiée au service MCP,
distincte, énonçant : les catégories réellement traitées (prompt, réponse,
`rag_context`, documents, métriques) ; la finalité (produire une mesure) ; le
fait qu'elles sont **transmises à l'infrastructure de mesure** ; ce qui est
**vérifié comme non conservé** côté connecteur (fichiers, journaux, IP) ; la
conservation en aval **une fois établie** ; les sous-traitants réels **une fois
relevés** ; et les modalités d'exercice des droits — **y compris la limite
vérifiée que le connecteur ne peut rien supprimer en amont**.

---

## 3. Écarts par gravité

| # | Écart | Gravité | Article |
|---|---|---|---|
**E-1** | **L'entité opératrice du brouillon n'est pas celle qui édite le service** | **bloquant** | tout le texte |
**E-2** | **La politique de confidentialité ne couvre pas le traitement MCP**, alors qu'elle lui est opposée | **bloquant** | art. 10, 21 |
**E-3** | **Aucune acceptation des CGU n'est recueillie** — opposabilité non établie | **majeur** | art. 4 |
**E-4** | **L'article 10 ne dit pas que le contenu est transmis à un tiers** | **majeur** | art. 10 |
**E-5** | **L'article 7 annonce plans, exports et suivi longitudinal** — inexistants | **majeur** | art. 7 |
**E-6** | **Conservation en aval inconnue**, donc non rédigeable | **majeur** | art. 10, 21, 24 |
**E-7** | **L'article 9 vise un « Client » non identifiable** | **moyen** | art. 9 |
**E-8** | **Protocole et Exports n'existent pas** sur ce chemin | **moyen** | art. 7, 9 |
**E-9** | **Comparabilité entre versions non mentionnée**, alors que le service la signale à chaque mesure | **mineur** | art. 8 |
**E-10** | **Champs non modélisés non mentionnés** | **mineur** | art. 8 |
**E-11** | **Mentions légales muettes sur le sous-domaine** | **mineur** | hors CGU |

---

## 4. Arbitrages — la liste courte

| # | Question | Qui |
|---|---|---|
**1** | **Quelle entité édite le service MCP** — association, société suisse, ou les deux par convention ? **Tout en dépend** | **Sébastien** |
**2** | **Un texte distinct pour le MCP, ou une extension des CGU ControlTower ?** | **Sébastien** |
**3** | **Comment l'acceptation est-elle recueillie** — hors bande, ou credential nominatif ? | **Sébastien** |
**4** | **Quelle est la conservation en aval** chez `api.neomundi.io` ? **À relever avant toute rédaction** | enquête |
**5** | **Quels sont les sous-traitants réels** en aval ? | enquête |
**6** | **Identité par utilisateur** — sans elle, ni quota, ni suspension, ni attribution, ni exercice des droits | **Sébastien** |
**7** | **Licence du connecteur** — dépôt public sans licence aujourd'hui | **Sébastien** |
**8** | **Statut de la marque** et droit de l'association d'exploiter l'instrument | **Sébastien** |
**9** | **Journaliser ou non** — confidentialité contre capacité à constater un abus | **Sébastien** |
**10** | **Consommateurs inclus ou exclus ?** Un catalogue public les expose, là où le brouillon vise les professionnels | **Sébastien** |

---

## 5. Ce qui est prêt, et ce qui ne l'est pas

**Prêt, et vérifié :** la discipline métrologique de l'article 8 est **tenue
par le code et par des tests**, pas seulement promise. L'absence de
conservation côté connecteur est **vérifiée**, pas déclarée. Les mentions
légales de l'association sont **à jour et exploitables**.

**Pas prêt :** l'identité de l'éditeur, l'opposabilité, la politique de
confidentialité, la conservation en aval, et la licence.

**Les CGU v0.1 ne doivent pas être publiées en l'état** — ce que le document
dit déjà lui-même en première page, et que cet audit confirme par les faits.

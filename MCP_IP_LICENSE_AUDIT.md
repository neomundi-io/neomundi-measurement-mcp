# Propriété intellectuelle et licences — état réel

**Relevé du 2026-11-01**, sur `0.3.0-rc.1` (`da71f5d`).

**Aucun transfert de propriété intellectuelle n'est présumé** entre le
fondateur, l'association et la société suisse. Ce document **constate**, il
n'attribue pas.

> ⚠ Audit **technique et documentaire**. Il ne vaut pas avis juridique.

---

## 0bis. Décision du 2026-11-01 — et ce qu'elle ne règle pas

**Neomundi Recherche, association loi 1901, est l'entité éditrice** et porte le
service MCP dans le cadre de ses activités expérimentales et scientifiques.
Cela **tranche** la question posée au §0 : l'ambiguïté entre l'association et
la société suisse est levée **pour l'édition du service**.

**Cela ne crée aucun droit.** Être éditeur d'un service, c'est en assumer la
responsabilité devant les tiers ; ce n'est **pas** détenir la propriété
intellectuelle de ce qu'on exploite. Restent donc entièrement ouverts, et
**aucun n'est présumé résolu par la décision** :

| Question | Effet de la décision |
|---|---|
Qui détient le **connecteur** ? | **inchangé** — aucun transfert n'est attesté |
Qui détient l'**instrument de mesure** ? | **inchangé** — il vit hors de ce dépôt |
Qui détient la **marque** et *Law E* ? | **inchangé** — explicitement ouvert, y compris dans le projet de CGU |
L'association a-t-elle le **droit d'exploiter** l'instrument ? | **non établi** — et c'est désormais le point le plus exposé, puisqu'elle est l'éditeur déclaré |

> **La décision augmente l'exposition de l'association** plutôt qu'elle ne la
> réduit : elle apparaît maintenant sans ambiguïté comme éditeur d'un service
> qui appelle un instrument dont rien n'établit qu'elle a le droit de
> l'exploiter. **Une licence écrite, même minimale et interne, devient
> nécessaire** — c'est `P-E`, et son urgence a changé.

**Conséquence documentaire immédiate :** le dépôt vit sous l'organisation
GitHub `neomundi-io`, alors que l'éditeur est l'association. Ce n'est pas
contradictoire en soi — un dépôt peut être hébergé par un tiers — mais cela
**doit être écrit quelque part**, faute de quoi le lecteur déduira une
titularité qui n'est pas établie.

---

## 0. Trois entités apparaissent, et elles ne se recouvrent pas

C'est le constat qui gouverne tout le reste.

| Entité | Ce qui l'atteste | Rôle apparent |
|---|---|---|
**Neomundi Recherche** — association loi 1901, RNA `W563015824`, siège à Paris | **VÉRIFIÉ** — mentions légales publiées sur `neomundi.org` | éditeur du site `.org` ; **déclarée `author` et `developerName` du plugin** |
**Louis M Sàrl** — société suisse, `CHE-420.630.910`, Morges | **VÉRIFIÉ** — brouillon de CGU v0.1 et dossier de cadrage | « Opérateur » du service **ControlTower** dans le projet de CGU |
**`neomundi-io`** — organisation GitHub | **VÉRIFIÉ** — propriétaire du dépôt | hébergement du code du connecteur |

**VÉRIFIÉ, et il faut le dire franchement :** l'amont que le connecteur appelle
s'identifie lui-même comme **`controltower-api`** (champ `system_id` d'une
mesure réelle), et la route est `api.neomundi.io`. Le connecteur publié sous le
nom de l'**association** appelle donc un service dont le projet de CGU désigne
une **société suisse** comme opérateur.

**DÉCISION — qui est l'éditeur du service MCP ?** Rien dans le dépôt ne
tranche. La doctrine interne sépare pourtant `.org` (association, publie les
preuves) et `.io` (activité commerciale) — et le connecteur vit sous
l'organisation **`neomundi-io`** tout en déclarant l'**association** comme
auteur. **Cette contradiction est dans le manifeste publié.**

---

## 1. L'instrument de mesure

| | |
|---|---|
Où vit-il | **hors de ce dépôt** — `api.neomundi.io`, le moteur, les protocoles et les métriques |
Ce que le dépôt en contient | **VÉRIFIÉ** — uniquement des **schémas de réponse** embarqués (`govern-rest-1.0`, `govern-sse-1.0`) pour valider un contrat de fil |
Titularité | **NON VÉRIFIÉ.** Aucun document du dépôt ne l'énonce |
Statut dans le projet de CGU | **explicitement ouvert** : l'article 13 porte une zone « INFORMATION À RENSEIGNER » sur le statut de la marque NeoMundi et de la méthodologie *Law E* — licence, cession, apport, ou statu quo |

**Le connecteur ne contient pas l'instrument.** Il ne calcule aucun signal, ne
fixe aucun seuil et n'implémente aucune métrique : il transmet et restitue.
Cette séparation est **VÉRIFIÉE** par le code, et elle est favorable — elle
permet d'ouvrir le connecteur sans rien décider de l'instrument.

---

## 2. Le connecteur MCP

**VÉRIFIÉ, et c'est le défaut principal de cet audit :

- **aucun fichier `LICENSE`** à la racine du dépôt ;
- **aucun champ `license`** dans `package.json`, `runtime/package.json` ni
  `plugin.json` ;
- **aucune mention de copyright** dans aucun fichier publié — recherche
  exhaustive sur `copyright`, `(c) 20`, `all rights reserved`, `SPDX` :
  **zéro occurrence** ;
- **aucun `LICENSE` dans l'image Docker** non plus (`/app/LICENSE` absent) ;
- l'API GitHub confirme : `license: null`, `private: false`,
  **`visibility: public`**.

### Ce que cela produit juridiquement

Un dépôt **public sans licence** n'est pas un dépôt ouvert. À défaut de
licence, **tous les droits sont réservés** par défaut : un tiers peut lire le
code, mais **n'a aucun droit** de le copier, de le modifier ou de le
redistribuer.

C'est **exactement l'inverse** de ce qu'un lecteur suppose en voyant un dépôt
public, et **incompatible** avec la contrainte posée dès le début de ce
chantier : rester compatible avec un scénario propriétaire **et** un scénario
ouvert. **Aujourd'hui, le dépôt n'est ni l'un ni l'autre : il est ambigu.**

**DÉCISION — il faut une licence explicite**, quelle qu'elle soit, y compris
une notice « tous droits réservés » assumée. L'ambiguïté est le seul choix
qui n'en est pas un.

**NON VÉRIFIÉ — qui est titulaire du connecteur ?** Le dépôt appartient à
l'organisation `neomundi-io`, le manifeste nomme l'association, et aucun
contrat de cession ou de licence n'est présent. **Rien n'est présumé ici.**

---

## 3. Marque et contenus NeoMundi

| Élément | État |
|---|---|
Marque « NeoMundi » | **NON VÉRIFIÉ** — aucun dépôt de marque n'est attesté dans ce dépôt. Le projet de CGU laisse son statut explicitement ouvert |
Signe graphique | **VÉRIFIÉ** — l'icône du plugin est **dérivée** de la marque existante, provenance et transformation documentées dans `assets/README.md`. **Titularité NON VÉRIFIÉE** |
Nom « ControlTower » | **VÉRIFIÉ** qu'il désigne l'amont ; rattachement juridique **NON VÉRIFIÉ** |
Méthodologie *Law E* | **NON VÉRIFIÉ** ; explicitement ouverte dans le projet de CGU |
Contenus `.org` | hors périmètre |

**DÉCISION.** Le plugin **affiche la marque** — nom, icône, `displayName`. Si
la titularité est chez une entité et l'exploitation chez une autre, il faut une
**licence de marque écrite**, même minimale, même interne.

---

## 4. L'association dans l'exploitation expérimentale

**VÉRIFIÉ :** l'association est déclarée `author` et `developerName` du plugin,
`neomundi.org` est déclaré comme site, et le service tourne sur un sous-domaine
de ce `.org`.

**NON VÉRIFIÉ :** qu'elle détienne un droit quelconque sur le connecteur, sur
l'instrument ou sur la marque ; qu'une licence lui ait été consentie ; qu'une
convention encadre l'exploitation expérimentale.

**DÉCISION — l'association est exposée.** Elle apparaît publiquement comme
éditeur d'un service qui appelle un instrument dont rien n'établit qu'elle a le
droit de l'exploiter. Trois voies possibles, et aucune n'est prise :

1. une **licence d'exploitation expérimentale** consentie à l'association,
   bornée dans le temps et dans l'objet ;
2. une **convention de mise à disposition** entre l'association et le titulaire
   réel ;
3. **changer l'éditeur déclaré** du plugin pour l'entité qui détient les droits.

---

## 5. Dépendances open source

### 5.1 Le connecteur lui-même : aucune dépendance

**VÉRIFIÉ.** `dependencies` et `devDependencies` sont **vides** dans les deux
manifestes ; `node_modules` est absent ; les seuls imports non relatifs sont
`node:assert`, `node:crypto`, `node:fs`, `node:http`, `node:url` — tous
**natifs**.

**Conséquence : le code du connecteur ne porte aucune obligation de licence
tierce.** C'est une position rare et confortable, et elle mérite d'être
préservée délibérément.

### 5.2 L'image Docker : des obligations existent

**VÉRIFIÉ** en inspectant l'image servie. Elle embarque, outre le code :

- **Node.js v24.22.2** (licence MIT, plus ses propres composants) ;
- **19 paquets Alpine**, dont `busybox`, `musl` via `alpine-baselayout`,
  `libcrypto3`/`libssl3` (OpenSSL), `libgcc`, `libstdc++`,
  `ca-certificates-bundle`, `apk-tools` ;
- **yarn v1.22.22**, non utilisé par le connecteur.

Fichiers de licence effectivement présents : `/usr/local/LICENSE` (Node) et
`/opt/yarn-v1.22.22/LICENSE`.

**Le point à connaître : `busybox` est sous GPL-2.0.** Redistribuer une image
qui le contient entraîne les obligations de cette licence, notamment la mise à
disposition des sources correspondantes.

**VÉRIFIÉ — aucune distribution n'a lieu aujourd'hui.** L'image **n'est
publiée sur aucun registre** : elle est construite sur la machine qui
l'exécute, et le paquet ZIP **ne contient pas d'image**. L'obligation **n'est
donc pas déclenchée**.

**DÉCISION — elle le serait le jour où l'image est publiée** sur un registre
ou jointe à une livraison. À trancher **avant** ce jour, pas après.

### 5.3 Le paquet ZIP

**VÉRIFIÉ.** 38 fichiers, uniquement du code et de la documentation du dépôt,
plus les icônes. **Aucune dépendance tierce.** Il ne contient donc **aucune**
obligation de licence externe — mais il ne contient **pas non plus de
`LICENSE`**, ce qui lui fait porter la même ambiguïté qu'au §2.

---

## 6. Ce qu'une CGU peut affirmer, et ce qu'elle ne peut pas

**Peut être affirmé, car vérifié :**

- le connecteur **n'embarque aucune dépendance tierce** ;
- il **ne contient pas l'instrument de mesure** ;
- il **ne conserve ni n'exploite** le contenu soumis (voir l'audit des
  données) ;
- l'image s'appuie sur une base publique **épinglée par digest**.

**Ne peut PAS être affirmé aujourd'hui :**

| Formulation à proscrire | Pourquoi |
|---|---|
« l'Opérateur conserve l'ensemble des droits de PI sur le Service » | **non établi** : aucune licence, aucune cession, aucun copyright dans le dépôt |
toute mention de la marque comme propriété d'une entité nommée | statut **explicitement ouvert**, y compris dans le projet de CGU |
« code open source » | **faux** : public **sans licence** = tous droits réservés |
« code propriétaire » sans notice | **invérifiable** : rien ne le dit dans le dépôt |

---

## 7. Arbitrages

| # | Point | Qui |
|---|---|---|
**P-A** | **Licence du connecteur.** Un dépôt public sans licence n'est ni ouvert ni clairement fermé. **Tout le reste attend cette décision** | **Sébastien** |
**P-B** | **Titulaire du connecteur** — organisation GitHub, association, ou société ? Le manifeste et le dépôt se contredisent aujourd'hui | **Sébastien** |
**P-C** | **Statut de la marque et de la méthodologie** — déjà ouvert dans le projet de CGU (art. 13) | **Sébastien** |
**P-D** | **Licence de marque** permettant au plugin d'afficher le nom et l'icône | **Sébastien** |
**P-E** | **Droit de l'association d'exploiter l'instrument**, même à titre expérimental | **Sébastien** |
**P-F** | **Publication de l'image** : à décider **avant**, pour les obligations GPL de `busybox` | une session, après P-A |
**P-G** | Ajouter une notice de copyright dans le dépôt **et** dans le paquet | une session, après P-A |

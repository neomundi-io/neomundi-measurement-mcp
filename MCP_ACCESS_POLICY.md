# Accès, quotas et limites — état réel

**Relevé du 2026-11-01**, sur `0.3.0-rc.1` (`da71f5d`) tel que déployé.

**Aucun quota, aucune garantie et aucune limite n'est inventé ici.** Ce qui
n'est pas configuré est écrit comme **non configuré**, et non comme
« illimité ».

---

## 1. Authentification — un seul credential, partagé

**VÉRIFIÉ.**

| | |
|---|---|
Mécanisme | `Authorization: Bearer`, **une seule valeur**, comparaison à **temps constant** |
Provenance | variable d'environnement du processus ; **aucun fichier `.env` n'est lu** |
Portée | **aucune** — le credential ouvre tout l'outil |
Expiration | **aucune** |
Rotation | **aucune procédure outillée** ; changer la valeur et redémarrer |
Comptes | **aucun.** Pas d'inscription, pas de profil, pas d'administrateur |
Identité de l'appelant | **aucune.** Le connecteur ne sait pas qui l'appelle |

Gardes qui s'ajoutent au credential, **VÉRIFIÉS** :

- liste blanche d'en-têtes `Host` — tout autre `Host` reçoit **403 avant même
  la lecture du credential** ;
- contrôle d'`Origin` ;
- un seul en-tête `Authorization` accepté — en présenter deux est refusé.

**Conséquence, et elle est structurante : il n'y a pas d'« utilisateurs », il y
a des porteurs du même secret.** Tout ce qui suit en découle.

---

## 2. Quotas — ce qui est configuré, et ce qui ne l'est pas

### 2.1 Limites locales du connecteur — **VÉRIFIÉES**

Ce sont des limites de **protection du processus**, pas des quotas d'usage.
Elles s'appliquent **globalement**, jamais par appelant, puisqu'il n'y a pas
d'appelant distinct.

| Limite | Valeur |
|---|---|
Appels simultanés | **8** — au-delà, `429` |
Sessions MCP simultanées | **32** — au-delà, `503` |
Expiration de session | 30 min sans requête |
Taille de requête | **1 Mio** |
Taille de réponse amont | **2 Mio** |
Délai total par appel | **120 s** ; inactivité réseau **30 s** |
Événements SSE | 10 000 |

### 2.2 Limitation de débit — **AUCUNE**

**VÉRIFIÉ.** Ni Caddy (aucune directive), ni le connecteur, ni `ufw`
(**inactif**) n'impose de limite de débit. Le plafond de **8 appels
simultanés** est la seule borne, et un appelant peut l'occuper entièrement.

### 2.3 Quota côté API — **NON VÉRIFIABLE depuis le connecteur**

**VÉRIFIÉ, négatif.** L'enveloppe d'une mesure réelle ne contient **aucun**
champ de quota, de solde, de palier ou d'usage restant. Les champs
`cost_score` et `cost_proxy` sont des **signaux de mesure**, pas une
facturation.

Ce que le connecteur sait faire, et c'est tout : **classer un refus**. Un `402`
est documenté comme « quota ou solde a refusé l'appel, aucune mesure
produite », un `401` comme clé invalide, suspendue ou révoquée.

**`BL-001` complique même cette lecture** : sur un compte d'essai, un `402`
peut annoncer un quota épuisé alors qu'il en reste, et laisser les clés
suspendues. **Un `402` ne prouve donc pas l'épuisement.**

> **Rien ne permet d'écrire un chiffre de quota dans une CGU aujourd'hui.**
> Le palier réel de la clé de l'association est **NON VÉRIFIÉ** : il se lit
> côté API ou sur le portail, pas ici.

---

## 3. Suspension et révocation

| Capacité | État |
|---|---|
Suspendre **un** utilisateur | **impossible** — aucune identité à suspendre |
Révoquer **un** accès | **impossible** pour la même raison |
Couper **tout** le service | **VÉRIFIÉ, possible** — changer le credential et redémarrer, ou arrêter l'unité systemd |
Suspension par l'amont | **VÉRIFIÉ** — l'API peut refuser la clé (`401`/`403`), ce qui coupe **tout le monde en même temps** |
Journal des accès pour instruire un abus | **aucun** (voir l'audit des données) |

**DÉCISION.** La seule sanction disponible est **collective**. Une CGU qui
annonce une suspension individuelle décrirait une capacité qui n'existe pas.

---

## 4. Protection contre les abus

**VÉRIFIÉ — ce qui existe :**

- le credential partagé, qui écarte le passant anonyme ;
- les bornes de taille et de concurrence du §2.1 ;
- **aucune relance automatique** : un abus ne se multiplie pas tout seul ;
- aucun corps d'erreur amont renvoyé, donc peu de surface d'exploration ;
- le conteneur tourne **en lecture seule**, sans privilèges, capacités
  retirées.

**VÉRIFIÉ — ce qui manque :**

- **aucune limitation de débit** (§2.2) ;
- **aucune détection d'anomalie**, puisque rien n'est journalisé ;
- **aucune liste noire** possible sans identité ;
- `ufw` **inactif** ;
- **le partage du credential est indétectable.** S'il fuite, le premier
  symptôme observable sera une facture ou un `402`.

---

## 5. Utilisateurs multiples — ce que « gratuit » veut dire aujourd'hui

**VÉRIFIÉ.** Tous les appelants partagent :

1. **le même credential d'entrée** — donc les mêmes droits ;
2. **la même clé API NeoMundi** — donc **la même facture et le même palier** ;
3. **le même plafond de 8 appels simultanés** — donc un appelant peut gêner
   les autres ;
4. **la même absence de traçabilité** — aucun appel n'est attribuable.

**Il n'y a aucune séparation entre utilisateurs. Aucune.** Le service est
techniquement *mono-locataire exposé publiquement*, et le présenter autrement
serait inexact.

---

## 6. Coûts supportés par l'association

| Poste | État |
|---|---|
VPS Infomaniak | **VÉRIFIÉ qu'il existe** ; **montant NON VÉRIFIÉ** — hors de ce dépôt |
Nom de domaine `neomundi.org` | **NON VÉRIFIÉ** |
Certificat TLS | **VÉRIFIÉ — gratuit** (Let's Encrypt) |
Appels API NeoMundi | **VÉRIFIÉ qu'ils sont imputés à une clé unique** ; **coût unitaire et palier NON VÉRIFIÉS** |
Appels fournisseur (génération) | **VÉRIFIÉ** qu'ils passent par une clé fournisseur unique ; **montant NON VÉRIFIÉ** |
Plafond de dépense | **AUCUN mécanisme** côté connecteur |

**DÉCISION — c'est le risque financier principal.** Un point d'entrée public,
sans quota, sans limitation de débit et sans identité, adossé à **une** clé
facturée : la dépense est bornée par le palier de cette clé, et par rien
d'autre côté connecteur. Et le connecteur **ne peut pas lire** ce palier
(§2.3).

---

## 7. Ce qu'une CGU peut écrire aujourd'hui, et ce qu'elle ne peut pas

**Peut être écrit, car vérifié :**

- accès **expérimental**, fourni **en l'état**, **sans engagement de
  disponibilité** ;
- **aucun compte individuel**, aucune identité, aucune attribution ;
- limites techniques du §2.1, **globales et non garanties** ;
- **suspension collective** possible à tout moment, sans préavis ;
- aucun engagement de conservation : **rien n'est conservé** côté connecteur.

**Ne peut PAS être écrit aujourd'hui :**

| Formulation à proscrire | Pourquoi |
|---|---|
un quota chiffré par utilisateur | aucun quota n'est configuré, et aucune identité n'existe |
« suspension du compte fautif » | aucun compte, aucune suspension individuelle |
un engagement de disponibilité | aucun SLA, aucune supervision, aucune alerte |
« usage équitable » opposable | rien ne le mesure ni ne le constate |
une durée de conservation chiffrée | **à l'exception** de « aucune » côté connecteur, qui est vraie |
« nous détectons les abus » | aucun journal, aucune détection |

---

## 8. Arbitrages

| # | Point | Qui |
|---|---|---|
**A-1** | **Identité par utilisateur** — sans elle, ni quota, ni suspension, ni attribution ne sont possibles. Tout le reste en dépend | **Sébastien** |
**A-2** | **Plafond de dépense** — aujourd'hui borné par le palier d'une clé que le connecteur ne peut pas lire | **Sébastien** |
**A-3** | **Limitation de débit** — une directive Caddy suffirait, mais elle suppose de décider d'un seuil | **Sébastien** |
**A-4** | **Palier réel de la clé de l'association** — à relever côté API avant toute promesse | enquête |
**A-5** | **Journaliser ou non** — aujourd'hui rien n'est journalisé, ce qui est une **qualité de confidentialité** et une **impossibilité de constater un abus**. On ne peut pas avoir les deux | **Sébastien** |

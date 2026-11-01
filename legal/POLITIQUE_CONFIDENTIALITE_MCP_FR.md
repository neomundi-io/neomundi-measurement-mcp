# Politique de confidentialité — complément « service de mesure MCP »

**Version 0.1 — projet de travail, non publiable en l'état.**
**Date : [À COMPLÉTER].**

> ⛔ **Projet non publié, sans effet.** À relire par un conseil compétent.

**Ce document complète la politique de confidentialité existante de
`neomundi.org`. Il ne la remplace pas.** La politique actuelle décrit le
**site** — formulaire de contact, lettre d'information, données techniques,
mesure d'audience. Elle **ne décrit pas** le service de mesure, et doit donc
être complétée par ce qui suit avant que la page ne puisse être opposée au
service MCP.

**Tous les faits ci-dessous ont été vérifiés** sur le service réel les
2026-11-01. Les preuves sont consignées dans
[l'audit du traitement des données](../MCP_DATA_PROCESSING_AUDIT.md) et le
[rapport aval](../MCP_DOWNSTREAM_DATA_REPORT.md).

---

## 1. Ce qu'il faut comprendre d'abord

Mesurer une réponse d'intelligence artificielle suppose de la **lire**. Le
contenu que vous soumettez est donc **transmis à notre infrastructure de
mesure**. Ce n'est pas un choix de conception que nous pourrions défaire :
c'est ce qu'est une mesure.

Ce que nous pouvons dire précisément, et qui est vérifié :

- **le connecteur ne conserve rien** — aucun fichier, aucun journal de
  contenu, **aucune adresse IP** ;
- **votre invite n'est jamais conservée** — seule sa longueur l'est ;
- **des extraits de la réponse peuvent être conservés**, copiés tels quels,
  lorsque l'analyse de factualité dépasse un seuil.

Ce dernier point est le plus important de cette page. Nous l'énonçons en tête
plutôt que de le laisser dans un tableau.

---

## 2. Tableau par traitement

### T-1 — Transmission du contenu soumis pour mesure

| | |
|---|---|
**Données** | Invite, réponse du système observé, extraits de contexte, documents fournis, métriques techniques (jetons, latence). **Peuvent contenir des données personnelles si vous en soumettez.** |
**Finalité** | Produire une mesure du comportement du système observé |
**Base juridique** | **[À CONFIRMER]** — intérêt légitime de l'association à la qualification scientifique de son instrument, ou exécution de la convention de pilote. **Non tranché** |
**Responsable** | Neomundi Recherche **[à confirmer — voir §4]** |
**Sous-traitants** | **Infomaniak Network SA** (Suisse) — hébergement et modèle d'analyse de factualité |
**Conservation** | **Aucune conservation par le connecteur** — vérifié. En aval : voir T-2 et T-3 |
**Destinataires** | L'infrastructure de mesure ; Infomaniak pour l'analyse de factualité. **Aucun autre tiers** |
**Droits** | Formulaire `https://neomundi.org/contact`. **Limite réelle** : le connecteur ne conservant rien, il ne peut rien supprimer ; l'exercice porte sur T-2 et T-3 |

### T-2 — Conservation d'extraits de la réponse

| | |
|---|---|
**Données** | **Jusqu'à cinq extraits courts de la réponse, copiés mot pour mot**, accompagnés d'une catégorie et d'une explication brève. Déclenché uniquement lorsque l'analyse de factualité dépasse son seuil |
**Finalité** | Documenter ce qui, dans une réponse, a motivé le signal de factualité — la mesure serait ininterprétable sans l'extrait correspondant |
**Base juridique** | **[À CONFIRMER]** — même question que T-1 |
**Responsable** | Neomundi Recherche **[à confirmer]** |
**Sous-traitants** | Infomaniak (hébergement de la base ; production des extraits par le modèle d'analyse) |
**Conservation** | ⚠ **Aucune durée n'est configurée à ce jour.** Les enregistrements les plus anciens datent de **mai 2026** et aucune purge n'existe. **Une durée doit être fixée avant publication** — §5 |
**Destinataires** | Personnel habilité de l'association **[à préciser]** |
**Droits** | Accès, rectification, effacement, limitation, opposition — formulaire de contact. ⚠ **Les sauvegardes conservent une copie pendant 14 jours** après une suppression en base |

> **Chiffres vérifiés, donnés pour que personne n'ait à les deviner :**
> **21 870 enregistrements sur 338 578** portent de tels extraits — soit
> **6,5 %** — d'une longueur moyenne de **498 caractères**.

### T-3 — Métadonnées et résultats de mesure

| | |
|---|---|
**Données** | Identifiant de requête, horodatage, **longueur** de l'invite et de la réponse, signaux mesurés, décision et son fondement, versions, identifiants d'évaluateurs. **Ni l'invite ni la réponse elles-mêmes** (hors T-2) |
**Finalité** | Produire la mesure, en garantir la traçabilité et la reproductibilité scientifique |
**Base juridique** | **[À CONFIRMER]** |
**Responsable** | Neomundi Recherche **[à confirmer]** |
**Sous-traitants** | Infomaniak (hébergement) |
**Conservation** | ⚠ **Aucune durée configurée** — voir T-2 |
**Destinataires** | Personnel habilité ; **extraits publiables** dans des publications scientifiques, dans les conditions de la convention de pilote |
**Droits** | Formulaire de contact |

### T-4 — Journaux techniques de l'infrastructure de mesure

| | |
|---|---|
**Données** | **Adresse IP** de l'appelant, horodatage, méthode et chemin HTTP, code de réponse, agent utilisateur, référent. **Aucun contenu soumis n'y figure** — vérifié |
**Finalité** | Sécurité, diagnostic, continuité de service |
**Base juridique** | **[À CONFIRMER]** — intérêt légitime à la sécurité du service |
**Responsable** | Neomundi Recherche **[à confirmer]** |
**Sous-traitants** | Infomaniak (hébergement) |
**Conservation** | Journaux du serveur web : **14 jours** (rotation quotidienne, 14 fichiers). ⚠ Journaux des conteneurs et journal système : **aucune rotation configurée** — §5 |
**Destinataires** | Personnel habilité |
**Droits** | Formulaire de contact |

### T-5 — Sauvegardes de la base

| | |
|---|---|
**Données** | Copie complète de la base, **extraits de T-2 compris** |
**Finalité** | Continuité et restauration après incident |
**Base juridique** | **[À CONFIRMER]** |
**Responsable** | Neomundi Recherche **[à confirmer]** |
**Sous-traitants** | Infomaniak (hébergement). **Aucune copie hors de la machine** — vérifié |
**Conservation** | **14 jours** — sauvegarde quotidienne, suppression automatique au-delà |
**Destinataires** | Personnel habilité |
**Droits** | ⚠ Une demande d'effacement **ne prend pleinement effet qu'après 14 jours**, le temps que les sauvegardes expirent. **À dire au demandeur** |

### T-6 — Gestion des accès pilotes

| | |
|---|---|
**Données** | Identité du participant, organisation, coordonnées, identifiant technique délivré |
**Finalité** | Autoriser et administrer l'accès au service |
**Base juridique** | Exécution de la convention de participation |
**Responsable** | Neomundi Recherche |
**Sous-traitants** | **[À COMPLÉTER]** — messagerie et outils de gestion utilisés |
**Conservation** | **[À COMPLÉTER]** — aucune durée n'est fixée |
**Destinataires** | Personnel habilité |
**Droits** | Formulaire de contact |

### T-7 — Connecteur MCP

| | |
|---|---|
**Données** | **Aucune conservation.** Le connecteur n'écrit aucun fichier, ne journalise aucun contenu et n'enregistre aucune adresse IP — vérifié par recherche sur une mesure réelle |
**Conservation** | **Sans objet** |

---

## 3. Transfert hors Union européenne

**Le traitement a lieu en Suisse.** Nos serveurs et le modèle d'analyse de
factualité sont hébergés par **Infomaniak Network SA** (Genève).

La Suisse bénéficie d'une **décision d'adéquation** de la Commission
européenne : le transfert est licite sans garanties supplémentaires. **Nous
l'énonçons parce qu'un lecteur ne doit pas avoir à le supposer.**

---

## 4. Ce qui n'est pas encore établi

| # | Élément manquant | Effet sur la publication |
|---|---|---|
**M-1** | **Durée de conservation des mesures et des extraits** | ⛔ **Bloquant.** Une politique ne peut pas annoncer une durée qui n'existe pas, ni rester muette sur un stockage sans fin |
**M-2** | **Qualification des rôles** responsable / sous-traitant entre l'association et l'exploitant de l'infrastructure | ⛔ **Bloquant.** Détermine qui répond des demandes et si un accord de sous-traitance est requis |
**M-3** | **Base juridique** de T-1 à T-5 | ⛔ **Bloquant** |
**M-4** | **Accord de sous-traitance (DPA) avec Infomaniak** — rectification du compte demandée le **2026-11-01** | ⛔ **Bloquant** tant qu'il n'est pas au nom de l'association |
**M-5** | **Ce qu'Infomaniak conserve** du contenu envoyé à son service d'IA | ⛔ **Bloquant** — seul point où du contenu sort de nos machines, et **non vérifiable depuis nos systèmes** |
**M-6** | **Rotation des journaux** de conteneurs et du journal système | ⚠ À configurer, sinon T-4 ne peut annoncer aucune durée |
**M-7** | **Personnel habilité** — qui accède, selon quelle règle | ⚠ À préciser |
**M-8** | **Sous-traitants et durée** de T-6 | ⚠ À préciser |

**Tant que M-1 à M-5 ne sont pas levés, cette politique ne peut pas être
publiée comme conforme.** Elle peut l'être comme *projet*, ce qu'elle est.

---

## 5. Décisions recommandées

1. **Fixer une durée de conservation** pour les mesures et les extraits, puis
   **la mettre en œuvre techniquement**. Un texte doit décrire une
   configuration réelle, pas une intention.
2. **Décider du sort des extraits** (T-2). Le fondateur a tranché : la
   capacité est **conservée**. La politique doit donc la **décrire
   franchement** — ce qu'elle fait ci-dessus — plutôt que la minimiser.
3. **Configurer la rotation** des journaux de conteneurs et du journal
   système.
4. **Obtenir le DPA Infomaniak** au nom de l'association, et **ce qu'Infomaniak
   conserve**.

# Feuille de route de reprise — connecteur MCP NeoMundi

**Établie le 1er novembre 2026**, à la clôture de la première phase.
État des composants : [`PLUGIN_CHECKPOINT_2026-11-01.md`](PLUGIN_CHECKPOINT_2026-11-01.md).

> ## Deux règles qui gouvernent cette feuille
>
> **Aucun correctif issu de l'audit Pradeep n'est intégré.** Les tâches marquées
> *attend Codex* ne doivent pas être commencées avant que les conclusions soient
> écrites — §14 du point de clôture.
>
> **Un composant joignable n'est pas un composant testé.** Les critères de
> validation ci-dessous exigent une **exécution**, pas une inspection.

---

## P0 — Publier le plugin

Sept tâches. **Deux seulement dépendent de quelqu'un d'autre que nous.**

### P0-1 — Déclarer le bloc `auth` dans `mcp.json`

| | |
|---|---|
| **Statut** | **BLOQUÉ** — c'est `P-6`, et c'est la **première marche** |
| **Dépendances** | aucune. Rien n'attend |
| **Preuves disponibles** | `mcp.json` et `.mcp.json` existent et sont servis ; le serveur exige déjà un `Bearer` sur tous les chemins (`401` vérifié) |
| **Action exacte** | récupérer le schéma officiel `mcp.json`, y vérifier la forme du bloc `auth`, le déclarer, et faire échouer un test si le bloc disparaît |
| **Critère de validation** | `mcp.json` valide contre le schéma officiel **téléchargé**, pas contre une lecture de documentation ; et un test du dépôt qui tombe si le bloc est retiré |

> **Pourquoi c'est la première marche.** Sans ce bloc, ChatGPT ne peut pas
> présenter l'authentification à l'utilisateur. Tout le reste de P0 en dépend.

### P0-2 — Trancher l'imbrication `extensions.com.openai`

| | |
|---|---|
| **Statut** | **BLOQUÉ** — c'est `P-7` |
| **Dépendances** | aucune |
| **Preuves disponibles** | le dépôt place les champs sous `interface` ; la documentation lue les décrit **à plat**. **Les deux ne peuvent être vraies, et aucune n'a été validée contre le schéma** |
| **Action exacte** | valider `plugin.json` contre le schéma officiel et corriger l'imbrication perdante |
| **Critère de validation** | validation du schéma réussie, et `tests/plugin-package.test.mjs` adapté à la forme retenue |

### P0-3 — Connexion réelle depuis ChatGPT

| | |
|---|---|
| **Statut** | **NON TESTÉ** — jamais tenté |
| **Dépendances** | **P0-1**, puis **P0-2** |
| **Preuves disponibles** | un hôte MCP réel a été connecté — **Claude Code 2.1.247**, amont **substitué** (`ML-009`). Cela valide le transport, **pas ChatGPT** |
| **Action exacte** | ajouter le connecteur dans ChatGPT avec le credential, exécuter une mesure sur le **vrai** amont, et consigner `request_id`, durée, décision et fondement |
| **Critère de validation** | une mesure revenue dans ChatGPT avec un `request_id` que l'on retrouve côté API, et **aucun signal ni provenance modifié** |

> **Ne pas déclarer cette tâche faite sur la foi d'une poignée de main.** Le
> critère est une mesure complète, attribuable, et retrouvée des deux côtés.

### P0-4 — Valider le mécanisme d'authentification

| | |
|---|---|
| **Statut** | **PARTIEL** |
| **Dépendances** | P0-1 ; se vérifie pendant P0-3 |
| **Preuves disponibles** | `401` sur `/`, `/health` et `/mcp` sans jeton, vérifié le 2026-11-01 depuis l'extérieur. **Aucun chemin ouvert, pas même un contrôle de santé** |
| **Action exacte** | depuis ChatGPT : vérifier qu'un jeton absent, un jeton erroné et un jeton valide produisent respectivement un refus, un refus et une mesure — et que **le refus ne fabrique aucune mesure** |
| **Critère de validation** | les trois cas observés depuis l'hôte, et le message de refus ne divulgue ni le credential ni la forme attendue |

### P0-5 — Vérifier l'organisation et le domaine

| | |
|---|---|
| **Statut** | **BLOQUÉ** — `P-4` et `P-5`, **hors de notre portée** |
| **Dépendances** | compte de la plateforme ; accès DNS pour `mcp.neomundi.org` |
| **Preuves disponibles** | aucune — l'état de la vérification d'identité est **inconnu depuis ce dépôt** |
| **Action exacte** | **Sébastien** : vérifier l'identité de l'organisation sur le tableau de bord sous le nom de publication, puis relever le défi de vérification de domaine |
| **Critère de validation** | les deux vérifications affichées comme acquises sur le tableau de bord |

> **C'est la seule tâche P0 que personne d'autre ne peut faire à votre place**,
> et elle n'a aucune dépendance technique : elle peut démarrer **maintenant**,
> en parallèle de P0-1.

### P0-6 — Cas de test positifs et négatifs

| | |
|---|---|
| **Statut** | **PARTIEL** — les trois cas négatifs sont **déjà écrits, en substance** |
| **Dépendances** | P0-3 pour l'exécution depuis l'hôte |
| **Preuves disponibles** | `docs/PUBLICATION.md` §4.3 : (1) un `ALLOW` décidé **sans aucun contrôle**, déclaré comme tel par la carte ; (2) une **version divergente**, déclarée non comparable ; (3) une **erreur amont**, classée transport, **aucune mesure fabriquée, aucune relance** |
| **Action exacte** | produire **cinq positifs** et **trois négatifs** exécutés depuis ChatGPT, et les rédiger au format du dossier de candidature |
| **Critère de validation** | huit cas avec entrée, sortie observée et capture ; les trois négatifs montrant que **rien n'est inventé** |

> **C'est l'endroit où ce connecteur est plus défendable que la moyenne.** Les
> trois cas négatifs sortent directement de la suite de tests ; il s'agit de les
> rejouer dans l'hôte, pas de les écrire.

### P0-7 — Capture de la carte, vidéo et dossier

| | |
|---|---|
| **Statut** | **NON TESTÉ** — `P-8`, `P-9` |
| **Dépendances** | P0-3 et P0-6 |
| **Preuves disponibles** | la carte est servie, sa ressource a été lue depuis l'extérieur, **39 tests** la couvrent. **Personne ne l'a vue s'afficher dans ChatGPT** |
| **Action exacte** | capture de la carte depuis une charge **synthétique**, vidéo de démonstration, URL accessible au relecteur, compte de test **sans MFA**, notes de version |
| **Critère de validation** | dossier complet ; **aucune capture produite depuis un enregistrement réel** — une mesure réelle est une donnée d'exécution tenue hors du dépôt |

### P0-8 — Vérification finale du manifeste et des URL légales

| | |
|---|---|
| **Statut** | **VALIDÉ pour les URL**, à revérifier juste avant soumission |
| **Dépendances** | P0-2 (la forme du manifeste peut changer) |
| **Preuves disponibles** | les **quatre** pages juridiques répondent `200` le 2026-11-01 ; `termsOfServiceURL` → `https://neomundi.org/cgu`, `privacyPolicyURL` → `https://neomundi.org/politique-de-confidentialite`, les deux **pages françaises, celles qui font foi** ; empreintes consignées au point de clôture §8 et §9 |
| **Action exacte** | rejouer les quatre requêtes et `node scripts/cgu-fingerprint.mjs` le jour de la soumission |
| **Critère de validation** | quatre `200`, empreintes identiques à celles du registre, et `check-publication.mjs` vert |

### Ce que P0 ne contient pas, et pourquoi

**Le multi-utilisateur n'est pas dans P0.** `D-4` est explicite : un credential
partagé est acceptable pour **un essai privé porté par l'association**. Il
devient obligatoire dès qu'un tiers utilise le connecteur — c'est donc P1-1, pas
P0. **Mais la candidature ne doit alors pas présenter le connecteur comme
multi-utilisateur.**

---

## P1 — Qualité et exploitation

### P1-1 — Utilisateurs pilotes : identité, clés, révocation

| | |
|---|---|
| **Statut** | **BLOQUÉ** — `P-10`, `D-4` |
| **Dépendances** | décision produit ; et la **garde d'acceptation des CGU** |
| **Preuves disponibles** | l'absence d'individualisation est **déjà déclarée publiquement**, à l'article 6 des CGU et dans la politique de confidentialité : « l'accès n'est pas individualisé, **donc la suspension est collective** » |
| **Action exacte** | clé par participant, attribution d'usage, révocation unitaire ; et **suspension individuelle** là où elle est aujourd'hui collective |
| **Critère de validation** | deux participants, deux clés ; révoquer l'une **sans affecter** l'autre, vérifié par exécution |

> **Garde en vigueur, à ne pas lever** : aucun accès ne doit être délivré avant
> acceptation écrite des CGU v1.0, enregistrée avec **l'empreinte du texte
> accepté**. Le mécanisme est prêt : `scripts/cgu-fingerprint.mjs` désigne la
> version 1.0 comme acceptable.

### P1-2 — Quotas et contrôle d'accès

| | |
|---|---|
| **Statut** | **BLOQUÉ** par P1-1 |
| **Dépendances** | P1-1 — on ne contingente pas ce qu'on ne sait pas attribuer |
| **Preuves disponibles** | les CGU n'annoncent **aucun quota contractuel**, délibérément ; `MCP_ACCESS_POLICY.md` consigne l'état réel |
| **Action exacte** | un plafond par clé, et un refus qui **dit pourquoi** |
| **Critère de validation** | un dépassement produit un refus explicite **sans fabriquer de mesure** |

### P1-3 — Robustesse des erreurs et des transports

| | |
|---|---|
| **Statut** | **PARTIEL** — déjà solide, à étendre |
| **Dépendances** | aucune |
| **Preuves disponibles** | `upstream-status` (12 cas), `adapter` (36), `server` (15), `hosted-endpoint` (9) ; `ML-006` : **aucune relance automatique, jamais** — et c'est voulu, un appel pouvant être facturé |
| **Action exacte** | couvrir les coupures en vol sur le chemin hébergé, et vérifier que `stop_grace_period: 45s` suffit sous charge réelle |
| **Critère de validation** | une coupure en vol ne laisse **aucune mesure partielle** et **aucune issue silencieuse** |

### P1-4 — Observabilité et maintenance

| | |
|---|---|
| **Statut** | **NON TESTÉ** |
| **Dépendances** | aucune |
| **Preuves disponibles** | le connecteur **ne conserve rien** — aucun fichier, aucun journal de contenu, aucune adresse IP ; en aval, journaux du serveur web **14 jours**, journaux de conteneurs **sans rotation configurée** |
| **Action exacte** | configurer la rotation des journaux de conteneurs et du journal système ; décider une **durée de conservation des mesures** et l'appliquer |
| **Critère de validation** | une durée **configurée et observable**, puis **mettre à jour la page de confidentialité**, qui annonce aujourd'hui qu'aucune ne l'est |

> **Attention à l'ordre.** La page publiée dit la vérité actuelle. La changer
> avant d'avoir appliqué la durée publierait une affirmation fausse.

### P1-5 — Corrections confirmées par l'audit Codex

| | |
|---|---|
| **Statut** | **BLOQUÉ** — *attend Codex* |
| **Dépendances** | les **quatre conclusions** exigées au §14 du point de clôture |
| **Preuves disponibles** | deux des cinq points de l'audit sont **déjà des limites documentées ici** : `ML-008` (variance des évaluateurs) et `BL-002` (découpage du streaming) |
| **Action exacte** | **aucune pour l'instant.** Lire les conclusions, les confronter aux huit contrats à préserver, **puis** décider |
| **Critère de validation** | aucun correctif fusionné sans que la suite complète passe, **y compris** les tests de régression listés au §14 |

> **Si l'audit confirme `ML-008` ou `BL-002`, il confirme notre documentation.**
> Ce ne sont pas des défauts découverts, et `BL-002` est une cause **amont** :
> la corriger dans le connecteur fabriquerait une mesure que l'API ne produit
> pas.

---

## P2 — Évolutions

### P2-1 — Ergonomie et design FR/EN de la carte

| | |
|---|---|
| **Statut** | **PARTIEL** |
| **Dépendances** | P0-7 — voir la carte dans ChatGPT avant de la redessiner |
| **Preuves disponibles** | vocabulaire **figé**, avertissement fixe, `non publié` pour l'absence ; CSP déclarée **vide** |
| **Action exacte** | améliorer la lisibilité **sans toucher** au vocabulaire ni à la distinction mesuré / non mesuré |
| **Critère de validation** | `card-view-model` (17 cas) inchangé et vert |

### P2-2 — Intégration Station et Observatoire

| | |
|---|---|
| **Statut** | **BLOQUÉ** — *attend Codex* |
| **Dépendances** | points 1 et 2 de l'audit : compatibilité des statuts, sérialisation vers Station |
| **Preuves disponibles** | `ML-013` : la projection fidèle est **de forme REST et un sous-ensemble en deux endroits** |
| **Action exacte** | **aucune** avant les conclusions |
| **Critère de validation** | `presentation` (22) et `reference` (13) verts, et la projection reste **à côté** de la mesure, jamais à sa place |

### P2-3 — Consultation et analyse

| | |
|---|---|
| **Statut** | **NON COMMENCÉ** |
| **Dépendances** | P1-1 (sans attribution, pas d'historique par participant) |
| **Preuves disponibles** | les CGU disent que le service **ne conserve aucune mesure côté connecteur** et **n'offre aucun historique** — chaque soumission est indépendante |
| **Action exacte** | aucune avant décision produit |
| **Critère de validation** | toute fonction d'historique **modifie les CGU** : nouvelle version, nouvelle empreinte, nouvelle acceptation |

### P2-4 — Interopérabilité

| | |
|---|---|
| **Statut** | **PARTIEL** |
| **Dépendances** | point 2 de l'audit |
| **Preuves disponibles** | le contrat d'échange existe et **définit ses propres frontières de divulgation** ; `stdio` est servi (5 cas) en plus de Streamable HTTP |
| **Action exacte** | aligner sur le contrat d'échange **après** les conclusions |
| **Critère de validation** | un export sans texte brut, **et la phrase qui va avec** : cela ne prouve pas que les flux internes en sont dépourvus |

### P2-5 — Stratégie open source

| | |
|---|---|
| **Statut** | **DÉCISION OUVERTE**, indépendante |
| **Dépendances** | aucune technique. Le dépôt du connecteur est **déjà public** |
| **Preuves disponibles** | les CGU posent que l'instrument de mesure et le connecteur restent **propriété de leurs titulaires**, exploités sous **licence non exclusive sans transfert** ; la décision d'ouvrir l'instrument est **explicitement indépendante** |
| **Action exacte** | aucune. C'est un arbitrage du fondateur et du bureau |
| **Critère de validation** | sans objet |

---

## Chemin critique, en une image

```
P0-5  verification organisation + domaine   [Sebastien]  ---- peut demarrer MAINTENANT
                                                              (aucune dependance)

P0-1  bloc auth dans mcp.json
  |
P0-2  imbrication extensions.com.openai
  |
P0-3  connexion reelle depuis ChatGPT  <--- la premiere preuve qui manque
  |
  +-- P0-4  authentification validee depuis l'hote
  +-- P0-6  cinq positifs + trois negatifs
        |
      P0-7  capture, video, dossier
        |
      P0-8  verification finale manifeste + URL
        |
      SOUMISSION

AUDIT CODEX  ---- en parallele, ne bloque AUCUNE tache P0
  |
  +-- P1-5  corrections confirmees
  +-- P2-2  integration Station
  +-- P2-4  interoperabilite
```

> **L'audit Codex ne bloque aucune tâche P0.** C'est le fait le plus utile de
> cette feuille : la candidature peut avancer pendant l'audit, parce qu'aucun
> point de l'audit ne porte sur le chemin de publication.

---

## Tableau de synthèse

| Tâche | Priorité | Statut | Dépend de |
|---|---|---|---|
| P0-1 bloc `auth` | **P0** | BLOQUÉ | — |
| P0-2 imbrication manifeste | **P0** | BLOQUÉ | — |
| P0-3 connexion ChatGPT | **P0** | **NON TESTÉ** | P0-1, P0-2 |
| P0-4 authentification | **P0** | PARTIEL | P0-1 |
| P0-5 organisation + domaine | **P0** | BLOQUÉ | **Sébastien** |
| P0-6 cas de test | **P0** | PARTIEL | P0-3 |
| P0-7 capture, vidéo, dossier | **P0** | NON TESTÉ | P0-3, P0-6 |
| P0-8 manifeste et URL | **P0** | VALIDÉ, à rejouer | P0-2 |
| P1-1 utilisateurs pilotes | P1 | BLOQUÉ | décision produit |
| P1-2 quotas | P1 | BLOQUÉ | P1-1 |
| P1-3 robustesse | P1 | PARTIEL | — |
| P1-4 observabilité | P1 | NON TESTÉ | — |
| P1-5 corrections de l'audit | P1 | BLOQUÉ | **Codex** |
| P2-1 ergonomie | P2 | PARTIEL | P0-7 |
| P2-2 Station | P2 | BLOQUÉ | **Codex** |
| P2-3 consultation | P2 | NON COMMENCÉ | P1-1 |
| P2-4 interopérabilité | P2 | PARTIEL | **Codex** |
| P2-5 open source | P2 | DÉCISION OUVERTE | — |

---

## Ce qui n'est pas dans cette feuille, et ne doit pas y entrer

- **Toute modification de l'API ou du moteur de mesure.** Hors périmètre de ce
  dépôt, et soumise à autorisation distincte.
- **Tout déploiement.** Une PR, une CI verte ou une fusion **n'autorise pas la
  production**.
- **Les correctifs de Pradeep**, tant que les conclusions ne sont pas écrites.
- **Un nouvel audit juridique.** Le corpus du 1er novembre est publié ; ce qui
  reste est suivi hors dépôt, échéance **11 novembre 2026**.

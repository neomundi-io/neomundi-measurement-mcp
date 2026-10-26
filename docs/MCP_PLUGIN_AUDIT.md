# MCP et plugin — audit de livraison

## Candidate 0.3.0-rc.1 : contrat vérifiable

Le code API a permis d'identifier les métadonnées manquantes. La correction associée
déclare la provenance réelle des compteurs et publie des contrats REST/SSE séparés.
Le MCP valide les réponses contre ces schémas inclus à l'identique, avec leur SHA-256.
Une version seule ne suffit pas ; les anciens résultats restent non validés.
Lire [le guide de qualification](RESPONSE_CONTRACTS_FR.md).

La suite backend complète passe : 1 002 tests. Les 22 tests dédiés couvrent aussi les
vraies routes simulées, la provenance fournisseur/zéro/secours, les absences et la relecture.
L'installation locale de la candidate dans un profil Codex isolé et deux appels MCP
avec le SDK indépendant 1.32.2 ont validé les schémas, les null et l'intégrité SSE
contre un serveur local simulé. Aucun appel hébergé n'a été lancé pour cette candidate.
Le déploiement API et la qualification réelle restent requis avant la release finale.

## Livraison 0.2 et preuves historiques

26 octobre 2026. Base du dépôt : `574a4fd92c96906b548d27f2bf31d7765df15e81`.
Les observations distantes précédentes restent datées ; cette livraison
ne les transforme pas en preuve de déploiement du nouveau code.

## Écarts et corrections

| Écart constaté | Correction |
|---|---|
| `done` accepté sans contrôle d’assemblage et des métadonnées fournies | Comparaison des chunks reconnus au récapitulatif ; longueur Unicode, octets UTF-8 et SHA-256 fournis vérifiés |
| `stream_interrupted: true` pouvait valider le transport | Erreur d’interruption explicite |
| Intégrité absente des informations de validation | Champ `integrity` séparé de la conformité du contrat et de la mesure |
| Génération pouvait omettre modèle et fournisseur | Paramètres explicites requis en 0.2 ; aucun modèle imposé |
| Pas de plugin local distribué | Manifestes portables et compatibilité Codex, catalogue local, skill d’usage et package avec empreintes |
| Pas d’entrée stdio | Relais stdio réutilisant le dispatcher HTTP sur loopback éphémère |
| Documentation mélangeant états anciens et état actuel | Accueil français, guide d’installation FR/EN et addenda de portée |

Les preuves serveur restent intactes, y compris les événements et lexèmes
numériques. Une erreur ne transforme pas le contenu en « dangereux ».
Un `done` historique opaque ou `[DONE]` reste supporté, sans inventer
de texte final, de version ou de preuve d’intégrité.

## Vérifications

La suite initiale compte 173 tests : 156 réussis, 17 ignorés parce que
les captures REST privées optionnelles sont absentes. Les captures ne
sont pas publiées pour supprimer les skips.

Neuf tests ajoutés reproduisaient l’absence de contrôles SSE avant correction.
Ils passent après correction. Les tests stdio couvrent découverte sans appel
API, passage REST/SSE, précision numérique et arguments invalides sans POST.
Bilan final : **192 tests, 175 réussis, 17 ignorés**, aucun échec.
Les 17 captures privées manquantes restent exclues.

Installation du package par le CLI Codex dans un profil isolé, version 0.2.0
confirmée. Un client indépendant `@modelcontextprotocol/sdk` **1.32.2**
a connecté le serveur de cette copie installée : découverte sans appel API,
un REST avec grand entier conservé dans le texte brut, un SSE avec intégrité
vérifiée et signal null conservé, arguments invalides sans nouvel appel.
**Deux POST loopback, zéro appel hébergé, zéro génération fournisseur.**
Les deux manifestes portables ont été validés contre leurs schémas officiels
Agent Plugins 1.0.0. Le package inclut une liste explicite de fichiers et
leurs empreintes SHA-256, pas les captures historiques ou données de tests.

La compilation d’un manifeste ne constitue pas son installation ni un appel
à un service hébergé. Chaque périmètre est rapporté séparément.

## Qualification réelle du plugin installé — 26 octobre 2026

Après fusion de la PR #7, le plugin installé **0.2.0** a effectué un appel
REST diagnostique et une génération SSE réelle via OpenAI/gpt-4o-mini,
sortie limitée à huit tokens, contre l’API NeoMundi hébergée.
Les deux ont retourné un transport validé, sans erreur adaptateur, et une
mesure déclarée complète : trois contrôles réussis sur trois, couverture 1.0.

Le SSE s’est terminé par `done`. L’assemblage des deux fragments, la longueur
Unicode, les octets UTF-8 et le SHA-256 ont été vérifiés par le connecteur,
puis recalculés indépendamment depuis les preuves : concordance des quatre
contrôles. REST a pris 4 547 ms côté client ; SSE, 2 989 ms.
Le coût SSE retourné est 0.000005 ; devise et facturation effective non attestées.

REST utilisait un texte de diagnostic et des métriques runtime synthétiques
déclarées, pas des observations de performance fournisseur. Aucune relance
automatique n’était prévue et aucune seconde mesure REST n’a été ajoutée
à la génération SSE.

**Portée : plugin local vers API réelle, pas le serveur MCP hébergé.**
Aucun déploiement de celui-ci. Ce test ne remplace pas celui du SDK Python.

**Réserves :** `validation.contract` reste `not_validated` : version de
contrat absente et provenance de tokens inconnue. REST déclare la mesure
3.3.1 et le normaliseur 1.0.0 ; SSE ne déclare pas de version de mesure dans
le chemin audit attendu. La sonde factuelle reste dégradée malgré ces mesures
ponctuellement réussies. Ni charge, ni répétabilité, ni tous les fournisseurs,
ni les limites backend ne sont validés par ces deux appels.

Les enveloppes brutes, identifiants opérationnels et empreintes de preuve
sont conservés en interne, sans publication de captures dans le dépôt.
La release pilote peut maintenant être préparée avec ces réserves explicites.

## Limites maintenues

- `validation.contract` ne peut pas être déclarée validée sans contrat backend versionné et vérifiable. Une étiquette de version ne suffit pas.
- La provenance de tokens absente reste `unknown` ; des compteurs de fragments ne deviennent pas des tokens fournisseur.
- `presentation` reste REST-shaped ; lire la réponse et les événements SSE, sans convertir artificiellement les enveloppes.
- La livraison locale ne modifie ni l’API ni le serveur MCP hébergé. Leurs contrats et anomalies restent distincts.
- Aucun changement du modèle scientifique, des seuils, des évaluateurs, de Cohere, de Station ou de Protocol Runner.
- Les appels authentifiés restent conditionnés aux accès disponibles ; aucun contournement du magasin Windows ou des permissions SSH.
- Pas de soumission à un annuaire public, de publication npm, de licence nouvelle ni de promesse d’exécution mobile.

## Migration

Clients HTTP existants : conserver leur authentification et leur URL.
Pour `generation`, ajouter explicitement `model` et `provider` si absents.
Le résultat ajoute `integrity`; les valeurs upstream ne changent pas.
Un désaccord de métadonnées qui était ignoré devient une erreur adaptateur.

Clients locaux : lire [PLUGIN_FR.md](PLUGIN_FR.md). Ils utilisent la clé
NeoMundi et, pour la génération, une clé fournisseur par instance.
La clé HTTP MCP interne est générée à chaque lancement, non persistée.

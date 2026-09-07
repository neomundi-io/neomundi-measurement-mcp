# Rapport d'implémentation — MVP privé — 7 septembre 2026

**Le serveur MCP privé est implémenté et son parcours local complet fonctionne avec l'API NeoMundi mockée. 58 tests réussissent : 51 tests du MVP et 7 contrôles historiques de l'audit. Aucun appel distant n'a été effectué.**

Ce rapport complète, sans le modifier, [le rapport d'audit initial](../IMPLEMENTATION_REPORT.md). L'utilisateur a depuis autorisé l'usage opérationnel du backend, une sortie permissive et les deux terminaisons SSE. Les contradictions documentaires ne bloquent donc plus ce MVP privé ; elles restent à résoudre avant publication publique.

## Périmètre et fichiers

Tous les fichiers d'implémentation ont été ajoutés dans `neomundi-measurement-mcp/runtime/`. Un nouveau point d'entrée documentaire, [MVP_PRIVATE.md](../MVP_PRIVATE.md), mène à cette version. Aucun fichier qui existait avant cette reprise n'a été modifié, y compris les anciens README, rapport, schémas, tests et `.env.example`. Aucun moteur, endpoint, runner ou composant de production n'a été touché.

| Fichier ajouté | Rôle |
|---|---|
| [server.mjs](server.mjs) | Serveur MCP Streamable HTTP, authentification, sessions, unique outil, annulation |
| [adapter.mjs](adapter.mjs) | POST NeoMundi JSON/SSE, conservation brute, limites, délais et erreurs |
| [contract.mjs](contract.mjs) | Définition de l'outil, validation stricte sans coercition, sérialisation numérique exacte |
| [config.mjs](config.mjs) | Configuration exclusivement par environnement du processus réel |
| [schéma d'entrée](schemas/measure_execution.input.schema.json) | Deux parcours exclusifs : `execution` ou `generation` |
| [schéma de sortie](schemas/measure_execution.output.schema.json) | Enveloppe technique explicite, objet de mesure permissif |
| [client agent](examples/agent-client.mjs) | Exemple réutilisable de client Streamable HTTP loopback |
| [demo.mjs](demo.mjs) | Démonstration locale complète, transport NeoMundi injecté par mocks |
| [tests adaptateur](tests/adapter.test.mjs), [tests serveur](tests/server.test.mjs) | Validation des données, transport, erreurs et cycle MCP |
| [README.md](README.md), [.env.example](.env.example), [package.json](package.json) | Installation sans dépendance, lancement, exemples et limites du MVP privé |

Le code utilise seulement Node.js 24 et ses modules intégrés. Aucune dépendance n'a été téléchargée, aucun SDK n'a été installé, aucune recherche distante de documentation n'a été effectuée. L'implémentation MCP couvre le sous-ensemble déclaré, pas l'ensemble des fonctionnalités de toutes les versions du protocole.

## Ce qui fonctionne réellement dans le MVP

### MCP local

- Écoute HTTP uniquement sur `127.0.0.1`, route `/mcp`, port 8787 par défaut.
- Authentification obligatoire `Authorization: Bearer` à partir de `NEOMUNDI_MCP_API_KEY`, comparaison en temps constant de condensats, sans log de clé.
- Validation du Host et de l'Origin, limites de corps, de sessions et d'appels concurrents.
- Initialisation, négociation MCP `2025-06-18` / `2025-03-26`, notification d'initialisation, `ping`, `tools/list`, `tools/call`, notification d'annulation et suppression HTTP de session.
- Un seul outil exposé : `measure_execution`, avec schémas d'entrée et de sortie explicites. Les réponses MCP contiennent `structuredContent` et le même résultat sous forme JSON textuelle.
- Streamable HTTP avec réponses POST `application/json`. Le canal GET SSE MCP optionnel est absent et répond 405 ; le SSE amont NeoMundi est consommé séparément.

### Appel NeoMundi câblé dans le code

- `execution` transmet les seuls champs reçus à `POST /v1/govern`.
- `generation` transmet les seuls champs reçus à `POST /v1/govern/stream` et injecte exclusivement la clé fournisseur configurée dans l'environnement serveur.
- Les appels NeoMundi emploient le header `X-API-Key`, une origine HTTPS configurée et `fetch` natif. Aucun endpoint alternatif ni redirect n'est suivi.
- Une invocation produit au maximum un POST de mesure. Il n'y a ni retry automatique, ni mesure post-appel ajoutée après le SSE, ni émission ou reconstruction RGC.

Ces chemins sont exécutés dans les tests avec une fonction `fetch` mockée. **La connexion HTTPS réelle, la validité d'une clé, le comportement d'un compte/tier et les réponses d'un backend déployé n'ont pas été testés.** Le serveur de production de ce dossier utilise bien `fetch` natif par défaut ; ce chemin réel n'a pas été lancé avec des identifiants de l'environnement pendant cette intervention.

### Transparence des mesures

- L'objet API reste dans `response`, ou dans les données de chaque événement SSE. Aucun champ inconnu n'est supprimé ou converti.
- Tous les états reçus restent distincts, notamment `not_determinable` et `not_assessed`. Les champs null, absents, zéro et false restent distincts.
- Les schémas RGC documentaires ne valident ni ne corrigent la sortie du MVP. Même un résultat historiquement incohérent sous un autre schéma est conservé tel quel.
- `contract_version` est exposé lorsqu'un champ racine API le fournit, y compris null. Aucune valeur n'est déduite de `schema_version`. Les versions et données imbriquées restent à leur emplacement initial.
- `raw_response`, `raw_data` et `raw_stream` conservent les textes reçus ; les tokens numériques sont sérialisés sans perte de précision par `JSON.rawJSON`.
- Aucun score, coût, token, latence d'exécution, couverture ou état de mesure n'est calculé par le connecteur. Les délais locaux relèvent seulement du transport.
- Aucune sortie n'est interprétée comme décision de conformité, sécurité, assurance, gouvernance ou autorisation d'exécution.

### SSE et erreurs

Le client accepte les événements nommés `done` et les marqueurs de données `[DONE]`. Le premier terminal observé termine la lecture. Pour `[DONE]` sans événement `done`, le connecteur garde les événements mais ne désigne pas arbitrairement un objet final : `response` reste null.

Le parseur traite UTF-8 fragmenté, BOM initial, LF/CRLF/CR, commentaires heartbeat, données multilignes et événements nommés inconnus contenant du JSON. EOF sans terminal, événement `error`, données invalides, délai total, inactivité, annulation et défaut réseau produisent des erreurs techniques explicites, jamais un statut métrologique inventé.

Le statut HTTP d'une erreur amont est conservé, mais son corps d'erreur n'est pas exposé. Les erreurs de protocole MCP sont distinctes des erreurs d'exécution de l'outil. Les événements valides déjà reçus restent disponibles lors d'une coupure SSE, sous réserve des limites de taille et de la garde contre une divulgation de clé configurée. Si cette garde détecte une clé dans le résultat, l'ensemble est retenu : aucune mesure expurgée n'est présentée comme originale.

## Vérifications effectivement exécutées

Environnement : Windows / PowerShell, Node.js `v24.20.0`.

Commande depuis `CONNECTEUR1` :

```powershell
node --test .\neomundi-measurement-mcp\tests\audit.test.mjs .\neomundi-measurement-mcp\runtime\tests\*.test.mjs
```

Résultat constaté : **58 tests, 58 réussis, 0 échec, 0 ignoré, 0 annulé**.

| Domaine | Ce qui a été vérifié |
|---|---|
| Conservation | réponse entière, champs inconnus, tous les états demandés, null, zéro, false, absence de champ, version explicitement présente/absente/null, incohérence historique laissée intacte |
| Nombres | grands entiers et longues décimales de sortie, `-0`, lexèmes d'entrée conservés, rejet d'une entrée qui serait arrondie |
| Entrées | types stricts, bornes, booléen refusé comme entier, champs inconnus, secrets interdits dans les arguments, contraintes Unicode et documents |
| Requêtes amont | endpoint exact, POST unique, header attendu, champs transmis sans défaut ajouté, aucune deuxième mesure |
| SSE | `done`, `[DONE]`, coexistence des deux, UTF-8 octet par octet, CR/LF, BOM, heartbeat, plusieurs lignes de données, noms inconnus, fin prématurée, erreur, terminal invalide |
| Erreurs HTTP | statuts 400/401/402/403/404/413/422/429/500/503, absence d'écho du corps ou des identifiants |
| Ressources et arrêt | limites de requête/réponse/événements, requête chunked trop volumineuse, timeout global et inactivité, heartbeat ne prolongeant pas le délai total, absence de retry |
| MCP réel local | cycle HTTP complet, découverte d'un seul outil, appel JSON et SSE, schémas annoncés, auth, Host/Origin, content negotiation, versions, sessions, fermeture et codes d'erreur |
| Annulation MCP | annulation locale, déconnexion HTTP, identifiant actif en doublon refusé, même identifiant dans deux sessions sans annulation croisée |
| Preuves historiques | sept tests existants, dont intégrité SHA-256 des trois schémas sources |

La démonstration a également été exécutée :

```powershell
node .\neomundi-measurement-mcp\runtime\demo.mjs
```

Résultat : initialisation MCP, liste d'outils, observation, SSE `done` et SSE `[DONE]` réussis. **Trois requêtes API mockées, zéro appel distant.** Le serveur HTTP de démonstration s'est arrêté à la fin. Aucun serveur n'a été laissé en arrière-plan.

## Ce qui a été simulé et ce qui n'a pas été validé

Les mesures et clés utilisées par les tests sont des données synthétiques publiques. Tous les accès supposés à NeoMundi ont été interceptés par des mocks injectés ; l'adresse amont des tests est un domaine `.invalid`. Le réseau réellement utilisé par les tests MCP est uniquement loopback. Aucun mock n'est présenté comme une mesure de production.

Ni API déployée, ni fournisseur LLM, ni signature RGC, ni véritable abonnement n'ont été interrogés. Les schémas complets RGC ne sont pas validés contre les résultats. Aucune conformité complète à une suite officielle MCP n'est revendiquée ; les tests utilisent le client local fourni et des requêtes HTTP indépendantes. Les intégrations natives ChatGPT/Codex ou un SDK tiers n'ont pas été exercés.

## Divergences à résoudre avant publication publique

Ces points **ne bloquent plus l'adaptateur privé permissif**, conformément au choix explicite de l'utilisateur. Ils empêchent de publier une promesse de contrat canonique ou d'interopérabilité universelle :

1. **Collision de version `0.1.0`** : désigner le schéma canonique et une politique de versionnement qui distingue les règles de nullabilité et de couverture réellement différentes.
2. **`not_determinable` / `not_assessed`** : documenter officiellement leur périmètre et leurs versions d'émission. Aucun mapping n'est implémenté.
3. **Fin SSE** : réconcilier le guide `[DONE]` avec le backend `event: done`, définir le contrat de l'objet terminal, et préciser la situation d'un flux ne fournissant que `[DONE]`.
4. **Paramètres de génération et métriques** : corriger le guide sur la température native versus le défaut backend 0.7, le float de latence versus l'arrondi documentaire, et métriques réelles versus estimées.
5. **Parcours et sorties** : distinguer publiquement réponse post-appel, résultat SSE et contrat RGC émis séparément ; documenter les identifiants, tiers, accès et marqueurs de provenance. Ce MCP n'unifie pas ces objets.
6. **Valeurs par tier et exemples historiques** : expliquer les zéros de masquage, les null, `measured_signals`, et les artefacts historiques incohérents selon un schéma plus récent, sans les modifier.

Avant d'annoncer une compatibilité publique, il reste aussi à confronter ce sous-ensemble MCP à une suite/SDK indépendant et aux clients ciblés, à valider un parcours réel explicitement autorisé, et à définir le transport HTTPS et l'authentification d'un éventuel accès distant. Le Bearer statique privé et l'écoute loopback ne constituent pas une intégration OAuth publique ou un connecteur ChatGPT cloud. Aucune de ces étapes distantes n'a été entreprise.

## Prérequis restants pour l'usage privé réel

Le test local reproductible fonctionne sans secret. Pour utiliser le serveur contre l'API réelle, le processus devra recevoir les clés déjà provisionnées dans son environnement. Une clé fournisseur n'est nécessaire que pour la génération SSE. Aucune nouvelle clarification documentaire n'est requise pour lancer le MVP privé selon le contrat permissif retenu ; l'accès API réel reste non vérifié et tout appel distant conserve l'exigence d'autorisation de l'utilisateur.

Le serveur ne certifie pas les données qu'il transporte, ne vérifie pas la signature d'un contrat et ne garantit pas qu'une interruption locale annule ou rembourse une opération distante. Ses limites de taille et de temps sont locales et explicites. Un client qui veut conserver une précision numérique supérieure à celle de son parseur doit utiliser les textes JSON bruts fournis.

## Commande de lancement

Avec Node.js 24+ et `NEOMUNDI_API_KEY` / `NEOMUNDI_MCP_API_KEY` déjà disponibles dans l'environnement du processus, depuis `CONNECTEUR1` :

```powershell
node .\neomundi-measurement-mcp\runtime\server.mjs
```

Endpoint local par défaut : `http://127.0.0.1:8787/mcp`. Aucun appel NeoMundi au démarrage ; un appel d'outil valide déclenche le POST correspondant.

## Contraintes respectées pendant cette reprise

Aucun fichier préexistant ni composant de production modifié. Aucun secret existant consulté, affiché, copié ou journalisé. Aucun nouveau secret opérationnel créé. Aucun appel distant, téléchargement, installation, déploiement, publication ou push Git. Les connexions loopback et valeurs artificielles des tests sont les seules utilisées pour la validation. Aucune délégation à des sous-agents n'a été effectuée.

# Rapport — 7 septembre 2026

**Résultat : audit préalable terminé ; implémentation du connecteur arrêtée sur contradictions de source. Le MVP MCP demandé n'est pas réalisé et aucun test local de bout en bout MCP n'est revendiqué.**

L'arrêt applique la consigne explicite de l'utilisateur : « Si la source de vérité est insuffisante ou contradictoire, arrête-toi avant d'inventer et indique exactement les éléments manquants. » Il ne résulte pas d'une obligation d'approbation issue d'un skill. Aucun skill ni sous-agent n'a été utilisé.

## Ce qui est réellement réalisé

- Inspection locale ciblée des ZIP, sans extraction générale, exécution de moteur, installation de dépendances ou appel réseau.
- Identification dans le backend des routes de mesure, streaming, émission et lecture de contrat RGC, ainsi que de l'authentification `X-API-Key`.
- Documentation des champs d'entrée, structures de sortie, comportements SSE, erreurs HTTP/SSE, null, champs absents, filtrage selon le tier et états de mesure.
- Conservation distincte de trois JSON Schemas sources, sans changement d'octets, avec provenance et SHA-256 ; index des déclarations des modèles du backend V2.
- README, modèle d'environnement vide et exemple synthétique d'appel agent, marqué comme proposition non exécutable.
- Sept tests locaux d'audit exécutés avec Node.js `v24.20.0` : **7 réussis, 0 échec**.

Commande exécutée depuis le dossier parent :

```powershell
node --test neomundi-measurement-mcp/tests/audit.test.mjs
```

Les tests contrôlent les empreintes, la collision de version `0.1.0`, les différences de nullabilité, les enums de classification, les trois états par signal, `execution_permission_changed: false` et l'étiquetage de l'exemple synthétique. Ils ne valident pas des réponses contre l'intégralité des JSON Schemas et ne vérifient aucune signature cryptographique.

## Contradictions empêchant de fixer le contrat

1. **Deux contrats différents sous `0.1.0`.** Le schéma du backend V2 accepte des signaux null et impose des statuts par signal. Le schéma runtime v0.1 impose des nombres et ne possède pas ce bloc de statuts. La version textuelle seule ne permet pas de sélectionner le validateur.
2. **Classifications différentes.** Le backend V2 autorise `not_determinable` ; le schéma runtime v0.2 autorise `not_assessed`. Aucun mapping autoritatif ne les assimile. Le connecteur ne peut pas les remplacer.
3. **Fin SSE différente.** Le guide runtime annonce `data: [DONE]`. Le code backend construit `event: done` avec un objet final, sans ce marqueur littéral. Un client qui suit uniquement le guide pourrait manquer la fin ou conclure à tort à une interruption.
4. **Politique de génération différente.** Le guide demande les paramètres natifs du fournisseur sans envoyer `temperature`. Le backend V2 passe une température par défaut de 0.7, même lorsque le client l'omet.
5. **Trois objets de sortie distincts.** La réponse post-appel, l'événement final SSE et le contrat RGC ne possèdent pas le même schéma. Les états métrologiques demandés apparaissent surtout dans le RGC, dont l'émission est une opération serveur séparée, réservée Tier 03 dans le code inspecté.

Les chemins et lignes justificatifs figurent dans [API_CONTRACT_AUDIT.md](API_CONTRACT_AUDIT.md). Les archives imbriquées inspectées ne résolvent pas ces écarts : leurs schémas correspondants sont identiques aux copies racines.

## Ce qui a été simulé

Aucun appel NeoMundi, flux SSE ou échange MCP n'a été simulé. Les tests portent sur des preuves statiques. Les chiffres de l'exemple agent sont fictifs et identifiés comme tels ; ils ne sont pas des mesures obtenues du serveur.

## Ce qui n'est pas implémenté

| Élément demandé | État réel |
|---|---|
| Serveur MCP Streamable HTTP | Non implémenté |
| Outil `measure_execution` | Nom réservé dans la proposition, aucun outil exposé |
| Schémas MCP d'entrée et de sortie | Non figés ; schémas RGC sources fournis séparément |
| Appel HTTP NeoMundi | Non implémenté, aucun appel distant |
| Authentification privée MCP par clé | Non implémentée ; noms d'environnement proposés, valeurs vides |
| Validation stricte des arguments | Non implémentée |
| Gestion des délais, erreurs et interruptions SSE | Exigences documentées, code non implémenté |
| Tests avec mocks API et test local MCP complet | Non réalisés |
| Test réel | Non exécuté ; aucune recherche ou lecture de clé configurée |
| Compatibilité ChatGPT/Codex/autres clients | Non testée |

## Éléments précis pour reprendre

Il faut désigner la révision API autoritative et le schéma RGC exact, puis confirmer le périmètre de `measure_execution` : mesure d'une exécution existante, génération SSE, et inclusion éventuelle d'un contrat RGC émis par le serveur. Ces décisions peuvent être exprimées en désignant les fichiers déjà présents, sans fournir de secret.

Après cette désignation, il restera à implémenter l'adaptateur et ses tests, notamment : négociation et appels MCP sur Streamable HTTP, authentification, refus des champs inconnus et des types invalides, conservation intégrale des objets et null, erreurs amont avant/après ouverture SSE, coupures UTF-8/JSON, heartbeat, absence de terminal, taille maximale, délais global et d'inactivité, annulation et absence de retry automatique d'une mesure à issue inconnue.

Avant déploiement ou publication, il faudra aussi vérifier le client consommateur et son mode d'authentification, fixer l'hébergement HTTPS et l'exposition privée, les limites opérationnelles et le provisionnement externe de clés. Aucun déploiement ni publication n'est autorisé par ce travail. Un test distant exigerait une autorisation explicite distincte et une clé de test déjà configurée de manière sûre ; la présence d'une clé ne constitue pas à elle seule cette autorisation.

## Respect du périmètre et incidents locaux

Toutes les écritures de cette intervention sont confinées à `neomundi-measurement-mcp`. Aucun fichier existant extérieur, moteur, endpoint ou runner n'a été modifié. Aucun secret opérationnel n'a été recherché, affiché, copié ou journalisé ; aucun nouveau secret n'a été créé. Aucun push Git, déploiement, publication ou appel distant n'a eu lieu.

L'alias `python.exe` présent sur ce poste ne s'est pas exécuté ; aucune installation ni réparation du poste n'a été tentée. Une première commande de collecte PowerShell a échoué à l'analyse syntaxique, avant exécution. Le script local de collecte corrigé a ensuite été bloqué par la politique d'exécution PowerShell. Une demande d'exécution élevée, limitée au script d'audit avec `ExecutionPolicy Bypass` pour ce processus, a été présentée par l'outil ; l'exécution autorisée a réussi. La politique permanente du poste n'a pas été modifiée.

# NeoMundi measurement MCP — audit préalable

**Statut : arrêté avant implémentation. Aucun serveur MCP opérationnel.**

L'analyse locale révèle des contrats incompatibles. Conformément à la consigne « Si la source de vérité est insuffisante ou contradictoire, arrête-toi avant d'inventer », ce dossier contient les preuves et le rapport préalable, pas un adaptateur reposant sur une version supposée.

Lire [API_CONTRACT_AUDIT.md](API_CONTRACT_AUDIT.md) pour les endpoints, entrées, sorties, authentification, SSE, états, erreurs et contradictions. [IMPLEMENTATION_REPORT.md](IMPLEMENTATION_REPORT.md) distingue les vérifications locales réalisées des fonctionnalités non implémentées.

## Éléments nécessaires pour reprendre

1. Désigner l'archive et la révision qui font autorité pour l'API cible. Le nom d'une archive ne prouve pas son déploiement.
2. Désigner le schéma RGC exact, idéalement par empreinte : deux schémas différents annoncent `0.1.0`. Confirmer notamment `not_determinable` / `not_assessed`, sans les assimiler.
3. Confirmer si `measure_execution` mesure une exécution déjà effectuée via `/v1/govern`, ou déclenche aussi une génération via `/v1/govern/stream`, et si la sortie attendue inclut le contrat RGC émis par le serveur. Ces objets ne sont pas interchangeables.

La confirmation peut désigner les fichiers locaux existants ; aucun secret n'est nécessaire pour lever ces ambiguïtés. Une capture anonymisée ou un OpenAPI de la révision cible peut aussi préciser le contrat. Aucun appel distant de vérification n'a été effectué.

## Contenu

- `schemas/` : trois schémas RGC sources conservés séparément, provenance SHA-256 et index des déclarations Pydantic du backend V2. Ce ne sont pas les schémas MCP d'un outil implémenté.
- `collect-evidence.ps1` : collecte locale avec liste fermée de fichiers non secrets ; aucune extraction globale des archives, aucun appel réseau.
- `tests/audit.test.mjs` : vérifications locales des preuves, sans dépendances ni réseau. Ce ne sont pas des tests d'intégration MCP.
- `.env.example` : noms proposés de variables, valeurs vides, sans chargement automatique.
- `examples/measure-execution.proposed.json` : forme d'appel agent proposée, explicitement non exécutable en l'absence du serveur et de contrat choisi.

## Vérification locale

Avec Node.js disponible :

```powershell
node --test neomundi-measurement-mcp/tests/audit.test.mjs
```

Depuis ce dossier : `node --test tests/audit.test.mjs`.

Le script `collect-evidence.ps1` reconstruit les copies de schémas depuis les archives parentes. Son exécution dépend de la politique PowerShell du poste. Il ne change pas cette politique et écrit uniquement dans ce dossier.

## Limites du futur MVP

Le serveur demandé devra exposer un seul outil `measure_execution` sur Streamable HTTP. Ce transport MCP est distinct du SSE de génération de NeoMundi. L'adaptateur transmettra les données et résultats sans calcul, arrondi, remplacement de null, enrichissement métrologique ni décision dérivée. Les erreurs de transport resteront distinctes des états de mesure.

L'authentification NeoMundi est `X-API-Key`. L'authentification du futur serveur MCP constitue une frontière distincte, dont la clé devra provenir d'une variable d'environnement déjà provisionnée. Aucun secret ne doit figurer dans les arguments d'un agent, une URL, un exemple ou des logs. La compatibilité d'un client particulier avec cette authentification privée n'est pas vérifiée.

NeoMundi fournit le signal et son contexte métrologique. Le système consommateur conserve ses politiques et ses décisions de conformité, sécurité, assurance ou gouvernance. Les noms historiques `govern` et `governance` ne changent pas cette frontière.

Rien n'a été déployé, publié ou poussé sur Git. Aucun fichier de production n'a été modifié.

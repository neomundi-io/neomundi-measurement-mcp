# MVP privé implémenté

> **Reprise — état au 2026-10-20.** Document de reprise de ce dépôt.
>
> | | |
> |---|---|
> **Dépôt actif** | ce dossier. `origin/main` = `ad173e0` ; la branche `consolidation-mcp-v0.1` est **fusionnée et supprimée côté distant** |
> **Travail en cours** | branche `chantier/mcp-consolidation-20261020`, **PR à ouvrir, non fusionnée** |
> **Tests** | **211 passés, 0 sauté** — `npm test` à la racine, enregistrements présents à côté. Sans eux : 142 passés, 9 sautés |
> **Statut** | `LIVE_TRANSPORT_VALIDATED_CONTRACT_PENDING`. `LIVE_API_VALIDATED` **non accordé** |
> **Épinglage** | backend `68d6057`, mesure `3.3.0`. Le déploiement déclare **`3.3.1`** — écart borné et documenté, épinglage **volontairement conservé** |
> **Conteneur** | image locale depuis le 2026-10-20. **Publiée nulle part** |
>
> **À lire dans cet ordre :**
> 1. [`KNOWN_LIMITATIONS.md`](KNOWN_LIMITATIONS.md) — registre public `BL-*` / `ML-*`, le compte de tests par portée (§1) et **3.3.0 contre 3.3.1** (§6.1) ;
> 2. [`runtime/README.md`](runtime/README.md) — installation, contrat, `divergence_scope`, exécution en conteneur ;
> 3. [`CHATGPT_CONNECTOR_ROADMAP.md`](CHATGPT_CONNECTOR_ROADMAP.md) — trajectoire vers un connecteur appelable depuis ChatGPT. **Étude, pas un plan de référence.**
>
> **Rapport de consolidation du 2026-10-20 — non publié dans ce dépôt.** Il porte la matrice de compatibilité API/SDK/MCP, l'inventaire des corrections, les relevés de tests, l'état du packaging et les **blocages réels**, dont ceux qui demandent une autorisation de facturation. Même catégorie que les trois autres rapports internes, et `check-publication.mjs` refuse tout chemin `RAPPORT_*`. Il vit dans la copie de travail, sous `RAPPORT_CONSOLIDATION_20261020.md`, et une copie sauvegardée accompagne les autres fichiers hors Git du connecteur. Son existence est consignée ici pour qu'un lecteur sache que ces éléments sont suivis, et non simplement omis.
>
> **Prochaine action prioritaire : connecter un hôte MCP réel au serveur local et clore ML-009.** Sans hébergement, sans TLS, sans appel facturé, sans code nouveau.
>
> **Vérifier Git avant toute modification.** L'état ci-dessus est un relevé daté.

La suite de l'audit est implémentée dans [runtime/](runtime/README.md).
Les fichiers de l'audit initial restent inchangés ; leur statut d'arrêt est historique.
Le rapport actuel, ajouté sans écraser le précédent, est [runtime/IMPLEMENTATION_REPORT.md](runtime/IMPLEMENTATION_REPORT.md).

Depuis `CONNECTEUR1`, démonstration entièrement locale, sans secret ni appel distant :

```powershell
node .\neomundi-measurement-mcp\runtime\demo.mjs
```

Serveur réel, après provisionnement externe des variables d'environnement indiquées dans le README :

```powershell
node .\neomundi-measurement-mcp\runtime\server.mjs
```

Un seul outil : `measure_execution`. Le serveur écoute par défaut sur `http://127.0.0.1:8787/mcp`.

Un script d'appel réel reproductible, `runtime/live-once.mjs`, existe dans la copie de travail. Il est **exclu de ce dépôt** par `.gitignore`, avec `runtime/.live-api-attempted` : son objet est de contacter un endpoint réel et de consommer du quota, et une sonde de ce type n'est pas distribuée. Les détails figurent dans [runtime/README.md](runtime/README.md).

Pour l'installation, la configuration d'un client MCP, les outils disponibles, l'aide de lecture destinée aux agents, la classification des statuts HTTP amont, les limites du chemin SSE et l'articulation entre l'API, le SDK Python et ce connecteur, voir [runtime/README.md](runtime/README.md).

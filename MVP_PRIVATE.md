# MVP privé implémenté

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

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

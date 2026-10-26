# NeoMundi — MCP et plugin

[Français](README_FR.md) · [English](README.md)

![REST](https://img.shields.io/badge/API-REST-blue) ![SSE](https://img.shields.io/badge/API-SSE-blue) ![Plugin](https://img.shields.io/badge/plugin-local_pilote-orange)

Mesurer une exécution d’IA depuis votre agent, ou demander une génération
accompagnée de mesures. L’outil `measure_execution` conserve les valeurs,
les états, les absences et la provenance retournés par NeoMundi.

| Votre besoin | Parcours |
|---|---|
| Votre application a déjà produit une réponse | `execution` : mesure REST |
| Vous voulez générer via NeoMundi | `generation` : génération et contrôles SSE |
| Votre client lance un serveur local | Plugin MCP stdio, Node.js 24+ |
| Vous hébergez le connecteur | MCP Streamable HTTP authentifié |

SSE désigne ici le flux entre l’API et le connecteur. L’agent reçoit le
résultat final et les événements conservés ; l’interface n’est pas promise
comme un affichage token par token. La mesure peut rester incomplète même
si le transport a abouti.

## Validation réelle du plugin

Le 26 octobre 2026, le plugin installé 0.2.0 a réalisé un REST diagnostique
et une génération SSE courte contre l’API réelle. Les deux mesures déclarent
**3 contrôles réussis sur 3**, sans erreur adaptateur. L’intégrité SSE
(assemblage, longueur, octets, SHA-256) a été vérifiée indépendamment.

Le contrat complet reste non validé faute de métadonnées. Le serveur MCP
hébergé n’a pas été mis à jour ou qualifié par ce test. Lire
[les preuves et réserves](docs/MCP_PLUGIN_AUDIT.md) avant toute généralisation.
La release pilote peut maintenant être préparée.

## Installer et comprendre

- [Installer le plugin local](docs/PLUGIN_FR.md)
- [Audit, corrections et vérifications](docs/MCP_PLUGIN_AUDIT.md)
- [Limites connues et historique](KNOWN_LIMITATIONS.md)
- [Configuration du serveur HTTP](runtime/README.md)
- [Découvrir Station](https://github.com/neomundi-io/neomundi-station-public)

Le plugin est une livraison pilote locale, pas une publication dans
l’annuaire public. Le serveur hébergé n’est pas mis à jour par
l’installation locale. La qualification de contrat de l’API déployée reste
distincte : version de contrat absente et provenance de tokens inconnue
ne sont pas inventées. Voir l’audit pour les preuves exécutées.

## Deux démarrages possibles

Après provisionnement des variables d’environnement documentées :

```sh
# Serveur lancé par le client MCP local
node runtime/stdio.mjs
# Serveur HTTP autonome ; requiert aussi NEOMUNDI_MCP_API_KEY
node runtime/server.mjs
```

Aucun appel NeoMundi au démarrage ni à la découverte des outils.
Un appel de mesure peut consommer quota et ressources fournisseur.
Aucune clé n’est incluse ou lue dans un fichier `.env`.
La génération exige un fournisseur et un modèle explicites, correspondant
à la clé fournisseur provisionnée. Une seule clé fournisseur par processus.

## Vérifier avant utilisation

```sh
npm test
node check-publication.mjs
npm run build:plugin
```

Les tests utilisent des données synthétiques et des rejeux identifiés, sans
appel fournisseur. Le constructeur de package refuse d’écraser un dossier
existant et inclut uniquement les fichiers autorisés.

Les contrôles d’intégrité du texte ne sont ni une validation scientifique,
ni une preuve de vérité, sécurité ou conformité. NeoMundi mesure ; votre
organisation conserve l’interprétation et l’autorité d’exécution.

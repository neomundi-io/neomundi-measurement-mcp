# NeoMundi measurement MCP

Serveur MCP privé exposant l'outil **measure_execution** via Streamable HTTP. Le connecteur transmet les demandes à NeoMundi et conserve les valeurs serveur sans recalculer les mesures.

Le runtime est implémenté et testé. Le transport réel Gateway a été observé avec succès ; la conformité complète du contrat reste en attente. Voir [le rapport de consolidation](runtime/CONSOLIDATION_REPORT.md).

## Utilisation

Node.js 24 ou supérieur, sans dépendance à installer. Depuis la racine du dépôt :

    node runtime/server.mjs

Configurer les variables décrites dans [runtime/README.md](runtime/README.md) via l'environnement du processus. Les fichiers .env.example contiennent uniquement des exemples sans secrets ; aucun fichier .env n'est chargé automatiquement. Le démarrage ne contacte pas NeoMundi. Une invocation réelle de l'outil peut consommer du quota et des ressources fournisseur.

## Tests locaux

    node --test tests/audit.test.mjs runtime/tests/*.test.mjs

Les appels amont sont simulés. Les tests MCP utilisent uniquement loopback et des identifiants synthétiques. [La fixture réelle anonymisée](runtime/LIVE_API_RESULT.json) est rejouée localement sans nouvel appel API.

## Contrat et documentation

- [Configuration, transports et schémas MCP](runtime/README.md)
- [État actuel de validation](runtime/CONSOLIDATION_REPORT.md)
- [Audit initial des contrats](API_CONTRACT_AUDIT.md)
- [Page historique avant implémentation](README_AUDIT.md)

Les rapports à la racine et les schémas sous schemas/ documentent l'audit historique. Les schémas MCP actifs sont dans runtime/schemas/. Le script collect-evidence.ps1 nécessite les archives sources locales, qui ne sont pas distribuées dans ce dépôt.

Le connecteur accepte les terminaisons SSE **done** et **[DONE]**, expose une provenance inconnue comme **unknown** et une version absente comme **null** dans son enveloppe. Il distingue transport et conformité du contrat. Il ne réessaie pas automatiquement un appel, ne déclenche pas de deuxième mesure et n'émet pas de contrat RGC.

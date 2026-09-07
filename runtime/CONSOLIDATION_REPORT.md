# Consolidation locale après observation réelle

Statut : **LIVE_TRANSPORT_VALIDATED_CONTRACT_PENDING**. Le transport réel est établi par l'observation historique ; le MCP consolidé est vérifié par rejeu local. **LIVE_API_VALIDATED n'est pas attribué.**

La fixture `LIVE_API_RESULT.json` est conservée sans modification, y compris son appréciation historique. Les tests utilisent uniquement sa requête, ses événements anonymisés et son résultat. Le cadrage SSE est reconstruit ; ce fichier n'est pas une capture exacte des octets amont. La ponctuation de « Bonjour ! » est une observation de génération, pas un échec du connecteur.

Le parcours observé a reçu HTTP 200 côté Gateway et MCP, puis `done`, sans interruption. Les valeurs conservées incluent 25 tokens annoncés, 21 888 ms côté serveur, 42 431,46 ms de latence locale historique, `ALLOW`, `STABLE`, stabilité 0,9231 et r_score 0,5976. Aucune provenance fournisseur précise n'est déduite des valeurs. Les compteurs intermédiaires 1 et 2 ne remplacent pas le total final.

L'enveloppe expose `token_count_source: "unknown"`, `contract_version: null`, `validation.transport: "validated"`, `validation.contract: "not_validated"` et les lacunes `contract_version_missing` et `token_count_source_unknown`. Les réponses, événements, null, zéros, états et lexèmes numériques serveur restent intacts. `isError` continue à exprimer uniquement les erreurs adaptateur. La terminaison `done` était déjà acceptée ; elle est désormais couverte par la fixture réelle.

Corrections backend minimales pour rendre la validation complète possible :

1. Émettre dans le résultat final la provenance effective de `total_tokens` via `token_count_source`, en distinguant usage fournisseur et estimation/repli. Définir sa portée (entrée, sortie ou total) dans le contrat ; ne pas présenter le compteur de chunks comme un décompte fournisseur exact. La ventilation entrée/sortie est utile mais n'est pas un prérequis supplémentaire inventé par ce connecteur.
2. Émettre `contract_version` et fournir le schéma autoritatif correspondant au résultat Gateway SSE, avec terminaison nommée `done`, champs, nullabilité et portée de `latency_ms`. Aligner la documentation sur ce contrat. Le schéma RGC n'est pas un substitut au schéma SSE.

La justification « Response matches prompt exactly. » reste une incohérence de contenu à corriger côté évaluateur si elle prétend vérifier l'égalité textuelle ; elle ne bloque pas le transport MCP. Modifier la ponctuation produite n'est pas une correction du connecteur.

Ces corrections devront ensuite être vérifiées contre le schéma désigné et un résultat correspondant avant d'attribuer `LIVE_API_VALIDATED`. Aucune nouvelle observation distante n'a été effectuée : les seuls échanges des tests HTTP sont sur loopback, avec l'amont remplacé par des mocks et des identifiants synthétiques.

Validation : **63 tests réussis, 0 échec**, incluant les 7 tests historiques d'audit et les 56 tests runtime. Commande : `node --test neomundi-measurement-mcp/tests/audit.test.mjs neomundi-measurement-mcp/runtime/tests/*.test.mjs`.

Aucun backend de production modifié, aucun déploiement, aucun push. Le script `live-once.mjs` n'a pas été exécuté pendant cette consolidation.

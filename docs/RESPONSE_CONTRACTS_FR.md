# Vérifier les réponses avant de publier

[Français](RESPONSE_CONTRACTS_FR.md) · [English](RESPONSE_CONTRACTS.md)

La version **0.3.0-rc.1** prépare une release avec un contrat vérifiable.
Les appels réels réussis de 0.2.0 restent des preuves de transport et d'intégrité ;
ils ne prouvent pas des métadonnées que le serveur n'avait pas encore émises.

## Ce que déclare le serveur

| Parcours | Contrat | Origine du compteur | Portée / unité |
|---|---|---|---|
| REST | `neomundi.govern.rest/1.0` | `caller_declared` | `caller_declared` / `tokens` |
| SSE avec usage reçu | `neomundi.govern.sse/1.0` | `provider_usage` | `normalized_provider_total` / `tokens` |
| SSE sans usage reçu | même contrat SSE | `chunk_count_fallback` | `content_chunks` / `chunks` |

Ces valeurs sont déterminées dans la branche de code qui choisit réellement le compteur.
Le total fournisseur est normalisé par l'adaptateur ; certains fournisseurs donnent
un total, d'autres des comptes entrée/sortie additionnés. Cela n'atteste pas une facture.
En secours, le champ historique `total_tokens` conserve sa valeur mais l'unité déclare
qu'il compte des fragments. Les calculs restent inchangés.

SSE expose aussi `audit.measurement_version`, `normalizer_version` et `trace_id`.
La version de mesure reste distincte du contrat de réponse et du contrat RGC.
Une ancienne observation n'est jamais réétiquetée avec les versions courantes.
Lors d'une relecture REST d'un flux, `stream_contract_metadata` conserve sa déclaration
d'origine ; cela ne transforme pas le flux en nouvelle mesure REST.

## Ce que vérifie le MCP

Les schémas du backend sont inclus sans modification dans `runtime/schemas/contracts/`.
`contract_validation` donne leur identifiant, leur SHA-256 et un statut :

- `validated` : la réponse finale respecte le schéma identifié du bon parcours.
- `invalid` : une contrainte manque, est violée, ou le contrat correspond à l'autre parcours.
- `not_identified` : aucune version n'est déclarée.
- `unsupported` : la version déclarée n'est pas connue du client.
- `not_assessed` : aucune réponse finale n'a été évaluée.

`validation.contract` devient `validated` uniquement après validation du schéma.
Les erreurs indiquent des chemins et contraintes, sans recopier les contenus.
Le validateur applique les mots-clés employés par les deux schémas inclus et refuse
les mots-clés inconnus et les références distantes. `format` reste une annotation
JSON Schema 2020-12 ; aucune conformité RFC des dates n'est affirmée.
Les nombres JSON sont comparés en décimal exact, sans arrondi ni conversion des réponses.
Les champs futurs autorisés et les valeurs `null` sont conservés.

L'intégrité SSE vérifie séparément l'assemblage, la longueur, les octets et le SHA-256.
Un schéma valide peut décrire une mesure partielle. Il ne garantit ni la validité
scientifique, ni la conformité du texte au prompt, ni une autorisation d'exécution.
Une version de mesure divergente reste signalée par `measurement_reference`.

## Finir la livraison

1. Faire passer et fusionner la correction API associée, puis déployer son commit identifié.
2. Lire sans clé les deux schémas `/v1/contracts/govern-rest-1.0.json` et `govern-sse-1.0.json` ; comparer leurs SHA-256 aux copies du plugin.
3. Depuis le plugin installé, exécuter au plus un REST diagnostique et un SSE court, sans réessai automatique ; conserver les réponses brutes et les identifiants.
4. Exiger `validation.contract=validated` pour les deux, et `integrity.status=verified` pour SSE ; examiner séparément la couverture et la version de mesure.
5. Après réussite, produire l'archive finale, ses empreintes et les notes de release. Tester le serveur MCP hébergé séparément avant de le déclarer qualifié.

Une publication dans un annuaire et la licence de distribution restent des décisions
séparées. Cette candidate n'accorde aucun nouveau droit et ne vaut pas publication finale.

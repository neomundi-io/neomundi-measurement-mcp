# Installer le plugin NeoMundi

[Français](PLUGIN_FR.md) · [English](PLUGIN.md)

Plugin local **0.3.0-rc.1**, destiné aux pilotes. Node.js 24 ou plus récent est
nécessaire. Le package inclut un serveur MCP et un guide d’usage ; il ne
contient ni modèle, ni clé, ni abonnement fournisseur. Il n’est pas publié
dans l’annuaire public et aucun nouveau droit de licence n’est accordé.

## Ce que l’on installe

Le client lance `runtime/stdio.mjs` par MCP stdio. Cette entrée réutilise
le serveur HTTP testé sur un port loopback éphémère, avec un credential
interne aléatoire. Aucun port public n’est ouvert. L’autre entrée,
`runtime/server.mjs`, reste disponible pour un hébergement Streamable HTTP.
Les deux utilisent le même adaptateur REST/SSE.

Le serveur offre un outil `measure_execution` :

| Besoin | Entrée | Route NeoMundi |
|---|---|---|
| Mesurer une exécution déjà produite | `execution` | `POST /v1/govern` |
| Générer et recevoir les mesures | `generation` | `POST /v1/govern/stream` |

Le client MCP reçoit un résultat final contenant les événements SSE ; ce
plugin ne promet pas un affichage token par token dans l’interface du client.
Le GET SSE historique du transport MCP n’est pas implémenté : il ne faut
pas le confondre avec le SSE amont de génération, qui est pris en charge.

## Préparer les accès

Fournir au **processus qui lance le client** les variables suivantes par
votre gestionnaire de secrets, sans les committer ni les saisir en argument :

- `NEOMUNDI_API_KEY` : clé API NeoMundi.
- `NEOMUNDI_API_BASE_URL` : environnement choisi, par exemple l’API convenue avec votre contact. HTTPS est requis hors loopback.
- `NEOMUNDI_PROVIDER_API_KEY` : facultative pour REST, nécessaire pour `generation` ; utiliser le fournisseur correspondant à cette clé.

Le mode stdio n’exige pas `NEOMUNDI_MCP_API_KEY`, car son relais HTTP est
interne et éphémère. Le serveur HTTP autonome continue d’exiger cette clé
distincte. Aucun fichier `.env` ni magasin CLIXML n’est lu par le plugin.

Une clé fournisseur unique est configurée par processus. Pour utiliser
plusieurs clés ou fournisseurs, provisionner des instances distinctes :
le plugin n’est pas un coffre multi-fournisseurs.

## Installer dans Codex

Depuis la racine de la copie du dépôt ou du package extrait :

```sh
codex plugin marketplace add .
codex plugin add neomundi-measurement@neomundi-pilot
```

Le catalogue est dans `.agents/plugins/marketplace.json`. Le manifeste
portable `plugin.json` et `mcp.json` est fourni avec une configuration Codex
de compatibilité. Fermer et rouvrir une session si le client le demande.
Vérifier que l’outil apparaît avant de lancer une mesure réelle.

L’annuaire public ChatGPT/Codex et la publication à une organisation sont
des démarches séparées. Un plugin local n’est pas utilisable automatiquement
depuis le téléphone ou un client web ; il dépend du poste et de son runtime.

## Utiliser depuis un autre client MCP

Configurer un serveur stdio avec la commande `node` et l’argument absolu
vers `runtime/stdio.mjs`. Le client doit transmettre l’environnement
provisionné. Ne pas copier une clé réelle dans une configuration partagée.
Le manifeste portable utilise `${PLUGIN_ROOT}` pour résoudre ce chemin
après installation dans les clients qui le prennent en charge.

## Lire les résultats

1. Lire `adapter_error` ; une erreur de transport n’est pas une mesure négative.
2. Conserver la réponse brute et ses identifiants, états, null et versions.
3. Lire `integrity` séparément de `validation.contract`.
4. Interpréter décision et base ensemble ; une mesure incomplète ne devient pas un contenu dangereux.

`integrity.status = verified` indique l’assemblage des chunks et la
concordance des trois métadonnées fournies : longueur Unicode, octets UTF-8
et SHA-256. Des champs manquants donnent `not_assessed`, pas une intégrité
inventée. Un désaccord donne une erreur explicite et conserve les preuves
brutes, sans déclarer le transport validé.

Les réponses historiques opaques et `[DONE]` restent lisibles, sans
inventer de résultat final ou de métadonnées. Le champ `presentation` reste
principalement adapté à REST ; en SSE, consulter la réponse finale et les
événements. Une réponse reçue entièrement peut contenir une mesure incomplète.

Aucun réessai ni reconnexion automatique, aucune seconde mesure REST à la
fin du SSE. Un timeout peut avoir consommé quota ou ressources fournisseur :
rapprocher les preuves avant tout nouvel essai.

## Ce qui reste à qualifier

La conformité complète de l’API déployée ne découle pas de l’installation
du plugin. Un `contract_version` absent ou une provenance de tokens inconnue
restent absents/inconnus : le connecteur ne peut pas les inventer.
Les défauts backend BL-001 à BL-003 restent distincts de cette livraison.
Lire [l’audit et les vérifications](MCP_PLUGIN_AUDIT.md) pour les tests
effectivement exécutés et les limites d’accès au serveur hébergé.

Références : [package OpenAI](https://developers.openai.com/plugins/build/plugins),
[plugin local](https://developers.openai.com/plugins/deploy/desktop-only).

Contrats de réponse et qualification de cette candidate : [guide](RESPONSE_CONTRACTS_FR.md).

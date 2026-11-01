# Architecture du plugin — indépendante du mode de distribution

**Écrit le 2026-11-01.** Document de conception. Ce qui est décrit comme
*cible* n'existe pas ; ce qui est décrit comme *existant* a été vérifié par
commande et est référencé dans [l'analyse d'écarts](PLUGIN_GAP_ANALYSIS.md).

**Contrainte fondatrice.** Rien ici ne présuppose que l'instrument sera ouvert.
Aucune décision de licence, de propriété intellectuelle ou de distribution
n'est prise, et l'architecture reste compatible avec les deux scénarios :

- **A — instrument propriétaire**, accessible par API hébergée ;
- **B — instrument ouvert**, utilisable localement ou via un service NeoMundi.

---

## 1. Le principe qui rend les deux scénarios possibles

Une seule idée, et tout le reste en découle :

> **L'interface MCP ne sait pas où vit le moteur.**

Le connecteur parle à une **frontière** — « soumettre une observation »,
« relire un résultat » — et jamais à une implémentation. Qui répond derrière
cette frontière est une question de configuration, pas de code appelant.

C'est déjà vrai aujourd'hui, par accident heureux plutôt que par intention
déclarée : `NEOMUNDI_API_BASE_URL` accepte une origine HTTPS quelconque **ou**
un loopback en clair, et la suite de tests rejoue onze réponses enregistrées à
travers exactement le même chemin qu'un appel réel. Un moteur local et un
moteur hébergé sont, pour ce code, deux valeurs d'une variable.

```
         ┌──────────────────────────────────────────┐
hôte MCP │  outils  ·  schémas  ·  enveloppe        │   surface stable
(ChatGPT,│  (identique dans A et dans B)            │   = le contrat
 Codex,  └───────────────────┬──────────────────────┘
 Claude)                     │  frontière
                 ┌───────────┴───────────┐
                 ▼                       ▼
        A · API NeoMundi         B · moteur local
          hébergée                 ou service hébergé
        (propriétaire)             (ouvert)
```

**Ce qui doit rester identique des deux côtés**, sous peine de perdre la
propriété : les noms d'outils, les schémas d'entrée et de sortie, les états
(`measured` / `not_measured` / `degraded` / `unavailable`), les `null`
sémantiques, les identifiants, les versions de mesure et la provenance.

**Ce qui peut légitimement différer** : la latence, l'authentification, la
facturation, les paliers, et les capacités réellement disponibles — à condition
qu'une capacité absente soit **déclarée absente**, et non silencieusement
remplacée par une valeur plausible.

---

## 2. La règle qui n'est jamais négociable

Le plugin est une **interface vers l'instrument**, pas une couche qui modifie
ses résultats. Six interdits, déjà appliqués par la couche de présentation
existante et ses tests de fidélité :

1. une absence de mesure ne devient **jamais** un résultat favorable ;
2. un `null` sémantique est **conservé** — jamais remplacé par `0`, `""` ou
   « indisponible » ;
3. identifiants, versions et preuves disponibles sont **préservés** ;
4. aucun verdict ni niveau de confiance n'est **inventé** ;
5. observation, mesure, évaluation et interprétation restent **séparées** ;
6. ce qui n'est pas comparable n'est **jamais** présenté comme comparable.

Le cas qui justifie tout l'exercice est enregistré et testé : deux réponses
réelles décident **`ALLOW`** toutes les deux, l'une sous `measured_thresholds`
avec trois contrôles, l'autre sous `no_check_attempted` avec **zéro** contrôle
et `measurement.status` à `not_attempted`. Une interface qui les rend
identiques a détruit la distinction que la mesure existe pour produire — **en
n'affichant que des valeurs réellement publiées par le serveur**. C'est le mode
de défaillance contre lequel toute cette architecture est dessinée.

Conséquence directe pour un plugin : **la réduction à quelques lignes de chat
est l'endroit où l'honnêteté se perd.** Elle doit être relue comme une surface
de mesure, pas comme du texte.

---

## 3. Trois catégories de capacités

Capacités **cibles**. Aucune n'est réputée existante parce qu'elle figure ici.

### 3.1 Mesurer

| Capacité | État | Note |
|---|---|---|
Soumettre une observation | **EXISTANT** — `measure_execution` | exécution déjà réalisée, ou génération à observer |
Récupérer les signaux réellement mesurés | **EXISTANT** | avec le statut par signal et la **cause** de chaque non-mesure |
Récupérer version de mesure et provenance | **EXISTANT** | `measurement_reference`, son `agreement` et son `divergence_scope` |
Distinguer mesuré / non mesuré / dégradé / indisponible | **EXISTANT** | invariant central, couvert par les tests |
Consulter l'état d'une observation | **CIBLE** | demande une identité d'observation côté serveur. Les identifiants exposés aujourd'hui ne permettent pas de relire une mesure passée |

> **Limite à ne pas contourner.** Rien côté serveur ne permet de rejouer ni de
> relire une observation : une resoumission crée une observation **neuve**.
> « Consulter son état » ne peut donc pas être livré par le client seul, et un
> client qui le simulerait fabriquerait une continuité qui n'existe pas.

### 3.2 Explorer

| Capacité | État |
|---|---|
Consulter les campagnes accessibles | **CIBLE** — appartient à la Station, pas à ce connecteur |
Interroger observations et résultats | **CIBLE** — exige la persistance et l'identité ci-dessus |
Comparer des mesures compatibles | **CIBLE**, et la plus délicate : la comparabilité est une **propriété déclarée**, pas une opération de client |
Accéder aux preuves et métadonnées autorisées | **PARTIEL** — l'enveloppe expose ce que la réponse contient ; aucun accès à un corpus |

> **Pourquoi « comparer » n'est pas une fonction d'affichage.** Deux mesures ne
> sont comparables que si leur version de mesure, leur contrat
> d'interprétation et leurs clés de comparabilité concordent. Un outil
> « comparer » qui accepte deux résultats quelconques produirait des écarts qui
> ne veulent rien dire. Il doit **refuser** et dire pourquoi — un refus est ici
> le comportement correct, pas une limitation.

### 3.3 Services NeoMundi futurs

Publications de l'Observatoire, exploitation des campagnes Station, rapports et
analyses, fonctions professionnelles sous autorisation : **toutes cibles**,
aucune n'est amorcée dans ce dépôt, et chacune relève d'un périmètre produit
distinct.

### 3.4 Ce qui ne doit pas être exposé prématurément

- **la génération** — elle facture un fournisseur et porte `BL-002` ;
- **les séries longitudinales** — elles exigent une comparabilité que le chemin
  SSE n'a pas ;
- **tout agrégat** — `aggregates_publishable` doit être lu avant d'en citer un ;
- **toute opération non stabilisée**, coûteuse ou sensible.

---

## 4. Trois formes de livraison, un seul cœur

Les trois existent déjà et partagent le même code d'appel — c'est cette
réutilisation qui garde les scénarios A et B ouverts :

| Forme | Transport | Usage | État |
|---|---|---|---|
Plugin local / Codex | **stdio** | poste de l'utilisateur, aucune infrastructure | **EXISTANT** |
Serveur authentifié | **Streamable HTTP** sur `/mcp` | conteneur, ou hébergement derrière un proxy TLS | **EXISTANT**, et joignable sur un domaine depuis cette passe |
Connecteur ChatGPT hébergé | Streamable HTTP + HTTPS public | assistant distant | **CIBLE** — le code accepte, l'infrastructure et l'identité manquent |

`stdio` réutilise le chemin HTTP plutôt que de le dupliquer : un seul moteur de
requête, donc un seul endroit où une erreur de fidélité pourrait apparaître.

---

## 5. Authentification — la seule pièce qui force un choix

Aujourd'hui : **un** credential statique partagé en entrée, **une** clé API
NeoMundi en sortie. C'est cohérent pour un processus local mono-utilisateur, et
intenable dès qu'il y a deux utilisateurs — tout appel est facturé au même
compte, et le palier de ce compte décide de ce que chacun obtient.

Trois modèles possibles, à trancher **avant** d'écrire la moindre ligne :

| Modèle | Ce que ça donne | Ce que ça coûte |
|---|---|---|
**M-1 · local, clé de l'utilisateur** | chacun fournit sa clé NeoMundi ; aucune facturation croisée, aucune donnée en transit chez nous | pas de connecteur hébergé : ChatGPT ne peut pas atteindre un poste |
**M-2 · hébergé, clé partagée** | atteignable immédiatement | **à écarter** : facturation indifférenciée, aucune révocation, aucune attribution |
**M-3 · hébergé, OAuth + clé par utilisateur** | la seule voie vers un connecteur multi-utilisateur publiable | la plus grosse pièce non construite, et un rôle de traitement des données à qualifier juridiquement |

**M-1 est compatible avec les deux scénarios A et B et ne demande aucune
décision irréversible.** C'est pourquoi la feuille de route en fait le premier
plugin privé réellement testable, et repousse M-3 derrière un arbitrage
explicite.

---

## 6. Ce que l'architecture interdit, pour mémoire

- fabriquer un champ que le serveur n'a pas publié, y compris une provenance
  ou un compte de jetons ;
- promouvoir une version de contrat inconnue en version connue ;
- relancer un appel non idempotent — `POST /v1/govern` débite un quota ;
- transformer une erreur HTTP en classification de mesure ;
- émettre un RGC, ou une seconde mesure, automatiquement ;
- journaliser un en-tête, un corps, un argument ou une mesure.

Ces interdits sont tenus par des tests aujourd'hui. Toute évolution décrite ici
doit les laisser intacts, ou les remettre en cause **explicitement**.

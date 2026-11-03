# Carte de mesure V2 — rapport et feuille de route

**2 novembre 2026.** Branche `feat/oauth-chatgpt-20261101`. **Non déployée** :
la mission demande une validation visuelle d'abord.

---

## 1. Ce qui a été audité, et ce qui en sort

La carte V1 affichait **neuf blocs à plat**, dans un ordre technique :
identité, décision, état, listes, signaux, provenance, évaluateurs, valeurs
publiées, champs non modélisés. Tout y était ; rien n'y était hiérarchisé. Un
lecteur devait traverser cinq identifiants et une ligne « non publié » par
champ absent avant d'atteindre les signaux.

La V2 garde **exactement les mêmes faits** et change trois choses : ce qu'on
voit en premier, ce qui se replie, et ce qui est dessiné.

## 2. La météo, et la règle qu'elle ne casse pas

> **L'anneau représente ce que l'instrument a pu mesurer. Jamais ce que la
> réponse vaut.**

La fondation de marque interdit une couleur de risque, pour une raison
enregistrée : *« une pastille verte sur un `ALLOW` décidé sans aucun contrôle
serait exactement le mensonge que cette carte existe pour empêcher »*. Une
météo pilotée par la **décision** aurait été cette pastille, mieux dessinée.

Elle est donc pilotée par la **couverture de mesure**, et ce même `ALLOW` sans
contrôle obtient **l'anneau le plus vide de la carte**. Deux tests tiennent les
deux moitiés de l'invariant :

- `ALLOW`, `FLAG`, `BLOCK`, `REVIEW` et une décision absente produisent **la
  même** météo à mesure identique ;
- un `ALLOW` sans contrôle produit `not_measured`, **jamais** `complete`.

### Les règles, publiées et ordonnées

Dans l'ordre de précédence — **le pire connu d'abord**, pour qu'un statut
`complete` ne puisse jamais enterrer un manque :

| État | Règle, sur des champs publiés |
|---|---|
| `not_measured` | `decision_is_measured === false`, ou `measurement_status === "not_attempted"` |
| `incomplete` | `missing_required_signals` non vide, ou `measurement_status === "partial"`, ou un signal déclaré non mesuré |
| `complete` | `measurement_status === "complete"`, sans signal requis manquant ni signal non mesuré |
| `undeclared` | aucune règle ci-dessus — l'instance n'a publié aucun état modélisé |

`WEATHER_RULES` les exporte ; un test vérifie que tout état renvoyé y figure.

**Aucun score de météo n'est inventé.** L'anneau n'est pas une note : son
remplissage est la fraction *signaux mesurés / signaux attendus*, un comptage.

## 3. Deux barres, et pourquoi seulement deux

Une barre affirme un sens de lecture : plus plein, plus grand. C'est vrai d'un
**comptage de contrôles** et d'un **comptage de signaux**. Ce n'est **pas** vrai
d'une valeur de signal ici : `quality.stability_score` a 1 = stable tandis que
`metrics.stability_score` a 0 = stable, et `measured_signals` ne transporte
aucune échelle.

**Une barre dessinée sur ces valeurs inventerait un sens pour la moitié
d'entre elles.** Les valeurs sont donc imprimées, jamais dessinées. Un test
vérifie qu'aucune jauge ne bouge quand les valeurs changent.

> ### 🔴 Correction du 3 novembre 2026
>
> Le paragraphe ci-dessus disait « les valeurs sont donc imprimées ».
> **Elles ne l'étaient pas.** Sur les onze réponses enregistrées, la carte
> n'affichait **aucune** valeur de signal — ni en vue produit, ni dans le
> dépliant — et la provenance des évaluateurs était vide elle aussi.
>
> **Cause.** Le contrat déclare `presentation.evaluators` et
> `published_values` comme **tableaux** ; le modèle les lisait avec un test qui
> exclut les tableaux par définition. Tous les tests de carte passaient parce
> qu'ils pilotaient le modèle avec une **table**, forme que l'instrument
> n'émet jamais. Vert partout, vide à l'écran.
>
> **Levé par** la lecture des deux formes, et par `signal_readings` dans la
> projection : les quatre signaux sémantiques y portent désormais leur valeur,
> lue à `quality.<signal>`, chemin vérifié sur les onze enregistrements.
>
> **Et la phrase ci-dessus reste vraie en tant que règle** : les valeurs sont
> imprimées avec leur échelle, jamais dessinées. Le contrat d'échelle que la
> feuille de route attendait de l'instrument n'était pas nécessaire pour ces
> quatre-là — la liste close existait déjà sous le nom
> `AID_REFERENCE.SEMANTIC_SIGNALS`.

## 4. Deux niveaux de lecture

**Vue produit** : l'anneau et sa phrase · les deux compteurs · les bandeaux ·
la décision et son fondement · **les signaux en pastilles** · l'état de mesure ·
la version · les limites connues.

**Dépliant** : évaluateurs et modèles · identifiants de requête · provenance ·
énoncé complet des versions · valeurs publiées brutes · champs non modélisés.

> **Le dépliant n'est pas une protection, et la carte l'écrit.** Un test
> vérifie que la note le dit dans les deux langues, et un autre que les
> identifiants d'évaluateurs (`nomic-embed-text`, `llama-guard3:1b`,
> `mistral24b`) **ne figurent nulle part** dans la vue principale — et
> figurent bien, en entier, dans la seconde.

### Les champs `null`, simplifiés sans être perdus

Une colonne de « non publié » se lit comme un rapport d'échec et enterre les
trois faits qui comptent. Les lignes absentes de l'état de mesure sont donc
**regroupées** sous un intitulé unique, suivi d'une phrase : *« Ces champs ont
été retournés à null. Une absence n'est pas un résultat favorable. »*

**Les signaux ne sont jamais regroupés ainsi** : chacun garde sa pastille et sa
cause.

## 5. La référence `3.3.0` / `3.3.1` — vérifiée, et non modifiée

**La version attendue n'est pas changée**, et c'est la bonne réponse.

Ce qui est établi, depuis les contrats : `reference.mjs` porte déjà l'entrée
pour `3.3.1`, admise *depuis l'énoncé de comparabilité du backend lui-même*, sur
la plage de commits `68d6057..aeff13c` — `govern-v3/app/models/` y est
identique octet pour octet, et le verrou de surface ne déplace que la chaîne de
version. Elle dit : **REST `identical`, flux `decision_may_differ`**.

**La compatibilité est donc démontrée pour le contrat REST, pas pour la base de
validation du connecteur.** Celle-ci est de **11 réponses REST enregistrées,
toutes déclarant `3.3.0`**. Aucun enregistrement en `3.3.1` n'existe, et les
enregistrements d'exécution sont tenus hors du dépôt. Déplacer l'épinglage
rendrait fausse la phrase qui documente cette base, **et** périmerait l'entrée
d'équivalence, que la garde retirerait — on perdrait la portée au lieu de la
gagner.

**Ce qui change est l'affichage, pas la métrologie.** Quand une portée est
établie, le bandeau ne dit plus « ce résultat n'est pas comparable aux
autres » : il renvoie aux faits par transport, affichés sous *Version*. Quand
rien n'est établi, **le libellé absolu reste**. Un test vérifie que le libellé
nuancé ne contient jamais le mot « comparable », et que la ligne *Accord*
continue d'afficher `divergent`.

## 6. Avant / après

| | V1 | V2 |
|---|---|---|
| Première information | un bandeau de divergence | **ce qui a été mesuré** |
| `ALLOW` sans contrôle | un bandeau parmi quatre | **l'anneau le plus vide**, en tête |
| Signaux | deux tableaux séparés | **pastilles**, mesurées et non mesurées côte à côte avec leur cause |
| Évaluateurs | en vue principale | **dépliés sur demande** |
| Champs `null` | une ligne « non publié » chacun | **regroupés**, avec la phrase qui les qualifie |
| Langue | français uniquement | **anglais par défaut**, français en un bouton |
| Largeur | fixe | **responsive**, colonne unique sous 30 rem |

Captures : `NEOMUNDI_WORKSPACE/plugin-candidature-20261101/captures/carte-v2/`
— `avant-v1-mesure` · `apres-v2-mesure-fr` · `apres-v2-mesure-partielle` ·
`apres-v2-allow-sans-controle` · `apres-v2-erreur` · `apres-v2-details-fr`.

Toutes sont produites depuis une **charge synthétique** : le `request_id`
affiché est la chaîne littérale `synthetique-aucun-appel-reel`.

## 7. États couverts, et ce qui reste à voir dans ChatGPT

| Cas | Couvert | Où |
|---|---|---|
| Mesure complète | ✅ | test + capture |
| Mesure partielle, signal absent avec cause | ✅ | test + capture |
| Réponse collée seule (`no_reference_supplied`) | ✅ | charge `partial` |
| `ALLOW` sans aucun contrôle | ✅ | deux tests + capture |
| Erreur d'évaluateur / amont | ✅ | test + capture |
| Version divergente, avec et sans portée | ✅ | test |
| Champs `null` | ✅ | test |
| Enveloppe absente ou malformée | ✅ | test |

> **Rien de tout cela n'a encore été vu dans ChatGPT.** Les captures viennent
> d'un navigateur local sur une instance locale. La carte V2 publie une
> **nouvelle URI** (`card-v2.html`), donc l'hôte la rechargera — mais tant
> qu'une mesure réelle n'a pas été faite après déploiement, ne pas écrire que
> la V2 fonctionne dans ChatGPT.

## 8. Feuille de route

| # | Sujet | Ce qui manque |
|---|---|---|
| **R-1** | **Barres sur les valeurs de signaux** | un **contrat d'échelle** publié par l'instrument : sens de lecture et bornes, par signal. Sans lui, une barre invente une direction pour la moitié des signaux |
| **R-2** | **Noms de métriques lisibles** | un libellé lisible par signal (`coherence_score` → « Cohérence »). Exige une **liste close**, sinon un signal inconnu s'afficherait sans nom. À faire avec la liste des signaux de l'instrument, pas en devinant |
| **R-3** | **Épinglage de version** | des réponses enregistrées en `3.3.1` pour déplacer la base de validation — et la décision sur les enregistrements hors dépôt (`ML-010`) |
| **R-4** | **Origine dédiée de la carte** | `_meta.ui.domain`, exigée pour soumettre un plugin avec interface. Décision de nom d'hôte |
| **R-5** | **Guide utilisateur en anglais** | le guide existe en français ; la candidature est en anglais |
| **R-6** | **Mode sombre vérifié dans ChatGPT** | les variables existent et répondent à `prefers-color-scheme`, mais le rendu dans l'hôte n'a pas été observé |
| **R-7** | **Lisibilité des causes** | `no_reference_supplied` et `aggregate_withheld` sont des jetons du serveur. Les traduire exigerait une liste close de causes, que l'instrument ne publie pas encore |

## 9. Ce qui n'a pas bougé

**Aucune modification de l'API, du moteur, des seuils, des décisions, des
scores, des évaluateurs ni des règles de calcul.** Le diff ne touche que
`runtime/ui/`, ses tests, le harnais de capture et la documentation.

Les invariants métrologiques sont tenus par **23 cas** sur la carte, dont les
quatre nouveaux de la météo :

- un `null` n'est jamais substitué et ne devient jamais zéro ;
- un signal non mesuré garde sa cause et ne rejoint jamais les mesurés ;
- une liste n'est jamais raccourcie ;
- `not_attempted` et `complete` ne se rendent jamais pareil ;
- le vocabulaire ne contient aucun mot de verdict, de gravité ou de risque,
  **dans les deux langues** ;
- l'avertissement de bas de carte est présent dans **tous** les états et n'est
  jamais reformulé ;
- le modèle ne mute pas l'enveloppe qu'on lui donne.

**Suite complète : 356 cas, 356 réussis.**

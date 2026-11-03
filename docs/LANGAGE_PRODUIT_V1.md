# Langage produit V1 — les cinq lectures

**Décision produit validée le 3 novembre 2026.**

> **Une question simple, une mesure réelle, une limite claire.**

Ce document est la référence. La carte, le modèle de vue et les tests sont
tenus à lui, et un désaccord entre eux est un défaut à corriger — pas une
nuance à documenter.

---

## 1. Les cinq formulations

Chaque lecture est un **triplet indissociable** : la question qu'un lecteur se
pose, la valeur telle que le serveur l'a publiée avec l'échelle qui dit dans
quel sens elle se lit, et la limite qui dit ce qu'elle n'est pas.

**La valeur et son échelle voyagent ensemble, ou ne voyagent pas.** Ce n'est
pas une précaution de style : le même indicateur est publié sous un seul nom
sur deux échelles opposées, et un nombre sans son sens de lecture conduit à la
conclusion inverse de celle qu'il soutient.

### 1 · Pertinence sémantique

> **La réponse est-elle en rapport avec la question ?**

- **Échelle** — similarité vectorielle entre la question et la réponse, de 0
  à 1. Plus haut, plus proche de sens.
- **Limite** — **similarité, pas vérité.** Une réponse fausse mais dans le
  sujet obtient un score élevé.

### 2 · Sécurité

> **La réponse contient-elle des éléments potentiellement dangereux ?**

- **Échelle** — résultat de modération. **Deux valeurs seulement, et rien
  entre elles.**
- **Limite** — **modération, pas garantie d'innocuité.** Elle classe des
  catégories, et ne juge pas si un conseil est avisé.

### 3 · Fiabilité factuelle

> **La réponse contient-elle des informations probablement fausses ?**

- **Échelle** — de 0 à 1. Plus haut, plus la réponse paraît inventée.
- **Limite** — **estimation d'un juge IA qui n'a reçu aucun document de
  référence.** Il rapporte sa croyance, pas une conformité à une source.

### 4 · Ambiguïté de la question

> **La question peut-elle être comprise de plusieurs façons ?**

- **Échelle** — de 0 à 1, mesuré **sur la question**.
- **Limite** — **il note la question, pas la réponse.** Deux réponses
  différentes à une même question reçoivent la même valeur.

### 5 · Stabilité globale — *affichée à part*

> **Que donne l'indicateur global calculé à partir des mesures ?**

- **Deux échelles, toutes deux affichées.** `quality.stability_score` :
  1 = stable, 0 = instable. `metrics.stability_score` : **l'inverse**,
  0 = stable, 1 = instable.
- **Limite** — **indicateur dérivé, pas une mesure indépendante.** Il n'ajoute
  aucune observation propre.

**Pourquoi à part.** Les quatre premières sont ce que des instruments ont
mesuré. Celle-ci est calculée à partir de ce qu'ils ont produit. Les mettre sur
la même ligne la ferait lire comme un cinquième instrument, et un lecteur
conclurait d'un indicateur ce qu'aucune mesure n'a dit.

---

## 2. Correspondance des champs JSON

Les quatre signaux sont lus à `quality.<signal>`. **Chemin vérifié sur les
onze réponses enregistrées** : chacun y publie, à ce chemin et à aucun autre,
dans toutes les familles — complète, partielle, aucun contrôle, tous signaux
tombés.

| Lecture | Champ de la réponse | Dans la projection | Dans la carte |
|---|---|---|---|
| Pertinence sémantique | `quality.coherence_score` | `presentation.signal_readings[].signal === "coherence_score"` | `primary.readings[]`, clés `read_relevance_*` |
| Sécurité | `quality.semantic_risk` | idem, `semantic_risk` | clés `read_safety_*` |
| Fiabilité factuelle | `quality.factual_hallucination_score` | idem | clés `read_factuality_*` |
| Ambiguïté de la question | `quality.semantic_instability_score` | idem | clés `read_ambiguity_*` |
| Stabilité globale | `quality.stability_score` **et** `metrics.stability_score` | `presentation.published_values[].path` | `primary.stability.readings[]` |

**Champs voisins, et ce qu'ils ne sont pas :**

| Champ | Ce qu'il est | À ne pas confondre avec |
|---|---|---|
| `v_score` | `1 − factual_hallucination_score` | une mesure distincte de la factualité |
| `quality.confidence` | **notre couverture de mesure** | une confiance dans la réponse |
| `g_score`, `g_final` | agrégats | des signaux |
| `checks_emitted` | un **compte de canaux**, pas de signaux | le nombre de signaux mesurés |
| `delta_g` | écart avec **l'appel précédent du même compte** | une dérive de cette réponse |

**La liste est close.** `READING_KEYS` dans `runtime/ui/view-model.mjs` tient
exactement les quatre signaux de `AID_REFERENCE.SEMANTIC_SIGNALS`, et un test
tombe si les deux divergent. Un signal que l'instrument publierait demain
apparaîtrait **par son nom** dans les listes de signaux, et **ne recevrait ni
question ni échelle** : inventer une direction pour un signal inconnu serait
exactement la faute que les limites existent pour empêcher.

---

## 2 bis. Ce qui autorise une valeur à répondre à la question

> **L'autorité est l'évaluateur, jamais la présence du nombre.**

L'instance publie une valeur à `quality.<signal>` **même quand le contrôle n'a
jamais tourné**. Sur les deux réponses enregistrées dont le fondement est
`no_check_attempted`, `coherence_score` vaut **1,0** et `semantic_risk` vaut
**0,0**, leurs évaluateurs déclarent `not_attempted`, et `unmeasured_signals`
est **vide**. Le code du backend le dit de lui-même : quand la modération n'a
pas tourné, le champ *« conserve le `raw_metrics.semantic_risk` déclaré par le
client — cette valeur est l'entrée de l'appelant, pas une mesure du serveur »*.

Affichées, ces deux valeurs répondaient *« la réponse est-elle en rapport avec
la question ? »* par un score parfait, et *« contient-elle des éléments
potentiellement dangereux ? »* par un zéro propre, **sur une réponse que rien
n'avait examinée** — juste sous un anneau vide qui disait le contraire.

L'état d'une lecture est donc pris dans `evaluators[<signal>].status` :

| État | Condition | Ce que la carte montre |
|---|---|---|
| `measured` | l'évaluateur déclare `measured` **et** une valeur est publiée | **la valeur**, zéro compris |
| `not_measured` | l'évaluateur existe et n'a pas mesuré — `not_measured`, `not_attempted`, une erreur, ou un statut à côté d'un `null` | **« Non mesuré »** et la cause |
| `undeclared` | aucun évaluateur ne nomme ce signal | **« Non mesuré »**, et que rien ne l'atteste |

**Rien n'est effacé.** `declared_value` conserve ce que l'instance a publié :
un inspecteur voit toujours l'entrée de l'appelant pour ce qu'elle est. Elle
n'est simplement pas autorisée à répondre à la question comme si NeoMundi
l'avait mesurée.

**Un zéro mesuré reste une mesure.** `semantic_risk` vaut `0.0` avec son
évaluateur à `measured` sur toutes les réponses nominales : ce zéro est un
**résultat**. Retenir une valeur non attestée ne doit jamais se mettre à
retenir une vraie.

## 3. Rigueur : ce qui est tenu par un test

| Règle | Comment elle est tenue |
|---|---|
| Une absence n'est **jamais** un zéro | `degrade_01` publie les quatre à `null` avec leur cause ; un test vérifie valeur `null`, `published: false`, cause non vide — et qu'un `0` mesuré reste une **mesure** |
| Valeur, échelle, état, limite restent cohérents | un test exige, pour chaque lecture et **dans les deux langues**, une question, une échelle et une limite non vides |
| Aucune valeur n'est remise à l'échelle, arrondie ni reformatée | un test compare la valeur de la carte à `quality.<signal>` de la réponse, sur les onze enregistrements |
| L'indicateur global n'est pas un cinquième signal | un test vérifie qu'il est **hors** des lectures, et qu'il porte **les deux** échelles opposées |
| Le vocabulaire ne prononce aucun verdict | la garde reste en place ; **une** clé est exemptée, celle de la sécurité, et elle doit rester **une question** dans les deux langues |
| Aucune valeur non attestée n'est affichée | deux tests sur les deux réponses `no_check_attempted` : état `not_measured`, valeur `null`, et **ni 0 ni 1** |
| Aucun score de l'appelant ne passe pour une mesure | un test parcourt les onze enregistrements : toute lecture affichée a un évaluateur à `measured` |
| Un zéro mesuré survit à la règle ci-dessus | le même test exige au moins deux zéros mesurés réellement exercés, sinon il tombe |
| La carte est exercée contre la forme réellement émise | les tests de lecture tournent sur les **onze** enregistrements, pas sur une charge écrite à la main |

**Ce que ces règles ne donnent pas.** Aucune de ces cinq lectures n'est une
capacité validée scientifiquement. Le `interpretation_contract 1.0` interdit
déjà d'écrire une garantie de détection d'hallucination, de sûreté ou de
conformité, et rien ici ne la donne. Les limites ci-dessus **sont** le résultat.

---

## 4. La preuve qui justifie ce langage

Sur `tier02_03_factuellement_fausse`, une réponse **fausse** :

```
La réponse est-elle en rapport avec la question ?        0.8282
La réponse contient-elle des informations probablement fausses ?   1.0
```

La pertinence n'a pas tort : la réponse était bien dans le sujet. **Une bonne
pertinence n'est pas une bonne réponse.** C'est le cas qui fait que la valeur
ne voyage jamais sans sa limite, et il est mesuré, pas supposé.

# V1 — périmètre gelé

**3 novembre 2026.** Décision produit : finaliser le plugin avec l'API `3.3.1`
telle qu'elle est. **Aucune évolution du contrat API dans ce chantier.**

---

## 1. État exact de la V1 déployée

| | |
|---|---|
| Révision | **`43482c070364dde9830e51aa227b8c8627c48249`** (fusion PR #23) |
| Image | `neomundi-measurement-mcp:43482c0` · `sha256:83f13cd3449e…` |
| En service depuis | 2026-11-03 **14:18:45 UTC**, **0 redémarrage** |
| Clone serveur | `43482c0`, arbre propre, identique à `origin/main` |
| CI sur la fusion | verte, 7 étapes sur 7 |
| Tests | **366 / 366** avec les enregistrements · 306 / 280 / 26 ignorés sans |
| Sondes production | **33 / 33**, 0 échec |
| Carte servie | `ui://neomundi-measurement/card-v2.html`, 60 275 octets |
| Retour arrière | `070fb6f` armé et vérifié, + 4 niveaux plus profonds |

La seule ligne d'erreur au journal est `Error response from daemon: No such
container` : c'est le `ExecStartPre=-/usr/bin/docker rm -f`, dont le préfixe `-`
tolère l'échec. **Bénigne, attendue à chaque démarrage.**

## 2. Ce que la V1 fait, et ne fait pas

### Dans le périmètre

- **Mesurer une exécution observée** : `llm_prompt` + `llm_response` +
  `raw_metrics` réellement relevées, par `POST /v1/govern`, chemin **REST**.
- **Cinq indicateurs**, chacun avec sa question, sa valeur, son échelle et sa
  limite ; l'indicateur global **à part**, avec ses deux échelles opposées.
- **Trois états par lecture** : `measured` (valeur affichée, zéro compris),
  `not_measured` (retenue, cause nommée), `undeclared` (rien ne l'atteste).
- **OAuth 2.1** avec identification par participant, **et** la voie clé
  statique préservée pour Codex. Deux participants actifs, portée `measure`.
- La carte, bilingue EN/FR, responsive, sans nom d'évaluateur en vue
  principale et sans vocabulaire de verdict.

### Hors périmètre, gelé

| Sujet | Pourquoi |
|---|---|
| **Mesure de contenu sans métriques d'exécution** | l'API les exige ; voir le backlog ci-dessous |
| Chemin en flux (`generation`) | la portée `3.3.0`/`3.3.1` le déclare `decision_may_differ`, et `BL-002` le rend dépendant du découpage réseau |
| `documents` / *grounding* | acceptés et transmis, **jamais mesurés** : qu'un quatrième canal s'exécute reste à établir |
| Journalisation des requêtes | infrastructure, hors PR d'affichage |
| `_meta.ui.domain` | exigence de **soumission**, pas d'exécution |

## 3. `token_count` et `latency_ms` restent obligatoires

**Décision tenue, et elle n'était pas la nôtre.** `GovernRequest.RawMetrics`
les déclare `Field(...)` sans défaut : l'exigence vient de l'**API**, et le
schéma de l'outil la recopie à l'identique. Les rendre optionnels côté
connecteur déplacerait un refus local en `422` distant.

> **Ils ne seront jamais comblés.** Vérifié dans le moteur : `latency_ms = 0`
> donne `latency_proxy = 0`, donc un **R parfait** ; `token_count = 0` fait
> plancher `units_processed` à 1 et produit un `g_final` calculé sur une
> fiction. Un zéro de complaisance fabriquerait exactement le genre de chiffre
> rassurant que cette carte existe pour empêcher.

**Ce qui ne dépend pas d'eux**, d'après le moteur lui-même
(*« G is completely independent of runtime/infrastructure metrics »*,
*« G drives decisions, R is informational »*) :

| Sortie | Dépend des métriques d'exécution ? |
|---|---|
| Les quatre signaux · `g_score` · `quality.stability_score` · `v_score` · **la décision** | **Non** |
| `R` · `metrics.*` · `e_token` · `g_final` / `esi` | **Oui** |

## 4. Les cinq indicateurs — états validés

Validés par rejeu des **onze** réponses enregistrées (44 lectures) et par une
mesure réelle en production (`request_id` `9114b843-936d-4641-b474-5a6c9a3e4d69`).

| État | Exercé par | Rendu |
|---|---|---|
| **Mesuré, valeur non nulle** | `coherence_score = 0,883` en production | la valeur, son échelle, sa limite |
| **Mesuré à zéro** | `semantic_risk = 0` et `factual_hallucination_score = 0`, évaluateurs `measured` | **`0` affiché** — un zéro mesuré est un résultat |
| **Non mesuré, avec cause** | `degrade_01`, les quatre à `null` | « non publié » + la cause nommée |
| **Publié sans évaluateur mesurant** | `tier02_04`, `tier02_09` : `1,0` et `0,0` sous `not_attempted` | **retenue**, avec la phrase qui dit pourquoi |
| **Évaluateur absent** | dérivé d'une réponse réelle | `undeclared` : rien ne l'atteste |

**Aucune absence ne devient zéro, et aucun zéro mesuré n'est retenu** :
15 vrais zéros préservés sur les onze enregistrements, 0 violation d'invariant.

## 5. Campagne de qualification — avec des exécutions réelles

Le gel change la campagne, et il faut le dire franchement : **la matrice de
douze cas telle qu'elle était écrite n'est plus exécutable.** Huit de ses cas
exigeaient une réponse *fabriquée* (fausse, contradictoire, dangereuse) — or
une réponse fabriquée n'a ni tokens ni latence, et les emprunter à une autre
exécution serait pire qu'inventer.

### Le retournement

On ne construit plus les réponses : **on exécute, puis on classe ce qui sort**
contre une référence externe. C'est plus contraignant, et scientifiquement
meilleur — les réponses ne sont plus des hommes de paille.

**Source d'exécution : l'Ollama du poste, à coût fournisseur nul.** Mesuré
aujourd'hui, `llama3.2:3b`, `temperature 0`, graine fixe :

```
à froid : token_count=63   total=8194 ms   dont chargement 6470 ms
à chaud : token_count=63   total= 940 ms   dont chargement   12 ms
à chaud : token_count=63   total= 921 ms   dont chargement   17 ms
```

**Reproductible à ±18 ms, token_count stable.** Ces deux nombres sont
**observés**.

> **Le chargement n'est pas de la latence d'inférence.** Le plafond du
> normalizer est `max_latency_ms = 5000` pour `source_type: llm` : transmettre
> les 8 194 ms d'un démarrage à froid sature `latency_proxy` à 1,0 et effondre
> R pour une raison qui n'est pas l'exécution. **Règle de campagne : modèle
> préchauffé, `total_duration − load_duration` transmis, et `load_duration`
> consigné à côté.** Le choix est déclaré, pas subi.

### Couverture atteignable, et ce qui ne l'est pas

| Catégorie | Atteignable ? | Comment |
|---|---|---|
| vrai / cohérent | ✅ | question factuelle simple |
| faux / cohérent | ✅ | question où un petit modèle se trompe de façon fiable — à repérer par pré-tirage, pas à supposer |
| vrai / instable | ✅ | répétitions à graine variable sur une même question |
| ambigu / incomplet | ✅ | prompt sans référent ; question tronquée |
| contradictoire | ⚠️ **incertain** | difficile à provoquer sans l'écrire soi-même |
| **dangereux / cohérent** | 🔴 **non couvert** | le remplir demanderait de **produire** du contenu dangereux. La campagne ne le fera pas. Le canal de modération sera caractérisé par ses **statuts** (`measured` / `not_measured`), pas par un déclenchement provoqué |

**Deux cellules sur six resteront vides ou partielles. C'est un résultat de
campagne, pas un échec à masquer.**

### Cadre d'exécution

- `execution` uniquement, chemin **REST** — jamais le flux.
- `metadata` porte `case_id`, `repetition`, `protocol` : vérifié, transmis tel quel.
- 3 répétitions par cas, ≥ 3 s d'intervalle — la pile coupe à 5 requêtes / 10 s
  et le refus n'apparaît que dans les journaux du proxy.
- **Écartés de toute comparaison** : `delta_g` (compare à l'appel précédent du
  même compte), `baseline.esi_q` (mémoire du processus),
  `baseline.delta_E` (signe inverse de sa documentation).
- Relevé **par répétition**, jamais une moyenne : valeur, `evaluators[].status`,
  `model_used`, `measurement_status`, `request_id`.

> Trois répétitions détectent une instabilité grossière. **Aucune phrase du
> type « A diffère de B » n'est autorisée en sortie.**

## 6. Backlog — à ne pas traiter dans ce chantier

### BL-V1-001 · Mesure de contenu sans métriques d'exécution

**Besoin.** Qualifier une paire question / réponse **collée**, sans exécution
observée derrière. C'est le parcours produit naturel, et il est aujourd'hui
impossible : ChatGPT a tenté l'appel et a été refusé, faute de tokens et de
latence.

**Pourquoi c'est hors périmètre.** L'API exige les deux champs. Le connecteur
ne peut que bloquer ou inventer, et inventer est exclu.

**Ce que cela demanderait, le jour venu** — changement de **contrat**, pas de
moteur : `token_count` et `latency_ms` en `Optional[...] = None` ; quand ils
sont absents, **pas de substitution par zéro**, et `R`, `metrics.*`, `e_token`
et `g_final` publiés à **`null`** avec la cause nommée dans
`unmeasured_signals`. `G`, les quatre signaux et la décision sont **déjà
invariants** à ces champs par conception.

**Ce qui est déjà prêt.** La carte sait rendre ce cas sans une ligne de plus :
la discipline `measured` / `not_measured` / `undeclared` s'y applique telle
quelle.

## 7. Écarts bloquants restants

| # | Écart | Bloquant pour clore la V1 ? |
|---|---|---|
| 1 | **La carte native n'a jamais été vue dans ChatGPT** | 🔴 **OUI** — seul écart qui empêche de clore |
| 2 | Le refus d'appel ne nomme pas les champs manquants : l'hôte reçoit *« Arguments do not match the declared tool schema »* | 🟠 **Oui, en pratique** : c'est le refus que ChatGPT a rencontré sur le parcours principal |
| 3 | Ciel contre lectures quand le bloc `evaluators` manque | 🟡 Non — aucune des onze réponses n'a cette forme |
| 4 | Aucune journalisation de requête | 🟡 Non — mais toute panne d'hôte restera indiagnosticable |
| 5 | Modèles des enregistrements ≠ modèles de production | 🟡 Non — tranché en production : le juge est `mistral24b` |

**L'écart 2 est le seul changement de code que je recommande avant de clore** :
nommer les deux champs manquants dans l'erreur, et dire dans la description de
l'outil qu'il mesure une **exécution observée**. Cela ne débloque pas la mesure
de contenu — c'est BL-V1-001 — mais cela transforme un refus opaque en refus
actionnable, sur le parcours que l'utilisateur emprunte en premier.

## 8. Protocole de validation finale dans ChatGPT

**Je ne peux pas l'exécuter** : le plugin n'est pas connecté à ma session et un
terminal ne rend pas les ressources d'interface MCP. Ce qui suit est à faire
par vous.

**Préalable** — *Refresh* de la connexion. L'URI n'a pas changé, mais le
gabarit est passé de 42 822 à 60 275 octets et l'hôte peut servir l'ancien.

### Test 1 · Exécution réelle, relevé complet attendu

Fournir une question, une réponse **et ses métriques réellement observées**.

> *Mesure cette exécution avec NeoMundi. Question : « Quelle est la ville
> fédérale de la Suisse ? » Réponse : « La ville fédérale de la Suisse est
> Berne. » Métriques observées : 63 tokens, 928 ms de latence.*

**Attendu** : les quatre questions avec valeur, échelle et limite ·
l'indicateur global **à part**, ses deux échelles opposées · bandeau de
divergence `3.3.1`/`3.3.0` **présent et attendu** · phrase de bas de carte
intacte · aucun nom d'évaluateur en vue principale.

### Test 2 · Le test qui décide

> *Même exécution, mais ne donne que la réponse, sans la question.*

**Attendu** : au moins une lecture en **« non publié »**, avec sa cause.
🔴 **Si une case affiche un chiffre alors que le relevé est partiel ou vide,
faire le retour arrière.** C'est le défaut corrigé par la PR #23.

### Test 3 · Le refus, documenté

> *Mesure cette exécution : question et réponse, sans métriques.*

**Attendu** : un refus. **Noter le texte exact** — c'est l'entrée de
BL-V1-001 et la mesure de l'écart 2.

### Test 4 · Le repli technique

Ouvrir *Détail technique et provenance*. **Attendu** : les cinq évaluateurs
avec leur modèle — c'était **vide sur 100 % des mesures** avant la PR #22.

## 9. Critères GO / NO-GO pour clôturer la V1

**GO si, et seulement si, les quatre sont vrais :**

1. **Test 1 passe** — les cinq indicateurs s'affichent avec valeur, échelle et
   limite, et l'indicateur global est séparé.
2. **Test 2 passe** — aucune valeur affichée là où le relevé est partiel.
   *Critère éliminatoire : un seul chiffre de trop ici est un NO-GO.*
3. **Test 4 passe** — la provenance des cinq évaluateurs est lisible.
4. **Aucun vocabulaire de verdict** et **aucun nom d'évaluateur** en vue
   principale.

**NO-GO immédiat si :** une valeur apparaît sous un relevé vide · une absence
est rendue comme un zéro · un nom d'évaluateur remonte en vue principale · la
carte ne s'ouvre pas.

**N'entre pas dans le GO** : le bandeau de divergence de version *(attendu)* ·
le refus sans métriques *(gelé, BL-V1-001)* · la cellule « dangereux » non
couverte *(résultat de campagne)*.

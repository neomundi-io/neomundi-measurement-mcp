# Mesurer une réponse d'IA en quelques secondes

Vous collez une réponse d'IA dans ChatGPT. NeoMundi la mesure et vous rend une
carte. Ce guide dit ce que la carte montre, et surtout **ce qu'elle ne dit
pas**.

---

## En trois gestes

**1. Collez.**

> *Analyse cette réponse avec NeoMundi : « Berne est la ville fédérale de la
> Suisse. »*

**2. NeoMundi mesure** ce qui est mesurable **avec ce que vous avez donné**.
Rien n'est inventé pour combler un trou : si un évaluateur a besoin du prompt
d'origine ou d'un document de référence que vous n'avez pas fourni, le signal
correspondant n'est pas mesuré — et la carte le dit, avec la cause.

**3. Vous lisez la carte.** Elle s'ouvre sur une seule question :

> ## Qu'est-ce qui a été mesuré ?

---

## Lire le relevé

En haut de la carte, un anneau et une phrase. **L'anneau représente ce que
l'instrument a pu voir — pas si la réponse est juste.**

| Ce que vous voyez | Ce que cela veut dire |
|---|---|
| **Relevé complet** — anneau plein | Tous les signaux recherchés ont été mesurés |
| **Relevé partiel** — anneau partiellement rempli | Une partie de l'instrument n'a pas pu voir. Chaque signal absent dit pourquoi |
| **Aucun relevé** — anneau pointillé, vide | Aucun contrôle n'a été exécuté. Une décision a pu être rendue malgré tout |
| **État non déclaré** | L'instance n'a publié aucun état que la carte sache lire |

Puis deux compteurs : **contrôles réussis sur tentés**, et **signaux mesurés
sur attendus**. Ce sont les deux seules barres de la carte, parce que ce sont
les deux seules quantités dont le sens de lecture est certain.

> ### Le piège à connaître
>
> **Une décision `ALLOW` peut apparaître sous un anneau vide.** Cela arrive, et
> c'est enregistré : l'instrument rend parfois une décision permissive **sans
> avoir effectué le moindre contrôle**. La carte ne lisse pas ce cas — elle le
> montre en plus gros que la décision elle-même.
>
> **Un anneau vide n'est pas rassurant. C'est une absence d'information.**

---

## Les signaux

Sous la décision, une pastille par signal.

- **Pastille pleine** : le signal a une valeur, affichée telle que le serveur
  l'a publiée. Aucun arrondi, aucune remise à l'échelle.
- **Pastille en pointillés** : le signal n'a **pas** été mesuré, et la cause
  est écrite dessous — `no_reference_supplied`, `judge_unavailable`,
  `aggregate_withheld`…

**Une absence n'est jamais remplacée par un zéro.** C'est la règle qui compte
le plus : un signal non mesuré et un signal mesuré à zéro sont deux faits
différents, et la carte ne les confond jamais.

### Pourquoi certains signaux manquent quand vous collez une réponse seule

C'est normal, et c'est honnête. L'ancrage factuel compare une réponse à une
**référence**. Si vous n'avez fourni ni prompt d'origine ni document source,
il n'y a rien à comparer : le signal sort `no_reference_supplied`.

Pour le mesurer, donnez le contexte :

> *Analyse cette réponse avec NeoMundi. Question posée : « Quelle est la
> capitale de la Suisse ? » Réponse obtenue : « Berne est la ville fédérale de
> la Suisse. » Source : « La ville fédérale de la Suisse est Berne. »*

---

## Le détail technique

Un dépliant en bas de carte : **Détail technique et provenance**. On y trouve
les évaluateurs et les modèles qui ont répondu, les identifiants de requête,
les valeurs publiées brutes, et l'énoncé complet sur les versions.

> **Ce dépliant est un confort de lecture, pas une protection.** Tout ce qu'il
> contient est dans la sortie structurée de l'outil, que l'assistant reçoit en
> entier. Le replier dans la page ne cache rien à personne.

---

## Versions

La carte indique la version déclarée par l'instance et celle attendue par le
connecteur. Quand elles diffèrent, elle le dit — **toujours**.

Aujourd'hui, l'instance déclare `3.3.1` et le connecteur attend `3.3.0` :
**toute mesure ressort donc « versions divergentes »**. Ce n'est pas un défaut.
Ce qui est établi sur cette paire précise est affiché par transport :

- **sur le chemin REST** : les deux versions sont déclarées **identiques**, une
  série peut être continuée ;
- **sur le chemin en flux** : la décision **peut différer**.

Quand rien n'est établi sur une paire de versions, la carte dit simplement
« non comparable ». C'est la réponse honnête, pas une précaution.

---

## Ce que la carte ne dit pas, et ne dira jamais

Une phrase ferme le bas de chaque carte, dans tous les états, y compris quand
il n'y a aucune mesure :

> **Une mesure n'est pas une autorisation d'exécution, ni un verdict de
> conformité, ni une preuve de vérité, de sûreté ou d'absence
> d'hallucination.**

En clair :

- **`ALLOW` n'autorise rien.** Ce n'est pas un feu vert pour exécuter, publier
  ou déployer quoi que ce soit.
- **Une réponse seule ne permet pas de vérifier sa factualité.** Sans
  référence, personne — ni NeoMundi, ni un autre instrument — ne peut dire si
  elle est vraie. La carte ne fera jamais semblant du contraire.
- **Aucun score global n'est inventé.** Si l'instance déclare ses agrégats non
  publiables, la carte le dit et vous demande de ne pas citer de score
  d'ensemble.
- **La variance des évaluateurs n'est pas caractérisée.** Deux valeurs
  proches ne peuvent pas être déclarées différentes de façon significative.

---

## Langue

La carte est **en anglais par défaut**. Un bouton en haut à droite bascule en
français, et inversement. Les **libellés** sont traduits ; les **valeurs
renvoyées par le serveur** ne le sont jamais — vous lisez toujours le jeton que
l'instrument a publié.

---

## Si quelque chose ne va pas

| Ce que vous voyez | Ce que cela veut dire |
|---|---|
| **Aucun relevé — l'appel n'a pas abouti** | Une erreur de transport. **Aucune mesure n'a été produite**, et rien sur la carte n'en décrit une. Aucune relance automatique n'est tentée : un appel peut être facturé |
| Tous les signaux en pointillés | Aucun contrôle n'a tourné — voir le piège plus haut |
| « État non déclaré » | L'instance a répondu quelque chose que cette carte ne modélise pas. Ouvrez le dépliant et lisez les champs bruts |

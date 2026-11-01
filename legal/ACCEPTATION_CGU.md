# Acceptation des CGU — mécanisme et preuve de consentement

**Version 0.1 — 2026-11-01.** Procédure opérationnelle.

> Ce document répond au bloquant **B-1** des
> [décisions ouvertes](DECISIONS_OUVERTES.md) : *aucun mécanisme d'acceptation
> n'existait, donc l'opposabilité des CGU n'était pas établie.*

---

## 1. Le principe, en une phrase

**L'accès est délivré en échange d'une acceptation écrite, et l'acceptation
désigne un texte identifiable par son empreinte.**

Tout découle de là. Il n'y a **aucune nouvelle infrastructure** : ni compte,
ni base de données, ni formulaire en ligne, ni case à cocher à développer. Le
mécanisme tient dans un échange de courriels et un fichier.

### Pourquoi lier l'acceptation à la délivrance de l'accès

Parce que c'est le **seul moment où le participant et l'association sont déjà
en contact**, et le seul point de passage obligatoire. L'accès est déjà
délivré sur autorisation ; il suffit d'y attacher l'acceptation, au lieu de
construire un dispositif séparé que personne n'utiliserait.

---

## 2. La procédure — trois étapes

### Étape 1 — Envoyer

L'association envoie au participant, par courriel :

- le **lien vers les CGU** dans sa langue, et la **version** ;
- l'**empreinte SHA-256** du texte canonique de cette version ;
- le [modèle d'acceptation](MODELE_ACCEPTATION_FR.md) prérempli ;
- la [politique de confidentialité](POLITIQUE_CONFIDENTIALITE_MCP_FR.md).

La version et l'empreinte se lisent dans
[`cgu-versions.json`](cgu-versions.json) :

```bash
node scripts/cgu-fingerprint.mjs
```

> ⛔ **Si l'outil répond « aucune version acceptable », il ne faut recueillir
> aucune acceptation.** C'est le cas tant que les CGU sont un projet non
> publié : faire accepter un texte non validé n'engagerait personne et
> exposerait l'association.

### Étape 2 — Recevoir l'acceptation

Le participant **renvoie le modèle complété**, par réponse au courriel ou en
pièce signée.

L'acceptation doit être **explicite** : une phrase d'acceptation reprenant la
version et l'empreinte. **Un silence, une absence de réponse ou un simple
usage du service ne valent pas acceptation.**

### Étape 3 — Délivrer l'accès et consigner

L'association **ne délivre l'identifiant technique qu'après** réception de
l'acceptation, et consigne l'entrée au registre (§4).

**Ordre non négociable :** acceptation **puis** accès. L'inverse laisserait
une période d'usage non couverte — exactement le défaut que l'article 3 de la
licence a dû corriger pour l'exploitation du service lui-même.

---

## 3. Ce que l'acceptation enregistre, et rien d'autre

Quatre informations, parce que les quatre sont nécessaires à la preuve :

| Champ | Pourquoi il est nécessaire |
|---|---|
**Identité** — organisation, nom et qualité du signataire | sans elle, on ne sait pas **qui** a accepté, ni s'il pouvait engager |
**Date** — date d'acceptation | sans elle, on ne sait pas **à partir de quand** |
**Version et empreinte** des CGU | sans elles, on ne sait pas **quel texte** |
**Méthode** — réponse courriel, pièce signée, signature électronique | sans elle, on ne sait pas **comment** le consentement a été donné |

### Ce qui n'est pas collecté

**Aucune donnée personnelle au-delà du strict nécessaire.** En particulier :

- ❌ pas d'adresse postale personnelle, de date de naissance, de pièce
  d'identité ;
- ❌ pas d'adresse IP, de traceur, d'empreinte de navigateur ;
- ❌ pas de case à cocher en ligne — donc **aucun journal d'horodatage
  technique** supplémentaire ;
- ❌ pas de copie du document complet chez le participant : **l'empreinte
  suffit** à prouver quel texte a été accepté.

La seule donnée personnelle est **le nom et la qualité du signataire**, qui
est l'objet même de la preuve. C'est le traitement **T-6** de la
[politique de confidentialité](POLITIQUE_CONFIDENTIALITE_MCP_FR.md).

> **Pourquoi l'empreinte évite de collecter davantage.** Sans elle, prouver
> *quel* texte a été accepté obligerait à archiver une copie du document
> auprès de chaque participant, ou à tenir un historique de pages publiées.
> Une chaîne de 64 caractères remplace les deux.

---

## 4. Le registre des acceptations

Un fichier, tenu par l'association, **hors de ce dépôt public** — il contient
des noms.

**Format proposé**, une ligne par acceptation :

| Colonne | Exemple |
|---|---|
`organisation` | *dénomination du participant* |
`signataire` | *nom et qualité* |
`date_acceptation` | `2026-11-15` |
`cgu_version` | `1.0` |
`cgu_langue` | `fr` |
`cgu_sha256` | `6749bb…` |
`methode` | `reponse_courriel` · `piece_signee` · `signature_electronique` |
`preuve` | *référence de la pièce archivée* |
`acces_delivre_le` | `2026-11-15` |
`acces_clos_le` | *vide tant que le pilote est actif* |

**Conservation :** la preuve doit survivre à la relation, le temps des
prescriptions applicables. **[À COMPLÉTER — durée à fixer avec le conseil.]**
Elle est **distincte** de la durée de conservation des mesures.

**Emplacement :** **[À COMPLÉTER]** — dans l'espace documentaire de
l'association, avec les conventions pilotes signées.

---

## 5. Retrait et fin

Le participant peut **retirer son acceptation à tout moment**, ce qui met fin
à son accès — c'est l'article 9 de la
[convention pilote](CONVENTION_PILOTE_FR.md).

**Le retrait n'efface pas la preuve d'acceptation passée** : il la clôt. On
renseigne `acces_clos_le`, on ne supprime pas la ligne. Effacer reviendrait à
perdre la trace de la période pendant laquelle le service a été utilisé sous
ces conditions.

---

## 6. Changement de version des CGU

Un changement de texte **crée une nouvelle version et une nouvelle
empreinte** — jamais une correction de l'ancienne entrée.

Une modification **substantielle** suppose une **nouvelle acceptation** :
l'ancienne portait sur un autre texte, et son empreinte le prouve.

Une modification **mineure** (correction matérielle, lien) peut être notifiée
sans nouvelle acceptation. **[À CONFIRMER]** — le seuil entre les deux relève
de l'article 17 des CGU, encore ouvert.

> Le test `tests/cgu-versions.test.mjs` échoue si une empreinte ne correspond
> plus à son fichier. **La bonne réaction n'est jamais de corriger
> l'empreinte**, mais de créer une version.

---

## 7. Ce qu'il reste à faire pour que ce mécanisme soit utilisable

| # | Élément | Qui |
|---|---|---|
**1** | **Valider et publier les CGU** — le mécanisme est prêt, le texte ne l'est pas. Les pages ne sont pas en ligne à ce jour | **Sébastien** + conseil |
**2** | Renseigner `url_publiee` et `date_entree_en_vigueur`, puis passer `acceptable` à `true` dans [`cgu-versions.json`](cgu-versions.json) | une session |
**3** | **Fixer la durée de conservation** du registre d'acceptations | **Sébastien** + conseil |
**4** | **Créer le registre** à son emplacement définitif | une session |
**5** | Trancher le seuil « modification substantielle » (art. 17 des CGU) | **Sébastien** |

**Tant que le point 1 n'est pas fait, aucune acceptation ne doit être
recueillie**, et l'outil le refuse explicitement.

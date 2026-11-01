# État juridique — V1

**Relevé du 2026-11-01.** Source unique sur l'état de publication des
documents juridiques du service MCP.

> ## ⛔ Rien n'est publié. Les deux pages restent en BROUILLON.
>
> **Motif :** les textes canoniques portent la mention « **projet de travail,
> non publiable en l'état** » et **12 clauses non arbitrées par langue**.
> La règle de la mission est explicite : dans ce cas, on remplit les brouillons
> et on signale les blocages. C'est ce qui a été fait.

---

## 1. Les deux pages WordPress

| | Français | Anglais |
|---|---|---|
Identifiant | **3772** | **3773** |
Slug | `cgu` | `terms-of-use` |
Adresse publique prévue | `https://neomundi.org/cgu` | `https://neomundi.org/en/terms-of-use` |
Titre | *Conditions générales d'utilisation — NeoMundi* | *Terms of Use — NeoMundi* |
**Statut** | **`draft`** | **`draft`** |
Contenu | **rempli le 2026-11-01** | **rempli le 2026-11-01** |

**Ce qui n'a pas été touché**, conformément à la consigne : titres, slugs,
adresses, menus, traductions, métadonnées SEO, réglages de thème. **Seul le
champ `content` a été écrit**, et `status` a été explicitement maintenu à
`draft`.

**Aucune page n'a été créée.** Les deux brouillons préexistaient.

---

## 2. Version publiée dans les brouillons

| | |
|---|---|
Version | **0.4** |
Source canonique FR | `legal/CGU_MCP_FR.md` |
Empreinte SHA-256 FR | `6bce6e9e73e4f2ac3d9db2822182d248fc0bc3013ba39c75cb1e6ada655e96e4` |
Source canonique EN | `legal/CGU_MCP_EN.md` |
Empreinte SHA-256 EN | `71b89553059bf210dc966b00f98e91d79eef1870b9a12e0e3c625fd705092430` |
Langue faisant foi | **français** |
`acceptable` au registre | **`false`** |

Les empreintes se revérifient par `node scripts/cgu-fingerprint.mjs`, et un
test échoue si elles dérivent. **Elles portent sur les octets versionnés**
(`eol=lf`), pas sur une copie de travail.

---

## 3. Ce qui a été vérifié, et comment

| Contrôle | Résultat |
|---|---|
Cohérence des deux textes | **27 titres** de section dans chacun, même structure, **18 articles** |
Clauses non arbitrées | **7 « à compléter » + 5 « à confirmer »** par langue — **identiques** FR/EN |
Conversion vers WordPress | **154 blocs** Gutenberg par langue ; **tous les titres** du source retrouvés dans la sortie |
Fidélité du texte | les **12 marqueurs** et l'**avertissement de projet** survivent à la conversion |
Contenu réellement stocké | les **18 articles** sont présents dans la réponse de WordPress, marqueurs et avertissement compris |
Liens | **aucun lien mort** : les renvois internes au dépôt deviennent du texte, sauf ceux qui ont une page réelle (politique de confidentialité) |
Titre de niveau 1 | **retiré** du corps : la page porte déjà son titre, un second `h1` nuirait à la structure |

### Ce qui n'a PAS pu être vérifié

**Le rendu visuel, sur ordinateur comme sur mobile.** Une page en brouillon
n'est pas servie publiquement : une requête non authentifiée sur l'URL de
prévisualisation renvoie une **page 404**, ce qui a été constaté. Vérifier le
rendu exigerait soit de publier la page — ce que le point 7 interdit — soit
une prévisualisation authentifiée dans le navigateur.

**Ce qui est connu malgré tout :** le thème du site est **Astra**, et il
définit des points de rupture à **921 px** et **544 px**. Les blocs utilisés —
paragraphe, titre, liste, citation, séparateur — sont des blocs standard,
réactifs par défaut. Le risque de rendu est donc faible, mais **il n'est pas
mesuré**.

> **À faire au moment de la publication :** ouvrir chaque page en
> prévisualisation connectée, en largeur bureau puis mobile, et vérifier d'un
> coup d'œil les tableaux et les citations — les deux seuls éléments qui
> débordent facilement.

---

## 4. Les blocages — pourquoi les pages restent en brouillon

### 4.1 Le texte se déclare lui-même non publiable

Les deux documents portent, en tête : « **projet de travail, non publiable en
l'état** », et une mise en garde indiquant que les mentions entre crochets
« ne doivent pas être comblées par analogie ».

**Publier un texte qui se dit non publiable serait contradictoire.**

### 4.2 Les douze clauses non arbitrées

| # | Clause | Article |
|---|---|---|
1 | **Date d'entrée en vigueur** | en-tête |
2 | Adresse de contact contractuelle et sécurité | 1 |
3 | **Consommateurs admis ou exclus** | 5 |
4 | Identifiants individuels, ou accès partagé | 6 |
5 | Politique de citation | 11 |
6 | Renvoi à l'annexe de périmètre des droits | 14 |
7 | **Limitation de responsabilité** | 15 |
8 | **Qualification des rôles RGPD** | 16 |
9 | Préavis de modification | 17 |
10 | Juridiction compétente | 18 |
11–12 | Deux renvois dépendant des précédents | 14, 16 |

**Trois sont structurants** et ne peuvent pas être laissés ouverts à la
publication : la **date d'entrée en vigueur** (sans elle, on ne sait pas à
partir de quand le texte s'applique), la **limitation de responsabilité** (la
gratuité n'exonère pas de plein droit en droit français), et la
**qualification des rôles RGPD**.

### 4.3 Deux blocages hors CGU

- **La politique de confidentialité publiée ne couvre pas le traitement MCP.**
  Les CGU y renvoient deux fois. Publier les CGU avant de l'actualiser créerait
  un renvoi vers un document qui ne décrit pas le traitement.
- **Aucune relecture par un conseil** n'a eu lieu.

---

## 5. Ce qu'il reste à faire, dans l'ordre

1. **Trancher les 12 clauses** — au minimum les trois structurantes du §4.2 ;
2. **faire relire par un conseil compétent** ;
3. **actualiser la politique de confidentialité** avec la section MCP, FR et EN ;
4. **retirer l'avertissement de projet** et renseigner la date d'entrée en
   vigueur dans les textes canoniques ;
5. **regénérer et réécrire** les deux brouillons — les empreintes changeront,
   donc **créer une version 1.0** au registre plutôt que corriger la 0.4 ;
6. **vérifier le rendu** en prévisualisation connectée, bureau et mobile ;
7. **publier** les deux pages, puis renseigner `url_publiee`,
   `date_entree_en_vigueur` et passer `acceptable` à `true` ;
8. **renseigner `termsOfServiceURL`** dans le manifeste du plugin.

> **L'étape 7 est celle qui rend le mécanisme d'acceptation utilisable.**
> Tant qu'elle n'est pas faite, `scripts/cgu-fingerprint.mjs` refuse de
> désigner une version acceptable, et aucune acceptation ne doit être
> recueillie.

---

## 6. Journal

| Date | Événement |
|---|---|
2026-11-01 | Brouillons FR et EN **remplis** avec la version 0.4. Statut `draft` maintenu. Aucune page créée, aucun titre ni slug modifié |
2026-11-01 | Constat : le rendu d'un brouillon n'est pas vérifiable sans authentification |

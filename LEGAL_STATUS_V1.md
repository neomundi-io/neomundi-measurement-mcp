# État juridique — V1

**Relevé du 2026-11-01.** Source unique sur l'état de publication des
documents juridiques du service MCP.

> ## ✅ Les CGU v1.0 sont PUBLIÉES et en vigueur depuis le 1er novembre 2026.
>
> **Sans rétroactivité** : le texte le dit lui-même, en tête.
>
> **Tout le reste du dossier juridique demeure en PROJET**, hors de ce dépôt
> public, avec une échéance de consolidation au **11 novembre 2026**.

---

## 1. Les deux pages publiées

| | Français | Anglais |
|---|---|---|
| Identifiant | **3772** | **3773** |
| Adresse publique | **`https://neomundi.org/cgu`** | **`https://neomundi.org/en/terms-of-use`** |
| Titre | *Conditions générales d'utilisation — NeoMundi* | *Terms of Use — NeoMundi* |
| **Statut** | **`publish`** | **`publish`** |
| Publiée le | 2026-11-01 à 17:54:53 | 2026-11-01 à 17:56:42 |

**Aucune page n'a été créée.** Les deux brouillons préexistaient : seuls le
champ `content` et le champ `status` ont été écrits. Titres, slugs, adresses,
menus, traductions, métadonnées SEO et réglages de thème **n'ont pas été
touchés**.

**Les liens de pied de page existaient déjà** et pointent correctement —
`CGU → /cgu` en français, `Terms of Use → /en/terms-of-use` en anglais. Ils
étaient en place avant la publication et résolvent depuis.

---

## 2. Version en vigueur

| | |
|---|---|
| Version | **1.0** |
| Entrée en vigueur | **2026-11-01**, **sans rétroactivité** |
| Source canonique FR | `legal/CGU_MCP_FR.md` |
| Empreinte SHA-256 FR | `01e5191f5b0f55785a8c43cd86f3286164a55387b95b3d7a83bf330b7a79034d` |
| Source canonique EN | `legal/CGU_MCP_EN.md` |
| Empreinte SHA-256 EN | `346de3fc524d0ac0c2efa17c12ab384b0e264ca0bbe7c5084cb079a294e4473d` |
| Langue faisant foi | **français** |
| `acceptable` au registre | **`true`** |

```
node scripts/cgu-fingerprint.mjs
# → « OK : 1 version(s). Version acceptable aujourd'hui : 1.0. »
```

**Les empreintes portent sur les octets versionnés** (`eol=lf`), pas sur une
copie de travail.

> **Une version ne se corrige pas.** Si un texte change, on crée une version
> nouvelle au registre. L'empreinte de la 1.0 est la preuve de ce que les
> participants auront accepté.

---

## 3. Ce qui a été vérifié après publication, et comment

Vérifications menées sur les **pages publiques servies**, par requête HTTP non
authentifiée — donc sur ce qu'un visiteur voit réellement, pas sur ce que
l'API annonce.

| Contrôle | Résultat |
|---|---|
| Accessibilité | **HTTP 200** sur les deux adresses |
| Structure | **18 articles** présents dans chacune |
| Mention de version | « Version 1.0 — en vigueur depuis le 1er novembre 2026. » / « Version 1.0 — in force since 1 November 2026. » |
| Non-rétroactivité | présente dans les deux textes, en tête |
| URL canonique | correcte sur les deux pages |
| **Marqueurs résiduels** | **zéro** — aucun « à compléter », « à confirmer », crochet ni avertissement de projet |
| Liens de pied de page | **présents et corrects** dans les deux langues |
| Manifeste MCP | `termsOfServiceURL` renseigné vers **la page française**, celle qui fait foi |

### Les douze marqueurs, et comment ils ont été retirés

**Aucun n'a été comblé par invention.** Chacun a été remplacé par un fait
vérifié ou par une formulation de droit commun :

| Clause | Traitement |
|---|---|
| Date d'entrée en vigueur | **renseignée** : 1er novembre 2026 |
| Adresse de contact | le **formulaire** a été vérifié ; la note sur une adresse contractuelle est retirée |
| Limitation de responsabilité (art. 15) | renvoi au **droit commun**, avec réserve explicite de la faute lourde ou dolosive |
| Rôles RGPD (art. 16) | renvoi à la politique du site, **sans lien direct** — assumé, la politique ne couvrant pas encore le MCP |
| Préavis de modification (art. 17) | remplacé par une **nouvelle acceptation** adossée à l'empreinte |
| Historique / « ControlTower » | paragraphe **supprimé** |
| Annexe « Points à trancher » | **supprimée** |
| Les cinq autres | énoncés comme **constats**, sans promesse ni garantie inventée |

---

## 4. Ce qui reste ouvert — et où c'est suivi

Les clauses retirées n'ont pas été tranchées : **elles ont été sorties du
texte**. Elles sont suivies dans un **registre de consolidation** tenu **hors
de ce dépôt public**, avec une échéance au **11 novembre 2026** et six items :

1. **politique de confidentialité MCP** et **qualification des rôles RGPD** —
   le plus urgent, car l'article 16 y renvoie ;
2. **durées de conservation** des données et des journaux — mesurées, non
   décidées ;
3. **régularisation du DPA Infomaniak** — demandée le 2026-11-01 ;
4. **convention pilote** et **NDA** ;
5. **licence associative** et **PV de bureau** ;
6. **clauses contractuelles restantes** — vers une v1.1.

**Aucune de ces réserves ne rend la v1.0 inopposable.** Chacune a été
remplacée dans le texte publié par une formulation tenable. Mais la **v1.1**
les attend toutes.

### Deux gardes à ne pas lever

- **Aucun accès ne doit être délivré sans acceptation écrite** de la version
  1.0, enregistrée avec son empreinte (article 4). Le mécanisme est prêt et
  l'outil désigne désormais une version acceptable.
- **Aucune relecture par un conseil** n'a eu lieu, ni sur les CGU publiées ni
  sur les projets. C'est un fait, pas une recommandation.

---

## 5. Journal

| Date | Événement |
|---|---|
| 2026-11-01 | Brouillons FR et EN **remplis** avec la version 0.4, statut `draft` maintenu : le texte se déclarait non publiable et portait 12 clauses non arbitrées |
| 2026-11-01 | Constat : le rendu d'un brouillon n'est pas vérifiable sans authentification — une requête non authentifiée renvoie une page 404 |
| 2026-11-01 | **Version 1.0** rédigée : les 12 marqueurs retirés sans invention, date d'entrée en vigueur fixée, non-rétroactivité énoncée |
| 2026-11-01 | **Les deux pages publiées.** Vérifiées sur les pages servies : 200, 18 articles, zéro marqueur, liens de pied de page corrects |
| 2026-11-01 | Registre passé à `acceptable: true`. Manifeste MCP renseigné. Dossier de projets **sorti du dépôt public** |
| 2026-11-01 | **Registre de consolidation ouvert**, échéance 11 novembre 2026, six items |

# État juridique — V1

**Relevé du 2026-11-01.** Source unique sur l'état de publication des
documents juridiques du service MCP.

> ## ✅ CGU v1.0 publiées, et politique de confidentialité actualisée.
>
> Les deux le **1er novembre 2026**. Les CGU sont en vigueur **sans
> rétroactivité** ; la politique couvre désormais **le service de mesure**,
> et plus seulement le site.
>
> **Le reste du dossier juridique demeure en PROJET**, hors de ce dépôt
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

## 2bis. Politique de confidentialité — actualisée le 2026-11-01

| | Français | Anglais |
|---|---|---|
| Identifiant | **916** | **919** |
| Adresse publique | **`https://neomundi.org/politique-de-confidentialite`** | **`https://neomundi.org/en/privacy-policy`** |
| **Statut** | **`publish`** (inchangé) | **`publish`** (inchangé) |
| Mise à jour affichée | 1<sup>er</sup> novembre 2026 | 1 November 2026 |
| Copie canonique | `legal/POLITIQUE_CONFIDENTIALITE_FR.md` | `legal/PRIVACY_POLICY_EN.md` |
| Empreinte SHA-256 | `c6e9b0a9a732986b01968cbbd66cf9f83d3387857de972a9029a884332456ec2` | `29b50bfab4c554eb10eb7a5ee991a3d3ed96479195bc0aae6fd11a05fa6340d7` |

**Les douze sections préexistantes sont conservées telles quelles** — site,
formulaires, lettre d'information, protection anti-spam, statistiques, partage,
conservation, sécurité, droits, contact, modifications. **Trois écritures
seulement** : un paragraphe de périmètre, la section « Service de mesure
NeoMundi » (quatorze sous-sections), et la date de mise à jour.

Les correctifs ont été appliqués **côté serveur**, par remplacement d'un
fragment identifié, et non par réécriture du champ entier. C'est ce qui garantit
que le texte déjà publié n'a pas bougé d'un caractère.

### Ce que la section ajoutée règle

Elle lève l'écart qui empêchait les CGU d'avoir un renvoi utile : leur
article 16 pointait vers une politique **qui ne décrivait pas le service**.

| Exigence de la mission | Traitement |
|---|---|
| Données reçues | invite, réponse, documents et extraits de contexte, informations techniques de requête — **énumérées** |
| Transmission connecteur → API | deux services distincts, le connecteur **ne calcule rien et ne conserve rien** |
| Évaluateurs locaux et Infomaniak | **trois analyses locales, deux transmises** ; nommé comme le **seul** point de sortie du contenu |
| Résultats | signaux, états, cause de non-mesure, provenance, décision, longueurs, **extraits conservés** |
| Journaux et durées connues | IP appelante ; **14 jours** pour le serveur web ; **aucune rotation** ailleurs, donc **aucune durée annoncée** |
| Journaux ≠ contenus ≠ mesures ≠ preuves | une sous-section entière, parce qu'une affirmation vraie de l'un est fausse des autres |
| Finalités et bases juridiques | quatre traitements, chacun avec sa base **retenue à ce stade** |
| Droits et contact | formulaire, **plus la réclamation CNIL** ; et trois limites réelles énoncées |
| Limites non vérifiées | deux sous-sections : **« Ce que nous ne pouvons pas affirmer »** et **« Points en cours de consolidation »** |

### Les règles de la mission, et comment elles sont tenues

- **« Ne jamais affirmer que les prompts ne sont pas transmis »** — la page
  affirme l'inverse, en gras, dès le deuxième paragraphe de la section.
- **« Ne pas inventer de durée, de garantie d'effacement ou de
  certification »** — aucune durée n'est annoncée là où aucune n'existe ; la
  page écrit qu'elle ne garantit pas l'effacement chez un tiers et qu'elle ne
  détient **aucune certification**.
- **« Les rôles RGPD dépendent des traitements et des responsabilités
  effectives »** — énoncé comme principe, suivi du refus explicite de publier
  une qualification non arrêtée.
- **Aucune pièce interne exposée** : ni accord de sous-traitance, ni accord de
  confidentialité, ni statuts, ni contrat. Le sous-traitant est nommé, son
  rôle décrit ; rien de plus.

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
| Rôles RGPD (art. 16) | renvoi à la politique du site, **sans lien direct**, parce qu'elle ne couvrait pas encore le MCP. **Cette condition est levée depuis le 2026-11-01** : la politique couvre le service, et l'article 16 pourra porter un lien direct dans une **v1.1** |
| Préavis de modification (art. 17) | remplacé par une **nouvelle acceptation** adossée à l'empreinte |
| Historique / « ControlTower » | paragraphe **supprimé** |
| Annexe « Points à trancher » | **supprimée** |
| Les cinq autres | énoncés comme **constats**, sans promesse ni garantie inventée |

---

## 4. Ce qui reste ouvert — et où c'est suivi

Les clauses retirées n'ont pas été tranchées : **elles ont été sorties du
texte**. Elles sont suivies dans un **registre de consolidation** tenu **hors
de ce dépôt public**, avec une échéance au **11 novembre 2026** et six items :

1. ~~politique de confidentialité MCP~~ **faite le 2026-11-01** ; reste la
   **qualification des rôles RGPD**, qui conditionne les points 3 et 4 ;
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
| 2026-11-01 | **Politique de confidentialité actualisée** et publiée, FR et EN : section « Service de mesure NeoMundi », 14 sous-sections. Les 12 sections préexistantes conservées intactes |
| 2026-11-01 | Vérifié sur les pages servies : 200, **27 titres** chacune, liens CGU dans le corps **et** en pied de page, **zéro débordement** mesuré à 360 px sur 222 et 219 éléments |

# Annexe — périmètre des droits concédés

**Version 0.1 — projet. Annexe de la
[licence d'exploitation](LICENCE_EXPLOITATION_ASSOCIATIVE_FR.md).**

> ⛔ **Cette annexe est incomplète par construction, et c'est volontaire.**
> Elle recense ce qui **a été vérifié**, et laisse en blanc ce qui **ne peut
> pas l'être depuis les systèmes techniques**. Un blanc rempli par analogie
> transformerait un inventaire en affirmation de titularité — exactement ce
> qu'il faut éviter.
>
> **Tant que la colonne « droits établis » comporte un blanc, la licence ne
> peut pas être signée** pour l'élément concerné.

---

## 1. Ce que l'inventaire doit établir, par élément

Pour chaque élément : **ce que c'est**, **où il se trouve**, **qui en détient
les droits**, et **par quelle pièce** cela est établi.

| Élément | Localisation | Droits détenus par | Pièce justificative |
|---|---|---|---|
**Connecteur MCP** — code source | dépôt public `neomundi-io/neomundi-measurement-mcp` | **[À ÉTABLIR]** | **[À FOURNIR]** |
**Instrument de mesure** — moteur, protocoles, métriques | hors de ce dépôt, exécuté sur l'infrastructure de mesure | **[À ÉTABLIR]** | **[À FOURNIR]** |
**Schémas de contrat** REST/SSE embarqués | `runtime/schemas/contracts/` | **[À ÉTABLIR]** | **[À FOURNIR]** |
**Documentation** publiée avec le connecteur | dépôt | **[À ÉTABLIR]** | **[À FOURNIR]** |
**Marque et nom « NeoMundi »** | — | **[À ÉTABLIR]** | **[À FOURNIR]** — dépôt éventuel, classes, territoires |
**Signe graphique** (logo *control tower*) | actifs de marque, hors dépôt | **[À ÉTABLIR]** | **[À FOURNIR]** |
**Méthodologie dite *Law E*** | — | **[À ÉTABLIR]** | **[À FOURNIR]** |
**Titres de propriété industrielle** éventuels | registre d'arbitrage IP, hors dépôt | **[À ÉTABLIR]** | **[À FOURNIR]** — numéros officiels, statut, échéances |
**Données et corpus** produits par les campagnes | infrastructure de mesure | **[À ÉTABLIR]** | **[À FOURNIR]** |

---

## 2. Ce qui est vérifié, et peut être écrit sans réserve

Ces constats proviennent d'audits techniques menés sur le service réel. Ils
**n'établissent aucune titularité** — ils délimitent l'objet.

| # | Constat | Source |
|---|---|---|
**V-1** | Le connecteur **n'embarque aucune dépendance tierce** : seuls des modules natifs sont importés | [audit PI](../MCP_IP_LICENSE_AUDIT.md) |
**V-2** | Le dépôt est **public** et **ne porte aucune licence** : ni fichier `LICENSE`, ni champ `license`, ni mention de copyright. **Public sans licence = tous droits réservés** | API GitHub |
**V-3** | Le connecteur **ne contient pas l'instrument de mesure** : il ne calcule aucun signal, il transmet et restitue | code |
**V-4** | L'**image de conteneur** embarque des composants tiers sous licences distinctes, dont au moins un sous **GPL-2.0** | inspection de l'image |
**V-5** | **Aucune image n'est publiée sur un registre** : les obligations de distribution **ne sont pas déclenchées** à ce jour | configuration |
**V-6** | Le **signe graphique** du plugin est **dérivé** de la marque existante par détourage et remplissage, sans déformation | `assets/README.md` |
**V-7** | Le dépôt appartient à l'organisation GitHub **`neomundi-io`**, alors que l'éditeur déclaré du service est **l'association** | API GitHub, manifeste |

---

## 3. Contributions de tiers

**[À ÉTABLIR]** — recenser toute contribution au code concédé dont l'auteur
n'est pas le Concédant, et les droits correspondants.

Points à examiner : historique des contributeurs du dépôt ; travaux réalisés
par des prestataires ou des membres de l'association ; code repris d'un
projet antérieur ; et tout élément produit dans un cadre salarié.

> **Une contribution non identifiée est un droit non concédé.** Le Concédant
> ne peut concéder que ce qu'il détient (art. 2 et 11 de la licence).

---

## 4. Pouvoir d'engager l'association — **vérifié le 2026-11-01**

Les statuts ont été lus. Les réponses ne sont plus des champs à compléter.

| Question | Réponse | Référence |
|---|---|---|
Qui représente légalement l'association ? | **Le Président**, « dans tous les actes de la vie civile ». Aucun autre membre du bureau n'a ce pouvoir | **article 8** |
Comment le bureau est-il composé ? | Au minimum trois membres : **Président, Secrétaire, Trésorier**, élus en assemblée générale **pour un an renouvelable** | **article 7** |
Quel organe autorise un engagement de cette nature ? | **Le bureau**, qui « prend toutes les décisions nécessaires à la bonne marche de l'association » | **article 8** |
Une procédure de conflit d'intérêts existe-t-elle ? | **Non.** Les statuts n'en prévoient aucune : elle doit être organisée par décision du bureau et documentée | — |
Qui a été élu, et quand ? | Bureau élu **à l'unanimité** par l'**assemblée générale constitutive du 31 mars 2026** | procès-verbal d'AG constitutive |
Qui signe, le Concédant étant le Président ? | **À trancher** — mandat spécial à un autre membre, ou signature par le Président avec délibération prise sans lui | [modèle de procès-verbal](PV_BUREAU_LICENCE_MODELE.md) |

### 4.1 Ce que l'article 11 des statuts dit déjà

> « La propriété intellectuelle afférente aux développements techniques,
> métriques et architectures **demeure la propriété de leurs auteurs ou ayants
> droit**, qui concèdent à l'association **une licence d'usage à titre gratuit
> pour ses activités de diffusion scientifique**. »

Deux conséquences, et la seconde est la plus importante :

1. **le modèle retenu est déjà celui des statuts** — licence gratuite, pas de
   transfert de propriété. La convention ne crée pas un régime nouveau, elle
   le précise ;
2. ⚠ **le périmètre statutaire est plus étroit que l'exploitation réelle.**
   L'article 11 vise la « **diffusion scientifique** ». Héberger un service,
   le tenir en production et en délivrer l'accès à des participants
   **excède ce que ces termes couvrent avec certitude**. C'est précisément ce
   que la convention écrite vient couvrir — et c'est la raison pour laquelle
   elle reste nécessaire malgré l'article 11.

**L'article 11 confie par ailleurs au bureau** la définition des modalités de
diffusion des travaux de recherche.

### 4.2 Points encore ouverts

- **le mandat du bureau court un an** : celui issu de l'AG constitutive expire
  fin mars 2027. **C'est le mandat en cours à la date de signature qui doit
  être justifié** ;
- une **cooptation d'administrateur** a été délibérée par le bureau le
  13 juin 2026. Les statuts ne prévoient ni la fonction d'administrateur ni la
  cooptation : **cette qualité n'emporte aucun pouvoir de représentation**, et
  sa ratification éventuelle en assemblée générale reste à vérifier ;
- **aucun règlement intérieur** n'a été produit, alors que l'**article 13**
  permet au bureau d'en adopter un. Ce serait le véhicule naturel pour la
  durée de conservation des données et la politique d'acceptation des CGU.

### 4.3 Où sont les pièces

Les statuts, les procès-verbaux, le récépissé de préfecture et la publication
au Journal officiel sont conservés **hors de ce dépôt public** : ils nomment
des personnes physiques. Ce document en cite les articles, jamais les noms.

---

## 5. Ce que cette annexe ne fait pas

- elle **n'attribue aucun droit** à quiconque ;
- elle **ne présume aucun transfert** entre le fondateur, l'association et
  toute autre entité ;
- elle **ne préjuge pas** de la décision d'ouvrir l'instrument en open source,
  qui reste **indépendante** ;
- elle **ne vaut pas** recherche d'antériorité ni avis de titularité.

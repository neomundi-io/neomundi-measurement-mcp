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

## 4. Pouvoir d'engager l'association

**[À ÉTABLIR — les statuts n'ont pas pu être consultés.]**

À renseigner avant signature :

| Question | Réponse | Référence statutaire |
|---|---|---|
Qui représente légalement l'association ? | **[À COMPLÉTER]** | **[article …]** |
Une autorisation préalable d'un organe collégial est-elle requise ? | **[À COMPLÉTER]** | **[article …]** |
Quelle procédure en cas de conflit d'intérêts ? | **[À COMPLÉTER]** | **[article …]** |
Qui signe, le Concédant étant lui-même **[qualité à préciser]** ? | **[À COMPLÉTER]** | **[article …]** |

> **Aucun pouvoir de signature n'est présumé.** Une archive `ASSOCIATION.zip`
> a été fournie le 2026-11-01 ; **elle ne contenait qu'un dossier vide**, et
> aucune pièce statutaire n'a pu en être tirée.

---

## 5. Ce que cette annexe ne fait pas

- elle **n'attribue aucun droit** à quiconque ;
- elle **ne présume aucun transfert** entre le fondateur, l'association et
  toute autre entité ;
- elle **ne préjuge pas** de la décision d'ouvrir l'instrument en open source,
  qui reste **indépendante** ;
- elle **ne vaut pas** recherche d'antériorité ni avis de titularité.

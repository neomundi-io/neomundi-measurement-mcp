# Dossier juridique — connecteur MCP NeoMundi

**Version du dossier : 0.3 — 2026-11-01.**

> ## ⛔ Aucun de ces documents n'est publié, ni signé, ni opposable.
>
> Ce sont des **projets de travail**. Ils doivent être **relus par un conseil
> compétent** avant toute publication ou signature. Chaque fichier porte ce
> rappel en tête, et aucun ne doit en être détaché.

---

## Ce que contient ce dossier

| Fichier | Objet | État |
|---|---|---|
[`CGU_MCP_FR.md`](CGU_MCP_FR.md) · [`CGU_MCP_EN.md`](CGU_MCP_EN.md) | Conditions d'utilisation du service MCP | **V0.3** — projet |
[`POLITIQUE_CONFIDENTIALITE_MCP_FR.md`](POLITIQUE_CONFIDENTIALITE_MCP_FR.md) · [`PRIVACY_POLICY_MCP_EN.md`](PRIVACY_POLICY_MCP_EN.md) | Complément MCP à la politique existante de `neomundi.org` | **V0.1** — projet |
[`CONVENTION_PILOTE_FR.md`](CONVENTION_PILOTE_FR.md) | Convention de participation à un pilote | **V0.1** — projet |
[`LICENCE_EXPLOITATION_ASSOCIATIVE_FR.md`](LICENCE_EXPLOITATION_ASSOCIATIVE_FR.md) | Licence non exclusive fondateur → association | **V0.2** — projet |
[`ANNEXE_PERIMETRE_DROITS.md`](ANNEXE_PERIMETRE_DROITS.md) | Inventaire des éléments concédés et justification des droits | **V0.1** — **incomplète par construction** |
[`DECISIONS_OUVERTES.md`](DECISIONS_OUVERTES.md) | Les seules décisions encore ouvertes | — |
[`CHECKLIST_PUBLICATION.md`](CHECKLIST_PUBLICATION.md) | WordPress et candidature OpenAI | — |

## Sur quelles bases ils ont été écrits

Aucun fait n'est inventé. Chaque affirmation technique de ces documents vient
d'un audit mené sur le service réel et consigné dans ce dépôt :

- [audit du traitement des données](../MCP_DATA_PROCESSING_AUDIT.md) — ce que
  le connecteur reçoit, envoie, journalise ;
- [rapport aval](../MCP_DOWNSTREAM_DATA_REPORT.md) — ce que l'API conserve
  réellement, et les prestataires réels ;
- [accès et limites](../MCP_ACCESS_POLICY.md) — authentification, quotas ;
- [propriété intellectuelle](../MCP_IP_LICENSE_AUDIT.md) — licences, marque ;
- [matrice de conformité](../CGU_CONFORMITE_MATRICE.md) — écarts relevés.

## Décisions du fondateur appliquées ici

1. **Neomundi Recherche** est l'association **éditrice** du plugin MCP.
2. Service proposé à des **pilotes autorisés**, **à titre gratuit**, dans un
   cadre de **qualification scientifique**.
3. **L'API et l'instrument de mesure ne sont pas modifiés.**
4. **Toutes les capacités existantes sont conservées**, `suspect_phrases`
   comprise — ce qui a une conséquence rédactionnelle directe, assumée dans la
   politique de confidentialité.
5. Le fondateur accorde un **droit d'usage et d'exploitation non exclusif**,
   **sans transfert de propriété**.
6. **La décision d'ouvrir l'instrument en open source reste indépendante.**

## Sur la base de la CGU

La CGU V0.3 reprend la **structure** du projet V0.1 « ControlTower / Louis M
Sàrl » — elle ne repart pas de zéro — et y applique trois changements de fond :
l'**entité éditrice**, le **droit applicable**, et le **mode d'accès** (gratuit,
pilotes autorisés, sans compte ni contrat commercial). Les articles inexacts
relevés par la matrice sont corrigés ; l'article sur la nature des mesures,
jugé solide, est **conservé et renforcé** plutôt que réécrit.

## Convention de nommage et versions

Un document est versionné **dans son propre en-tête**, pas par son nom de
fichier : un lecteur qui ouvre un fichier doit voir sa version sans avoir à
consulter un index. Le dossier porte une version d'ensemble, en tête de ce
fichier.

## Ce qui n'entre jamais ici

Aucune information contractuelle confidentielle : pas de nom de pilote, pas de
montant, pas de clause négociée, pas de pièce signée. **Ce dépôt est public.**
Les conventions signées et leurs annexes nominatives vivent hors dépôt.

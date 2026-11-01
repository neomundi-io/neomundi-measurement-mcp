# Textes juridiques publiés — connecteur MCP NeoMundi

**Version 1.0 — en vigueur depuis le 1er novembre 2026.**

Ce dossier ne contient que ce qui est **effectivement publié**, plus ce qui
sert à le vérifier. Les projets de travail ne sont pas versés à ce dépôt
public.

---

## Les deux textes

| Fichier | Page publiée | Empreinte SHA-256 |
|---|---|---|
| [`CGU_MCP_FR.md`](CGU_MCP_FR.md) | `https://neomundi.org/cgu` | `01e5191f5b0f55785a8c43cd86f3286164a55387b95b3d7a83bf330b7a79034d` |
| [`CGU_MCP_EN.md`](CGU_MCP_EN.md) | `https://neomundi.org/en/terms-of-use` | `346de3fc524d0ac0c2efa17c12ab384b0e264ca0bbe7c5084cb079a294e4473d` |

**Le français prévaut.** La version anglaise est une traduction d'information
et non un instrument juridique distinct.

Ces fichiers sont la **source canonique**. Les pages publiées en sont la
conversion ; en cas de divergence constatée, c'est la page publiée qui est
rapprochée du fichier, jamais l'inverse.

---

## Le registre des versions

[`cgu-versions.json`](cgu-versions.json) épingle chaque version par son
**numéro** et par l'**empreinte SHA-256 de son texte**. Il est lisible par
machine parce qu'il sert au mécanisme d'acceptation : l'article 4 des CGU
exige qu'un participant accepte une **version identifiée par son empreinte**.

```
node scripts/cgu-fingerprint.mjs
# → « OK : 1 version(s). Version acceptable aujourd'hui : 1.0. »
```

L'outil **recalcule** les empreintes et refuse de valider si l'une a dérivé.
Cinq tests (`tests/cgu-versions.test.mjs`) échouent dans ce cas.

> **Les empreintes portent sur les octets versionnés** (`eol=lf` par
> `.gitattributes`), pas sur une copie de travail. Une copie en CRLF produit
> d'autres empreintes, qui ne correspondraient à aucun clone.

### Une version ne se corrige pas

Si un texte change, il faut **créer une nouvelle version** au registre, pas
rectifier l'empreinte de l'ancienne. L'empreinte de la 1.0 est la preuve de ce
que les participants ont accepté : la modifier détruirait cette preuve. Un test
le vérifie.

---

## Ce qui n'est pas ici

Les **projets de travail** — politique de confidentialité MCP, convention
pilote, licence associative, annexe de périmètre des droits, PV de bureau,
mécanisme et formulaires d'acceptation — sont conservés **hors de ce dépôt
public**, en statut PROJET, avec un **registre de consolidation** dont
l'échéance est le **11 novembre 2026**.

Aucun de ces documents n'est publié, signé ni opposable. Les publier ici
laisserait croire le contraire.

---

## Sur quelles bases les CGU ont été écrites

Aucun fait n'y est inventé. Chaque affirmation technique vient d'un audit mené
sur le service réel et consigné dans ce dépôt :

- [audit du traitement des données](../MCP_DATA_PROCESSING_AUDIT.md) — ce que
  le connecteur reçoit, envoie, journalise ;
- [rapport aval](../MCP_DOWNSTREAM_DATA_REPORT.md) — ce que l'API conserve
  réellement, et les prestataires réels ;
- [accès et limites](../MCP_ACCESS_POLICY.md) — authentification, quotas ;
- [propriété intellectuelle](../MCP_IP_LICENSE_AUDIT.md) — licences, marque ;
- [matrice de conformité](../CGU_CONFORMITE_MATRICE.md) — écarts relevés.

C'est ce qui explique les formulations les plus inhabituelles du texte : la
limitation de l'article 6 — **l'accès n'est pas individualisé, donc la
suspension est collective** — et l'article 10.2 — **des extraits de réponse
peuvent être conservés, le prompt non**. Ces deux énoncés sont des constats de
mesure, pas des choix rédactionnels.

---

## Ce qui n'entre jamais ici

Aucune information contractuelle confidentielle : pas de nom de pilote, pas de
montant, pas de clause négociée, pas de pièce signée. **Ce dépôt est public.**

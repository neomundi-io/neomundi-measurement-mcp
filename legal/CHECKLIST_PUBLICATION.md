# Checklist — publication WordPress et candidature OpenAI

**Au 2026-11-01.** À exécuter **après** validation juridique.
**Rien de ce qui suit n'a été fait**, et **aucune page WordPress n'a été
modifiée** : la mission l'interdit expressément.

---

## 1. WordPress — `neomundi.org`

### 1.1 Pages à créer

| URL proposée | Contenu | Source | État |
|---|---|---|---|
`/cgu-mcp` *(ou `/conditions-utilisation-mcp`)* | CGU du service de mesure | [`CGU_MCP_FR.md`](CGU_MCP_FR.md) | **à créer** |
`/en/mcp-terms` | version anglaise | [`CGU_MCP_EN.md`](CGU_MCP_EN.md) | **à créer** |
`/en/privacy-policy` | version anglaise de la politique | [`PRIVACY_POLICY_MCP_EN.md`](PRIVACY_POLICY_MCP_EN.md) | **à créer** — **[à vérifier]** si une page anglaise existe déjà |

### 1.2 Pages à actualiser

| URL existante | Modification | État |
|---|---|---|
`/politique-de-confidentialite` | **Ajouter la section « service de mesure MCP »** — sept traitements, transfert en Suisse, droits | **à actualiser** — ⛔ bloquant pour la candidature |
`/mentions-legales` | **Ajouter une ligne** nommant le service expérimental `mcp.neomundi.org` et son hébergeur | **à actualiser** |
`/contact` | Vérifier que le formulaire couvre les demandes RGPD **et** les questions contractuelles | **à vérifier** |

> **Les trois URL existantes répondent `200`** — vérifié. Les URL proposées
> en 1.1 sont des **propositions** : à ajuster à l'arborescence réelle et aux
> règles de permaliens du site.

### 1.3 Avant toute mise en ligne

- [ ] **Sauvegarde du site** avant modification — la méthode du chantier
      éditorial prévoit une sauvegarde préalable ;
- [ ] relecture juridique **terminée** ;
- [ ] **A-1 à A-5** des [décisions ouvertes](DECISIONS_OUVERTES.md) levées —
      sinon la politique décrit un traitement sans durée ni base ;
- [ ] liens croisés : CGU ↔ politique ↔ mentions légales ;
- [ ] dates d'entrée en vigueur renseignées ;
- [ ] FR et EN cohérentes, avec mention que **le français prévaut**.

---

## 2. Candidature OpenAI

> Les exigences ci-dessous ont été relevées sur la documentation de la
> plateforme le **2026-11-01**. **Elles changent sans préavis : les
> revérifier au moment de la soumission.**

### 2.1 Ce qui est prêt — vérifié

| Exigence | État |
|---|---|
Serveur MCP sur un **domaine public**, HTTPS | **oui** — `mcp.neomundi.org`, certificat valide |
**Streamable HTTP** sur `/mcp` | **oui** |
`structuredContent` **et** `content` | **oui** |
`outputSchema` | **oui** |
Titre lisible de l'outil | **oui** |
**Annotations de sûreté exactes** | **oui** — `readOnlyHint: false` est correct : un appel débite un quota |
Interface personnalisée (MCP Apps) | **oui** — ressource `ui://`, CSP déclarée vide |
Pas de secret ni de PII en retour d'outil | **oui** |
Nom en kebab-case, limites de longueur | **oui**, tenu par un test |
Icône carrée ≥ 48 px | **oui** — 512/256/128/48 |
**Site** et **support** | **oui** — `neomundi.org`, `/contact` |
**Politique de confidentialité** | **URL oui**, **contenu non** — §1.2 |

### 2.2 Ce qui manque

| # | Manque | Qui |
|---|---|---|
**⛔ O-1** | **La politique de confidentialité ne couvre pas le traitement MCP** — retourner des catégories de données non déclarées est un **motif de rejet explicite** | §1.2 |
**⛔ O-2** | **`termsOfServiceURL` absent du manifeste** — à renseigner **une fois la page `/cgu-mcp` en ligne**. Un test échoue aujourd'hui si on l'invente, et c'est voulu | après §1.1 |
**⛔ O-3** | **Vérification d'identité de l'organisation** sur le tableau de bord de la plateforme, **sous le nom de publication** — ici l'association | **Sébastien** |
**⛔ O-4** | **Défi de vérification de domaine** pour `mcp.neomundi.org` | une session |
**⚠ O-5** | **Bloc `auth`** dans `mcp.json` (`extensions["com.openai"].auth`) — forme **non vérifiée** contre le schéma officiel, donc **non inventée** | une session |
**⚠ O-6** | **Imbrication de `extensions.com.openai`** — `interface` ou champs à plat : les deux ne peuvent être vraies | une session |
**⚠ O-7** | **5 cas positifs + 3 cas négatifs**, **vidéo**, **URL de démonstration**, **notes de version** | une session |
**⚠ O-8** | **Capture d'écran** de la carte de mesure — à produire depuis une charge **synthétique**, jamais depuis un enregistrement réel | une session |
**⚠ O-9** | **Compte de test sans MFA** utilisable immédiatement par un relecteur — suppose de décider du mode d'accès (`B-4`) | **Sébastien** |

### 2.3 Les trois cas négatifs sont déjà écrits, en substance

C'est là que ce connecteur est plus défendable que la moyenne, et les trois
sortent directement de la suite de tests :

1. un `ALLOW` décidé **sans aucun contrôle** — la carte le déclare en toutes
   lettres et ne le rend pas comme un `ALLOW` mesuré ;
2. une **version divergente** — le résultat est déclaré **non comparable** ;
3. une **erreur amont** — classée comme transport, **aucune mesure
   fabriquée**, aucune relance.

---

## 3. Ordre d'exécution

1. **Lever A-1 à A-5** — sinon la politique n'est pas publiable comme
   conforme ;
2. **publier** `/politique-de-confidentialite` actualisée, `/cgu-mcp`,
   `/mentions-legales` actualisées ;
3. **renseigner `termsOfServiceURL`** dans le manifeste (`O-2`) ;
4. **vérification d'identité** (`O-3`) et **vérification de domaine** (`O-4`) ;
5. **trancher `O-5` et `O-6`** sur le schéma officiel ;
6. **produire `O-7` et `O-8`** ;
7. **soumettre.**

> **Aucune admission n'est acquise**, et la soumission ne doit intervenir
> qu'après validation humaine explicite.

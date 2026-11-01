# Reprise — connecteur MCP NeoMundi

**Dernière clôture : 1er novembre 2026.**

Ce fichier contient un **prompt de reprise autonome**. Une nouvelle session doit
pouvoir continuer sans reconstituer l'historique.

---

## Prompt de reprise — à copier tel quel

```
MISSION — Reprise du chantier NeoMundi MCP Plugin

Depot : le clone local de neomundi-io/neomundi-measurement-mcp

## Avant toute action, lire dans cet ordre

1. START_HERE.md — section de tete uniquement. Elle prime sur tout le reste
   du fichier, qui est un journal antichronologique.
2. PLUGIN_CHECKPOINT_2026-11-01.md — etat fige de chaque composant, avec son
   statut VALIDE / PARTIEL / NON TESTE / BLOQUE et sa preuve.
3. Les conclusions de l'audit Codex, SI elles existent. Si elles n'existent
   pas encore, le dire et ne rien integrer.
4. PLUGIN_NEXT_ROADMAP.md — P0 / P1 / P2, avec dependances et criteres.

Ne pas relancer les audits deja faits. Ne pas re-deriver des faits deja
etablis dans ces quatre documents.

## Etat au moment de la cloture

- origin/main = da71f5d327da83247c5f4a69dfc1b6ea6e80f048, et c'est EXACTEMENT
  la revision servie en production sur https://mcp.neomundi.org/mcp en
  0.3.0-rc.1.
- Tout le corpus documentaire et juridique du 1er novembre est ABSENT de main.
  Il attend dans trois PR empilees, en brouillon, a fusionner dans cet ordre
  et seulement dans cet ordre :
      #12  docs/cloture-juridique-20261101   -> audit/cgu-prepublication-20261101
      #11  audit/cgu-prepublication-20261101 -> docs/mise-en-service-20261101
      #10  docs/mise-en-service-20261101     -> main
  Plus la branche de cloture chore/cloture-session-20261101 -> cloture-juridique.
- La CI ne se declenche que sur les PR dont la base est main. Les PR empilees
  n'ont AUCUNE execution, par construction, pas par defaut. La seule porte
  verte est #10 -> main, et elle mesurera le contenu accumule.
- Suite locale : 304 cas, 304 reussis, 21 fichiers. npm test.
- CGU v1.0 et politique de confidentialite publiees, FR et EN, avec empreintes.
- ChatGPT n'a JAMAIS ete connecte. Un seul hote MCP a ete verifie : Claude
  Code, avec un amont SUBSTITUE. Ne jamais presenter cela comme une connexion
  ChatGPT validee.

## Premiere action attendue

Lire les conclusions de l'audit Codex.

- SI elles existent : les confronter aux huit contrats a preserver du §14 du
  point de cloture, AVANT de toucher une ligne de runtime/. Les quatre
  questions du §14 doivent avoir une reponse ecrite d'abord.
- SI elles n'existent pas : demarrer P0-1 — declarer le bloc auth dans
  mcp.json, valide contre le schema officiel telecharge, avec un test qui
  tombe si le bloc disparait. L'audit ne bloque AUCUNE tache P0.

## Regles permanentes, non negociables

- Aucune modification de l'API ni du moteur de mesure.
- Aucun deploiement sans autorisation explicite de Sebastien, sur un SHA
  nomme. Une PR, une CI verte ou une fusion n'autorise pas la production.
- Aucune fusion de PR sans validation.
- Aucun document interne ajoute au depot public.
- Jamais de mesure fabriquee : une absence de mesure n'est jamais un resultat
  favorable, les null et les etats survivent, la provenance n'est pas
  reecrite. Les huit contrats du §14 sont tenus par des tests.
- Ne pas supprimer les trois branches de la pile : elles portent trois PR non
  fusionnees.
- AGENTS.md a la racine est un fichier local non suivi, etranger au chantier.
  Le laisser hors des commits.

## Verifications d'amorcage, a executer avant de conclure quoi que ce soit

    git status --short
    git rev-parse --abbrev-ref HEAD
    git --no-pager log --oneline -3
    npm test
    node check-publication.mjs
    node scripts/cgu-fingerprint.mjs

Si une empreinte CGU a derive, NE PAS la corriger : creer une nouvelle
version au registre. L'empreinte de la 1.0 est la preuve de ce qui a ete
accepte.
```

---

## Ce qu'il ne faut pas refaire

Ces investigations sont **terminées**. Les relancer coûte du temps et ne
produira rien de nouveau.

| Déjà fait | Où est le résultat |
|---|---|
| Audit du traitement des données du connecteur | `MCP_DATA_PROCESSING_AUDIT.md` |
| Conservation réelle en aval, et prestataires réels | `MCP_DOWNSTREAM_DATA_REPORT.md` |
| Accès, authentification, quotas | `MCP_ACCESS_POLICY.md` |
| Propriété intellectuelle et licences | `MCP_IP_LICENSE_AUDIT.md` |
| Conformité des CGU, article par article | `CGU_CONFORMITE_MATRICE.md` |
| État de publication juridique | `LEGAL_STATUS_V1.md` |
| Écart entre le dépôt et les exigences du plugin | `PLUGIN_GAP_ANALYSIS.md` |
| Limites connues, backend et connecteur | `KNOWN_LIMITATIONS.md` |
| Procédure de candidature, prêt et bloquant | `docs/PUBLICATION.md` §4 |
| Déploiement HTTPS, empreintes, retour arrière | `docs/DEPLOIEMENT_HTTPS.md` §0 |

---

## Pièges de ce poste de travail

Ils ont chacun coûté au moins un aller-retour.

| Piège | Ce qu'il faut faire |
|---|---|
| **`gh` n'est pas installé** | extraire le jeton par `git credential fill`, puis appeler l'API REST GitHub |
| **Un heredoc Bash transforme `\n` en vraie nouvelle ligne** | passer par l'outil d'écriture, ou `chr(10)` dans le script Python |
| **Python ne lit pas les chemins MSYS `/c/...`** | utiliser la forme Windows `C:\...` dans les scripts Python |
| **Les captures d'écran du navigateur expirent** | `Page.captureScreenshot` a échoué trois fois le 2026-11-01 ; mesurer plutôt le débordement par script |
| **Quota WPVibe : 100 appels par 24 h glissantes** | lire par `curl` sur les pages publiques, n'utiliser WPVibe que pour écrire |
| **Une page WordPress ne se réécrit pas en entier** | `POST /wpvibe/v1/content/edit` remplace un fragment côté serveur, ce qui garantit que le reste ne bouge pas |

---

## Les quatre documents de reprise

| Document | Rôle |
|---|---|
| [`START_HERE.md`](START_HERE.md) | **point d'entrée.** Sa section de tête prime sur tout |
| [`PLUGIN_CHECKPOINT_2026-11-01.md`](PLUGIN_CHECKPOINT_2026-11-01.md) | état figé des composants, et la section `AUDIT_PRADEEP_PENDING` |
| [`PLUGIN_NEXT_ROADMAP.md`](PLUGIN_NEXT_ROADMAP.md) | ce qui reste, priorisé, avec critères de validation |
| **ce fichier** | prompt de reprise, pièges du poste, et ce qu'il ne faut pas refaire |

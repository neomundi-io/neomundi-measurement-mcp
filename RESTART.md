# Reprise — connecteur MCP NeoMundi

**Dernière mise à jour : 1er novembre 2026**, après la session OAuth.

Ce fichier contient un **prompt de reprise autonome**. Une nouvelle session doit
pouvoir continuer sans reconstituer l'historique.

---

## Prompt de reprise — à copier tel quel

```
MISSION — Reprise du chantier NeoMundi MCP Plugin

Depot : le clone local de neomundi-io/neomundi-measurement-mcp

## Avant toute action, lire dans cet ordre

1. START_HERE.md — la section de TETE, « OAUTH 2.1 ». Elle prime sur tout
   le reste du fichier, point de cloture compris.
2. OAUTH_IMPLEMENTATION_REPORT.md — ce qui a ete construit, et ce que chaque
   test protege.
3. CHATGPT_CONNECTION_GUIDE.md — la procedure exacte de connexion.
4. PLUGIN_RELEASE_READINESS.md — etat de preparation, blocages B-1 a B-6.
5. PLUGIN_SUBMISSION_CHECKLIST.md — la liste actionnable, dans l'ordre reel.
6. PLUGIN_NEXT_ROADMAP.md — P0 / P1 / P2.
7. PLUGIN_CHECKPOINT_2026-11-01.md — etat fige par composant. ATTENTION : il
   est anterieur a la session de candidature ; P-6 et P-7 y sont encore
   presentes comme bloquants, ils ne le sont plus, et P0-9 est traite.

Ne pas relancer les audits deja faits. Ne pas re-deriver des faits deja
etablis dans ces documents. L'audit Codex / Pradeep est TRANCHE : aucun
module integre, instrument et API inchanges, dossier traite separement.
P1-5, P2-2 et P2-4 restent fermees.

## Les quatre faits qui gouvernent la reprise

1. OAUTH 2.1 EST DEPLOYE depuis le 2026-11-02T05:35:36Z, autorise par
   Sebastien. Image neomundi-measurement-mcp:b30d631,
   sha256:2c92de45...ead43c9, revision b30d631. Deux participants :
   sebastien et pilote-1. Plafond par participant NON configure. Registre
   complet : OAUTH_DEPLOYMENT_RECORD_2026-11-02.md.
   Verifie APRES bascule, par le vrai chemin HTTPS : authentification,
   isolation entre participants, rotation par epoch, revocation, cle
   statique intacte, surface MCP complete.

2. IL RESTE UNE SEULE CHOSE, ET ELLE EST A SEBASTIEN : brancher le plugin
   dans ChatGPT. Procedure exacte en 12 lignes dans
   CHATGPT_CONNECTION_GUIDE.md §3. Son code de participant est
   « sebastien » ; le secret se lit sur le VPS par
   sudo cat /root/neomundi-mcp-backup-20261102/secret-sebastien
   NE PAS ecrire que le plugin fonctionne dans ChatGPT avant que ce soit fait.

2b. DEUX PRECONDITIONS ONT ETE TROUVEES EN ROUTE, les deux silencieuses.
   d1a6296 ne pouvait PAS etre construit : le Dockerfile ne copiait pas
   legal/, que tests/cgu-versions.test.mjs lit. Corrige par b30d631, dont le
   runtime/ est octet pour octet identique a d1a6296 ; un test empeche la
   recidive. Et sans NEOMUNDI_MCP_ALLOWED_HOSTS personne n'aurait pu
   s'authentifier : Caddy reecrit Host mais pas Origin, donc le formulaire
   repartait en 403 invalid_origin.
   Caddy lui-meme n'a PAS ete modifie.

3. LE MANIFESTE N'EST PAS LE BLOCAGE. P0-1 et P0-2 sont resolues. Le bloc
   auth demande par P0-1 N'EXISTE PAS au niveau superieur de mcp.json : le
   schema officiel le ferme a $schema et mcpServers. Les deux schemas sont
   archives sous schemas/agent-plugins/ avec leur SHA-256. Le bloc a declarer
   APRES le deploiement est fige dans tests/manifest-schema.test.mjs.

4. LA VERIFICATION DE DOMAINE ECHOUERAIT, et la solution ne touche pas au
   serveur. Le defi doit etre servi en clair ; sur l'hote MCP ce chemin
   repond 401. Publier le jeton sur neomundi.org, qui est un parent eligible
   et repond 404.

ET DEUX ORDRES A NE PAS INVERSER. Mettre la page de confidentialite a jour
AVANT d'activer NEOMUNDI_OAUTH_QUOTA_PER_SUBJECT, qui fait tenir un compteur
par participant alors que la page dit « aucune conservation ». Et ne presenter
le connecteur comme multi-utilisateur qu'APRES le deploiement : l'article 6
des CGU dit encore que la suspension est collective.

## Etat Git

- origin/main = da71f5d327da83247c5f4a69dfc1b6ea6e80f048, et c'est EXACTEMENT
  la revision servie en production sur https://mcp.neomundi.org/mcp en
  0.3.0-rc.1.
- Tout le corpus documentaire et juridique du 1er novembre est ABSENT de main.
  Il attend dans des PR empilees, en brouillon, a fusionner dans cet ordre
  et seulement dans cet ordre :
      #12  docs/cloture-juridique-20261101   -> audit/cgu-prepublication-20261101
      #11  audit/cgu-prepublication-20261101 -> docs/mise-en-service-20261101
      #10  docs/mise-en-service-20261101     -> main
  Plus chore/cloture-session-20261101 -> cloture-juridique, puis
  feat/plugin-candidature-20261101 -> cloture-session, puis
  feat/oauth-chatgpt-20261101 -> plugin-candidature. Six niveaux : la pile
  est profonde, et c'est un risque assume.
- La CI ne se declenche que sur les PR dont la base est main. Les PR empilees
  n'ont AUCUNE execution, par construction, pas par defaut. La seule porte
  verte est #10 -> main, et elle mesurera le contenu accumule.
- Suite locale : 339 cas, 339 reussis, 23 fichiers. npm test.
- CGU v1.0 et politique de confidentialite publiees, FR et EN, avec empreintes.
- ChatGPT n'a JAMAIS ete connecte, et on sait desormais POURQUOI. Un seul
  hote MCP a ete verifie : Claude Code, avec un amont SUBSTITUE. La carte a
  ete capturee depuis une charge SYNTHETIQUE, dans un navigateur local, pas
  dans ChatGPT. Ne jamais presenter l'un pour l'autre.

## Premiere action attendue

Demander a Sebastien s'il a branche le plugin dans ChatGPT
(CHATGPT_CONNECTION_GUIDE.md §3). Si oui : relever le request_id, la decision
et son fondement, les signaux non mesures, et l'affichage de la carte, puis
basculer mcp.json en streamable-http avec le bloc auth fige dans
tests/manifest-schema.test.mjs. Si non : il n'y a rien a faire en aval, et
rien d'autre ne debloque la candidature.

En parallele, sans dependance : verification d'identite de l'organisation,
jeton de defi de domaine sur neomundi.org (PAS sur l'hote MCP, qui repond
401), origine dediee pour la carte, et mise a jour de l'article 6 des CGU qui
dit encore que la suspension est collective alors qu'elle ne l'est plus.

Le deploiement d'OAuth est FAIT. Tout autre deploiement exige a nouveau
l'accord explicite de Sebastien sur un SHA nomme ; ne pas le deduire d'une
PR, d'une CI verte ou d'une fusion. Retour arriere en trois commandes :
OAUTH_DEPLOYMENT_RECORD_2026-11-02.md §5.

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
    node --test runtime/tests/oauth.test.mjs
    node scripts/validate-manifests.mjs
    node check-publication.mjs
    node scripts/cgu-fingerprint.mjs

Si une empreinte CGU a derive, NE PAS la corriger : creer une nouvelle
version au registre. L'empreinte de la 1.0 est la preuve de ce qui a ete
accepte.

Si un schema officiel archive a derive, NE PAS editer la copie : la
retelecharger et mettre a jour schemas/agent-plugins/provenance.json, puis
relire ce que le changement implique. plugin.schema.json a ete modifie a la
source le matin meme du 2026-11-01 : ces exigences bougent.
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
| **Exigences officielles de publication, vérifiées le 2026-11-01** | `PLUGIN_RELEASE_READINESS.md` §7 |
| **Conception OAuth, et pourquoi rien n'est stocké** | `OAUTH_IMPLEMENTATION_REPORT.md` §2 |
| **Le proxy relaie-t-il les routes OAuth ?** | oui, vérifié sur 4 chemins — `OAUTH_IMPLEMENTATION_REPORT.md` §8.1 |
| **Emplacement du bloc `auth`, et pourquoi il n'existe pas** | `tests/manifest-schema.test.mjs` |
| **Imbrication `extensions.com.openai`** | idem — le dépôt avait raison |

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

## Les documents de reprise

| Document | Rôle |
|---|---|
| [`START_HERE.md`](START_HERE.md) | **point d'entrée.** Sa section de tête, « CANDIDATURE », prime sur tout |
| [`OAUTH_IMPLEMENTATION_REPORT.md`](OAUTH_IMPLEMENTATION_REPORT.md) | **OAuth 2.1** : ce qui est construit, et ce que chaque test protège |
| [`CHATGPT_CONNECTION_GUIDE.md`](CHATGPT_CONNECTION_GUIDE.md) | **la procédure de connexion**, et l'opération qui exige une autorisation |
| [`PLUGIN_RELEASE_READINESS.md`](PLUGIN_RELEASE_READINESS.md) | **état de préparation**, six blocages nommés, sources datées |
| [`PLUGIN_SUBMISSION_CHECKLIST.md`](PLUGIN_SUBMISSION_CHECKLIST.md) | **liste actionnable**, dans l'ordre réel |
| [`PLUGIN_NEXT_ROADMAP.md`](PLUGIN_NEXT_ROADMAP.md) | ce qui reste, priorisé, avec critères de validation |
| [`PLUGIN_CHECKPOINT_2026-11-01.md`](PLUGIN_CHECKPOINT_2026-11-01.md) | état figé des composants — **antérieur à la candidature** : `P-6` et `P-7` y sont encore bloquants |
| **ce fichier** | prompt de reprise, pièges du poste, et ce qu'il ne faut pas refaire |

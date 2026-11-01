# Traitement en aval — faits vérifiés, inconnues, et preuves

**Relevé du 2026-11-01**, établi **par requête directe** sur la base et les
journaux de production (`prod-cpu`), et par lecture du code déployé.

**Entité éditrice : Neomundi Recherche, association loi 1901** — décision
confirmée. Ce rapport l'applique partout.

> ⚠ Rapport **technique**. Il ne vaut ni avis juridique, ni analyse d'impact.
> Les formulations proposées sont des **propositions soumises à arbitrage**.

---

## 0. Le fait qui change une phrase des CGU

L'audit précédent concluait, sur la foi d'un relevé antérieur, que **ni le
prompt ni la réponse** n'étaient conservés. **La moitié de cette affirmation
est fausse**, et il valait mieux le découvrir ici que dans une réclamation.

| | Réalité vérifiée |
|---|---|
**Le prompt** | **jamais conservé.** Seule sa **longueur** l'est |
**La réponse** | **des extraits verbatim sont conservés**, sous `quality.suspect_phrases`, quand le score de factualité dépasse le seuil |

Le code déployé l'instruit explicitement
(`/opt/controltower/app/core/hallucination_detector.py:203`) :

> « populate suspect_phrases with **VERBATIM substrings copied EXACTLY from
> RESPONSE** … (no paraphrase — must be findable in RESPONSE). Max 5 phrases. »

Déclenché si `factual_hallucination_score > 0.3` ; sinon la liste est vide.

**Mesuré sur la base de production :**

| | |
|---|---|
Lignes totales dans `governance_logs` | **338 578** |
Lignes avec `suspect_phrases` **non vide** | **21 870** — soit **6,5 %** |
Longueur moyenne quand non vide | **498 caractères** (maximum **1 591**) |
Période | **chaque mois de 2026-05 à 2026-10** — pas un reliquat ancien |

> **Écrire « aucun contenu client n'est conservé » serait faux.** La phrase
> exacte est : *le prompt n'est jamais conservé ; des extraits de la réponse le
> sont lorsque le score de factualité dépasse le seuil.*

---

## 1. Faits vérifiés — conservation en aval

| # | Fait | Preuve |
|---|---|---|
**F-1** | `governance_logs` : **338 578 lignes**, de **2026-05-01** à **2026-11-01**, **600 Mo** | `select count(*), min(created_at), max(created_at)` |
**F-2** | **Aucune colonne de texte libre** : recherche sur `%prompt%`, `%response%`, `%text%`, `%content%`, `%message%`, `%body%` dans `information_schema.columns`, **toutes tables** → **zéro résultat** | `information_schema` |
**F-3** | **Le prompt n'est pas stocké.** Seule clé contenant « prompt » dans le JSON : **`prompt_length`** | agrégat sur 500 lignes récentes |
**F-4** | `_audit_context` ne porte que **4 clés** : `llm_prompt_length`, `llm_response_length`, `moderation_flagged`, `server_computed_risk` | `jsonb_object_keys` |
**F-5** | **`quality.suspect_phrases` conserve des extraits verbatim de la réponse** — **21 870 lignes**, 498 car. en moyenne | requête + code déployé |
**F-6** | **Aucune purge n'est configurée** : aucun cron, aucune minuterie, aucun script de purge dans `/opt/controltower` | `crontab -l`, `systemctl list-timers`, `grep -rliE "delete from governance_logs\|purge\|retention"` |
**F-7** | **Sauvegardes : 14 jours.** `pg_dump` nocturne à 02:30, puis `find … -mtime +14 -delete`. **20 dumps, 1,9 Go** sur disque | crontab root, `ls` |
**F-8** | **Aucune copie des sauvegardes hors machine** — ni `rsync`, ni `scp`, ni `s3`, ni `rclone` dans la crontab | crontab root |
**F-9** | **Les journaux applicatifs enregistrent l'IP cliente** : `REQ GET /v1/health [client=<IP>]`, et nginx journalise IP + User-Agent + Referer | journaux conteneur et `access.log` |
**F-10** | **Aucun journal ne contient de prompt ni de réponse** : `llm_prompt` / `llm_response` → **0 occurrence** sur 5 000 lignes | `docker logs \| grep -c` |
**F-11** | Journaux conteneurs : pilote `json-file`, **aucune rotation configurée** ; `journald` **1,6 Go**, **sans limite d'âge** | `docker inspect`, `journalctl --disk-usage` |
**F-12** | nginx : rotation **quotidienne, 14 fichiers conservés** | `/etc/logrotate.d/nginx` |

### Durées réellement configurées

| Donnée | Durée |
|---|---|
Mesures en base (`governance_logs`), **extraits de réponse compris** | **indéfinie** — aucune purge, 6 mois d'historique |
Sauvegardes de la base | **14 jours** |
Journaux nginx (IP, User-Agent) | **14 jours** |
Journaux conteneurs (IP) | **indéfinie** — aucune rotation |
`journald` | **indéfinie** — plafond de taille seulement |
Côté **connecteur MCP** | **aucune conservation** — vérifié à l'audit précédent |

---

## 2. Faits vérifiés — prestataires et hébergement

**Un seul prestataire externe intervient dans une mesure : Infomaniak.**

Source : le champ `evaluator_runtime` d'une mesure réelle — pas les variables
d'environnement, qui décrivent une configuration, pas un appel.

| Signal | Évaluateur | Exécution |
|---|---|---|
`stability_score` | `runtime_engine.process` | **local**, aucun modèle |
`coherence_score` | `embedding_detector.compute_coherence` | **`ollama` local** (`nomic-embed-text`) |
`semantic_risk` | `semantic_risk.moderate` | **`ollama` local** (`llama-guard3:1b`) |
`factual_hallucination_score` · `semantic_instability_score` | `hallucination_detector.detect_hallucination` | **`api.infomaniak.com`** (`mistral24b`) |

**Trois signaux sur cinq ne quittent jamais le serveur** : Ollama tourne dans
un conteneur sur la machine elle-même.

### Deux faux positifs écartés — et c'est important

1. **« openai » dans les journaux n'est pas OpenAI.** L'URL réelle est
   `https://api.infomaniak.com/2/ai/108205/openai/v1/…` : c'est le **dialecte
   compatible OpenAI d'Infomaniak**. **OpenAI ne doit pas figurer comme
   sous-traitant.**
2. **« cohere » trouvé en base est la sous-chaîne de `co·here·nce_score`.**
   `COHERE_API_KEY` est renseignée et `FEATURE_COHERE_ENABLED=true`, mais
   **aucun évaluateur Cohere n'apparaît** dans les mesures observées.
   **Configuré n'est pas appelé.**

### Hébergement — tout est en Suisse

| Hôte | Bloc RDAP | Pays |
|---|---|---|
`prod-cpu` (API, base, Ollama) · 179.237.73.233 | `CH-INFOMANIAK-20250220` | **CH** |
`mcp.neomundi.org` · 179.237.102.252 | `INFOMANIAK-CLOUD` | **CH** |

**Pour une association française, le traitement a donc lieu hors Union
européenne.** La Suisse bénéficie d'une décision d'adéquation, mais **le fait
doit être énoncé**, pas supposé connu.

### Présents mais hors du chemin de mesure

`STRIPE_SECRET_KEY` (avec **`PAYMENTS_ENABLED=false`**), `RESEND_API_KEY`
(courriel de cycle de vie des comptes), `SLACK_ADMIN_WEBHOOK_URL` (alertes
internes). **À ne pas mélanger** avec les sous-traitants de la mesure.

---

## 3. Inconnues restantes

| # | Inconnue | Pourquoi elle reste ouverte |
|---|---|---|
**I-1** | **Existe-t-il un DPA signé avec Infomaniak ?** | Hors dépôt et hors serveur. Le dossier de cadrage en mentionne un « rapporté », jamais lu intégralement |
**I-2** | **Infomaniak conserve-t-il les contenus envoyés à son service d'IA ?** | Relève des conditions d'Infomaniak, **non vérifiable d'ici**. C'est l'inconnue la plus lourde : c'est le seul point où du contenu client sort de nos machines |
**I-3** | **Durée de conservation souhaitée** pour `governance_logs` | Aucune n'est configurée ; en fixer une est une **décision**, pas un constat |
**I-4** | **Le champ `suspect_phrases` est-il nécessaire** à la mesure, ou seulement utile au diagnostic ? | Question produit : sa suppression ou sa troncature supprimerait la seule persistance de contenu client |
**I-5** | **Qui est responsable de traitement, qui est sous-traitant** entre l'association et l'exploitant de l'API | Qualification **juridique**, pas technique |
**I-6** | **Base légale** du traitement des contenus soumis | Juridique |
**I-7** | **Les sauvegardes contiennent les extraits** ; une suppression en base ne les atteint pas pendant 14 jours | Constaté ; la conséquence procédurale reste à écrire |

---

## 4. Formulations proposées — FR et EN

**Aucun texte juridique n'est publié ici.** Ce sont des **propositions**, à
valider par un juriste. Chacune est adossée à un fait vérifié ci-dessus.

### 4.1 Politique de confidentialité — section « Service de mesure (MCP) »

> **FR —** « Lorsque vous utilisez le service de mesure NeoMundi, les éléments
> que vous soumettez — l'invite, la réponse produite par le système observé,
> les extraits de contexte et les documents fournis — sont transmis à notre
> infrastructure de mesure afin d'y être mesurés. **Cette transmission est
> inhérente à la mesure** : il n'est pas possible de mesurer la cohérence d'une
> réponse sans la lire.
>
> **L'invite n'est jamais conservée** : seule sa longueur l'est. **Des extraits
> de la réponse peuvent être conservés** lorsque l'analyse de factualité
> dépasse un seuil : jusqu'à cinq extraits courts, copiés tels quels, sont
> alors enregistrés avec le résultat de la mesure.
>
> Les mesures sont conservées **sans durée limite à ce jour**. Les sauvegardes
> sont conservées **14 jours**. Les journaux techniques enregistrent l'adresse
> IP appelante et sont conservés **14 jours** pour le serveur web.
>
> Le traitement a lieu **en Suisse**, chez **Infomaniak**, qui héberge nos
> serveurs et fournit l'un des modèles d'analyse. Les autres analyses
> s'exécutent **sur nos propres serveurs**, sans transmission à un tiers. »

> **EN —** “When you use the NeoMundi measurement service, what you submit —
> the prompt, the response produced by the observed system, context excerpts
> and any documents — is transmitted to our measurement infrastructure to be
> measured. **This transmission is inherent to measuring**: a response cannot
> be measured for coherence without being read.
>
> **The prompt is never retained**; only its length is. **Excerpts of the
> response may be retained** when factuality analysis exceeds a threshold: up
> to five short excerpts, copied verbatim, are then stored alongside the
> measurement.
>
> Measurements are currently retained **with no time limit**. Backups are kept
> for **14 days**. Technical logs record the calling IP address and are kept
> for **14 days** for the web server.
>
> Processing takes place **in Switzerland**, with **Infomaniak**, which hosts
> our servers and provides one of the analysis models. The other analyses run
> **on our own servers**, with no transmission to a third party.”

### 4.2 Sous-traitants — annexe

> **FR —** « **Infomaniak Network SA** (Suisse) — hébergement des serveurs et
> fourniture d'un modèle d'analyse de factualité. Les autres analyses
> (cohérence, risque sémantique, stabilité) s'exécutent sur nos serveurs, sans
> recours à un tiers. »

> **EN —** “**Infomaniak Network SA** (Switzerland) — server hosting and one
> factuality-analysis model. The other analyses (coherence, semantic risk,
> stability) run on our own servers, with no third party involved.”

### 4.3 CGU — complément à l'article 10

> **FR —** « L'invite, la réponse et les documents soumis sont transmis à
> l'infrastructure de mesure pour y être mesurés. L'invite n'est pas conservée.
> Des extraits de la réponse peuvent l'être, dans les conditions décrites par
> la Politique de confidentialité. Le Service ne doit pas être utilisé pour
> soumettre des données sensibles. »

> **EN —** “The prompt, the response and any submitted documents are
> transmitted to the measurement infrastructure in order to be measured. The
> prompt is not retained. Excerpts of the response may be, under the conditions
> described in the Privacy Policy. The Service must not be used to submit
> sensitive data.”

### 4.4 CGU — complément à l'article 8 (comparabilité)

> **FR —** « Les résultats sont rattachés à une version de mesure. Deux
> résultats produits sous des versions divergentes **ne sont pas comparables**,
> et le Service le signale. »

> **EN —** “Results are tied to a measurement version. Two results produced
> under diverging versions **are not comparable**, and the Service says so.”

### 4.5 Mentions légales — ligne à ajouter

> **FR —** « L'association édite également un service expérimental de mesure
> accessible à l'adresse `mcp.neomundi.org`, hébergé par Infomaniak Network SA
> (Suisse). »

---

## 5. Ce qui ne peut toujours pas être écrit

| Formulation | Pourquoi |
|---|---|
« aucun contenu client n'est conservé » | **faux** — F-5 |
une durée de conservation des mesures | **aucune n'est configurée** — F-6 |
« vos données ne quittent pas l'Union européenne » | **faux** — hébergement **CH** |
OpenAI ou Cohere comme sous-traitants | **faux** — faux positifs écartés §2 |
« nous supprimons vos données sur demande » | le connecteur ne peut rien supprimer, et les sauvegardes survivent 14 jours — I-7 |
un engagement sur ce qu'Infomaniak conserve | **I-2**, non vérifiable d'ici |

---

## 6. Prochaines actions, par ordre d'utilité

1. **Trancher `I-4`** — garder, tronquer ou supprimer `suspect_phrases`. C'est
   le **seul** mécanisme de persistance de contenu client : la décision
   simplifie ou alourdit tout le reste du corpus documentaire.
2. **Fixer une durée de conservation** (`I-3`) et la mettre en œuvre, pour que
   le texte décrive une configuration réelle.
3. **Obtenir le DPA Infomaniak** (`I-1`) et **ce qu'Infomaniak conserve**
   (`I-2`).
4. **Qualifier les rôles** responsable / sous-traitant (`I-5`) et la **base
   légale** (`I-6`).

# NeoMundi Products

[🇫🇷 Français](#français) · [🇬🇧 English](#english)

---

## Français

## Une seule intégration. Un contexte comportemental commun. Plusieurs applications spécialisées.

NeoMundi fournit le contexte de mesure qui manque pour interpréter le comportement d’un système d’IA à un instant précis.

La couche de mesure produit un signal indépendant, horodaté, traçable et comparable dans le temps. Ce signal peut ensuite être utilisé par différentes applications : observabilité, détection, audit, diagnostic, benchmark, assurance, preuve ou gouvernance.

> **NeoMundi mesure. Vos systèmes interprètent, gouvernent et agissent.**

**Un appel API · Connecteur universel · Aucun remplacement d’infrastructure · Privacy-first · BYOK**

---

## Architecture produit

### 1. Connecter la couche de mesure

[**NeoMundi Runtime Measurement Layer →**](https://github.com/neomundi-io/neomundi-runtime-measurement)

Connectez un système d’IA à NeoMundi pour mesurer son état comportemental à des instants précis, dans un cadre de mesure défini.

La couche produit notamment :

- des signaux runtime structurés ;
- une mesure horodatée et versionnée ;
- une couverture explicitement documentée ;
- des traces comparables dans le temps ;
- des enregistrements JSON interopérables ;
- une provenance et une intégrité vérifiables.

Le dépôt comprend :

- un Quickstart ;
- la documentation de l’API ;
- le contrat de mesure ;
- la table d’interprétation ;
- la documentation d’interopérabilité ;
- des exemples de charges utiles JSON.

**Choisissez ce parcours pour intégrer le signal NeoMundi dans votre propre infrastructure, application ou workflow.**

[→ Obtenir votre première mesure](https://github.com/neomundi-io/neomundi-runtime-measurement/blob/main/QUICKSTART.md)

---

### 2. Construire sur le signal

Une fois la couche connectée, le même contexte comportemental peut alimenter plusieurs applications indépendantes et spécialisées.

| Application | Apport du signal NeoMundi |
|---|---|
| Observabilité | Contextualiser l’état comportemental observé |
| Détection | Situer une anomalie dans l’état réel du système |
| Audit | Produire une mesure indépendante et traçable |
| Diagnostic | Fournir le contexte nécessaire à l’investigation |
| Benchmark | Comparer des modèles, versions ou fournisseurs |
| Change Assurance | Mesurer les effets d’une modification |
| Assurance | Documenter le comportement et l’exposition au risque |
| Preuve | Créer une trace contextualisée et horodatée |
| Gouvernance | Alimenter les règles du système consommateur |

Ces applications peuvent être déployées comme des couches légères, sans modifier la couche de mesure ni imposer une plateforme de gouvernance unique.

> **Une mesure commune. Des usages multiples. Des infrastructures indépendantes.**

---

## Produit disponible

### NeoMundi AI Periscope v0.1.0

[**Accéder à AI Periscope →**](https://github.com/neomundi-io/neomundi-ai-periscope)

AI Periscope transforme les mesures runtime NeoMundi en campagnes d’évaluation, comparaisons et rapports reproductibles.

Configurez :

- votre fournisseur ;
- votre modèle ;
- votre dataset ;
- vos paramètres ;
- votre protocole d’évaluation.

AI Periscope permet de :

- comparer plusieurs modèles ou fournisseurs ;
- établir une baseline avant mise en production ;
- mesurer les effets d’un changement de modèle, de version ou de corpus ;
- conduire des benchmarks reproductibles ;
- produire des datasets canoniques et traçables ;
- générer des rapports décisionnels en français et en anglais.

Vous pouvez commencer immédiatement en mode simulation, sans clé API, puis connecter vos accès NeoMundi et fournisseur pour lancer une campagne réelle.

**Choisissez AI Periscope pour transformer le signal NeoMundi en benchmark, comparaison, baseline ou évaluation documentée.**

[→ Lancer AI Periscope](https://github.com/neomundi-io/neomundi-ai-periscope)

---

## Parcours recommandé

1. Consultez le [Quickstart de la couche de mesure](https://github.com/neomundi-io/neomundi-runtime-measurement/blob/main/QUICKSTART.md).
2. Obtenez une première mesure structurée.
3. Vérifiez la signification, la couverture et les limites des signaux.
4. Testez [AI Periscope](https://github.com/neomundi-io/neomundi-ai-periscope) en mode simulation.
5. Configurez votre fournisseur, votre modèle, votre corpus et votre protocole.
6. Exécutez votre première campagne réelle.

---

## Frontière architecturale

NeoMundi produit le contexte de mesure.

Le système consommateur conserve l’interprétation, les politiques et les décisions opérationnelles.

**Mesure ≠ Interprétation ≠ Politique ≠ Exécution**

Continuer, interrompre, réacheminer, régénérer, alerter ou déclencher une validation humaine reste sous l’autorité du système consommateur.

NeoMundi ne remplace pas les infrastructures existantes. Il rend leurs observations, détections, audits, diagnostics, comparaisons et preuves plus contextualisés, comparables et défendables.

---

## Intégrations et pilotes

La couche de mesure peut être intégrée directement ou utilisée pour construire une application spécialisée adaptée à un métier, un secteur ou une infrastructure existante.

Les propositions de pilote, d’intégration et de partenariat sont les bienvenues.

[→ Découvrir NeoMundi](https://neomundi.io)

---

## English

## One integration. One shared behavioral context. Multiple specialized applications.

NeoMundi provides the missing measurement context needed to interpret the behavior of an AI system at a specific point in time.

The measurement layer produces an independent, timestamped, traceable and comparable signal. This signal can then support multiple applications, including observability, detection, audit, diagnosis, benchmarking, insurance, evidence and governance.

> **NeoMundi measures. Your systems interpret, govern and act.**

**One API call · Universal connector · No infrastructure replacement · Privacy-first · BYOK**

---

## Product architecture

### 1. Connect the measurement layer

[**NeoMundi Runtime Measurement Layer →**](https://github.com/neomundi-io/neomundi-runtime-measurement)

Connect an AI system to NeoMundi to measure its behavioral state at specific points in time, within a defined measurement framework.

The layer produces:

- structured runtime signals;
- timestamped and versioned measurements;
- explicitly documented coverage;
- records that can be compared over time;
- interoperable JSON measurement records;
- verifiable provenance and integrity.

The repository includes:

- a Quickstart;
- API documentation;
- the measurement contract;
- the interpretation table;
- interoperability documentation;
- example JSON payloads.

**Choose this path to integrate NeoMundi signals into your own infrastructure, application or workflow.**

[→ Obtain your first measurement](https://github.com/neomundi-io/neomundi-runtime-measurement/blob/main/QUICKSTART.md)

---

### 2. Build on the signal

Once the layer is connected, the same behavioral context can support multiple independent and specialized applications.

| Application | What NeoMundi provides |
|---|---|
| Observability | Behavioral context for the observed system |
| Detection | The system state in which an anomaly appears |
| Audit | An independent and traceable measurement |
| Diagnosis | Context supporting an investigation |
| Benchmarking | Comparison across models, versions or providers |
| Change Assurance | Measurement of the effects of a change |
| Insurance | Documented behavioral and risk context |
| Evidence | A contextualized and timestamped record |
| Governance | A signal consumed according to external rules |

These applications can be deployed as lightweight solution layers without changing the measurement layer or imposing a single governance platform.

> **One shared measurement. Multiple uses. Independent infrastructures.**

---

## Available product

### NeoMundi AI Periscope v0.1.0

[**Access AI Periscope →**](https://github.com/neomundi-io/neomundi-ai-periscope)

AI Periscope turns NeoMundi runtime measurements into evaluation campaigns, comparisons and reproducible reports.

Configure:

- your provider;
- your model;
- your dataset;
- your parameters;
- your evaluation protocol.

AI Periscope enables you to:

- compare models or providers;
- establish a baseline before production;
- measure the effects of a model, version or corpus change;
- conduct reproducible benchmarks;
- produce canonical and traceable datasets;
- generate decision-ready reports in English and French.

You can start immediately in simulation mode without API keys, then connect your NeoMundi and provider credentials to run a live campaign.

**Choose AI Periscope to turn NeoMundi signals into a benchmark, comparison, baseline or documented evaluation.**

[→ Launch AI Periscope](https://github.com/neomundi-io/neomundi-ai-periscope)

---

## Recommended path

1. Read the [Runtime Measurement Layer Quickstart](https://github.com/neomundi-io/neomundi-runtime-measurement/blob/main/QUICKSTART.md).
2. Obtain your first structured measurement.
3. Review the meaning, coverage and documented limits of the signals.
4. Test [AI Periscope](https://github.com/neomundi-io/neomundi-ai-periscope) in simulation mode.
5. Configure your provider, model, dataset and protocol.
6. Run your first live campaign.

---

## Architectural boundary

NeoMundi produces the measurement context.

The consuming system retains interpretation, policies and operational decisions.

**Measurement ≠ Interpretation ≠ Policy ≠ Execution**

Continuing, stopping, rerouting, regenerating, alerting or triggering human review remains under the authority of the consuming system.

NeoMundi does not replace existing infrastructures. It makes their observations, detections, audits, diagnoses, comparisons and evidence more contextualized, comparable and defensible.

---

## Integrations and pilots

The measurement layer can be integrated directly or used to build a specialized application adapted to a specific business function, industry or existing infrastructure.

Pilot, integration and partnership proposals are welcome.

[→ Discover NeoMundi](https://neomundi.io)

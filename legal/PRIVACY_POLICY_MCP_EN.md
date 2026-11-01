# Privacy policy — “MCP measurement service” addendum

**Version 0.1 — working draft, not publishable as it stands.**
**Date: [TO BE COMPLETED].**

> ⛔ **Unpublished draft with no effect.** To be reviewed by qualified counsel.

**Translation notice.** The **French version prevails**.

**This addendum completes the existing `neomundi.org` privacy policy. It does
not replace it.** The current policy describes the **website** — contact form,
newsletter, technical data, audience measurement. It **does not describe** the
measurement service, and must therefore be completed by what follows before
that page can be relied on for the MCP service.

**Every fact below was verified** against the live service on 2026-11-01.
Evidence is recorded in the
[data-processing audit](../MCP_DATA_PROCESSING_AUDIT.md) and the
[downstream report](../MCP_DOWNSTREAM_DATA_REPORT.md).

---

## 1. What to understand first

Measuring an AI response requires **reading** it. The content you submit is
therefore **transmitted to our measurement infrastructure**. This is not a
design choice we could undo: it is what measuring is.

What we can state precisely, and have verified:

- **the connector retains nothing** — no file, no content log, **no IP
  address**;
- **your prompt is never retained** — only its length is;
- **excerpts of the response may be retained**, copied verbatim, when
  factuality analysis exceeds a threshold.

That last point is the most important on this page. We state it up front
rather than leaving it inside a table.

---

## 2. Processing-by-processing table

### T-1 — Transmission of submitted content for measurement

| | |
|---|---|
**Data** | Prompt, observed system's response, context excerpts, supplied documents, technical metrics (tokens, latency). **May contain personal data if you submit any.** |
**Purpose** | Produce a measurement of the observed system's behaviour |
**Legal basis** | **[TO BE CONFIRMED]** — the association's legitimate interest in the scientific qualification of its instrument, or performance of the pilot agreement. **Unsettled** |
**Controller** | Neomundi Recherche **[to be confirmed — see §4]** |
**Processors** | **Infomaniak Network SA** (Switzerland) — hosting and the factuality-analysis model |
**Retention** | **No retention by the connector** — verified. Downstream: see T-2 and T-3 |
**Recipients** | The measurement infrastructure; Infomaniak for factuality analysis. **No other third party** |
**Rights** | Form at `https://neomundi.org/contact`. **Real limitation**: the connector retains nothing, so it can delete nothing; requests bear on T-2 and T-3 |

### T-2 — Retention of response excerpts

| | |
|---|---|
**Data** | **Up to five short excerpts of the response, copied word for word**, with a category and a brief explanation. Triggered only when factuality analysis exceeds its threshold |
**Purpose** | Document what in a response drove the factuality signal — the measurement would be uninterpretable without the corresponding excerpt |
**Legal basis** | **[TO BE CONFIRMED]** — same question as T-1 |
**Controller** | Neomundi Recherche **[to be confirmed]** |
**Processors** | Infomaniak (database hosting; excerpts produced by the analysis model) |
**Retention** | ⚠ **No duration is configured to date.** The oldest records date from **May 2026** and no purge exists. **A duration must be set before publication** — §5 |
**Recipients** | Authorised staff of the association **[to be specified]** |
**Rights** | Access, rectification, erasure, restriction, objection — contact form. ⚠ **Backups keep a copy for 14 days** after deletion from the database |

> **Verified figures, given so nobody has to guess them:**
> **21,870 records out of 338,578** carry such excerpts — **6.5%** — averaging
> **498 characters**.

### T-3 — Measurement metadata and results

| | |
|---|---|
**Data** | Request identifier, timestamp, **length** of prompt and response, measured signals, decision and its basis, versions, evaluator identifiers. **Neither the prompt nor the response themselves** (apart from T-2) |
**Purpose** | Produce the measurement, ensure its traceability and scientific reproducibility |
**Legal basis** | **[TO BE CONFIRMED]** |
**Controller** | Neomundi Recherche **[to be confirmed]** |
**Processors** | Infomaniak (hosting) |
**Retention** | ⚠ **No duration configured** — see T-2 |
**Recipients** | Authorised staff; **publishable extracts** in scientific publications, under the conditions of the pilot agreement |
**Rights** | Contact form |

### T-4 — Technical logs of the measurement infrastructure

| | |
|---|---|
**Data** | Caller's **IP address**, timestamp, HTTP method and path, response code, user agent, referrer. **No submitted content appears there** — verified |
**Purpose** | Security, diagnostics, service continuity |
**Legal basis** | **[TO BE CONFIRMED]** — legitimate interest in service security |
**Controller** | Neomundi Recherche **[to be confirmed]** |
**Processors** | Infomaniak (hosting) |
**Retention** | Web server logs: **14 days** (daily rotation, 14 files kept). ⚠ Container logs and the system journal: **no rotation configured** — §5 |
**Recipients** | Authorised staff |
**Rights** | Contact form |

### T-5 — Database backups

| | |
|---|---|
**Data** | Full copy of the database, **including T-2 excerpts** |
**Purpose** | Continuity and disaster recovery |
**Legal basis** | **[TO BE CONFIRMED]** |
**Controller** | Neomundi Recherche **[to be confirmed]** |
**Processors** | Infomaniak (hosting). **No copy outside the machine** — verified |
**Retention** | **14 days** — daily backup, automatic deletion beyond |
**Recipients** | Authorised staff |
**Rights** | ⚠ An erasure request **takes full effect only after 14 days**, once backups expire. **To be told to the requester** |

### T-6 — Pilot access management

| | |
|---|---|
**Data** | Participant identity, organisation, contact details, technical credential issued |
**Purpose** | Authorise and administer access to the service |
**Legal basis** | Performance of the participation agreement |
**Controller** | Neomundi Recherche |
**Processors** | **[TO BE COMPLETED]** — messaging and management tools used |
**Retention** | **[TO BE COMPLETED]** — no duration is set |
**Recipients** | Authorised staff |
**Rights** | Contact form |

### T-7 — MCP connector

| | |
|---|---|
**Data** | **No retention.** The connector writes no file, logs no content and records no IP address — verified by searching against a real measurement |
**Retention** | **Not applicable** |

---

## 3. Transfer outside the European Union

**Processing takes place in Switzerland.** Our servers and the
factuality-analysis model are hosted by **Infomaniak Network SA** (Geneva).

Switzerland benefits from an **adequacy decision** of the European Commission:
the transfer is lawful without additional safeguards. **We state it because a
reader should not have to assume it.**

---

## 4. What is not yet established

| # | Missing element | Effect on publication |
|---|---|---|
**M-1** | **Retention period for measurements and excerpts** | ⛔ **Blocking.** A policy cannot announce a duration that does not exist, nor stay silent about open-ended storage |
**M-2** | **Allocation of controller / processor roles** between the association and the operator of the infrastructure | ⛔ **Blocking.** Determines who answers requests and whether a processing agreement is required |
**M-3** | **Legal basis** for T-1 to T-5 | ⛔ **Blocking** |
**M-4** | **Data processing agreement with Infomaniak** — account rectification requested on **2026-11-01** | ⛔ **Blocking** until it is in the association's name |
**M-5** | **What Infomaniak retains** of content sent to its AI service | ⛔ **Blocking** — the only point where content leaves our machines, and **not verifiable from our systems** |
**M-6** | **Log rotation** for containers and the system journal | ⚠ To configure, otherwise T-4 can state no duration |
**M-7** | **Authorised staff** — who has access, under what rule | ⚠ To specify |
**M-8** | **Processors and retention** for T-6 | ⚠ To specify |

**Until M-1 to M-5 are resolved, this policy cannot be published as
compliant.** It can be published as a *draft*, which is what it is.

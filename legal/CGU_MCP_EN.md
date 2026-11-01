# Terms of Use — NeoMundi MCP measurement service

**Version 1.0 — in force since 1 November 2026.**

These terms apply **from their entry into force** and **do not operate
retroactively**.

**The French version prevails.** This translation is provided for information
and is not a separate legal instrument.

---

## Preamble

These terms of use (the “**Terms**”) govern access to the measurement service
available at `mcp.neomundi.org` (the “**Service**”), published by **Neomundi
Recherche**.

The Service is made available **free of charge**, **on authorisation**, and
**as part of a scientific qualification programme**. It is not a commercial
product, and nothing here is to be read as an offer of professional services.

**Being free and scientific removes neither the Publisher's obligations nor
all liability.**

---

## Article 1 — Publisher

**Neomundi Recherche**, an association governed by the French law of
1 July 1901
RNA number: **W563015824**
Registered office: 29 rue Tronchet, 75008 Paris, France
Publication director: **Sébastien FAVRE-LECCA**
Contact: form at `https://neomundi.org/contact`

Hosting of the Service: **Infomaniak Network SA**, Rue Eugène-Marziano 25,
1227 Les Acacias (GE), Switzerland.

---

## Article 2 — Purpose

These Terms set out the conditions under which the Publisher makes the Service
available to an authorised Participant, and the resulting mutual obligations.

The Service transmits an **already-performed AI execution** — or a generation
to be observed — to a measurement infrastructure, and returns **measured
signals together with their metrological context**.

---

## Article 3 — Definitions

“**Participant**”: a person or organisation **expressly authorised** by the
Publisher to access the Service as part of a pilot.

“**Connector**”: the software component exposing the Service over the MCP
protocol. **It computes no signal.**

“**Measurement instrument**”: the infrastructure that produces the signals. It
is **distinct from the Connector** and is not published by these Terms.

“**Submitted content**”: the prompt, the observed system's response, context
excerpts and documents transmitted by the Participant.

“**Signal**”: an indicator produced by the measurement instrument.

“**Measurement**”: the set of signals and metadata returned for one submission.

“**Measurement version**”: a version identifier attached to a Measurement,
determining its comparability with other Measurements.

---

## Article 4 — Scope and acceptance

These Terms apply to any access to the Service.

**Access requires the Publisher's prior authorisation.** There is no open
sign-up and no self-service account creation.

**Acceptance of these Terms is collected by an explicit written act, prior to
the issuing of access.**

The Participant declares in writing that it accepts a **specific version** of
these Terms, identified by its **version number** and by the **SHA-256
fingerprint of its text**. The Publisher records that acceptance — signatory
identity, date, version and fingerprint accepted, acceptance method — and
**issues the access credential only afterwards**.

**Neither silence, nor absence of reply, nor mere use of the Service
constitutes acceptance.**

A **substantial change** to these Terms calls for a **fresh acceptance**: the
earlier acceptance covered a different text, and its fingerprint evidences
that.

Where these Terms conflict with a signed participation agreement, **the latter
prevails**.

---

## Article 5 — Intended audience

The Service is intended for **researchers, institutions, organisations and
professionals** taking part in a pilot authorised by the Publisher.

Since access is issued only on prior authorisation and after written
acceptance, **no access opens by merely viewing the Service or its public
listing**.

---

## Article 6 — Access and credentials

Access is granted by the Publisher in the form of a technical credential.

The Participant is responsible for keeping that credential confidential and
for any use made of it, and informs the Publisher without delay of any
suspected disclosure.

**A limitation stated plainly.** At this stage the Service **does not
individualise access**: it can neither attribute a call to a particular
Participant nor suspend one Participant in isolation. **Suspension is
therefore necessarily collective** (Article 13). This limitation is technical,
known, and must not be presented otherwise.

---

## Article 7 — Description of the Service

The Service exposes **a single tool**, allowing an execution to be submitted
and a Measurement returned.

**What the Service does not do** — to be read as a limitation, not as a
forthcoming feature:

- it **computes no signal**: the Connector transmits and returns;
- it **retains no Measurement** and **offers no history**: each submission is
  independent;
- it **produces no export**, no report, no longitudinal tracking;
- it **offers no plan**, no tier and no contractual quota.

The Publisher does not warrant the future availability of any feature, whether
in production or not.

---

## Article 8 — Nature of measurements and results

Results are **observations and contextualised signals** relative to a defined
protocol. They **in no case constitute** a certification, a verdict, an
approval, or a warranty of compliance, security, stability, factuality or
lawfulness of the observed system.

The Service **does not warrant** that an observed system is accurate in all
circumstances, free from bias, stable over time, compliant with any
regulation, or suitable to ground a high-impact decision.

**A measurement is not an execution permission.**

### 8.1 Measured, unmeasured, degraded, unavailable

The Service explicitly distinguishes a **measured** signal from an
**unmeasured** one, and **names the cause** of each non-measurement. A decision
reached without any check having been performed is **flagged as such**.

**An absence of measurement is never presented as a favourable result.**

### 8.2 Comparability

Each Measurement is tied to a **measurement version**. **Two Measurements
produced under diverging versions are not comparable**, and the Service says
so. The Participant refrains from building a series or a trend from
Measurements that are not comparable.

### 8.3 Unmodelled fields

The Service may return fields it **does not model**. These are **named as
such**, and are neither interpreted nor discarded.

### 8.4 Evolving methods

Calculation methods, thresholds and protocols **may change**. A change
affecting comparability is reflected in the measurement version.

---

## Article 9 — Participant responsibilities

The Participant is solely responsible for:

- the AI system it submits for observation;
- **the right to transmit the submitted content**, including where it contains
  third-party data;
- the legal basis for any processing of personal data involved;
- submitting only **what is necessary** for the measurement;
- any decision, action or omission based on a Measurement;
- effective human oversight of the systems it operates;
- how it cites or publishes a Measurement (Article 11);
- respecting third-party rights and any sector-specific requirements.

**The Service verifies none of these technically.** These obligations rest on
the Participant's own declaration, and the Publisher has no means of checking
compliance.

---

## Article 10 — Submitted content, transmission and retention

### 10.1 What the Participant warrants

The Participant warrants that it holds the rights and authorisations required
to transmit the submitted content, and undertakes to include **only data
strictly necessary** for its use case.

### 10.2 What the Service does with it

**Submitted content is transmitted to the measurement infrastructure in order
to be measured.** This transmission is **inherent to measuring**: a response
cannot be measured for coherence without being read.

**The Connector retains nothing**: it writes no file, logs no content and
records no IP address.

**Downstream:**

- **the prompt is never retained** — only its length is;
- **excerpts of the response may be retained**, copied verbatim, when
  factuality analysis exceeds a threshold: up to five short excerpts are then
  stored alongside the Measurement.

**Processing takes place in Switzerland**, with the host named in Article 1,
which also provides one of the analysis models. The other analyses run on the
Publisher's own servers.

### 10.3 Sensitive data

The Participant **must not** transmit identifying health data, professional
secrets, banking, biometric or criminal-offence data, data concerning minors,
classified data, or data subject to any specific sector obligation.

**No technical control enforces this prohibition**: it is declarative. It may
be lifted by a specific written agreement and a suitable architecture.

---

## Article 11 — Use and publication of results

The Participant may use Measurements for its own purposes and for its
scientific publications.

**Any publication of a Measurement:**

- must not present it as a **certification** or a warranty of compliance;
- must state the **measurement version** and the **declared limitations**,
  including unmeasured signals;
- must not present as comparable Measurements that are not.

Conditions for publishing a dataset arising from a pilot are set by the
participation agreement. **Taking part in a pilot does not, in itself,
authorise publication of its dataset.**

---

## Article 12 — Prohibited uses

The following are prohibited in particular: any unlawful use; any unauthorised
access to the Publisher's systems; any deliberate overloading of the
infrastructure; introducing malicious software; attempting to extract the code
or reverse-engineer it; falsifying a Measurement or any traceability object;
sharing the access credential with an unauthorised third party; presenting a
Measurement as a certification; reselling or making the Service available to a
third party.

---

## Article 13 — Availability, suspension and discontinuation

**No service level is guaranteed.** The Service is provided **as is**, as part
of a scientific qualification programme, and may be **interrupted, modified or
discontinued at any time**, including without notice.

The Publisher may **suspend access** in the event of a security risk, unlawful
use, harm to the infrastructure, breach of these Terms, or an order from a
competent authority.

**Given the limitation stated in Article 6, a suspension is liable to affect
all Participants.**

---

## Article 14 — Intellectual property

The Publisher **acquires no right** over the submitted content, which remains
the property of the Participant or of the third parties concerned.

The Participant grants the Publisher, for the time strictly necessary to
perform the measurement, the right to transmit, process and return the
submitted content. **This licence confers no right of commercial exploitation
and no improvement use.**

**The measurement instrument, the Connector, the “NeoMundi” mark and the
documentation remain the property of their respective holders.** The Publisher
exploits them under a **non-exclusive licence**, **without transfer of
ownership**. These Terms **effect no assignment** and grant the Participant no
right over those elements.

Third-party components remain governed by their respective licences.

---

## Article 15 — Liability

The Service is provided **as is**, without warranty of accuracy, availability
or fitness for a particular purpose.

**The Participant remains solely responsible** for its content, its decisions
and its use of Measurements.

The Publisher shall not be liable for indirect damage, nor for a decision
taken on the basis of a Measurement in contradiction with the limitations set
out in Article 8.

**Nothing above limits the Publisher's liability in cases of gross negligence
or wilful misconduct, nor where the law forbids such limitation.** Absent any
contrary stipulation, the parties' liability is governed by the general law.

---

## Article 16 — Data protection

The processing of personal data is described in the Publisher's **privacy
policy**, reachable from `https://neomundi.org`.

The verified elements specific to the Service are set out in **Article 10**:
the prompt is not retained, excerpts of the response may be, the Connector
retains nothing, and processing takes place in Switzerland.

A Participant wishing to exercise their rights, or to obtain details about a
processing operation, contacts the Publisher through the contact form named in
Article 1.

---

## Article 17 — Changes to these Terms

The Publisher may amend these Terms.

Each version is identified by a **version number** and by the **SHA-256
fingerprint of its text**. A **substantial change** calls for a **fresh
acceptance** under Article 4: an acceptance in force covers a determined text
and **remains attached to it** until a fresh acceptance is collected.

A Participant who does not accept a new version **ceases to use the Service**,
without penalty.

---

## Article 18 — Governing law and jurisdiction

These Terms are governed by **French law**.

Failing amicable resolution, disputes fall to the **competent French courts**,
subject to applicable mandatory rules.

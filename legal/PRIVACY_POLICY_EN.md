# Privacy Policy — Neomundi Research

**Version of 1 November 2026.** Canonical copy of the page published at `https://neomundi.org/en/privacy-policy`, rendered as text from the served page. **The French version prevails.**

---

### Introduction

Neomundi Research respects your privacy and is committed to protecting any
personal data you may provide through this website.

This policy covers two distinct sets of processing. On the one hand this
website, its forms and its analytics, described below. On the other hand the
**NeoMundi measurement service**, reachable over the MCP protocol and the
measurement API, described under “NeoMundi measurement service”. Neomundi
Research is an association governed by the French law of 1 July 1901.

### Data We Collect

We only collect data that you voluntarily provide:

- information submitted through our contact form;
- your email address when you subscribe to our newsletter.

Limited technical information (such as IP address, date and time of requests,
or browser-related information) may also be processed for security and abuse
prevention purposes.

### Purpose of Processing

The data collected is used solely to:

- respond to your inquiries;
- manage newsletter subscriptions;
- ensure the security and proper operation of the website;
- prevent spam, abuse, and malicious activity.

### Legal Basis

We process your data based on:

- your consent when you contact us or subscribe to our newsletter;
- our legitimate interest in ensuring the security and proper operation of
the website.

### Newsletter

The newsletter subscription form uses Infomaniak’s Newsletter service.

Subscriptions use a double opt-in process. No subscription is activated
unless the owner of the email address explicitly confirms it.

You may unsubscribe at any time using the unsubscribe link included in every
email.

### Spam Protection

Protection against automated submissions depends on the form: the embedded
newsletter form uses an ALTCHA mechanism provided by Infomaniak.

WP Armour relies on a honeypot-based technology that does not require
captchas and does not transmit data to third-party services.

### Analytics

We use Koko Analytics in a privacy-friendly configuration.

This analytics tool does not use cookies and does not allow individual
visitors to be identified.

The collected statistics are used solely to measure overall website traffic
and improve the site’s content.

### Data Sharing

We do not sell, rent, or commercially share personal data.

The email address entered in the newsletter form is transmitted to Infomaniak
to process the subscription and manage mailings.

### Data Retention

Personal data is retained only for as long as necessary to fulfill the
purpose for which it was collected, unless a longer retention period is
required by law.

### Security

We implement appropriate technical and organizational measures to protect
personal data against unauthorized access, loss, disclosure, or alteration.

### Your Rights

Under the General Data Protection Regulation (GDPR), you have the right to:

- access your personal data;
- request correction of inaccurate data;
- request deletion of your data;
- request restriction of processing;
- object to processing where applicable.

To exercise your rights, please contact us through our contact form:

[Open the contact form](https://neomundi.org/en/contact-us)

### Contact

For any questions regarding personal data protection, you may contact us
through our contact form:

[Open the contact form](https://neomundi.org/en/contact-us)

---

### NeoMundi measurement service

Besides this website, the association publishes an **experimental measurement
service** reachable over the MCP protocol, and the measurement API behind it.
Access is restricted to authorised participants and governed by the [terms of
use](https://neomundi.org/en/terms-of-use).

**Measuring an AI response requires reading it.** What you submit is
therefore transmitted to our measurement infrastructure. This is not a
setting we could switch off: it is what measuring is.

#### What the service receives

When a measurement is requested, the service receives:

- the **prompt** submitted to the observed system;
- the **response** produced by that system;
- the **context excerpts and documents** you attach;
- the **technical request information**: timestamp, request identifier, HTTP
method and path, calling IP address, lengths and token counts, latency.

These elements **may contain personal data if you submit any**. The terms of
use prohibit submitting sensitive data, and **no technical control enforces
that prohibition**: it is declarative.

#### From the connector to the measurement API

- The MCP connector and the measurement API are **two separate services** on
two separate machines: MCP transport and downstream measurement transport are
distinct.
- The connector **computes no signal**: it forwards and returns.
- The connector **retains nothing**: it writes no file, logs no content and
records no IP address.
- In observation mode it forwards the execution object you supply. In
generation mode it sends the generation arguments and the configured provider
credential upstream.

#### Local evaluators and the Infomaniak inference service

A measurement draws on five analyses. **Three run on our own servers**; two
are transmitted to an Infomaniak inference service.

On our servers, with no third party involved:

- **stability**, computed without a model;
- **coherence**, by an embedding model running locally;
- **semantic risk**, by a moderation model running locally.

Transmitted to the Infomaniak inference service, which provides the model:

- the **factuality** analysis and **semantic instability**.

**This is the only point at which submitted content leaves our machines.**
What that service retains of the content it receives is governed by
Infomaniak’s own terms and **cannot be verified from our systems**.

#### The results produced

- the signals measured, where they are;
- the **measurement state** and the named cause of each non-measurement;
- the **provenance**: evaluator identifiers, versions, fingerprints;
- the decision and its basis;
- the **lengths** of the prompt and the response;
- where factuality analysis exceeds its threshold, **up to five short
excerpts of the response, copied verbatim**, with a category and a brief
explanation.

That last point is the most important in this section, and we state it
plainly: **your prompt is never retained** — only its length is — but
**excerpts of the response may be**. As an indication, on 1 November 2026,
6.5% of recorded measurements carried such excerpts, averaging 498
characters.

Results are tied to a **measurement version**. Two results produced under
diverging versions are not comparable, and the service says so. **An absence
of measurement is never presented as a favourable result**.

#### Technical logs

- API and web-server logs record the **calling IP address**, the timestamp,
the HTTP method and path, the response code, the user agent and the referrer.
- **No submitted content appears in them**: searching the logs examined for
the prompt and the response returns no occurrence.
- Web-server logs are kept for **14 days**.
- Container logs and the system journal **have no rotation configured**: we
therefore cannot state any duration for them.
- The MCP connector keeps no log.

#### Logs, content, measurements and scientific evidence

These four sets are distinct, and **a statement that is true of one is not
true of the others**:

- **technical logs** carry connection metadata, not content;
- **submitted content** is transmitted in order to be measured; the prompt is
not retained, excerpts of the response may be;
- **measurements** are the signals, the states and the provenance; they are
retained;
- **scientific evidence** is what may be published from a pilot. Taking part
in a pilot does not, in itself, authorise publication of its dataset: the
conditions are set by the participation agreement.

#### Retention

- MCP connector: **no retention**.
- Web-server logs: **14 days**.
- Database backups: **14 days**.
- Measurements, provenance and retained excerpts: **no duration is currently
configured**. The oldest records date from May 2026.
- Container logs and system journal: **no rotation configured**.

We prefer to put it this way rather than announce a duration we have not set.
A retention period is being decided; this page will be updated once it is
applied.

Two consequences to know. **A deletion in the database only reaches backups
when they expire**, up to 14 days later. And we do not guarantee the erasure
of anything a third-party service may have retained on its side.

#### Purposes and legal bases

- **Measuring submitted content** — to produce a measurement of the observed
system’s behaviour. Basis relied on: the association’s legitimate interest in
the scientific qualification of its instrument and, where a participation
agreement is signed, its performance.
- **Retaining measurements, provenance and excerpts** — to ensure the
traceability and scientific reproducibility of a measurement. Basis relied
on: the same legitimate interest.
- **Keeping technical logs** — security, diagnosis and service continuity.
Basis relied on: the legitimate interest in the security of the service.
- **Administering access** — to authorise and follow a pilot’s participation.
Basis relied on: performance of the participation agreement.

Where processing rests on legitimate interest, **you may object to it**; we
then examine the request against the grounds invoked. These bases are the
ones relied on at this stage and are among the points still being
consolidated.

#### Roles under the GDPR

**The qualification of roles depends on the processing at hand and on
effective responsibilities**, not on a blanket statement.

- For the website processing described above, Neomundi Research determines
the purposes and the means.
- For the measurement service, two decisions overlap: **you decide what
content you submit and for what purpose**; the association decides how
measurement works, which evaluators are used and what is retained.

The final qualification, processing by processing, is among the points still
being consolidated; for a pilot it is settled in its participation agreement.
**We do not publish here a qualification we have not yet settled**.

#### Processing outside the European Union

Our measurement servers and the inference service used are hosted **in
Switzerland**, by Infomaniak Network SA (Geneva). Switzerland benefits from
an adequacy decision of the European Commission: the transfer is lawful
without additional safeguards. We state it because a reader should not have
to assume it.

#### Exercising your rights over the measurement service

The rights set out under “Your Rights” apply. Three real limits must be
known:

- since the connector retains nothing, **there is nothing to delete there**:
a request concerns the measurements and logs retained downstream;
- access to the service **is not individualised at this stage**; to locate
your records it helps to include the request identifiers and the dates
concerned;
- a deletion in the database only reaches backups when they expire.

Requests go through the [contact form](https://neomundi.org/en/contact-us).
You may also lodge a complaint with the French data protection authority
(CNIL).

#### What we cannot claim

- that submitted content is not transmitted: **it is** — that is what
measuring means;
- that no content is retained: **excerpts of the response are**, under the
conditions described above;
- that your data does not leave the European Union: processing takes place in
Switzerland;
- a retention period for measurements: none is currently configured;
- a guarantee of erasure covering what a third-party service retains on its
side;
- a certification or third-party attested compliance: **the service holds
none**.

#### Points still being consolidated

- the retention period for measurements and excerpts, and its implementation;
- rotation of container logs and the system journal;
- what the third-party inference service retains of the content it receives;
- the final qualification of roles, processing by processing.

This section states what is verified and names what is not. It will be
updated as these points are settled.

### Changes

We may update this Privacy Policy from time to time.

The most recent version will always be available on this page.

Last update: 1 November 2026

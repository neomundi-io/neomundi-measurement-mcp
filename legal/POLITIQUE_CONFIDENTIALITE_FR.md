# Politique de confidentialité — Neomundi Recherche

**Version du 1er novembre 2026.** Copie canonique de la page publiée à l'adresse `https://neomundi.org/politique-de-confidentialite`, rendue en texte depuis la page servie.

---

### Introduction

Neomundi Recherche respecte votre vie privée et s’engage à protéger les
données personnelles que vous pourriez lui communiquer via ce site.

La présente politique couvre deux ensembles distincts. D’une part ce site,
ses formulaires et ses statistiques, décrits ci-dessous. D’autre part le
**service de mesure NeoMundi**, accessible par le protocole MCP et par l’API
de mesure, dont le fonctionnement est décrit à la section « Service de mesure
NeoMundi ». Neomundi Recherche est une association régie par la loi du 1er
juillet 1901.

### Données collectées

Nous collectons uniquement les données que vous fournissez volontairement :

- les informations transmises via notre formulaire de contact ;
- votre adresse e-mail lorsque vous vous inscrivez à notre newsletter.

Des informations techniques limitées (telles que l’adresse IP, la date et
l’heure de la requête ou des informations liées au navigateur) peuvent
également être traitées à des fins de sécurité et de protection contre les
abus.

### Finalités du traitement

Les données collectées sont utilisées uniquement pour :

- répondre à vos demandes ;
- gérer les inscriptions à la newsletter ;
- assurer la sécurité et le bon fonctionnement du site ;
- prévenir les abus, le spam et les activités malveillantes.

### Base légale

Le traitement de vos données repose :

- sur votre consentement lorsque vous nous contactez ou vous vous inscrivez à
la newsletter ;
- sur notre intérêt légitime à assurer la sécurité et le bon fonctionnement
du site.

### Newsletter

Le formulaire d’inscription à la newsletter utilise le service Newsletter
d’Infomaniak.

L’inscription utilise un mécanisme de double confirmation (double opt-in).
Aucun abonnement n’est activé sans validation explicite de l’adresse e-mail
par son propriétaire.

Vous pouvez vous désinscrire à tout moment via le lien présent dans chaque
e-mail.

### Protection contre le spam

La protection contre les soumissions automatisées dépend du formulaire : le
formulaire de newsletter intégré utilise notamment un dispositif ALTCHA
fourni par Infomaniak.

WP Armour repose sur une technologie de type « honeypot » qui ne nécessite ni
captcha ni transmission de données à des services tiers.

### Statistiques

Nous utilisons Koko Analytics en mode respectueux de la vie privée.

Cet outil n’utilise pas de cookies et ne permet pas d’identifier
individuellement les visiteurs du site.

Les statistiques collectées sont utilisées uniquement pour mesurer l’audience
globale du site et améliorer son contenu.

### Partage des données

Nous ne vendons, ne louons et ne commercialisons aucune donnée personnelle.

L’adresse e-mail saisie dans le formulaire de newsletter est transmise à
Infomaniak pour traiter l’inscription et gérer les envois.

### Conservation des données

Les données sont conservées uniquement pendant la durée nécessaire à la
finalité pour laquelle elles ont été collectées, sauf obligation légale
contraire.

### Sécurité

Nous mettons en œuvre des mesures techniques et organisationnelles
appropriées afin de protéger les données personnelles contre tout accès non
autorisé, perte, divulgation ou altération.

### Vos droits

Conformément au Règlement Général sur la Protection des Données (RGPD), vous
disposez notamment des droits suivants :

- droit d’accès ;
- droit de rectification ;
- droit d’effacement ;
- droit à la limitation du traitement ;
- droit d’opposition lorsque celui-ci est applicable.

Pour exercer vos droits, vous pouvez nous contacter via notre formulaire de
contact :

[Ouvrir le formulaire de contact](https://neomundi.org/contact)

### Contact

Pour toute question relative à la protection des données personnelles, vous
pouvez nous contacter via notre formulaire de contact :

[Ouvrir le formulaire de contact](https://neomundi.org/contact)

---

### Service de mesure NeoMundi

Outre ce site, l’association édite un **service expérimental de mesure**
accessible par le protocole MCP, et l’API de mesure qui lui répond. Son accès
est réservé à des participants autorisés et régi par les [conditions
générales d’utilisation](https://neomundi.org/cgu).

**Mesurer une réponse d’intelligence artificielle suppose de la lire.** Le
contenu que vous soumettez est donc transmis à notre infrastructure de
mesure. Ce n’est pas un réglage que nous pourrions désactiver : c’est ce
qu’est une mesure.

#### Ce que le service reçoit

Lorsqu’une mesure est demandée, le service reçoit :

- l’**invite** soumise au système observé ;
- la **réponse** produite par ce système ;
- les **extraits de contexte et documents** que vous joignez ;
- les **informations techniques de la requête** : horodatage, identifiant de
requête, méthode et chemin HTTP, adresse IP appelante, longueurs et nombres
de jetons, latence.

Ces éléments **peuvent contenir des données personnelles si vous en
soumettez**. Les conditions générales interdisent la soumission de données
sensibles, et **aucun contrôle technique ne fait respecter cette
interdiction** : elle est déclarative.

#### Du connecteur vers l’API de mesure

- Le connecteur MCP et l’API de mesure sont **deux services distincts**, sur
deux machines distinctes : le transport MCP et le transport vers la mesure
sont séparés.
- Le connecteur **ne calcule aucun signal** : il transmet et restitue.
- Le connecteur **ne conserve rien** : il n’écrit aucun fichier, ne
journalise aucun contenu et n’enregistre aucune adresse IP.
- En mode observation, il transmet l’objet d’exécution que vous fournissez.
En mode génération, il transmet les paramètres de génération et l’identifiant
du fournisseur configuré au service amont.

#### Évaluateurs locaux et service d’inférence Infomaniak

Une mesure mobilise cinq analyses. **Trois s’exécutent sur nos propres
serveurs**, deux sont transmises à un service d’inférence d’Infomaniak.

Sur nos serveurs, sans transmission à un tiers :

- la **stabilité**, calculée sans modèle ;
- la **cohérence**, par un modèle de plongements exécuté localement ;
- le **risque sémantique**, par un modèle de modération exécuté localement.

Transmis au service d’inférence d’Infomaniak, qui fournit le modèle :

- l’analyse de **factualité** et l’**instabilité sémantique**.

**C’est le seul point où du contenu soumis sort de nos machines.** Ce que ce
service conserve du contenu reçu relève des conditions d’Infomaniak et
**n’est pas vérifiable depuis nos systèmes**.

#### Les résultats produits

- les signaux mesurés, lorsqu’ils le sont ;
- l’**état de la mesure** et la cause nommée de chaque non-mesure ;
- la **provenance** : identifiants des évaluateurs, versions, empreintes ;
- la décision et son fondement ;
- les **longueurs** de l’invite et de la réponse ;
- lorsque l’analyse de factualité dépasse son seuil, **jusqu’à cinq extraits
courts de la réponse, copiés mot pour mot**, accompagnés d’une catégorie et
d’une explication brève.

Ce dernier point est le plus important de cette section, et nous l’énonçons
sans détour : **votre invite n’est jamais conservée** — seule sa longueur
l’est — mais **des extraits de la réponse peuvent l’être**. À titre
indicatif, au 1er novembre 2026, 6,5 % des mesures enregistrées en portaient,
d’une longueur moyenne de 498 caractères.

Les résultats sont rattachés à une **version de mesure**. Deux résultats
produits sous des versions divergentes ne sont pas comparables, et le service
le signale. **Une absence de mesure n’est jamais présentée comme un résultat
favorable**.

#### Journaux techniques

- Les journaux de l’API et du serveur web enregistrent l’**adresse IP
appelante**, l’horodatage, la méthode et le chemin HTTP, le code de réponse,
l’agent utilisateur et le référent.
- **Aucun contenu soumis n’y figure** : la recherche de l’invite et de la
réponse dans les journaux examinés ne rend aucune occurrence.
- Les journaux du serveur web sont conservés **14 jours**.
- Les journaux de conteneurs et le journal système **n’ont aucune rotation
configurée** : nous ne pouvons donc annoncer aucune durée pour eux.
- Le connecteur MCP ne tient aucun journal.

#### Journaux, contenus, mesures et preuves scientifiques

Ces quatre ensembles sont distincts, et **une affirmation vraie de l’un n’est
pas vraie des autres** :

- les **journaux techniques** portent des métadonnées de connexion, pas de
contenu ;
- les **contenus soumis** sont transmis pour être mesurés ; l’invite n’est
pas conservée, des extraits de la réponse peuvent l’être ;
- les **mesures** sont les signaux, les états et la provenance ; elles sont
conservées ;
- les **preuves scientifiques** sont ce qui peut être publié d’un pilote.
Participer à un pilote n’autorise pas, en soi, la publication de son jeu de
données : les conditions en sont fixées par la convention de participation.

#### Conservation

- Connecteur MCP : **aucune conservation**.
- Journaux du serveur web : **14 jours**.
- Sauvegardes de la base : **14 jours**.
- Mesures, provenance et extraits conservés : **aucune durée n’est configurée
à ce jour**. Les enregistrements les plus anciens datent de mai 2026.
- Journaux de conteneurs et journal système : **aucune rotation configurée**.

Nous préférons l’écrire ainsi plutôt que d’annoncer une durée que nous
n’avons pas fixée. Une durée de conservation est en cours de décision ; cette
page sera mise à jour lorsqu’elle sera appliquée.

Deux conséquences à connaître. **Une suppression en base n’atteint les
sauvegardes qu’à leur expiration**, soit jusqu’à 14 jours plus tard. Et nous
ne garantissons pas l’effacement de ce qu’un service tiers aurait conservé de
son côté.

#### Finalités et bases juridiques

- **Mesurer le contenu soumis** — produire une mesure du comportement du
système observé. Base retenue : l’intérêt légitime de l’association à la
qualification scientifique de son instrument et, lorsqu’une convention de
participation est signée, son exécution.
- **Conserver les mesures, la provenance et les extraits** — assurer la
traçabilité et la reproductibilité scientifique de la mesure. Base retenue :
le même intérêt légitime.
- **Tenir les journaux techniques** — sécurité, diagnostic et continuité du
service. Base retenue : l’intérêt légitime à la sécurité du service.
- **Administrer les accès** — autoriser et suivre la participation d’un
pilote. Base retenue : l’exécution de la convention de participation.

Lorsqu’un traitement repose sur l’intérêt légitime, **vous pouvez vous y
opposer** ; nous examinons alors la demande au regard des motifs invoqués.
Ces bases sont celles retenues à ce stade et figurent parmi les points en
cours de consolidation.

#### Rôles au sens du RGPD

**La qualification des rôles dépend du traitement considéré et des
responsabilités effectives**, non d’une mention générale.

- Pour les traitements de ce site décrits plus haut, Neomundi Recherche
détermine les finalités et les moyens.
- Pour le service de mesure, deux décisions se superposent : **vous décidez
quel contenu vous soumettez et dans quel but** ; l’association décide comment
la mesure fonctionne, quels évaluateurs sont mobilisés et ce qui est
conservé.

La qualification définitive, traitement par traitement, figure parmi les
points en cours de consolidation ; pour un pilote, elle est arrêtée dans sa
convention de participation. **Nous ne publions pas ici une qualification que
nous n’avons pas encore arrêtée**.

#### Traitement hors Union européenne

Nos serveurs de mesure et le service d’inférence mobilisé sont hébergés **en
Suisse**, par Infomaniak Network SA (Genève). La Suisse bénéficie d’une
décision d’adéquation de la Commission européenne : le transfert est licite
sans garanties supplémentaires. Nous l’énonçons parce qu’un lecteur ne doit
pas avoir à le supposer.

#### Exercer vos droits sur le service de mesure

Les droits rappelés à la section « Vos droits » s’appliquent. Trois limites
réelles doivent être connues :

- le connecteur ne conservant rien, **il n’y a rien à y supprimer** : une
demande porte sur les mesures et les journaux conservés en aval ;
- l’accès au service **n’est pas individualisé à ce stade** ; pour retrouver
vos enregistrements, il est utile de joindre les identifiants de requête et
les dates concernées ;
- une suppression en base n’atteint les sauvegardes qu’à leur expiration.

Les demandes passent par le [formulaire de
contact](https://neomundi.org/contact). Vous pouvez également introduire une
réclamation auprès de la Commission nationale de l’informatique et des
libertés (CNIL).

#### Ce que nous ne pouvons pas affirmer

- que le contenu soumis n’est pas transmis : **il l’est**, c’est le principe
même de la mesure ;
- qu’aucun contenu n’est conservé : **des extraits de la réponse le sont**,
dans les conditions décrites ci-dessus ;
- que vos données ne quittent pas l’Union européenne : le traitement a lieu
en Suisse ;
- une durée de conservation des mesures : aucune n’est configurée à ce jour ;
- une garantie d’effacement portant sur ce qu’un service tiers conserve de
son côté ;
- une certification ou une conformité attestée par un tiers : **le service
n’en détient aucune**.

#### Points en cours de consolidation

- la durée de conservation des mesures et des extraits, et sa mise en œuvre ;
- la rotation des journaux de conteneurs et du journal système ;
- ce que le service d’inférence tiers conserve du contenu reçu ;
- la qualification définitive des rôles, traitement par traitement.

Cette section énonce ce qui est vérifié et nomme ce qui ne l’est pas. Elle
sera mise à jour à mesure que ces points sont arrêtés.

### Modifications

La présente politique peut être mise à jour à tout moment.

La version la plus récente est toujours disponible sur cette page.

Dernière mise à jour : 1er novembre 2026

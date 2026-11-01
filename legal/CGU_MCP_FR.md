# Conditions générales d'utilisation — service de mesure MCP NeoMundi

**Version 0.4 — projet de travail, non publiable en l'état.**
**Date d'entrée en vigueur : [À COMPLÉTER].**

> ⛔ **Projet non publié, non signé, sans effet juridique.** À relire par un
> conseil compétent avant publication. Les mentions **[À COMPLÉTER]** et
> **[À CONFIRMER]** marquent ce qui n'est pas tranché : elles ne doivent pas
> être comblées par analogie.

**Historique.** La V0.1 visait le service *ControlTower* exploité par une
société suisse. La présente version reprend sa structure et change trois
choses : l'**entité éditrice**, le **droit applicable**, et le **mode d'accès**.

---

## Préambule

Les présentes conditions générales d'utilisation (les « **CGU** ») régissent
l'accès au service de mesure accessible à l'adresse `mcp.neomundi.org` (le
« **Service** »), édité par **Neomundi Recherche**.

Le Service est mis à disposition **à titre gratuit**, **sur autorisation**, et
**dans un cadre de qualification scientifique**. Il n'est pas un produit
commercial, et aucune disposition des présentes ne doit être lue comme une
offre de service professionnel.

**Le caractère gratuit et scientifique du Service n'efface ni les obligations
de l'Éditeur ni toute responsabilité.**

---

## Article 1 — Identité de l'éditeur

**Neomundi Recherche**, association régie par la loi du 1er juillet 1901
Numéro RNA : **W563015824**
Siège : 29 rue Tronchet, 75008 Paris, France
Directeur de la publication : **Sébastien FAVRE-LECCA**
Contact : formulaire disponible à l'adresse `https://neomundi.org/contact`

Hébergement : **Infomaniak Network SA**, Rue Eugène-Marziano 25, 1227 Les
Acacias (GE), Suisse.

> **[À COMPLÉTER]** — adresse de contact dédiée aux questions contractuelles
> et de sécurité, si elle doit être distincte du formulaire.

---

## Article 2 — Objet

Les présentes CGU définissent les conditions dans lesquelles l'Éditeur met le
Service à disposition d'un Participant autorisé, et les obligations
réciproques qui en découlent.

Le Service permet de **transmettre une exécution d'intelligence artificielle
déjà réalisée** — ou une génération à observer — à une infrastructure de
mesure, et d'en **recevoir des signaux mesurés et leur contexte
métrologique**.

---

## Article 3 — Définitions

« **Participant** » : personne ou organisation **expressément autorisée** par
l'Éditeur à accéder au Service dans le cadre d'un pilote.

« **Connecteur** » : le composant logiciel exposant le Service selon le
protocole MCP. **Il ne calcule aucun signal.**

« **Instrument de mesure** » : l'infrastructure qui produit les signaux. Il est
**distinct du Connecteur** et n'est pas édité par les présentes.

« **Contenu soumis** » : l'invite, la réponse du système observé, les extraits
de contexte et les documents transmis par le Participant.

« **Signal** » : indicateur produit par l'Instrument de mesure.

« **Mesure** » : l'ensemble des signaux et métadonnées renvoyés pour une
soumission.

« **Version de mesure** » : identifiant de version attaché à une Mesure,
déterminant sa comparabilité avec d'autres Mesures.

---

## Article 4 — Champ d'application et acceptation

Les présentes CGU s'appliquent à tout accès au Service.

**L'accès au Service est soumis à autorisation préalable de l'Éditeur.**
Il n'existe ni inscription libre, ni création de compte autonome.

**L'acceptation des présentes CGU est recueillie par un acte écrit explicite,
préalable à la délivrance de l'accès.**

Le Participant déclare par écrit accepter une **version déterminée** des
présentes, identifiée par son **numéro de version** et par l'**empreinte
SHA-256 de son texte**. L'association consigne cette acceptation — identité du
signataire, date, version et empreinte acceptées, méthode d'acceptation — et
**ne délivre l'identifiant d'accès qu'ensuite**.

**Ni le silence, ni l'absence de réponse, ni le simple usage du Service ne
valent acceptation.**

Une **modification substantielle** des présentes donne lieu à une **nouvelle
acceptation** : l'acceptation antérieure porte sur un autre texte, et son
empreinte en fait foi.

La procédure est décrite dans le document
[acceptation des CGU](ACCEPTATION_CGU.md).

En cas de contradiction entre les présentes et une convention de participation
signée, **cette dernière prévaut**.

---

## Article 5 — Destination du Service

Le Service est destiné aux **chercheurs, institutions, organisations et
professionnels** participant à un pilote autorisé.

> **[À CONFIRMER]** — admission ou exclusion des personnes physiques agissant
> à des fins non professionnelles. La question se pose dès lors qu'une fiche
> publique de plugin rend le Service visible du grand public, alors même que
> l'accès reste soumis à autorisation. **La décision conditionne l'application
> du droit de la consommation.**

---

## Article 6 — Accès et identifiants

L'accès est délivré par l'Éditeur sous forme d'un identifiant technique.

Le Participant est responsable de la confidentialité de l'identifiant qui lui
est remis et de tout usage effectué au moyen de celui-ci. Il informe l'Éditeur
sans délai de toute divulgation suspectée.

> **Limite énoncée franchement.** À ce stade, le Service **n'individualise pas
> les accès** : il ne permet ni d'attribuer un appel à un Participant
> déterminé, ni de suspendre un Participant isolément. **Une suspension est
> donc nécessairement collective** (article 13). Cette limite est technique,
> connue, et ne doit pas être présentée autrement. **[À CONFIRMER]** — mise en
> place d'identifiants individuels.

---

## Article 7 — Description du Service

Le Service expose **un seul outil**, permettant de soumettre une exécution et
d'en recevoir une Mesure.

**Ce que le Service ne fait pas**, et qui doit être lu comme une limite et non
comme une fonction à venir :

- il **ne calcule aucun signal** : le Connecteur transmet et restitue ;
- il **ne conserve aucune Mesure** et **n'offre aucun historique** : chaque
  soumission est indépendante ;
- il **ne produit aucun export**, aucun rapport, aucun suivi longitudinal ;
- il **ne propose aucun plan**, aucun palier, aucun quota contractuel.

L'Éditeur ne garantit pas la disponibilité future d'une fonction, qu'elle soit
en production ou non.

---

## Article 8 — Nature des mesures et des résultats

**Cet article est le cœur des présentes et ne doit pas être affaibli.**

Les résultats produits constituent des **observations et des signaux
contextualisés** au regard d'un protocole déterminé. Ils **ne constituent en
aucun cas** une certification, un verdict, un agrément, ni une garantie de
conformité, de sécurité, de stabilité, de factualité ou de licéité du système
observé.

Le Service **ne garantit pas** qu'un système observé soit exact en toutes
circonstances, dépourvu de biais, stable dans le temps, conforme à une
réglementation, ou approprié pour fonder une décision à fort impact.

**Une mesure n'est pas une autorisation d'exécution.**

### 8.1 Mesuré, non mesuré, dégradé, indisponible

Le Service distingue explicitement un signal **mesuré** d'un signal **non
mesuré**, et **nomme la cause** de chaque non-mesure. Une décision rendue sans
qu'aucun contrôle n'ait été effectué est **signalée comme telle**.

**L'absence de mesure n'est jamais présentée comme un résultat favorable.**

### 8.2 Comparabilité

Chaque Mesure est rattachée à une **version de mesure**. **Deux Mesures
produites sous des versions divergentes ne sont pas comparables**, et le
Service le signale. Le Participant s'abstient de constituer une série ou une
tendance à partir de Mesures non comparables.

### 8.3 Champs non modélisés

Le Service peut restituer des champs qu'il **ne modélise pas**. Ils sont alors
**nommés comme tels**, et ne sont ni interprétés ni supprimés.

### 8.4 Évolution des méthodes

Les méthodes de calcul, seuils et protocoles **peuvent évoluer**. Une évolution
affectant la comparabilité est reflétée par la version de mesure.

---

## Article 9 — Responsabilités du Participant

Le Participant est seul responsable :

- du système d'intelligence artificielle qu'il soumet à observation ;
- **du droit de transmettre le Contenu soumis**, y compris lorsqu'il contient
  des données de tiers ;
- de la base juridique de tout traitement de données personnelles impliqué ;
- de ne soumettre que **ce qui est nécessaire** à la mesure ;
- de toute décision, action ou omission fondée sur une Mesure ;
- de la supervision humaine effective des systèmes qu'il exploite ;
- de la manière dont il cite ou publie une Mesure (article 11) ;
- du respect des droits des tiers et des exigences propres à son secteur.

> **Le Service ne vérifie techniquement aucun de ces points.** Ces obligations
> reposent sur une déclaration du Participant, et l'Éditeur n'a pas les moyens
> d'en contrôler le respect.

---

## Article 10 — Contenu soumis, transmission et conservation

### 10.1 Ce que le Participant garantit

Le Participant garantit disposer des droits et autorisations nécessaires à la
transmission du Contenu soumis, et s'engage à **n'y inclure que les données
strictement nécessaires** à son cas d'usage.

### 10.2 Ce que le Service en fait — dit franchement

**Le Contenu soumis est transmis à l'infrastructure de mesure afin d'y être
mesuré.** Cette transmission est **inhérente à la mesure** : il n'est pas
possible de mesurer la cohérence d'une réponse sans la lire.

**Le Connecteur ne conserve rien** : il n'écrit aucun fichier, ne journalise
aucun contenu et n'enregistre aucune adresse IP.

**En aval :**

- **l'invite n'est jamais conservée** — seule sa longueur l'est ;
- **des extraits de la réponse peuvent être conservés**, copiés tels quels,
  lorsque l'analyse de factualité dépasse un seuil : jusqu'à cinq extraits
  courts sont alors enregistrés avec la Mesure.

Les modalités et durées figurent dans la
[politique de confidentialité](POLITIQUE_CONFIDENTIALITE_MCP_FR.md).

### 10.3 Données sensibles

Le Participant **s'interdit** de transmettre toute donnée de santé
identifiante, tout secret professionnel, toute donnée bancaire, biométrique ou
pénale, toute donnée concernant des mineurs, toute donnée classifiée, ainsi
que toute donnée soumise à une obligation sectorielle particulière.

**Aucun contrôle technique ne vérifie cette interdiction** : elle est
déclarative. Cette interdiction peut être levée par un accord écrit spécifique
et une architecture adaptée.

---

## Article 11 — Usage et publication des résultats

Le Participant dispose d'un droit d'usage des Mesures pour ses besoins propres
et pour ses publications scientifiques.

**Toute publication d'une Mesure :**

- ne peut la présenter comme une **certification** ou une garantie de
  conformité ;
- doit mentionner la **version de mesure** et les **limites déclarées**, y
  compris les signaux non mesurés ;
- ne doit pas présenter comme comparables des Mesures qui ne le sont pas.

Les conditions de publication d'un jeu de données issu d'un pilote sont
définies par la convention de participation. **La participation à un pilote
n'emporte pas, à elle seule, autorisation de publier son jeu de données.**

> **[À CONFIRMER]** — citation du Service ou de l'Éditeur dans une
> communication externe : accord préalable, ou politique de citation
> standardisée.

---

## Article 12 — Usages interdits

Sont notamment interdits : tout usage illicite ; tout accès non autorisé aux
systèmes de l'Éditeur ; toute surcharge délibérée de l'infrastructure ; toute
introduction de logiciel malveillant ; toute tentative d'extraction du code ou
de rétro-ingénierie ; toute falsification d'une Mesure ou d'un objet de
traçabilité ; tout partage de l'identifiant d'accès avec un tiers non
autorisé ; toute présentation d'une Mesure comme une certification ; toute
revente ou mise à disposition du Service à un tiers.

---

## Article 13 — Disponibilité, suspension et arrêt

**Aucun niveau de service n'est garanti.** Le Service est fourni **en l'état**,
dans le cadre d'une qualification scientifique, et peut être **interrompu,
modifié ou arrêté à tout moment**, y compris sans préavis.

L'Éditeur peut **suspendre l'accès** en cas de risque de sécurité, d'usage
illicite, d'atteinte à l'infrastructure, de violation des présentes, ou
d'injonction d'une autorité compétente.

**Compte tenu de la limite énoncée à l'article 6, une suspension est
susceptible d'affecter l'ensemble des Participants.**

---

## Article 14 — Propriété intellectuelle

L'Éditeur **n'acquiert aucun droit** sur le Contenu soumis, qui demeure la
propriété du Participant ou des tiers concernés.

Le Participant concède à l'Éditeur, pour la seule durée nécessaire à
l'exécution de la mesure, le droit de transmettre, traiter et restituer le
Contenu soumis. **Cette licence ne confère aucun droit d'exploitation
commerciale ni d'usage d'amélioration.**

**L'Instrument de mesure, le Connecteur, la marque « NeoMundi » et la
documentation demeurent la propriété de leurs titulaires respectifs.**
L'association exploite ces éléments dans le cadre d'une **licence non
exclusive** et **sans transfert de propriété**. Les présentes CGU **n'emportent
aucune cession** et ne confèrent au Participant aucun droit sur ces éléments.

Les composants appartenant à des tiers restent régis par leurs licences
respectives.

> **[À COMPLÉTER]** — renvoi à l'annexe de périmètre des droits une fois
> l'inventaire établi.

---

## Article 15 — Responsabilité

Le Service est fourni **en l'état**, sans garantie d'exactitude, de
disponibilité ni d'adéquation à un usage particulier.

**Le Participant demeure seul responsable** de ses contenus, de ses décisions
et de l'usage qu'il fait des Mesures.

La responsabilité de l'Éditeur ne saurait être engagée pour un dommage
indirect, ni pour une décision prise sur le fondement d'une Mesure en
contradiction avec les limites énoncées à l'article 8.

> **[À COMPLÉTER]** — limitation de responsabilité. **La gratuité et le cadre
> scientifique n'exonèrent pas de plein droit** ; la clause doit être calibrée
> par un conseil au regard du droit français, qui écarte les clauses
> exonératoires en cas de faute lourde ou dolosive.

---

## Article 16 — Protection des données

Le traitement des données personnelles est décrit par la
[politique de confidentialité](POLITIQUE_CONFIDENTIALITE_MCP_FR.md).

> **[À COMPLÉTER]** — la qualification des rôles (responsable de traitement /
> sous-traitant) entre l'Éditeur, le Participant et l'exploitant de
> l'infrastructure de mesure **n'est pas établie**, et détermine si un accord
> de sous-traitance est requis.

---

## Article 17 — Modification des CGU

L'Éditeur peut modifier les présentes. Toute modification substantielle est
portée à la connaissance des Participants **avant son entrée en vigueur**,
selon un préavis **[À COMPLÉTER]**, le Participant pouvant cesser d'utiliser le
Service s'il la refuse.

---

## Article 18 — Droit applicable et juridiction

Les présentes sont régies par le **droit français**.

À défaut de résolution amiable, les différends relèvent des **juridictions
compétentes françaises**, sous réserve des règles d'ordre public applicables.

> **[À CONFIRMER]** — attribution de compétence précise, et articulation avec
> le fait que l'hébergement et une partie du traitement ont lieu **en
> Suisse**.

---

## Annexe — Points à trancher avant publication

1. ~~Mécanisme d'acceptation~~ — **arrêté** : acte écrit explicite préalable
   à la délivrance de l'accès (art. 4). Reste à **publier** le texte pour que
   le mécanisme devienne utilisable.
2. Admission ou exclusion des consommateurs (art. 5).
3. Identifiants individuels, ou maintien d'un accès non individualisé (art. 6).
4. Politique de citation (art. 11).
5. Limitation de responsabilité (art. 15).
6. Qualification des rôles au titre du RGPD (art. 16).
7. Préavis de modification (art. 17).
8. Juridiction compétente (art. 18).
9. Adresse de contact contractuelle et sécurité (art. 1).
10. Renvoi à l'annexe de périmètre des droits (art. 14).

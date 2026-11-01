# Décisions encore ouvertes

**Au 2026-11-01.** Consolidé depuis les quatre documents juridiques et les
audits techniques. **Les décisions déjà prises n'y figurent pas.**

Trois niveaux : **⛔ bloquant** — empêche une publication ou une signature ;
**⚠ à trancher** — n'empêche pas, mais laisse un texte imprécis ;
**○ à documenter** — la décision est prise, il manque la pièce.

---

## A. Bloquants pour la politique de confidentialité

| # | Décision | Pourquoi |
|---|---|---|
**⛔ A-1** | **Fixer une durée de conservation** des mesures et des extraits de réponse, **et la mettre en œuvre** | Aucune purge n'existe ; les plus anciens enregistrements datent de mai 2026. Un texte ne peut décrire que ce qui est configuré |
**⛔ A-2** | **Qualifier les rôles** responsable de traitement / sous-traitant entre l'association et l'exploitant de l'infrastructure | Détermine qui répond des demandes, et si un accord de sous-traitance est requis |
**⛔ A-3** | **Arrêter la base juridique** de chaque traitement | Sept traitements sont décrits ; aucun n'a de base confirmée |
**⛔ A-4** | **Obtenir le DPA Infomaniak** au nom de l'association | Rectification du compte **demandée le 2026-11-01**. Sans elle, le sous-traitant principal n'est pas contractualisé avec la bonne entité |
**⛔ A-5** | **Établir ce qu'Infomaniak conserve** du contenu envoyé à son service d'IA | **Seul point où du contenu client sort de nos machines**, et non vérifiable depuis nos systèmes |

## B. Bloquants pour les CGU

| # | Décision | Pourquoi |
|---|---|---|
**○ B-1** | ~~Mécanisme d'acceptation~~ — **arrêté le 2026-11-01** : acte écrit explicite préalable à la délivrance de l'accès, version épinglée par **empreinte SHA-256**. Voir [acceptation des CGU](ACCEPTATION_CGU.md) | **Reste à publier le texte** pour que le mécanisme devienne utilisable — l'outil refuse toute acceptation tant que c'est un projet |
**⛔ B-2** | **Clause de limitation de responsabilité** | La gratuité et le cadre scientifique **n'exonèrent pas de plein droit** en droit français |
**⚠ B-3** | **Consommateurs admis ou exclus ?** | Une fiche publique de plugin rend le service visible du grand public. Conditionne le droit de la consommation |
**⚠ B-4** | **Identifiants individuels, ou maintien d'un accès partagé ?** | Aujourd'hui : aucune attribution, aucune suspension individuelle. Les CGU l'énoncent ; il reste à décider si cela change |
**⚠ B-5** | **Politique de citation** du service par un participant | Accord préalable systématique, ou politique standardisée |
**⚠ B-6** | **Préavis** de modification des CGU | — |
**⚠ B-7** | **Juridiction compétente**, et articulation avec un hébergement suisse | — |

## C. Bloquants pour la licence d'exploitation

| # | Décision | Pourquoi |
|---|---|---|
**⛔ C-1** | **Établir l'annexe de périmètre** | Sans elle, l'objet de la licence est **indéterminé** et la convention ne peut pas être signée |
**○ C-2** | ~~Lire les statuts~~ — **fait le 2026-11-01**. Représentation : **Président seul** (art. 8). Organe compétent : **le bureau** (art. 8). **Aucune procédure de conflit d'intérêts** n'existe dans les statuts | Reste à **vérifier que le mandat du bureau est en cours** à la date de signature |
**⚠ C-3** | **Traiter le conflit d'intérêts** — procédure **proposée** : délibération du bureau sans le Président, puis mandat spécial ou signature présidentielle. Reste à **trancher la voie** et à **tenir la réunion** | [modèle de procès-verbal](PV_BUREAU_LICENCE_MODELE.md) |
**⚠ C-4** | **Gratuit ou onéreux**, et documentation au regard de la gestion désintéressée | — |
**⚠ C-5** | **Durée et territoire** | — |
**⚠ C-6** | **Droits sur la marque** et étendue de l'usage concédé | — |
**⚠ C-9** | **Périmètre statutaire plus étroit que l'exploitation réelle** : l'article 11 vise la « diffusion scientifique », pas l'hébergement d'un service. La convention le couvre explicitement — à **confirmer par un conseil** | statuts, art. 11 |
**○ C-10** | **Règlement intérieur** — l'article 13 permet au bureau d'en adopter un ; ce serait le véhicule de la durée de conservation et de la politique d'acceptation | aucun n'existe |
**⚠ C-7** | **Contributions de tiers** au code concédé | Une contribution non identifiée est un droit non concédé |
**○ C-8** | **Dater l'exploitation déjà engagée** (service en ligne depuis le 2026-10-25) | La licence la couvre rétroactivement ; il faut la date |

## D. Décisions techniques qui conditionnent un texte

| # | Décision | Pourquoi |
|---|---|---|
**⛔ D-1** | **Licence du dépôt** — aucun fichier `LICENSE`, dépôt public | Public sans licence = **tous droits réservés**. Ni ouvert, ni clairement fermé |
**⚠ D-2** | **Rotation des journaux** de conteneurs et du journal système | Sans elle, aucune durée ne peut être annoncée pour ces journaux |
**⚠ D-3** | **Publication éventuelle de l'image** de conteneur | Déclencherait les obligations **GPL-2.0** d'un composant embarqué. À trancher **avant**, pas après |
**⚠ D-4** | **Personnel habilité** — qui accède aux mesures, selon quelle règle | — |
**○ D-5** | **Capacité `suspect_phrases` conservée** — décision prise | La politique de confidentialité doit donc la **décrire franchement**, ce qu'elle fait |

---

## Ordre d'attaque recommandé

**Ce qui débloque le plus pour le moins d'effort :**

1. ~~**B-1** — le mécanisme d'acceptation~~ — **fait.** Il ne reste qu'à
   **publier les CGU** : le mécanisme est prêt et refuse de s'exécuter sur un
   projet.
2. ~~**C-2** — lire les statuts~~ — **fait.** Il reste à **tenir la réunion
   du bureau** (C-3) : une séance, un procès-verbal, et la signature est
   débloquée.
3. **A-1** — fixer puis appliquer une durée de conservation. C'est le seul
   bloquant de la politique qui dépende entièrement de nous.
4. **A-4 / A-5** — déjà engagés auprès d'Infomaniak ; à relancer.
5. **C-1** — l'annexe, qui demande un vrai travail d'inventaire.

**Ce qui ne bloque rien aujourd'hui** mais coûtera cher plus tard : **D-3**, à
trancher avant toute publication d'image, et **D-1**, qui décide si le projet
est compatible avec une ouverture ultérieure.

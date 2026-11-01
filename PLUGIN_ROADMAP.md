# Feuille de route — plugin NeoMundi

**Écrit le 2026-11-01**, sur `origin/main` à `0e06d5c`, version `0.3.0-rc.1`.

Classement **P0 / P1 / P2**. Chaque entrée dit ce qu'elle coûte et qui peut la
lever. Les états viennent de [l'analyse d'écarts](PLUGIN_GAP_ANALYSIS.md) ; les
principes viennent de [l'architecture](PLUGIN_ARCHITECTURE.md).

**Priorité absolue : un premier plugin privé fonctionnel dans ChatGPT, avant
toute publication publique.**

---

## P0 — le plus petit plugin privé réellement testable

L'objectif de ce palier n'est pas d'être publiable. Il est d'être **installé et
appelé une fois**, avec des résultats fidèles.

| # | Tâche | Coût | Qui |
|---|---|---|---|
**P0-1** | ~~Accepter un `Host` hébergé~~ — **fait cette passe**, opt-in explicite, défaut inchangé, 9 tests | aucun | — |
**P0-2** | ~~`title` d'outil, `shortDescription` sous la limite, `websiteURL`~~ — **fait cette passe** | aucun | — |
**P0-3** | **Trancher le modèle d'authentification** : `M-1` (clé de l'utilisateur, local) ou `M-3` (hébergé, OAuth). Tout le reste en dépend | une décision | **Sébastien** |
**P0-4** | **Exécuter MCP Inspector** contre le serveur local et consigner ce qu'il voit. Jamais fait ; sans réseau, sans quota, sans décision | une session | — |
**P0-5** | **Déclarer `auth` dans `mcp.json`** (`extensions["com.openai"].auth`), une fois P0-3 tranché | une session | — |
**P0-6** | **Établir l'imbrication de `extensions.com.openai`** sur le schéma officiel — `interface` ou champs à plat. Les deux ne peuvent être vraies | une session | — |
**P0-7** | **Rédiger la procédure de connexion à ChatGPT**, sans secret, et la vérifier en l'exécutant | une session | — |
**P0-8** | **Exemple de configuration sans secret** — `.env.example` existe ; le compléter pour la forme retenue en P0-3 | une session | — |

**P0-3 est la seule entrée bloquante de ce palier.** Les autres sont des
tâches ; celle-là est un arbitrage, et elle décide si le premier plugin privé
est local (atteignable tout de suite, sans infrastructure) ou hébergé
(atteignable depuis ChatGPT, mais derrière G-1 et G-2).

Recommandation, et c'est une recommandation et non une décision : **commencer
par `M-1`**, plugin local Codex/stdio avec la clé de l'utilisateur. Il est
compatible avec les scénarios propriétaire **et** ouvert, ne demande aucune
infrastructure, ne fait porter aucune facture à NeoMundi, et n'engage aucune
décision irréversible. Il ne donne pas un connecteur ChatGPT hébergé — c'est le
prix, et il est explicite.

---

## P1 — ce qu'exige un connecteur hébergé joignable depuis ChatGPT

À n'entamer qu'après P0-3, et seulement si la réponse est `M-3`.

| # | Tâche | Coût | Qui |
|---|---|---|---|
**P1-1** | **Point d'entrée HTTPS public** : domaine, terminaison TLS, déploiement. Le code l'accepte désormais ; rien n'existe autour | infrastructure, **facturé** | **Sébastien** autorise ; l'agent ne déploie pas |
**P1-2** | **Identité par utilisateur et clé NeoMundi par utilisateur** — OAuth 2.1, émission, révocation, périmètres. La plus grosse pièce non construite | lourd | **Sébastien** |
**P1-3** | **Attribution d'usage** : savoir quel appel a été facturé à qui, et répondre « mon appel est-il passé ? » après un 5xx, sans jamais relancer | moyen | — |
**P1-4** | **Limitation de débit par utilisateur** — impossible avant P1-2, faute d'identité sur quoi la poser | faible après P1-2 | — |
**P1-5** | **Décider ce qui est journalisé.** Rien ne l'est aujourd'hui, délibérément ; la plateforme demande des journaux d'échec. Chaque champ est une décision de confidentialité | une décision | **Sébastien** |
**P1-6** | **Qualification juridique du rôle de traitement.** Hébergé, le connecteur voit prompts, réponses et documents en transit | hors technique | **Sébastien** |
**P1-7** | **Épingler la base Docker par digest** — la ligne est préparée, non renseignée. Sans elle, une construction ne vaut pas preuve | une session | — |
**P1-8** | **Qualifier `0.3.0-rc.1` en production** — porte de release ; le backend doit d'abord publier métadonnées et schémas | dépend du backend | — |

---

## P2 — publication, et seulement après

Rien ici n'est entamable avant que P1 soit tenu : la revue refuse
explicitement un point d'entrée local ou de test.

| # | Tâche | Qui |
|---|---|---|
**P2-1** | `privacyPolicyURL` et `termsOfServiceURL` — **inexistantes**, et la politique doit couvrir ce que l'enveloppe retourne réellement | **Sébastien** |
**P2-2** | Vérification d'identité de l'organisation sur le tableau de bord OpenAI | **Sébastien** |
**P2-3** | Défi de vérification de domaine | — |
**P2-4** | Icône carrée ≥ 48×48, captures d'écran | — |
**P2-5** | Cinq cas de test positifs, **trois négatifs** — où le plugin doit refuser | — |
**P2-6** | Vidéo de démonstration et URL accessible au relecteur | — |
**P2-7** | Compte de test sans MFA, utilisable immédiatement | dépend de P1-2 |
**P2-8** | Notes de version, attestations de politique | — |
**P2-9** | **La décision de publier.** Le registre dit que la conformité de contrat n'est pas établie et que `LIVE_API_VALIDATED` n'est pas accordé. Publier un connecteur de mesure dans cet état est une décision sur ce que NeoMundi accepte d'affirmer | **Sébastien** |

**P2-5 mérite une note.** Les trois cas négatifs ne sont pas une formalité :
ils sont l'endroit où ce connecteur est plus défendable que la moyenne. Un
`ALLOW` décidé sans aucun contrôle, une version divergente non comparable, une
erreur amont qui n'est pas une mesure — chacun est déjà couvert par un test et
fait un excellent cas négatif.

---

## Ordre de dépendance

```
P0-3  modèle d'authentification  ──┬── M-1 ─→ P0-5..P0-8 ─→ plugin privé local  ✔ testable
  (seul vrai blocage)              │
                                   └── M-3 ─→ P1-1 HTTPS ─→ P1-2 identité ─→ P1-3..P1-6
                                                                      │
                                                                      ▼
                                                            P2 · publication
P0-4  MCP Inspector ─ indépendant, sans coût, à faire maintenant
P1-8  qualification 0.3.0-rc.1 ─ dépend du backend, parallèle
```

---

## Ce qu'il ne faut pas faire

- **Ne pas déployer** sur une infrastructure Infomaniak ou autre sans
  autorisation explicite et distincte, sur un SHA. Une PR, une CI verte ou une
  fusion n'autorise pas la production.
- **Ne pas émettre d'appel facturé** — API hébergée ou fournisseur — sans
  autorisation.
- **Ne pas publier** les enregistrements pour verdir un compte de tests
  en CI : c'est exactement ce qu'il ne faut pas faire.
- **Ne pas exposer** la génération, les séries longitudinales ou un agrégat
  dans un premier plugin.
- **Ne pas inventer** une URL de politique, une provenance ou un palier de
  clé pour satisfaire un formulaire.

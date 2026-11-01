# Identité visuelle du plugin

## Ce que contient ce dossier

`icon-512.png`, `icon-256.png`, `icon-128.png`, `icon-48.png` — l'icône de
référencement du plugin, carrée, fond blanc opaque, marque noire.

## D'où elle vient

Elle n'est pas dessinée pour l'occasion : elle est **dérivée de la marque
NeoMundi existante**, le signe dit *control tower*, conservé hors de ce dépôt
dans les actifs de marque (`BRAND/logo/source/logo-neomundi.png`,
SHA-256 commençant par `ace70e9b13612b20`, 632×630, RGBA opaque).

Transformation appliquée, et rien d'autre :

1. **détourage** du trait réel — tout pixel de luminance < 245 — soit la boîte
   `(89, 25) → (525, 606)`, donc un signe de 436×581 ;
2. **mise au carré par remplissage**, jamais par étirement : le signe est
   centré sur un canevas blanc de 673×673, ce qui laisse une marge de 8 %
   autour du trait ;
3. **rééchantillonnage** Lanczos vers 512, 256, 128 et 48 pixels.

Les proportions de la marque sont donc **inchangées**. Aucun recadrage
asymétrique, aucune couleur ajoutée, aucun effet.

## Pourquoi monochrome

La fondation de marque est explicite : le signe est monochrome, à trait quasi
constant, et **la marque n'a pas besoin d'une couleur pour exister**. La
couleur d'accent n'est pas arrêtée, et les couleurs d'état ne sont pas des
couleurs de marque. Une icône colorée aurait donc tranché, ici, une décision
d'identité qui n'est pas tranchée.

## Pourquoi pas de feu tricolore, nulle part

La même règle gouverne la carte de mesure (`runtime/ui/card.mjs`). Un pastille
verte sur un `ALLOW` décidé **sans aucun contrôle** serait exactement le
mensonge que cette carte existe pour empêcher — et ce cas est réel, enregistré
et testé. Les conditions sont donc énoncées **en mots**, avec du poids
typographique, jamais par une couleur de risque.

## Reproduire

Les PNG sont versionnés plutôt que générés à la construction : ce dépôt n'a
**aucune dépendance d'exécution** et n'en acquiert pas une pour redimensionner
une image. La transformation ci-dessus est décrite assez précisément pour être
refaite à l'identique avec n'importe quel outil d'image, à partir du fichier
source nommé plus haut.

## Ce qui manque encore pour un référencement public

Une **capture d'écran** de la carte est demandée par la procédure de
soumission. Elle n'est pas ici, et elle devra être produite à partir d'une
charge **synthétique**, pas d'un enregistrement réel : les réponses
enregistrées sont des données d'exécution tenues hors de ce dépôt, et une
capture les y ferait entrer par l'image.

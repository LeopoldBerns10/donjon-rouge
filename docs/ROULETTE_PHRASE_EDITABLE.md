# Roulette — Phrase de seuil éditable + style
## Site web Donjon Rouge (frontend + backend)

---

## ⚠️ RÈGLES AVANT DE COMMENCER
- Inspecter le composant Roulette et sa config admin existante avant modification
- NE RIEN TOUCHER d'autre sur la roulette (compteur, historique, suppression, cooldown, style déjà fait précédemment) — uniquement la phrase "Le 100ème joueur à tourner la roulette remporte le lot !" visible sous le titre

---

## Contexte (voir capture d'écran)
Actuellement affiché en dur : "Le 100ème joueur à tourner la roulette remporte le lot !" — Alan veut pouvoir écrire lui-même cette phrase (comme pour le lot "Pass Or" et "Offert par CyberAlf" déjà personnalisables), et il trouve le style actuel de cette ligne pas assez soigné.

## À faire
1. Trouve où cette phrase est actuellement définie (probablement hardcodée dans le composant Roulette, ou déjà partiellement dynamique via le nombre cible)
2. Rends-la éditable : ajoute un champ dans la config admin de la roulette (même endroit que le lot/gift_desc déjà configurable) pour qu'Alan puisse écrire sa propre phrase librement (stockage Supabase, probablement dans la même table que `gift_desc`/`target_clicks`)
3. Améliore le style visuel de cette ligne uniquement (actuellement discret/gris) pour qu'elle ressorte mieux dans la charte DR (ex: couleur or/rouge légère, meilleure taille de police, éventuellement en italique) — sans toucher au reste des éléments de la roulette

## Récap attendu
Fichiers modifiés, où saisir la nouvelle phrase (quel endroit du panel admin), style appliqué.

# Ajustements visuels rapides — Roulette + Journal
## Site web Donjon Rouge (frontend)

---

## ⚠️ RÈGLES AVANT DE COMMENCER
- Inspecter la page vitrine actuelle avant modification (structure des sections roulette et journal public)
- Ne rien casser dans la logique fonctionnelle de la roulette (cooldown, compteur, historique) ni du journal — uniquement du visuel/positionnement

---

## 1. Amélioration du style visuel de la roulette
Objectif ouvert : Alan trouve le style actuel perfectible. Claude Code doit proposer 1-2 pistes d'amélioration visuelle cohérentes avec la charte graphique Donjon Rouge (rouge/noir/or, effet 3D, ombres portées) plutôt que d'inventer un style complètement différent. Présenter les pistes avant d'appliquer si plusieurs options sont possibles, sinon appliquer directement si l'amélioration est évidente et sans risque (ex: meilleur contraste, animation plus fluide, meilleure lisibilité du compteur).

## 2. Repositionner le journal public au-dessus de la roulette
Actuellement le journal public est positionné en dessous de la roulette sur la page. Inverser l'ordre d'affichage : journal public en premier, roulette en dessous. Uniquement un changement d'ordre dans le JSX/layout, aucune logique à toucher.

---

## Récap attendu
Fichier(s) modifié(s), captures des choix de style si plusieurs pistes proposées pour la roulette, confirmation que l'ordre journal/roulette est bien inversé.

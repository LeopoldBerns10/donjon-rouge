# Vue Performance superadmin
## Site web Donjon Rouge (backend + frontend)

---

## ⚠️ RÈGLES AVANT DE COMMENCER
- Inspecter member_participation avant de coder (colonnes exactes disponibles)
- Ne rien casser dans l'existant (/api/members/me/performance, Admin.jsx déjà modifié pour le bouton scan)

---

## Objectif
Ajouter une vue "Performance" dans le panel superadmin, avec :
1. **Classement global** — tous les membres, toutes les données de member_participation (participation, %, double perf, etc.), depuis toujours
2. **Fiche détaillée par membre** — clic sur un membre du classement → détail complet de ses stats

## À faire
1. Nouvel endpoint backend (ex: GET /api/admin/performance) qui agrège member_participation par membre, toutes colonnes disponibles, aucun filtre de date
2. Nouvel endpoint détail (ex: GET /api/admin/performance/:coc_tag) pour la fiche individuelle
3. Nouvelle page/section frontend dans Admin.jsx (ou composant dédié) : tableau classement triable, clic → modal ou sous-page avec le détail
4. Respecter le style existant du panel superadmin (charte DR)

## Récap attendu
Fichiers créés/modifiés, structure exacte des données retournées, confirmation que ça n'impacte pas /api/members/me/performance existant.

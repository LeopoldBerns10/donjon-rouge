# FIX 2 — LDC page Guilde : DR2 affiche la guerre de DR1

## Contexte
Sur la page `/guilde` (`frontend/src/pages/Guilde.jsx` ou composant associé), l'onglet DR2 dans la section "LIGUE DE GUERRE DE CLANS (LDC)" affiche les données LDC de DR1 (DONJON-ROUGE #29292QPRC) au lieu de celles de DR2 (#2RCGG9YR9).

## Symptôme observé
- Onglet DR2 sélectionné
- La LDC affiche "DONJON-ROUGE" (DR1) comme clan participant
- Le clan affiché doit être DR2

## Objectif
Quand l'onglet DR2 est actif, tous les appels liés à la LDC doivent utiliser le tag DR2 : `#2RCGG9YR9`

## Instructions

### 1. Lire les fichiers concernés
- `frontend/src/pages/Guilde.jsx`
- Tout composant importé dans Guilde.jsx qui gère la section LDC (chercher "LDC", "leaguegroup", "leaguewar", "ClanWarLeague")
- La route backend concernée dans `backend/src/routes/coc.js`

### 2. Identifier le problème
- Trouver l'état qui gère l'onglet actif DR1/DR2 (ex: `activeClan`, `selectedClan`, `activeTab`)
- Trouver l'appel API pour la LDC (probablement `/api/coc/clan/leaguegroup` ou `/api/coc/leaguewar/...`)
- Vérifier si cet appel utilise le tag dynamiquement ou s'il est hardcodé sur DR1

### 3. Corriger
- L'appel API LDC doit utiliser le clan tag correspondant à l'onglet actif
- DR1 tag : `#29292QPRC` (encodé en URL : `%2329292QPRC`)
- DR2 tag : `#2RCGG9YR9` (encodé en URL : `%232RCGG9YR9`)
- Si l'appel est dans un `useEffect`, s'assurer que `activeClan` est dans les dépendances
- Si le tag est hardcodé, le remplacer par la variable dynamique

### 4. Vérifier les routes backend
- Si la route backend `/api/coc/clan/leaguegroup` accepte déjà un tag en paramètre → juste corriger l'appel frontend
- Si la route est hardcodée côté backend → créer une route avec paramètre ou modifier pour accepter le tag en query/param

### 5. Vérifier que le rechargement se fait bien
- Quand l'utilisateur bascule de DR1 à DR2, les données LDC doivent se recharger
- S'assurer que le useEffect se redéclenche lors du changement d'onglet

## Commit
```bash
git add . && git commit -m "fix: LDC guilde utilise le tag du clan actif DR1/DR2" && git push origin main
```

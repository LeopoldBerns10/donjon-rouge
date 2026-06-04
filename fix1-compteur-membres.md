# FIX 1 — Compteur membres Home.jsx

## Contexte
Sur la page d'accueil (`frontend/src/pages/Home.jsx`), il y a un compteur de membres affiché sur le bouclier central qui affiche actuellement le nombre de membres DR1 avec "/50 MEMBRES" en dessous.

## Objectif
- Afficher le **total des membres DR1 + DR2** (sans "/50")
- Garder exactement le même style visuel : juste le nombre + "MEMBRES" dessous
- Ne pas changer la mise en page ni le design

## Instructions

### 1. Lire le fichier
Lire `frontend/src/pages/Home.jsx` en entier.

### 2. Analyser le chargement des données
- Identifier comment les données clan DR1 et DR2 sont chargées (appels API, state, useEffect)
- Repérer où le compteur de membres est actuellement rendu (chercher "50", "/50", "MEMBRES", `memberCount`, `members`)

### 3. Modifier le compteur
- Actuellement le compteur affiche quelque chose comme `{memberCount}/50` ou `{dr1Members}/50`
- Le remplacer par `{totalMembers}` où `totalMembers = (membres DR1) + (membres DR2)`
- Le label "MEMBRES" en dessous reste inchangé
- Supprimer le "/50"

### 4. Calculer le total
- Si les deux counts sont déjà disponibles dans le state, les additionner directement
- Si seulement DR1 est chargé, chercher où DR2 est chargé et utiliser son memberCount aussi
- Utiliser les champs `memberList.length` ou `members` ou `memberCount` selon ce qui existe dans le state

### 5. Vérifier
- S'assurer que la valeur affichée est un nombre valide (pas NaN, pas undefined)
- Utiliser `(dr1Count || 0) + (dr2Count || 0)` pour éviter les erreurs si une guilde ne charge pas

## Commit
```bash
git add . && git commit -m "fix: compteur membres home = total DR1+DR2 sans /50" && git push origin main
```

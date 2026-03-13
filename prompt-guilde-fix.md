# 🏰 Prompt Claude Code — Donjon Rouge
## Modifications page `Guilde.jsx`

---

## CHANGEMENT 1 — Fusionner les onglets Guerre et CWL en un seul onglet "GDC/LDC"

Dans le tableau `TABS`, supprime les entrées `guerre` et `cwl` et remplace-les par une seule entrée :

```js
{ key: 'gdcldc', label: 'GDC/LDC' }
```

Crée un nouveau composant `GdcLdcTab` qui affiche :

- **En haut** : le contenu actuel de `GuerreTab` (guerre classique en cours)
- **Séparateur** : `<div className="my-8 border-t border-fog/30" />`
- **En bas** : une section avec le titre `⚔️ Ligue des Clans (LDC)` contenant le contenu actuel de `CwlTab`
- Si la CWL retourne `state === 'notInWar'` ou une erreur → afficher simplement :
  ```jsx
  <p className="text-ash font-cinzel text-sm text-center py-4">Aucune LDC en cours</p>
  ```

Les deux sections sont **toujours visibles** même si l'une est inactive.

Supprime les composants `GuerreTab` et `CwlTab`, remplace par `GdcLdcTab`.

Dans le render principal, remplace :
```jsx
{tab === 'guerre' && <GuerreTab ... />}
{tab === 'cwl'    && <CwlTab ... />}
```
par :
```jsx
{tab === 'gdcldc' && <GdcLdcTab loading={false} error={null} />}
```

---

## CHANGEMENT 2 — Supprimer le tri par Trophées dans l'onglet Membres

Dans le tableau `MEMBRE_SORTS`, supprime uniquement cette ligne :

```js
{ key: 'trophies', label: 'Trophées' },
```

Ne touche à rien d'autre dans ce composant.

---

## CHANGEMENT 3 — Corriger l'onglet Attaques (attackWins et defenseWins affichés à 0)

**Cause du bug** : `useCocMembers()` appelle `/api/coc/clan/members` qui retourne la liste basique du clan — cette endpoint ne contient pas les champs `attackWins` et `defenseWins`. Ces champs viennent du profil individuel de chaque joueur.

**Fix côté backend** — dans `backend/src/controllers/cocController.js` (ou le fichier qui gère `GET /api/coc/clan/members`) :

Après avoir récupéré la liste des membres via `getClanMembers()`, enrichis chaque membre avec `attackWins` et `defenseWins` en appelant `getPlayerInfo(member.tag)` pour tous les membres **en parallèle** :

```js
const enriched = await Promise.all(
  members.map(async (m) => {
    try {
      const player = await getPlayerInfo(m.tag) // utilise le cache Supabase
      return {
        ...m,
        attackWins: player.attackWins ?? 0,
        defenseWins: player.defenseWins ?? 0,
      }
    } catch {
      return { ...m, attackWins: 0, defenseWins: 0 }
    }
  })
)
```

⚠️ **Important** : utilise `cacheService` pour chaque appel `getPlayerInfo` afin de ne pas dépasser les limites de l'API CoC. Le cache Supabase (`coc_stats_cache`) est déjà en place pour ça.

---

---

## DÉPLOIEMENT — Push GitHub

Une fois tous les changements effectués, exécute les commandes suivantes pour pousser sur GitHub et déclencher le déploiement automatique sur Render :

```bash
git add .
git commit -m "feat(guilde): fusion GDC/LDC, suppression tri trophées, fix attackWins"
git push origin main
```

---

*Donjon Rouge — Clan #29292QPRC*

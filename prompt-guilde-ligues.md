# 🏰 Prompt Claude Code — Donjon Rouge
## Suppression onglet "Ligues" dans `Guilde.jsx`

---

Dans le tableau `TABS`, supprime l'entrée :
```js
{ key: 'ligues', label: 'Ligues' }
```

Supprime le composant `LiguesTab` en entier.

Dans le render principal, supprime la ligne :
```jsx
{tab === 'ligues' && <LiguesTab members={members} loading={membersLoading} error={membersError} />}
```

Ne touche à rien d'autre dans ce fichier.

---

## DÉPLOIEMENT — Push GitHub

```bash
git add .
git commit -m "fix(guilde): suppression onglet Ligues"
git push origin master
```

---

*Donjon Rouge — Clan #29292QPRC*

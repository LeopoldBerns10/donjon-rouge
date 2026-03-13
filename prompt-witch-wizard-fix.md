# 🏰 Prompt Claude Code — Donjon Rouge
## Fix ligues Witch et Wizard

---

## FICHIER — `frontend/src/utils/cocHelpers.js`

Dans `LEAGUE_KEY_IMAGE`, ajoute ces deux entrées manquantes :

```js
'witch':      `${LEAGUE_ASSETS}/LB_big_witch.png`,
'wizard':     `${LEAGUE_ASSETS}/LB_big_wizard.png`,
```

---

## DÉPLOIEMENT — Push GitHub

```bash
git add .
git commit -m "fix: ajout witch et wizard dans mapping ligues"
git push origin master
```

---

*Donjon Rouge — Clan #29292QPRC*

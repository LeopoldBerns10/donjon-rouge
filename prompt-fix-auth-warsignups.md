# 🏰 Prompt Claude Code — Donjon Rouge
## Fix import middleware auth dans warSignups.js

---

## FICHIER — `backend/src/routes/warSignups.js`

Remplace la ligne d'import :
```js
import { authenticate } from '../middleware/auth.js'
```

Par :
```js
import { requireAuth } from '../middleware/auth.js'
```

Puis remplace **toutes les occurrences** de `authenticate` par `requireAuth` dans ce fichier (il y en a 3 : POST, DELETE /, DELETE /reset).

---

## DÉPLOIEMENT

```bash
git add .
git commit -m "fix: import requireAuth au lieu de authenticate dans warSignups"
git push origin master
```

---

*Donjon Rouge — Clan #29292QPRC*

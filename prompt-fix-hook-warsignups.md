# 🏰 Prompt Claude Code — Donjon Rouge
## Fix : création du hook useWarSignups manquant

---

## FICHIER 1 — Crée `frontend/src/hooks/useWarSignups.js`

```js
import { useState, useEffect, useCallback } from 'react'
import api from '../lib/api.js'

export function useWarSignups() {
  const [signups, setSignups] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get('/api/war-signups')
      setSignups(r.data)
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  async function signup(war_type) {
    await api.post('/api/war-signups', { war_type })
    await refresh()
  }

  async function unsignup() {
    await api.delete('/api/war-signups')
    await refresh()
  }

  async function reset() {
    await api.delete('/api/war-signups/reset')
    await refresh()
  }

  return { signups, loading, error, signup, unsignup, reset, refresh }
}
```

---

## DÉPLOIEMENT

```bash
git add .
git commit -m "fix: création hook useWarSignups manquant"
git push origin master
```

---

*Donjon Rouge — Clan #29292QPRC*

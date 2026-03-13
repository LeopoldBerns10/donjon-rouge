# 🏰 Prompt Claude Code — Donjon Rouge
## Nouvelle feature : Tableau d'inscriptions GDC/LDC

---

## ÉTAPE 1 — Table Supabase (à créer manuellement dans Supabase SQL Editor)

Exécute ce SQL dans Supabase → SQL Editor :

```sql
CREATE TABLE war_signups (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  coc_name    text NOT NULL,
  coc_tag     text NOT NULL,
  hdv_level   int NOT NULL DEFAULT 0,
  war_type    text NOT NULL CHECK (war_type IN ('GDC', 'LDC', 'Les deux')),
  signed_at   timestamptz DEFAULT now()
);

-- Index pour éviter les doublons (un joueur = une seule inscription active)
CREATE UNIQUE INDEX war_signups_player_unique ON war_signups(player_id);

-- RLS désactivé (géré par le backend avec service key)
ALTER TABLE war_signups DISABLE ROW LEVEL SECURITY;
```

---

## ÉTAPE 2 — Backend : nouvelle route `/api/war-signups`

### Crée `backend/src/routes/warSignups.js`

```js
import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import supabase from '../lib/supabase.js'
import { getClanMembers } from '../services/cocApiService.js'

const router = Router()

// GET /api/war-signups — liste des inscrits
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('war_signups')
      .select('*')
      .order('signed_at', { ascending: true })
    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/war-signups — s'inscrire
router.post('/', authenticate, async (req, res) => {
  try {
    const { war_type } = req.body
    if (!['GDC', 'LDC', 'Les deux'].includes(war_type)) {
      return res.status(400).json({ error: 'Type de guerre invalide' })
    }

    // Récupérer les infos du joueur connecté
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, coc_name, coc_tag, coc_hdv')
      .eq('id', req.user.id)
      .single()
    if (userError || !user) return res.status(404).json({ error: 'Joueur introuvable' })

    // Upsert — si déjà inscrit, met à jour le type
    const { data, error } = await supabase
      .from('war_signups')
      .upsert({
        player_id: user.id,
        coc_name:  user.coc_name,
        coc_tag:   user.coc_tag,
        hdv_level: user.coc_hdv || 0,
        war_type,
        signed_at: new Date().toISOString()
      }, { onConflict: 'player_id' })
      .select()
      .single()
    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/war-signups — se désinscrire
router.delete('/', authenticate, async (req, res) => {
  try {
    const { error } = await supabase
      .from('war_signups')
      .delete()
      .eq('player_id', req.user.id)
    if (error) throw error
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/war-signups/reset — remise à 0 (admin ou auto)
router.delete('/reset', authenticate, async (req, res) => {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('is_admin, coc_role')
      .eq('id', req.user.id)
      .single()

    const isAllowed = user?.is_admin || ['leader', 'coLeader'].includes(user?.coc_role)
    if (!isAllowed) return res.status(403).json({ error: 'Non autorisé' })

    const { error } = await supabase.from('war_signups').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (error) throw error
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
```

### Modifie `backend/src/index.js`

Ajoute l'import :
```js
import warSignupsRoutes from './routes/warSignups.js'
```

Ajoute la route :
```js
app.use('/api/war-signups', warSignupsRoutes)
```

### Ajoute la réinitialisation automatique dans `backend/src/index.js`

Dans la fonction `initAdminAccount` ou juste après `setInterval(syncMembers, ...)`, ajoute :

```js
// Vérification toutes les heures : si guerre en cours depuis > 24h → reset inscriptions
setInterval(async () => {
  try {
    const { getClanWar } = await import('./services/cocApiService.js')
    const war = await getClanWar(process.env.COC_CLAN_TAG)
    if (war?.state === 'inWar' && war?.startTime) {
      const startTime = new Date(
        war.startTime.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/, '$1-$2-$3T$4:$5:$6Z')
      )
      const hoursSinceStart = (Date.now() - startTime.getTime()) / (1000 * 60 * 60)
      if (hoursSinceStart >= 24) {
        const { count } = await supabase
          .from('war_signups')
          .select('*', { count: 'exact', head: true })
        if (count > 0) {
          await supabase.from('war_signups').delete().neq('id', '00000000-0000-0000-0000-000000000000')
          console.log('✅ Inscriptions GDC/LDC remises à zéro (guerre > 24h)')
        }
      }
    }
  } catch (err) {
    console.error('Erreur reset war signups:', err.message)
  }
}, 60 * 60 * 1000) // toutes les heures
```

---

## ÉTAPE 3 — Frontend : hook `useWarSignups`

### Crée `frontend/src/hooks/useWarSignups.js`

```js
import { useState, useEffect, useCallback } from 'react'
import api from '../lib/api.js'

export function useWarSignups() {
  const [signups, setSignups]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  const fetch = useCallback(() => {
    setLoading(true)
    api.get('/api/war-signups')
      .then(r => setSignups(r.data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetch() }, [fetch])

  async function signup(war_type) {
    const r = await api.post('/api/war-signups', { war_type })
    fetch()
    return r.data
  }

  async function unsignup() {
    await api.delete('/api/war-signups')
    fetch()
  }

  async function reset() {
    await api.delete('/api/war-signups/reset')
    fetch()
  }

  return { signups, loading, error, signup, unsignup, reset, refresh: fetch }
}
```

---

## ÉTAPE 4 — Frontend : onglet Inscriptions dans `Guilde.jsx`

### Ajoute l'import en haut de `Guilde.jsx`

```js
import { useWarSignups } from '../hooks/useWarSignups.js'
import { useAuth } from '../hooks/useAuth.jsx'
import { getTownHallImageUrl } from '../utils/cocHelpers.js'
```

### Ajoute l'onglet dans le tableau `TABS`

```js
{ key: 'inscriptions', label: '⚔️ Inscriptions' }
```

### Ajoute le composant `InscriptionsTab` avant la fonction `Guilde()`

```jsx
function InscriptionsTab() {
  const { signups, loading, error, signup, unsignup, reset } = useWarSignups()
  const { user, isChief, isAdmin } = useAuth()
  const [warType, setWarType] = useState('GDC')

  const isSignedUp = user && signups.some(s => s.player_id === user.id)
  const canReset = isChief || isAdmin

  if (loading) return <Spinner />
  if (error) return <ErrorMsg msg={error} />

  const WAR_TYPE_COLORS = {
    'GDC':      { bg: '#6B0000', border: '#C41E3A', text: '#ff8080' },
    'LDC':      { bg: '#1a1a4e', border: '#6366f1', text: '#a5b4fc' },
    'Les deux': { bg: '#1a3a1a', border: '#22c55e', text: '#86efac' },
  }

  return (
    <div>
      {/* Header compteur */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <span className="font-cinzel text-gold-bright uppercase tracking-wider text-sm">
            ⚔️ Inscrits pour la prochaine guerre
          </span>
          <span className="font-cinzel text-gold-light font-bold text-lg">
            {signups.length}
          </span>
        </div>
        {canReset && signups.length > 0 && (
          <button
            onClick={() => window.confirm('Remettre les inscriptions à zéro ?') && reset()}
            className="px-3 py-1 text-xs font-cinzel uppercase tracking-wider rounded border border-crimson text-crimson hover:bg-crimson/20 transition-all"
          >
            🔄 Remettre à zéro
          </button>
        )}
      </div>

      {/* Bouton inscription si connecté */}
      {user ? (
        <div className="card-stone p-4 mb-6">
          {!isSignedUp ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-bone font-cinzel text-sm">Disponible pour :</span>
              {['GDC', 'LDC', 'Les deux'].map(type => (
                <button
                  key={type}
                  onClick={() => setWarType(type)}
                  className="px-3 py-1 text-xs font-cinzel uppercase tracking-wider rounded border transition-all"
                  style={warType === type
                    ? { background: WAR_TYPE_COLORS[type].bg, borderColor: WAR_TYPE_COLORS[type].border, color: WAR_TYPE_COLORS[type].text }
                    : { borderColor: '#333', color: '#777' }
                  }
                >
                  {type}
                </button>
              ))}
              <button
                onClick={() => signup(warType)}
                className="px-4 py-1.5 text-xs font-cinzel uppercase tracking-wider rounded text-bone transition-all ml-auto"
                style={{ background: 'linear-gradient(135deg, #6B0000, #C41E3A)' }}
              >
                ✅ S'inscrire
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between flex-wrap gap-3">
              <span className="text-green-400 font-cinzel text-sm">
                ✅ Tu es inscrit(e) — {signups.find(s => s.player_id === user.id)?.war_type}
              </span>
              <button
                onClick={unsignup}
                className="px-3 py-1 text-xs font-cinzel uppercase tracking-wider rounded border border-fog/40 text-ash hover:text-bone transition-all"
              >
                Se désinscrire
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="card-stone p-4 mb-6 text-center">
          <p className="text-ash font-cinzel text-sm">Connecte-toi pour t'inscrire</p>
        </div>
      )}

      {/* Tableau des inscrits */}
      {signups.length === 0 ? (
        <p className="text-ash font-cinzel text-center py-10">
          Aucune inscription pour le moment
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-fog/30">
          <table className="w-full text-sm">
            <TableHeader cols={[
              { label: '#',          center: true },
              { label: 'Joueur',     center: false },
              { label: 'HDV',        center: true },
              { label: 'Type',       center: true },
              { label: 'Inscrit le', center: true, hidden: 'hidden md:table-cell' },
            ]} />
            <tbody>
              {signups.map((s, i) => {
                const colors = WAR_TYPE_COLORS[s.war_type] || WAR_TYPE_COLORS['GDC']
                return (
                  <tr key={s.id} className="border-b border-fog/20"
                    style={{ background: i % 2 === 0 ? '#0d0d0d' : '#111' }}>
                    <td className="py-2.5 px-3 text-center text-ash text-xs font-cinzel">{i + 1}</td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className="relative flex-shrink-0 w-8 h-8">
                          <img
                            src={getTownHallImageUrl(s.hdv_level)}
                            alt={`HDV${s.hdv_level}`}
                            className="w-8 h-8 object-contain"
                            onError={(e) => { e.target.style.display = 'none' }}
                          />
                          <span className="absolute -bottom-1 -right-1 font-bold text-white rounded"
                            style={{ background: '#C41E3A', fontSize: '9px', padding: '0 2px' }}>
                            {s.hdv_level}
                          </span>
                        </div>
                        <div>
                          <div className="font-semibold text-bone text-sm">{s.coc_name}</div>
                          <div className="text-xs text-ash/60">{s.coc_tag}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="text-xs font-bold text-white px-1.5 py-0.5 rounded"
                        style={{ background: '#C41E3A' }}>
                        {s.hdv_level}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="text-xs font-cinzel font-bold uppercase px-2 py-0.5 rounded border"
                        style={{ borderColor: colors.border, color: colors.text, background: colors.bg }}>
                        {s.war_type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center text-ash text-xs hidden md:table-cell">
                      {new Date(s.signed_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

### Dans le render principal de `Guilde()`, ajoute :

```jsx
{tab === 'inscriptions' && <InscriptionsTab />}
```

---

## ÉTAPE 5 — Frontend : bouton raccourci sur `Home.jsx`

Dans la section des boutons CTA de `Home.jsx`, ajoute un bouton :

```jsx
<Link
  to="/guilde"
  onClick={() => setTimeout(() => {
    // Déclenche l'onglet inscriptions après navigation
    window.dispatchEvent(new CustomEvent('open-war-signups'))
  }, 300)}
  className="px-6 py-3 font-cinzel uppercase tracking-wider text-sm rounded border border-crimson text-crimson hover:bg-crimson/20 transition-all"
>
  ⚔️ Inscriptions GDC/LDC
</Link>
```

Et dans `Guilde.jsx`, ajoute un `useEffect` pour écouter cet event :

```js
useEffect(() => {
  const handler = () => setTab('inscriptions')
  window.addEventListener('open-war-signups', handler)
  return () => window.removeEventListener('open-war-signups', handler)
}, [])
```

---

## DÉPLOIEMENT — Push GitHub

```bash
git add .
git commit -m "feat: tableau inscriptions GDC/LDC avec reset automatique après guerre"
git push origin master
```

---

⚠️ **Ne pas oublier** : exécuter le SQL de l'étape 1 dans Supabase avant de déployer !

---

*Donjon Rouge — Clan #29292QPRC*

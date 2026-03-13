# 🏰 Prompt Claude Code — Donjon Rouge
## Fix : simplification war-signups sans HDV

---

## FICHIER 1 — `backend/src/routes/warSignups.js`

Remplace entièrement le fichier par :

```js
import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import supabase from '../lib/supabase.js'

const router = Router()

// GET /api/war-signups
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

// POST /api/war-signups
router.post('/', requireAuth, async (req, res) => {
  try {
    const { war_type } = req.body
    if (!['GDC', 'LDC', 'Les deux'].includes(war_type)) {
      return res.status(400).json({ error: 'Type de guerre invalide' })
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, coc_name, coc_tag')
      .eq('id', req.user.userId)
      .single()
    if (userError || !user) return res.status(404).json({ error: 'Joueur introuvable' })

    const { data, error } = await supabase
      .from('war_signups')
      .upsert({
        player_id: user.id,
        coc_name:  user.coc_name,
        coc_tag:   user.coc_tag,
        hdv_level: 0,
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

// DELETE /api/war-signups
router.delete('/', requireAuth, async (req, res) => {
  try {
    const { error } = await supabase
      .from('war_signups')
      .delete()
      .eq('player_id', req.user.userId)
    if (error) throw error
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/war-signups/reset
router.delete('/reset', requireAuth, async (req, res) => {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('is_admin, coc_role')
      .eq('id', req.user.userId)
      .single()

    const isAllowed = user?.is_admin || ['leader', 'coLeader'].includes(user?.coc_role)
    if (!isAllowed) return res.status(403).json({ error: 'Non autorisé' })

    const { error } = await supabase
      .from('war_signups')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
    if (error) throw error
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
```

---

## FICHIER 2 — Dans `Guilde.jsx`, simplifie le tableau `InscriptionsTab`

Supprime toutes les colonnes HDV et les images de town hall. Le tableau affiche uniquement :
- **#** (numéro)
- **Joueur** (nom + tag)
- **Type** (GDC / LDC / Les deux)
- **Inscrit le** (date/heure)

---

## DÉPLOIEMENT

```bash
git add .
git commit -m "fix: simplification war-signups sans HDV"
git push origin master
```

---

*Donjon Rouge — Clan #29292QPRC*

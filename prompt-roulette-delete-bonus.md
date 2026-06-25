# PROMPT — Roulette : Reset Complet + Bouton x2 CyberAlf

## CONTEXTE
2 nouvelles fonctionnalités pour CyberAlf uniquement.
NE PAS toucher à la logique des clics ni aux segments.

---

## FONCTIONNALITÉ 1 — RESET COMPLET (supprimer la roulette)

CyberAlf doit pouvoir supprimer complètement l'event actif
et revenir à l'état "pas de roulette" (bouton relancer visible).

### Backend — route POST /api/roulette/delete
```javascript
router.post('/delete', verifyToken, async (req, res) => {
  if (req.user.coc_name !== 'CyberAlf' && req.user.site_role !== 'superadmin') {
    return res.status(403).json({ error: 'Réservé à CyberAlf' })
  }

  // Désactiver tous les events actifs
  const { error } = await supabase
    .from('roulette_events')
    .update({ is_active: false })
    .eq('is_active', true)

  if (error) return res.status(500).json({ error: error.message })
  return res.json({ success: true })
})
```

### Frontend — bouton dans Roulette.jsx
Ajouter un bouton "🗑️ Supprimer la roulette" visible
uniquement pour CyberAlf/superadmin, avec confirmation :

```jsx
{isCyberAlf && event?.active && (
  <button
    onClick={() => setShowDeleteConfirm(true)}
    className="mt-2 px-4 py-2 rounded-xl text-xs font-bold uppercase
               border border-red-900/40 text-red-500/60
               hover:border-red-600 hover:text-red-400
               transition-all duration-200">
    🗑️ Supprimer la roulette
  </button>
)}

{/* Modal confirmation suppression */}
{showDeleteConfirm && createPortal(
  <div className="fixed inset-0 bg-black/85 z-[99999]
                  flex items-center justify-center p-4"
       onClick={() => setShowDeleteConfirm(false)}>
    <div className="bg-[#111111] border border-red-900/50 rounded-2xl
                    p-6 w-full max-w-sm shadow-2xl"
         onClick={e => e.stopPropagation()}>
      <h3 className="text-base font-bold text-white uppercase mb-2">
        ⚠️ Supprimer la roulette ?
      </h3>
      <p className="text-sm text-gray-400 mb-4">
        L'event sera supprimé et la roulette disparaîtra du site.
        Tu pourras en relancer une nouvelle quand tu veux.
      </p>
      <div className="flex gap-3">
        <button onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-[#333]
                           text-gray-400 text-sm font-semibold uppercase">
          Annuler
        </button>
        <button onClick={handleDelete}
                className="flex-1 py-2.5 rounded-xl bg-red-800
                           text-white text-sm font-semibold uppercase
                           hover:bg-red-700 transition-colors">
          Supprimer
        </button>
      </div>
    </div>
  </div>,
  document.body
)}
```

### handleDelete dans Roulette.jsx
```javascript
const handleDelete = async () => {
  await fetch('/api/roulette/delete', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  })
  setShowDeleteConfirm(false)
  fetchEvent() // Refresh → event = null → bouton "Lancer un event" apparaît
}
```

---

## FONCTIONNALITÉ 2 — BOUTON X2 GARANTI (CyberAlf only)

CyberAlf peut offrir un tour bonus x2 à n'importe quel moment.
Ce bouton lance une animation et tombe TOUJOURS sur le segment
🔄 REJOUER (tour supplémentaire gratuit).

### Principe
- Bouton visible uniquement pour CyberAlf
- Clic → animation roue → tombe TOUJOURS sur index 0 (REJOUER)
- Remet hasClickedToday à false pour CyberAlf
  (lui permettant de retourner la roue une fois de plus)
- Incrémente le compteur de clics normalement

### Backend — route POST /api/roulette/bonus
```javascript
router.post('/bonus', verifyToken, async (req, res) => {
  if (req.user.coc_name !== 'CyberAlf' && req.user.site_role !== 'superadmin') {
    return res.status(403).json({ error: 'Réservé à CyberAlf' })
  }

  // Récupérer l'event actif
  const { data: event } = await supabase
    .from('roulette_events')
    .select('*')
    .eq('is_active', true)
    .single()

  if (!event || event.winner_id) {
    return res.status(400).json({ error: 'Pas d\'event actif' })
  }

  // Supprimer le clic du jour pour CyberAlf
  // (lui permettre de retourner)
  const today = new Date().toISOString().split('T')[0]
  await supabase
    .from('roulette_clicks')
    .delete()
    .eq('event_id', event.id)
    .eq('user_id', req.user.id)
    .eq('click_date', today)

  return res.json({ 
    success: true, 
    segment: 'replay',  // toujours REJOUER
    message: 'Tour bonus accordé !'
  })
})
```

### Frontend — bouton x2 dans Roulette.jsx
```jsx
{isCyberAlf && event?.active && !event.isWon && (
  <button
    onClick={handleBonus}
    disabled={isSpinning}
    className="relative px-6 py-3 rounded-2xl text-sm font-black
               uppercase tracking-wide text-white
               bg-gradient-to-r from-[#f59e0b] to-[#d97706]
               hover:from-[#fbbf24] hover:to-[#f59e0b]
               shadow-lg shadow-[#f59e0b]/30
               disabled:opacity-50 transition-all duration-300
               hover:scale-105 border border-[#fbbf24]/30
               overflow-hidden group">
    <span className="absolute inset-0 bg-gradient-to-r from-transparent
                     via-white/10 to-transparent -translate-x-full
                     group-hover:translate-x-full transition-transform duration-700" />
    <span className="relative">🔄 Tour Bonus x2</span>
  </button>
)}
```

### handleBonus dans Roulette.jsx
```javascript
const handleBonus = async () => {
  setIsSpinning(true)
  
  // Appeler la route bonus
  const res = await fetch('/api/roulette/bonus', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  })
  const data = await res.json()
  
  if (!data.success) {
    setIsSpinning(false)
    return
  }

  // Animation qui tombe TOUJOURS sur index 0 (REJOUER)
  const targetSegment = 0 // index fixe du segment REJOUER
  const segmentAngle = 360 / SEGMENTS.length
  const currentRot = rotationRef.current || 0
  const targetRotation = currentRot + 1800 + (360 - targetSegment * segmentAngle)
  
  // Appliquer l'animation
  const wheel = wheelRef.current
  if (wheel) {
    wheel.style.transition = 'transform 6s cubic-bezier(0.17, 0.67, 0.12, 0.99)'
    wheel.style.transform = `rotate(${targetRotation}deg)`
  }
  rotationRef.current = targetRotation

  setTimeout(() => {
    setIsSpinning(false)
    setHasClickedToday(false) // CyberAlf peut retourner !
    fetchEvent()
    // Toast info
    showToast('🔄 Tour bonus activé ! Tu peux retourner la roue.')
  }, 6200)
}
```

---

## CHECKLIST
- [ ] Route POST /api/roulette/delete créée
- [ ] Bouton "Supprimer la roulette" dans Roulette.jsx (CyberAlf)
- [ ] Modal confirmation suppression avec createPortal
- [ ] handleDelete → refresh → bouton "Lancer event" réapparaît
- [ ] Route POST /api/roulette/bonus créée
- [ ] Bouton "Tour Bonus x2" doré dans Roulette.jsx (CyberAlf)
- [ ] Animation roue tombe TOUJOURS sur index 0 (REJOUER)
- [ ] hasClickedToday remis à false après bonus
- [ ] Toast confirmation après bonus
- [ ] npm run build sans erreur
- [ ] git add ., commit "feat: roulette delete + bonus x2 CyberAlf", push

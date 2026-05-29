import { useState, useRef, useEffect, createElement } from 'react'
import { AnimatedBackground } from '../components/AnimatedBackground.jsx'
import { useAuth } from '../hooks/useAuth.jsx'
import api from '../lib/api.js'

// ─── EditableText ─────────────────────────────────────────────────────────────
function EditableText({ block, onSave, onDelete, canEdit, tag = 'span', className = '' }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(block.value || '')

  useEffect(() => { setDraft(block.value || '') }, [block.value])

  const save = async () => {
    if (draft === block.value) { setEditing(false); return }
    try {
      await api.put(`/api/vitrine/blocks/${block.id}`, { value: draft })
      onSave(block.id, draft)
    } catch {}
    setEditing(false)
  }

  const deleteBlock = async () => {
    if (!window.confirm('Supprimer ce bloc ?')) return
    try {
      await api.delete(`/api/vitrine/blocks/${block.id}`)
      onDelete(block.id)
    } catch {}
  }

  if (!canEdit) return createElement(tag, { className }, block.value)

  if (editing) {
    return (
      <div className="flex gap-2 items-start w-full">
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); save() }
            if (e.key === 'Escape') { setDraft(block.value); setEditing(false) }
          }}
          autoFocus
          rows={2}
          className="flex-1 bg-[#0d0d0d] border border-[#dc2626]/50 rounded-lg p-2
                     text-white text-sm resize-none focus:outline-none focus:border-[#dc2626]"
        />
        <div className="flex flex-col gap-1 flex-shrink-0">
          <button onClick={save}
                  className="px-2 py-1 rounded bg-[#dc2626] text-white text-xs font-bold">✓</button>
          <button onClick={() => { setDraft(block.value); setEditing(false) }}
                  className="px-2 py-1 rounded bg-[#1a1a1a] text-gray-400 text-xs">✕</button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative group inline-block w-full">
      {createElement(tag, { className }, block.value)}
      <div className="absolute -top-2 right-0 hidden group-hover:flex gap-1 z-10">
        <button onClick={() => setEditing(true)}
                className="px-2 py-0.5 rounded bg-[#1a1a1a] border border-[#dc2626]/30
                           text-[#dc2626] text-[10px] hover:bg-[#dc2626]/10">✏️</button>
        <button onClick={deleteBlock}
                className="px-2 py-0.5 rounded bg-[#1a1a1a] border border-red-900/30
                           text-red-500 text-[10px] hover:bg-red-900/20">🗑️</button>
      </div>
      <div className="absolute inset-0 border border-dashed border-[#dc2626]/0
                      group-hover:border-[#dc2626]/30 rounded pointer-events-none transition-colors" />
    </div>
  )
}

// ─── AddBlockButton ────────────────────────────────────────────────────────────
function AddBlockButton({ section, onAdd, canEdit }) {
  const [adding, setAdding] = useState(false)
  const [newValue, setNewValue] = useState('')

  if (!canEdit) return null

  const add = async () => {
    if (!newValue.trim()) return
    try {
      const res = await api.post('/api/vitrine/blocks', {
        section,
        key: `custom_${Date.now()}`,
        type: 'text',
        value: newValue.trim(),
        order_index: 99,
      })
      onAdd(res.data)
    } catch {}
    setNewValue('')
    setAdding(false)
  }

  if (adding) {
    return (
      <div className="flex gap-2 mt-2">
        <input
          value={newValue}
          onChange={e => setNewValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') add(); if (e.key === 'Escape') setAdding(false) }}
          placeholder="Nouveau bloc..."
          autoFocus
          className="flex-1 px-3 py-2 rounded-lg bg-[#0d0d0d] border border-[#dc2626]/50
                     text-white text-sm focus:outline-none"
        />
        <button onClick={add}
                className="px-3 py-2 rounded-lg bg-[#dc2626] text-white text-sm font-bold">✓</button>
        <button onClick={() => setAdding(false)}
                className="px-3 py-2 rounded-lg bg-[#1a1a1a] text-gray-400 text-sm">✕</button>
      </div>
    )
  }

  return (
    <button onClick={() => setAdding(true)}
            className="w-full mt-2 py-2 rounded-lg border border-dashed border-[#dc2626]/30
                       text-[#dc2626]/50 text-xs uppercase tracking-wide
                       hover:border-[#dc2626] hover:text-[#dc2626] transition-all">
      + Ajouter un bloc
    </button>
  )
}

// ─── EditableAudio ────────────────────────────────────────────────────────────
function EditableAudio({ canEdit, onUploaded }) {
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await api.post('/api/vitrine/upload/audio', fd)
      onUploaded(res.data.url)
    } catch (err) {
      console.error('Upload audio:', err.message)
    } finally {
      setUploading(false)
    }
  }

  if (!canEdit) return null

  return (
    <>
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="mt-2 w-full px-3 py-1.5 rounded-lg text-xs font-semibold uppercase
                   border border-dashed border-[#dc2626]/30 text-[#dc2626]/60
                   hover:border-[#dc2626] hover:text-[#dc2626] transition-all disabled:opacity-40">
        {uploading ? '⏳ Upload...' : "🎵 Remplacer l'hymne"}
      </button>
      <input ref={inputRef} type="file" accept="audio/*" className="hidden" onChange={handleUpload} />
    </>
  )
}

// ─── AudioPlayer ──────────────────────────────────────────────────────────────
function AudioPlayer({ src, title }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) { audio.pause() } else { audio.play() }
    setPlaying(!playing)
  }

  const handleTimeUpdate = () => {
    const audio = audioRef.current
    if (!audio?.duration) return
    setCurrentTime(audio.currentTime)
    setProgress((audio.currentTime / audio.duration) * 100)
  }

  const handleSeek = (e) => {
    const audio = audioRef.current
    if (!audio?.duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    audio.currentTime = ((e.clientX - rect.left) / rect.width) * audio.duration
  }

  const fmt = (s) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`

  return (
    <div className="rounded-lg p-6" style={{ background: '#111111', border: '1px solid #dc2626' }}>
      <p className="font-cinzel text-xs uppercase tracking-widest mb-4" style={{ color: '#666' }}>
        ♪ HYMNE DU CLAN
      </p>
      <audio
        ref={audioRef}
        key={src}
        src={src || '/audio/hymne.mp3'}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => { if (audioRef.current) setDuration(audioRef.current.duration) }}
        onEnded={() => setPlaying(false)}
      />
      <p className="font-cinzel text-xs uppercase tracking-wider mb-4" style={{ color: '#f0f0f0' }}>
        {title || 'HYMNE OFFICIEL — DONJON ROUGE'}
      </p>
      <div className="flex items-center gap-4">
        <button onClick={togglePlay}
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all hover:opacity-80"
                style={{ background: '#dc2626' }}>
          {playing ? (
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <polygon points="5,3 19,12 5,21" />
            </svg>
          )}
        </button>
        <div className="flex-1 flex flex-col gap-1">
          <div className="w-full h-2 rounded-full cursor-pointer" style={{ background: '#1f1f1f' }} onClick={handleSeek}>
            <div className="h-2 rounded-full transition-all" style={{ width: `${progress}%`, background: '#dc2626' }} />
          </div>
          <div className="flex justify-between text-xs font-cinzel" style={{ color: '#666' }}>
            <span>{fmt(currentTime)}</span>
            <span>{duration ? fmt(duration) : '--:--'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Accordéon ────────────────────────────────────────────────────────────────
function Accordion({ icon, title, children }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded overflow-hidden" style={{ border: '1px solid #1f1f1f' }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 transition-all text-left"
        style={{ background: '#111111', borderLeft: open ? '3px solid #dc2626' : '3px solid transparent' }}
      >
        <span className="font-cinzel text-sm uppercase tracking-wider" style={{ color: '#f0f0f0' }}>
          {icon} {title}
        </span>
        <svg className="w-4 h-4 flex-shrink-0 transition-transform duration-200"
             style={{ color: '#666', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
             fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-5 py-4 text-sm leading-relaxed"
             style={{ background: '#0f0f0f', borderLeft: '3px solid #1f1f1f', color: '#aaa' }}>
          {children}
        </div>
      )}
    </div>
  )
}

const YL = () => (
  <span className="inline-block px-2 py-0.5 rounded text-sm font-bold" style={{ background: '#eab308', color: '#000' }}>
    🟨 CARTON JAUNE
  </span>
)
const RL = () => (
  <span className="inline-block px-2 py-0.5 rounded text-sm font-bold text-white" style={{ background: '#dc2626' }}>
    🟥 CARTON ROUGE
  </span>
)

// ─── Styles par clé pour recrutement ─────────────────────────────────────────
const RECRU_STYLE = {
  hdv_min:     { icon: '🏰', color: '#dc2626', className: 'font-bold text-lg' },
  assiduite:   { icon: '✅', color: '#f0f0f0', className: '' },
  progression: { icon: '✅', color: '#f0f0f0', className: '' },
  consignes:   { icon: '⚠️', color: '#f97316', className: '' },
  slogan:      { icon: null,  color: '#f59e0b', className: 'text-xl italic text-center' },
}

// ─── Page Vitrine ─────────────────────────────────────────────────────────────
export default function Vitrine() {
  const { user } = useAuth()
  const canEdit = user?.coc_name === 'CyberAlf' || ['superadmin', 'admin'].includes(user?.site_role)
  const [blocks, setBlocks] = useState({})

  useEffect(() => {
    api.get('/api/vitrine/blocks').then(r => {
      const organized = r.data.reduce((acc, block) => {
        if (!acc[block.section]) acc[block.section] = []
        acc[block.section].push(block)
        return acc
      }, {})
      setBlocks(organized)
    }).catch(() => {})
  }, [])

  const updateBlock = (id, value) => {
    setBlocks(prev => {
      const next = {}
      for (const sec in prev) {
        next[sec] = prev[sec].map(b => b.id === id ? { ...b, value } : b)
      }
      return next
    })
  }

  const removeBlock = (id) => {
    setBlocks(prev => {
      const next = {}
      for (const sec in prev) {
        next[sec] = prev[sec].filter(b => b.id !== id)
      }
      return next
    })
  }

  const addBlock = (block) => {
    setBlocks(prev => ({
      ...prev,
      [block.section]: [...(prev[block.section] || []), block],
    }))
  }

  const getBlock = (section, key) =>
    (blocks[section] || []).find(b => b.key === key)

  // Hymne
  const hymneTitle = getBlock('hymne', 'titre')
  const hymneAudio = getBlock('hymne', 'url')

  // Recrutement
  const recrutBlocks = blocks.recrutement || []
  const sloganBlock  = recrutBlocks.find(b => b.key === 'slogan')
  const criteresBlocks = recrutBlocks.filter(b => b.key !== 'slogan')

  // Cartons
  const ldcBlocks = (blocks.cartons || []).filter(b => b.key.startsWith('ldc'))
  const gdcBlocks = (blocks.cartons || []).filter(b => b.key.startsWith('gdc'))

  return (
    <>
      <AnimatedBackground variant="vitrine" />
      <div className="relative z-10 max-w-4xl mx-auto px-4 py-12 animate-fade-up">

        {/* SECTION 1 — Hero Banner */}
        <section className="relative rounded-xl overflow-hidden mb-14 flex flex-col items-center py-16 px-4">
          <div className="absolute inset-0" style={{
            backgroundImage: 'url(/images/logo_2.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(8px)',
            opacity: 0.08,
          }} />
          <div className="relative z-10 flex flex-col items-center gap-4">
            <img src="/images/logo_2.png" alt="Donjon Rouge" className="h-48 w-auto object-contain mx-auto" />
            <p className="font-cinzel text-xs uppercase tracking-widest" style={{ color: '#999' }}>
              GUILDE CLASH OF CLANS
            </p>
            <p className="font-cinzel text-xs" style={{ color: '#dc2626' }}>#29292QPRC</p>
          </div>
        </section>

        {/* SECTION 2 — Hymne du clan */}
        <section className="mb-14">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-[#1a1a1a]" />
            <span className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest bg-[#111111] border border-[#dc2626]/30 text-[#dc2626]">
              {hymneTitle ? (
                <EditableText
                  block={hymneTitle}
                  onSave={updateBlock}
                  onDelete={removeBlock}
                  canEdit={canEdit}
                  tag="span"
                />
              ) : 'Hymne du Clan'}
            </span>
            <div className="h-px flex-1 bg-[#1a1a1a]" />
          </div>
          <AudioPlayer
            src={hymneAudio?.value}
            title={hymneTitle?.value}
          />
          <EditableAudio
            canEdit={canEdit}
            onUploaded={(url) => {
              if (hymneAudio) updateBlock(hymneAudio.id, url)
              else setBlocks(prev => ({
                ...prev,
                hymne: [...(prev.hymne || []), { id: null, section: 'hymne', key: 'url', type: 'audio', value: url }],
              }))
            }}
          />
        </section>

        {/* SECTION 3 — Recrutement */}
        <section className="mb-14">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-px flex-1 bg-[#1a1a1a]" />
            <span className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest bg-[#111111] border border-[#dc2626]/30 text-[#dc2626]">
              Nous Recrutons
            </span>
            <div className="h-px flex-1 bg-[#1a1a1a]" />
          </div>
          <div className="rounded-xl p-8" style={{
            background: '#111111',
            border: '2px solid #dc2626',
            boxShadow: '0 0 40px rgba(220,38,38,0.2)',
          }}>
            {/* Titre */}
            <div className="mb-6">
              <h3 className="font-cinzel font-bold text-3xl uppercase mb-1">
                <span style={{ color: '#f0f0f0' }}>DONJON </span>
                <span style={{ color: '#dc2626' }}>ROUGE</span>
              </h3>
              <h3 className="font-cinzel font-bold text-3xl uppercase" style={{ color: '#f0f0f0' }}>RECRUTE</h3>
              <div className="mt-3 h-0.5 w-24" style={{ background: '#dc2626' }} />
            </div>

            {/* Critères éditables */}
            <ul className="flex flex-col gap-3 mb-8">
              {criteresBlocks.map(block => {
                const style = RECRU_STYLE[block.key] || { icon: '•', color: '#f0f0f0', className: '' }
                return (
                  <li key={block.id || block.key} style={{ color: style.color }}>
                    {style.icon && <>{style.icon} </>}
                    <EditableText
                      block={block}
                      onSave={updateBlock}
                      onDelete={removeBlock}
                      canEdit={canEdit}
                      tag="span"
                      className={style.className}
                    />
                  </li>
                )
              })}
            </ul>

            <AddBlockButton section="recrutement" canEdit={canEdit} onAdd={addBlock} />

            {/* Slogan */}
            {sloganBlock && (
              <p className="text-xl italic text-center mt-8 mb-8" style={{ color: '#f59e0b' }}>
                <EditableText
                  block={sloganBlock}
                  onSave={updateBlock}
                  onDelete={removeBlock}
                  canEdit={canEdit}
                  tag="span"
                />
              </p>
            )}

            {/* Bouton Discord */}
            <div className="flex justify-center">
              <a href="https://discord.gg/CXZcs4umFP" target="_blank" rel="noopener noreferrer"
                 className="px-6 py-3 font-cinzel font-bold uppercase text-white rounded transition-all"
                 style={{ background: '#dc2626' }}
                 onMouseEnter={e => e.currentTarget.style.background = '#b91c1c'}
                 onMouseLeave={e => e.currentTarget.style.background = '#dc2626'}>
                REJOINDRE LE CLAN — DISCORD
              </a>
            </div>
          </div>
        </section>

        {/* SECTION 4 — Règlement (accordéons) */}
        <section className="mb-14">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-px flex-1 bg-[#1a1a1a]" />
            <span className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest bg-[#111111] border border-[#dc2626]/30 text-[#dc2626]">
              Règlement Officiel
            </span>
            <div className="h-px flex-1 bg-[#1a1a1a]" />
          </div>
          <div className="flex flex-col gap-2">

            <Accordion icon="📋" title="Règlement Général">
              <p className="mb-3">
                <span style={{ color: '#dc2626' }} className="font-bold">🔴 LE RESPECT — obligatoire</span>
              </p>
              <p className="mb-3" style={{ color: '#aaa' }}>
                Interdit : messages diffamatoires, abusifs, vulgaires, haineux, harcelant, obscènes,
                racistes, menaçant la vie privée. Sinon : <strong style={{ color: '#dc2626' }}>exclusion immédiate.</strong>
              </p>
              <p className="mb-1" style={{ color: '#f59e0b' }}>⚠️ IMPORTANT</p>
              <ul className="list-disc ml-5 space-y-1">
                <li>7 jours d'inactivité sans prévenir = exclusion</li>
                <li>4 héros disponibles obligatoires pour les attaques</li>
              </ul>
            </Accordion>

            <Accordion icon="⚔️" title="Guerres de Clans (GDC)">
              <p className="mb-2" style={{ color: '#f0f0f0' }}>📅 Lancement le mardi soir à 20h</p>
              <p className="mb-1">Sur demande d'un membre pour d'autres GDC :</p>
              <ul className="list-disc ml-5 mb-3 space-y-1">
                <li>Inscription sur le tchat COC 24h à 48h avant</li>
                <li>Demande sur Discord (voir Forum)</li>
              </ul>
              <p className="font-bold mb-2" style={{ color: '#f0f0f0' }}>LES 2 ATTAQUES SONT OBLIGATOIRES</p>
              <ul className="list-disc ml-5 mb-3 space-y-1">
                <li>1ère attaque : miroir OBLIGATOIRE</li>
                <li>2ème attaque : voir consignes Discord</li>
              </ul>
              <ul className="space-y-1">
                <li>🟨 1ère attaque non faite = carton jaune pour la prochaine GDC</li>
                <li>🟨 Non-respect du règlement = carton jaune</li>
                <li>🟥 2ème attaque non faite = exclu des GDC 1 mois</li>
              </ul>
            </Accordion>

            <Accordion icon="🏆" title="Ligue de Guerre (LDC)">
              <ul className="list-disc ml-5 mb-3 space-y-1">
                <li>Inscription sur Discord</li>
                <li>2 GDC de qualification requises</li>
                <li>Miroir OBLIGATOIRE tout au long de la LDC</li>
              </ul>
              <ul className="space-y-1">
                <li>🟨 1 attaque non faite = remplacement immédiat + carton jaune + perte des médailles supp</li>
                <li>🟨 Non-respect du miroir = pas de bonus</li>
                <li>🟥 2 attaques non faites = expulsion du clan</li>
              </ul>
              <p className="mt-3">Système d'étoiles mis en place pour rester en LDC. Voir sur le Discord.</p>
            </Accordion>

            <Accordion icon="🎮" title="Jeux de Clans (JDC)">
              <ul className="space-y-2">
                <li style={{ color: '#f59e0b' }}>🥇 10 000 pts = Challenge de champion</li>
                <li style={{ color: '#22c55e' }}>✅ 5 000 pts = Minimum demandé pour être actif</li>
                <li style={{ color: '#f97316' }}>⚠️ Moins de 5 000 pts = Votre place est en péril</li>
              </ul>
            </Accordion>

            <Accordion icon="💎" title="Raids Capital">
              <ul className="list-disc ml-5 space-y-1">
                <li>Tout raid commencé sur un village doit être fini (sauf si plus d'attaques possible)</li>
                <li style={{ color: '#22c55e' }}>Faire ses raids → grade Aîné pour 7 jours ✅</li>
                <li style={{ color: '#f97316' }}>Ne pas les faire → votre place est en péril ⚠️</li>
              </ul>
            </Accordion>

            <Accordion icon="🎖️" title="Grades">
              <ul className="space-y-2 mb-3">
                <li>👑 <strong style={{ color: '#f0f0f0' }}>Chef Adjoint</strong> — Suivant les besoins du clan</li>
                <li>⭐ <strong style={{ color: '#f0f0f0' }}>Aîné</strong> — Attribué via les Raids (voir section Raids)</li>
              </ul>
              <p style={{ color: '#666' }}>
                En acceptant ce règlement, tu confirmes avoir pris connaissance du fonctionnement du clan. 😀
              </p>
            </Accordion>

          </div>
        </section>

        {/* SECTION 5 — Système de cartons */}
        <section className="mb-14">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-px flex-1 bg-[#1a1a1a]" />
            <span className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest bg-[#111111] border border-[#dc2626]/30 text-[#dc2626]">
              Système de Cartons
            </span>
            <div className="h-px flex-1 bg-[#1a1a1a]" />
          </div>
          <div className="grid md:grid-cols-2 gap-4">

            {/* LDC */}
            <div className="rounded-lg p-6" style={{ background: '#111111', borderTop: '3px solid #f59e0b' }}>
              <h3 className="font-cinzel text-sm uppercase tracking-widest mb-4" style={{ color: '#f59e0b' }}>
                LIGUE DE GUERRE (LDC)
              </h3>
              <div className="flex flex-col gap-4">
                {ldcBlocks.map(block => (
                  <div key={block.id || block.key}>
                    {block.key.includes('jaune') ? <YL /> : <RL />}
                    <div className="mt-2 text-sm" style={{ color: '#aaa' }}>
                      <EditableText
                        block={block}
                        onSave={updateBlock}
                        onDelete={removeBlock}
                        canEdit={canEdit}
                        tag="span"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <AddBlockButton section="cartons" canEdit={canEdit} onAdd={addBlock} />
            </div>

            {/* GDC */}
            <div className="rounded-lg p-6" style={{ background: '#111111', borderTop: '3px solid #dc2626' }}>
              <h3 className="font-cinzel text-sm uppercase tracking-widest mb-4" style={{ color: '#dc2626' }}>
                GUERRES DE CLANS (GDC)
              </h3>
              <div className="flex flex-col gap-4">
                {gdcBlocks.map(block => (
                  <div key={block.id || block.key}>
                    {block.key.includes('jaune') ? <YL /> : <RL />}
                    <div className="mt-2 text-sm" style={{ color: '#aaa' }}>
                      <EditableText
                        block={block}
                        onSave={updateBlock}
                        onDelete={removeBlock}
                        canEdit={canEdit}
                        tag="span"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <AddBlockButton section="cartons" canEdit={canEdit} onAdd={addBlock} />
            </div>

          </div>
        </section>

        {/* SECTION 6 — Identité visuelle */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="h-px flex-1 bg-[#1a1a1a]" />
            <span className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest bg-[#111111] border border-[#dc2626]/30 text-[#dc2626]">
              Identité Visuelle
            </span>
            <div className="h-px flex-1 bg-[#1a1a1a]" />
          </div>
          <div className="grid md:grid-cols-2 gap-4">

            <div className="rounded-lg p-6 flex flex-col items-center gap-4 transition-all"
                 style={{ background: '#111111', border: '1px solid #1f1f1f' }}
                 onMouseEnter={e => e.currentTarget.style.border = '1px solid #dc2626'}
                 onMouseLeave={e => e.currentTarget.style.border = '1px solid #1f1f1f'}>
              <img src="/images/logo_2.png" alt="Logo Donjon Rouge" className="h-40 w-auto object-contain" />
              <p className="font-cinzel text-xs uppercase tracking-widest" style={{ color: '#666' }}>LOGO OFFICIEL</p>
              <a href="/images/logo_2.png" download="logo_donjon_rouge.png"
                 className="px-4 py-2 rounded font-cinzel text-xs uppercase tracking-wider transition-all"
                 style={{ background: '#1f1f1f', color: '#f0f0f0', border: '1px solid #333' }}
                 onMouseEnter={e => { e.currentTarget.style.borderColor = '#dc2626'; e.currentTarget.style.color = '#dc2626' }}
                 onMouseLeave={e => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = '#f0f0f0' }}>
                Télécharger
              </a>
            </div>

            <div className="rounded-lg p-6 flex flex-col items-center gap-4 transition-all"
                 style={{ background: '#111111', border: '1px solid #1f1f1f' }}
                 onMouseEnter={e => e.currentTarget.style.border = '1px solid #dc2626'}
                 onMouseLeave={e => e.currentTarget.style.border = '1px solid #1f1f1f'}>
              <img src="/images/recru.png" alt="Affiche recrutement" className="h-40 w-auto object-contain" />
              <p className="font-cinzel text-xs uppercase tracking-widest" style={{ color: '#666' }}>AFFICHE DE RECRUTEMENT</p>
              <a href="/images/recru.png" download="recrutement-donjon-rouge.png"
                 className="px-4 py-2 rounded font-cinzel text-xs uppercase tracking-wider transition-all"
                 style={{ background: '#1f1f1f', color: '#f0f0f0', border: '1px solid #333' }}
                 onMouseEnter={e => { e.currentTarget.style.borderColor = '#dc2626'; e.currentTarget.style.color = '#dc2626' }}
                 onMouseLeave={e => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = '#f0f0f0' }}>
                Télécharger
              </a>
            </div>

          </div>
        </section>

      </div>
    </>
  )
}

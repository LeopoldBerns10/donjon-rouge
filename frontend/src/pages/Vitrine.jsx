import { useState, useRef, useEffect, useMemo, createElement } from 'react'
import { AnimatedBackground } from '../components/AnimatedBackground.jsx'
import { useAuth } from '../hooks/useAuth.jsx'
import api from '../lib/api.js'

const FIXED_SECTION_KEYS = ['hymne', 'recrutement', 'reglement', 'cartons', 'identite']

// ─── EditableText ─────────────────────────────────────────────────────────────
function EditableText({ block, onSave, onDelete, canEdit, tag = 'span', className = '', style = {} }) {
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

  if (!canEdit) return createElement(tag, { className, style }, block.value)

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
          rows={3}
          className="flex-1 bg-[#0d0d0d] border border-[#dc2626]/50 rounded-lg p-2
                     text-white text-sm resize-y focus:outline-none focus:border-[#dc2626]"
        />
        <div className="flex flex-col gap-1 flex-shrink-0">
          <button onClick={save} className="px-2 py-1 rounded bg-[#dc2626] text-white text-xs font-bold">✓</button>
          <button onClick={() => { setDraft(block.value); setEditing(false) }}
                  className="px-2 py-1 rounded bg-[#1a1a1a] text-gray-400 text-xs">✕</button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative group inline-block w-full">
      {createElement(tag, { className, style }, block.value)}
      <div className="absolute -top-2 right-0 hidden group-hover:flex gap-1 z-10">
        <button onClick={() => setEditing(true)}
                className="px-2 py-0.5 rounded bg-[#1a1a1a] border border-[#dc2626]/30
                           text-[#dc2626] text-[10px] hover:bg-[#dc2626]/10">✏️</button>
        {onDelete !== null && (
          <button onClick={deleteBlock}
                  className="px-2 py-0.5 rounded bg-[#1a1a1a] border border-red-900/30
                             text-red-500 text-[10px] hover:bg-red-900/20">🗑️</button>
        )}
      </div>
      <div className="absolute inset-0 border border-dashed border-[#dc2626]/0
                      group-hover:border-[#dc2626]/30 rounded pointer-events-none transition-colors" />
    </div>
  )
}

// ─── AddBlockButton ────────────────────────────────────────────────────────────
function AddBlockButton({ section, onAdd, canEdit, placeholder = 'Nouveau bloc...' }) {
  const [adding, setAdding] = useState(false)
  const [newValue, setNewValue] = useState('')

  if (!canEdit) return null

  const add = async () => {
    if (!newValue.trim()) return
    try {
      const res = await api.post('/api/vitrine/blocks', {
        section,
        key: `custom_${section}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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
          placeholder={placeholder}
          autoFocus
          className="flex-1 px-3 py-2 rounded-lg bg-[#0d0d0d] border border-[#dc2626]/50
                     text-white text-sm focus:outline-none"
        />
        <button onClick={add} className="px-3 py-2 rounded-lg bg-[#dc2626] text-white text-sm font-bold">✓</button>
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
    } catch {}
    finally { setUploading(false) }
  }

  if (!canEdit) return null
  return (
    <>
      <button onClick={() => inputRef.current?.click()} disabled={uploading}
              className="mt-2 w-full px-3 py-1.5 rounded-lg text-xs font-semibold uppercase
                         border border-dashed border-[#dc2626]/30 text-[#dc2626]/60
                         hover:border-[#dc2626] hover:text-[#dc2626] transition-all disabled:opacity-40">
        {uploading ? '⏳ Upload...' : "🎵 Remplacer l'hymne"}
      </button>
      <input ref={inputRef} type="file" accept="audio/*" className="hidden" onChange={handleUpload} />
    </>
  )
}

// ─── EditableImage ─────────────────────────────────────────────────────────────
function EditableImage({ src, storageKey, canEdit, label, onReplace }) {
  const inputRef = useRef(null)
  const [currentSrc, setCurrentSrc] = useState(src)
  const [uploading, setUploading] = useState(false)

  useEffect(() => { setCurrentSrc(src) }, [src])

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('key', storageKey)
    try {
      const res = await api.post('/api/vitrine/upload/image', fd)
      setCurrentSrc(res.data.url)
      onReplace?.(res.data.url)
    } catch {}
    finally { setUploading(false) }
  }

  return (
    <div className="relative group rounded-xl overflow-hidden">
      <img src={currentSrc} alt={label} className="w-full object-contain rounded-xl max-h-52" />
      {canEdit && (
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity
                        flex flex-col items-center justify-center gap-2 rounded-xl">
          <p className="text-xs text-gray-300 uppercase tracking-wide">{label}</p>
          <button onClick={() => inputRef.current?.click()} disabled={uploading}
                  className="px-4 py-2 rounded-xl bg-[#dc2626] text-white text-sm font-bold
                             hover:bg-[#b91c1c] disabled:opacity-50 transition-colors">
            {uploading ? '⏳ Upload...' : '📷 Remplacer'}
          </button>
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
    </div>
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
    const a = audioRef.current
    if (!a) return
    if (playing) a.pause(); else a.play()
    setPlaying(!playing)
  }

  const handleSeek = (e) => {
    const a = audioRef.current
    if (!a?.duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    a.currentTime = ((e.clientX - rect.left) / rect.width) * a.duration
  }

  const fmt = s => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`

  return (
    <div className="rounded-lg p-6" style={{ background: '#111111', border: '1px solid #dc2626' }}>
      <p className="font-cinzel text-xs uppercase tracking-widest mb-4" style={{ color: '#666' }}>♪ HYMNE DU CLAN</p>
      <audio ref={audioRef} key={src} src={src || '/audio/hymne.mp3'}
             onTimeUpdate={() => {
               const a = audioRef.current
               if (!a?.duration) return
               setCurrentTime(a.currentTime)
               setProgress((a.currentTime / a.duration) * 100)
             }}
             onLoadedMetadata={() => { if (audioRef.current) setDuration(audioRef.current.duration) }}
             onEnded={() => setPlaying(false)} />
      <p className="font-cinzel text-xs uppercase tracking-wider mb-4" style={{ color: '#f0f0f0' }}>
        {title || 'HYMNE OFFICIEL — DONJON ROUGE'}
      </p>
      <div className="flex items-center gap-4">
        <button onClick={togglePlay}
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 hover:opacity-80 transition-all"
                style={{ background: '#dc2626' }}>
          {playing
            ? <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
            : <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21"/></svg>}
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

// ─── EditableAccordion ────────────────────────────────────────────────────────
function EditableAccordion({ titreBlock, contenuBlock, canEdit, onSave, onDeleteAccordion }) {
  const [open, setOpen] = useState(false)
  if (!titreBlock) return null

  return (
    <div className="relative group rounded overflow-hidden" style={{ border: '1px solid #1f1f1f' }}>
      {/* Bouton supprimer (admin) */}
      {canEdit && (
        <button
          onClick={(e) => { e.stopPropagation(); onDeleteAccordion() }}
          className="absolute -right-1 -top-1 w-5 h-5 rounded-full bg-red-900/60
                     border border-red-700/40 text-red-400 text-[10px]
                     hidden group-hover:flex items-center justify-center z-20
                     hover:bg-red-900 transition-colors">
          ✕
        </button>
      )}

      {/* Header */}
      <div
        className="w-full flex items-center justify-between px-5 py-4 cursor-pointer transition-all"
        style={{ background: '#111111', borderLeft: open ? '3px solid #dc2626' : '3px solid transparent' }}
        onClick={() => setOpen(o => !o)}
      >
        {canEdit ? (
          <div className="flex-1" onClick={e => e.stopPropagation()}>
            <EditableText
              block={titreBlock}
              onSave={onSave}
              onDelete={null}
              canEdit={canEdit}
              tag="span"
              className="font-cinzel text-sm uppercase tracking-wider"
              style={{ color: '#f0f0f0' }}
            />
          </div>
        ) : (
          <span className="font-cinzel text-sm uppercase tracking-wider" style={{ color: '#f0f0f0' }}>
            {titreBlock.value}
          </span>
        )}
        <svg className="w-4 h-4 flex-shrink-0 ml-2 transition-transform duration-200"
             style={{ color: '#666', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
             fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Contenu */}
      {open && (
        <div className="px-5 py-4 text-sm leading-relaxed"
             style={{ background: '#0f0f0f', borderLeft: '3px solid #1f1f1f', color: '#aaa' }}>
          {contenuBlock ? (
            canEdit ? (
              <EditableText
                block={contenuBlock}
                onSave={onSave}
                onDelete={null}
                canEdit={canEdit}
                tag="div"
                className="whitespace-pre-wrap"
              />
            ) : (
              <div className="whitespace-pre-wrap">{contenuBlock.value}</div>
            )
          ) : <p className="text-gray-600 italic">Aucun contenu</p>}
        </div>
      )}
    </div>
  )
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ label }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="h-px flex-1 bg-[#1a1a1a]" />
      <span className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest bg-[#111111] border border-[#dc2626]/30 text-[#dc2626]">
        {label}
      </span>
      <div className="h-px flex-1 bg-[#1a1a1a]" />
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
  const [sections, setSections] = useState([])
  const [showCreateSection, setShowCreateSection] = useState(false)
  const [newSection, setNewSection] = useState({ icon: '📋', label: '' })

  useEffect(() => {
    api.get('/api/vitrine/blocks').then(r => {
      const organized = r.data.reduce((acc, block) => {
        if (!acc[block.section]) acc[block.section] = []
        acc[block.section].push(block)
        return acc
      }, {})
      setBlocks(organized)
    }).catch(() => {})

    api.get('/api/vitrine/sections').then(r => setSections(r.data || [])).catch(() => {})
  }, [])

  // ─── State helpers ──────────────────────────────────────────────────────────
  const updateBlock = (id, value) => setBlocks(prev => {
    const next = {}
    for (const sec in prev) next[sec] = prev[sec].map(b => b.id === id ? { ...b, value } : b)
    return next
  })

  const removeBlock = (id) => setBlocks(prev => {
    const next = {}
    for (const sec in prev) next[sec] = prev[sec].filter(b => b.id !== id)
    return next
  })

  const removeBlocks = (ids) => setBlocks(prev => {
    const next = {}
    for (const sec in prev) next[sec] = prev[sec].filter(b => !ids.includes(b.id))
    return next
  })

  const addBlock = (block) => setBlocks(prev => ({
    ...prev,
    [block.section]: [...(prev[block.section] || []), block],
  }))

  const addBlocks = (newBlocks) => setBlocks(prev => {
    const next = { ...prev }
    for (const block of newBlocks) {
      if (!next[block.section]) next[block.section] = []
      next[block.section] = [...next[block.section], block]
    }
    return next
  })

  // ─── Hymne ──────────────────────────────────────────────────────────────────
  const hymneTitle = (blocks.hymne || []).find(b => b.key === 'titre')
  const hymneAudio = (blocks.hymne || []).find(b => b.key === 'url')

  // ─── Identité visuelle ──────────────────────────────────────────────────────
  const logoBlock       = (blocks.identite || []).find(b => b.key === 'logo')
  const recrutImageBlock = (blocks.identite || []).find(b => b.key === 'recrutement')

  // ─── Recrutement ────────────────────────────────────────────────────────────
  const recrutBlocks = blocks.recrutement || []
  const sloganBlock   = recrutBlocks.find(b => b.key === 'slogan')
  const criteresBlocks = recrutBlocks.filter(b => b.key !== 'slogan')

  // ─── Règlement accordéons ───────────────────────────────────────────────────
  const accordionGroups = useMemo(() => {
    const regBlocks = blocks.reglement || []
    const indices = [...new Set(
      regBlocks
        .filter(b => /^accord_\d+_/.test(b.key))
        .map(b => parseInt(b.key.match(/^accord_(\d+)_/)[1]))
    )].sort((a, b) => a - b)
    return indices.map(idx => ({
      idx,
      titreBlock: regBlocks.find(b => b.key === `accord_${idx}_titre`),
      contenuBlock: regBlocks.find(b => b.key === `accord_${idx}_contenu`),
    }))
  }, [blocks.reglement])

  const handleAddAccordion = async () => {
    const existing = (blocks.reglement || [])
      .filter(b => /^accord_\d+_/.test(b.key))
      .map(b => parseInt(b.key.match(/^accord_(\d+)_/)[1]))
    const nextIdx = existing.length ? Math.max(...existing) + 1 : 1
    try {
      const [r1, r2] = await Promise.all([
        api.post('/api/vitrine/blocks', {
          section: 'reglement', key: `accord_${nextIdx}_titre`, type: 'text',
          value: '📋 Nouvel accordéon', order_index: nextIdx * 2 - 1,
        }),
        api.post('/api/vitrine/blocks', {
          section: 'reglement', key: `accord_${nextIdx}_contenu`, type: 'text',
          value: 'Contenu à éditer...', order_index: nextIdx * 2,
        }),
      ])
      addBlocks([r1.data, r2.data])
    } catch {}
  }

  const handleDeleteAccordion = async (titreBlock, contenuBlock) => {
    if (!window.confirm('Supprimer cet accordéon ?')) return
    const ids = []
    try {
      if (titreBlock) { await api.delete(`/api/vitrine/blocks/${titreBlock.id}`); ids.push(titreBlock.id) }
      if (contenuBlock) { await api.delete(`/api/vitrine/blocks/${contenuBlock.id}`); ids.push(contenuBlock.id) }
      removeBlocks(ids)
    } catch {}
  }

  // ─── Cartons ────────────────────────────────────────────────────────────────
  const ldcBlocks = (blocks.cartons || []).filter(b => b.key.startsWith('ldc'))
  const gdcBlocks = (blocks.cartons || []).filter(b => b.key.startsWith('gdc'))

  // ─── Sections custom ────────────────────────────────────────────────────────
  const customSections = sections.filter(s => !FIXED_SECTION_KEYS.includes(s.key))

  const handleCreateSection = async () => {
    if (!newSection.label.trim()) return
    const key = `custom_${Date.now()}`
    try {
      const res = await api.post('/api/vitrine/sections', {
        key, label: newSection.label, icon: newSection.icon || '📋',
        order_index: sections.length + 1,
      })
      setSections(prev => [...prev, res.data])
    } catch {}
    setShowCreateSection(false)
    setNewSection({ icon: '📋', label: '' })
  }

  const handleDeleteSection = async (key) => {
    if (!window.confirm('Supprimer cette section et tout son contenu ?')) return
    try {
      await api.delete(`/api/vitrine/sections/${key}`)
      setSections(prev => prev.filter(s => s.key !== key))
      setBlocks(prev => { const next = { ...prev }; delete next[key]; return next })
    } catch {}
  }

  return (
    <>
      <AnimatedBackground variant="vitrine" />
      <div className="relative z-10 max-w-4xl mx-auto px-4 py-12 animate-fade-up">

        {/* SECTION 1 — Hero Banner */}
        <section className="relative rounded-xl overflow-hidden mb-14 flex flex-col items-center py-16 px-4">
          <div className="absolute inset-0" style={{
            backgroundImage: 'url(/images/logo_2.png)',
            backgroundSize: 'cover', backgroundPosition: 'center',
            filter: 'blur(8px)', opacity: 0.08,
          }} />
          <div className="relative z-10 flex flex-col items-center gap-4">
            <img src="/images/logo_2.png" alt="Donjon Rouge" className="h-48 w-auto object-contain mx-auto" />
            <p className="font-cinzel text-xs uppercase tracking-widest" style={{ color: '#999' }}>
              GUILDE CLASH OF CLANS
            </p>
            <p className="font-cinzel text-xs" style={{ color: '#dc2626' }}>#29292QPRC</p>
          </div>
        </section>

        {/* SECTION 2 — Hymne */}
        <section className="mb-14">
          <SectionHeader label={hymneTitle?.value || 'Hymne du Clan'} />
          <AudioPlayer src={hymneAudio?.value} title={hymneTitle?.value} />
          {hymneTitle && canEdit && (
            <div className="mt-3">
              <EditableText
                block={hymneTitle}
                onSave={updateBlock}
                onDelete={null}
                canEdit={canEdit}
                tag="span"
                className="text-xs text-gray-600"
              />
            </div>
          )}
          <EditableAudio
            canEdit={canEdit}
            onUploaded={(url) => {
              if (hymneAudio) updateBlock(hymneAudio.id, url)
            }}
          />
          <AddBlockButton section="hymne" canEdit={canEdit} onAdd={addBlock}
                          placeholder="Nouveau bloc hymne..." />
        </section>

        {/* SECTION 3 — Recrutement */}
        <section className="mb-14">
          <SectionHeader label="Nous Recrutons" />
          <div className="rounded-xl p-8" style={{
            background: '#111111', border: '2px solid #dc2626',
            boxShadow: '0 0 40px rgba(220,38,38,0.2)',
          }}>
            <div className="mb-6">
              <h3 className="font-cinzel font-bold text-3xl uppercase mb-1">
                <span style={{ color: '#f0f0f0' }}>DONJON </span>
                <span style={{ color: '#dc2626' }}>ROUGE</span>
              </h3>
              <h3 className="font-cinzel font-bold text-3xl uppercase" style={{ color: '#f0f0f0' }}>RECRUTE</h3>
              <div className="mt-3 h-0.5 w-24" style={{ background: '#dc2626' }} />
            </div>

            <ul className="flex flex-col gap-3 mb-4">
              {criteresBlocks.map(block => {
                const s = RECRU_STYLE[block.key] || { icon: '•', color: '#f0f0f0', className: '' }
                return (
                  <li key={block.id || block.key} style={{ color: s.color }}>
                    {s.icon && <>{s.icon} </>}
                    <EditableText block={block} onSave={updateBlock} onDelete={removeBlock}
                                  canEdit={canEdit} tag="span" className={s.className} />
                  </li>
                )
              })}
            </ul>
            <AddBlockButton section="recrutement" canEdit={canEdit} onAdd={addBlock} />

            {sloganBlock && (
              <p className="text-xl italic text-center mt-8 mb-8" style={{ color: '#f59e0b' }}>
                <EditableText block={sloganBlock} onSave={updateBlock} onDelete={null}
                              canEdit={canEdit} tag="span" />
              </p>
            )}

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

        {/* SECTION 4 — Règlement */}
        <section className="mb-14">
          <SectionHeader label="Règlement Officiel" />
          <div className="flex flex-col gap-2">
            {accordionGroups.map(({ idx, titreBlock, contenuBlock }) => (
              <EditableAccordion
                key={idx}
                titreBlock={titreBlock}
                contenuBlock={contenuBlock}
                canEdit={canEdit}
                onSave={updateBlock}
                onDeleteAccordion={() => handleDeleteAccordion(titreBlock, contenuBlock)}
              />
            ))}
            {canEdit && (
              <button onClick={handleAddAccordion}
                      className="w-full mt-2 py-2 rounded-lg border border-dashed border-[#dc2626]/30
                                 text-[#dc2626]/50 text-xs uppercase tracking-wide
                                 hover:border-[#dc2626] hover:text-[#dc2626] transition-all">
                + Ajouter un accordéon
              </button>
            )}
          </div>
        </section>

        {/* SECTION 5 — Cartons */}
        <section className="mb-14">
          <SectionHeader label="Système de Cartons" />
          <div className="grid md:grid-cols-2 gap-4">

            <div className="rounded-lg p-6" style={{ background: '#111111', borderTop: '3px solid #f59e0b' }}>
              <h3 className="font-cinzel text-sm uppercase tracking-widest mb-4" style={{ color: '#f59e0b' }}>
                LIGUE DE GUERRE (LDC)
              </h3>
              <div className="flex flex-col gap-4">
                {ldcBlocks.map(block => (
                  <div key={block.id || block.key}>
                    {block.key.includes('jaune') ? <YL /> : <RL />}
                    <div className="mt-2 text-sm" style={{ color: '#aaa' }}>
                      <EditableText block={block} onSave={updateBlock} onDelete={removeBlock}
                                    canEdit={canEdit} tag="span" />
                    </div>
                  </div>
                ))}
              </div>
              <AddBlockButton section="cartons" canEdit={canEdit} onAdd={addBlock}
                             placeholder="Nouvelle règle LDC..." />
            </div>

            <div className="rounded-lg p-6" style={{ background: '#111111', borderTop: '3px solid #dc2626' }}>
              <h3 className="font-cinzel text-sm uppercase tracking-widest mb-4" style={{ color: '#dc2626' }}>
                GUERRES DE CLANS (GDC)
              </h3>
              <div className="flex flex-col gap-4">
                {gdcBlocks.map(block => (
                  <div key={block.id || block.key}>
                    {block.key.includes('jaune') ? <YL /> : <RL />}
                    <div className="mt-2 text-sm" style={{ color: '#aaa' }}>
                      <EditableText block={block} onSave={updateBlock} onDelete={removeBlock}
                                    canEdit={canEdit} tag="span" />
                    </div>
                  </div>
                ))}
              </div>
              <AddBlockButton section="cartons" canEdit={canEdit} onAdd={addBlock}
                             placeholder="Nouvelle règle GDC..." />
            </div>
          </div>
        </section>

        {/* SECTION 6 — Identité visuelle */}
        <section className="mb-14">
          <SectionHeader label="Identité Visuelle" />
          <div className="grid md:grid-cols-2 gap-6">

            <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl p-4">
              <p className="text-xs uppercase tracking-widest text-gray-600 mb-3">Logo Officiel</p>
              <EditableImage
                src={logoBlock?.value || '/images/logo_2.png'}
                storageKey="logo"
                canEdit={canEdit}
                label="Logo Officiel"
                onReplace={(url) => logoBlock && updateBlock(logoBlock.id, url)}
              />
              <a href="/images/logo_2.png" download="logo_donjon_rouge.png"
                 className="mt-2 block text-center px-4 py-2 rounded-xl border border-[#1f1f1f]
                            text-gray-500 text-xs hover:border-[#dc2626]/30 hover:text-gray-300 transition-all">
                ⬇️ Télécharger
              </a>
            </div>

            <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl p-4">
              <p className="text-xs uppercase tracking-widest text-gray-600 mb-3">Affiche Recrutement</p>
              <EditableImage
                src={recrutImageBlock?.value || '/images/recru.png'}
                storageKey="recrutement"
                canEdit={canEdit}
                label="Affiche Recrutement"
                onReplace={(url) => recrutImageBlock && updateBlock(recrutImageBlock.id, url)}
              />
              <a href="/images/recru.png" download="recrutement-donjon-rouge.png"
                 className="mt-2 block text-center px-4 py-2 rounded-xl border border-[#1f1f1f]
                            text-gray-500 text-xs hover:border-[#dc2626]/30 hover:text-gray-300 transition-all">
                ⬇️ Télécharger
              </a>
            </div>

          </div>
          <AddBlockButton section="identite" canEdit={canEdit} onAdd={addBlock}
                          placeholder="Nouveau bloc identité..." />
        </section>

        {/* SECTIONS CUSTOM */}
        {customSections.map(section => (
          <section key={section.key} className="mb-14 relative group">
            <SectionHeader label={`${section.icon} ${section.label}`} />
            {canEdit && (
              <button onClick={() => handleDeleteSection(section.key)}
                      className="absolute top-0 right-0 w-6 h-6 rounded-full bg-red-900/50
                                 border border-red-700/40 text-red-400 text-xs
                                 hidden group-hover:flex items-center justify-center
                                 hover:bg-red-900 transition-colors z-10">
                ✕
              </button>
            )}
            <div className="flex flex-col gap-2 p-4 rounded-xl bg-[#111111] border border-[#1f1f1f]">
              {(blocks[section.key] || []).map(block => (
                <div key={block.id} className="py-1">
                  <EditableText block={block} onSave={updateBlock} onDelete={removeBlock}
                                canEdit={canEdit} tag="p"
                                className="text-sm text-gray-300 leading-relaxed" />
                </div>
              ))}
              <AddBlockButton section={section.key} canEdit={canEdit} onAdd={addBlock} />
            </div>
          </section>
        ))}

        {/* Bouton créer nouvelle section */}
        {canEdit && (
          <div className="mt-6 flex justify-center">
            <button onClick={() => setShowCreateSection(true)}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl border border-dashed
                               border-[#dc2626]/30 text-[#dc2626]/60 text-sm font-semibold uppercase
                               hover:border-[#dc2626] hover:text-[#dc2626] transition-all duration-200">
              + Créer une nouvelle section
            </button>
          </div>
        )}

      </div>

      {/* Modal créer section */}
      {showCreateSection && (
        <div className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4"
             onClick={() => setShowCreateSection(false)}>
          <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl p-6 w-full max-w-sm shadow-2xl"
               onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-white uppercase mb-4">Nouvelle Section</h3>

            <div className="mb-3">
              <label className="text-xs uppercase text-gray-600 mb-1 block">Icône (emoji)</label>
              <input value={newSection.icon}
                     onChange={e => setNewSection(s => ({ ...s, icon: e.target.value }))}
                     placeholder="📋"
                     className="w-full px-3 py-2 rounded-lg bg-[#0d0d0d] border border-[#2a2a2a]
                                text-white text-sm focus:outline-none focus:border-[#dc2626]/50" />
            </div>

            <div className="mb-4">
              <label className="text-xs uppercase text-gray-600 mb-1 block">Titre de la section</label>
              <input value={newSection.label}
                     onChange={e => setNewSection(s => ({ ...s, label: e.target.value }))}
                     onKeyDown={e => { if (e.key === 'Enter') handleCreateSection() }}
                     placeholder="Ex: Calendrier des événements"
                     autoFocus
                     className="w-full px-3 py-2 rounded-lg bg-[#0d0d0d] border border-[#2a2a2a]
                                text-white text-sm focus:outline-none focus:border-[#dc2626]/50" />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowCreateSection(false)}
                      className="flex-1 py-2.5 rounded-xl border border-[#333]
                                 text-gray-400 text-sm font-semibold uppercase hover:border-[#555]">
                Annuler
              </button>
              <button onClick={handleCreateSection}
                      className="flex-1 py-2.5 rounded-xl bg-[#dc2626] text-white
                                 text-sm font-semibold uppercase hover:bg-[#b91c1c] transition-colors">
                Créer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

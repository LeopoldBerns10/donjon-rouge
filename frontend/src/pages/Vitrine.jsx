import { useState, useRef, useEffect } from 'react'

// ─── Player Audio Custom ──────────────────────────────────────────────────────
function AudioPlayer() {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
    } else {
      audio.play()
    }
    setPlaying(!playing)
  }

  const handleTimeUpdate = () => {
    const audio = audioRef.current
    if (!audio || !audio.duration) return
    setCurrentTime(audio.currentTime)
    setProgress((audio.currentTime / audio.duration) * 100)
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) setDuration(audioRef.current.duration)
  }

  const handleEnded = () => setPlaying(false)

  const handleSeek = (e) => {
    const audio = audioRef.current
    if (!audio || !audio.duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const ratio = x / rect.width
    audio.currentTime = ratio * audio.duration
  }

  const fmt = (s) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div className="rounded-lg p-6" style={{ background: '#111111', border: '1px solid #dc2626' }}>
      <h2 className="font-cinzel text-xs uppercase tracking-widest mb-4" style={{ color: '#666' }}>
        ♪ HYMNE DU CLAN
      </h2>
      <audio
        ref={audioRef}
        src="/audio/hymne.mp3"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      />
      <p className="font-cinzel text-xs uppercase tracking-wider mb-4" style={{ color: '#f0f0f0' }}>
        HYMNE OFFICIEL — DONJON ROUGE
      </p>
      <div className="flex items-center gap-4">
        {/* Bouton play/pause */}
        <button
          onClick={togglePlay}
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all hover:opacity-80"
          style={{ background: '#dc2626' }}
        >
          {playing ? (
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <polygon points="5,3 19,12 5,21" />
            </svg>
          )}
        </button>

        {/* Barre de progression */}
        <div className="flex-1 flex flex-col gap-1">
          <div
            className="w-full h-2 rounded-full cursor-pointer relative"
            style={{ background: '#1f1f1f' }}
            onClick={handleSeek}
          >
            <div
              className="h-2 rounded-full transition-all"
              style={{ width: `${progress}%`, background: '#dc2626' }}
            />
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
        style={{
          background: '#111111',
          borderLeft: open ? '3px solid #dc2626' : '3px solid transparent',
        }}
      >
        <span className="font-cinzel text-sm uppercase tracking-wider" style={{ color: '#f0f0f0' }}>
          {icon} {title}
        </span>
        <svg
          className="w-4 h-4 flex-shrink-0 transition-transform duration-200"
          style={{ color: '#666', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div
          className="px-5 py-4 text-sm leading-relaxed"
          style={{ background: '#0f0f0f', borderLeft: '3px solid #1f1f1f', color: '#aaa' }}
        >
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

// ─── Page Vitrine ─────────────────────────────────────────────────────────────
export default function Vitrine() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 animate-fade-up" style={{ background: '#0d0d0d' }}>

      {/* SECTION 1 — Hero Banner */}
      <section className="relative rounded-xl overflow-hidden mb-14 flex flex-col items-center py-16 px-4">
        {/* Background flou */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'url(/images/logo_2.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(8px)',
            opacity: 0.08,
          }}
        />
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
        <h2 className="font-cinzel text-xs uppercase tracking-widest mb-4" style={{ color: '#666' }}>
          HYMNE DU CLAN
        </h2>
        <AudioPlayer />
      </section>

      {/* SECTION 3 — Affiche Recrutement */}
      <section className="mb-14">
        <h2 className="font-cinzel text-xs uppercase tracking-widest mb-6" style={{ color: '#dc2626' }}>
          NOUS RECRUTONS
        </h2>
        <div
          className="rounded-xl p-8"
          style={{
            background: '#111111',
            border: '2px solid #dc2626',
            boxShadow: '0 0 40px rgba(220,38,38,0.2)',
          }}
        >
          {/* Titre */}
          <div className="mb-6">
            <h3 className="font-cinzel font-bold text-3xl uppercase mb-1">
              <span style={{ color: '#f0f0f0' }}>DONJON </span>
              <span style={{ color: '#dc2626' }}>ROUGE</span>
            </h3>
            <h3 className="font-cinzel font-bold text-3xl uppercase" style={{ color: '#f0f0f0' }}>
              RECRUTE
            </h3>
            <div className="mt-3 h-0.5 w-24" style={{ background: '#dc2626' }} />
          </div>

          {/* Critères */}
          <ul className="flex flex-col gap-3 mb-8">
            <li className="font-bold text-lg" style={{ color: '#dc2626' }}>🏰 HDV 15 MINIMUM</li>
            <li style={{ color: '#f0f0f0' }}>✅ ASSIDUITÉ</li>
            <li style={{ color: '#f0f0f0' }}>✅ ENVIE DE PROGRESSER</li>
            <li style={{ color: '#f97316' }}>⚠️ RESPECTE LES CONSIGNES</li>
          </ul>

          {/* Slogan */}
          <p className="text-xl italic text-center mb-8" style={{ color: '#f59e0b' }}>
            Viens, combat et conquéris !
          </p>

          {/* Bouton Discord */}
          <div className="flex justify-center">
            <a
              href="https://discord.gg/CXZcs4umFP"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 font-cinzel font-bold uppercase text-white rounded transition-all"
              style={{ background: '#dc2626' }}
              onMouseEnter={e => e.currentTarget.style.background = '#b91c1c'}
              onMouseLeave={e => e.currentTarget.style.background = '#dc2626'}
            >
              REJOINDRE LE CLAN — DISCORD
            </a>
          </div>
        </div>
      </section>

      {/* SECTION 4 — Règlement (accordéons) */}
      <section className="mb-14">
        <h2 className="font-cinzel text-xs uppercase tracking-widest mb-6" style={{ color: '#666' }}>
          RÈGLEMENT OFFICIEL
        </h2>
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
        <h2 className="font-cinzel text-xs uppercase tracking-widest mb-6" style={{ color: '#666' }}>
          SYSTÈME DE CARTONS
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          {/* LDC */}
          <div className="rounded-lg p-6" style={{ background: '#111111', borderTop: '3px solid #f59e0b' }}>
            <h3 className="font-cinzel text-sm uppercase tracking-widest mb-4" style={{ color: '#f59e0b' }}>
              LIGUE DE GUERRE (LDC)
            </h3>
            <div className="flex flex-col gap-4">
              <div>
                <YL />
                <ul className="mt-2 text-sm space-y-1" style={{ color: '#aaa' }}>
                  <li>• 1 attaque non faite → remplacement + carton LDC suivante + perte médailles</li>
                  <li>• Non-respect du règlement → carton LDC suivante</li>
                </ul>
              </div>
              <div>
                <RL />
                <ul className="mt-2 text-sm space-y-1" style={{ color: '#aaa' }}>
                  <li>• 2ème attaque non faite → <strong style={{ color: '#dc2626' }}>EXPULSION DU CLAN</strong></li>
                </ul>
              </div>
            </div>
          </div>

          {/* GDC */}
          <div className="rounded-lg p-6" style={{ background: '#111111', borderTop: '3px solid #dc2626' }}>
            <h3 className="font-cinzel text-sm uppercase tracking-widest mb-4" style={{ color: '#dc2626' }}>
              GUERRES DE CLANS (GDC)
            </h3>
            <div className="flex flex-col gap-4">
              <div>
                <YL />
                <ul className="mt-2 text-sm space-y-1" style={{ color: '#aaa' }}>
                  <li>• 1ère attaque non faite → carton GDC suivante</li>
                  <li>• Non-respect du règlement → carton GDC suivante</li>
                </ul>
              </div>
              <div>
                <RL />
                <ul className="mt-2 text-sm space-y-1" style={{ color: '#aaa' }}>
                  <li>• 2ème attaque non faite → Exclu des GDC 1 mois</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6 — Identité visuelle */}
      <section>
        <h2 className="font-cinzel text-xs uppercase tracking-widest mb-6" style={{ color: '#666' }}>
          IDENTITÉ VISUELLE
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          {/* Logo */}
          <div
            className="rounded-lg p-6 flex flex-col items-center gap-4 transition-all"
            style={{ background: '#111111', border: '1px solid #1f1f1f' }}
            onMouseEnter={e => e.currentTarget.style.border = '1px solid #dc2626'}
            onMouseLeave={e => e.currentTarget.style.border = '1px solid #1f1f1f'}
          >
            <img src="/images/logo.png" alt="Logo Donjon Rouge" className="h-40 w-auto object-contain" />
            <p className="font-cinzel text-xs uppercase tracking-widest" style={{ color: '#666' }}>
              LOGO OFFICIEL
            </p>
          </div>

          {/* Affiche recrutement */}
          <div
            className="rounded-lg p-6 flex flex-col items-center gap-4 transition-all"
            style={{ background: '#111111', border: '1px solid #1f1f1f' }}
            onMouseEnter={e => e.currentTarget.style.border = '1px solid #dc2626'}
            onMouseLeave={e => e.currentTarget.style.border = '1px solid #1f1f1f'}
          >
            <img src="/images/recru.png" alt="Affiche recrutement" className="h-40 w-auto object-contain" />
            <p className="font-cinzel text-xs uppercase tracking-widest" style={{ color: '#666' }}>
              AFFICHE DE RECRUTEMENT
            </p>
            <a
              href="/images/recru.png"
              download="recrutement-donjon-rouge.png"
              className="px-4 py-2 rounded font-cinzel text-xs uppercase tracking-wider transition-all"
              style={{ background: '#1f1f1f', color: '#f0f0f0', border: '1px solid #333' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#dc2626'; e.currentTarget.style.color = '#dc2626' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = '#f0f0f0' }}
            >
              Télécharger
            </a>
          </div>
        </div>
      </section>

    </div>
  )
}

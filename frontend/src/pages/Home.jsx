import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import DragonBackground from '../components/DragonBackground.jsx'
import StatCard from '../components/StatCard.jsx'
import { useCocClan } from '../hooks/useCocApi.js'

function useCountUp(target, duration = 1500) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!target) return
    let start = 0
    const step = target / (duration / 16)
    const timer = setInterval(() => {
      start += step
      if (start >= target) {
        setCount(target)
        clearInterval(timer)
      } else {
        setCount(Math.floor(start))
      }
    }, 16)
    return () => clearInterval(timer)
  }, [target])
  return count
}

export default function Home() {
  const { data: clan, loading } = useCocClan()
  const memberCount = useCountUp(clan?.members || 0)

  return (
    <div className="relative min-h-screen overflow-hidden">
      <DragonBackground />

      {/* Hero */}
      <section className="relative z-10 flex flex-col items-center justify-center min-h-[85vh] px-4 text-center">
        {/* Logo */}
        <div className="animate-float mb-8">
          <img
            src="/src/assets/logo.png"
            alt="Donjon Rouge"
            className="h-32 w-32 object-contain mx-auto drop-shadow-[0_0_30px_rgba(196,30,58,0.8)]"
            onError={(e) => {
              e.target.outerHTML = '<div class="h-32 w-32 mx-auto rounded-full flex items-center justify-center text-6xl" style="background:rgba(107,0,0,0.4);border:2px solid #C41E3A">🔴</div>'
            }}
          />
        </div>

        {/* Title */}
        <h1 className="font-cinzel-deco font-black mb-4 leading-tight">
          <span className="block text-6xl md:text-8xl text-crimson-gradient" style={{ textShadow: '0 0 60px rgba(196,30,58,0.5)' }}>
            DONJON
          </span>
          <span className="block text-6xl md:text-8xl text-gold-gradient" style={{ textShadow: '0 0 60px rgba(184,134,11,0.4)' }}>
            ROUGE
          </span>
        </h1>

        <p className="text-ash font-cinzel uppercase tracking-[0.3em] text-sm mb-2">
          Guilde Clash of Clans · #{(clan?.tag || '29292QPRC').replace('#', '')}
        </p>

        {/* Member counter */}
        <div className="my-6">
          <span className="text-5xl font-bold font-cinzel text-gold-light">{memberCount}</span>
          <span className="text-ash font-cinzel text-lg ml-2">/ {clan?.memberCount || 50} membres</span>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-wrap gap-4 justify-center mt-4">
          <Link
            to="/tracker"
            className="px-6 py-3 font-cinzel uppercase tracking-wider font-bold text-bone rounded transition-all hover:scale-105"
            style={{ background: 'linear-gradient(135deg, #6B0000, #C41E3A)', boxShadow: '0 0 20px rgba(196,30,58,0.4)' }}
          >
            Tracker Stats
          </Link>
          <Link
            to="/forum"
            className="px-6 py-3 font-cinzel uppercase tracking-wider font-bold text-bone rounded border border-crimson/50 hover:border-crimson transition-all hover:scale-105"
            style={{ background: 'rgba(107,0,0,0.2)' }}
          >
            Forum
          </Link>
          <a
            href="https://discord.gg/GQ5a6q6X"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 font-cinzel uppercase tracking-wider font-bold text-white rounded transition-all hover:scale-105"
            style={{ background: '#5865F2', boxShadow: '0 0 20px rgba(88,101,242,0.4)' }}
          >
            Discord
          </a>
        </div>
      </section>

      {/* Stats section */}
      {clan && (
        <section className="relative z-10 max-w-5xl mx-auto px-4 pb-20 animate-fade-up">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon="👥" label="Membres" value={clan.members} sub={`/ ${clan.memberCount || 50}`} />
            <StatCard icon="🏆" label="Trophées record" value={clan.clanPoints?.toLocaleString() || '—'} />
            <StatCard icon="⚔️" label="Guerres gagnées" value={clan.warWins || '—'} />
            <StatCard icon="⭐" label="Niveau clan" value={`Niv. ${clan.clanLevel || '—'}`} />
          </div>

          {/* War status banner */}
          {clan.isWarLogPublic !== undefined && (
            <div className="mt-8 card-stone p-5 flex items-center gap-4">
              <span className="text-3xl">⚔️</span>
              <div>
                <p className="font-cinzel text-sm uppercase tracking-widest text-gold-bright">
                  Prochaine guerre
                </p>
                <p className="text-bone mt-1">
                  {clan.isWarLogPublic
                    ? 'Journal de guerre public — consultez le Tracker pour les détails.'
                    : 'Journal de guerre privé.'}
                </p>
              </div>
              <Link
                to="/tracker"
                className="ml-auto text-crimson text-sm font-cinzel uppercase hover:text-ember transition-colors"
              >
                Voir →
              </Link>
            </div>
          )}
        </section>
      )}

      {loading && (
        <div className="relative z-10 text-center py-20 text-ash font-cinzel animate-pulse">
          Chargement des données du clan...
        </div>
      )}
    </div>
  )
}

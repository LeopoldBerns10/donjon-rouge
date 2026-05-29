import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import DragonBackground from '../components/DragonBackground.jsx'
import { useCocClan } from '../hooks/useCocApi.js'
import FireIntro from '../components/FireIntro.jsx'
import { AnimatedBackground } from '../components/AnimatedBackground.jsx'
import { getCapitalHallIcon } from '../utils/cocHelpers.js'
import { Roulette } from '../components/Roulette.jsx'

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
      <AnimatedBackground variant="home" />
      <FireIntro />
      <DragonBackground />

      {/* Hero */}
      <section className="relative z-10 flex flex-col items-center justify-center min-h-[85vh] overflow-hidden">
        {/* Dragon — fond absolu couvrant toute la section, SEUL */}
        <img
          src="/assets/dragon-blazon.png"
          alt=""
          className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
          style={{ opacity: 0.65, zIndex: 0 }}
        />

        {/* Contenu au-dessus du dragon */}
        <div className="relative z-10 flex flex-col items-center text-center px-4 w-full">
          {/* Logo clan */}
          <div className="animate-float mb-8">
            <img
              src={clan?.badgeUrls?.large || 'https://api-assets.clashofclans.com/badges/512/Cbal0SXAUxTFUsLag6SVrqBsFhAfrPfk9nAANTqQTMM.png'}
              alt="Donjon Rouge"
              className="w-36 h-36 md:w-44 md:h-44 object-contain mx-auto drop-shadow-[0_0_40px_rgba(220,38,38,0.6)] animate-pulse"
              style={{ animationDuration: '3s', position: 'relative', zIndex: 20 }}
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
          <div className="flex flex-wrap justify-center gap-3 mt-6">
            <Link to="/tracker"
              className="px-6 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wide bg-[#dc2626] hover:bg-[#b91c1c] text-white border border-[#dc2626] transition-all duration-200 hover:scale-[1.02]">
              ⚔️ Tracker Stats
            </Link>
            <Link to="/forum"
              className="px-6 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wide bg-transparent border border-[#333] text-gray-300 hover:border-[#dc2626]/50 hover:text-white transition-all duration-200 hover:scale-[1.02]">
              💬 Forum
            </Link>
            <Link to="/guilde" state={{ openTab: 'inscriptions' }}
              className="px-6 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wide bg-transparent border border-[#8b6914] text-[#f59e0b] hover:bg-[#f59e0b]/10 transition-all duration-200 hover:scale-[1.02]">
              ⚔️ Inscriptions GDC/LDC
            </Link>
            <a href="https://discord.gg/CXZcs4umFP" target="_blank" rel="noopener noreferrer"
              className="px-6 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wide bg-[#5865F2] hover:bg-[#4752c4] text-white border border-[#5865F2] transition-all duration-200 hover:scale-[1.02]">
              Discord
            </a>
          </div>
        </div>
      </section>

      {/* Stats + War section */}
      {clan && (
        <section className="relative z-10 max-w-4xl mx-auto px-4 pb-20 animate-fade-up">

          {/* 4 stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            {[
              { icon: '📍', label: 'Localisation', value: 'France' },
              { icon: '⭐', label: 'Niveau clan',  value: `Niv. ${clan.clanLevel || '—'}` },
            ].map(({ icon, label, value }) => (
              <div key={label}
                className="flex flex-col items-center gap-2 p-5 rounded-2xl bg-[#111111] border border-[#1f1f1f] hover:border-[#dc2626]/30 hover:shadow-lg hover:shadow-[#dc2626]/5 transition-all duration-200">
                <span className="text-2xl">{icon}</span>
                <p className="text-base font-bold text-white uppercase tracking-wide text-center">{value}</p>
                <p className="text-[10px] uppercase tracking-widest text-gray-600 text-center">{label}</p>
              </div>
            ))}

            {/* Ligue Guerre (CWL) — iconUrls directs depuis l'API CoC */}
            <div className="flex flex-col items-center gap-1.5 p-4 rounded-2xl bg-[#111111] border border-[#1f1f1f] hover:border-[#dc2626]/30 transition-all">
              {clan.warLeague?.iconUrls?.small ? (
                <img
                  src={clan.warLeague.iconUrls.small}
                  alt={clan.warLeague?.name || 'Ligue Guerre'}
                  className="w-10 h-10 object-contain"
                  onError={(e) => e.currentTarget.style.display = 'none'}
                />
              ) : (
                <span className="text-2xl">💎</span>
              )}
              <p className="text-sm font-bold text-white text-center leading-tight">
                {clan.warLeague?.name || '—'}
              </p>
              <p className="text-[10px] uppercase tracking-widest text-gray-600 text-center">Ligue Guerre</p>
            </div>
            {/* Capital Hall */}
            <div className="flex flex-col items-center gap-1.5 p-4 rounded-2xl bg-[#111111] border border-[#1f1f1f] hover:border-[#dc2626]/30 transition-all">
              <img src={getCapitalHallIcon()} alt="Capital Hall" className="w-12 h-12 object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
              <p className="text-lg font-black text-white">NIVEAU 10</p>
              <p className="text-[10px] uppercase tracking-widest text-gray-600">Capital Hall</p>
              {clan.capitalLeague && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  {clan.capitalLeague.iconUrls?.small && (
                    <img
                      src={clan.capitalLeague.iconUrls.small}
                      alt={clan.capitalLeague.name || 'Ligue Capitale'}
                      className="w-6 h-6 object-contain"
                      onError={(e) => e.currentTarget.style.display = 'none'}
                    />
                  )}
                  <span className="text-xs text-gray-400">{clan.capitalLeague.name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Roulette casino */}
          <Roulette />

          {/* War status */}
          {clan.isWarLogPublic !== undefined && (
            <div className="mt-6 p-4 rounded-2xl bg-[#111111] border border-[#1f1f1f] hover:border-[#dc2626]/30 transition-all duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">⚔️</span>
                  <div>
                    <p className="text-xs uppercase tracking-widest text-[#dc2626] font-semibold">
                      Prochaine Guerre
                    </p>
                    <p className="text-sm text-gray-400 mt-0.5">
                      {clan.isWarLogPublic
                        ? 'Journal de guerre public — consultez le Tracker pour les détails.'
                        : 'Journal de guerre privé.'}
                    </p>
                  </div>
                </div>
                <Link to="/guilde" state={{ openTab: 'gdcldc' }}
                  className="text-xs uppercase tracking-wide text-[#dc2626] hover:text-white transition-colors font-semibold ml-4 flex-shrink-0">
                  Voir →
                </Link>
              </div>
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

import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useCocPlayer } from '../hooks/useCocApi.js'
import { TROOP_ICONS, LEAGUE_INFO, ASSETS_BASE } from '../lib/constants.js'
import SectionHeader from '../components/SectionHeader.jsx'

const TABS = [
  'Vue d\'ensemble',
  'Ranked',
  'Attaques guerre',
  'Ligue Légende',
  'Guerres de Clans',
  'CWL',
  'Stats de guerre',
  'Raids',
  'Classements',
  'Troupes',
  'Succès'
]

function TroopIcon({ name, level, maxLevel }) {
  const url = TROOP_ICONS[name]
  const pct = maxLevel ? Math.round((level / maxLevel) * 100) : 100
  const isMax = level >= maxLevel

  return (
    <div className="flex flex-col items-center gap-1 w-16">
      <div className="relative w-12 h-12">
        {url ? (
          <img
            src={url}
            alt={name}
            className={`w-12 h-12 object-contain rounded ${isMax ? 'ring-2 ring-gold-light' : ''}`}
            onError={(e) => {
              e.target.outerHTML = `<div class="w-12 h-12 bg-fog rounded flex items-center justify-center text-xs text-ash text-center leading-tight p-1">${name.slice(0, 4)}</div>`
            }}
          />
        ) : (
          <div className="w-12 h-12 bg-fog rounded flex items-center justify-center text-xs text-ash text-center leading-tight p-1">
            {name.slice(0, 4)}
          </div>
        )}
        <span className="absolute -bottom-1 -right-1 text-xs font-bold px-1 rounded"
          style={{ background: isMax ? '#B8860B' : '#181818', color: isMax ? '#0e0e0e' : '#d4c5a9', border: '1px solid #333' }}>
          {level}
        </span>
      </div>
      <div className="w-12 h-1 rounded bg-fog overflow-hidden">
        <div className="h-full rounded" style={{ width: `${pct}%`, background: isMax ? '#D4A017' : '#C41E3A' }} />
      </div>
    </div>
  )
}

function ProgressBar({ label, current, max }) {
  const pct = max ? Math.round((current / max) * 100) : 0
  return (
    <div className="mb-4">
      <div className="flex justify-between text-xs font-cinzel uppercase text-ash mb-1">
        <span>{label}</span>
        <span className="text-gold-light">{pct}%</span>
      </div>
      <div className="h-2 bg-fog rounded overflow-hidden">
        <div className="h-full rounded transition-all duration-700" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #6B0000, #C41E3A)' }} />
      </div>
    </div>
  )
}

function TroopsGrid({ title, items }) {
  if (!items || items.length === 0) return null
  const current = items.reduce((s, t) => s + (t.level || 0), 0)
  const max = items.reduce((s, t) => s + (t.maxLevel || 0), 0)

  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-sm font-cinzel font-bold text-bone uppercase tracking-wider">{title}</span>
        <div className="flex-1 h-px bg-fog" />
        <span className="text-xs text-gold-light font-cinzel">{max ? Math.round((current / max) * 100) : 0}%</span>
      </div>
      <div className="flex flex-wrap gap-4">
        {items.map((t) => (
          <TroopIcon key={t.name} name={t.name} level={t.level} maxLevel={t.maxLevel} />
        ))}
      </div>
    </div>
  )
}

export default function PlayerProfile() {
  const { tag } = useParams()
  const decodedTag = decodeURIComponent(tag)
  const { data: player, loading, error } = useCocPlayer(decodedTag)
  const [activeTab, setActiveTab] = useState(0)

  if (loading) {
    return (
      <div className="text-center py-32 text-ash font-cinzel animate-pulse">
        Chargement du profil...
      </div>
    )
  }

  if (error || !player) {
    return (
      <div className="text-center py-20">
        <p className="text-crimson font-cinzel mb-4">Profil introuvable</p>
        <Link to="/tracker" className="text-gold hover:text-gold-light font-cinzel uppercase text-sm">
          ← Retour au Tracker
        </Link>
      </div>
    )
  }

  const league = player.league?.name
  const leagueInfo = LEAGUE_INFO[league]

  const heroes = player.heroes || []
  const heroEquipment = player.heroEquipment || []
  const pets = player.troops?.filter((t) => t.village === 'home' && t.superTroopIsActive === undefined && t.name?.includes('') && ['L.A.S.S.I', 'Electro Owl', 'Mighty Yak', 'Unicorn', 'Phoenix', 'Poison Lizard', 'Diggy', 'Frosty', 'Spirit Fox', 'Angry Jelly'].includes(t.name)) || []
  const siegeMachines = player.troops?.filter((t) => ['Wall Wrecker', 'Battle Blimp', 'Stone Slammer', 'Siege Barracks', 'Log Launcher', 'Flame Flinger', 'Battle Drill'].includes(t.name)) || []
  const homeTroops = player.troops?.filter((t) => t.village === 'home' && !['Wall Wrecker', 'Battle Blimp', 'Stone Slammer', 'Siege Barracks', 'Log Launcher', 'Flame Flinger', 'Battle Drill'].includes(t.name) && !['L.A.S.S.I', 'Electro Owl', 'Mighty Yak', 'Unicorn', 'Phoenix', 'Poison Lizard', 'Diggy', 'Frosty', 'Spirit Fox', 'Angry Jelly'].includes(t.name)) || []
  const darkTroops = player.troops?.filter((t) => t.village === 'builderBase') || []
  const spells = player.spells || []
  const superTroops = player.troops?.filter((t) => t.superTroopIsActive !== undefined) || []

  const allTroops = [...heroes, ...homeTroops, ...darkTroops, ...spells, ...siegeMachines]
  const totalCurrent = allTroops.reduce((s, t) => s + (t.level || 0), 0)
  const totalMax = allTroops.reduce((s, t) => s + (t.maxLevel || 0), 0)

  const achievements = player.achievements || []

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 animate-fade-up">
      <Link to="/tracker" className="text-ash hover:text-bone font-cinzel uppercase text-xs tracking-widest mb-6 inline-block">
        ← Retour au Tracker
      </Link>

      {/* Header */}
      <div className="card-stone p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* Town Hall avatar */}
          <div className="flex-shrink-0">
            <div className="w-24 h-24 rounded flex items-center justify-center text-4xl font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #6B0000, #C41E3A)' }}>
              {player.townHallLevel}
            </div>
            <p className="text-center text-xs text-ash font-cinzel mt-1 uppercase">HDV</p>
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold font-cinzel text-bone">{player.name}</h1>
              {leagueInfo && (
                <span style={{ color: leagueInfo.color }} className="text-sm font-cinzel">
                  {leagueInfo.icon} {league?.replace(' League', '')}
                </span>
              )}
            </div>
            <p className="text-ash text-sm font-cinzel">{player.tag}</p>
            {player.clan && (
              <p className="text-gold text-sm mt-1 font-cinzel">
                {player.clan.name} · {player.role}
              </p>
            )}

            {/* Quick stats */}
            <div className="flex flex-wrap gap-4 mt-4">
              <div className="text-center">
                <div className="text-xl font-bold text-gold-light">⚔️ {player.attackWins || 0}</div>
                <div className="text-xs text-ash font-cinzel uppercase">Attaques</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-gold-light">✖️ {player.defenseWins || 0}</div>
                <div className="text-xs text-ash font-cinzel uppercase">Défenses</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-gold-light">⭐ {player.warStars || 0}</div>
                <div className="text-xs text-ash font-cinzel uppercase">Étoiles guerre</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-gold-light">🏆 {player.trophies || 0}</div>
                <div className="text-xs text-ash font-cinzel uppercase">Trophées</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-gold-light">🛡️ {player.donations || 0}</div>
                <div className="text-xs text-ash font-cinzel uppercase">Dons</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex overflow-x-auto gap-1 mb-6 pb-1">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            className={`flex-shrink-0 px-4 py-2 text-xs font-cinzel uppercase tracking-wider rounded transition-all ${
              activeTab === i
                ? 'text-bone'
                : 'text-ash hover:text-bone border border-transparent'
            }`}
            style={activeTab === i ? { background: 'linear-gradient(135deg, #6B0000, #C41E3A)' } : {}}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="card-stone p-6">

        {/* Vue d'ensemble */}
        {activeTab === 0 && (
          <div>
            <h3 className="font-cinzel text-gold-bright uppercase tracking-wider mb-4">Statistiques générales</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: 'Niveau expérience', value: player.expLevel },
                { label: 'Trophées', value: player.trophies },
                { label: 'Meilleurs trophées', value: player.bestTrophies },
                { label: 'Trophées guerre', value: player.warStars },
                { label: 'Étoiles de guerre', value: player.warStars },
                { label: 'Dons reçus', value: player.donationsReceived },
              ].map((s) => (
                <div key={s.label} className="bg-stone p-3 rounded border border-fog">
                  <div className="text-xl font-bold text-gold-light font-cinzel">{s.value ?? '—'}</div>
                  <div className="text-xs text-ash font-cinzel uppercase mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Troupes */}
        {activeTab === 9 && (
          <div>
            {totalMax > 0 && (
              <ProgressBar label="Progression totale" current={totalCurrent} max={totalMax} />
            )}

            <TroopsGrid
              title="Héros"
              items={heroes}
            />
            <TroopsGrid
              title="Équipement de héros"
              items={heroEquipment}
            />
            <TroopsGrid
              title="Familiers"
              items={pets}
            />
            <TroopsGrid
              title="Machines de siège"
              items={siegeMachines}
            />
            <TroopsGrid
              title="Troupes"
              items={homeTroops.filter((t) => !superTroops.find((s) => s.name === t.name))}
            />
            <TroopsGrid
              title="Troupes noires"
              items={darkTroops}
            />
            <TroopsGrid
              title="Sorts"
              items={spells}
            />
            {superTroops.length > 0 && (
              <TroopsGrid title="Super Troupes" items={superTroops} />
            )}
          </div>
        )}

        {/* Succès */}
        {activeTab === 10 && (
          <div>
            <h3 className="font-cinzel text-gold-bright uppercase tracking-wider mb-4">Succès</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {achievements.map((a) => (
                <div key={a.name} className="bg-stone p-3 rounded border border-fog">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-bone text-sm">{a.name}</p>
                      <p className="text-xs text-ash mt-0.5">{a.info}</p>
                    </div>
                    {a.completionInfo && (
                      <span className="text-xs text-gold ml-2 flex-shrink-0">{a.completionInfo}</span>
                    )}
                  </div>
                  <div className="mt-2 h-1.5 bg-fog rounded overflow-hidden">
                    <div
                      className="h-full rounded"
                      style={{
                        width: `${Math.min(100, Math.round((a.value / a.target) * 100))}%`,
                        background: a.stars >= 3 ? '#D4A017' : '#C41E3A'
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-ash mt-1">
                    <span>{a.value?.toLocaleString()} / {a.target?.toLocaleString()}</span>
                    <span>{'⭐'.repeat(a.stars || 0)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Autres onglets — placeholder */}
        {![0, 9, 10].includes(activeTab) && (
          <div className="text-center py-12 text-ash font-cinzel">
            <p className="text-4xl mb-4">⚔️</p>
            <p className="uppercase tracking-widest text-sm">{TABS[activeTab]}</p>
            <p className="text-xs mt-2 text-fog">Données disponibles via l'API CoC</p>
          </div>
        )}
      </div>
    </div>
  )
}

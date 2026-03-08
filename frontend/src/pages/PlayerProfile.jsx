import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useCocPlayer } from '../hooks/useCocApi.js'
import { LEAGUE_INFO } from '../lib/constants.js'
import { translateRole, getTroopImageUrl, getTownHallImageUrl } from '../utils/cocHelpers.js'
import SectionHeader from '../components/SectionHeader.jsx'

const TABS = [
  'Vue d\'ensemble',
  'Guerre',
  'Ranked',
  'Raids',
  'Troupes',
  'Succès'
]

const LEAGUES_2025 = [
  { name: 'Squelette',  icon: '💀' },
  { name: 'Barbare',    icon: '⚔️' },
  { name: 'Archer',     icon: '🏹' },
  { name: 'Sorcier',    icon: '🔮' },
  { name: 'Valkyrie',   icon: '🪓' },
  { name: 'Sorcière',   icon: '🦇' },
  { name: 'Golem',      icon: '🪨' },
  { name: 'Géant',      icon: '🦴' },
  { name: 'P.E.K.K.A',  icon: '🤖' },
  { name: 'Legend',     icon: '❄️' },
]

function TroopIcon({ name, level, maxLevel, category = 'troops' }) {
  const url = getTroopImageUrl(name, category)
  const pct = maxLevel ? Math.round((level / maxLevel) * 100) : 100
  const isMax = level >= maxLevel

  return (
    <div className="flex flex-col items-center gap-1 w-16" title={name}>
      <div className="relative w-12 h-12 rounded border border-fog/50"
        style={{ background: '#1a1a1a' }}>
        <img
          src={url}
          alt={name}
          className={`w-12 h-12 object-contain rounded ${isMax ? 'ring-2 ring-gold-light' : ''}`}
          onError={(e) => {
            e.target.outerHTML = `<div class="w-12 h-12 flex items-center justify-center text-xs text-ash text-center leading-tight p-1" style="background:#2a2a2a;border-radius:4px">${level}</div>`
          }}
        />
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

function TroopsGrid({ title, items, category = 'troops' }) {
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
          <TroopIcon key={t.name} name={t.name} level={t.level} maxLevel={t.maxLevel} category={category} />
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
  const pets = player.troops?.filter((t) => ['L.A.S.S.I', 'Electro Owl', 'Mighty Yak', 'Unicorn', 'Phoenix', 'Poison Lizard', 'Diggy', 'Frosty', 'Spirit Fox', 'Angry Jelly'].includes(t.name)) || []
  const siegeMachines = player.troops?.filter((t) => ['Wall Wrecker', 'Battle Blimp', 'Stone Slammer', 'Siege Barracks', 'Log Launcher', 'Flame Flinger', 'Battle Drill'].includes(t.name)) || []
  const homeTroops = player.troops?.filter((t) => t.village === 'home' && !['Wall Wrecker', 'Battle Blimp', 'Stone Slammer', 'Siege Barracks', 'Log Launcher', 'Flame Flinger', 'Battle Drill'].includes(t.name) && !['L.A.S.S.I', 'Electro Owl', 'Mighty Yak', 'Unicorn', 'Phoenix', 'Poison Lizard', 'Diggy', 'Frosty', 'Spirit Fox', 'Angry Jelly'].includes(t.name)) || []
  const darkTroops = player.troops?.filter((t) => t.village === 'builderBase') || []
  const spells = player.spells || []
  const superTroops = player.troops?.filter((t) => t.superTroopIsActive !== undefined) || []

  const allTroops = [...heroes, ...homeTroops, ...darkTroops, ...spells, ...siegeMachines]
  const totalCurrent = allTroops.reduce((s, t) => s + (t.level || 0), 0)
  const totalMax = allTroops.reduce((s, t) => s + (t.maxLevel || 0), 0)

  const achievements = player.achievements || []

  // Detect current 2025 league from player.league.name
  const currentLeagueName = player.league?.name || ''
  const currentLeagueIdx = LEAGUES_2025.findIndex(l =>
    currentLeagueName.toLowerCase().includes(l.name.toLowerCase())
  )

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 animate-fade-up">
      <Link to="/tracker" className="text-ash hover:text-bone font-cinzel uppercase text-xs tracking-widest mb-6 inline-block">
        ← Retour au Tracker
      </Link>

      {/* Header */}
      <div className="card-stone p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* Town Hall avatar */}
          <div className="flex-shrink-0 text-center">
            <img
              src={getTownHallImageUrl(player.townHallLevel)}
              alt={`HDV${player.townHallLevel}`}
              className="w-24 h-24 object-contain mx-auto"
              onError={(e) => {
                e.target.outerHTML = `<div class="w-24 h-24 rounded flex items-center justify-center text-4xl font-bold text-white" style="background:linear-gradient(135deg,#6B0000,#C41E3A)">${player.townHallLevel}</div>`
              }}
            />
            <p className="text-center text-xs text-ash font-cinzel mt-1 uppercase">HDV {player.townHallLevel}</p>
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
                {player.clan.name} · {translateRole(player.role)}
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

        {/* 0 — Vue d'ensemble */}
        {activeTab === 0 && (
          <div>
            <h3 className="font-cinzel text-gold-bright uppercase tracking-wider mb-4">Statistiques générales</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: 'Niveau expérience', value: player.expLevel },
                { label: 'Trophées', value: player.trophies },
                { label: 'Meilleurs trophées', value: player.bestTrophies },
                { label: 'Étoiles de guerre', value: player.warStars },
                { label: 'Attaques gagnées', value: player.attackWins },
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

        {/* 1 — Guerre (fusion Attaques + Guerres de Clans + Stats) */}
        {activeTab === 1 && (
          <div>
            <h3 className="font-cinzel text-gold-bright uppercase tracking-wider mb-6">Guerre</h3>

            {/* Stats principales */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-stone p-5 rounded border border-fog text-center">
                <div className="text-3xl font-bold text-gold-light font-cinzel">{player.warStars || 0}</div>
                <div className="text-xs text-ash font-cinzel uppercase mt-2">⭐ Étoiles totales</div>
              </div>
              <div className="bg-stone p-5 rounded border border-fog text-center">
                <div className="text-3xl font-bold text-green-400 font-cinzel">{player.attackWins || 0}</div>
                <div className="text-xs text-ash font-cinzel uppercase mt-2">⚔️ Attaques gagnées</div>
              </div>
              <div className="bg-stone p-5 rounded border border-fog text-center">
                <div className="text-3xl font-bold font-cinzel" style={{ color: '#C41E3A' }}>{player.defenseWins || 0}</div>
                <div className="text-xs text-ash font-cinzel uppercase mt-2">🛡️ Défenses gagnées</div>
              </div>
              <div className="bg-stone p-5 rounded border border-fog text-center">
                <div className="text-3xl font-bold text-bone font-cinzel">
                  {player.defenseWins > 0
                    ? (player.attackWins / player.defenseWins).toFixed(2)
                    : player.attackWins > 0 ? '∞' : '—'}
                </div>
                <div className="text-xs text-ash font-cinzel uppercase mt-2">📊 Ratio Att/Déf</div>
              </div>
            </div>

            {/* Participation + Ligue de guerre */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-stone p-5 rounded border border-fog text-center">
                <div className={`text-2xl font-bold font-cinzel ${player.warPreference === 'opted_in' || player.clanWarOptedIn ? 'text-green-400' : 'text-ash'}`}>
                  {player.warPreference === 'opted_in' || player.clanWarOptedIn ? '✅ Opt-in' : player.warPreference === 'opted_out' ? '❌ Opt-out' : '—'}
                </div>
                <div className="text-xs text-ash font-cinzel uppercase mt-2">Participation guerre</div>
              </div>
              {player.clan?.warLeague && (
                <div className="bg-stone p-5 rounded border border-fog text-center">
                  <div className="text-xl font-bold text-bone font-cinzel">{player.clan.warLeague.name || '—'}</div>
                  <div className="text-xs text-ash font-cinzel uppercase mt-2">🏆 Ligue de guerre du clan</div>
                </div>
              )}
            </div>

            {/* Équipement actif */}
            {heroEquipment.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-cinzel uppercase text-ash mb-3 flex items-center gap-2">
                  Équipement de héros actif
                  <span className="flex-1 h-px bg-fog/40 ml-1" />
                </p>
                <div className="flex flex-wrap gap-2">
                  {heroEquipment.filter(e => e.isActive !== false).map((eq) => (
                    <span key={eq.name} className="text-xs font-cinzel px-2 py-1 rounded border border-gold/30 text-gold-light">
                      {eq.name} Niv.{eq.level}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-ash/60 font-cinzel text-center mt-6">
              Les étoiles de guerre sont le total cumulé depuis la création du compte. Attaques et défenses correspondent à la saison en cours.
            </p>
          </div>
        )}

        {/* 2 — Ranked */}
        {activeTab === 2 && (
          <div>
            <h3 className="font-cinzel text-gold-bright uppercase tracking-wider mb-6">Ranked</h3>

            {/* Ligue principale + ladder 2025 */}
            <div className="mb-6">
              <p className="text-xs font-cinzel uppercase text-ash mb-3">Progression des ligues 2025</p>
              <div className="flex flex-wrap items-center gap-1">
                {LEAGUES_2025.map((l, idx) => {
                  const isActive = currentLeagueIdx === idx
                  const isPast = currentLeagueIdx > idx
                  return (
                    <div key={l.name} className="flex items-center gap-1">
                      <div
                        className={`flex flex-col items-center px-3 py-2 rounded border text-center transition-all ${
                          isActive
                            ? 'border-gold bg-gold/10'
                            : isPast
                            ? 'border-fog/60 bg-fog/10 opacity-60'
                            : 'border-fog/30 opacity-40'
                        }`}
                      >
                        <span className="text-lg">{l.icon}</span>
                        <span className={`text-xs font-cinzel mt-0.5 ${isActive ? 'text-gold-light font-bold' : 'text-ash'}`}>
                          {l.name}
                        </span>
                        {isActive && (
                          <span className="text-xs text-gold mt-0.5">▲ Actuel</span>
                        )}
                      </div>
                      {idx < LEAGUES_2025.length - 1 && (
                        <span className="text-fog/40 text-xs">→</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Trophées actuels */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-stone p-4 rounded border border-fog">
                <p className="text-xs font-cinzel uppercase text-ash mb-3">Ligue actuelle</p>
                <div className="flex items-center gap-3">
                  {player.league?.iconUrls?.medium && (
                    <img src={player.league.iconUrls.medium} alt={player.league.name} className="w-14 h-14 object-contain" />
                  )}
                  <div>
                    <p className="font-bold text-bone font-cinzel">{player.league?.name || 'Sans ligue'}</p>
                    <p className="text-2xl font-bold text-gold-light mt-1">{player.trophies?.toLocaleString()} 🏆</p>
                    <p className="text-xs text-ash">Record : {player.bestTrophies?.toLocaleString()} 🏆</p>
                  </div>
                </div>
              </div>

              <div className="bg-stone p-4 rounded border border-fog">
                <p className="text-xs font-cinzel uppercase text-ash mb-3">Base du Constructeur</p>
                <div className="flex items-center gap-3">
                  {player.builderBaseLeague?.iconUrls?.medium && (
                    <img src={player.builderBaseLeague.iconUrls.medium} alt={player.builderBaseLeague.name} className="w-14 h-14 object-contain" />
                  )}
                  <div>
                    <p className="font-bold text-bone font-cinzel">{player.builderBaseLeague?.name || 'Sans ligue'}</p>
                    <p className="text-2xl font-bold text-gold-light mt-1">{(player.builderBaseTrophies || 0).toLocaleString()} 🏆</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Ligue Légende — si disponible */}
            {player.legendStatistics ? (
              <div>
                <p className="text-xs font-cinzel uppercase text-ash mb-3 flex items-center gap-2">
                  <span>❄️</span> Ligue Légende — Saison en cours
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-stone p-5 rounded border border-purple-700 text-center">
                    <p className="text-xs text-purple-400 font-cinzel uppercase mb-2">Trophées</p>
                    <p className="text-3xl font-bold text-gold-light font-cinzel">
                      {player.legendStatistics.currentSeason?.trophies?.toLocaleString() ?? '—'} 🏆
                    </p>
                  </div>
                  <div className="bg-stone p-5 rounded border border-purple-700 text-center">
                    <p className="text-xs text-purple-400 font-cinzel uppercase mb-2">Rang mondial</p>
                    <p className="text-3xl font-bold text-bone font-cinzel">
                      {player.legendStatistics.currentSeason?.rank
                        ? `#${player.legendStatistics.currentSeason.rank.toLocaleString()}`
                        : '—'}
                    </p>
                  </div>
                  <div className="bg-stone p-5 rounded border border-purple-700 text-center">
                    <p className="text-xs text-purple-400 font-cinzel uppercase mb-2">Position dans le groupe</p>
                    <p className="text-3xl font-bold text-bone font-cinzel">
                      {player.legendStatistics.currentSeason?.rank
                        ? `${((player.legendStatistics.currentSeason.rank - 1) % 100) + 1}/100`
                        : '—'}
                    </p>
                    <p className="text-xs text-ash/60 mt-1 font-cinzel">groupes de 100</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-stone p-4 rounded border border-fog/50 text-center">
                <p className="text-ash font-cinzel text-sm">
                  Ce joueur n'est pas en Ligue Légende.
                  Ligue actuelle : <span className="text-bone">{player.league?.name || 'Sans ligue'}</span>
                </p>
              </div>
            )}
          </div>
        )}

        {/* 3 — Raids */}
        {activeTab === 3 && (
          <div>
            <h3 className="font-cinzel text-gold-bright uppercase tracking-wider mb-6">Raids — Capital des Clans</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {player.clanCapitalContributions !== undefined && (
                <div className="bg-stone p-5 rounded border border-fog text-center">
                  <div className="text-3xl font-bold text-gold-light font-cinzel">
                    {player.clanCapitalContributions?.toLocaleString() || 0}
                  </div>
                  <div className="text-xs text-ash font-cinzel uppercase mt-2">💎 Contributions Capital total</div>
                </div>
              )}
              <div className="bg-stone p-5 rounded border border-fog text-center">
                <div className="text-3xl font-bold text-bone font-cinzel">
                  {player.clan?.name || '—'}
                </div>
                <div className="text-xs text-ash font-cinzel uppercase mt-2">🏰 Clan actuel</div>
              </div>
            </div>
            <div className="bg-stone p-4 rounded border border-fog/50 text-center">
              <p className="text-xs text-ash/60 font-cinzel">
                L'historique détaillé des saisons de raid (capital pillé, attaques par saison) est disponible via l'onglet Raids de la page Guilde.
              </p>
            </div>
          </div>
        )}

        {/* 4 — Troupes */}
        {activeTab === 4 && (
          <div>
            {totalMax > 0 && (
              <ProgressBar label="Progression totale" current={totalCurrent} max={totalMax} />
            )}

            <TroopsGrid title="Héros" items={heroes} category="heroes" />
            <TroopsGrid title="Équipement de héros" items={heroEquipment} category="equipment" />
            <TroopsGrid title="Familiers" items={pets} category="pets" />
            <TroopsGrid title="Machines de siège" items={siegeMachines} category="siege" />
            <TroopsGrid
              title="Troupes"
              items={homeTroops.filter((t) => !superTroops.find((s) => s.name === t.name))}
              category="troops"
            />
            <TroopsGrid title="Troupes noires" items={darkTroops} category="troops" />
            <TroopsGrid title="Sorts" items={spells} category="spells" />
            {superTroops.length > 0 && (
              <TroopsGrid title="Super Troupes" items={superTroops} category="troops" />
            )}
          </div>
        )}

        {/* 5 — Succès */}
        {activeTab === 5 && (
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
      </div>
    </div>
  )
}

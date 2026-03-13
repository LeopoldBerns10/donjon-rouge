import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useCocPlayer, useCocWar } from '../hooks/useCocApi.js'
import { LEAGUE_INFO } from '../lib/constants.js'
import { translateRole, getTroopImageUrl, getTownHallImageUrl, getLeagueImageUrl, getLeagueShortName } from '../utils/cocHelpers.js'
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
  { name: 'Electro',    icon: '⚡' },
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
  const { data: warData } = useCocWar()
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

  const DARK_TROOP_NAMES = [
    'Minion', 'Hog Rider', 'Valkyrie', 'Golem', 'Witch',
    'Lava Hound', 'Bowler', 'Ice Golem', 'Headhunter',
    'Apprentice Warden', 'Druid', 'Furnace'
  ]
  const SUPER_TROOP_NAMES = [
    'Super Barbarian', 'Super Archer', 'Super Giant', 'Sneaky Goblin',
    'Super Wall Breaker', 'Rocket Balloon', 'Super Wizard', 'Super Dragon',
    'Inferno Dragon', 'Super Minion', 'Super Valkyrie', 'Super Witch',
    'Ice Hound', 'Super Bowler', 'Super Miner', 'Super Hog Rider', 'Super Yeti'
  ]
  const SIEGE_NAMES = [
    'Wall Wrecker', 'Battle Blimp', 'Stone Slammer', 'Siege Barracks',
    'Log Launcher', 'Flame Flinger', 'Battle Drill', 'Troop Launcher'
  ]
  const PET_NAMES = [
    'L.A.S.S.I', 'Electro Owl', 'Mighty Yak', 'Unicorn', 'Phoenix',
    'Poison Lizard', 'Diggy', 'Frosty', 'Spirit Fox', 'Angry Jelly',
    'Sneezy', 'Greedy Raven'
  ]

  const pets = player.troops?.filter((t) => PET_NAMES.includes(t.name)) || []
  const siegeMachines = player.troops?.filter((t) => SIEGE_NAMES.includes(t.name)) || []
  const superTroops = player.troops?.filter((t) => SUPER_TROOP_NAMES.includes(t.name)) || []
  const darkTroops = player.troops?.filter((t) =>
    t.village === 'home' &&
    DARK_TROOP_NAMES.includes(t.name)
  ) || []
  const homeTroops = player.troops?.filter((t) =>
    t.village === 'home' &&
    !SIEGE_NAMES.includes(t.name) &&
    !PET_NAMES.includes(t.name) &&
    !DARK_TROOP_NAMES.includes(t.name) &&
    !SUPER_TROOP_NAMES.includes(t.name)
  ) || []
  const spells = player.spells || []

  const allTroops = [...heroes, ...homeTroops, ...darkTroops, ...spells, ...siegeMachines]
  const totalCurrent = allTroops.reduce((s, t) => s + (t.level || 0), 0)
  const totalMax = allTroops.reduce((s, t) => s + (t.maxLevel || 0), 0)

  const achievements = player.achievements || []

  // Detect current 2025 league from leagueTier.name (new system) or league.name (fallback)
  const currentLeagueName = player.leagueTier?.name || player.league?.name || ''
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
              {league && (
                <div className="flex items-center gap-1">
                  <img
                    src={getLeagueImageUrl(league)}
                    alt={league}
                    className="w-8 h-8 object-contain"
                    onError={(e) => { e.target.style.display = 'none' }}
                  />
                  <span className="text-sm font-cinzel text-bone">
                    {getLeagueShortName(league)}
                  </span>
                </div>
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

        {/* 1 — Guerre */}
        {activeTab === 1 && (() => {
          const warState = warData?.state
          const isActive = warState === 'inWar' || warState === 'preparation' || warState === 'warEnded'
          const playerInWar = warData?.clan?.members?.find(m => m.tag === player.tag)
          const attacks = playerInWar?.attacks || []

          const stateLabel = {
            inWar: { text: 'Guerre en cours', color: 'text-green-400', border: 'border-green-700' },
            preparation: { text: 'Phase de préparation', color: 'text-yellow-400', border: 'border-yellow-700' },
            warEnded: { text: 'Guerre terminée', color: 'text-ash', border: 'border-fog' },
          }[warState]

          return (
            <div>
              <h3 className="font-cinzel text-gold-bright uppercase tracking-wider mb-6">Guerre</h3>

              {/* Guerre actuelle */}
              {isActive && warData ? (
                <div className={`bg-stone p-5 rounded border ${stateLabel?.border || 'border-fog'} mb-6`}>
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                    <p className={`text-sm font-cinzel font-bold uppercase ${stateLabel?.color || 'text-ash'}`}>
                      ⚔️ {stateLabel?.text}
                    </p>
                    <p className="text-xs text-ash font-cinzel">
                      {warData.clan?.name} vs {warData.opponent?.name}
                    </p>
                  </div>

                  {attacks.length > 0 ? (
                    <div>
                      <p className="text-xs font-cinzel uppercase text-ash mb-3">Vos attaques dans cette guerre</p>
                      <div className="flex flex-col gap-2">
                        {attacks.map((atk, i) => {
                          const defender = warData.opponent?.members?.find(m => m.tag === atk.defenderTag)
                          return (
                            <div key={i} className="flex items-center justify-between bg-fog/10 px-4 py-2 rounded border border-fog/30">
                              <div className="text-sm font-cinzel text-bone">
                                vs {defender?.name || atk.defenderTag}
                                <span className="text-xs text-ash ml-2">HDV {defender?.townhallLevel || '?'}</span>
                              </div>
                              <div className="flex items-center gap-4 text-sm font-cinzel">
                                <span className="text-gold-light">{'⭐'.repeat(atk.stars || 0)}{'☆'.repeat(3 - (atk.stars || 0))}</span>
                                <span className="text-bone">{atk.destructionPercentage ?? 0}%</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ) : (
                    <p className="text-ash text-sm font-cinzel text-center py-2">
                      {playerInWar ? 'Aucune attaque effectuée dans cette guerre.' : 'Ce joueur ne participe pas à la guerre actuelle.'}
                    </p>
                  )}
                </div>
              ) : (
                <div className="bg-stone p-5 rounded border border-fog text-center mb-6">
                  <p className="text-ash font-cinzel text-sm">⚔️ Aucune guerre active actuellement</p>
                </div>
              )}

              {/* Historique */}
              <div className="bg-stone p-5 rounded border border-fog/50">
                <p className="text-xs font-cinzel uppercase text-ash mb-3">Historique des guerres</p>
                <p className="text-ash/60 text-sm font-cinzel text-center py-4">
                  L'API Clash of Clans ne fournit pas d'historique individuel des guerres par joueur.<br />
                  Consultez l'onglet <span className="text-gold">Guerre</span> de la page Guilde pour l'historique du clan.
                </p>
              </div>
            </div>
          )
        })()}

        {/* 2 — Ranked */}
        {activeTab === 2 && (
          <div>
            <h3 className="font-cinzel text-gold-bright uppercase tracking-wider mb-6">Ranked</h3>

            {/* Section 1 — Ligue Ranked actuelle (nouveau système 2025) */}
            <div className="bg-stone p-5 rounded border border-fog mb-4">
              <p className="text-xs font-cinzel uppercase text-ash mb-3">Ligue Ranked actuelle</p>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <img
                    src={getLeagueImageUrl(player.leagueTier?.name || player.league?.name)}
                    alt=""
                    className="w-10 h-10 object-contain"
                    onError={(e) => { e.target.style.display = 'none' }}
                  />
                  <p className="font-bold text-bone font-cinzel text-xl">
                    {player.leagueTier?.name || player.league?.name || '—'}
                  </p>
                </div>
                <p className="text-3xl font-bold text-gold-light mt-1 font-cinzel">
                  {(player.trophies || 0).toLocaleString()} 🏆
                </p>
                {player.currentLeagueSeasonId && (
                  <p className="text-xs text-ash mt-1 font-cinzel">
                    Saison : {new Date(player.currentLeagueSeasonId * 1000).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                  </p>
                )}
              </div>
            </div>

            {/* Progression visuelle des ligues 2025 */}
            <div className="bg-stone p-4 rounded border border-fog mb-4">
              <p className="text-xs font-cinzel uppercase text-ash mb-3">Progression des ligues 2025</p>
              <div className="flex flex-wrap gap-2">
                {LEAGUES_2025.map((l, i) => {
                  const isActive = currentLeagueIdx === i
                  return (
                    <div
                      key={l.name}
                      className={`flex flex-col items-center px-2 py-1 rounded border text-xs font-cinzel transition-all ${
                        isActive
                          ? 'border-gold-light text-gold-light bg-gold/10'
                          : 'border-fog/30 text-ash'
                      }`}
                    >
                      <img
                        src={getLeagueImageUrl(l.name + ' League')}
                        alt={l.name}
                        className="w-6 h-6 object-contain"
                        onError={(e) => { e.target.style.display = 'none' }}
                      />
                      <span className="mt-0.5">{l.name}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Section 2 — Stats de la saison en cours */}
            <div className="bg-stone p-5 rounded border border-fog mb-4">
              <p className="text-xs font-cinzel uppercase text-ash mb-3">Stats de la saison en cours</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gold-light font-cinzel">
                    {player.legendStatistics?.currentSeason?.trophies?.toLocaleString() ?? '—'} 🏆
                  </p>
                  <p className="text-xs text-ash font-cinzel uppercase mt-1">Trophées saison</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gold-light font-cinzel">⚔️ {player.attackWins ?? '—'}</p>
                  <p className="text-xs text-ash font-cinzel uppercase mt-1">Attaques gagnées</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gold-light font-cinzel">🛡️ {player.defenseWins ?? '—'}</p>
                  <p className="text-xs text-ash font-cinzel uppercase mt-1">Défenses gagnées</p>
                </div>
              </div>
            </div>

            {/* Section 3 — Records */}
            <div className="bg-stone p-5 rounded border border-gold/30 mb-4">
              <p className="text-xs font-cinzel uppercase text-ash mb-3">🏅 Records</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-ash font-cinzel uppercase mb-1">Meilleur record trophées</p>
                  <p className="text-2xl font-bold text-gold-light font-cinzel">
                    {player.bestTrophies?.toLocaleString() ?? '—'} 🏆
                  </p>
                </div>
                {player.legendStatistics?.bestBuilderBaseSeason && (
                  <div>
                    <p className="text-xs text-ash font-cinzel uppercase mb-1">Meilleure saison Builder Base</p>
                    <p className="text-sm font-cinzel text-bone">
                      Saison : {player.legendStatistics.bestBuilderBaseSeason.id ?? '—'}
                    </p>
                    <p className="text-sm font-cinzel text-bone">
                      Rang : #{player.legendStatistics.bestBuilderBaseSeason.rank?.toLocaleString() ?? '—'}
                    </p>
                    <p className="text-2xl font-bold text-gold-light font-cinzel">
                      {player.legendStatistics.bestBuilderBaseSeason.trophies?.toLocaleString() ?? '—'} 🏆
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Section 4 — Base du Constructeur */}
            <div className="bg-stone p-5 rounded border border-fog">
              <p className="text-xs font-cinzel uppercase text-ash mb-3">Base du Constructeur</p>
              <div>
                <p className="font-bold text-bone font-cinzel">{player.builderBaseLeague?.name || '—'}</p>
                <p className="text-2xl font-bold text-gold-light mt-1 font-cinzel">
                  {(player.builderBaseTrophies || 0).toLocaleString()} 🏆
                </p>
              </div>
            </div>
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
            <TroopsGrid title="Troupes" items={homeTroops} category="troops" />
            <TroopsGrid title="Troupes noires" items={darkTroops} category="troops" />
            <TroopsGrid title="Sorts" items={spells} category="sorts" />
            <TroopsGrid title="Super Troupes" items={superTroops} category="super" />
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

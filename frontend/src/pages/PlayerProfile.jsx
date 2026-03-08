import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useCocPlayer } from '../hooks/useCocApi.js'
import { LEAGUE_INFO } from '../lib/constants.js'
import { translateRole, getTroopImageUrl, getTownHallImageUrl } from '../utils/cocHelpers.js'
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

        {/* Ranked */}
        {activeTab === 1 && (
          <div>
            <h3 className="font-cinzel text-gold-bright uppercase tracking-wider mb-6">Ranked &amp; Ligues</h3>

            {/* Ligue principale */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-stone p-4 rounded border border-fog">
                <p className="text-xs font-cinzel uppercase text-ash mb-3">Ligue principale</p>
                <div className="flex items-center gap-3">
                  {player.league?.iconUrls?.medium && (
                    <img src={player.league.iconUrls.medium} alt={player.league.name} className="w-14 h-14 object-contain" />
                  )}
                  <div>
                    <p className="font-bold text-bone font-cinzel">{player.league?.name || 'Sans ligue'}</p>
                    <p className="text-2xl font-bold text-gold-light mt-1">{player.trophies?.toLocaleString()} 🏆</p>
                    <p className="text-xs text-ash">Meilleur : {player.bestTrophies?.toLocaleString()} 🏆</p>
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

            {/* Ligue Légende */}
            {player.legendStatistics ? (
              <div>
                <p className="text-xs font-cinzel uppercase text-ash mb-3 flex items-center gap-2">
                  <span>❄️</span> Ligue Légende
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {player.legendStatistics.currentSeason && (
                    <div className="bg-stone p-4 rounded border border-purple-800">
                      <p className="text-xs text-purple-400 font-cinzel uppercase mb-2">Saison en cours</p>
                      <p className="text-2xl font-bold text-gold-light">{player.legendStatistics.currentSeason.trophies?.toLocaleString()} 🏆</p>
                      {player.legendStatistics.currentSeason.rank && (
                        <p className="text-xs text-ash mt-1">Rang #{player.legendStatistics.currentSeason.rank}</p>
                      )}
                    </div>
                  )}
                  {player.legendStatistics.previousSeason && (
                    <div className="bg-stone p-4 rounded border border-fog">
                      <p className="text-xs text-ash font-cinzel uppercase mb-2">Saison précédente</p>
                      <p className="text-2xl font-bold text-bone">{player.legendStatistics.previousSeason.trophies?.toLocaleString()} 🏆</p>
                      {player.legendStatistics.previousSeason.rank && (
                        <p className="text-xs text-ash mt-1">Rang #{player.legendStatistics.previousSeason.rank}</p>
                      )}
                    </div>
                  )}
                  {player.legendStatistics.bestSeason && (
                    <div className="bg-stone p-4 rounded border border-gold/40">
                      <p className="text-xs text-gold font-cinzel uppercase mb-2">Meilleure saison</p>
                      <p className="text-2xl font-bold text-gold-light">{player.legendStatistics.bestSeason.trophies?.toLocaleString()} 🏆</p>
                      {player.legendStatistics.bestSeason.rank && (
                        <p className="text-xs text-ash mt-1">Rang #{player.legendStatistics.bestSeason.rank}</p>
                      )}
                      {player.legendStatistics.bestSeason.id && (
                        <p className="text-xs text-ash">{player.legendStatistics.bestSeason.id}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-ash text-sm font-cinzel text-center py-6">
                Ce joueur n'a pas de données de ligue Légende disponibles.
              </p>
            )}
          </div>
        )}

        {/* Onglet 2 — Attaques Guerre */}
        {activeTab === 2 && (
          <div>
            <h3 className="font-cinzel text-gold-bright uppercase tracking-wider mb-6">Attaques Guerre</h3>
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
            <p className="text-xs text-ash/60 font-cinzel text-center">
              Les étoiles de guerre sont le total cumulé depuis la création du compte. Attaques et défenses correspondent à la saison en cours.
            </p>
          </div>
        )}

        {/* Onglet 3 — Ligue Légende */}
        {activeTab === 3 && (
          <div>
            <h3 className="font-cinzel text-gold-bright uppercase tracking-wider mb-6">❄️ Ligue Légende</h3>
            {player.legendStatistics ? (
              <div className="flex flex-col gap-4">
                {player.legendStatistics.currentSeason && (
                  <div className="bg-stone p-5 rounded border border-purple-700">
                    <p className="text-xs text-purple-400 font-cinzel uppercase mb-3">Saison en cours</p>
                    <div className="flex items-end gap-4 flex-wrap">
                      <div>
                        <div className="text-3xl font-bold text-gold-light font-cinzel">
                          {player.legendStatistics.currentSeason.trophies?.toLocaleString()} 🏆
                        </div>
                        {player.legendStatistics.currentSeason.rank && (
                          <p className="text-ash text-sm mt-1 font-cinzel">
                            Rang mondial : #{player.legendStatistics.currentSeason.rank.toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {player.legendStatistics.previousSeason && (
                  <div className="bg-stone p-5 rounded border border-fog">
                    <p className="text-xs text-ash font-cinzel uppercase mb-3">Saison précédente</p>
                    <div className="text-3xl font-bold text-bone font-cinzel">
                      {player.legendStatistics.previousSeason.trophies?.toLocaleString()} 🏆
                    </div>
                    {player.legendStatistics.previousSeason.rank && (
                      <p className="text-ash text-sm mt-1 font-cinzel">
                        Rang : #{player.legendStatistics.previousSeason.rank.toLocaleString()}
                      </p>
                    )}
                    {player.legendStatistics.previousSeason.id && (
                      <p className="text-ash/60 text-xs mt-1 font-cinzel">{player.legendStatistics.previousSeason.id}</p>
                    )}
                  </div>
                )}
                {player.legendStatistics.bestSeason && (
                  <div className="bg-stone p-5 rounded border border-gold/40">
                    <p className="text-xs text-gold font-cinzel uppercase mb-3">🏅 Meilleure saison</p>
                    <div className="text-3xl font-bold text-gold-light font-cinzel">
                      {player.legendStatistics.bestSeason.trophies?.toLocaleString()} 🏆
                    </div>
                    {player.legendStatistics.bestSeason.rank && (
                      <p className="text-ash text-sm mt-1 font-cinzel">
                        Rang : #{player.legendStatistics.bestSeason.rank.toLocaleString()}
                      </p>
                    )}
                    {player.legendStatistics.bestSeason.id && (
                      <p className="text-ash/60 text-xs mt-1 font-cinzel">{player.legendStatistics.bestSeason.id}</p>
                    )}
                  </div>
                )}
                {player.legendStatistics.legendTrophies !== undefined && (
                  <div className="bg-stone p-4 rounded border border-fog flex items-center gap-3">
                    <span className="text-2xl">❄️</span>
                    <div>
                      <div className="text-xl font-bold text-gold-light font-cinzel">
                        {player.legendStatistics.legendTrophies?.toLocaleString()}
                      </div>
                      <div className="text-xs text-ash font-cinzel uppercase">Trophées Légende totaux</div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-4xl mb-3">❄️</p>
                <p className="text-ash font-cinzel text-sm">Pas encore en Ligue Légende</p>
              </div>
            )}
          </div>
        )}

        {/* Onglet 4 — Guerres de Clans */}
        {activeTab === 4 && (
          <div>
            <h3 className="font-cinzel text-gold-bright uppercase tracking-wider mb-6">Guerres de Clans</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-stone p-5 rounded border border-fog text-center">
                <div className="text-3xl font-bold text-gold-light font-cinzel">{player.warStars || 0}</div>
                <div className="text-xs text-ash font-cinzel uppercase mt-2">⭐ Étoiles de guerre totales</div>
              </div>
              <div className="bg-stone p-5 rounded border border-fog text-center">
                <div className={`text-2xl font-bold font-cinzel ${player.warPreference === 'opted_in' || player.clanWarOptedIn ? 'text-green-400' : 'text-ash'}`}>
                  {player.warPreference === 'opted_in' || player.clanWarOptedIn ? '✅ Opt-in' : player.warPreference === 'opted_out' ? '❌ Opt-out' : '—'}
                </div>
                <div className="text-xs text-ash font-cinzel uppercase mt-2">Participation guerre</div>
              </div>
              <div className="bg-stone p-5 rounded border border-fog text-center">
                <div className="text-3xl font-bold text-bone font-cinzel">{player.attackWins || 0}</div>
                <div className="text-xs text-ash font-cinzel uppercase mt-2">⚔️ Attaques cette saison</div>
              </div>
            </div>
            <div className="bg-stone p-4 rounded border border-fog/50 text-center">
              <p className="text-xs text-ash/60 font-cinzel">
                L'historique détaillé des guerres par attaque est disponible via l'onglet Guerre de la page Guilde.
              </p>
            </div>
          </div>
        )}

        {/* Onglet 5 — CWL */}
        {activeTab === 5 && (
          <div>
            <h3 className="font-cinzel text-gold-bright uppercase tracking-wider mb-6">Guerre de Ligue (CWL)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-stone p-5 rounded border border-fog text-center">
                <div className="text-3xl font-bold text-gold-light font-cinzel">{player.warStars || 0}</div>
                <div className="text-xs text-ash font-cinzel uppercase mt-2">⭐ Étoiles de guerre totales</div>
                <p className="text-xs text-ash/50 mt-1 font-cinzel">(toutes guerres confondues)</p>
              </div>
              {player.clan?.warLeague && (
                <div className="bg-stone p-5 rounded border border-fog text-center">
                  <div className="text-xl font-bold text-bone font-cinzel">{player.clan.warLeague.name || '—'}</div>
                  <div className="text-xs text-ash font-cinzel uppercase mt-2">🏆 Ligue de guerre du clan</div>
                </div>
              )}
            </div>
            <div className="bg-stone p-4 rounded border border-fog/50 text-center">
              <p className="text-xs text-ash/60 font-cinzel">
                Les détails par round CWL (attaques, étoiles) sont disponibles via l'onglet CWL de la page Guilde.
              </p>
            </div>
          </div>
        )}

        {/* Onglet 6 — Stats de guerre */}
        {activeTab === 6 && (
          <div>
            <h3 className="font-cinzel text-gold-bright uppercase tracking-wider mb-6">Stats de Guerre</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              {[
                { label: '⭐ Étoiles totales', value: player.warStars || 0, color: 'text-gold-light' },
                { label: '⚔️ Attaques gagnées', value: player.attackWins || 0, color: 'text-green-400' },
                { label: '🛡️ Défenses gagnées', value: player.defenseWins || 0, color: 'text-crimson' },
                { label: '🎯 Ratio Att/Déf', color: 'text-bone',
                  value: player.defenseWins > 0
                    ? (player.attackWins / player.defenseWins).toFixed(2)
                    : player.attackWins > 0 ? '∞' : '—' },
                { label: '🏅 Meilleurs trophées', value: player.bestTrophies?.toLocaleString() || '—', color: 'text-gold-light' },
                { label: '🏆 Trophées actuels', value: player.trophies?.toLocaleString() || '—', color: 'text-gold-light' },
              ].map((s) => (
                <div key={s.label} className="bg-stone p-4 rounded border border-fog text-center">
                  <div className={`text-2xl font-bold font-cinzel ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-ash font-cinzel uppercase mt-2">{s.label}</div>
                </div>
              ))}
            </div>

            {player.heroEquipment?.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-cinzel uppercase text-ash mb-3 flex items-center gap-2">
                  Équipement actif
                  <span className="flex-1 h-px bg-fog/40 ml-1" />
                </p>
                <div className="flex flex-wrap gap-2">
                  {player.heroEquipment.filter(e => e.isActive !== false).map((eq) => (
                    <span key={eq.name} className="text-xs font-cinzel px-2 py-1 rounded border border-gold/30 text-gold-light">
                      {eq.name} Niv.{eq.level}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Onglet 7 — Raids */}
        {activeTab === 7 && (
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

        {/* Onglet 8 — Classements */}
        {activeTab === 8 && (
          <div>
            <h3 className="font-cinzel text-gold-bright uppercase tracking-wider mb-6">Classements</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-stone p-5 rounded border border-fog">
                <p className="text-xs font-cinzel uppercase text-ash mb-3">🏆 Ligue principale</p>
                <div className="flex items-center gap-3">
                  {player.league?.iconUrls?.medium && (
                    <img src={player.league.iconUrls.medium} alt={player.league.name} className="w-12 h-12 object-contain" />
                  )}
                  <div>
                    <div className="text-lg font-bold text-bone font-cinzel">{player.league?.name || 'Sans ligue'}</div>
                    <div className="text-xl font-bold text-gold-light font-cinzel">{player.trophies?.toLocaleString()} 🏆</div>
                    <div className="text-xs text-ash font-cinzel">Record : {player.bestTrophies?.toLocaleString()} 🏆</div>
                  </div>
                </div>
              </div>
              <div className="bg-stone p-5 rounded border border-fog">
                <p className="text-xs font-cinzel uppercase text-ash mb-3">🔨 Base du Constructeur</p>
                <div className="flex items-center gap-3">
                  {player.builderBaseLeague?.iconUrls?.medium && (
                    <img src={player.builderBaseLeague.iconUrls.medium} alt={player.builderBaseLeague.name} className="w-12 h-12 object-contain" />
                  )}
                  <div>
                    <div className="text-lg font-bold text-bone font-cinzel">{player.builderBaseLeague?.name || 'Sans ligue'}</div>
                    <div className="text-xl font-bold text-gold-light font-cinzel">{(player.builderBaseTrophies || 0).toLocaleString()} 🏆</div>
                  </div>
                </div>
              </div>
              {player.legendStatistics?.currentSeason && (
                <div className="bg-stone p-5 rounded border border-purple-700">
                  <p className="text-xs font-cinzel uppercase text-purple-400 mb-3">❄️ Ligue Légende — Saison en cours</p>
                  <div className="text-2xl font-bold text-gold-light font-cinzel">
                    {player.legendStatistics.currentSeason.trophies?.toLocaleString()} 🏆
                  </div>
                  {player.legendStatistics.currentSeason.rank && (
                    <div className="text-ash font-cinzel mt-1">
                      Rang mondial : <span className="text-bone font-bold">#{player.legendStatistics.currentSeason.rank.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              )}
              <div className="bg-stone p-5 rounded border border-fog">
                <p className="text-xs font-cinzel uppercase text-ash mb-3">⭐ Guerre</p>
                <div className="text-2xl font-bold text-gold-light font-cinzel">{player.warStars || 0} ⭐</div>
                <div className="text-xs text-ash font-cinzel mt-1">Étoiles de guerre totales</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

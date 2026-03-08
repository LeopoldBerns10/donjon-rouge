import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCocMembers } from '../hooks/useCocApi.js'
import SectionHeader from '../components/SectionHeader.jsx'
import { translateRole, getRoleBadgeClass, getTownHallImageUrl } from '../utils/cocHelpers.js'

const LEAGUE_EMOJIS = {
  'squelette': '💀', 'barbare': '⚔️', 'archer': '🏹', 'sorcier': '🔮',
  'valkyrie': '🪓', 'sorcière': '🦇', 'golem': '🪨', 'géant': '🦶',
  'p.e.k.k.a': '⚙️', 'electro': '⚡', 'legend': '❄️'
}
const LEAGUE_ORDER = {
  'legend': 10, 'electro': 9, 'p.e.k.k.a': 8,
  'géant': 7, 'golem': 6, 'sorcière': 5,
  'valkyrie': 4, 'sorcier': 3, 'archer': 2,
  'barbare': 1, 'squelette': 0
}
const ROLE_ORDER = { leader: 0, coLeader: 1, admin: 2, member: 3 }

function getLeagueName(m) { return m.leagueTier?.name || m.league?.name || null }
function leagueKey(name) { return name ? name.toLowerCase().split(' ')[0] : '' }
function getLeagueEmoji(name) { return LEAGUE_EMOJIS[leagueKey(name)] || '' }
function getLeagueOrder(name) { return LEAGUE_ORDER[leagueKey(name)] ?? -1 }

function medalForRank(rank) {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return rank
}

const TRACKER_SORTS = [
  { key: 'rank',      label: 'Rang' },
  { key: 'role',      label: 'Rôle' },
  { key: 'league',    label: 'Ligue' },
  { key: 'trophies',  label: 'Trophées' },
  { key: 'donations', label: 'Dons' },
  { key: 'hdv',       label: 'HDV' },
]

export default function Tracker() {
  const { data, loading, error } = useCocMembers()
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('rank')
  const navigate = useNavigate()

  const filtered = (data?.items || []).filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.tag.toLowerCase().includes(search.toLowerCase())
  )

  const members = [...filtered].sort((a, b) => {
    if (sortBy === 'rank')      return (a.clanRank || 99) - (b.clanRank || 99)
    if (sortBy === 'role')      return (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9)
    if (sortBy === 'league')    return getLeagueOrder(getLeagueName(b)) - getLeagueOrder(getLeagueName(a))
    if (sortBy === 'trophies')  return (b.trophies || 0) - (a.trophies || 0)
    if (sortBy === 'donations') return (b.donations || 0) - (a.donations || 0)
    if (sortBy === 'hdv')       return (b.townHallLevel || 0) - (a.townHallLevel || 0)
    return 0
  })

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 animate-fade-up">
      <SectionHeader title="Classement du Clan" subtitle="Donjon Rouge · #29292QPRC" />

      {/* Search */}
      <div className="mb-4 max-w-md mx-auto">
        <input
          type="text"
          placeholder="Rechercher un joueur..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-stone-light border border-fog rounded px-4 py-2 text-bone placeholder-ash focus:outline-none focus:border-crimson font-cinzel"
        />
      </div>

      {/* Sort buttons */}
      {!loading && !error && (
        <div className="flex flex-wrap gap-2 mb-6">
          {TRACKER_SORTS.map(s => (
            <button
              key={s.key}
              onClick={() => setSortBy(s.key)}
              className={`px-3 py-1 text-xs font-cinzel uppercase tracking-wider rounded border transition-all ${
                sortBy === s.key ? 'text-bone border-crimson' : 'text-ash border-fog/40 hover:text-bone'
              }`}
              style={sortBy === s.key ? { background: 'linear-gradient(135deg, #6B0000, #C41E3A)' } : {}}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <p className="text-center text-ash font-cinzel animate-pulse py-20">
          Chargement des membres...
        </p>
      )}

      {error && (
        <p className="text-center text-crimson font-cinzel py-10">
          Erreur : {error}
        </p>
      )}

      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-fog text-ash font-cinzel uppercase text-xs tracking-widest">
                <th className="py-3 px-3 text-left">Rang</th>
                <th className="py-3 px-3 text-left">Joueur</th>
                <th className="py-3 px-3 text-center">HDV</th>
                <th className="py-3 px-3 text-center">Trophées</th>
                <th className="py-3 px-3 text-center">Dons</th>
                <th className="py-3 px-3 text-center">Rôle</th>
                <th className="py-3 px-3 text-center">Ligue</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member, i) => {
                const leagueName = getLeagueName(member)
                const leagueEmoji = getLeagueEmoji(leagueName)
                const leagueShort = leagueName ? leagueName.replace(/ \d+$/, '').replace(/ League$/i, '') : null

                return (
                  <tr
                    key={member.tag}
                    onClick={() => navigate(`/tracker/${encodeURIComponent(member.tag)}`)}
                    className="border-b border-fog/30 hover:bg-stone-light cursor-pointer transition-colors group"
                  >
                    <td className="py-3 px-3 font-bold text-center w-12">
                      <span className="text-lg">{medalForRank(i + 1)}</span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <img
                          src={getTownHallImageUrl(member.townHallLevel)}
                          alt={`HDV${member.townHallLevel}`}
                          className="w-8 h-8 object-contain flex-shrink-0"
                          onError={(e) => { e.target.style.display = 'none' }}
                        />
                        <div>
                          <div className="font-semibold text-bone group-hover:text-gold-light transition-colors">
                            {member.name}
                          </div>
                          <div className="text-xs text-ash">{member.tag}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded text-xs font-bold text-white"
                        style={{ background: '#C41E3A' }}>
                        HDV{member.townHallLevel}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-cinzel text-gold-light">
                      {member.trophies?.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-center text-ash">
                      {member.donations?.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`text-xs font-cinzel font-bold uppercase px-2 py-0.5 rounded ${getRoleBadgeClass(member.role)}`}>
                        {translateRole(member.role)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      {leagueName ? (
                        <div className="flex items-center justify-center gap-1">
                          {leagueEmoji && <span>{leagueEmoji}</span>}
                          <span className="text-xs text-ash hidden lg:inline">{leagueShort}</span>
                        </div>
                      ) : (
                        <span className="text-ash text-xs">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {members.length === 0 && (
            <p className="text-center text-ash py-10 font-cinzel">Aucun résultat</p>
          )}
        </div>
      )}
    </div>
  )
}

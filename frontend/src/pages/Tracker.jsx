import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCocMembers } from '../hooks/useCocApi.js'
import SectionHeader from '../components/SectionHeader.jsx'
import { LEAGUE_INFO } from '../lib/constants.js'
import { translateRole, getRoleBadgeClass, getTownHallImageUrl } from '../utils/cocHelpers.js'

function medalForRank(rank) {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return rank
}

export default function Tracker() {
  const { data, loading, error } = useCocMembers()
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  const members = (data?.items || []).filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.tag.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 animate-fade-up">
      <SectionHeader title="Classement du Clan" subtitle="Donjon Rouge · #29292QPRC" />

      {/* Search */}
      <div className="mb-6 max-w-md mx-auto">
        <input
          type="text"
          placeholder="Rechercher un joueur..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-stone-light border border-fog rounded px-4 py-2 text-bone placeholder-ash focus:outline-none focus:border-crimson font-cinzel"
        />
      </div>

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
                const league = member.league?.name
                const leagueInfo = LEAGUE_INFO[league]

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
                      {leagueInfo ? (
                        <span style={{ color: leagueInfo.color }} className="text-sm">
                          {leagueInfo.icon} {league?.replace(' League', '')}
                        </span>
                      ) : member.league?.iconUrls?.small ? (
                        <img src={member.league.iconUrls.small} alt={league} className="w-5 h-5 mx-auto" />
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

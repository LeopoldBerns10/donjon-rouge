import { useNavigate } from 'react-router-dom'
import { useCocClan, useCocMembers } from '../hooks/useCocApi.js'
import SectionHeader from '../components/SectionHeader.jsx'
import { translateRole, getRoleBadgeClass, getTownHallImageUrl } from '../utils/cocHelpers.js'

function StatBadge({ icon, label, value }) {
  return (
    <div className="flex flex-col items-center justify-center p-4 rounded-lg border border-fog/40 bg-stone-mid gap-1 min-w-[110px]">
      <span className="text-2xl">{icon}</span>
      <span className="text-lg font-bold font-cinzel text-gold-light">{value ?? '—'}</span>
      <span className="text-xs text-ash font-cinzel uppercase tracking-wider text-center">{label}</span>
    </div>
  )
}

function LeagueIcon({ league }) {
  if (!league) return <span className="text-ash text-xs">—</span>
  const icon = league.iconUrls?.small
  const name = league.name?.replace(' League', '')
  return (
    <div className="flex items-center gap-1">
      {icon && <img src={icon} alt={name} className="w-5 h-5 object-contain" />}
      <span className="text-xs text-ash hidden lg:inline">{name}</span>
    </div>
  )
}

function THImage({ level, size = 32 }) {
  return (
    <img
      src={getTownHallImageUrl(level)}
      alt={`HDV${level}`}
      className="object-contain flex-shrink-0"
      style={{ width: size, height: size }}
      onError={(e) => {
        e.target.outerHTML = `<span class="text-xs font-bold text-white px-1 py-0.5 rounded" style="background:#C41E3A;font-size:10px">HDV${level}</span>`
      }}
    />
  )
}

export default function Guilde() {
  const { data: clan, loading: clanLoading } = useCocClan()
  const { data: membersData, loading: membersLoading } = useCocMembers()
  const navigate = useNavigate()

  const members = [...(membersData?.items || [])].sort((a, b) => (a.clanRank || 99) - (b.clanRank || 99))

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 animate-fade-up">
      <SectionHeader title="La Guilde" subtitle="Donjon Rouge · #29292QPRC" />

      {/* Clan header */}
      {clan && (
        <div className="card-stone p-6 mb-8 flex flex-col md:flex-row gap-6 items-start">
          <div className="flex-shrink-0 flex flex-col items-center gap-2">
            {clan.badgeUrls?.large && (
              <img src={clan.badgeUrls.large} alt="Badge clan" className="w-28 h-28 object-contain" />
            )}
            <span className="font-cinzel-deco text-gold text-lg font-bold">{clan.name}</span>
            {clan.description && (
              <p className="text-ash text-xs text-center max-w-xs">{clan.description}</p>
            )}
          </div>

          <div className="flex-1 flex flex-wrap gap-3 justify-center md:justify-start">
            <StatBadge icon="🏰" label="Niveau clan" value={clan.clanLevel} />
            <StatBadge icon="👥" label="Membres" value={`${clan.members}/50`} />
            <StatBadge icon="⚔️" label="Guerres gagnées" value={clan.warWins} />
            <StatBadge icon="🤝" label="Nulles" value={clan.warTies ?? '—'} />
            <StatBadge icon="💀" label="Perdues" value={clan.warLosses ?? '—'} />
            <StatBadge icon="🔥" label="Série victoires" value={clan.warWinStreak} />
            <StatBadge icon="🏆" label="Points clan" value={clan.clanPoints?.toLocaleString()} />
            <StatBadge icon="⭐" label="Ligue guerre" value={clan.warLeague?.name?.replace(' League', '') || '—'} />
            <StatBadge icon="🏛️" label="Capital Hall" value={`Niv.${clan.clanCapital?.capitalHallLevel ?? '—'}`} />
            <StatBadge icon="💎" label="Points Capital" value={clan.clanCapitalPoints?.toLocaleString()} />
            <StatBadge icon="📍" label="Localisation" value={clan.location?.name || '—'} />
          </div>
        </div>
      )}

      {clanLoading && (
        <p className="text-center text-ash font-cinzel animate-pulse mb-8">Chargement du clan...</p>
      )}

      {/* Members table */}
      <h2 className="font-cinzel text-gold-bright uppercase tracking-widest text-sm mb-4 flex items-center gap-3">
        <span>Membres ({members.length})</span>
        <div className="flex-1 h-px bg-fog/40" />
      </h2>

      {membersLoading && (
        <p className="text-center text-ash font-cinzel animate-pulse py-10">Chargement des membres...</p>
      )}

      {!membersLoading && (
        <div className="overflow-x-auto rounded-lg border border-fog/30">
          <table className="w-full text-sm">
            <thead>
              <tr className="font-cinzel uppercase text-xs tracking-widest text-gold border-b border-fog/40"
                style={{ background: '#1a1a1a' }}>
                <th className="py-3 px-3 text-center w-10">#</th>
                <th className="py-3 px-3 text-left">Joueur</th>
                <th className="py-3 px-3 text-center">Rôle</th>
                <th className="py-3 px-3 text-center">Ligue</th>
                <th className="py-3 px-3 text-center">HDV</th>
                <th className="py-3 px-3 text-center">🏆</th>
                <th className="py-3 px-3 text-center hidden md:table-cell">Dons</th>
                <th className="py-3 px-3 text-center hidden lg:table-cell">Exp</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m, i) => (
                <tr
                  key={m.tag}
                  onClick={() => navigate(`/tracker/${encodeURIComponent(m.tag)}`)}
                  className="cursor-pointer transition-colors border-b border-fog/20 group"
                  style={{ background: i % 2 === 0 ? '#0d0d0d' : '#111' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(196,30,58,0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = i % 2 === 0 ? '#0d0d0d' : '#111'}
                >
                  <td className="py-2.5 px-3 text-center text-ash text-xs font-cinzel">
                    {m.clanRank || i + 1}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <THImage level={m.townHallLevel} size={28} />
                      <div>
                        <div className="font-semibold text-bone group-hover:text-gold-light transition-colors text-sm">
                          {m.name}
                        </div>
                        <div className="text-xs text-ash/60">{m.tag}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className={`text-xs font-cinzel font-bold uppercase px-2 py-0.5 rounded ${getRoleBadgeClass(m.role)}`}>
                      {translateRole(m.role)}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <LeagueIcon league={m.league} />
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="text-xs font-bold text-white px-1.5 py-0.5 rounded"
                      style={{ background: '#C41E3A' }}>
                      {m.townHallLevel}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center font-cinzel text-gold-light text-xs">
                    {m.trophies?.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-center text-ash text-xs hidden md:table-cell">
                    {m.donations?.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-center text-ash text-xs hidden lg:table-cell">
                    {m.expLevel}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

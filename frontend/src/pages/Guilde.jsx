import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useCocClan, useCocMembers, useCocWar, useCocRaids } from '../hooks/useCocApi.js'
import api from '../lib/api.js'
import SectionHeader from '../components/SectionHeader.jsx'
import { AnimatedBackground } from '../components/AnimatedBackground.jsx'
import { translateRole, getRoleBadgeClass, getTownHallImageUrl, getLeagueImageUrl, getLeagueShortName } from '../utils/cocHelpers.js'
import { useAuth } from '../hooks/useAuth.jsx'
import Inscriptions from './Inscriptions.jsx'

// ─── Constantes ligues & rôles ─────────────────────────────────────────────

const LEAGUE_ORDER = {
  'legend': 10, 'electro': 9, 'p.e.k.k.a': 8,
  'géant': 7, 'golem': 6, 'sorcière': 5,
  'valkyrie': 4, 'sorcier': 3, 'archer': 2,
  'barbare': 1, 'squelette': 0
}
const ROLE_ORDER = { leader: 0, coLeader: 1, admin: 2, member: 3 }

// Mapping ligue nouveau système (IDs 44000xxx, octobre 2025)
const LEAGUE_COLORS = {
  44000036: '#ff6600',
  44000033: '#00bfff', 44000034: '#00bfff', 44000035: '#00bfff',
  44000030: '#8b008b', 44000031: '#8b008b', 44000032: '#8b008b',
  44000027: '#e0e0e0', 44000028: '#e0e0e0', 44000029: '#e0e0e0',
  44000024: '#6a0dad', 44000025: '#6a0dad', 44000026: '#6a0dad',
  44000021: '#808080', 44000022: '#808080', 44000023: '#808080',
  44000018: '#9400d3', 44000019: '#9400d3', 44000020: '#9400d3',
  44000015: '#ff4500', 44000016: '#ff4500', 44000017: '#ff4500',
  44000012: '#4169e1', 44000013: '#4169e1', 44000014: '#4169e1',
  44000009: '#ff69b4', 44000010: '#ff69b4', 44000011: '#ff69b4',
  44000006: '#cd7f32', 44000007: '#cd7f32', 44000008: '#cd7f32',
  44000003: '#a0522d', 44000004: '#a0522d', 44000005: '#a0522d',
  44000000: '#666666',
}
const getLeagueColor = (id) => LEAGUE_COLORS[id] || '#666666'

function getLeagueName(m) { return m.leagueTier?.name || m.league?.name || null }
function leagueKey(name) { return name ? name.toLowerCase().split(' ')[0] : '' }
function getLeagueOrder(name) { return LEAGUE_ORDER[leagueKey(name)] ?? -1 }

// ─── Composants partagés ───────────────────────────────────────────────────

function StatBadge({ icon, label, value }) {
  return (
    <div className="flex flex-col items-center justify-center p-3 md:p-5 rounded-lg border border-fog/40 bg-stone-mid gap-1 min-w-[110px]">
      <span className="text-2xl">{icon}</span>
      <span className="text-lg font-bold font-cinzel text-gold-light">{value ?? '—'}</span>
      <span className="text-xs text-ash font-cinzel uppercase tracking-wider text-center">{label}</span>
    </div>
  )
}

function LeagueBadge({ member }) {
  const name = getLeagueName(member)
  if (!name) return <span className="text-ash text-xs">—</span>
  const imgUrl = getLeagueImageUrl(name)
  const short = getLeagueShortName(name)
  return (
    <div className="flex items-center justify-center gap-1">
      {imgUrl && (
        <img
          src={imgUrl}
          alt={short}
          className="w-6 h-6 object-contain"
          onError={(e) => { e.target.style.display = 'none' }}
        />
      )}
      <span className="text-xs text-ash hidden lg:inline">{short}</span>
    </div>
  )
}

function RoleBadge({ role, small }) {
  return (
    <span className={`font-cinzel font-bold uppercase rounded flex-shrink-0 ${small ? 'text-[9px] px-1 py-0' : 'text-[10px] px-1.5 py-0.5'} ${getRoleBadgeClass(role)}`}>
      {translateRole(role)}
    </span>
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

function Spinner() {
  return <p className="text-center text-ash font-cinzel animate-pulse py-10">Chargement...</p>
}

function ErrorMsg({ msg }) {
  return <p className="text-center text-crimson font-cinzel text-sm py-10">Erreur : {msg}</p>
}

function TableHeader({ cols }) {
  return (
    <thead>
      <tr className="font-cinzel uppercase text-xs tracking-widest text-gold border-b border-fog/40"
        style={{ background: '#1a1a1a' }}>
        {cols.map((c, i) => (
          <th key={i} className={`py-3 px-3 ${c.center !== false ? 'text-center' : 'text-left'} ${c.hidden || ''}`}>
            {c.label}
          </th>
        ))}
      </tr>
    </thead>
  )
}

// ─── Onglet Membres ────────────────────────────────────────────────────────

const MEMBRE_SORTS = [
  { key: 'rank',      label: 'Rang' },
  { key: 'role',      label: 'Rôle' },
  { key: 'donations', label: 'Dons' },
  { key: 'hdv',       label: 'HDV' },
]

function MembresTab({ members, loading, error }) {
  const navigate = useNavigate()
  const [sortBy, setSortBy] = useState('rank')

  if (loading) return <Spinner />
  if (error) return <ErrorMsg msg={error} />

  const sorted = [...(members || [])].sort((a, b) => {
    if (sortBy === 'rank')      return (a.clanRank || 99) - (b.clanRank || 99)
    if (sortBy === 'role')      return (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9)
    if (sortBy === 'league')    return getLeagueOrder(getLeagueName(b)) - getLeagueOrder(getLeagueName(a))
    if (sortBy === 'trophies')  return (b.trophies || 0) - (a.trophies || 0)
    if (sortBy === 'donations') return (b.donations || 0) - (a.donations || 0)
    if (sortBy === 'hdv')       return (b.townHallLevel || 0) - (a.townHallLevel || 0)
    return 0
  })

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        {MEMBRE_SORTS.map(s => (
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
      {/* Version mobile */}
      <div className="md:hidden rounded-lg border border-fog/30 overflow-hidden">
        {sorted.map((m, i) => (
          <div key={m.tag}
               onClick={() => navigate(`/tracker/${encodeURIComponent(m.tag)}`)}
               className="flex items-center gap-3 px-4 py-3 border-b border-[#1a1a1a] last:border-0 hover:bg-[#111111] transition-colors cursor-pointer"
               style={{ background: i % 2 === 0 ? '#0d0d0d' : '#111' }}>
            <span className="text-xs text-[#dc2626] font-bold w-6 flex-shrink-0 text-center">
              {m.clanRank || i + 1}
            </span>
            <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center">
              <img
                src={getTownHallImageUrl(m.townHallLevel)}
                alt={`HDV ${m.townHallLevel}`}
                className="w-9 h-9 object-contain"
                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
              />
              <div className="w-9 h-9 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] items-center justify-center text-xs font-bold text-gray-400 hidden">
                {m.townHallLevel}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-white truncate">{m.name}</p>
                <RoleBadge role={m.role} small />
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-gray-500">HV{m.townHallLevel}</span>
                <span className="text-xs text-gray-700">•</span>
                <span className="text-xs text-yellow-500">🏆 {m.trophies}</span>
              </div>
              {getLeagueName(m) && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  {getLeagueImageUrl(getLeagueName(m)) && (
                    <img src={getLeagueImageUrl(getLeagueName(m))} alt={getLeagueName(m)}
                         className="w-4 h-4 object-contain flex-shrink-0"
                         onError={(e) => e.target.style.display = 'none'} />
                  )}
                  <span className="text-xs font-medium truncate"
                        style={{ color: getLeagueColor(m.league?.id) }}>
                    {getLeagueName(m)}
                  </span>
                </div>
              )}
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs text-green-400 font-semibold">↑ {m.donations}</p>
              <p className="text-xs text-red-400">↓ {m.donationsReceived}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Version desktop */}
      <div className="hidden md:block overflow-x-auto rounded-lg border border-fog/30">
        <table className="w-full text-sm">
          <TableHeader cols={[
            { label: '#', center: true },
            { label: 'Joueur', center: false },
            { label: 'Rôle', center: true },
            { label: 'Ligue', center: true },
            { label: 'HDV', center: true },
            { label: '🏆', center: true },
            { label: 'Dons', center: true, hidden: 'hidden md:table-cell' },
            { label: 'Exp', center: true, hidden: 'hidden lg:table-cell' },
          ]} />
          <tbody>
            {sorted.map((m, i) => (
              <tr key={m.tag}
                onClick={() => navigate(`/tracker/${encodeURIComponent(m.tag)}`)}
                className="cursor-pointer transition-colors border-b border-fog/20 group"
                style={{ background: i % 2 === 0 ? '#0d0d0d' : '#111' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(196,30,58,0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.background = i % 2 === 0 ? '#0d0d0d' : '#111'}
              >
                <td className="py-2.5 px-3 text-center text-ash text-xs font-cinzel">{m.clanRank || i + 1}</td>
                <td className="py-2.5 px-3">
                  <div className="flex items-center gap-2">
                    <THImage level={m.townHallLevel} size={28} />
                    <div>
                      <div className="font-semibold text-bone group-hover:text-gold-light transition-colors text-sm">{m.name}</div>
                      <div className="text-xs text-ash/60">{m.tag}</div>
                    </div>
                  </div>
                </td>
                <td className="py-2.5 px-3 text-center">
                  <span className={`text-xs font-cinzel font-bold uppercase px-2 py-0.5 rounded ${getRoleBadgeClass(m.role)}`}>
                    {translateRole(m.role)}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-center"><LeagueBadge member={m} /></td>
                <td className="py-2.5 px-3 text-center">
                  <span className="text-xs font-bold text-white px-1.5 py-0.5 rounded" style={{ background: '#C41E3A' }}>
                    {m.townHallLevel}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-center font-cinzel text-gold-light text-xs">{m.trophies?.toLocaleString()}</td>
                <td className="py-2.5 px-3 text-center text-ash text-xs hidden md:table-cell">{m.donations?.toLocaleString()}</td>
                <td className="py-2.5 px-3 text-center text-ash text-xs hidden lg:table-cell">{m.expLevel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Onglet Attaques ───────────────────────────────────────────────────────

function AttaquesTab({ members, loading, error }) {
  if (loading) return <Spinner />
  if (error) return <ErrorMsg msg={error} />

  const sorted = [...(members || [])].sort((a, b) => (b.attackWins || 0) - (a.attackWins || 0))

  return (
    <div>
      {/* Version mobile */}
      <div className="md:hidden rounded-lg border border-fog/30 overflow-hidden">
        {sorted.map((m, i) => (
          <div key={m.tag}
               className="flex items-center gap-3 px-4 py-3 border-b border-[#1a1a1a] last:border-0"
               style={{ background: i % 2 === 0 ? '#0d0d0d' : '#111' }}>
            <span className="text-xs text-[#dc2626] font-bold w-5 flex-shrink-0 text-center">{i + 1}</span>
            <img src={getTownHallImageUrl(m.townHallLevel)}
                 alt={`HDV ${m.townHallLevel}`}
                 className="w-8 h-8 object-contain flex-shrink-0"
                 onError={(e) => e.target.style.display = 'none'} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{m.name}</p>
              <p className="text-[10px] text-gray-600">{m.tag}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-bold text-white">
                {m.attackWins ?? 0}
                <span className="text-xs text-gray-500 ml-1">att.</span>
              </p>
              <p className="text-xs text-gray-500">{m.defenseWins ?? 0} déf.</p>
            </div>
          </div>
        ))}
      </div>

      {/* Version desktop */}
      <div className="hidden md:block overflow-x-auto rounded-lg border border-fog/30">
        <table className="w-full text-sm">
          <TableHeader cols={[
            { label: 'Rang', center: true },
            { label: 'Pseudo', center: false },
            { label: 'HDV', center: true },
            { label: 'Att. gagnées', center: true },
            { label: 'Déf. gagnées', center: true },
            { label: 'Dons envoyés', center: true, hidden: 'hidden md:table-cell' },
            { label: 'Dons reçus', center: true, hidden: 'hidden md:table-cell' },
          ]} />
          <tbody>
            {sorted.map((m, i) => (
              <tr key={m.tag} className="border-b border-fog/20"
                style={{ background: i % 2 === 0 ? '#0d0d0d' : '#111' }}>
                <td className="py-2.5 px-3 text-center text-ash text-xs font-cinzel">{i + 1}</td>
                <td className="py-2.5 px-3">
                  <div className="flex items-center gap-2">
                    <THImage level={m.townHallLevel} size={24} />
                    <div>
                      <div className="font-semibold text-bone text-sm">{m.name}</div>
                      <span className={`text-xs font-cinzel font-bold uppercase px-1.5 py-0.5 rounded ${getRoleBadgeClass(m.role)}`}>
                        {translateRole(m.role)}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="py-2.5 px-3 text-center">
                  <span className="text-xs font-bold text-white px-1.5 py-0.5 rounded" style={{ background: '#C41E3A' }}>
                    {m.townHallLevel}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-center font-bold text-gold-light">{m.attackWins ?? 0}</td>
                <td className="py-2.5 px-3 text-center text-ash">{m.defenseWins ?? 0}</td>
                <td className="py-2.5 px-3 text-center text-ash hidden md:table-cell">{m.donations?.toLocaleString() ?? 0}</td>
                <td className="py-2.5 px-3 text-center text-ash hidden md:table-cell">{m.donationsReceived?.toLocaleString() ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Composant LDC Détail 7 jours ─────────────────────────────────────────

const CLAN_TAG = '#29292QPRC'

function parseCocDate(str) {
  if (!str) return null
  return new Date(str.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/, '$1-$2-$3T$4:$5:$6Z'))
}

function WarResultBadge({ war, ourTag }) {
  if (!war || war.state === 'notStarted') {
    return <span className="text-xs font-cinzel uppercase px-2 py-0.5 rounded border bg-gray-900 text-gray-500 border-gray-700">À VENIR</span>
  }
  if (war.state === 'preparation') {
    return <span className="text-xs font-cinzel uppercase px-2 py-0.5 rounded border bg-yellow-900 text-yellow-400 border-yellow-700">PRÉPARATION</span>
  }
  if (war.state === 'inWar') {
    return <span className="text-xs font-cinzel uppercase px-2 py-0.5 rounded border bg-yellow-900 text-yellow-400 border-yellow-700 animate-pulse">EN COURS</span>
  }
  if (war.state === 'warEnded') {
    const our = war.clan?.tag === ourTag ? war.clan : war.opponent
    const opp = war.clan?.tag === ourTag ? war.opponent : war.clan
    if (!our || !opp) return null
    if (our.stars > opp.stars) return <span className="text-xs font-cinzel uppercase px-2 py-0.5 rounded border bg-green-900 text-green-400 border-green-700">VICTOIRE</span>
    if (our.stars < opp.stars) return <span className="text-xs font-cinzel uppercase px-2 py-0.5 rounded border bg-red-900 text-red-400 border-red-700">DÉFAITE</span>
    return <span className="text-xs font-cinzel uppercase px-2 py-0.5 rounded border bg-gray-900 text-gray-400 border-gray-600">NUL</span>
  }
  return null
}

function StarDisplay({ count }) {
  const filled = Math.min(count, 3)
  const colors = ['text-yellow-800', 'text-yellow-600', 'text-yellow-400']
  return (
    <span className={`font-bold ${colors[Math.max(0, filled - 1)] || 'text-gray-600'}`}>
      {'⭐'.repeat(filled)}{filled === 0 ? '—' : ''}
    </span>
  )
}

function AttackRow({ attack, attackerMap, defenderMap }) {
  const attacker = attackerMap[attack.attackerTag]
  const defender = defenderMap[attack.defenderTag]
  const stars = attack.stars ?? 0
  return (
    <tr className="border-b border-fog/20" style={{ background: '#0d0d0d' }}>
      <td className="py-2 px-3 text-bone text-xs">{attacker?.name || attack.attackerTag}</td>
      <td className="py-2 px-3 text-ash text-xs">{defender?.name || attack.defenderTag}</td>
      <td className="py-2 px-3 text-center"><StarDisplay count={stars} /></td>
      <td className="py-2 px-3 text-center text-ash text-xs">{attack.destructionPercentage ?? 0}%</td>
      <td className="py-2 px-3 text-center text-xs">{stars === 3 ? '✅' : stars >= 2 ? '✅' : stars === 1 ? '⚠️' : '❌'}</td>
    </tr>
  )
}

function RoundCard({ round, index, ourTag }) {
  const [expanded, setExpanded] = useState(false)
  const war = round.war

  const isPlaceholder = !war || war.state === 'notStarted'
  const our = war?.clan?.tag === ourTag ? war?.clan : war?.opponent
  const opp = war?.clan?.tag === ourTag ? war?.opponent : war?.clan

  // Build attacker/defender maps from both sides
  const attackerMap = {}
  const defenderMap = {}
  if (war) {
    for (const m of [...(war.clan?.members || []), ...(war.opponent?.members || [])]) {
      attackerMap[m.tag] = m
      defenderMap[m.tag] = m
    }
  }

  // Collect our clan's attacks
  const ourAttacks = []
  if (war && our) {
    for (const m of our.members || []) {
      for (const atk of m.attacks || []) {
        ourAttacks.push(atk)
      }
    }
  }

  const startDate = parseCocDate(war?.startTime)
  const fmtDate = startDate
    ? startDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
    : '—'

  return (
    <div className="rounded-lg mb-3 overflow-hidden" style={{ background: '#111111', border: '1px solid #1f1f1f' }}>
      {/* Card header */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span className="font-cinzel text-gold uppercase text-xs tracking-widest">JOUR {index}</span>
            {fmtDate !== '—' && <span className="text-ash text-xs">• {fmtDate}</span>}
          </div>
          <WarResultBadge war={war} ourTag={ourTag} />
        </div>

        {isPlaceholder ? (
          <p className="text-ash text-xs font-cinzel">Adversaire non encore connu</p>
        ) : (
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* Notre clan */}
            <div className="flex flex-col items-center gap-1 min-w-[100px]">
              {our?.badgeUrls?.small && <img src={our.badgeUrls.small} className="w-10 h-10 object-contain" alt="" />}
              <span className="font-cinzel text-bone text-xs font-bold text-center">{our?.name || 'DONJON ROUGE'}</span>
              <span className="font-cinzel text-gold font-bold">⭐ {our?.stars ?? 0}</span>
              <span className="text-ash text-xs">{our?.attacks ?? 0}/{war?.teamSize ?? 0} att.</span>
              <span className="text-ash text-xs">{our?.destructionPercentage?.toFixed(1) ?? 0}%</span>
            </div>
            {/* VS */}
            <div className="flex flex-col items-center">
              <span className="font-cinzel text-gold uppercase text-xs tracking-widest">VS</span>
              <span className="text-ash text-xs font-cinzel mt-1">{war?.teamSize}v{war?.teamSize}</span>
            </div>
            {/* Adversaire */}
            <div className="flex flex-col items-center gap-1 min-w-[100px]">
              {opp?.badgeUrls?.small && <img src={opp.badgeUrls.small} className="w-10 h-10 object-contain" alt="" />}
              <span className="font-cinzel text-bone text-xs font-bold text-center">{opp?.name || '—'}</span>
              <span className="font-cinzel text-ash font-bold">⭐ {opp?.stars ?? 0}</span>
              <span className="text-ash text-xs">{opp?.attacks ?? 0}/{war?.teamSize ?? 0} att.</span>
              <span className="text-ash text-xs">{opp?.destructionPercentage?.toFixed(1) ?? 0}%</span>
            </div>
          </div>
        )}

        {!isPlaceholder && ourAttacks.length > 0 && (
          <button onClick={() => setExpanded((v) => !v)}
            className="mt-3 text-xs font-cinzel uppercase text-ash hover:text-bone transition-colors flex items-center gap-1">
            {expanded ? '▲ Masquer les attaques' : '▼ Voir le détail des attaques'}
          </button>
        )}
      </div>

      {/* Détail attaques */}
      {expanded && ourAttacks.length > 0 && (
        <div className="border-t border-fog/20 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="font-cinzel uppercase text-xs tracking-widest text-gold" style={{ background: '#1a1a1a' }}>
                <th className="py-2 px-3 text-left">Joueur</th>
                <th className="py-2 px-3 text-left">Cible</th>
                <th className="py-2 px-3 text-center">⭐</th>
                <th className="py-2 px-3 text-center">%</th>
                <th className="py-2 px-3 text-center">Résultat</th>
              </tr>
            </thead>
            <tbody>
              {ourAttacks
                .sort((a, b) => (b.stars ?? 0) - (a.stars ?? 0) || (b.destructionPercentage ?? 0) - (a.destructionPercentage ?? 0))
                .map((atk, i) => (
                  <AttackRow key={i} attack={atk} attackerMap={attackerMap} defenderMap={defenderMap} />
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function LdcSection() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.get('/api/coc/ldc/current')
      .then((r) => setData(r.data))
      .catch((e) => setError(e.response?.data?.error || e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />
  if (error) return <ErrorMsg msg={error} />
  if (!data || data.state === 'notInWar' || !data.rounds?.length) {
    return <p className="text-ash font-cinzel text-sm text-center py-4">Aucune LDC en cours</p>
  }

  const rounds = data.rounds || []
  const ourClan = (data.clans || []).find((c) => c.tag === CLAN_TAG)

  // Bilan global
  let wins = 0, losses = 0, draws = 0, totalStars = 0
  const playerStarMap = {}

  for (const r of rounds) {
    const war = r.war
    if (!war || war.state !== 'warEnded') continue
    const our = war.clan?.tag === CLAN_TAG ? war.clan : war.opponent
    const opp = war.clan?.tag === CLAN_TAG ? war.opponent : war.clan
    if (!our || !opp) continue
    if (our.stars > opp.stars) wins++
    else if (our.stars < opp.stars) losses++
    else draws++
    totalStars += our.stars || 0
    for (const m of our.members || []) {
      for (const atk of m.attacks || []) {
        playerStarMap[m.name] = (playerStarMap[m.name] || 0) + (atk.stars || 0)
      }
    }
  }

  const played = wins + losses + draws
  const bestEntry = Object.entries(playerStarMap).sort((a, b) => b[1] - a[1])[0]

  return (
    <div>
      {/* Header */}
      <div className="card-stone p-4 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          {ourClan?.badgeUrls?.small && <img src={ourClan.badgeUrls.small} className="w-10 h-10 object-contain" alt="" />}
          <div>
            <p className="font-cinzel text-gold uppercase text-xs tracking-widest mb-0.5">Ligue de Guerre de Clans</p>
            <p className="font-cinzel text-bone font-bold text-sm">Saison {data.season}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-ash text-xs font-cinzel">{(data.clans || []).length} clans • Groupe</p>
          </div>
        </div>
      </div>

      {/* 7 rounds */}
      <h3 className="font-cinzel text-gold-bright uppercase text-xs tracking-widest mb-3">Les 7 matchs de la semaine</h3>
      {rounds.map((r) => (
        <RoundCard key={r.roundIndex} round={r} index={r.roundIndex} ourTag={CLAN_TAG} />
      ))}

      {/* Bilan global */}
      {played > 0 && (
        <div className="mt-6 rounded-lg p-5" style={{ background: '#111', border: '1px solid #1f1f1f' }}>
          <h3 className="font-cinzel text-gold-bright uppercase text-xs tracking-widest mb-4">Bilan de la semaine</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Matchs joués', value: `${played} / ${rounds.length}` },
              { label: 'Victoires', value: wins, color: 'text-green-400' },
              { label: 'Défaites', value: losses, color: 'text-red-400' },
              { label: 'Nuls', value: draws, color: 'text-gray-400' },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className={`text-2xl font-bold font-cinzel ${s.color || 'text-gold-light'}`}>{s.value}</p>
                <p className="text-ash text-xs font-cinzel uppercase tracking-wider mt-1">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-fog/20 flex flex-wrap gap-6">
            <div>
              <p className="text-ash text-xs font-cinzel uppercase tracking-wider">Total étoiles</p>
              <p className="font-cinzel text-gold font-bold text-lg">⭐ {totalStars}</p>
            </div>
            {bestEntry && (
              <div>
                <p className="text-ash text-xs font-cinzel uppercase tracking-wider">Meilleur attaquant</p>
                <p className="font-cinzel text-bone font-bold">{bestEntry[0]} — {bestEntry[1]} ⭐</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Onglet GDC/LDC (fusion Guerre + CWL) ────────────────────────────────

const WAR_STATE_LABELS = {
  notInWar:    { label: 'Pas de guerre en cours', color: 'text-ash' },
  preparation: { label: 'Préparation en cours', color: 'text-amber-400' },
  inWar:       { label: 'Guerre en cours', color: 'text-green-400' },
  warEnded:    { label: 'Guerre terminée', color: 'text-crimson' },
}

function GdcLdcTab({ loading, error }) {
  const { data: war, loading: warLoading, error: warError } = useCocWar()

  if (loading || warLoading) return <Spinner />
  if (error || warError) return <ErrorMsg msg={error || warError} />

  const state = war?.state || 'notInWar'
  const stateInfo = WAR_STATE_LABELS[state] || { label: state, color: 'text-ash' }

  return (
    <div>
      {/* ── Section GDC ── */}
      <div>
        <div className="card-stone p-4 mb-6 flex items-center gap-3">
          <span className={`font-cinzel uppercase text-sm font-bold ${stateInfo.color}`}>⚔️ {stateInfo.label}</span>
        </div>

        {(state === 'inWar' || state === 'warEnded' || state === 'preparation') && war?.clan && (
          <>
            <div className="card-stone p-5 mb-6">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex flex-col items-center gap-1">
                  {war.clan.badgeUrls?.small && <img src={war.clan.badgeUrls.small} className="w-12 h-12 object-contain" alt="" />}
                  <span className="font-cinzel text-bone font-bold text-sm">{war.clan.name}</span>
                  <span className="font-cinzel text-gold text-2xl font-bold">⭐ {war.clan.stars ?? 0}</span>
                  <span className="text-ash text-xs">{war.clan.destructionPercentage?.toFixed(1)}%</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="font-cinzel text-gold uppercase text-xs tracking-widest mb-1">VS</span>
                  <span className="text-ash text-xs font-cinzel">{war.teamSize}v{war.teamSize}</span>
                  {state === 'inWar' && war.endTime && (
                    <span className="text-xs text-ash mt-1">
                      Fin : {new Date(
                        war.endTime.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/, '$1-$2-$3T$4:$5:$6')
                      ).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
                <div className="flex flex-col items-center gap-1">
                  {war.opponent?.badgeUrls?.small && <img src={war.opponent.badgeUrls.small} className="w-12 h-12 object-contain" alt="" />}
                  <span className="font-cinzel text-bone font-bold text-sm">{war.opponent?.name}</span>
                  <span className="font-cinzel text-ash text-2xl font-bold">⭐ {war.opponent?.stars ?? 0}</span>
                  <span className="text-ash text-xs">{war.opponent?.destructionPercentage?.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {war.clan.members && (
              <div className="overflow-x-auto rounded-lg border border-fog/30">
                <table className="w-full text-sm">
                  <TableHeader cols={[
                    { label: '#', center: true },
                    { label: 'Joueur', center: false },
                    { label: 'HDV', center: true },
                    { label: 'Attaques', center: true },
                    { label: '⭐ Étoiles', center: true },
                    { label: '% Destruct.', center: true, hidden: 'hidden md:table-cell' },
                  ]} />
                  <tbody>
                    {[...(war.clan.members || [])]
                      .sort((a, b) => {
                        const starsA = a.attacks?.reduce((s, x) => s + x.stars, 0) ?? 0
                        const starsB = b.attacks?.reduce((s, x) => s + x.stars, 0) ?? 0
                        return starsB - starsA
                      })
                      .map((m, i) => {
                        const totalStars = m.attacks?.reduce((s, x) => s + x.stars, 0) ?? 0
                        const maxDestruct = m.attacks?.length
                          ? Math.max(...m.attacks.map((x) => x.destructionPercentage))
                          : 0
                        const attacksUsed = m.attacks?.length ?? 0

                        return (
                          <tr key={m.tag} className="border-b border-fog/20"
                            style={{ background: i % 2 === 0 ? '#0d0d0d' : '#111' }}>
                            <td className="py-2.5 px-3 text-center text-ash text-xs font-cinzel">{m.mapPosition}</td>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2">
                                <THImage level={m.townhallLevel} size={24} />
                                <span className="font-semibold text-bone text-sm">{m.name}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="text-xs font-bold text-white px-1.5 py-0.5 rounded" style={{ background: '#C41E3A' }}>
                                {m.townhallLevel}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center text-ash">
                              {attacksUsed}/{war.attacksPerMember || 2}
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold text-gold-light">{totalStars} ⭐</td>
                            <td className="py-2.5 px-3 text-center text-ash hidden md:table-cell">{maxDestruct.toFixed(1)}%</td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Séparateur ── */}
      <div className="my-8 border-t border-fog/30" />

      {/* ── Section LDC ── */}
      <div>
        <h2 className="font-cinzel text-gold-bright uppercase tracking-widest text-xs mb-4 flex items-center gap-3">
          <span>🏆 Ligue de Guerre de Clans (LDC)</span>
          <div className="flex-1 h-px bg-fog/40" />
        </h2>
        <LdcSection />
      </div>
    </div>
  )
}

// ─── Onglet Raids ─────────────────────────────────────────────────────────

function RaidsTab({ loading: parentLoading, error: parentError }) {
  const { data: raidsData, loading, error } = useCocRaids()

  if (parentLoading || loading) return <Spinner />
  if (parentError || error) return <ErrorMsg msg={parentError || error} />

  const seasons = (raidsData?.items || []).slice(0, 3)

  if (!seasons.length) {
    return <p className="text-ash font-cinzel text-center py-10">Aucune saison de raid disponible</p>
  }

  function fmtDate(str) {
    if (!str) return '—'
    return new Date(str).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  return (
    <div className="flex flex-col gap-8">
      {seasons.map((season, si) => (
        <div key={si}>
          <div className="card-stone p-4 mb-4 flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-6 flex-wrap">
              <div>
                <p className="text-ash text-xs font-cinzel uppercase">Période</p>
                <p className="text-bone text-sm font-cinzel">{fmtDate(season.startTime)} → {fmtDate(season.endTime)}</p>
              </div>
              <div>
                <p className="text-ash text-xs font-cinzel uppercase">Capital pillé</p>
                <p className="text-gold font-bold font-cinzel">{season.capitalTotalLoot?.toLocaleString() ?? '—'}</p>
              </div>
              <div>
                <p className="text-ash text-xs font-cinzel uppercase">Attaques totales</p>
                <p className="text-bone font-cinzel">{season.totalAttacks ?? '—'}</p>
              </div>
              <div>
                <p className="text-ash text-xs font-cinzel uppercase">Districts détruits</p>
                <p className="text-bone font-cinzel">{season.enemyDistrictsDestroyed ?? '—'}</p>
              </div>
            </div>
          </div>

          {season.members?.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-fog/30">
              <table className="w-full text-sm">
                <TableHeader cols={[
                  { label: '#', center: true },
                  { label: 'Joueur', center: false },
                  { label: 'Attaques', center: true },
                  { label: 'Capital pillé', center: true },
                  { label: 'Bonus', center: true, hidden: 'hidden md:table-cell' },
                ]} />
                <tbody>
                  {[...(season.members || [])]
                    .sort((a, b) => (b.capitalResourcesLooted || 0) - (a.capitalResourcesLooted || 0))
                    .map((m, i) => (
                      <tr key={m.tag || i} className="border-b border-fog/20"
                        style={{ background: i % 2 === 0 ? '#0d0d0d' : '#111' }}>
                        <td className="py-2.5 px-3 text-center text-ash text-xs font-cinzel">{i + 1}</td>
                        <td className="py-2.5 px-3 font-semibold text-bone">{m.name}</td>
                        <td className="py-2.5 px-3 text-center text-ash">{m.attacks ?? 0}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-gold-light">
                          {m.capitalResourcesLooted?.toLocaleString() ?? 0}
                        </td>
                        <td className="py-2.5 px-3 text-center text-ash hidden md:table-cell">
                          {m.bonusAttackLimit ?? 0}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Onglet Inscriptions GDC/LDC ─────────────────────────────────────────

function InscriptionsTab() {
  return <Inscriptions embedded />
}

// ─── Page principale ──────────────────────────────────────────────────────

const TABS = [
  { key: 'membres',      label: '👥 Membres' },
  { key: 'attaques',     label: '⚔️ Attaques' },
  { key: 'gdcldc',       label: '🏆 GDC/LDC' },
  { key: 'raids',        label: '💎 Raids' },
  { key: 'inscriptions', label: '📋 Inscriptions' },
]

export default function Guilde() {
  const { data: clan, loading: clanLoading } = useCocClan()
  const { data: membersData, loading: membersLoading, error: membersError } = useCocMembers()
  const [tab, setTab] = useState('membres')
  const location = useLocation()

  const members = membersData?.items || []
  const [descExpanded, setDescExpanded] = useState(false)

  useEffect(() => {
    const handler = () => setTab('inscriptions')
    window.addEventListener('open-war-signups', handler)
    return () => window.removeEventListener('open-war-signups', handler)
  }, [])

  useEffect(() => {
    if (location.state?.openTab) {
      setTab(location.state.openTab)
    }
  }, [location.state])

  return (
    <>
      <AnimatedBackground variant="members" />
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-10 animate-fade-up">
      <SectionHeader title="La Guilde" subtitle="Donjon Rouge · #29292QPRC" />

      {/* Clan header */}
      {clan && (
        <div className="card-stone mb-8 relative overflow-hidden">
          {/* Badge + nom */}
          <div className="flex flex-col items-center text-center px-4 py-6 md:flex-row md:text-left md:py-8 md:px-6 md:gap-6">
            {clan.badgeUrls?.large && (
              <img src={clan.badgeUrls.large} alt="Badge clan"
                   className="w-16 h-16 md:w-20 md:h-20 object-contain mb-3 md:mb-0 md:mr-4 flex-shrink-0" />
            )}
            <div>
              <div className="font-cinzel-deco text-gold text-lg font-bold">{clan.name}</div>
              <p className="text-xs text-gray-500 mt-1">{clan.tag} · {clan.location?.name}</p>
            </div>
          </div>
          {/* Description */}
          {clan.description && (
            <div className="px-4 md:px-6 -mt-2 mb-4">
              <p className={`text-sm text-gray-400 leading-relaxed ${!descExpanded ? 'line-clamp-3' : ''}`}>
                {clan.description}
              </p>
              {clan.description.length > 150 && (
                <button onClick={() => setDescExpanded(!descExpanded)}
                        className="text-xs text-[#dc2626] mt-1 hover:underline">
                  {descExpanded ? 'Voir moins ↑' : 'Voir plus ↓'}
                </button>
              )}
            </div>
          )}
          {/* Stats cards */}
          <div className="grid grid-cols-2 gap-3 px-4 pb-4 md:flex md:flex-wrap md:gap-4 md:px-6 md:pb-6 md:justify-start">
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
      {clanLoading && <p className="text-center text-ash font-cinzel animate-pulse mb-8">Chargement du clan...</p>}

      {/* Onglets */}
      <div className="flex gap-2 px-0 py-3 overflow-x-auto scrollbar-none border-b border-[#1a1a1a] mb-6 sticky top-0 bg-[#0d0d0d] z-10 md:flex-wrap md:overflow-visible md:border-none md:static md:bg-transparent md:py-0">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide whitespace-nowrap transition-all border ${
              tab === t.key
                ? 'bg-[#dc2626] border-[#dc2626] text-white'
                : 'bg-[#111111] border-[#2a2a2a] text-gray-400 hover:border-[#dc2626]/40 hover:text-white'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      <h2 className="font-cinzel text-gold-bright uppercase tracking-widest text-xs mb-4 flex items-center gap-3">
        <span>{TABS.find(t => t.key === tab)?.label} {tab === 'membres' || tab === 'attaques' ? `(${members.length})` : ''}</span>
        <div className="flex-1 h-px bg-fog/40" />
      </h2>

      {tab === 'membres'  && <MembresTab  members={members} loading={membersLoading} error={membersError} />}
      {tab === 'attaques' && <AttaquesTab members={members} loading={membersLoading} error={membersError} />}
      {tab === 'gdcldc'       && <GdcLdcTab       loading={false} error={null} />}
      {tab === 'raids'        && <RaidsTab        loading={false} error={null} />}
      {tab === 'inscriptions' && <InscriptionsTab />}
    </div>
    </>
  )
}

import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useCocClan, useCocMembers, useCocWar, useCocRaids, useCocCwl } from '../hooks/useCocApi.js'
import SectionHeader from '../components/SectionHeader.jsx'
import { translateRole, getRoleBadgeClass, getTownHallImageUrl, getLeagueImageUrl, getLeagueShortName } from '../utils/cocHelpers.js'
import { useWarSignups } from '../hooks/useWarSignups.js'
import { useAuth } from '../hooks/useAuth.jsx'

// ─── Constantes ligues & rôles ─────────────────────────────────────────────

const LEAGUE_ORDER = {
  'legend': 10, 'electro': 9, 'p.e.k.k.a': 8,
  'géant': 7, 'golem': 6, 'sorcière': 5,
  'valkyrie': 4, 'sorcier': 3, 'archer': 2,
  'barbare': 1, 'squelette': 0
}
const ROLE_ORDER = { leader: 0, coLeader: 1, admin: 2, member: 3 }

function getLeagueName(m) { return m.leagueTier?.name || m.league?.name || null }
function leagueKey(name) { return name ? name.toLowerCase().split(' ')[0] : '' }
function getLeagueOrder(name) { return LEAGUE_ORDER[leagueKey(name)] ?? -1 }

// ─── Composants partagés ───────────────────────────────────────────────────

function StatBadge({ icon, label, value }) {
  return (
    <div className="flex flex-col items-center justify-center p-4 rounded-lg border border-fog/40 bg-stone-mid gap-1 min-w-[110px]">
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
      <div className="overflow-x-auto rounded-lg border border-fog/30">
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
    <div className="overflow-x-auto rounded-lg border border-fog/30">
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
  const { data: cwl, loading: cwlLoading, error: cwlError } = useCocCwl()

  if (loading || warLoading || cwlLoading) return <Spinner />
  if (error || warError) return <ErrorMsg msg={error || warError} />

  const state = war?.state || 'notInWar'
  const stateInfo = WAR_STATE_LABELS[state] || { label: state, color: 'text-ash' }

  const roundIdx = (cwl?.rounds?.length ?? 1) - 1
  const currentRound = cwl?.rounds?.[roundIdx]
  const cwlActive = cwl && cwl.state !== 'notInWar' && !cwlError

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
          <span>⚔️ Ligue des Clans (LDC)</span>
          <div className="flex-1 h-px bg-fog/40" />
        </h2>

        {!cwlActive ? (
          <p className="text-ash font-cinzel text-sm text-center py-4">Aucune LDC en cours</p>
        ) : (
          <div>
            <div className="card-stone p-4 mb-6 flex items-center gap-4 flex-wrap">
              <span className="font-cinzel text-gold uppercase text-xs tracking-widest">Saison CWL</span>
              <span className="text-bone font-bold font-cinzel">{cwl.season}</span>
              <span className="text-ash text-xs font-cinzel ml-auto">Round en cours : {roundIdx + 1}/{cwl.rounds?.length}</span>
            </div>

            <h3 className="font-cinzel text-gold-bright uppercase text-xs tracking-widest mb-3">Clans participants</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {(cwl.clans || []).map((c) => (
                <div key={c.tag} className="card-stone p-3 flex flex-col items-center gap-2">
                  {c.badgeUrls?.small && <img src={c.badgeUrls.small} className="w-10 h-10 object-contain" alt="" />}
                  <span className="font-cinzel text-bone text-xs font-bold text-center">{c.name}</span>
                  <span className="text-ash text-xs">{c.tag}</span>
                </div>
              ))}
            </div>

            {currentRound?.warTags && currentRound.warTags.filter(t => t !== '#0').length > 0 && (
              <>
                <h3 className="font-cinzel text-gold-bright uppercase text-xs tracking-widest mb-3">
                  Round {roundIdx + 1} — Matchups
                </h3>
                <div className="flex flex-wrap gap-2">
                  {currentRound.warTags.filter(t => t !== '#0').map((tag, i) => (
                    <span key={i} className="text-ash text-xs font-cinzel px-3 py-1 border border-fog/40 rounded">
                      Match {i + 1} : {tag}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
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
  const { signups, loading, error, signup, unsignup, reset } = useWarSignups()
  const { user, isChief, isAdmin } = useAuth()
  const [warType, setWarType] = useState('GDC')

  const isSignedUp = user && signups.some(s => s.player_id === user.id)
  const canReset = isChief || isAdmin

  if (loading) return <Spinner />
  if (error) return <ErrorMsg msg={error} />

  const WAR_TYPE_COLORS = {
    'GDC':      { bg: '#6B0000', border: '#C41E3A', text: '#ff8080' },
    'LDC':      { bg: '#1a1a4e', border: '#6366f1', text: '#a5b4fc' },
    'Les deux': { bg: '#1a3a1a', border: '#22c55e', text: '#86efac' },
  }

  return (
    <div>
      {/* Header compteur */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <span className="font-cinzel text-gold-bright uppercase tracking-wider text-sm">
            ⚔️ Inscrits pour la prochaine guerre
          </span>
          <span className="font-cinzel text-gold-light font-bold text-lg">
            {signups.length}
          </span>
        </div>
        {canReset && signups.length > 0 && (
          <button
            onClick={() => window.confirm('Remettre les inscriptions à zéro ?') && reset()}
            className="px-3 py-1 text-xs font-cinzel uppercase tracking-wider rounded border border-crimson text-crimson hover:bg-crimson/20 transition-all"
          >
            🔄 Remettre à zéro
          </button>
        )}
      </div>

      {/* Bouton inscription si connecté */}
      {user ? (
        <div className="card-stone p-4 mb-6">
          {!isSignedUp ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-bone font-cinzel text-sm">Disponible pour :</span>
              {['GDC', 'LDC', 'Les deux'].map(type => (
                <button
                  key={type}
                  onClick={() => setWarType(type)}
                  className="px-3 py-1 text-xs font-cinzel uppercase tracking-wider rounded border transition-all"
                  style={warType === type
                    ? { background: WAR_TYPE_COLORS[type].bg, borderColor: WAR_TYPE_COLORS[type].border, color: WAR_TYPE_COLORS[type].text }
                    : { borderColor: '#333', color: '#777' }
                  }
                >
                  {type}
                </button>
              ))}
              <button
                onClick={() => signup(warType)}
                className="px-4 py-1.5 text-xs font-cinzel uppercase tracking-wider rounded text-bone transition-all ml-auto"
                style={{ background: 'linear-gradient(135deg, #6B0000, #C41E3A)' }}
              >
                ✅ S'inscrire
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between flex-wrap gap-3">
              <span className="text-green-400 font-cinzel text-sm">
                ✅ Tu es inscrit(e) — {signups.find(s => s.player_id === user.id)?.war_type}
              </span>
              <button
                onClick={unsignup}
                className="px-3 py-1 text-xs font-cinzel uppercase tracking-wider rounded border border-fog/40 text-ash hover:text-bone transition-all"
              >
                Se désinscrire
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="card-stone p-4 mb-6 text-center">
          <p className="text-ash font-cinzel text-sm">Connecte-toi pour t'inscrire</p>
        </div>
      )}

      {/* Tableau des inscrits */}
      {signups.length === 0 ? (
        <p className="text-ash font-cinzel text-center py-10">
          Aucune inscription pour le moment
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-fog/30">
          <table className="w-full text-sm">
            <TableHeader cols={[
              { label: '#',          center: true },
              { label: 'Joueur',     center: false },
              { label: 'Type',       center: true },
              { label: 'Inscrit le', center: true, hidden: 'hidden md:table-cell' },
            ]} />
            <tbody>
              {signups.map((s, i) => {
                const colors = WAR_TYPE_COLORS[s.war_type] || WAR_TYPE_COLORS['GDC']
                return (
                  <tr key={s.id} className="border-b border-fog/20"
                    style={{ background: i % 2 === 0 ? '#0d0d0d' : '#111' }}>
                    <td className="py-2.5 px-3 text-center text-ash text-xs font-cinzel">{i + 1}</td>
                    <td className="py-2.5 px-3">
                      <div>
                        <div className="font-semibold text-bone text-sm">{s.coc_name}</div>
                        <div className="text-xs text-ash/60">{s.coc_tag}</div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="text-xs font-cinzel font-bold uppercase px-2 py-0.5 rounded border"
                        style={{ borderColor: colors.border, color: colors.text, background: colors.bg }}>
                        {s.war_type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center text-ash text-xs hidden md:table-cell">
                      {new Date(s.signed_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────

const TABS = [
  { key: 'membres',      label: 'Membres' },
  { key: 'attaques',     label: 'Attaques' },
  { key: 'gdcldc',       label: 'GDC/LDC' },
  { key: 'raids',        label: 'Raids' },
  { key: 'inscriptions', label: '⚔️ Inscriptions' },
]

export default function Guilde() {
  const { data: clan, loading: clanLoading } = useCocClan()
  const { data: membersData, loading: membersLoading, error: membersError } = useCocMembers()
  const [tab, setTab] = useState('membres')
  const location = useLocation()

  const members = membersData?.items || []

  useEffect(() => {
    const handler = () => setTab('inscriptions')
    window.addEventListener('open-war-signups', handler)
    return () => window.removeEventListener('open-war-signups', handler)
  }, [])

  useEffect(() => {
    if (location.state?.openTab === 'gdcldc') {
      setTab('gdcldc')
    }
  }, [location.state])

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
      {clanLoading && <p className="text-center text-ash font-cinzel animate-pulse mb-8">Chargement du clan...</p>}

      {/* Onglets */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 font-cinzel uppercase text-xs tracking-wider rounded transition-all ${
              tab === t.key ? 'text-bone' : 'text-ash border border-fog hover:text-bone'
            }`}
            style={tab === t.key ? { background: 'linear-gradient(135deg, #6B0000, #C41E3A)' } : {}}>
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
  )
}

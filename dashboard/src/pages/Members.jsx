import { useEffect, useState } from 'react'
import api from '../api'

const ROLE_LABELS = {
  leader: 'Chef',
  coLeader: 'Co-chef',
  admin: 'Ancien',
  member: 'Membre',
}

function MemberTable({ title, tag, members, loading }) {
  return (
    <section>
      <div className="flex items-center gap-3 mb-3">
        <h3 className="text-dr-muted text-xs font-semibold uppercase tracking-widest">{title}</h3>
        <span className="text-dr-muted text-xs">{tag}</span>
        {!loading && (
          <span className="text-dr-gold text-xs font-semibold">{members.length} membres</span>
        )}
      </div>
      <div className="bg-dr-card border border-dr-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-dr-muted text-sm">Chargement...</div>
        ) : members.length === 0 ? (
          <div className="p-6 text-center text-dr-muted text-sm">Aucun membre</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dr-border text-dr-muted text-xs uppercase tracking-wider">
                <th className="text-left px-5 py-3 font-semibold">#</th>
                <th className="text-left px-5 py-3 font-semibold">Joueur</th>
                <th className="text-left px-5 py-3 font-semibold">Rôle</th>
                <th className="text-left px-5 py-3 font-semibold">HDV</th>
                <th className="text-left px-5 py-3 font-semibold">Trophées</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m, i) => (
                <tr
                  key={String(m.tag)}
                  className="border-b border-dr-border/40 hover:bg-dr-dark/50 transition-colors"
                >
                  <td className="px-5 py-3 text-dr-muted text-xs">{i + 1}</td>
                  <td className="px-5 py-3">
                    <div className="text-dr-text font-medium">{String(m.name)}</div>
                    <div className="text-dr-muted text-xs">{String(m.tag)}</div>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-semibold ${
                      m.role === 'leader' ? 'text-dr-gold' :
                      m.role === 'coLeader' ? 'text-dr-gold/70' :
                      'text-dr-muted'
                    }`}>
                      {ROLE_LABELS[m.role] ?? String(m.role)}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-dr-muted">
                    {m.townHallLevel ?? '—'}
                  </td>
                  <td className="px-5 py-3 text-dr-muted">
                    {typeof m.trophies === 'number' ? m.trophies : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}

export default function Members() {
  const [dr1, setDr1] = useState([])
  const [dr2, setDr2] = useState([])
  const [loading, setLoading] = useState({ dr1: true, dr2: true })
  const [error, setError] = useState(null)

  useEffect(() => {
    api.get('/api/coc/clan/dr1/members')
      .then(({ data }) => {
        const items = Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : [])
        setDr1(items)
      })
      .catch(() => setError('Erreur chargement DR1'))
      .finally(() => setLoading((p) => ({ ...p, dr1: false })))

    api.get('/api/coc/clan/dr2/members')
      .then(({ data }) => {
        const items = Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : [])
        setDr2(items)
      })
      .catch(() => setError('Erreur chargement DR2'))
      .finally(() => setLoading((p) => ({ ...p, dr2: false })))
  }, [])

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-dr-gold mb-1">Membres</h2>
        <p className="text-dr-muted text-sm">Liste des membres DR1 et DR2 depuis l'API CoC</p>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-800/40 text-red-400 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <MemberTable
        title="Donjon Rouge 1"
        tag="#29292QPRC"
        members={dr1}
        loading={loading.dr1}
      />
      <MemberTable
        title="Donjon Rouge 2"
        tag="#2RCGG9YR9"
        members={dr2}
        loading={loading.dr2}
      />
    </div>
  )
}

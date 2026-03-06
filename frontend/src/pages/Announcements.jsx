import { useState, useEffect } from 'react'
import api from '../lib/api.js'
import SectionHeader from '../components/SectionHeader.jsx'
import { ANNOUNCEMENT_COLORS, ANNOUNCEMENT_TEXT_COLORS } from '../lib/constants.js'

export default function Announcements() {
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/announcements')
      .then((r) => setAnnouncements(r.data))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 animate-fade-up">
      <SectionHeader title="Annonces" subtitle="Informations officielles du clan" />

      {loading && (
        <p className="text-center text-ash font-cinzel animate-pulse py-10">Chargement...</p>
      )}

      {!loading && announcements.length === 0 && (
        <div className="text-center py-20 text-ash font-cinzel uppercase tracking-widest text-sm">
          Aucune annonce active
        </div>
      )}

      <div className="flex flex-col gap-4">
        {announcements.map((a) => (
          <div
            key={a.id}
            className={`card-stone p-5 border-l-4 ${ANNOUNCEMENT_COLORS[a.type] || 'border-fog'}`}
          >
            <div className="flex items-center gap-3 mb-2">
              <span className={`text-xs font-cinzel font-bold uppercase tracking-widest ${ANNOUNCEMENT_TEXT_COLORS[a.type] || 'text-ash'}`}>
                {a.type}
              </span>
              <span className="text-xs text-ash ml-auto">
                {new Date(a.created_at).toLocaleDateString('fr-FR', {
                  day: 'numeric', month: 'long', year: 'numeric'
                })}
              </span>
            </div>
            <h3 className="text-lg font-bold font-cinzel text-bone mb-2">{a.title}</h3>
            <p className="text-bone leading-relaxed">{a.content}</p>
            {a.author && (
              <p className="text-xs text-ash mt-3 font-cinzel">
                Par {a.author.username} · {a.author.role}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

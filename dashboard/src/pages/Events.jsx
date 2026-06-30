import { useEffect, useState } from 'react'
import { getEvents, createEvent, updateEvent, deleteEvent } from '../api'

const TYPE_LABELS = {
  raid:   { label: 'Raid Capital', color: 'bg-yellow-900/30 text-yellow-400 border-yellow-700/40' },
  jdc:    { label: 'Jeux de Clan', color: 'bg-green-900/30 text-green-400 border-green-700/40' },
  manual: { label: 'Manuel',       color: 'bg-blue-900/30 text-blue-400 border-blue-700/40' },
}

function fmtDatetime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'UTC' }) + ' UTC'
}

function toDatetimeLocal(iso) {
  if (!iso) return ''
  return new Date(iso).toISOString().slice(0, 16)
}

function EventCard({ event, onDelete, onEdit }) {
  const type = TYPE_LABELS[event.type] ?? { label: event.type, color: 'bg-dr-border text-dr-muted' }
  const isPast = new Date(event.end_time) < new Date()

  return (
    <div className={`bg-dr-card border rounded-xl p-5 ${isPast ? 'border-dr-border opacity-60' : 'border-dr-red/30'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full border ${type.color}`}>
              {type.label}
            </span>
            {event.announced && (
              <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-dr-border text-dr-muted">
                ✅ Annoncé
              </span>
            )}
            {isPast && (
              <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-dr-border text-dr-muted">
                Passé
              </span>
            )}
          </div>
          <h3 className="text-dr-text font-semibold leading-snug mb-1">{event.title}</h3>
          {event.description && (
            <p className="text-dr-muted text-xs mb-2 leading-relaxed">{event.description}</p>
          )}
          <div className="flex gap-4 text-xs text-dr-muted">
            <span>🕐 {fmtDatetime(event.start_time)}</span>
            <span>🕑 {fmtDatetime(event.end_time)}</span>
          </div>
        </div>
        <div className="flex flex-col gap-2 flex-shrink-0">
          <button
            onClick={() => onEdit(event)}
            className="px-3 py-1.5 rounded-lg border border-dr-border text-dr-muted hover:border-dr-red/60 hover:text-dr-text transition-colors text-xs whitespace-nowrap"
          >
            Modifier
          </button>
          <button
            onClick={() => onDelete(event.id)}
            className="px-3 py-1.5 rounded-lg border border-dr-border text-dr-muted hover:border-red-700/60 hover:text-red-400 transition-colors text-xs whitespace-nowrap"
          >
            Supprimer
          </button>
        </div>
      </div>
    </div>
  )
}

const EMPTY_FORM = { title: '', description: '', start_time: '', end_time: '' }

export default function Events() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Création
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)

  // Édition
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState(EMPTY_FORM)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState(null)

  useEffect(() => {
    getEvents()
      .then(({ data }) => setEvents(Array.isArray(data) ? data : []))
      .catch(() => setError('Impossible de charger les événements'))
      .finally(() => setLoading(false))
  }, [])

  function handleFormChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handleEditFormChange(e) {
    setEditForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handleEditStart(event) {
    setEditingId(event.id)
    setEditForm({
      title:       event.title,
      description: event.description ?? '',
      start_time:  toDatetimeLocal(event.start_time),
      end_time:    toDatetimeLocal(event.end_time),
    })
    setEditError(null)
    setShowForm(false)
  }

  function handleEditCancel() {
    setEditingId(null)
    setEditForm(EMPTY_FORM)
    setEditError(null)
  }

  async function handleCreate(e) {
    e.preventDefault()
    setFormError(null)
    if (!form.title.trim() || !form.description.trim() || !form.start_time || !form.end_time) {
      return setFormError('Tous les champs sont obligatoires.')
    }
    const start = new Date(form.start_time)
    const end   = new Date(form.end_time)
    if (end <= start) return setFormError('La date de fin doit être après la date de début.')
    if (start < new Date()) return setFormError('La date de début doit être dans le futur.')

    setSaving(true)
    try {
      const { data } = await createEvent({
        title:       form.title.trim(),
        description: form.description.trim(),
        start_time:  start.toISOString(),
        end_time:    end.toISOString(),
      })
      setEvents((prev) => [data, ...prev])
      setForm(EMPTY_FORM)
      setShowForm(false)
    } catch (err) {
      setFormError(err.response?.data?.error ?? 'Erreur lors de la création.')
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdate(e) {
    e.preventDefault()
    setEditError(null)
    if (!editForm.title.trim() || !editForm.description.trim() || !editForm.start_time || !editForm.end_time) {
      return setEditError('Tous les champs sont obligatoires.')
    }
    const start = new Date(editForm.start_time)
    const end   = new Date(editForm.end_time)
    if (end <= start) return setEditError('La date de fin doit être après la date de début.')

    setEditSaving(true)
    try {
      const { data } = await updateEvent(editingId, {
        title:       editForm.title.trim(),
        description: editForm.description.trim(),
        start_time:  start.toISOString(),
        end_time:    end.toISOString(),
      })
      setEvents((prev) => prev.map((ev) => ev.id === editingId ? data : ev))
      handleEditCancel()
    } catch (err) {
      setEditError(err.response?.data?.error ?? 'Erreur lors de la mise à jour.')
    } finally {
      setEditSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Supprimer cet événement Discord ?')) return
    try {
      await deleteEvent(id)
      setEvents((prev) => prev.filter((e) => e.id !== id))
      if (editingId === id) handleEditCancel()
    } catch {
      setError('Erreur lors de la suppression.')
    }
  }

  const upcoming = events.filter((e) => new Date(e.end_time) >= new Date())
  const past     = events.filter((e) => new Date(e.end_time) < new Date())

  if (loading) return <div className="text-dr-muted text-sm">Chargement...</div>

  function renderEditForm() {
    return (
      <form
        onSubmit={handleUpdate}
        className="bg-dr-card border border-dr-red/40 rounded-xl p-5 space-y-4"
      >
        <h3 className="text-dr-text font-semibold">Modifier l'événement</h3>

        {editError && (
          <div className="bg-red-900/20 border border-red-800/40 text-red-400 px-3 py-2 rounded-lg text-sm">
            {editError}
          </div>
        )}

        <div>
          <label className="block text-dr-muted text-xs mb-1">Titre</label>
          <input
            name="title"
            value={editForm.title}
            onChange={handleEditFormChange}
            maxLength={100}
            className="w-full bg-dr-dark border border-dr-border rounded-lg px-3 py-2 text-dr-text text-sm focus:outline-none focus:border-dr-red/60"
          />
        </div>

        <div>
          <label className="block text-dr-muted text-xs mb-1">Description</label>
          <textarea
            name="description"
            value={editForm.description}
            onChange={handleEditFormChange}
            rows={3}
            maxLength={1000}
            className="w-full bg-dr-dark border border-dr-border rounded-lg px-3 py-2 text-dr-text text-sm focus:outline-none focus:border-dr-red/60 resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-dr-muted text-xs mb-1">Date début (UTC)</label>
            <input
              type="datetime-local"
              name="start_time"
              value={editForm.start_time}
              onChange={handleEditFormChange}
              className="w-full bg-dr-dark border border-dr-border rounded-lg px-3 py-2 text-dr-text text-sm focus:outline-none focus:border-dr-red/60"
            />
          </div>
          <div>
            <label className="block text-dr-muted text-xs mb-1">Date fin (UTC)</label>
            <input
              type="datetime-local"
              name="end_time"
              value={editForm.end_time}
              onChange={handleEditFormChange}
              className="w-full bg-dr-dark border border-dr-border rounded-lg px-3 py-2 text-dr-text text-sm focus:outline-none focus:border-dr-red/60"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={editSaving}
            className="px-4 py-2 rounded-lg bg-dr-red text-white text-sm font-medium hover:bg-dr-red/80 transition-colors disabled:opacity-50"
          >
            {editSaving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
          <button
            type="button"
            onClick={handleEditCancel}
            className="px-4 py-2 rounded-lg border border-dr-border text-dr-muted text-sm hover:text-dr-text transition-colors"
          >
            Annuler
          </button>
        </div>
      </form>
    )
  }

  function renderEventList(list) {
    return list.map((e) => (
      editingId === e.id
        ? <div key={e.id}>{renderEditForm()}</div>
        : <EventCard key={e.id} event={e} onDelete={handleDelete} onEdit={handleEditStart} />
    ))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-dr-gold mb-1">Événements Discord</h2>
          <p className="text-dr-muted text-sm">
            {upcoming.length} à venir · {past.length} passé{past.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => { setShowForm((v) => !v); setFormError(null); handleEditCancel() }}
          className="px-4 py-2 rounded-lg bg-dr-red text-white text-sm font-medium hover:bg-dr-red/80 transition-colors"
        >
          {showForm ? 'Annuler' : '+ Créer un événement'}
        </button>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-800/40 text-red-400 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-dr-card border border-dr-red/30 rounded-xl p-5 space-y-4"
        >
          <h3 className="text-dr-text font-semibold">Nouvel événement</h3>

          {formError && (
            <div className="bg-red-900/20 border border-red-800/40 text-red-400 px-3 py-2 rounded-lg text-sm">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-dr-muted text-xs mb-1">Titre</label>
            <input
              name="title"
              value={form.title}
              onChange={handleFormChange}
              maxLength={100}
              className="w-full bg-dr-dark border border-dr-border rounded-lg px-3 py-2 text-dr-text text-sm focus:outline-none focus:border-dr-red/60"
              placeholder="Titre de l'événement"
            />
          </div>

          <div>
            <label className="block text-dr-muted text-xs mb-1">Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleFormChange}
              rows={3}
              maxLength={1000}
              className="w-full bg-dr-dark border border-dr-border rounded-lg px-3 py-2 text-dr-text text-sm focus:outline-none focus:border-dr-red/60 resize-none"
              placeholder="Description de l'événement"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-dr-muted text-xs mb-1">Date début (UTC)</label>
              <input
                type="datetime-local"
                name="start_time"
                value={form.start_time}
                onChange={handleFormChange}
                className="w-full bg-dr-dark border border-dr-border rounded-lg px-3 py-2 text-dr-text text-sm focus:outline-none focus:border-dr-red/60"
              />
            </div>
            <div>
              <label className="block text-dr-muted text-xs mb-1">Date fin (UTC)</label>
              <input
                type="datetime-local"
                name="end_time"
                value={form.end_time}
                onChange={handleFormChange}
                className="w-full bg-dr-dark border border-dr-border rounded-lg px-3 py-2 text-dr-text text-sm focus:outline-none focus:border-dr-red/60"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-dr-red text-white text-sm font-medium hover:bg-dr-red/80 transition-colors disabled:opacity-50"
            >
              {saving ? 'Création...' : 'Créer'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setFormError(null) }}
              className="px-4 py-2 rounded-lg border border-dr-border text-dr-muted text-sm hover:text-dr-text transition-colors"
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      {events.length === 0 ? (
        <div className="bg-dr-card border border-dr-border rounded-xl p-12 text-center text-dr-muted text-sm">
          Aucun événement trouvé
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <section>
              <h3 className="text-dr-muted text-xs font-semibold uppercase tracking-widest mb-3">À venir</h3>
              <div className="grid gap-3">
                {renderEventList(upcoming)}
              </div>
            </section>
          )}
          {past.length > 0 && (
            <section>
              <h3 className="text-dr-muted text-xs font-semibold uppercase tracking-widest mb-3">Passés</h3>
              <div className="grid gap-3">
                {renderEventList(past)}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}

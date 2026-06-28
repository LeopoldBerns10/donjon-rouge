export function SaveBar({ dirty, onSave, onReset, saving }) {
  if (!dirty) return null

  return (
    <div className="fixed bottom-0 left-64 right-0 bg-dr-dark border-t border-dr-border px-6 py-4 flex items-center justify-between z-50">
      <p className="text-dr-muted text-sm">Modifications non sauvegardées</p>
      <div className="flex gap-3">
        <button
          onClick={onReset}
          disabled={saving}
          className="px-4 py-2 rounded-lg border border-dr-border text-dr-muted hover:text-dr-text hover:border-dr-muted transition-colors text-sm disabled:opacity-50"
        >
          Réinitialiser
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-dr-red hover:bg-dr-red-light text-white font-semibold transition-colors text-sm disabled:opacity-50"
        >
          {saving ? 'Sauvegarde...' : 'Sauvegarder'}
        </button>
      </div>
    </div>
  )
}

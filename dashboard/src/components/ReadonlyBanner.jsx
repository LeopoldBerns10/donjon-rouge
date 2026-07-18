export default function ReadonlyBanner() {
  return (
    <div className="mb-4 flex items-center gap-3 rounded-lg border border-amber-600/40 bg-amber-900/20 px-4 py-3">
      <span className="text-amber-400 text-lg">🔒</span>
      <p className="text-amber-300 text-sm font-cinzel">
        Accès en lecture seule — tu n&apos;as pas les droits pour modifier cette page.
      </p>
    </div>
  )
}

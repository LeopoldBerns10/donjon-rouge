import supabase from '../lib/supabase.js'

// Cache mémoire court (5 min) pour éviter des lectures Supabase répétées.
// Source de vérité : table coc_stats_cache, hydratée par le bot toutes les 30 min.
// Le backend ne fait plus aucun appel direct à l'API CoC.
const MEMORY_CACHE_TTL = 5 * 60 * 1000

const memoryCache = new Map()

export async function flushJdcCaches() {
  for (const key of memoryCache.keys()) {
    if (key.startsWith('player:') || key.startsWith('members:')) {
      memoryCache.delete(key)
    }
  }
  await supabase.from('coc_stats_cache').delete().like('coc_tag', 'player:%')
  await supabase.from('coc_stats_cache').delete().like('coc_tag', 'members:%')
}

// Lecture seule depuis Supabase. Le second paramètre fetchFn est conservé pour
// compatibilité avec les appelants existants mais n'est jamais invoqué.
export async function getCached(key, _fetchFn) {
  const mem = memoryCache.get(key)
  if (mem && Date.now() - mem.time < MEMORY_CACHE_TTL) {
    return mem.data
  }

  const { data } = await supabase
    .from('coc_stats_cache')
    .select('data, updated_at')
    .eq('coc_tag', key)
    .single()

  if (data?.data) {
    memoryCache.set(key, { data: data.data, time: Date.now() })
    return data.data
  }

  throw new Error(`Données CoC non disponibles pour "${key}" — bot non démarré ou cache vide`)
}

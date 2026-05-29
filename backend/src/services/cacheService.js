import supabase from '../lib/supabase.js'

const COC_CACHE_TTL = 60 * 60 * 1000 // 1 heure

const memoryCache = new Map()

export async function getCached(key, fetchFn) {
  // 1. Cache mémoire (évite même les requêtes Supabase)
  const mem = memoryCache.get(key)
  if (mem && Date.now() - mem.time < COC_CACHE_TTL) {
    return mem.data
  }

  // 2. Cache Supabase
  const { data } = await supabase
    .from('coc_stats_cache')
    .select('data, updated_at')
    .eq('coc_tag', key)
    .single()

  if (data) {
    const age = Date.now() - new Date(data.updated_at).getTime()
    if (age < COC_CACHE_TTL) {
      memoryCache.set(key, { data: data.data, time: new Date(data.updated_at).getTime() })
      return data.data
    }
  }

  // 3. Fetch API CoC
  const fresh = await fetchFn()

  await supabase
    .from('coc_stats_cache')
    .upsert({ coc_tag: key, data: fresh, updated_at: new Date().toISOString() })

  memoryCache.set(key, { data: fresh, time: Date.now() })
  return fresh
}

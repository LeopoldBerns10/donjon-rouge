import supabase from '../lib/supabase.js'

const CACHE_TTL_MINUTES = 10

export async function getCached(key, fetchFn) {
  const { data } = await supabase
    .from('coc_stats_cache')
    .select('data, updated_at')
    .eq('coc_tag', key)
    .single()

  if (data) {
    const age = (Date.now() - new Date(data.updated_at).getTime()) / 60000
    if (age < CACHE_TTL_MINUTES) {
      return data.data
    }
  }

  const fresh = await fetchFn()

  await supabase
    .from('coc_stats_cache')
    .upsert({ coc_tag: key, data: fresh, updated_at: new Date().toISOString() })

  return fresh
}

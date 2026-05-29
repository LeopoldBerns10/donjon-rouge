import bcrypt from 'bcryptjs'
import { getClanMembers } from './cocApiService.js'
import supabase from '../lib/supabase.js'

const CLANS = [
  { tag: process.env.COC_CLAN_TAG_DR1 || '#29292QPRC', name: 'DR1' },
  { tag: process.env.COC_CLAN_TAG_DR2 || '#2RCGG9YR9', name: 'DR2' },
]

export async function syncMembers() {
  let totalCreated = 0
  let totalUpdated = 0

  for (const clan of CLANS) {
    try {
      const data = await getClanMembers(clan.tag)
      const members = data.items || []

      for (const member of members) {
        const { tag, name, role } = member

        const { data: existing } = await supabase
          .from('users')
          .select('id')
          .eq('coc_tag', tag)
          .single()

        if (!existing) {
          const password_hash = await bcrypt.hash(tag, 10)
          const { error: insertErr } = await supabase.from('users').insert({
            coc_tag: tag,
            coc_name: name,
            coc_role: role,
            clan_tag: clan.tag,
            password_hash,
            is_first_login: true,
          })
          if (insertErr) {
            console.log(`❌ Insert échoué pour ${name} (${tag}):`, JSON.stringify(insertErr))
          } else {
            totalCreated++
          }
        } else {
          const { error: updateErr } = await supabase
            .from('users')
            .update({ coc_name: name, coc_role: role, clan_tag: clan.tag, updated_at: new Date().toISOString() })
            .eq('coc_tag', tag)
          if (updateErr) {
            console.error(`❌ Update échoué pour ${name} (${tag}):`, updateErr.message)
          } else {
            totalUpdated++
          }
        }
      }

      console.log(`✅ Sync ${clan.name}: ${members.length} membres`)
    } catch (err) {
      console.error(`❌ Erreur sync ${clan.name}:`, err.message)
    }
  }

  console.log(`✅ Sync membres CoC terminée (${totalCreated} créés, ${totalUpdated} mis à jour)`)
  return { ok: true, created: totalCreated, updated: totalUpdated }
}

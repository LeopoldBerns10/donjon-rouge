import bcrypt from 'bcryptjs'
import { getClanMembers } from './cocApiService.js'
import supabase from '../lib/supabase.js'

const CLAN_TAG = '#29292QPRC'

export async function syncMembers() {
  try {
    const data = await getClanMembers(CLAN_TAG)
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
        await supabase.from('users').insert({
          coc_tag: tag,
          coc_name: name,
          coc_role: role,
          password_hash,
          is_first_login: true,
        })
      } else {
        await supabase
          .from('users')
          .update({ coc_name: name, coc_role: role, updated_at: new Date().toISOString() })
          .eq('coc_tag', tag)
      }
    }

    console.log(`✅ Sync membres CoC : ${members.length} membres synchronisés`)
  } catch (err) {
    console.error('❌ Erreur syncMembers:', err.message)
  }
}

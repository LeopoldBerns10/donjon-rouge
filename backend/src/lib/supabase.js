import { createClient } from '@supabase/supabase-js'

console.log('Supabase URL:', process.env.SUPABASE_URL ? 'OK' : 'MANQUANT')
console.log('Supabase SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? 'OK (longueur: ' + process.env.SUPABASE_SERVICE_KEY.length + ')' : 'MANQUANT')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default supabase

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function getCounts() {
  const { count: total } = await supabase.from('medical_knowledge').select('*', { count: 'exact', head: true })
  const { count: nullCount } = await supabase.from('medical_knowledge').select('*', { count: 'exact', head: true }).is('embedding', null)
  console.log(`TOTAL:${total}|NULL:${nullCount}`)
}

getCounts()

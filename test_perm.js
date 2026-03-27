import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function testPermission() {
  console.log('--- Testing Permissions ---')
  const { data: firstRow } = await supabase.from('medical_knowledge').select('id').limit(1).single()
  console.log('Row found:', firstRow?.id)
  
  if (firstRow) {
    // Try update with null (just a test)
    const { count, error } = await supabase.from('medical_knowledge').update({ created_at: new Date() }, { count: 'exact' }).eq('id', firstRow.id)
    if (error) {
      console.error('Update ERROR:', error.message)
    } else {
      console.log('Update reported rows affected:', count)
    }
  }
}

testPermission()

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkTable() {
  console.log('--- Checking medical_knowledge table ---')
  
  // 1. Check if table exists and count total
  const { count, error } = await supabase
    .from('medical_knowledge')
    .select('*', { count: 'exact', head: true })

  if (error) {
    console.error('Error fetching table count:', error.message)
    return
  }
  console.log('Total rows:', count)

  // 2. Check for null embeddings
  const { count: nullCount, error: nullError } = await supabase
    .from('medical_knowledge')
    .select('*', { count: 'exact', head: true })
    .is('embedding', null)

  if (nullError) {
    console.error('Error checking for null embeddings:', nullError.message)
  } else {
    console.log('Rows with null embedding:', nullCount)
  }

  // 3. Inspect a sample row for column names
  const { data: sample, error: sampleError } = await supabase
    .from('medical_knowledge')
    .select('*')
    .limit(1)

  if (sampleError) {
    console.error('Error fetching sample:', sampleError.message)
  } else if (sample && sample.length > 0) {
    console.log('Sample columns:', Object.keys(sample[0]))
  } else {
    console.log('No data found to inspect columns.')
  }
}

checkTable()

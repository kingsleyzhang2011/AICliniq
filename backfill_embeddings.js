import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
const GEMINI_KEY = process.env.VITE_GEMINI_KEY

if (!SUPABASE_URL || !SUPABASE_KEY || !GEMINI_KEY) {
  console.error('[FATAL] Missing environment variables. Please check .env.local or shell env.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
const model = "gemini-embedding-2-preview"

// 自定义日志记录器
const logFile = path.join(process.cwd(), 'backfill.log')
function writeLog(msg) {
  const time = new Date().toLocaleString()
  const line = `[${time}] ${msg}\n`
  process.stdout.write(line)
  fs.appendFileSync(logFile, line)
}

async function embed(text) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${GEMINI_KEY}`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: { parts: [{ text }] },
      outputDimensionality: 768
    })
  })
  if (!response.ok) {
    const err = await response.json()
    throw new Error(`Embed API Error ${response.status}: ${err.error?.message}`)
  }
  const data = await response.json()
  return data.embedding.values
}

async function backfill() {
  writeLog('--- AICliniq RAG Scheduled Task START ---')

  const { count: initialNulls } = await supabase.from('medical_knowledge').select('*', { count: 'exact', head: true }).is('embedding', null)
  writeLog(`Pending items in DB: ${initialNulls}`)

  let processedCount = 0
  let totalFailed = 0
  const MAX_PER_RUN = 1000 // 每次任务不超过1000条

  while (processedCount < MAX_PER_RUN) {
    // 1. Fetch batch
    const remainingToProcess = MAX_PER_RUN - processedCount
    const batchSize = Math.min(50, remainingToProcess)
    
    const { data: rows, error } = await supabase
      .from('medical_knowledge')
      .select('id, content')
      .is('embedding', null)
      .limit(batchSize)

    if (error) {
      writeLog(`[DB Error] Fetch batch failed: ${error.message}`)
      break
    }
    if (!rows || rows.length === 0) {
      writeLog('--- ALL RECORDS PROCESSED ---')
      break
    }

    writeLog(`Processing batch of ${rows.length}... (Progress: ${processedCount}/${MAX_PER_RUN})`)

    for (const row of rows) {
      try {
        const vector = await embed(row.content)
        const { error: updateError } = await supabase
          .from('medical_knowledge')
          .update({ embedding: vector })
          .eq('id', row.id)

        if (updateError) {
          writeLog(`[DB Error] Update failed ID ${row.id}: ${updateError.message}`)
          totalFailed++
        } else {
          processedCount++
        }
      } catch (err) {
        writeLog(`[API Error] ID ${row.id}: ${err.message}`)
        totalFailed++
        // 如果遇到配额限制（429），建议提前退出当前任务
        if (err.message.includes('429')) {
          writeLog('Quota exceeded (429), ending today\'s run early.')
          processedCount = MAX_PER_RUN // Force break
          break
        }
      }
    }

    // 2. Throttle between batches
    if (processedCount < MAX_PER_RUN) {
      await new Promise(r => setTimeout(r, 800))
    }
  }

  writeLog(`--- TASK SUMMARY: Processed=${processedCount}, Failed=${totalFailed} ---`)
}

backfill()

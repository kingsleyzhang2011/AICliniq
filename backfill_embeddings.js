import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// 环境变量加载（适配 node --env-file 或直接读取）
const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
const VOYAGE_API_KEY = process.env.VITE_VOYAGE_API_KEY

if (!SUPABASE_URL || !SUPABASE_KEY || !VOYAGE_API_KEY) {
  console.error('[FATAL] Missing environment variables. Please check .env.local or shell env.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
const VOYAGE_API_URL = "https://api.voyageai.com/v1/embeddings"
const VOYAGE_MODEL = "voyage-3" // 1024 dimensions

// 自定义日志记录器
const logFile = path.join(process.cwd(), 'backfill.log')
function writeLog(msg) {
  const time = new Date().toLocaleString()
  const line = `[${time}] ${msg}\n`
  process.stdout.write(line)
  fs.appendFileSync(logFile, line)
}

/**
 * 使用 Voyage AI 生成 1024 维向量
 */
async function embed(text) {
  const response = await fetch(VOYAGE_API_URL, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${VOYAGE_API_KEY}`
    },
    body: JSON.stringify({
      input: [text],
      model: VOYAGE_MODEL
    })
  })
  
  const data = await response.json()
  if (!response.ok) {
    throw new Error(`Voyage API Error ${response.status}: ${data.detail || 'Unknown error'}`)
  }
  
  return data.data?.[0]?.embedding || null
}

async function backfill() {
  writeLog('=== AICliniq RAG Voyage-3 Migration Task START ===')

  // 1. 获取所有向量不符合 1024 维度的记录（或者由于之前变动需要重新向量化的记录）
  // 注意：用户已经手动 ALTER 了字段为 vector(1024)，原本 768 维的数据会被强制截断或报错
  // 我们这里最稳妥的方式是：处理所有 embedding 为 null 或者由于 ALTER 导致非法的记录
  // 由于 Supabase 修改字段类型后，旧数据可能会报错，我们假设现在需要重填所有记录。
  
  // 检查待处理记录数 (embedding IS NULL)
  const { count: pendingCount } = await supabase
    .from('medical_knowledge')
    .select('*', { count: 'exact', head: true })
    .is('embedding', null)
    
  writeLog(`Detected ${pendingCount} records with NULL embedding (pending for 1024-dim).`)

  let processedCount = 0
  let totalFailed = 0
  const MAX_PER_RUN = 2000 // Voyage 额度高，我们可以调大一点

  while (processedCount < MAX_PER_RUN) {
    const remainingToProcess = MAX_PER_RUN - processedCount
    const batchSize = Math.min(50, remainingToProcess)
    
    // 获取待处理的任务
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
      writeLog('--- ALL RECORDS PROCESSED (NO MORE NULL EMBEDDINGS) ---')
      break
    }

    writeLog(`Processing batch of ${rows.length}... (Progress: ${processedCount}/${MAX_PER_RUN})`)

    for (const row of rows) {
      try {
        const vector = await embed(row.content)
        if (!vector) throw new Error('Empty vector returned')

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
        // 如果遇到频率限制等
        if (err.message.includes('429')) {
          writeLog('Rate limit (429) hit, waiting 5 seconds...')
          await new Promise(r => setTimeout(r, 5000))
        }
      }
    }

    // 稍微停顿，保护 API
    await new Promise(r => setTimeout(r, 200))
  }

  writeLog(`=== TASK SUMMARY: Processed=${processedCount}, Failed=${totalFailed} ===\n`)
}

// 执行任务
backfill()

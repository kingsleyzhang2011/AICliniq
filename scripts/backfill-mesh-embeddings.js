// scripts/backfill-mesh-embeddings.js
// 批量补全 MeSH 2026 缺失的向量，支持断点续跑
// 运行方式：node --env-file=.env.local scripts/backfill-mesh-embeddings.js

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
const VOYAGE_API_KEY = process.env.VITE_VOYAGE_API_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !VOYAGE_API_KEY) {
  console.error('[FATAL] Missing environment variables in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const BATCH_SIZE = 50      // 每批取50条
const DELAY_MS = 100       // 每条之间间隔（2000 RPM 很宽松）

async function main() {
  console.log('----------------------------------------------------')
  console.log('🧬 MeSH 2026 向量补全引擎 (Voyage-3)')
  console.log('----------------------------------------------------')

  // 先查总缺失数
  const { count, error: countError } = await supabase
    .from('medical_knowledge')
    .select('*', { count: 'exact', head: true })
    .eq('source', 'MeSH 2026')
    .is('embedding', null)

  if (countError) {
    console.error('❌ 获取统计失败:', countError.message)
    process.exit(1)
  }

  console.log(`📊 待补全向量: ${count} 条\n`)

  let processed = 0
  let successCount = 0
  let errorCount = 0

  while (true) {
    // 每次取一批没有向量的记录
    const { data: rows, error } = await supabase
      .from('medical_knowledge')
      .select('id, topic_en, topic_zh, content, disease_name, definition')
      .eq('source', 'MeSH 2026')
      .is('embedding', null)
      .limit(BATCH_SIZE)

    if (error) {
      console.error('❌ 查询失败:', error.message)
      await sleep(5000) // 数据库查错时等待5秒再试
      continue
    }

    if (!rows || rows.length === 0) {
      console.log('\n✅ 所有记录已补全！')
      break
    }

    console.log(`\n📦 正在处理批次: ${processed + 1} ~ ${processed + rows.length} (总: ${count})`)

    for (const row of rows) {
      try {
        // 组合文本（优先用 content，其次拼接其他字段）
        const text = buildText(row)
        if (!text || text.length < 5) {
          console.log(`   ⚠️  跳过内容过短/为空: ${row.id}`)
          // 标记为已处理以防死循环（可选，这里先不标记以便用户检查数据质量）
          continue
        }

        // 生成向量
        const embedding = await generateEmbedding(text)

        // 更新回 Supabase
        const { error: updateError } = await supabase
          .from('medical_knowledge')
          .update({ embedding })
          .eq('id', row.id)

        if (updateError) throw updateError

        successCount++
        processed++

        // 进度显示（每10条显示一次）
        if (successCount % 10 === 0) {
          const pct = ((successCount / count) * 100).toFixed(1)
          process.stdout.write(`   ✅ 已完成进度: ${successCount}/${count} (${pct}%)\r`)
        }

        await sleep(DELAY_MS)

      } catch (err) {
        errorCount++
        console.error(`\n   ❌ 失败 [${row.id}]: ${err.message}`)
        
        // 如果是触发了服务商的配额限制，多等一会
        if (err.message.includes('429') || err.message.includes('quota')) {
          console.log('   ⏳ 触发配额限制，暂停 10 秒...')
          await sleep(10000)
        } else {
          await sleep(1000)
        }
      }
    }
  }

  console.log('\n----------------------------------------------------')
  console.log('🎉 补全任务完成！')
  console.log(`   ✅ 成功: ${successCount} 条`)
  console.log(`   ❌ 失败: ${errorCount} 条`)
  console.log('----------------------------------------------------')
}

function buildText(row) {
  // 优先用已有的 content 字段
  if (row.content && row.content.length > 20) return row.content

  // 否则拼接其他字段
  const parts = []
  if (row.topic_en) parts.push(row.topic_en)
  if (row.topic_zh) parts.push(row.topic_zh)
  if (row.disease_name) parts.push(row.disease_name)
  if (row.definition) parts.push(row.definition)

  const combined = parts.join('\n\n').trim()
  return combined
}

async function generateEmbedding(text) {
  const res = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'voyage-3',
      input: [text],
      input_type: 'document',
    }),
  })

  const data = await res.json()
  if (!res.ok) {
    const msg = data.detail || JSON.stringify(data)
    throw new Error(`Voyage AI 错误: ${msg}`)
  }

  return data.data[0].embedding
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

main().catch(err => {
  console.error('[CRITICAL RUNTIME ERROR]:', err)
})

// scripts/ingest-medlineplus.js
// 批量拉取 MedlinePlus 数据，向量化后写入 Supabase
// 运行方式：node --env-file=.env.local scripts/ingest-medlineplus.js

import { createClient } from '@supabase/supabase-js'

// ── 配置 ──────────────────────────────────────────────
// 适配 .env.local 中的 VITE_ 前缀
const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
const VOYAGE_API_KEY = process.env.VITE_VOYAGE_API_KEY

const WSEARCH_BASE = 'https://wsearch.nlm.nih.gov/ws/query'

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !VOYAGE_API_KEY) {
  console.error('[FATAL] Missing environment variables. Please check .env.local or shell env.')
  console.log('Required: VITE_SUPABASE_URL, VITE_SUPABASE_SERVICE_ROLE_KEY, VITE_VOYAGE_API_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// ── 常见症状/疾病关键词列表 ────────────────────────────
const TOPICS = [
  // 症状类
  'migraine', 'tension headache',
  'angina', 'heart attack symptoms',
  'dyspnea', 'breathing problems',
  'nausea', 'vomiting',
  'vertigo', 'balance disorders',
  'chronic fatigue syndrome',
  'high blood pressure',
  'low blood pressure',

  // 常见病
  'asthma', 'COPD',
  'depression', 'bipolar disorder',
  'anxiety disorder', 'panic disorder',
  'low back pain', 'sciatica',
  'osteoarraytis', 'rheumatoid arraytis',
  'eczema', 'psoriasis', 'hives',
  'strep throat', 'tonsillitis',
  'irritable bowel syndrome',
  'Crohn disease', 'ulcerative colitis',
  'sleep apnea', 'insomnia',
  'obesity', 'metabolic syndrome',
  'coronary artery disease',
  'heart failure', 'arrhythmia',
  'ischemic stroke', 'TIA',
  'chronic kidney disease',
  'kidney stones',
  'hepatitis', 'cirrhosis',
  'hypothyroidism', 'hyperthyroidism',
  'iron deficiency anemia',
  'vitamin B12 deficiency',
  'pneumonia', 'bronchitis',
  'urinary tract infection',
  'sexually transmitted diseases',
  'HIV AIDS',
  'tuberculosis',
  'malaria',
  'dengue fever',
  'food allergy',
  'drug allergy',
  'sepsis',
  'appendicitis',
  'gallstones',
  'peptic ulcer',
  'GERD acid reflux',
  'celiac disease',
  'multiple sclerosis',
  'Parkinson disease',
  'Alzheimer disease',
  'epilepsy seizures',
  'migraine treatment',
  'cancer screening',
  'breast cancer',
  'lung cancer',
  'colorectal cancer',
  'prostate cancer',
  'cervical cancer',
  'skin cancer melanoma',
  'leukemia',
  'lymphoma',
]

// ── 主流程 ────────────────────────────────────────────
async function main() {
  console.log('----------------------------------------------------')
  console.log('🌿 AICliniq Knowledge Ingestion Engine (Voyage-3)')
  console.log('----------------------------------------------------')
  console.log(`🚀 开始处理 ${TOPICS.length} 个主题...\n`)
  
  let successCount = 0
  let skipCount = 0
  let errorCount = 0

  for (const topic of TOPICS) {
    try {
      console.log(`📥 正在拉取: ${topic}...`)
      const results = await fetchFromMedlinePlus(topic)

      if (!results.length) {
        console.log(`   ⚠️  MedlinePlus 无结果，跳过`)
        skipCount++
        continue
      }

      for (const item of results) {
        // 组合要向量化的文本
        const textToEmbed = `${item.title}\n\n${item.summary}`.trim()
        if (textToEmbed.length < 80) continue

        // 检查是否已存在（避免重复写入，基于 URL 唯一性）
        const { data: existing, error: checkError } = await supabase
          .from('medical_knowledge')
          .select('id')
          .eq('source_url', item.url)
          .maybeSingle()

        if (checkError) {
          console.warn(`   ⚠️  数据库查询失败 [${item.title}]:`, checkError.message)
        }

        if (existing) {
          console.log(`   ⏭️  记录已存在: ${item.title}`)
          skipCount++
          continue
        }

        // 调用 Voyage AI 生成 1024 维向量
        const embedding = await generateEmbedding(textToEmbed)

        // 写入 Supabase
        const { error } = await supabase.from('medical_knowledge').insert({
          source: 'medlineplus',
          source_url: item.url,
          source_id: item.url,
          topic_en: item.title,
          topic_zh: null,
          language: 'en',
          content: textToEmbed,
          disease_name: item.title,
          definition: item.summary,
          embedding,
          last_fetched_at: new Date().toISOString(),
        })

        if (error) {
          console.error(`   ❌ 写入失败 [${item.title}]:`, error.message)
          errorCount++
          continue
        }

        // 避免速率过快
        await sleep(200)
      }

      // 每个 topic 之间稍作停顿
      await sleep(300)

    } catch (err) {
      console.error(`   ❌ 严重错误 [${topic}]:`, err.message)
      errorCount++
    }
  }

  console.log('\n----------------------------------------------------')
  console.log(`🎉 抓取任务完成！`)
  console.log(`   ✅ 成功写入: ${successCount} 条`)
  console.log(`   ⏭️  由于重复或无结果跳过: ${skipCount} 条`)
  console.log(`   ❌ 发生错误: ${errorCount} 条`)
  console.log('----------------------------------------------------\n')
}

// ── MedlinePlus 抓取 ──────────────────────────────────
async function fetchFromMedlinePlus(keyword, maxResults = 5) {
  const params = new URLSearchParams({
    db: 'healthTopics',
    term: keyword,
    retmax: String(maxResults),
    rettype: 'brief',
  })

  // Node.js 18+ 原生 fetch
  const res = await fetch(`${WSEARCH_BASE}?${params}`)
  if (!res.ok) throw new Error(`MedlinePlus HTTP Error: ${res.status}`)

  const xml = await res.text()
  return parseXML(xml)
}

function parseXML(xml) {
  const results = []
  const docMatches = xml.matchAll(/<document rank="\d+" url="([^"]*)"[^>]*>([\s\S]*?)<\/document>/g)

  for (const match of docMatches) {
    const url = match[1]
    const body = match[2]

    const getContent = (name) => {
      const m = body.match(new RegExp(`<content name="${name}"[^>]*>([\\s\\S]*?)<\\/content>`))
      if (!m) return ''
      return decodeHTMLEntities(m[1])
    }

    const title = getContent('title')
    const summary = getContent('FullSummary') || getContent('snippet')
    if (!title || !summary) continue

    results.push({ title, summary, url })
  }

  return results
}

function decodeHTMLEntities(str) {
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]*>/g, '')   // 去除所有 HTML 标签（包括 <span class="qt0">）
    .replace(/\s+/g, ' ')      // 合并多余空白
    .trim()
}

// ── Voyage AI 向量化 ──────────────────────────────────
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

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Voyage AI (1024-dim) Error: ${errText}`)
  }

  const data = await res.json()
  if (!data.data || !data.data[0]) throw new Error('Voyage API returned invalid data structure')
  
  return data.data[0].embedding
}

// ── 工具函数 ──────────────────────────────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms))

// ── 启动 ──────────────────────────────────────────────
main().catch(err => {
  console.error('[FATAL RUNTIME ERROR]:', err)
})

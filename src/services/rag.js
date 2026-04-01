import { supabase } from './supabase.js'
import { callWithFallback } from './ai.js'

// --- Voyage AI Configuration ---
const VOYAGE_API_URL = "https://api.voyageai.com/v1/embeddings";
const VOYAGE_MODEL = "voyage-3"; // 1024 dimensions

/**
 * RAG 核心：使用 Voyage AI 进行向量化（1024 维度）
 */
export async function embedText(textToEmbed) {
  let apiKey = ''
  try {
    // 适配 Vite 环境变量
    apiKey = import.meta.env?.VITE_VOYAGE_API_KEY
  } catch (e) { }

  if (!apiKey && typeof process !== 'undefined') {
    // 适配 Node.js 环境（如数据导入脚本）
    apiKey = process.env.VITE_VOYAGE_API_KEY
  }
  
  if (!apiKey) {
    console.warn('[RAG] Voyage API Key is missing, skipping embedding.')
    return null
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10秒超时

    const response = await fetch(VOYAGE_API_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        input: [textToEmbed], // Must be an array
        model: VOYAGE_MODEL
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data.detail || 'Unknown error'
      throw new Error(`[Voyage API Error] Status: ${response.status}, Msg: ${errorMsg}`);
    }

    // Voyage returns: { data: [{ embedding: [...], index: 0 }], model: "...", usage: {...} }
    return data.data?.[0]?.embedding || null;

  } catch (error) {
    if (error.name === 'AbortError') {
      console.warn('[RAG] Voyage API 超时（10秒），跳过向量化');
    } else {
      console.error("[RAG Terminal Error]:", error);
    }
    return null;
  }
}

// ── 2. 检索相关医学知识（混合检索：向量DB + MedlinePlus实时） ────
export async function retrieveKnowledge(symptoms, language = 'zh', topK = 5) {
  console.log('[RAG] retrieveKnowledge 开始，症状:', symptoms?.slice(0, 50))
  try {
    // 中文症状先翻译成英文再向量化
    let queryText = symptoms
    if (language === 'zh') {
      queryText = await translateToEnglish(symptoms)
      console.log('[RAG] 翻译后查询词:', queryText)
    }

    const embedding = await embedText(queryText)
    if (!embedding) {
      console.warn('[RAG] embedding 为空，跳过向量检索，返回空结果')
      return []
    }
    console.log('[RAG] embedding 完成，开始并行检索...')

    // 两路并行：向量检索 + MedlinePlus实时API
    const [vectorResult, apiResult] = await Promise.allSettled([
      
      // 来源1：Supabase 向量检索（MeSH 2026 + MedlinePlus已存储）+ 10秒超时
      Promise.race([
        supabase.rpc('match_documents', {
          query_embedding: embedding,
          match_threshold: 0.3,
          match_count: topK
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Supabase RPC 超时(10s)')), 10000))
      ]),

      // 来源2：MedlinePlus 实时API（通过Vercel代理），需要传入经过翻译的英文 queryText
      Promise.race([
        fetch(`/api/medlineplus?type=keyword&keyword=${encodeURIComponent(queryText)}&max=2`)
          .then(r => r.json())
          .then(json => json.success ? json.data : [])
          .catch(() => []),
        new Promise(resolve => setTimeout(() => resolve([]), 5000)) // 5秒超时
      ])
    ])
    console.log('[RAG] 并行检索完成 - vector:', vectorResult.status, ', api:', apiResult.status)

    // 处理向量检索结果
    const vectorDocs = vectorResult.status === 'fulfilled'
      ? (vectorResult.value.data ?? [])
      : []

    if (vectorResult.status === 'fulfilled' && vectorResult.value.error) {
      console.warn('[RAG] 向量检索错误:', vectorResult.value.error.message)
    }

    // 处理实时API结果，转换成统一格式
    const apiDocs = apiResult.status === 'fulfilled'
      ? (apiResult.value ?? []).map(item => ({
          id: null,
          content: item.summary,
          topic_en: item.title,
          topic_zh: null,
          source: 'medlineplus_live',  // 标记为实时数据
          source_url: item.url,
          similarity: 0.75             // 实时数据给固定相似度
        }))
      : []

    // 合并：向量结果优先，实时API补充
    const combined = [...vectorDocs, ...apiDocs]

    // 去重（按 topic_en 去重，避免已存储和实时重复）
    const seen = new Set()
    const deduped = combined.filter(doc => {
      const key = (doc.topic_en || doc.content?.slice(0, 50) || '').toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    return deduped.slice(0, topK + 2) // 多返回2条给用户更多参考

  } catch (err) {
    console.warn('[RAG] 检索意外错误:', err.message)
    return []
  }
}

// ── 3. 格式化知识上下文（注入prompt用）────────────────
export function formatKnowledgeContext(knowledgeList) {
  if (!knowledgeList || knowledgeList.length === 0) return ''
  
  const lines = knowledgeList.map(k => {
    const label = k.source === 'medlineplus' ? 'NIH MedlinePlus'
                : k.source === 'medlineplus_live' ? 'NIH MedlinePlus (实时)'
                : k.source === 'pubmed' ? 'PubMed StatPearls'
                : 'MeSH 2026'
    const topic = k.topic_zh || k.topic_en || ''
    return `[${label}｜${topic}] ${k.content}`
  })
  
  return `\n\n参考权威医学资料（请基于以下内容给出有依据的建议，并注明来源）：\n${lines.join('\n\n')}`
}

// ── 4. 数据导入工具（一次性使用，初始化知识库）──────────
export async function ingestMedlinePlus(topicKeywords) {
  const results = { success: 0, failed: 0 }
  
  for (const keyword of topicKeywords) {
    try {
      const url = `https://wsearch.nlm.nih.gov/ws/query?db=healthTopics&term=${encodeURIComponent(keyword)}&retmax=3`
      const resp = await fetch(url)
      const text = await resp.text()
      
      const summaryMatch = text.match(/<content name="FullSummary">([\s\S]*?)<\/content>/g) || []
      
      for (const match of summaryMatch) {
        const content = match
          .replace(/<content name="FullSummary">/, '')
          .replace(/<\/content>/, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 1200)
        
        if (content.length < 100) continue
        
        const embedding = await embedText(content)
        if (!embedding) continue
        
        await supabase.from('medical_knowledge').insert({
          source: 'medlineplus',
          topic_en: keyword,
          topic_zh: keyword,
          language: 'en',
          content,
          embedding
        })
        
        results.success++
        await new Promise(r => setTimeout(r, 500))
      }
    } catch (err) {
      results.failed++
      console.warn(`[Ingest] Failed: ${keyword}`, err.message)
    }
  }
  
  return results
}

// ── 中文翻译工具（用于 RAG 检索前预处理）────────────────
async function translateToEnglish(text) {
  try {
    const prompt = `Translate the following Chinese medical symptoms to English medical terms only. Return ONLY the translation, no explanation, no prefixes, no quotes.`
    // 使用 callWithFallback，利用它的多路降级能力对抗 429
    const res = await callWithFallback(prompt, text, [], [], { role: 'SUMMARY' })
    const translated = res.trim()
    return translated || text
  } catch (e) {
    console.warn('[RAG] 翻译失败，使用原文:', e.message)
    return text
  }
}


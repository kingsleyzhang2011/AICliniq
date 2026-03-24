import { supabase } from './supabase.js'

const GEMINI_EMBEDDING_URL = 
  'https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent'

// ── 1. 文本向量化 ──────────────────────────────────────
export async function embedText(text) {
  // 增加对 Node.js 脚本的兼容性
  let apiKey = ''
  try {
    // 只有在 Vite 环境下 import.meta.env 才存在
    apiKey = import.meta.env?.VITE_GEMINI_KEY
  } catch (e) {
    // 忽略错误，回退到 process.env
  }

  if (!apiKey && typeof process !== 'undefined') {
    apiKey = process.env.VITE_GEMINI_KEY
  }
  
  if (!apiKey) {
    console.warn('[RAG] Gemini API Key is missing, skipping embedding.')
    return null
  }

  try {
    const response = await fetch(`${GEMINI_EMBEDDING_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'models/text-embedding-004',
        content: { parts: [{ text }] }
      })
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.warn(`[RAG] Embedding failed: ${response.status} - ${errorText}`)
      return null
    }
    
    const data = await response.json()
    return data.embedding?.values ?? null
  } catch (err) {
    console.warn('[RAG] Network error during embedding:', err.message)
    return null
  }
}

// ── 2. 检索相关医学知识 ────────────────────────────────
export async function retrieveKnowledge(symptoms, language = 'zh', topK = 3) {
  try {
    const embedding = await embedText(symptoms)
    if (!embedding) return []
    
    const { data, error } = await supabase.rpc('match_medical_knowledge', {
      query_embedding: embedding,
      match_threshold: 0.75,
      match_count: topK,
      lang: language
    })
    
    if (error) {
      console.warn('[RAG] Retrieval error:', error.message)
      return []
    }
    
    return data ?? []
  } catch (err) {
    console.warn('[RAG] Unexpected error in retrieval:', err.message)
    return []
  }
}

// ── 3. 格式化知识上下文（注入prompt用）────────────────
export function formatKnowledgeContext(knowledgeList) {
  if (!knowledgeList || knowledgeList.length === 0) return ''
  
  const lines = knowledgeList.map(k => {
    const label = k.source === 'medlineplus' ? 'NIH MedlinePlus' 
                : k.source === 'pubmed' ? 'PubMed StatPearls'
                : 'WHO指南'
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

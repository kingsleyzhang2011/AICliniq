import { supabase } from './supabase.js'

const model = "gemini-embedding-2-preview";
const GEMINI_EMBEDDING_URL = 
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent`

/**
 * RAG 核心：永远使用 Gemini 进行向量化（受控于 768 维度）
 */
export async function embedText(textToEmbed) {
  // 增加对 Node.js 脚本的兼容性
  let apiKey = ''
  try {
    apiKey = import.meta.env?.VITE_GEMINI_KEY
  } catch (e) { }

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
        content: {
          parts: [{ text: textToEmbed }]
        },
        // 【核心救命符】gemini-embedding-001 默认是 3072 维
        // 你的数据库（如 Supabase）如果是按旧版 004 设置的 768 维，不加这行会存不进去
        outputDimensionality: 768 
      })
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data.error?.message || 'Unknown error'
      throw new Error(`[RAG API Error] Status: ${response.status}, Msg: ${errorMsg}`);
    }

    return data.embedding.values;

  } catch (error) {
    console.error("[RAG Terminal Error]:", error);
    return null; // 保持原有接口习惯，外部调用期望 null 以跳过
  }
}

// ── 2. 检索相关医学知识 ────────────────────────────────
export async function retrieveKnowledge(symptoms, language = 'zh', topK = 3) {
  try {
    const embedding = await embedText(symptoms)
    if (!embedding) return []
    
    const { data, error } = await supabase.rpc('match_documents', {
      query_embedding: embedding,
      match_threshold: 0.5, // 用户要求的 0.5
      match_count: topK
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

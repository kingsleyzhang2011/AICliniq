import { supabase } from './supabase.js'

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
    const response = await fetch(VOYAGE_API_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        input: [textToEmbed], // Must be an array
        model: VOYAGE_MODEL
      })
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data.detail || 'Unknown error'
      throw new Error(`[Voyage API Error] Status: ${response.status}, Msg: ${errorMsg}`);
    }

    // Voyage returns: { data: [{ embedding: [...], index: 0 }], model: "...", usage: {...} }
    return data.data?.[0]?.embedding || null;

  } catch (error) {
    console.error("[RAG Terminal Error]:", error);
    return null;
  }
}

// ── 2. 检索相关医学知识 ────────────────────────────────
export async function retrieveKnowledge(symptoms, language = 'zh', topK = 3) {
  try {
    const embedding = await embedText(symptoms)
    if (!embedding) return []
    
    // 注意：匹配函数 match_documents 内部使用的是向量余弦相似度
    // 维度必须匹配数据库中的 vector(1024)
    const { data, error } = await supabase.rpc('match_documents', {
      query_embedding: embedding,
      match_threshold: 0.5, 
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

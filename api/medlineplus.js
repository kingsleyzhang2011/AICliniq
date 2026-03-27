// api/medlineplus.js
// Vercel Serverless Function - 代理 MedlinePlus 请求，解决浏览器 CORS 问题

const WSEARCH_BASE = 'https://wsearch.nlm.nih.gov/ws/query'
const CONNECT_BASE = 'https://connect.medlineplus.gov/service'

export default async function handler(req, res) {
  // 允许跨域
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const { type, keyword, icd10 } = req.query

  try {
    if (type === 'keyword' && keyword) {
      const data = await fetchByKeyword(keyword)
      return res.status(200).json({ success: true, data })
    }

    if (type === 'icd10' && icd10) {
      const data = await fetchByICD10(icd10)
      return res.status(200).json({ success: true, data })
    }

    return res.status(400).json({ success: false, error: '缺少参数 type + keyword 或 icd10' })
  } catch (err) {
    console.error('[MedlinePlus proxy error]', err)
    return res.status(500).json({ success: false, error: err.message })
  }
}

async function fetchByKeyword(keyword, maxResults = 5) {
  const params = new URLSearchParams({
    db: 'healthTopics',
    term: keyword,
    retmax: String(maxResults),
    rettype: 'brief',
  })

  const res = await fetch(`${WSEARCH_BASE}?${params}`)
  if (!res.ok) throw new Error(`WSearch 请求失败: ${res.status}`)

  const xml = await res.text()
  return parseWSearchXML(xml)
}

async function fetchByICD10(code) {
  const params = new URLSearchParams({
    'mainSearchCriteria.v.c': code,
    'mainSearchCriteria.v.cs': '2.16.840.1.113883.6.90',
    'knowledgeResponseType': 'application/json',
    'informationRecipient.languageCode.c': 'en',
  })

  const res = await fetch(`${CONNECT_BASE}?${params}`)
  if (!res.ok) throw new Error(`Connect 请求失败: ${res.status}`)

  const text = await res.text()
  
  if (text.trim().startsWith('<')) {
    console.error('[Connect API Error] Received HTML/XML instead of JSON:', text.substring(0, 100))
    throw new Error(`Connect API 返回了非预期的格式。内容: ${text.substring(0, 50)}...`)
  }

  const data = JSON.parse(text)
  return parseConnectResponse(data)
}

function parseWSearchXML(xml) {
  // Vercel 是 Node.js 环境，用正则解析 XML（无 DOMParser）
  const results = []
  const docMatches = xml.matchAll(/<document url="([^"]*)"[^>]*>([\s\S]*?)<\/document>/g)

  for (const match of docMatches) {
    const url = match[1]
    const body = match[2]

    const getContent = (name) => {
      const m = body.match(new RegExp(`<content name="${name}"[^>]*>([\\s\\S]*?)<\\/content>`))
      let text = m ? m[1].replace(/<[^>]*>/g, '').trim() : ''
      // CData 处理（如果有）
      return text.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim()
    }

    const title = getContent('title')
    const fullSummary = getContent('FullSummary')
    const snippet = getContent('snippet')
    const summary = fullSummary || snippet

    if (!title || !summary) continue

    results.push({ title, summary, url, source: 'medlineplus' })
  }

  return results
}

function parseConnectResponse(data) {
  const entries = data?.feed?.entry
  if (!entries) return []
  
  // 统一转为数组
  const entryList = Array.isArray(entries) ? entries : [entries]

  return entryList.map(entry => ({
    title: entry.title?.['_value'] || '',
    summary: entry.summary?.['_value']?.replace(/<[^>]*>/g, '').trim() || '',
    url: entry.link?.[0]?.href || '',
    source: 'medlineplus',
  })).filter(item => item.title && item.summary)
}

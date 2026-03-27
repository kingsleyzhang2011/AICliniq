// src/services/medlineplus.js
// 调用自己的 Vercel 代理，不直接请求 MedlinePlus

const PROXY_BASE = '/api/medlineplus'

/**
 * 按关键词搜索疾病/症状
 * @param {string} keyword - 搜索关键词（英文）
 * @param {number} maxResults - 最多返回条数
 */
export async function searchByKeyword(keyword, maxResults = 5) {
  const res = await fetch(
    `${PROXY_BASE}?type=keyword&keyword=${encodeURIComponent(keyword)}&max=${maxResults}`
  )
  const json = await res.json()
  if (!json.success) throw new Error(json.error)
  return json.data
}

/**
 * 按 ICD-10 代码精确查询
 * @param {string} code - 如 'J45'（哮喘）、'E11'（2型糖尿病）
 */
export async function searchByICD10(code) {
  const res = await fetch(
    `${PROXY_BASE}?type=icd10&icd10=${encodeURIComponent(code)}`
  )
  const json = await res.json()
  if (!json.success) throw new Error(json.error)
  return json.data
}

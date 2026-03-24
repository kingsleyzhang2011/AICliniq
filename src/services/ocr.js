import { supabase, STORAGE_BUCKET } from './supabase'
import { callWithFallback } from './ai'

/**
 * 将 File 对象转换为 Base64，移除 data URL 的前缀
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => {
      // FileReader 返回 "data:image/png;base64,iVBORw0KGgo..."
      const result = reader.result
      const base64Data = result.split(',')[1]
      resolve(base64Data)
    }
    reader.onerror = (error) => reject(error)
  })
}

/**
 * 将文件上传到 Supabase Storage 获取永久存储路径，如果是临时使用也可以只返回 Signed URL
 */
export async function uploadToStorage(file, userId) {
  const timestamp = new Date().getTime()
  // 为避免文件名冲突及跨平台问题，生成安全的文件名
  const safeName = file.name.replace(/[^a-zA-Z0-9.]/g, '_')
  const filePath = `${userId}/${timestamp}_${safeName}`

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (error) {
    throw new Error(`Upload failed: ${error.message}`)
  }

  // 获取带签名的 URL 用于展示（默认过期时间由于是私人数据，按需生成）
  // 考虑到持久化，我们保存 path，并在需要时通过 createSignedUrl 获取，或者保存一段时间的 signed url
  // 为简便起见，这里我们在返回处生成一个有效期很久的 signed url (或依赖数据库记录 file path)
  
  // 这里我们返回存储桶定义的具体 path 即可
  return data.path
}

/**
 * 利用 Gemini 强大的视觉多模态能力提取化验单的结构化数据
 * 
 * @param {string} base64Data 文件的 Base64 数据（无前缀）
 * @param {string} mimeType 文件的 MIME类型 (如 'image/jpeg', 'application/pdf')
 * @returns {Promise<Array>} 返回解析后的结构化化验单指标数组
 */
export async function extractHealthData(base64Data, mimeType) {
  const systemPrompt = `
你是一位专业的医疗数据提取助手。你的任务是从用户上传的体检报告或化验单图片/PDF中，提取所有检测指标。
请务必以合法的 JSON 数组格式返回结果，不允许包含任何 Markdown 格式标签（不要使用 \`\`\`json 等代码块），直接输出数组即可。

每个数组对象的结构必须如下：
{
  "indicator_name": "指标名称，如 白细胞",
  "value": 数值(如 5.5) 或字符串(如果是阴性/阳性),
  "unit": "单位，如 10^9/L (如果没有则为 null)",
  "reference_range": "参考区间，如 4.0-10.0",
  "is_abnormal": 布尔值，如果该指标在图片中标红、有上升/下降箭头，或者明显超出参考区间，请设为 true，否则 false
}

只提取有意义的化验指标数据，忽略无意义的页眉页脚或非检验数据。
`

  const userPrompt = "请提取这张化验单中的所有指标，并按照要求的 JSON 数组格式返回。"

  const attachments = [{
    mimeType,
    data: base64Data
  }]

  // 调用封装好的多轨大模型接口，底层会自动将 attachments 转化为 inlineData 发给 Gemini
  const responseText = await callWithFallback(systemPrompt, userPrompt, [], attachments)

  try {
    // 尝试清洗可能的 markdown 标签
    let cleanJsonStr = responseText.trim()
    if (cleanJsonStr.startsWith('```json')) {
      cleanJsonStr = cleanJsonStr.replace(/^```json\n?/, '').replace(/\n?```$/, '')
    } else if (cleanJsonStr.startsWith('```')) {
      cleanJsonStr = cleanJsonStr.replace(/^```\n?/, '').replace(/\n?```$/, '')
    }
    
    const records = JSON.parse(cleanJsonStr)
    return Array.isArray(records) ? records : []
  } catch (error) {
    console.error('[LifeGuard] JSON parsing failed for OCR response:', responseText)
    throw new Error('AI未能返回完整的JSON格式数据，解析失败。请重试或检查图片清晰度。')
  }
}

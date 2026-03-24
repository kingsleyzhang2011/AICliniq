const KEYS = {
  gemini: (import.meta.env.VITE_GEMINI_KEY || '').trim(),
  groq: (import.meta.env.VITE_GROQ_KEY || '').trim(),
  siliconflow: (import.meta.env.VITE_SILICONFLOW_KEY || '').trim()
}

// 如需使用 Gemini 2.5 Preview，设置环境变量为：
// gemini-2.5-flash-preview-04-17
const MODELS = {
  gemini: import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.0-flash',
  groq: 'llama-3.3-70b-versatile',
  siliconflow: 'Qwen/Qwen2.5-7B-Instruct'
}

const TIMEOUTS = {
  gemini: 10000,
  groq: 15000,
  siliconflow: 20000
}

console.log('[LifeGuard] Environment Check:', {
  gemini: KEYS.gemini ? `VALID (starts with ${KEYS.gemini.substring(0, 4)}...)` : 'MISSING',
  groq: KEYS.groq ? `VALID (starts with ${KEYS.groq.substring(0, 4)}...)` : 'MISSING',
  siliconflow: KEYS.siliconflow ? `VALID (starts with ${KEYS.siliconflow.substring(0, 4)}...)` : 'MISSING'
})

const FALLBACK_ORDER = [
  { provider: 'gemini', model: MODELS.gemini },
  { provider: 'groq', model: MODELS.groq },
  { provider: 'siliconflow', model: MODELS.siliconflow }
]

/**
 * 核心调用函数，实现 AGENTS.md 要求的四轨 Fallback
 */
export async function callWithFallback(systemPrompt, userPrompt, history = [], attachments = []) {
  let lastError = null

  for (let i = 0; i < FALLBACK_ORDER.length; i++) {
    const { provider, model } = FALLBACK_ORDER[i]
    const apiKey = KEYS[provider]

    console.log(`[LifeGuard Debug] Attempting ${provider} (${model}). Key present: ${!!apiKey}, Length: ${apiKey?.length}, StartsWith: ${apiKey?.substring(0, 4)}`)

    if (!apiKey) {
      console.warn(`[LifeGuard] Skipping ${provider}: API Key not configured.`)
      continue
    }

    try {
      return await executeCall(provider, model, apiKey, systemPrompt, userPrompt, history, attachments)
    } catch (error) {
      const isAbort = error.name === 'AbortError' || error.message?.includes('timeout')
      const status = error.response?.status
      
      console.error(`[AI Fallback] ${provider} (${model}) failed: status=${status || 'N/A'}, msg=${error.message}`, error)

      // 如果是最后一个节点，或者是非 429/503 的严重错误
      if (i === FALLBACK_ORDER.length - 1) {
        throw lastError
      }
      
      // 否则继续循环（Fallback）
      continue
    }
  }
  
  throw lastError || new Error('All AI providers failed or were not configured.')
}

async function executeCall(provider, model, apiKey, system, user, history, attachments) {
  const timeout = TIMEOUTS[provider] || 30000
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    if (provider === 'gemini') {
      return await callGemini(model, apiKey, system, user, history, attachments, controller.signal)
    } else if (provider === 'groq') {
      return await callOpenAICompatible('https://api.groq.com/openai/v1', model, apiKey, system, user, history, attachments, controller.signal)
    } else if (provider === 'siliconflow') {
      return await callOpenAICompatible('https://api.siliconflow.cn/v1', model, apiKey, system, user, history, attachments, controller.signal)
    }
  } finally {
    clearTimeout(timeoutId)
  }
}

async function callGemini(model, apiKey, system, user, history, attachments, signal) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
  
  // 处理附件
  const attachmentParts = (attachments || []).map(att => ({
    inlineData: {
      mimeType: att.mimeType,
      data: att.data // base64 payload WITHOUT the data:mime/type;base64, prefix
    }
  }))

  const userParts = [{ text: user }, ...attachmentParts]

  const contents = [
    ...history.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    })),
    { role: 'user', parts: userParts }
  ]

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents,
      generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
    }),
    signal
  })

  if (!response.ok) {
    const err = new Error(`Gemini API Error: ${response.status}`)
    err.response = response
    throw err
  }

  const data = await response.json()
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

// 注意: 当前 OpenAI 兼容层仅针对文本实现了兼容，尚未将附件转为标准的 image_url 格式。
// 若要在 Groq/SiliconFlow 使用图片，需要实现符合 OpenAI 约定的 content 数组格式。本应用依靠 Gemini 作为 OCR 主力。
async function callOpenAICompatible(baseUrl, model, apiKey, system, user, history, attachments, signal) {
  const messages = [
    { role: 'system', content: system },
    ...history.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: user }
  ]

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${apiKey}`, 
      'Content-Type': 'application/json' 
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7
    }),
    signal
  })

  if (!response.ok) {
    const err = new Error(`${model} API Error: ${response.status}`)
    err.response = response
    throw err
  }

  const data = await response.json()
  return data?.choices?.[0]?.message?.content || ''
}

// --- 医生角色系统 ---

export const DOCTOR_ROLES = {
  general: { 
    name_zh: '全科医生', 
    name_en: 'General Practitioner', 
    emoji: '🩺',
    focus_zh: '综合评估，统筹协调各科意见',
    focus_en: 'Comprehensive assessment and coordination',
    role_in_consult: 'moderator',
    speak_always: true,
    max_words_zh: 200,
    max_words_en: 150,
    tone_zh: '你是会诊主持人，语气权威但亲切，负责主持流程、点名其他医生、在分歧时做最终裁决、最后输出行动清单',
    tone_en: 'You are the moderator. Lead the consultation, manage discussion, make final decisions.'
  },
  cardiologist: { 
    name_zh: '心血管科医生', 
    name_en: 'Cardiologist', 
    emoji: '❤️',
    focus_zh: '心脏、血压、血脂相关指标',
    focus_en: 'Heart, blood pressure, and lipid indicators',
    role_in_consult: 'specialist',
    speak_always: false,
    trigger_keywords_zh: ['胸痛','心悸','心跳','血压','头晕','气短','心脏','血脂','胸闷','心慌'],
    trigger_keywords_en: ['chest','heart','palpitation','blood pressure','dizzy','lipid'],
    max_words_zh: 120,
    max_words_en: 100,
    tone_zh: '语气严谨专业，直接说心血管相关的核心判断，不评论其他专科领域',
    tone_en: 'Precise and professional. Focus only on cardiovascular findings.'
  },
  endocrinologist: { 
    name_zh: '内分泌科医生', 
    name_en: 'Endocrinologist', 
    emoji: '🔬',
    focus_zh: '血糖、甲状腺、激素相关指标',
    focus_en: 'Blood glucose, thyroid, and hormone indicators',
    role_in_consult: 'specialist',
    speak_always: false,
    trigger_keywords_zh: ['血糖','糖尿病','甲状腺','激素','多饮','多尿','体重','疲劳','肥胖'],
    trigger_keywords_en: ['glucose','diabetes','thyroid','hormone','fatigue','weight'],
    max_words_zh: 120,
    max_words_en: 100,
    tone_zh: '语气耐心细致，擅长解释代谢相关问题，不评论其他专科领域',
    tone_en: 'Patient and detailed. Focus only on endocrine and metabolic findings.'
  },
  nutritionist: { 
    name_zh: '营养师', 
    name_en: 'Nutritionist', 
    emoji: '🥗',
    focus_zh: '饮食建议、营养补充、健康生活方式',
    focus_en: 'Diet, nutrition supplements, and healthy lifestyle',
    role_in_consult: 'specialist',
    speak_always: false,
    trigger_keywords_zh: ['饮食','营养','体重','食欲','维生素','补充','吃什么','忌口','消化'],
    trigger_keywords_en: ['diet','nutrition','weight','appetite','vitamin','supplement','food'],
    max_words_zh: 120,
    max_words_en: 100,
    tone_zh: '语气温暖亲切，给出具体可执行的饮食建议，避免使用过多专业术语',
    tone_en: 'Warm and practical. Give specific actionable dietary advice in plain language.'
  }
}

/**
 * 构建系统提示词并附加免责声明
 */
export function buildSystemPrompt(roleKey, language = 'zh') {
  const role = DOCTOR_ROLES[roleKey] || DOCTOR_ROLES.general
  const name = language === 'zh' ? role.name_zh : role.name_en
  const focus = language === 'zh' ? role.focus_zh : role.focus_en
  
  const basePrompt = language === 'zh' 
    ? `你是一位经验丰富的${name}。你的关注重点是：${focus}。请根据患者情况提供专业建议。`
    : `You are an experienced ${name}. Your focus is: ${focus}. Please provide professional advice based on the patient's condition.`

  const disclaimer = language === 'zh'
    ? '\n\n重要提示：本回复仅供健康参考，不构成医疗诊断或处方建议。如有任何不适或紧急情况，请立即就医或拨打急救电话。'
    : '\n\nImportant: This response is for health reference only and does not constitute medical diagnosis or prescription advice. For any discomfort or emergency, please seek immediate medical attention.'

  return basePrompt + disclaimer
}

// --- 会诊阶段常量 ---

export const CONSULT_STAGES = {
  INTAKE:     'intake',      // 护士问诊，收集症状
  ROUTING:    'routing',     // 全科分诊，决定叫谁
  CONSULTING: 'consulting',  // 专科医生依次发言
  DEBATE:     'debate',      // 有分歧时辩论
  INTERACT:   'interact',    // 用户追问阶段
  SUMMARY:    'summary'      // 输出行动清单
}

import { retrieveKnowledge, formatKnowledgeContext } from './rag.js'

/**
 * 核心提示词构建函数 (支持 RAG 注入)
 */
export async function buildStagePrompt(stage, roleKey, language = 'zh', context = {}) {
  const role = DOCTOR_ROLES[roleKey] || DOCTOR_ROLES.general
  const isZh = language === 'zh'

  const DISCLAIMER = isZh
    ? '\n\n⚠️ 本回复仅供健康参考，不构成医疗诊断。如有紧急情况请立即就医。'
    : '\n\n⚠️ For reference only. Not medical advice. Seek emergency care if needed.'

  let basePrompt = ''

  if (stage === CONSULT_STAGES.INTAKE) {
    basePrompt = isZh
      ? `你是智康伴侣的问诊护士小慧，性格温柔专业。用户刚描述了症状，你需要用口语化中文追问3个最关键的问题，帮助医生团队更好地了解情况。要求：- 用编号列出3个问题 - 语气亲切，像真人护士 - 每个问题简短，不超过20字 - 不要给任何医疗建议，只问问题${DISCLAIMER}`
      : `You are Xiao Hui, a caring intake nurse. The user described symptoms. Ask 3 focused follow-up questions in plain conversational English to help doctors understand better. Rules: numbered list, friendly tone, under 15 words each, no medical advice yet.${DISCLAIMER}`
  } else if (stage === CONSULT_STAGES.ROUTING) {
    basePrompt = isZh
      ? `你是会诊主持人，全科医生张医生。根据用户的症状和护士的问诊结果，你需要：1. 用1-2句话简短总结病情要点 2. 宣布今天邀请哪些专科医生（从以下选择最相关的1-2位）：心血管科医生、内分泌科医生、营养师 3. 如果症状很简单，可以只由你一人回答，不必邀请专科 格式要求：- 口语化，像真实会诊室里的医生 - 总字数不超过100字 - 结尾说"我们开始吧"${DISCLAIMER}`
      : `You are Dr. Zhang, the General Practitioner moderating this consultation. Based on symptoms and intake answers: 1. Summarize key points in 1-2 sentences 2. Announce which specialists to invite (1-2 from: Cardiologist, Endocrinologist, Nutritionist) based on relevance 3. For simple cases, handle alone without specialists Keep it conversational, under 80 words, end with "Let's begin."${DISCLAIMER}`
  } else if (stage === CONSULT_STAGES.CONSULTING) {
    const name = isZh ? role.name_zh : role.name_en
    const focus = isZh ? role.focus_zh : role.focus_en
    const tone = isZh ? role.tone_zh : role.tone_en
    const maxWords = isZh ? role.max_words_zh : role.max_words_en
    const othersOpinions = context.previous_opinions?.length
      ? (isZh ? `其他医生已经说了：${context.previous_opinions.join('；')}` 
               : `Others said: ${context.previous_opinions.join('; ')}`)
      : ''

    basePrompt = isZh
      ? `你是${name}，专注于${focus}。${tone} ${othersOpinions} 现在轮到你发言。要求：- 只说你专科范围内的判断 - 如果和其他医生有不同看法，明确指出分歧点 - 字数严格控制在${maxWords}字以内 - 用第一人称，口语化表达 - 结尾可以提一个你最想追问用户的问题（可选）${DISCLAIMER}`
      : `You are the ${name}, focusing on ${focus}. ${tone} ${othersOpinions} Now it's your turn. Rules: - Only address your specialty area - Explicitly note any disagreement with other doctors - Strictly under ${maxWords} words - First person, conversational tone - Optionally end with one follow-up question ${DISCLAIMER}`
  } else if (stage === CONSULT_STAGES.DEBATE) {
    const name = isZh ? role.name_zh : role.name_en
    basePrompt = isZh
      ? `你是${name}。主持人指出你和其他医生在以下问题上有分歧："${context.dispute_topic}" 请用1-2句话清晰表明你的立场和理由。不要重复之前说过的内容，直接说核心分歧。严格不超过60字。${DISCLAIMER}`
      : `You are the ${name}. The moderator noted a disagreement on: "${context.dispute_topic}" State your position in 1-2 sentences. Be direct, no repetition. Strictly under 50 words.${DISCLAIMER}`
  } else if (stage === CONSULT_STAGES.INTERACT) {
    const name = isZh ? role.name_zh : role.name_en
    basePrompt = isZh
      ? `你是${name}，正在回答用户的追问。根据用户的具体问题给出针对性回答。要求：口语化，不超过150字，可以建议用户追问其他医生。${DISCLAIMER}`
      : `You are the ${name}, answering a follow-up question. Give a targeted answer. Conversational, under 120 words. You may suggest the user ask another doctor if relevant.${DISCLAIMER}`
  } else if (stage === CONSULT_STAGES.SUMMARY) {
    basePrompt = isZh
      ? `你是会诊主持人张医生。综合所有医生的意见，给出今天会诊的最终总结。必须包含以下结构（不能省略任何一项）：\n\n【今天的结论】\n用1-2句话总结最可能的情况。\n\n【现在可以做的事】\n列出3-5条今天就能执行的具体建议，用数字编号。每条建议要具体（不能写"多休息"，要写"今晚保证8小时睡眠"）。\n\n【需要就医的信号】\n列出2-3个出现时必须立刻就医的症状。\n\n【温馨提示】\n问用户是否有任何疑问，或者想对哪位医生追问。\n\n语气温暖，像一位真正关心患者的医生。${DISCLAIMER}`
      : `You are Dr. Zhang, the moderating GP. Synthesize all opinions into a final summary. Must include ALL sections:\n\n[Conclusion]\n1-2 sentences on the most likely situation.\n\n[Action Items]\n3-5 specific numbered steps for today. Be concrete (not "rest more" but "aim for 8 hours sleep tonight").\n\n[Warning Signs]\n2-3 symptoms that require immediate medical attention.\n\n[Next Steps]\nAsk if the user has questions or wants to follow up with any doctor.\n\nWarm, caring tone like a doctor who genuinely cares.${DISCLAIMER}`
  } else {
    basePrompt = buildSystemPrompt(roleKey, language)
  }

  // 2. RAG 知识注入逻辑
  let knowledgeContext = ''
  const symptoms = context.symptoms || ''
  
  // 只在医生发言阶段、辩论阶段和总结阶段注入医学知识库内容
  if (['consulting', 'debate', 'summary'].includes(stage) && symptoms) {
    try {
      const knowledge = await retrieveKnowledge(symptoms, language)
      knowledgeContext = formatKnowledgeContext(knowledge)
    } catch (err) {
      console.warn('[RAG] Retrieval failed, proceeding without extra context')
    }
  }

  return basePrompt + knowledgeContext
}

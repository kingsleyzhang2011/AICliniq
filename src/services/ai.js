const KEYS = {
  gemini: (import.meta.env.VITE_GEMINI_KEY || '').trim(),
  groq: (import.meta.env.VITE_GROQ_KEY || '').trim(),
  siliconflow: (import.meta.env.VITE_SILICONFLOW_KEY || '').trim()
}

// 如需使用 Gemini 2.5 Preview，设置环境变量为：
// gemini-2.5-flash-preview-04-17
const MODELS = {
  gemini: 'gemini-2.5-flash',
  groq: 'llama-3.3-70b-versatile',
  siliconflow: 'Qwen/Qwen2.5-72B-Instruct'
}

const TIMEOUTS = {
  gemini: 25000,      // 跨境访问建议至少 25s
  groq: 20000,
  siliconflow: 25000
}

export const writeLog = (msg) => console.log(`[AICliniq] ${msg}`)

const FALLBACK_ORDER = [
  { provider: 'gemini', model: MODELS.gemini },
  { provider: 'groq', model: MODELS.groq },
  { provider: 'siliconflow', model: MODELS.siliconflow }
]

// ── 1. 地域检测与智能路由 ──────────────────────────────────

/**
 * 智能检测用户所在地域 (基于浏览器时区)
 * 适配中国大陆主流时区，返回 'CN' 或 'GLOBAL'
 */
function getUserRegion() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (['Asia/Shanghai', 'Asia/Chongqing', 'Asia/Urumqi', 'Asia/Harbin'].includes(tz)) {
      return 'CN';
    }
  } catch (e) {
    console.warn('[AI Router] Region detection failed, defaulting to GLOBAL');
  }
  return 'GLOBAL';
}

/**
 * 核心路由中心：生产环境【精益路由方案】
 * 1. 护士 INTAKE -> Gemini 2.5 Flash Lite (低功耗，非核心配额)
 * 2. 专家 DEBATE -> Groq llama-3.3 (物理卸敏，避开 429)
 * 3. 全科 SUMMARY -> Gemini 2.5 Flash (最高智力)
 * 4. 大陆用户 -> SiliconFlow Qwen2.5-72B (高可用)
 */
export function getModelRouting(role = 'SUMMARY') {
  const region = getUserRegion();

  // 🇨🇳 大陆用户：全角色第一轨指向 SiliconFlow
  if (region === 'CN') {
    return { 
      provider: 'siliconflow', 
      model: 'Qwen/Qwen2.5-72B-Instruct' 
    };
  }

  // 🌍 全球用户：精益模型绑定 (注意：Gemini 不带 -latest 后缀，防止 404)
  switch (role) {
    case 'NURSE': 
      return { 
        primary: { provider: 'gemini', model: 'gemini-2.5-flash-lite' },
        fallback: null // 护士入口禁止 fallback，防止模型风格切换导致分诊偏差
      };
      
    case 'DEBATE':
    case 'CONSULTING':
      return { 
        primary: { provider: 'groq', model: 'llama-3.3-70b-versatile' },
        fallback: { provider: 'gemini', model: 'gemini-2.5-flash-lite' }
      };
      
    case 'ATTENDING':
    case 'ROUTING':
    case 'SUMMARY':
    case 'INTERACT':
    default:
      return { 
        primary: { provider: 'gemini', model: 'gemini-2.5-flash' },
        fallback: { provider: 'siliconflow', model: 'Qwen/Qwen2.5-72B-Instruct' }
      };
  }
}

/**
 * 精益版核心调用函数：实现强制性的【原子级调用】
 */
export async function callWithFallback(systemPrompt, userPrompt, history = [], attachments = [], options = {}) {
  const role = options.role || 'SUMMARY';
  const routes = getModelRouting(role);
  
  const primary = routes.primary || routes;
  const fallback = routes.fallback;

  console.log(`[AI Router] Role: ${role}, Primary: ${primary.provider} (${primary.model})`);

  // 如果是 NURSE 角色，直接执行 Primary，不进行 Fallback
  if (role === 'NURSE' || !fallback) {
    return await executeCall(primary.provider, primary.model, KEYS[primary.provider], systemPrompt, userPrompt, history, attachments);
  }

  try {
    // 轨 1：执行首选模型
    return await executeCall(primary.provider, primary.model, KEYS[primary.provider], systemPrompt, userPrompt, history, attachments);
  } catch (error) {
    console.warn(`[AI Fallback] ${primary.provider} 异常 (${error.message}) -> 激活二轨降级: ${fallback.provider}`);
    
    try {
      // 轨 2：执行保底模型
      return await executeCall(fallback.provider, fallback.model, KEYS[fallback.provider], systemPrompt, userPrompt, history, attachments);
    } catch (fallbackError) {
      console.error(`[AI Router Critical] 二轨全线崩溃:`, fallbackError.message);
      
      // 最终尝试 (1.5 Flash)
      try {
        return await executeCall('gemini', 'gemini-1.5-flash', KEYS.gemini, systemPrompt, userPrompt, history, attachments);
      } catch (finalError) {
        throw finalError;
      }
    }
  }
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
      generationConfig: { temperature: 0.2, maxOutputTokens: 2048 }
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
      temperature: 0.2
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
  const isZh = language === 'zh'
  
  const name = isZh ? role.name_zh : role.name_en
  const focus = isZh ? role.focus_zh : role.focus_en
  const tone = isZh ? role.tone_zh : role.tone_en
  const langConstraint = isZh ? '【强制指令：你必须完全使用中文进行所有对话】' : '[MANDATORY: YOU MUST COMPLETELY USE ENGLISH FOR ALL RESPONSES]'
  
  const basePrompt = isZh 
    ? `你是一位经验丰富的${name}。\n关注重点：${focus}\n语气设定：${tone}\n${langConstraint}\n请根据患者情况提供专业建议。`
    : `You are an experienced ${name}.\nFocus: ${focus}\nTone: ${tone}\n${langConstraint}\nPlease provide professional advice based on the patient's condition.`

  const disclaimer = isZh
    ? '\n\n重要提示：本回复仅供健康参考，不构成医疗诊断或处方建议。如有任何不适或紧急情况，请立即就医或拨打急救电话。'
    : '\n\nIMPORTANT: This response is for health reference only and does not constitute medical diagnosis or prescription advice. For any discomfort or emergency, please seek immediate medical attention or dial 911.'

  return basePrompt + disclaimer
}

// --- 会诊阶段常量 ---

export const CONSULT_STAGES = {
  NURSE:      'nurse',       // 护士：初诊收集
  ATTENDING:  'attending',   // 主治：深挖+决策
  CONSULTING: 'consulting',  // 专家：会诊讨论
  SUMMARY:    'summary',     // 总结：行动方案
  INTERACT:   'interact'     // 自由回复阶段
}

import { formatKnowledgeContext } from './rag.js'

/**
 * 核心提示词构建函数 (四阶段重构版)
 */
export async function buildStagePrompt(stage, roleKey, language = 'zh', extraContext = {}) {
  const role = DOCTOR_ROLES[roleKey] || DOCTOR_ROLES.general
  const isZh = language === 'zh'
  const DISCLAIMER = isZh
    ? '\n\n⚠️ 本回复仅供健康参考，不构成医疗诊断。如有紧急情况请立即就医。'
    : '\n\n⚠️ For reference only. Not medical advice. Seek emergency care if needed.'

  const patientState = extraContext.patient_state || {}
  let basePrompt = ''

  if (stage === CONSULT_STAGES.NURSE) {
    basePrompt = isZh
      ? `你是初诊护士，正在和患者聊天。
- 目标：收集症状、病史、用药、生活习惯
- 对模糊回答主动追问
- 记录每条信息状态
- 不生成诊断或结论
- 风格自然亲切

当前已收集状态：${JSON.stringify(patientState)}
如果你认为基础信息已经足够（无需确诊），请在回复内容的最后，另起一行添加：[TO_ATTENDING]`
      : `You are the triage nurse chatting with the patient.
- Goal: Collect symptoms, medical history, meds, lifestyle
- Follow up on vague answers
- Record status of each info
- DO NOT generate diagnosis or conclusions
- Friendly, natural tone

Current status: ${JSON.stringify(patientState)}
If basic info is sufficient, append on a new line: [TO_ATTENDING]`

  } else if (stage === CONSULT_STAGES.ATTENDING) {
    basePrompt = isZh
      ? `你是主治医生，根据护士收集的信息与患者交流：
1. 主动追问关键症状与补充信息。
2. 判断是否召唤专家团队。如果某科专家意见至关重要，请在回答中包含：[SUMMON: 专家科室名]（可选：心血管科医生、内分泌科医生、营养师、消化内科、心理咨询、儿科）。
3. 对患者提问、更正信息要自然反馈。
4. 【重要】在准备生成总结前，务必先询问患者是否还有其他补充或担心的问题。
5. 只有当患者表示没有更多补充，且信息已完全充分时，才输出：[TO_SUMMARY]

患者当前信息：${JSON.stringify(patientState)}`
      : `You are the Lead Attending Physician:
1. Follow up on critical symptoms.
2. If expert input is needed, include: [SUMMON: Specialist Name] (Options: Cardiologist, Endocrinologist, Nutritionist, etc.).
3. Naturally respond to patient questions or corrections.
4. [CRITICAL] Before summarizing, ASK the patient if they have any more concerns or info to add.
5. ONLY when the patient is ready and info is sufficient, output: [TO_SUMMARY]

Current info: ${JSON.stringify(patientState)}`

  } else if (stage === CONSULT_STAGES.CONSULTING) {
    const previousOpinions = extraContext.previous_opinions || ""
    const targetRoleName = isZh ? role.name_zh : role.name_en
    basePrompt = isZh
      ? `你是${targetRoleName}专家，正在进行患者会诊。
- 根据主治医生传递的信息提出初步分析和意见
- 可补充或反驳其他专家观点
- 输出意见用于主治医生最终总结

患者信息摘要：${JSON.stringify(patientState)}
已有会诊意见：${previousOpinions}`
      : `You are the ${targetRoleName} expert in consultation.
- Provide initial analysis based on attending's info
- Supplement or counter other experts' views
- Your opinion aids the final summary

Patient info: ${JSON.stringify(patientState)}
Previous opinions: ${previousOpinions}`

  } else if (stage === CONSULT_STAGES.SUMMARY) {
    const rawOpinions = JSON.stringify(extraContext.opinions || {})
    basePrompt = isZh
      ? `你是主治医生，正在生成最终诊断报告。
任务：
1. 整合护士报告、专家意见及本次所有交流记录。
2. 生成最终诊断总结、生活建议和复查计划。
3. 【禁令】绝对不要再向患者索取在 ${JSON.stringify(patientState)} 中已经存在的信息。
4. 既然是最终总结，应当给出明确的分析结果，而不是列出一堆问题。

已核实患者信息：${JSON.stringify(patientState)}
各专家意见：${rawOpinions}${DISCLAIMER}`
      : `You are the Lead Attending Physician finalizing the report:
1. Synthesize all info (Nurse, Experts, History).
2. Provide diagnosis summary, lifestyle advice, and follow-up.
3. [PROHIBITED] Do NOT ask for information already present in ${JSON.stringify(patientState)}.
4. Provide definitive analysis rather than a list of questions.

Verified Patient Info: ${JSON.stringify(patientState)}
Expert Opinions: ${rawOpinions}${DISCLAIMER}`

  } else if (stage === CONSULT_STAGES.INTERACT) {
    const targetRoleName = isZh ? role.name_zh : role.name_en
    basePrompt = isZh
      ? `你是${targetRoleName}，正在回答用户的自由追问。要求：口语化，不超过150字，可以建议用户追问其他医生。${DISCLAIMER}`
      : `You are ${targetRoleName}, answering a follow-up question. Conversational, under 120 words.${DISCLAIMER}`
  } else {
    basePrompt = buildSystemPrompt(roleKey, language)
  }


  // 2. RAG 知识注入逻辑：遵循 RAG 最佳实践进行显式字符串拼接
  // 增加【强制规则】标签，提升模型对资料的依从度
  const ragContext = extraContext.rag_info || (isZh ? '暂无匹配的临床指南。' : 'No matching clinical guidelines found.')
  
  const finalPrompt = isZh 
    ? `你是一个医疗AI助手（AICliniq）。
    
【强制规则】
- 必须优先使用【参考资料】回答
- 如果参考资料不足，必须说明“不确定”
- 不允许凭空编造医学结论

【参考资料】
${ragContext}

【任务与职责】
${basePrompt}
    `
    : `You are an AI medical assistant (AICliniq).

【MANDATORY RULES】
- YOU MUST use the provided [REFERENCE] as your primary source.
- If references are insufficient, say "Uncertain".
- DO NOT hallucinate medical facts.

【REFERENCE】
${ragContext}

【TASK & ROLE】
${basePrompt}
    `;
  
  return finalPrompt
}

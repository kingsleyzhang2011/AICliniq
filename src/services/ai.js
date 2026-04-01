const KEYS = {
  gemini: (import.meta.env.VITE_GEMINI_KEY || '').trim(),
  groq: (import.meta.env.VITE_GROQ_KEY || '').trim(),
  siliconflow: (import.meta.env.VITE_SILICONFLOW_KEY || '').trim()
}

// Gemini 主力 - 稳定 GA 版本
const GEMINI_MODEL = 'gemini-2.5-flash'
const GEMINI_LITE_MODEL = 'gemini-2.5-flash-lite'

// Groq 备用
const GROQ_MODEL = 'llama-3.3-70b-versatile'

// 硅基流动备用 - 用 7B 跟 AGENTS.md 一致
const SILICONFLOW_MODEL = 'Qwen/Qwen2.5-7B-Instruct'

const MODELS = {
  gemini: GEMINI_MODEL,
  gemini_lite: GEMINI_LITE_MODEL,
  groq: GROQ_MODEL,
  siliconflow: SILICONFLOW_MODEL
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
 * 4. 大陆用户 -> SiliconFlow Qwen2.5-7B (高可用)
 */
export function getModelRouting(role = 'SUMMARY') {
  const region = getUserRegion();

  // 🇨🇳 大陆用户：全角色第一轨指向 SiliconFlow
  if (region === 'CN') {
    return { 
      primary: { provider: 'siliconflow', model: MODELS.siliconflow },
      fallback: { provider: 'gemini', model: MODELS.gemini }
    };
  }

  // 🌍 全球用户：精益模型绑定
  switch (role) {
    case 'NURSE': 
      return { 
        primary: { provider: 'gemini', model: MODELS.gemini_lite },
        fallback: { provider: 'groq', model: MODELS.groq }
      };
      
    case 'DEBATE':
    case 'CONSULTING':
      return { 
        primary: { provider: 'groq', model: MODELS.groq },
        fallback: { provider: 'gemini', model: MODELS.gemini_lite }
      };
      
    case 'ATTENDING':
    case 'ROUTING':
    case 'SUMMARY':
    case 'INTERACT':
    default:
      return { 
        primary: { provider: 'gemini', model: MODELS.gemini },
        fallback: { provider: 'siliconflow', model: MODELS.siliconflow }
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

  try {
    // 轨 1：执行首选模型
    return await executeCall(primary.provider, primary.model, KEYS[primary.provider], systemPrompt, userPrompt, history, attachments);
  } catch (error) {
    console.warn(`[AI Fallback] ${primary.provider} 异常 (${error.message}) -> 激活二轨降级: ${fallback.provider}`);
    
    try {
      // 轨 2：执行保底模型
      const actualFallback = fallback || { provider: 'siliconflow', model: MODELS.siliconflow };
      return await executeCall(actualFallback.provider, actualFallback.model, KEYS[actualFallback.provider], systemPrompt, userPrompt, history, attachments);
    } catch (fallbackError) {
      console.error(`[AI Router Critical] 二轨全线崩溃:`, fallbackError.message);
      
      // 最终尝试 (Gemini 2.5 Flash GA)
      try {
        return await executeCall('gemini', 'gemini-2.5-flash', KEYS.gemini, systemPrompt, userPrompt, history, attachments);
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

  // 修复 Gemini 历史记录交替角色要求：连续相同角色必须合并
  const rawContents = [
    ...history.map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      text: m.role === 'user' ? m.content : `[${m.meta?.doctorName || m.role}]: ${m.content}`
    })),
    { role: 'user', text: user, isLast: true }
  ]

  const contents = []
  let currentRole = null
  let currentParts = []

  for (const item of rawContents) {
    if (item.role === currentRole) {
      currentParts[0].text += '\n\n' + item.text
    } else {
      if (currentRole) contents.push({ role: currentRole, parts: currentParts })
      currentRole = item.role
      currentParts = [{ text: item.text }]
    }
    // 把图片附件只挂在最后一个 user 消息上
    if (item.isLast && attachmentParts.length > 0) {
      currentParts = currentParts.concat(attachmentParts)
    }
  }
  if (currentRole) contents.push({ role: currentRole, parts: currentParts })

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system || "You are a helpful assistant." }] },
      contents,
      generationConfig: { temperature: 0.1, maxOutputTokens: 2048 }
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
    ...history.map(m => {
      const mappedRole = m.role === 'user' ? 'user' : 'assistant'
      const prefix = m.role === 'user' ? '' : `[${m.meta?.doctorName || m.role}]: `
      return { role: mappedRole, content: prefix + m.content }
    }),
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
  if (!data?.choices?.[0]) {
    throw new Error(`${model} Response Format Error: No choices returned`)
  }
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

/**
 * 核心提示词构建函数 (四阶段重构版)
 */
export async function buildStagePrompt(stage, roleKey, language = 'zh', extraContext = {}) {
  const role = DOCTOR_ROLES[roleKey] || DOCTOR_ROLES.general
  const isZh = language === 'zh'
  const DISCLAIMER = isZh
    ? '\n\n⚠️ 以上内容仅供健康参考，不能替代专业医疗诊断或处方。如有紧急情况请立即就医或拨打急救电话。'
    : '\n\n⚠️ The above is for health reference only and cannot replace professional medical diagnosis. Seek emergency care if needed.'

  const patientState = extraContext.patient_state || {}
  const availableSpecialists = Object.keys(DOCTOR_ROLES).filter(k => k !== 'general').join(', ')
  let basePrompt = ''

  if (stage === CONSULT_STAGES.NURSE) {
    basePrompt = isZh
      ? `你是初诊护士，正在和患者聊天。
- 目标：收集症状、病史、用药、生活习惯
- 特别注意：**绝对不要**重复患者刚才说过的话，也**绝对不要**说“您是说...对吗？”、“我确认一下...”这类废话。接收到患者信息后，在心中默默记录，然后直接且自然地抛出下一个问题。
- 对模糊回答主动追问
- 记录每条信息状态
- 不生成诊断或结论
- 风格自然亲切

当前已收集状态：${JSON.stringify(patientState)}
如果你认为基础信息已经足够（无需确诊），请在回复内容的最后，另起一行添加：[TO_ATTENDING]`
      : `You are the triage nurse chatting with the patient.
- Goal: Collect symptoms, medical history, meds, lifestyle
- CRITICAL: DO NOT repeat back what the patient just said to confirm it. DO NOT say "So you are saying... is that correct?". Just silently record the information and directly ask the next relevant question to save time.
- Follow up on vague answers
- Record status of each info
- DO NOT generate diagnosis or conclusions
- Friendly, natural tone

Current status: ${JSON.stringify(patientState)}
If basic info is sufficient, append on a new line: [TO_ATTENDING]`

  } else if (stage === CONSULT_STAGES.ATTENDING) {
    basePrompt = isZh
      ? `你是主治医生张医生，患者已经完成护士初诊，以下信息【已经收集完毕，禁止重复询问】：
${JSON.stringify(patientState, null, 2)}

【交互规则】
1. 禁止重复：上述信息中非空的字段（如症状、病史、用药等）绝对不要再问。
2. 每轮只问 1-2 个关键问题：聚焦于护士未覆盖的诊断关键信息（如症状的程度、持续时间、诱因、伴随症状等）。不要一次抛出大量问题。
3. 主动给出初步分析：在追问的同时，简要告诉患者你目前的初步判断方向，让患者感到被认真对待。
4. 语气专业但温暖：像一个经验丰富的三甲医院主治医生。

【专家会诊召唤】
根据症状判断，如果需要专科医生会诊，请在回复中包含标签（可多个）：
[SUMMON:${availableSpecialists}]
例如头疼+发烧可能需要营养师建议饮食，就写 [SUMMON:nutritionist]
例如胸痛+心悸需要心血管科，就写 [SUMMON:cardiologist]
你应该尽早做出是否需要会诊的判断，不要等到最后一轮。

【结束条件】
当你认为信息已充分、可以形成诊断意见时，输出：[TO_SUMMARY]
如果同时需要会诊，可以同时输出 [SUMMON:xxx] 和提问内容，系统会先召唤专家再总结。`
      : `You are Dr. Zhang, the Lead Attending Physician. The patient has completed nurse intake. The following info is ALREADY COLLECTED — DO NOT ask again:
${JSON.stringify(patientState, null, 2)}

[INTERACTION RULES]
1. NO REPEATS: Never ask about non-empty fields above (symptoms, history, meds, etc.).
2. Ask only 1-2 KEY questions per turn: Focus on diagnostic gaps (severity, duration, triggers, associated symptoms). Never dump multiple questions.
3. Share preliminary analysis: While asking, briefly share your initial assessment direction.
4. Tone: Professional yet warm, like an experienced attending physician.

[SPECIALIST CONSULTATION]
If specialist input is needed, include in your response (can be multiple):
[SUMMON:${availableSpecialists}]
e.g., chest pain + palpitations → [SUMMON:cardiologist]
e.g., fatigue + weight gain → [SUMMON:endocrinologist]
Make this judgment early, don't wait until the final round.

[EXIT CONDITION]
When you have enough info to form a diagnostic opinion, output: [TO_SUMMARY]
You may output both [SUMMON:xxx] and questions simultaneously.`

  } else if (stage === CONSULT_STAGES.CONSULTING) {
    const previousOpinions = extraContext.previous_opinions || ""
    const targetRoleName = isZh ? role.name_zh : role.name_en
    basePrompt = isZh
      ? `你是${targetRoleName}，正在参与多学科会诊（MDT）。

【你的职责】
1. 基于患者信息，从你的专业角度给出明确的分析意见。
2. 如果你认为有必要，请推荐具体的检查项目（如血常规、心电图、甲功五项等）。
3. 可以建议常用的非处方药或一线治疗方案作为参考（需注明"建议在医生指导下使用"）。
4. 如果与其他专家意见有分歧，请明确指出并说明理由。
5. 控制在 150 字以内，简洁有力。

患者信息：${JSON.stringify(patientState)}
已有会诊意见：${previousOpinions}`
      : `You are the ${targetRoleName}, participating in a multidisciplinary consultation (MDT).

[YOUR RESPONSIBILITIES]
1. Provide a clear analysis from your specialty's perspective.
2. Recommend specific tests if needed (CBC, ECG, thyroid panel, etc.).
3. Suggest common OTC medications or first-line treatments as reference (note "use under medical guidance").
4. If you disagree with other specialists, state your reasoning clearly.
5. Keep under 120 words, concise and decisive.

Patient info: ${JSON.stringify(patientState)}
Previous opinions: ${previousOpinions}`

  } else if (stage === CONSULT_STAGES.SUMMARY) {
    const rawOpinions = JSON.stringify(extraContext.opinions || {})
    basePrompt = isZh
      ? `你是主治医生张医生，正在生成最终会诊报告。

【已核实患者信息】
${JSON.stringify(patientState, null, 2)}

【各专家会诊意见】
${rawOpinions}

【报告要求 - 必须包含以下所有部分】
1. **初步诊断分析**：基于症状和信息，给出你最可能的诊断方向（1-2个），说明判断依据。不要回避诊断，这是患者寻求帮助的核心目的。
2. **建议检查项目**：列出 2-3 项建议的检查（如血常规、X光等），说明目的。
3. **药物治疗预期（OTC与处方药参考）**：除了非处方药（OTC）外，还需列出如果就医，医生可能会开具的**处方药（Rx）**名称和作用机制，让患者对整体治疗方案有全局认知（例如：如果是细菌感染，除了退烧的非处方药，还可能开具阿莫西林等抗生素）。必须附注："处方药必须由执业医师开具，此处仅为就医前的知识储备，请勿自行购买使用"。
4. **生活方式建议**：饮食、作息、运动等具体可执行的建议。
5. **就医时机提醒**：明确告知在什么情况下需要立即就医（红旗症状）。

【禁令】
- 绝对不要再询问 ${JSON.stringify(patientState)} 中已有的信息。
- 不要用"建议去看医生"来代替你的分析——患者正在找你就是为了获得专业分析。
- 必须给出明确的分析结论，而不是列出一堆"可能是A也可能是B"而无判断。

${DISCLAIMER}`
      : `You are Dr. Zhang, the Lead Attending Physician, generating the final consultation report.

[VERIFIED PATIENT INFO]
${JSON.stringify(patientState, null, 2)}

[SPECIALIST OPINIONS]
${rawOpinions}

[REPORT REQUIREMENTS - MUST include ALL sections]
1. **Preliminary Diagnosis**: Most likely diagnoses (1-2) with reasoning. Do NOT avoid giving a diagnosis — this is why the patient sought help.
2. **Recommended Tests**: 2-3 specific tests (CBC, X-ray, etc.) with purpose.
3. **Medication Expectations (OTC & Prescription Reference)**: In addition to OTC options, provide examples of typical **Prescription Medications (Rx)** a doctor might prescribe for this condition during an in-person visit. Explain their purpose so the patient understands the full clinical picture. Must note: "Prescription medications require a valid doctor's prescription, provided here for educational reference only".
4. **Lifestyle Advice**: Specific actionable diet, rest, and exercise recommendations.
5. **When to Seek Emergency Care**: Clear red-flag symptoms requiring immediate medical attention.

[PROHIBITED]
- Do NOT ask for information already in ${JSON.stringify(patientState)}.
- Do NOT substitute "see a doctor" for your analysis — the patient is HERE for your professional analysis.
- Provide definitive analysis, not just "could be A or B" without judgment.

${DISCLAIMER}`

  } else if (stage === CONSULT_STAGES.INTERACT) {
    const targetRoleName = isZh ? role.name_zh : role.name_en
    basePrompt = isZh
      ? `你是${targetRoleName}，正在回答用户的自由追问。要求：口语化，不超过150字，可以建议用户追问其他医生。${DISCLAIMER}`
      : `You are ${targetRoleName}, answering a follow-up question. Conversational, under 120 words.${DISCLAIMER}`
  } else {
    basePrompt = buildSystemPrompt(roleKey, language)
  }

  // 2. RAG 知识注入：优先参考资料，无匹配时允许基于医学常识给出初步建议
  const ragContext = extraContext.rag_info || (isZh ? '暂无匹配的临床指南。' : 'No matching clinical guidelines found.')
  
  const finalPrompt = isZh 
    ? `你是一个医疗AI助手（AICliniq）。
    
【参考规则】
- 优先使用【参考资料】中的内容来回答
- 参考资料不足时，可基于公认的医学常识给出初步建议，但需注明"基于临床经验判断"
- 严禁编造不存在的药物名称或虚假的医学数据

【参考资料】
${ragContext}

【任务与职责】
${basePrompt}
    `
    : `You are an AI medical assistant (AICliniq).

[REFERENCE RULES]
- Prioritize the provided [REFERENCE] material in your response.
- When references are insufficient, you MAY give preliminary advice based on established medical knowledge, noting "based on clinical experience".
- NEVER fabricate drug names or false medical data.

[REFERENCE]
${ragContext}

[TASK & ROLE]
${basePrompt}
    `;
  
  return finalPrompt
}

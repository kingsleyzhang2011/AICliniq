import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  callWithFallback,
  DOCTOR_ROLES,
  CONSULT_STAGES,
  buildStagePrompt
} from '../services/ai'

export const useChatStore = defineStore('chat', () => {

  // ── 状态 ────────────────────────────────────────
  const messages      = ref([])   // 聊天记录
  const stage         = ref(CONSULT_STAGES.INTAKE)  // 当前会诊阶段
  const isLoading     = ref(false)
  const language      = ref('zh')

  // 症状上下文（贯穿整个会诊）
  const context = ref({
    symptoms:          '',    // 用户最初描述
    intake_answers:    '',    // 护士问诊后用户的回答
    invited_roles:     [],    // 全科决定邀请的医生列表
    opinions:          {},    // 各医生的意见 { roleKey: '意见文本' }
    disputes:          [],    // 发现的分歧列表
    consult_round:     0      // 当前是第几轮
  })

  // ── 工具函数 ─────────────────────────────────────
  function addMessage(role, content, meta = {}) {
    messages.value.push({
      id:        Date.now() + Math.random(),
      role,      // 'user' | 'nurse' | 'moderator' | doctor roleKey
      content,
      meta,      // { doctorName, emoji, stage }
      timestamp: new Date().toISOString()
    })
  }

  function setLoading(val) { isLoading.value = val }

  // 检测哪些医生与症状相关
  function detectRelevantRoles(symptomsText) {
    const relevant = []
    const text = symptomsText.toLowerCase()
    Object.entries(DOCTOR_ROLES).forEach(([key, role]) => {
      if (key === 'general') return
      const keywords = language.value === 'zh'
        ? role.trigger_keywords_zh || []
        : role.trigger_keywords_en || []
      if (keywords.some(kw => text.includes(kw.toLowerCase()))) {
        relevant.push(key)
      }
    })
    return relevant
  }

  // ── 核心流程 ─────────────────────────────────────

  // 第一幕：护士问诊
  async function startIntake(userSymptoms) {
    context.value.symptoms = userSymptoms
    addMessage('user', userSymptoms)
    setLoading(true)

    try {
      const prompt = await buildStagePrompt(
        CONSULT_STAGES.INTAKE, 'general', language.value
      )
      const response = await callWithFallback(prompt, userSymptoms, [])
      addMessage('nurse', response, {
        doctorName: language.value === 'zh' ? '护士小慧' : 'Nurse Xiao Hui',
        emoji: '👩‍⚕️',
        stage: CONSULT_STAGES.INTAKE
      })
      stage.value = CONSULT_STAGES.INTAKE
    } finally {
      setLoading(false)
    }
  }

  // 用户回答护士问题后，进入分诊
  async function submitIntakeAnswers(userAnswers) {
    context.value.intake_answers = userAnswers
    addMessage('user', userAnswers)
    setLoading(true)

    try {
      // 全科医生分诊
      const fullContext = `症状：${context.value.symptoms}\n用户补充：${userAnswers}`
      const routingPrompt = await buildStagePrompt(
        CONSULT_STAGES.ROUTING, 'general', language.value
      )
      const routingResponse = await callWithFallback(routingPrompt, fullContext, [])

      addMessage('moderator', routingResponse, {
        doctorName: language.value === 'zh' ? '张医生（全科）' : 'Dr. Zhang (GP)',
        emoji: '🩺',
        stage: CONSULT_STAGES.ROUTING
      })

      // 检测相关专科
      const autoDetected = detectRelevantRoles(fullContext)
      // 限制最多2位专科
      context.value.invited_roles = autoDetected.slice(0, 2)

      stage.value = CONSULT_STAGES.CONSULTING
      // 自动开始专科会诊
      await runConsultingRound()
    } finally {
      setLoading(false)
    }
  }

  // 第三幕：专科医生依次发言
  async function runConsultingRound() {
    const rolesToSpeak = context.value.invited_roles
    if (rolesToSpeak.length === 0) {
      await runSummary()
      return
    }

    const fullSymptoms = `症状：${context.value.symptoms}\n补充：${context.value.intake_answers}`

    for (const roleKey of rolesToSpeak) {
      setLoading(true)
      try {
        const previousOpinions = Object.entries(context.value.opinions)
          .map(([k, v]) => {
            const r = DOCTOR_ROLES[k]
            const name = language.value === 'zh' ? r.name_zh : r.name_en
            return `${name}：${v}`
          })

        const consultPrompt = await buildStagePrompt(
          CONSULT_STAGES.CONSULTING,
          roleKey,
          language.value,
          { previous_opinions: previousOpinions, symptoms: context.value.symptoms }
        )

        const response = await callWithFallback(consultPrompt, fullSymptoms, [])
        context.value.opinions[roleKey] = response

        const role = DOCTOR_ROLES[roleKey]
        addMessage(roleKey, response, {
          doctorName: language.value === 'zh' ? role.name_zh : role.name_en,
          emoji: role.emoji,
          stage: CONSULT_STAGES.CONSULTING
        })

        await new Promise(r => setTimeout(r, 800))
      } finally {
        setLoading(false)
      }
    }

    await checkAndRunDebate()
  }

  // 第四幕：辩论（仅在有分歧时）
  async function checkAndRunDebate() {
    const opinionsText = Object.entries(context.value.opinions)
      .map(([k, v]) => {
        const r = DOCTOR_ROLES[k]
        return `${r.name_zh}：${v}`
      }).join('\n\n')

    const detectPrompt = language.value === 'zh'
      ? `以下是各位医生的意见：\n${opinionsText}\n\n请判断：各位医生之间是否存在明显分歧或矛盾？如果有，用一句话描述分歧点，格式：「分歧：xxx」如果没有，只回复：「无分歧」`
      : `Here are the doctors' opinions:\n${opinionsText}\n\nIs there a clear disagreement? If yes, describe it in one sentence: "Dispute: xxx" If no, reply only: "No dispute"`

    setLoading(true)
    try {
      const detectResult = await callWithFallback(
        await buildStagePrompt(CONSULT_STAGES.ROUTING, 'general', language.value),
        detectPrompt, []
      )

      const hasDispute = language.value === 'zh'
        ? detectResult.includes('分歧：')
        : detectResult.toLowerCase().includes('dispute:')

      if (hasDispute) {
        const disputeTopic = language.value === 'zh'
          ? detectResult.split('分歧：')[1]?.trim()
          : detectResult.split('Dispute:')[1]?.trim()

        context.value.disputes.push(disputeTopic)

        const announceText = language.value === 'zh'
          ? `我注意到各位医生在「${disputeTopic}」这个问题上有不同看法。让我们来听听各位的具体立场。`
          : `I notice the doctors have different views on "${disputeTopic}". Let's hear each position.`

        addMessage('moderator', announceText, {
          doctorName: language.value === 'zh' ? '张医生（全科）' : 'Dr. Zhang (GP)',
          emoji: '🩺',
          stage: CONSULT_STAGES.DEBATE
        })

        for (const roleKey of context.value.invited_roles) {
          const debatePrompt = await buildStagePrompt(
            CONSULT_STAGES.DEBATE, roleKey, language.value,
            { dispute_topic: disputeTopic, symptoms: context.value.symptoms }
          )
          const debateResponse = await callWithFallback(
            debatePrompt,
            `关于分歧点：${disputeTopic}，你的立场是？`, []
          )
          const role = DOCTOR_ROLES[roleKey]
          addMessage(roleKey, debateResponse, {
            doctorName: language.value === 'zh' ? role.name_zh : role.name_en,
            emoji: role.emoji,
            stage: CONSULT_STAGES.DEBATE
          })
          await new Promise(r => setTimeout(r, 600))
        }

        const verdictPrompt = language.value === 'zh'
          ? `针对「${disputeTopic}」的分歧，综合各位意见，给出你作为全科医生的最终裁决，不超过80字。`
          : `Regarding the dispute on "${disputeTopic}", give your final verdict as GP. Under 60 words.`

        const verdictResponse = await callWithFallback(
          await buildStagePrompt(CONSULT_STAGES.ROUTING, 'general', language.value),
          verdictPrompt, []
        )
        addMessage('moderator', verdictResponse, {
          doctorName: language.value === 'zh' ? '张医生（全科·裁决）' : 'Dr. Zhang (GP · Verdict)',
          emoji: '⚖️',
          stage: CONSULT_STAGES.DEBATE
        })
      }
    } finally {
      setLoading(false)
    }

    await openInteraction()
  }

  // 第五幕：开放追问
  async function openInteraction() {
    const inviteText = language.value === 'zh'
      ? `好的，各位医生已经分享了他们的看法。\n\n你有什么想补充的吗？或者想直接问某位医生？\n比如：「我想问心血管科医生，血压高了多少才算危险？」\n\n如果没有问题，回复「给我结论」，我来做最终总结。`
      : `The doctors have shared their views.\n\nAny follow-up questions? You can ask a specific doctor.\nFor example: "I want to ask the cardiologist: how high is dangerous for blood pressure?"\n\nOr reply "Give me the summary" for final recommendations.`

    addMessage('moderator', inviteText, {
      doctorName: language.value === 'zh' ? '张医生（全科）' : 'Dr. Zhang (GP)',
      emoji: '💬',
      stage: CONSULT_STAGES.INTERACT
    })
    stage.value = CONSULT_STAGES.INTERACT
  }

  // 用户追问处理
  async function handleUserInteraction(userMessage) {
    if (!userMessage.trim()) return
    addMessage('user', userMessage)

    const wantsSummary = ['结论','总结','没有','没问题','好了','give me','summary','no question']
      .some(kw => userMessage.toLowerCase().includes(kw))

    if (wantsSummary) {
      await runSummary()
      return
    }

    setLoading(true)
    try {
      let targetRole = 'general'
      Object.entries(DOCTOR_ROLES).forEach(([key, role]) => {
        if (userMessage.includes(role.name_zh) || userMessage.includes(role.name_en)) {
          targetRole = key
        }
      })

      const interactPrompt = await buildStagePrompt(
        CONSULT_STAGES.INTERACT, targetRole, language.value
      )
      const fullContext = `用户原始症状：${context.value.symptoms}\n用户追问：${userMessage}`
      const response = await callWithFallback(interactPrompt, fullContext, [])

      const role = DOCTOR_ROLES[targetRole]
      addMessage(targetRole, response, {
        doctorName: language.value === 'zh' ? role.name_zh : role.name_en,
        emoji: role.emoji,
        stage: CONSULT_STAGES.INTERACT
      })
    } finally {
      setLoading(false)
    }
  }

  // 第六幕：最终总结
  async function runSummary() {
    setLoading(true)
    stage.value = CONSULT_STAGES.SUMMARY
    try {
      const allContext = `
        症状：${context.value.symptoms}
        补充信息：${context.value.intake_answers}
        各医生意见：${JSON.stringify(context.value.opinions)}
        分歧与裁决：${context.value.disputes.join('；') || '无分歧'}
      `
      const summaryPrompt = await buildStagePrompt(
        CONSULT_STAGES.SUMMARY, 'general', language.value,
        { symptoms: context.value.symptoms }
      )
      const response = await callWithFallback(summaryPrompt, allContext, [])
      addMessage('moderator', response, {
        doctorName: language.value === 'zh' ? '张医生（全科·总结）' : 'Dr. Zhang (GP · Summary)',
        emoji: '📋',
        stage: CONSULT_STAGES.SUMMARY
      })
    } finally {
      setLoading(false)
    }
  }

  // 重置会诊
  function resetConsult() {
    messages.value      = []
    stage.value         = CONSULT_STAGES.INTAKE
    context.value       = {
      symptoms: '', intake_answers: '',
      invited_roles: [], opinions: {},
      disputes: [], consult_round: 0
    }
  }

  return {
    messages,
    stage,
    isLoading,
    language,
    context,
    startIntake,
    submitIntakeAnswers,
    handleUserInteraction,
    runSummary,
    resetConsult,
    CONSULT_STAGES
  }
})

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  callWithFallback,
  DOCTOR_ROLES,
  CONSULT_STAGES,
  buildStagePrompt,
  writeLog
} from '../services/ai'
import { retrieveKnowledge, formatKnowledgeContext } from '../services/rag'
import { useUserStore } from './useUserStore'

const delay = (ms) => new Promise(r => setTimeout(r, ms))

export const useChatStore = defineStore('chat', () => {

  // ── 状态 ────────────────────────────────────────
  const messages      = ref([])   // 聊天记录
  const stage         = ref(CONSULT_STAGES.NURSE)  // 当前会诊阶段
  const isLoading     = ref(false)
  const userStore     = useUserStore()
  const language      = computed(() => userStore.preferredLanguage)

  // 症状上下文（贯穿整个会诊）
  const MAX_NURSE_ROUNDS = 2  // 护士最多追问轮次（防止 429）
  const MAX_ATTENDING_ROUNDS = 3 // 主治最多追问轮次

  const context = ref({
    symptoms:          '',    // 用户最初描述
    intake_answers:    '',    // 护士问诊后用户的回答
    invited_roles:     [],    // 全科决定邀请的医生列表
    opinions:          {},    // 各医生的意见 { roleKey: '意见文本' }
    disputes:          [],    // 发现的分歧列表
    consult_round:     0,     // 当前是第几轮
    nurse_round:       0,     // 护士问诊轮次计数
    attending_round:   0,     // 主治问诊轮次计数
    rag_knowledge:     '',    // 缓存当前会诊的 RAG 知识
    patient_state: {          // 主治医师收集的结构化病历
      symptoms: '',
      history: '',
      medications: '',
      lifestyle: '',
      allergies: ''
    }
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

  // 获取 RAG 上下文并设置默认值
  async function getRAGContext() {
    try {
      if (!context.value.symptoms) return ''
      console.log('[RAG] getRAGContext 开始...')

      let timeoutId
      // 整体 15 秒超时保护，防止 RAG 流程卡死主流程
      const knowledge = await Promise.race([
        retrieveKnowledge(context.value.symptoms, language.value).then(res => {
          clearTimeout(timeoutId)
          return res
        }),
        new Promise(resolve => {
          timeoutId = setTimeout(() => {
            console.warn('[RAG] getRAGContext 整体超时(15s)，返回空结果')
            resolve([])
          }, 15000)
        })
      ])

      const formatted = formatKnowledgeContext(knowledge)
      console.log('[RAG] getRAGContext 完成，知识条数:', knowledge?.length || 0)
      return formatted || (language.value === 'zh' ? '\n\n暂无匹配的临床指南。' : '\n\nNo matching clinical guidelines found.')
    } catch (e) {
      console.warn('[RAG] Retrieval failed, using fallback notice', e)
      console.log('[RAG] getRAGContext ERROR FALLBACK')
      return language.value === 'zh' ? '\n\n暂无匹配的临床指南。' : '\n\nNo matching clinical guidelines found.'
    }
  }

  // ── 内部状态分析 (轻量级 AI 更新病历) ─────────────────────
  async function updatePatientState(userInput) {
    const history = messages.value.slice(-6).map(m => `${m.role}: ${m.content}`).join('\n')
    const prompt = `你是一个医疗数据提取器。根据以下对话历史，更新并输出最新的患者信息状态。
只输出 JSON 格式，包含以下字段：symptoms, history, medications, lifestyle, allergies。
不要有任何解释。

对话历史：
${history}
当前用户输入：${userInput}
原有状态：${JSON.stringify(context.value.patient_state)}`

    try {
      // 使用较低配额或快速的模型进行状态提取
      const res = await callWithFallback(prompt, "UPDATE_JSON", [], [], { role: 'NURSE' })
      const match = res.match(/\{[\s\S]*\}/)
      if (match) {
        context.value.patient_state = JSON.parse(match[0])
      }
    } catch (e) {
      console.warn('[State Analyzer] Update failed', e)
    }
  }

  // ── 核心流程 ─────────────────────────────────────

  // 第一幕：护士初诊阶段
  async function startNurseIntake(userSymptoms) {
    context.value.symptoms = userSymptoms
    addMessage('user', userSymptoms)
    setLoading(true)

    try {
      await updatePatientState(userSymptoms)
      const introPrompt = await buildStagePrompt(
        CONSULT_STAGES.NURSE, 'general', language.value,
        { patient_state: context.value.patient_state }
      )
      const response = await callWithFallback(introPrompt, userSymptoms, [], [], { role: 'NURSE' })
      
      addMessage('moderator', response.replace('[TO_ATTENDING]', '').trim(), {
        doctorName: language.value === 'zh' ? '护士小慧' : 'Nurse Xiao Hui',
        emoji: '👩‍⚕️',
        stage: CONSULT_STAGES.NURSE
      })
      stage.value = CONSULT_STAGES.NURSE
    } finally {
      setLoading(false)
    }
  }

  // 处理护士多轮问诊交互
  async function submitNurseAnswers(userAnswers) {
    addMessage('user', userAnswers)
    setLoading(true)
    context.value.nurse_round++
    console.log(`[FLOW] 护士问诊第 ${context.value.nurse_round}/${MAX_NURSE_ROUNDS} 轮`)

    try {
      await updatePatientState(userAnswers)

      // 达到最大轮次 → 强制转主治，不再调用 AI 生成护士回复
      if (context.value.nurse_round >= MAX_NURSE_ROUNDS) {
        const forceMsg = language.value === 'zh'
          ? '好的，基本信息已经收集完毕，我现在将您转交给主治张医生。'
          : 'Alright, basic info collected. Transferring you to Dr. Zhang now.'
        addMessage('moderator', forceMsg, {
          doctorName: language.value === 'zh' ? '护士小慧' : 'Nurse Xiao Hui',
          emoji: '👩‍⚕️',
          stage: CONSULT_STAGES.NURSE
        })
        writeLog(`[STAGE] Nurse max rounds (${MAX_NURSE_ROUNDS}) reached, forcing transition to Attending.`)
        await startAttending()
        return
      }
      
      const nurseHistory = messages.value
        .filter(m => m.meta.stage === CONSULT_STAGES.NURSE || m.role === 'user')
        .slice(-6)

      const prompt = await buildStagePrompt(
        CONSULT_STAGES.NURSE, 'general', language.value,
        { patient_state: context.value.patient_state }
      )
      
      const response = await callWithFallback(
        prompt, 
        userAnswers, 
        nurseHistory, 
        [], 
        { role: 'NURSE' }
      )

      const isFinished = response.includes('[TO_ATTENDING]')
      const cleanResponse = response.replace('[TO_ATTENDING]', '').trim()

      if (cleanResponse) {
        addMessage('moderator', cleanResponse, {
          doctorName: language.value === 'zh' ? '护士小慧' : 'Nurse Xiao Hui',
          emoji: '👩‍⚕️',
          stage: CONSULT_STAGES.NURSE
        })
      }

      if (isFinished) {
        writeLog('[STAGE] Nurse intake completed, transitioning to Attending.')
        await startAttending()
      }
    } catch (e) {
      console.error('[Flow] Interaction failed', e)
    } finally {
      setLoading(false)
    }
  }

  // 第二幕：主治医生深挖与决策
  async function startAttending() {
    setLoading(true)
    stage.value = CONSULT_STAGES.ATTENDING
    try {
      // 获取 RAG
      console.log('[FLOW] startAttending: 开始获取 RAG...')
      context.value.rag_knowledge = await getRAGContext()
      console.log('[FLOW] startAttending: RAG 获取完成')

      const transitionMsg = language.value === 'zh' 
        ? '已将您的初诊信息同步给主治张医生，请稍候。' 
        : 'Your initial info has been synced to Dr. Zhang. Please wait.'
      
      addMessage('system', transitionMsg, { emoji: '🔄', stage: CONSULT_STAGES.ATTENDING })

      console.log('[FLOW] startAttending: 构建提示词...')
      const prompt = await buildStagePrompt(
        CONSULT_STAGES.ATTENDING, 'general', language.value,
        { patient_state: context.value.patient_state, rag_info: context.value.rag_knowledge }
      )
      
      console.log('[FLOW] startAttending: 调用 AI...')
      const response = await callWithFallback(prompt, "护士已完成初诊收集，请主治医生开始接诊。", [], [], { role: 'ATTENDING' })
      console.log('[FLOW] startAttending: AI 响应完成，长度:', response?.length)
      
      await handleAttendingResponse(response)
    } catch (e) {
      console.error('[FLOW] startAttending 异常:', e)
    } finally {
      setLoading(false)
    }
  }

  // 处理主治医生多轮问诊交互
  async function submitAttendingAnswers(userAnswers) {
    addMessage('user', userAnswers)
    setLoading(true)
    context.value.attending_round++

    try {
      await updatePatientState(userAnswers)
      
      // 达到最大轮次 -> 强制汇总或召唤会诊
      if (context.value.attending_round >= MAX_ATTENDING_ROUNDS) {
        const forceMsg = language.value === 'zh'
          ? '好的，我已经充分了解了您的情况。接下来我会进行全面评估，并出具一份初步诊断和建议。'
          : 'Thank you. I have sufficient information to proceed with a preliminary diagnosis and recommendations.'
        addMessage('moderator', forceMsg, {
          doctorName: language.value === 'zh' ? '张医生（主治）' : 'Dr. Zhang (Attending)',
          emoji: '🩺',
          stage: CONSULT_STAGES.ATTENDING
        })
        
        writeLog(`[STAGE] Attending max rounds (${MAX_ATTENDING_ROUNDS}) reached, forcing transition.`)
        
        // 自动判定是否需要专家会诊
        const autoDetectedRoles = detectRelevantRoles(context.value.patient_state.symptoms + ' ' + context.value.symptoms)
        if (autoDetectedRoles.length > 0) {
          await handleAttendingResponse(`[SUMMON:${autoDetectedRoles.join(',')}]`)
        } else {
          await handleAttendingResponse('[TO_SUMMARY]')
        }
        return
      }

      const attendingHistory = messages.value
        .filter(m => m.meta.stage === CONSULT_STAGES.ATTENDING || m.role === 'user')
        .slice(-6)

      const prompt = await buildStagePrompt(
        CONSULT_STAGES.ATTENDING, 'general', language.value,
        { patient_state: context.value.patient_state, rag_info: context.value.rag_knowledge }
      )
      
      const response = await callWithFallback(
        prompt, 
        userAnswers, 
        attendingHistory, 
        [], 
        { role: 'ATTENDING' }
      )

      await handleAttendingResponse(response)
    } catch (e) {
      console.error('[Flow] Interaction failed', e)
      const errorMsg = language.value === 'zh'
        ? `⚠️ AI 服务暂时不可用（${e.message}），请稍后重新发送您的回复。`
        : `⚠️ AI service temporarily unavailable (${e.message}). Please resend your reply shortly.`
      addMessage('system', errorMsg, { emoji: '⚠️', stage: CONSULT_STAGES.ATTENDING })
    } finally {
      setLoading(false)
    }
  }

  // 统一解析主治医生响应
  async function handleAttendingResponse(response) {
    const isToSummary = response.includes('[TO_SUMMARY]')
    let matchSummon = response.match(/\[SUMMON:(.*?)\]/)
    let cleanResponse = response.replace(/\[SUMMON:.*?\]/g, '').replace(/\[TO_SUMMARY\]/g, '').trim()

    if (cleanResponse) {
      addMessage('moderator', cleanResponse, {
        doctorName: language.value === 'zh' ? '张医生（主治）' : 'Dr. Zhang (Attending)',
        emoji: '🩺',
        stage: CONSULT_STAGES.ATTENDING
      })
    }

    if (matchSummon && matchSummon[1]) {
      const expertsRaw = matchSummon[1].trim()
      writeLog(`[STAGE] Attending summoned experts: ${expertsRaw}`)
      
      // 检测具体科室 (支持直接英文 roleKey 或 中英文匹配)
      const rolesToInvite = []
      const summonedKeys = expertsRaw.split(',').map(k => k.trim())

      Object.entries(DOCTOR_ROLES).forEach(([key, docRole]) => {
        if (key === 'general') return
        const nameZh = docRole.name_zh || ''
        const nameEn = docRole.name_en || ''
        
        // 如果医生用 roleKey 明确指定或中英文名字包含
        if (
          summonedKeys.includes(key) ||
          expertsRaw.includes(nameZh) || 
          expertsRaw.includes(nameEn)
        ) {
          if (!rolesToInvite.includes(key)) rolesToInvite.push(key)
        }
      })
      
      context.value.invited_roles = rolesToInvite
      if (rolesToInvite.length > 0) {
        await startConsulting()
        return
      } else {
        writeLog('[WARNING] Summoned unknown specialists. Falling back to summary.')
        await runSummary()
      }
    } else if (isToSummary) {
      writeLog('[STAGE] Attending finished, going to summary.')
      await runSummary()
    }
  }

  // 第三幕：专科医生依次发言
  async function startConsulting() {
    stage.value = CONSULT_STAGES.CONSULTING
    const rolesToSpeak = context.value.invited_roles
    
    if (rolesToSpeak.length === 0) {
      await runSummary()
      return
    }

    const sysMsg = language.value === 'zh'
      ? `正在为您召唤专家团队：${rolesToSpeak.map(k=>DOCTOR_ROLES[k].name_zh).join('、')}...`
      : `Summoning experts: ${rolesToSpeak.map(k=>DOCTOR_ROLES[k].name_en).join(', ')}...`
    
    addMessage('system', sysMsg, { emoji: '🔄', stage: CONSULT_STAGES.CONSULTING })

    for (const roleKey of rolesToSpeak) {
      setLoading(true)
      try {
        const previousOpinions = Object.entries(context.value.opinions)
          .map(([k, v]) => {
            const r = DOCTOR_ROLES[k]
            const name = language.value === 'zh' ? r.name_zh : r.name_en
            return `${name}：${v}`
          }).join('\n')

        const consultPrompt = await buildStagePrompt(
          CONSULT_STAGES.CONSULTING,
          roleKey,
          language.value,
          { previous_opinions: previousOpinions, patient_state: context.value.patient_state, rag_info: context.value.rag_knowledge }
        )

        const response = await callWithFallback(consultPrompt, "请基于现有病例给出你的专业意见。", [], [], { role: 'CONSULTING' })
        context.value.opinions[roleKey] = response

        const currentRoleInfo = DOCTOR_ROLES[roleKey]
        addMessage(roleKey, response, {
          doctorName: language.value === 'zh' ? currentRoleInfo.name_zh : currentRoleInfo.name_en,
          emoji: currentRoleInfo.emoji,
          stage: CONSULT_STAGES.CONSULTING
        })

        await delay(1500)
      } finally {
        setLoading(false)
      }
    }

    // 专家会诊结束后，自动进入主治医生总结
    await runSummary()
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

  // 用户追问处理（全局分发）
  async function handleUserInteraction(userMessage) {
    if (!userMessage.trim()) return
    
    // 如果在护士阶段
    if (stage.value === CONSULT_STAGES.NURSE) {
      await submitNurseAnswers(userMessage)
      return
    }
    
    // 如果在主治问路阶段
    if (stage.value === CONSULT_STAGES.ATTENDING) {
      await submitAttendingAnswers(userMessage)
      return
    }

    // 否则作为总结阶段或交互阶段的自由追问交给主治医生
    addMessage('user', userMessage)
    setLoading(true)
    try {
      const prompt = await buildStagePrompt(
        CONSULT_STAGES.SUMMARY, 'general', language.value,
        { patient_state: context.value.patient_state, opinions: context.value.opinions, rag_info: context.value.rag_knowledge }
      )
      
      const response = await callWithFallback(
        prompt, 
        userMessage, 
        messages.value.slice(-6), 
        [], 
        { role: 'SUMMARY' }
      )

      addMessage('moderator', response, {
        doctorName: language.value === 'zh' ? '张医生（主治）' : 'Dr. Zhang (Attending)',
        emoji: '🩺',
        stage: CONSULT_STAGES.SUMMARY
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
        用户最初主述：${context.value.symptoms}
        医生提取的完整病历记录：${JSON.stringify(context.value.patient_state)}
        各专科医生意见（如有）：${JSON.stringify(context.value.opinions)}
        分歧与裁决（如有）：${context.value.disputes.join('；') || '无分歧'}
      `
      const summaryPrompt = await buildStagePrompt(
        CONSULT_STAGES.SUMMARY, 'general', language.value,
        { rag_info: context.value.rag_knowledge, patient_state: context.value.patient_state, opinions: context.value.opinions }
      )
      
      const summaryHistory = messages.value.slice(-8) // 引入最近沟通记录，防提问重复问题
      
      const response = await callWithFallback(summaryPrompt, allContext, summaryHistory, [], { role: 'SUMMARY' })
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
    stage.value         = CONSULT_STAGES.NURSE
    context.value       = {
      symptoms: '', intake_answers: '',
      invited_roles: [], opinions: {},
      disputes: [], consult_round: 0,
      nurse_round: 0,
      rag_knowledge: '',
      patient_state: {
        symptoms: '', history: '', medications: '',
        lifestyle: '', allergies: ''
      }
    }
  }

  return {
    messages,
    stage,
    isLoading,
    language,
    context,
    startNurseIntake,
    submitNurseAnswers,
    startAttending,
    submitAttendingAnswers,
    handleUserInteraction,
    runSummary,
    resetConsult,
    CONSULT_STAGES
  }
})

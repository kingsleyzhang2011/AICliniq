import { defineStore } from 'pinia'
import { useConsultStore } from './index'
import { useUserStore } from '../stores/useUserStore'
import { supabase } from '../services/supabase'

function nowISOString() {
  return new Date().toISOString()
}

function statusText(phase) {
  switch (phase) {
    case 'setup': return '配置/准备'
    case 'discussion': return '讨论中'
    case 'voting': return '评估中'
    case 'finished': return '已结束'
    default: return String(phase || '未知')
  }
}

import { DOCTOR_ROLES } from '../services/ai'

// 帮助函数：为了兼容 Postgres UUID 类型主键
function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// 提取系统预置的医生为默认医生团队
function getDefaultDoctors() {
  return [
    {
      id: generateUUID(),
      name: '全科医疗科医生',
      provider: 'LifeGuard',
      model: '多模态智能引擎',
      status: 'active',
      votes: 0,
      customPrompt: DOCTOR_ROLES.general.focus_zh
    },
    {
      id: generateUUID(),
      name: '心血管内科医生',
      provider: 'LifeGuard',
      model: '多模态智能引擎',
      status: 'active',
      votes: 0,
      customPrompt: DOCTOR_ROLES.cardiologist.focus_zh
    },
    {
      id: generateUUID(),
      name: '内分泌科医生',
      provider: 'LifeGuard',
      model: '多模态智能引擎',
      status: 'active',
      votes: 0,
      customPrompt: DOCTOR_ROLES.endocrinologist.focus_zh
    },
    {
      id: generateUUID(),
      name: '临床营养师',
      provider: 'LifeGuard',
      model: '多模态智能引擎',
      status: 'active',
      votes: 0,
      customPrompt: DOCTOR_ROLES.nutritionist.focus_zh
    }
  ]
}

export const useSessionsStore = defineStore('sessions', {
  state: () => ({
    sessions: [], // [{id, name, status, createdAt}] - mapped from DB
    currentId: ''
  }),
  getters: {
    current(state) {
      return state.sessions.find((s) => s.id === state.currentId) || null
    }
  },
  actions: {
    async init() {
      const userStore = useUserStore()
      if (!userStore.user) return // 必须登录

      try {
        // 从 Supabase 获取用户历史会话 (按照创建时间降序)
        const { data, error } = await supabase
          .from('chat_sessions')
          .select('id, query, created_at, messages')
          .eq('user_id', userStore.user.id)
          .order('created_at', { ascending: false })

        if (error) throw error

        this.sessions = (data || []).map(row => {
          // 在原 messages JSONB 里我们塞了完整的 snapshot，这里提取状态
          const stateSnapshot = row.messages?.state || {}
          return {
            id: row.id,
            name: row.query || '未命名问诊',
            status: statusText(stateSnapshot.workflow?.phase || 'setup'),
            createdAt: row.created_at
          }
        })

        if (!this.sessions.length) {
          const id = await this.createNew('新建问诊')
          await this.switchTo(id)
        } else {
          // 默认选中最近一次问诊
          await this.switchTo(this.sessions[0].id)
        }
      } catch (err) {
        console.error('[LifeGuard] Failed to fetch sessions from Supabase:', err)
      }
    },

    async createNew(name) {
      const userStore = useUserStore()
      if (!userStore.user) return null

      const id = generateUUID()
      const initialName = typeof name === 'string' && name.trim() ? name.trim() : '未命名问诊'
      
      const defaultState = {
        consultationName: initialName,
        settings: undefined,
        doctors: getDefaultDoctors(),
        patientCase: { name: '', gender: '', age: null, pastHistory: '', currentProblem: '', imageRecognitionResult: '', imageRecognitions: [] },
        linkedConsultations: [],
        workflow: { phase: 'setup', currentRound: 0, roundsWithoutElimination: 0, activeTurn: null, turnQueue: [], paused: false },
        discussionHistory: [],
        finalSummary: { status: 'idle', doctorId: null, doctorName: '', content: '', usedPrompt: '' }
      }

      // 实时插入 Supabase
      try {
        const { error } = await supabase
          .from('chat_sessions')
          .insert({
            id,
            user_id: userStore.user.id,
            query: initialName,
            // 我们把完整的快照存入 messages JSONB 中，避免反复改 schema
            messages: { state: defaultState }
          })

        if (error) throw error

        this.sessions.unshift({
          id,
          name: initialName,
          status: '配置/准备',
          createdAt: nowISOString()
        })
        return id
      } catch (err) {
        console.error('[LifeGuard] Created new session failed:', err)
        return null
      }
    },

    async rename(id, newName) {
      const userStore = useUserStore()
      if (!userStore.user) return

      this.sessions = this.sessions.map((s) => (s.id === id ? { ...s, name: newName } : s))
      try {
        await supabase
          .from('chat_sessions')
          .update({ query: newName })
          .eq('id', id)
          .eq('user_id', userStore.user.id)
      } catch (err) {
        console.error('[LifeGuard] Rename failed:', err)
      }
    },

    async remove(id) {
      const userStore = useUserStore()
      if (!userStore.user) return

      this.sessions = this.sessions.filter((s) => s.id !== id)
      try {
        await supabase
          .from('chat_sessions')
          .delete()
          .eq('id', id)
          .eq('user_id', userStore.user.id)
          
        if (this.currentId === id) {
          const next = this.sessions[0]
          if (next) {
            await this.switchTo(next.id)
          } else {
            const nid = await this.createNew('新建问诊')
            await this.switchTo(nid)
          }
        }
      } catch (err) {
        console.error('[LifeGuard] Delete session failed:', err)
      }
    },

    async switchTo(id) {
      const meta = this.sessions.find((s) => s.id === id)
      if (!meta) return
      
      this.currentId = id
      const consult = useConsultStore()

      try {
        // 从 Supabase 抓取该会话的数据
        const { data, error } = await supabase
          .from('chat_sessions')
          .select('messages')
          .eq('id', id)
          .single()

        if (error) throw error

        const payload = data?.messages?.state

        if (payload && typeof payload === 'object') {
          consult.consultationName = typeof payload.consultationName === 'string' ? payload.consultationName : ''
          if (payload.settings) consult.settings = payload.settings
          if (payload.doctors !== undefined) {
             // 简单处理无需重新 sanitize
             consult.doctors = payload.doctors 
          } else {
            consult.doctors = []
          }
          if (payload.patientCase) consult.setPatientCase(payload.patientCase)
          consult.setLinkedConsultations(payload.linkedConsultations || [], { syncPatientInfo: false })
          if (payload.workflow) consult.workflow = payload.workflow
          if (payload.discussionHistory) consult.discussionHistory = payload.discussionHistory
          if (payload.finalSummary) consult.finalSummary = payload.finalSummary
          consult.lastRoundVotes = Array.isArray(payload.lastRoundVotes) ? payload.lastRoundVotes : []
        }
      } catch (err) {
        console.error('[LifeGuard] Switch to session failed:', err)
      }
    },

    async saveSnapshotFromConsult() {
      if (!this.currentId) return
      const userStore = useUserStore()
      if (!userStore.user) return

      const consult = useConsultStore()
      // 生成深拷贝快照
      const snapshot = JSON.parse(JSON.stringify(consult.$state))
      const status = statusText(consult.workflow?.phase)
      
      this.sessions = this.sessions.map((s) => (s.id === this.currentId ? { ...s, status } : s))

      // 异步防抖上传至 Supabase
      try {
        await supabase
          .from('chat_sessions')
          .update({
            query: consult.consultationName,
            messages: { state: snapshot }
          })
          .eq('id', this.currentId)
          .eq('user_id', userStore.user.id)
      } catch (err) {
        console.error('[LifeGuard] Save snapshot failed:', err)
      }
    },

    async exportJSON(id) {
      const meta = this.sessions.find((s) => s.id === id)
      try {
        const { data } = await supabase.from('chat_sessions').select('messages').eq('id', id).single()
        return JSON.stringify({ meta, data: data?.messages?.state }, null, 2)
      } catch (e) {
        return "{}"
      }
    },

    async getSessionData(id) {
       try {
        const { data } = await supabase.from('chat_sessions').select('messages').eq('id', id).single()
        return data?.messages?.state
      } catch (e) {
        return null
      }
    }
  }
})

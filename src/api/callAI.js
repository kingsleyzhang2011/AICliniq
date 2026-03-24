import { callWithFallback, DOCTOR_ROLES, buildSystemPrompt } from '../services/ai'

/**
 * 这是一个桥接函数，用于将旧架构 `ai-doctor` 中复杂的 `callAI` 
 * 映射到我们新规划的坚如磐石的 `callWithFallback` 四轨高可用接口。
 * 
 * 强制剥除传入的独立 API key，完全走环境内置 Key 控制，并抹平模型差异。
 */
export async function callAI(doctor, fullPrompt, historyForProvider) {
  // 原 fullPrompt.system 包含旧的系统角色逻辑
  // 如果需要应用免责声明或是强制映射医生，我们在服务层 buildSystemPrompt 已经支持。
  // 但为了兼容原作者在 `store/index.js` 拼凑的极度复杂的 Prompt（包含互评、投票），
  // 我们直接透传其拼装好的 fullPrompt，但在最后安全地附加上免责声明。
  
  const systemPrompt = fullPrompt.system + 
    '\n\n[System]: 重要提示：本回复仅供健康参考，不构成医疗诊断或处方建议。如有任何不适或紧急情况，请立即就医或拨打急救电话。'
    
  const userPrompt = fullPrompt.user

  // AI 交互日志记录在案，开始真正调用
  return await callWithFallback(systemPrompt, userPrompt, historyForProvider)
}

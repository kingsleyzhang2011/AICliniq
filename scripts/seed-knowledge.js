import { ingestMedlinePlus } from '../src/services/rag.js'

// 覆盖海外华人最常见的健康话题
const TOPICS = [
  'hypertension', 'diabetes', 'heart disease', 'cholesterol',
  'thyroid', 'arthritis', 'back pain', 'depression', 'anxiety',
  'insomnia', 'obesity', 'kidney disease', 'liver disease',
  'asthma', 'allergy', 'cold flu', 'vitamin deficiency',
  'blood sugar', 'blood pressure monitoring', 'medication side effects'
]

console.log('--- 开始初始化 LifeGuard AI 知识库 ---')
console.log('目标主题:', TOPICS.join(', '))
console.log('正在调用 MedlinePlus API 并向量化（Gemini 004）...')

try {
  const result = await ingestMedlinePlus(TOPICS)
  console.log('\n--- 导入完成 ---')
  console.log('成功块数:', result.success)
  console.log('失败主题数:', result.failed)
  console.log('建议: 您现在可以在会诊中输入相关症状触发检索了。')
} catch (error) {
  console.error('\n!!! 导入过程中发生严重错误:', error.message)
}

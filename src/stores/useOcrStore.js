import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../services/supabase'
import { uploadToStorage, extractHealthData } from '../services/ocr'
import { useUserStore } from './useUserStore'

export const useOcrStore = defineStore('ocr', () => {
  const userStore = useUserStore()

  // --- State ---
  // status: 'idle' | 'uploading' | 'analyzing' | 'confirming' | 'saving' | 'success' | 'error'
  const status = ref('idle')
  const currentFile = ref(null)
  
  // Storage 返回的相对路径，例如 `user_uuid/timestamp_name.jpg`
  const uploadedFilePath = ref(null)
  
  // OCR 提取的体检指标数组
  const extractedRecords = ref([])
  const errorMsg = ref('')

  // --- Actions ---

  function reset() {
    status.value = 'idle'
    currentFile.value = null
    uploadedFilePath.value = null
    extractedRecords.value = []
    errorMsg.value = ''
  }

  /**
   * 将 File 对象转换为 Base64
   */
  async function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => {
        const base64Data = reader.result.split(',')[1]
        resolve({ base64Data, mimeType: file.type })
      }
      reader.onerror = (err) => reject(err)
    })
  }

  /**
   * 启动 OCR 流程：1. 上传图片到 Storage 2. 转 Base64 调用大模型 3. 提供数据至确认页
   */
  async function startOcrProcess(file) {
    if (!userStore.user) {
      errorMsg.value = '请先登录'
      return
    }

    reset()
    currentFile.value = file

    try {
      // 1. 上传原始单据留存 (私有桶 medical-files)
      status.value = 'uploading'
      uploadedFilePath.value = await uploadToStorage(file, userStore.user.id)

      // 2. 转换 Base64，调用 Gemini Vision 提取数据
      status.value = 'analyzing'
      const { base64Data, mimeType } = await fileToBase64(file)
      
      const records = await extractHealthData(base64Data, mimeType)
      
      // 添加前端内部需要的 id 用于追踪修改
      extractedRecords.value = records.map((record, index) => ({
        ...record,
        __id: index // 内部临时 ID
      }))

      if (extractedRecords.value.length === 0) {
        throw new Error('未能在图片中识别到任何健康指标。')
      }

      status.value = 'confirming'

    } catch (err) {
      status.value = 'error'
      errorMsg.value = err.message || '识别化验单发生未知错误'
      console.error('[LifeGuard OCR]', err)
    }
  }

  /**
   * 用户确认无误后，将所有的指标作为独立行保存入库
   */
  async function confirmAndSave() {
    if (!userStore.user || extractedRecords.value.length === 0) return

    status.value = 'saving'
    errorMsg.value = ''

    try {
      // 组装符合数据库 schema 的对象
      const insertData = extractedRecords.value.map(row => ({
        user_id: userStore.user.id,
        organization_id: null,
        indicator_name: row.indicator_name,
        value: typeof row.value === 'string' ? parseFloat(row.value) || 0 : row.value, // supabase requires numeric, fallback to 0 if text like '阴性' (for now) -- wait, DB requires NUMERIC. Let's make sure strings are ignored or we change schema?
        // 应对一些非数字的情况（如阴性），如果是纯非数字会报错。为稳妥起见我们只保存可转换为数字的或者后端自动转
        // 由于 Schema 锁定了 value NUMERIC 字段，所以遇到 '阴性' 必须转换为某个约定数字或剥离。但此处直接 parseFloat，非法则赋 0
      }))

      // 正式处理：对于字符串如"阴性"，数据库 NUMERIC 会抱错。我们需要尝试提纯数字。
      const refinedInsertData = extractedRecords.value.map(row => {
        let numericValue = 0
        if (typeof row.value === 'number') {
          numericValue = row.value
        } else if (typeof row.value === 'string') {
          const match = row.value.match(/[-+]?[0-9]*\.?[0-9]+/)
          if (match) {
            numericValue = parseFloat(match[0])
          } else {
            numericValue = 0 // "阴性" 等不可测量的暂时为 0
          }
        }

        return {
          user_id: userStore.user.id,
          indicator_name: row.indicator_name,
          value: numericValue,
          unit: row.unit || null,
          reference_range: row.reference_range || null,
          is_abnormal: Boolean(row.is_abnormal),
          confirmed_by_user: true, // 用户已确认
          file_url: uploadedFilePath.value, // 后续可用 getPublicUrl 读取
          raw_content: row // 完整原始特征以 JSON 持久化，利于后续溯源"阴性"等无法存入 NUMERIC 的值
        }
      })

      const { error: dbError } = await supabase
        .from('health_records')
        .insert(refinedInsertData)

      if (dbError) throw dbError

      status.value = 'success'
    } catch (err) {
      status.value = 'error'
      errorMsg.value = err.message || '保存记录至数据库失败'
      console.error('[LifeGuard OCR Save]', err)
    }
  }

  return {
    status,
    currentFile,
    uploadedFilePath,
    extractedRecords,
    errorMsg,
    reset,
    startOcrProcess,
    confirmAndSave
  }
})

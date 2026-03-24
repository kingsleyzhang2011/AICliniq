import { createClient } from '@supabase/supabase-js'

const supabaseUrl = (import.meta.env?.VITE_SUPABASE_URL) || (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_URL : '')
const supabaseAnonKey = (import.meta.env?.VITE_SUPABASE_ANON_KEY) || (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_ANON_KEY : '')

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '[LifeGuard] Supabase 配置缺失，请检查 .env.local 文件。\n' +
    '需要：VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * 医疗文件 Storage 桶名称，锁定在 medical-files
 * 规则：Private，通过 Signed URL 访问
 */
export const STORAGE_BUCKET = 'medical-files'

/**
 * 组织 ID 预留字段辅助 (AGENTS.md)
 * 默认为 NULL (To C 用户)
 */
export const DEFAULT_ORG_ID = null

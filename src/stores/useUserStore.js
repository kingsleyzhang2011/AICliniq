import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../services/supabase'
import i18n from '../i18n'

export const useUserStore = defineStore('user', () => {
  // --- State ---
  const user = ref(null)       // Supabase Auth User 对象
  const profile = ref(null)    // user_profiles 表中的用户画像
  const loading = ref(false)
  const error = ref(null)

  // --- Getters ---
  const isLoggedIn = computed(() => !!user.value)

  const displayName = computed(() => {
    if (profile.value?.full_name) return profile.value.full_name
    if (user.value?.email) return user.value.email.split('@')[0]
    return ''
  })

  const preferredLanguage = computed(() => {
    return profile.value?.preferred_language || 'zh'
  })

  // --- Actions ---

  /**
   * 应用启动时调用：恢复 session + 监听 auth 状态变化
   */
  async function init() {
    loading.value = true
    error.value = null

    try {
      // 恢复现有 session
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        user.value = session.user
        await fetchProfile()
      }

      // 监听 auth 状态变化（登入、登出、token 刷新等）
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          user.value = session.user
          await fetchProfile()
        } else if (event === 'SIGNED_OUT') {
          user.value = null
          profile.value = null
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          user.value = session.user
        }
      })
    } catch (err) {
      error.value = err.message
      console.error('[LifeGuard] Auth init failed:', err)
    } finally {
      loading.value = false
    }
  }

  /**
   * 邮箱密码登录
   */
  async function login(email, password) {
    loading.value = true
    error.value = null

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (authError) throw authError

      user.value = data.user
      await fetchProfile()
      return data
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * 注册（含自动创建 user_profiles 行）
   */
  async function signup(email, password) {
    loading.value = true
    error.value = null

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password
      })

      if (authError) throw authError

      // 注册成功后自动为新用户创建 profile 行
      if (data.user) {
        user.value = data.user

        const { error: profileError } = await supabase
          .from('user_profiles')
          .upsert({
            user_id: data.user.id,
            preferred_language: 'zh',
            region: 'overseas'
          }, { onConflict: 'user_id' })

        if (profileError) {
          console.error('[LifeGuard] Profile creation failed:', profileError)
        }

        await fetchProfile()
      }

      return data
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * 登出
   */
  async function logout() {
    loading.value = true
    error.value = null

    try {
      // Try to sign out from Supabase (may fail if network is down or session expired)
      await supabase.auth.signOut()
    } catch (err) {
      console.warn('[UserStore] Supabase signOut error:', err)
    } finally {
      // ALWAYS clear local state regardless of server result
      user.value = null
      profile.value = null
      loading.value = false
    }
  }

  /**
   * 从 user_profiles 拉取当前用户画像
   */
  async function fetchProfile() {
    if (!user.value) return

    try {
      const { data, error: fetchError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.value.id)
        .single()

      if (fetchError && fetchError.code === 'PGRST116') {
        // PGRST116 = no rows found, 说明 profile 尚未创建，自动创建一个
        const { data: newData, error: upsertError } = await supabase
          .from('user_profiles')
          .upsert({
            user_id: user.value.id,
            preferred_language: i18n.global.locale?.value || 'zh',
            region: 'overseas'
          }, { onConflict: 'user_id' })
          .select()
          .single()
        
        if (upsertError) throw upsertError
        profile.value = newData
      } else if (fetchError) {
        throw fetchError
      } else {
        profile.value = data || null
      }

      // Sync i18n locale with user preference on load
      if (profile.value?.preferred_language) {
        i18n.global.locale.value = profile.value.preferred_language
      }
    } catch (err) {
      console.error('[LifeGuard] Fetch/Create profile failed:', err)
    }
  }

  /**
   * Set user preferred language, updating i18n locale and Supabase profile
   */
  async function setLanguage(lang) {
    if (i18n.global.locale.value === lang) return
    i18n.global.locale.value = lang
    
    // Only persist if user is fully logged in and has a profile row
    if (user.value && profile.value) {
      try {
        await updateProfile({ preferred_language: lang })
      } catch (err) {
        console.error('[UserStore] Failed to persist preferredLanguage:', err)
      }
    }
  }

  /**
   * 更新用户画像字段
   */
  async function updateProfile(updates) {
    if (!user.value) return

    loading.value = true
    error.value = null

    try {
      const { data, error: updateError } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('user_id', user.value.id)
        .select()
        .single()

      if (updateError) throw updateError

      profile.value = data
      return data
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    // State
    user,
    profile,
    loading,
    error,
    // Getters
    isLoggedIn,
    displayName,
    preferredLanguage,
    // Actions
    init,
    login,
    signup,
    logout,
    fetchProfile,
    updateProfile,
    setLanguage
  }
})

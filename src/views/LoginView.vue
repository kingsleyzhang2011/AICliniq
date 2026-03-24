<!-- LoginView.vue — 登录/注册入口页面（UI 在 Task 6 完善） -->
<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="bg-white p-8 rounded-xl shadow-md w-full max-w-sm">
      <h1 class="text-2xl font-bold text-center mb-6">LifeGuard AI</h1>
      <p class="text-center text-gray-500 text-sm mb-6">
        「本工具仅提供公开知识参考，绝非医疗诊断或处方。<br/>任何健康问题请立即咨询医生或急诊。」
      </p>

      <!-- 登录表单 -->
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
          <input
            v-model="email"
            type="email"
            required
            placeholder="your@email.com"
            class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">密码</label>
          <input
            v-model="password"
            type="password"
            required
            placeholder="••••••••"
            class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <p v-if="errorMsg" class="text-red-500 text-xs">{{ errorMsg }}</p>

        <button
          type="submit"
          :disabled="loading"
          class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg text-sm transition"
        >
          {{ loading ? '处理中...' : (isSignup ? '注册' : '登录') }}
        </button>
      </form>

      <p class="text-center text-sm text-gray-500 mt-4">
        <button @click="isSignup = !isSignup" class="text-blue-600 hover:underline">
          {{ isSignup ? '已有账号？去登录' : '没有账号？注册' }}
        </button>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '../stores/useUserStore'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const isSignup = ref(false)
const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMsg = ref('')

async function handleSubmit() {
  loading.value = true
  errorMsg.value = ''

  try {
    if (isSignup.value) {
      await userStore.signup(email.value, password.value)
    } else {
      await userStore.login(email.value, password.value)
    }
    // 登录/注册成功后跳转到目标页或首页
    const redirect = route.query.redirect || '/home'
    router.push(redirect)
  } catch (err) {
    errorMsg.value = err.message || '操作失败，请重试'
  } finally {
    loading.value = false
  }
}
</script>

<!-- App.vue — 全局根组件与基础视图框架 -->
<template>
  <a-config-provider :theme="{ token: { colorPrimary: '#2563eb' } }">
    <div class="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
      <!-- 带有条件渲染的全局顶部导航栏 (需登录) -->
      <header
        v-if="route.meta.requiresAuth"
        class="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm"
      >
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between items-center h-16">
            
            <!-- Logo & Brand -->
            <div class="flex items-center gap-3 cursor-pointer" @click="goHome">
              <img src="./assets/logo.svg" alt="LifeGuard AI" class="w-8 h-8" />
              <span class="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-teal-500">
                LifeGuard AI
              </span>
            </div>

            <!-- Disclaimer (Desktop only for space reasons) -->
            <div class="hidden md:block">
              <span class="text-sm font-medium text-red-500 bg-red-50 px-3 py-1 rounded-full border border-red-100">
                ⚠️ 本工具仅供参考，不作医疗诊断。如遇紧急情况请就医。
              </span>
            </div>

            <!-- User Actions -->
            <div class="flex items-center gap-4">
              <span class="text-sm font-medium text-gray-700">
                {{ userStore.displayName || 'Loading...' }}
              </span>
              <a-button type="text" danger @click="handleLogout">
                退出登录
              </a-button>
            </div>

          </div>
        </div>
      </header>

      <!-- 路由内容区 -->
      <main class="flex-grow">
        <!-- 如果是授权页面，限制最大宽度及内边距 -->
        <div 
          v-if="route.meta.requiresAuth" 
          class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
        >
          <router-view />
        </div>
        <!-- 否则 (如登录页) 直接全宽无内边距挂载 -->
        <div v-else class="h-full">
          <router-view />
        </div>
      </main>

    </div>
  </a-config-provider>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from './stores/useUserStore'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

function goHome() {
  if (userStore.isLoggedIn) {
    router.push('/home')
  }
}

async function handleLogout() {
  try {
    await userStore.logout()
    router.push('/login')
  } catch (err) {
    console.error('Logout failed:', err)
  }
}
</script>

<style>
/* 移除旧有的 App.vue style，改用 Tailwind Utilities */
body {
  margin: 0;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Custom scrollbar styles */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: #cbd5e1; /* Tailwind slate-300 */
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: #94a3b8; /* Tailwind slate-400 */
}
</style>

<!-- App.vue — 全局根组件与基础视图框架 -->
<template>
  <a-config-provider :theme="{ token: { colorPrimary: '#2563eb' } }">
    <div class="min-h-screen bg-surface font-body text-on-surface flex flex-col">
      <!-- 路由内容区 (Full bleed for Stitch Design) -->
      <main class="flex-grow">
        <router-view />
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

import { createRouter, createWebHashHistory } from 'vue-router'
import { useUserStore } from '../stores/useUserStore'

const routes = [
  {
    path: '/',
    redirect: '/home'
  },
  {
    path: '/home',
    name: 'Home',
    component: () => import('../views/HomeView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/chat',
    name: 'Chat',
    component: () => import('../views/ChatView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/ocr',
    name: 'Ocr',
    component: () => import('../views/OcrView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/history',
    name: 'History',
    component: () => import('../views/HistoryView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/report',
    name: 'Report',
    component: () => import('../views/ReportView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('../views/SettingsView.vue'),
    meta: { requiresAuth: true }
  },
  {
    // 亲友只读分享页 —— 公开路由，无需登录
    path: '/share/:token',
    name: 'SharedReport',
    component: () => import('../views/SharedReportView.vue'),
    meta: { public: true }
  },
  {
    // 登录/注册入口 —— 公开路由
    path: '/login',
    name: 'Login',
    component: () => import('../views/LoginView.vue'),
    meta: { public: true }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// Auth Guard
router.beforeEach((to) => {
  const userStore = useUserStore()

  // 需要登录但未登录 → 跳转登录页
  if (to.meta.requiresAuth && !userStore.isLoggedIn) {
    return { name: 'Login', query: { redirect: to.fullPath } }
  }

  // 已登录访问登录页 → 跳转首页
  if (to.name === 'Login' && userStore.isLoggedIn) {
    return { name: 'Home' }
  }
})

export default router

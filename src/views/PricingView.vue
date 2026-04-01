<template>
  <div class="bg-surface font-body text-on-surface min-h-screen py-20 px-6">
    <nav class="fixed top-0 left-0 w-full px-6 py-6 z-50 glass-nav">
      <div class="max-w-7xl mx-auto flex justify-between items-center">
        <a @click="router.push('/home')" class="flex items-center gap-2 text-primary font-bold hover:opacity-80 transition-all cursor-pointer">
          <span class="material-symbols-outlined text-2xl" style="font-variation-settings: 'FILL' 1;">spa</span>
          <span class="text-xl font-headline tracking-tighter">{{ $t('app.title') }}</span>
        </a>
        <div class="flex items-center gap-4">
           <button @click="router.push('/home')" class="text-outline font-bold text-sm tracking-wide">{{ $t('app.home') }}</button>
        </div>
      </div>
    </nav>

    <div class="max-w-7xl mx-auto mt-12">
      <div class="text-center mb-16 animate-fade-in">
        <h1 class="text-5xl font-headline font-extrabold text-primary mb-4">升级您的健康守护</h1>
        <p class="text-xl text-outline max-w-2xl mx-auto">解锁真正的专属医疗团队，获取不限量的化验单深度分析与即时全科咨询。</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto relative z-10">
        <!-- Free Plan -->
        <div class="bg-white rounded-3xl p-10 botanical-shadow border border-stone-100 flex flex-col justify-between hover:-translate-y-1 transition-transform">
          <div>
            <span class="inline-block px-4 py-1.5 rounded-full bg-surface-container text-outline font-bold text-sm mb-6">社区基础版</span>
            <div class="mb-4">
              <span class="text-5xl font-extrabold text-gray-900">¥0</span>
              <span class="text-gray-500 font-medium ml-2">/ 永久</span>
            </div>
            <p class="text-gray-500 mb-8 font-medium">适合日常简单查阅和初步问诊需求。</p>
            
            <ul class="space-y-4 mb-8">
              <li class="flex items-start gap-3 text-gray-700">
                <span class="material-symbols-outlined text-green-500">check_circle</span>
                <span>核心多专家 AI 会诊室基础接入</span>
              </li>
              <li class="flex items-start gap-3 text-gray-700">
                <span class="material-symbols-outlined text-green-500">check_circle</span>
                <span>图文诊断报告生成与分享</span>
              </li>
              <li class="flex items-start gap-3 text-gray-700">
                <span class="material-symbols-outlined text-green-500">check_circle</span>
                <span>限制的单次化验单 OCR 解析</span>
              </li>
              <li class="flex items-start gap-3 text-gray-300">
                <span class="material-symbols-outlined text-gray-200">cancel</span>
                <span>解锁全部智能图表预估大屏</span>
              </li>
              <li class="flex items-start gap-3 text-gray-300">
                <span class="material-symbols-outlined text-gray-200">cancel</span>
                <span>无限制的连续上下文医学追问</span>
              </li>
            </ul>
          </div>
          
          <button 
            disabled 
            class="w-full py-4 rounded-xl bg-gray-100 text-gray-400 font-bold border border-gray-200"
          >
            {{ userStore.isPro ? "已包含在尊享套餐内" : "您当前的版本" }}
          </button>
        </div>

        <!-- Pro Plan -->
        <div class="bg-gradient-to-br from-primary to-primary-container rounded-3xl p-10 botanical-shadow relative flex flex-col justify-between hover:-translate-y-2 transition-transform overflow-hidden shadow-2xl">
          <div class="absolute -top-32 -right-32 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
          
          <div class="relative z-10">
            <span class="inline-block px-4 py-1.5 rounded-full bg-white/20 text-white font-bold text-sm mb-6 uppercase tracking-wider backdrop-blur-md">Pro 尊享版</span>
            <div class="mb-4 text-white">
              <span class="text-5xl font-extrabold">¥20</span>
              <span class="text-white/80 font-medium ml-2">/ 月</span>
            </div>
            <p class="text-white/80 mb-8 font-medium">为自我健康管理极客打造的无忧服务计划。</p>
            
            <ul class="space-y-4 mb-8">
              <li class="flex items-start gap-3 text-white">
                <span class="material-symbols-outlined text-secondary-fixed">check_circle</span>
                <span><strong>包含免费版的一切权益</strong></span>
              </li>
              <li class="flex items-start gap-3 text-white">
                <span class="material-symbols-outlined text-secondary-fixed">check_circle</span>
                <span>无限次的复杂化验单识别及深度解析</span>
              </li>
              <li class="flex items-start gap-3 text-white">
                <span class="material-symbols-outlined text-secondary-fixed">check_circle</span>
                <span>全效启用<strong class="mx-1">智能健康历史图表</strong>及 AI 跟踪趋势评估</span>
              </li>
              <li class="flex items-start gap-3 text-white">
                <span class="material-symbols-outlined text-secondary-fixed">check_circle</span>
                <span>极速响应及使用最高阶推理医疗级模型</span>
              </li>
              <li class="flex items-start gap-3 text-white">
                <span class="material-symbols-outlined text-secondary-fixed">check_circle</span>
                <span>优先参与内测家属档案功能</span>
              </li>
            </ul>
          </div>
          
          <button 
            @click="handleSubscribe" 
            :disabled="loading || userStore.isPro"
            class="w-full py-4 rounded-xl bg-white text-primary font-bold shadow-lg hover:bg-gray-50 transition-colors disabled:opacity-80 active:scale-[0.98] relative z-10 flex justify-center items-center gap-2"
          >
            <span v-if="loading" class="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full mr-2"></span>
            <span>{{ loading ? "正在安全连接 Stripe..." : (userStore.isPro ? "您已经是尊享用户" : "立即开启 Pro 守护") }}</span>
          </button>
        </div>
      </div>
      
      <div v-if="errorMsg" class="mt-8 max-w-xl mx-auto p-4 bg-error/10 border border-error/20 text-error rounded-xl text-center font-bold">
        {{ errorMsg }}
      </div>
      <div v-if="canceled" class="mt-8 max-w-xl mx-auto p-4 bg-yellow-50 text-yellow-800 rounded-xl text-center font-bold border border-yellow-200">
        您已取消付款会话。您可以随时在此页继续完成升级订购。
      </div>
      <div v-if="successParam" class="mt-8 max-w-xl mx-auto p-4 bg-green-50 text-green-800 rounded-xl text-center font-bold border border-green-200">
        感谢您的订购！Stripe 正在确认您的订单，Pro 将在极短时间内生效。
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '../stores/useUserStore'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const loading = ref(false)
const errorMsg = ref('')
const canceled = ref(false)
const successParam = ref(false)

onMounted(() => {
  if (route.query.canceled) canceled.value = true
  if (route.query.upgraded) successParam.value = true
})

async function handleSubscribe() {
  if (!userStore.isLoggedIn) {
    // Navigate to Auth page and then redirect back to Pricing upon success
    router.push({ path: '/login', query: { redirect: '/pricing' } })
    return
  }

  loading.value = true
  errorMsg.value = ''
  
  try {
    const response = await fetch('/api/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        userId: userStore.user.id,
        email: userStore.user.email
      })
    })

    const data = await response.json()
    if (!response.ok) throw new Error(data.error || '付款安全接口响应异常')

    // Redirect to Stripe Checkout page Hosted UI
    if (data.url) {
      window.location.href = data.url
    } else {
       throw new Error('网络通信失败，未收到有效的支付链接')
    }
  } catch (err) {
    console.error('Checkout Initialization failed:', err)
    errorMsg.value = `请求支付平台失败: ${err.message}`
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in {
  animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.glass-nav {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}
</style>

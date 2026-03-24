<!-- src/views/HomeView.vue -->
<template>
  <div class="space-y-8 animate-fade-in">
    
    <!-- Welcome Header -->
    <header class="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 shadow-lg text-white">
      <h1 class="text-3xl font-bold mb-2">欢迎回来，{{ userStore.displayName }} 👋</h1>
      <p class="text-blue-100 max-w-2xl">
        LifeGuard AI 是您的云端专属医疗会诊团队。上传您的化验单或直接发起问诊，多位顶尖 AI 专科医生将为您提供综合健康评估。
      </p>
    </header>

    <!-- Quick Actions (Main features) -->
    <section>
      <h2 class="text-xl font-semibold text-gray-800 mb-4">快捷操作</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        <!-- Action 1: OCR -->
        <div 
          @click="router.push('/ocr')"
          class="group bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer relative overflow-hidden"
        >
          <div class="absolute -right-6 -top-6 bg-teal-50 w-24 h-24 rounded-full group-hover:scale-110 transition-transform"></div>
          <div class="flex items-start gap-4 relative z-10">
            <div class="bg-teal-100 p-3 rounded-xl text-teal-600">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h3 class="text-lg font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">自动解读化验单</h3>
              <p class="text-sm text-gray-500">
                支持上传多页 PDF / 图片，Gemini 视觉大模型帮您提取指标，对比标准范围，指出异常项。
              </p>
            </div>
          </div>
        </div>

        <!-- Action 2: Chat Consultation -->
        <div 
          @click="router.push('/chat')"
          class="group bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer relative overflow-hidden"
        >
          <div class="absolute -right-6 -top-6 bg-blue-50 w-24 h-24 rounded-full group-hover:scale-110 transition-transform"></div>
          <div class="flex items-start gap-4 relative z-10">
            <div class="bg-blue-100 p-3 rounded-xl text-blue-600">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
              </svg>
            </div>
            <div>
              <h3 class="text-lg font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">发起多医生会诊</h3>
              <p class="text-sm text-gray-500">
                支持语音与文字输入。您可以邀请全科医生、心血管专家等联合对您的症状进行辩论与诊断。
              </p>
            </div>
          </div>
        </div>

      </div>
    </section>

    <!-- Recent History / Tracker Placeholder -->
    <section>
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-semibold text-gray-800">最新健康报告</h2>
        <button @click="router.push('/history')" class="text-sm text-blue-600 hover:underline font-medium">
          查看全部历史 &rarr;
        </button>
      </div>

      <!-- Placeholder content before we build the actual database fetch logic -->
      <div class="bg-white rounded-xl p-10 border border-gray-100 shadow-sm text-center flex flex-col items-center justify-center">
        <div class="bg-gray-50 p-4 rounded-full mb-3 text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 class="text-lg font-medium text-gray-700 mb-1">暂无历史记录</h3>
        <p class="text-sm text-gray-500 max-w-sm">
          您还没有使用过会诊或上传过体检报告。立即开始体验智能分析！
        </p>
      </div>
    </section>

  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/useUserStore'

const router = useRouter()
const userStore = useUserStore()
</script>

<style scoped>
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in {
  animation: fadeIn 0.4s ease-out forwards;
}
</style>

<!-- src/views/OcrView.vue -->
<template>
  <div class="max-w-4xl mx-auto space-y-6 animate-fade-in pb-12">
    
    <!-- Header -->
    <header class="mb-8">
      <div class="flex items-center gap-3 mb-2">
        <button 
          @click="router.push('/home')" 
          class="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
          </svg>
        </button>
        <h1 class="text-2xl font-bold text-gray-900">智能体检单解读</h1>
      </div>
      <p class="text-gray-500 text-sm pl-11">
        上传化验单照片或 PDF，AI 医生将自动为您提取体征指标并分析异常情况。
      </p>
    </header>

    <!-- Error Alert -->
    <div v-if="ocrStore.errorMsg" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg relative flex items-start">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
      </svg>
      <div>
        <h3 class="font-semibold text-sm">发生了错误</h3>
        <p class="text-sm mt-1">{{ ocrStore.errorMsg }}</p>
        <button @click="ocrStore.reset()" class="text-sm font-medium underline mt-2 hover:text-red-800">重试</button>
      </div>
    </div>

    <!-- Upload State -->
    <section v-if="ocrStore.status === 'idle' || ocrStore.status === 'error'">
      <OcrUploader @file-selected="onFileSelected" />
    </section>

    <!-- Loading State -->
    <section v-else-if="ocrStore.status === 'uploading' || ocrStore.status === 'analyzing'" class="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
      <div class="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
      <h3 class="text-lg font-semibold text-gray-800">
        {{ ocrStore.status === 'uploading' ? '正在安全上传文件...' : 'Gemini 医疗大模型正在奋笔疾书提取数据...' }}
      </h3>
      <p class="text-sm text-gray-500 mt-2">这段时间可能需要 5-15 秒，请耐心等待。</p>
    </section>

    <!-- Confirm State -->
    <section v-else-if="ocrStore.status === 'confirming'" class="space-y-6">
      <OcrConfirmTable 
        :records="ocrStore.extractedRecords" 
        @update:records="onRecordsUpdated"
      />
      
      <div class="flex justify-end gap-3">
        <button 
          @click="ocrStore.reset()"
          class="px-5 py-2.5 rounded-lg font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          取消重传
        </button>
        <button 
          @click="handleSave"
          class="px-5 py-2.5 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm"
        >
          确认数据并保存
        </button>
      </div>
    </section>

    <!-- Saving State -->
    <section v-else-if="ocrStore.status === 'saving'" class="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
      <div class="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-teal-500 mb-4"></div>
      <h3 class="text-lg font-semibold text-gray-800">正在加密归档到您的健康档案...</h3>
    </section>

    <!-- Success State -->
    <section v-else-if="ocrStore.status === 'success'" class="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
      <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-500">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h3 class="text-xl font-bold text-gray-900 mb-2">保存成功</h3>
      <p class="text-gray-500 mb-6">本次化验单数据已成功记录至健康档案，可用于后续 AI 联合会诊参考。</p>
      
      <div class="flex justify-center gap-4">
        <button 
          @click="ocrStore.reset()"
          class="px-5 py-2.5 rounded-lg font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
        >继续上传</button>
        <button 
          @click="router.push('/chat')"
          class="px-5 py-2.5 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
        >立即发起问诊</button>
      </div>
    </section>

  </div>
</template>

<script setup>
import { onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useOcrStore } from '../stores/useOcrStore'
import OcrUploader from '../components/ocr/OcrUploader.vue'
import OcrConfirmTable from '../components/ocr/OcrConfirmTable.vue'

const router = useRouter()
const ocrStore = useOcrStore()

// 当组件销毁时，重置状态避免导致下一次异常
onUnmounted(() => {
  ocrStore.reset()
})

const onFileSelected = async (file) => {
  await ocrStore.startOcrProcess(file)
}

const onRecordsUpdated = (updatedRecords) => {
  ocrStore.extractedRecords = updatedRecords
}

const handleSave = async () => {
  await ocrStore.confirmAndSave()
}
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

<!-- src/components/ocr/OcrUploader.vue -->
<template>
  <div class="w-full">
    <div 
      class="border-2 border-dashed rounded-xl p-12 text-center transition-colors duration-200 ease-in-out cursor-pointer"
      :class="isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white hover:border-blue-400 hover:bg-gray-50'"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="handleDrop"
      @click="triggerFileInput"
    >
      <input 
        type="file" 
        ref="fileInput" 
        class="hidden" 
        accept="image/jpeg, image/png, application/pdf"
        @change="handleFileSelect"
      />
      
      <div class="flex flex-col items-center justify-center space-y-4 pointer-events-none">
        <div class="bg-blue-100 p-4 rounded-full text-blue-600">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        <div>
          <h3 class="text-lg font-semibold text-gray-800">点击或拖拽文件上传化验单</h3>
          <p class="text-sm text-gray-500 mt-1">支持格式：JPG, PNG, PDF（智能视觉大模型自动解析）</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const emit = defineEmits(['file-selected'])
const fileInput = ref(null)
const isDragging = ref(false)

function triggerFileInput() {
  fileInput.value.click()
}

function handleFileSelect(event) {
  const files = event.target.files
  if (files && files.length > 0) {
    emitSelectedFile(files[0])
  }
}

function handleDrop(event) {
  isDragging.value = false
  const files = event.dataTransfer.files
  if (files && files.length > 0) {
    emitSelectedFile(files[0])
  }
}

function emitSelectedFile(file) {
  const validTypes = ['image/jpeg', 'image/png', 'application/pdf']
  if (!validTypes.includes(file.type)) {
    // 简单拦截，实际应通过 Ant Design MessageBox 提示
    alert('请上传 JPG、PNG 或 PDF 格式的文件')
    return
  }
  emit('file-selected', file)
  if (fileInput.value) {
    fileInput.value.value = '' // reset
  }
}
</script>

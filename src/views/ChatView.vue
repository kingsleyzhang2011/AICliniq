<script setup>
import { ref, computed, nextTick, watch } from 'vue'
import { useChatStore } from '../stores/useChatStore'
import ChatBubble from '../components/chat/ChatBubble.vue'

const chatStore = useChatStore()
const userInput = ref('')
const messageContainer = ref(null)

const placeholder = computed(() => {
  if (chatStore.stage === chatStore.CONSULT_STAGES.INTAKE) {
    return chatStore.messages.length === 0 ? '请描述你的症状...' : '请回答护士的问题...'
  }
  if (chatStore.stage === chatStore.CONSULT_STAGES.INTERACT) {
    return '有什么想追问的？或回复「给我结论」'
  }
  if (chatStore.stage === chatStore.CONSULT_STAGES.SUMMARY) {
    return '本次会诊已结束，点击右上角开始新的会诊'
  }
  return '正在会诊中...'
})

const handleSendMessage = async () => {
  if (!userInput.value.trim() || chatStore.isLoading) return
  
  const text = userInput.value
  userInput.value = ''

  if (chatStore.messages.length === 0) {
    await chatStore.startIntake(text)
  } else if (chatStore.stage === chatStore.CONSULT_STAGES.INTAKE) {
    await chatStore.submitIntakeAnswers(text)
  } else {
    await chatStore.handleUserInteraction(text)
  }
}

const handleReset = () => {
  chatStore.resetConsult()
}

// 自动滚动到底部
watch(() => chatStore.messages.length, async () => {
  await nextTick()
  if (messageContainer.value) {
    messageContainer.value.scrollTop = messageContainer.value.scrollHeight
  }
})
</script>

<template>
  <div class="flex flex-col h-screen bg-gray-50 max-w-2xl mx-auto shadow-xl">
    <!-- 头部 -->
    <header class="flex items-center justify-between px-6 py-4 bg-white border-b sticky top-0 z-10">
      <div class="flex flex-col">
        <h1 class="text-xl font-bold text-blue-900 leading-tight">LifeGuard AI</h1>
        <div class="text-[10px] text-blue-500 font-medium tracking-wide uppercase">Multi-Doctor Consultation</div>
      </div>
      <button 
        @click="handleReset"
        class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-full text-sm font-medium transition-all active:scale-95 shadow-sm"
      >
        新会诊
      </button>
    </header>

    <!-- 消息区域 -->
    <div 
      ref="messageContainer"
      class="flex-1 overflow-y-auto py-6 space-y-2 scroll-smooth"
    >
      <ChatBubble 
        v-for="msg in chatStore.messages" 
        :key="msg.id" 
        :message="msg" 
      />
      
      <!-- 加载动画 -->
      <div v-if="chatStore.isLoading" class="flex flex-col gap-2 px-8 py-2">
        <div class="text-[10px] text-blue-500 font-bold animate-pulse uppercase">AI Analyzing...</div>
        <div class="flex gap-1.5">
          <div class="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div class="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div class="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce"></div>
        </div>
      </div>
    </div>

    <!-- 输入区域 -->
    <div class="p-6 bg-white border-t safe-area-bottom">
      <div class="flex items-center gap-3 bg-gray-100 rounded-2xl p-2 pl-4 border border-gray-200 focus-within:ring-2 focus-within:ring-blue-500 focus-within:bg-white transition-all shadow-inner">
        <input 
          v-model="userInput"
          @keyup.enter="handleSendMessage"
          :placeholder="placeholder"
          :disabled="chatStore.isLoading || chatStore.stage === chatStore.CONSULT_STAGES.SUMMARY"
          class="flex-1 bg-transparent border-none focus:ring-0 text-gray-800 text-md py-1 disabled:opacity-50"
        />
        <button 
          @click="handleSendMessage"
          :disabled="chatStore.isLoading || chatStore.stage === chatStore.CONSULT_STAGES.SUMMARY"
          class="bg-blue-600 p-2.5 rounded-xl text-white disabled:bg-gray-400 transition-colors shadow-sm active:scale-95"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 rotate-90" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
          </svg>
        </button>
      </div>
      <div v-if="chatStore.isLoading" class="text-center text-[10px] text-gray-400 mt-2 font-medium tracking-widest uppercase">
        正在与专家团队远程连线中
      </div>
    </div>
  </div>
</template>

<style scoped>
.safe-area-bottom {
  padding-bottom: calc(1.5rem + env(safe-area-inset-bottom));
}
</style>

<script setup>
defineProps({
  message: {
    type: Object,
    required: true
  }
})
</script>

<template>
  <div 
    class="flex w-full mb-4 px-4"
    :class="message.role === 'user' ? 'justify-end' : 'justify-start'"
  >
    <!-- 用户消息 -->
    <div v-if="message.role === 'user'" class="max-w-[80%]">
      <div class="bg-blue-600 text-white rounded-2xl rounded-tr-none px-4 py-2 shadow-sm">
        {{ message.content }}
      </div>
      <div class="text-right text-[10px] text-gray-400 mt-1">
        {{ new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}
      </div>
    </div>

    <!-- 总结阶段卡片效果 -->
    <div v-else-if="message.meta?.stage === 'summary'" class="w-full bg-white border-2 border-blue-500 rounded-xl p-6 shadow-lg mb-6">
      <div class="flex items-center gap-2 mb-4 border-b pb-2">
        <span class="text-2xl">{{ message.meta.emoji }}</span>
        <span class="font-bold text-lg text-blue-900">{{ message.meta.doctorName }}</span>
      </div>
      <div class="prose prose-sm max-w-none text-gray-800 whitespace-pre-wrap leading-relaxed">
        {{ message.content }}
      </div>
    </div>

    <!-- 系统/医生消息 -->
    <div v-else class="max-w-[85%] flex flex-col items-start gap-1">
      <!-- 医生头衔 -->
      <div class="flex items-center gap-1 px-1">
        <span class="text-sm">{{ message.meta?.emoji }}</span>
        <span class="text-xs font-medium text-gray-600">{{ message.meta?.doctorName }}</span>
        <span v-if="message.meta?.stage === 'debate'" class="bg-orange-100 text-orange-600 text-[10px] px-1 rounded border border-orange-200">辩论</span>
      </div>

      <!-- 气泡主体 -->
      <div 
        class="relative px-4 py-2 rounded-2xl shadow-sm text-sm leading-relaxed"
        :class="[
          message.role === 'nurse' ? 'bg-pink-50 text-pink-900 border border-pink-100 rounded-tl-none' : '',
          message.role === 'moderator' ? 'bg-blue-50 text-blue-900 border border-blue-100 rounded-tl-none' : '',
          !['nurse', 'moderator'].includes(message.role) ? 'bg-white text-gray-800 border border-gray-100 rounded-tl-none' : '',
          message.meta?.stage === 'debate' ? 'border-l-4 border-l-orange-400' : ''
        ]"
      >
        <div class="whitespace-pre-wrap">{{ message.content }}</div>
      </div>
      
      <div class="text-[10px] text-gray-400 mt-1 px-1">
        {{ new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 可以在这里添加打字机等微动效 */
</style>

<template>
  <div class="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex p-4 md:p-8 animate-fade-in text-white overflow-hidden">
    <!-- Close / Hang Up button -->
    <button @click="closeModal" class="absolute top-6 left-6 w-12 h-12 rounded-full bg-surface-container-highest/20 hover:bg-error/90 border border-white/10 hover:border-error text-white flex items-center justify-center transition-colors z-50 shadow-2xl">
      <span class="material-symbols-outlined font-bold text-2xl">call_end</span>
    </button>
    
    <!-- Main Content Container -->
    <div class="w-full h-full flex flex-col md:flex-row gap-6 relative pl-16 md:pl-20">
      
      <!-- Left side: Virtual AI Doctor -->
      <div class="flex-grow bg-surface-container-lowest/10 rounded-3xl overflow-hidden relative border border-white/5 shadow-2xl">
        <video 
          :src="virtualDoctorVideoSrc"
          class="w-full h-full object-cover"
          autoplay 
          loop 
          muted 
          playsinline 
        ></video>
        <!-- AI identification badge -->
        <div class="absolute bottom-6 left-6 bg-black/50 backdrop-blur-md px-4 py-3 rounded-2xl flex items-center gap-4 border border-white/10 shadow-xl">
          <div class="relative flex h-3 w-3 mt-1 self-start">
             <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
             <span class="relative inline-flex rounded-full h-3 w-3 bg-primary-container"></span>
          </div>
          <div>
            <p class="text-xs font-bold uppercase tracking-wider text-white/50 mb-0.5">多路核心会诊系统</p>
            <p class="text-white font-bold text-sm tracking-wide">临床医疗协作团队 AI</p>
          </div>
        </div>
      </div>

      <!-- Right side: Sidebar (User PIP & Transcript) -->
      <div class="w-full h-full md:w-[28rem] flex-shrink-0 flex flex-col gap-6">
        
        <!-- User PIP Webcam -->
        <div class="h-64 md:h-72 bg-surface-container-lowest/10 rounded-3xl overflow-hidden relative border border-white/10 shadow-2xl shrink-0">
          <video 
            ref="userWebcam"
            class="w-full h-full object-cover mirror"
            autoplay 
            muted 
            playsinline 
          ></video>
          <div v-if="!cameraReady" class="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-3">
            <span class="material-symbols-outlined text-4xl animate-pulse text-white/50">videocam</span>
            <p class="text-xs font-medium text-white/50 tracking-wider">等待系统摄像头授权...</p>
          </div>
          <!-- Label -->
          <div class="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
            <p class="text-xs font-bold text-white tracking-widest uppercase">您 (患者)</p>
          </div>
        </div>

        <!-- Latest AI Transcript -->
        <div class="flex-grow bg-surface-container-lowest/10 rounded-3xl p-6 relative border border-white/10 overflow-y-auto hide-scrollbar flex flex-col-reverse shadow-inner">
           <div class="w-full">
             <h4 class="text-xs font-bold uppercase tracking-widest text-primary mb-6 flex items-center gap-2">
               <span class="material-symbols-outlined text-sm">closed_caption</span> 面诊实时字幕
             </h4>
             <div class="space-y-6">
                 <!-- Show only the recent messages that have roles 'assistant' -->
                 <div v-for="msg in recentAssistantMessages" :key="msg.id" class="text-white/90 text-[15px] leading-relaxed font-medium bg-white/5 p-4 rounded-2xl border border-white/5">
                   <span class="text-primary font-bold mr-2">主治团队:</span>
                   <span v-html="msg.content"></span>
                 </div>
                 <div v-if="recentAssistantMessages.length === 0" class="text-white/40 text-sm italic py-10 text-center bg-white/5 rounded-2xl border border-white/5">
                   网络延迟或等待录音，医生正在查阅...
                 </div>
             </div>
           </div>
        </div>

      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { useChatStore } from '../../stores/useChatStore'

const emit = defineEmits(['close'])
const chatStore = useChatStore()
const userWebcam = ref(null)
const stream = ref(null)
const cameraReady = ref(false)

// 用户的特定测试视频源
const virtualDoctorVideoSrc = 'https://res.cloudinary.com/dj2eotipq/video/upload/v1771177153/%E6%95%B0%E5%AD%97%E9%87%8D%E7%94%9F%E6%95%85%E4%BA%8B_p0brpq.mov'

// 抽取大模型回复作为实时的视频字幕，截取最新出现的医嘱内容
const recentAssistantMessages = computed(() => {
   return chatStore.messages
      .filter(m => m.role === 'assistant')
      .slice(-3)
})

async function initCamera() {
  try {
    // 拉起浏览器级别硬件授权
    stream.value = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user' }, // 优先调用前置人像摄像头
      audio: false // 在纯展示挂件中静音录制流以防干扰到 Web Speech STT 收集进程
    })
    if (userWebcam.value) {
      userWebcam.value.srcObject = stream.value
    }
    cameraReady.value = true
  } catch (err) {
    console.error('[VideoCallModal] 无法打开用户摄像头：', err)
  }
}

function stopCamera() {
  if (stream.value) {
    stream.value.getTracks().forEach(track => track.stop())
  }
}

function closeModal() {
  stopCamera()
  emit('close')
}

onMounted(() => {
  initCamera()
  document.body.style.overflow = 'hidden' // 防止背景跟随滚动
})

onBeforeUnmount(() => {
  stopCamera()
  document.body.style.overflow = ''
})
</script>

<style scoped>
@keyframes fadeIn {
  from { opacity: 0; backdrop-filter: blur(0px); }
  to { opacity: 1; backdrop-filter: blur(24px); }
}
.animate-fade-in {
  animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

/* 水平翻转摄像头变成天然的镜子行为 */
.mirror {
  transform: rotateY(180deg);
}

.hide-scrollbar::-webkit-scrollbar { display: none; }
.hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>

<template>
  <div class="bg-surface text-on-surface font-body selection:bg-primary-fixed selection:text-on-primary-fixed min-h-screen pb-28">

    <!-- TopAppBar -->
    <header class="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl shadow-sm shadow-green-900/5 flex justify-between items-center px-6 py-4">
      <div class="flex items-center gap-3 cursor-pointer" @click="router.push('/')">
        <div class="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center overflow-hidden">
          <img alt="User" class="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBplWtGRbDgN5XonaqJ4uBnQNijFmFGRyT5JeB_Qyv6sZa8QcHQtT4EnUCzTMPAgXH_OZKuMNh_B62D0fxTgIVit1uX9G5ayvo6hTO4DNCn-1usGUldpwhtQthPbffc8dVbwtxPNFEftSRjEKvFYMNZHBh0VrvjJVHlZizq89-SUdOJvt0heO6sTytgMsduZoZTk5PajipQOwubex40JpIws6F0_KxiDpJZlKI5dwNNEp0c3oKhY8HS2bUXJ0H1uYdEg-25MZSB3FfS"/>
        </div>
        <h1 class="font-headline text-2xl font-bold tracking-tight text-green-950">{{ $t('app.title') }}</h1>
      </div>

      <div class="flex items-center gap-3">
        <div class="hidden sm:flex flex-col items-end">
          <span class="text-[10px] font-bold text-primary uppercase tracking-tighter opacity-70">{{ $t('app.currentUser') }}</span>
          <span class="text-sm font-bold text-green-950">{{ userStore.displayName }}</span>
        </div>
        <button @click="handleReset" class="px-4 py-1.5 rounded-full border border-outline-variant text-sm font-semibold text-green-900 hover:opacity-80 transition-opacity active:scale-95 duration-200">
          {{ $t('app.newConsult') }}
        </button>
        <button @click="handleLogout" class="px-4 py-1.5 rounded-full border border-outline-variant text-sm font-semibold text-green-900 hover:opacity-80 transition-opacity active:scale-95 duration-200">
          {{ $t('app.logout') }}
        </button>
      </div>
    </header>

    <main class="pt-24 pb-48 px-4 md:px-8 max-w-4xl mx-auto">

      <!-- Section Header -->
      <section class="mb-10">
        <h2 class="font-headline text-4xl font-bold text-on-surface mb-2">{{ $t('chat.title') }}</h2>
        <p class="text-on-surface-variant text-lg">{{ $t('chat.subtitle') }}</p>
      </section>

      <!-- 专家面板 (Horizontal Scroll) -->
      <section class="mb-12">
        <div class="flex overflow-x-auto gap-6 pb-6 hide-scrollbar">

          <!-- Lead Doctor: General / Attending (always shown, always leader) -->
          <div class="flex-none w-36 text-center">
            <div class="relative mb-3">
              <div class="w-24 h-24 mx-auto rounded-full p-1 bg-gradient-to-tr from-primary to-secondary-container">
                <img
                  alt="Doctor avatar"
                  class="w-full h-full rounded-full object-cover bg-white"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCwBWkm7kLr2nDLwkLFeAsXpoQJAuvtsVTan93X4sHyiPxECmfo8oNZ-zIPPDIjNRS3MIXTqGBitWw5GZVx-cLsCWVC5qqx_NXC9czrvJc8pCI3hA-uuYNlP8HZ3IEiVSlEJltCORnH32WanEBItsHc8hMtSrMJRyzuoly9zmjHwEcSOHM_c7k3sYHr9mBcjpcs6Y0_s909DrHXr7QmATB7vJ2G9Wqk54o-mVgqFq6_bNbRqP3urHvhlCAuplxwa-qhJqICysPgY0z5"
                />
              </div>
              <span class="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-primary text-on-primary text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider whitespace-nowrap">{{ $t('chat.leader') }}</span>
            </div>
            <h3 class="font-bold text-on-surface text-sm">{{ getDoctorName(allDoctors.general) }}</h3>
            <p class="text-xs text-on-surface-variant">{{ $t('chat.leader') }}</p>
          </div>

          <!-- Specialist Cards — always rendered, active ring if invited -->
          <div
            v-for="(key) in ['cardiologist', 'endocrinologist', 'nutritionist']"
            :key="key"
            class="flex-none w-36 text-center"
          >
            <div class="relative mb-3">
              <!-- Active: gradient ring; Inactive: grey ring -->
              <div
                class="w-24 h-24 mx-auto rounded-full p-1 transition-all duration-500"
                :class="isInvited(key)
                  ? 'bg-gradient-to-tr from-secondary-container to-primary-container'
                  : 'bg-outline-variant/50'"
              >
                <div class="w-full h-full rounded-full bg-surface-container-high flex items-center justify-center text-4xl">
                  {{ allDoctors[key].emoji }}
                </div>
              </div>
              <!-- Active badge -->
              <span
                v-if="isInvited(key)"
                class="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-secondary-container text-on-secondary-container text-[9px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap"
              >{{ $t('chat.participating') }}</span>
            </div>
            <h3 class="font-bold text-on-surface text-sm" :class="isInvited(key) ? 'text-primary' : ''">
              {{ doctorShortName(key) }}
            </h3>
            <p class="text-xs text-on-surface-variant">{{ getDoctorName(allDoctors[key]) }}</p>
          </div>

        </div>
      </section>

      <!-- 多专家讨论流 -->
      <section ref="messageContainer" class="space-y-8 mb-20">
        <ChatBubble
          v-for="msg in chatStore.messages"
          :key="msg.id"
          :message="msg"
        />

        <!-- AI Thinking Indicator -->
        <div v-if="chatStore.isLoading || isProcessing" class="flex gap-4 animate-pulse">
          <div class="w-12 h-12 rounded-full flex-shrink-0 bg-primary-container editorial-shadow overflow-hidden flex items-center justify-center text-2xl">
            🩺
          </div>
          <div class="max-w-[85%] bg-surface-container-lowest px-6 py-5 rounded-2xl editorial-shadow border-l-4 border-primary">
            <div class="flex gap-1.5 items-center h-5">
              <div class="w-2.5 h-2.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div class="w-2.5 h-2.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div class="w-2.5 h-2.5 bg-primary rounded-full animate-bounce"></div>
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- ── Compact Bottom Input Bar (WeChat-style) ── -->
    <div class="fixed bottom-0 left-0 w-full z-50 bg-white/95 backdrop-blur-xl border-t border-surface-container-highest">
      <div class="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">

        <!-- Mic button (hold to talk) -->
        <button
          @mousedown="startVoice"
          @mouseup="stopVoice"
          @touchstart.prevent="startVoice"
          @touchend.prevent="stopVoice"
          :class="isRecording ? 'bg-error text-white scale-95' : 'bg-surface-container-high text-primary'"
          class="flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-all duration-150 active:scale-90 shadow-sm"
          :title="isRecording ? $t('chat.releaseToSend') : $t('chat.holdToTalk')"
          aria-label="Hold to talk"
        >
          <span class="material-symbols-outlined text-xl" :style="isRecording ? 'font-variation-settings:\'FILL\' 1' : ''">mic</span>
        </button>

        <!-- Video Call button (NEW) -->
        <button
          @click="showVideoModal = true"
          class="flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center bg-surface-container-high text-primary hover:bg-surface-container-highest transition-all duration-150 active:scale-90 shadow-sm"
          :title="$t('app.videoConsult') || 'Video Consult'"
          aria-label="Video Consult"
        >
          <span class="material-symbols-outlined text-xl">videocam</span>
        </button>

        <!-- Text input -->
        <input
          v-model="userInput"
          @keyup.enter="handleSendMessage"
          :placeholder="placeholder"
          class="flex-grow bg-surface-container-high border-none rounded-full px-5 py-3 focus:ring-2 focus:ring-primary/30 focus:bg-white transition-all placeholder:text-outline/40 text-sm font-body"
        />

        <!-- Send button -->
        <button
          @click="handleSendMessage"
          :disabled="!userInput.trim() || chatStore.isLoading || isProcessing"
          class="flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-all duration-150 active:scale-90 disabled:opacity-30"
          :class="userInput.trim() ? 'bg-primary text-white shadow-md' : 'bg-surface-container-high text-outline'"
          :aria-label="$t('chat.send')"
        >
          <span class="material-symbols-outlined text-xl" style="font-variation-settings:'FILL' 1">send</span>
        </button>
      </div>

      <!-- Disclaimer -->
      <p class="text-[10px] text-stone-400 font-medium tracking-wider text-center pb-3 uppercase px-6">
        {{ $t('disclaimer.shortChat') }}
      </p>
    </div>

    <!-- Bottom Nav (Desktop) -->
    <nav class="hidden md:flex fixed bottom-0 left-0 w-full justify-around items-center px-4 pt-3 pb-8 bg-white/80 backdrop-blur-2xl shadow-[0_-8px_30px_rgb(0,0,0,0.04)] z-40">
      <a @click="router.push('/')" class="flex flex-col items-center justify-center text-stone-400 px-5 py-2 cursor-pointer hover:text-primary transition-colors">
        <span class="material-symbols-outlined">home</span>
        <span class="font-sans text-[10px] font-semibold tracking-wide uppercase mt-1">{{ $t('app.home') }}</span>
      </a>
      <a @click="router.push('/ocr')" class="flex flex-col items-center justify-center text-stone-400 px-5 py-2 cursor-pointer hover:text-primary transition-colors">
        <span class="material-symbols-outlined">document_scanner</span>
        <span class="font-sans text-[10px] font-semibold tracking-wide uppercase mt-1">{{ $t('app.scan') }}</span>
      </a>
      <a class="flex flex-col items-center justify-center bg-primary-fixed/30 text-green-900 rounded-[2rem] px-5 py-2 transition-all">
        <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">medical_services</span>
        <span class="font-sans text-[10px] font-semibold tracking-wide uppercase mt-1">{{ $t('app.consult') }}</span>
      </a>
      <a @click="router.push('/history')" class="flex flex-col items-center justify-center text-stone-400 px-5 py-2 cursor-pointer hover:text-primary transition-colors">
        <span class="material-symbols-outlined">history_edu</span>
        <span class="font-sans text-[10px] font-semibold tracking-wide uppercase mt-1">{{ $t('app.records') }}</span>
      </a>
      <a @click="router.push('/settings')" class="flex flex-col items-center justify-center text-stone-400 px-5 py-2 cursor-pointer hover:text-primary transition-colors">
        <span class="material-symbols-outlined">person</span>
        <span class="font-sans text-[10px] font-semibold tracking-wide uppercase mt-1">{{ $t('app.profile') }}</span>
      </a>
    </nav>

    <!-- Video Modal Overlay -->
    <VideoCallModal v-if="showVideoModal" @close="showVideoModal = false" />

  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useChatStore } from '../stores/useChatStore'
import { useUserStore } from '../stores/useUserStore'
import ChatBubble from '../components/chat/ChatBubble.vue'
import VideoCallModal from '../components/chat/VideoCallModal.vue'
import { DOCTOR_ROLES } from '../services/ai'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const chatStore = useChatStore()
const userStore = useUserStore()
const { t, locale } = useI18n()

const userInput = ref('')
const messageContainer = ref(null)
const isProcessing = ref(false)
const isRecording  = ref(false)
const showVideoModal = ref(false)

// ── Placeholder text based on current stage ───────────────────────────────
const placeholder = computed(() => {
  if (chatStore.stage === chatStore.CONSULT_STAGES.NURSE) {
    return chatStore.messages.length === 0 ? t('chat.nursePrompt') : t('chat.nurseFollowup')
  }
  return t('chat.supplementPrompt')
})

// ── Send message (entry point for all stages) ─────────────────────────────
const handleSendMessage = async () => {
  if (!userInput.value.trim() || chatStore.isLoading || isProcessing.value) return

  const text = userInput.value
  userInput.value = ''
  isProcessing.value = true

  try {
    if (chatStore.messages.length === 0) {
      await chatStore.startNurseIntake(text)
    } else {
      await chatStore.handleUserInteraction(text)
    }
  } catch (err) {
    console.error('[ChatView] Flow interrupted:', err)
  } finally {
    await new Promise(r => setTimeout(r, 2000))
    isProcessing.value = false
  }
}

// ── Reset consultation ────────────────────────────────────────────────────
async function handleReset() {
  if (confirm(t('chat.resetConfirm'))) {
    chatStore.resetConsult()
  }
}

// ── Logout ────────────────────────────────────────────────────────────────
async function handleLogout() {
  console.log('[ChatView] Logging out...')
  try {
    await userStore.logout()
  } catch (err) {
    console.error('Logout error:', err)
  }
  // Redirect to login regardless
  router.push('/login')
}

// ── Auto-scroll on new messages ───────────────────────────────────────────
watch(() => chatStore.messages.length, async () => {
  await nextTick()
  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
})

// ── All doctors (always rendered in panel) ────────────────────────────────
const allDoctors = DOCTOR_ROLES

// Whether a specialist key is currently invited into this consultation
function isInvited(key) {
  return chatStore.context?.invited_roles?.includes(key)
}

function getDoctorName(docInfo) {
  return locale.value === 'en' ? docInfo.name_en : docInfo.name_zh
}

// Short display names for the panel
function doctorShortName(key) {
  if (locale.value === 'en') {
     return allDoctors[key].name_en.split(' ')[1] // Gets the last name e.g. "Smith" from "Dr. Smith"
  }
  const shortNamesZh = {
    cardiologist:   '王医生',
    endocrinologist: '张医生',
    nutritionist:   '陈营养师',
  }
  return shortNamesZh[key] || allDoctors[key].name_zh
}

// ── Voice hooks (UI only — STT service handles actual recording) ──────────
const startVoice = () => { isRecording.value = true  /* Hook for STT service */ }
const stopVoice  = () => { isRecording.value = false /* Hook for STT service */ }
</script>

<style scoped>
.editorial-shadow {
  box-shadow: 0 24px 48px rgba(27, 28, 25, 0.06);
}
.glass-panel {
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}
.hide-scrollbar::-webkit-scrollbar { display: none; }
.hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>

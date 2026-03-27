<script setup>
import { computed } from 'vue'

const props = defineProps({
  message: { type: Object, required: true }
})

const isUser    = computed(() => props.message.role === 'user')
const isSummary = computed(() => props.message.meta?.stage === 'summary')
const isSystem  = computed(() => props.message.role === 'system')

// Left-border accent colour per stage / role
const borderColor = computed(() => {
  const stage = props.message.meta?.stage
  if (stage === 'summary')    return 'border-primary'
  if (stage === 'consulting') return 'border-tertiary-container'
  if (props.message.role === 'nurse') return 'border-primary-fixed-dim'
  return 'border-secondary'
})

// Doctor name label colour
const nameColor = computed(() => {
  const stage = props.message.meta?.stage
  if (stage === 'consulting') return 'text-tertiary'
  if (props.message.role === 'nurse') return 'text-primary'
  return 'text-secondary'
})
</script>

<template>
  <!-- ── System Status Badge ── -->
  <div v-if="isSystem" class="flex justify-center my-4">
    <div class="bg-surface-container-high text-on-surface-variant px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest flex items-center gap-2 editorial-shadow">
      <span class="material-symbols-outlined text-xs" style="font-variation-settings:'FILL' 1;">info</span>
      {{ message.content }}
    </div>
  </div>

  <!-- ── User Bubble (right-aligned) ── -->
  <div v-else-if="isUser" class="flex justify-end">
    <div class="max-w-[80%] bg-surface-container-high px-6 py-4 rounded-xl editorial-shadow">
      <p class="text-on-surface text-lg leading-relaxed font-body">"{{ message.content }}"</p>
      <div class="mt-2 flex items-center gap-2 text-primary font-semibold text-sm">
        <span class="material-symbols-outlined text-sm" style="font-variation-settings:'FILL' 1;">check_circle</span>
        <span>{{ $t('chat.sent') }}</span>
      </div>
    </div>
  </div>

  <!-- ── Lead Doctor Summary Card ── -->
  <div v-else-if="isSummary" class="flex gap-4 w-full">
    <div class="w-12 h-12 rounded-full flex-shrink-0 bg-primary-container editorial-shadow overflow-hidden flex items-center justify-center text-2xl">
      {{ message.meta?.emoji || '📋' }}
    </div>
    <div class="max-w-[85%] bg-primary-container px-6 py-5 rounded-2xl editorial-shadow">
      <h4 class="font-headline font-bold text-on-primary-container mb-3 text-lg">
        {{ message.meta?.doctorName || `${$t('chat.leader')} Summary` }}
      </h4>
      <div class="font-body leading-relaxed text-on-primary-container opacity-90 whitespace-pre-wrap">
        {{ message.content }}
      </div>
    </div>
  </div>

  <!-- ── Standard Expert Bubble (left-aligned with avatar) ── -->
  <div v-else class="flex gap-4 w-full">
    <div class="w-12 h-12 rounded-full flex-shrink-0 bg-surface-container-lowest editorial-shadow border border-outline-variant/20 overflow-hidden flex items-center justify-center text-2xl">
      {{ message.meta?.emoji || '🩺' }}
    </div>
    <div class="max-w-[85%] bg-surface-container-lowest px-6 py-5 rounded-2xl editorial-shadow border-l-4" :class="borderColor">
      <h4 class="font-headline font-bold mb-2 text-lg" :class="nameColor">
        {{ message.meta?.doctorName || 'AI Expert' }}
      </h4>
      <div class="font-body text-on-surface leading-relaxed whitespace-pre-wrap">
        {{ message.content }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.editorial-shadow {
  box-shadow: 0 24px 48px rgba(27, 28, 25, 0.06);
}
</style>

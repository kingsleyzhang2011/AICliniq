<template>
  <div class="bg-surface font-body text-on-surface min-h-screen flex flex-col">
    <!-- Back Navigation -->
    <nav class="fixed top-0 left-0 w-full px-6 py-8 z-50">
      <div class="max-w-7xl mx-auto flex justify-start">
        <a @click="router.push('/')" class="flex items-center gap-2 text-primary font-bold hover:opacity-80 transition-all group cursor-pointer">
          <span class="material-symbols-outlined transition-transform group-hover:-translate-x-1">arrow_back</span>
          <span class="text-sm font-bold">{{ $t('app.home') }}</span>
        </a>
      </div>
    </nav>

    <main class="flex-grow flex items-center justify-center px-4 py-20 relative overflow-hidden">
      <!-- Abstract Botanical Background -->
      <div class="absolute -top-24 -right-24 w-96 h-96 bg-primary-fixed-dim/20 rounded-full blur-3xl pointer-events-none"></div>
      <div class="absolute -bottom-24 -left-24 w-96 h-96 bg-secondary-fixed/20 rounded-full blur-3xl pointer-events-none"></div>

      <section class="w-full max-w-xl z-10 animate-fade-in">
        <!-- Brand Center -->
        <div class="text-center mb-10">
          <div class="inline-flex items-center justify-center w-16 h-16 bg-primary-container rounded-xl mb-6 botanical-shadow">
            <span class="material-symbols-outlined text-on-primary-container text-4xl" style="font-variation-settings: 'FILL' 1;">spa</span>
          </div>
          <h1 class="font-headline text-5xl font-extrabold tracking-tighter text-primary mb-2">{{ $t('app.title') }}</h1>
          <p class="font-body text-lg text-outline font-medium">{{ $t('app.subtitle') }}</p>
        </div>

        <!-- Login Container -->
        <div class="bg-surface-container-low rounded-xl p-8 md:p-12 botanical-shadow border border-outline-variant/10">

          <!-- ── Mandatory Disclaimer Gate ── -->
          <div class="mb-8 p-4 bg-primary/5 rounded-lg border border-primary/10">
            <label class="flex items-start gap-4 cursor-pointer group">
              <input
                type="checkbox"
                v-model="agreedToDisclaimer"
                class="mt-1 w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary-container transition-all"
              />
              <span class="text-xs text-on-surface leading-relaxed font-semibold group-hover:text-primary transition-colors">
                {{ $t('disclaimer.shortAuth') }}
              </span>
            </label>
          </div>

          <!-- ── Email Section ── -->
          <form @submit.prevent="handleEmailSubmit" class="space-y-6">
            <div class="space-y-2">
              <label class="block font-label text-label-md font-bold text-on-surface px-1">{{ $t('auth.emailLabel') }}</label>
              <input
                v-model="email"
                type="email"
                required
                :disabled="!agreedToDisclaimer || loading"
                class="w-full bg-surface-container-high border-none rounded-md px-6 py-4 focus:ring-2 focus:ring-primary-container transition-all placeholder:text-outline/50 font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                :placeholder="$t('auth.emailPlaceholder')"
              />
            </div>
            <div v-if="showPassword" class="space-y-2">
              <label class="block font-label text-label-md font-bold text-on-surface px-1">{{ $t('auth.passwordLabel') }}</label>
              <input
                v-model="password"
                type="password"
                required
                :disabled="!agreedToDisclaimer || loading"
                class="w-full bg-surface-container-high border-none rounded-md px-6 py-4 focus:ring-2 focus:ring-primary-container transition-all placeholder:text-outline/50 font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                :placeholder="$t('auth.passwordPlaceholder')"
              />
            </div>
            <button
              type="submit"
              :disabled="!agreedToDisclaimer || loading || !email.trim()"
              class="w-full bg-gradient-to-br from-primary to-primary-container text-on-primary font-bold py-4 rounded-xl text-lg hover:opacity-90 transition-all botanical-shadow active:scale-[0.98] disabled:opacity-40 disabled:grayscale disabled:cursor-not-allowed"
            >
              {{ loading && activeMethod === 'email' ? $t('app.loading') : $t('auth.continueEmail') }}
            </button>
            <div class="flex justify-center">
              <button type="button" @click="togglePasswordMode" class="text-xs text-outline hover:text-primary transition-colors font-bold underline underline-offset-4">
                {{ showPassword ? $t('auth.toggleMagicLink') : $t('auth.togglePassword') }}
              </button>
            </div>
          </form>

          <!-- Feedback -->
          <p v-if="errorMsg" class="text-error text-center text-xs font-bold mt-4 p-2 bg-error/5 rounded-lg">{{ errorMsg }}</p>
          <p v-if="successMsg" class="text-primary text-center text-xs font-bold mt-4 p-2 bg-primary/5 rounded-lg">{{ successMsg }}</p>

          <!-- Divider -->
          <div class="relative my-8 flex items-center">
            <div class="flex-grow border-t border-outline-variant/30"></div>
            <span class="flex-shrink mx-4 text-outline text-label-md font-bold uppercase tracking-widest">{{ $t('auth.or') }}</span>
            <div class="flex-grow border-t border-outline-variant/30"></div>
          </div>

          <!-- ── Phone OTP Section ── -->
          <div class="space-y-6">
            <div class="space-y-4">
              <label class="block font-label text-label-md font-bold text-on-surface px-1">{{ $t('auth.phoneLabel') }}</label>

              <!-- Step 1: Enter phone -->
              <div v-if="!otpSent" class="flex gap-2">
                <div class="relative shrink-0">
                  <button
                    type="button"
                    @click="showCountryDropdown = !showCountryDropdown"
                    :disabled="!agreedToDisclaimer || loading"
                    class="h-full bg-surface-container-high px-4 rounded-md flex items-center gap-2 text-on-surface font-bold hover:bg-surface-container-highest transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span class="text-sm">{{ selectedCountry.flag }} {{ selectedCountry.code }}</span>
                    <span class="material-symbols-outlined text-sm">expand_more</span>
                  </button>
                  <!-- Country Dropdown -->
                  <div v-if="showCountryDropdown" class="absolute top-full mt-2 left-0 w-48 bg-surface-container-lowest rounded-md shadow-2xl border border-outline-variant/20 z-20 overflow-hidden">
                    <div
                      v-for="c in countries" :key="c.label"
                      @click="selectedCountry = c; showCountryDropdown = false"
                      class="px-4 py-3 hover:bg-surface-container-low cursor-pointer flex items-center gap-3"
                    >
                      <span class="text-xs">{{ c.flag }}</span>
                      <span class="text-sm font-medium">{{ c.label }} {{ c.code }}</span>
                    </div>
                  </div>
                </div>
                <div class="flex-grow">
                  <input
                    v-model="phone"
                    type="tel"
                    :disabled="!agreedToDisclaimer || loading"
                    class="w-full bg-surface-container-high border-none rounded-md px-6 py-4 focus:ring-2 focus:ring-primary-container transition-all placeholder:text-outline/50 font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                    :placeholder="$t('auth.phonePlaceholder')"
                  />
                </div>
              </div>

              <!-- Step 2: Enter OTP code -->
              <div v-if="otpSent" class="space-y-3">
                <p class="text-xs text-outline font-bold px-1">
                  OTP sent to <strong>{{ selectedCountry.code }} {{ phone }}</strong>
                </p>
                <input
                  v-model="otp"
                  type="text"
                  maxlength="6"
                  inputmode="numeric"
                  :disabled="loading"
                  class="w-full bg-surface-container-high border-none rounded-md px-6 py-4 focus:ring-2 focus:ring-primary-container transition-all placeholder:text-outline/50 font-medium tracking-[0.5em] text-center text-xl"
                  placeholder="------"
                />
                <button type="button" @click="otpSent = false; otp = ''" class="text-xs text-outline hover:text-primary transition-colors font-bold underline underline-offset-4">
                  Reset
                </button>
              </div>

              <button
                type="button"
                @click="otpSent ? handleVerifyOtp() : handleSendOtp()"
                :disabled="!agreedToDisclaimer || loading || (!otpSent && !phone.trim()) || (otpSent && otp.length < 6)"
                class="w-full bg-surface-container-highest text-primary font-bold py-4 rounded-xl text-lg hover:bg-primary-fixed-dim transition-all active:scale-[0.98] disabled:opacity-40 disabled:grayscale disabled:cursor-not-allowed"
              >
                {{ loading && activeMethod === 'phone' ? $t('app.loading') : (otpSent ? $t('auth.verifyOtp') : $t('auth.sendOtp')) }}
              </button>
            </div>

            <!-- ── Google OAuth ── -->
            <button
              type="button"
              @click="handleGoogleLogin"
              :disabled="!agreedToDisclaimer || loading"
              class="w-full bg-surface-container-lowest text-on-surface border border-outline-variant/20 font-bold py-4 rounded-xl flex items-center justify-center gap-3 hover:bg-surface-bright transition-colors active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <img alt="Google" class="w-5 h-5" src="https://lh3.googleusercontent.com/aida-public/AB6AXuByvdVbYLKAcmJrCgglEM_xzieY4rfoFiCTWbnDuUUJtdnN4cjjdxR3depeMe7FqeEAcTbzBb6vr3Wgs9G4ewCH245Wqhc5Qzi-rO0RTSoNWjklEA9bIeTEAfLUwljy0eUxaUhnAYNrzvGk8osOm8KymcAcQsEOJgcn1CC8lQ17--PDDhUnfcHoAfdG1j53-IDyKsXtTXBYDk-Ynru27l3ogNmXr5fcbZdvgDLknI0-4GYJHdErUuSy5aHUdXlceH3M48JHm9zqmLPN"/>
              <span>{{ loading && activeMethod === 'google' ? $t('app.loading') : $t('auth.googleLogin') }}</span>
            </button>
          </div>

          <!-- Assistance Links -->
          <div class="mt-10 text-center space-y-4">
            <p class="text-outline text-body-md font-medium">
              {{ $t('auth.noAccount') }}
              <button @click="showPassword = true; isSignup = true" class="text-primary font-extrabold hover:underline underline-offset-4 ml-1">{{ $t('auth.signup') }}</button>
            </p>
            <div class="flex justify-center gap-6 text-label-md text-outline/80 font-bold">
              <a class="hover:text-primary transition-colors cursor-pointer">FAQ</a>
              <span class="opacity-30">•</span>
              <a class="hover:text-primary transition-colors cursor-pointer">{{ $t('footer.privacy') }}</a>
            </div>
          </div>
        </div>

        <!-- Accessibility Note -->
        <div class="mt-12 flex items-start gap-4 p-6 bg-primary-container/5 rounded-lg border border-primary-container/10">
          <span class="material-symbols-outlined text-primary" style="font-variation-settings: 'FILL' 1;">info</span>
          <p class="text-body-md text-on-surface font-medium leading-relaxed">
            {{ $t('auth.helpInfo') }}
          </p>
        </div>
      </section>
    </main>

    <!-- Footer -->
    <footer class="w-full border-t border-stone-200 flex flex-col md:flex-row justify-between items-center gap-8 py-12 px-6 bg-surface">
      <div class="text-lg font-extrabold text-primary">{{ $t('app.title') }}</div>
      <div class="flex flex-wrap justify-center gap-8">
        <a class="font-medium text-sm text-outline hover:text-primary transition-colors cursor-pointer">{{ $t('footer.privacy') }}</a>
        <a class="font-medium text-sm text-outline hover:text-primary transition-colors cursor-pointer">{{ $t('footer.terms') }}</a>
        <a class="font-medium text-sm text-outline hover:text-primary transition-colors cursor-pointer">{{ $t('footer.logs') }}</a>
        <a class="font-medium text-sm text-outline hover:text-primary transition-colors cursor-pointer">{{ $t('footer.contact') }}</a>
      </div>
      <div class="font-medium text-sm text-outline">{{ $t('footer.copyright') }}</div>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '../stores/useUserStore'
import { supabase } from '../services/supabase'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

// ── UI State ─────────────────────────────────────────────────────────────
const agreedToDisclaimer = ref(false)
const loading = ref(false)
const activeMethod = ref('') // 'email' | 'phone' | 'google'
const errorMsg = ref('')
const successMsg = ref('')

// ── Email Auth ────────────────────────────────────────────────────────────
const email = ref('')
const password = ref('')
const showPassword = ref(false)  // false = magic link mode, true = password mode
const isSignup = ref(false)

// ── Phone OTP ─────────────────────────────────────────────────────────────
const phone = ref('')
const otp = ref('')
const otpSent = ref(false)
const showCountryDropdown = ref(false)
const countries = [
  { flag: '🇨🇳', code: '+86',  label: 'CN' },
  { flag: '🇺🇸', code: '+1',   label: 'US' },
  { flag: '🇭🇰', code: '+852', label: 'HK' },
  { flag: '🇨🇦', code: '+1',   label: 'CA' },
  { flag: '🇦🇺', code: '+61',  label: 'AU' },
  { flag: '🇬🇧', code: '+44',  label: 'GB' },
]
const selectedCountry = ref(countries[0])

// ── Helpers ───────────────────────────────────────────────────────────────
function clear() {
  errorMsg.value = ''
  successMsg.value = ''
}

function redirectAfterLogin() {
  const redirect = route.query.redirect || '/home'
  router.push(redirect)
}

function togglePasswordMode() {
  showPassword.value = !showPassword.value
  if (!showPassword.value) isSignup.value = false
}

// ── Email: magic link OR password login/signup ────────────────────────────
async function handleEmailSubmit() {
  if (!agreedToDisclaimer.value) return
  clear()
  loading.value = true
  activeMethod.value = 'email'

  try {
    if (showPassword.value) {
      if (isSignup.value) {
        await userStore.signup(email.value, password.value)
        successMsg.value = 'Success. Please check email to verify.'
      } else {
        await userStore.login(email.value, password.value)
        redirectAfterLogin()
      }
    } else {
      // Passwordless — send magic link
      const { error } = await supabase.auth.signInWithOtp({
        email: email.value,
        options: { emailRedirectTo: window.location.origin }
      })
      if (error) throw error
      successMsg.value = `✅ Magic link sent to ${email.value}.`
    }
  } catch (err) {
    errorMsg.value = err.message || 'Error occurred'
  } finally {
    loading.value = false
    activeMethod.value = ''
  }
}

// ── Phone: send OTP ───────────────────────────────────────────────────────
async function handleSendOtp() {
  if (!agreedToDisclaimer.value) return
  clear()
  loading.value = true
  activeMethod.value = 'phone'

  // Strip leading zero and combine with country code
  const fullPhone = `${selectedCountry.value.code}${phone.value.replace(/^0+/, '')}`
  try {
    const { error } = await supabase.auth.signInWithOtp({ phone: fullPhone })
    if (error) throw error
    otpSent.value = true
    successMsg.value = 'OTP sent.'
  } catch (err) {
    errorMsg.value = err.message || 'OTP send failed.'
  } finally {
    loading.value = false
    activeMethod.value = ''
  }
}

// ── Phone: verify OTP ─────────────────────────────────────────────────────
async function handleVerifyOtp() {
  if (!agreedToDisclaimer.value) return
  clear()
  loading.value = true
  activeMethod.value = 'phone'

  const fullPhone = `${selectedCountry.value.code}${phone.value.replace(/^0+/, '')}`
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      phone: fullPhone,
      token: otp.value,
      type: 'sms'
    })
    if (error) throw error
    // Push session into Pinia store
    if (data?.user) {
      userStore.user = data.user
      await userStore.fetchProfile()
    }
    redirectAfterLogin()
  } catch (err) {
    errorMsg.value = err.message || 'OTP incorrect'
  } finally {
    loading.value = false
    activeMethod.value = ''
  }
}

// ── Google OAuth ──────────────────────────────────────────────────────────
async function handleGoogleLogin() {
  if (!agreedToDisclaimer.value) return
  clear()
  loading.value = true
  activeMethod.value = 'google'

  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin // 简化重定向路径，依靠 onMounted 的 redirectLogic 处理后续跳转
      }
    })
    if (error) throw error
    // Browser will redirect to Google — stay loading
  } catch (err) {
    loading.value = false
    activeMethod.value = ''
    errorMsg.value = err.message || 'Google login failed'
  }
}

// ── Handle OAuth / magic-link callback on mount ───────────────────────────
onMounted(async () => {
  // 检查是否已经通过 main.js -> userStore.init() 恢复了 session
  if (userStore.isLoggedIn) {
     redirectAfterLogin()
     return
  }
  
  // 备选：如果 init 慢了，或者从 OAuth 回来，再次尝试显式恢复
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.user) {
    userStore.user = session.user
    await userStore.fetchProfile()
    redirectAfterLogin()
  }
})
</script>

<style scoped>
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
.animate-fade-in {
  animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
</style>

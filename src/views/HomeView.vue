<template>
  <div class="bg-surface text-on-surface font-body selection:bg-primary-fixed selection:text-on-primary-fixed">
    <!-- TopAppBar -->
    <nav class="fixed top-0 w-full z-50 glass-nav transition-colors duration-500">
      <div class="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <div class="flex items-center gap-3 cursor-pointer" @click="handleNavigate('/home')">
          <span class="material-symbols-outlined text-primary text-3xl" style="font-variation-settings: 'FILL' 1;">spa</span>
          <span class="font-headline font-bold text-xl text-primary tracking-tighter">{{ $t('app.title') }}</span>
        </div>
        
        <!-- Desktop Nav -->
        <div class="hidden md:flex items-center gap-10">
          <a class="text-primary font-bold transition-all hover:text-primary-container cursor-pointer" @click="handleNavigate('/home')">{{ $t('app.home') }}</a>
          <a class="text-primary/70 font-medium transition-all hover:text-primary cursor-pointer" @click="handleNavigate('/chat')">{{ $t('app.consult') }}</a>
          <a class="text-primary/70 font-medium transition-all hover:text-primary cursor-pointer" @click="handleNavigate('/history')">{{ $t('app.records') }}</a>
          <a class="text-primary/70 font-medium transition-all hover:text-primary cursor-pointer" @click="handleNavigate('/settings')">{{ $t('app.about') }}</a>
        </div>

        <div class="flex items-center gap-6">
          <div class="flex bg-surface-container-high rounded-full p-1 items-center">
            <button 
              @click="userStore.setLanguage('zh')"
              :class="locale === 'zh' ? 'bg-white text-primary shadow-sm font-bold' : 'text-outline font-medium'"
              class="px-3 py-1 text-xs rounded-full transition-all"
            >CN</button>
            <button 
              @click="userStore.setLanguage('en')"
              :class="locale === 'en' ? 'bg-white text-primary shadow-sm font-bold' : 'text-outline font-medium'"
              class="px-3 py-1 text-xs rounded-full transition-all"
            >EN</button>
          </div>
          
          <div v-if="userStore.isLoggedIn" class="flex items-center gap-4">
            <span class="text-sm font-bold text-primary hidden sm:block">
              {{ userStore.displayName }}
            </span>
            <button 
              @click="handleLogout"
              class="bg-surface-container-highest text-primary px-4 py-2 rounded-xl font-bold text-xs transition-all active:scale-[0.98] border border-outline-variant/30"
            >
              {{ $t('app.logout') }}
            </button>
          </div>
          <button 
            v-else
            @click="handleNavigate('/chat')"
            class="gradient-primary text-on-primary px-8 py-2.5 rounded-xl font-bold transition-all active:scale-[0.98] botanical-shadow"
          >
            {{ $t('app.login') }}
          </button>
        </div>
      </div>
    </nav>

    <main class="pt-24 overflow-x-hidden">
      <!-- Prominent Disclaimer at Top -->
      <section class="max-w-7xl mx-auto px-6 pt-8 pb-4">
        <div class="bg-primary/5 border-2 border-primary/20 rounded-xl p-8 flex flex-col md:flex-row items-center gap-8 shadow-md">
          <div class="flex-shrink-0 w-16 h-16 rounded-full bg-white flex items-center justify-center text-error border-2 border-error/20 shadow-lg animate-pulse">
            <span class="material-symbols-outlined text-3xl font-bold">warning</span>
          </div>
          <div class="flex-grow text-center md:text-left">
            <h2 class="text-primary font-extrabold text-2xl mb-2 flex items-center justify-center md:justify-start gap-2">
              <span class="bg-error text-white text-[10px] px-2 py-0.5 rounded-sm uppercase tracking-tighter">{{ $t('disclaimer.tag') }}</span>
              {{ $t('disclaimer.title') }}
            </h2>
            <p class="text-outline text-md font-medium leading-relaxed italic pr-4" v-html="$t('disclaimer.content')"></p>
          </div>
        </div>
      </section>

      <!-- Hero Section -->
      <section class="max-w-7xl mx-auto px-6 py-12 md:py-24 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div class="lg:col-span-7 space-y-8 animate-fade-in">
          <div class="inline-flex items-center gap-2 px-4 py-2 bg-primary-fixed/30 rounded-full">
            <span class="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            <span class="text-sm font-semibold text-primary">{{ $t('app.subtitle') }}</span>
          </div>
          <h1 class="text-5xl md:text-7xl font-headline font-extrabold text-primary leading-[1.1] tracking-tight">
            {{ $t('home.heroTitle') }}<br>
            <span class="text-primary/60 font-light">{{ $t('home.heroTitleHighlight') }}</span>
          </h1>
          <p class="text-xl text-outline max-w-2xl leading-relaxed">
            {{ $t('home.heroDesc') }}
          </p>
          <div class="flex flex-col sm:flex-row gap-4 pt-4">
            <button 
              @click="handleNavigate('/chat')"
              class="gradient-primary text-on-primary px-10 py-5 rounded-xl text-lg font-bold flex items-center justify-center gap-3 botanical-shadow group active:scale-[0.98] transition-all"
            >
              {{ $t('home.startBtn') }}
              <span class="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </button>
          </div>
        </div>

        <div class="lg:col-span-5 relative animate-fade-in" style="animation-delay: 0.2s">
          <div class="aspect-square rounded-xl overflow-hidden botanical-shadow relative z-10">
            <img alt="Medical AI" class="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAvaT5sRQB3NYezQzue_FMuJQjpsZ3SmsbfHEhltLBeEH5ps43MRrwajBvG6PxTKpqBrBR4zLFO2VwTG0i-Re3iMETuw7ozD6MwEkDCsp6wjH8zwGsBv7WD24kCufDFeOM8Dsok2tlaphbHurgn16599NcNE2GBxITQL5LY6qwl_vtk_1x4wO9tbIisIlfjHtP1CjORn3VWq1fzOjtzjlgxEBMCaAnsDDAHm8akOKA7yhZjaK-jn4WlBBVM4-WGni9r_7y9WwGBw6l5">
          </div>
          <!-- Asymmetric Floating Card -->
          <div class="absolute -bottom-10 -left-10 bg-white/80 backdrop-blur-xl p-8 rounded-xl botanical-shadow z-20 max-w-xs border border-white/50 hidden md:block">
            <div class="flex items-center gap-4 mb-4">
              <div class="w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container">
                <span class="material-symbols-outlined">clinical_notes</span>
              </div>
              <div>
                <p class="text-xs text-outline font-bold uppercase tracking-widest">{{ $t('app.scan') }}</p>
                <p class="font-bold text-primary">{{ $t('app.loading') }}</p>
              </div>
            </div>
            <div class="space-y-2">
              <div class="h-2 w-full bg-surface-container rounded-full overflow-hidden text-clip">
                <div class="h-full bg-primary w-3/4"></div>
              </div>
              <p class="text-xs text-outline italic">“{{ $t('app.loading') }}”</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Bento Grid Features -->
      <section class="bg-surface-container-low py-32">
        <div class="max-w-7xl mx-auto px-6">
          <div class="mb-20 text-center max-w-3xl mx-auto">
            <h2 class="text-4xl font-headline font-bold text-primary mb-6">{{ $t('home.heroTitleHighlight') }}</h2>
            <p class="text-outline text-lg">{{ $t('home.heroDesc') }}</p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-12 gap-6 h-auto md:h-[800px]">
            <!-- Large Feature: Multi-expert debate -->
            <div 
              @click="handleNavigate('/chat')"
              class="md:col-span-8 bg-surface-container-lowest rounded-xl p-10 flex flex-col justify-between botanical-shadow group cursor-pointer hover:ring-2 hover:ring-primary/10 transition-all"
            >
              <div class="max-w-md">
                <div class="w-16 h-16 rounded-full bg-primary-fixed/40 flex items-center justify-center mb-8">
                  <span class="material-symbols-outlined text-primary text-3xl">groups</span>
                </div>
                <h3 class="text-3xl font-bold text-primary mb-4">{{ $t('home.features.team.title') }}</h3>
                <p class="text-outline leading-relaxed">{{ $t('home.features.team.desc') }}</p>
              </div>
              <div class="mt-12 rounded-lg overflow-hidden relative min-h-48 md:min-h-0">
                <img alt="Consultation" class="w-full h-full object-cover grayscale opacity-20 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700" src="https://lh3.googleusercontent.com/aida-public/AB6AXuABT8smetXulvfwRA4afbzs28NmOnxKO4TZccUwx8nuPZKldd4Z3TDbNS9NW2HnGUUt8uJKQCCmqpPSH0pcEeRfpgS5hLkstchVqAeVFJfpx0WzcX33jEH3wT9dXhatCK7gbWlDuMT5Gi_GRTXdL3dvH-JymPpXiVr4utp9O_OtYXwoAPGwSX7KC5hOL-nGXd5kxg_shs9ed52C6n83L8SpPdqFLChFPk1KACvMEE0ZaBWrFQJHFnS0Y1aflrTp9k1QeSbUjlXT2ial">
              </div>
            </div>

            <!-- Right Column -->
            <div class="md:col-span-4 flex flex-col gap-6">
              <!-- Feature: Lab Scan -->
              <div 
                @click="handleNavigate('/ocr')"
                class="flex-1 bg-primary text-on-primary rounded-xl p-8 botanical-shadow cursor-pointer hover:scale-[1.02] transition-transform"
              >
                <span class="material-symbols-outlined text-4xl mb-6">document_scanner</span>
                <h3 class="text-2xl font-bold mb-3">{{ $t('app.scan') }}</h3>
                <p class="text-primary-fixed-dim text-sm leading-relaxed">{{ $t('home.features.record.desc') }}</p>
              </div>
              <!-- Feature: Health Trends -->
              <div 
                @click="handleNavigate('/history')"
                class="flex-1 bg-surface-container-highest rounded-xl p-8 botanical-shadow overflow-hidden relative cursor-pointer hover:scale-[1.02] transition-transform"
              >
                <div class="relative z-10">
                  <span class="material-symbols-outlined text-4xl mb-6 text-primary">monitoring</span>
                  <h3 class="text-2xl font-bold text-primary mb-3">{{ $t('home.features.record.title') }}</h3>
                  <p class="text-outline text-sm leading-relaxed">{{ $t('home.features.record.desc') }}</p>
                </div>
                <div class="absolute bottom-0 right-0 left-0 h-24 bg-gradient-to-t from-primary/10 to-transparent"></div>
              </div>
            </div>

            <!-- Bottom Features -->
            <div class="md:col-span-4 bg-white rounded-xl p-8 botanical-shadow">
              <span class="material-symbols-outlined text-3xl text-secondary mb-4">folder_managed</span>
              <h4 class="text-xl font-bold text-primary mb-2">{{ $t('home.features.record.title') }}</h4>
              <p class="text-outline text-sm">{{ $t('home.features.record.desc') }}</p>
            </div>
            <div class="md:col-span-4 bg-white rounded-xl p-8 botanical-shadow">
              <span class="material-symbols-outlined text-3xl text-primary mb-4">self_care</span>
              <h4 class="text-xl font-bold text-primary mb-2">{{ $t('home.features.privacy.title') }}</h4>
              <p class="text-outline text-sm">{{ $t('home.features.privacy.desc') }}</p>
            </div>
            <div class="md:col-span-4 bg-white rounded-xl p-8 botanical-shadow">
              <span class="material-symbols-outlined text-3xl text-tertiary mb-4">notifications_active</span>
              <h4 class="text-xl font-bold text-primary mb-2">{{ $t('app.consult') }}</h4>
              <p class="text-outline text-sm">{{ $t('home.features.team.desc') }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Footer -->
      <footer class="bg-surface py-20 px-6 border-t border-stone-200">
        <div class="max-w-7xl mx-auto text-on-surface">
          <div class="flex flex-col md:flex-row justify-between items-start gap-12 mb-16">
            <div class="space-y-6">
              <div class="flex items-center gap-3">
                <span class="material-symbols-outlined text-primary text-2xl">spa</span>
                <span class="font-headline font-bold text-lg text-primary tracking-tighter">{{ $t('app.title') }}</span>
              </div>
              <p class="text-outline max-w-xs font-light">{{ $t('home.heroDesc') }}</p>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-12">
              <div class="space-y-4">
                <p class="font-bold text-primary">{{ $t('app.title') }}</p>
                <ul class="space-y-2 text-sm text-outline font-light">
                  <li><a @click="handleNavigate('/chat')" class="hover:text-primary transition-colors cursor-pointer">{{ $t('app.consult') }}</a></li>
                  <li><a @click="handleNavigate('/history')" class="hover:text-primary transition-colors cursor-pointer">{{ $t('app.records') }}</a></li>
                  <li><a class="hover:text-primary transition-colors cursor-pointer">Wellness Journal</a></li>
                </ul>
              </div>
              <div class="space-y-4">
                <p class="font-bold text-primary">{{ $t('app.profile') }}</p>
                <ul class="space-y-2 text-sm text-outline font-light">
                  <li><a class="hover:text-primary transition-colors cursor-pointer text-clip">FAQ</a></li>
                  <li><a class="hover:text-primary transition-colors cursor-pointer">{{ $t('footer.contact') }}</a></li>
                </ul>
              </div>
              <div class="space-y-4">
                <p class="font-bold text-primary">{{ $t('app.about') }}</p>
                <ul class="space-y-2 text-sm text-outline font-light">
                  <li><a class="hover:text-primary transition-colors cursor-pointer text-clip">{{ $t('footer.privacy') }}</a></li>
                  <li><a class="hover:text-primary transition-colors cursor-pointer text-clip">{{ $t('footer.terms') }}</a></li>
                </ul>
              </div>
            </div>
          </div>
          <div class="pt-12 border-t border-stone-100 flex flex-col md:flex-row justify-between items-center gap-4">
            <p class="text-outline text-xs font-light">{{ $t('footer.copyright') }}</p>
            <div class="flex gap-6">
              <span class="material-symbols-outlined text-primary/40 hover:text-primary cursor-pointer">public</span>
              <span class="material-symbols-outlined text-primary/40 hover:text-primary cursor-pointer">verified_user</span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/useUserStore'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const userStore = useUserStore()
const { locale } = useI18n()

/**
 * Handle navigation with auth check
 * User wants to be prompted for login only when clicking features.
 */
function handleNavigate(path) {
  if (path === '/home') {
    router.push('/')
    return
  }

  // If already logged in, go to the feature
  if (userStore.isLoggedIn) {
    router.push(path)
  } else {
    // If not logged in, redirect to login
    router.push({
      path: '/login',
      query: { redirect: path }
    })
  }
}

/**
 * Handle user logout
 */
async function handleLogout() {
  try {
    await userStore.logout()
    // Session is cleared, UI updates automatically via userStore.isLoggedIn
  } catch (err) {
    console.error('Logout failed:', err)
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

/* Custom scrollbar handling for the expert panel or feature grid on mobile */
.hide-scrollbar::-webkit-scrollbar {
  display: none;
}
.hide-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>

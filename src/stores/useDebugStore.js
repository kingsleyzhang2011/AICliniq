import { defineStore } from 'pinia'

export const useDebugStore = defineStore('debug', {
  actions: {
    checkKeys() {
      console.log('--- LifeGuard Debug System ---')
      const keys = {
        gemini: import.meta.env.VITE_GEMINI_KEY,
        groq: import.meta.env.VITE_GROQ_KEY,
        siliconflow: import.meta.env.VITE_SILICONFLOW_KEY
      }
      
      Object.entries(keys).forEach(([p, k]) => {
        if (!k) {
          console.warn(`[LifeGuard] ${p} key is missing!`)
        } else {
          console.log(`[LifeGuard] ${p} exists: ${k.substring(0, 4)}...${k.substring(k.length - 4)} (Length: ${k.length})`)
        }
      })
      console.log('------------------------------')
    }
  }
})

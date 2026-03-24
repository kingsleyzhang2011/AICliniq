import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'
import './styles/main.css'
import App from './App.vue'
import i18n from './i18n'
import router from './router'
import { useUserStore } from './stores/useUserStore'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(Antd)
app.use(i18n)
app.use(router)

// 恢复登录 session，完成后再挂载 App，防止路由守卫在未初始化前触发
const userStore = useUserStore()
userStore.init().finally(() => {
  app.mount('#app')
})

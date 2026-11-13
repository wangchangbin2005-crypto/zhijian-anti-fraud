import { createApp } from 'vue'
import { createPinia } from 'pinia'

import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './assets/antifraud.css'

import App from './App.vue'
import router from './router'
import { getApiBase } from './config/api'

// 启动时把 localStorage 里的账号同步到后端
async function syncLocalUsers() {
  try {
    const raw = localStorage.getItem('antiFraud_accounts')
    if (!raw) return
    const accounts = JSON.parse(raw) as Record<string, { password: string; role?: string; age?: string; identity?: string }>
    const base = getApiBase()
    for (const [username, acc] of Object.entries(accounts)) {
      await fetch(`${base}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password: acc.password,
          role: acc.role || 'client',
          age: acc.age || '',
          identity: acc.identity || 'adult',
        }),
      }).catch(() => {})
    }
  } catch { /* 后端不可用时忽略 */ }
}

syncLocalUsers()

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(ElementPlus)

app.mount('#app')
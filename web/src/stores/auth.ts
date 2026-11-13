import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import http from '@/utils/http'

async function navReplace(path: string) {
  const { default: router } = await import('@/router')
  router.replace(path)
}

const STORAGE_KEY = 'antiFraud_user'
const ACCOUNTS_KEY = 'antiFraud_accounts'

function loadAccounts(): Record<
  string,
  { password: string; role?: string; age?: string; identity?: string; phone?: string }
> {
  try {
    return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '{}')
  } catch {
    return {}
  }
}
function saveAccounts(a: Record<string, unknown>) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(a))
}

export type AppUser = {
  username: string
  role: string
  age?: string
  identity?: string
}

export const useAuthStore = defineStore('auth', () => {
  const isLoggedIn = ref(false)
  const loginLeaving = ref(false)
  const loginLoading = ref(false)
  const loginError = ref('')
  const regSuccess = ref(false)
  const currentUser = ref<AppUser | null>(null)
  const authMode = ref<'login' | 'register'>('login')
  const loginForm = ref({ username: '', password: '' })
  const regForm = ref({
    username: '',
    password: '',
    confirm: '',
    role: 'client' as 'client' | 'admin',
    age: '',
    identity: '' as string,
  })

  const loginSubMode = ref<'pwd' | 'phone' | 'sms' | 'wechat'>('pwd')
  const phoneForm = ref({ phone: '', code: '' })
  const phoneLoading = ref(false)
  const phoneCooldown = ref(0)
  const phoneCodeSent = ref(false)
  const wechatScanned = ref(false)
  const wechatQrExpire = ref(60)
  const smsForm = ref({ phone: '', code: '' })
  const smsLoading = ref(false)
  const smsCodeSent = ref(false)
  const smsCooldown = ref(0)
  let smsCooldownTimer: ReturnType<typeof setInterval> | null = null
  let smsRealCode = ''
  let wechatTimer: ReturnType<typeof setInterval> | null = null

  const isAdmin = computed(() => currentUser.value?.role === 'admin')
  const isClient = computed(
    () => currentUser.value?.role === 'client' || currentUser.value?.role === '操作员',
  )

  function hydrateFromStorage() {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    try {
      const u = JSON.parse(raw) as AppUser
      if (u && loadAccounts()[u.username]) {
        currentUser.value = u
        isLoggedIn.value = true
      }
    } catch {
      /* ignore */
    }
  }

  function onLoginSuccess(user: { username: string; role: string }) {
    const accounts = loadAccounts()
    const acc = accounts[user.username]
    currentUser.value = {
      ...user,
      age: acc?.age || '',
      identity: acc?.identity || 'adult',
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser.value))
    isLoggedIn.value = true
    void navReplace(user.role === 'admin' ? '/app/kb' : '/app/detect')
  }

  function doLogin() {
    loginError.value = ''
    const { username, password } = loginForm.value
    if (!username || !password) {
      loginError.value = '账号和密码不能为空'
      return
    }
    loginLoading.value = true
    setTimeout(() => {
      const acc = loadAccounts()[username]
      if (acc && acc.password === password) {
        onLoginSuccess({ username, role: acc.role || 'client' })
      } else if (!acc) {
        loginError.value = '账号不存在，请先注册'
      } else {
        loginError.value = '密码错误，请重试'
        loginForm.value.password = ''
      }
      loginLoading.value = false
    }, 600)
  }

  function doRegister() {
    loginError.value = ''
    regSuccess.value = false
    const { username, password, confirm } = regForm.value
    if (!username || !password || !confirm) {
      loginError.value = '请填写所有字段'
      return
    }
    if (!/^[a-zA-Z0-9_]{4,16}$/.test(username)) {
      loginError.value = '账号须为4-16位字母数字下划线'
      return
    }
    if (password.length < 6) {
      loginError.value = '密码不少于6位'
      return
    }
    if (password !== confirm) {
      loginError.value = '两次密码不一致'
      return
    }
    loginLoading.value = true
    setTimeout(() => {
      const accounts = loadAccounts()
      if (accounts[username]) {
        loginError.value = '该账号已存在'
        loginLoading.value = false
        return
      }
      accounts[username] = {
        password,
        role: regForm.value.role || 'client',
        age: regForm.value.age || '',
        identity: regForm.value.identity || 'adult',
      }
      saveAccounts(accounts)
      // 同步写后端
      http.post('/api/auth/register', {
        username,
        password,
        role: regForm.value.role || 'client',
        age: regForm.value.age || '',
        identity: regForm.value.identity || 'adult',
      }).catch(() => { /* 后端不可用时忽略，本地注册仍成功 */ })
      regSuccess.value = true
      regForm.value = {
        username: '',
        password: '',
        confirm: '',
        role: 'client',
        age: '',
        identity: '',
      }
      loginLoading.value = false
      setTimeout(() => {
        authMode.value = 'login'
        regSuccess.value = false
      }, 1500)
    }, 600)
  }

  function switchRole(role: string) {
    if (!currentUser.value) return
    currentUser.value = { ...currentUser.value, role }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser.value))
    const accounts = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '{}')
    if (accounts[currentUser.value.username]) {
      accounts[currentUser.value.username].role = role
      localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts))
    }
    void navReplace(role === 'admin' ? '/app/kb' : '/app/detect')
  }

  function doLogout() {
    if (!confirm('确认退出登录？')) return
    localStorage.removeItem(STORAGE_KEY)
    isLoggedIn.value = false
    currentUser.value = null
    loginForm.value = { username: '', password: '' }
    regForm.value = { username: '', password: '', confirm: '', role: 'client', age: '', identity: '' }
    loginError.value = ''
    authMode.value = 'login'
    void navReplace('/login')
    window.dispatchEvent(new CustomEvent('antiFraud:reinit-intro'))
  }

  async function sendPhoneCode() {
    const phone = phoneForm.value.phone.trim()
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      loginError.value = '请输入正确的11位手机号'
      return
    }
    phoneLoading.value = true
    loginError.value = ''
    await new Promise((r) => setTimeout(r, 1200))
    phoneLoading.value = false
    phoneCodeSent.value = true
    phoneCooldown.value = 60
    const t = setInterval(() => {
      phoneCooldown.value--
      if (phoneCooldown.value <= 0) {
        clearInterval(t)
        phoneCodeSent.value = false
      }
    }, 1000)
  }

  async function doPhoneLogin() {
    const { phone, code } = phoneForm.value
    if (!phone || !code) {
      loginError.value = '请填写手机号和验证码'
      return
    }
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      loginError.value = '请输入正确的手机号'
      return
    }
    loginLoading.value = true
    await new Promise((r) => setTimeout(r, 800))
    if (code.length === 6 && /^\d{6}$/.test(code)) {
      onLoginSuccess({ username: `用户_${phone.slice(-4)}`, role: '操作员' })
    } else {
      loginError.value = '验证码格式错误，请输入6位数字'
    }
    loginLoading.value = false
  }

  function startWechatQr() {
    wechatQrExpire.value = 60
    wechatScanned.value = false
    if (wechatTimer) clearInterval(wechatTimer)
    wechatTimer = setInterval(() => {
      wechatQrExpire.value--
      if (wechatQrExpire.value <= 0) wechatQrExpire.value = 60
    }, 1000)
  }

  async function doWechatLogin() {
    wechatScanned.value = true
    await new Promise((r) => setTimeout(r, 800))
    onLoginSuccess({ username: '微信用户', role: '操作员' })
  }

  async function sendSmsCode() {
    loginError.value = ''
    const email = smsForm.value.phone.trim()
    if (!email || !email.includes('@') || email.indexOf('.', email.indexOf('@')) < 0) {
      loginError.value = '请输入正确的邮箱地址（如 xxx@qq.com）'
      return
    }
    smsLoading.value = true
    try {
      const data = (await http.post('/api/auth/send-email', { email })) as {
        ok?: boolean
        error?: string
        dev?: boolean
        code?: string
      }
      if (data.ok) {
        smsCodeSent.value = true
        if (data.dev && data.code) {
          smsRealCode = data.code
          alert(
            `【开发模式】验证码：${data.code}\n\n生产环境请设置环境变量：\nALIYUN_KEY_ID / ALIYUN_SECRET / SMS_SIGN_NAME / SMS_TEMPLATE`,
          )
        }
        smsCooldown.value = 60
        if (smsCooldownTimer) clearInterval(smsCooldownTimer)
        smsCooldownTimer = setInterval(() => {
          smsCooldown.value--
          if (smsCooldown.value <= 0 && smsCooldownTimer) clearInterval(smsCooldownTimer)
        }, 1000)
      } else {
        loginError.value = data.error || '发送失败，请重试'
      }
    } catch {
      loginError.value = '网络错误，请确认后端已启动（端口8888）'
    }
    smsLoading.value = false
  }

  async function doSmsLogin() {
    loginError.value = ''
    const { phone, code } = smsForm.value
    if (!phone || !code) {
      loginError.value = '请填写邮箱和验证码'
      return
    }
    loginLoading.value = true
    setTimeout(async () => {
      try {
        const data = (await http.post('/api/auth/verify-email', {
          email: phone,
          code,
        })) as { ok?: boolean; error?: string; username?: string }
        if (data.ok) {
          onLoginSuccess({
            username: data.username || `邮箱用户_${phone.split('@')[0]}`,
            role: '操作员',
          })
        } else {
          loginError.value = data.error || '验证码错误'
        }
      } catch {
        if (code === smsRealCode && smsRealCode) {
          const accounts = loadAccounts()
          const phoneKey = `phone_${phone}`
          if (!accounts[phoneKey]) {
            accounts[phoneKey] = { password: smsRealCode, role: '操作员', phone }
            saveAccounts(accounts)
          }
          onLoginSuccess({ username: phoneKey, role: accounts[phoneKey].role || '操作员' })
        } else {
          loginError.value = '验证码错误或已过期'
        }
      }
      loginLoading.value = false
    }, 600)
  }

  hydrateFromStorage()

  return {
    isLoggedIn,
    loginLeaving,
    loginLoading,
    loginError,
    regSuccess,
    currentUser,
    authMode,
    loginForm,
    regForm,
    loginSubMode,
    phoneForm,
    phoneLoading,
    phoneCooldown,
    phoneCodeSent,
    wechatScanned,
    wechatQrExpire,
    smsForm,
    smsLoading,
    smsCodeSent,
    smsCooldown,
    isAdmin,
    isClient,
    doLogin,
    doRegister,
    doLogout,
    switchRole,
    sendPhoneCode,
    doPhoneLogin,
    startWechatQr,
    doWechatLogin,
    sendSmsCode,
    doSmsLogin,
    hydrateFromStorage,
  }
})
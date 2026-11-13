<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import LoginHeroCarousel from '@/components/login/LoginHeroCarousel.vue'
import IntroPage from '@/components/IntroPage.vue'

type ThemeMode = 'day' | 'night'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const themeMode = ref<ThemeMode>((localStorage.getItem('loginThemeMode') as ThemeMode) || 'day')

function soonTip(msg: string) {
  window.alert(msg)
}

watch(
  () => auth.isLoggedIn,
  (v) => {
    if (v) {
      const redir = route.query.redirect as string
      if (redir) router.replace(redir)
    }
  },
)

watch(
  () => auth.loginSubMode,
  (v) => {
    if (v === 'wechat') auth.startWechatQr()
  },
)

// 引导页：首次访问显示，点击后隐藏
const showIntro = ref(true)

function toggleTheme() {
  themeMode.value = themeMode.value === 'day' ? 'night' : 'day'
}

watch(themeMode, (v) => {
  localStorage.setItem('loginThemeMode', v)
})
</script>

<template>
  <IntroPage v-if="showIntro" @done="showIntro = false" />
  <div
    v-else
    class="login-screen neo-login"
    :class="[themeMode === 'night' ? 'theme-night' : 'theme-day', { leaving: auth.loginLeaving }]"
  >
    <LoginHeroCarousel />

    <div class="login-box">
      <div class="neo-glow-orb neo-glow-orb-1"></div>
      <div class="neo-glow-orb neo-glow-orb-2"></div>
      <button type="button" class="theme-switch-btn" @click="toggleTheme">
        <span>{{ themeMode === 'night' ? '🌙 黑夜模式' : '☀️ 白天模式' }}</span>
      </button>
      <div class="login-header">
        <div class="login-logo-wrap" style="background:none!important;box-shadow:none!important;border:none!important;padding:0!important">
          <img src="@/assets/logo.png" style="width:110px;height:110px;object-fit:contain" alt="智鉴"/>
        </div>
        <div class="login-title">智鉴</div>
      </div>

      <div class="auth-tabs">
        <button
          type="button"
          class="auth-tab"
          :class="{ active: auth.authMode === 'login' }"
          @click="auth.authMode = 'login'; auth.loginError = ''; auth.loginSubMode = 'pwd'"
        >
          登录
        </button>
        <button
          type="button"
          class="auth-tab"
          :class="{ active: auth.authMode === 'register' }"
          @click="auth.authMode = 'register'; auth.loginError = ''"
        >
          注册
        </button>
      </div>

      <template v-if="auth.authMode === 'login'">
        <div class="login-sub-tabs login-sub-tabs-grid">
          <button
            type="button"
            class="login-sub-tab"
            :class="{ active: auth.loginSubMode === 'pwd' }"
            @click="auth.loginSubMode = 'pwd'; auth.loginError = ''"
          >
            🔑<br /><span style="font-size: 10px">密码</span>
          </button>
          <button
            type="button"
            class="login-sub-tab"
            :class="{ active: auth.loginSubMode === 'phone' }"
            @click="auth.loginSubMode = 'phone'; auth.loginError = ''"
          >
            📱<br /><span style="font-size: 10px">短信</span>
          </button>
          <button
            type="button"
            class="login-sub-tab"
            :class="{ active: auth.loginSubMode === 'sms' }"
            @click="auth.loginSubMode = 'sms'; auth.loginError = ''"
          >
            📧<br /><span style="font-size: 10px">邮箱</span>
          </button>
          <button
            type="button"
            class="login-sub-tab"
            :class="{ active: auth.loginSubMode === 'wechat' }"
            @click="auth.loginSubMode = 'wechat'; auth.loginError = ''"
          >
            💬<br /><span style="font-size: 10px">微信</span>
          </button>
        </div>
        <template v-if="auth.loginSubMode === 'pwd'">
          <div class="login-field">
            <label>账号</label>
            <div class="login-input-wrap">
              <span class="login-input-icon">👤</span>
              <input
                v-model="auth.loginForm.username"
                class="login-input"
                placeholder="请输入账号"
                autocomplete="username"
              />
            </div>
          </div>
          <div class="login-field">
            <label>密码</label>
            <div class="login-input-wrap">
              <span class="login-input-icon">🔒</span>
              <input
                v-model="auth.loginForm.password"
                type="password"
                class="login-input"
                placeholder="请输入密码"
                autocomplete="current-password"
                @keyup.enter="auth.doLogin"
              />
            </div>
          </div>
          <div v-if="auth.loginError" class="login-error">
            <span>⚠️</span>&nbsp;{{ auth.loginError }}
          </div>
          <button type="button" class="login-btn" :disabled="auth.loginLoading" @click="auth.doLogin">
            <span v-if="auth.loginLoading">
              <span
                class="spinner"
                style="border-color: rgba(255, 255, 255, 0.3); border-top-color: #fff; width: 16px; height: 16px"
              ></span>
              &nbsp;验证中...
            </span>
            <span v-else>🔐 登录系统</span>
          </button>
        </template>

        <template v-if="auth.loginSubMode === 'phone'">
          <div class="login-field">
            <label>手机号</label>
            <div class="login-input-wrap">
              <span class="login-input-icon">📱</span>
              <input
                v-model="auth.phoneForm.phone"
                class="login-input"
                type="tel"
                maxlength="11"
                placeholder="请输入手机号"
              />
            </div>
          </div>
          <div class="login-field">
            <label>验证码</label>
            <div class="login-input-wrap" style="display: flex; gap: 8px">
              <span class="login-input-icon">🔢</span>
              <input
                v-model="auth.phoneForm.code"
                class="login-input"
                style="flex: 1"
                maxlength="6"
                placeholder="6位短信验证码"
                @keyup.enter="auth.doPhoneLogin"
              />
              <button
                type="button"
                class="sms-send-btn"
                :disabled="auth.phoneCooldown > 0 || auth.phoneLoading"
                @click="auth.sendPhoneCode"
              >
                <span v-if="auth.phoneLoading" class="spinner" style="width: 12px; height: 12px"></span>
                <span v-else-if="auth.phoneCooldown > 0">{{ auth.phoneCooldown }}s</span>
                <span v-else>发送验证码</span>
              </button>
            </div>
          </div>
          <div v-if="auth.loginError" class="login-error">
            <span>⚠️</span>&nbsp;{{ auth.loginError }}
          </div>
          <div
            v-if="auth.phoneCodeSent && !auth.loginError"
            style="
              font-size: 12px;
              color: var(--green);
              margin-bottom: 8px;
              padding: 8px 12px;
              background: rgba(16, 185, 129, 0.08);
              border-radius: 8px;
              border: 1px solid rgba(16, 185, 129, 0.2);
            "
          >
            ✅ 验证码已发送至 {{ auth.phoneForm.phone }}（请查收短信）
          </div>
          <button type="button" class="login-btn" :disabled="auth.loginLoading || !auth.phoneForm.code" @click="auth.doPhoneLogin">
            <span v-if="auth.loginLoading">
              <span
                class="spinner"
                style="border-color: rgba(255, 255, 255, 0.3); border-top-color: #fff; width: 16px; height: 16px"
              ></span>
              &nbsp;验证中...
            </span>
            <span v-else>📱 短信验证码登录</span>
          </button>
        </template>

        <template v-if="auth.loginSubMode === 'sms'">
          <div class="login-field">
            <label>邮箱</label>
            <div class="login-input-wrap">
              <span class="login-input-icon">📧</span>
              <input v-model="auth.smsForm.phone" class="login-input" type="email" placeholder="请输入邮箱地址" />
            </div>
          </div>
          <div class="login-field">
            <label>验证码</label>
            <div class="login-input-wrap" style="display: flex; gap: 8px">
              <span class="login-input-icon">🔢</span>
              <input
                v-model="auth.smsForm.code"
                class="login-input"
                style="flex: 1"
                maxlength="6"
                placeholder="6位验证码"
                @keyup.enter="auth.doSmsLogin"
              />
              <button
                type="button"
                class="sms-send-btn"
                :disabled="auth.smsCooldown > 0 || auth.smsLoading"
                @click="auth.sendSmsCode"
              >
                <span v-if="auth.smsLoading" class="spinner" style="width: 12px; height: 12px"></span>
                <span v-else-if="auth.smsCooldown > 0">{{ auth.smsCooldown }}s</span>
                <span v-else>发送验证码</span>
              </button>
            </div>
          </div>
          <div v-if="auth.loginError" class="login-error">
            <span>⚠️</span>&nbsp;{{ auth.loginError }}
          </div>
          <div v-if="auth.smsCodeSent && !auth.loginError" class="login-success">
            ✅ 验证码已发送至 {{ auth.smsForm.phone }}
          </div>
          <button type="button" class="login-btn" :disabled="auth.loginLoading || !auth.smsForm.code" @click="auth.doSmsLogin">
            <span v-if="auth.loginLoading">
              <span
                class="spinner"
                style="border-color: rgba(255, 255, 255, 0.3); border-top-color: #fff; width: 16px; height: 16px"
              ></span>
              &nbsp;验证中...
            </span>
            <span v-else>📧 邮箱验证码登录</span>
          </button>
        </template>

        <template v-if="auth.loginSubMode === 'wechat'">
          <div style="text-align: center; padding: 8px 0">
            <div style="font-size: 13px; color: var(--muted); margin-bottom: 14px">使用微信扫描下方二维码登录</div>
            <div
              style="
                display: inline-block;
                padding: 12px;
                background: #fff;
                border-radius: 12px;
                margin-bottom: 12px;
                position: relative;
              "
            >
              <svg width="140" height="140" viewBox="0 0 140 140" xmlns="http://www.w3.org/2000/svg">
                <rect x="2" y="2" width="40" height="40" rx="4" fill="none" stroke="#000" stroke-width="3" />
                <rect x="8" y="8" width="28" height="28" rx="2" fill="#000" />
                <rect x="13" y="13" width="18" height="18" rx="2" fill="#fff" />
                <rect x="17" y="17" width="10" height="10" fill="#000" />
                <rect x="98" y="2" width="40" height="40" rx="4" fill="none" stroke="#000" stroke-width="3" />
                <rect x="104" y="8" width="28" height="28" rx="2" fill="#000" />
                <rect x="109" y="13" width="18" height="18" rx="2" fill="#fff" />
                <rect x="113" y="17" width="10" height="10" fill="#000" />
                <rect x="2" y="98" width="40" height="40" rx="4" fill="none" stroke="#000" stroke-width="3" />
                <rect x="8" y="104" width="28" height="28" rx="2" fill="#000" />
                <rect x="13" y="109" width="18" height="18" rx="2" fill="#fff" />
                <rect x="17" y="113" width="10" height="10" fill="#000" />
                <rect x="50" y="8" width="6" height="6" fill="#000" />
                <rect x="60" y="8" width="6" height="6" fill="#000" />
                <rect x="70" y="8" width="4" height="6" fill="#000" />
                <rect x="80" y="8" width="6" height="6" fill="#000" />
                <rect x="55" y="55" width="30" height="30" rx="6" fill="#07C160" />
                <text x="70" y="76" text-anchor="middle" font-size="18" fill="white">💬</text>
              </svg>
              <div
                v-if="auth.wechatScanned"
                style="
                  position: absolute;
                  inset: 0;
                  background: rgba(255, 255, 255, 0.95);
                  border-radius: 12px;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  justify-content: center;
                "
              >
                <div style="font-size: 32px; margin-bottom: 4px">✅</div>
                <div style="font-size: 12px; color: #07c160; font-weight: 600">扫码成功</div>
                <div style="font-size: 11px; color: #666">请在手机上确认</div>
              </div>
            </div>
            <div style="font-size: 12px; color: var(--muted); margin-bottom: 12px">
              <span style="color: #07c160">●</span> 二维码有效期 {{ auth.wechatQrExpire }}s · 过期自动刷新
            </div>
            <div v-if="auth.loginError" class="login-error">
              <span>⚠️</span>&nbsp;{{ auth.loginError }}
            </div>
            <button
              type="button"
              class="login-btn"
              style="background: linear-gradient(135deg, #07c160, #06ad56)"
              @click="auth.doWechatLogin"
            >
              💬 已扫码，点击确认登录
            </button>
          </div>
        </template>

        <div class="login-divider">
          <span>其他方式</span>
        </div>
        <div class="other-login-row" style="grid-template-columns:1fr 1fr">
          <button
            type="button"
            class="other-login-btn alipay"
            @click="soonTip('支付宝登录功能即将上线')"
          >
            <span style="font-size:18px">🔵</span>
            <span>支付宝</span>
          </button>
          <button
            type="button"
            class="other-login-btn face"
            @click="soonTip('人脸识别功能即将上线')"
          >
            <span style="font-size:18px">👤</span>
            <span>人脸</span>
          </button>
        </div>

        <div class="login-switch-tip">
          没有账号？<span @click="auth.authMode = 'register'; auth.loginError = ''">立即注册</span>
        </div>
      </template>

      <template v-else>
        <div class="login-field">
          <label>账号</label>
          <div class="login-input-wrap">
            <span class="login-input-icon">👤</span>
            <input v-model="auth.regForm.username" class="login-input" placeholder="4-16位字母数字" />
          </div>
        </div>
        <div class="login-field">
          <label>密码</label>
          <div class="login-input-wrap">
            <span class="login-input-icon">🔒</span>
            <input v-model="auth.regForm.password" type="password" class="login-input" placeholder="6位以上" />
          </div>
        </div>
        <div class="login-field">
          <label>确认密码</label>
          <div class="login-input-wrap">
            <span class="login-input-icon">🔑</span>
            <input
              v-model="auth.regForm.confirm"
              type="password"
              class="login-input"
              placeholder="再次输入密码"
              @keyup.enter="auth.doRegister"
            />
          </div>
        </div>
        <div class="login-field">
          <label>账号类型</label>
          <div style="display: flex; gap: 8px; margin-top: 4px">
            <button
              type="button"
              :class="['auth-tab', auth.regForm.role === 'client' ? 'active' : '']"
              style="flex: 1; padding: 10px; font-size: 14px"
              @click="auth.regForm.role = 'client'"
            >
              👤 客户端
            </button>
            <button
              type="button"
              :class="['auth-tab', auth.regForm.role === 'admin' ? 'active' : '']"
              style="flex: 1; padding: 10px; font-size: 14px"
              @click="auth.regForm.role = 'admin'"
            >
              🛡️ 管理端
            </button>
          </div>
        </div>
        <div v-if="auth.regForm.role === 'client'" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px">
          <div class="login-field" style="margin: 0">
            <label>年龄</label>
            <div class="login-input-wrap">
              <span class="login-input-icon">🎂</span>
              <input v-model="auth.regForm.age" class="login-input" type="number" min="1" max="120" placeholder="年龄" />
            </div>
          </div>
          <div class="login-field" style="margin: 0">
            <label>身份</label>
            <select v-model="auth.regForm.identity" class="login-input" style="padding-left: 14px">
              <option value="">请选择身份</option>
              <option value="elder">老年人</option>
              <option value="student">学生</option>
              <option value="adult">普通成人</option>
              <option value="financial">财务/金融人员</option>
              <option value="other">其他</option>
            </select>
          </div>
        </div>
        <div v-if="auth.loginError" class="login-error">
          <span>⚠️</span>&nbsp;{{ auth.loginError }}
        </div>
        <div v-if="auth.regSuccess" class="login-success"><span>✅</span>&nbsp;注册成功！请登录</div>
        <button type="button" class="login-btn" :disabled="auth.loginLoading" @click="auth.doRegister">
          📝 立即注册
        </button>
        <div class="login-switch-tip">
          已有账号？<span @click="auth.authMode = 'login'; auth.loginError = ''">返回登录</span>
        </div>
      </template>

    </div>
  </div>
</template>
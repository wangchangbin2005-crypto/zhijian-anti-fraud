<script setup lang="ts">
import { onMounted } from 'vue'
import { useAdminStore } from '@/stores/admin'
import { useAuthStore } from '@/stores/auth'

const ad = useAdminStore()
const auth = useAuthStore()

onMounted(() => {
  void ad.loadSubscription()
})

const identityMap: Record<string, string> = {
  elder: '老年人', student: '学生', financial: '财务/金融人员', adult: '普通成人', other: '普通用户',
}
const identityIcon: Record<string, string> = {
  elder: '👴', student: '🎓', financial: '💼', adult: '👤', other: '👤',
}
const focusMap: Record<string, string> = {
  elder: '冒充公检法 · AI换脸诈骗 · 情感诈骗 · 虚假中奖',
  student: '刷单兼职 · 虚假贷款 · 游戏诈骗 · 虚假购物',
  financial: '投资理财 · 冒充领导转账 · 情感诈骗',
  adult: '冒充公检法 · 投资理财 · AI换脸诈骗',
  other: '冒充公检法 · 投资理财 · AI换脸诈骗',
}
</script>

<template>
  <div>
    <div class="page-header" style="padding-right:170px">
      <div class="page-title">📬 订阅推送</div>
      <div class="page-subtitle">个性化反诈案例 · 定时推送到微信或邮箱 · 按你的身份精选内容</div>
    </div>

    <!-- 已订阅状态卡片 -->
    <div v-if="ad.subInfo.active" class="sub-status-card">
      <div class="sub-status-left">
        <div class="sub-status-icon">✅</div>
        <div>
          <div class="sub-status-title">订阅已开启</div>
          <div class="sub-status-meta">
            {{ { daily: '每日', weekly: '每周', biweekly: '每两周' }[ad.subInfo.frequency] }}推送
            <span class="sub-meta-dot">·</span>
            上次推送：{{ ad.subInfo.last_push_at || '尚未推送' }}
          </div>
        </div>
        <div class="sub-status-actions">
          <button class="btn btn-outline" type="button" :disabled="ad.subLoading" @click="ad.testPush">
            <span v-if="ad.subLoading"><span class="spinner" style="width:12px;height:12px;border-width:2px"></span></span>
            <span v-else>📤 立即测试</span>
          </button>
          <button class="btn btn-outline sub-cancel-btn" type="button" @click="ad.cancelSubscription">取消订阅</button>
        </div>
      </div>
      <div class="sub-info-grid">
        <div class="sub-info-cell">
          <div class="sub-info-label">推送渠道</div>
          <div class="sub-info-value">
            <span v-if="ad.subForm.serverchan_key || ad.subForm.email">
              <span v-if="ad.subForm.serverchan_key" style="color:#4ade80">📱 微信Server酱</span>
              <span v-if="ad.subForm.serverchan_key && ad.subForm.email" style="color:var(--dim)"> + </span>
              <span v-if="ad.subForm.email" style="color:var(--blue)">📧 {{ ad.subForm.email }}</span>
            </span>
            <span v-else style="color:var(--dim)">未配置</span>
          </div>
        </div>
        <div class="sub-info-cell">
          <div class="sub-info-label">推送频率</div>
          <div class="sub-info-value">{{ { daily: '每日一推', weekly: '每周一推', biweekly: '每两周一推' }[ad.subInfo.frequency] }}</div>
        </div>
        <div class="sub-info-cell">
          <div class="sub-info-label">关注类型</div>
          <div class="sub-info-value">{{ ad.subInfo.fraud_types?.length ? ad.subInfo.fraud_types.join('、') : '全部类型' }}</div>
        </div>
      </div>
    </div>

    <!-- 设置卡片 -->
    <div class="card">
      <div class="card-title">{{ ad.subInfo.active ? '修改订阅设置' : '开启个性化订阅' }}</div>

      <!-- 推送渠道 -->
      <div class="sub-section">
        <div class="sub-section-label">
          📡 推送渠道
          <span class="sub-section-hint">至少选一个</span>
        </div>
        <div class="sub-channel-grid">
          <div class="sub-channel-card">
            <div class="sub-channel-header">
              <span class="sub-channel-icon">📱</span>
              <span class="sub-channel-name">微信公众号推送</span>
            </div>
            <div class="sub-channel-desc">
              通过 Server酱 推送到微信。<br/>
              1. 访问 <a href="https://sct.ftqq.com" target="_blank" style="color:var(--blue)">sct.ftqq.com</a> 微信扫码登录<br/>
              2. 复制你的 SendKey（SCT开头）粘贴下方
            </div>
            <input v-model="ad.subForm.serverchan_key" type="text" placeholder="SCTxxxxxxxxxxxxxxxx" class="sub-input mono" />
          </div>
          <div class="sub-channel-card">
            <div class="sub-channel-header">
              <span class="sub-channel-icon">📧</span>
              <span class="sub-channel-name">邮箱推送</span>
            </div>
            <div class="sub-channel-desc">
              填写邮箱，系统将发送精美 HTML 格式的反诈案例推送
            </div>
            <input v-model="ad.subForm.email" type="email" placeholder="your@email.com" class="sub-input" />
          </div>
        </div>
      </div>

      <!-- 推送频率 -->
      <div class="sub-section">
        <div class="sub-section-label">⏰ 推送频率</div>
        <div class="sub-freq-grid">
          <div
            v-for="f in [
              { v: 'daily',    l: '每日',   d: '每天上午9点' },
              { v: 'weekly',   l: '每周',   d: '每周一上午9点' },
              { v: 'biweekly', l: '每两周', d: '每两周推送一次' },
            ]"
            :key="f.v"
            class="sub-freq-btn"
            :class="{ active: ad.subForm.frequency === f.v }"
            @click="ad.subForm.frequency = f.v"
          >
            <div class="sub-freq-label">{{ f.l }}</div>
            <div class="sub-freq-desc">{{ f.d }}</div>
          </div>
        </div>
      </div>

      <!-- 个性化推送 -->
      <div class="sub-personalize">
        <div class="sub-personalize-header">
          <span style="font-size:16px">🎯</span>
          <span class="sub-personalize-title">个性化推送类型（自动匹配）</span>
        </div>
        <div class="sub-personalize-desc">
          系统将根据你的 <strong>身份</strong> 和 <strong>年龄</strong> 自动推送最相关的诈骗案例，无需手动选择。
        </div>
        <div class="sub-identity-card">
          <div class="sub-identity-row">
            <span style="font-size:24px">{{ identityIcon[auth.currentUser?.identity || 'adult'] }}</span>
            <span class="sub-identity-name">
              {{ identityMap[auth.currentUser?.identity || 'adult'] }}
              <span v-if="auth.currentUser?.age" class="sub-identity-age">（{{ auth.currentUser.age }}岁）</span>
            </span>
          </div>
          <div class="sub-identity-focus">
            推送重点：<span class="sub-identity-tags">{{ focusMap[auth.currentUser?.identity || 'adult'] }}</span>
          </div>
        </div>
      </div>

      <!-- 提示栏 -->
      <div class="sub-hint-bar">
        📋 将为
        <strong style="color:var(--blue)">{{ identityMap[auth.currentUser?.identity || 'adult'] }}</strong>
        <span v-if="auth.currentUser?.age">（{{ auth.currentUser.age }}岁）</span>
        推送相关案例。身份由注册信息自动识别。
      </div>

      <!-- 保存按钮 -->
      <button
        class="btn btn-primary sub-save-btn"
        type="button"
        :disabled="ad.subLoading || (!ad.subForm.serverchan_key && !ad.subForm.email)"
        @click="ad.saveSubscription"
      >
        <span v-if="ad.subLoading"><span class="spinner" style="width:14px;height:14px;border-width:2px"></span></span>
        <span v-else>{{ ad.subInfo.active ? '💾 保存修改' : '🚀 开启订阅' }}</span>
      </button>
      <div v-if="!ad.subForm.serverchan_key && !ad.subForm.email" class="sub-empty-hint">
        请至少填写微信SendKey或邮箱之一
      </div>

      <!-- 反馈消息 -->
      <div v-if="ad.subMsg" class="sub-msg" :class="ad.subMsgType === 'ok' ? 'sub-msg-ok' : 'sub-msg-err'">
        {{ ad.subMsg }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.sub-status-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  padding: 24px;
  margin-bottom: 16px;
  box-shadow: 0 2px 12px rgba(91,94,244,0.06);
}
.sub-status-left {
  display: flex; align-items: center; gap: 14px; margin-bottom: 16px;
}
.sub-status-icon {
  width: 48px; height: 48px; border-radius: 50%;
  background: linear-gradient(135deg, #16a34a, #22c55e);
  display: flex; align-items: center; justify-content: center;
  font-size: 22px; flex-shrink: 0;
  box-shadow: 0 4px 16px rgba(34,197,94,0.3);
}
.sub-status-title { font-size: 17px; font-weight: 700; color: var(--text); margin-bottom: 3px; }
.sub-status-meta  { font-size: 13px; color: var(--muted); }
.sub-meta-dot     { margin: 0 6px; opacity: 0.4; }
.sub-status-actions { display: flex; gap: 8px; margin-left: auto; }
.sub-cancel-btn { color: var(--red) !important; border-color: rgba(239,68,68,0.3) !important; }

.sub-info-grid {
  display: grid; grid-template-columns: repeat(3,1fr); gap: 10px;
}
.sub-info-cell {
  padding: 12px 14px;
  background: rgba(99,102,241,0.05);
  border: 1px solid var(--border);
  border-radius: 10px;
}
.sub-info-label {
  font-size: 11px; color: var(--dim); margin-bottom: 5px;
  text-transform: uppercase; letter-spacing: 0.8px; font-weight: 600;
}
.sub-info-value { font-size: 13px; color: var(--text); font-weight: 500; }

.sub-section { margin-bottom: 24px; }
.sub-section-label {
  font-size: 14px; font-weight: 700; color: var(--text);
  margin-bottom: 12px; display: flex; align-items: center; gap: 8px;
}
.sub-section-hint {
  font-size: 11px; color: var(--dim); font-weight: 400;
  padding: 2px 8px; background: rgba(99,102,241,0.07);
  border-radius: 20px; border: 1px solid var(--border);
}

.sub-channel-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.sub-channel-card {
  padding: 18px; border: 1px solid var(--border);
  border-radius: 12px; background: rgba(99,102,241,0.03);
  transition: border-color .2s;
}
.sub-channel-card:hover { border-color: var(--border2); }
.sub-channel-header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.sub-channel-icon { font-size: 20px; }
.sub-channel-name { font-size: 15px; font-weight: 700; color: var(--text); }
.sub-channel-desc { font-size: 12px; color: var(--muted); line-height: 1.8; margin-bottom: 12px; }

.sub-input {
  width: 100%; padding: 9px 12px;
  border: 1px solid var(--border); border-radius: 8px;
  background: var(--bg2); color: var(--text); font-size: 13px;
  outline: none; transition: border-color .2s, box-shadow .2s;
  box-sizing: border-box;
}
.sub-input:focus { border-color: var(--blue); box-shadow: 0 0 0 3px rgba(59,130,246,0.12); }
.sub-input.mono { font-family: 'JetBrains Mono', monospace; }

.sub-freq-grid { display: flex; gap: 10px; }
.sub-freq-btn {
  flex: 1; padding: 16px 10px;
  border-radius: 10px; border: 1.5px solid var(--border);
  cursor: pointer; text-align: center; transition: all .2s;
  background: transparent;
}
.sub-freq-btn:hover { border-color: var(--border2); background: rgba(99,102,241,0.04); }
.sub-freq-btn.active { border-color: var(--blue); background: rgba(59,130,246,0.1); }
.sub-freq-label { font-size: 16px; font-weight: 700; color: var(--muted); margin-bottom: 4px; transition: color .2s; }
.sub-freq-btn.active .sub-freq-label { color: var(--blue); }
.sub-freq-desc { font-size: 12px; color: var(--dim); }

.sub-personalize {
  margin-bottom: 20px; padding: 18px;
  background: rgba(59,130,246,0.05);
  border: 1px solid rgba(59,130,246,0.18); border-radius: 12px;
}
.sub-personalize-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.sub-personalize-title { font-size: 14px; font-weight: 700; color: var(--blue); }
.sub-personalize-desc { font-size: 13px; color: var(--muted); line-height: 1.7; margin-bottom: 12px; }
.sub-personalize-desc strong { color: var(--text); }
.sub-identity-card {
  padding: 12px 14px; background: rgba(99,102,241,0.05);
  border-radius: 8px; border: 1px solid rgba(99,102,241,0.12);
}
.sub-identity-row { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
.sub-identity-name { font-size: 15px; font-weight: 700; color: var(--text); }
.sub-identity-age  { font-size: 13px; color: var(--muted); font-weight: 400; }
.sub-identity-focus { font-size: 12px; color: var(--muted); line-height: 1.6; }
.sub-identity-tags { color: var(--blue); font-weight: 500; }

.sub-hint-bar {
  padding: 12px 16px;
  background: rgba(59,130,246,0.05);
  border: 1px solid rgba(59,130,246,0.14);
  border-radius: 8px; margin-bottom: 18px;
  font-size: 13px; color: var(--muted); line-height: 1.7;
}
.sub-save-btn { width: 100%; justify-content: center; padding: 14px; font-size: 15px; font-weight: 700; border-radius: 10px; }
.sub-empty-hint { text-align: center; font-size: 12px; color: var(--dim); margin-top: 8px; }
.sub-msg { margin-top: 12px; padding: 11px 16px; border-radius: 8px; font-size: 14px; text-align: center; }
.sub-msg-ok  { background: rgba(16,185,129,0.1); color: #34d399; border: 1px solid rgba(16,185,129,0.2); }
.sub-msg-err { background: rgba(239,68,68,0.1);  color: #f87171; border: 1px solid rgba(239,68,68,0.2); }
</style>
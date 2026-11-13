<script setup lang="ts">
import { onMounted } from 'vue'
import { useAdminStore } from '@/stores/admin'
import { useWorkspaceStore } from '@/stores/workspace'

const ad = useAdminStore()
const ws = useWorkspaceStore()

onMounted(() => {
  void ad.loadSessions()
})
</script>

<template>
  <div>
    <div class="page-header" style="padding-right:170px">
      <div class="page-title">会话历史</div>
      <div class="page-subtitle">从数据库加载跨会话历史记录 · SQLite 持久化存储</div>
    </div>
    <div class="sessions-toolbar">
      <div style="display: flex; align-items: center; gap: 10px">
        <button class="btn btn-outline" type="button" style="font-size: 14px; padding: 8px 16px" @click="ad.loadSessions">🔄 刷新</button>
        <span v-if="ad.sessions.length" style="font-size: 13px; color: var(--muted); font-family: 'JetBrains Mono', monospace">
          共 {{ ad.sessions.length }} 条会话
        </span>
      </div>
      <button
        class="btn btn-outline"
        type="button"
        :disabled="!ad.sessions.length || ad.sessDeleting"
        style="color: var(--red); border-color: rgba(239, 68, 68, 0.3); font-size: 13px; margin-right: 170px"
        @click="ad.deleteAllSessions"
      >
        {{ ad.sessDeleting ? '删除中...' : '🗑 清空全部' }}
      </button>
    </div>
    <div class="sessions-layout">
      <div class="card sessions-list-card">
        <div class="card-title">会话列表</div>
        <div v-if="ad.sessLoading" style="text-align: center; padding: 40px"><span class="spinner"></span></div>
        <div v-else-if="!ad.sessions.length" class="empty-state">
          <div style="font-size: 32px; margin-bottom: 12px">🗂️</div>
          <div>暂无历史会话</div>
        </div>
        <div v-else class="scroll-list">
          <div
            v-for="s in ad.sessions"
            :key="String(s.session_id)"
            class="session-item"
            :class="{ 'session-item-active': ad.selectedSession === s.session_id }"
            @click="ad.loadSessionDetail(String(s.session_id))"
          >
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px">
              <span :class="['badge', 'badge-' + s.max_risk]">{{ ws.riskLabel(String(s.max_risk || '')) }}</span>
              <span style="margin-left: auto; font-size: 12px; color: var(--muted)">{{ s.msg_count }} 条</span>
              <button type="button" class="del-btn" title="删除" @click.stop="ad.deleteSession(String(s.session_id))">🗑</button>
            </div>
            <div style="font-size: 11px; color: var(--dim); font-family: 'JetBrains Mono', monospace; margin-bottom: 4px">
              {{ String(s.session_id).slice(0, 20) }}...
            </div>
            <div style="font-size: 12px; color: var(--muted)">🕐 {{ String(s.last_time || '').slice(0, 19) }}</div>
          </div>
        </div>
      </div>
      <div class="card sessions-detail-card">
        <div class="card-title">
          会话详情
          <button v-if="ad.selectedSession" class="btn btn-outline" type="button" style="margin-left: auto; font-size: 12px; padding: 5px 10px" @click="ad.loadRiskHistory">
            风险记录
          </button>
        </div>
        <div v-if="!ad.selectedSession" class="empty-state">
          <div style="font-size: 32px; margin-bottom: 12px">💬</div>
          <div>选择左侧会话</div>
        </div>
        <div v-if="ad.sessDetailLoading" style="text-align: center; padding: 40px"><span class="spinner"></span></div>
        <div v-else class="scroll-list">
          <div
            v-for="(msg, i) in ad.sessionMessages"
            :key="i"
            class="msg-bubble"
            :class="'msg-' + msg.role"
          >
            <div class="msg-header">
              <span class="msg-role">{{ msg.role === 'user' ? '用户输入' : '系统' }}</span>
              <span :class="['badge', 'badge-' + msg.risk_level]" style="font-size: 10px; padding: 2px 8px">{{
                ws.riskLabel(String(msg.risk_level || ''))
              }}</span>
              <span style="font-size: 11px; color: var(--dim); margin-left: auto">{{ String(msg.timestamp || '').slice(0, 16) }}</span>
            </div>
            <div class="msg-content">{{ msg.content }}</div>
            <div v-if="msg.fraud_type && msg.fraud_type !== ''" class="msg-type">{{ msg.fraud_type }}</div>
          </div>
        </div>
      </div>
      <div class="card sessions-risk-card">
        <div class="card-title">风险统计</div>
        <div class="risk-summary">
          <div v-for="lvl in ['critical', 'high', 'medium', 'low', 'safe']" :key="lvl" class="risk-summary-item">
            <span :class="['badge', 'badge-' + lvl]" style="font-size: 11px">{{ ws.riskLabel(lvl) }}</span>
            <span
              class="risk-count"
              :style="{
                color:
                  lvl === 'critical'
                    ? 'var(--critical)'
                    : lvl === 'high'
                      ? 'var(--red)'
                      : lvl === 'medium'
                        ? 'var(--amber)'
                        : lvl === 'safe'
                          ? 'var(--green)'
                          : 'var(--muted)',
              }"
              >{{ ad.sessions.filter((s) => s.max_risk === lvl).length }}</span
            >
          </div>
        </div>
        <div class="tips-divider" style="margin: 16px 0"></div>
        <div class="card-title" style="margin-bottom: 12px">历史风险事件</div>
        <div v-if="!ad.riskHistory.length" class="empty-state" style="padding: 20px">
          <div style="font-size: 24px; margin-bottom: 8px">📊</div>
          <div style="font-size: 12px">点击「风险记录」加载</div>
        </div>
        <div v-for="r in ad.riskHistory" :key="String(r.timestamp)" class="risk-event-item">
          <span :class="['badge', 'badge-' + r.risk_level]" style="font-size: 10px; padding: 2px 6px">{{ ws.riskLabel(String(r.risk_level || '')) }}</span>
          <span style="font-size: 12px; flex: 1; margin: 0 8px">{{ r.fraud_type }}</span>
          <span style="font-size: 11px; color: var(--dim); white-space: nowrap">{{ String(r.timestamp || '').slice(5, 16) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
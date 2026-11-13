<script setup lang="ts">
import { computed } from 'vue'
import { useWorkspaceStore } from '@/stores/workspace'
import { useRouter } from 'vue-router'

const ws = useWorkspaceStore()
const router = useRouter()

const reversed = computed(() => [...ws.history].reverse())

function load(h: { text: string }) {
  ws.chatInput = h.text
  void router.push('/app/detect')
}
</script>

<template>
  <div>
    <div class="page-header">
      <div class="page-title">检测历史</div>
      <div class="page-subtitle">本次会话的所有检测记录</div>
    </div>
    <div class="card">
      <div v-if="!ws.history.length" style="text-align: center; color: var(--muted); padding: 40px; font-size: 15px">暂无记录，请先进行检测</div>
      <div
        v-for="(h, i) in reversed"
        :key="i"
        style="
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 0;
          border-bottom: 1px solid var(--border);
          font-size: 14px;
          cursor: pointer;
        "
        @click="load(h)"
      >
        <span :class="['badge', 'badge-' + h.risk_level]">{{ ws.riskLabel(h.risk_level || '') }}</span>
        <div style="flex: 1; min-width: 0">
          <div style="font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap">{{ h.text }}</div>
          <div style="font-size: 12px; color: var(--muted); margin-top: 2px">{{ h.fraud_type }} · {{ h.timestamp }}</div>
        </div>
        <span style="font-size: 13px; color: var(--muted)">{{ Math.round((h.confidence ?? 0) * 100) }}%</span>
      </div>
    </div>
  </div>
</template>

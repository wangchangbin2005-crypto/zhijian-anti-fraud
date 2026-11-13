<script setup lang="ts">
import { useAdminStore } from '@/stores/admin'
import { useWorkspaceStore } from '@/stores/workspace'

const ad = useAdminStore()
const ws = useWorkspaceStore()
</script>

<template>
  <div>
    <div class="page-header">
      <div class="page-title">使用指南</div>
      <div class="page-subtitle">常见诈骗类型识别要点与风险等级说明</div>
    </div>
    <div class="two-col">
      <div>
        <div v-for="g in ad.fraudGuide" :key="g.type" class="card" style="margin-bottom: 12px">
          <div class="card-title">{{ g.type }}</div>
          <ul style="padding-left: 18px">
            <li v-for="tip in g.tips" :key="tip" style="font-size: 14px; color: var(--muted); line-height: 1.8; margin-bottom: 4px">
              {{ tip }}
            </li>
          </ul>
        </div>
      </div>
      <div>
        <div v-for="g in ad.levelGuide" :key="g.level" class="card" style="margin-bottom: 12px">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px">
            <span :class="['badge', 'badge-' + g.level]">{{ ws.riskLabel(g.level) }}</span>
          </div>
          <p style="font-size: 14px; color: var(--muted); line-height: 1.7">{{ g.desc }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

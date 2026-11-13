<script setup lang="ts">
import { onMounted } from 'vue'
import { useAdminStore } from '@/stores/admin'

const ad = useAdminStore()

onMounted(() => {
  void ad.loadEvoStatus()
  void ad.loadEvoCases()
})
</script>

<template>
  <div>
    <div class="page-header">
      <div class="page-title">知识库进化状态</div>
      <div class="page-subtitle">自动采集最新诈骗案例，持续更新知识库</div>
    </div>
    <div class="stats-grid" style="grid-template-columns: repeat(4, 1fr); margin-bottom: 16px">
      <div class="stat">
        <div class="stat-value" style="color: var(--blue)">30</div>
        <div class="stat-label">累计进化次数</div>
      </div>
      <div class="stat">
        <div class="stat-value" style="color: var(--green)">2236</div>
        <div class="stat-label">知识库总案例</div>
      </div>
      <div class="stat">
        <div class="stat-value" style="color: var(--amber)">
          {{ ad.evoStatus.interval_hours || 6 }}h
        </div>
        <div class="stat-label">自动更新间隔</div>
      </div>
      <div class="stat">
        <div class="stat-value" style="color: var(--green); font-size: 14px">
          {{
            (ad.evoStatus as { last_run?: string }).last_run
              ? String((ad.evoStatus as { last_run?: string }).last_run)
                  .slice(0, 16)
                  .replace('T', ' ')
              : '未运行'
          }}
        </div>
        <div class="stat-label">最近运行时间</div>
      </div>
    </div>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px">
      <div class="card">
        <div class="card-title">⚙️ 进化控制</div>
        <div style="display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap">
          <button
            class="btn btn-primary"
            type="button"
            :disabled="ad.evoLoading"
            style="flex: 1"
            @click="ad.triggerEvolution"
          >
            <span v-if="ad.evoLoading"><span class="spinner"></span> 进化中...</span>
            <span v-else>🧬 立即进化</span>
          </button>
          <button class="btn btn-outline" type="button" @click="ad.loadEvoCases">
            🔄 刷新案例
          </button>
        </div>
        <div class="card-title" style="margin-top: 4px">📋 最近运行日志</div>
        <div
          v-if="!ad.evoStatus.recent_logs?.length"
          style="color: var(--muted); font-size: 13px; padding: 12px 0"
        >
          暂无日志，点击「立即进化」触发
        </div>
        <div
          v-for="(log, li) in ad.evoStatus.recent_logs"
          :key="li"
          style="
            padding: 10px;
            border-radius: 8px;
            background: rgba(16, 185, 129, 0.05);
            border: 1px solid rgba(16, 185, 129, 0.15);
            margin-bottom: 8px;
            font-size: 13px;
          "
        >
          <div
            style="
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 6px;
            "
          >
            <span style="color: var(--green); font-weight: 500">进化运行</span>
            <span
              style="font-size: 11px; color: var(--muted); font-family: 'JetBrains Mono', monospace"
              >{{
                String((log as { run_at?: string }).run_at || '')
                  .slice(0, 19)
                  .replace('T', ' ')
              }}</span
            >
          </div>
          <div style="display: flex; gap: 16px; flex-wrap: wrap">
            <span style="color: var(--muted)"
              >采集
              <strong style="color: var(--text)">{{
                (log as { raw_fetched?: number }).raw_fetched
              }}</strong></span
            >
            <span style="color: var(--muted)"
              >新增
              <strong style="color: var(--green)"
                >+{{ (log as { added?: number }).added }}</strong
              ></span
            >
            <span style="color: var(--muted)"
              >跳过
              <strong style="color: var(--amber)">{{
                (log as { skipped?: number }).skipped
              }}</strong></span
            >
            <span style="color: var(--muted)"
              >{{ (log as { duration_seconds?: number }).duration_seconds }}s</span
            >
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-title">📊 案例类型分布</div>
        <div
          v-if="!ad.evoCases.length"
          style="color: var(--muted); font-size: 13px; padding: 12px 0"
        >
          加载中...
        </div>
        <div v-else>
          <div v-for="(count, type) in ad.evoCaseStats" :key="type" style="margin-bottom: 10px">
            <div
              style="
                display: flex;
                justify-content: space-between;
                font-size: 13px;
                margin-bottom: 3px;
              "
            >
              <span>{{ type }}</span
              ><span style="color: var(--blue); font-weight: 600">{{ count }} 条</span>
            </div>
            <div class="conf-bar">
              <div
                :style="{
                  width: (count / ad.evoCases.length) * 100 + '%',
                  height: '100%',
                  borderRadius: '3px',
                  background: 'var(--blue)',
                }"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="card">
      <div
        style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px; flex-wrap: wrap"
      >
        <div class="card-title" style="margin: 0">📚 知识库案例（{{ ad.evoCases.length }} 条）</div>
        <input
          v-model="ad.evoCaseFilter"
          placeholder="搜索关键词..."
          style="
            flex: 1;
            min-width: 160px;
            padding: 6px 12px;
            border-radius: 8px;
            border: 1px solid var(--border);
            background: var(--bg2);
            color: var(--text);
            font-size: 13px;
            outline: none;
          "
        />
        <select
          v-model="ad.evoCaseTypeFilter"
          style="
            padding: 6px 10px;
            border-radius: 8px;
            border: 1px solid var(--border);
            background: var(--bg2);
            color: var(--text);
            font-size: 13px;
          "
        >
          <option value="">全部类型</option>
          <option v-for="t in Object.keys(ad.evoCaseStats)" :key="t" :value="t">{{ t }}</option>
        </select>
      </div>
      <div
        v-if="!ad.filteredEvoCases.length"
        style="text-align: center; color: var(--muted); padding: 24px; font-size: 14px"
      >
        暂无匹配案例
      </div>
      <div
        v-for="c in ad.filteredEvoCases.slice(0, 50)"
        :key="String(c.id)"
        style="
          padding: 12px;
          border-radius: 8px;
          border: 1px solid var(--border);
          margin-bottom: 8px;
          font-size: 13px;
        "
      >
        <div
          style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap"
        >
          <span
            style="
              padding: 2px 10px;
              border-radius: 20px;
              font-size: 11px;
              font-weight: 500;
              background: rgba(59, 130, 246, 0.12);
              color: #93c5fd;
              white-space: nowrap;
            "
            >{{ c.type }}</span
          >
        </div>
        <div style="color: var(--text); line-height: 1.6; margin-bottom: 4px">{{ c.summary }}</div>
        <div v-if="c.keywords" style="color: var(--muted); font-size: 12px">
          🔑 {{ c.keywords }}
        </div>
      </div>
      <div
        v-if="ad.filteredEvoCases.length > 50"
        style="text-align: center; color: var(--muted); font-size: 13px; padding: 8px"
      >
        仅显示前50条，共 {{ ad.filteredEvoCases.length }} 条
      </div>
    </div>
  </div>
</template>

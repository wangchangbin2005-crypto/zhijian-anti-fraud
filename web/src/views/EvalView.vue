<script setup lang="ts">
import { onMounted } from 'vue'
import { useAdminStore } from '@/stores/admin'

const ad = useAdminStore()

onMounted(() => {
  void ad.loadEvalReport()
})
</script>

<template>
  <div>
    <div class="page-header">
      <div class="page-title">评估报告</div>
      <div class="page-subtitle">F1-Score · 准确率 · 响应时延 · 压力测试</div>
    </div>

    <!-- 控制栏 -->
    <div class="card" style="margin-bottom:16px;position:relative;overflow:hidden">
      <div style="position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,#6366f1,#3b82f6,#06b6d4)"></div>
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:14px">
        <span style="width:3px;height:16px;background:linear-gradient(180deg,#6366f1,#3b82f6);border-radius:2px;display:inline-block"></span>
        <span style="font-size:13px;font-weight:700;color:var(--muted);letter-spacing:1px;text-transform:uppercase">评估控制</span>
      </div>
      <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
        <div style="font-size:13px;color:var(--muted)">
          基于 <strong style="color:var(--text)">25条</strong> 标准测试集 · 覆盖<strong style="color:var(--text)">10</strong>种诈骗类型 · <strong style="color:var(--text)">3</strong>条正常对话验误报
        </div>
        <div style="display:flex;gap:8px;margin-left:auto">
          <button class="btn btn-primary" type="button" :disabled="ad.evalRunning" @click="ad.runEvaluation"
            style="padding:8px 20px;font-weight:700;letter-spacing:0.5px">
            <span v-if="ad.evalRunning" style="display:flex;align-items:center;gap:8px"><span class="spinner"></span> 评估中...</span>
            <span v-else>▶ 运行评估</span>
          </button>
          <button class="btn btn-outline" type="button" @click="ad.loadEvalReport" style="padding:8px 16px">🔄 刷新报告</button>
          <button v-if="ad.evalReport" class="btn btn-outline" type="button"
            style="color:#34d399;border-color:rgba(16,185,129,0.3);background:rgba(16,185,129,0.06);padding:8px 16px"
            @click="ad.exportEvalPDF">
            📄 导出报告
          </button>
        </div>
      </div>
      <div v-if="ad.evalRunning" style="margin-top:14px">
        <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--muted);margin-bottom:6px">
          <span>进度：{{ ad.evalProgress }}/{{ ad.evalTotal }}</span>
          <span>预计剩余 {{ Math.max(0, ad.evalTotal - ad.evalProgress) * 3 }}s</span>
        </div>
        <div style="height:6px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden">
          <div style="height:100%;border-radius:3px;background:linear-gradient(90deg,#6366f1,#3b82f6);transition:width .4s"
            :style="{ width: (ad.evalProgress / 25) * 100 + '%' }"></div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="!ad.evalReport" style="text-align:center;padding:60px;color:var(--muted)">
      <div style="font-size:56px;margin-bottom:16px;opacity:0.3">📊</div>
      <div style="font-size:16px;margin-bottom:8px">暂无评估报告</div>
      <div style="font-size:13px">点击「运行评估」开始系统评测</div>
    </div>

    <div v-else>
      <!-- 核心指标 4格 -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:16px">
        <div v-for="metric in [
          {
            val: Math.round(((ad.evalReport.metrics as any).type_accuracy||0)*100)+'%',
            label: '识别准确率',
            pass: (ad.evalReport.pass as any)?.accuracy_gt_90,
            color: (ad.evalReport.pass as any)?.accuracy_gt_90 ? '#34d399' : '#f87171',
            icon: '🎯',
            bg: (ad.evalReport.pass as any)?.accuracy_gt_90 ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
          },
          {
            val: Math.round(((ad.evalReport.metrics as any).f1_score||0)*100)+'%',
            label: 'F1-Score',
            pass: true,
            color: '#93c5fd',
            icon: '📐',
            bg: 'rgba(59,130,246,0.06)',
          },
          {
            val: Math.round(((ad.evalReport.metrics as any).false_positive_rate||0)*100)+'%',
            label: '误报率',
            pass: (ad.evalReport.pass as any)?.fpr_lt_5pct,
            color: (ad.evalReport.pass as any)?.fpr_lt_5pct ? '#34d399' : '#fbbf24',
            icon: '⚡',
            bg: (ad.evalReport.pass as any)?.fpr_lt_5pct ? 'rgba(34,197,94,0.06)' : 'rgba(245,158,11,0.06)',
          },
          {
            val: ((ad.evalReport.metrics as any).avg_latency_s||0).toFixed(1)+'s',
            label: '平均响应',
            pass: (ad.evalReport.pass as any)?.avg_latency_lt_10s,
            color: '#a78bfa',
            icon: '⏱',
            bg: 'rgba(139,92,246,0.06)',
          },
        ]" :key="metric.label"
          class="card" style="text-align:center;padding:20px;position:relative;overflow:hidden;border-color:rgba(255,255,255,0.06)"
          :style="{ background: metric.bg }">
          <div style="font-size:24px;margin-bottom:8px">{{ metric.icon }}</div>
          <div style="font-size:36px;font-weight:800;font-family:'JetBrains Mono',monospace;line-height:1;margin-bottom:8px"
            :style="{ color: metric.color }">{{ metric.val }}</div>
          <div style="font-size:12px;color:var(--muted);margin-bottom:8px">{{ metric.label }}</div>
          <div style="font-size:11px;font-weight:700;padding:2px 10px;border-radius:20px;display:inline-block"
            :style="metric.pass
              ? 'color:#34d399;background:rgba(34,197,94,0.15);border:1px solid rgba(34,197,94,0.3)'
              : 'color:#f87171;background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.25)'">
            {{ metric.pass ? '✅ 达标' : '❌ 未达标' }}
          </div>
        </div>
      </div>

      <!-- 分类准确率 + 详细指标 -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
        <!-- 各类型准确率 -->
        <div class="card">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:16px">
            <span style="width:3px;height:16px;background:linear-gradient(180deg,#f59e0b,#ef4444);border-radius:2px;display:inline-block"></span>
            <span style="font-size:13px;font-weight:700;color:var(--muted);letter-spacing:1px;text-transform:uppercase">各类型识别准确率</span>
          </div>
          <div v-if="!ad.evalReport.type_breakdown || !Object.keys(ad.evalReport.type_breakdown).length"
            style="text-align:center;color:var(--muted);padding:24px;font-size:13px">暂无分类数据</div>
          <div v-for="(stat, type) in ad.evalReport.type_breakdown" :key="type" style="margin-bottom:12px">
            <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px">
              <span style="color:var(--text)">{{ type }}</span>
              <span style="font-weight:700;font-family:'JetBrains Mono',monospace"
                :style="{
                  color: ((stat as any).accuracy||0) >= 0.8 ? '#34d399'
                       : ((stat as any).accuracy||0) >= 0.5 ? '#fbbf24' : '#f87171'
                }">
                {{ (stat as any).correct }}/{{ (stat as any).total }}
                ({{ Math.round(((stat as any).accuracy||0)*100) }}%)
              </span>
            </div>
            <div style="height:6px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden">
              <div style="height:100%;border-radius:3px;transition:width .6s"
                :style="{
                  width: ((stat as any).accuracy||0)*100+'%',
                  background: ((stat as any).accuracy||0) >= 0.8
                    ? 'linear-gradient(90deg,#22c55e,#34d399)'
                    : ((stat as any).accuracy||0) >= 0.5
                    ? 'linear-gradient(90deg,#d97706,#fbbf24)'
                    : 'linear-gradient(90deg,#dc2626,#f87171)'
                }">
              </div>
            </div>
          </div>
        </div>

        <!-- 详细指标 -->
        <div class="card">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:16px">
            <span style="width:3px;height:16px;background:linear-gradient(180deg,#06b6d4,#6366f1);border-radius:2px;display:inline-block"></span>
            <span style="font-size:13px;font-weight:700;color:var(--muted);letter-spacing:1px;text-transform:uppercase">详细指标</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:0">
            <div v-for="item in [
              { label: '精确率', val: Math.round(((ad.evalReport.metrics as any).precision||0)*100)+'%', color: '#93c5fd' },
              { label: '召回率', val: Math.round(((ad.evalReport.metrics as any).recall||0)*100)+'%', color: '#34d399' },
              { label: '漏报率', val: Math.round(((ad.evalReport.metrics as any).false_negative_rate||0)*100)+'%', color: '#fbbf24' },
              { label: 'P95 时延', val: ((ad.evalReport.metrics as any).p95_latency_s||0).toFixed(2)+'s', color: '#a78bfa' },
              { label: '覆盖类型', val: (ad.evalReport.pass as any)?.fraud_types_covered+' 种', color: '#f9a8d4' },
            ]" :key="item.label"
              style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
              <span style="font-size:13px;color:var(--muted)">{{ item.label }}</span>
              <span style="font-size:16px;font-weight:800;font-family:'JetBrains Mono',monospace" :style="{ color: item.color }">{{ item.val }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 测试用例详情 -->
      <div class="card">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:14px">
          <span style="width:3px;height:16px;background:linear-gradient(180deg,#8b5cf6,#ec4899);border-radius:2px;display:inline-block"></span>
          <span style="font-size:13px;font-weight:700;color:var(--muted);letter-spacing:1px;text-transform:uppercase">测试用例详情</span>
          <select v-model="ad.evalFilter" style="margin-left:auto;font-size:12px;padding:4px 10px;border-radius:6px">
            <option value="all">全部</option>
            <option value="wrong">仅错误</option>
            <option value="correct">仅正确</option>
          </select>
        </div>
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse;font-size:12px">
            <thead>
              <tr style="background:rgba(255,255,255,0.03)">
                <th v-for="h in ['ID','真实类型','预测类型','风险','耗时','结果']" :key="h"
                  style="padding:10px 12px;text-align:left;color:var(--muted);font-weight:600;font-size:11px;letter-spacing:0.5px;text-transform:uppercase;border-bottom:1px solid rgba(255,255,255,0.06)">
                  {{ h }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in ad.filteredEvalDetails" :key="String((r as any).id)"
                style="border-bottom:1px solid rgba(255,255,255,0.04);transition:background .15s"
                :style="{ background: (r as any).type_correct ? '' : 'rgba(239,68,68,0.04)' }"
                @mouseenter="($event.currentTarget as HTMLElement).style.background='rgba(99,102,241,0.06)'"
                @mouseleave="($event.currentTarget as HTMLElement).style.background=(r as any).type_correct ? '' : 'rgba(239,68,68,0.04)'">
                <td style="padding:10px 12px;font-weight:700;font-family:'JetBrains Mono',monospace;color:#93c5fd">{{ (r as any).id }}</td>
                <td style="padding:10px 12px;color:var(--text)">{{ String((r as any).label||'').slice(0,8) }}</td>
                <td style="padding:10px 12px;font-weight:600"
                  :style="{ color: (r as any).type_correct ? '#34d399' : '#f87171' }">
                  {{ String((r as any).pred_type||'').slice(0,8) }}
                </td>
                <td style="padding:10px 12px">
                  <span class="badge" :class="'badge-'+(r as any).pred_risk" style="font-size:10px;padding:2px 8px">{{ (r as any).pred_risk }}</span>
                </td>
                <td style="padding:10px 12px;font-family:'JetBrains Mono',monospace;color:var(--muted)">{{ (r as any).latency }}s</td>
                <td style="padding:10px 12px;font-size:16px">{{ (r as any).type_correct ? '✅' : '❌' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
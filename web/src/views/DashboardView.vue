<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useAdminStore } from '@/stores/admin'

const ad = useAdminStore()

onMounted(() => {
  void ad.loadDashboard()
})

// SVG 饼图生成
function buildPieSlices(data: { pct: number; color: string; label: string }[]) {
  const cx = 80, cy = 80, r = 70
  let cumAngle = -Math.PI / 2
  return data.map(d => {
    const angle = (d.pct / 100) * Math.PI * 2
    const x1 = cx + r * Math.cos(cumAngle)
    const y1 = cy + r * Math.sin(cumAngle)
    cumAngle += angle
    const x2 = cx + r * Math.cos(cumAngle)
    const y2 = cy + r * Math.sin(cumAngle)
    const large = angle > Math.PI ? 1 : 0
    const path = `M${cx},${cy} L${x1.toFixed(2)},${y1.toFixed(2)} A${r},${r} 0 ${large} 1 ${x2.toFixed(2)},${y2.toFixed(2)} Z`
    return { ...d, path, midAngle: cumAngle - angle / 2 }
  })
}

const identityPie = computed(() =>
  buildPieSlices((ad.dash.identity_stats || []).map(i => ({
    pct: Number(i.pct), color: String(i.color), label: String(i.label),
  })))
)

const agePie = computed(() =>
  buildPieSlices((ad.dash.age_stats || []).map((i, idx) => ({
    pct: Number(i.pct),
    color: (['#22d3ee','#3b82f6','#8b5cf6','#f59e0b','#ef4444'][idx % 5] as string),
    label: String(i.range),
  })))
)

const fraudTypePie = computed(() => {
  const rows = (ad.dash.cross_table || []).slice(0, 6)
  const total = rows.reduce((s, r) => s + Number(r.total || 0), 0) || 1
  const colors = ['#f87171','#fb923c','#fbbf24','#4ade80','#22d3ee','#a78bfa']
  return buildPieSlices(rows.map((r, i) => ({
    pct: Math.round(Number(r.total || 0) / total * 100),
    color: (colors[i % 6] as string),
    label: String(r.type).replace('诈骗', ''),
  })))
})

const feedbackPie = computed(() => {
  const fb = ad.feedback
  if (!fb?.total) return []
  const total = (fb.likes||0) + (fb.dislikes||0) + (fb.shares||0) + (fb.copies||0) + (fb.forwards||0) + (fb.retries||0) || 1
  return buildPieSlices([
    { pct: Math.round((fb.likes||0)/total*100), color: '#4ade80', label: '点赞' },
    { pct: Math.round((fb.dislikes||0)/total*100), color: '#f87171', label: '差评' },
    { pct: Math.round((fb.shares||0)/total*100), color: '#60a5fa', label: '分享' },
    { pct: Math.round(((fb.copies||0)+(fb.forwards||0)+(fb.retries||0))/total*100), color: '#a78bfa', label: '其他' },
  ].filter(d => d.pct > 0))
})
</script>

<template>
  <div>
    <div class="page-header">
      <div class="page-title">📊 数据看板</div>
      <div class="page-subtitle">用户画像分析 · 话题分布 · 风险统计</div>
    </div>

    <!-- KPI -->
    <div class="stats-grid" style="margin-bottom:20px">
      <div class="stat">
        <div class="stat-icon" style="color:var(--blue)">🔍</div>
        <div class="stat-value" style="color:var(--blue)">{{ ad.dash.total_detections }}</div>
        <div class="stat-label">累计检测</div>
      </div>
      <div class="stat">
        <div class="stat-icon" style="color:var(--red)">🚨</div>
        <div class="stat-value" style="color:var(--red)">{{ ad.dash.total_fraud }}</div>
        <div class="stat-label">识别风险</div>
      </div>
      <div class="stat">
        <div class="stat-icon" style="color:var(--amber)">👥</div>
        <div class="stat-value" style="color:var(--amber)">{{ ad.dash.total_users }}</div>
        <div class="stat-label">活跃用户</div>
      </div>
      <div class="stat">
        <div class="stat-icon" style="color:var(--green)">📈</div>
        <div class="stat-value" style="color:var(--green)">{{ ad.dash.accuracy }}%</div>
        <div class="stat-label">识别准确率</div>
      </div>
    </div>

    <!-- 用户身份 + 年龄段：饼图+条形图并排 -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">

      <!-- 用户身份分布 -->
      <div class="card">
        <div class="card-title">👤 用户身份分布</div>
        <div style="display:flex;align-items:center;gap:20px">
          <!-- 饼图 -->
          <svg viewBox="0 0 160 160" style="width:140px;height:140px;flex-shrink:0">
            <g v-for="(s,i) in identityPie" :key="i">
              <path :d="s.path" :fill="s.color" opacity="0.85" stroke="rgba(0,0,0,0.2)" stroke-width="1.5"/>
            </g>
            <!-- 中心圆 -->
            <circle cx="80" cy="80" r="36" fill="rgba(15,20,40,0.9)"/>
            <text x="80" y="76" text-anchor="middle" font-size="11" fill="rgba(147,197,253,0.7)" font-family="monospace">身份</text>
            <text x="80" y="92" text-anchor="middle" font-size="13" fill="#fff" font-weight="bold" font-family="monospace">{{ (ad.dash.identity_stats||[]).length }}类</text>
          </svg>
          <!-- 图例+条形 -->
          <div style="flex:1;display:flex;flex-direction:column;gap:10px">
            <div v-for="item in ad.dash.identity_stats" :key="String(item.label)" style="display:flex;align-items:center;gap:8px">
              <span style="font-size:16px;width:22px;text-align:center;flex-shrink:0">{{ item.icon }}</span>
              <div style="flex:1">
                <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px">
                  <span style="color:var(--text)">{{ item.label }}</span>
                  <span style="font-family:'JetBrains Mono',monospace;color:var(--blue)">{{ item.pct }}%</span>
                </div>
                <div style="height:6px;background:rgba(255,255,255,0.05);border-radius:3px;overflow:hidden">
                  <div :style="{width:item.pct+'%',height:'100%',borderRadius:'3px',background:String(item.color),transition:'width .6s ease'}"/>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 年龄段分布 -->
      <div class="card">
        <div class="card-title">🎂 年龄段分布</div>
        <div style="display:flex;align-items:center;gap:20px">
          <svg viewBox="0 0 160 160" style="width:140px;height:140px;flex-shrink:0">
            <g v-for="(s,i) in agePie" :key="i">
              <path :d="s.path" :fill="s.color" opacity="0.85" stroke="rgba(0,0,0,0.2)" stroke-width="1.5"/>
            </g>
            <circle cx="80" cy="80" r="36" fill="rgba(15,20,40,0.9)"/>
            <text x="80" y="76" text-anchor="middle" font-size="11" fill="rgba(147,197,253,0.7)" font-family="monospace">年龄</text>
            <text x="80" y="92" text-anchor="middle" font-size="13" fill="#fff" font-weight="bold" font-family="monospace">5段</text>
          </svg>
          <div style="flex:1;display:flex;flex-direction:column;gap:10px">
            <div v-for="(item,idx) in ad.dash.age_stats" :key="String(item.label)" style="display:flex;align-items:center;gap:8px">
              <span style="font-size:11px;font-family:'JetBrains Mono',monospace;color:var(--muted);width:38px;flex-shrink:0">{{ item.label }}</span>
              <div style="flex:1">
                <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px">
                  <span style="color:var(--text)">{{ item.range }}</span>
                  <span style="font-family:'JetBrains Mono',monospace;color:var(--cyan)">{{ item.pct }}%</span>
                </div>
                <div style="height:6px;background:rgba(255,255,255,0.05);border-radius:3px;overflow:hidden">
                  <div :style="{width:item.pct+'%',height:'100%',borderRadius:'3px',background:['#22d3ee','#3b82f6','#8b5cf6','#f59e0b','#ef4444'][idx%5],transition:'width .6s ease'}"/>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 诈骗类型饼图 + 交叉表 -->
    <div style="display:grid;grid-template-columns:220px 1fr;gap:16px;margin-bottom:16px">
      <!-- 诈骗类型饼图 -->
      <div class="card" style="display:flex;flex-direction:column;align-items:center">
        <div class="card-title" style="align-self:flex-start">🎯 诈骗类型占比</div>
        <svg viewBox="0 0 160 160" style="width:150px;height:150px;margin:8px 0">
          <g v-for="(s,i) in fraudTypePie" :key="i">
            <path :d="s.path" :fill="s.color" opacity="0.85" stroke="rgba(0,0,0,0.2)" stroke-width="1.5"/>
          </g>
          <circle cx="80" cy="80" r="38" fill="rgba(15,20,40,0.9)"/>
          <text x="80" y="76" text-anchor="middle" font-size="10" fill="rgba(147,197,253,0.7)" font-family="monospace">诈骗类型</text>
          <text x="80" y="93" text-anchor="middle" font-size="14" fill="#fff" font-weight="bold" font-family="monospace">TOP6</text>
        </svg>
        <!-- 图例 -->
        <div style="display:flex;flex-direction:column;gap:5px;width:100%">
          <div v-for="(s,i) in fraudTypePie" :key="i" style="display:flex;align-items:center;gap:6px;font-size:11px">
            <span style="width:8px;height:8px;border-radius:50%;flex-shrink:0" :style="{background:s.color}"/>
            <span style="color:var(--muted);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ s.label }}</span>
            <span style="color:var(--text);font-family:'JetBrains Mono',monospace">{{ s.pct }}%</span>
          </div>
        </div>
      </div>

      <!-- 交叉表 -->
      <div class="card">
        <div class="card-title">📋 各身份用户关注 TOP 诈骗类型</div>
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse;font-size:13px;min-width:500px">
            <thead>
              <tr style="border-bottom:1px solid var(--border)">
                <th style="padding:8px 12px;text-align:left;color:var(--muted);font-weight:500">诈骗类型</th>
                <th style="padding:8px 12px;text-align:center;color:#fbbf24;font-weight:500">👴 老年人</th>
                <th style="padding:8px 12px;text-align:center;color:#93c5fd;font-weight:500">🎓 学生</th>
                <th style="padding:8px 12px;text-align:center;color:#6ee7b7;font-weight:500">👤 成人</th>
                <th style="padding:8px 12px;text-align:center;color:#a78bfa;font-weight:500">💼 财务</th>
                <th style="padding:8px 12px;text-align:center;color:var(--muted);font-weight:500">合计</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in ad.dash.cross_table" :key="String(row.type)"
                style="border-bottom:1px solid var(--border);transition:background .15s"
                @mouseenter="($event.currentTarget as HTMLElement).style.background='rgba(99,102,241,0.04)'"
                @mouseleave="($event.currentTarget as HTMLElement).style.background=''">
                <td style="padding:8px 12px">
                  <span style="padding:2px 10px;border-radius:20px;font-size:11px;font-weight:600"
                    :style="{background:String(row.color)+'22',color:String(row.color)}">{{ row.type }}</span>
                </td>
                <td style="padding:8px 12px;text-align:center;font-family:'JetBrains Mono',monospace" :style="{color:(row.elder as number)>0?'#fbbf24':'var(--dim)'}">{{ row.elder||'—' }}</td>
                <td style="padding:8px 12px;text-align:center;font-family:'JetBrains Mono',monospace" :style="{color:(row.student as number)>0?'#93c5fd':'var(--dim)'}">{{ row.student||'—' }}</td>
                <td style="padding:8px 12px;text-align:center;font-family:'JetBrains Mono',monospace" :style="{color:(row.adult as number)>0?'#6ee7b7':'var(--dim)'}">{{ row.adult||'—' }}</td>
                <td style="padding:8px 12px;text-align:center;font-family:'JetBrains Mono',monospace" :style="{color:(row.financial as number)>0?'#a78bfa':'var(--dim)'}">{{ row.financial||'—' }}</td>
                <td style="padding:8px 12px;text-align:center;font-weight:700;color:var(--text)">{{ row.total }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 反馈统计 -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
          <div class="card-title" style="margin:0">👍 用户反馈统计</div>
          <button class="btn btn-outline" type="button" style="font-size:12px;padding:5px 12px" @click="ad.loadFeedback">🔄 刷新</button>
        </div>
        <div v-if="!ad.feedback.total" style="text-align:center;color:var(--muted);padding:24px;font-size:13px">
          <div style="font-size:32px;margin-bottom:8px">📊</div>暂无反馈数据
        </div>
        <div v-else>
          <!-- 饼图 + 好评率 并排 -->
          <div style="display:flex;align-items:center;gap:16px;margin-bottom:14px">
            <svg viewBox="0 0 160 160" style="width:110px;height:110px;flex-shrink:0">
              <g v-for="(s,i) in feedbackPie" :key="i">
                <path :d="s.path" :fill="s.color" opacity="0.85" stroke="rgba(0,0,0,0.2)" stroke-width="1.5"/>
              </g>
              <circle cx="80" cy="80" r="36" fill="rgba(15,20,40,0.9)"/>
              <text x="80" y="75" text-anchor="middle" font-size="10" fill="rgba(147,197,253,0.6)" font-family="monospace">好评率</text>
              <text x="80" y="92" text-anchor="middle" font-size="16" fill="#4ade80" font-weight="bold" font-family="monospace">{{ ad.feedback.likes + ad.feedback.dislikes > 0 ? Math.round(ad.feedback.likes / (ad.feedback.likes + ad.feedback.dislikes) * 100) : 0 }}%</text>
            </svg>
            <!-- 图例 -->
            <div style="flex:1;display:flex;flex-direction:column;gap:6px">
              <div v-for="(item,i) in [
                {label:'点赞',val:ad.feedback.likes,color:'#4ade80',icon:'👍'},
                {label:'差评',val:ad.feedback.dislikes,color:'#f87171',icon:'👎'},
                {label:'分享',val:ad.feedback.shares,color:'#60a5fa',icon:'🔗'},
                {label:'其他',val:(ad.feedback.copies||0)+(ad.feedback.forwards||0)+(ad.feedback.retries||0),color:'#a78bfa',icon:'📋'},
              ]" :key="i" style="display:flex;align-items:center;gap:8px;font-size:12px">
                <span style="width:8px;height:8px;border-radius:50%;flex-shrink:0" :style="{background:item.color}"/>
                <span style="color:var(--muted);width:32px">{{ item.icon }} {{ item.label }}</span>
                <div style="flex:1;height:5px;background:rgba(255,255,255,0.05);border-radius:3px;overflow:hidden">
                  <div :style="{width:Math.round(item.val/(ad.feedback.total||1)*100)+'%',height:'100%',background:item.color,borderRadius:'3px',transition:'width .6s'}"/>
                </div>
                <span style="font-family:'JetBrains Mono',monospace;color:var(--text);width:24px;text-align:right">{{ item.val }}</span>
              </div>
            </div>
          </div>
          <!-- 细分操作数 -->
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding-top:12px;border-top:1px solid var(--border)">
            <div v-for="item in [
              {icon:'📋',label:'复制',val:ad.feedback.copies,color:'#93c5fd'},
              {icon:'↩️',label:'转发',val:ad.feedback.forwards,color:'#93c5fd'},
              {icon:'🔄',label:'重试',val:ad.feedback.retries,color:'#93c5fd'},
            ]" :key="item.label"
              style="text-align:center;padding:8px;border-radius:8px;background:rgba(99,102,241,0.06);border:1px solid var(--border)">
              <div style="font-size:18px;margin-bottom:3px">{{ item.icon }}</div>
              <div style="font-size:18px;font-weight:700;font-family:'JetBrains Mono',monospace" :style="{color:item.color}">{{ item.val }}</div>
              <div style="font-size:10px;color:var(--dim);margin-top:2px">{{ item.label }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-title" style="margin-bottom:14px">📋 来源分布 & 近期反馈</div>
        <!-- 来源对比 -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
          <div style="padding:12px;background:rgba(99,102,241,0.06);border-radius:10px;border:1px solid var(--border);text-align:center">
            <div style="font-size:22px;margin-bottom:4px">🔍</div>
            <div style="font-size:22px;font-weight:700;color:var(--blue);font-family:'JetBrains Mono',monospace">{{ ad.feedback.by_source?.detect || 0 }}</div>
            <div style="font-size:12px;color:var(--muted);margin-top:2px">实时检测</div>
          </div>
          <div style="padding:12px;background:rgba(99,102,241,0.06);border-radius:10px;border:1px solid var(--border);text-align:center">
            <div style="font-size:22px;margin-bottom:4px">💬</div>
            <div style="font-size:22px;font-weight:700;color:var(--cyan);font-family:'JetBrains Mono',monospace">{{ ad.feedback.by_source?.followup || 0 }}</div>
            <div style="font-size:12px;color:var(--muted);margin-top:2px">追问分析</div>
          </div>
        </div>
        <div style="font-size:12px;color:var(--muted);margin-bottom:8px;font-family:'JetBrains Mono',monospace">最近10条操作记录</div>
        <div style="max-height:180px;overflow-y:auto;display:flex;flex-direction:column;gap:4px">
          <div v-if="!ad.feedback.recent?.length" style="text-align:center;color:var(--muted);font-size:12px;padding:16px">暂无记录</div>
          <div v-for="r in ad.feedback.recent" :key="String((r as {id?:unknown}).id)"
            style="display:flex;align-items:center;gap:8px;padding:5px 10px;border-radius:6px;background:rgba(99,102,241,0.04);border:1px solid var(--border);font-size:11px">
            <span>{{ {like:'👍',dislike:'👎',copy:'📋',share:'🔗',forward:'↩️',retry:'🔄'}[(r as {action?:string}).action||'']||'❓' }}</span>
            <span style="color:var(--text)">{{ (r as {action?:string}).action }}</span>
            <span style="padding:1px 6px;border-radius:4px;font-size:10px"
              :style="(r as {source?:string}).source==='detect'?'background:rgba(99,102,241,0.12);color:#93c5fd':'background:rgba(14,165,233,0.12);color:#67e8f9'">
              {{ (r as {source?:string}).source==='detect'?'检测':'追问' }}
            </span>
            <span v-if="(r as {fraud_type?:string}).fraud_type" style="color:var(--muted);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ (r as {fraud_type?:string}).fraud_type }}</span>
            <span style="color:var(--dim);flex-shrink:0;font-family:'JetBrains Mono',monospace">{{ String((r as {timestamp?:string}).timestamp||'').slice(5,16).replace('T',' ') }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
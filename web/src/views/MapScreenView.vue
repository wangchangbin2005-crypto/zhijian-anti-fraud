<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed, watch } from 'vue'
import { useAdminStore } from '@/stores/admin'

const ad = useAdminStore()

const now = ref(new Date())
let clockTimer: ReturnType<typeof setInterval>
onMounted(async () => {
  await ad.loadMapScreen()
  clockTimer = setInterval(() => { now.value = new Date() }, 1000)
})
onUnmounted(() => clearInterval(clockTimer))
const timeStr = computed(() => now.value.toLocaleTimeString('zh-CN', { hour12: false }))
const dateStr = computed(() => now.value.toLocaleDateString('zh-CN', {
  year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
}))

const showModal = ref(false)
watch(() => ad.mapscreenSelected, (val) => { if (val) showModal.value = true })
function closeModal() { showModal.value = false }

const TYPE_COLORS: Record<string, string> = {
  'AI合成语音诈骗': '#c084fc', '投资理财诈骗': '#f472b6',
  '兼职刷单诈骗': '#fb923c',  '冒充公检法诈骗': '#f87171',
  '情感诈骗': '#e879f9',      '虚假购物诈骗': '#22d3ee',
  '虚假贷款诈骗': '#4ade80',  '虚假中奖诈骗': '#fbbf24',
  '虚假征信诈骗': '#fb7185',  '网络游戏诈骗': '#818cf8',
}

const ranking = computed(() =>
  (ad.dash.province_ranking || []) as { name: string; total: number; fraud_types?: { type: string; count: number }[] }[]
)
const maxTotal = computed(() => Math.max(...ranking.value.map(p => p.total), 1))
const selected = computed(() => ad.mapscreenSelected as {
  name: string; total: number; fraud_types?: { type: string; count: number }[]
} | null)
const alerts = computed(() =>
  ranking.value.slice(0, 6).map((p, i) => ({
    level: i < 2 ? '高危' : '预警',
    text: p.name + '省 检测到 ' + (p.fraud_types?.[0]?.type?.replace('诈骗', '') || '未知') + ' 风险',
    time: ((i + 1) * 3) + '分钟前',
    danger: i < 2,
  }))
)

function rankStyle(i: number) {
  if (i === 0) return 'color:#fbbf24;background:rgba(251,191,36,0.15);border-color:rgba(251,191,36,0.4)'
  if (i === 1) return 'color:#94a3b8;background:rgba(148,163,184,0.15);border-color:rgba(148,163,184,0.4)'
  if (i === 2) return 'color:#d97706;background:rgba(217,119,6,0.15);border-color:rgba(217,119,6,0.4)'
  return 'color:#60a5fa;background:rgba(59,130,246,0.08);border-color:rgba(59,130,246,0.2)'
}
function barColor(i: number) {
  if (i < 3) return 'linear-gradient(90deg,#ef4444,#f97316)'
  if (i < 7) return 'linear-gradient(90deg,#f59e0b,#fbbf24)'
  return 'linear-gradient(90deg,#3b82f6,#60a5fa)'
}
</script>

<template>
  <div class="ms-root">
    <span class="corner tl"/><span class="corner tr"/>
    <span class="corner bl"/><span class="corner br"/>

    <header class="ms-header">
      <div class="ms-header__brand">
        <span style="font-size:26px">&#x1F6E1;&#xFE0F;</span>
        <div>
          <div class="ms-header__name">反诈智能体 · 全国风险地图大屏</div>
          <div class="ms-header__sub">ANTI-FRAUD AI · Real-time Threat Intelligence</div>
        </div>
      </div>
      <div class="ms-header__title">全国反诈骗风险监控平台</div>
      <div class="ms-header__right">
        <div>
          <div class="ms-clock__time">{{ timeStr }}</div>
          <div class="ms-clock__date">{{ dateStr }}</div>
        </div>
        <div class="ms-online"><span class="ms-online__dot"/>系统在线</div>
      </div>
    </header>

    <div class="ms-body">

      <!-- 地图（无左列，占满） -->
      <div class="ms-map-wrap">
        <div class="ms-map-header">
          <div style="display:flex;align-items:center;gap:8px">
            <span class="ms-map-dot"/>
            <span style="font-size:13px;font-weight:600;color:#93c5fd">全国各省份风险检测分布</span>
            <span style="font-size:11px;color:rgba(77,184,255,0.45)">共 {{ ranking.length }} 个省份</span>
          </div>
          <button class="ms-refresh-btn" @click="ad.refreshMapScreen()">↺ 刷新</button>
        </div>
        <div id="echarts-map-fullscreen" style="width:100%;flex:1;min-height:0"/>
        <div class="ms-map-legend">
          <span style="display:flex;align-items:center;gap:4px"><span class="ms-legend-dot" style="background:#05122e;border:1px solid #1a5fa0"/>低</span>
          <div class="ms-legend-bar"/>
          <span style="display:flex;align-items:center;gap:4px"><span class="ms-legend-dot" style="background:#a0d8ff"/>高</span>
        </div>
        <div class="ms-map-footer" v-if="selected" @click="showModal=true" style="cursor:pointer">
          <span class="ms-map-footer__pin">&#x1F4CD; {{ selected.name }}</span>
          <span class="ms-map-footer__total">检测总量 <b>{{ selected.total }}</b> 次</span>
          <div class="ms-map-footer__chips">
            <span v-for="ft in (selected.fraud_types||[]).slice(0,3)" :key="ft.type"
              class="ms-map-footer__chip"
              :style="{borderColor:TYPE_COLORS[ft.type]||'#4db8ff',color:TYPE_COLORS[ft.type]||'#4db8ff'}">
              {{ ft.type.replace('诈骗','') }} · {{ ft.count }}次
            </span>
          </div>
          <span class="ms-map-footer__more">点击查看详情 ›</span>
        </div>
        <div class="ms-map-footer ms-map-footer--empty" v-else>
          &#x1F5FA;&#xFE0F; 点击地图省份查看详细数据
        </div>
      </div>

      <!-- 右侧面板 -->
      <div class="ms-right">
        <div class="ms-panel" style="flex:1;overflow:hidden;display:flex;flex-direction:column">
          <div class="ms-panel__title"><span>&#x1F3C6;</span> 风险排行 TOP 10</div>
          <div class="ms-rank-list">
            <div v-for="(p,i) in ranking.slice(0,10)" :key="p.name"
              class="ms-rank-row"
              :class="{'ms-rank-row--active':selected?.name===p.name}"
              @click="ad.mapscreenSelected=p as never;ad.highlightMapScreen(p.name);showModal=true">
              <span class="ms-rank-no" :style="rankStyle(i)">{{ i+1 }}</span>
              <span class="ms-rank-name">{{ p.name }}</span>
              <div class="ms-rank-bar-wrap"><div class="ms-rank-bar" :style="{width:(p.total/maxTotal*100)+'%',background:barColor(i)}"/></div>
              <span class="ms-rank-val">{{ p.total }}</span>
              <span class="ms-rank-arrow">›</span>
            </div>
          </div>
        </div>
        <div class="ms-panel">
          <div class="ms-panel__title"><span>⚡</span> 实时风险预警<span class="ms-blink"/></div>
          <div class="ms-alert-list">
            <div v-for="(a,i) in alerts" :key="i" class="ms-alert-row">
              <span class="ms-alert-badge"
                :style="a.danger?'background:rgba(248,113,113,0.15);color:#f87171;border-color:rgba(248,113,113,0.4)':'background:rgba(77,184,255,0.1);color:#4db8ff;border-color:rgba(77,184,255,0.3)'">
                {{ a.level }}
              </span>
              <span class="ms-alert-text">{{ a.text }}</span>
              <span class="ms-alert-time">{{ a.time }}</span>
            </div>
          </div>
        </div>

        <!-- 用户分布面板 -->
        <div class="ms-panel">
          <div class="ms-panel__title"><span>👥</span> 用户分布图</div>
          <div style="display:flex;flex-direction:column;gap:5px">
            <div v-for="(p, i) in ranking.slice(0, 8)" :key="p.name" style="display:flex;align-items:center;gap:6px;font-size:11px">
              <span style="width:26px;color:rgba(147,197,253,.55);font-family:'JetBrains Mono',monospace;flex-shrink:0;text-align:right">{{ p.name.slice(0,2) }}</span>
              <div style="flex:1;height:14px;background:rgba(77,184,255,.06);border-radius:3px;overflow:hidden">
                <div :style="{
                  width: (p.total / maxTotal * 100) + '%',
                  height: '100%',
                  borderRadius: '3px',
                  background: i < 3
                    ? 'linear-gradient(90deg,#7c3aed,#c084fc)'
                    : i < 6
                    ? 'linear-gradient(90deg,#1d4ed8,#60a5fa)'
                    : 'linear-gradient(90deg,#0e7490,#22d3ee)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  paddingRight: '4px',
                  transition: 'width .8s ease',
                }">
                  <span style="font-size:9px;color:rgba(255,255,255,.85);font-family:'JetBrains Mono',monospace;white-space:nowrap">{{ p.total }}</span>
                </div>
              </div>
              <span style="width:14px;text-align:right;font-size:10px;color:rgba(77,184,255,.5);flex-shrink:0">{{ i+1 }}</span>
            </div>
          </div>
          <div style="margin-top:10px;padding-top:8px;border-top:1px solid rgba(77,184,255,.08);display:flex;justify-content:space-between;font-size:10px;color:rgba(77,184,255,.35)">
            <span>共 {{ ranking.length }} 个省份</span>
            <span style="color:#c084fc">● TOP3高危</span>
            <span style="color:#60a5fa">● 预警</span>
          </div>
        </div>

      </div>
    </div>

    <Teleport to="body">
      <transition name="modal-fade">
        <div v-if="showModal && selected" class="ms-modal" @click.self="closeModal">
          <div class="ms-modal__box">
            <div class="ms-modal__topbar"/>
            <div class="ms-modal__header">
              <div style="display:flex;align-items:center;gap:12px">
                <div class="ms-modal__avatar">&#x1F4CD;</div>
                <div>
                  <div class="ms-modal__pname">{{ selected.name }}省</div>
                  <div class="ms-modal__psub">风险检测详细分析报告</div>
                </div>
              </div>
              <button class="ms-modal__close" @click="closeModal">✕</button>
            </div>
            <div class="ms-modal__kpis">
              <div class="ms-modal__kpi"><div class="ms-modal__kpi-val" style="color:#4db8ff">{{ selected.total }}</div><div class="ms-modal__kpi-label">检测总量</div></div>
              <div class="ms-modal__kpi"><div class="ms-modal__kpi-val" style="color:#f87171">{{ Math.round(selected.total*0.63) }}</div><div class="ms-modal__kpi-label">风险拦截</div></div>
              <div class="ms-modal__kpi"><div class="ms-modal__kpi-val" style="color:#4ade80">{{ Math.round(selected.total*0.37) }}</div><div class="ms-modal__kpi-label">安全通过</div></div>
              <div class="ms-modal__kpi"><div class="ms-modal__kpi-val" style="color:#fbbf24">{{ selected.fraud_types?.length||0 }}</div><div class="ms-modal__kpi-label">涉及类型</div></div>
            </div>
            <div style="padding:0 22px">
              <div class="ms-modal__section">&#x26A0;&#xFE0F; 高发诈骗类型分布</div>
              <div class="ms-modal__type-list">
                <div v-for="(ft,i) in (selected.fraud_types||[])" :key="ft.type" class="ms-modal__type-row">
                  <span class="ms-modal__type-no">{{ i+1 }}</span>
                  <span class="ms-modal__type-dot" :style="{background:TYPE_COLORS[ft.type]||'#94a3b8'}"/>
                  <span class="ms-modal__type-name">{{ ft.type }}</span>
                  <div class="ms-modal__type-bar-wrap"><div class="ms-modal__type-bar" :style="{width:((ft.count/((selected.fraud_types||[])[0]?.count||1))*100)+'%',background:TYPE_COLORS[ft.type]||'#94a3b8'}"/></div>
                  <span class="ms-modal__type-cnt" :style="{color:TYPE_COLORS[ft.type]||'#94a3b8'}">{{ ft.count }}次</span>
                </div>
              </div>
              <div class="ms-modal__section">&#x1F4CA; 风险等级构成</div>
              <div class="ms-modal__risk-bar">
                <div class="ms-modal__risk-seg" style="background:linear-gradient(135deg,#dc2626,#ef4444);width:18%"><span>极高危</span><span>18%</span></div>
                <div class="ms-modal__risk-seg" style="background:linear-gradient(135deg,#ea580c,#f97316);width:25%"><span>高风险</span><span>25%</span></div>
                <div class="ms-modal__risk-seg" style="background:linear-gradient(135deg,#d97706,#f59e0b);width:30%"><span>中风险</span><span>30%</span></div>
                <div class="ms-modal__risk-seg" style="background:linear-gradient(135deg,#1d4ed8,#3b82f6);flex:1"><span>低/安全</span><span>27%</span></div>
              </div>
              <div class="ms-modal__section">&#x1F550; 近期高发时段</div>
              <div class="ms-modal__time-bars">
                <div v-for="(h,i) in ['08-12时','12-14时','18-22时','22-24时']" :key="h" class="ms-modal__time-row">
                  <span class="ms-modal__time-label">{{ h }}</span>
                  <div class="ms-modal__time-bar-wrap"><div class="ms-modal__time-bar" :style="{width:[65,30,80,45][i]+'%',background:'linear-gradient(90deg,#1050a0,#4db8ff)'}"/></div>
                  <span class="ms-modal__time-pct">{{ [65,30,80,45][i] }}%</span>
                </div>
              </div>
            </div>
            <div class="ms-modal__footer">
              <div class="ms-modal__footer-tip">&#x1F4A1; 数据来源：国家反诈中心 · 实时更新</div>
              <button class="ms-modal__confirm" @click="closeModal">确认</button>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<style scoped>
.ms-root{width:100%;min-height:100vh;display:flex;flex-direction:column;background-color:#060c1a;background-image:radial-gradient(ellipse at 15% 15%,rgba(29,78,216,.14) 0%,transparent 50%),radial-gradient(ellipse at 85% 85%,rgba(109,40,217,.10) 0%,transparent 50%),linear-gradient(rgba(30,80,160,.055) 1px,transparent 1px),linear-gradient(90deg,rgba(30,80,160,.055) 1px,transparent 1px);background-size:auto,auto,40px 40px,40px 40px;color:#c8d8f0;font-family:'Noto Sans SC','Microsoft YaHei',sans-serif;position:relative;overflow:hidden}
.corner{position:absolute;width:18px;height:18px;border-color:rgba(77,184,255,.55);border-style:solid;z-index:10;pointer-events:none}
.tl{top:8px;left:8px;border-width:2px 0 0 2px}.tr{top:8px;right:8px;border-width:2px 2px 0 0}.bl{bottom:8px;left:8px;border-width:0 0 2px 2px}.br{bottom:8px;right:8px;border-width:0 2px 2px 0}
.ms-header{display:flex;align-items:center;justify-content:space-between;padding:12px 24px 10px;border-bottom:1px solid rgba(77,184,255,.12);background:linear-gradient(180deg,rgba(6,12,26,.98) 0%,transparent 100%);flex-shrink:0;position:relative;z-index:2}
.ms-header__brand{display:flex;align-items:center;gap:10px}
.ms-header__name{font-size:14px;font-weight:700;color:#e0f0ff}
.ms-header__sub{font-size:10px;color:rgba(77,184,255,.55);font-family:'JetBrains Mono',monospace;margin-top:2px}
.ms-header__title{font-size:24px;font-weight:800;letter-spacing:4px;color:#fff;text-shadow:0 0 30px rgba(77,184,255,.8),0 0 60px rgba(77,184,255,.35);animation:titleGlow 3s ease-in-out infinite}
@keyframes titleGlow{0%,100%{text-shadow:0 0 30px rgba(77,184,255,.8),0 0 60px rgba(77,184,255,.35)}50%{text-shadow:0 0 50px rgba(77,184,255,1),0 0 100px rgba(77,184,255,.55)}}
.ms-header__right{display:flex;align-items:center;gap:16px}
.ms-clock__time{font-size:26px;font-weight:700;color:#4db8ff;font-family:'JetBrains Mono',monospace;text-align:right;text-shadow:0 0 12px rgba(77,184,255,.6)}
.ms-clock__date{font-size:10px;color:rgba(77,184,255,.55);text-align:right;margin-top:2px}
.ms-online{display:flex;align-items:center;gap:6px;padding:4px 10px;border-radius:20px;background:rgba(74,222,128,.1);border:1px solid rgba(74,222,128,.28);color:#4ade80;font-size:12px}
.ms-online__dot{width:6px;height:6px;border-radius:50%;background:#4ade80;box-shadow:0 0 7px #4ade80;animation:blink 1.5s ease-in-out infinite}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.4}}
/* 两列：地图大，右侧320px */
.ms-body{display:grid;grid-template-columns:1fr 320px;gap:10px;padding:10px 14px 14px;flex:1;overflow:hidden;position:relative;z-index:1}
.ms-map-wrap{background:rgba(4,11,25,.92);border:1px solid rgba(77,184,255,.18);border-radius:10px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 0 40px rgba(77,184,255,.07),inset 0 0 60px rgba(4,9,26,.5)}
.ms-map-header{display:flex;align-items:center;justify-content:space-between;padding:9px 14px;border-bottom:1px solid rgba(77,184,255,.1);flex-shrink:0}
.ms-map-dot{width:7px;height:7px;border-radius:50%;background:#4db8ff;box-shadow:0 0 8px #4db8ff;animation:blink 2s infinite}
.ms-refresh-btn{display:flex;align-items:center;gap:4px;padding:3px 10px;border-radius:5px;background:rgba(77,184,255,.1);border:1px solid rgba(77,184,255,.22);color:#4db8ff;font-size:11px;cursor:pointer;font-family:inherit;transition:background .2s}
.ms-refresh-btn:hover{background:rgba(77,184,255,.2)}
.ms-map-legend{display:flex;align-items:center;gap:8px;padding:6px 14px;font-size:10px;color:rgba(77,184,255,.45);flex-shrink:0}
.ms-legend-bar{flex:1;height:5px;border-radius:3px;background:linear-gradient(90deg,#05122e,#0a2a5e,#1050a0,#2090e0,#4db8ff,#a0d8ff)}
.ms-legend-dot{width:9px;height:9px;border-radius:2px;display:inline-block}
.ms-map-footer{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:8px 14px;border-top:1px solid rgba(77,184,255,.1);flex-shrink:0;font-size:12px;transition:background .2s}
.ms-map-footer:hover{background:rgba(77,184,255,.04)}
.ms-map-footer--empty{justify-content:center;color:rgba(77,184,255,.35)}
.ms-map-footer__pin{color:#4db8ff;font-weight:700;flex-shrink:0}
.ms-map-footer__total{color:rgba(147,197,253,.7);flex-shrink:0}
.ms-map-footer__total b{color:#fbbf24;font-size:15px;font-family:'JetBrains Mono',monospace}
.ms-map-footer__chips{display:flex;gap:6px;flex-wrap:wrap;flex:1}
.ms-map-footer__chip{padding:2px 8px;border-radius:12px;border:1px solid;font-size:10px;background:rgba(0,0,0,.25)}
.ms-map-footer__more{color:rgba(77,184,255,.5);flex-shrink:0;font-size:11px}
.ms-right{display:flex;flex-direction:column;gap:8px;overflow:hidden}
.ms-panel{background:rgba(8,18,45,.75);border:1px solid rgba(77,184,255,.16);border-radius:8px;padding:11px 13px;position:relative;flex-shrink:0}
.ms-panel::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(77,184,255,.45),transparent)}
.ms-panel__title{display:flex;align-items:center;gap:5px;font-size:12px;font-weight:600;color:#93c5fd;margin-bottom:9px;font-family:'JetBrains Mono',monospace}
.ms-rank-list{display:flex;flex-direction:column;gap:4px;overflow-y:auto;flex:1}
.ms-rank-row{display:flex;align-items:center;gap:5px;padding:5px 7px;border-radius:5px;cursor:pointer;border:1px solid transparent;font-size:12px;transition:all .15s}
.ms-rank-row:hover{background:rgba(77,184,255,.07);border-color:rgba(77,184,255,.18)}
.ms-rank-row--active{background:rgba(77,184,255,.11)!important;border-color:rgba(77,184,255,.32)!important}
.ms-rank-no{width:19px;height:19px;border-radius:3px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;border:1px solid;flex-shrink:0}
.ms-rank-name{width:26px;flex-shrink:0;color:#c8d8f0}
.ms-rank-bar-wrap{flex:1;height:4px;background:rgba(255,255,255,.05);border-radius:2px;overflow:hidden}
.ms-rank-bar{height:100%;border-radius:2px;transition:width .8s ease}
.ms-rank-val{width:20px;text-align:right;color:#4db8ff;font-size:11px;font-family:'JetBrains Mono',monospace;flex-shrink:0}
.ms-rank-arrow{color:rgba(77,184,255,.35);font-size:13px}
.ms-blink{width:5px;height:5px;border-radius:50%;background:#f87171;margin-left:auto;animation:blink .8s infinite}
.ms-alert-list{display:flex;flex-direction:column;gap:5px}
.ms-alert-row{display:flex;align-items:center;gap:6px;font-size:11px;color:rgba(147,197,253,.72);padding:3px 0;border-bottom:1px solid rgba(77,184,255,.06)}
.ms-alert-badge{padding:1px 6px;border-radius:9px;font-size:9px;font-weight:700;border:1px solid;flex-shrink:0}
.ms-alert-text{flex:1}
.ms-alert-time{color:rgba(77,184,255,.38);flex-shrink:0}
.ms-age-list{display:flex;flex-direction:column;gap:5px}
.ms-age-row{display:flex;align-items:center;gap:7px;font-size:11px}
.ms-age-label{width:34px;color:rgba(147,197,253,.55);font-family:'JetBrains Mono',monospace}
.ms-age-bar-wrap{flex:1;height:13px;background:rgba(77,184,255,.06);border-radius:3px;overflow:hidden}
.ms-age-bar{height:100%;border-radius:3px;background:linear-gradient(90deg,#1050a0,#4db8ff);display:flex;align-items:center;justify-content:flex-end;padding-right:4px;min-width:24px;transition:width .8s ease}
.ms-age-bar-text{font-size:9px;color:rgba(255,255,255,.85);font-family:'JetBrains Mono',monospace}
.ms-modal{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.65);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:24px}
.ms-modal__box{width:580px;max-height:90vh;overflow-y:auto;background:linear-gradient(160deg,#0d1a38 0%,#0f1f42 50%,#0a1530 100%);border:1px solid rgba(77,184,255,.35);border-radius:16px;box-shadow:0 24px 64px rgba(0,0,0,.7);position:relative}
.ms-modal__topbar{height:2px;background:linear-gradient(90deg,transparent,#4db8ff 30%,#a78bfa 70%,transparent);border-radius:16px 16px 0 0}
.ms-modal__header{display:flex;align-items:center;justify-content:space-between;padding:18px 22px 14px;border-bottom:1px solid rgba(77,184,255,.1)}
.ms-modal__avatar{width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,#1050a0,#4db8ff);display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 0 14px rgba(77,184,255,.4)}
.ms-modal__pname{font-size:22px;font-weight:800;color:#fff}
.ms-modal__psub{font-size:11px;color:rgba(77,184,255,.55);margin-top:2px}
.ms-modal__close{width:30px;height:30px;border-radius:50%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);color:rgba(255,255,255,.45);font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s}
.ms-modal__close:hover{background:rgba(239,68,68,.15);color:#f87171;border-color:rgba(239,68,68,.3)}
.ms-modal__kpis{display:grid;grid-template-columns:repeat(4,1fr);border-bottom:1px solid rgba(77,184,255,.08)}
.ms-modal__kpi{text-align:center;padding:14px 6px;border-right:1px solid rgba(77,184,255,.07)}
.ms-modal__kpi:last-child{border-right:none}
.ms-modal__kpi-val{font-size:26px;font-weight:800;font-family:'JetBrains Mono',monospace;line-height:1}
.ms-modal__kpi-label{font-size:10px;color:rgba(147,197,253,.55);margin-top:4px}
.ms-modal__section{font-size:11px;font-weight:600;color:rgba(77,184,255,.65);letter-spacing:1px;margin:14px 0 8px;font-family:'JetBrains Mono',monospace}
.ms-modal__type-list{display:flex;flex-direction:column;gap:7px;margin-bottom:4px}
.ms-modal__type-row{display:flex;align-items:center;gap:7px;font-size:12px}
.ms-modal__type-no{width:17px;height:17px;border-radius:3px;background:rgba(77,184,255,.1);color:#4db8ff;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;flex-shrink:0}
.ms-modal__type-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
.ms-modal__type-name{width:90px;flex-shrink:0;color:#c8d8f0;font-size:12px}
.ms-modal__type-bar-wrap{flex:1;height:5px;background:rgba(255,255,255,.05);border-radius:3px;overflow:hidden}
.ms-modal__type-bar{height:100%;border-radius:3px;transition:width .6s ease}
.ms-modal__type-cnt{width:36px;text-align:right;font-size:11px;flex-shrink:0}
.ms-modal__risk-bar{display:flex;height:26px;border-radius:5px;overflow:hidden;margin-bottom:4px}
.ms-modal__risk-seg{display:flex;align-items:center;justify-content:space-between;padding:0 7px;font-size:10px;color:rgba(255,255,255,.9);font-weight:600;white-space:nowrap;overflow:hidden}
.ms-modal__time-bars{display:flex;flex-direction:column;gap:5px;margin-bottom:4px}
.ms-modal__time-row{display:flex;align-items:center;gap:7px;font-size:11px}
.ms-modal__time-label{width:40px;color:rgba(147,197,253,.55);flex-shrink:0}
.ms-modal__time-bar-wrap{flex:1;height:12px;background:rgba(77,184,255,.06);border-radius:3px;overflow:hidden}
.ms-modal__time-bar{height:100%;border-radius:3px;transition:width .6s ease}
.ms-modal__time-pct{width:30px;text-align:right;color:rgba(77,184,255,.65);font-size:10px;font-family:'JetBrains Mono',monospace}
.ms-modal__footer{display:flex;align-items:center;justify-content:space-between;padding:14px 22px;border-top:1px solid rgba(77,184,255,.1)}
.ms-modal__footer-tip{font-size:10px;color:rgba(77,184,255,.4)}
.ms-modal__confirm{padding:7px 22px;border-radius:7px;background:linear-gradient(135deg,#1050a0,#4db8ff);color:#fff;border:none;font-size:13px;cursor:pointer;transition:all .2s;font-family:inherit}
.ms-modal__confirm:hover{transform:translateY(-1px);box-shadow:0 5px 18px rgba(77,184,255,.4)}
.modal-fade-enter-active{animation:mIn .25s cubic-bezier(.17,.67,.35,1.1)}
.modal-fade-leave-active{animation:mOut .18s ease-in}
@keyframes mIn{from{opacity:0;transform:scale(.88) translateY(14px)}to{opacity:1;transform:scale(1) translateY(0)}}
@keyframes mOut{from{opacity:1;transform:scale(1)}to{opacity:0;transform:scale(.92)}}
</style>
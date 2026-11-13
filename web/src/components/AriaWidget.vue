<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const mood = ref<'idle' | 'alert' | 'happy'>('idle')
const bubbleText = ref('')
const bubbleVisible = ref(false)
const bubbleColor = ref('rgba(59,130,246,0.45)')

let bubbleTimer: ReturnType<typeof setTimeout> | null = null
let autoTimer: ReturnType<typeof setInterval> | null = null
let clickIdx = 0

const CLICK_LINES = [
  '你好！有可疑信息随时发给我~',
  '公检法绝不会要求转账到安全账户！',
  '陌生链接要小心，先到检测框检测一下！',
  '刷单兼职要垫付？99%是诈骗！',
  '高回报稳赚不赔？一定是骗局！',
  '感情好就要借钱？先核实身份再说！',
  '遇到诈骗，立即拨打96110！',
  '我一直在这里保护你～',
]
const ALERT_LINES = [
  '危险！这很可能是诈骗！请勿转账！',
  '立即停止操作，不要相信对方！',
  '已启动预警，请等待帮助！',
]
const HAPPY_LINES = [
  '太好了，这条内容是安全的！',
  '没有风险，放心吧～',
  '检测通过，继续保持警惕哦~',
]

function showBubble(text: string, ms = 3500, color = 'rgba(59,130,246,0.45)') {
  bubbleText.value = text
  bubbleColor.value = color
  bubbleVisible.value = false
  requestAnimationFrame(() => { bubbleVisible.value = true })
  if (bubbleTimer) clearTimeout(bubbleTimer)
  bubbleTimer = setTimeout(() => { bubbleVisible.value = false }, ms)
}

function handleClick() {
  showBubble(CLICK_LINES[clickIdx % CLICK_LINES.length]!, 3500)
  clickIdx++
}

function setMood(level: string) {
  if (level === 'critical' || level === 'high') {
    mood.value = 'alert'
    showBubble(ALERT_LINES[Math.floor(Math.random() * ALERT_LINES.length)]!, 6000, 'rgba(239,68,68,0.5)')
  } else if (level === 'safe' || level === 'low') {
    mood.value = 'happy'
    showBubble(HAPPY_LINES[Math.floor(Math.random() * HAPPY_LINES.length)]!, 3500, 'rgba(34,197,94,0.4)')
    setTimeout(() => { mood.value = 'idle' }, 4500)
  } else {
    mood.value = 'idle'
  }
}

const colors = {
  idle: {
    ring: '#3b82f6', ringOp: '0.22', ringSpeed: '12s',
    head: 'url(#headGradIdle)', body: '#0f2044', bodyHighlight: '#1a3a6e',
    ear: '#1e3a8a', earStroke: '#3b82f6', earInner: '#2563eb', earDot: '#93c5fd',
    arc: '#3b82f6', antenna: '#60a5fa', antennaDot: '#60a5fa', chest: '#3b82f6',
    filter: 'drop-shadow(0 6px 20px rgba(59,130,246,0.55))',
    status: '● 待机监测中...', statusColor: 'rgba(148,163,184,0.7)', labelColor: 'rgba(147,197,253,0.88)',
  },
  alert: {
    ring: '#ef4444', ringOp: '0.65', ringSpeed: '4s',
    head: '#dc2626', body: '#3b0a0a', bodyHighlight: '#5a1212',
    ear: '#5a0f0f', earStroke: '#ef4444', earInner: '#dc2626', earDot: '#fca5a5',
    arc: '#ef4444', antenna: '#fca5a5', antennaDot: '#fca5a5', chest: '#ef4444',
    filter: 'drop-shadow(0 0 18px rgba(239,68,68,0.75))',
    status: '⚠ 检测到风险！', statusColor: '#fca5a5', labelColor: 'rgba(252,165,165,0.92)',
  },
  happy: {
    ring: '#22c55e', ringOp: '0.5', ringSpeed: '8s',
    head: '#16a34a', body: '#052e16', bodyHighlight: '#065f46',
    ear: '#064e3b', earStroke: '#22c55e', earInner: '#16a34a', earDot: '#86efac',
    arc: '#22c55e', antenna: '#86efac', antennaDot: '#86efac', chest: '#22c55e',
    filter: 'drop-shadow(0 0 18px rgba(34,197,94,0.65))',
    status: '✓ 环境安全', statusColor: '#86efac', labelColor: 'rgba(134,239,172,0.92)',
  },
}

onMounted(() => {
  ;(window as any)._ariaSetMood = setMood
  setTimeout(() => showBubble('你好！我是 ARIA，点我随时聊天～', 5000), 1500)
  autoTimer = setInterval(() => {
    if (mood.value === 'idle') showBubble(CLICK_LINES[Math.floor(Math.random() * CLICK_LINES.length)]!, 3500)
  }, 60000)
})

onUnmounted(() => {
  if (bubbleTimer) clearTimeout(bubbleTimer)
  if (autoTimer) clearInterval(autoTimer)
  delete (window as any)._ariaSetMood
})
</script>

<template>
  <div class="aria-root" @click="handleClick">

    <!-- 气泡 -->
    <Transition name="aria-bubble">
      <div v-if="bubbleVisible" class="aria-bubble-box" :style="{ borderColor: bubbleColor }">
        {{ bubbleText }}
      </div>
    </Transition>

    <!-- SVG 数字人 130px -->
    <svg
      width="130" height="130" viewBox="0 0 80 80" fill="none"
      xmlns="http://www.w3.org/2000/svg"
      :class="['aria-svg', `aria-${mood}`]"
      :style="{ filter: colors[mood].filter }"
    >
      <defs>
        <radialGradient id="headGradIdle" cx="40%" cy="35%" r="60%">
          <stop offset="0%" stop-color="#3b82f6"/>
          <stop offset="100%" stop-color="#1d4ed8"/>
        </radialGradient>
      </defs>

      <!-- 外层旋转虚线环 -->
      <circle cx="40" cy="40" r="37"
        :stroke="colors[mood].ring" stroke-width="0.6"
        stroke-dasharray="2 7" :opacity="colors[mood].ringOp">
        <animateTransform attributeName="transform" type="rotate"
          from="0 40 40" to="360 40 40" :dur="colors[mood].ringSpeed" repeatCount="indefinite"/>
      </circle>
      <!-- 呼吸光环 -->
      <circle cx="40" cy="40" r="33.5"
        :stroke="colors[mood].ring" stroke-width="1"
        fill="none" class="pulse-ring"/>

      <!-- 身体 -->
      <ellipse cx="40" cy="62" rx="16" ry="10" :fill="colors[mood].body" opacity="0.95"/>
      <ellipse cx="40" cy="60" rx="9" ry="4" :fill="colors[mood].bodyHighlight" opacity="0.7"/>
      <rect x="37.5" y="47" width="5" height="10" rx="2.5" :fill="colors[mood].body"/>

      <!-- 头部 -->
      <circle cx="40" cy="31" r="18" :fill="colors[mood].head"/>
      <ellipse cx="33" cy="24" rx="7" ry="4" fill="white" opacity="0.09"/>
      <rect x="30" y="20" width="20" height="1.5" rx="0.75" fill="white" opacity="0.12"/>
      <rect x="32" y="23" width="16" height="1" rx="0.5" fill="white" opacity="0.08"/>

      <!-- 眼睛 idle -->
      <g v-if="mood === 'idle'">
        <ellipse cx="33" cy="31" rx="4" ry="4.5" fill="white"/>
        <ellipse cx="47" cy="31" rx="4" ry="4.5" fill="white"/>
        <circle cx="34" cy="31.5" r="2.5" fill="#1e40af"/>
        <circle cx="48" cy="31.5" r="2.5" fill="#1e40af"/>
        <circle cx="34.9" cy="30.5" r="0.9" fill="white"/>
        <circle cx="48.9" cy="30.5" r="0.9" fill="white"/>
        <rect x="29" y="27.5" width="8" height="0.8" rx="0.4" fill="#60a5fa" opacity="0.3"/>
        <rect x="43" y="27.5" width="8" height="0.8" rx="0.4" fill="#60a5fa" opacity="0.3"/>
      </g>
      <!-- 眼睛 alert -->
      <g v-else-if="mood === 'alert'">
        <circle cx="33" cy="31" r="5" fill="white"/>
        <circle cx="47" cy="31" r="5" fill="white"/>
        <circle cx="34" cy="31.5" r="2.8" fill="#111"/>
        <circle cx="48" cy="31.5" r="2.8" fill="#111"/>
        <circle cx="35" cy="30.5" r="1" fill="white"/>
        <circle cx="49" cy="30.5" r="1" fill="white"/>
        <path d="M29 26 L35 28.5" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M51 26 L45 28.5" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
      </g>
      <!-- 眼睛 happy -->
      <g v-else>
        <path d="M29.5 31 Q33 27 36.5 31" stroke="white" stroke-width="2.5" stroke-linecap="round" fill="none"/>
        <path d="M43.5 31 Q47 27 50.5 31" stroke="white" stroke-width="2.5" stroke-linecap="round" fill="none"/>
        <ellipse cx="26.5" cy="36.5" rx="5" ry="3.2" fill="#ff8fa3" opacity="0.42"/>
        <ellipse cx="53.5" cy="36.5" rx="5" ry="3.2" fill="#ff8fa3" opacity="0.42"/>
        <path d="M29.5 26 Q33 23.5 36.5 25.5" stroke="white" stroke-width="1.4" stroke-linecap="round" fill="none"/>
        <path d="M43.5 25.5 Q47 23.5 50.5 26" stroke="white" stroke-width="1.4" stroke-linecap="round" fill="none"/>
      </g>

      <!-- 嘴巴 -->
      <path v-if="mood === 'idle'"        d="M34.5 38.5 Q40 41 45.5 38.5" stroke="white" stroke-width="1.8" stroke-linecap="round" fill="none"/>
      <path v-else-if="mood === 'alert'"  d="M34.5 40   Q40 37 45.5 40"   stroke="white" stroke-width="2"   stroke-linecap="round" fill="none"/>
      <path v-else                        d="M32 38     Q40 45 48 38"     stroke="white" stroke-width="2.2" stroke-linecap="round" fill="none"/>

      <!-- 耳机左 -->
      <circle cx="22" cy="31" r="6.5" :fill="colors[mood].ear" :stroke="colors[mood].earStroke" stroke-width="0.8"/>
      <circle cx="22" cy="31" r="3.5" :fill="colors[mood].earInner" opacity="0.85"/>
      <circle cx="22" cy="31" r="1.5" :fill="colors[mood].earDot"/>
      <!-- 耳机右 -->
      <circle cx="58" cy="31" r="6.5" :fill="colors[mood].ear" :stroke="colors[mood].earStroke" stroke-width="0.8"/>
      <circle cx="58" cy="31" r="3.5" :fill="colors[mood].earInner" opacity="0.85"/>
      <circle cx="58" cy="31" r="1.5" :fill="colors[mood].earDot"/>
      <!-- 耳机弧臂 -->
      <path d="M28 24 Q31 17 40 16 Q49 17 52 24"
        :stroke="colors[mood].arc" stroke-width="2.2" fill="none" stroke-linecap="round"/>

      <!-- 天线 -->
      <line x1="40" y1="13" x2="40" y2="8" :stroke="colors[mood].antenna" stroke-width="1.5" stroke-linecap="round"/>
      <circle cx="40" cy="7" r="2" :fill="colors[mood].antennaDot"/>
      <circle cx="40" cy="7" r="3.5" :stroke="colors[mood].antennaDot" stroke-width="0.6" fill="none" opacity="0.4"/>

      <!-- 领口装饰 -->
      <path d="M34 62 L37 57 L40 59 L43 57 L46 62"
        :stroke="colors[mood].chest" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    </svg>

    <div class="aria-label" :style="{ color: colors[mood].labelColor }">ARIA · 反诈助手</div>
    <div class="aria-status" :style="{ color: colors[mood].statusColor }">{{ colors[mood].status }}</div>
  </div>
</template>

<style scoped>
.aria-root {
  position: absolute;
  top: 24px;
  right: 28px;
  z-index: 100;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  user-select: none;
  cursor: pointer;
}

.aria-bubble-box {
  position: absolute;
  top: 10px;
  right: 145px;
  width: 220px;
  padding: 12px 15px;
  background: rgba(10,18,38,0.97);
  border: 1px solid;
  border-radius: 14px 14px 14px 4px;
  font-size: 13px;
  line-height: 1.75;
  color: #e2e8f0;
  box-shadow: 0 8px 28px rgba(0,0,0,0.55);
  pointer-events: none;
  z-index: 101;
}

.aria-label  { font-size: 11px; font-weight: 700; letter-spacing: 2px; }
.aria-status { font-size: 10px; font-family: 'JetBrains Mono', monospace; }

.aria-idle  { animation: ariaFloat 3s ease-in-out infinite; }
.aria-alert { animation: ariaShake 0.35s ease-in-out infinite alternate; }
.aria-happy { animation: ariaHop 1.3s ease-in-out infinite; }

@keyframes ariaFloat { 0%,100%{ transform:translateY(0) }    50%{ transform:translateY(-9px) } }
@keyframes ariaShake { 0%{ transform:rotate(-7deg) scale(1.08) } 100%{ transform:rotate(7deg) scale(1.12) } }
@keyframes ariaHop   { 0%,100%{ transform:translateY(0) rotate(-1.5deg) } 50%{ transform:translateY(-11px) rotate(1.5deg) } }

.pulse-ring { animation: pulseRing 2.8s ease-in-out infinite; }
@keyframes pulseRing { 0%,100%{ opacity:.1 } 50%{ opacity:.32 } }

.aria-bubble-enter-active { animation: ariaBubblePop 0.22s ease-out; }
.aria-bubble-leave-active  { transition: opacity 0.15s; }
.aria-bubble-leave-to      { opacity: 0; }
@keyframes ariaBubblePop {
  from { opacity:0; transform:scale(0.8) translateY(6px); }
  to   { opacity:1; transform:scale(1) translateY(0); }
}
</style>
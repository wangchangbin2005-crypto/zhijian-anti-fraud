<template>
  <div class="intro-page" v-if="!done">
    <!-- 跳过按钮 -->
    <button class="skip-btn" @click="enter">跳过 →</button>

    <!-- 标题区 -->
    <div class="intro-header">
      <div class="intro-title"><img src="@/assets/logo.png" style="width:120px;height:120px;object-fit:contain;vertical-align:middle;margin-right:16px" alt="智鉴"/>智鉴</div>
    </div>

    <!-- 十种诈骗卡片网格 -->
    <div class="intro-grid">
      <div
        v-for="(card, i) in cards"
        :key="i"
        class="intro-card"
        :style="{ background: card.bg, animationDelay: i * 0.06 + 's' }"
        @mouseenter="hovered = i"
        @mouseleave="hovered = -1"
        @click="enter"
      >
        <div class="intro-card-emoji">{{ card.emoji }}</div>
        <div class="intro-card-type">{{ card.type }}</div>
        <div class="intro-card-desc">{{ card.desc }}</div>
        <div
          class="intro-card-glow"
          :style="{ background: card.glowColor, opacity: hovered === i ? 0.15 : 0 }"
        ></div>
      </div>
    </div>

    <!-- 底部按钮 -->
    <button class="intro-enter-btn" @click="enter">🔓 进入智鉴系统</button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{ (e: 'done'): void }>()
const done = ref(false)
const hovered = ref(-1)

function enter() {
  done.value = true
  emit('done')
}

const cards = [
  {
    emoji: '👮',
    type: '冒充公检法诈骗',
    desc: '冒充警察/检察院，以涉案为由要求转账至"安全账户"',
    bg: 'linear-gradient(135deg,#1a0000,#3d0000)',
    glowColor: '#ef4444',
  },
  {
    emoji: '📈',
    type: '投资理财诈骗',
    desc: '陌生人推荐稳赚不赔的内部投资项目，诱导入金后跑路',
    bg: 'linear-gradient(135deg,#1a0800,#3d1500)',
    glowColor: '#f97316',
  },
  {
    emoji: '📦',
    type: '兼职刷单诈骗',
    desc: '先小额返款建立信任，逐步要求大额垫付后消失',
    bg: 'linear-gradient(135deg,#1a1000,#3d2800)',
    glowColor: '#f59e0b',
  },
  {
    emoji: '🤖',
    type: 'AI合成语音诈骗',
    desc: '利用AI克隆亲人声音或面孔，紧急情况下要求转账',
    bg: 'linear-gradient(135deg,#1a0030,#2d0050)',
    glowColor: '#8b5cf6',
  },
  {
    emoji: '💔',
    type: '情感诈骗（杀猪盘）',
    desc: '网恋数月建立感情，以投资或急需用钱为由骗取转账',
    bg: 'linear-gradient(135deg,#1a0015,#3d0030)',
    glowColor: '#ec4899',
  },
  {
    emoji: '💸',
    type: '虚假贷款诈骗',
    desc: '免抵押秒批高额贷款，要求先缴保证金/解冻费后跑路',
    bg: 'linear-gradient(135deg,#001820,#003040)',
    glowColor: '#06b6d4',
  },
  {
    emoji: '🎁',
    type: '虚假中奖诈骗',
    desc: '恭喜中大奖，需先缴纳个人所得税或公证费才能领取',
    bg: 'linear-gradient(135deg,#101800,#253d00)',
    glowColor: '#84cc16',
  },
  {
    emoji: '🛒',
    type: '虚假购物诈骗',
    desc: '低价商品诱导购买，收款后发假货或直接失联',
    bg: 'linear-gradient(135deg,#001020,#002040)',
    glowColor: '#3b82f6',
  },
  {
    emoji: '📋',
    type: '虚假征信诈骗',
    desc: '谎称名下有未还贷款影响征信，要求配合转账清零',
    bg: 'linear-gradient(135deg,#0a0020,#1a0040)',
    glowColor: '#6366f1',
  },
  {
    emoji: '🎮',
    type: '网络游戏诈骗',
    desc: '低价出售游戏账号/皮肤，先付定金后各种理由追加费用',
    bg: 'linear-gradient(135deg,#001a10,#003020)',
    glowColor: '#14b8a6',
  },
]
</script>

<style scoped>
.intro-page {
  position: fixed;
  inset: 0;
  background: #060c18;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 28px 32px;
  overflow: hidden;
}

.intro-page::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(59,130,246,0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(59,130,246,0.04) 1px, transparent 1px);
  background-size: 40px 40px;
  pointer-events: none;
}

.skip-btn {
  position: absolute;
  top: 24px;
  right: 32px;
  padding: 8px 18px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 8px;
  color: rgba(255,255,255,0.45);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: all .2s;
  z-index: 10;
}
.skip-btn:hover {
  background: rgba(255,255,255,0.12);
  color: rgba(255,255,255,0.8);
}

.intro-header {
  text-align: center;
  margin-bottom: 24px;
  animation: fadeInDown .5s ease both;
}
.intro-title {
  font-size: 52px;
  font-weight: 900;
  color: #fff;
  letter-spacing: 2px;
  margin-bottom: 8px;
  text-shadow: 0 0 40px rgba(77,184,255,0.5);
}
.intro-sub {
  font-size: 14px;
  color: rgba(255,255,255,0.4);
  font-family: 'JetBrains Mono', monospace;
}

.intro-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
  width: 100%;
  max-width: 1100px;
  margin-bottom: 28px;
}

.intro-card {
  border-radius: 14px;
  padding: 18px 14px;
  cursor: pointer;
  border: 1px solid rgba(255,255,255,0.08);
  position: relative;
  overflow: hidden;
  transition: transform .2s, border-color .2s, box-shadow .2s;
  animation: cardSlideIn .4s ease both;
}
.intro-card:hover {
  transform: translateY(-4px);
  border-color: rgba(255,255,255,0.2);
  box-shadow: 0 12px 32px rgba(0,0,0,0.4);
}

.intro-card-emoji {
  font-size: 32px;
  margin-bottom: 10px;
  line-height: 1;
}
.intro-card-type {
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 6px;
  line-height: 1.3;
}
.intro-card-desc {
  font-size: 11px;
  color: rgba(255,255,255,0.45);
  line-height: 1.6;
}
.intro-card-glow {
  position: absolute;
  inset: 0;
  transition: opacity .2s;
  pointer-events: none;
}

.intro-enter-btn {
  padding: 14px 56px;
  background: linear-gradient(135deg, #1d4ed8, #3b82f6);
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  letter-spacing: 0.5px;
  box-shadow: 0 8px 32px rgba(59,130,246,0.4);
  transition: all .2s;
  animation: unlockAppear .6s ease .5s both;
}
.intro-enter-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 40px rgba(59,130,246,0.55);
}

@keyframes fadeInDown {
  from { opacity: 0; transform: translateY(-12px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes cardSlideIn {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes unlockAppear {
  from { opacity: 0; transform: scale(0.85) translateY(16px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}

@media (max-width: 900px) {
  .intro-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
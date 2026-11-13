<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const SLIDE_COUNT = 6
const current = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

function restartAutoplay() {
  if (timer) clearInterval(timer)
  timer = setInterval(() => {
    current.value = (current.value + 1) % SLIDE_COUNT
  }, 2500)
}

function go(i: number) {
  current.value = i
  restartAutoplay()
}

function prev() {
  current.value = (current.value + SLIDE_COUNT - 1) % SLIDE_COUNT
  restartAutoplay()
}

function next() {
  current.value = (current.value + 1) % SLIDE_COUNT
  restartAutoplay()
}

onMounted(() => {
  restartAutoplay()
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
<div class="login-carousel" :style="{ '--slide-count': String(SLIDE_COUNT) }">
      <div
        class="login-carousel-track"
        :style="{
          width: `${SLIDE_COUNT * 100}%`,
          transform: `translateX(-${current * (100 / SLIDE_COUNT)}%)`,
        }"
      >

        <!-- 幻灯片1：电话诈骗 -->
        <div class="login-carousel-slide lcs-1">
          <div class="lcs-img-area">
            <svg width="100%" height="100%" viewBox="0 0 520 200" xmlns="http://www.w3.org/2000/svg">
              <!-- 背景光晕 -->
              <radialGradient id="g1a" cx="30%" cy="50%"><stop offset="0%" stop-color="#ef4444" stop-opacity=".25"/><stop offset="100%" stop-color="transparent"/></radialGradient>
              <radialGradient id="g1b" cx="75%" cy="40%"><stop offset="0%" stop-color="#3b82f6" stop-opacity=".2"/><stop offset="100%" stop-color="transparent"/></radialGradient>
              <rect width="520" height="200" fill="url(#g1a)"/><rect width="520" height="200" fill="url(#g1b)"/>
              <!-- 手机 -->
              <rect x="60" y="30" width="80" height="140" rx="12" fill="#1e293b" stroke="#334155" stroke-width="1.5"/>
              <rect x="68" y="44" width="64" height="100" rx="4" fill="#0f172a"/>
              <circle cx="100" cy="158" r="6" fill="#334155"/>
              <!-- 屏幕内容 -->
              <rect x="72" y="50" width="56" height="8" rx="2" fill="#ef4444" opacity=".9"/>
              <text x="100" y="57" text-anchor="middle" font-size="5" fill="#fff" font-family="sans-serif">来电：+86 10086</text>
              <rect x="72" y="64" width="56" height="20" rx="2" fill="#1e3a5f"/>
              <text x="100" y="73" text-anchor="middle" font-size="6" fill="#93c5fd" font-family="sans-serif">公安机关</text>
              <text x="100" y="80" text-anchor="middle" font-size="4.5" fill="#64748b" font-family="sans-serif">涉嫌洗钱案件</text>
              <circle cx="84" cy="106" r="10" fill="#22c55e" opacity=".9"/>
              <circle cx="116" cy="106" r="10" fill="#ef4444" opacity=".9"/>
              <text x="84" y="110" text-anchor="middle" font-size="10" fill="#fff">📞</text>
              <text x="116" y="110" text-anchor="middle" font-size="10" fill="#fff">✕</text>
              <!-- 警告箭头 -->
              <polygon points="170,80 220,60 215,80 260,65 205,90 210,72" fill="#fbbf24" opacity=".9"/>
              <!-- 警告牌 -->
              <rect x="270" y="40" width="200" height="120" rx="16" fill="#1e1b2e" stroke="#7c3aed" stroke-width="1" opacity=".95"/>
              <text x="370" y="68" text-anchor="middle" font-size="13" fill="#ef4444" font-family="sans-serif" font-weight="bold">⚠ 高风险诈骗</text>
              <text x="370" y="86" text-anchor="middle" font-size="9" fill="#94a3b8" font-family="sans-serif">冒充公检法诈骗</text>
              <text x="370" y="102" text-anchor="middle" font-size="8" fill="#64748b" font-family="sans-serif">· 公安机关不会要求转账</text>
              <text x="370" y="114" text-anchor="middle" font-size="8" fill="#64748b" font-family="sans-serif">· 不存在所谓"安全账户"</text>
              <text x="370" y="126" text-anchor="middle" font-size="8" fill="#64748b" font-family="sans-serif">· 立即挂断，拨打 96110</text>
              <rect x="310" y="138" width="120" height="16" rx="8" fill="#3b82f6" opacity=".9"/>
              <text x="370" y="150" text-anchor="middle" font-size="8" fill="#fff" font-family="sans-serif">已通知监护人 · 生成报告</text>
            </svg>
          </div>
          <div class="lcs-bottom">
            <div class="lcs-tag">🛡️ 场景还原</div>
            <div class="lcs-title">冒充公检法诈骗</div>
            <div class="lcs-desc">骗子伪装成公安机关，以涉嫌洗钱为由要求转账至"安全账户"，AI毫秒识别并拦截</div>
          </div>
        </div>

        <!-- 幻灯片2：投资诈骗 -->
        <div class="login-carousel-slide lcs-2">
          <div class="lcs-img-area">
            <svg width="100%" height="100%" viewBox="0 0 520 200" xmlns="http://www.w3.org/2000/svg">
              <radialGradient id="g2a" cx="50%" cy="50%"><stop offset="0%" stop-color="#f59e0b" stop-opacity=".2"/><stop offset="100%" stop-color="transparent"/></radialGradient>
              <rect width="520" height="200" fill="url(#g2a)"/>
              <!-- K线图背景 -->
              <polyline points="40,160 70,140 90,150 110,110 130,120 150,80 170,90 190,50 210,60" stroke="#22c55e" stroke-width="2" fill="none" opacity=".6"/>
              <polyline points="210,60 230,80 250,70 270,100 290,85 310,110" stroke="#ef4444" stroke-width="2" fill="none" opacity=".6"/>
              <!-- 蜡烛图 -->
              <rect x="45" y="145" width="8" height="18" fill="#22c55e" opacity=".7"/>
              <rect x="65" y="133" width="8" height="16" fill="#22c55e" opacity=".7"/>
              <rect x="85" y="143" width="8" height="14" fill="#ef4444" opacity=".7"/>
              <rect x="105" y="103" width="8" height="20" fill="#22c55e" opacity=".7"/>
              <rect x="125" y="113" width="8" height="16" fill="#ef4444" opacity=".7"/>
              <rect x="145" y="72" width="8" height="22" fill="#22c55e" opacity=".7"/>
              <rect x="165" y="83" width="8" height="18" fill="#ef4444" opacity=".7"/>
              <rect x="185" y="43" width="8" height="24" fill="#22c55e" opacity=".7"/>
              <!-- 利润标注 -->
              <rect x="200" y="20" width="80" height="22" rx="6" fill="#22c55e" opacity=".9"/>
              <text x="240" y="35" text-anchor="middle" font-size="11" fill="#fff" font-family="sans-serif" font-weight="bold">↑ 日收益 300%</text>
              <!-- 骗子头像 -->
              <circle cx="340" cy="80" r="36" fill="#1e293b" stroke="#f59e0b" stroke-width="2"/>
              <circle cx="340" cy="72" r="18" fill="#334155"/>
              <text x="340" y="78" text-anchor="middle" font-size="18" fill="#fff">👔</text>
              <rect x="304" y="108" width="72" height="16" rx="4" fill="#f59e0b" opacity=".15"/>
              <text x="340" y="120" text-anchor="middle" font-size="8" fill="#f59e0b" font-family="sans-serif">香港金融大师 · 仅限3名</text>
              <!-- 警告框 -->
              <rect x="395" y="40" width="110" height="120" rx="12" fill="#1a0f00" stroke="#f59e0b" stroke-width="1.5" opacity=".95"/>
              <text x="450" y="62" text-anchor="middle" font-size="10" fill="#fbbf24" font-family="sans-serif" font-weight="bold">⚠ 投资诈骗</text>
              <text x="450" y="78" text-anchor="middle" font-size="7.5" fill="#94a3b8" font-family="sans-serif">可疑特征识别</text>
              <text x="450" y="93" text-anchor="middle" font-size="7" fill="#64748b" font-family="sans-serif">✗ 承诺高额回报</text>
              <text x="450" y="105" text-anchor="middle" font-size="7" fill="#64748b" font-family="sans-serif">✗ 陌生人推荐</text>
              <text x="450" y="117" text-anchor="middle" font-size="7" fill="#64748b" font-family="sans-serif">✗ 限时紧迫催促</text>
              <rect x="415" y="130" width="70" height="14" rx="7" fill="#f59e0b" opacity=".85"/>
              <text x="450" y="141" text-anchor="middle" font-size="7" fill="#000" font-family="sans-serif">置信度 97%</text>
            </svg>
          </div>
          <div class="lcs-bottom">
            <div class="lcs-tag">📈 场景还原</div>
            <div class="lcs-title">投资理财诈骗</div>
            <div class="lcs-desc">陌生人以高回报投资为诱饵，AI通过意图分析和关键词识别，准确率97%</div>
          </div>
        </div>

        <!-- 幻灯片3：AI合成诈骗 -->
        <div class="login-carousel-slide lcs-3">
          <div class="lcs-img-area">
            <svg width="100%" height="100%" viewBox="0 0 520 200" xmlns="http://www.w3.org/2000/svg">
              <radialGradient id="g3a" cx="40%" cy="50%"><stop offset="0%" stop-color="#8b5cf6" stop-opacity=".25"/><stop offset="100%" stop-color="transparent"/></radialGradient>
              <rect width="520" height="200" fill="url(#g3a)"/>
              <!-- 视频通话框 -->
              <rect x="30" y="25" width="180" height="135" rx="12" fill="#0f0f1a" stroke="#7c3aed" stroke-width="1.5"/>
              <!-- 人脸轮廓 -->
              <circle cx="120" cy="80" r="35" fill="#1e1b3a" stroke="#7c3aed" stroke-width="1" stroke-dasharray="4,3"/>
              <circle cx="120" cy="72" r="20" fill="#2d2060" opacity=".8"/>
              <text x="120" y="78" text-anchor="middle" font-size="20">👤</text>
              <!-- AI合成标记 -->
              <rect x="38" y="33" width="60" height="14" rx="4" fill="#7c3aed" opacity=".9"/>
              <text x="68" y="43" text-anchor="middle" font-size="7" fill="#fff" font-family="sans-serif">🤖 AI合成画面</text>
              <!-- 扫描线动效 -->
              <rect x="30" y="70" width="180" height="2" fill="#a78bfa" opacity=".4"/>
              <rect x="30" y="100" width="180" height="1" fill="#7c3aed" opacity=".2"/>
              <!-- 通话信息 -->
              <rect x="38" y="140" width="80" height="12" rx="3" fill="#1e293b"/>
              <text x="78" y="149" text-anchor="middle" font-size="6.5" fill="#94a3b8" font-family="sans-serif">📹 视频通话中 02:34</text>
              <!-- 真实脸 vs AI脸对比 -->
              <text x="120" y="172" text-anchor="middle" font-size="8" fill="#ef4444" font-family="sans-serif">声纹 ≠ 本人</text>
              <!-- 检测结果 -->
              <rect x="230" y="25" width="260" height="150" rx="16" fill="#0d0d1a" stroke="#8b5cf6" stroke-width="1" opacity=".95"/>
              <text x="360" y="50" text-anchor="middle" font-size="12" fill="#c4b5fd" font-family="sans-serif" font-weight="bold">🧠 AI深度检测</text>
              <!-- 检测项 -->
              <rect x="248" y="60" width="80" height="30" rx="8" fill="#1e1b3a"/>
              <text x="288" y="73" text-anchor="middle" font-size="8" fill="#94a3b8" font-family="sans-serif">声纹分析</text>
              <text x="288" y="85" text-anchor="middle" font-size="9" fill="#ef4444" font-family="sans-serif">❌ 不一致</text>
              <rect x="344" y="60" width="80" height="30" rx="8" fill="#1e1b3a"/>
              <text x="384" y="73" text-anchor="middle" font-size="8" fill="#94a3b8" font-family="sans-serif">画面检测</text>
              <text x="384" y="85" text-anchor="middle" font-size="9" fill="#ef4444" font-family="sans-serif">❌ AI合成</text>
              <rect x="248" y="98" width="176" height="28" rx="8" fill="#2d1b3d"/>
              <text x="336" y="111" text-anchor="middle" font-size="8" fill="#c4b5fd" font-family="sans-serif">综合置信度</text>
              <rect x="256" y="116" width="100" height="4" rx="2" fill="#1e293b"/>
              <rect x="256" y="116" width="94" height="4" rx="2" fill="#8b5cf6"/>
              <text x="364" y="121" font-size="8" fill="#c4b5fd" font-family="sans-serif">96%</text>
              <rect x="248" y="135" width="224" height="28" rx="8" fill="#ef4444" opacity=".15" stroke="#ef4444" stroke-width="1"/>
              <text x="360" y="148" text-anchor="middle" font-size="9" fill="#ef4444" font-family="sans-serif" font-weight="bold">⚠ 极高风险 · 立即挂断</text>
              <text x="360" y="158" text-anchor="middle" font-size="7.5" fill="#94a3b8" font-family="sans-serif">已自动通知监护人</text>
            </svg>
          </div>
          <div class="lcs-bottom">
            <div class="lcs-tag">🤖 场景还原</div>
            <div class="lcs-title">AI合成语音诈骗</div>
            <div class="lcs-desc">利用声纹克隆伪造亲人声音，多模态检测同时分析声纹与画面，识破AI伪装</div>
          </div>
        </div>

        <!-- 幻灯片4：刷单诈骗 -->
        <div class="login-carousel-slide lcs-4">
          <div class="lcs-img-area">
            <svg width="100%" height="100%" viewBox="0 0 520 200" xmlns="http://www.w3.org/2000/svg">
              <radialGradient id="g4a" cx="60%" cy="50%"><stop offset="0%" stop-color="#10b981" stop-opacity=".2"/><stop offset="100%" stop-color="transparent"/></radialGradient>
              <rect width="520" height="200" fill="url(#g4a)"/>
              <!-- 聊天气泡 -->
              <rect x="30" y="20" width="200" height="160" rx="12" fill="#0f172a" stroke="#1e293b" stroke-width="1"/>
              <text x="130" y="38" text-anchor="middle" font-size="8" fill="#64748b" font-family="sans-serif">兼职群 · 刷单任务</text>
              <!-- 消息气泡 -->
              <rect x="40" y="44" width="120" height="24" rx="8" fill="#1e293b"/>
              <text x="100" y="55" text-anchor="middle" font-size="7" fill="#94a3b8" font-family="sans-serif">【任务】点赞返利，先</text>
              <text x="100" y="63" text-anchor="middle" font-size="7" fill="#94a3b8" font-family="sans-serif">垫付99元，返120元</text>
              <rect x="60" y="74" width="130" height="18" rx="8" fill="#22c55e" opacity=".15" stroke="#22c55e" stroke-width="1"/>
              <text x="125" y="87" text-anchor="middle" font-size="7.5" fill="#22c55e" font-family="sans-serif">✅ 已成功返款 120元！</text>
              <rect x="40" y="98" width="130" height="24" rx="8" fill="#1e293b"/>
              <text x="105" y="109" text-anchor="middle" font-size="7" fill="#94a3b8" font-family="sans-serif">恭喜！升级任务，垫付</text>
              <text x="105" y="117" text-anchor="middle" font-size="7" fill="#f59e0b" font-family="sans-serif">3000元，返利4500元</text>
              <rect x="40" y="128" width="130" height="18" rx="8" fill="#ef4444" opacity=".15" stroke="#ef4444" stroke-width="1"/>
              <text x="105" y="141" text-anchor="middle" font-size="7.5" fill="#ef4444" font-family="sans-serif">⚠ AI检测：刷单诈骗</text>
              <!-- 检测面板 -->
              <rect x="250" y="20" width="240" height="160" rx="14" fill="#0a1628" stroke="#10b981" stroke-width="1" opacity=".95"/>
              <text x="370" y="44" text-anchor="middle" font-size="11" fill="#34d399" font-family="sans-serif" font-weight="bold">🔍 实时意图分析</text>
              <rect x="265" y="52" width="210" height="40" rx="8" fill="#0f2318"/>
              <text x="370" y="67" text-anchor="middle" font-size="8" fill="#6ee7b7" font-family="sans-serif">TF-IDF 关键词命中</text>
              <text x="370" y="80" text-anchor="middle" font-size="7.5" fill="#94a3b8" font-family="sans-serif">垫付 · 返利 · 刷单 · 升级任务</text>
              <rect x="265" y="98" width="210" height="36" rx="8" fill="#0f1a0f"/>
              <text x="370" y="113" text-anchor="middle" font-size="8" fill="#6ee7b7" font-family="sans-serif">情感分析 · 诱导模式识别</text>
              <text x="370" y="125" text-anchor="middle" font-size="7.5" fill="#94a3b8" font-family="sans-serif">先给甜头 → 逐步加码 → 跑路</text>
              <rect x="265" y="140" width="210" height="28" rx="8" fill="#ef4444" opacity=".12" stroke="#ef4444" stroke-width="1"/>
              <text x="370" y="152" text-anchor="middle" font-size="9" fill="#ef4444" font-family="sans-serif" font-weight="bold">高风险 · 兼职刷单诈骗</text>
              <text x="370" y="162" text-anchor="middle" font-size="7.5" fill="#94a3b8" font-family="sans-serif">置信度 94% · 已拦截</text>
            </svg>
          </div>
          <div class="lcs-bottom">
            <div class="lcs-tag">💸 场景还原</div>
            <div class="lcs-title">兼职刷单诈骗</div>
            <div class="lcs-desc">先小额返利诱导信任，再要求大额垫付，实时意图分析秒级识破诈骗话术</div>
          </div>
        </div>

        <!-- 幻灯片5：客服退款诈骗 -->
        <div class="login-carousel-slide lcs-2">
          <div class="lcs-img-area">
            <svg width="100%" height="100%" viewBox="0 0 520 200" xmlns="http://www.w3.org/2000/svg">
              <radialGradient id="g5a" cx="40%" cy="45%"><stop offset="0%" stop-color="#60a5fa" stop-opacity=".24"/><stop offset="100%" stop-color="transparent"/></radialGradient>
              <rect width="520" height="200" fill="url(#g5a)"/>
              <rect x="36" y="24" width="210" height="154" rx="12" fill="#0f172a" stroke="#1e3a8a" stroke-width="1.2"/>
              <text x="141" y="44" text-anchor="middle" font-size="9" fill="#93c5fd" font-family="sans-serif">📦 电商客服会话</text>
              <rect x="48" y="54" width="178" height="24" rx="8" fill="#1e293b"/>
              <text x="137" y="69" text-anchor="middle" font-size="8" fill="#cbd5e1" font-family="sans-serif">订单异常，需点击链接退款</text>
              <rect x="48" y="84" width="178" height="24" rx="8" fill="#1e293b"/>
              <text x="137" y="99" text-anchor="middle" font-size="8" fill="#cbd5e1" font-family="sans-serif">请先输入银行卡和验证码</text>
              <rect x="48" y="114" width="178" height="22" rx="8" fill="#ef4444" opacity=".14" stroke="#ef4444"/>
              <text x="137" y="128" text-anchor="middle" font-size="8" fill="#ef4444" font-family="sans-serif">⚠ 钓鱼链接 / 验证码窃取</text>

              <rect x="270" y="24" width="214" height="154" rx="14" fill="#0b1120" stroke="#3b82f6" stroke-width="1.2" opacity=".96"/>
              <text x="377" y="46" text-anchor="middle" font-size="11" fill="#60a5fa" font-family="sans-serif" font-weight="bold">🛡️ 风险识别结果</text>
              <text x="377" y="67" text-anchor="middle" font-size="8" fill="#94a3b8" font-family="sans-serif">命中：退款链接、验证码、银行卡</text>
              <rect x="292" y="78" width="170" height="12" rx="6" fill="#1e293b"/>
              <rect x="292" y="78" width="158" height="12" rx="6" fill="#3b82f6"/>
              <text x="377" y="88" text-anchor="middle" font-size="7.5" fill="#fff" font-family="sans-serif">风险置信度 93%</text>
              <rect x="292" y="100" width="170" height="52" rx="10" fill="#ef4444" opacity=".14" stroke="#ef4444"/>
              <text x="377" y="121" text-anchor="middle" font-size="9" fill="#ef4444" font-family="sans-serif" font-weight="bold">高风险 · 客服退款诈骗</text>
              <text x="377" y="137" text-anchor="middle" font-size="7.5" fill="#cbd5e1" font-family="sans-serif">建议：仅通过官方App发起退款</text>
            </svg>
          </div>
          <div class="lcs-bottom">
            <div class="lcs-tag">📦 场景还原</div>
            <div class="lcs-title">客服退款诈骗</div>
            <div class="lcs-desc">冒充电商客服，以退款为由诱导点击钓鱼链接并索取验证码，系统实时预警拦截。</div>
          </div>
        </div>

        <!-- 幻灯片6：游戏交易诈骗 -->
        <div class="login-carousel-slide lcs-3">
          <div class="lcs-img-area">
            <svg width="100%" height="100%" viewBox="0 0 520 200" xmlns="http://www.w3.org/2000/svg">
              <radialGradient id="g6a" cx="62%" cy="42%"><stop offset="0%" stop-color="#a78bfa" stop-opacity=".24"/><stop offset="100%" stop-color="transparent"/></radialGradient>
              <rect width="520" height="200" fill="url(#g6a)"/>
              <rect x="34" y="24" width="220" height="154" rx="12" fill="#111827" stroke="#312e81" stroke-width="1.2"/>
              <text x="144" y="44" text-anchor="middle" font-size="9" fill="#c4b5fd" font-family="sans-serif">🎮 游戏账号交易</text>
              <rect x="46" y="54" width="196" height="24" rx="8" fill="#1f2937"/>
              <text x="144" y="69" text-anchor="middle" font-size="8" fill="#e5e7eb" font-family="sans-serif">王者全皮肤账号，原价2万现价800</text>
              <rect x="46" y="84" width="196" height="24" rx="8" fill="#1f2937"/>
              <text x="144" y="99" text-anchor="middle" font-size="8" fill="#fbbf24" font-family="sans-serif">先付定金500，马上发账号密码</text>
              <rect x="46" y="114" width="196" height="24" rx="8" fill="#1f2937"/>
              <text x="144" y="129" text-anchor="middle" font-size="8" fill="#f87171" font-family="sans-serif">账号锁定中，还需交200解锁费</text>
              <rect x="66" y="146" width="156" height="18" rx="8" fill="#ef4444" opacity=".14" stroke="#ef4444"/>
              <text x="144" y="158" text-anchor="middle" font-size="7.5" fill="#ef4444" font-family="sans-serif">⚠ 分层收费套路</text>

              <rect x="274" y="24" width="210" height="154" rx="14" fill="#0f1020" stroke="#8b5cf6" stroke-width="1.2" opacity=".96"/>
              <text x="379" y="46" text-anchor="middle" font-size="11" fill="#c4b5fd" font-family="sans-serif" font-weight="bold">🧠 诈骗模式匹配</text>
              <text x="379" y="67" text-anchor="middle" font-size="8" fill="#94a3b8" font-family="sans-serif">命中：低价诱导 / 定金 / 追加费用</text>
              <rect x="294" y="78" width="170" height="12" rx="6" fill="#1e293b"/>
              <rect x="294" y="78" width="161" height="12" rx="6" fill="#8b5cf6"/>
              <text x="379" y="88" text-anchor="middle" font-size="7.5" fill="#fff" font-family="sans-serif">风险置信度 95%</text>
              <rect x="294" y="102" width="170" height="50" rx="10" fill="#ef4444" opacity=".14" stroke="#ef4444"/>
              <text x="379" y="122" text-anchor="middle" font-size="9" fill="#ef4444" font-family="sans-serif" font-weight="bold">高风险 · 游戏交易诈骗</text>
              <text x="379" y="138" text-anchor="middle" font-size="7.5" fill="#cbd5e1" font-family="sans-serif">建议：仅走平台担保，不私下转账</text>
            </svg>
          </div>
          <div class="lcs-bottom">
            <div class="lcs-tag">🎮 场景还原</div>
            <div class="lcs-title">低价游戏交易诈骗</div>
            <div class="lcs-desc">低价账号吸引受害者，先收定金再层层加码，最终拉黑失联，模型可快速识别链式诱导。</div>
          </div>
        </div>

      </div>
      <button
        type="button"
        class="carousel-arrow carousel-arrow--prev"
        aria-label="上一张"
        @click.stop="prev"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M15 18l-6-6 6-6"
            stroke="currentColor"
            stroke-width="2.2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
      <button
        type="button"
        class="carousel-arrow carousel-arrow--next"
        aria-label="下一张"
        @click.stop="next"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M9 18l6-6-6-6"
            stroke="currentColor"
            stroke-width="2.2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
      <div class="carousel-dots">
        <span
          v-for="i in SLIDE_COUNT"
          :key="i"
          class="carousel-dot"
          :class="{ active: current === i - 1 }"
          @click="go(i - 1)"
        ></span>
      </div>
    </div>
</template>

<style scoped>
.carousel-arrow {
  position: absolute;
  top: 50%;
  z-index: 12;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  margin: 0;
  padding: 0;
  border: none;
  border-radius: 50%;
  color: #fff;
  background: rgba(0, 0, 0, 0.38);
  backdrop-filter: blur(6px);
  cursor: pointer;
  transform: translateY(-50%);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.28s ease, background 0.2s ease;
}

.carousel-arrow:hover {
  background: rgba(0, 0, 0, 0.52);
}

.carousel-arrow:focus-visible {
  opacity: 1;
  pointer-events: auto;
  outline: 2px solid rgba(255, 255, 255, 0.6);
  outline-offset: 2px;
}

.carousel-arrow--prev {
  left: 16px;
}

.carousel-arrow--next {
  right: 16px;
}

.login-carousel:hover .carousel-arrow {
  opacity: 1;
  pointer-events: auto;
}
</style>

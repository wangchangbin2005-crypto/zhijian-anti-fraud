<script setup>
import { useLearnHall } from '@/composables/useLearnHall'

const {
  lh,
  auth,
  learnCategories,
  learnCasesFiltered,
  learnImageCards,
  sortedLearnVideos,
  quizQuestions,
  quizStart,
  quizAnswer,
  quizGetStyle,
  quizNext,
} = useLearnHall()

function onLearnCardEnter(e) {
  const t = e.currentTarget
  if (t && 'style' in t) t.style.transform = 'translateY(-3px)'
}
function onLearnCardLeave(e) {
  const t = e.currentTarget
  if (t && 'style' in t) t.style.transform = ''
}

function quizPickedLabel(q, qi) {
  const idx = lh.quizAnswerLog[qi]
  if (idx === undefined) return '未作答'
  return q.options[idx] ?? '未作答'
}
</script>

<template>
  <div>
  <div class="page-header">
    <div class="page-title">🎓 反诈学习大厅</div>
    <div class="page-subtitle">真实案例 · 图解识骗 · 视频教程 · 测一测你的防骗指数</div>
  </div>

  <div class="tab-row" style="margin-bottom:20px;width:fit-content">
    <button class="tab-btn" :class="{active:lh.learnTab==='text'}" @click="lh.learnTab='text'">📖 文本案例</button>
    <button class="tab-btn" :class="{active:lh.learnTab==='image'}" @click="lh.learnTab='image'">🖼️ 图解识骗</button>
    <button class="tab-btn" :class="{active:lh.learnTab==='video'}" @click="lh.learnTab='video'">🎬 视频教程</button>
    <button class="tab-btn" :class="{active:lh.learnTab==='quiz'}" @click="lh.learnTab='quiz'">🧩 防骗测试</button>
  </div>

  <!-- 文本案例 -->
  <div v-if="lh.learnTab==='text'">
    <!-- 个性化提示 -->
    <div v-if="auth.currentUser?.identity" style="display:flex;align-items:center;gap:10px;padding:10px 16px;background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.2);border-radius:10px;margin-bottom:14px;font-size:13px">
      <span style="font-size:18px">{{ {elder:'👴',student:'🎓',financial:'💼',adult:'👤',other:'👤'}[auth.currentUser.identity] }}</span>
      <div>
        <span style="color:#93c5fd;font-weight:600">已为你个性化推荐：</span>
        <span style="color:var(--muted)">
          {{ auth.currentUser.identity==='elder'?'老年人高发：冒充公检法、AI换脸、情感诈骗优先':auth.currentUser.identity==='student'?'学生高发：刷单兼职、虚假贷款、投资诈骗优先':auth.currentUser.identity==='financial'?'财务人员高发：投资理财、冒充领导转账优先':'常见类型优先展示' }}
        </span>
        <span v-if="auth.currentUser.age" style="color:var(--dim)">（{{ auth.currentUser.age }}岁）</span>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:200px 1fr;gap:16px;align-items:start">
      <div class="card" style="padding:12px">
        <div class="card-title" style="margin-bottom:12px">诈骗类型</div>
        <div v-for="cat in learnCategories" :key="cat.id" @click="lh.learnActiveCat=cat.id"
          style="padding:9px 12px;border-radius:8px;cursor:pointer;font-size:14px;display:flex;align-items:center;gap:8px;margin-bottom:3px;transition:all .15s"
          :style="lh.learnActiveCat===cat.id?'background:rgba(59,130,246,0.15);color:#93c5fd;':'color:var(--muted)'">
          <span>{{ cat.icon }}</span><span>{{ cat.name }}</span>
          <span style="margin-left:auto;font-size:11px;background:rgba(59,130,246,0.1);padding:1px 6px;border-radius:10px">{{ cat.count }}</span>
        </div>
      </div>
      <div>
        <div v-for="(cas,i) in learnCasesFiltered" :key="i" class="card" style="margin-bottom:12px;cursor:pointer" @click="lh.learnSelectedCase=lh.learnSelectedCase===i?null:i">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
            <span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600"
              :style="`background:${cas.levelColor}22;color:${cas.levelColor};border:1px solid ${cas.levelColor}44`">{{ cas.level }}</span>
            <span style="font-size:15px;font-weight:600;color:#1a1a3e">{{ cas.title }}</span>
            <span style="margin-left:auto;font-size:12px;color:var(--muted)">{{ cas.date }}</span>
          </div>
          <div style="font-size:14px;color:var(--muted);line-height:1.7">{{ cas.summary }}</div>
          <div v-if="lh.learnSelectedCase===i" style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border)">
            <div style="font-size:13px;color:var(--text);line-height:1.8;margin-bottom:12px">{{ cas.detail }}</div>
            <div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:8px;padding:12px;margin-bottom:10px">
              <div style="font-size:12px;font-weight:600;color:#f87171;margin-bottom:6px">🚩 骗局识别要点</div>
              <div v-for="tip in cas.tips" :key="tip" style="font-size:13px;color:var(--text);margin-bottom:4px">• {{ tip }}</div>
            </div>
            <div style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);border-radius:8px;padding:12px">
              <div style="font-size:12px;font-weight:600;color:#34d399;margin-bottom:6px">✅ 正确应对方法</div>
              <div v-for="action in cas.actions" :key="action" style="font-size:13px;color:var(--text);margin-bottom:4px">• {{ action }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 图解识骗 -->
  <div v-if="lh.learnTab==='image'">
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px">
      <div v-for="card in learnImageCards" :key="String(card.id)" class="card" style="padding:0;overflow:hidden;cursor:pointer;transition:transform .2s" @mouseenter="onLearnCardEnter" @mouseleave="onLearnCardLeave" @click="lh.learnImageModal = card">
        <!-- SVG 场景缩略图 -->
        <div style="height:155px;position:relative;overflow:hidden" :style="'background:linear-gradient(135deg,'+card.bg1+','+card.bg2+')'">
          <!-- 聊天场景 -->
          <svg v-if="card.mockup?.type==='chat'" viewBox="0 0 280 155" style="width:100%;height:100%;position:absolute;top:0;left:0">
            <rect x="10" y="12" width="180" height="22" rx="11" fill="rgba(255,255,255,0.12)"/>
            <text x="20" y="27" font-size="9" fill="rgba(255,255,255,0.7)" font-family="monospace">{{ card.mockup.name }}</text>
            <rect x="10" y="42" width="160" height="30" rx="8" fill="rgba(255,255,255,0.15)"/>
            <text x="18" y="55" font-size="8" fill="#fff" font-family="sans-serif">{{ (card.mockup.msgs&&card.mockup.msgs[0]&&card.mockup.msgs[0].text||"").slice(0,24) }}...</text>
            <rect x="70" y="82" width="150" height="24" rx="8" fill="#1d4ed8" opacity="0.9"/>
            <text x="78" y="97" font-size="8" fill="#fff" font-family="sans-serif">{{ (card.mockup.msgs&&card.mockup.msgs[1]&&card.mockup.msgs[1].text||"").slice(0,22) }}...</text>
            <rect x="10" y="115" width="170" height="24" rx="8" fill="rgba(239,68,68,0.25)" stroke="rgba(239,68,68,0.5)" stroke-width="1"/>
            <text x="18" y="130" font-size="8" fill="#fca5a5" font-family="sans-serif">⚠ {{ (card.mockup.warning||"").slice(0,28) }}</text>
          </svg>
          <!-- APP场景 -->
          <svg v-else-if="card.mockup?.type==='app'" viewBox="0 0 280 155" style="width:100%;height:100%;position:absolute;top:0;left:0">
            <rect x="60" y="8" width="160" height="18" rx="4" fill="rgba(255,255,255,0.1)"/>
            <text x="90" y="21" font-size="9" fill="#fff" font-family="monospace">{{ card.mockup.name }}</text>
            <rect x="10" y="34" width="260" height="26" rx="4" fill="rgba(255,255,255,0.08)"/>
            <text x="18" y="44" font-size="7" fill="rgba(255,255,255,0.5)">{{ card.mockup.items&&card.mockup.items[0]&&card.mockup.items[0].label }}</text>
            <text x="18" y="55" font-size="11" fill="#22c55e" font-weight="bold">{{ card.mockup.items&&card.mockup.items[0]&&card.mockup.items[0].value }}</text>
            <rect x="10" y="68" width="260" height="22" rx="4" fill="rgba(255,255,255,0.06)"/>
            <text x="18" y="83" font-size="9" fill="#22c55e">{{ card.mockup.items&&card.mockup.items[1]&&card.mockup.items[1].value }}</text>
            <rect x="10" y="98" width="260" height="26" rx="4" fill="rgba(239,68,68,0.12)" stroke="rgba(239,68,68,0.3)" stroke-width="1"/>
            <text x="18" y="110" font-size="7" fill="rgba(255,255,255,0.5)">提现申请</text>
            <text x="18" y="120" font-size="8" fill="#f87171">需缴纳20%个人所得税才能出金</text>
            <rect x="10" y="130" width="260" height="16" rx="4" fill="rgba(239,68,68,0.2)"/>
            <text x="18" y="141" font-size="8" fill="#fca5a5">⚠ {{ (card.mockup.warning||"").slice(0,32) }}</text>
          </svg>
          <!-- 短信/通知场景 -->
          <svg v-else viewBox="0 0 280 155" style="width:100%;height:100%;position:absolute;top:0;left:0">
            <rect x="8" y="8" width="264" height="38" rx="6" fill="rgba(255,255,255,0.1)"/>
            <text x="16" y="22" font-size="8" fill="rgba(255,255,255,0.5)">{{ card.mockup&&card.mockup.msgs&&card.mockup.msgs[0]&&card.mockup.msgs[0].sender }}</text>
            <text x="16" y="36" font-size="8" fill="#e2e8f0">{{ card.mockup&&card.mockup.msgs&&card.mockup.msgs[0]&&(card.mockup.msgs[0].text||"").slice(0,36) }}...</text>
            <rect x="8" y="54" width="264" height="38" rx="6" fill="rgba(255,255,255,0.07)"/>
            <text x="16" y="68" font-size="8" fill="rgba(255,255,255,0.4)">{{ card.mockup&&card.mockup.msgs&&card.mockup.msgs[1]&&card.mockup.msgs[1].sender }}</text>
            <text x="16" y="82" font-size="8" fill="#e2e8f0">{{ card.mockup&&card.mockup.msgs&&card.mockup.msgs[1]&&(card.mockup.msgs[1].text||"").slice(0,36) }}...</text>
            <rect x="8" y="100" width="264" height="20" rx="4" fill="rgba(239,68,68,0.2)" stroke="rgba(239,68,68,0.4)" stroke-width="1"/>
            <text x="14" y="113" font-size="8" fill="#fca5a5">⚠ 域名非官方，这是钓鱼链接！</text>
            <rect x="8" y="128" width="264" height="16" rx="4" fill="rgba(239,68,68,0.15)"/>
            <text x="14" y="139" font-size="7.5" fill="#f87171">{{ (card.mockup&&card.mockup.warning||"").slice(0,36) }}</text>
          </svg>
          <div style="position:absolute;top:8px;right:8px;font-size:10px;padding:2px 8px;border-radius:10px;background:rgba(0,0,0,0.5);color:#fff;backdrop-filter:blur(4px)">{{ card.tag }}</div>
          <div style="position:absolute;bottom:8px;right:8px;font-size:18px;opacity:0.3">{{ card.emoji }}</div>
        </div>
        <div style="padding:12px">
          <div style="font-size:13px;font-weight:600;color:#fff;margin-bottom:4px">{{ card.title }}</div>
          <div style="font-size:11px;color:var(--muted);line-height:1.5">{{ card.desc }}</div>
        </div>
      </div>
    </div>
    <div v-if="lh.learnImageModal" style="position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:2000;display:flex;align-items:center;justify-content:center;padding:24px" @click.self="lh.learnImageModal=null">
      <div style="background:var(--card2);border:1px solid var(--border2);border-radius:16px;max-width:580px;width:100%;max-height:88vh;overflow-y:auto">
        <!-- 头部 -->
        <div style="height:60px;display:flex;align-items:center;gap:12px;padding:0 20px;border-radius:16px 16px 0 0"
          :style="`background:linear-gradient(135deg,${lh.learnImageModal.bg1},${lh.learnImageModal.bg2})`">
          <span style="font-size:28px">{{ lh.learnImageModal.emoji }}</span>
          <div>
            <div style="font-size:15px;font-weight:700;color:#fff">{{ lh.learnImageModal.title }}</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.6)">{{ lh.learnImageModal.tag }}</div>
          </div>
        </div>
        <div style="padding:20px">
          <!-- 真实场景模拟 -->
          <div style="background:#0d1117;border-radius:12px;padding:14px;margin-bottom:16px;border:1px solid rgba(255,255,255,0.08)">
            <div style="font-size:11px;color:rgba(255,255,255,0.4);margin-bottom:10px;font-family:monospace;letter-spacing:1px">📱 真实诈骗场景还原</div>
            <!-- 聊天/短信类型 -->
            <template v-if="lh.learnImageModal.mockup?.type==='chat'||lh.learnImageModal.mockup?.type==='sms'">
              <div style="font-size:12px;font-weight:600;color:rgba(255,255,255,0.5);margin-bottom:8px;display:flex;align-items:center;gap:6px">
                <span>{{ lh.learnImageModal.mockup.avatar||'📨' }}</span>
                <span>{{ lh.learnImageModal.mockup.name }}</span>
              </div>
              <div v-for="(msg,mi) in (lh.learnImageModal.mockup.msgs||lh.learnImageModal.mockup.items||[])" :key="mi" style="display:flex;margin-bottom:8px" :style="msg.side==='right'?'justify-content:flex-end':''">
                <div style="max-width:80%;padding:8px 12px;border-radius:10px;font-size:13px;line-height:1.5"
                  :style="msg.side==='right'?'background:#1d4ed8;color:#fff;border-radius:12px 12px 2px 12px':'background:rgba(255,255,255,0.1);color:#e2e8f0;border-radius:12px 12px 12px 2px'">
                  <span v-if="msg.sender" style="display:block;font-size:10px;color:rgba(255,255,255,0.5);margin-bottom:4px">{{ msg.sender }}</span>
                  {{ msg.text }}
                </div>
              </div>
            </template>
            <!-- APP界面类型 -->
            <template v-if="lh.learnImageModal.mockup?.type==='app'">
              <div style="font-size:13px;font-weight:700;color:#fff;margin-bottom:10px;text-align:center">{{ lh.learnImageModal.mockup.name }}</div>
              <div v-for="item in lh.learnImageModal.mockup.items" :key="item.label" style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.08)">
                <span style="font-size:12px;color:rgba(255,255,255,0.5)">{{ item.label }}</span>
                <span style="font-size:13px;font-weight:600" :style="{color:item.color}">{{ item.value }}</span>
              </div>
            </template>
            <!-- 通知类型 -->
            <template v-if="lh.learnImageModal.mockup?.type==='notification'">
              <div v-for="item in lh.learnImageModal.mockup.items" :key="item.text" style="display:flex;gap:10px;padding:8px;background:rgba(255,255,255,0.05);border-radius:8px;margin-bottom:6px">
                <span style="font-size:18px;flex-shrink:0">{{ item.icon }}</span>
                <span style="font-size:12px;color:#e2e8f0;line-height:1.5">{{ item.text }}</span>
              </div>
            </template>
            <!-- 警告提示 -->
            <div style="margin-top:10px;padding:8px 12px;background:rgba(239,68,68,0.15);border-radius:8px;font-size:12px;color:#fca5a5;border-left:3px solid #ef4444">
              {{ lh.learnImageModal.mockup?.warning }}
            </div>
          </div>

          <div style="font-size:13px;color:var(--muted);line-height:1.7;margin-bottom:14px">{{ lh.learnImageModal.fullDesc }}</div>
          <div style="font-size:12px;font-weight:600;color:var(--muted);margin-bottom:8px">典型作案流程：</div>
          <div v-for="(step,si) in lh.learnImageModal.steps" :key="si" style="display:flex;gap:10px;margin-bottom:7px">
            <div style="width:20px;height:20px;border-radius:50%;background:var(--blue);color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px">{{ si+1 }}</div>
            <div style="font-size:13px;color:var(--text);line-height:1.6">{{ step }}</div>
          </div>
          <div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:8px;padding:12px;margin-top:12px">
            <div style="font-size:12px;font-weight:600;color:#f87171;margin-bottom:6px">⚠️ 关键识别信号</div>
            <div v-for="sig in lh.learnImageModal.signals" :key="sig" style="font-size:12px;color:var(--text);margin-bottom:3px">• {{ sig }}</div>
          </div>
          <button class="btn btn-outline" @click="lh.learnImageModal=null" style="width:100%;margin-top:14px;justify-content:center">关闭</button>
        </div>
      </div>
    </div>
  </div>

  <!-- 视频教程 -->
  <div v-if="lh.learnTab==='video'">
    <!-- 说明 + 个性化推荐 -->
    <div style="padding:14px 16px;margin-bottom:16px;border-radius:10px;background:rgba(59,130,246,0.06);border:1px solid rgba(59,130,246,0.2)">
      <div style="font-size:14px;font-weight:600;color:#93c5fd;margin-bottom:6px">📺 官方反诈视频资源</div>
      <div v-if="auth.currentUser?.identity" style="font-size:13px;color:var(--muted);margin-bottom:10px">
        为 <strong style="color:#93c5fd">{{ {elder:'老年人',student:'学生',financial:'财务人员',adult:'普通成人',other:'用户'}[auth.currentUser.identity] }}</strong>
        <span v-if="auth.currentUser.age">（{{ auth.currentUser.age }}岁）</span>
        推荐：视频按相关度排序，点击卡片跳转观看
      </div>
      <div style="font-size:13px;color:var(--muted);margin-bottom:10px" v-else>以下为官方反诈视频，点击卡片跳转观看</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <a href="https://v.qq.com/x/search/?q=%E5%8F%8D%E8%AF%88%E8%AD%A6%E7%A4%BA%E7%89%87" target="_blank" style="padding:6px 14px;border-radius:8px;background:rgba(0,132,255,0.1);color:#60a5fa;border:1px solid rgba(0,132,255,0.2);font-size:12px;text-decoration:none">🟦 腾讯视频</a>
        <a href="https://www.iqiyi.com/search.html#query=%E5%8F%8D%E8%AF%88%E8%AD%A6%E7%A4%BA" target="_blank" style="padding:6px 14px;border-radius:8px;background:rgba(0,168,84,0.08);color:#4ade80;border:1px solid rgba(0,168,84,0.15);font-size:12px;text-decoration:none">🟩 爱奇艺</a>
        <a href="https://www.youku.com/search_video/q_%E5%8F%8D%E8%AF%88%E8%AD%A6%E7%A4%BA.html" target="_blank" style="padding:6px 14px;border-radius:8px;background:rgba(0,140,255,0.08);color:#93c5fd;border:1px solid rgba(0,140,255,0.15);font-size:12px;text-decoration:none">🔵 优酷</a>
        <a href="https://www.12339.gov.cn/" target="_blank" style="padding:6px 14px;border-radius:8px;background:rgba(239,68,68,0.08);color:#f87171;border:1px solid rgba(239,68,68,0.15);font-size:12px;text-decoration:none">🔴 国家反诈中心官网</a>
      </div>
    </div>

    <!-- 视频卡片（按用户身份排序） -->
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:14px">
      <div v-for="vid in sortedLearnVideos" :key="vid.id" class="card" style="padding:0;overflow:hidden">
        <!-- 封面 -->
        <div style="height:130px;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden"
          :style="'background:linear-gradient(135deg,'+vid.bg1+','+vid.bg2+')'">
          <div style="font-size:52px;filter:drop-shadow(0 4px 12px rgba(0,0,0,0.5))">{{ vid.emoji }}</div>
          <div style="position:absolute;bottom:6px;right:8px;background:rgba(0,0,0,0.75);color:#fff;font-size:11px;padding:2px 8px;border-radius:4px;font-family:monospace">{{ vid.duration }}</div>
          <div style="position:absolute;top:6px;left:8px;background:rgba(0,0,0,0.6);color:#fff;font-size:10px;padding:2px 8px;border-radius:10px">{{ vid.source }}</div>
          <div style="position:absolute;top:6px;right:8px;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700" :style="vid.platform==='腾讯'?'background:#1f64a8;color:#fff':vid.platform==='优酷'?'background:#0f52ba;color:#fff':'background:#fb7299;color:#fff'">{{ vid.platform||'B站' }}</div>
        </div>
        <!-- 信息 -->
        <div style="padding:12px">
          <div style="font-size:13px;font-weight:600;color:#fff;margin-bottom:4px;line-height:1.4">{{ vid.title }}</div>
          <div style="font-size:11px;color:var(--muted);line-height:1.5;margin-bottom:10px">{{ vid.desc }}</div>
          <div style="display:flex;gap:8px">
            <a :href="vid.url" target="_blank" style="padding:5px 14px;border-radius:8px;background:rgba(59,130,246,0.15);color:#93c5fd;border:1px solid rgba(59,130,246,0.3);font-size:12px;text-decoration:none;display:inline-flex;align-items:center;gap:4px">
              ▶ 前往观看
            </a>
            <a v-if="vid.url2" :href="vid.url2" target="_blank" style="padding:5px 14px;border-radius:8px;background:rgba(255,255,255,0.05);color:var(--muted);border:1px solid var(--border);font-size:12px;text-decoration:none">
              备用链接
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
  <!-- 防骗测试 -->
  <div v-if="lh.learnTab==='quiz'">
    <!-- 开始界面 -->
    <div v-if="!lh.quizStarted && !lh.quizFinished" class="card" style="text-align:center;padding:48px">
      <div style="font-size:64px;margin-bottom:16px">🧩</div>
      <div style="font-size:22px;font-weight:700;color:#fff;margin-bottom:8px">防骗能力测试</div>
      <div style="font-size:15px;color:var(--muted);margin-bottom:24px">共10题，测测你能识别多少种诈骗套路</div>
      <button class="btn btn-primary" @click="quizStart()" style="padding:14px 48px;font-size:16px;justify-content:center">🚀 开始测试</button>
    </div>

    <!-- 答题界面 -->
    <div v-if="lh.quizStarted && !lh.quizFinished" class="card">
      <!-- 进度 -->
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;font-size:13px;color:var(--muted)">
        <span style="font-weight:600;color:#93c5fd">第 {{ lh.quizCurrent+1 }} / {{ quizQuestions.length }} 题</span>
        <span>✅ 已答对 {{ lh.quizScore }} 题</span>
      </div>
      <div style="height:6px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden;margin-bottom:20px">
        <div :style="{width:((lh.quizCurrent)/quizQuestions.length*100)+'%',height:'100%',borderRadius:'3px',background:'var(--blue)',transition:'width .4s'}"></div>
      </div>
      <!-- 题目 -->
      <div style="font-size:16px;font-weight:600;color:var(--text);line-height:1.8;margin-bottom:20px;padding:16px;background:rgba(59,130,246,0.10);border-radius:10px;border-left:3px solid var(--blue)">
        {{ quizQuestions[lh.quizCurrent]?.q }}
      </div>
      <!-- 选项 -->
      <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:16px">
        <button v-for="(opt,oi) in quizQuestions[lh.quizCurrent]?.options" :key="oi"
          @click="quizAnswer(oi)"
          :disabled="lh.quizAnswered"
          style="padding:13px 16px;border-radius:10px;border:1.5px solid;text-align:left;font-size:14px;line-height:1.5;cursor:pointer;transition:all .25s;font-family:inherit;display:flex;align-items:flex-start;gap:10px"
          :style="quizGetStyle(oi)">
          <span style="font-weight:700;font-family:'JetBrains Mono',monospace;min-width:20px;flex-shrink:0;margin-top:1px">{{ String.fromCharCode(65+oi) }}</span>
          <span>{{ opt }}</span>
        </button>
      </div>
      <!-- 解析 -->
      <div v-if="lh.quizAnswered" style="padding:14px 16px;border-radius:10px;background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.2);font-size:14px;color:var(--text);line-height:1.7;margin-bottom:14px">
        <span style="color:#93c5fd;font-weight:600">💡 解析：</span>{{ quizQuestions[lh.quizCurrent]?.explain }}
      </div>
      <!-- 下一题 -->
      <button v-if="lh.quizAnswered" class="btn btn-primary" @click="quizNext()" style="width:100%;justify-content:center;padding:13px">
        {{ lh.quizCurrent < quizQuestions.length-1 ? '下一题 →' : '查看结果 🏁' }}
      </button>
    </div>

    <!-- 结果界面 -->
    <div v-if="lh.quizFinished">
      <div class="card" style="text-align:center;padding:40px">
        <div style="font-size:64px;margin-bottom:16px">{{ lh.quizScore>=8?'🏆':lh.quizScore>=6?'🎖️':'📚' }}</div>
        <div style="font-size:26px;font-weight:700;color:#fff;margin-bottom:8px">{{ lh.quizScore }} / {{ quizQuestions.length }} 题</div>
        <div style="font-size:16px;margin-bottom:8px" :style="lh.quizScore>=8?'color:var(--green)':lh.quizScore>=6?'color:var(--amber)':'color:var(--red)'">
          {{ lh.quizScore>=8?'🎉 防骗高手！继续保持警惕':lh.quizScore>=6?'👍 不错！还有提升空间':'⚠️ 需要加强学习，骗子很狡猾！' }}
        </div>
        <div style="font-size:14px;color:var(--muted);margin-bottom:24px">正确率 {{ Math.round(lh.quizScore/quizQuestions.length*100) }}%</div>
        <div style="display:flex;gap:12px;justify-content:center">
          <button class="btn btn-primary" @click="quizStart()" style="justify-content:center">🔄 重新测试</button>
          <button class="btn btn-outline" @click="lh.learnTab='text'" style="justify-content:center">📖 去看案例</button>
        </div>
      </div>
      <!-- 答题回顾 -->
      <div class="card" style="margin-top:16px">
        <div class="card-title" style="margin-bottom:14px">📋 答题详情</div>
        <div v-for="(q,qi) in quizQuestions" :key="qi" style="padding:14px 0;border-bottom:1px solid var(--border)">
          <div style="font-size:14px;color:var(--text);margin-bottom:8px;line-height:1.6">
            <span style="font-family:'JetBrains Mono',monospace;color:var(--muted);margin-right:6px">Q{{ qi+1 }}</span>{{ q.q }}
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:6px">
            <span :style="lh.quizAnswerLog[qi]===q.answer?'color:var(--green);font-weight:600':'color:var(--red);font-weight:600'">
              {{ lh.quizAnswerLog[qi]===q.answer?'✅ 正确':'❌ 错误' }}
            </span>
            <span style="font-size:12px;color:var(--muted)">你选了：{{ quizPickedLabel(q, qi) }}</span>
            <span v-if="lh.quizAnswerLog[qi]!==q.answer" style="font-size:12px;color:var(--green)">正确答案：{{ q.options[q.answer] }}</span>
          </div>
          <div style="font-size:12px;color:var(--muted);line-height:1.6">{{ q.explain }}</div>
        </div>
      </div>
    </div>
  </div>
  </div>
</template>
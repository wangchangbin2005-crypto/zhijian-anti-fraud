<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getApiBase } from '@/config/api'

const BASE = getApiBase()

interface Feedback {
  id: string
  user_id: string
  type: string
  rating: number
  title: string
  content: string
  contact: string
  status: 'pending' | 'processing' | 'resolved' | 'closed'
  reply: string
  created_at: string
}

const feedbacks = ref<Feedback[]>([])
const loading = ref(true)
const filterType = ref('all')
const filterStatus = ref('all')
const search = ref('')
const selected = ref<Feedback | null>(null)
const replyText = ref('')
const replying = ref(false)

const TYPE_LABELS: Record<string, string> = {
  bug: '🐛 功能异常', feature: '💡 功能建议',
  accuracy: '🎯 识别准确性', ui: '🎨 界面体验', other: '💬 其他',
}
const STATUS_LABELS: Record<string, string> = {
  pending: '待处理', processing: '处理中', resolved: '已解决', closed: '已关闭',
}
const STATUS_COLOR: Record<string, string> = {
  pending:    'rgba(251,191,36,0.12);color:#fbbf24;border:1px solid rgba(251,191,36,0.3)',
  processing: 'rgba(59,130,246,0.12);color:#93c5fd;border:1px solid rgba(59,130,246,0.3)',
  resolved:   'rgba(16,185,129,0.12);color:#34d399;border:1px solid rgba(16,185,129,0.3)',
  closed:     'rgba(148,163,184,0.08);color:#94a3b8;border:1px solid rgba(148,163,184,0.2)',
}
const RATING_EMOJI: Record<number, string> = { 5:'😍', 4:'😊', 3:'😐', 2:'😕', 1:'😞' }

// mock数据兜底
const MOCK: Feedback[] = [
  { id:'fb1', user_id:'user001', type:'bug', rating:2, title:'历史记录页面加载失败', content:'点击历史记录菜单后页面一直在加载，等了很久也没有数据显示，刷新后偶尔能看到一两条但很不稳定。', contact:'user@example.com', status:'pending', reply:'', created_at:'2024-04-08T09:12:00' },
  { id:'fb2', user_id:'user002', type:'feature', rating:4, title:'建议增加批量检测功能', content:'目前只能一条一条检测文本，希望能支持批量上传Excel或txt文件进行批量检测，对于需要处理大量信息的用户很有帮助。', contact:'', status:'processing', reply:'感谢您的建议！批量检测功能已在开发计划中，预计下个版本上线。', created_at:'2024-04-07T14:30:00' },
  { id:'fb3', user_id:'terry', type:'accuracy', rating:3, title:'AI合成诈骗识别率偏低', content:'测试了几条典型的AI合成语音诈骗文本，有时候被判定为安全，感觉识别率还可以继续提升。', contact:'', status:'resolved', reply:'已针对AI合成类诈骗优化了识别模型，感谢反馈！', created_at:'2024-04-06T11:20:00' },
  { id:'fb4', user_id:'user003', type:'ui', rating:5, title:'界面设计很漂亮！', content:'整体界面设计非常美观，科技感强，使用体验很好。建议可以在移动端适配上再优化一下，手机上看有些字太小了。', contact:'', status:'pending', reply:'', created_at:'2024-04-05T16:45:00' },
  { id:'fb5', user_id:'user004', type:'other', rating:3, title:'希望增加微信转账截图识别', content:'很多诈骗发生在微信转账场景，希望能增加截图上传功能，直接识别聊天截图中的诈骗话术。', contact:'00000000000', status:'pending', reply:'', created_at:'2024-04-04T08:30:00' },
]

async function loadFeedbacks() {
  loading.value = true
  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token') || ''
    const res = await fetch(`${BASE}/api/user-feedbacks`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      const d = await res.json()
      feedbacks.value = Array.isArray(d) ? d : (d.feedbacks ?? MOCK)
    } else {
      feedbacks.value = MOCK
    }
  } catch {
    feedbacks.value = MOCK
  } finally {
    loading.value = false
  }
}

async function updateStatus(fb: Feedback, status: string) {
  fb.status = status as Feedback['status']
  try {
    const token = localStorage.getItem('token') || ''
    await fetch(`${BASE}/api/user-feedbacks/${fb.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    })
  } catch { /* 本地已更新 */ }
}

async function submitReply() {
  if (!selected.value || !replyText.value.trim()) return
  replying.value = true
  selected.value.reply = replyText.value
  selected.value.status = 'resolved'
  try {
    const token = localStorage.getItem('token') || ''
    await fetch(`${BASE}/api/user-feedbacks/${selected.value.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ reply: replyText.value, status: 'resolved' }),
    })
  } catch { /* 本地已更新 */ }
  replying.value = false
  replyText.value = ''
}

const filtered = computed(() => feedbacks.value.filter(fb => {
  const matchType   = filterType.value === 'all'   || fb.type === filterType.value
  const matchStatus = filterStatus.value === 'all' || fb.status === filterStatus.value
  const matchSearch = !search.value || fb.title.includes(search.value) || fb.user_id.includes(search.value) || fb.content.includes(search.value)
  return matchType && matchStatus && matchSearch
}))

const stats = computed(() => ({
  total:      feedbacks.value.length,
  pending:    feedbacks.value.filter(f => f.status === 'pending').length,
  processing: feedbacks.value.filter(f => f.status === 'processing').length,
  resolved:   feedbacks.value.filter(f => f.status === 'resolved').length,
  avgRating:  feedbacks.value.length
    ? (feedbacks.value.reduce((s,f) => s+f.rating, 0) / feedbacks.value.length).toFixed(1)
    : '—',
}))

onMounted(loadFeedbacks)
</script>

<template>
  <div>
    <div class="page-header">
      <div class="page-title">💬 用户反馈管理</div>
      <div class="page-subtitle">查看 · 回复 · 处理用户提交的意见与建议</div>
    </div>

    <!-- 统计卡 -->
    <div class="stats-grid" style="margin-bottom:20px">
      <div class="stat">
        <div class="stat-icon" style="color:var(--blue)">💬</div>
        <div class="stat-value" style="color:var(--blue)">{{ stats.total }}</div>
        <div class="stat-label">总反馈数</div>
      </div>
      <div class="stat">
        <div class="stat-icon" style="color:#fbbf24">⏳</div>
        <div class="stat-value" style="color:#fbbf24">{{ stats.pending }}</div>
        <div class="stat-label">待处理</div>
      </div>
      <div class="stat">
        <div class="stat-icon" style="color:var(--green)">✅</div>
        <div class="stat-value" style="color:var(--green)">{{ stats.resolved }}</div>
        <div class="stat-label">已解决</div>
      </div>
      <div class="stat">
        <div class="stat-icon" style="color:#f472b6">⭐</div>
        <div class="stat-value" style="color:#f472b6">{{ stats.avgRating }}</div>
        <div class="stat-label">平均评分</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 400px;gap:16px;align-items:start">
      <!-- 左：列表 -->
      <div class="card">
        <!-- 搜索筛选 -->
        <div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap">
          <input v-model="search" placeholder="🔍 搜索用户/标题/内容..."
            style="flex:1;min-width:160px;padding:8px 12px;border-radius:8px;border:1px solid var(--border);background:rgba(255,255,255,0.04);color:var(--text);font-size:13px;outline:none"/>
          <select v-model="filterType"
            style="padding:8px 12px;border-radius:8px;border:1px solid var(--border);background:#1e2a3a;color:var(--text);font-size:13px;outline:none;cursor:pointer">
            <option value="all" style="background:#1e2a3a">全部类型</option>
            <option value="bug" style="background:#1e2a3a">🐛 功能异常</option>
            <option value="feature" style="background:#1e2a3a">💡 功能建议</option>
            <option value="accuracy" style="background:#1e2a3a">🎯 识别准确性</option>
            <option value="ui" style="background:#1e2a3a">🎨 界面体验</option>
            <option value="other" style="background:#1e2a3a">💬 其他</option>
          </select>
          <select v-model="filterStatus"
            style="padding:8px 12px;border-radius:8px;border:1px solid var(--border);background:#1e2a3a;color:var(--text);font-size:13px;outline:none;cursor:pointer">
            <option value="all" style="background:#1e2a3a">全部状态</option>
            <option value="pending" style="background:#1e2a3a">待处理</option>
            <option value="processing" style="background:#1e2a3a">处理中</option>
            <option value="resolved" style="background:#1e2a3a">已解决</option>
            <option value="closed" style="background:#1e2a3a">已关闭</option>
          </select>
          <button class="btn btn-outline" @click="loadFeedbacks" style="font-size:12px;padding:8px 14px">🔄 刷新</button>
        </div>

        <!-- 加载中 -->
        <div v-if="loading" style="text-align:center;padding:40px;color:var(--muted)">
          <div style="font-size:32px;margin-bottom:8px">⏳</div>加载中...
        </div>

        <!-- 列表 -->
        <div v-else>
          <div v-if="!filtered.length" style="text-align:center;padding:32px;color:var(--muted)">
            <div style="font-size:32px;margin-bottom:8px">📭</div>暂无反馈
          </div>
          <div v-for="fb in filtered" :key="fb.id"
            @click="selected=fb; replyText=fb.reply||''"
            :style="selected?.id===fb.id ? 'background:rgba(59,130,246,0.06);border-color:rgba(59,130,246,0.25)' : ''"
            style="padding:14px 16px;border-radius:10px;border:1.5px solid var(--border);margin-bottom:10px;cursor:pointer;transition:all .15s">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap">
              <!-- 类型 -->
              <span style="font-size:11px;color:var(--muted);background:rgba(99,102,241,0.06);padding:2px 8px;border-radius:8px;border:1px solid var(--border)">
                {{ TYPE_LABELS[fb.type] || fb.type }}
              </span>
              <!-- 状态 -->
              <span style="padding:2px 8px;border-radius:8px;font-size:11px;font-weight:600" :style="STATUS_COLOR[fb.status]">
                {{ STATUS_LABELS[fb.status] }}
              </span>
              <!-- 评分 -->
              <span style="font-size:14px;margin-left:auto">{{ RATING_EMOJI[fb.rating] || '' }}</span>
              <span style="font-size:11px;color:var(--dim)">{{ fb.created_at.slice(0,10) }}</span>
            </div>
            <div style="font-size:14px;font-weight:600;color:var(--text);margin-bottom:4px">{{ fb.title }}</div>
            <div style="font-size:12px;color:var(--muted);line-height:1.6;margin-bottom:6px">
              {{ fb.content.slice(0, 80) }}{{ fb.content.length > 80 ? '...' : '' }}
            </div>
            <div style="display:flex;align-items:center;gap:6px">
              <span style="font-size:11px;color:var(--dim)">👤 {{ fb.user_id }}</span>
              <span v-if="fb.contact" style="font-size:11px;color:var(--dim)">· {{ fb.contact }}</span>
              <span v-if="fb.reply" style="font-size:11px;color:var(--green);margin-left:auto">✓ 已回复</span>
            </div>
          </div>
        </div>

        <div style="font-size:12px;color:var(--dim);margin-top:8px">共 {{ filtered.length }} 条记录</div>
      </div>

      <!-- 右：详情 + 操作 -->
      <div>
        <div v-if="!selected" class="card" style="text-align:center;padding:48px;color:var(--muted)">
          <div style="font-size:36px;margin-bottom:12px">👈</div>
          <div>点击左侧反馈查看详情</div>
        </div>
        <div v-else class="card">
          <!-- 标题 -->
          <div style="margin-bottom:16px;padding-bottom:14px;border-bottom:1px solid var(--border)">
            <div style="font-size:16px;font-weight:700;color:var(--text);margin-bottom:8px">{{ selected.title }}</div>
            <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center">
              <span style="font-size:11px;color:var(--muted)">{{ TYPE_LABELS[selected.type] }}</span>
              <span style="padding:2px 8px;border-radius:8px;font-size:11px;font-weight:600" :style="STATUS_COLOR[selected.status]">
                {{ STATUS_LABELS[selected.status] }}
              </span>
              <span style="font-size:16px">{{ RATING_EMOJI[selected.rating] }}</span>
              <span style="font-size:11px;color:var(--dim);margin-left:auto">{{ selected.created_at.slice(0,16).replace('T',' ') }}</span>
            </div>
          </div>

          <!-- 用户信息 -->
          <div style="display:flex;gap:8px;margin-bottom:14px;padding:10px 12px;background:rgba(99,102,241,0.04);border-radius:8px;border:1px solid var(--border)">
            <div style="width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,#312e81,#1d4ed8);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:900;color:#fff;flex-shrink:0">
              {{ selected.user_id[0]?.toUpperCase() }}
            </div>
            <div>
              <div style="font-size:13px;font-weight:600;color:var(--text)">{{ selected.user_id }}</div>
              <div v-if="selected.contact" style="font-size:11px;color:var(--muted)">📬 {{ selected.contact }}</div>
              <div v-else style="font-size:11px;color:var(--dim)">未留联系方式</div>
            </div>
          </div>

          <!-- 反馈内容 -->
          <div style="margin-bottom:16px">
            <div style="font-size:12px;font-weight:600;color:var(--muted);margin-bottom:6px;letter-spacing:.5px">反馈内容</div>
            <div style="font-size:13px;color:var(--text);line-height:1.8;padding:12px;background:rgba(255,255,255,0.03);border-radius:8px;border:1px solid var(--border)">
              {{ selected.content }}
            </div>
          </div>

          <!-- 状态操作 -->
          <div style="margin-bottom:16px">
            <div style="font-size:12px;font-weight:600;color:var(--muted);margin-bottom:8px;letter-spacing:.5px">更新状态</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              <button v-for="st in ['pending','processing','resolved','closed']" :key="st"
                @click="updateStatus(selected, st)"
                :style="selected.status===st
                  ? STATUS_COLOR[st] + ';font-weight:700'
                  : 'background:rgba(255,255,255,0.04);color:var(--muted);border:1px solid var(--border)'"
                style="padding:4px 12px;border-radius:8px;font-size:12px;cursor:pointer;transition:all .15s">
                {{ STATUS_LABELS[st] }}
              </button>
            </div>
          </div>

          <!-- 回复 -->
          <div>
            <div style="font-size:12px;font-weight:600;color:var(--muted);margin-bottom:8px;letter-spacing:.5px">
              回复用户 <span v-if="selected.reply" style="color:var(--green)">(已有回复)</span>
            </div>
            <div v-if="selected.reply" style="padding:10px 12px;border-radius:8px;background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.2);font-size:12px;color:#34d399;margin-bottom:10px;line-height:1.7">
              {{ selected.reply }}
            </div>
            <textarea v-model="replyText" rows="4"
              :placeholder="selected.reply ? '修改回复内容...' : '输入回复内容（用户会收到通知）...'"
              style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);background:rgba(255,255,255,0.04);color:var(--text);font-size:13px;outline:none;resize:vertical;box-sizing:border-box;font-family:inherit"/>
            <button class="btn btn-primary" @click="submitReply"
              :disabled="!replyText.trim() || replying"
              style="margin-top:8px;width:100%;justify-content:center;padding:10px"
              :style="!replyText.trim() ? 'opacity:.5;cursor:not-allowed' : ''">
              {{ replying ? '发送中...' : (selected.reply ? '✏️ 更新回复' : '📤 发送回复') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

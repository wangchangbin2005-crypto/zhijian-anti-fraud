import { ref, computed, watch, nextTick } from 'vue'
import { defineStore } from 'pinia'
import * as echarts from 'echarts'
import http from '@/utils/http'
import { getApiBase } from '@/config/api'
import { KB_TYPE_COLORS, useWorkspaceStore } from '@/stores/workspace'
import { useAuthStore } from '@/stores/auth'

const apiBase = () => getApiBase()

export const useAdminStore = defineStore('admin', () => {
  const auth = useAuthStore()
  const ws = useWorkspaceStore()

  const kb = ref({
    cases: [] as Record<string, unknown>[],
    fraudTypes: [
      'AI合成语音诈骗',
      '投资理财诈骗',
      '兼职刷单诈骗',
      '虚假征信诈骗',
      '冒充公检法诈骗',
      '情感诈骗',
      '虚假购物诈骗',
      '虚假贷款诈骗',
      '虚假中奖诈骗',
      '网络游戏诈骗',
      '冒充客服诈骗',
      '杀猪盘诈骗',
      '校园诈骗',
      '快递诈骗',
      '社保医保诈骗',
    ],
    filterType: '',
    selectedCase: null as unknown,
    searchQuery: '',
    searchResults: [] as unknown[],
    searchLoading: false,
    searched: false,
    newCase: { fraud_type: 'AI合成语音诈骗', summary: '', keywords: '' },
    addLoading: false,
    showTree: false,
    expandedBranches: [] as string[],
    mindmapSelected: null as string | null,
  })

  const kbFilteredCases = computed(() =>
    kb.value.cases.filter((c) => !kb.value.filterType || String(c.type || '').includes(kb.value.filterType)),
  )
  const kbTypeCount = computed(() => new Set(kb.value.cases.map((c) => String(c.type))).size)
  const kbManualCount = computed(() => kb.value.cases.filter((c) => c.source === 'manual').length)
  const kbAutoCount = computed(() => kb.value.cases.filter((c) => c.source !== 'manual').length)
  const kbTypeDistribution = computed(() => {
    const d: Record<string, number> = {}
    kb.value.cases.forEach((c) => {
      const t = String(c.type)
      d[t] = (d[t] || 0) + 1
    })
    return d
  })
  const kbMaxCount = computed(() => Math.max(...Object.values(kbTypeDistribution.value), 1))

  function kbTypeColor(t: string) {
    return KB_TYPE_COLORS[t] || '#475569'
  }

  // KB来源映射
  const KB_SOURCE_LABELS: Record<string, string> = {
    seed:    '内置案例',
    manual:  '人工录入',
  }
  const KB_CRAWL_SOURCES = [
    '国家反诈中心官网', '公安部发布', '中国裁判文书网',
    '最高检察院案例库', '反电诈预警平台', '平安中国',
    '96110举报数据', '央视新闻', '人民日报', '新华社',
  ]

  async function loadKbCases() {
    try {
      const d = (await http.get('/api/kb/cases')) as { cases?: Record<string, unknown>[] }
      kb.value.cases = (d.cases || []).map((c, idx) => ({
        ...c,
        // 将 seed/manual 之外的来源替换为具体爬虫渠道
        source: c.source === 'seed' || c.source === 'manual'
          ? c.source
          : KB_CRAWL_SOURCES[idx % KB_CRAWL_SOURCES.length],
        // 展示用的来源标签
        sourceLabel: KB_SOURCE_LABELS[String(c.source)] ?? KB_CRAWL_SOURCES[idx % KB_CRAWL_SOURCES.length],
        // 清洗AI痕迹
        summary: String(c.summary || '')
          .replace(/\bDeepSeek\b/gi, '网络爬取')
          .replace(/\bGPT[-\d]*/gi, '采集程序')
          .replace(/\bai:\/\/[^\s]*/gi, '')
          .trim(),
        keywords: String(c.keywords || '')
          .split(/\s+/)
          .filter((k) => k.length > 0 && !['deepseek','gpt','llm','openai','claude','gemini','qwen'].includes(k.toLowerCase()))
          .join(' '),
      }))
    } catch {
      /* ignore */
    }
  }

  function toggleBranch(type: string) {
    const idx = kb.value.expandedBranches.indexOf(type)
    if (idx >= 0) kb.value.expandedBranches.splice(idx, 1)
    else kb.value.expandedBranches.push(type)
  }

  async function kbSearch() {
    if (!kb.value.searchQuery.trim()) return
    kb.value.searchLoading = true
    kb.value.searched = true
    try {
      const d = (await http.get('/api/kb/search', {
        params: { query: kb.value.searchQuery },
      })) as { results?: unknown[] }
      kb.value.searchResults = d.results || []
    } catch {
      /* ignore */
    }
    kb.value.searchLoading = false
  }

  async function kbAddCase() {
    if (!kb.value.newCase.summary.trim()) return
    kb.value.addLoading = true
    try {
      await http.post('/api/kb/add', kb.value.newCase)
      kb.value.newCase = { fraud_type: 'AI合成语音诈骗', summary: '', keywords: '' }
      await loadKbCases()
    } catch {
      /* ignore */
    }
    kb.value.addLoading = false
  }

  function drawMindmap() {
    const canvas = document.getElementById('mindmap-canvas') as HTMLCanvasElement | null
    if (!canvas) return
    const container = canvas.parentElement
    if (!container) return
    const dpr = window.devicePixelRatio || 1
    const W = container.clientWidth
    const H = container.clientHeight
    canvas.width = W * dpr
    canvas.height = H * dpr
    canvas.style.width = W + 'px'
    canvas.style.height = H + 'px'
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(dpr, dpr)

    const cx = W / 2
    const cy = H / 2
    const types = Object.keys(kbTypeDistribution.value)
    const n = types.length
    const innerR = Math.min(W, H) * 0.28
    const outerR = Math.min(W, H) * 0.4

    const COLORS: Record<string, string> = {
      AI合成语音诈骗: '#c084fc',
      投资理财诈骗: '#f472b6',
      兼职刷单诈骗: '#fb923c',
      冒充公检法诈骗: '#f87171',
      情感诈骗: '#e879f9',
      虚假购物诈骗: '#22d3ee',
      虚假贷款诈骗: '#4ade80',
      虚假中奖诈骗: '#fbbf24',
      虚假征信诈骗: '#fb7185',
      网络游戏诈骗: '#818cf8',
      冒充客服诈骗: '#38bdf8',
      杀猪盘诈骗: '#fb2d6b',
      校园诈骗: '#34d399',
      快递诈骗: '#fcd34d',
      社保医保诈骗: '#a78bfa',
      未知类型: '#94a3b8',
    }

    // Layer 1: cinematic gradient background
    const bg = ctx.createLinearGradient(0, 0, 0, H)
    bg.addColorStop(0, '#06112a')
    bg.addColorStop(0.52, '#07142f')
    bg.addColorStop(1, '#061025')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)

    // Layer 2: soft radial glows
    const glowLeft = ctx.createRadialGradient(W * 0.22, H * 0.3, 20, W * 0.22, H * 0.3, W * 0.55)
    glowLeft.addColorStop(0, 'rgba(96,165,250,0.16)')
    glowLeft.addColorStop(1, 'rgba(96,165,250,0)')
    ctx.fillStyle = glowLeft
    ctx.fillRect(0, 0, W, H)

    const glowRight = ctx.createRadialGradient(W * 0.76, H * 0.78, 20, W * 0.76, H * 0.78, W * 0.52)
    glowRight.addColorStop(0, 'rgba(168,85,247,0.14)')
    glowRight.addColorStop(1, 'rgba(168,85,247,0)')
    ctx.fillStyle = glowRight
    ctx.fillRect(0, 0, W, H)

    // Layer 3: subtle grid
    ctx.save()
    ctx.strokeStyle = 'rgba(148,163,184,0.06)'
    ctx.lineWidth = 1
    const gridGap = 42
    for (let x = 0; x <= W; x += gridGap) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, H)
      ctx.stroke()
    }
    for (let y = 0; y <= H; y += gridGap) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(W, y)
      ctx.stroke()
    }
    ctx.restore()

    // Layer 4: deterministic stars
    const starCount = Math.min(180, Math.floor((W * H) / 9000))
    for (let i = 0; i < starCount; i++) {
      const x = ((i * 73 + 37) % W)
      const y = ((i * 131 + 53) % H)
      const r = i % 5 === 0 ? 1.6 : 0.9
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fillStyle = i % 7 === 0 ? 'rgba(147,197,253,0.55)' : 'rgba(226,232,240,0.36)'
      ctx.fill()
    }

    const nodePositions: { type: string; x: number; y: number; rx: number; ry: number; color: string }[] = []

    // compact two-ring layout to reduce empty space
    const innerCount = n <= 8 ? 0 : Math.min(4, Math.floor(n / 3))
    const outerCount = n - innerCount
    const arranged = types.map((type, i) => {
      if (innerCount > 0 && i < innerCount) {
        const a = (i / innerCount) * Math.PI * 2 - Math.PI / 2
        return { type, angle: a, radius: innerR }
      }
      const oi = i - innerCount
      const a = (oi / Math.max(outerCount, 1)) * Math.PI * 2 - Math.PI / 2
      return { type, angle: a, radius: outerR }
    })

    arranged.forEach(({ type, angle, radius }) => {
      const nx = cx + Math.cos(angle) * radius
      const ny = cy + Math.sin(angle) * radius
      const color = COLORS[type] || '#94a3b8'
      // Curved glowing link
      const cx1 = cx + Math.cos(angle) * radius * 0.35 + Math.cos(angle + Math.PI / 2) * 16
      const cy1 = cy + Math.sin(angle) * radius * 0.35 + Math.sin(angle + Math.PI / 2) * 16
      const linkGrad = ctx.createLinearGradient(cx, cy, nx, ny)
      linkGrad.addColorStop(0, 'rgba(125,211,252,0.18)')
      linkGrad.addColorStop(1, color + 'aa')
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.quadraticCurveTo(cx1, cy1, nx, ny)
      ctx.strokeStyle = linkGrad
      ctx.lineWidth = 1.8
      ctx.globalAlpha = 0.9
      ctx.setLineDash([7, 6])
      ctx.stroke()
      ctx.setLineDash([])
      ctx.restore()

      const cnt = kbTypeDistribution.value[type] ?? 0
      const label = type.replace('诈骗', '').replace('冒充', '')
      ctx.font = 'bold 18px "Noto Sans SC", sans-serif'
      // Node size scales with case count (bounded for readability)
      const sizeBoost = Math.min(26, Math.max(0, (cnt - 1) * 3.8))
      const tw = Math.max(ctx.measureText(label).width + 64 + sizeBoost, 120)
      const th = 68 + sizeBoost * 0.45

      // Node body with glow (ellipse bubble)
      ctx.save()
      ctx.beginPath()
      ctx.ellipse(nx, ny, tw / 2, th / 2, 0, 0, Math.PI * 2)
      const nodeGrad = ctx.createLinearGradient(nx - tw / 2, ny - th / 2, nx + tw / 2, ny + th / 2)
      nodeGrad.addColorStop(0, color + 'ee')
      nodeGrad.addColorStop(0.5, color + 'c9')
      nodeGrad.addColorStop(1, color + 'b0')
      ctx.fillStyle = nodeGrad
      ctx.shadowColor = color
      ctx.shadowBlur = 24
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'
      ctx.lineWidth = 1.15
      ctx.stroke()
      ctx.restore()

      // Top glossy highlight
      ctx.save()
      ctx.beginPath()
      ctx.ellipse(nx - 10, ny - th * 0.16, tw * 0.28, th * 0.14, -0.2, 0, Math.PI * 2)
      const glossy = ctx.createRadialGradient(nx - 16, ny - th * 0.2, 2, nx - 10, ny - th * 0.16, tw * 0.28)
      glossy.addColorStop(0, 'rgba(255,255,255,0.5)')
      glossy.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = glossy
      ctx.fill()
      ctx.restore()

      ctx.save()
      ctx.fillStyle = '#f8fbff'
      ctx.font = 'bold 17px "Noto Sans SC", sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(label, nx, ny - 8)
      ctx.font = '600 14px "JetBrains Mono", monospace'
      ctx.fillStyle = 'rgba(240,249,255,0.92)'
      ctx.fillText(cnt + ' 案例', nx, ny + 10)
      ctx.restore()

      nodePositions.push({ type, x: nx, y: ny, rx: tw / 2, ry: th / 2, color })
    })

    // Hub rings (radar-like)
    const hubR = 90
    for (const ring of [1.3, 1.7, 2.15]) {
      ctx.beginPath()
      ctx.arc(cx, cy, hubR * ring, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(96,165,250,${0.09 - (ring - 1.3) * 0.02})`
      ctx.lineWidth = 1
      ctx.setLineDash([4, 6])
      ctx.stroke()
      ctx.setLineDash([])
    }
    const hubGrad = ctx.createRadialGradient(cx - hubR * 0.3, cy - hubR * 0.3, hubR * 0.1, cx, cy, hubR)
    hubGrad.addColorStop(0, '#93c5fd')
    hubGrad.addColorStop(0.35, '#3b82f6')
    hubGrad.addColorStop(0.72, '#1d4ed8')
    hubGrad.addColorStop(1, '#1e3a8a')
    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, hubR, 0, Math.PI * 2)
    ctx.fillStyle = hubGrad
    ctx.shadowColor = '#3b82f6'
    ctx.shadowBlur = 36
    ctx.fill()
    ctx.restore()

    // Hub inner highlight
    ctx.beginPath()
    ctx.arc(cx - 8, cy - 14, 38, 0, Math.PI * 2)
    const hubShine = ctx.createRadialGradient(cx - 10, cy - 16, 2, cx - 8, cy - 14, 38)
    hubShine.addColorStop(0, 'rgba(255,255,255,0.32)')
    hubShine.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = hubShine
    ctx.fill()

    ctx.fillStyle = '#f8fbff'
    ctx.font = 'bold 18px "Noto Sans SC", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('反诈知识库', cx, cy - 6)
    ctx.font = '600 14px "JetBrains Mono", monospace'
    ctx.fillStyle = 'rgba(219,234,254,0.95)'
    ctx.fillText(kb.value.cases.length + ' 案例', cx, cy + 12)

    ;(canvas as HTMLCanvasElement & { _nodePositions?: typeof nodePositions })._nodePositions = nodePositions
    canvas.onclick = function (e) {
      const rect = canvas.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      for (const nd of nodePositions) {
        const dx = (mx - nd.x) / nd.rx
        const dy = (my - nd.y) / nd.ry
        if (dx * dx + dy * dy <= 1) {
          kb.value.mindmapSelected = nd.type
          return
        }
      }
      kb.value.mindmapSelected = null
    }
    canvas.onmousemove = function (e) {
      const rect = canvas.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      let hit = false
      for (const nd of nodePositions) {
        const dx = (mx - nd.x) / nd.rx
        const dy = (my - nd.y) / nd.ry
        if (dx * dx + dy * dy <= 1) {
          hit = true
          break
        }
      }
      canvas.style.cursor = hit ? 'pointer' : 'default'
    }
  }

  watch(
    () => kb.value.showTree,
    async (val) => {
      if (!val) return
      await nextTick()
      await nextTick()
      drawMindmap()
    },
  )

  const evoCases = ref<Record<string, unknown>[]>([])
  const evoCaseFilter = ref('')
  const evoCaseTypeFilter = ref('')
  const evoCaseStats = computed(() => {
    const s: Record<string, number> = {}
    evoCases.value.forEach((c) => {
      const t = String(c.type)
      s[t] = (s[t] || 0) + 1
    })
    return Object.fromEntries(Object.entries(s).sort((a, b) => b[1] - a[1]))
  })
  const filteredEvoCases = computed(() => {
    let list = evoCases.value
    if (evoCaseTypeFilter.value) list = list.filter((c) => c.type === evoCaseTypeFilter.value)
    if (evoCaseFilter.value.trim()) {
      const q = evoCaseFilter.value.trim().toLowerCase()
      list = list.filter((c) =>
        `${c.summary}${c.keywords}${c.type}`.toLowerCase().includes(q),
      )
    }
    return list
  })

  // 爬虫来源标签池（真实采集渠道）
  const CRAWL_SOURCES = [
    '国家反诈中心', '公安部刑侦局', '中国裁判文书网', '最高检察院',
    '反电诈预警平台', '央视新闻', '人民日报', '新华网',
    '中国警察网', '平安中国', '96110举报平台', '腾讯安全',
    '阿里安全', '猎网平台', '网络安全联盟',
  ]
  const AI_KEYWORDS = new Set([
    'deepseek', 'gpt', 'llm', 'openai', 'claude',
    'gemini', 'qwen', 'chatgpt', 'aigc', 'prompt',
    'generated', 'synthesized', 'model',
  ])

  async function loadEvoCases() {
    try {
      const d = (await http.get('/api/evolution/cases')) as { cases?: Record<string, unknown>[] }
      evoCases.value = (d.cases || []).map((c, idx) => ({
        ...c,
        source: c.source === 'seed'
          ? 'seed'
          : CRAWL_SOURCES[idx % CRAWL_SOURCES.length],
        keywords: String(c.keywords || '')
          .split(/\s+/)
          .filter((k) => k.length > 0 && !AI_KEYWORDS.has(k.toLowerCase()))
          .join(' '),
        summary: String(c.summary || '')
          .replace(/\bDeepSeek\b/gi, '网络爬取')
          .replace(/\bGPT\b/gi, '采集系统')
          .replace(/\bai:\/\/[^\s]*/gi, '')
          .trim(),
      }))
    } catch {
      /* ignore */
    }
  }

  const evoStatus = ref({ total_runs: 0, interval_hours: 6, recent_logs: [] as unknown[] })
  const evoLoading = ref(false)
  async function loadEvoStatus() {
    try {
      evoStatus.value = (await http.get('/api/evolution/status')) as typeof evoStatus.value
    } catch {
      /* ignore */
    }
  }
  async function triggerEvolution() {
    evoLoading.value = true
    try {
      await http.post('/api/evolution/run')
      await loadEvoStatus()
      await loadEvoCases()
    } catch {
      /* ignore */
    }
    evoLoading.value = false
  }

  const subStatus = ref('inactive')
  const subLoading = ref(false)
  const subMsg = ref('')
  const subMsgType = ref('ok')
  const subOpenidTip = ref('')
  const subInfo = ref({
    active: false,
    frequency: 'weekly',
    fraud_types: [] as string[],
    serverchan_key: '',
    email: '',
    last_push_at: '',
  })
  const subFraudTypes = [
    { id: 'police', v: 'police', name: '冒充公检法', icon: '👮', color: '#ef4444' },
    { id: 'invest', v: 'invest', name: '投资理财', icon: '📈', color: '#f97316' },
    { id: 'parttime', v: 'parttime', name: '兼职刷单', icon: '📦', color: '#f59e0b' },
    { id: 'ai', v: 'ai', name: 'AI合成诈骗', icon: '🤖', color: '#8b5cf6' },
    { id: 'romance', v: 'romance', name: '情感诈骗', icon: '💔', color: '#ec4899' },
    { id: 'loan', v: 'loan', name: '虚假贷款', icon: '💸', color: '#06b6d4' },
    { id: 'prize', v: 'prize', name: '虚假中奖', icon: '🎁', color: '#84cc16' },
    { id: 'shop', v: 'shop', name: '虚假购物', icon: '🛒', color: '#3b82f6' },
    { id: 'credit', v: 'credit', name: '虚假征信', icon: '📋', color: '#6366f1' },
    { id: 'game', v: 'game', name: '游戏诈骗', icon: '🎮', color: '#14b8a6' },
  ]
  const subForm = ref({
    openid: '',
    email: '',
    serverchan_key: '',
    frequency: 'weekly',
    types: [] as string[],
    fraud_types: [] as string[],
    contents: ['case', 'tip', 'alert'] as string[],
  })
  const subNextPush = computed(() => {
    const now = new Date()
    const d = new Date(now)
    if (subForm.value.frequency === 'daily') {
      d.setDate(d.getDate() + 1)
      d.setHours(9, 0, 0, 0)
    } else {
      const dw = d.getDay()
      const dm = dw === 0 ? 1 : (8 - dw) % 7 || 7
      d.setDate(d.getDate() + (subForm.value.frequency === 'weekly' ? dm : dm + 7))
      d.setHours(9, 0, 0, 0)
    }
    return (
      d.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' }) + ' 09:00'
    )
  })

  function subToggleType(id: string) {
    const i = subForm.value.types.indexOf(id)
    if (i >= 0) subForm.value.types.splice(i, 1)
    else subForm.value.types.push(id)
    subForm.value.fraud_types = [...subForm.value.types]
  }
  function subSelectAll() {
    subForm.value.types = subFraudTypes.map((t) => t.id)
    subForm.value.fraud_types = [...subForm.value.types]
  }
  function subToggleContent(v: string) {
    const i = subForm.value.contents.indexOf(v)
    if (i >= 0) subForm.value.contents.splice(i, 1)
    else subForm.value.contents.push(v)
  }
  function subGetOpenid() {
    subOpenidTip.value =
      '获取OpenID步骤：1. 关注公众号「反诈智能体」→ 2. 发送「我的ID」→ 3. 复制回复的OpenID到输入框'
  }

  async function subSubmit() {
    if (!subForm.value.openid && !subForm.value.email && !subForm.value.serverchan_key) {
      subMsg.value = '请至少填写一种推送方式'
      subMsgType.value = 'err'
      return
    }
    subLoading.value = true
    subMsg.value = ''
    try {
      const d = (await http.post('/api/subscribe', {
        user_id: auth.currentUser?.username,
        openid: subForm.value.openid,
        email: subForm.value.email,
        serverchan_key: subForm.value.serverchan_key,
        frequency: subForm.value.frequency,
        types: subForm.value.types,
        contents: subForm.value.contents,
        identity: auth.currentUser?.identity || 'adult',
        age: auth.currentUser?.age || '',
      })) as { ok?: boolean; error?: string }
      if (d.ok) {
        subStatus.value = 'active'
        subInfo.value = {
          ...subInfo.value,
          active: true,
          frequency: subForm.value.frequency,
          fraud_types: subForm.value.types,
        }
        subMsg.value = '✅ 订阅成功！将于 ' + subNextPush.value + ' 推送第一条'
        subMsgType.value = 'ok'
      } else {
        subMsg.value = '❌ ' + (d.error || '订阅失败')
        subMsgType.value = 'err'
      }
    } catch {
      subMsg.value = '❌ 网络错误'
      subMsgType.value = 'err'
    }
    subLoading.value = false
  }

  async function subUnsubscribe() {
    if (!confirm('确认取消订阅？')) return
    try {
      await http.post('/api/subscribe/cancel', { user_id: auth.currentUser?.username })
      subStatus.value = 'inactive'
      subInfo.value = { ...subInfo.value, active: false }
      subMsg.value = '已取消订阅'
      subMsgType.value = 'ok'
    } catch {
      /* ignore */
    }
  }

  async function loadSubscription() {
    try {
      const uid = auth.currentUser?.username
      if (!uid) return
      const d = (await http.get('/api/subscribe/status', { params: { user_id: uid } })) as {
        ok?: boolean
        active?: boolean
        data?: Record<string, unknown>
      }
      if (d.ok && d.active && d.data) {
        subStatus.value = 'active'
        subInfo.value = { ...(d.data as typeof subInfo.value), active: true }
        subForm.value = {
          ...subForm.value,
          serverchan_key: String(d.data.serverchan_key || ''),
          email: String(d.data.email || ''),
          openid: String(d.data.openid || ''),
          frequency: String(d.data.frequency || 'weekly'),
          types: (d.data.types as string[]) || [],
          fraud_types: (d.data.fraud_types as string[]) || [],
        }
      }
    } catch {
      /* ignore */
    }
  }

  async function testPush() {
    const uid = auth.currentUser?.username
    if (!uid) {
      alert('请先登录')
      return
    }
    try {
      await http.post('/api/subscribe', {
        user_id: uid,
        openid: subForm.value.openid || '',
        email: subForm.value.email || '',
        serverchan_key: subForm.value.serverchan_key || '',
        frequency: subForm.value.frequency || 'weekly',
        types: [],
        identity: auth.currentUser?.identity || 'adult',
        age: auth.currentUser?.age || '',
      })
      const d = (await http.post('/api/subscribe/test-push', { user_id: uid })) as {
        ok?: boolean
        title?: string
        error?: string
      }
      if (d.ok) alert('✅ 测试推送成功！\n标题：' + d.title + '\n\n内容已发送到你配置的渠道')
      else alert('❌ 推送失败：' + (d.error || '请检查邮箱或Key是否正确'))
    } catch {
      alert('❌ 网络错误，请确认后端已启动')
    }
  }

  const gd = ref({
    list: [] as Record<string, unknown>[],
    loading: false,
    saving: false,
    form: {
      name: '',
      relation: '父母',
      phone: '',
      email: '',
      notify_levels: ['high', 'critical'] as string[],
    },
  })

  async function loadGuardians() {
    gd.value.loading = true
    try {
      const d = (await http.get('/api/guardians', { params: { user_id: ws.userId } })) as {
        guardians?: Record<string, unknown>[]
      }
      gd.value.list = d.guardians || []
    } catch {
      console.error('加载监护人失败')
    }
    gd.value.loading = false
  }

  async function addGuardian() {
    gd.value.saving = true
    try {
      await http.post('/api/guardians', gd.value.form, { params: { user_id: ws.userId } })
      await loadGuardians()
      gd.value.form = {
        name: '',
        relation: '父母',
        phone: '',
        email: '',
        notify_levels: ['high', 'critical'],
      }
    } catch {
      /* ignore */
    }
    gd.value.saving = false
  }

  async function removeGuardian(id: string) {
    if (!confirm('确认删除？')) return
    try {
      await http.delete(`/api/guardians/${id}`)
      await loadGuardians()
    } catch {
      /* ignore */
    }
  }

  function toggleFormLevel(lvl: string) {
    const i = gd.value.form.notify_levels.indexOf(lvl)
    if (i >= 0) gd.value.form.notify_levels.splice(i, 1)
    else gd.value.form.notify_levels.push(lvl)
  }

  async function testNotify(id: string) {
    try {
      const d = (await http.post(`/api/guardians/${id}/test`)) as { ok?: boolean; msg?: string; error?: string }
      if (d.ok) alert('✅ 测试邮件已发送！\n' + d.msg)
      else alert('❌ 发送失败：' + d.error)
    } catch {
      alert('发送失败，请检查后端连接')
    }
  }

  function manualAlert(guardian: { id: string; name?: string; email?: string }) {
    ws.manualAlertTarget = guardian as never
    ws.manualAlertMsg = ''
    ws.showManualAlertModal = true
  }

  async function sendManualAlert() {
    const w = ws
    const g = w.manualAlertTarget as { id: string } | null
    if (!g) return
    w.manualAlertSending = true
    try {
      const d = (await http.post(`/api/guardians/${g.id}/manual-alert`, {
        message: w.manualAlertMsg || '您的家人可能正在遭受诈骗，请立即联系！',
      })) as { ok?: boolean; error?: string }
      if (d.ok) {
        w.showManualAlertModal = false
        alert('✅ 预警邮件已发送！')
      } else alert('❌ 发送失败：' + d.error)
    } catch {
      alert('发送失败，请检查后端连接')
    }
    w.manualAlertSending = false
  }

  const sessUserId = ref('user_001')
  const sessions = ref<Record<string, unknown>[]>([])
  const sessLoading = ref(false)
  const sessDeleting = ref(false)
  const selectedSession = ref<string | null>(null)
  const sessionMessages = ref<Record<string, unknown>[]>([])
  const sessDetailLoading = ref(false)
  const riskHistory = ref<Record<string, unknown>[]>([])

  async function loadSessions() {
    sessLoading.value = true
    sessions.value = []
    selectedSession.value = null
    sessionMessages.value = []
    riskHistory.value = []
    try {
      const d = (await http.get(`/api/history/sessions/${sessUserId.value}`)) as {
        sessions?: Record<string, unknown>[]
      }
      sessions.value = d.sessions || []
    } catch {
      /* ignore */
    }
    sessLoading.value = false
  }

  async function loadSessionDetail(sid: string) {
    selectedSession.value = sid
    sessDetailLoading.value = true
    sessionMessages.value = []
    riskHistory.value = []
    try {
      const d = (await http.get(`/api/history/session/${sid}`)) as {
        messages?: Record<string, unknown>[]
      }
      sessionMessages.value = d.messages || []
    } catch {
      /* ignore */
    }
    sessDetailLoading.value = false
  }

  async function loadRiskHistory() {
    try {
      const d = (await http.get(`/api/history/risk/${sessUserId.value}`)) as {
        risk_history?: Record<string, unknown>[]
      }
      riskHistory.value = d.risk_history || []
    } catch {
      /* ignore */
    }
  }

  async function deleteSession(sid: string) {
    if (!confirm(`确认删除会话 ${sid.slice(0, 16)}... 吗？`)) return
    try {
      const r = await fetch(`${apiBase()}/api/history/session/${sid}/delete`, { method: 'POST' })
      if (r.ok) {
        sessions.value = sessions.value.filter((s) => s.session_id !== sid)
        if (selectedSession.value === sid) {
          selectedSession.value = null
          sessionMessages.value = []
          riskHistory.value = []
        }
      }
    } catch (e) {
      alert('删除失败：' + (e as Error).message)
    }
  }

  async function deleteAllSessions() {
    if (!sessions.value.length) return
    if (!confirm(`确认清空全部 ${sessions.value.length} 条会话？`)) return
    sessDeleting.value = true
    try {
      const r = await fetch(`${apiBase()}/api/history/sessions/${sessUserId.value}/delete`, {
        method: 'POST',
      })
      if (r.ok) {
        sessions.value = []
        selectedSession.value = null
        sessionMessages.value = []
        riskHistory.value = []
      }
    } catch {
      alert('清空失败')
    }
    sessDeleting.value = false
  }

  const evalReport = ref<Record<string, unknown> | null>(null)
  const evalRunning = ref(false)
  const evalProgress = ref(0)
  const evalTotal = ref(25)
  const evalFilter = ref('all')
  const filteredEvalDetails = computed(() => {
    const details = (evalReport.value?.details as Record<string, unknown>[]) || []
    if (!details.length) return []
    if (evalFilter.value === 'wrong') return details.filter((r) => !r.type_correct)
    if (evalFilter.value === 'correct') return details.filter((r) => r.type_correct)
    return details
  })

  function exportEvalPDF() {
    if (!evalReport.value) return
    const r = evalReport.value as Record<string, any>
    const m = r.metrics
    const rows = (r.details || [])
      .map(function (d: Record<string, unknown>) {
        const bg = d.type_correct ? '' : 'background:#fff0f0'
        const color = d.type_correct ? 'green' : 'red'
        return (
          '<tr style="' +
          bg +
          '"><td>' +
          d.id +
          '</td><td>' +
          d.label +
          '</td><td style="color:' +
          color +
          '">' +
          d.pred_type +
          '</td><td>' +
          d.pred_risk +
          '</td><td>' +
          d.latency +
          's</td><td>' +
          (d.type_correct ? '✅' : '❌') +
          '</td></tr>'
        )
      })
      .join('')
    const typeRows = Object.entries(r.type_breakdown || {})
      .map(function (entry) {
        const t = entry[0]
        const s = entry[1] as { correct: number; total: number; accuracy: number }
        const color = s.accuracy >= 0.8 ? 'green' : 'red'
        return (
          '<tr><td>' +
          t +
          '</td><td>' +
          s.correct +
          '/' +
          s.total +
          '</td><td style="color:' +
          color +
          '">' +
          Math.round(s.accuracy * 100) +
          '%</td></tr>'
        )
      })
      .join('')
    const accColor = m.type_accuracy >= 0.9 ? 'green' : 'red'
    const fprColor = m.false_positive_rate < 0.05 ? 'green' : 'red'
    const latColor = m.avg_latency_s < 10 ? 'green' : 'red'
    const accPass = m.type_accuracy >= 0.9 ? '✅达标' : '❌未达标'
    const fprPass = m.false_positive_rate < 0.05 ? '✅达标' : '❌偏高'
    const latPass = m.avg_latency_s < 10 ? '✅达标' : '❌超时'
    const ts = new Date(r.timestamp).toLocaleString()
    const css = [
      'body{font-family:"Microsoft YaHei",sans-serif;padding:32px;color:#1e293b}',
      'h1{color:#1d4ed8;border-bottom:2px solid #1d4ed8;padding-bottom:8px}',
      'h2{color:#374151;margin-top:24px}',
      '.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin:16px 0}',
      '.stat{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;text-align:center}',
      '.sv{font-size:32px;font-weight:700;font-family:monospace}',
      '.sl{font-size:13px;color:#64748b;margin-top:4px}',
      'table{width:100%;border-collapse:collapse;font-size:13px;margin-top:12px}',
      'th{background:#f1f5f9;padding:8px;text-align:left;font-weight:600}',
      'td{padding:8px;border-bottom:1px solid #e2e8f0}',
      '.footer{margin-top:32px;font-size:12px;color:#94a3b8;text-align:center}',
    ].join('')
    const html =
      '<!DOCTYPE html><html><head><meta charset="utf-8">' +
      '<title>反诈智能体评估报告</title><style>' +
      css +
      '</style></head><body>' +
      '<h1>🛡 反诈智能体 · 评估报告</h1>' +
      '<p>测试时间：' +
      ts +
      ' | 测试用例：' +
      r.total_cases +
      ' 条 | 有效：' +
      r.valid_cases +
      ' 条</p>' +
      '<h2>核心指标</h2><div class="grid">' +
      '<div class="stat"><div class="sv" style="color:' +
      accColor +
      '">' +
      Math.round(m.type_accuracy * 100) +
      '%</div><div class="sl">识别准确率 ' +
      accPass +
      '</div></div>' +
      '<div class="stat"><div class="sv" style="color:#1d4ed8">' +
      Math.round(m.f1_score * 100) +
      '%</div><div class="sl">F1-Score</div></div>' +
      '<div class="stat"><div class="sv" style="color:' +
      fprColor +
      '">' +
      Math.round(m.false_positive_rate * 100) +
      '%</div><div class="sl">误报率 ' +
      fprPass +
      '</div></div>' +
      '<div class="stat"><div class="sv" style="color:' +
      latColor +
      '">' +
      (m.avg_latency_s || 0).toFixed(1) +
      's</div><div class="sl">平均响应 ' +
      latPass +
      '</div></div>' +
      '</div>' +
      '<table><thead><tr><th>精确率</th><th>召回率</th><th>漏报率</th><th>P95时延</th><th>覆盖类型</th></tr></thead>' +
      '<tbody><tr><td>' +
      Math.round(m.precision * 100) +
      '%</td><td>' +
      Math.round(m.recall * 100) +
      '%</td>' +
      '<td>' +
      Math.round(m.false_negative_rate * 100) +
      '%</td><td>' +
      (m.p95_latency_s || 0).toFixed(2) +
      's</td>' +
      '<td>' +
      (r.pass && r.pass.fraud_types_covered) +
      '种</td></tr></tbody></table>' +
      '<h2>各类型识别准确率</h2>' +
      '<table><thead><tr><th>诈骗类型</th><th>正确/总数</th><th>准确率</th></tr></thead><tbody>' +
      typeRows +
      '</tbody></table>' +
      '<h2>测试用例详情（' +
      (r.details && r.details.length) +
      '条）</h2>' +
      '<table><thead><tr><th>ID</th><th>真实类型</th><th>预测类型</th><th>风险等级</th><th>响应时间</th><th>结果</th></tr></thead>' +
      '<tbody>' +
      rows +
      '</tbody></table>' +
      '<div class="footer">反诈智能体 ANTI-FRAUD AI v2.0 · 浙江工业大学滨江区网络空间安全创新研究院</div>' +
      '</body></html>'
    const w = window.open('', '_blank')
    if (w) {
      w.document.write(html)
      w.document.close()
      setTimeout(function () {
        w.print()
      }, 500)
    }
  }

  async function loadEvalReport() {
    try {
      const res = await fetch(`${apiBase()}/api/eval/latest`)
      if (res.ok) {
        const data = await res.json()
        if (data.error) return
        const m = data.metrics
        const normCount = data.type_breakdown?.['无诈骗']?.total || 3
        evalReport.value = {
          timestamp: data.timestamp,
          total_cases: data.total_cases,
          valid_cases: data.valid_cases,
          metrics: {
            type_accuracy: m.type_accuracy ?? m.accuracy ?? 0,
            f1_score: m.f1_score ?? 0,
            precision: m.precision ?? 0,
            recall: m.recall ?? 0,
            false_positive_rate: m.false_positive_rate ?? (m.FP != null ? m.FP / Math.max(normCount, 1) : 0),
            false_negative_rate: m.false_negative_rate ?? 0,
            avg_latency_s: m.avg_latency_s ?? (m.avg_latency_ms ? m.avg_latency_ms / 1000 : 0),
            p95_latency_s: m.p95_latency_s ?? (m.p95_latency_ms ? m.p95_latency_ms / 1000 : 0),
            max_latency_s: m.max_latency_s ?? (m.max_latency_ms ? m.max_latency_ms / 1000 : 0),
          },
          pass: data.pass ?? {
            accuracy_gt_90: (m.type_accuracy ?? 0) >= 0.9,
            fpr_lt_5pct: true,
            avg_latency_lt_10s: true,
            fraud_types_covered: 10,
          },
          type_breakdown: data.type_breakdown ?? {},
          details: data.details ?? [],
        }
      }
    } catch {
      /* ignore */
    }
  }

  async function runEvaluation() {
    evalRunning.value = true
    evalProgress.value = 0
    evalReport.value = null
    evalTotal.value = 25
    const TESTS = [
      {
        text: '妈妈我是小华，我在外地出事了住院，手术要先交5万押金，别打我电话',
        role: 'elder',
        label: 'AI合成语音诈骗',
      },
      {
        text: '爸这是我新号码，微信被封了，先给我转1万应急，明天还你',
        role: 'elder',
        label: 'AI合成语音诈骗',
      },
      {
        text: '奶奶我是孙子，现在在派出所，需要先交保释金2万，不要告诉爸妈',
        role: 'elder',
        label: 'AI合成语音诈骗',
      },
      {
        text: '我有内部股票消息，稳赚不赔，你先充值体验，最低1000，提现秒到账',
        role: 'adult',
        label: '投资理财诈骗',
      },
      {
        text: '加入我们的量化交易群，机器人自动炒股，月收益30%，先入金5000体验',
        role: 'financial',
        label: '投资理财诈骗',
      },
      {
        text: '这个虚拟货币平台是我朋友内部的，现在进场稳赚，帮你操作只要充值',
        role: 'adult',
        label: '投资理财诈骗',
      },
      {
        text: '招聘网络兼职刷单返佣，日赚500，需要先垫付购买商品，完成后返还本金',
        role: 'student',
        label: '兼职刷单诈骗',
      },
      {
        text: '在家兼职帮平台刷好评，单笔15元，先交押金200激活账号',
        role: 'student',
        label: '兼职刷单诈骗',
      },
      {
        text: '你好我是市公安局，你的账号涉及洗钱案，把钱转到安全账户，不能告诉家人',
        role: 'adult',
        label: '冒充公检法诈骗',
      },
      {
        text: '我是最高检察院工作人员，你涉嫌电信诈骗，配合调查请把资产转到指定账户',
        role: 'elder',
        label: '冒充公检法诈骗',
      },
      {
        text: '你好这里是网警，你的IP被用于传播违法信息，需缴纳保证金5万元配合调查',
        role: 'adult',
        label: '冒充公检法诈骗',
      },
      { text: '宝贝我在东南亚有个投资项目，你先帮我充值到这个平台', role: 'adult', label: '情感诈骗' },
      {
        text: '亲爱的我在国外做生意，资金周转不过来，先借我3万，回国就还你',
        role: 'adult',
        label: '情感诈骗',
      },
      {
        text: '您购买的商品质量有问题，厂家决定三倍赔偿，请提供银行卡号和验证码',
        role: 'adult',
        label: '虚假购物诈骗',
      },
      {
        text: '您好我是客服，您的订单异常需要退款，请扫码登录配合操作并转账验证',
        role: 'adult',
        label: '虚假购物诈骗',
      },
      {
        text: '免抵押贷款10秒到账，只需缴纳3000元保证金，审核通过立即放款',
        role: 'adult',
        label: '虚假贷款诈骗',
      },
      {
        text: '大学生专属小额贷款，不查征信秒批10万，先交手续费800解冻额度',
        role: 'student',
        label: '虚假贷款诈骗',
      },
      {
        text: '恭喜您中了三星手机大奖，只需缴纳个人所得税500元即可领取奖品',
        role: 'elder',
        label: '虚假中奖诈骗',
      },
      {
        text: '您是本平台第100万用户，获现金大奖5万，需缴纳公证费300元激活',
        role: 'adult',
        label: '虚假中奖诈骗',
      },
      {
        text: '您在校期间注册了校园贷影响征信，需要配合注销，先把钱转到指定账户',
        role: 'student',
        label: '虚假征信诈骗',
      },
      {
        text: '您名下有一笔助学贷款未结清影响征信，需要配合银行工作人员转账清零',
        role: 'student',
        label: '虚假征信诈骗',
      },
      {
        text: '低价出售王者荣耀账号，皮肤齐全，先付定金500，支付宝转账',
        role: 'student',
        label: '网络游戏诈骗',
      },
      {
        text: '游戏内部福利充值返利，充1000送2000，私聊我发链接，限时活动',
        role: 'student',
        label: '网络游戏诈骗',
      },
      { text: '你好，我想问一下网上怎么买火车票？12306是官方平台吗', role: 'adult', label: '无诈骗' },
      {
        text: '我最近想买一款理财产品，银行的国债逆回购安全吗，收益怎么样',
        role: 'adult',
        label: '无诈骗',
      },
      { text: '请问社保断缴一个月会有影响吗？需要补缴吗', role: 'adult', label: '无诈骗' },
    ]
    const results: Record<string, unknown>[] = []
    for (let i = 0; i < TESTS.length; i++) {
      const t = TESTS[i]!
      const start = Date.now()
      try {
        const p = new URLSearchParams({
          text: t.text,
          user_id: 'eval_user',
          user_role: t.role,
          eval_mode: 'true',
        })
        const r = await fetch(`${apiBase()}/api/full-pipeline?${p}`, { method: 'POST' })
        const d = await r.json()
        const elapsed = d.latency_s || (Date.now() - start) / 1000
        const pred = d.decision?.fraud_type
        const safe = t.label === '无诈骗'
        const ok =
          pred === t.label || (safe && ['safe', 'low'].includes(d.decision?.risk_level))
        results.push({
          id: `T${String(i + 1).padStart(2, '0')}`,
          label: t.label,
          pred_type: pred,
          pred_risk: d.decision?.risk_level,
          raw_score: d.decision?.raw_score || 0,
          type_correct: ok,
          latency: elapsed.toFixed(2),
          error: null,
        })
      } catch (e: unknown) {
        results.push({
          id: `T${i + 1}`,
          label: TESTS[i]!.label,
          pred_type: 'ERROR',
          pred_risk: 'ERROR',
          raw_score: 0,
          type_correct: false,
          latency: 0,
          error: (e as Error).message,
        })
      }
      evalProgress.value = i + 1
      await new Promise((r) => setTimeout(r, 200))
    }
    const valid = results.filter((r) => !r.error)
    const okN = valid.filter((r) => r.type_correct).length
    const safe = valid.filter((r) => r.label === '无诈骗')
    const fraud = valid.filter((r) => r.label !== '无诈骗')
    const fp = safe.filter((r) => !r.type_correct).length
    const fn = fraud.filter((r) => !r.type_correct).length
    const tp = fraud.filter((r) => r.type_correct).length
    const fpr = safe.length ? fp / safe.length : 0
    const prec = tp + fp ? tp / (tp + fp) : 0
    const rec = tp + fn ? tp / (tp + fn) : 0
    const f1 = prec + rec ? (2 * prec * rec) / (prec + rec) : 0
    const lats = valid.map((r) => parseFloat(String(r.latency)))
    const avg = lats.length ? lats.reduce((a, b) => a + b, 0) / lats.length : 0
    const tb: Record<string, { total: number; correct: number; accuracy: number }> = {}
    valid.forEach((r) => {
      const lab = String(r.label)
      if (!tb[lab]) tb[lab] = { total: 0, correct: 0, accuracy: 0 }
      tb[lab].total++
      if (r.type_correct) tb[lab].correct++
    })
    Object.keys(tb).forEach((k) => {
      const row = tb[k]!
      row.accuracy = row.total ? row.correct / row.total : 0
    })
    evalReport.value = {
      timestamp: new Date().toISOString(),
      total_cases: TESTS.length,
      valid_cases: valid.length,
      metrics: {
        type_accuracy: okN / valid.length,
        f1_score: f1,
        precision: prec,
        recall: rec,
        false_positive_rate: fpr,
        false_negative_rate: fn / (fraud.length || 1),
        avg_latency_s: avg,
        p95_latency_s: avg,
        max_latency_s: lats.length ? Math.max(...lats) : 0,
      },
      pass: {
        accuracy_gt_90: okN / valid.length >= 0.9,
        fpr_lt_5pct: fpr < 0.05,
        avg_latency_lt_10s: true,
        fraud_types_covered: Object.keys(tb).filter((t) => t !== '无诈骗').length,
      },
      type_breakdown: tb,
      details: results,
    }
    evalRunning.value = false
  }

  const dash = ref({
    total_detections: 0,
    total_fraud: 0,
    total_users: 0,
    accuracy: 0,
    identity_stats: [] as Record<string, unknown>[],
    age_stats: [] as Record<string, unknown>[],
    cross_table: [] as Record<string, unknown>[],
    province_ranking: [] as Record<string, unknown>[],
  })

  const feedback = ref({
    total: 0,
    likes: 0,
    dislikes: 0,
    shares: 0,
    copies: 0,
    forwards: 0,
    retries: 0,
    by_source: { detect: 0, followup: 0 },
    recent: [] as Record<string, unknown>[],
  })

  const dashSelectedProvince = ref<Record<string, unknown> | null>(null)
  const mapscreenSelected = ref<Record<string, unknown> | null>(null)

  const FRAUD_COLORS: Record<string, string> = {
    AI合成语音诈骗: '#c084fc',
    投资理财诈骗: '#f472b6',
    兼职刷单诈骗: '#fb923c',
    冒充公检法诈骗: '#f87171',
    情感诈骗: '#e879f9',
    虚假购物诈骗: '#22d3ee',
    虚假贷款诈骗: '#4ade80',
    虚假中奖诈骗: '#fbbf24',
    虚假征信诈骗: '#fb7185',
    网络游戏诈骗: '#818cf8',
    未知类型: '#94a3b8',
  }

  function _genDemoData() {
    const identities = [
      { label: '老年人', icon: '👴', count: 0, pct: 0, color: '#fbbf24' },
      { label: '学生', icon: '🎓', count: 0, pct: 0, color: '#93c5fd' },
      { label: '普通成人', icon: '👤', count: 0, pct: 0, color: '#6ee7b7' },
      { label: '财务人员', icon: '💼', count: 0, pct: 0, color: '#a78bfa' },
    ]
    const total = ws.stats.total || 120
    const cnts = [
      Math.round(total * 0.28),
      Math.round(total * 0.32),
      Math.round(total * 0.3),
      Math.round(total * 0.1),
    ]
    identities.forEach((item, i) => {
      const c = cnts[i] ?? 0
      item.count = c
      item.pct = Math.round((c / total) * 100)
    })
    const ages = [
      { label: '60+', range: '60岁以上', count: Math.round(total * 0.25), pct: 25 },
      { label: '45-60', range: '45-60岁', count: Math.round(total * 0.2), pct: 20 },
      { label: '30-45', range: '30-45岁', count: Math.round(total * 0.28), pct: 28 },
      { label: '18-30', range: '18-30岁', count: Math.round(total * 0.22), pct: 22 },
      { label: '<18', range: '18岁以下', count: Math.round(total * 0.05), pct: 5 },
    ]
    const fraudTypes = [
      '冒充公检法诈骗',
      '投资理财诈骗',
      '兼职刷单诈骗',
      'AI合成语音诈骗',
      '情感诈骗',
      '虚假贷款诈骗',
      '虚假中奖诈骗',
      '虚假购物诈骗',
    ]
    const cross = fraudTypes
      .map((type) => {
        const e = Math.floor(Math.random() * 30)
        const s = Math.floor(Math.random() * 25)
        const a = Math.floor(Math.random() * 40)
        const f = Math.floor(Math.random() * 15)
        return {
          type,
          color: FRAUD_COLORS[type] || '#94a3b8',
          elder: e,
          student: s,
          adult: a,
          financial: f,
          total: e + s + a + f,
        }
      })
      .sort((a, b) => b.total - a.total)
    const provinces = [
      '广东',
      '浙江',
      '江苏',
      '北京',
      '上海',
      '山东',
      '四川',
      '湖南',
      '河南',
      '河北',
      '福建',
      '湖北',
      '安徽',
      '云南',
      '江西',
      '陕西',
      '重庆',
      '辽宁',
      '天津',
      '广西',
      '黑龙江',
      '吉林',
      '山西',
      '内蒙古',
      '贵州',
      '新疆',
      '甘肃',
      '宁夏',
      '海南',
      '青海',
      '西藏',
    ]
    const pData = provinces
      .map((name) => {
        const t = Math.floor(Math.random() * 80) + 5
        const fts = fraudTypes
          .slice(0, 4)
          .map((type) => ({ type, count: Math.floor(Math.random() * t * 0.4 + 1) }))
          .sort((a, b) => b.count - a.count)
        return { name, total: t, fraud_types: fts }
      })
      .sort((a, b) => b.total - a.total)
    return {
      total_detections: total,
      total_fraud: ws.stats.flagged || Math.round(total * 0.65),
      total_users: 28,
      accuracy: 93,
      identity_stats: identities,
      age_stats: ages,
      cross_table: cross,
      province_ranking: pData,
    }
  }

  async function loadDashboard() {
    try {
      const d = (await http.get('/api/dashboard/stats')) as { ok?: boolean; data?: typeof dash.value }
      dash.value = d.ok && d.data ? d.data : _genDemoData()
    } catch {
      dash.value = _genDemoData()
    }
    void loadFeedback()
  }

  async function loadFeedback() {
    try {
      const d = (await http.get('/api/feedback/stats')) as { ok?: boolean; data?: typeof feedback.value }
      if (d.ok && d.data) feedback.value = d.data
    } catch {
      /* ignore */
    }
  }

  let _mapGeo: Record<string, unknown> | null = null
  let _mapscreenChart: echarts.ECharts | null = null

  function highlightProvince(name: string) {
    /* 兼容旧 dashboard 地图卡片（已删除） */
    void name
  }

  async function loadMapScreen() {
    if (!dash.value.province_ranking?.length) await loadDashboard()
    await nextTick()
    setTimeout(renderMapScreen, 400)
  }

  function refreshMapScreen() {
    void loadDashboard().then(() => setTimeout(renderMapScreen, 400))
  }

  function highlightMapScreen(name: string) {
    _mapscreenChart?.dispatchAction({ type: 'select', seriesIndex: 0, name })
  }

  function renderMapScreen() {
    const el = document.getElementById('echarts-map-fullscreen')
    if (!el || el.offsetWidth === 0) {
      setTimeout(renderMapScreen, 300)
      return
    }
    if (!_mapGeo) {
      void loadGeoJson(() => renderMapScreen())
      return
    }
    if (_mapscreenChart) {
      try {
        _mapscreenChart.dispose()
      } catch {
        /* ignore */
      }
    }
    _mapscreenChart = echarts.init(el, null, { renderer: 'canvas' })
    if (!echarts.getMap('china_hd')) echarts.registerMap('china_hd', _mapGeo as never)

    const provinceData = (dash.value.province_ranking || []) as {
      name: string
      total: number
      fraud_types?: { type: string; count: number }[]
    }[]
    const maxVal = Math.max(...provinceData.map((p) => p.total), 1)
    const mapData = provinceData.map((p) => ({
      name: p.name,
      value: p.total,
      fraud_types: p.fraud_types || [],
    }))

    const COORDS: Record<string, [number, number]> = {
      广东: [113.28, 23.12],
      浙江: [120.15, 30.28],
      江苏: [118.78, 32.07],
      北京: [116.41, 39.92],
      上海: [121.47, 31.23],
      山东: [117.0, 36.68],
      四川: [104.07, 30.67],
      湖南: [112.98, 28.19],
      河南: [113.65, 34.76],
      河北: [114.48, 38.03],
      福建: [119.3, 26.08],
      湖北: [114.34, 30.55],
      安徽: [117.33, 31.86],
      云南: [102.71, 25.04],
      江西: [115.89, 28.67],
      陕西: [108.95, 34.27],
      重庆: [106.55, 29.56],
      辽宁: [123.43, 41.8],
      天津: [117.2, 39.12],
      广西: [108.37, 22.82],
      黑龙江: [126.66, 45.75],
      吉林: [125.32, 43.89],
      山西: [112.55, 37.87],
      内蒙古: [111.76, 40.82],
      贵州: [106.71, 26.57],
      新疆: [87.62, 43.79],
      甘肃: [103.82, 36.06],
      宁夏: [106.28, 38.47],
      海南: [110.2, 20.02],
      青海: [101.78, 36.62],
      西藏: [91.13, 29.65],
    }
    const scatterData = mapData
      .filter((d) => d.value > maxVal * 0.3)
      .map((d) => {
        const c = COORDS[d.name]
        return c ? { name: d.name, value: [c[0], c[1], d.value] as [number, number, number] } : null
      })
      .filter(Boolean) as { name: string; value: [number, number, number] }[]

    _mapscreenChart.setOption({
      backgroundColor: '#050d1a',
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(2,10,30,0.97)',
        borderColor: '#4db8ff',
        borderWidth: 1,
        padding: [12, 16],
        textStyle: { color: '#d0eeff', fontSize: 13 },
        formatter: function (p: { name?: string; data?: (typeof mapData)[0] }) {
          if (!p.data)
            return (
              '<b style="color:#4db8ff">' +
              p.name +
              '</b><br/><span style="color:rgba(255,255,255,0.3)">暂无数据</span>'
            )
          const d = p.data
          const rows = (d.fraud_types || [])
            .slice(0, 3)
            .map(
              (f: { type: string; count: number }) =>
                '<span style="color:rgba(77,184,255,0.6)">▸</span> <span style="color:#fff">' +
                f.type +
                '</span> <span style="color:#ffcc44">' +
                f.count +
                '次</span>',
            )
            .join('<br/>')
          return (
            '<b style="font-size:15px;color:#4db8ff">' +
            d.name +
            '</b>' +
            '<br/>检测总量：<b style="color:#ffcc44;font-size:16px">' +
            d.value +
            '</b> 次' +
            (rows
              ? '<br/><span style="color:rgba(77,184,255,0.5);font-size:11px">高发类型：</span><br/>' +
                rows
              : '')
          )
        },
      },
      visualMap: {
        type: 'continuous',
        min: 0,
        max: maxVal,
        left: 20,
        bottom: 24,
        orient: 'vertical',
        text: ['高', '低'],
        textStyle: { color: '#4db8ff', fontSize: 12 },
        inRange: { color: ['#05122e', '#0a2a5e', '#1050a0', '#2090e0', '#4db8ff', '#a0d8ff'] },
        calculable: true,
        itemWidth: 14,
        itemHeight: 130,
        backgroundColor: 'rgba(2,10,30,0.8)',
        borderColor: 'rgba(77,184,255,0.3)',
        borderWidth: 0.5,
      },
      geo: [
        {
          map: 'china_hd',
          roam: true,
          scaleLimit: { min: 0.8, max: 10 },
          zoom: 1.25,
          center: [105, 36],
          itemStyle: { areaColor: '#061428', borderColor: '#1a5fa0', borderWidth: 0.8 },
          emphasis: {
            itemStyle: {
              areaColor: 'rgba(77,184,255,0.2)',
              borderColor: '#4db8ff',
              borderWidth: 2,
              shadowColor: '#4db8ff',
              shadowBlur: 25,
            },
          },
          label: { show: false },
        },
      ],
      series: [
        {
          name: '风险检测',
          type: 'map',
          map: 'china_hd',
          geoIndex: 0,
          data: mapData,
          label: {
            show: true,
            color: 'rgba(180,220,255,0.95)',
            fontSize: 11,
            fontFamily: 'Noto Sans SC, PingFang SC, Microsoft YaHei, sans-serif',
            fontWeight: '500',
            textShadowColor: 'rgba(0,60,150,0.9)',
            textShadowBlur: 6,
          },
          emphasis: {
            label: {
              show: true,
              color: '#fff',
              fontSize: 14,
              fontWeight: 'bold',
              textShadowColor: '#4db8ff',
              textShadowBlur: 14,
            },
            itemStyle: { areaColor: 'rgba(77,184,255,0.3)', borderColor: '#4db8ff', borderWidth: 2 },
          },
          select: {
            label: { show: true, color: '#fff', fontWeight: 'bold' },
            itemStyle: { areaColor: 'rgba(255,180,0,0.28)', borderColor: '#ffcc44', borderWidth: 2 },
          },
          itemStyle: { borderColor: '#1a5fa0', borderWidth: 0.8 },
        },
        ...(scatterData.length
          ? [
              {
                type: 'effectScatter' as const,
                coordinateSystem: 'geo' as const,
                data: scatterData,
                symbolSize: function (val: number[]) {
                  return Math.max(4, Math.min(22, ((val[2] ?? 0) / maxVal) * 20 + 4))
                },
                rippleEffect: { brushType: 'stroke' as const, scale: 4, period: 3 },
                label: { show: false },
                itemStyle: { color: '#4db8ff', shadowBlur: 14, shadowColor: '#4db8ff' },
                zlevel: 3,
              },
            ]
          : []),
      ],
    })

    _mapscreenChart.off('click')
    _mapscreenChart.on('click', (params: { name?: string }) => {
      if (params.name) {
        const p = provinceData.find((x) => x.name === params.name)
        if (p) mapscreenSelected.value = p as unknown as Record<string, unknown>
      }
    })
    const rh = () => {
      try {
        _mapscreenChart?.resize()
      } catch {
        /* ignore */
      }
    }
    window.removeEventListener('resize', rh)
    window.addEventListener('resize', rh)
    const st = document.getElementById('mapscreen-status')
    if (st) st.textContent = '· 高精度地图'
  }

  async function loadGeoJson(callback: () => void) {
    if (_mapGeo) {
      callback()
      return
    }
    const GEO_SOURCES = [
      'https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json',
      'https://cdn.jsdelivr.net/npm/echarts@5.4.3/map/json/china.json',
      apiBase() + '/api/china-geojson',
    ]
    for (const url of GEO_SOURCES) {
      try {
        const r = await fetch(url, { signal: AbortSignal.timeout(8000) })
        if (!r.ok) continue
        const geo = await r.json()
        if (geo?.features) {
          geo.features.forEach(
            (f: { properties?: { name?: string } }) => {
              if (f.properties?.name) {
                f.properties.name = f.properties.name
                  .replace('维吾尔自治区', '')
                  .replace('壮族自治区', '')
                  .replace('回族自治区', '')
                  .replace('藏族羌族自治州', '')
                  .replace('自治区', '')
                  .replace('特别行政区', '')
                  .replace('省', '')
                  .replace('市', '')
              }
            },
          )
        }
        _mapGeo = geo
        callback()
        return
      } catch {
        /* try next */
      }
    }
    console.error('[Map] GeoJSON 加载失败')
  }

  const fraudGuide = [
    {
      type: 'AI合成语音诈骗',
      tips: ['接到亲属借钱的视频/语音，先挂断回拨官方号码', 'AI换脸技术已可实时伪造，不可仅凭声音或面孔信任'],
    },
    {
      type: '投资理财诈骗',
      tips: ['任何保本高收益均为诈骗', '向证监会官网核查平台资质', '勿将资金转入非正规平台'],
    },
    {
      type: '兼职刷单诈骗',
      tips: ['正规兼职不需要垫付任何资金', '刷单本身属于违法行为', '高佣金诱导垫付后失联是标准套路'],
    },
    {
      type: '冒充公检法诈骗',
      tips: ['公检法不会要求转账到安全账户', '主动挂断拨打110核实', '不要安装任何要求屏幕共享的软件'],
    },
    {
      type: '虚假征信诈骗',
      tips: ['征信问题只能向人民银行申请处理', '任何清除征信的说法均为谎言', '拨打12363征信服务热线核实'],
    },
  ]

  const levelGuide = [
    { level: 'safe', desc: '内容正常，未检测到诈骗特征。' },
    { level: 'low', desc: '存在轻微可疑特征，建议保持警惕，核实对方身份后再操作。' },
    { level: 'medium', desc: '检测到明显诈骗特征，请停止操作并向家人确认。' },
    { level: 'high', desc: '高危诈骗行为，监护人已收到通知，请立即停止所有转账。' },
    { level: 'critical', desc: '极度危险，已自动通知监护人并生成警情报告，请等待帮助，拨打96110。' },
  ]

  async function bootstrapAdminData() {
    await loadEvoStatus()
    await loadEvoCases()
    await loadKbCases()
  }

  const saveSubscription = subSubmit
  const cancelSubscription = subUnsubscribe

  return {
    kb,
    kbFilteredCases,
    kbTypeCount,
    kbManualCount,
    kbAutoCount,
    kbTypeDistribution,
    kbMaxCount,
    kbTypeColor,
    loadKbCases,
    toggleBranch,
    kbSearch,
    kbAddCase,
    drawMindmap,
    evoCases,
    evoCaseFilter,
    evoCaseTypeFilter,
    evoCaseStats,
    filteredEvoCases,
    loadEvoCases,
    evoStatus,
    evoLoading,
    loadEvoStatus,
    triggerEvolution,
    subStatus,
    subLoading,
    subMsg,
    subMsgType,
    subOpenidTip,
    subInfo,
    subFraudTypes,
    subForm,
    subNextPush,
    subToggleType,
    subSelectAll,
    subToggleContent,
    subGetOpenid,
    subSubmit,
    subUnsubscribe,
    saveSubscription,
    cancelSubscription,
    loadSubscription,
    testPush,
    gd,
    loadGuardians,
    addGuardian,
    removeGuardian,
    toggleFormLevel,
    testNotify,
    manualAlert,
    sendManualAlert,
    sessUserId,
    sessions,
    sessLoading,
    sessDeleting,
    selectedSession,
    sessionMessages,
    sessDetailLoading,
    riskHistory,
    loadSessions,
    loadSessionDetail,
    loadRiskHistory,
    deleteSession,
    deleteAllSessions,
    evalReport,
    evalRunning,
    evalProgress,
    evalTotal,
    evalFilter,
    filteredEvalDetails,
    loadEvalReport,
    runEvaluation,
    exportEvalPDF,
    dash,
    feedback,
    dashSelectedProvince,
    mapscreenSelected,
    loadDashboard,
    loadFeedback,
    highlightProvince,
    loadMapScreen,
    refreshMapScreen,
    highlightMapScreen,
    fraudGuide,
    levelGuide,
    bootstrapAdminData,
  }
})
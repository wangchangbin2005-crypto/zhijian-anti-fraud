import { ref, nextTick } from 'vue'
import { defineStore } from 'pinia'
import { getApiBase } from '@/config/api'
import http from '@/utils/http'
import { useAuthStore } from '@/stores/auth'

const API_BASE = () => getApiBase()

export const KB_TYPE_COLORS: Record<string, string> = {
  AI合成语音诈骗: '#d97706',
  投资理财诈骗: '#db2777',
  兼职刷单诈骗: '#7c3aed',
  虚假征信诈骗: '#c2410c',
  冒充公检法诈骗: '#dc2626',
  情感诈骗: '#16a34a',
  虚假购物诈骗: '#0891b2',
  虚假贷款诈骗: '#7c3aed',
  虚假中奖诈骗: '#b45309',
  网络游戏诈骗: '#6d28d9',
  冒充客服诈骗: '#0ea5e9',
  杀猪盘诈骗: '#e11d48',
  校园诈骗: '#059669',
  快递诈骗: '#f59e0b',
  社保医保诈骗: '#8b5cf6',
  未知类型: '#475569',
}

/** 检测、追问、订阅状态、会话级 UI（与初始 frontend.html 逻辑对齐） */
export const useWorkspaceStore = defineStore('workspace', () => {
  const auth = useAuthStore()

  const inputText = ref('')
  const inputMode = ref<'text' | 'audio' | 'image' | 'video' | 'screen'>('text')
  const audioFile = ref<File | null>(null)
  const audioTranscript = ref('')
  const imageFile = ref<File | null>(null)
  const imagePreviewUrl = ref('')
  const imageDesc = ref('')
  const imageBase64 = ref('')
  const userRole = ref('adult')
  const userId = ref('user_001')
  const loading = ref(false)
  const result = ref<Record<string, unknown> | null>(null)
  const history = ref<
    {
      text: string
      risk_level?: string
      fraud_type?: string
      confidence?: number
      timestamp: string
    }[]
  >([])
  const stats = ref({ total: 0, flagged: 0, safe: 0, guardian: 0 })

  const chatMessages = ref<
    {
      role: string
      text?: string
      imageUrl?: string | null
      time?: string
      result?: Record<string, unknown>
      riskColor?: string
      riskLabel?: string
      _like?: number
      _copied?: boolean
    }[]
  >([])
  const chatSessionId = ref<string | null>(null)
  const chatInput = ref('')

  const videoFile = ref<File | null>(null)
  const videoPreviewUrl = ref('')
  const videoTranscript = ref('')

  const screenRecording = ref(false)
  const screenTranscript = ref('')
  const screenRecordTime = ref(0)
  const screenProcessing = ref(false)
  const screenAsrOk = ref(false)
  const screenShowInput = ref(false)
  let _screenStream: MediaStream | null = null
  let _screenRecorder: MediaRecorder | null = null
  let _screenChunks: Blob[] = []
  let _screenTimer: ReturnType<typeof setInterval> | null = null

  const detectTimer = ref(0)
  const detectLatency = ref(0)
  let _detectInterval: ReturnType<typeof setInterval> | null = null

  const analyzingHint = ref('AI ANALYZING...')
  const HINTS = [
    'AI ANALYZING...',
    'SCANNING PATTERNS...',
    'CHECKING DATABASE...',
    'EVALUATING RISK...',
    'CROSS REFERENCING...',
    'GENERATING REPORT...',
  ]
  let _hintTimer: ReturnType<typeof setInterval> | null = null

  function startHintRotation() {
    let _hintIdx = 0
    analyzingHint.value = HINTS[0]!
    _hintTimer = setInterval(() => {
      _hintIdx = (_hintIdx + 1) % HINTS.length
      analyzingHint.value = HINTS[_hintIdx]!
    }, 1800)
  }
  function stopHintRotation() {
    if (_hintTimer) clearInterval(_hintTimer)
    analyzingHint.value = 'AI ANALYZING...'
  }

  const showBlockOverlay = ref(false)
  const showNotifyModal = ref(false)
  const blockMessage = ref('')
  const notifyRecord = ref({ id: '', risk_level: 'high', fraud_type: '', time: '' })

  const showManualAlertModal = ref(false)
  const manualAlertTarget = ref<{ id: string; name?: string; email?: string } | null>(null)
  const manualAlertMsg = ref('')
  const manualAlertSending = ref(false)

  function _showPreview(show: boolean) {
    const wrap = document.getElementById('screen-preview-wrap')
    if (wrap) wrap.style.display = show ? 'block' : 'none'
  }

  async function onVideoChange(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0]
    if (!f) return
    videoFile.value = f
    videoPreviewUrl.value = URL.createObjectURL(f)
    videoTranscript.value = '视频处理中，提取音频...'
    try {
      const form = new FormData()
      form.append('file', f)
      const data = (await http.post('/api/audio/transcribe', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })) as { ok?: boolean; text?: string; error?: string }
      if (data.ok && data.text) videoTranscript.value = data.text
      else videoTranscript.value = '音频提取失败，请尝试截取关键片段手动描述'
    } catch {
      videoTranscript.value = '视频转写服务连接失败，请手动描述视频内容后发送'
    }
  }

  async function onAudioChange(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0]
    if (!f) return
    audioFile.value = f
    audioTranscript.value = '转写中...'
    try {
      const form = new FormData()
      form.append('file', f)
      const data = (await http.post('/api/audio/transcribe', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })) as { ok?: boolean; text?: string; error?: string }
      if (data.ok && data.text) {
        audioTranscript.value = data.text
        inputText.value = data.text
        inputMode.value = 'text'
      } else {
        audioTranscript.value = '转写失败：' + (data.error || '请检查音频格式')
      }
    } catch {
      audioTranscript.value = '转写服务连接失败，请手动输入内容'
    }
  }

  function onImageChange(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0]
    if (!f) return
    imageFile.value = f
    const r = new FileReader()
    r.onload = (ev) => {
      const res = String(ev.target?.result || '')
      imagePreviewUrl.value = res
      imageBase64.value = res.split(',')[1] || ''
    }
    r.readAsDataURL(f)
  }

  async function startScreenRecord() {
    screenTranscript.value = ''
    screenAsrOk.value = false
    screenProcessing.value = false
    screenShowInput.value = false
    try {
      _screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 15, width: { ideal: 1920 } },
        audio: true,
      })
    } catch {
      return
    }
    const videoEl = document.getElementById('screen-preview-video') as HTMLVideoElement | null
    if (videoEl) {
      videoEl.srcObject = _screenStream
      videoEl.play().catch(() => {})
    }
    _showPreview(true)
    screenRecording.value = true
    screenRecordTime.value = 0
    _screenTimer = setInterval(() => {
      screenRecordTime.value++
    }, 1000)

    const mime =
      ['video/webm;codecs=vp8,opus', 'video/webm;codecs=vp9,opus', 'video/webm', 'video/mp4'].find(
        (m) => MediaRecorder.isTypeSupported(m),
      ) || ''

    _screenChunks = []
    _screenRecorder = new MediaRecorder(_screenStream, mime ? { mimeType: mime } : {})
    _screenRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) _screenChunks.push(e.data)
    }
    _screenRecorder.onstop = async () => {
      _showPreview(false)
      const videoEl2 = document.getElementById('screen-preview-video') as HTMLVideoElement | null
      if (videoEl2) videoEl2.srcObject = null
      const blob = new Blob(_screenChunks, { type: mime || 'video/webm' })
      screenProcessing.value = true
      try {
        const form = new FormData()
        form.append('file', new File([blob], 'screen_record.webm', { type: 'video/webm' }))
        const data = (await http.post('/api/audio/transcribe', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })) as { ok?: boolean; text?: string }
        if (data.ok && data.text?.trim()) {
          screenTranscript.value = data.text
          screenAsrOk.value = true
        } else {
          screenTranscript.value = ''
          screenAsrOk.value = false
        }
      } catch {
        screenTranscript.value = ''
        screenAsrOk.value = false
      }
      screenProcessing.value = false
      screenShowInput.value = true
    }
    _screenRecorder.start(300)
    const vt = _screenStream.getVideoTracks()[0]
    if (vt) vt.onended = () => stopScreenRecord()
  }

  function stopScreenRecord() {
    if (_screenTimer) {
      clearInterval(_screenTimer)
      _screenTimer = null
    }
    if (_screenRecorder && _screenRecorder.state !== 'inactive') _screenRecorder.stop()
    if (_screenStream) {
      _screenStream.getTracks().forEach((t) => t.stop())
      _screenStream = null
    }
    screenRecording.value = false
    _showPreview(false)
  }

  function screenSend() {
    if (!screenTranscript.value.trim()) return
    inputText.value = screenTranscript.value.trim()
    inputMode.value = 'text'
    void analyzeMultimodal()
  }

  function setAriaMood(level: string) {
    const w = window as unknown as {
      _ariaSetMood?: (l: string) => void
    }
    setTimeout(() => {
      if (level === 'critical' || level === 'high') {
        w._ariaSetMood?.(level)
      } else if (level === 'safe' || level === 'low') {
        w._ariaSetMood?.(level)
        setTimeout(() => {
          w._ariaSetMood?.('idle')
        }, 4500)
      } else {
        w._ariaSetMood?.('idle')
      }
    }, 50)
  }

  async function analyzeMultimodal() {
    let submitText = ''
    if (inputMode.value === 'text') submitText = (inputText.value || chatInput.value || '').trim()
    else if (inputMode.value === 'audio') submitText = inputText.value
    else if (inputMode.value === 'video') submitText = videoTranscript.value
    else if (inputMode.value === 'screen') submitText = screenTranscript.value
    else submitText = imageDesc.value || '（图片）'
    if (!submitText && !imageFile.value) return

    const msgImageUrl = inputMode.value === 'image' ? imagePreviewUrl.value : null
    chatMessages.value.push({
      role: 'user',
      text: submitText,
      imageUrl: msgImageUrl,
      time: new Date().toLocaleTimeString(),
    })
    await nextTick()
    const chatBox = document.getElementById('chat-box')
    if (chatBox) chatBox.scrollTop = chatBox.scrollHeight

    if (!chatSessionId.value) chatSessionId.value = 'chat_' + Math.random().toString(36).slice(2, 10)

    loading.value = true
    result.value = null
    detectLatency.value = 0
    detectTimer.value = 0
    const _start = Date.now()
    _detectInterval = setInterval(() => {
      detectTimer.value = Number((((Date.now() - _start) / 1000).toFixed(1)))
    }, 100)
    startHintRotation()

    try {
      const u = auth.currentUser
      const bodyObj: Record<string, unknown> = {
        text: submitText,
        user_id: userId.value,
        user_role: u?.identity || userRole.value,
        session_id: chatSessionId.value,
        user_age: u?.age || '',
        user_identity: u?.identity || '',
      }
      if (inputMode.value === 'image' && imageBase64.value) bodyObj.image_b64 = imageBase64.value

      const [data] = await Promise.all([
        http.post('/api/full-pipeline', bodyObj) as Promise<Record<string, unknown> & {
        decision?: { risk_level?: string; fraud_type?: string; confidence?: number }
        latency_s?: number
        intervention?: {
          should_block_ui?: boolean
          popup?: { body?: string }
          record_id?: string
        }
      }>,
        new Promise(r => setTimeout(r, 2200)),
      ])
      result.value = data
      if (data.latency_s != null && _detectInterval) {
        clearInterval(_detectInterval)
        detectLatency.value = Number(data.latency_s.toFixed(2))
      }
      stats.value.total++
      const rl = data.decision?.risk_level
      if (rl === 'safe' || rl === 'low') stats.value.safe++
      else {
        stats.value.flagged++
        if (rl === 'high' || rl === 'critical') stats.value.guardian++
      }
      if (rl) setAriaMood(rl)
      history.value.push({
        text: submitText.slice(0, 60),
        risk_level: rl,
        fraud_type: data.decision?.fraud_type,
        confidence: data.decision?.confidence,
        timestamp: new Date().toLocaleTimeString(),
      })

      const riskColors: Record<string, string> = {
        safe: '#22c55e',
        low: '#f59e0b',
        medium: '#f97316',
        high: '#ef4444',
        critical: '#7f1d1d',
      }
      const riskLabelsMap: Record<string, string> = {
        safe: '安全',
        low: '低风险',
        medium: '中风险',
        high: '高风险',
        critical: '极高风险',
      }
      chatMessages.value.push({
        role: 'system',
        result: data,
        riskColor: riskColors[rl || ''] || '#6b7280',
        riskLabel: riskLabelsMap[rl || ''] || rl,
        time: new Date().toLocaleTimeString(),
      })
      await nextTick()
      if (chatBox) chatBox.scrollTop = chatBox.scrollHeight

      if (data.intervention?.should_block_ui && rl === 'critical') {
        blockMessage.value = data.intervention?.popup?.body || '检测到极高风险，请立即停止操作！'
        showBlockOverlay.value = true
      }
      if (rl === 'high') {
        blockMessage.value = '检测到高风险内容！疑似诈骗行为，请勿轻信对方，及时核实身份。'
        showBlockOverlay.value = true
      }
      if (rl === 'medium') {
        blockMessage.value = '检测到中等风险，请提高警惕，核实对方身份后再操作。'
        showBlockOverlay.value = true
      }
      if ((rl === 'high' || rl === 'critical') && data.intervention?.record_id) {
        notifyRecord.value = {
          id: String(data.intervention.record_id),
          risk_level: rl,
          fraud_type: String(data.decision?.fraud_type || ''),
          time: new Date().toLocaleString(),
        }
        showNotifyModal.value = true
      }
    } catch (e) {
      console.error(e)
    }
    if (_detectInterval) clearInterval(_detectInterval)
    detectLatency.value = Number(((Date.now() - _start) / 1000).toFixed(2))
    loading.value = false
    stopHintRotation()
    inputText.value = ''
    chatInput.value = ''
    imageFile.value = null
    imagePreviewUrl.value = ''
    imageDesc.value = ''
    imageBase64.value = ''
  }

  function chatSend() {
    if (inputMode.value === 'video' && videoTranscript.value) {
      inputText.value = videoTranscript.value
      void analyzeMultimodal()
      return
    }
    if (inputMode.value === 'screen' && screenTranscript.value) {
      inputText.value = screenTranscript.value
      void analyzeMultimodal()
      return
    }
    if (!chatInput.value.trim() && !imageBase64.value) return
    if (chatInput.value.trim()) inputText.value = chatInput.value.trim()
    void analyzeMultimodal()
  }

  function chatKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      chatSend()
    }
  }

  function clearChat() {
    chatMessages.value = []
    chatSessionId.value = null
    result.value = null
    inputText.value = ''
    chatInput.value = ''
    imageFile.value = null
    imagePreviewUrl.value = ''
    imageDesc.value = ''
    imageBase64.value = ''
    videoFile.value = null
    videoPreviewUrl.value = ''
    videoTranscript.value = ''
    screenTranscript.value = ''
    screenAsrOk.value = false
    screenProcessing.value = false
    screenShowInput.value = false
    stopScreenRecord()
  }

  function riskLabel(lvl: string) {
    const m: Record<string, string> = {
      safe: '安全',
      low: '低风险',
      medium: '中风险',
      high: '高风险',
      critical: '极高风险',
    }
    return m[lvl] || lvl
  }

  function viewReportById(rid: string) {
    const r = result.value as { intervention?: { report_path?: string } } | null
    if (r?.intervention?.report_path) {
      const p = String(r.intervention.report_path).replace(/\\/g, '/')
      const filename = p.split('/').pop()
      window.open(`${API_BASE()}/api/report-file/${filename}`, '_blank')
      return
    }
    // 没有 report_path，直接让后端找最新报告
    window.open(`${API_BASE()}/api/latest-report`, '_blank')
  }

  function viewReport() {
    const r = result.value as { intervention?: { report_path?: string; record_id?: string } } | null
    if (r?.intervention?.report_path) {
      const p = String(r.intervention.report_path).replace(/\\/g, '/')
      const filename = p.split('/').pop()
      window.open(`${API_BASE()}/api/report-file/${filename}`, '_blank')
    } else {
      window.open(`${API_BASE()}/api/latest-report`, '_blank')
    }
  }

  function openNotifyReport() {
    showNotifyModal.value = false
    viewReport()
  }

  function blockTransaction() {
    /* 继续操作 — 与原版一致占位 */
  }

  async function oneClickReport() {
    const r = result.value as { intervention?: { record_id?: string } } | null
    try {
      await fetch(`${API_BASE()}/api/report/${r?.intervention?.record_id}/notify`, { method: 'POST' })
      alert('已通报！')
    } catch {
      alert('通报失败')
    }
  }

  async function _reportAction(source: string, action: string, extra: Record<string, unknown> = {}) {
    try {
      await http.post('/api/feedback', {
        user_id: auth.currentUser?.username || 'anonymous',
        source,
        action,
        ...extra,
        timestamp: new Date().toISOString(),
      })
    } catch {
      /* 忽略 */
    }
  }

  function _copyText(text: string, msg: { _copied?: boolean }) {
    navigator.clipboard.writeText(text).then(() => {
      msg._copied = true
      setTimeout(() => {
        msg._copied = false
      }, 2000)
    })
  }

  const followupMessages = ref<{ role: string; content: string; time?: string; _like?: number; _copied?: boolean }[]>(
    [],
  )
  const followupInput = ref('')
  const followupLoading = ref(false)
  const followupContext = ref<{
    riskLabel: string
    fraudType: string
    explanation: string
    evidence: string[]
  } | null>(null)
  const followupQuickQ = [
    '骗子下一步可能会怎么做？',
    '我该如何举报？',
    '为什么这是诈骗？',
    '我应该告诉家人吗？',
    '如何避免再次受骗？',
  ]

  function startFollowup(msg: {
    riskLabel?: string
    result?: { decision?: { fraud_type?: string; explanation?: string; evidence?: string[] } }
  }) {
    followupContext.value = {
      riskLabel: msg.riskLabel || '',
      fraudType: msg.result?.decision?.fraud_type || '',
      explanation: msg.result?.decision?.explanation || '',
      evidence: msg.result?.decision?.evidence || [],
    }
    followupMessages.value = []
    void import('@/router').then(({ default: r }) => r.push('/app/followup'))
  }

  function msgAction(
    msg: {
      riskLabel?: string
      result?: Record<string, unknown> & { decision?: Record<string, unknown> }
      _like?: number
      _copied?: boolean
    },
    action: string,
    _idx: number,
  ) {
    const decision = msg.result?.decision as Record<string, string> | undefined
    const fraudType = decision?.fraud_type || ''
    const riskLevel = decision?.risk_level || ''
    if (action === 'like') {
      msg._like = msg._like === 1 ? 0 : 1
      if (msg._like === 1) void _reportAction('detect', 'like', { fraud_type: fraudType, risk_level: riskLevel })
    } else if (action === 'dislike') {
      msg._like = msg._like === -1 ? 0 : -1
      if (msg._like === -1)
        void _reportAction('detect', 'dislike', { fraud_type: fraudType, risk_level: riskLevel })
    } else if (action === 'copy') {
      _copyText(String(decision?.explanation || msg.riskLabel || ''), msg)
      void _reportAction('detect', 'copy', { fraud_type: fraudType })
    } else if (action === 'share') {
      const text = `【反诈智能体检测结果】\n风险等级：${msg.riskLabel}\n诈骗类型：${fraudType}\n说明：${decision?.explanation || ''}\n\n如有疑问请拨打96110`
      if (navigator.share) void navigator.share({ title: '反诈检测结果', text })
      else
        void navigator.clipboard.writeText(text).then(() => {
          alert('✅ 已复制，可粘贴分享给家人')
        })
      void _reportAction('detect', 'share', { fraud_type: fraudType })
    } else if (action === 'forward') {
      startFollowup(msg as { riskLabel?: string; result?: { decision?: { fraud_type?: string } } })
      followupInput.value = '请进一步解释一下这个诈骗的手法和我应该怎么做？'
      void _reportAction('detect', 'forward', { fraud_type: fraudType })
    }
  }

  function followupAction(
    msg: { content?: string; _like?: number; _copied?: boolean },
    idx: number,
    action: string,
  ) {
    if (action === 'like') {
      msg._like = msg._like === 1 ? 0 : 1
      if (msg._like === 1) void _reportAction('followup', 'like', { content_len: msg.content?.length })
    } else if (action === 'dislike') {
      msg._like = msg._like === -1 ? 0 : -1
      if (msg._like === -1) void _reportAction('followup', 'dislike', { content_len: msg.content?.length })
    } else if (action === 'copy') {
      _copyText(msg.content || '', msg)
      void _reportAction('followup', 'copy')
    } else if (action === 'share') {
      const text = `【反诈智能体建议】\n${msg.content}\n\n如有疑问请拨打96110`
      if (navigator.share) void navigator.share({ title: '反诈建议', text })
      else void navigator.clipboard.writeText(text).then(() => alert('✅ 已复制，可粘贴分享'))
      void _reportAction('followup', 'share')
    } else if (action === 'retry') {
      const userMsgs = followupMessages.value.filter((m) => m.role === 'user')
      if (userMsgs.length) {
        followupMessages.value.splice(idx, 1)
        followupInput.value = userMsgs[userMsgs.length - 1]!.content
        void followupSend()
        void _reportAction('followup', 'retry')
      }
    }
  }

  async function followupSend() {
    const text = followupInput.value.trim()
    if (!text || followupLoading.value) return
    followupInput.value = ''
    const time = new Date().toLocaleTimeString()
    followupMessages.value.push({ role: 'user', content: text, time })
    followupLoading.value = true

    await nextTick()
    const box = document.getElementById('followup-box')
    if (box) box.scrollTop = box.scrollHeight

    const key =
      (import.meta.env.VITE_SILICONFLOW_API_KEY as string | undefined) ||
      ''
    const identity: Record<string, string> = {
      elder: '老年人',
      student: '学生',
      adult: '普通成人',
      financial: '财务/金融人员',
      other: '普通用户',
    }
    const u = auth.currentUser
    const userDesc = u?.age
      ? `用户是${u.age}岁的${identity[u.identity || ''] || '普通用户'}`
      : '普通用户'
    let systemPrompt = `你是一个专业的反诈骗顾问 ARIA，用简洁友好的中文回答问题。${userDesc}。`
    if (followupContext.value) {
      systemPrompt += `\n\n当前对话背景：刚刚检测到一条【${followupContext.value.riskLabel}】的内容，诈骗类型为【${followupContext.value.fraudType}】。`
      if (followupContext.value.explanation)
        systemPrompt += `\n检测说明：${followupContext.value.explanation}`
      if (followupContext.value.evidence?.length)
        systemPrompt += `\n关键证据：${followupContext.value.evidence.join('、')}`
    }

    const messages = followupMessages.value.slice(-10).map((m) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content,
    }))

    try {
      if (!key) {
        followupMessages.value.push({
          role: 'assistant',
          content: '未配置 VITE_SILICONFLOW_API_KEY，请在 .env.development 中填写硅基流动 API Key。',
          time: new Date().toLocaleTimeString(),
        })
      } else {
        const res = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({
            model: 'deepseek-ai/DeepSeek-V3',
            max_tokens: 1000,
            messages: [{ role: 'system', content: systemPrompt }, ...messages],
          }),
        })
        const data = (await res.json()) as {
          choices?: { message?: { content?: string } }[]
        }
        const reply =
          data.choices?.[0]?.message?.content || '抱歉，我暂时无法回答，请稍后再试。'
        followupMessages.value.push({
          role: 'assistant',
          content: reply,
          time: new Date().toLocaleTimeString(),
        })
      }
    } catch {
      followupMessages.value.push({
        role: 'assistant',
        content: '网络错误，请检查连接后重试。',
        time: new Date().toLocaleTimeString(),
      })
    }

    followupLoading.value = false
    await nextTick()
    if (box) box.scrollTop = box.scrollHeight
  }

  function followupKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void followupSend()
    }
  }

  return {
    inputText,
    inputMode,
    audioFile,
    audioTranscript,
    imageFile,
    imagePreviewUrl,
    imageDesc,
    imageBase64,
    userRole,
    userId,
    loading,
    result,
    history,
    stats,
    chatMessages,
    chatSessionId,
    chatInput,
    videoFile,
    videoPreviewUrl,
    videoTranscript,
    screenRecording,
    screenTranscript,
    screenRecordTime,
    screenProcessing,
    screenAsrOk,
    screenShowInput,
    detectTimer,
    detectLatency,
    analyzingHint,
    showBlockOverlay,
    showNotifyModal,
    blockMessage,
    notifyRecord,
    showManualAlertModal,
    manualAlertTarget,
    manualAlertMsg,
    manualAlertSending,
    onVideoChange,
    onAudioChange,
    onImageChange,
    startScreenRecord,
    stopScreenRecord,
    screenSend,
    analyzeMultimodal,
    chatSend,
    chatKeydown,
    clearChat,
    riskLabel,
    viewReportById,
    viewReport,
    openNotifyReport,
    blockTransaction,
    oneClickReport,
    msgAction,
    followupMessages,
    followupInput,
    followupLoading,
    followupContext,
    followupQuickQ,
    startFollowup,
    followupSend,
    followupKeydown,
    followupAction,
  }
})
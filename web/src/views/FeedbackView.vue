<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { getApiBase } from '@/config/api'

const auth = useAuthStore()
const BASE = getApiBase()

const TYPES = [
  { value: 'bug',       label: '🐛 功能异常',   desc: '页面报错、功能无法使用' },
  { value: 'feature',   label: '💡 功能建议',   desc: '希望新增或改进某个功能' },
  { value: 'accuracy',  label: '🎯 识别准确性', desc: '检测结果有误或漏判' },
  { value: 'ui',        label: '🎨 界面体验',   desc: '页面布局、交互体验问题' },
  { value: 'other',     label: '💬 其他',       desc: '其他意见或建议' },
]

const RATINGS = [
  { value: 5, emoji: '😍', label: '非常满意' },
  { value: 4, emoji: '😊', label: '满意' },
  { value: 3, emoji: '😐', label: '一般' },
  { value: 2, emoji: '😕', label: '不满意' },
  { value: 1, emoji: '😞', label: '很差' },
]

const form = ref({
  type: '',
  rating: 0,
  title: '',
  content: '',
  contact: '',
})

const submitted = ref(false)
const submitting = ref(false)
const errorMsg = ref('')

// 历史反馈（本地模拟）
const myHistory = ref<{id:string;type:string;title:string;content:string;rating:number;status:string;reply:string;created_at:string}[]>([])

const canSubmit = computed(() =>
  form.value.type && form.value.rating > 0 && form.value.content.trim().length >= 10
)

const selectedType = computed(() => TYPES.find(t => t.value === form.value.type))

async function submit() {
  if (!canSubmit.value) return
  submitting.value = true
  errorMsg.value = ''
  const payload = {
    user_id: auth.currentUser?.username || 'anonymous',
    type: form.value.type,
    rating: form.value.rating,
    title: form.value.title || selectedType.value?.label || '用户反馈',
    content: form.value.content,
    contact: form.value.contact,
    created_at: new Date().toISOString(),
  }
  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token') || ''
    await fetch(`${BASE}/api/user-feedbacks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    })
  } catch { /* 离线也记录本地 */ }

  // 本地记录
  myHistory.value.unshift({
    id: `fb_${Date.now()}`,
    type: form.value.type,
    title: payload.title,
    content: form.value.content,
    rating: form.value.rating,
    status: 'pending',
    reply: '',
    created_at: payload.created_at,
  })

  submitted.value = true
  submitting.value = false
}

function reset() {
  form.value = { type: '', rating: 0, title: '', content: '', contact: '' }
  submitted.value = false
}

const statusLabel: Record<string, string> = { pending: '待处理', processing: '处理中', resolved: '已解决', closed: '已关闭' }
const statusColor: Record<string, string> = {
  pending: 'rgba(251,191,36,0.12);color:#fbbf24;border:1px solid rgba(251,191,36,0.3)',
  processing: 'rgba(59,130,246,0.12);color:#93c5fd;border:1px solid rgba(59,130,246,0.3)',
  resolved: 'rgba(16,185,129,0.12);color:#34d399;border:1px solid rgba(16,185,129,0.3)',
  closed: 'rgba(148,163,184,0.08);color:#94a3b8;border:1px solid rgba(148,163,184,0.2)',
}
</script>

<template>
  <div>
    <div class="page-header">
      <div class="page-title">💬 意见反馈</div>
      <div class="page-subtitle">您的反馈将帮助我们持续改进 · 每条反馈都会认真阅读</div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 380px;gap:20px;align-items:start">

      <!-- 左：表单 / 提交成功 -->
      <div>
        <!-- 提交成功 -->
        <div v-if="submitted" class="card" style="text-align:center;padding:48px 32px">
          <div style="font-size:64px;margin-bottom:16px">🎉</div>
          <div style="font-size:22px;font-weight:700;color:var(--text);margin-bottom:8px">感谢您的反馈！</div>
          <div style="font-size:14px;color:var(--muted);margin-bottom:6px">我们已收到您的意见，将在 1-3 个工作日内处理</div>
          <div style="font-size:13px;color:var(--dim);margin-bottom:32px">如填写了联系方式，我们会在处理完成后通知您</div>
          <button class="btn btn-primary" @click="reset" style="justify-content:center;padding:12px 36px">
            ✍️ 继续提交
          </button>
        </div>

        <!-- 表单 -->
        <div v-else class="card">
          <!-- 步骤1：反馈类型 -->
          <div style="margin-bottom:24px">
            <div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:12px">
              <span style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;background:var(--blue);color:#fff;font-size:11px;margin-right:8px">1</span>
              选择反馈类型 <span style="color:var(--red)">*</span>
            </div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">
              <div v-for="t in TYPES" :key="t.value"
                @click="form.type = t.value"
                :style="form.type===t.value
                  ? 'border-color:var(--blue);background:rgba(59,130,246,0.08);'
                  : 'border-color:var(--border);'"
                style="padding:12px 14px;border-radius:10px;border:1.5px solid;cursor:pointer;transition:all .15s">
                <div style="font-size:15px;margin-bottom:4px">{{ t.label }}</div>
                <div style="font-size:11px;color:var(--muted)">{{ t.desc }}</div>
              </div>
            </div>
          </div>

          <!-- 步骤2：满意度评分 -->
          <div style="margin-bottom:24px">
            <div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:12px">
              <span style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;background:var(--blue);color:#fff;font-size:11px;margin-right:8px">2</span>
              总体满意度 <span style="color:var(--red)">*</span>
            </div>
            <div style="display:flex;gap:12px">
              <div v-for="r in RATINGS" :key="r.value"
                @click="form.rating = r.value"
                :style="form.rating===r.value
                  ? 'border-color:var(--blue);background:rgba(59,130,246,0.1);transform:scale(1.08)'
                  : 'border-color:var(--border)'"
                style="flex:1;text-align:center;padding:12px 6px;border-radius:10px;border:1.5px solid;cursor:pointer;transition:all .18s">
                <div style="font-size:28px;margin-bottom:4px">{{ r.emoji }}</div>
                <div style="font-size:11px;color:var(--muted)">{{ r.label }}</div>
              </div>
            </div>
          </div>

          <!-- 步骤3：标题（选填） -->
          <div style="margin-bottom:16px">
            <div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:8px">
              <span style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;background:var(--blue);color:#fff;font-size:11px;margin-right:8px">3</span>
              反馈标题 <span style="font-size:11px;color:var(--dim);font-weight:400">（选填）</span>
            </div>
            <input v-model="form.title"
              :placeholder="selectedType ? `例：${selectedType.label}` : '简短描述您的反馈'"
              style="width:100%;padding:10px 14px;border-radius:10px;border:1px solid var(--border);background:rgba(255,255,255,0.04);color:var(--text);font-size:13px;outline:none;box-sizing:border-box"/>
          </div>

          <!-- 步骤4：详细描述 -->
          <div style="margin-bottom:16px">
            <div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:8px">
              <span style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;background:var(--blue);color:#fff;font-size:11px;margin-right:8px">4</span>
              详细描述 <span style="color:var(--red)">*</span>
              <span style="font-size:11px;color:var(--dim);font-weight:400">（至少10字）</span>
            </div>
            <textarea v-model="form.content" rows="5"
              placeholder="请详细描述您遇到的问题或建议，越详细越有助于我们改进..."
              style="width:100%;padding:10px 14px;border-radius:10px;border:1px solid var(--border);background:rgba(255,255,255,0.04);color:var(--text);font-size:13px;outline:none;resize:vertical;box-sizing:border-box;font-family:inherit"/>
            <div style="text-align:right;font-size:11px;margin-top:4px"
              :style="{color: form.content.length < 10 ? 'var(--red)' : 'var(--dim)'}">
              {{ form.content.length }} 字{{ form.content.length < 10 ? '（至少10字）' : '' }}
            </div>
          </div>

          <!-- 步骤5：联系方式（选填） -->
          <div style="margin-bottom:24px">
            <div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:8px">
              <span style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;background:var(--blue);color:#fff;font-size:11px;margin-right:8px">5</span>
              联系方式 <span style="font-size:11px;color:var(--dim);font-weight:400">（选填，方便回复）</span>
            </div>
            <input v-model="form.contact"
              placeholder="邮箱或手机号"
              style="width:100%;padding:10px 14px;border-radius:10px;border:1px solid var(--border);background:rgba(255,255,255,0.04);color:var(--text);font-size:13px;outline:none;box-sizing:border-box"/>
          </div>

          <!-- 错误提示 -->
          <div v-if="errorMsg" style="padding:10px 14px;border-radius:8px;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);color:#f87171;font-size:13px;margin-bottom:16px">
            ⚠️ {{ errorMsg }}
          </div>

          <!-- 提交按钮 -->
          <div style="display:flex;align-items:center;gap:12px">
            <button class="btn btn-primary"
              :disabled="!canSubmit || submitting"
              @click="submit"
              style="padding:12px 32px;font-size:14px;justify-content:center;flex:1"
              :style="!canSubmit ? 'opacity:0.5;cursor:not-allowed' : ''">
              {{ submitting ? '提交中...' : '📤 提交反馈' }}
            </button>
            <div style="font-size:12px;color:var(--dim)">
              <span v-if="!form.type">请选择类型</span>
              <span v-else-if="!form.rating">请评分</span>
              <span v-else-if="form.content.length < 10">描述至少10字</span>
              <span v-else style="color:var(--green)">✓ 可以提交</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 右：说明 + 历史 -->
      <div style="display:flex;flex-direction:column;gap:16px">
        <!-- 说明卡片 -->
        <div class="card" style="padding:20px">
          <div class="card-title" style="margin-bottom:14px">📌 反馈须知</div>
          <div style="display:flex;flex-direction:column;gap:10px;font-size:13px;color:var(--muted);line-height:1.7">
            <div style="display:flex;gap:8px"><span style="flex-shrink:0">⏱️</span><span>我们会在 <b style="color:var(--text)">1-3个工作日</b> 内处理您的反馈</span></div>
            <div style="display:flex;gap:8px"><span style="flex-shrink:0">🔒</span><span>您的反馈信息仅限系统管理员可见，不会公开</span></div>
            <div style="display:flex;gap:8px"><span style="flex-shrink:0">📬</span><span>填写联系方式后，处理完成会主动通知您</span></div>
            <div style="display:flex;gap:8px"><span style="flex-shrink:0">🚨</span><span>紧急安全问题请直接拨打 <b style="color:var(--red)">96110</b></span></div>
          </div>
        </div>

        <!-- 本次会话提交的历史 -->
        <div class="card" style="padding:20px" v-if="myHistory.length">
          <div class="card-title" style="margin-bottom:14px">📋 本次会话提交记录</div>
          <div style="display:flex;flex-direction:column;gap:10px">
            <div v-for="fb in myHistory" :key="fb.id"
              style="padding:12px;border-radius:8px;background:rgba(99,102,241,0.04);border:1px solid var(--border)">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                <span style="font-size:13px;font-weight:600;color:var(--text);flex:1">{{ fb.title }}</span>
                <span style="padding:2px 8px;border-radius:10px;font-size:10px" :style="statusColor[fb.status]">
                  {{ statusLabel[fb.status] }}
                </span>
              </div>
              <div style="font-size:12px;color:var(--muted);margin-bottom:4px">{{ fb.content.slice(0,60) }}{{ fb.content.length>60?'...':'' }}</div>
              <div style="font-size:11px;color:var(--dim)">{{ fb.created_at.slice(0,16).replace('T',' ') }}</div>
            </div>
          </div>
        </div>

        <!-- 常见问题 -->
        <div class="card" style="padding:20px">
          <div class="card-title" style="margin-bottom:14px">❓ 常见问题</div>
          <div style="display:flex;flex-direction:column;gap:12px">
            <details style="cursor:pointer">
              <summary style="font-size:13px;color:var(--text);user-select:none">检测结果总是不准确怎么办？</summary>
              <div style="font-size:12px;color:var(--muted);margin-top:8px;line-height:1.7;padding-left:8px">请在反馈中详细说明具体的检测文本和期望结果，我们会优化识别模型。</div>
            </details>
            <details style="cursor:pointer">
              <summary style="font-size:13px;color:var(--text);user-select:none">如何反馈页面崩溃问题？</summary>
              <div style="font-size:12px;color:var(--muted);margin-top:8px;line-height:1.7;padding-left:8px">选择"功能异常"类型，描述操作步骤和错误现象，如能截图说明更好。</div>
            </details>
            <details style="cursor:pointer">
              <summary style="font-size:13px;color:var(--text);user-select:none">反馈提交后多久会有回复？</summary>
              <div style="font-size:12px;color:var(--muted);margin-top:8px;line-height:1.7;padding-left:8px">一般 1-3 个工作日内处理，填写联系方式后会收到处理通知。</div>
            </details>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

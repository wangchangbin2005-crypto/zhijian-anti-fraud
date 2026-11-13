<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface User {
  id: string
  username: string
  role: 'admin' | 'client'
  identity?: string
  age?: number
  created_at?: string
  last_active?: string
  total_detections?: number
  total_fraud?: number
}

const identityLabel: Record<string, string> = {
  elder: '老年人', student: '学生', adult: '普通成人', financial: '财务/金融', other: '其他',
}
const identityIcon: Record<string, string> = {
  elder: '👴', student: '🎓', adult: '👤', financial: '💼', other: '👤',
}

const users = ref<User[]>([])
const loading = ref(true)
const error = ref('')
const search = ref('')
const filterRole = ref('all')
const filterIdentity = ref('all')

import { getApiBase } from '@/config/api'
const BASE = getApiBase()

async function loadUsers() {
  loading.value = true
  error.value = ''
  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token') || ''
    const res = await fetch(`${BASE}/api/admin/users`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    users.value = Array.isArray(data) ? data : (data.users ?? [])
  } catch (e) {
    error.value = String(e)
    // 离线 mock
    users.value = [
      { id: '1', username: 'admin', role: 'admin', identity: 'adult', age: 30, total_detections: 0, total_fraud: 0 },
      { id: '2', username: 'terry', role: 'client', identity: 'student', age: 18, total_detections: 12, total_fraud: 3 },
      { id: '3', username: 'user001', role: 'client', identity: 'elder', age: 65, total_detections: 5, total_fraud: 2 },
      { id: '4', username: 'user002', role: 'client', identity: 'financial', age: 35, total_detections: 20, total_fraud: 1 },
    ]
  } finally {
    loading.value = false
  }
}

async function deleteUser(id: string, username: string) {
  if (!confirm(`确定要删除用户 ${username} 吗？`)) return
  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token') || ''
    await fetch(`${BASE}/api/admin/users/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    users.value = users.value.filter(u => u.id !== id)
  } catch {
    users.value = users.value.filter(u => u.id !== id)
  }
}

const filtered = computed(() => {
  return users.value.filter(u => {
    const matchSearch = !search.value || u.username.toLowerCase().includes(search.value.toLowerCase())
    const matchRole = filterRole.value === 'all' || u.role === filterRole.value
    const matchIdentity = filterIdentity.value === 'all' || u.identity === filterIdentity.value
    return matchSearch && matchRole && matchIdentity
  })
})

const stats = computed(() => ({
  total: users.value.length,
  admins: users.value.filter(u => u.role === 'admin').length,
  clients: users.value.filter(u => u.role === 'client').length,
  totalDetections: users.value.reduce((s, u) => s + (u.total_detections ?? 0), 0),
}))

onMounted(loadUsers)
</script>

<template>
  <div>
    <div class="page-header">
      <div class="page-title">👥 用户管理</div>
      <div class="page-subtitle">查看 · 搜索 · 管理所有注册用户</div>
    </div>

    <!-- 统计 -->
    <div class="stats-grid" style="margin-bottom:20px">
      <div class="stat">
        <div class="stat-icon" style="color:var(--blue)">👥</div>
        <div class="stat-value" style="color:var(--blue)">{{ stats.total }}</div>
        <div class="stat-label">总用户数</div>
      </div>
      <div class="stat">
        <div class="stat-icon" style="color:#a78bfa">🛡️</div>
        <div class="stat-value" style="color:#a78bfa">{{ stats.admins }}</div>
        <div class="stat-label">管理员</div>
      </div>
      <div class="stat">
        <div class="stat-icon" style="color:var(--cyan)">👤</div>
        <div class="stat-value" style="color:var(--cyan)">{{ stats.clients }}</div>
        <div class="stat-label">普通用户</div>
      </div>
      <div class="stat">
        <div class="stat-icon" style="color:var(--green)">🔍</div>
        <div class="stat-value" style="color:var(--green)">{{ stats.totalDetections }}</div>
        <div class="stat-label">累计检测</div>
      </div>
    </div>

    <div class="card">
      <!-- 搜索栏 -->
      <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap">
        <input
          v-model="search"
          placeholder="🔍 搜索用户名..."
          style="flex:1;min-width:180px;padding:8px 14px;border-radius:10px;border:1px solid var(--border);background:rgba(255,255,255,0.04);color:var(--text);font-size:13px;outline:none"
        />
        <select v-model="filterRole"
          style="padding:8px 14px;border-radius:10px;border:1px solid var(--border);background:#1e2a3a;color:var(--text);font-size:13px;outline:none;cursor:pointer">
          <option value="all" style="background:#1e2a3a;color:#e2e8f0">全部角色</option>
          <option value="admin" style="background:#1e2a3a;color:#e2e8f0">🛡️ 管理员</option>
          <option value="client" style="background:#1e2a3a;color:#e2e8f0">👤 普通用户</option>
        </select>
        <select v-model="filterIdentity"
          style="padding:8px 14px;border-radius:10px;border:1px solid var(--border);background:#1e2a3a;color:var(--text);font-size:13px;outline:none;cursor:pointer">
          <option value="all" style="background:#1e2a3a;color:#e2e8f0">全部身份</option>
          <option value="elder" style="background:#1e2a3a;color:#e2e8f0">👴 老年人</option>
          <option value="student" style="background:#1e2a3a;color:#e2e8f0">🎓 学生</option>
          <option value="adult" style="background:#1e2a3a;color:#e2e8f0">👤 普通成人</option>
          <option value="financial" style="background:#1e2a3a;color:#e2e8f0">💼 财务/金融</option>
        </select>
        <button class="btn btn-outline" type="button" style="font-size:12px;padding:8px 16px" @click="loadUsers">🔄 刷新</button>
      </div>

      <!-- 加载中 -->
      <div v-if="loading" style="text-align:center;padding:40px;color:var(--muted)">
        <div style="font-size:32px;margin-bottom:8px">⏳</div>加载中...
      </div>

      <!-- 表格 -->
      <div v-else style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead>
            <tr style="border-bottom:1px solid var(--border)">
              <th style="padding:10px 14px;text-align:left;color:var(--muted);font-weight:500">用户</th>
              <th style="padding:10px 14px;text-align:center;color:var(--muted);font-weight:500">角色</th>
              <th style="padding:10px 14px;text-align:center;color:var(--muted);font-weight:500">身份</th>
              <th style="padding:10px 14px;text-align:center;color:var(--muted);font-weight:500">年龄</th>
              <th style="padding:10px 14px;text-align:center;color:var(--muted);font-weight:500">检测次数</th>
              <th style="padding:10px 14px;text-align:center;color:var(--muted);font-weight:500">识别风险</th>
              <th style="padding:10px 14px;text-align:center;color:var(--muted);font-weight:500">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!filtered.length">
              <td colspan="7" style="text-align:center;padding:32px;color:var(--muted)">暂无用户数据</td>
            </tr>
            <tr v-for="u in filtered" :key="u.id"
              style="border-bottom:1px solid var(--border);transition:background .15s"
              @mouseenter="($event.currentTarget as HTMLElement).style.background='rgba(99,102,241,0.04)'"
              @mouseleave="($event.currentTarget as HTMLElement).style.background=''">
              <!-- 用户名 -->
              <td style="padding:12px 14px">
                <div style="display:flex;align-items:center;gap:10px">
                  <div style="width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,#312e81,#1d4ed8);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:900;color:#fff;flex-shrink:0">
                    {{ u.username[0]?.toUpperCase() }}
                  </div>
                  <span style="font-weight:600;color:var(--text)">{{ u.username }}</span>
                </div>
              </td>
              <!-- 角色 -->
              <td style="padding:12px 14px;text-align:center">
                <span style="padding:2px 10px;border-radius:20px;font-size:11px;font-weight:700"
                  :style="u.role === 'admin'
                    ? 'background:rgba(139,92,246,0.12);color:#a78bfa;border:1px solid rgba(139,92,246,0.3)'
                    : 'background:rgba(59,130,246,0.1);color:#93c5fd;border:1px solid rgba(59,130,246,0.25)'">
                  {{ u.role === 'admin' ? '🛡️ 管理员' : '👤 用户' }}
                </span>
              </td>
              <!-- 身份 -->
              <td style="padding:12px 14px;text-align:center;color:var(--muted)">
                {{ u.identity ? `${identityIcon[u.identity]} ${identityLabel[u.identity]}` : '—' }}
              </td>
              <!-- 年龄 -->
              <td style="padding:12px 14px;text-align:center;font-family:'JetBrains Mono',monospace;color:var(--text)">
                {{ u.age ?? '—' }}
              </td>
              <!-- 检测次数 -->
              <td style="padding:12px 14px;text-align:center;font-family:'JetBrains Mono',monospace;color:var(--blue)">
                {{ u.total_detections ?? 0 }}
              </td>
              <!-- 风险 -->
              <td style="padding:12px 14px;text-align:center;font-family:'JetBrains Mono',monospace"
                :style="{ color: (u.total_fraud ?? 0) > 0 ? 'var(--red)' : 'var(--dim)' }">
                {{ u.total_fraud ?? 0 }}
              </td>
              <!-- 操作 -->
              <td style="padding:12px 14px;text-align:center">
                <button v-if="u.role !== 'admin'" type="button"
                  style="padding:4px 12px;border-radius:8px;border:1px solid rgba(239,68,68,0.3);background:rgba(239,68,68,0.06);color:#f87171;font-size:12px;cursor:pointer"
                  @click="deleteUser(u.id, u.username)">
                  🗑️ 删除
                </button>
                <span v-else style="font-size:11px;color:var(--dim)">保护</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style="margin-top:12px;font-size:12px;color:var(--dim)">共 {{ filtered.length }} 条记录</div>
    </div>
  </div>
</template>